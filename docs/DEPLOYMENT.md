# 部署与维护

## 已准备的在线版

- 地址：https://ember-courier-game1.dazzlingmodel.chatgpt.site
- 访问范围：按作者 2026-11-06 的网页发布要求，现已公开访问。
- 身份保存在 `.openai/hosting.json`。后续更新应复用同一 project_id 与访问范围。
- 在线预览的源仓库由托管服务管理；GitHub 的 `AureliusWu/Game1` 是完整源码镜像。两处修改不会凭空互相同步，发布时需同步同一份已验证源码。

## 任意静态托管

把 `dist/` 的全部文件原样上传即可。无需构建、安装依赖、环境变量、数据库或 API 密钥。可以放在域名根目录或 `/Game1/` 子目录，运行时使用相对路径。

服务器应将 `.mjs` / `.js` 返回为 JavaScript、`.webmanifest` 返回为 `application/manifest+json`。开发服务器已包含这些 MIME 映射。PWA 安装与离线功能需要 HTTPS 或 localhost 安全上下文；普通 HTTP 可以运行游戏，但浏览器可能禁用 Service Worker。

## GitHub Actions

`ci.yml` 在 main 推送、PR 与手动触发时运行所有测试和静态检查，上传 `Ember-Courier-web-v1.1.1` 成品。下载并解压后，仍需通过 HTTP 服务器打开。

`pages.yml` 是独立的可选镜像：仓库 Settings → Pages → Source 选择 GitHub Actions 后，在 Actions 手动运行 Publish GitHub Pages。它不会修改当前公开站点的访问范围。本次交付不将尚未启用的 Pages 当作已发布地址。

## 版本与存档

任何运行时代码或资源改变，都应同时更新包版本、界面版本、文档与 `sw.js` 的缓存版本。Service Worker 不会强制替换正在游玩的旧版本；关闭该游戏所有标签后重新打开，才切换到准备好的新版本，避免一局中混用不同模块。

v1.1.0 将运行中存档从 schema 1 自动迁移到 schema 2，保留旧世界与运行状态，并补齐装备/经济/居民系统。永久成长保存在 `ember-courier.profile.v1`，旧统计键和运行存档键保留。后续存档字段变动需要迁移或增加 `SAVE_VERSION`。保留存储键能延续历史记录；修改键或清理站点数据会丢失本地进度。更换域名、浏览器或设备不会自动迁移存档。

## 验证

```bash
node --test tests/*.test.mjs
node scripts/check.mjs
```

部署的是 `dist/`，不是源码目录。不要把调试页面、测试工具、凭证或临时截图放进 `dist/`。

## Android 与 GitHub Release

发行流程见 [ANDROID.md](ANDROID.md)，双端发行说明见 [v1.1.1](releases/v1.1.1.md)。网页 ZIP 和签名 APK 一起出现在 GitHub Releases。
