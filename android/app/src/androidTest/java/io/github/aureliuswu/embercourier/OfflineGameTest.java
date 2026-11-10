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
        assertTrue("Unexpected screenshot name", name.matches("(draft|star|art)-landscape(-reverse)?\\.png"));
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
            // Both the prerequisite and its child cost two stamps. Earn the whole budget
            // through real combat rather than assuming that the first two-stamp award suffices.
            await("document.getElementById('upgrade-dialog').open && JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps>=4", 600);
            js("window.emberCourierNative.pause();document.getElementById('upgrade-exit').click();document.querySelector('[data-hub=tree]').click()");
            await("document.querySelectorAll('.star-node').length===15");
            int before = Integer.parseInt(js("JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps"));
            assertTrue("Real kills should earn at least one affordable star node", before >= 2);
            assertTrue("Real combat must fund both prerequisite and child purchases", before >= 4);
            js("document.querySelector('[data-action=tree][data-id=light-step]').click()");
            assertEquals(Integer.toString(before - 2), js("JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps"));
            assertEquals("true", js("!document.querySelector('[data-action=tree][data-id=wide-bag]').disabled"));
            js("document.querySelector('[data-action=tree][data-id=wide-bag]').click()");
            assertEquals(Integer.toString(before - 4), js("JSON.parse(localStorage.getItem('ember-courier.profile.v1')).stamps"));
            assertEquals("true", js("(()=>{const p=JSON.parse(localStorage.getItem('ember-courier.profile.v1'));return p.growth.tree['light-step']===1 && p.growth.tree['wide-bag']===1})()"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("(()=>{const r=document.querySelector('.star-paths').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()"));
            js("document.querySelector('[data-action=tree][data-id=light-step]').scrollIntoView({block:'center'})");
            await("(()=>{const p=document.getElementById('hub-panel').getBoundingClientRect(),b=document.querySelector('[data-action=tree][data-id=light-step]').getBoundingClientRect();return b.height>=30&&b.left>=p.left&&b.right<=p.right&&b.top>=p.top&&b.bottom<=p.bottom-1})()");
            capture("star-landscape-reverse.png");
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

    @Test public void testWardrobeArtAndTwoFingerLivePick() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            await("innerWidth > innerHeight && !document.getElementById('orientation-dialog').open");
            js("(async()=>{const {Renderer}=await import(new URL('./render.mjs',location.href).href);const draw=Renderer.prototype.draw,p=window.__artProbe={frames:0,painted:0};const paint=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img instanceof HTMLImageElement&&img.src.includes('.webp'))p.painted++;return paint.call(this,img,...args);};Renderer.prototype.draw=function(s,...a){p.x=s.player.x;p.y=s.player.y;p.time=s.totalTime;p.skin=this.skin;p.frames++;return draw.call(this,s,...a);};p.ready=true;})()");
            await("window.__artProbe?.ready===true");
            js("document.getElementById('settings-open').click();document.querySelector('#settings [data-dialog=skins]').click();document.querySelector('[data-skin=rain]').click();document.querySelector('#skins [data-close]').click();if(!document.getElementById('touch-setting').checked)document.getElementById('touch-setting').click();if(document.getElementById('hitstop-setting').checked)document.getElementById('hitstop-setting').click();document.querySelector('#settings [data-close]').click();document.querySelector('[data-mode=endless]').click();document.querySelector('[data-starter=thunder]').click();document.querySelector('[data-difficulty=wander]').click();document.getElementById('start').click()");
            await("window.__artProbe.painted>10&&window.__artProbe.skin==='rain'");
            assertEquals("true",js("document.getElementById('player-portrait').complete&&document.getElementById('player-portrait').naturalWidth>0&&JSON.parse(localStorage.getItem('ember-courier.settings.v1')).skin==='rain'"));
            await("document.getElementById('upgrade-dialog').open",600);
            js("if(document.getElementById('draft-hold').getAttribute('aria-pressed')!=='true')document.getElementById('draft-hold').click()");
            assertEquals("true",js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).endless.choice==='skill'&&!document.getElementById('upgrade-dialog').matches(':modal')"));
            capture("art-landscape.png");
            getInstrumentation().runOnMainSync(() -> activity.getWindow().getDecorView().requestFocus());
            getInstrumentation().waitForIdleSync();
            await("!document.getElementById('pause-dialog').open");
            JSONArray points=new JSONArray(js("(()=>{const a=document.getElementById('joystick').getBoundingClientRect(),b=document.querySelector('#upgrade-options button').getBoundingClientRect();return [(a.left+a.right)/2,(a.top+a.bottom)/2,(b.left+b.right)/2,(b.top+b.bottom)/2,innerWidth]})()"));
            final int[] origin=new int[2],width=new int[1];
            getInstrumentation().runOnMainSync(()->{activity.findViewById(R.id.game_webview).getLocationOnScreen(origin);width[0]=activity.findViewById(R.id.game_webview).getWidth();});
            float density=width[0]/(float)points.getDouble(4);
            MotionEvent.PointerProperties[] props=new MotionEvent.PointerProperties[2];
            MotionEvent.PointerCoords[] coords=new MotionEvent.PointerCoords[2];
            for(int n=0;n<2;n++){props[n]=new MotionEvent.PointerProperties();props[n].id=n;props[n].toolType=MotionEvent.TOOL_TYPE_FINGER;coords[n]=new MotionEvent.PointerCoords();coords[n].pressure=1;coords[n].size=1;coords[n].x=origin[0]+(float)points.getDouble(n*2)*density;coords[n].y=origin[1]+(float)points.getDouble(n*2+1)*density;}
            js("document.getElementById('draft-hold').click()");
            long start=SystemClock.uptimeMillis();
            touch(start,MotionEvent.ACTION_DOWN,1,props,coords);
            coords[0].x+=28*density;touch(start,MotionEvent.ACTION_MOVE,1,props,coords);
            Thread.sleep(160);
            double before=Double.parseDouble(js("window.__artProbe.x"));
            touch(start,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),2,props,coords);
            touch(start,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),2,props,coords);
            Thread.sleep(180);
            double after=Double.parseDouble(js("window.__artProbe.x"));
            assertTrue("First finger must keep moving while second finger picks: "+before+" -> "+after,after>before+4);
            assertEquals("true",js("document.getElementById('joystick-thumb').style.transform!=='translate(0,0)'&&document.getElementById('runtime-error').hidden"));
            touch(start,MotionEvent.ACTION_UP,1,props,coords);
            js("window.emberCourierNative.pause()");
            assertEquals("true",js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.metrics.upgradeChoices>0||Object.values(s.endless.ranks).reduce((a,b)=>a+b,0)>1})()"));
            js("if(document.getElementById('upgrade-dialog').open)document.getElementById('upgrade-exit').click();else document.getElementById('save-exit').click();document.getElementById('settings-open').click();document.querySelector('#settings [data-dialog=skins]').click();document.querySelector('[data-skin=courier]').click();document.querySelector('#skins [data-close]').click();if(!document.getElementById('hitstop-setting').checked)document.getElementById('hitstop-setting').click();document.querySelector('#settings [data-close]').click();document.querySelector('[data-difficulty=normal]').click()");
        } finally {getInstrumentation().runOnMainSync(()->activity.finish());getInstrumentation().waitForIdleSync();}
    }

    @Test public void testImpactFeedbackSettingsAndRealCombat() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            await("innerWidth > innerHeight && !document.getElementById('orientation-dialog').open");
            // Observe the shipped presenter; the probe never modifies actors,
            // health, damage, rewards, time or the pause budget.
            js("(async()=>{const {HitFeedback}=await import(new URL('./feedback.mjs',location.href).href),{Renderer}=await import(new URL('./render.mjs',location.href).href);const p=window.__impactProbe={accepted:0,frames:0,trails:0,recoils:0,bursts:0,hold:0,near:false};const react=HitFeedback.prototype.react,draw=Renderer.prototype.draw;HitFeedback.prototype.react=function(...a){const r=react.apply(this,a);if(r>0)p.accepted++;p.hold=Math.max(p.hold,this.hold);return r;};Renderer.prototype.draw=function(s,...a){const r=draw.call(this,s,...a);p.frames++;p.trails=Math.max(p.trails,this.trails.length);p.recoils=Math.max(p.recoils,this.recoils.size);p.bursts=Math.max(p.bursts,this.deathBursts.length);p.near=s.enemies.some(e=>e.hp>0&&e.warning<=0&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<s.player.pulseRadius);return r;};p.ready=true;})().catch(e=>console.error('Impact probe initialization failed',String(e)))");
            await("window.__impactProbe?.ready===true");
            js("document.getElementById('settings-open').click();if(document.getElementById('motion-setting').checked)document.getElementById('motion-setting').click();if(!document.getElementById('hitstop-setting').checked)document.getElementById('hitstop-setting').click();document.querySelector('#settings [data-close]').click();document.querySelector('[data-mode=endless]').click();document.querySelector('[data-starter=thunder]').click();document.querySelector('[data-difficulty=wander]').click();document.getElementById('start').click()");
            boolean hit = false;
            for (int attempt = 0; attempt < 400; attempt++) {
                assertEquals("Feedback must not interrupt the real renderer", "true", js("document.getElementById('runtime-error').hidden && !document.getElementById('result-dialog').open"));
                if ("true".equals(js("window.__impactProbe.accepted>0 && window.__impactProbe.recoils>0"))) { hit = true;break; }
                js("if(window.__impactProbe.near)document.getElementById('pulse').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));if(document.getElementById('upgrade-dialog').open)document.querySelector('#upgrade-options [data-recommended=true]')?.click()");
                Thread.sleep(100);
            }
            assertTrue("Actual weapon/pulse hits must produce recoil and hit stop", hit);
            js("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}))");
            Thread.sleep(120);
            js("window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD'}))");
            await("window.__impactProbe.trails>0");
            assertEquals("Effects must remain inside their per-frame limits", "true", js("(()=>{const p=window.__impactProbe;return p.frames>10&&p.trails<=8&&p.recoils<=48&&p.bursts<=16&&p.hold<=.058001})()"));
            js("window.emberCourierNative.pause();if(document.getElementById('upgrade-dialog').open)document.getElementById('upgrade-exit').click();else document.getElementById('save-exit').click();document.getElementById('settings-open').click();document.getElementById('hitstop-setting').click();document.querySelector('#settings [data-close]').click();document.getElementById('continue').click();if(document.getElementById('upgrade-dialog').open&&document.getElementById('draft-hold').getAttribute('aria-pressed')==='true')document.getElementById('draft-hold').click()");
            int stops = Integer.parseInt(js("window.__impactProbe.accepted"));
            double before = Double.parseDouble(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).totalTime"));
            Thread.sleep(700);
            js("window.emberCourierNative.pause()");
            assertEquals(stops, Integer.parseInt(js("window.__impactProbe.accepted")));
            assertEquals("false", js("JSON.parse(localStorage.getItem('ember-courier.settings.v1')).hitstop"));
            assertTrue("Disabling hit stop must keep the actual game clock advancing", Double.parseDouble(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).totalTime")) > before + .2);
            js("if(document.getElementById('upgrade-dialog').open)document.getElementById('upgrade-exit').click();else document.getElementById('save-exit').click();document.getElementById('settings-open').click();document.getElementById('hitstop-setting').click();document.getElementById('motion-setting').click()");
            assertEquals("Reduced motion overrides hit stop without erasing its preference", "true", js("document.getElementById('hitstop-setting').checked&&document.getElementById('hitstop-setting').disabled&&JSON.parse(localStorage.getItem('ember-courier.settings.v1')).hitstop===true"));
            js("document.getElementById('motion-setting').click();document.querySelector('#settings [data-close]').click();document.querySelector('[data-difficulty=normal]').click()");
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish());getInstrumentation().waitForIdleSync(); }
    }

    @Test public void testOrdinaryRoomsKeepRenderingThroughFourthFloor() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            await("innerWidth > innerHeight && !document.getElementById('orientation-dialog').open");
            js("window.__roomErrors=[];window.addEventListener('error',e=>window.__roomErrors.push(e.message));document.querySelector('[data-mode=endless]').click();document.querySelector('[data-starter=thunder]').click();document.querySelector('[data-difficulty=wander]').click();document.getElementById('start').click()");
            // Only real UI actions: earn three rooms, use ready pulse/potions and
            // choose the displayed recommendation. Never edit simulation state.
            boolean fourthFloor = false;
            for (int attempt = 0; attempt < 1200; attempt++) {
                assertEquals("A frame fault must never interrupt ordinary-room travel", "true", js("document.getElementById('runtime-error').hidden && window.__roomErrors.length===0 && !document.getElementById('result-dialog').open"));
                if ("true".equals(js("document.getElementById('chapter-name').textContent.startsWith('第 4 层')"))) {
                    fourthFloor = true;
                    break;
                }
                js("document.getElementById('pulse').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));if(!document.getElementById('potion').disabled)document.getElementById('potion').click();if(document.getElementById('upgrade-dialog').open)document.querySelector('#upgrade-options [data-recommended=true]')?.click()");
                Thread.sleep(100);
            }
            assertTrue("Real UI combat must progress through ordinary floors 1, 2 and 3", fourthFloor);
            js("window.emberCourierNative.pause()");
            String journey = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId");
            double before = Double.parseDouble(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).totalTime"));
            assertEquals("true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.endless.floor===4 && s.endless.cleared===3 && s.kills>0 && Object.values(s.endless.oaths.ranks).reduce((a,b)=>a+b,0)===1})()"));
            js("document.getElementById('resume').click()");
            Thread.sleep(700);
            js("window.emberCourierNative.pause()");
            double after = Double.parseDouble(js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).totalTime"));
            assertTrue("The animation loop must keep simulating after a room transition", after > before + .2);
            assertEquals("The actual world Canvas must contain a rendered scene", "true", js("(()=>{const c=document.getElementById('world'),ctx=c.getContext('2d');for(let y=Math.floor(c.height*.25);y<c.height*.75;y+=31)for(let x=Math.floor(c.width*.25);x<c.width*.75;x+=31){const p=ctx.getImageData(x,y,1,1).data;if(p[0]+p[1]+p[2]>40)return true;}return false;})()"));
            js("document.getElementById('save-exit').click();document.getElementById('continue').click();window.emberCourierNative.pause()");
            assertEquals(journey, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId"));
            js("document.getElementById('save-exit').click();document.getElementById('start').click()");
            Thread.sleep(700);
            js("window.emberCourierNative.pause()");
            assertEquals("A new first-floor run must also keep advancing", "true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.endless.floor===1 && s.totalTime>.2 && document.getElementById('runtime-error').hidden && window.__roomErrors.length===0})()"));
            js("document.getElementById('save-exit').click();document.querySelector('[data-difficulty=normal]').click()");
        } finally { getInstrumentation().runOnMainSync(() -> activity.finish());getInstrumentation().waitForIdleSync(); }
    }

    @Test public void testOfflineLaunchSaveBackAndResume() throws Exception {
        Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) getInstrumentation().startActivitySync(intent);
        try {
            await("typeof window.emberCourierNative === 'object'");
            assertEquals("\"https://appassets.androidplatform.net/assets/index.html\"", js("location.href"));
            ActivityInfo declared = activity.getPackageManager().getActivityInfo(activity.getComponentName(), 0);
            assertEquals("Native app must lock both landscape directions", ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, declared.screenOrientation);
            await("innerWidth > innerHeight && !document.getElementById('orientation-dialog').open");
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), PackageManager.GET_PERMISSIONS);
            assertNotNull(info.requestedPermissions);
            assertTrue("Native update checks use HTTPS", java.util.Arrays.asList(info.requestedPermissions).contains("android.permission.INTERNET"));
            for (String permission : info.requestedPermissions) {
                assertFalse("No external-storage permissions are needed", permission.startsWith("android.permission.READ_EXTERNAL_STORAGE") || permission.startsWith("android.permission.WRITE_EXTERNAL_STORAGE"));
            }
            assertEquals("Offline assets still run inside the WebView sandbox", "true", js("(!('serviceWorker' in navigator)||!navigator.serviceWorker.controller) && location.hostname==='appassets.androidplatform.net'"));
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
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("document.documentElement.scrollWidth <= innerWidth + 1"));
            // Emulator pointer capabilities differ; exercise the actual touch setting explicitly.
            js("document.getElementById('settings-open').click(); if(!document.getElementById('touch-setting').checked)document.getElementById('touch-setting').click(); document.querySelector('#settings [data-close]').click()");
            js("document.querySelector('[data-mode=story]').click(); if(!document.getElementById('daily-setting').checked)document.getElementById('daily-setting').click(); document.getElementById('start').click()");
            await("!document.getElementById('game').hidden");
            await("document.getElementById('joystick').getBoundingClientRect().width > 70 && document.getElementById('run-time').textContent !== '00:00'");
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).v12.mode === 'challenge'"));
            assertEquals("true", js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).rulesVersion === 120"));
            // Explicitly return this existing task to the foreground after earlier rotation tests.
            // REORDER_TO_FRONT preserves the current Activity and WebView rather than creating a fixture.
            boolean focused = false;
            for (int attempt = 0; attempt < 100; attempt++) {
                if (attempt % 30 == 0) getInstrumentation().runOnMainSync(() -> {
                    Intent foreground = new Intent(activity, MainActivity.class);
                    foreground.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    activity.startActivity(foreground);
                });
                AtomicReference<Boolean> hasFocus = new AtomicReference<>(false);
                getInstrumentation().runOnMainSync(() -> hasFocus.set(activity.hasWindowFocus()));
                if (hasFocus.get()) { focused = true; break; }
                Thread.sleep(100);
            }
            if (!focused) {
                android.os.ParcelFileDescriptor dump = getInstrumentation().getUiAutomation().executeShellCommand("dumpsys window windows");
                try (java.io.InputStream in = new android.os.ParcelFileDescriptor.AutoCloseInputStream(dump)) {
                    String windows = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                    for (String line : windows.split("\\n")) {
                        if (line.contains("mCurrentFocus") || line.contains("mFocusedApp") || line.contains("mTopFocusedDisplayId")) android.util.Log.e("Game1Focus", line.trim());
                    }
                }
            }
            assertTrue("Touch test activity never received window focus", focused);
            getInstrumentation().waitForIdleSync();
            js("if(document.getElementById('pause-dialog').open)window.emberCourierNative.back()");
            // Measure coordinates only after the real window and reverse-landscape viewport are ready.
            // A foreground transition may deliver an additional Android onPause after the rotation.
            await("innerWidth > innerHeight && !document.getElementById('orientation-dialog').open");
            js("if(document.getElementById('pause-dialog').open)window.emberCourierNative.back()");
            await("innerWidth > innerHeight && !document.getElementById('pause-dialog').open");
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
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE));
            await("innerWidth > innerHeight");
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
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE));
            await("innerWidth > innerHeight");
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
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE));
            await("innerWidth > innerHeight");
            js("document.querySelector('[data-mode=endless]').click(); document.querySelector('[data-starter=thunder]').click(); document.querySelector('[data-difficulty=normal]').click(); document.getElementById('start').click()");
            // Real kills and collected room XP open this panel; no actor or reward edits.
            // New v1.8 live-draft rail lives at top-right; assert it leaves the lower-right action buttons unobstructed.
            await("document.getElementById('upgrade-dialog').open", 600);
            js("if(document.getElementById('draft-hold').getAttribute('aria-pressed')!=='true')document.getElementById('draft-hold').click()");
            android.util.Log.i("Game1Layout", "draft-layout: " + js("(()=>{const r=document.getElementById('upgrade-dialog').getBoundingClientRect(),p=document.getElementById('pulse').getBoundingClientRect(),dash=document.getElementById('dash').getBoundingClientRect();return JSON.stringify({viewport:[innerWidth,innerHeight],dialog:[r.left,r.top,r.right,r.bottom,r.height],pulse:[p.top,p.bottom],dash:[dash.top,dash.bottom],cards:document.querySelectorAll('#upgrade-options button').length,live:document.body.dataset.liveDraft,modal:document.getElementById('upgrade-dialog').matches(':modal'),overflow:document.documentElement.scrollWidth-innerWidth})})()"));
            assertEquals("true", js("(()=>{const d=document.getElementById('upgrade-dialog'),r=d.getBoundingClientRect(),p=document.getElementById('pulse').getBoundingClientRect(),dash=document.getElementById('dash').getBoundingClientRect();return d.open && !d.matches(':modal') && document.body.dataset.liveDraft==='true' && r.top>=20 && r.top<innerHeight*.48 && r.height<=innerHeight*.69 && r.bottom<=Math.min(p.top,dash.top)+2 && document.querySelectorAll('#upgrade-options button').length===3 && document.documentElement.scrollWidth<=innerWidth+1})()"));
            assertEquals("true", js("(()=>{const d=document.getElementById('upgrade-dialog').getBoundingClientRect();return [...document.querySelectorAll('.draft-footer button')].filter(b=>b.getBoundingClientRect().height>0).every(b=>{const r=b.getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom-1})})()"));
            capture("draft-landscape-reverse.png");
            assertEquals("Held draft must remain a real, positive-time skill selection", "true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.phase==='upgrade' && s.endless.choice==='skill' && s.selection?.version===1 && s.selection.held===true && s.selection.remaining>0 && s.offered.length===3})()"));
            String draftKey = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.key");
            String journey = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId");
            String remaining = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.remaining");
            Thread.sleep(700);
            js("window.emberCourierNative.pause()");
            assertEquals(remaining, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.remaining"));
            getInstrumentation().runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            await("innerWidth > innerHeight");
            assertEquals("true", js("(()=>{const r=document.getElementById('upgrade-dialog').getBoundingClientRect(),p=document.getElementById('pulse').getBoundingClientRect(),dash=document.getElementById('dash').getBoundingClientRect();return r.top>=20 && r.top<innerHeight*.48 && r.height<=innerHeight*.69 && r.bottom<=Math.min(p.top,dash.top)+2 && document.documentElement.scrollWidth<=innerWidth+1})()"));
            assertEquals("true", js("(()=>{const d=document.getElementById('upgrade-dialog').getBoundingClientRect();return [...document.querySelectorAll('.draft-footer button')].filter(b=>b.getBoundingClientRect().height>0).every(b=>{const r=b.getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom-1})})()"));
            capture("draft-landscape.png");
            js("document.getElementById('upgrade-exit').click()");
            assertEquals("Held draft must be offered for real save continuation", "true", js("!document.getElementById('continue').hidden"));
            js("document.getElementById('continue').click()");
            await("document.getElementById('upgrade-dialog').open");
            assertEquals(draftKey, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).selection.key"));
            assertEquals(journey, js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId"));
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
            assertEquals("Fixture must be a genuine live skill draft", "true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.phase==='upgrade' && s.endless.choice==='skill' && s.selection?.version===1 && s.selection.remaining>0 && s.offered.length===3})()"));
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
            // Capture before exiting in the same JS task, so no timer frame can intervene.
            // Both the exit checkpoint and reload must preserve these exact earned offers.
            String offered = js("(()=>{const offered=JSON.stringify(JSON.parse(localStorage.getItem('ember-courier.save.v1')).offered);document.getElementById('upgrade-exit').click();return offered})()");
            assertEquals("Exiting must not replace the earned offers", offered, js("JSON.stringify(JSON.parse(localStorage.getItem('ember-courier.save.v1')).offered)"));
            String journey = js("JSON.parse(localStorage.getItem('ember-courier.save.v1')).journeyId");
            assertEquals("Saved real draft must retain its selection and banish state", "true", js("(()=>{const s=JSON.parse(localStorage.getItem('ember-courier.save.v1'));return s.phase==='upgrade' && s.endless.choice==='skill' && s.selection?.version===1 && s.selection.remaining>0 && s.growth.banishes===1 && s.growth.banished.length===1})()"));
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
