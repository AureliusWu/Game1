# 余烬信使断点记录

最后核验：2026-11-06（北京时间）。

## 当前目标

用户在 v1.2.0 正式发布后追加：“做成无尽肉鸽，要做有趣的游戏”。沿用已明确授权的默认分支提交、网页更新和正式发布范围，版本递增为 v1.3.0「无尽夜航」，不覆盖旧发行。

仓库 `AureliusWu/Game1`，默认分支 main。已实现：无尽房间与层数、4 武器/8 被动/4 进化、8 奇物、5 路线、3 首领招式、3 天气、真实拾光升级、有限重抽、清场商店、封存结算与独立纪录。保留三章剧情与旧存档。

## 已验证

- 125/125 测试通过，18 个离线资源/135 个 UI ID 检查通过。
- 144 次实际操作策略实验完成：主动 72/72 达到预设 15 层并封存；路线 47/48 达到预设 10 层、1 死亡；站桩 24/24 死亡，无超时。不是人类胜率证据。
- 桌面浏览器真实清怪、升级、重抽从 2 减至 1、选卡保存返回菜单及继续同草稿通过。
- Android 35 debug 和 instrumented test APK 已本地编译。正式流水线新增第三项真实清怪触发选卡/重抽/保存恢复测试；其执行结果待 CI。
- 文档：[规则](ENDLESS.md)、[QA](QA_v1.3.0.md)、[发行说明](releases/v1.3.0.md)、[模拟数据](balance/v1.3.0-endless-summary.json)。

## 待完成

1. 推送已验源码至 main，检查发行工作流（必须三项 Android 测试通过）；下载签名 APK 与 provenance 重新核对。
2. 保持现有 Sites project/public，打包与 Game1 相同的 dist/，保存并部署。
3. 将正式提交、Release、部署和资源摘要补充至本记录及 QA。

## 现有身份和上一发行

- 在线：https://ember-courier-game1.dazzlingmodel.chatgpt.site/
- Sites project：`appgprj_6aeda9efaf088191ae1711329f052d72`，public，owner 已复核。
- 当前线上 v1.2.0 Sites 源提交 `0c55ceeec344ecef491e781f786020306b649d1e`，部署 `appgdep_6aedeb3f302881918d3e264b941cfe73`。
- 上一 main：`1c78bfbe84111032421041ef14e1a3977082cfc2`；v1.2.0 标签源码 `a1ac6d92804dbacceb938418586ca1d4e337ee51`，Release https://github.com/AureliusWu/Game1/releases/tag/v1.2.0 ，成功工作流 `42237954922`。
- 不覆盖 v1.2.0 或重跑旧失败发行任务。

## 维护边界

- Android 包名 `io.github.aureliuswu.embercourier`；最低 API 26、目标 35；1.3.0 versionCode 为 10300。
- 正式签名证书 SHA-256 `d4f25dd8e0c470583dee2bd82944551b575b6e585addcc55b5242480fd3d5aa7`。密钥仍用 Actions 机密及用户私有备份；严禁提交或放进公开 Release。
- GitHub 与 Sites Git 历史独立，以整个 dist/ 内容比对同版。
- 存储键和 schema 3 保持，无尽用独立 `endless.version=1` 子状态，旧剧情继续其原 rulesVersion。
- 网页与 APK 各自保存；同包名同签名覆盖安装保留 Android 数据。PWA 等所有旧标签页关闭后才切换版本。
