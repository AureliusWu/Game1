# 余烬信使断点记录

当前基线：**v1.7.0「横屏启航」发布完成**。本轮强制横屏、GitHub Pages、网页/APK/EXE 工作流和 CI 优化均完成。无待执行发布任务。

- 仓库：AureliusWu/Game1 / main。发行源 `d9efec2da0686e0f596d324f086a945e4f8d97c1`，树 `0fd7ec647380730c95c3573017681f8d38d737ce`，标签 v1.7.0。后续仅证据文档提交，不必重新打包或覆盖附件。
- 网页：https://aureliuswu.github.io/Game1/ ，GitHub Actions 发布；线上 29 项资源 / MIME / HTTPS / 子目录校验通过，浏览器实际看到 v1.7.0 与动态起始武器按钮。旧 Sites 项目标识与公开范围保留，旧预览仍为 v1.6.1，不再由 GitHub 自动更新；不同来源存档独立。
- 下载：https://github.com/AureliusWu/Game1/releases/tag/v1.7.0 ，含网页 ZIP、Android APK、Windows x64 免安装 EXE、跨平台来源清单与校验和。8 个公开资产已全部下载复核，29 项游戏资源在 source / ZIP / APK / EXE 来源清单一致。
- Android：10700 / 1.7.0，原包名 `io.github.aureliuswu.embercourier` 和原证书；sensorLandscape 锁定左右横屏，同签名覆盖安装保留数据。6/6 原生测试、真实横屏 PNG 和签名检查通过。
- Windows：Electron 45.2.3 / builder 26.18.0，免安装 x64。实际 EXE 启动、保存继续、隔离、竖屏保护 / 横屏暂停恢复、ASAR 哈希通过；用户数据 `%APPDATA%/EmberCourier`，F11 / Alt+Enter 全屏；尚未代码签名。
- 公共 188 项测试、静态检查与 actionlint 通过。唯一入口 ci.yml，target all / web / android / windows / check，publish=false 只构建验收。公共检查一次，原生与桌面按变更并行，缓存构建工具，允许恢复 Actions 产物；Pages 使用按 run_attempt 命名的产物。正式发行资产不可覆盖。
- 成功流水线 42372231795；quality 128402544009、Android 128402592504、Windows 128402592429、Release 128403590035、Pages 128403676619 全部 success。发行归档 13574780650，原生 QA 13574507103，Windows QA 13573803115，Pages 核验 13574186736。
- 技能树、六条居民后续分支、熟练度 / 成长目标、局内专精与放逐保持 v1.6.1 身份，全部旧规则与存档键保留。沿用 v1.6.0 的 52 次行动样本，不冒充新实验。

接管先读 QA_v1.7.0.md 与 releases/v1.7.0-verification.json，再核对 main、tag、Release 和 Pages；不重复发布 v1.7.0。运行资源改变需要新版本。已解决的两个发布阻断：跨平台检出统一 LF；竖屏门控优先消耗返回操作并保留底层暂停状态。
