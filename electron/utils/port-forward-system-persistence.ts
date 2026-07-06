import * as os from 'node:os'
import * as path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { PortForward } from '../managers/PortForwardManager'
import type { SessionConfig } from '../managers/SessionManager'
import type { SSHKey } from '../managers/SSHKeyManager'

const execFileAsync = promisify(execFile)

export interface PortForwardSystemPersistencePlan {
  supported: boolean
  platform: NodeJS.Platform
  forwardId: string
  taskName: string
  serviceName: string
  label: string
  errors: string[]
  warnings: string[]
  sshCommand: string
  windows: {
    taskName: string
    taskPath: string
    fullTaskName: string
    installScript: string
    uninstallScript: string
    statusScript: string
  }
  linux: {
    serviceName: string
    serviceContent: string
    installScript: string
    uninstallScript: string
    statusScript: string
  }
  macos: {
    label: string
    plistContent: string
    installScript: string
    uninstallScript: string
    statusScript: string
  }
}

export interface PortForwardSystemPersistenceStatus {
  installed: boolean
  running: boolean
  details: string
  stdout: string
  stderr: string
}

export interface PortForwardSystemPersistenceActionResult extends PortForwardSystemPersistenceStatus {
  success: boolean
  error?: string
}

const sshKeepaliveOptions = [
  '-N',
  '-o',
  'ExitOnForwardFailure=yes',
  '-o',
  'ServerAliveInterval=30',
  '-o',
  'ServerAliveCountMax=3',
  '-o',
  'BatchMode=yes'
]

export function createPortForwardSystemPersistencePlan(
  session: SessionConfig,
  forward: PortForward,
  sshKey?: SSHKey
): PortForwardSystemPersistencePlan {
  const errors: string[] = []
  const warnings: string[] = []
  const platform = process.platform
  const privateKeyPath = resolvePrivateKeyPath(session, sshKey)
  const safeId = sanitizeIdentifier(forward.id)
  const serviceName = `mshell-port-forward-${safeId}.service`
  const taskName = safeId
  const label = `com.mshell.port-forward.${safeId}`

  if (session.type && session.type !== 'ssh') {
    errors.push('当前会话不是 SSH 会话，不能生成 SSH 端口转发持久化配置。')
  }

  if (session.authType !== 'privateKey') {
    errors.push('系统级持久化需要无交互 SSH 登录。请先把该会话改为密钥登录。')
  }

  if (!privateKeyPath) {
    errors.push('未找到可供系统 ssh 命令使用的私钥文件路径。')
  }

  if ((session as any).privateKey && !session.privateKeyPath && !session.privateKeyId) {
    errors.push('当前会话使用内联私钥内容，系统级持久化需要先导出为私钥文件。')
  }

  if (session.proxy?.enabled || session.proxyJump?.enabled) {
    errors.push('当前预检暂不支持代理或跳板机链路的系统级持久化脚本生成。')
  }

  if (session.passphrase || sshKey?.protected) {
    warnings.push('私钥可能带密码。系统服务无法弹窗输入密码，请确保系统 ssh-agent/keychain 已加载该私钥，或使用专用无密码密钥。')
  }

  if ((forward.type === 'local' || forward.type === 'dynamic') && forward.localPort < 1024) {
    warnings.push('本地监听端口小于 1024，Linux/macOS 通常需要管理员权限。')
  }

  if (forward.type === 'remote') {
    warnings.push('远程转发是否能监听非 127.0.0.1 地址，取决于服务器 sshd_config 的 AllowTcpForwarding/GatewayPorts 设置。')
  }

  const args = buildSshArgs(session, forward, privateKeyPath || '')
  const sshCommand = formatPosixCommand('ssh', args)
  const windows = buildWindowsPlan(taskName, args)
  const linux = buildLinuxPlan(serviceName, args)
  const macos = buildMacOSPlan(label, args)

  return {
    supported: errors.length === 0,
    platform,
    forwardId: forward.id,
    taskName,
    serviceName,
    label,
    errors,
    warnings,
    sshCommand,
    windows,
    linux,
    macos
  }
}

export async function getPortForwardSystemPersistenceStatus(
  plan: PortForwardSystemPersistencePlan
): Promise<PortForwardSystemPersistenceStatus> {
  const script = getCurrentPlatformScript(plan, 'status')
  const run = await executeSystemScript(script)

  return {
    ...parseStatusOutput(run.stdout),
    details: summarizeStatusOutput(run.stdout, run.stderr),
    stdout: run.stdout,
    stderr: run.stderr
  }
}

