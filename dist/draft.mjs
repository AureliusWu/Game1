/** Visible-time draft countdown. No DOM, clock, randomness or free resource mutation. */
import {SKILLS,SKILL_BY_ID,choiceInfo,rankOf} from './endless.mjs';
const keyFor=s=>`${s.endless?.floor??s.chapter}:${s.endless?.choice||s.v12?.choiceKind||'story'}:${s.endless?.pending||0}:${s.offered.join(',')}`;
export function ensureDraft(s){
 if(s?.phase!=='upgrade'||!s.offered?.length)return null;
 const key=keyFor(s),duration=s.endless?.choice==='route'||!s.endless?12:8;
 if(s.selection?.key!==key)s.selection={version:1,key,duration,remaining:duration,held:false,fired:false};
 return s.selection;
}
export function recommendedChoice(s){
 if(s?.phase!=='upgrade')return null;
 if(!s.endless)return s.offered[0]||null;
 const valid=s.offered.filter(id=>!choiceInfo(s,id).disabled);
 if(s.endless.choice==='route')return valid.includes('hunt')?'hunt':valid.find(id=>id!=='rest')||null;
 const score=id=>{
  if(id==='mend')return s.player.hp/s.player.maxHp<.35?210:5;
  if(id==='supplies')return s.journal.potions===0?75:4;
  if(id==='ash')return 80;
  if(s.endless.choice==='relic')return ({dawn:160,lodestone:145,moon:140,ink:125,hunger:115,hourglass:85,coin:70,glass:1})[id]||0;
  const u=SKILL_BY_ID[id];if(!u)return 0;
  if(choiceInfo(s,id).ready)return 240;
  if(id==='vitality'&&s.player.hp/s.player.maxHp<.35)return 220;
  const partner=SKILLS.find(w=>w.partner===id&&rankOf(s,w.id)>=3&&rankOf(s,id)<2);
  return partner?180:u.kind==='weapon'?(rankOf(s,id)?150+rankOf(s,id):90):rankOf(s,id)?105:60;
 };
 return valid.map((id,i)=>({id,i,score:score(id)})).sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.id||null;
}
export function stepDraft(s,dt,{blocked=false}={}){
 const c=ensureDraft(s);if(!c||blocked||c.held||c.fired)return null;
 c.remaining=Math.max(0,c.remaining-Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0)));
 if(c.remaining>1e-6)return null;
 const id=recommendedChoice(s);if(!id)return null;c.fired=true;return {id,key:c.key};
}
export function toggleDraft(s){const c=ensureDraft(s);if(!c)return false;c.held=!c.held;return c.held;}
export function validateDraft(s){
 const c=s.selection;if(c===undefined)return true;
 return !!c&&c.version===1&&s.phase==='upgrade'&&c.key===keyFor(s)&&[8,12].includes(c.duration)&&Number.isFinite(c.remaining)&&c.remaining>=0&&c.remaining<=c.duration&&typeof c.held==='boolean'&&typeof c.fired==='boolean'&&(!c.fired||c.remaining<=1e-6);
}
