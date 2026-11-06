# 余烬信使断点记录

最后核验：2026-11-06（北京时间）。

## 当前任务与授权

用户已明确授权：“向默认分支发布提交、更新网页、发布 v1.2.0”。先前推送审批阻断已获得明确授权，不需要重新请求。

仓库：`AureliusWu/Game1`，默认分支 `main`。v1.2.0「夜路有选择」的 R1/R2/R3、公开网页与正式签名 Android APK 均已完成发布。本轮任务已全部完成，没有待继续的上传或部署。

## 本地完成

- 三流派主动机制、12 项强化、第一章第二盏灯的独立构筑选择、每章三种布局、风险支路、投影者/结界者、首领预告压灯/可打断定向回声。
- 有限巡逻与奖励预算、战斗中恢复限制、精确拐角路径检查；schema 3 迁移，旧运行 rulesVersion 111 继续旧规则，新运行使用 120。
- 公平每日航线、四种条件、首次奖励唯一记录、个人最好时间、八封新成就纪念回信、装备对比和结算复盘。
- 102/102 游戏/系统/通关/离线测试通过。全部 17 个运行资源已在离线缓存，包/核心/界面/缓存均为 1.2.0。
- 840 次策略实验：主动常规旅途 360、构筑旅途 180、公平航线 240 均到达结局；驻灯首领 23/30 到达结局、7 死亡、0 超时；另有 30 个驻灯探针。无旅途超时。
- 独立核对 1032 组分布与 120 对新/满成长公平配置；1000 种子覆盖九种连通布局。
- 原 v1.1.1 引擎生成的快照迁移后继续运行，与旧引擎后续 200 帧状态一致。存储键、课程、装备与来信保留。
- Android debug / instrumented test APK 已本地编译。两项 Android 35 实际操作测试已在正式发行流水线成功执行，0 失败、0 跳过。
- 浏览器已检查新入口、条件、真实开局、背包对比、28 项成就、浓雾、暂停与保存回菜单；HUD 状态文字已移开目标提示。

详见 [QA_v1.2.0.md](QA_v1.2.0.md)、[840 次实验](balance/README.md)、[正式发行说明](releases/v1.2.0.md)。

## v1.2.0 正式发行证据

- 发行源码/标签：`a1ac6d92804dbacceb938418586ca1d4e337ee51` / `v1.2.0`。
- GitHub Release：https://github.com/AureliusWu/Game1/releases/tag/v1.2.0
- APK：https://github.com/AureliusWu/Game1/releases/download/v1.2.0/Ember-Courier-v1.2.0.apk
- 发行成功工作流：[42237954922](https://github.com/AureliusWu/Game1/actions/runs/42237954922)，job `127960436988`，完整结论 `success`。
- Android 35 两项集成测试成功：离线页面与无联网权限、暂停/返回/保存/恢复，以及横竖屏、双指移动同时释放光环、窄屏面板、Activity 重开后同旅途恢复。
- 正式 APK 1,061,013 字节，SHA-256 `a8131e2c72e8182cc4ccbf420c92f59c191e01638114407b97532b0ddce948ed`。非 debuggable，versionName 1.2.0 / versionCode 10200，签名与既有发行证书相同。
- 公开 Release 含 APK、网页 ZIP、provenance JSON 与 SHA256SUMS。下载 CI 发行归档后重新验签，全部 17 个 APK/网页资源与源码逐字节相同，四项文件摘要与公开 Release 展示相同。
- 公开网页 ZIP 与 SHA256SUMS 已经浏览器实际重新下载并比对一致。浏览器 APK 下载被取消，provenance 下载未同步到工作区，因此不把它们写成“已从公链重新下载”；二者使用 CI 归档副本验签/比对，并核对公开 Release 的 SHA-256。
- 初次工作流 `42236617736` 在双指测试的环境设置/坐标假设上失败，已由新成功工作流取代。测试现在显式开启触屏控件，按 WebView 实际宽度换算坐标并保留移动与技能并发的原断言；不要重跑旧失败任务。
- 游戏运行文件在两次发行任务间未改变，102 项测试与 840 次实验的运行资源哈希保持一致。

## v1.2.0 网页部署

- 公开 URL：https://ember-courier-game1.dazzlingmodel.chatgpt.site/
- Sites project：`appgprj_6aeda9efaf088191ae1711329f052d72`，public，owner 已复核。
- Sites 源提交：`0c55ceeec344ecef491e781f786020306b649d1e`。
- 保存版本：`appgprj_6aeda9efaf088191ae1711329f052d72~appgver_eb26cfda14788191ad4d915008a6e72e`（版本 4）。
- 成功部署：`appgdep_6aedeb3f302881918d3e264b941cfe73`；北京时间 2026-11-06 22:59:24，结论 `succeeded`。
- 浏览器实际打开公开地址，页脚 v1.2.0、公平每日航线、四种条件和 28 成就入口均已确认。网页与 APK 使用相同 17 个运行文件。
- 两个仓库历史独立；后续只修正了 Android 测试设置，没有改变运行文件，不重复部署相同网页。

## 网页身份与上一正式版

- 公开地址：https://ember-courier-game1.dazzlingmodel.chatgpt.site
- Sites project：`appgprj_6aeda9efaf088191ae1711329f052d72`，public，保留同一身份和受众。
- 开始本轮时线上/Release 为 v1.1.1，标签源码 `98ce1b0f5c3e17837de396167fd24c3080270b65`。
- 上次成功部署：`appgdep_6aedcd70121c81918d5d4a6a61208096`，保存版本 `appgprj_6aeda9efaf088191ae1711329f052d72~appgver_c2fd1c652cbc8191bf30568f740ce994`，源提交 `29fad40d70710d9e5df53985c91621459660199e`。
- v1.1.1 发行工作流 `42221934646`，旧 APK SHA-256 `83804806a7396be5a514633ba1ad44368d1057834adfe3d820dd103caaaede09`。

## 维护约束

- Android 包名 `io.github.aureliuswu.embercourier`；最低 Android 8.0 / API 26；1.2.0 的 versionCode 为 10200。
- 继续使用正式签名证书 SHA-256 `d4f25dd8e0c470583dee2bd82944551b575b6e585addcc55b5242480fd3d5aa7`。签名材料保存在 Actions 机密和项目所有者私有备份；禁止提交或放进公开 Release。
- GitHub 与 Sites 的 Git 历史独立，以整个 dist/ 内容核对同版，不能用提交 SHA 不同推断资源不同。
- 同包名同签名覆盖安装保留 Android 进度。网页和 APK 各自本地保存，不自动跨端同步。
- PWA 新缓存为 ember-courier-v1.2.0。旧页继续旧模块；所有旧标签关闭后才安全切换。
- 机器人成功率不估算玩家胜率；实体设备长期耗电、厂商差异、真实进程强杀恢复仍未验证。

## 后续维护

本轮已完成。后续需求先核对本文件、main 与已有部署，再进行改动。不要覆盖已有 v1.2.0 Release；运行资源变化应递增版本并完成对应回归。仅验证文档变化不重新构建或部署相同游戏。

本地分析提交和公开提交的 Git 内容树一一一致，映射见 [source-commit-map.json](balance/source-commit-map.json)。正式发行源码以 v1.2.0 标签与 Release provenance 为准。
