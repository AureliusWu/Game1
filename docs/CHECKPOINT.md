# 余烬信使断点记录

当前任务：用户要求 1.UI 优化 2.选择界面减少遮挡并超时自动选择 3.击杀正反馈 4.怪物/BOSS/精英能力 5.武器/光环/光效/技能渲染。版本 v1.5.0「战场回响」。既有 v1.4.0 正式发行保留。

已实施底部非模态短卡、8/12 秒可保存倒计时与合法默认选择、暂缓/后台停表、击杀与武器 HUD、连斩/精英反馈、锁定预警的新敌招式、三词缀精英、首领轮换与第二阶段，以及四类武器与技能 Canvas 效果。新怪物规则只用于新无尽旅途；旧剧情和 v1.3/v1.4 运行兼容。

本地验证：node --test tests/*.test.mjs、node scripts/check.mjs、node scripts/endless-audit.mjs。第五项 Android 验收自然触发选卡、检查横竖屏占比、暂缓和保存的剩余时间，并等待真实倒计时自动选择。运行资源冻结后生成最终模拟摘要。

发布身份：AureliusWu/Game1 / main；Sites project appgprj_6aeda9efaf088191ae1711329f052d72，public，https://ember-courier-game1.dazzlingmodel.chatgpt.site/ 。Android io.github.aureliuswu.embercourier，10500 / 1.5.0，原签名。

当前在最终验证与发布阶段，只有实际成功后才能标记发布完成。main 运行资源变更自动触发发行；不要覆盖已有 Release 或重复发布相同运行文件。