export async function installPortForwardSystemPersistence(
  plan: PortForwardSystemPersistencePlan
): Promise<PortForwardSystemPersistenceActionResult> {
  if (!plan.supported) {
    return {
      success: false,
      installed: false,
      running: false,
      details: plan.errors.join('\n') || '当前配置暂不支持系统级持久化。',
      stdout: '',
      stderr: '',
      error: plan.errors.join('\n') || '当前配置暂不支持系统级持久化。'
    }
  }

  const run = await executeSystemScript(getCurrentPlatformScript(plan, 'install'))
  if (!run.success) {
    return {
      success: false,
      installed: false,
      running: false,
      details: run.error || run.stderr || '安装系统级持久化失败。',
      stdout: run.stdout,
      stderr: run.stderr,
      error: run.error || run.stderr || '安装系统级持久化失败。'
    }
  }

  const status = await getPortForwardSystemPersistenceStatus(plan)
  return {
    success: true,
    ...status,
    stdout: mergeCommandOutput(run.stdout, status.stdout),
    stderr: mergeCommandOutput(run.stderr, status.stderr)
  }
}

export async function uninstallPortForwardSystemPersistence(
  plan: PortForwardSystemPersistencePlan
): Promise<PortForwardSystemPersistenceActionResult> {
  const run = await executeSystemScript(getCurrentPlatformScript(plan, 'uninstall'))
  if (!run.success) {
    return {
      success: false,
      installed: false,
      running: false,
      details: run.error || run.stderr || '卸载系统级持久化失败。',
      stdout: run.stdout,
      stderr: run.stderr,
      error: run.error || run.stderr || '卸载系统级持久化失败。'
    }
  }

  const status = await getPortForwardSystemPersistenceStatus(plan)
  return {
    success: true,
    ...status,
    stdout: mergeCommandOutput(run.stdout, status.stdout),
    stderr: mergeCommandOutput(run.stderr, status.stderr)
  }
}

function resolvePrivateKeyPath(session: SessionConfig, sshKey?: SSHKey): string {
  if (sshKey?.privateKeyPath) return sshKey.privateKeyPath
  return session.privateKeyPath || ''
}

function buildSshArgs(session: SessionConfig, forward: PortForward, privateKeyPath: string): string[] {
  const args = [...sshKeepaliveOptions]

  if (session.port) {
    args.push('-p', String(session.port))
  }

  if (privateKeyPath) {
    args.push('-i', privateKeyPath)
  }

  args.push(buildForwardArgName(forward.type), buildForwardSpec(forward))
  args.push(`${session.username}@${session.host}`)

  return args
}

function buildForwardArgName(type: PortForward['type']): string {
  if (type === 'local') return '-L'
  if (type === 'remote') return '-R'
  return '-D'
}

function buildForwardSpec(forward: PortForward): string {
  if (forward.type === 'local') {
    return `${forward.localHost}:${forward.localPort}:${forward.remoteHost}:${forward.remotePort}`
  }

  if (forward.type === 'remote') {
    return `${forward.remoteHost}:${forward.remotePort}:${forward.localHost}:${forward.localPort}`
  }

  return `${forward.localHost}:${forward.localPort}`
}

