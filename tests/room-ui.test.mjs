import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as core from '../dist/core.mjs';
import * as endless from '../dist/endless.mjs';
import * as draft from '../dist/draft.mjs';
import * as combat from '../dist/combat.mjs';
import * as content from '../dist/content.mjs';
import * as growth from '../dist/growth.mjs';
import {playEndless} from './endless-bot.mjs';
import {HitFeedback} from '../dist/feedback.mjs';
import {skillIcon} from '../dist/art.mjs';
import {ENDLESS_MAPS} from '../dist/endless-maps.mjs';

// Execute the shipped UI functions, including reentrant reward processing. The
// simulation policy earns every room/offer through normal combat and choices.
const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
function shippedFunction(name){
 const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,name);
 const rest=source.slice(start),end=rest.search(/\n(?=(?:async )?function |const landscapeGate=)/);
 return end<0?rest:rest.slice(0,end);
}
let checkpoints;
function earnedRoom(floor){
 if(!checkpoints){
  checkpoints=new Map();
  const result=playEndless({seed:1301,starter:'thunder',floors:5,maxTime:600,observe(s){
   if(s.phase==='upgrade'&&!s.endless.clearedRoom&&!checkpoints.has('live'))checkpoints.set('live',{raw:core.serialize(s),events:structuredClone(s.events)});
   if(s.phase==='upgrade'&&s.endless.clearedRoom&&!checkpoints.has(s.endless.floor)){
    checkpoints.set(s.endless.floor,{raw:core.serialize(s),events:structuredClone(s.events)});
   }
  }});
  assert.equal(result.s.phase,'won');
 }
 const record=checkpoints.get(floor);assert.ok(record);
 const s=core.restore(record.raw);assert.ok(s);s.events=structuredClone(record.events);return s;
}
function ui(s){
 const nodes=new Map(),seen=[],sounds=[],frames=[],saved=[],scheduled=[],errors=[];
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{id,open:false,hidden:false,dataset:{},style:{},children:[],
   classList:{toggle(){}},setAttribute(){},focus(){},listeners:new Map(),setPointerCapture(){},addEventListener(type,fn){this.listeners.set(type,fn);},
   append(child){this.children.push(child);},replaceChildren(){this.children=[];},
   show(){this.open=true;},showModal(){this.open=true;},close(){this.open=false;}});
  return nodes.get(id);
 };
 const context=vm.createContext({...core,...endless,...draft,...combat,...content,...growth,ENDLESS_MAPS,skillIcon,
  run:s,screen:'game',paused:false,ended:false,frameFault:false,saveTimer:0,hudTimer:0,
  last:0,bannerUntil:0,letterUntil:0,toastUntil:0,achievementUntil:0,
  joy:{x:0,y:0},keys:new Set(),destination:null,stuckFor:0,
  landscapeGate:{blocked:false},settings:{lowMotion:true,hitstop:true},feedback:new HitFeedback(),
  document:{hidden:false,body:{dataset:{}},createElement:()=>node(Symbol()),
   querySelector:selector=>[...nodes.values()].find(n=>n.open&&(!selector.includes(':not(#upgrade-dialog)')||n.id!=='upgrade-dialog'))||null,
   querySelectorAll:()=>[...nodes.values()].filter(n=>n.open)},$:node,
  audio:{play(type){sounds.push(type);},update(){},unlock(){},suspend(){}},
  renderer:{react(events){seen.push(...events);},draw(state){frames.push(state.totalTime);}},
  clearInput(){},updateHUD(){},announceChapter(){},syncProgress(){},
  checkpoint(){saved.push(core.serialize(context.run));},persistProfile(){},finish(){},
  STORE:{save:'ember-courier.save.v1'},storage:{set(key,value){saved.push(value);return true;}},
  showDialog(id){node(id).showModal();},closeDialogs(){for(const n of nodes.values())n.close();},
  setScreen(next){context.screen=next;},performance:{now:()=>100},
  toast(text){node('game-toast').textContent=text;},
  requestAnimationFrame(fn){scheduled.push(fn);},console:{error(...args){errors.push(args);}}
 });
 const names=['processEvents','autoResolveOrdinaryRoom','showUpgrade','showEndlessDraft','announceChapter',
  'appendDraftCards','openDraftPane','updateDraftClock','interactiveDraft','frame',
  'animateFrame','applyDraftChoice','resumeGame','returnToMenu'];
 vm.runInContext(names.map(shippedFunction).join('\n'),context);
 return {context,node,seen,sounds,frames,saved,scheduled,errors,
  process:events=>context.processEvents(events),frame:now=>context.frame(now)};
}

