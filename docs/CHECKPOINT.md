# 余烬信使断点记录

当前任务：用户要求研究并直接修改，让战斗爽快、游戏好玩。新版本 v1.4.0「疾焰连击」。上一正式版本 v1.3.0，保留既有发行与签名。

已实现：冲刺切敌、光环清弹、破晓蓄能与 6 秒超载、密集敌潮、命中亮色/变形/描边、声音节流、无伤清场奖励、卡牌数值与进化高亮、绕路折返与封蜡射速修复。旧剧情与 v1.3 保存的无尽规则兼容。

源码目录 `dist/`，无依赖。执行 `node --test tests/*.test.mjs`、`node scripts/check.mjs`；新节奏与平衡实验分别运行 `node scripts/combat-audit.mjs`、`node scripts/endless-audit.mjs`。

网页身份：`appgprj_6aeda9efaf088191ae1711329f052d72`，公开；地址 https://ember-courier-game1.dazzlingmodel.chatgpt.site/ 。APK 包名 `io.github.aureliuswu.embercourier`，1.4.0 / 10400，复用原正式签名。GitHub main 的运行资源变化自动启动发行流水线，成功后创建 v1.4.0 Release，拒绝覆盖已有发行。Sites 源历史单独同步。

当前处于最终验证与发布阶段，只有实际成功后才补齐 releases/v1.4.0-verification.json，并将此记录改为发布完成。
