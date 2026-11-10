# 余烬信使断点记录

核对日期：**2026-11-10（北京时间）**。当前基线：**v1.11.0「巡猎与远行衣橱」已合并、三端发布与 Pages 部署完成**。没有待执行的发布任务，也没有打开的 PR / Issue。

## 接管入口

- 仓库：`AureliusWu/Game1`，默认分支 `main`。
- 发行源与标签 `v1.11.0` 均指向 `0e975f635948167b24df29b2078ba9ae0da01b5c`，发行树为 `a8f88e207fdf4c1a5fbcbb3ff04ba1d893f61db8`。后续纯文档提交不改变该发行身份。
- PR #11 已于 2026-11-10 16:17:59 合并：[改动与验收](https://github.com/AureliusWu/Game1/pull/11)。
- Release 于 2026-11-10 16:24:58 发布：[v1.11.0 下载](https://github.com/AureliusWu/Game1/releases/tag/v1.11.0)，包含网页 ZIP、签名 Android APK、Windows x64 免安装 EXE、四份来源清单与 SHA256SUMS，共 8 个公开资产。
- 网页：[GitHub Pages](https://aureliuswu.github.io/Game1/)。正式流水线在 16:25:23 校验线上 v1.11.0 的全部 42 项运行资源哈希一致。
- 首先阅读 [本轮发布说明](releases/v1.11.0.md) 和 [AGENTS.md](../AGENTS.md)，再核对最新 main、Release、标签与 Actions；不要重复发布或覆盖 v1.11.0 资产。
- v1.7.0 的历史断点保存在 [CHECKPOINT-v1.7.0.md](CHECKPOINT-v1.7.0.md)，不作为当前开发基线。

## 最近一轮已完成

1. 移除现代无尽局原地滞留追踪落雷及已排队的雷圈；新局通过侧翼近战、远程散射与锁线狙击制造走位压力。新 AI 使用 `endless.encounters.version=1`，历史运行保持相应旧规则。
2. 强化为右侧紧凑三图卡，保持 4 秒自动选择、摇杆与按住的方向键。Android 第二触点独立确认选卡，支持滑动取消，并按选项身份去重；暂缓、后台、竖屏和模态界面保持暂停规则。
3. 三套免费且可保存的烛羽皮肤、四件原创武器原画、四格手绘特效贴图已接入实际战斗和 UI。全部 8 张 WebP 与新模块纳入共享预载、离线缓存和三端 MIME；图片缺失仍有代码绘制回退。
4. v1.10.0 的有界顿帧、受击回弹、冲刺残影与击杀反馈，以及 v1.9.4 的自动换层停帧 / 再开局黑屏修复均保留。

当前美术范围是静态角色精灵配合朝向、浮动和拖影；逐帧行走 / 受击动画、全套敌人原画尚未制作。这些是已注明的范围限制，本次没有新增下一版本承诺。

## 已核验的发布证据

正式流水线：[42781543620](https://github.com/AureliusWu/Game1/actions/runs/42781543620)，源提交与发行源一致，全部 5 个 job 成功。以下结果来自该次正式流水线日志；本次接管没有重新运行或重打包。

| 门禁 | 结果 | Job |
| --- | --- | --- |
| 公共规则 / UI / 存档检查 | 254 测试通过，0 失败；42 静态资源、162 个 UI ID；离线 / 版本检查与 actionlint 通过 | [quality](https://github.com/AureliusWu/Game1/actions/runs/42781543620/job/129712515712) |
| Android | Android 15 模拟器真实 WebView 的 9/9 仪器测试，0 失败 / 跳过；包含双指移动选卡与衣橱保存；生产签名、包名 / 版本和 42 个嵌入资源通过 | [android / build](https://github.com/AureliusWu/Game1/actions/runs/42781543620/job/129712631992) |
| Windows | 实际免安装 EXE 启动、渲染、横屏、保存 / 继续与沙箱通过；42 个嵌入资源一致 | [windows / build](https://github.com/AureliusWu/Game1/actions/runs/42781543620/job/129712631950) |
| Release | 三端来源和资源一致，8 个不可变发行资产发布成功 | [publish / publish](https://github.com/AureliusWu/Game1/actions/runs/42781543620/job/129715356959) |
| Pages | 部署成功；线上 HTTPS、模块 MIME 与全部 42 项运行资源哈希一致 | [pages / deploy](https://github.com/AureliusWu/Game1/actions/runs/42781543620/job/129715516057) |

Android 验收来自模拟器，不等同于物理手机验收。Windows 免安装版尚未代码签名。

可追溯 Actions 产物：
- `Ember-Courier-release`：13747330152。
- `Android-device-QA`：13747020823；`Windows-desktop-QA`：13747175016。
- `Pages-live-verification`：13746821727。
- QA 产物保留到 2026-11-24，Release 归档产物到 2026-12-10，Pages 校验产物到 2027-02-08；长期下载使用正式 Release。

## 后续接管约束

- 保留烛羽、三章剧情、既有结局、schema 3、存档键、Android 包名 / 签名及 Windows 用户数据路径。
- 继续保留历史重放与原有原生验收；新增运行时改动使用新版本，同步三端版本与 SW 缓存，补齐离线资源。
- 唯一事件入口为 `.github/workflows/ci.yml`；PR 不签名、不发布，正式发布需全部平台验收通过。
- 当前没有挂起的发布阻断。接到下一轮明确任务后，从 v1.11.0 运行时基线推进。
