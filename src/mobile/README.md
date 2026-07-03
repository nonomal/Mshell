# MShell Android 扩展

移动端入口复用桌面端的数据契约，首期覆盖：

- SSH 会话新增、编辑、删除、查看与原生 SSH 桥接调用
- SSH 会话保留并展示桌面端服务器管理字段：服务商、地区、到期时间、计费周期、金额、货币、说明和备注
- 命令片段新增、编辑、删除、搜索、填入执行框
- SSH 密钥新增、编辑、删除，支持粘贴或通过系统文件选择器导入私钥/公钥，并随备份/同步保存私钥内容
- 导入桌面端备份数据或 GitHub/GitLab 同步 JSON
- 导出桌面端兼容的备份 JSON、`.mshell` 加密备份和同步 JSON
- 安全锁：支持启动 PIN，Android 真机支持系统指纹/设备凭据验证；PIN 只保存 PBKDF2 派生哈希，不保存明文
- Android 启动器图标和移动端顶部品牌图标复用桌面端 `build/icon.png` / `src/assets/logo.png`

## 开发命令

```bash
npm run mobile:dev
npm run mobile:build
npm run mobile:typecheck
npm run android:add
npm run android:sync
npm run android:open
```

## 环境要求

- Node.js 18+
- npm
- Android Studio
- Android SDK / Build Tools
- JDK 21.x

当前 Android 工程的 Gradle 编译选项使用 Java 21。不要使用 JDK 17 直接打包，否则会出现 `无效的源发行版：21`；也不建议使用高于 Android Gradle 插件兼容范围太多的 JDK 版本。

当前 Android 工程版本基线：

| 项目 | 当前要求 |
| --- | --- |
| Node.js | 18+ |
| Capacitor | 8.x |
| Gradle Wrapper | 8.14.3 |
| Android Gradle Plugin | 8.13.0 |
| Android SDK | compileSdk 36 / targetSdk 36 / minSdk 24 |
| Java/JDK | 21.x，推荐使用 Android Studio 自带 JBR 21 |

PowerShell 临时切换 JDK 示例，只影响当前终端窗口：

```powershell
$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
java -version
javac -version
```

确认输出为 `21.x` 后，再执行：

```powershell
.\gradlew --stop
.\gradlew assembleDebug
```

## 本地开发

移动端 Web 页面可以单独启动：

```bash
npm run mobile:dev
```

默认地址：

```text
http://127.0.0.1:5174
```

该模式适合调试普通 Vue 页面、设置页、导入导出和样式。Android 原生能力，例如 SSH 桥接、生物识别、安全截图保护和系统返回手势，需要安装到 Android 设备或模拟器中验证。

## 构建移动端 Web 资源

```bash
npm run mobile:typecheck
npm run mobile:build
```

构建产物输出到：

```text
dist-mobile/
```

## 同步到 Android 工程

仓库已经包含 `android/` 工程，日常开发不需要重复执行 `android:add`。只有在重新创建 Android 工程时才使用：

```bash
npm run android:add
```

日常同步使用：

```bash
npm run android:sync
```

该命令会先执行 `mobile:build`，再把 `dist-mobile/` 复制到 Android 工程，并更新 Capacitor 插件配置。新增或升级 Capacitor 插件后也需要执行一次同步。

## 打包 APK / AAB

一键生成调试 APK：

```bash
npm run android:build
```

该命令会依次执行 `mobile:typecheck`、`android:sync` 和 Gradle `assembleDebug`。调试 APK 输出目录通常是：

```text
android/app/build/outputs/apk/debug/
```

按目标包类型也可以执行：

```bash
npm run android:build:debug
npm run android:build:release
npm run android:build:bundle
```

需要打开 Android Studio 时：

```bash
npm run android:open
```

也可以继续手动执行分步命令：

```bash
npm run mobile:typecheck
npm run android:sync
```

发布包：

- 在 Android Studio 中选择 `Build > Generate Signed Bundle / APK`
- 选择 APK 或 Android App Bundle
- 配置正式 keystore 后生成发布包

也可以在配置好签名后执行：

```powershell
.\gradlew assembleRelease
.\gradlew bundleRelease
```

正式 keystore、别名和密码不要提交到仓库。建议通过本机 Gradle 配置、环境变量或 CI 密钥管理注入。

## 打包前检查清单

- 执行 `npm run mobile:typecheck`
- 执行 `npm run android:sync`
- 确认 Android Studio 使用 JDK 21
- 真机验证 SSH 连接、交互式终端、系统返回手势、安全锁、生物识别和导入导出
- 发布包确认已使用正式签名

## 常见问题

### 打包提示 `无效的源发行版：21`

这是当前命令行使用的 Java 版本低于 21 导致的。先执行：

```powershell
java -version
javac -version
```

如果输出是 `17.x` 或更低，按上方环境要求中的 PowerShell 示例临时切换到 JDK 21，再执行 `.\gradlew --stop` 后重新打包。

### Android 手势返回直接退出

移动端需要通过 Capacitor `@capacitor/app` 监听 Android `backButton`。如果新增原生插件或重新生成 Android 工程后发现返回逻辑失效，先执行：

```bash
npm run android:sync
```

并确认 Android 工程中已同步 Capacitor 插件。

### 终端出现 `?2004h`、`[H[2J` 等控制码

交互式终端必须使用 xterm.js 渲染远端 shell 输出。不要把 shell 流式输出直接拼接到普通 `<pre>` 文本中，否则 ANSI/VT 控制序列会被显示成乱码。

## 数据导入与导出

Android 端支持三种导入：

- 桌面端备份解密后的 JSON 数据
- 桌面端 `.mshell` 加密备份内容
- GitHub/GitLab Gist/Snippet 中的同步 JSON；支持 Gist 页面地址、Gist ID、API 地址、raw 地址，私有 Gist/Snippet 需要填写 GitHub/GitLab Token

远程访问 Token 只用于从 GitHub/GitLab 读取私有同步文件；同步 JSON 如果是加密数据，还需要输入桌面端设置的同步加密密码；`.mshell` 备份需要输入备份密码。桌面端同步和备份都使用 `scrypt + AES-256-CBC`，移动端通过 `scrypt-js` 保持兼容。

Android 端本地编辑后的数据可以生成三种导出内容：

- 备份 JSON：明文桌面端备份结构，包含会话、分组、命令片段、快捷命令和 SSH 密钥。
- `.mshell` 加密备份：使用桌面端备份相同的 salt 和 AES-CBC 格式。
- 同步 JSON：使用桌面端同步 envelope；填写密码时生成加密同步数据，未填写密码时生成明文同步数据。

导入时只解密外层 `.mshell` 或同步 envelope，保存到 Android 本地后不再次加密；再次导出时会从本地结构重新生成目标格式，避免多次加密导致桌面端无法解密。

## SSH 原生桥

Web 层会调用 `window.mshellAndroidSsh`：

```ts
window.mshellAndroidSsh.connect({ session, privateKey })
window.mshellAndroidSsh.execute(sessionId, command)
window.mshellAndroidSsh.disconnect(sessionId)
```

Android 原生层当前使用 JSch 实现一次性命令执行；完整交互式终端可以继续沿用同一个桥接对象扩展流式输入输出。

## 安全锁

Web 层通过 `securityStore` 保存安全设置。PIN 使用随机盐和 PBKDF2-SHA256 派生哈希后保存到本地，不保存明文 PIN。Android 原生层提供 `MshellSecurity` 插件，调用 AndroidX Biometric，允许系统指纹或设备凭据解锁。没有可用生物识别时，PIN 是兜底方式。
