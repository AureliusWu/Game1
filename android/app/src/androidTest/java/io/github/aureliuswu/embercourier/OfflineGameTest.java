package io.github.aureliuswu.embercourier;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.app.Instrumentation;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Launches the actual packaged game, tests persistence and native back/pause contracts. */
@SuppressWarnings("deprecation")
@RunWith(AndroidJUnit4.class)
public final class OfflineGameTest {
    private MainActivity activity;
    private Instrumentation getInstrumentation() { return InstrumentationRegistry.getInstrumentation(); }
    private String js(String source) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        getInstrumentation().runOnMainSync(() -> ((WebView) activity.findViewById(R.id.game_webview))
            .evaluateJavascript(source, result -> { value.set(result); done.countDown(); }));
        assertTrue("WebView callback timed out", done.await(15, TimeUnit.SECONDS));
        return value.get();
    }
    private void await(String condition) throws Exception {
        for (int attempt = 0; attempt < 150; attempt++) {
            if ("true".equals(js(condition))) return;
            Thread.sleep(100);
        }
        fail("Game did not reach: " + condition);
    }
    @Test public void testOfflineLaunchSaveBackAndResume() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            assertEquals("\"https://appassets.androidplatform.net/assets/index.html\"", js("location.href"));
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), PackageManager.GET_PERMISSIONS);
            if (info.requestedPermissions != null) for (String permission : info.requestedPermissions)
                assertFalse("Game must work with no network permission", "android.permission.INTERNET".equals(permission));
            assertEquals("true", js("document.getElementById('start').click(); !document.getElementById('game').hidden"));
            assertEquals("true", js("window.emberCourierNative.pause(); document.getElementById('pause-dialog').open"));
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')) !== null"));
            assertEquals("true", js("window.emberCourierNative.back(); !document.getElementById('pause-dialog').open"));
            assertEquals("true", js("document.getElementById('game-hub').click(); document.getElementById('hub-dialog').open"));
            assertEquals("true", js("window.emberCourierNative.back(); !document.getElementById('hub-dialog').open"));
            js("window.emberCourierNative.pause(); document.getElementById('save-exit').click()");
            assertEquals("false", js("window.emberCourierNative.back()"));
            assertEquals("true", js("document.getElementById('continue').click(); !document.getElementById('game').hidden"));
            js("window.emberCourierNative.pause()");
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
}
