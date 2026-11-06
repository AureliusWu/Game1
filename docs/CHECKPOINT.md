# 余烬信使断点记录

最后核验：2026-11-06（北京时间）。

## 当前状态

v1.1.1 网页端与 Android APK 均已正式发布。本轮“发布网页端 / 发布 APK”已全部完成，没有待处理的上传或部署。

- 仓库：`AureliusWu/Game1`，`main`。
- 发行源码与标签：`98ce1b0f5c3e17837de396167fd24c3080270b65` / `v1.1.1`。
- 公开网页：https://ember-courier-game1.dazzlingmodel.chatgpt.site
- GitHub Release：https://github.com/AureliusWu/Game1/releases/tag/v1.1.1
- APK：https://github.com/AureliusWu/Game1/releases/download/v1.1.1/Ember-Courier-v1.1.1.apk
- 发布于北京时间 2026-11-06 21:04:28。
- APK：1,048,579 字节；SHA-256 `83804806a7396be5a514633ba1ad44368d1057834adfe3d820dd103caaaede09`。
- 包名：`io.github.aureliuswu.embercourier`；versionName 1.1.1 / versionCode 10101；最低 Android 8.0 / API 26。
- 正式签名证书 SHA-256：`d4f25dd8e0c470583dee2bd82944551b575b6e585addcc55b5242480fd3d5aa7`。
- 同一 Release 包含完整网页 ZIP、provenance JSON 与 SHA256SUMS；已重新下载并逐项核验。

## 网页部署

已按用户此次发布要求将原站点改为 public，无需登录。公开 URL 的匿名 HTTP 访问与浏览器页面均已核对为 v1.1.1。

- Sites project：`appgprj_6aeda9efaf088191ae1711329f052d72`。
- 已发布源码提交：`29fad40d70710d9e5df53985c91621459660199e`。
- 已保存版本：`appgprj_6aeda9efaf088191ae1711329f052d72~appgver_c2fd1c652cbc8191bf30568f740ce994`。
- 成功部署：`appgdep_6aedcd70121c81918d5d4a6a61208096`。
- 两个源仓库提交历史独立；发行时已比较整个 dist/，所有 15 个文件一致。后续 CI 环境与断点文档的调整没有改变运行资源，无需重复部署相同网页。

## 已完成的验证

- 73/73 游戏规则、系统、离线与完整通关测试通过；静态检查通过。
- Android release/debug/test APK 编译成功；本地 Android lint 无错误。
- Android 35 模拟器实际安装并打开 APK，1 项集成测试通过：真实内置页面、无联网权限、开局、保存、暂停/返回接口、背包关闭、回菜单与继续旅途。
- [正式发行工作流 42221934646](https://github.com/AureliusWu/Game1/actions/runs/42221934646) 完整成功。
- 正式 APK 签名有效、非 debuggable、包名/版本正确，内置全部 15 个文件与同版网页资源逐字节一致。
- GitHub Release 文件重新下载后与公布的 SHA256SUMS 全部匹配；APK 签名证书再次核对通过。
- 实体 Android/iOS 的长期耗电、系统厂商差异和真实设备音频仍未验证，不宣称已进行真机测试。

## 维护要点

- 保留烛羽、三章、三结局和暮色百事全部系统，运行存档 schema 2（迁移 schema 1），原存储键不变。
- APK 直接打包 dist/，首次打开即可离线；网页和 APK 各自保存本机进度，不自动跨端同步。
- Android 原生容器/测试/构建位于 android/，详见 [ANDROID.md](ANDROID.md)。
- 正式签名材料已保留在 `EMBER_ANDROID_SIGNING_JSON` Actions 机密和项目所有者私有备份中，禁止提交或附加到公开 Release；后续升级使用同一签名和包名，并递增 versionCode。
- 当前发行工作流已修正 SDK 路径、无界面图形后端、AVD 路径与启动限时/诊断。第一次失败与随后取消的旧任务均已由成功运行取代，不要重跑旧任务。
- 发行流程会先验证游戏和 Android 模拟器，再签名、核对资源并发布。已经存在的版本拒绝覆盖；后续修改应递增 patch。
- PWA 缓存为 ember-courier-v1.1.1；旧标签页需全部关闭后重开以安全切换版本。

## 下一轮：v1.2.0 更新方案

已制定 [v1.2.0「夜路有选择」](UPDATE_PLAN_v1.2.0.md)，目前处于方案阶段。完成 420 次开发策略实验，新增可复跑的 `scripts/balance-audit.mjs`、原始数据与方法说明；所有 dist/ 运行资源保持 v1.1.1。

优先顺序：追击停滞候选复核与奖励预算 → 灯塔/首领应对 → 三流派和路线变化 → 公平挑战与双端验收。常规旅途的 1 次超时和驻灯首领的 4 次超时均单列记录，不能当作玩家软锁或死亡率证据。新增开发观察选项保持原 QA 机器人默认行为。

本次断点接续已完成方案定稿、420 次实验复跑、统计口径修正和自动采集停滞样本。独立核对 363 组指标分布，27 组原/新 QA 默认策略完整状态一致；73/73 测试、静态检查通过，全部 15 个运行文件与 `v1.1.1` 标签一致。方案、分析工具与数据共同纳入仓库；本轮“制定更新方案”完成。下一轮实施从 R1 开始，运行功能尚未修改。

### 本次同步断点

- 方案与分析的本地提交：`3d1a51dfc78b8f5841dddfb46c24542a32fdb5db`。
- GitHub `main` 最后核实仍为 `90946be9072324d279399863f4bdffdefc863d73`；本次方案尚未推送。
- 自动审批拒绝直接推送默认分支，理由是本轮续接指令未明确授权远程发布。核实仓库为用户自有、仅文档/分析改动且不触发正式发布后，重试仍被拒绝；停止推送，等待用户明确授权。
- 后续获得授权后先核对远程 HEAD，再推送本地方案和断点提交；无需重跑已完成的基线实验，也无需发布相同的 v1.1.1 网页或 APK。
