import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,tick,dash,pulse,serialize,restore,chooseUpgrade,chooseSpecialization,chooseContinuation} from '../dist/core.mjs';
import {createProfile,readProfile,recordProgress,buyTalent,resetTalents} from '../dist/progress.mjs';
import {TREE,buyNode,treeInvestment,resetTree,claimGoal,mastery,specializationPoints,growthPower,growthXP} from '../dist/growth.mjs';
import {addXP,recalculate,chooseStory,nearestPOI,openPOI} from '../dist/systems.mjs';
import {ARCS,followupAvailable,residentPages,epilogue,deliveryReply} from '../dist/narrative.mjs';
import {advanceEndlessChoices,banishEndless,rerollEndless,gainEndlessXP} from '../dist/endless.mjs';
import {ensureDraft,stepDraft} from '../dist/draft.mjs';
import {playJourney} from './journey-bot.mjs';
const funded=()=>{const p=createProfile();p.stamps=200;p.earned=200;return p;};
const lightPath=(p,path)=>{for(const n of TREE.filter(n=>n.path===path))assert.ok(buyNode(p,n.id));};
test('old profiles retain courses, currency and records while gaining an empty star chart',()=>{
 const p=funded();buyTalent(p,'lamp');delete p.growth;const q=readProfile(JSON.stringify(p));assert.equal(q.stamps,198);assert.equal(q.talents.lamp,1);assert.deepEqual(q.growth.tree,{});assert.equal(mastery(q).level,1);
});
test('tree prerequisites, ranked prices and full refunds conserve stamps over repeated rebuilds',()=>{
 const p=funded();assert.equal(buyNode(p,'first-flight'),false);assert.equal(buyNode(p,'constructor'),false);
 for(let attempt=0;attempt<3;attempt++){for(const n of TREE)for(let i=0;i<n.max;i++)assert.ok(buyNode(p,n.id));assert.equal(buyNode(p,'light-step'),false);const spent=treeInvestment(p);assert.equal(p.stamps+spent,200);assert.equal(resetTree(p),spent);assert.equal(p.stamps,200);assert.equal(p.earned,200);assert.equal(p.spent,0);assert.equal(resetTree(p),false);}
});
test('baseline course resets refund precisely without clearing the independent skill tree',()=>{
 const p=funded();buyTalent(p,'focus');buyTalent(p,'focus');buyNode(p,'bright-wick');assert.equal(resetTalents(p),5);assert.equal(p.stamps,198);assert.equal(p.growth.tree['bright-wick'],1);assert.equal(resetTalents(p),false);
});
test('malformed growth data cannot erase a valid legacy profile or bypass node dependencies',()=>{
 const p=funded();p.growth={version:1,tree:{'sealed-light':1,'bright-wick':999,'light-step':1},claims:{},arcs:'shuo:escort'};
 const q=readProfile(JSON.stringify(p));assert.equal(q.stamps,200);assert.deepEqual(q.growth.tree,{'light-step':1});assert.deepEqual(q.growth.claims,[]);assert.deepEqual(q.growth.arcs,[]);
});
test('launch snapshots tree effects; rebuilds and profile purchases leave the current run intact',()=>{
 const p=funded();lightPath(p,'swift');const s=createGame({seed:6,profile:p}),speed=s.player.speed,tree={...s.growth.tree};resetTree(p);lightPath(p,'dawn');recalculate(s);assert.equal(s.player.speed,speed);assert.deepEqual(s.growth.tree,tree);assert.equal(growthXP(s),1.05);const q=createGame({seed:6,profile:p});assert.ok(q.player.damage>s.player.damage);
});
test('mastery follows high-water gameplay totals; goals are atomic across repeated observations and reloads',()=>{
 const s=createGame({seed:4}),p=createProfile();s.kills=10;recordProgress(p,s);const xp=mastery(p).xp;assert.equal(claimGoal(p,'first-job'),true);const stamps=p.stamps;
 for(let i=0;i<5;i++){recordProgress(p,s);assert.equal(claimGoal(p,'first-job'),false);}assert.equal(p.stamps,stamps);assert.equal(mastery(p).xp,xp);const q=readProfile(JSON.stringify(p));assert.equal(claimGoal(q,'first-job'),false);assert.equal(q.stamps,stamps);
});
test('fair challenge excludes permanent tree, story follow-ups and run specializations',()=>{
 const p=funded();for(const path of ['swift','warden','dawn'])lightPath(p,path);const s=createGame({seed:5,profile:p,daily:'2026-11-07'}),base=createGame({seed:5,daily:'2026-11-07'});assert.equal(s.growth,undefined);assert.equal(s.narrative,undefined);assert.deepEqual(s.player,base.player);assert.equal(chooseSpecialization(s,'dawn'),false);
});
test('specializations unlock at actual XP thresholds and never refill health by recalculation',()=>{
 const s=createGame({seed:7});assert.equal(chooseSpecialization(s,'warden'),false);addXP(s,75);assert.equal(s.journal.level,3);assert.equal(specializationPoints(s),1);s.player.hp=30;const max=s.player.maxHp;assert.ok(chooseSpecialization(s,'warden'));assert.equal(s.player.hp,30);assert.equal(s.player.maxHp,max+10);assert.equal(chooseSpecialization(s,'dawn'),false);recalculate(s);assert.equal(s.player.hp,30);assert.equal(s.player.maxHp,max+10);
 addXP(s,600);assert.equal(specializationPoints(s),2);assert.ok(chooseSpecialization(s,'dawn'));assert.ok(chooseSpecialization(s,'swift'));assert.equal(specializationPoints(s),0);assert.equal(growthPower(s),1.07);assert.ok(restore(serialize(s)));
});
test('tree keystones trigger through real dash and pulse input and consume their next volley once',()=>{
 const p=funded();lightPath(p,'swift');lightPath(p,'dawn');const s=createGame({seed:3,profile:p});dash(s);pulse(s);assert.equal(s.growth.dashUntil,2);assert.equal(s.growth.pulseUntil,2);assert.ok(restore(serialize(s)));
 s.player.attackCd=0;s.enemies=[{id:900,kind:'shade',x:330,y:690,r:18,hp:1000,maxHp:1000,speed:0,damage:0,stun:0,warning:0,attack:0,shotCd:3,angle:0}];tick(s,{},.01);assert.equal(s.growth.dashUntil,0);assert.equal(s.growth.pulseUntil,0);assert.ok(s.projectiles.some(b=>!b.enemy&&b.damage>=s.player.damage*1.18*1.2-.001));
});
test('guard keystone grants one bounded screen only when a pulse actually hits two enemies',()=>{
 const p=funded();lightPath(p,'warden');const s=createGame({seed:3,profile:p});pulse(s);assert.equal(s.v12.barrier,0);s.player.pulseCd=0;s.enemies=[1,2].map(id=>({id,kind:'shade',x:250+id*12,y:690,r:18,hp:1000,maxHp:1000,speed:0,damage:0,stun:0,warning:0,attack:0,shotCd:3,angle:0}));pulse(s);assert.equal(s.v12.barrier,1);assert.equal(s.v12.barrierUntil,2);
});
test('two banishes remove unowned cards from all later offers and survive save/resume',()=>{
 let s=createGame({seed:88,mode:'endless'});s.endless.pending=1;advanceEndlessChoices(s);ensureDraft(s);const id=s.offered.find(id=>!s.endless.ranks[id]);assert.ok(id);assert.ok(banishEndless(s,id));assert.equal(s.growth.banishes,1);assert.ok(!s.offered.includes(id));s=restore(serialize(s));assert.ok(s);assert.ok(!s.offered.includes(id));assert.equal(banishEndless(s,s.endless.starter),false);const other=s.offered.find(id=>!s.endless.ranks[id]);assert.ok(banishEndless(s,other));assert.equal(s.growth.banishes,0);assert.equal(banishEndless(s,s.offered[0]),false);for(let i=0;i<2;i++){rerollEndless(s);assert.ok(s.offered.every(id=>!s.growth.banished.includes(id)));}assert.ok(chooseUpgrade(s,s.offered[0]));
});
test('illegal growth save state is rejected rather than granting free points or banishes',()=>{
 const changes=[s=>s.growth.banishes=3,s=>s.growth.disciplines.dawn=3,s=>s.growth.tree['sealed-light']=1,s=>s.growth.banished=['not-a-card'],s=>s.growth.dashUntil=1000];
 for(const mutate of changes){const s=createGame({seed:3});mutate(s);assert.equal(restore(serialize(s)),null);}
});
test('resident continuations require delivered letters, a lit district, money and real proximity',()=>{
 const s=createGame({seed:8}),npc=s.pois.find(p=>p.kind==='npc');assert.equal(chooseContinuation(s,npc.id,'escort'),false);s.player.x=npc.x;s.player.y=npc.y;assert.ok(chooseStory(s,npc.id,'promise'));assert.equal(followupAvailable(s,npc),false);s.story.tasks[0].complete=true;s.story.tasks[0].progress=.75;s.story.delivered=['home'];for(const b of s.beacons)b.lit=true;assert.equal(followupAvailable(s,npc),true);assert.equal(nearestPOI(s).id,npc.id);assert.equal(openPOI(s,npc.id).kind,'continuation');s.journal.coins=7;assert.equal(chooseContinuation(s,npc.id,'hearth'),false);s.player.x=1500;assert.equal(chooseContinuation(s,npc.id,'escort'),false);s.player.x=npc.x;s.journal.coins=8;s.player.hp=30;const hp=s.player.maxHp;assert.ok(chooseContinuation(s,npc.id,'hearth'));assert.equal(s.journal.coins,0);assert.equal(s.player.hp,30);assert.equal(s.player.maxHp,hp+10);assert.equal(chooseContinuation(s,npc.id,'hearth'),false);assert.ok(restore(serialize(s)));
});
test('new dialogue and replies remember prior deliveries and shared light',()=>{
 const s=createGame({seed:2});const before=residentPages(s,1);s.story.delivered.push('home');assert.notDeepEqual(residentPages(s,1),before);const reply=deliveryReply(s,'home');s.story.choices.push({npc:'shuo',choice:'share'});assert.notEqual(deliveryReply(s,'home'),reply);assert.ok(residentPages(s,2)[0].includes('火种'));
});
for(const followups of ['free','paid'])for(const difficulty of ['wander','normal'])test(`complete linked story via actual play: ${followups} / ${difficulty}`,()=>{
 const {state:s,phase}=playJourney(497,difficulty,{systems:true,share:followups==='paid',followups,resume:true});assert.equal(phase,'won');assert.equal(s.narrative.followups.length,3);assert.equal(s.metrics.deliveries,3);assert.equal(s.litTotal,9);assert.ok(s.bossDefeated);assert.equal(s.story.ending,followups==='paid'?'hearth':'letters');for(const a of s.narrative.followups)assert.ok(epilogue(s).includes(ARCS.find(arc=>arc.npc===a.npc).choices.find(c=>c.id===a.choice).text));
 assert.deepEqual(s.narrative.followups.map(a=>a.choice),followups==='paid'?['hearth','share','tomorrow']:['escort','seed','remember']);const p=createProfile();recordProgress(p,s,{final:true});assert.equal(p.growth.arcs.length,3);const stamps=p.stamps;recordProgress(p,s,{final:true});assert.equal(p.stamps,stamps);assert.ok(claimGoal(p,'resident-book'));assert.equal(claimGoal(p,'resident-book'),false);
});
const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/v1.5.1-endless.json',import.meta.url),'utf8'));
for(const fixture of legacy.records)test(`unmodified v1.5.1 save replays identically: ${fixture.starter}`,()=>{
 const s=restore(fixture.raw);assert.ok(s);assert.equal(s.growth,undefined);assert.equal(s.narrative,undefined);
 for(let i=0;i<200;i++){if(s.phase==='upgrade')chooseUpgrade(s,s.offered[0]);tick(s,{x:Math.cos(i/30),y:Math.sin(i/30)},.05);}
 assert.deepEqual(JSON.parse(serialize(s)),fixture.expected);
});
