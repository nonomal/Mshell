package com.mshell.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.ProxyHTTP;
import com.jcraft.jsch.ProxySOCKS5;
import com.jcraft.jsch.Session;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MshellSsh")
public class AndroidSshBridge extends Plugin {
    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int COMMAND_TIMEOUT_MS = 60000;

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final Map<String, ShellSession> shellSessions = new ConcurrentHashMap<>();

    @PluginMethod
    public void connect(PluginCall call) {
        executor.execute(() -> {
            try {
                JSObject options = call.getData();
                JSObject sessionConfig = call.getObject("session");
                if (sessionConfig == null) {
                    throw new IllegalArgumentException("缺少 SSH 会话配置");
                }

                Session session = createSession(sessionConfig, options.optString("privateKey", ""));
                session.connect(CONNECT_TIMEOUT_MS);

                String sessionId = UUID.randomUUID().toString();
                sessions.put(sessionId, session);

                call.resolve(success().put("sessionId", sessionId));
            } catch (Exception error) {
                call.resolve(failure(error.getMessage()));
            }
        });
    }

    @PluginMethod
    public void execute(PluginCall call) {
        executor.execute(() -> {
            ChannelExec channel = null;
            try {
                String sessionId = call.getString("sessionId", "");
                String command = call.getString("command", "");
                Session session = sessions.get(sessionId);
                if (session == null || !session.isConnected()) {
                    throw new IllegalStateException("SSH 会话未连接或已断开");
                }

                channel = (ChannelExec) session.openChannel("exec");
                channel.setCommand(command);
                channel.setInputStream(null);

                ByteArrayOutputStream stderr = new ByteArrayOutputStream();
                channel.setErrStream(stderr);

                InputStream stdout = channel.getInputStream();
                channel.connect(CONNECT_TIMEOUT_MS);

                String output = readUntilClosed(channel, stdout);
                String errorOutput = stderr.toString(StandardCharsets.UTF_8.name());
                int exitStatus = channel.getExitStatus();

                JSObject result = new JSObject()
                    .put("success", exitStatus == 0)
                    .put("output", output + errorOutput);
                if (exitStatus != 0) {
                    result.put("error", "命令退出码：" + exitStatus);
                }
                call.resolve(result);
            } catch (Exception error) {
                call.resolve(failure(error.getMessage()));
            } finally {
                if (channel != null) {
                    channel.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void openShell(PluginCall call) {
        executor.execute(() -> {
            try {
                String sessionId = call.getString("sessionId", "");
                int cols = call.getInt("cols", 80);
                int rows = call.getInt("rows", 24);
                Session session = sessions.get(sessionId);
                if (session == null || !session.isConnected()) {
                    throw new IllegalStateException("SSH 会话未连接或已断开");
                }

                ShellSession existing = shellSessions.remove(sessionId);
                if (existing != null) {
                    existing.disconnect();
                }

                ChannelShell channel = (ChannelShell) session.openChannel("shell");
                channel.setPty(true);
                channel.setPtyType("xterm", cols, rows, 640, 480);
                InputStream stdout = channel.getInputStream();
                OutputStream stdin = channel.getOutputStream();
                channel.connect(CONNECT_TIMEOUT_MS);

                ShellSession shell = new ShellSession(channel, stdin);
                shellSessions.put(sessionId, shell);
                readShellOutput(sessionId, shell, stdout);
                call.resolve(success());
            } catch (Exception error) {
                call.resolve(failure(error.getMessage()));
            }
        });
    }

    @PluginMethod
    public void writeShell(PluginCall call) {
        executor.execute(() -> {
            try {
                String sessionId = call.getString("sessionId", "");
                String data = call.getString("data", "");
                ShellSession shell = shellSessions.get(sessionId);
                if (shell == null || !shell.channel.isConnected()) {
                    throw new IllegalStateException("Shell 通道未打开");
                }

                shell.stdin.write(data.getBytes(StandardCharsets.UTF_8));
                shell.stdin.flush();
                call.resolve(success());
            } catch (Exception error) {
                call.resolve(failure(error.getMessage()));
            }
        });
    }

    @PluginMethod
    public void closeShell(PluginCall call) {
        executor.execute(() -> {
            String sessionId = call.getString("sessionId", "");
            ShellSession shell = shellSessions.remove(sessionId);
            if (shell != null) {
                shell.disconnect();
            }
            call.resolve(success());
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        executor.execute(() -> {
            String sessionId = call.getString("sessionId", "");
            ShellSession shell = shellSessions.remove(sessionId);
            if (shell != null) {
                shell.disconnect();
            }
            Session session = sessions.remove(sessionId);
            if (session != null) {
                session.disconnect();
            }
            call.resolve(success());
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (ShellSession shell : shellSessions.values()) {
            shell.disconnect();
        }
        shellSessions.clear();
        for (Session session : sessions.values()) {
            session.disconnect();
        }
        sessions.clear();
        executor.shutdownNow();
    }

    private Session createSession(JSObject sessionConfig, String importedPrivateKey) throws Exception {
        JSObject proxyJump = sessionConfig.getJSObject("proxyJump");
        if (proxyJump != null && proxyJump.optBoolean("enabled", false)) {
            throw new UnsupportedOperationException("Android 端暂不支持跳板机会话");
        }

        JSch jsch = new JSch();
        String authType = sessionConfig.optString("authType", "password");
        String privateKey = importedPrivateKey;
        if (privateKey.isEmpty()) {
            privateKey = sessionConfig.optString("privateKey", "");
        }

        if ("privateKey".equals(authType)) {
            if (privateKey.isEmpty()) {
                throw new IllegalArgumentException("该会话需要私钥，但同步数据中没有私钥内容");
            }

            byte[] keyBytes = privateKey.getBytes(StandardCharsets.UTF_8);
            String passphrase = sessionConfig.optString("passphrase", "");
            byte[] passphraseBytes = passphrase.isEmpty()
                ? null
                : passphrase.getBytes(StandardCharsets.UTF_8);
            jsch.addIdentity(
                sessionConfig.optString("privateKeyId", "mshell-mobile-key"),
                keyBytes,
                null,
                passphraseBytes
            );
        }

        String username = sessionConfig.getString("username");
        String host = sessionConfig.getString("host");
        int port = sessionConfig.optInt("port", 22);
        Session session = jsch.getSession(username, host, port);
        session.setConfig("StrictHostKeyChecking", "no");
        session.setConfig("PreferredAuthentications", "publickey,password,keyboard-interactive");

        if (!"privateKey".equals(authType)) {
            session.setPassword(sessionConfig.optString("password", ""));
        }

        JSObject proxy = sessionConfig.getJSObject("proxy");
        if (proxy != null && proxy.optBoolean("enabled", false)) {
            applyProxy(session, proxy);
        }

        return session;
    }

    private void applyProxy(Session session, JSObject proxyConfig) throws Exception {
        String type = proxyConfig.optString("type", "socks5");
        String host = proxyConfig.getString("host");
        int port = proxyConfig.optInt("port", "http".equals(type) ? 8080 : 1080);
        String username = proxyConfig.optString("username", "");
        String password = proxyConfig.optString("password", "");

        if ("http".equals(type)) {
            ProxyHTTP proxy = new ProxyHTTP(host, port);
            if (!username.isEmpty()) {
                proxy.setUserPasswd(username, password);
            }
            session.setProxy(proxy);
            return;
        }

        ProxySOCKS5 proxy = new ProxySOCKS5(host, port);
        if (!username.isEmpty()) {
            proxy.setUserPasswd(username, password);
        }
        session.setProxy(proxy);
    }

    private String readUntilClosed(ChannelExec channel, InputStream stdout) throws Exception {
        StringBuilder output = new StringBuilder();
        byte[] buffer = new byte[4096];
        long startedAt = System.currentTimeMillis();

        while (true) {
            while (stdout.available() > 0) {
                int read = stdout.read(buffer, 0, buffer.length);
                if (read < 0) {
                    break;
                }
                output.append(new String(buffer, 0, read, StandardCharsets.UTF_8));
            }

            if (channel.isClosed()) {
                break;
            }

            if (System.currentTimeMillis() - startedAt > COMMAND_TIMEOUT_MS) {
                channel.disconnect();
                throw new IllegalStateException("命令执行超时");
            }

            Thread.sleep(100);
        }

        while (stdout.available() > 0) {
            int read = stdout.read(buffer, 0, buffer.length);
            if (read < 0) {
                break;
            }
            output.append(new String(buffer, 0, read, StandardCharsets.UTF_8));
        }

        return output.toString();
    }

    private void readShellOutput(String sessionId, ShellSession shell, InputStream stdout) {
        executor.execute(() -> {
            byte[] buffer = new byte[4096];
            try {
                while (shell.channel.isConnected() && !shell.channel.isClosed()) {
                    while (stdout.available() > 0) {
                        int read = stdout.read(buffer, 0, buffer.length);
                        if (read < 0) {
                            break;
                        }
                        notifyListeners(
                            "shellData",
                            new JSObject()
                                .put("sessionId", sessionId)
                                .put("data", new String(buffer, 0, read, StandardCharsets.UTF_8))
                        );
                    }
                    Thread.sleep(40);
                }
            } catch (Exception error) {
                notifyListeners(
                    "shellData",
                    new JSObject()
                        .put("sessionId", sessionId)
                        .put("data", "\r\n[Shell 已断开: " + error.getMessage() + "]\r\n")
                );
            } finally {
                shellSessions.remove(sessionId);
            }
        });
    }

    private JSObject success() {
        return new JSObject().put("success", true);
    }

    private JSObject failure(String message) {
        return new JSObject()
            .put("success", false)
            .put("error", message == null || message.isEmpty() ? "SSH 操作失败" : message);
    }

    private static class ShellSession {
        private final ChannelShell channel;
        private final OutputStream stdin;

        private ShellSession(ChannelShell channel, OutputStream stdin) {
            this.channel = channel;
            this.stdin = stdin;
        }

        private void disconnect() {
            try {
                stdin.close();
            } catch (Exception ignored) {
            }
            if (channel != null) {
                channel.disconnect();
            }
        }
    }
}
