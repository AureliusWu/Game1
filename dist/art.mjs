/** Original raster art, shared decoded images and safe Canvas fallbacks. Presentation only. */
export const SKINS=Object.freeze([
 {id:'courier',name:'暮色信使',desc:'苔绿短披风 · 黄铜邮扣',src:'./skin-courier.webp'},
 {id:'rain',name:'雨夜巡灯',desc:'靛蓝雨披 · 铜扣与雨痕',src:'./skin-rain.webp'},
 {id:'ember',name:'烬火远行',desc:'赤褐披风 · 余烬围巾',src:'./skin-ember.webp'}
]);
export const WEAPON_ART=Object.freeze(Object.fromEntries(['cinder','frost','orbit','thunder'].map(id=>[id,'./weapon-'+id+'.webp'])));
export const ART_FILES=Object.freeze([...SKINS.map(s=>s.src),...Object.values(WEAPON_ART),'./fx-brush-atlas.webp']);
export const validSkin=id=>SKINS.some(s=>s.id===id);
export const skinArt=id=>(SKINS.find(s=>s.id===id)||SKINS[0]).src;
const bank=new Map();
export const artReady=typeof Image==='undefined'?Promise.resolve():Promise.all(ART_FILES.map(src=>new Promise(resolve=>{
 const img=new Image();img.onload=()=>{bank.set(src,img);resolve();};img.onerror=()=>resolve();img.src=new URL(src,import.meta.url).href;
})));
/** Tests and non-browser renderers can supply decoded versions of the exact shipped images. */
export function registerArt(src,img){if(ART_FILES.includes(src)&&img?.width>0)bank.set(src,img);}
export function drawArt(c,src,x,y,w,h=w){const img=bank.get(src);if(!img)return false;c.drawImage(img,x,y,w,h);return true;}
export function skillIcon(id,symbol){return WEAPON_ART[id]?`<img class="weapon-art" src="${WEAPON_ART[id]}" alt="" draggable="false">`:`<svg aria-hidden="true"><use href="#i-${symbol}"/></svg>`;}
export function drawBrush(c,tile,x,y,size,angle=0,alpha=1,stretch=1){
 const img=bank.get('./fx-brush-atlas.webp');if(!img)return false;
 c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=Math.max(0,alpha);
 const w=img.width/2,h=img.height/2;c.drawImage(img,tile%2*w,Math.floor(tile/2)*h,w,h,-size/2,-size*stretch/2,size,size*stretch);c.restore();return true;
}