for(const floor of [1,2,3])test(`earned ordinary floor ${floor} drains rewards once and keeps the UI loop alive`,()=>{
 const s=earnedRoom(floor),view=ui(s),batch=s.events;
 assert.doesNotThrow(()=>view.process(batch));
 assert.equal(s.endless.floor,floor+1);assert.equal(s.endless.cleared,floor);
 assert.equal(s.phase,'playing');assert.equal(view.node('upgrade-dialog').open,false);
 assert.equal(view.seen.filter(e=>e.type==='floor').length,1);
 if(floor===3){assert.equal(endless.oathTotal(s),1);assert.equal(view.sounds.filter(t=>t==='oath-gain').length,1);}
 const before=s.totalTime;
 assert.doesNotThrow(()=>view.frame(50));assert.ok(s.totalTime>before);
 assert.equal(view.frames.length,1);assert.ok(core.restore(view.saved.at(-1)));
});

test('a stale upgrade notification after a room transition cannot open an empty draft',()=>{
 const s=core.createGame({seed:1301,mode:'endless'}),view=ui(s);
 assert.doesNotThrow(()=>view.process([{type:'upgrade'}]));
 assert.equal(s.phase,'playing');assert.equal(s.endless.floor,1);
 assert.equal(view.node('upgrade-dialog').open,false);
});

test('earned boss rewards stay manual and preserve their offer identity',()=>{
 const s=earnedRoom(5),view=ui(s),offered=[...s.offered];
 assert.doesNotThrow(()=>view.process(s.events));
 assert.equal(s.endless.floor,5);assert.equal(s.phase,'upgrade');
 assert.equal(view.node('upgrade-dialog').open,true);assert.deepEqual(s.offered,offered);
 assert.ok(core.restore(view.saved.at(-1)));
});

for(const selecting of [false,true])test(`a frame exception saves and recovers ${selecting?'an earned draft':'combat'} without killing animation`,()=>{
 const s=selecting?earnedRoom(5):core.createGame({seed:1301,mode:'endless'}),view=ui(s);
 if(selecting)view.process(s.events);
 const draw=view.context.renderer.draw;
 view.context.renderer.draw=()=>{throw Error('Injected Canvas failure');};
 assert.doesNotThrow(()=>view.context.animateFrame(50));
 assert.equal(view.errors.length,1);assert.equal(view.scheduled.length,1);
 assert.equal(view.node('pause-dialog').open,true);assert.equal(view.node('runtime-error').hidden,false);
 const saved=core.restore(view.saved.at(-1));assert.ok(saved);assert.equal(saved.journeyId,s.journeyId);
 const at=s.totalTime;view.context.animateFrame(100);assert.equal(s.totalTime,at);
 view.context.renderer.draw=draw;view.context.resumeGame();
 assert.equal(view.node('pause-dialog').open,false);assert.equal(view.node('runtime-error').hidden,true);
 assert.equal(view.node('upgrade-dialog').open,selecting);
 assert.doesNotThrow(()=>view.context.animateFrame(150));assert.ok(view.frames.length);
 if(!selecting)assert.ok(s.totalTime>at);
});

test('returning after a failed frame permits a fresh first-floor scene',()=>{
 const s=core.createGame({seed:1301,mode:'endless'}),view=ui(s),draw=view.context.renderer.draw;
 view.context.renderer.draw=()=>{throw Error('Injected Canvas failure');};view.context.animateFrame(50);
 view.context.returnToMenu();assert.equal(view.context.frameFault,false);
 view.context.run=core.createGame({seed:1302,mode:'endless'});view.context.screen='game';view.context.renderer.draw=draw;
 view.context.animateFrame(100);assert.equal(view.frames.length,1);assert.ok(view.context.run.totalTime>0);
});

test('a failed recovery write does not claim progress was saved',()=>{
 const view=ui(core.createGame({seed:1301,mode:'endless'}));
 view.context.storage.set=()=>false;view.context.renderer.draw=()=>{throw Error('Injected Canvas failure');};
 view.context.animateFrame(50);assert.equal(view.node('pause-dialog').open,true);
 assert.doesNotMatch(view.node('runtime-error').textContent,/已保存/);assert.equal(view.scheduled.length,1);
});

