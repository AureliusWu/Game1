# 余烬信使断点记录

当前基线：**v1.5.1「战场回响」已发布完成**。用户本轮五项要求（UI、减少选择遮挡/超时选择、击杀反馈、敌方能力、武器/光环/技能渲染）已落实。无在执行的发布任务。

- GitHub：AureliusWu/Game1 / main；正式运行源 `27870e3352f52d7042116db03d2249eef45a14cb`，树 `63313a1969d2df01fece6d76b14d150bfb9f11e9`，标签 v1.5.1。后续只有证据文档提交；不要重复发行或覆盖已有附件。
- 网页：https://ember-courier-game1.dazzlingmodel.chatgpt.site/，public；project `appgprj_6aeda9efaf088191ae1711329f052d72`，source `fb87f137f401d2bb026d20e16a2f6226bbbbe3e6`，保存版本 8 `appgprj_6aeda9efaf088191ae1711329f052d72~appgver_d27e418413f08191a683c6b0e2d8603d`，部署 `appgdep_6aee9689f2b8819197a7c25358741ead` succeeded，浏览器已看到 v1.5.1。版本 7 未部署，保留为历史。
- Android：io.github.aureliuswu.embercourier，10501 / 1.5.1，原签名可覆盖安装；APK 与网页 ZIP 位于 https://github.com/AureliusWu/Game1/releases/tag/v1.5.1。
- 验证：152 单元/旅途测试、5 项 Android 35 集成测试全部通过；独立原生视觉流程另完成同样 5 项。23 个运行资源在 APK / 网页 ZIP / GitHub / Sites / 部署包 / provenance 一致。
- 144 次 v1.5.0 真实动作实验沿用：v1.5.1 只有 CSS 和版本标记差异，模拟代码身份已校验。机器人样本不代表人类胜率或乐趣保证。
- 选择：底部非模态短卡；强化/奇物 8 秒，路线/剧情 12 秒；合法构筑默认，路线免费常规狩猎。P / 暂缓、后台停表，保存剩余时间；选卡期间战斗冻结。
- 新怪物规则只用于新建无尽旅途；v1.3/v1.4 旧档保留原规则，更新 UI 与绘制。
- 真实截图揭示并修复了成就遮角色与竖屏底部按钮裁切。短横屏保留固定操作，卡牌区内部滚动。截图须等待 WebView 视觉状态和提交帧，测试卸载后保留真实 PNG 并校验格式、方向。

后续接管先读 [最终验证](QA_v1.5.1.md) 和 [发布证据](releases/v1.5.1-verification.json)。
