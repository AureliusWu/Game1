package io.github.aureliuswu.embercourier;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

/** Offline Android host. Simulation, assets and save format are shared with the web release. */
public final class MainActivity extends Activity {
    public static final String GAME_URL = "https://appassets.androidplatform.net/assets/index.html";
    private WebView game;
    private boolean resumed;
    private boolean exitPrompt;
    private UpdateManager updateManager;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(16, 45, 50));
        game = new WebView(this);
        game.setId(R.id.game_webview);
        game.setBackgroundColor(Color.rgb(16, 45, 50));
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        // Explicit MIME types are required for strict ES-module loading, particularly .mjs.
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", this::assetResponse).build();
        updateManager = new UpdateManager(this);
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                return response != null ? response : rejected();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("ember-update".equals(url.getScheme()) && "check".equals(url.getHost())) {
                    runOnUiThread(() -> { if (updateManager != null) updateManager.check(true); });
                    return true;
                }
                return !"https".equals(url.getScheme()) || !"appassets.androidplatform.net".equals(url.getHost())
                    || !"/assets/index.html".equals(url.getPath());
            }
        });
        game.setWebChromeClient(new WebChromeClient());
        frame.addView(game, new FrameLayout.LayoutParams(-1, -1));
        setContentView(frame);
        if (Build.VERSION.SDK_INT >= 28) {
            frame.setOnApplyWindowInsetsListener((view, insets) -> {
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                view.setPadding(cutout == null ? 0 : cutout.getSafeInsetLeft(),
                    cutout == null ? 0 : cutout.getSafeInsetTop(),
                    cutout == null ? 0 : cutout.getSafeInsetRight(),
                    cutout == null ? 0 : cutout.getSafeInsetBottom());
                return insets;
            });
        }
        immersive();
        game.loadUrl(GAME_URL);
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (!isFinishing() && updateManager != null) updateManager.autoCheck();
        }, 7000);
    }

    private WebResourceResponse assetResponse(String path) {
        if (path.isEmpty() || path.contains("..") || path.contains("\\") || path.startsWith("/")) return rejected();
        String mime = path.endsWith(".mjs") || path.endsWith(".js") ? "application/javascript"
            : path.endsWith(".css") ? "text/css" : path.endsWith(".html") ? "text/html"
            : path.endsWith(".webp") ? "image/webp" : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".png") ? "image/png"
            : path.endsWith(".webmanifest") ? "application/manifest+json" : "application/octet-stream";
        try { return new WebResourceResponse(mime, "UTF-8", 200, "OK",
            Collections.singletonMap("Cache-Control", "no-store"), getAssets().open(path)); }
        catch (IOException error) { return rejected(); }
    }

    private static WebResourceResponse rejected() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    @SuppressWarnings("deprecation") private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
    @Override public void onConfigurationChanged(Configuration configuration) { super.onConfigurationChanged(configuration); immersive(); }
    @Override protected void onResume() {
        super.onResume(); resumed = true;
        if (game != null) { game.resumeTimers(); game.onResume(); }
        if (updateManager != null) updateManager.onResume();
    }
    @Override protected void onPause() {
        resumed = false;
        if (game != null) {
            game.evaluateJavascript("window.emberCourierNative?.pause()", result -> {
                if (!resumed && game != null) { game.onPause(); game.pauseTimers(); }
            });
        }
        super.onPause();
    }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() {
        game.evaluateJavascript("window.emberCourierNative?.back() ?? false", handled -> {
            if (!"true".equals(handled) && !isFinishing() && !exitPrompt) {
                exitPrompt = true;
                new AlertDialog.Builder(this).setTitle("离开余烬信使？")
                    .setMessage("旅途会自动保存，下次可以继续送信。")
                    .setPositiveButton("离开", (dialog, which) -> finish())
                    .setNegativeButton("留下", null)
                    .setOnDismissListener(dialog -> exitPrompt = false).show();
            }
        });
    }
    @Override protected void onDestroy() {
        if (updateManager != null) { updateManager.shutdown(); updateManager = null; }
        if (game != null) { game.resumeTimers(); game.stopLoading(); game.destroy(); game = null; }
        super.onDestroy();
    }
}
