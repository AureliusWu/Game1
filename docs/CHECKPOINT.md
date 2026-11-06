# 余烬信使断点记录

最后核验：2026-11-06（北京时间）。

## 当前目标

用户在 v1.2.0 正式发布后追加：“做成无尽肉鸽，要做有趣的游戏”。沿用已明确授权的默认分支提交、网页更新和正式发布范围，版本递增为 v1.3.0「无尽夜航」，不覆盖旧发行。

仓库 `AureliusWu/Game1`，默认分支 main。已实现：无尽房间与层数、4 武器/8 被动/4 进化、8 奇物、5 路线、3 首领招式、3 天气、真实拾光升级、有限重抽、清场商店、封存结算与独立纪录。保留三章剧情与旧存档。

## 已验证

- 125/125 测试通过，18 个离线资源/135 个 UI ID 检查通过。
- 144 次实际操作策略实验完成：主动 72/72 达到预设 15 层并封存；路线 47/48 达到预设 10 层、1 死亡；站桩 24/24 死亡，无超时。不是人类胜率证据。
- 桌面浏览器真实清怪、升级、重抽从 2 减至 1、选卡保存返回菜单及继续同草稿通过。
- Android 35 debug 和 instrumented test APK 已本地编译。正式流水线新增第三项真实清怪触发选卡/重抽/保存恢复测试；已在正式发行流水线成功执行，3 项成功、0 失败、0 跳过。
- 文档：[规则](ENDLESS.md)、[QA](QA_v1.3.0.md)、[发行说明](releases/v1.3.0.md)、[模拟数据](balance/v1.3.0-endless-summary.json)。

## 发布已完成，无待办

- v1.3.0 发行源码/标签：`447e963bc18a35e63ba71a6cfec388f7691241a3` / `v1.3.0`。main 已发布实现，后续证据提交仅更新文档。
- Release：https://github.com/AureliusWu/Game1/releases/tag/v1.3.0
- APK：https://github.com/AureliusWu/Game1/releases/download/v1.3.0/Ember-Courier-v1.3.0.apk
- 成功发行工作流 `42246274103`，job `127989196597`；质量工作流 `42246274122` 成功。
- APK 1,077,045 字节，SHA-256 `e7e29db29595afe3d9da07787322c23cdf4acaba36bb21c819172e875ced785f`，10300 / 1.3.0，原签名证书，无调试及联网权限。CI 归档重验签通过，全部 18 个 APK / 网页 ZIP / Sites / 源码资源相同，公开 Release 摘要相同。
- Sites 源提交 `cb6066ca9c3262da7173b70ca13f3f96ddb7dc94`，保存版本 `appgprj_6aeda9efaf088191ae1711329f052d72~appgver_f50c326b36f88191912215da9426620a`（版本 5）。
- 部署 `appgdep_6aedf7d326e48191a6e1c3b147b7aa02`，北京时间 2026-11-06 23:53:04，succeeded，原 public 受众保持。公开网页已实际看到无尽模式、四起手和 v1.3.0。
- 完整证据：[v1.3.0-verification.json](releases/v1.3.0-verification.json)。本地等价实现提交 `3180273da45cb7af18eba26a7ccb93f34f16e6d0` 与公开源码的树均为 `cbaaaea2dcbfc516e12cce781e56b16fae2a06b2`。
- 不重跑已成功的发行、不覆盖 v1.3.0 资产、不重复部署相同运行文件。下次运行资源更新需递增版本。

## 现有身份和上一发行

- 在线：https://ember-courier-game1.dazzlingmodel.chatgpt.site/
- Sites project：`appgprj_6aeda9efaf088191ae1711329f052d72`，public，owner 已复核。
- 上一线上 v1.2.0 Sites 源提交 `0c55ceeec344ecef491e781f786020306b649d1e`，部署 `appgdep_6aedeb3f302881918d3e264b941cfe73`。
- 上一 main：`1c78bfbe84111032421041ef14e1a3977082cfc2`；v1.2.0 标签源码 `a1ac6d92804dbacceb938418586ca1d4e337ee51`，Release https://github.com/AureliusWu/Game1/releases/tag/v1.2.0 ，成功工作流 `42237954922`。
- 不覆盖 v1.2.0 或重跑旧失败发行任务。

## 维护边界

- Android 包名 `io.github.aureliuswu.embercourier`；最低 API 26、目标 35；1.3.0 versionCode 为 10300。
- 正式签名证书 SHA-256 `d4f25dd8e0c470583dee2bd82944551b575b6e585addcc55b5242480fd3d5aa7`。密钥仍用 Actions 机密及用户私有备份；严禁提交或放进公开 Release。
- GitHub 与 Sites Git 历史独立，以整个 dist/ 内容比对同版。
- 存储键和 schema 3 保持，无尽用独立 `endless.version=1` 子状态，旧剧情继续其原 rulesVersion。
- 网页与 APK 各自保存；同包名同签名覆盖安装保留 Android 数据。PWA 等所有旧标签页关闭后才切换版本。
