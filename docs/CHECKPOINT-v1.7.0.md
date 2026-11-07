# v1.7.0 断点

目标：强制横屏、GitHub Pages 自动发布、网页/APK/EXE 工作流、合并优化 CI。

本地 188/188 测试、29 项静态资源检查、actionlint 1.7.12 工作流语义校验通过。Windows 使用 Electron 45.2.3 和 electron-builder 26.18.0，已提交 npm lock；Pages 设置源已经核实为 GitHub Actions。原 Android 发布证书和包名保持。

下一步：main 自动触发唯一 `Game CI and releases`；查看 Android / Windows 实际构建、截图、资源一致性、Release 与 Pages 线上哈希。未完成前不能将原生验收、EXE 启动或部署标为通过。

如有失败，只修正失败环节并重新验证；v1.7.0 尚未创建 Release 时可以修正运行源，发行后运行源改变必须递增版本，不可覆盖已发布资产。最终证据补充至 releases/v1.7.0-verification.json。

首轮源提交 9dee2c6958690e758cdbf018fff1722aad00543f，Actions 42371269526。Windows 资源校验发现 runner 默认 CRLF 导致 app.mjs 与公共网页字节不同，已添加 .gitattributes 固定 LF 并纳入平台选择测试；尚未发布任何 v1.7.0 资产。

官方 Actions 已核实并固定 Node 24 稳定版本：checkout 7.0.1、setup-node 7.1.0、cache 6.1.0、upload-artifact 7.0.2、download-artifact 8.0.2、setup-java 6.2.0、Gradle actions 6.4.1、configure-pages 6.0.0、deploy-pages 5.0.1、upload-pages-artifact 5.0.0。后续流水线统一验收。

第二轮 181024f571ed04d6cddd24b6bd1a0d60dd5b1348 / Actions 42371562614：188 项公共测试与全新 Node 24 Actions 通过，Windows EXE 已实际启动、保存并继续，竖屏返回操作误触底层暂停被回归测试拦住；修正 native.back 优先保护横屏门控，并让通用关闭操作保留方向提示。尚未发布 v1.7.0。

补充恢复能力：同运行的普通 Actions 产物允许重新验收替换；Pages 使用按 run_attempt 区分的部署产物，避免重试冲突；正式 Release 仍绝不覆盖。桌面下载缓存即使运行测试失败也保留，EXE 保留图标和产品信息但不做代码签名。
