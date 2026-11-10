/** Presentation clock only. Never serialized or used by the deterministic rules. */
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:0));
export class HitFeedback {
 constructor(){this.reset();}
 reset(){this.hold=0;this.budget=.075;this.cooldown=0;this.priority=0;this.stops=0;this.frozen=0;}
 cancel(){this.hold=0;}
 advance(dt,{enabled=true}={}){
  dt=clamp(dt,0,.25);this.budget=Math.min(.075,this.budget+dt*.1);this.cooldown=Math.max(0,this.cooldown-dt);
  if(!enabled){this.cancel();return dt;}
  return dt-this.consume(dt);
 }
 consume(dt){const held=Math.min(clamp(dt,0,.25),this.hold);this.hold=Math.max(0,this.hold-held);this.frozen+=held;return held;}
 react(events,{enabled=true}={}){
  if(!enabled){this.cancel();return 0;}
  if(!events.length)return 0;
  let duration=0,priority=0,kills=0;
  const prefer=(time,rank)=>{if(rank>priority||rank===priority&&time>duration){duration=time;priority=rank;}};
  for(const e of events){
   if(e.type==='impact'){if(e.heavy)prefer(.024,1);else if(e.critical)prefer(.014,.5);}
   if(e.type==='dash-hit'&&e.hits>0)prefer(.026+Math.min(.016,(e.hits-1)*.004),2);
   if(e.type==='flow-surge')prefer(.04,3);
   if(e.type==='overdrive')prefer(.035,2);
   if(e.type==='death'){kills++;if(e.boss)prefer(.058,4);else if(e.elite)prefer(.042,3);}
  }
  if(kills>=3)prefer(.025,1);
  if(!duration||this.cooldown>0&&priority<=this.priority)return 0;
  // Stronger simultaneous hits extend one pause; they never add a pause per actor.
  const extra=Math.min(this.budget,Math.max(0,duration-this.hold));if(extra<.005)return 0;
  this.hold+=extra;this.budget-=extra;this.cooldown=.18;this.priority=priority;this.stops++;
  return extra;
 }
}

/** Directional compression followed by a damped rebound, with bounded area. */
export function impactPose(age,strength=1,pose={}){
 const t=clamp(age/.22,0,1),wave=Math.cos(t*Math.PI*2.4)*Math.exp(-t*4)*(1-t);
 const x=1-clamp(strength,0,1.5)*.18*wave;
 pose.x=x;pose.y=1/Math.sqrt(x);pose.offset=clamp(strength,0,1.5)*4*Math.pow(1-t,3);return pose;
}
