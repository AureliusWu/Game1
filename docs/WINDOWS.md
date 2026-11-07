# Windows 离线版

Windows x64 免安装 EXE，游戏资源全部内置。双击启动，F11 或 Alt+Enter 切换全屏；关闭窗口前保存，切换窗口自动暂停。存档保存在当前用户的 `%APPDATA%/EmberCourier`，同一用户替换新版 EXE 可以继续读取。网页与 Android 使用各自存储来源，暂不自动同步。

窗口默认横屏；如果窗口被调整为竖屏，显示横置提示并暂停游戏与选卡倒计时，恢复横屏后保持原来的手动暂停状态。Android 原生锁定两个横屏方向；网页使用 PWA 横屏声明、浏览器可用的方向锁与同一竖屏暂停保护。

## 本地打包

需要 Windows、Node.js 22 和 npm。根目录游戏仍无需依赖；Electron 45.2.3 / electron-builder 26.18.0 仅用于桌面打包，版本与完整依赖锁定在 `windows/`。

```powershell
python scripts/package_web.py
npm ci --prefix windows
node scripts/prepare-windows.mjs
npm --prefix windows run pack
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
./scripts/smoke_windows.ps1 -Executable "windows/out/Ember-Courier-v$version-Windows-x64.exe" -OutputDirectory "$PWD/artifacts/windows-qa"
node scripts/package_windows.mjs "$PWD/artifacts/windows-qa/windows-smoke.json"
```

输出为 `artifacts/windows/Ember-Courier-v版本-Windows-x64.exe`。当前未配置 Windows 代码签名，产物清单明确标记 `code_signed: false`。

## 自动验证

`windows.yml` 由统一 CI 调用，缓存 npm、Electron 与打包工具下载。测试实际产出的免安装 EXE，验证版本、真实页面启动、保存/返回菜单/继续、渲染器隔离、竖屏保护及横屏恢复；保留实际窗口截图和 JSON。发布前从 `app.asar` 逐项读取内置游戏资源，对比公共网页资源哈希。

渲染器关闭 Node.js 集成、启用 sandbox / contextIsolation，使用自有安全协议读取固定的内置文件；不打开外部导航、不访问远程内容、不提供原生 JavaScript 桥。桌面包停用网页 Service Worker，随 EXE 整体更新。
