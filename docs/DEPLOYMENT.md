# 部署与维护

GitHub Pages 为主要网页地址：https://aureliuswu.github.io/Game1/ 。仓库 Settings → Pages → Source 使用 GitHub Actions；工作流部署后逐项检查公开资源，验证结果保存在 Actions 的 Pages-live-verification 产物。

原公开预览 https://ember-courier-game1.dazzlingmodel.chatgpt.site/ 的身份仍保存在 `.openai/hosting.json`，保留原 project_id 和公开范围。GitHub 工作流不自动更新该预览。不同域名的网页存档相互独立，当前没有跨来源迁移/同步。

## 工作流

唯一触发入口为 `Game CI and releases`（ci.yml），支持 main 推送、PR 和手动执行。仅相关源码/测试/脚本/工作流变更自动触发；文档更改不重新打包。

| 阶段 | 行为 |
| --- | --- |
| quality | 一次 Node 规则与 CI 契约测试、静态/版本/缓存检查，生成公共网页 ZIP 与资源哈希清单 |
| android.yml | 按需编译、lint、模拟器真实验收；main 可生成原证书签名 APK；缓存 Gradle 和 Android 系统镜像 |
| windows.yml | 按需构建 x64 免安装 EXE，运行实际 EXE 的保存/恢复/方向保护验收；缓存 npm、Electron 和打包工具 |
| release.yml | 新版本且两端构建通过，验证网页/APK/EXE 同版本、同提交和同资源；发布三端包、校验和与来源清单 |
| pages.yml | main 网页变更且所有必要任务成功后部署公共网页产物；线上验证 HTTPS、模块 MIME 和每个资源的 SHA-256 |

手动入口 target 可选 all / web / android / windows / check。publish=false 只运行构建和验收，不部署、不生成正式签名 APK、不创建 Release；web 可单独修复网页部署，android/windows 可单独产出对应 Actions 构建产物。新版本发布使用 all + publish=true。PR 不执行签名或发布。

原重复的 visual-qa 触发器已合并至 Android 流程。原生与 Windows 并行，公共验收只跑一次；测试更改跳过不相关的原生任务。过期 PR 运行自动取消，main 发布串行；所有任务设置超时并保留失败诊断。

## 版本与产物

运行代码变更同时更新根 package.json、core VERSION、界面版本、离线缓存名，以及 windows/package.json 和 lockfile 的根版本。已发布版本不可修改运行资源或覆盖资产；QA/CI 修正使用 `[qa-only]` 并保持发行资产不可变。签名 APK、Windows EXE、网页 ZIP 及 SHA256SUMS.txt 从 GitHub Releases 下载。

APK 保持 `io.github.aureliuswu.embercourier` 和原证书，覆盖安装延续数据。EXE 的用户数据目录为 `%APPDATA%/EmberCourier`；当前 Windows 产物未配置代码签名。各平台均保留原有存储键、旧运行规则和迁移身份。

## 静态托管与离线更新

`dist/` 仍可直接托管在根目录或子目录。所有运行路径相对；不需要构建、API、数据库或运行依赖。服务器应将 .mjs/.js 作为 JavaScript 返回，PWA 离线缓存需要 HTTPS 或 localhost。Service Worker 不强制替换正在进行的旅途，关闭所有游戏标签后重新打开完成更新。APK / EXE 使用包内资源整体更新，不启用网页缓存。

```bash
node --test tests/*.test.mjs
node scripts/check.mjs
```

Android 和 Windows 本地打包分别见 [ANDROID.md](ANDROID.md) 与 [WINDOWS.md](WINDOWS.md)。不得把调试页面、测试脚本、凭证或临时截图放入 dist。
