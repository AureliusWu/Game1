# 余烬信使断点记录

最后核验：2026-11-06（北京时间）。

## 当前状态

v1.1.0「暮色百事」已完成源码同步和线上发布。上次中断前的扩展开发、测试、GitHub 同步及原站点更新均已完成；本次恢复没有发现待继续的上传、待处理的部署或未合并 PR。

- 游戏与源码镜像：`AureliusWu/Game1`，`main`。
- 扩展实现提交：`de4d796e13c53f6dbc3a6b2df8ad4347ee655e72`。
- 试玩：https://ember-courier-game1.dazzlingmodel.chatgpt.site
- 访问范围：保留作者私有访问；使用创建该站点的 ChatGPT 账户。
- Sites project：`appgprj_6aeda9efaf088191ae1711329f052d72`。
- 已发布源码提交：`a0559833a2ba6b0d82dd4c8068ea523eed3678c1`。
- 已保存版本：`appgprj_6aeda9efaf088191ae1711329f052d72~appgver_0d6855c1c808819181bdf1245bbabd11`。
- 部署：`appgdep_6aedbb35c3b481919c8ff4d3da43101a`，已核验为 `succeeded`，完成于北京时间 2026-11-06 19:34:25。
- 服务缓存：`ember-courier-v1.1.0`；运行存档 schema 2，保留 schema 1 迁移与原存储键。

两个源仓库的提交历史独立。恢复时已获取 Sites 已发布提交，并逐文件比较两个仓库的整个 `dist/`，内容完全一致；不能仅因两个提交 SHA 不同认定版本不同。

## 已交付内容

装备与三槽位背包、套装、锻造与拆解、商店与补给、单局等级与连击、三位居民的分支剧情、灯塔投递、三种结局、20 项成就、邮局永久课程、启程藏品、六种委托、每日航线、奇遇与精英、图鉴和旧存档迁移。

系统说明见 [SYSTEMS.md](SYSTEMS.md)，详细测试范围与上一轮浏览器操作记录见 [QA.md](QA.md)。

## 本次恢复核验

- GitHub main 为上述扩展提交；恢复时无打开的 PR。
- 对应 GitHub Actions [42211073462](https://github.com/AureliusWu/Game1/actions/runs/42211073462) 已成功。
- 从 GitHub 重新获取源码并执行 `node --test tests/*.test.mjs`：73/73 通过，0 失败、0 跳过。
- 执行 `node scripts/check.mjs`：15 个静态文件、117 个唯一 UI ID、224.5 KiB；检查通过。
- `diff -rq` 对比两个源仓库的全部 `dist/`：无差异。
- 已有部署状态成功，本次没有重复发布相同游戏内容，也没有修改游戏运行时。

本次未重做浏览器试玩。上一轮浏览器与窄视口验证记录见 QA；实体 Android/iOS 上的安装、真实离线、耗电和长时音频仍未验证，不宣称已完成。

## 下次接续

本轮需求已收尾，没有遗留上传或部署步骤。进一步开发时先读取本文件和 AGENTS.md，再核对 GitHub main、Sites 源仓库及最新部署，避免重复发布。仅文档记录发生变化无需更新游戏版本或运行缓存；后续运行时变更按 AGENTS.md 执行回归、版本更新、源码同步与同站点发布。
