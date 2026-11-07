/** Landscape gate shared by browser UI tests and the game. No simulation mutation. */
export const landscapeViewport=(width,height)=>Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0&&width>=height;
export function createLandscapeGate({viewport,show,suspend,fullscreen,lock}){
 let blocked=false,checking=false;
 function check(){
  if(checking)return blocked;checking=true;
  try{const {width,height}=viewport(),next=!landscapeViewport(width,height),entered=next&&!blocked;blocked=next;show(blocked);if(entered)suspend();return blocked;}
  finally{checking=false;}
 }
 async function enter(){
  try{await fullscreen?.();}catch{/* Physical rotation remains available. */}
  try{await lock?.('landscape');}catch{/* Some browsers do not expose an orientation lock. */}
  check();return !blocked;
 }
 return {check,enter,get blocked(){return blocked;}};
}