test('hit stop consumes frame time without catch-up or changing input and saved run identity',()=>{
 const s=core.createGame({seed:1301,mode:'endless'}),view=ui(s),identity=s.journeyId;
 view.context.settings.lowMotion=false;view.context.keys.add('KeyD');
 view.context.feedback.react([{type:'dash-hit',hits:1}]);
 view.frame(10);view.frame(20);assert.equal(s.totalTime,0);
 view.frame(50);assert.ok(Math.abs(s.totalTime-.024)<1e-8);
 assert.ok(s.player.x>940);assert.equal(view.context.keys.has('KeyD'),true);
 const saved=core.restore(core.serialize(s));assert.ok(saved);assert.equal(saved.journeyId,identity);
 assert.equal(Object.hasOwn(saved,'feedback'),false);
});

test('an earned live draft and combat share the same hit-stop clock',()=>{
 const s=earnedRoom('live'),view=ui(s);view.process(s.events);view.context.settings.lowMotion=false;
 const clock=draft.ensureDraft(s),remaining=clock.remaining,at=s.totalTime;
 view.context.feedback.react([{type:'impact',heavy:true}]);view.frame(10);
 assert.equal(clock.remaining,remaining);assert.equal(s.totalTime,at);
 view.frame(40);assert.ok(Math.abs((s.totalTime-at)-.016)<1e-8);
 assert.ok(Math.abs((remaining-clock.remaining)-.016)<1e-8);
});

test('portrait, background, manual pause and held drafts clear pending hit stop',()=>{
 for(const mode of ['portrait','background','pause','held']){
  const s=mode==='held'?earnedRoom('live'):core.createGame({seed:1301,mode:'endless'}),view=ui(s);
  if(mode==='held'){view.process(s.events);draft.ensureDraft(s).held=true;}
  view.context.settings.lowMotion=false;view.context.feedback.react([{type:'death',boss:true}]);
  if(mode==='portrait')view.context.landscapeGate.blocked=true;
  if(mode==='background')view.context.document.hidden=true;
  if(mode==='pause')view.context.paused=true;
  const at=s.totalTime;view.frame(16);assert.equal(s.totalTime,at,mode);assert.equal(view.context.feedback.hold,0,mode);
 }
});

test('earned live draft keeps held movement across opening and choosing without native focus changes',()=>{
 const s=earnedRoom('live'),view=ui(s);let focusChanges=0,inputClears=0;
 view.context.keys.add('KeyD');view.context.joy={x:.5,y:0};view.context.clearInput=()=>inputClears++;
 view.node('upgrade-dialog').show=()=>{throw Error('Live drafts must not invoke native autofocus');};
 view.node('upgrade-dialog').close=()=>{throw Error('Live drafts must not restore native focus');};
 view.node('world').focus=()=>focusChanges++;
 view.process(s.events);assert.equal(view.node('upgrade-dialog').open,true);
 const x=s.player.x;view.frame(50);assert.ok(s.player.x>x);assert.equal(view.context.keys.has('KeyD'),true);
 const choice=draft.recommendedChoice(s),key=draft.ensureDraft(s).key;
 assert.equal(view.context.applyDraftChoice(choice,key),true);
 assert.equal(inputClears,0);assert.equal(focusChanges,0);assert.equal(view.context.joy.x,.5);
 const after=s.player.x;view.frame(100);assert.ok(s.player.x>after);assert.ok(core.restore(core.serialize(s)));
});

test('a second touch confirms the live card once while a slide or canceled touch leaves it open',()=>{
 for(const action of ['tap','slide','cancel']){
  const s=earnedRoom('live'),view=ui(s);view.process(s.events);const c=view.node('upgrade-options').children[0],key=draft.ensureDraft(s).key;
  const e={pointerType:'touch',pointerId:2,clientX:200,clientY:100,preventDefault(){}};
  c.listeners.get('pointerdown')(e);
  if(action==='cancel')c.listeners.get('pointercancel')(e);
  c.listeners.get('pointerup')({...e,clientX:action==='slide'?240:200});
  if(action==='tap'){
   assert.ok(s.phase==='playing'||draft.ensureDraft(s).key!==key);const saved=core.serialize(s);
   c.listeners.get('pointerup')(e);c.listeners.get('click')();assert.equal(core.serialize(s),saved);
  }else assert.equal(draft.ensureDraft(s).key,key);
 }
});
