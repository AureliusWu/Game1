# Android 构建与维护

本项目用 Java Activity + 系统 Android WebView 承载同一份 `dist/` 游戏。使用 AndroidX WebViewAssetLoader 通过虚拟 HTTPS 源提供 APK 内置资源，明确设置 `.mjs` MIME 类型；不通过互联网加载页面，不使用 `file://`，也不开放 JavaScript 原生桥。

- 包名：`io.github.aureliuswu.embercourier`；最低 Android 8.0 / API 26，目标/编译 API 35。
- Java 17、Gradle 8.11.1、Android Gradle Plugin 8.9.1、AndroidX WebKit 1.12.1。
- 显示名称/图标：余烬信使 / 原创猫头鹰烛羽。
- 版本取自根目录 package.json；versionCode 为 major × 10000 + minor × 100 + patch。
- 游戏资源在 Gradle 中直接引用 `../../dist`，没有需要手动同步的第二份网页源码。
- APK 禁用网页 Service Worker，安装更新原子替换内置资源；原浏览器 PWA 缓存行为保持。
- 设备方向改变不重建 Activity；暂停/返回调用游戏本身的保存与模态规则。

## 本地构建

安装 Java 17、Android SDK platform 35 和 Build Tools 35.0.0，并设置 ANDROID_HOME：

```bash
cd android
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
./gradlew :app:connectedDebugAndroidTest
```

正式 APK 要求环境变量 `EMBER_ANDROID_SIGNING_JSON`，包含 Base64 编码的 PKCS12 密钥和 `storePassword`、`keyPassword`、`keyAlias`。项目专用签名资料已保存在仓库同名 Actions 机密中。密钥和密码禁止进入 Git。`assembleRelease` 缺少签名时会失败，不把 debug 签名包装成正式版。

```bash
./gradlew :app:assembleRelease
cd ..
python3 scripts/package_release.py android/app/build/outputs/apk/release/app-release.apk
```

## 自动发行

修改 Android/运行资源/版本或手动运行 `Publish Web and Android`，会验证游戏、编译 APK、运行 Android 模拟器真实页面操作，再签名、核对资源哈希和签名并发布 GitHub Release。已发布同版本不会自动覆盖；修正后递增 patch 和 versionCode。网页托管需继续使用现有 Sites 项目与公开访问范围。

网页、APK 的 localStorage 位于各自来源；安装同包名/同签名且 versionCode 更高的版本会保留本地数据，卸载、清数据或切换浏览器不会。当前未实现跨端自动同步。

加载资源方案参考 [Android 官方文档](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)。AndroidX 组件保持其 Apache 2.0 授权；游戏原创内容仍使用仓库 MIT 授权。
