import { PRODUCT_MAP, productPixels } from '@game/data';
import {warehouseTexture} from './warehouse-textures';

function surface(w:number,h:number){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;return {canvas,ctx};}
const C={ink:'#33251D',dark:'#593A2B',wood:'#936044',light:'#C69464',paper:'#FFF2D6',shade:'#E7CE9F',teal:'#357F72',tealDark:'#24584F',sun:'#E9B95D',brick:'#B64C3D'};
export function createPremiumTexture(key:string):HTMLCanvasElement|null{
 const warehouse=warehouseTexture(key);if(warehouse)return warehouse;
 if(key.startsWith('product:')) {const {canvas,ctx}=surface(16,16);for(const p of productPixels(PRODUCT_MAP[key.slice(8)])){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h);}return canvas;}
 if(key==='pixel_coin') {const {canvas,ctx}=surface(16,16);ctx.fillStyle=C.dark;ctx.fillRect(3,2,10,12);ctx.fillRect(2,4,12,8);ctx.fillStyle=C.sun;ctx.fillRect(4,3,8,10);ctx.fillRect(3,5,10,6);ctx.fillStyle=C.paper;ctx.fillRect(5,4,2,7);ctx.fillStyle=C.wood;ctx.fillRect(8,5,2,6);return canvas;}
 if(key.startsWith('player_')||key.startsWith('npc_')) return character(key);
 if(key.startsWith('fixture_')) return fixture(key);
 if(key==='tile_signboard') return sign();
 if(key==='tile_awning') {const {canvas,ctx}=surface(128,20);for(let x=0;x<128;x+=8){ctx.fillStyle=x%16?C.paper:C.teal;ctx.fillRect(x,0,8,14);ctx.fillStyle=x%16?C.shade:C.tealDark;ctx.fillRect(x,14,8,4);}ctx.fillStyle=C.dark;ctx.fillRect(0,18,128,2);return canvas;}
 if(key.startsWith('tile_fan_')){const {canvas,ctx}=surface(32,32);const frame=Number(key.slice(-1));ctx.fillStyle=C.dark;ctx.fillRect(14,1,4,14);ctx.fillStyle=C.wood;for(const [x,y,w,h] of frame%2?[[4,4,10,6],[19,19,10,6],[4,19,6,10],[19,4,6,10]]:[[2,13,12,6],[18,13,12,6],[13,2,6,12],[13,18,6,12]])ctx.fillRect(x,y,w,h);ctx.fillStyle=C.sun;ctx.fillRect(13,13,6,6);ctx.fillStyle=C.dark;ctx.fillRect(15,15,2,2);return canvas;}
 if(key==='tile_plant_pot'||key.startsWith('tile_plant_')){const {canvas,ctx}=surface(32,40),frame=key.endsWith('1')?1:0;ctx.fillStyle='#8F705B55';ctx.fillRect(5,36,25,3);ctx.fillStyle=C.dark;ctx.fillRect(9,24,15,14);ctx.fillStyle=C.brick;ctx.fillRect(10,26,13,10);ctx.fillStyle=C.light;ctx.fillRect(8,24,18,3);ctx.fillStyle=C.tealDark;ctx.fillRect(15,6,3,20);for(const [x,y,w,h] of [[3+frame,9,11,6],[18,4+frame,9,8],[6,1,9,7],[19-frame,15,9,6],[7,18,9,5]]){ctx.fillStyle=C.tealDark;ctx.fillRect(x,y,w,h);ctx.fillStyle=C.teal;ctx.fillRect(x+1,y,w-3,3);}ctx.fillStyle='#81A878';ctx.fillRect(8,3,4,2);ctx.fillRect(20,5,4,2);return canvas;}
 if(key==='tile_tree'){const {canvas,ctx}=surface(80,96);ctx.fillStyle='#593A2B33';ctx.fillRect(10,82,65,8);ctx.fillStyle=C.dark;ctx.fillRect(36,30,9,56);ctx.fillStyle=C.wood;ctx.fillRect(37,42,4,44);for(const [x,y,w,h] of [[11,12,58,38],[4,25,72,35],[16,1,48,34],[20,47,45,20]]){ctx.fillStyle=C.tealDark;ctx.fillRect(x,y,w,h);ctx.fillStyle=C.teal;ctx.fillRect(x+3,y+3,w-9,h-10);}ctx.fillStyle='#81A878';for(const [x,y] of [[20,12],[42,8],[9,31],[57,29],[30,34]])ctx.fillRect(x,y,12,4);return canvas;}
 if(key==='tile_crates'){const {canvas,ctx}=surface(48,32);ctx.fillStyle=C.dark;ctx.fillRect(2,10,30,20);ctx.fillStyle=C.wood;ctx.fillRect(3,11,28,18);ctx.fillStyle=C.light;ctx.fillRect(3,12,28,3);ctx.fillRect(3,22,28,2);ctx.fillStyle=C.dark;ctx.fillRect(7,11,2,18);ctx.fillRect(25,11,2,18);ctx.fillStyle=C.shade;ctx.fillRect(20,0,25,17);ctx.fillStyle=C.light;ctx.fillRect(21,1,23,3);ctx.fillStyle=C.wood;ctx.fillRect(31,0,3,16);return canvas;}
 if(key==='tile_chair'){const {canvas,ctx}=surface(24,32);ctx.fillStyle=C.tealDark;ctx.fillRect(4,0,16,14);ctx.fillRect(2,14,20,9);ctx.fillRect(3,23,3,9);ctx.fillRect(17,23,3,9);ctx.fillStyle=C.teal;ctx.fillRect(6,2,12,10);ctx.fillRect(4,15,16,5);ctx.fillStyle=C.paper;ctx.fillRect(9,3,1,6);ctx.fillRect(14,3,1,6);return canvas;}
 if(!['tile_store_floor','tile_encaustic','tile_yellow_wall','tile_sidewalk','tile_street','tile_pavement_alley'].includes(key))return null;
 const {canvas,ctx}=surface(32,32);
 if(key==='tile_store_floor'||key==='tile_encaustic'){
   ctx.fillStyle='#EFDFC1';ctx.fillRect(0,0,32,32);ctx.fillStyle='#CDB68F';ctx.fillRect(0,0,32,1);ctx.fillRect(0,0,1,32);ctx.fillStyle='#FAECD2';ctx.fillRect(1,1,30,1);ctx.fillRect(1,1,1,30);
   ctx.fillStyle='#CCBA9A';for(const [x,y,w,h] of [[12,5,8,3],[12,24,8,3],[5,12,3,8],[24,12,3,8]])ctx.fillRect(x,y,w,h);
   ctx.fillStyle='#B5B499';for(const [x,y] of [[9,9],[19,9],[9,19],[19,19]])ctx.fillRect(x,y,4,4);
   ctx.fillStyle='#85988B';ctx.fillRect(14,14,4,4);
 }else if(key==='tile_yellow_wall'){
   ctx.fillStyle='#E6C16C';ctx.fillRect(0,0,32,32);ctx.fillStyle='#F2D48B';ctx.fillRect(0,1,30,8);ctx.fillStyle='#CFA253';ctx.fillRect(29,0,3,32);ctx.fillRect(0,24,32,8);ctx.fillStyle=C.tealDark;ctx.fillRect(0,27,32,4);ctx.fillStyle=C.teal;ctx.fillRect(0,27,32,1);ctx.fillStyle='#D4AA5B';ctx.fillRect(5,15,6,2);ctx.fillRect(22,20,4,2);
 }else if(key==='tile_street'){
   ctx.fillStyle='#8E9184';ctx.fillRect(0,0,32,32);ctx.fillStyle='#7D8073';ctx.fillRect(5,6,3,1);ctx.fillRect(21,25,4,1);ctx.fillStyle='#A1A18F';ctx.fillRect(18,13,2,1);
 }else{
   ctx.fillStyle=key==='tile_sidewalk'?'#C8C3AD':'#BBBCA8';ctx.fillRect(0,0,32,32);ctx.fillStyle='#A8AA98';ctx.fillRect(0,0,32,1);ctx.fillRect(0,0,1,32);ctx.fillRect(0,16,32,1);ctx.fillRect(16,0,1,32);ctx.fillStyle='#D6D1B9';ctx.fillRect(1,1,30,1);ctx.fillStyle='#AAA996';ctx.fillRect(7,11,2,1);ctx.fillRect(23,27,2,1);
 }
 return canvas;
}
function character(key:string):HTMLCanvasElement{
 const {canvas,ctx}=surface(32,48),parts=key.split('_'),npc=parts[0]==='npc',variant=npc?Number(parts[1]):0,dir=npc?parts[2]:parts[1],kind=npc?parts[3]:parts[2],frame=Number(parts[npc?4:3]??0);
 const stride=kind==='walk'?[0,2,0,-2][frame%4]:0,breathe=kind==='idle'?frame%2:0;
 const rect=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 rect(7,45,18,2,'#593A2B40');rect(4,46,24,1,'#593A2B22');
 rect(10,33,5,10-stride,C.dark);rect(18,33,5,10+stride,C.dark);rect(11,34,3,8-stride,'#485D5D');rect(19,34,3,8+stride,'#485D5D');rect(9,42-stride,7,3,C.ink);rect(17,42+stride,7,3,C.ink);
 const shirt=npc?[C.teal,'#77649B','#D19A49'][variant%3]:C.brick;
 rect(8,22-breathe,16,13,C.dark);rect(9,23-breathe,14,11,shirt);rect(12,24-breathe,8,9,npc?shirt:C.paper);
 rect(6,24+stride/2,3,10,C.dark);rect(7,25+stride/2,2,8,'#E3B17D');rect(24,24-stride/2,3,10,C.dark);rect(24,25-stride/2,2,8,'#E3B17D');
 rect(10,4-breathe,12,19,C.dark);rect(7,7-breathe,18,13,C.dark);rect(9,9-breathe,14,12,'#F0C494');rect(10,10-breathe,12,9,'#F6D5A8');
 rect(8,5-breathe,16,6,C.ink);rect(10,3-breathe,12,3,C.dark);rect(8,10-breathe,3,5,C.dark);rect(22,10-breathe,2,5,C.dark);
 if(dir==='up'){rect(8,8-breathe,16,12,C.dark);rect(11,7-breathe,10,4,C.wood);}
 else{const left=dir==='left',right=dir==='right';if(!right)rect(12-(left?2:0),13-breathe,2,3,C.ink);if(!left)rect(19+(right?1:0),13-breathe,2,3,C.ink);rect(14,19-breathe,5,1,C.brick);rect(10,17-breathe,3,1,'#CF8E79');rect(21,17-breathe,2,1,'#CF8E79');}
 if(npc&&variant===1){rect(8,4-breathe,16,4,C.tealDark);rect(5,8-breathe,22,2,C.teal);}
 if(npc&&variant===2){rect(7,4-breathe,18,3,'#B7B8A9');rect(8,5-breathe,3,7,'#D8D1B7');}
 return canvas;
}
function fixture(key:string):HTMLCanvasElement{
 const [type,productId='none',state='empty']=key.split(':'),cold=type==='fixture_refrigerator',cash=type==='fixture_cashier';
 const {canvas,ctx}=surface(cold?32:64,48),w=canvas.width;
 const r=(x:number,y:number,a:number,b:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,a,b);};
 r(3,43,w-3,4,'#593A2B33');r(1,3,w-2,41,C.dark);
 if(cash){r(2,4,60,10,C.light);r(2,14,60,28,C.wood);r(3,15,58,2,C.shade);r(5,25,23,14,C.dark);r(32,25,25,14,C.dark);r(6,26,21,12,C.wood);r(33,26,23,12,C.wood);r(13,28,8,2,C.light);r(40,28,8,2,C.light);r(6,0,22,12,C.ink);r(8,2,18,7,C.tealDark);r(10,3,12,1,'#81A878');r(5,12,25,3,C.dark);r(38,0,21,13,C.dark);r(39,1,19,5,C.wood);r(46,7,4,2,C.sun);return canvas;}
 r(2,4,w-4,38,cold?'#CBD9CD':C.wood);r(4,6,w-8,33,cold?'#5D8987':C.dark);
 if(cold){r(5,6,22,33,'#A9C8BB');r(5,7,1,29,C.paper);r(26,17,2,9,C.dark);}
 const quantity=state==='full'?9:state==='low'?3:0,product=PRODUCT_MAP[productId],pixels=productPixels(product);
 for(let row=0;row<3;row++){for(let col=0;col<(cold?2:5);col++){if(row*(cold?2:5)+col>=quantity)continue;const x=6+col*(cold?9:10),y=7+row*11;for(const p of pixels){ctx.fillStyle=p.color;ctx.fillRect(x+Math.floor(p.x/2),y+Math.floor(p.y/2),Math.max(1,Math.ceil(p.w/2)),Math.max(1,Math.ceil(p.h/2)));}}r(3,16+row*11,w-6,2,cold?'#617D73':C.light);r(4,16+row*11,w-8,1,cold?C.paper:C.shade);}
 r(1,3,w-2,2,cold?C.paper:C.light);r(1,4,2,38,cold?C.paper:C.light);r(1,41,w-2,3,C.dark);r(4,44,5,3,C.dark);r(w-9,44,5,3,C.dark);return canvas;
}
const font:Record<string,string[]>={A:['01110','11011','11011','11111','11011','11011','11011'],D:['11110','11011','11011','11011','11011','11011','11110'],E:['11111','11000','11000','11110','11000','11000','11111'],H:['11011','11011','11011','11111','11011','11011','11011'],I:['11111','00100','00100','00100','00100','00100','11111'],M:['11011','11111','11111','11011','11011','11011','11011'],O:['01110','11011','11011','11011','11011','11011','01110'],P:['11110','11011','11011','11110','11000','11000','11000'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['11011','11011','11011','11011','11011','11011','01110']};
function sign(){const {canvas,ctx}=surface(128,48);ctx.fillStyle=C.dark;ctx.fillRect(0,0,128,48);ctx.fillStyle=C.light;ctx.fillRect(1,1,126,46);ctx.fillStyle=C.tealDark;ctx.fillRect(4,4,120,40);ctx.fillStyle=C.teal;ctx.fillRect(5,5,118,2);const line=(text:string,y:number)=>{const start=Math.floor((128-text.length*6)/2);ctx.fillStyle=C.paper;[...text].forEach((char,i)=>font[char]?.forEach((row,j)=>[...row].forEach((v,k)=>{if(v==='1')ctx.fillRect(start+i*6+k,y+j,1,1);})));};line('TIEM TAP HOA',12);line('DAU HEM',29);ctx.fillStyle=C.sun;ctx.fillRect(12,23,104,1);ctx.fillStyle=C.paper;ctx.fillRect(50,10,2,1);ctx.fillRect(60,20,1,1);ctx.fillRect(95,10,2,1);ctx.fillRect(49,26,3,1);ctx.fillRect(50,25,1,1);ctx.fillRect(38,32,4,1);ctx.fillRect(80,27,1,1);return canvas;}
