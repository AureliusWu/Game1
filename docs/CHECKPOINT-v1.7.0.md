# v1.7.0 断点

目标：强制横屏、GitHub Pages 自动发布、网页/APK/EXE 工作流、合并优化 CI。

本地 187/187 测试、29 项静态资源检查、actionlint 1.7.12 工作流语义校验通过。Windows 使用 Electron 45.2.3 和 electron-builder 26.18.0，已提交 npm lock；Pages 设置源已经核实为 GitHub Actions。原 Android 发布证书和包名保持。

下一步：main 自动触发唯一 `Game CI and releases`；查看 Android / Windows 实际构建、截图、资源一致性、Release 与 Pages 线上哈希。未完成前不能将原生验收、EXE 启动或部署标为通过。

如有失败，只修正失败环节并重新验证；v1.7.0 尚未创建 Release 时可以修正运行源，发行后运行源改变必须递增版本，不可覆盖已发布资产。最终证据补充至 releases/v1.7.0-verification.json。
