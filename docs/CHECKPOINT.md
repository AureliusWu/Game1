# 余烬信使断点记录

当前基线：**v1.13.0「动态夜行」已合并并完成 Web / Android / Windows 正式发行，GitHub Pages 已通过线上校验**。目前无本轮待发布任务。

## 接管入口

- 仓库：`AureliusWu/Game1` / `main`。v1.13.0 发行源与标签：`e3bc67e249d0f9c12c5c9934431e371b88c820b9`；后续仅文档提交不改变发行制品。
- [PR #13](https://github.com/AureliusWu/Game1/pull/13) 已 squash 合并。[正式主分支工作流](https://github.com/AureliusWu/Game1/actions/runs/42950060569)：quality、Android、Windows、Release、Pages 均成功。
- [网页试玩](https://aureliuswu.github.io/Game1/) · [v1.13.0 Release / APK / EXE / Web ZIP / SHA256SUMS](https://github.com/AureliusWu/Game1/releases/tag/v1.13.0)。
- 下轮接管先读 [AGENTS.md](../AGENTS.md)、[v1.13 更新说明](releases/v1.13.0.md)、[v1.12 美术检阅](art/v1.12-review.md) 和本断点。新运行时变更必须使用新版本，禁止覆盖已发布的 v1.13.0 附件。

## v1.13 已完成

1. 新增 `dist/motion.mjs` 纯展示层 `MotionTracker`，按真实位置差驱动有限步态、倾斜与挤压回弹；烛羽冲刺拉伸，怪物蓄势前收紧姿态。
2. 大位移、切换层数、低动态设置和无效帧回到中性姿态；姿态对象有上限、定期清理。保留 v1.12 原画与碰撞，保留受击反馈、危险预警、离线缺图回退。
3. 新增 `tests/motion.test.mjs` 8 项测试，均不触及模拟、随机数、schema 3、Android 包名/签名、Windows 数据路径或旧局规则。
4. 网页/PWA 新增离线模块缓存，版本统一到 1.13.0。剧情三章与原结局、七张无尽地图、八类怪物与五种首领、美术图块、双指移动选卡保持不变。

## 已核验

- 公共 CI：267/267 项测试通过，0 失败；54 项静态资源、离线覆盖、版本同步及 actionlint 全部通过。
- Android 15 模拟器：10/10 仪器测试、0 失败/跳过；构建并签名生产 APK，6,876,194 字节。
- Windows：真实 portable EXE 构建、启动/渲染、存取档和资源一致性门禁通过；当前仍未代码签名。
- Release：v1.13.0 正式发布，附件包含 APK、Windows EXE、Web ZIP、来源清单与 SHA256SUMS。Pages 正式 HTTPS、MIME 和资源哈希验证通过。
- Android 截图来自模拟器而非实体手机，Windows 验收在 CI 的原生运行环境；本次未声明物理手机性能通过或完整逐帧动画落地。

## 下轮继续开发的约束

- 继续保留烛羽、三章与结局、schema 3 和存档键、Android 签名/包名与 Windows 用户数据路径。
- v1.12 图集在 `world-art.mjs` 与 `art.mjs` 中保留静态原画与透明裁切；`motion.mjs` 仅做视觉动作，不许修改战斗伤害或旧存档结果。
- 下一轮优先收集真实设备战斗观感、耗时与失败率，再考虑敌潮/BOSS 平衡；程序步态尚不等于逐帧动画。
- `.github/workflows/ci.yml` 仍为唯一事件入口；PR 不签名、不发布，全部质量和原生门禁通过后由 main 发布。
