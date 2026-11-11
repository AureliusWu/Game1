/** Render-only motion. No physics, randomness, timers or save-state changes. */
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number.isFinite(n)?n:0));
export const REST_POSE=Object.freeze({bob:0,tilt:0,scaleX:1,scaleY:1});
export class MotionTracker{
 constructor(limit=96){this.limit=Math.max(8,Math.trunc(limit));this.clear();}
 clear(){this.actors=new Map();this.frame=0;}
 beginFrame(){
  this.frame++;
  if(this.frame%8===0)for(const [key,state]of this.actors)if(this.frame-state.frame>8)this.actors.delete(key);
 }
 sample(key,x,y,dt,{dash=false,windup=false,lowMotion=false}={}){
  if(lowMotion||!Number.isFinite(x)||!Number.isFinite(y)){this.actors.delete(key);return REST_POSE;}
  const step=clamp(dt,0,.05),prev=this.actors.get(key);
  if(!prev||step===0||Math.hypot(x-prev.x,y-prev.y)>140){
   this.actors.set(key,{x,y,phase:0,walk:0,frame:this.frame});
   while(this.actors.size>this.limit)this.actors.delete(this.actors.keys().next().value);
   return REST_POSE;
  }
  const dx=x-prev.x,dy=y-prev.y;
  const moving=clamp(Math.hypot(dx,dy)/step/190,0,1);
  const walk=prev.walk+(moving-prev.walk)*Math.min(1,step*15);
  const phase=(prev.phase+step*(6+9*walk))%(2*Math.PI);
  this.actors.set(key,{x,y,phase,walk,frame:this.frame});
  const stride=Math.abs(Math.sin(phase))*walk;
  return {bob:-4*stride-(dash?3:0),tilt:clamp(dx/step/1250,-.1,.1),
   scaleX:1+.025*walk+(dash?.055:0)+(windup?.035:0),
   scaleY:1-.018*walk-(dash?.065:0)-(windup?.06:0)};
 }
}