function buildWindowsPlan(taskName: string, args: string[]): PortForwardSystemPersistencePlan['windows'] {
  const taskPath = '\\MShell\\PortForward\\'
  const fullTaskName = `${taskPath}${taskName}`
  const argumentList = args.map(quotePowerShellSingle).join(', ')
  const installScript = [
    `$taskName = ${quotePowerShellDouble(taskName)}`,
    `$taskPath = ${quotePowerShellDouble(taskPath)}`,
    "$sshPath = (Get-Command 'ssh.exe' -ErrorAction Stop).Source",
    `$action = New-ScheduledTaskAction -Execute $sshPath -Argument ${quotePowerShellDouble(
      args.map(quoteWindowsArg).join(' ')
    )}`,
    '$trigger = New-ScheduledTaskTrigger -AtLogOn',
    "$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries",
    "Register-ScheduledTask -TaskPath $taskPath -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'MShell system-level SSH port forward' -Force",
    'Start-ScheduledTask -TaskPath $taskPath -TaskName $taskName',
    '',
    '# 手动测试命令：',
    `Start-Process -NoNewWindow -FilePath $sshPath -ArgumentList @(${argumentList})`
  ].join('\n')

  const uninstallScript = [
    `$taskName = ${quotePowerShellDouble(taskName)}`,
    `$taskPath = ${quotePowerShellDouble(taskPath)}`,
    'Stop-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction SilentlyContinue',
    'Unregister-ScheduledTask -TaskPath $taskPath -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue'
  ].join('\n')

  const statusScript = [
    `$taskName = ${quotePowerShellDouble(taskName)}`,
    `$taskPath = ${quotePowerShellDouble(taskPath)}`,
    '$task = Get-ScheduledTask -TaskPath $taskPath -TaskName $taskName -ErrorAction SilentlyContinue',
    'if ($null -eq $task) {',
    '  Write-Output "installed=false"',
    '  Write-Output "running=false"',
    '  Write-Output "state=not-found"',
    '  exit 0',
    '}',
    '$info = Get-ScheduledTaskInfo -TaskPath $taskPath -TaskName $taskName -ErrorAction SilentlyContinue',
    'Write-Output "installed=true"',
    'Write-Output "running=$($task.State -eq \'Running\')"',
    'Write-Output "state=$($task.State)"',
    'if ($info) {',
    '  Write-Output "lastRunTime=$($info.LastRunTime)"',
    '  Write-Output "lastTaskResult=$($info.LastTaskResult)"',
    '}'
  ].join('\n')

  return {
    taskName,
    taskPath,
    fullTaskName,
    installScript,
    uninstallScript,
    statusScript
  }
}

function buildLinuxPlan(serviceName: string, args: string[]): PortForwardSystemPersistencePlan['linux'] {
  const servicePath = `~/.config/systemd/user/${serviceName}`
  const serviceContent = [
    '[Unit]',
    'Description=MShell SSH port forward',
    'After=network-online.target',
    'Wants=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    `ExecStart=/usr/bin/env ssh ${args.map(quotePosixArg).join(' ')}`,
    'Restart=always',
    'RestartSec=5',
    '',
    '[Install]',
    'WantedBy=default.target'
  ].join('\n')

  const installScript = [
    'mkdir -p ~/.config/systemd/user',
    `cat > ${servicePath} <<'MSHELL_SERVICE'`,
    serviceContent,
    'MSHELL_SERVICE',
    'systemctl --user daemon-reload',
    `systemctl --user enable ${quotePosixArg(serviceName)}`,
    `systemctl --user restart ${quotePosixArg(serviceName)}`,
    '',
    '# 如需用户退出登录后仍保持运行，请由管理员执行：',
    `# sudo loginctl enable-linger ${quotePosixArg(os.userInfo().username)}`
  ].join('\n')

  const uninstallScript = [
    `systemctl --user disable --now ${quotePosixArg(serviceName)} 2>/dev/null || true`,
    `rm -f ${servicePath}`,
    'systemctl --user daemon-reload'
  ].join('\n')

  const statusScript = [
    `service=${quotePosixArg(serviceName)}`,
    `service_path=${quotePosixArg(servicePath)}`,
    'if [ -f "$HOME/.config/systemd/user/$service" ]; then',
    '  echo "installed=true"',
    'else',
    '  echo "installed=false"',
    'fi',
    'if systemctl --user is-active --quiet "$service"; then',
    '  echo "running=true"',
    'else',
    '  echo "running=false"',
    'fi',
    'state="$(systemctl --user is-active "$service" 2>/dev/null || true)"',
    'enabled="$(systemctl --user is-enabled "$service" 2>/dev/null || true)"',
    'echo "state=$state"',
    'echo "enabled=$enabled"',
    'echo "path=$service_path"'
  ].join('\n')

  return {
    serviceName,
    serviceContent,
    installScript,
    uninstallScript,
    statusScript
  }
}

