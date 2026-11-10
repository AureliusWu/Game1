# 余烬信使断点记录

当前基线：**v1.12.0「长夜入画」已合并、三端发布与 Pages 部署完成**。本轮任务已完成，无待执行发布任务；核对时无打开的 PR / Issue。

## 接管入口

- 仓库：`AureliusWu/Game1` / `main`。正式发行源与标签 `v1.12.0`：`33b6ebcbcb14eb0c3afb60e72eeb96e47106f38f`，树 `5728ab26de26b16c178ed339f0f6a21b40fba12a`。后续纯证据文档提交不改变发行身份。
- [PR #12](https://github.com/AureliusWu/Game1/pull/12) 已合并；[正式流水线 42859775461](https://github.com/AureliusWu/Game1/actions/runs/42859775461) 的 quality、Android、Windows、Release、Pages 全部成功。
- [网页试玩](https://aureliuswu.github.io/Game1/) · [APK / EXE / Web ZIP 与校验和](https://github.com/AureliusWu/Game1/releases/tag/v1.12.0)。
- 接管先读 [AGENTS.md](../AGENTS.md)、[全美术检阅](art/v1.12-review.md)、[发布说明](releases/v1.12.0.md) 和 [结构化证据](releases/v1.12.0-verification.json)，再核对 main、标签、Release 与 Actions。
- 不重复发布或覆盖 v1.12.0 正式资产；运行资源继续变化需要新版本。

## 本轮完成

1. 8 类普通怪、5 种首领有独立手绘精灵；保留预警、冻结、受击、精英和阶段反馈，剧情守夜者仍为鸦翼提灯监守。
2. 七张无尽地图与三章剧情接入独立地面材质；石屋、花房、钟舍按原障碍范围绘制，屋顶在角色后方变淡。灯塔、箱、商店、井、古钟、邮箱、风险旗、出口门接入原画。
3. 三位居民的场景 / 对话图片、12 件装备、8 项被动、8 件奇物与标题背景全部接入；修正头像裁切，兔耳与鹿角完整。
4. 新增 74 个图块 / 10 张 WebP，完整 53 项静态资源约 5.30 MiB；共享预载、完整离线缓存、三端 MIME 与缺图回退。
5. v1.11.0 的敌群迫走位、双指移动选卡、三套皮肤和四件武器，以及 v1.10.0 / v1.9.4 的打击反馈和换层修复全部保留。

当前采用完整静态原画配合朝向、浮动、回弹和拖影；没有逐帧行走 / 受击动画的交付声明，也没有新增下一版本承诺。

## 已核验

- 公共 CI：259 / 259，0 失败 / 跳过；静态 / 离线 / 版本和 actionlint 通过。
- Android：10 / 10，0 失败 / 错误 / 跳过；Android 15 模拟器真实 WebView，保留原 9 项并新增美术 / 背包 / 图鉴 / 保存验收。生产 APK 6,875,175 字节，原包名 / 签名、版本和 53 个资源校验成功。
- Windows：实际免安装 EXE 启动、渲染、横屏、存取档和沙箱通过；53 个内嵌资源 SHA-256 逐项匹配发行源。EXE 115,612,062 字节，仍未代码签名。
- Release：8 个公开不可变附件，标签指向发行源。Pages 线上 HTTPS、MIME 与全部 53 项运行资源哈希一致。
- [正式战斗截图](art/v1.12-native/art-landscape.png)、[场景](art/v1.12-native/world-landscape.png)、[装备](art/v1.12-native/inventory-landscape.png)、[图鉴](art/v1.12-native/codex-landscape.png) 已复核并入库；来自模拟器，不等同于物理手机验收。
- 正式产物 ID：Android QA `13783469721`、Windows QA `13784672040`、Pages 校验 `13784128778`、发行归档 `13784078738`。截图与结构化证据已有仓库副本，长期下载使用 Release。

## 继续开发的约束

- 保留烛羽、三章主题、原结局、schema 3、存档键、Android 包名 / 签名与 Windows 用户数据路径。
- 美术是表现层，不为贴图改写碰撞、随机流或历史规则；保持明确裁切、透明、预警层级、完整头像和图片回退。
- 新运行资源进入离线缓存；同步三端版本与 SW，保留历史重放和原生验收。
- 唯一事件入口 `.github/workflows/ci.yml`；PR 不签名、不发布，全部平台通过后正式发布。
