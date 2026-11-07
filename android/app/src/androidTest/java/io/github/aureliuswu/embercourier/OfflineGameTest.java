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
    private void await(String condition) throws Exception { await(condition, 150); }
    private void await(String condition, int attempts) throws Exception {
        for (int attempt = 0; attempt < attempts; attempt++) {
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
    private void capture(String name) throws Exception {
        assertTrue("Unexpected screenshot name", name.matches("(draft|star)-(portrait|landscape)\\.png"));
        CountDownLatch rendered = new CountDownLatch(1);
        getInstrumentation().runOnMainSync(() -> {
            WebView web = activity.findViewById(R.id.game_webview);
            web.postVisualStateCallback(SystemClock.uptimeMillis(), new WebView.VisualStateCallback() {
                @Override public void onComplete(long requestId) {
                    if (android.os.Build.VERSION.SDK_INT >= 29) {
                        web.getViewTreeObserver().registerFrameCommitCallback(rendered::countDown);
                        web.invalidate();
                    } else {
                        web.postOnAnimation(() -> web.postOnAnimation(rendered::countDown));
                    }
                }
            });
        });
        assertTrue("Updated WebView frame did not reach the display", rendered.await(30, TimeUnit.SECONDS));
        // Gradle uninstalls the test target after connected tests. Shell-owned captures survive it.
        android.os.ParcelFileDescriptor output = getInstrumentation().getUiAutomation()
            .executeShellCommand("screencap -p /sdcard/Download/ember-" + name);
        try (java.io.InputStream in = new android.os.ParcelFileDescriptor.AutoCloseInputStream(output)) {
            byte[] buffer = new byte[1024];
            while (in.read(buffer) != -1) { /* Wait for the real screen capture to finish. */ }
        }
    }
    @Test public void testStarChartPurchaseRefundAndRotation() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            // Earn stamps through actual kills; the game's pagehide autosave remains fully enabled.
            js("document.querySelector('[data-mode=endless]').click();document.querySelector('[data-starter=thunder]').click();document.querySelector('[data-difficulty=normal]').click();document.getElementById('start').click()");
            await("document.getElementById('upgrade-dialog').open", 600);
            js("window.emberCourierNative.pause();document.getElementById('upgrade-exit').click();document.querySelector('[data-hub=tree]').click()");
            await("document.querySelectorAll('.star-node').length===15");
            int before = Integer.parseInt(js("JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps"));
            assertTrue("Real kills should earn at least one affordable star node", before >= 2);
            js("document.querySelector('[data-action=tree][data-id=light-step]').click()");
            assertEquals(Integer.toString(before - 2), js("JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps"));
            assertEquals("true", js("!document.querySelector('[data-action=tree][data-id=wide-bag]').disabled"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            await("innerHeight > innerWidth");
            assertEquals("true", js("(()=>{const r=document.querySelector('.star-paths').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()"));
            js("document.querySelector('[data-action=tree][data-id=light-step]').scrollIntoView({block:'center'})");
            await("(()=>{const p=document.getElementById('hub-panel').getBoundingClientRect(),b=document.querySelector('[data-action=tree][data-id=light-step]').getBoundingClientRect();return b.height>=30&&b.left>=p.left&&b.right<=p.right&&b.top>=p.top&&b.bottom<=p.bottom-1})()");
            capture("star-portrait.png");
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("document.documentElement.scrollWidth<=innerWidth+1 && document.querySelectorAll('.star-path').length===3"));
            assertEquals("true", js("document.getElementById('hub-panel').getBoundingClientRect().height>=innerHeight*.5"));
            js("document.querySelector('[data-action=tree][data-id=light-step]').scrollIntoView({block:'center'})");
            await("(()=>{const p=document.getElementById('hub-panel').getBoundingClientRect(),b=document.querySelector('[data-action=tree][data-id=light-step]').getBoundingClientRect();return b.height>=30&&b.left>=p.left&&b.right<=p.right&&b.top>=p.top&&b.bottom<=p.bottom-1})()");
            capture("star-landscape.png");
            js("document.querySelector('[data-action=reset-tree]').click()");
            assertEquals(Integer.toString(before), js("JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps"));
            assertEquals("true", js("document.querySelector('[data-action=reset-tree]').disabled"));
            assertEquals("true", js("window.emberCourierNative.back();!document.getElementById('hub-dialog').open"));
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish());getInstrumentation().waitForIdleSync(); }
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
            assertEquals("true", js("document.querySelector('[data-mode=endless]').click(); document.getElementById('start').click(); !document.getElementById('game').hidden"));
            assertEquals("true", js("window.emberCourierNative.pause(); document.getElementById('pause-dialog').open"));
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')) !== null"));
            assertEquals("true", js("window.emberCourierNative.back(); !document.getElementById('pause-dialog').open"));
            assertEquals("true", js("document.getElementById('game-hub').click(); document.getElementById('build-dialog').open"));
            assertEquals("true", js("window.emberCourierNative.back(); !document.getElementById('build-dialog').open"));
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
            js("document.querySelector('[data-mode=story]').click(); if(!document.getElementById('daily-setting').checked)document.getElementById('daily-setting').click(); document.getElementById('start').click()");
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
            // Wait until this activity owns the window before Android 15 targeted touch injection.
            boolean focused = false;
            for (int attempt = 0; attempt < 100; attempt++) {
                AtomicReference<Boolean> hasFocus = new AtomicReference<>(false);
                getInstrumentation().runOnMainSync(() -> hasFocus.set(activity.hasWindowFocus()));
                if (hasFocus.get()) { focused = true; break; }
                Thread.sleep(100);
            }
            assertTrue("Touch test activity never received window focus", focused);
            getInstrumentation().waitForIdleSync();
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
    @Test public void testCombatControlsMeterAndRotation() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            js("document.querySelector('[data-mode=endless]').click(); document.getElementById('start').click(); document.getElementById('dash').click(); document.getElementById('pulse').click(); window.emberCourierNative.pause()");
            // Skill controls use pointerdown on touch hardware; invoke those real input events.
            js("window.emberCourierNative.back(); document.getElementById('dash').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); document.getElementById('pulse').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); window.emberCourierNative.pause()");
            assertEquals("true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.endless.combat.version===1 && s.endless.combat.dashSerial===1 && s.metrics.dashes===1 && s.metrics.pulses===1})()"));
            assertEquals("true", js("!document.getElementById('combat-meter').hidden"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            await("innerHeight > innerWidth");
            assertEquals("true", js("(()=>{const a=document.getElementById('combat-meter').getBoundingClientRect(),b=document.getElementById('build-open').getBoundingClientRect();return a.bottom+1 <= b.top && document.documentElement.scrollWidth <= innerWidth+1})()"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("(()=>{const a=document.getElementById('combat-meter').getBoundingClientRect(),b=document.getElementById('build-open').getBoundingClientRect();return a.bottom+1 <= b.top})()"));
            js("document.getElementById('save-exit').click(); document.getElementById('continue').click(); window.emberCourierNative.pause()");
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).endless.combat.dashSerial===1"));
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
    @Test public void testCompactDraftClockAutoPickAndRotation() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            await("innerHeight > innerWidth");
            js("document.querySelector('[data-mode=endless]').click(); document.querySelector('[data-starter=thunder]').click(); document.querySelector('[data-difficulty=normal]').click(); document.getElementById('start').click()");
            // Real kills and collected room XP open this panel; no actor or reward edits.
            await("document.getElementById('upgrade-dialog').open", 600);
            js("if(document.getElementById('draft-hold').getAttribute('aria-pressed')!=='true')document.getElementById('draft-hold').click()");
            assertEquals("true", js("(()=>{const d=document.getElementById('upgrade-dialog'),r=d.getBoundingClientRect();return d.open && !d.matches(':modal') && r.top>innerHeight*.50 && r.height<=innerHeight*.45 && document.querySelectorAll('#upgrade-options button').length===3 && document.documentElement.scrollWidth<=innerWidth+1})()"));
            assertEquals("true", js("(()=>{const d=document.getElementById('upgrade-dialog').getBoundingClientRect();return [...document.querySelectorAll('.draft-footer button')].filter(b=>b.getBoundingClientRect().height>0).every(b=>{const r=b.getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom-1})})()"));
            capture("draft-portrait.png");
            String remaining = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.remaining");
            Thread.sleep(700);
            js("window.emberCourierNative.pause()");
            assertEquals(remaining, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.remaining"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("(()=>{const r=document.getElementById('upgrade-dialog').getBoundingClientRect();return r.top>innerHeight*.48 && r.height<=innerHeight*.49 && document.documentElement.scrollWidth<=innerWidth+1})()"));
            assertEquals("true", js("(()=>{const d=document.getElementById('upgrade-dialog').getBoundingClientRect();return [...document.querySelectorAll('.draft-footer button')].filter(b=>b.getBoundingClientRect().height>0).every(b=>{const r=b.getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom-1})})()"));
            capture("draft-landscape.png");
            js("document.getElementById('upgrade-exit').click(); document.getElementById('continue').click()");
            assertEquals(remaining, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.remaining"));
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.held"));
            String before = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).metrics.autoChoices||0");
            js("document.getElementById('draft-hold').click()");
            await("(JSON.parse(localStorage.getItem('ember-courier.save.v1')).metrics.autoChoices||0)>" + before, 160);
            assertEquals("true", js("document.getElementById('game').hidden===false"));
            js("window.emberCourierNative.pause()");
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }
    @Test public void testEndlessRealDraftSaveAndResume() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            js("document.querySelector('[data-mode=endless]').click(); document.querySelector('[data-starter=thunder]').click(); document.querySelector('[data-difficulty=normal]').click(); document.getElementById('start').click()");
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).endless.starter === 'thunder'"));
            // The real auto-attacks and enemies produce this draft. No simulation state is edited.
            await("document.getElementById('upgrade-dialog').open", 600);
            assertEquals("true", js("document.querySelectorAll('#upgrade-options button').length === 3"));
            // The same real earned draft exercises the new banish modal and its saved charge.
            assertEquals("false", js("document.getElementById('draft-banish').disabled"));
            js("document.getElementById('draft-banish').click()");
            assertEquals("true", js("document.getElementById('banish-dialog').open && document.querySelectorAll('#banish-panel button').length>0"));
            js("document.querySelector('#banish-panel button').click()");
            assertEquals("true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return !document.getElementById('banish-dialog').open&&s.growth.banishes===1&&s.growth.banished.length===1&&!s.offered.includes(s.growth.banished[0])})()"));
            String before = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).endless.rerolls");
            js("document.getElementById('draft-reroll').click()");
            assertTrue(Integer.parseInt(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).endless.rerolls")) < Integer.parseInt(before));
            String offered = js("JSON.stringify(JSON.parse(localStorage.getItem('ember-courier.save.v1')).offered)");
            String journey = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId");
            js("document.getElementById('upgrade-exit').click()");
            assertEquals("true", js("!document.getElementById('continue').hidden"));
            js("document.getElementById('continue').click()");
            assertEquals("true", js("document.getElementById('upgrade-dialog').open"));
            assertEquals(offered, js("JSON.stringify(JSON.parse(localStorage.getItem('ember-courier.save.v1')).offered)"));
            assertEquals(journey, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId"));
            assertEquals("1", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).growth.banishes"));
            js("document.getElementById('build-open').click()");
            assertEquals("true", js("document.getElementById('build-dialog').open && document.querySelectorAll('#build-content [data-action=specialize]').length===3"));
            js("window.emberCourierNative.back();document.querySelector('#upgrade-options button').click()");
            await("!document.getElementById('upgrade-dialog').open || document.querySelectorAll('#upgrade-options button').length > 0");
            assertEquals("true", js("document.documentElement.scrollWidth <= innerWidth + 1"));
            js("window.emberCourierNative.pause()");
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish()); }
    }

}