function buildMacOSPlan(label: string, args: string[]): PortForwardSystemPersistencePlan['macos'] {
  const plistPath = `$HOME/Library/LaunchAgents/${label}.plist`
  const plistContent = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>Label</key>',
    `  <string>${escapeXml(label)}</string>`,
    '  <key>ProgramArguments</key>',
    '  <array>',
    '    <string>/usr/bin/ssh</string>',
    ...args.map((arg) => `    <string>${escapeXml(arg)}</string>`),
    '  </array>',
    '  <key>RunAtLoad</key>',
    '  <true/>',
    '  <key>KeepAlive</key>',
    '  <true/>',
    '  <key>StandardOutPath</key>',
    `  <string>${escapeXml(path.join(os.homedir(), 'Library/Logs', `${label}.out.log`))}</string>`,
    '  <key>StandardErrorPath</key>',
    `  <string>${escapeXml(path.join(os.homedir(), 'Library/Logs', `${label}.err.log`))}</string>`,
    '</dict>',
    '</plist>'
  ].join('\n')

  const installScript = [
    'mkdir -p ~/Library/LaunchAgents',
    `cat > "${plistPath}" <<'MSHELL_PLIST'`,
    plistContent,
    'MSHELL_PLIST',
    `launchctl unload "${plistPath}" 2>/dev/null || true`,
    `launchctl load "${plistPath}"`
  ].join('\n')

  const uninstallScript = [
    `launchctl unload "${plistPath}" 2>/dev/null || true`,
    `rm -f "${plistPath}"`
  ].join('\n')

  const statusScript = [
    `label=${quotePosixArg(label)}`,
    `plist_path="${plistPath}"`,
    'if [ -f "$plist_path" ]; then',
    '  echo "installed=true"',
    'else',
    '  echo "installed=false"',
    'fi',
    'if launchctl print "gui/$(id -u)/$label" >/dev/null 2>&1; then',
    '  echo "running=true"',
    'else',
    '  echo "running=false"',
    'fi',
    'echo "label=$label"',
    'echo "path=$plist_path"'
  ].join('\n')

  return {
    label,
    plistContent,
    installScript,
    uninstallScript,
    statusScript
  }
}

function getCurrentPlatformScript(
  plan: PortForwardSystemPersistencePlan,
  action: 'install' | 'uninstall' | 'status'
): string {
  if (plan.platform === 'win32') return plan.windows[`${action}Script`]
  if (plan.platform === 'darwin') return plan.macos[`${action}Script`]
  return plan.linux[`${action}Script`]
}

async function executeSystemScript(script: string): Promise<{
  success: boolean
  stdout: string
  stderr: string
  error?: string
}> {
  try {
    const command = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
    const args = process.platform === 'win32'
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]
      : ['-c', script]
    const result = await execFileAsync(command, args, {
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    })

    return {
      success: true,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    }
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      error: error.message
    }
  }
}

function parseStatusOutput(stdout: string): Pick<PortForwardSystemPersistenceStatus, 'installed' | 'running'> {
  return {
    installed: parseBooleanLine(stdout, 'installed'),
    running: parseBooleanLine(stdout, 'running')
  }
}

function parseBooleanLine(stdout: string, key: string): boolean {
  const match = stdout.match(new RegExp(`^${key}=(true|false|1|0|yes|no)$`, 'im'))
  if (!match) return false
  return /^(true|1|yes)$/i.test(match[1])
}

function summarizeStatusOutput(stdout: string, stderr: string): string {
  const values = parseKeyValueLines(stdout)
  const parts = [
    values.state ? `状态: ${values.state}` : '',
    values.enabled ? `启用: ${values.enabled}` : '',
    values.lastTaskResult ? `上次结果: ${values.lastTaskResult}` : '',
    values.path ? `路径: ${values.path}` : '',
    values.label ? `标识: ${values.label}` : ''
  ].filter(Boolean)

  if (parts.length) return parts.join(' / ')
  return stdout.trim() || stderr.trim() || '未获取到状态输出。'
}

function parseKeyValueLines(stdout: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)=(.*)$/)
    if (match) {
      values[match[1]] = match[2]
    }
  }
  return values
}

function mergeCommandOutput(first: string, second: string): string {
  return [first, second].map(value => value.trim()).filter(Boolean).join('\n')
}

function sanitizeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 80) || 'forward'
}

function formatPosixCommand(command: string, args: string[]): string {
  return [command, ...args].map(quotePosixArg).join(' ')
}

function quotePosixArg(value: string): string {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function quoteWindowsArg(value: string): string {
  if (/^[^\s"]+$/.test(value)) return value
  return `"${value.replace(/(["\\])/g, '\\$1')}"`
}

function quotePowerShellSingle(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function quotePowerShellDouble(value: string): string {
  return `"${value.replace(/[`"$]/g, '`$&')}"`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
