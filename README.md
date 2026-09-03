# Vedio-Online

一个基于浏览器的轻量磁力在线播放页：输入 `magnet:?` 链接后，尝试直接在浏览器中播放种子中的视频文件。

## 当前问题根因 / Root cause

1. GitHub Pages workflow 默认要求仓库已经开启 Pages；仓库尚未启用时，`actions/configure-pages@v5` 会直接失败，导致部署中断。
2. 页面对外部 `WebTorrent` 脚本缺少兜底处理；当 CDN 加载失败或浏览器环境不支持时，会出现阻断性的 JavaScript 初始化失败，页面无法给出清晰提示。
3. 原始校验仅判断是否以 `magnet:?` 开头，对无效 magnet link 的反馈不够明确。

## 功能说明

- 输入 magnet link
- 在种子元数据加载完成后自动筛选常见视频文件（`mp4`、`mkv`、`webm`、`mov`、`m4v`、`avi`）
- 若种子中包含多个视频文件，可在下拉框中切换
- 对以下场景给出明确降级提示，而不是伪造“播放成功”：
  - magnet link 非法
  - 浏览器不支持 WebRTC
  - CDN 依赖加载失败
  - 种子缺少 WebRTC peers / trackers
  - 种子中没有可播放视频文件

## 本地运行

本项目是纯静态站点，无需构建步骤。

### 方式 1：Python

```bash
cd /home/runner/work/Vedio-Online/Vedio-Online
python3 -m http.server 4173
```

然后访问：

- `http://127.0.0.1:4173/`

### 方式 2：任意静态文件服务器

只要能把仓库根目录作为静态站点根目录托管即可，例如 VS Code Live Server、`npx serve .` 等。

## 部署

### GitHub Pages

仓库已包含 `.github/workflows/pages.yml`，推送到 `main` 后会自动部署当前仓库根目录内容。

关键点：

- 静态资源使用相对路径（`./app.js`），可在 GitHub Pages 的仓库子路径 `/Vedio-Online/` 下正常加载。
- workflow 已请求自动启用 Pages（`enablement: true`）；若仓库策略限制自动启用，请在 GitHub 仓库设置中手动打开 **Settings → Pages → Build and deployment → GitHub Actions**。

### 其他静态托管

可直接部署仓库根目录下的静态文件到任意静态托管平台。

## 技术限制

这是纯前端方案，能力边界受浏览器安全模型限制：

- 浏览器版 WebTorrent 依赖 **WebRTC**，不能像桌面 BT 客户端那样直接连接普通 TCP/UDP BitTorrent peers。
- 因此，并非所有 magnet link 都能在浏览器中成功播放；通常需要种子本身包含可用的 WebRTC tracker / peers。
- 如果页面长时间停留在等待状态，建议：
  1. 更换支持 WebRTC 的公开测试 magnet link
  2. 改用桌面 BT 客户端先下载或获取可直连的视频地址，再在浏览器中播放

## 验证方式

本次修复按以下方式验证：

1. 启动本地静态服务器，确认 `index.html` 与 `app.js` 可正常访问。
2. 对前端脚本执行语法检查，确认页面加载时不会因本地脚本产生阻断性语法错误。
3. 检查 GitHub Pages workflow，确认其在仓库未预先开启 Pages 时具备自动启用配置。

> 注意：仓库当前没有现成的自动化测试或构建工具链，因此本次未新增额外测试框架。
