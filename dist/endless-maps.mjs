/** Seven deterministic traversable night-city arenas. No external art assets. */
import {seedMix} from './routes.mjs';
export const ENDLESS_MAPS=[
 {id:'clock',name:'残钟广场',tone:'#183b3d',lamps:[[650,430],[1230,430],[940,1040]],covers:[[490,590,100,100],[1290,800,110,90]]},
 {id:'alley',name:'雨巷折廊',tone:'#1a3544',lamps:[[650,430],[1230,430],[940,1040]],covers:[[750,430,105,75],[1040,910,110,80]]},
 {id:'square',name:'风口回廊',tone:'#2d3b3c',lamps:[[650,430],[1230,430],[940,1040]],covers:[[520,910,120,75],[1330,500,100,80]]},
 {id:'orchard',name:'荧石庭院',tone:'#243e33',lamps:[[480,410],[1440,470],[940,1030]],covers:[[560,710,170,90],[1100,740,170,90],[820,290,160,85]]},
 {id:'canal',name:'沉灯运河',tone:'#223c4c',lamps:[[570,960],[1240,960],[940,400]],covers:[[465,500,150,90],[1220,450,160,90],[800,780,110,130]]},
 {id:'arcade',name:'星屑长街',tone:'#354043',lamps:[[510,450],[1400,430],[940,1060]],covers:[[730,290,120,95],[1000,850,125,90],[470,850,140,75],[1360,840,130,75]]},
 {id:'roof',name:'雾钟屋脊',tone:'#313647',lamps:[[460,980],[1430,975],[940,330]],covers:[[500,350,150,95],[1210,360,150,95],[690,820,145,95],[1080,820,145,95]]}
];
/** Same seed and floor generate the same layout; adjacent floors never repeat. */
export function nextEndlessMap(seed,floor,previous=-1){
 const prev=Number.isInteger(previous)&&previous>=0&&previous<ENDLESS_MAPS.length?previous:-1;
 if(prev===-1)return seedMix(seed,floor+130)%ENDLESS_MAPS.length;
 const pick=seedMix(seed,floor+130)%(ENDLESS_MAPS.length-1);
 return pick>=prev?pick+1:pick;
}
