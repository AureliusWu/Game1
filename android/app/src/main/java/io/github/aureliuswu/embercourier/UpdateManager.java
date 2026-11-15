package io.github.aureliuswu.embercourier;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * The bundled WebView remains isolated/offline. Only this native manager talks to GitHub.
 * Downloads are checked against the immutable Release SHA256SUMS and the existing APK signer.
 * Android owns installation consent; an update never clears the app data or save keys.
 */
final class UpdateManager {
    private static final String API = "https://api.github.com/repos/AureliusWu/Game1/releases/latest";
    private static final String REPO = "https://github.com/AureliusWu/Game1/releases/download/";
    private static final String SIGNER = "d4f25dd8e0c470583dee2bd82944551b575b6e585addcc55b5242480fd3d5aa7";
    private static final long MAX_APK = 80L * 1024 * 1024;
    private final Activity activity;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean();
    private volatile boolean closed;
    private File pendingInstall;

    UpdateManager(Activity activity) { this.activity = activity; }
    void shutdown() { closed = true; worker.shutdownNow(); }
    void autoCheck() {
        // Emulator / debug tests run offline and must never be coupled to GitHub uptime.
        if (BuildConfig.DEBUG) return;
        long now = System.currentTimeMillis();
        long last = activity.getPreferences(Activity.MODE_PRIVATE).getLong("checked-release-at", 0);
        if (now - last >= 24L * 60 * 60 * 1000) check(false);
    }
    void onResume() {
        if (pendingInstall != null && Build.VERSION.SDK_INT >= 26 && activity.getPackageManager().canRequestPackageInstalls()) {
            File file = pendingInstall; pendingInstall = null;
            if (file.isFile()) launchInstaller(file);
        }
    }
    void check(boolean manual) {
        if (closed || !busy.compareAndSet(false, true)) return;
        if (manual) toast("正在检查官方新版本…");
        worker.execute(() -> {
            try {
                Release release = lookup();
                if (closed) return;
                activity.getPreferences(Activity.MODE_PRIVATE).edit().putLong("checked-release-at", System.currentTimeMillis()).apply();
                ui.post(() -> {
                    if (closed || activity.isFinishing()) return;
                    if (release == null) { if (manual) toast("已是最新版本 v" + BuildConfig.VERSION_NAME); return; }
                    Runnable present = () -> new AlertDialog.Builder(activity).setTitle("新版本 v" + release.version)
                        .setMessage("从官方 GitHub Release 下载、校验签名后覆盖安装。旧存档与设置会保留；Android 仍会要求你确认安装。")
                        .setNegativeButton("稍后", null)
                        .setPositiveButton("下载并更新", (d, which) -> download(release)).show();
                    if (manual) presentPaused(present);
                    else {
                        // Do not cover an active fight with a native update prompt.
                        android.webkit.WebView view = activity.findViewById(R.id.game_webview);
                        if (view != null) view.evaluateJavascript(
                            "document.body.dataset.screen==='menu' && !document.querySelector('dialog[open]')",
                            idle -> { if ("true".equals(idle) && !closed) presentPaused(present); });
                    }
                });
            } catch (Exception error) {
                if (manual && !closed) ui.post(() -> toast("无法连接更新服务，离线游戏不受影响"));
            } finally { busy.set(false); }
        });
    }
    // Native dialogs do not trigger Activity.onPause. Wait for the existing WebView
    // hook to checkpoint and hold combat/draft time before presenting any updater UI.
    void presentPaused(Runnable present) {
        if (closed || activity.isFinishing() || activity.isDestroyed()) return;
        android.webkit.WebView view = activity.findViewById(R.id.game_webview);
        if (view == null) return;
        view.evaluateJavascript("window.emberCourierNative?.pause() ?? false", paused -> {
            if (closed || activity.isFinishing() || activity.isDestroyed()) return;
            if ("true".equals(paused)) present.run();
            else toast("游戏尚未就绪，请稍后再试更新");
        });
    }
    private static boolean newer(String remote, String local) {
        if (!remote.matches("\\d+\\.\\d+\\.\\d+") || !local.matches("\\d+\\.\\d+\\.\\d+")) return false;
        String[] a = remote.split("\\."), b = local.split("\\.");
        for (int i = 0; i < 3; i++) {
            long x = Long.parseLong(a[i]), y = Long.parseLong(b[i]);
            if (x != y) return x > y;
        }
        return false;
    }
    private static class Release {
        String version, apkUrl, checksumUrl, name;
        long size;
    }
    private Release lookup() throws Exception {
        JSONObject json = new JSONObject(new String(read(API, 512 * 1024), java.nio.charset.StandardCharsets.UTF_8));
        String tag = json.optString("tag_name", "");
        if (!tag.matches("v\\d+\\.\\d+\\.\\d+")) return null;
        String version = tag.substring(1);
        if (!newer(version, BuildConfig.VERSION_NAME)) return null;
        String file = "Ember-Courier-v" + version + ".apk";
        String prefix = REPO + tag + "/";
        JSONArray assets = json.getJSONArray("assets");
        Release out = new Release();
        out.version = version; out.name = file;
        out.apkUrl = prefix + file; out.checksumUrl = prefix + "SHA256SUMS.txt";
        boolean foundApk = false, foundChecksums = false;
        for (int i = 0; i < assets.length(); i++) {
            JSONObject item = assets.getJSONObject(i);
            String name = item.optString("name", "");
            String url = item.optString("browser_download_url", "");
            if (name.equals(file) && url.equals(out.apkUrl)) { out.size = item.getLong("size"); foundApk = true; }
            if (name.equals("SHA256SUMS.txt") && url.equals(out.checksumUrl)) foundChecksums = true;
        }
        if (!foundApk || !foundChecksums || out.size <= 0 || out.size > MAX_APK) return null;
        return out;
    }
    private static boolean allowedHost(String host) {
        return "api.github.com".equals(host) || "github.com".equals(host)
            || "release-assets.githubusercontent.com".equals(host)
            || "objects.githubusercontent.com".equals(host);
    }
    private static HttpURLConnection connect(String url) throws Exception {
        URL current = new URL(url);
        for (int redirects = 0; redirects < 6; redirects++) {
            if (!"https".equals(current.getProtocol()) || !allowedHost(current.getHost())) throw new SecurityException("Unsafe update host");
            HttpURLConnection connection = (HttpURLConnection) current.openConnection();
            connection.setConnectTimeout(8000); connection.setReadTimeout(15000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("User-Agent", "Ember-Courier-Android-Update");
            connection.setRequestProperty("Accept", "application/octet-stream, application/vnd.github+json");
            int code = connection.getResponseCode();
            if (code >= 300 && code < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null) throw new IllegalStateException("Missing redirect");
                current = new URL(current, location);
                continue;
            }
            if (code != 200) { connection.disconnect(); throw new IllegalStateException("GitHub status " + code); }
            return connection;
        }
        throw new SecurityException("Too many redirects");
    }
    private static byte[] read(String url, int limit) throws Exception {
        HttpURLConnection conn = connect(url);
        try (InputStream in = conn.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int n;
            while ((n = in.read(buffer)) != -1) { if (out.size() + n > limit) throw new SecurityException("Response too large"); out.write(buffer, 0, n); }
            return out.toByteArray();
        } finally { conn.disconnect(); }
    }
    private static String hex(byte[] bytes) {
        StringBuilder b = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) b.append(String.format(Locale.ROOT, "%02x", value & 255));
        return b.toString();
    }
    private void download(Release release) {
        if (closed || !busy.compareAndSet(false, true)) return;
        toast("正在后台下载并校验 APK…");
        worker.execute(() -> {
            File temp = null;
            try {
                String checksums = new String(read(release.checksumUrl, 128 * 1024), java.nio.charset.StandardCharsets.UTF_8);
                String expected = null;
                for (String line : checksums.split("\\r?\\n")) {
                    String suffix = "  " + release.name;
                    if (line.endsWith(suffix) && line.length() == 64 + suffix.length()) expected = line.substring(0, 64);
                }
                if (expected == null || !expected.matches("[a-fA-F0-9]{64}")) throw new SecurityException("Missing checksum");
                File folder = new File(activity.getCacheDir(), "updates");
                if (!folder.exists() && !folder.mkdirs()) throw new IllegalStateException("Cannot create update cache");
                temp = new File(folder, release.name + ".part");
                File finalFile = new File(folder, release.name);
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                HttpURLConnection conn = connect(release.apkUrl);
                long received = 0;
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(temp)) {
                    byte[] buf = new byte[16384]; int n;
                    while ((n = in.read(buf)) != -1) {
                        if (closed || received + n > MAX_APK || received + n > release.size) throw new SecurityException("Invalid APK length");
                        out.write(buf, 0, n); sha.update(buf, 0, n); received += n;
                    }
                    out.getFD().sync();
                } finally { conn.disconnect(); }
                if (received != release.size || !expected.equalsIgnoreCase(hex(sha.digest()))) throw new SecurityException("APK checksum mismatch");
                if (finalFile.exists() && !finalFile.delete()) throw new IllegalStateException("Old update locked");
                if (!temp.renameTo(finalFile)) throw new IllegalStateException("Cannot stage APK");
                try { verifySignature(finalFile, release.version); }
                catch (Exception error) { finalFile.delete(); throw error; }
                if (!closed) ui.post(() -> { if (!activity.isFinishing()) confirmInstall(finalFile); });
            } catch (Exception error) {
                if (temp != null) temp.delete();
                if (!closed) ui.post(() -> toast("下载或校验失败，未改动现有版本"));
            } finally { busy.set(false); }
        });
    }
    @SuppressWarnings("deprecation") private void verifySignature(File apk, String version) throws Exception {
        PackageManager pm = activity.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo info = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        if (info == null || !activity.getPackageName().equals(info.packageName) || !version.equals(info.versionName))
            throw new SecurityException("APK identity changed");
        Signature[] signatures = Build.VERSION.SDK_INT >= 28
            ? info.signingInfo.getApkContentsSigners() : info.signatures;
        if (signatures == null || signatures.length != 1
            || !SIGNER.equals(hex(MessageDigest.getInstance("SHA-256").digest(signatures[0].toByteArray()))))
            throw new SecurityException("APK signing certificate changed");
        long current = Build.VERSION.SDK_INT >= 28
            ? activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).getLongVersionCode()
            : activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionCode;
        long next = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        if (next <= current) throw new SecurityException("Not an upgrade");
    }
    private void confirmInstall(File file) {
        if (closed) return;
        presentPaused(() -> new AlertDialog.Builder(activity).setTitle("校验完成")
            .setMessage("安装包哈希、官方签名和版本号均已通过验证。现在由 Android 系统覆盖安装，游戏数据不会主动清理。")
            .setNegativeButton("稍后", null)
            .setPositiveButton("覆盖安装", (d, w) -> install(file)).show());
    }
    private void install(File file) {
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            pendingInstall = file;
            presentPaused(() -> new AlertDialog.Builder(activity).setTitle("允许从此来源安装")
                .setMessage("Android 需要你在系统设置里允许本应用安装更新。授权后返回游戏继续安装。")
                .setPositiveButton("打开设置", (d, w) -> activity.startActivity(
                    new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName()))))
                .setNegativeButton("取消", (d, w) -> pendingInstall = null).show());
            return;
        }
        launchInstaller(file);
    }
    private void launchInstaller(File file) {
        presentPaused(() -> launchPausedInstaller(file));
    }
    private void launchPausedInstaller(File file) {
        try {
            Uri content = FileProvider.getUriForFile(activity, activity.getPackageName() + ".updates", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(content, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        } catch (Exception error) { toast("无法打开系统安装器，请在设置中检查安装权限"); }
    }
    private void toast(String text) {
        if (!closed && !activity.isFinishing()) Toast.makeText(activity, text, Toast.LENGTH_LONG).show();
    }
}
