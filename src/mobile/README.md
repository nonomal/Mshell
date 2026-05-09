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
npm run android:add
npm run android:sync
npm run android:open
```

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
