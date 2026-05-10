# MShell Docs

这是 MShell 的静态介绍页面，用于展示当前产品能力、客户端形态、下载入口和快速开始说明。

当前页面对应产品版本：`v0.2.6`

## 页面内容

- `index.html`：主介绍页，包含导航、产品概览、客户端说明、功能特性、截图、下载和快速开始。
- `styles.css`：页面样式和响应式布局。
- `script.js`：导航、平滑滚动、终端演示、懒加载等轻量交互。
- `logo.png` / `favicon.png`：品牌图标。
- `screenshots/`：桌面端产品截图。
- `releases/`：可选的离线发布包目录。

## 当前介绍重点

### Windows 桌面端

桌面端是完整的 SSH 与服务器管理工作台，重点介绍：

- SSH / RDP / VNC 会话管理
- 多标签终端、垂直分屏、四宫格分屏
- SFTP 上传、下载、权限设置、在线预览和编辑
- 命令片段、快捷命令、命令历史和智能补全
- SSH 密钥管理、端口转发、跳板机和代理
- 服务器监控、统计分析、AI 助手和审计日志
- 加密备份、恢复、GitHub/GitLab 远程同步

### Android 客户端

Android 端用于移动连接和应急维护，重点介绍：

- SSH 会话新增、编辑、删除和分类
- 命令片段分类、复制和在当前终端中执行
- SSH 密钥新增、编辑、本地文件导入
- 桌面端备份 JSON、`.mshell` 加密备份和同步数据导入
- GitHub Gist / GitLab Snippet 远程同步配置
- PIN 和系统生物识别安全锁

## 本地预览

可以直接用浏览器打开：

```text
docs/index.html
```

也可以启动一个静态服务器：

```bash
cd docs
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 更新版本与下载

版本号需要同步修改：

- `docs/index.html` 中的 hero 版本
- `docs/index.html` 中 Windows 下载卡片版本
- `docs/index.html` 中 Android 下载卡片版本
- 下载链接指向 GitHub Releases，发布新包后确认 release 页面存在对应安装包和 APK

当前下载入口：

```text
https://github.com/inspoaibox/Mshell/releases
```

## 更新截图

截图目录：

```text
docs/screenshots/
```

当前页面使用：

- `main.png`
- `terminal.png`
- `sftp.png`
- `monitor.png`
- `autocomplete.png`
- `snippets.png`
- `split-vertical.png`
- `split-quad.png`

建议截图保持 16:9 或接近桌面端真实窗口比例。替换截图时尽量保持文件名不变，这样无需修改 HTML。

## 文案维护原则

- 只写当前客户端已经支持或正在发布的能力。
- 桌面端和 Android 端功能要区分清楚，避免让用户误以为两端能力完全一致。
- 同步和备份要强调加密密码需要妥善保存，密码丢失无法解密。
- Android 远程同步说明应同时提到 URL、Token 和同步加密密码，避免用户以为只填 URL 就可以读取私有数据。
- 涉及安全能力时，优先说明会话锁、PIN、生物识别、Token 最小权限和加密备份。

## 部署

该目录是静态页面，可以部署到任意静态站点服务：

- GitHub Pages
- Netlify
- Vercel
- Nginx / Apache / IIS
- 对象存储静态站点

如果部署到子路径，当前页面使用相对路径引用 CSS、JS、图片，通常无需额外配置。

## 维护清单

- [ ] 更新版本号
- [ ] 检查 Windows 安装包下载入口
- [ ] 检查 Android APK 发布入口
- [ ] 更新产品截图
- [ ] 检查功能介绍是否与当前客户端一致
- [ ] 检查同步、备份、安全说明是否准确
- [ ] 在桌面和手机浏览器中预览页面
