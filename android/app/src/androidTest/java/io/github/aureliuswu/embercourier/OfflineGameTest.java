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
import android.content.pm.ActivityInfo;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.MotionEvent;
import org.json.JSONArray;
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
    private void touch(long start, int action, int count, MotionEvent.PointerProperties[] props, MotionEvent.PointerCoords[] coords) {
        MotionEvent event = MotionEvent.obtain(start, SystemClock.uptimeMillis(), action, count, props, coords, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
        getInstrumentation().sendPointerSync(event);
        event.recycle();
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
    @Test public void testNightRoutesTouchAndRotation() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            assertEquals("4", js("document.querySelectorAll('#route-conditions input').length"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            await("innerHeight > innerWidth");
            assertEquals("true", js("document.documentElement.scrollWidth <= innerWidth + 1"));
            // Emulator pointer capabilities differ; exercise the actual touch setting explicitly.
            js("document.getElementById('settings-open').click(); if(!document.getElementById('touch-setting').checked)document.getElementById('touch-setting').click(); document.querySelector('#settings [data-close]').click()");
            js("if(!document.getElementById('daily-setting').checked)document.getElementById('daily-setting').click(); document.getElementById('start').click()");
            await("!document.getElementById('game').hidden");
            await("document.getElementById('joystick').getBoundingClientRect().width > 70 && document.getElementById('run-time').textContent !== '00:00'");
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).v12.mode === 'challenge'"));
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).rulesVersion === 120"));
            double beforeX = Double.parseDouble(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).player.x"));
            JSONArray points = new JSONArray(js("(()=>{const a=document.getElementById('joystick').getBoundingClientRect(),b=document.getElementById('pulse').getBoundingClientRect();return [(a.left+a.right)/2,(a.top+a.bottom)/2,(b.left+b.right)/2,(b.top+b.bottom)/2,innerWidth,devicePixelRatio]})()"));
            final int[] origin = new int[2];
            final int[] viewWidth = new int[1];
            getInstrumentation().runOnMainSync(() -> { activity.findViewById(R.id.game_webview).getLocationOnScreen(origin); viewWidth[0] = activity.findViewById(R.id.game_webview).getWidth(); });
            MotionEvent.PointerProperties[] props = new MotionEvent.PointerProperties[2];
            MotionEvent.PointerCoords[] coords = new MotionEvent.PointerCoords[2];
            float density = viewWidth[0] / (float) points.getDouble(4);
            for (int i = 0; i < 2; i++) {
                props[i] = new MotionEvent.PointerProperties(); props[i].id = i; props[i].toolType = MotionEvent.TOOL_TYPE_FINGER;
                coords[i] = new MotionEvent.PointerCoords(); coords[i].pressure = 1; coords[i].size = 1;
                coords[i].x = origin[0] + (float) points.getDouble(i * 2) * density;
                coords[i].y = origin[1] + (float) points.getDouble(i * 2 + 1) * density;
            }
            long start = SystemClock.uptimeMillis();
            touch(start, MotionEvent.ACTION_DOWN, 1, props, coords);
            touch(start, MotionEvent.ACTION_POINTER_DOWN | (1 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 2, props, coords);
            coords[0].x += 30 * density;
            touch(start, MotionEvent.ACTION_MOVE, 2, props, coords);
            Thread.sleep(800);
            String held = js("JSON.stringify({thumb:document.getElementById('joystick-thumb').style.transform,time:document.getElementById('run-time').textContent,paused:document.getElementById('pause-dialog').open,pulse:document.getElementById('pulse-cd').textContent})");
            touch(start, MotionEvent.ACTION_POINTER_UP | (1 << MotionEvent.ACTION_POINTER_INDEX_SHIFT), 2, props, coords);
            touch(start, MotionEvent.ACTION_UP, 1, props, coords);
            js("window.emberCourierNative.pause()");
            assertEquals("true", js("document.getElementById('pause-dialog').open"));
            double afterX = Double.parseDouble(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).player.x"));
            assertTrue("Joystick + pulse: before=" + beforeX + ", after=" + afterX + ", css=" + points + ", scale=" + density + ", held=" + held, afterX > beforeX + 10);
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).metrics.pulses >= 1"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("document.getElementById('pause-dialog').open"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            await("innerHeight > innerWidth");
            js("window.emberCourierNative.back(); document.getElementById('game-hub').click()");
            assertEquals("true", js("document.getElementById('hub-dialog').open && document.getElementById('hub-dialog').getBoundingClientRect().width <= innerWidth"));
            js("window.emberCourierNative.back(); window.emberCourierNative.pause(); document.getElementById('save-exit').click()");
            assertEquals("true", js("!document.getElementById('continue').hidden"));
            String journey = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId");
            getInstrumentation().runOnMainSync(() -> activity.finish());
            activity = (MainActivity) getInstrumentation().startActivitySync(intent);
            await("typeof window.emberCourierNative === 'object'");
            assertEquals("true", js("!document.getElementById('continue').hidden"));
            js("document.getElementById('continue').click(); window.emberCourierNative.pause()");
            assertEquals(journey, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId"));
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
}
