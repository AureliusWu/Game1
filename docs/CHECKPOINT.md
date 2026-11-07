# 余烬信使断点记录

当前任务：用户要求研究并直接修改，让战斗爽快、游戏好玩。新版本 v1.4.0「疾焰连击」。上一正式版本 v1.3.0，保留既有发行与签名。

已实现：冲刺切敌、光环清弹、破晓蓄能与 6 秒超载、密集敌潮、命中亮色/变形/描边、声音节流、无伤清场奖励、卡牌数值与进化高亮、绕路折返与封蜡射速修复。旧剧情与 v1.3 保存的无尽规则兼容。

源码目录 `dist/`，无依赖。执行 `node --test tests/*.test.mjs`、`node scripts/check.mjs`；新节奏与平衡实验分别运行 `node scripts/combat-audit.mjs`、`node scripts/endless-audit.mjs`。

网页身份：`appgprj_6aeda9efaf088191ae1711329f052d72`，公开；地址 https://ember-courier-game1.dazzlingmodel.chatgpt.site/ 。APK 包名 `io.github.aureliuswu.embercourier`，1.4.0 / 10400，复用原正式签名。GitHub main 的运行资源变化自动启动发行流水线，成功后创建 v1.4.0 Release，拒绝覆盖已有发行。Sites 源历史单独同步。

## 发布完成，无遗留任务

- 发行源码 / 标签：`d376c98ff2a96de215ad24c9cb2ca7ba89726fdd` / `v1.4.0`；后续 main 提交只归档证据。
- 网页已公开部署：Sites 版本 6，源提交 `474c8080dd02b94a42c0ad6d8fd645aa60eea089`；部署 `appgdep_6aee7de51c488191a171351bd1ea72b2` 于北京时间 2026-11-07 09:25:05 成功；网页实际观察 v1.4.0 与新战斗文案。
- [正式 Release](https://github.com/AureliusWu/Game1/releases/tag/v1.4.0) / [APK](https://github.com/AureliusWu/Game1/releases/download/v1.4.0/Ember-Courier-v1.4.0.apk)。APK 1,081,472 字节，SHA-256 `e7e6ae622369a03a785bfaf9000dd74ce29c19ec1c9cb61e6c1852543e590d28`。
- 质量工作流 `42323818920`、发行工作流 `42323818976` / job `128254328993` 均成功；136 项规则测试、4 项 Android 35 操作验收通过。
- 已下载 CI 发行归档重验摘要；四个文件与公开 Release 摘要一致；19 个 APK / Web ZIP / Sites / GitHub 资源与 provenance 一致。签名、包名、版本、非调试构建由成功 CI 验证；原签名证书保持。没有声称重新进行本地 APK 验签。
- [完整证据](releases/v1.4.0-verification.json)、[研究](COMBAT_v1.4.0.md)、[QA](QA_v1.4.0.md)、[同种子节奏](balance/v1.4.0-combat-pacing.json)。144 次最终操作实验无超时，24 次站桩全部最终死亡。
- 不覆盖 v1.4.0，不重跑已成功发行，不重复部署相同运行资源。后续运行资源更新须递增版本。
- 新版战斗用于新建无尽旅途；继续旧版旅途保留原战斗规则。网页与 APK 分别保存，同签名覆盖安装保留 Android 进度。
