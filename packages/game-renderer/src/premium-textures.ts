import { PRODUCT_MAP, productPixels } from '@game/data';
import {warehouseTexture} from './warehouse-textures';

function surface(w:number,h:number){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;return {canvas,ctx};}
const C={ink:'#33251D',dark:'#593A2B',wood:'#936044',light:'#C69464',paper:'#FFF2D6',shade:'#E7CE9F',teal:'#357F72',tealDark:'#24584F',sun:'#E9B95D',brick:'#B64C3D'};
export function createPremiumTexture(key:string):HTMLCanvasElement|null{
 const warehouse=warehouseTexture(key);if(warehouse)return warehouse;
 if(key.startsWith('tile_grass_v')){
  // 3 biến thể cỏ (nền #5c7a52) để mặt đất không lặp một ô; nhiễu cố định theo biến thể
  const v=Number(key.slice(-1)),{canvas,ctx}=surface(32,32);
  ctx.fillStyle=['#5c7a52','#5f7f55','#587650'][v]??'#5c7a52';ctx.fillRect(0,0,32,32);
  const dark='#4c6843',light='#78a06a';
  const spots=[[[4,8],[18,16],[10,24],[26,4]],[[7,3],[22,12],[3,20],[16,27]],[[12,10],[27,22],[5,15],[20,2]]][v]??[];
  ctx.fillStyle=dark;for(const [x,y] of spots){ctx.fillRect(x,y,4,2);ctx.fillRect(x+1,y-1,2,1);}
  ctx.fillStyle=light;for(const [x,y] of spots){ctx.fillRect(x+6,y+4,1,3);ctx.fillRect(x+7,y+3,1,2);}
  return canvas;
 }
 if(key.startsWith('deco_flowers_')){
  const v=Number(key.slice(-1)),{canvas,ctx}=surface(32,32),pal=[['#f2c94c','#fff3b0'],['#e9739b','#ffd1e0'],['#f4f0e6','#ffe08a']][v]??['#f2c94c','#fff3b0'];
  ctx.fillStyle='#26190E30';for(const [x,y] of [[6,14],[19,22]])ctx.fillRect(x-1,y+3,6,2);
  for(const [x,y] of [[6,12],[19,20],[24,8]]){ctx.fillStyle='#3f5c39';ctx.fillRect(x+1,y+2,1,4);ctx.fillStyle=pal[0];ctx.fillRect(x-1,y,3,3);ctx.fillRect(x+2,y,3,3);ctx.fillRect(x,y-1,3,1);ctx.fillStyle=pal[1];ctx.fillRect(x+1,y+1,1,1);}
  return canvas;
 }
 if(key==='deco_lamp_pole'){
  // cột đèn gang 32x64, neo đáy; bóng đổ nằm ngang trên vỉa hè
  const {canvas,ctx}=surface(32,64);
  ctx.fillStyle='#26190E45';ctx.fillRect(6,58,22,4);
  ctx.fillStyle='#2b3a37';ctx.fillRect(13,14,4,46);ctx.fillRect(10,56,10,4);
  ctx.fillStyle='#41564f';ctx.fillRect(13,14,1,46);
  ctx.fillStyle='#2b3a37';ctx.fillRect(9,6,12,4);ctx.fillRect(8,4,14,2);ctx.fillRect(11,10,8,4);
  ctx.fillStyle='#ffe9a8';ctx.fillRect(11,10,8,3);
  return canvas;
 }
 if(key==='deco_fence'){
  // hàng rào gỗ thấp, có bóng đổ xuống cỏ để nổi khối
  const {canvas,ctx}=surface(32,32);
  ctx.fillStyle='#26190E40';ctx.fillRect(1,26,30,4);
  ctx.fillStyle='#7a5230';ctx.fillRect(0,14,32,3);ctx.fillRect(0,21,32,3);
  ctx.fillStyle='#a97a49';ctx.fillRect(0,14,32,1);ctx.fillRect(0,21,32,1);
  for(const x of [3,15,27]){ctx.fillStyle='#5c3a1e';ctx.fillRect(x,8,4,20);ctx.fillStyle='#8a5a2f';ctx.fillRect(x,8,1,20);ctx.fillRect(x,8,4,1);}
  return canvas;
 }
 if(key.startsWith('product:')) {const {canvas,ctx}=surface(16,16);for(const p of productPixels(PRODUCT_MAP[key.slice(8)])){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h);}return canvas;}
 if(key==='pixel_coin') {const {canvas,ctx}=surface(16,16);ctx.fillStyle=C.dark;ctx.fillRect(3,2,10,12);ctx.fillRect(2,4,12,8);ctx.fillStyle=C.sun;ctx.fillRect(4,3,8,10);ctx.fillRect(3,5,10,6);ctx.fillStyle=C.paper;ctx.fillRect(5,4,2,7);ctx.fillStyle=C.wood;ctx.fillRect(8,5,2,6);return canvas;}
 if(key==='stall_cafe_vot'||key==='stall_banh_mi_muoi_ot'){
  const coffee=key==='stall_cafe_vot',{canvas,ctx}=surface(64,48);
  const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  const awning=coffee?['#357F72','#FFF2D6']:['#B64C3D','#FFF2D6'];
  r(3,14,3,30,C.dark);r(58,14,3,30,C.dark);                 // cột đỡ mái
  for(let x=0;x<64;x+=8){r(x,2,8,10,awning[(x/8)%2]);r(x,12,8,3,awning[(x/8)%2]);}  // mái che sọc
  r(0,1,64,2,C.ink);r(0,14,64,1,C.ink);
  r(6,26,52,18,C.wood);r(6,26,52,3,C.light);r(6,43,52,2,C.dark);    // quầy gỗ
  r(8,30,48,1,C.dark);
  r(2,46,60,2,'#26190E');                                            // bóng đổ
  // Bóng đèn tròn vàng treo lủng lẳng dưới mái hiên quầy
  r(31,14,1,5,'#1E1A16');                                            // dây điện đen
  r(30,18,3,2,'#4A3B2C');                                            // đui đèn đồng kim loại
  r(29,20,5,4,'#FFCA58');                                            // bóng đèn tròn vàng ấm
  r(30,21,3,2,'#FFFDE8');                                            // tim đèn phát sáng rực rỡ
  r(28,20,1,4,'rgba(255,212,112,0.4)');r(34,20,1,4,'rgba(255,212,112,0.4)'); // quầng phản quang
  r(29,19,5,1,'rgba(255,212,112,0.3)');r(29,24,5,1,'rgba(255,212,112,0.3)');
  if(coffee){
   r(12,18,8,8,C.dark);r(13,19,6,6,'#E9B95D');r(16,22,1,5,'#FFF2D6'); // bình nước sôi
   r(26,21,6,5,C.paper);r(27,22,4,3,'#6B4423');                        // ly cà phê
   r(36,22,8,4,'#C69464');r(37,19,2,3,C.dark);                         // vợt pha
   r(46,21,6,5,C.paper);r(47,22,4,3,'#3B2415');
  }else{
   r(10,20,18,6,'#4A4A4A');r(12,19,14,1,'#8A8A8A');r(14,22,10,2,'#E0562B');  // lò than
   r(32,22,8,4,'#E7CE9F');r(33,21,6,1,'#F4E4BC');                          // ổ bánh mì
   r(42,21,6,5,'#B64C3D');r(43,22,4,3,'#E0562B');                          // hũ muối ớt
   r(50,22,6,4,'#E7CE9F');
  }
  return canvas;
 }
 if(key.startsWith('player_')||key.startsWith('npc_')) return character(key);
 if(key.startsWith('fixture_')) return fixture(key);
 if(key.startsWith('wall_')) return wallTexture(key);
 if(key.startsWith('vehicle_')) return vehicleTexture(key);
 if(key.startsWith('truck_')) return logisticsTruckTexture(key);
 if(key.startsWith('prop_')) return logisticsPropTexture(key);
 if(key==='tile_signboard') return sign();
 if(key==='tile_awning') {
  // Stardew Valley 2.5D storefront awning (128x28) with 3D slope, valance scallops and contact shadow
  const {canvas,ctx}=surface(128,28);
  const r=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};
  // 2.5D ambient drop shadow underneath awning onto ground
  r(0,25,128,3,'#26190E40');
  // Back metal bracket mounting rod
  r(0,0,128,2,'#281810');
  r(0,1,128,1,'#7D4C2F');

  // Sloped canvas canopy stripes (16 stripes of 8px)
  for(let x=0;x<128;x+=8){
    const isCream = (x/8)%2 === 0;
    const baseCol = isCream ? '#FFF3D4' : '#1E685A';
    const topLight = isCream ? '#FFFDF5' : '#328876';
    const midCol = isCream ? '#F0DDB3' : '#175448';
    const bottomShadow = isCream ? '#D4BD8D' : '#0F3830';

    // 2.5D sloped surface with gradient light
    r(x,2,8,2,topLight);
    r(x,4,8,7,baseCol);
    r(x,11,8,5,midCol);
    r(x,16,8,2,bottomShadow);

    // Subtle fabric crease line on stripe border
    r(x,2,1,16,'rgba(0,0,0,0.12)');

    // Scalloped bottom valance with 3D drop
    r(x,18,8,5,baseCol);
    r(x+1,23,6,2,midCol);
    r(x+2,25,4,1,bottomShadow);
    // Valance trim edge
    r(x,23,1,3,'#281810');
    r(x+7,23,1,3,'#281810');
  }
  // Bottom horizontal reinforcing bar
  r(0,18,128,1,'#281810');
  return canvas;
}
 if(key==='store_door_left'||key==='store_door_right'){
   const {canvas,ctx}=surface(32,32),isLeft=key==='store_door_left';
   const rect=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};
   rect(0,0,32,32,C.dark);rect(1,1,30,30,C.wood);rect(1,1,30,1,C.light);rect(1,1,1,30,C.light);
   rect(3,19,26,10,C.dark);rect(4,20,24,8,'#7D4C2F');rect(5,21,22,2,C.light);
   rect(3,3,26,14,C.dark);rect(4,4,24,12,'#C3D9D1');
   rect(4,9,24,1,'#A6C3B9');rect(15,4,1,12,'#A6C3B9');
   rect(7,5,4,2,'#EAF5F0');rect(10,7,4,2,'#EAF5F0');rect(18,5,4,2,'#EAF5F0');rect(21,7,4,2,'#EAF5F0');
   const hx=isLeft?27:3;
   rect(hx,14,2,7,C.dark);rect(hx,15,2,5,C.sun);rect(hx,16,1,2,C.paper);
   return canvas;
 }
 if(key==='store_door_bell'){
   const {canvas,ctx}=surface(12,14);
   const rect=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};
   rect(5,0,2,4,C.dark);rect(5,1,1,3,C.wood);
   rect(3,4,6,6,C.dark);rect(4,4,4,6,C.sun);rect(2,9,8,2,C.dark);rect(3,9,6,1,C.sun);rect(4,5,2,3,C.paper);
   rect(5,11,2,2,C.dark);rect(5,11,1,2,C.sun);rect(4,13,4,1,C.brick);
   return canvas;
 }
 if(key.startsWith('tile_fan_')){
   const {canvas,ctx}=surface(28,28),frame=Number(key.slice(-1))%4;
   const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
   r(12,0,4,6,C.dark);r(13,1,2,4,'#24584F');
   r(13,16,1,8,'#827B6E');r(12,24,3,3,'#B64C3D');
   r(10,5,8,6,C.dark);r(11,6,6,4,'#357F72');
   for(const [x,y,w,h] of [[6,2,16,2],[4,4,20,2],[3,6,22,8],[4,14,20,2],[6,16,16,2]]){
     r(x,y,w,h,'#24584F');
   }
   for(const [x,y,w,h] of [[7,4,14,2],[5,6,18,8],[7,14,14,2]]){
     r(x,y,w,h,'#1E3B35');
   }
   r(13,3,2,14,'#2D524A');r(4,9,20,2,'#2D524A');
   const angles=[0, Math.PI/2, Math.PI/4, (3*Math.PI)/4];
   const a=angles[frame];
   for(let b=0;b<3;b++){
     const rad=a + (b*Math.PI*2)/3;
     const bx=Math.round(14+Math.cos(rad)*5),by=Math.round(10+Math.sin(rad)*5);
     r(bx-1,by-1,3,3,'#78A89A');r(bx,by,2,2,'#FAF0C8');
   }
   r(12,8,4,4,C.dark);r(13,9,2,2,'#FAF0C8');
   return canvas;
 }
 if(key.startsWith('standing_fan_')){
   const {canvas,ctx}=surface(24,36),frame=Number(key.slice(-1))%4;
   const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
   r(5,32,14,3,C.dark);r(6,31,12,2,'#24584F');r(8,30,8,1,'#357F72');
   r(11,15,2,16,'#7A776E');r(11,15,1,16,'#A8A59C');
   r(10,22,4,2,C.dark);
   r(9,9,6,6,C.dark);r(10,10,4,4,'#357F72');
   for(const [x,y,w,h] of [[5,2,14,2],[3,4,18,2],[2,6,20,6],[3,12,18,2],[5,14,14,2]]){
     r(x,y,w,h,'#24584F');
   }
   for(const [x,y,w,h] of [[6,4,12,2],[4,6,16,6],[6,12,12,2]]){
     r(x,y,w,h,'#1E3B35');
   }
   r(11,3,2,12,'#2D524A');r(3,8,18,2,'#2D524A');
   const angles=[0, Math.PI/2, Math.PI/4, (3*Math.PI)/4];
   const a=angles[frame];
   for(let b=0;b<3;b++){
     const rad=a + (b*Math.PI*2)/3;
     const bx=Math.round(12+Math.cos(rad)*5),by=Math.round(9+Math.sin(rad)*5);
     r(bx-1,by-1,3,3,'#78A89A');r(bx,by,2,2,'#FAF0C8');
   }
   r(11,8,3,3,C.dark);r(11,8,2,2,'#FAF0C8');
   return canvas;
 }
 if(key==='store_window'){
   // 2.5D Stardew Valley-inspired side-wall window for shop left wall (32x32)
   // Seamlessly integrates with wall_store_left:
   // - x=0..13: transparent (reveals outdoor alley sidewalk cleanly)
   // - x=14..15: exterior wooden trim & casing
   // - x=16..29: window aperture cut into wall thickness with 3D jamb reveals
   // - Vintage Vietnamese 4-pane crossbars, soft mint daylight glass with glares
   // - Polished warm sunlit wooden sill projecting slightly into store (x=15..30)
   // - Charming miniature potted succulent perched in morning sunlight
   const {canvas,ctx}=surface(32,32);
   const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};

   // Exterior casing on alley side (x=14..15)
   r(14,4,2,21,'#3E220D');
   r(14,5,1,19,'#6B3D1B');
   r(13,23,2,2,'#3E220D');

   // Wall cap above window (y=0..3)
   r(16,0,14,2,'#FAF0C8'); // capTop
   r(16,2,14,1,'#F2DC9B'); // capBevel
   r(16,3,14,1,'#BF8B32'); // wallDark

   // Wooden lintel / upper casing (y=4..5)
   r(15,4,15,1,'#3E220D');
   r(15,5,14,1,'#6B3D1B');

   // Window niche & jamb reveals (y=6..21)
   // Left jamb: thickness of exterior wall seen in 3/4 perspective
   r(16,6,1,16,'#361F10');
   r(17,6,1,16,'#4A2A16');
   r(17,6,11,1,'#26190E45'); // Top reveal shadow

   // Translucent mint-cyan daylight glass
   r(18,7,10,15,'#8FC5BB');
   r(18,7,2,15,'#FFF6D8');  // Warm sunlight entering from street
   r(20,7,7,15,'#AEE0D6');  // Daylight sky highlight
   r(26,7,2,3,'#629E92');   // Top-right corner shade

   // Vintage wooden muntins / security crossbars (nan gỗ chấn song)
   r(22,6,1,16,'#3E220D');
   r(23,6,1,16,'#6B3D1B');
   r(18,13,10,1,'#3E220D');
   r(18,14,10,1,'#6B3D1B');

   // Glass glare streaks (vệt phản chiếu bóng kính)
   r(19,8,2,1,'#FFFFFF');
   r(20,9,2,1,'#FFFFFF');
   r(21,10,1,1,'#E8F7F3');
   r(19,16,2,1,'#E8F7F3');
   r(20,17,2,1,'#E8F7F3');
   r(24,15,2,1,'#FFFFFF');
   r(25,16,2,1,'#FFFFFF');

   // Right frame / room-side reveal
   r(28,5,1,17,'#5C3617');
   r(29,5,1,17,'#3E220D');

   // Polished warm sunlit wooden sill (y=22..25, x=15..30)
   r(15,22,15,1,'#DB975C'); // Sunlit top highlight
   r(15,23,15,1,'#8F542A'); // Wood sill body
   r(15,24,15,1,'#5C3617'); // Sill bevel
   r(16,25,14,1,'#331B0A'); // Underside drop shadow

   // Miniature terracotta potted succulent on windowsill (x=24..28, y=16..22)
   r(25,20,4,1,'#DB845C');  // Clay pot rim
   r(25,21,3,2,'#B05731');  // Pot body
   r(28,21,1,2,'#7A3519');  // Pot shaded edge
   r(26,19,2,1,'#331B0A');  // Pot soil
   r(25,17,2,2,'#7AC765');  // Bright succulent leaf
   r(26,16,2,2,'#4E9240');  // Central leaf
   r(24,18,2,2,'#387332');  // Left leaf
   r(27,18,2,2,'#2D5E24');  // Right leaf

   // Lower wall & baseboard under window sill (y=26..31)
   r(16,26,13,1,'#D4A346'); // wallBase
   r(16,27,13,1,'#357F72'); // tealAccent
   r(16,28,13,1,'#825026'); // skirtLine
   r(16,29,13,3,'#5C3617'); // skirtWood baseboard
   r(29,22,1,10,'#3E220D'); // skirtShade
   r(30,22,2,10,'#26190E40'); // ambient floor shadow
   return canvas;
 }
 if(key==='tile_plant_pot'||key.startsWith('tile_plant_')){
  // Stardew Valley 2.5D Terracotta Potted Plant (32x40) with lush layered leaves & soft drop shadow
  const {canvas,ctx}=surface(32,40),frame=key.endsWith('1')?1:0;
  const r=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};

  // 2.5D Oval contact drop shadow on floor
  r(4,36,24,4,'#26190E45');
  r(7,35,18,5,'#26190E30');

  // Terracotta clay pot with 2.5D rim and base bevel
  r(8,23,16,14,'#28160E');  // Pot outline
  r(9,24,14,12,'#B05731');  // Pot terracotta base
  r(9,24,3,12,'#CE754D');   // Left curved highlight
  r(20,24,3,12,'#7A3519');  // Right shaded curve
  r(7,21,18,4,'#28160E');   // Pot rim outline
  r(8,22,16,2,'#DB845C');   // Rim top highlight
  r(8,24,16,1,'#873D1E');   // Rim underside shadow
  r(10,21,12,2,'#3E2519');  // Dark soil inside pot

  // Central plant stem
  r(15,10,2,12,'#284218');
  r(16,10,1,12,'#46692E');

  // Stardew Valley lush green leaves in 3D clusters (swaying slightly with ambient frame)
  const leaves: Array<[number, number, number, number, string, string, string]> = [
    [3+frame, 12, 10, 6, '#387332', '#5DA84C', '#1E471C'],
    [18-frame, 10, 11, 7, '#387332', '#5DA84C', '#1E471C'],
    [6, 5+frame, 9, 8, '#2F662A', '#529643', '#1A3D18'],
    [17, 3+frame, 9, 7, '#48873C', '#6EBA59', '#255220'],
    [10, 1, 12, 8, '#529643', '#7AC765', '#2C5E24'],
    [19+frame, 18, 9, 5, '#2B5E26', '#498C3F', '#163614'],
    [4-frame, 20, 9, 5, '#2B5E26', '#498C3F', '#163614']
  ];
  for(const [lx,ly,lw,lh,base,light,dark] of leaves){
    r(lx,ly,lw,lh,'#142410');
    r(lx+1,ly+1,lw-2,lh-2,base);
    r(lx+1,ly+1,lw-4,2,light);
    r(lx+2,ly+lh-3,lw-3,1,dark);
  }
  // Delicate leaf dew highlights
  r(13,3,2,2,'#B8F2A2');
  r(20,6,2,2,'#B8F2A2');
  r(7,14,2,1,'#B8F2A2');
  return canvas;
}
 if(key==='tile_tree'){
  // Stardew Valley 2.5D Cozy Neighborhood Shade Tree (80x100)
  const {canvas,ctx}=surface(80,100);
  const r=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};

  // Gnarled wood trunk & roots
  r(32,46,16,46,'#26160E'); // Trunk outline
  r(34,48,12,42,'#6E4125'); // Trunk base wood
  r(34,48,3,42,'#99623C');  // Trunk left highlight
  r(43,48,3,42,'#472714');  // Trunk right shadow
  // Roots spreading into ground
  r(28,88,8,6,'#26160E'); r(29,89,6,4,'#6E4125');
  r(45,88,9,6,'#26160E'); r(46,89,7,4,'#472714');

  // Multi-layered lush pixel canopy clusters (Stardew Valley foliage style)
  const canopy: Array<[number, number, number, number, string, string, string]> = [
    [8, 22, 64, 46, '#265C2E', '#3D8243', '#16381C'],
    [14, 8, 52, 40, '#2F6E36', '#49964F', '#1B4722'],
    [22, 2, 36, 32, '#388241', '#5DB563', '#1E5427'],
    [4, 34, 40, 32, '#235229', '#38783C', '#143018'],
    [38, 30, 38, 36, '#235229', '#38783C', '#143018'],
    [26, 44, 28, 22, '#1E4723', '#2F6E36', '#102613']
  ];
  for(const [cx,cy,cw,ch,base,light,dark] of canopy){
    r(cx,cy,cw,ch,'#122415');
    r(cx+2,cy+2,cw-4,ch-4,base);
    r(cx+4,cy+3,cw-10,Math.floor(ch*0.35),light);
    r(cx+3,cy+ch-8,cw-6,5,dark);
  }
  // Soft leaf dapples & highlights
  r(28,10,12,4,'#82D988'); r(44,14,10,3,'#82D988');
  r(16,28,12,4,'#67BD6D'); r(54,34,10,4,'#67BD6D');
  r(32,24,14,4,'#82D988'); r(24,38,12,3,'#67BD6D');
  return canvas;
}
 if(key==='tile_crates'){
  // Stardew Valley 2.5D Stacked Wooden Crates (48x34) with timber grain, iron bands & drop shadow
  const {canvas,ctx}=surface(48,34);
  const r=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};

  // 2.5D drop shadow under crates
  r(2,29,44,5,'#26190E45');
  r(6,30,36,3,'#26190E25');

  // Lower Main Crate (32x22)
  r(1,10,32,22,'#26160E');
  r(2,11,30,20,'#8E5A35');
  r(2,11,30,2,'#D19B6C'); // Top edge highlight
  // Crate wood planks horizontal
  r(2,17,30,1,'#5E361B'); r(2,18,30,1,'#BA8254');
  r(2,24,30,1,'#5E361B'); r(2,25,30,1,'#BA8254');
  // Iron reinforced corner brackets
  r(1,11,4,20,'#33251D'); r(2,12,2,18,'#6B5C54');
  r(29,11,4,20,'#33251D'); r(30,12,2,18,'#6B5C54');
  // Silver rivet nails
  r(2,13,2,2,'#C2B8B2'); r(2,27,2,2,'#C2B8B2');
  r(30,13,2,2,'#C2B8B2'); r(30,27,2,2,'#C2B8B2');

  // Upper Stacked Produce Box (26x16) slightly offset
  r(20,0,26,16,'#26160E');
  r(21,1,24,14,'#B0774D');
  r(21,1,24,2,'#E5B588'); // Top bevel
  r(21,7,24,1,'#734526');
  // Red/yellow apples or citrus showing in crate
  r(23,3,4,4,'#BA3030'); r(24,3,2,2,'#F26868');
  r(28,2,4,4,'#E89127'); r(29,2,2,2,'#FAC36B');
  r(33,3,4,4,'#BA3030'); r(34,3,2,2,'#F26868');
  r(38,2,4,4,'#E89127'); r(39,2,2,2,'#FAC36B');
  return canvas;
}
 if(!['tile_store_floor','tile_encaustic','tile_yellow_wall','tile_sidewalk','tile_street','tile_pavement_alley'].includes(key))return null;
 const {canvas,ctx}=surface(32,32);
 if(key==='tile_store_floor'||key==='tile_encaustic'){
   ctx.fillStyle='#F4E4C8';ctx.fillRect(0,0,32,32);
   ctx.fillStyle='#FAF3E3';ctx.fillRect(1,1,30,1);ctx.fillRect(1,1,1,30);
   ctx.fillStyle='#CBB18B';ctx.fillRect(0,31,32,1);ctx.fillRect(31,0,1,32);
   ctx.fillStyle='#9E8462';ctx.fillRect(0,0,32,1);ctx.fillRect(0,0,1,32);
   ctx.fillStyle='#B59F80';for(const [x,y,w,h] of [[12,4,8,3],[12,25,8,3],[4,12,3,8],[25,12,3,8]])ctx.fillRect(x,y,w,h);
   ctx.fillStyle='#C46851';for(const [x,y] of [[8,8],[20,8],[8,20],[20,20]])ctx.fillRect(x,y,4,4);
   ctx.fillStyle='#E58F78';for(const [x,y] of [[9,9],[21,9],[9,21],[21,21]])ctx.fillRect(x,y,2,2);
   ctx.fillStyle='#2D685E';ctx.fillRect(13,13,6,6);
   ctx.fillStyle='#529185';ctx.fillRect(14,14,4,4);
   ctx.fillStyle='#F7EAD0';ctx.fillRect(15,15,2,2);
 }else if(key==='tile_yellow_wall'){
   ctx.fillStyle='#E5B85C';ctx.fillRect(0,0,32,32);ctx.fillStyle='#FAF0C8';ctx.fillRect(0,0,32,3);ctx.fillStyle='#F2DC9B';ctx.fillRect(0,3,32,4);ctx.fillStyle='#CFA253';ctx.fillRect(0,7,32,2);ctx.fillStyle='#357F72';ctx.fillRect(0,23,32,2);ctx.fillStyle='#5C3617';ctx.fillRect(0,25,32,7);ctx.fillStyle='#825026';ctx.fillRect(0,25,32,1);
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

 // 2.5D Soft oval contact drop shadow (Stardew Valley player & NPC foot shadow)
 rect(6,44,20,4,'#26190E4A');
 rect(8,43,16,6,'#26190E35');
 rect(10,42,12,8,'#26190E1F');

 const shirt=npc?[C.teal,'#7B5E99','#D48B38'][variant%3]:'#BA3B28';
 const shirtLight=npc?['#4E9B8E','#9B7BB8','#EDB15E'][variant%3]:'#D95A45';
 const shirtDark=npc?['#1E544A','#4C3563','#8C5317'][variant%3]:'#7A1F12';
 const side=dir==='left'||dir==='right';
 if(side){
   // Dáng nghiêng khi đi ngang: thân hẹp, một tay ở giữa, hai chân bước dọc theo hướng đi (vẽ hướng phải, hướng trái lật gương).
   const sr=(x:number,y:number,w:number,h:number,c:string)=>rect(dir==='left'?32-x-w:x,y,w,h,c);
   const sw=kind==='walk'?[0,3,0,-3][frame%4]:0;
   sr(11-sw,32,5,11,'#251D19'); sr(12-sw,33,3,9,'#3B4E4E'); sr(11-sw,42,7,3,'#462719'); sr(11-sw,42,7,1,'#73442D');
   sr(16+sw,32,5,11,'#251D19'); sr(17+sw,33,3,9,'#3B4E4E'); sr(16+sw,42,7,3,'#462719'); sr(16+sw,42,7,1,'#73442D');
   sr(10,21-breathe,12,13,'#281810'); sr(11,22-breathe,10,11,shirt); sr(11,22-breathe,2,11,shirtLight); sr(19,22-breathe,2,11,shirtDark);
   sr(13-sw,23,4,11,'#281810'); sr(14-sw,24,2,9,'#E8B684');
 } else {
 // Legs & Trousers
 rect(10,32,5,11-stride,'#251D19'); // Outline left leg
 rect(18,32,5,11+stride,'#251D19'); // Outline right leg
 rect(11,33,3,9-stride,'#3B4E4E');  // Denim blue trousers
 rect(19,33,3,9+stride,'#3B4E4E');
 rect(11,33,1,9-stride,'#567373');  // Trousers side highlight
 rect(19,33,1,9+stride,'#567373');
 // Stardew Valley leather boots
 rect(9,42-stride,7,3,'#462719');
 rect(17,42+stride,7,3,'#462719');
 rect(9,42-stride,7,1,'#73442D');   // Boot specular highlight

 // Torso / Shirt

 rect(8,21-breathe,16,13,'#281810'); // Dark outline
 rect(9,22-breathe,14,11,shirt);     // Main shirt
 rect(9,22-breathe,2,11,shirtLight); // Left highlight
 rect(21,22-breathe,2,11,shirtDark); // Right shadow
 rect(12,23-breathe,8,9,npc?shirt:'#FFF5E0'); // Collar / undershirt

 // Arms & Hands with skin shading
 rect(6,23+stride/2,3,11,'#281810');
 rect(7,24+stride/2,2,9,'#E8B684');
 rect(7,24+stride/2,1,9,'#FADBB5');  // Hand highlight
 rect(24,23-stride/2,3,11,'#281810');
 rect(24,24-stride/2,2,9,'#E8B684');
 }

 // Head & Face
 rect(9,3-breathe,14,20,'#2A180E');  // Head outline
 rect(8,6-breathe,16,14,'#2A180E');
 rect(9,8-breathe,14,13,'#F0C494');  // Skin
 rect(10,9-breathe,12,10,'#FCE0BF'); // Face highlight

 // Hair with Stardew Valley gradient volume
 const hairBase = npc&&variant===2?'#7A7B72':npc&&variant===1?'#2A4736':'#52321D';
 const hairLight = npc&&variant===2?'#A8A99E':npc&&variant===1?'#47755A':'#875836';
 const hairDark = npc&&variant===2?'#4C4D46':npc&&variant===1?'#142B1F':'#2F1B0D';

 rect(8,4-breathe,16,7,hairBase);
 rect(10,3-breathe,12,3,hairLight);  // Crown highlight
 rect(8,9-breathe,3,6,hairDark);     // Sideburns
 rect(22,9-breathe,2,6,hairDark);

 if(dir==='up'){
   rect(8,7-breathe,16,13,hairBase);
   rect(11,6-breathe,10,4,hairLight);
   rect(8,16-breathe,16,4,hairDark);
 } else {
   const left=dir==='left',right=dir==='right';
   // Eyes with expressive pupil
   if(!right) {
     rect(12-(left?2:0),12-breathe,2,3,'#1F1612');
     rect(12-(left?2:0),12-breathe,1,1,'#FFFFFF'); // Eye sparkle
   }
   if(!left) {
     rect(19+(right?1:0),12-breathe,2,3,'#1F1612');
     rect(19+(right?1:0),12-breathe,1,1,'#FFFFFF');
   }
   rect(14,18-breathe,5,1,'#C94A4A'); // Friendly mouth
   rect(10,16-breathe,3,1,'#E8A08C'); // Rosy cheeks
   rect(21,16-breathe,2,1,'#E8A08C');
 }
 if(npc&&variant===1){
   // Vintage Vietnamese cap / beret
   rect(7,3-breathe,18,5,C.tealDark);
   rect(5,7-breathe,22,2,C.teal);
   rect(6,7-breathe,20,1,'#87B8A8');
 }
 if(npc&&variant===2){
   // Grandma scarf / bandana
   rect(7,3-breathe,18,4,'#A38258');
   rect(8,4-breathe,4,8,'#D4BA92');
 }
 return canvas;
}
function fixture(key:string):HTMLCanvasElement{
 const [type,productId='none',state='empty']=key.split(':');
 const coldSingle=type==='fixture_refrigerator_single';
 const coldDouble=type==='fixture_refrigerator';
 const cold=coldSingle||coldDouble;
 const cash=type==='fixture_cashier';
 const {canvas,ctx}=surface(coldSingle?32:64,48),w=canvas.width;
 const r=(x:number,y:number,a:number,b:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,a,b);};

 // 2.5D Ambient drop shadow beneath the fixture onto the floor
 r(4,42,w-6,5,'#26190E45');
 r(2,44,w-2,3,'#26190E22');

 if(cash){
   // Cashier Counter with 2.5D top bevel, polished wood counter, drawers, and register
   r(1,4,62,40,'#2B1B12'); // Outer dark wood frame
   r(2,5,60,9,'#D6A870');  // 2.5D Top surface (varnished oak wood)
   r(2,5,60,2,'#F3D09E');  // 2.5D Top highlight specular edge
   r(2,13,60,2,'#8E5830'); // Bevel undercut shadow

   // Front facade
   r(2,15,60,27,'#A2693E');
   r(3,16,58,2,'#7A4822');
   // Left Drawer Unit
   r(5,21,24,19,'#28180F');
   r(6,22,22,8,'#8B552F');
   r(6,22,22,1,'#B27B50');
   r(14,25,6,2,'#EAD0A0'); // Brass handle
   r(6,31,22,8,'#8B552F');
   r(6,31,22,1,'#B27B50');
   r(14,34,6,2,'#EAD0A0'); // Brass handle

   // Right Cabinet Unit
   r(33,21,25,19,'#28180F');
   r(34,22,23,17,'#8B552F');
   r(34,22,23,1,'#B27B50');
   r(36,30,3,3,'#EAD0A0'); // Knob

   // Cash Register machine on left
   r(6,0,20,13,'#1D2B29');
   r(7,1,18,3,'#355952');
   r(7,4,18,6,'#213C36');
   r(9,5,14,2,'#7EBA6E'); // Green retro LCD screen
   r(7,10,18,3,'#457065'); // Keypad buttons
   for(let kx=9;kx<=21;kx+=3) r(kx,11,2,1,'#F7F2D8');

   // Receipt paper roll / scanner pad on right
   r(40,1,16,12,'#281912');
   r(41,2,14,4,'#B38356');
   r(43,3,10,1,'#FAF2DC');
   r(47,7,4,2,'#E5B338'); // Coin tray brass bell
   return canvas;
 }

 // Wooden Display Shelf & Glass Refrigerator
 if(coldDouble){
   // Refrigerator 2 cánh (2x1 ô / 64px): khung kim loại 2.5D, 2 cánh kính riêng biệt, tay nắm đôi ở giữa
   r(1,3,w-2,41,'#182622');
   r(2,4,w-4,38,'#5D8B7E');
   r(3,5,w-6,2,'#CBEAE0'); // Mép nóc sáng 2.5D

   // Trụ giữa ngăn 2 cánh
   r(31,4,2,38,'#182622');
   r(31,5,2,37,'#5D8B7E');
   r(31,5,1,37,'#7EBDAE');

   // Cánh trái (x=4..29)
   r(4,7,26,34,'#192E28'); // Lòng tủ mát bên trong
   r(5,8,24,32,'rgba(100, 160, 146, 0.28)'); // Mặt kính xanh ngọc
   r(6,9,2,30,'rgba(234, 248, 244, 0.38)');  // Vệt phản quang chính
   r(10,9,1,28,'rgba(234, 248, 244, 0.16)'); // Vệt phản quang phụ
   r(28,17,2,10,'#182622');
   r(28,18,1,8,'#D3EBE4'); // Tay nắm mạ chrome cánh trái

   // Cánh phải (x=34..59)
   r(34,7,26,34,'#192E28'); // Lòng tủ mát bên trong
   r(35,8,24,32,'rgba(100, 160, 146, 0.28)'); // Mặt kính xanh ngọc
   r(36,9,2,30,'rgba(234, 248, 244, 0.38)');  // Vệt phản quang chính
   r(40,9,1,28,'rgba(234, 248, 244, 0.16)'); // Vệt phản quang phụ
   r(34,17,2,10,'#182622');
   r(34,18,1,8,'#D3EBE4'); // Tay nắm mạ chrome cánh phải
 } else if(coldSingle){
   // Refrigerator 1 cánh (1x1 ô / 32px): 2.5D metallic mint/steel frame with reflective glass doors
   r(1,3,w-2,41,'#182622');
   r(2,4,w-4,38,'#5D8B7E');
   r(3,5,w-6,2,'#CBEAE0'); // Top roof highlight
   r(3,7,26,34,'#192E28'); // Inner cold interior
   r(4,8,24,32,'rgba(100, 160, 146, 0.28)'); // Glass door tint
   r(5,9,2,30,'rgba(234, 248, 244, 0.38)');  // Specular glass shine streak
   r(9,9,1,28,'rgba(234, 248, 244, 0.16)');  // Faint secondary reflection
   r(27,17,2,10,'#182622');
   r(27,18,1,8,'#D3EBE4'); // Chrome door handle
 } else {
   // Stardew Valley-inspired 2.5D Rustic Oak Shelf
   r(1,3,w-2,41,'#2A180E'); // Deep dark shadow border
   r(2,4,w-4,38,'#8B5731'); // Main wood body
   r(2,4,w-4,2,'#DEAA73');  // 2.5D Top cap highlight
   r(4,6,w-8,33,'#4D2B15'); // Recessed dark shadow depth behind goods
 }

 const cols=coldDouble?4:coldSingle?2:5;
 const maxUnits=cols*3;
 const quantity=state==='full'?maxUnits:state==='low'?Math.max(1,Math.floor(maxUnits/3)):0;
 const product=PRODUCT_MAP[productId],pixels=productPixels(product);
 for(let row=0;row<3;row++){
   for(let col=0;col<cols;col++){
     if(row*cols+col>=quantity)continue;
     let x:number;
     if(coldDouble){
       x=col<2?(7+col*10):(37+(col-2)*10);
     }else{
       x=6+col*10;
     }
     const y=7+row*11;
     for(const p of pixels){
       ctx.fillStyle=p.color;
       ctx.fillRect(x+Math.floor(p.x/2),y+Math.floor(p.y/2),Math.max(1,Math.ceil(p.w/2)),Math.max(1,Math.ceil(p.h/2)));
     }
   }
   // 2.5D Shelf plank with highlight and depth
   const shelfY = 16+row*11;
   if(coldDouble){
     // Giá đỡ kim loại cho 2 ngăn riêng biệt
     r(4,shelfY,26,2,'#2D4F46');
     r(4,shelfY,26,1,'#7EBDAE');
     r(4,shelfY+1,26,1,'#142520');
     r(34,shelfY,26,2,'#2D4F46');
     r(34,shelfY,26,1,'#7EBDAE');
     r(34,shelfY+1,26,1,'#142520');
   } else if(coldSingle){
     r(4,shelfY,24,2,'#2D4F46'); // Wire rack shelf
     r(4,shelfY,24,1,'#7EBDAE'); // Wire rack top highlight
     r(4,shelfY+1,24,1,'#142520'); // Wire rack drop shadow
   } else {
     r(3,shelfY,w-6,3,'#6E4122');
     r(3,shelfY,w-6,1,'#DEAA73'); // Plank top light edge
     r(3,shelfY+2,w-6,1,'#2A180E'); // Plank bottom drop shadow
   }
 }

 r(1,3,w-2,1,cold?'#EAF8F4':'#F2CA97'); // Topmost rim highlight
 r(1,42,w-2,2,'#1A1009'); // Bottom baseboard
 r(4,44,6,2,'#1A1009');
 if(coldDouble) r(29,44,6,2,'#1A1009'); // Chân đỡ giữa cho tủ 2 cánh
 r(w-10,44,6,2,'#1A1009'); // Sturdy feet
 return canvas;
}
const font:Record<string,string[]>={A:['01110','11011','11011','11111','11011','11011','11011'],D:['11110','11011','11011','11011','11011','11011','11110'],E:['11111','11000','11000','11110','11000','11000','11111'],H:['11011','11011','11011','11111','11011','11011','11011'],I:['11111','00100','00100','00100','00100','00100','11111'],M:['11011','11111','11111','11011','11011','11011','11011'],O:['01110','11011','11011','11011','11011','11011','01110'],P:['11110','11011','11011','11110','11000','11000','11000'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['11011','11011','11011','11011','11011','11011','01110']};
function sign(){const {canvas,ctx}=surface(128,48);ctx.fillStyle=C.dark;ctx.fillRect(0,0,128,48);ctx.fillStyle=C.light;ctx.fillRect(1,1,126,46);ctx.fillStyle=C.tealDark;ctx.fillRect(4,4,120,40);ctx.fillStyle=C.teal;ctx.fillRect(5,5,118,2);const line=(text:string,y:number)=>{const start=Math.floor((128-text.length*6)/2);ctx.fillStyle=C.paper;[...text].forEach((char,i)=>font[char]?.forEach((row,j)=>[...row].forEach((v,k)=>{if(v==='1')ctx.fillRect(start+i*6+k,y+j,1,1);})));};line('TIEM TAP HOA',12);line('DAU HEM',29);ctx.fillStyle=C.sun;ctx.fillRect(12,23,104,1);ctx.fillStyle=C.paper;ctx.fillRect(50,10,2,1);ctx.fillRect(60,20,1,1);ctx.fillRect(95,10,2,1);ctx.fillRect(49,26,3,1);ctx.fillRect(50,25,1,1);ctx.fillRect(38,32,4,1);ctx.fillRect(80,27,1,1);return canvas;}

function wallTexture(key:string):HTMLCanvasElement|null{
  const {canvas,ctx}=surface(32,32);
  const r=(x:number,y:number,w:number,h:number,col:string)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};
  const capTop='#FAF0C8',capBevel='#F2DC9B',wallLight='#E8BE65',wallBase='#D4A346',wallDark='#BF8B32';
  const skirtWood='#5C3617',skirtLine='#825026',skirtShade='#3E220D';
  const tealAccent='#357F72';
  const whCap='#E8E5D3',whBevel='#D5D1BD',whLight='#C4B493',whBase='#B09F7B',whDark='#988764',whSkirt='#696254';
  const paveBase='#C8C3AD',paveLine='#A8AA98',paveLight='#D6D1B9',shadow='#26190E40';

  if(key==='wall_store_left'){
    r(0,0,16,32,paveBase);r(0,0,16,1,paveLine);r(0,16,16,1,paveLine);r(1,1,14,1,paveLight);r(1,17,14,1,paveLight);
    r(16,0,1,32,skirtShade);
    r(17,0,3,32,capTop);r(20,0,2,32,capBevel);
    r(22,0,7,32,wallBase);r(22,0,2,32,wallLight);r(27,0,2,32,wallDark);
    r(22,10,7,1,wallDark);r(22,21,7,1,wallDark);
    r(22,24,7,2,tealAccent);
    r(22,26,7,6,skirtWood);r(22,26,7,1,skirtLine);
    r(29,0,2,32,skirtShade);r(30,0,2,32,shadow);
    return canvas;
  }
  if(key==='wall_store_right'){
    r(0,0,2,32,shadow);r(1,0,2,32,skirtShade);
    r(3,0,7,32,wallBase);r(3,0,2,32,wallLight);r(8,0,2,32,wallDark);
    r(3,10,7,1,wallDark);r(3,21,7,1,wallDark);
    r(3,24,7,2,tealAccent);
    r(3,26,7,6,skirtWood);r(3,26,7,1,skirtLine);
    r(10,0,2,32,capBevel);r(12,0,3,32,capTop);
    r(15,0,1,32,skirtShade);
    r(16,0,16,32,paveBase);r(16,0,16,1,paveLine);r(16,16,16,1,paveLine);r(17,1,14,1,paveLight);r(17,17,14,1,paveLight);
    r(16,0,4,32,shadow);
    return canvas;
  }
  if(key==='wall_partition_left'||key==='wall_partition_right'||key==='wall_store_back'){
    r(0,0,32,4,capTop);r(0,4,32,3,capBevel);r(0,7,32,2,wallDark);
    r(0,9,32,14,wallBase);r(0,9,32,2,wallLight);
    r(6,14,8,1,wallLight);r(20,18,7,1,wallDark);
    r(0,23,32,2,tealAccent);
    r(0,25,32,7,skirtWood);r(0,25,32,1,skirtLine);r(0,31,32,1,skirtShade);
    return canvas;
  }
  if(key==='wall_store_front'){
    r(0,0,32,32,paveBase);r(0,0,32,1,paveLine);
    r(0,10,32,2,skirtShade);r(0,12,32,3,capTop);r(0,15,32,2,capBevel);
    r(0,17,32,10,wallBase);r(0,17,32,1,wallLight);
    r(0,27,32,5,skirtWood);r(0,27,32,1,skirtLine);
    return canvas;
  }
  if(key==='wall_store_corner_bl'){
    r(0,0,32,32,paveBase);r(16,0,16,32,wallBase);r(16,0,1,32,skirtShade);
    r(17,0,3,32,capTop);r(20,0,2,32,capBevel);
    r(16,10,16,22,skirtWood);r(17,10,14,2,skirtLine);r(18,12,12,16,wallBase);r(18,12,12,2,capTop);
    return canvas;
  }
  if(key==='wall_store_corner_br'){
    r(0,0,32,32,paveBase);r(0,0,16,32,wallBase);r(15,0,1,32,skirtShade);
    r(11,0,4,32,capTop);r(9,0,2,32,capBevel);
    r(0,10,16,22,skirtWood);r(1,10,14,2,skirtLine);r(2,12,12,16,wallBase);r(2,12,12,2,capTop);
    return canvas;
  }
  if(key==='wall_warehouse_left'){
    r(0,0,16,32,paveBase);r(0,0,16,1,paveLine);r(0,16,16,1,paveLine);r(1,1,14,1,paveLight);r(1,17,14,1,paveLight);
    r(16,0,1,32,'#33251D');r(17,0,3,32,whCap);r(20,0,2,32,whBevel);
    r(22,0,7,32,whBase);r(22,0,2,32,whLight);r(27,0,2,32,whDark);
    r(22,26,7,6,whSkirt);r(22,26,7,1,'#827B6E');r(29,0,2,32,'#33251D');r(30,0,2,32,shadow);
    return canvas;
  }
  if(key==='wall_warehouse_right'){
    r(0,0,2,32,shadow);r(1,0,2,32,'#33251D');r(3,0,7,32,whBase);r(3,0,2,32,whLight);r(8,0,2,32,whDark);
    r(3,26,7,6,whSkirt);r(3,26,7,1,'#827B6E');r(10,0,2,32,whBevel);r(12,0,3,32,whCap);r(15,0,1,32,'#33251D');
    r(16,0,16,32,paveBase);r(16,0,16,1,paveLine);r(16,16,16,1,paveLine);r(17,1,14,1,paveLight);r(17,17,14,1,paveLight);
    r(16,0,4,32,shadow);
    return canvas;
  }
  if(key==='wall_warehouse_back'||key==='wall_warehouse_corner_tl'||key==='wall_warehouse_corner_tr'){
    r(0,0,32,4,whCap);r(0,4,32,3,whBevel);r(0,7,32,2,whDark);
    r(0,9,32,15,whBase);r(0,9,32,2,whLight);
    r(4,14,10,1,whDark);r(18,14,10,1,whDark);r(10,19,12,1,whDark);
    r(0,24,32,8,whSkirt);r(0,24,32,1,'#827B6E');r(0,31,32,1,'#33251D');
    return canvas;
  }
  return null;
}

/**
 * Xe tải giao hàng (5 mẫu), vẽ pixel theo tỉ lệ xe tải nhỏ đô thị Đông Nam Á (kiểu Hyundai Porter/Isuzu QKR: cabin lật
 * chắn bùn thấp, thùng dài ~2× cabin, cao ~1,6 lần người). Canvas 120×60 (container 132×60): cao gần 1,5 lần nhân vật
 * (~40 px) và dài ~3 lần. Vẽ quay mặt sang phải rồi lật ngang khi hướng trái; neo giữa-đáy tại bánh xe (y=56).
 */
type TruckKind = 'refrigerated' | 'dry_goods' | 'beverage_sweets' | 'fresh_produce' | 'heavy_container';

function logisticsTruckTexture(key: string): HTMLCanvasElement | null {
  const match = /^truck_(refrigerated|dry_goods|beverage_sweets|fresh_produce|heavy_container)_(left|right)$/.exec(key);
  if (!match) return null;
  const kind = match[1] as TruckKind;
  const isRight = match[2] === 'right';
  const W = kind === 'heavy_container' ? 132 : 120;
  const { canvas, ctx } = surface(W, 60);
  if (!isRight) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  const r = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const DARK = '#1a1815';
  const cabColors: Record<TruckKind, { main: string; dark: string; light: string; shirt: string }> = {
    refrigerated: { main: '#f2f5f7', dark: '#c3ccd3', light: '#ffffff', shirt: '#2e86c1' },
    dry_goods: { main: '#c0392b', dark: '#962d22', light: '#e8604f', shirt: '#f4d03f' },
    beverage_sweets: { main: '#e67e22', dark: '#b9631a', light: '#f5a05a', shirt: '#e91e63' },
    fresh_produce: { main: '#2e8b57', dark: '#216540', light: '#52b27a', shirt: '#f7dc6f' },
    heavy_container: { main: '#2c3e50', dark: '#1d2a37', light: '#4a6178', shirt: '#e67e22' },
  };
  const cab = cabColors[kind];
  const cabX = W - 42;
  const bx = 2;
  const bw = cabX - 4;

  // Bóng đổ gầm và khung xe
  r(4, 54, W - 8, 5, '#26190e40');
  r(8, 53, W - 16, 4, '#26190e25');
  r(2, 44, W - 4, 5, DARK);
  r(3, 45, W - 6, 1, '#4a4540');

  // ---- Thùng hàng ----
  const top = kind === 'heavy_container' ? 3 : 5;
  const boxH = 44 - top;
  if (kind === 'fresh_produce') {
    // Thùng hở: sàn gỗ, thành ván, các thùng rau củ chồng hai tầng
    r(bx - 1, 35, bw + 2, 9, DARK);
    r(bx, 36, bw, 7, '#8a5a2f');
    r(bx, 36, bw, 1, '#c89b5c');
    const crateColors = ['#c89b5c', '#b98a4b'];
    const produce = ['#e67e22', '#e74c3c', '#7bc043', '#f4d03f', '#8e44ad'];
    for (let row = 0; row < 2; row++) {
      const crates = Math.floor((bw - 4) / 17);
      for (let i = 0; i < crates; i++) {
        const cx = bx + 2 + i * 17;
        const cy = 26 - row * 11;
        r(cx - 1, cy - 1, 17, 12, DARK);
        r(cx, cy, 15, 10, crateColors[(i + row) % 2]);
        r(cx, cy + 3, 15, 1, '#8a5a2f');
        r(cx, cy + 7, 15, 1, '#8a5a2f');
        const p = produce[(i * 2 + row) % produce.length];
        r(cx + 1, cy - 2, 4, 3, p); r(cx + 6, cy - 3, 4, 4, p); r(cx + 11, cy - 2, 3, 3, p);
        if (row === 1) { r(cx + 2, cy - 4, 3, 2, '#2e8b57'); r(cx + 8, cy - 5, 3, 2, '#2e8b57'); }
      }
    }
    // Cọc và thanh chắn thành thùng
    for (const px of [bx, bx + Math.floor(bw / 2), bx + bw - 2]) { r(px, 12, 2, 24, DARK); r(px, 13, 1, 22, '#8a5a2f'); }
    r(bx, 28, bw, 2, DARK); r(bx, 28, bw, 1, '#a97a49');
  } else {
    r(bx - 1, top - 1, bw + 2, boxH + 2, DARK);
    if (kind === 'refrigerated') {
      r(bx, top, bw, boxH, '#eef2f5');
      r(bx, top, bw, 2, '#ffffff');
      r(bx, 40, bw, 4, '#c5ced6');
      r(bx, 26, bw, 5, '#2e86c1'); r(bx, 26, bw, 1, '#5dade2');
      // Hoa tuyết xanh + dàn lạnh trên nóc sát cabin
      const sx = bx + 26, sy = 15;
      r(sx - 6, sy, 13, 1, '#2e86c1'); r(sx, sy - 6, 1, 13, '#2e86c1');
      r(sx - 4, sy - 4, 1, 1, '#2e86c1'); r(sx + 4, sy - 4, 1, 1, '#2e86c1'); r(sx - 4, sy + 4, 1, 1, '#2e86c1'); r(sx + 4, sy + 4, 1, 1, '#2e86c1');
      r(bx + bw - 16, top - 4, 14, 5, DARK); r(bx + bw - 15, top - 3, 12, 3, '#9aa5ad');
      for (let i = 0; i < 4; i++) r(bx + bw - 13 + i * 3, top - 3, 1, 3, '#5d6d7e');
    } else if (kind === 'dry_goods') {
      r(bx, top, bw, boxH, '#f4e9d2');
      r(bx, top, bw, 2, '#fff8e8');
      for (let x = bx + 5; x < bx + bw - 2; x += 6) r(x, top + 2, 1, boxH - 4, '#e3d5b8');
      r(bx, 33, bw, 7, '#c0392b'); r(bx, 33, bw, 1, '#e8604f');
      // Biểu tượng thùng carton có băng keo
      r(bx + 22, 12, 22, 16, DARK); r(bx + 23, 13, 20, 14, '#c89b5c'); r(bx + 23, 13, 20, 3, '#dcb27a');
      r(bx + 31, 13, 4, 14, '#f4e9d2');
    } else if (kind === 'beverage_sweets') {
      const stripes = ['#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
      stripes.forEach((c, i) => r(bx, top + i * 6, bw, 6, c));
      r(bx, top + 36, bw, 3, '#ffffff');
      // Nhãn kẹo/chai nước
      r(bx + 22, 14, 26, 15, DARK); r(bx + 23, 15, 24, 13, '#ffffff');
      r(bx + 26, 17, 5, 9, '#e91e63'); r(bx + 33, 19, 5, 7, '#2196f3'); r(bx + 40, 17, 4, 9, '#ff9800');
    } else {
      // container 20ft xanh dương có gân dọc
      r(bx, top, bw, boxH, '#1b5e8e');
      for (let x = bx + 3; x < bx + bw - 2; x += 5) { r(x, top + 3, 2, boxH - 6, '#14496e'); r(x, top + 3, 1, boxH - 6, '#2a7ab0'); }
      r(bx, top, bw, 3, '#0f3a57'); r(bx, top + boxH - 3, bw, 3, '#0f3a57');
      for (const cx of [bx, bx + bw - 4]) { r(cx, top, 4, 4, '#e67e22'); r(cx, top + boxH - 4, 4, 4, '#e67e22'); }
      r(bx + 18, 14, 30, 10, '#f4f6f7'); r(bx + 20, 16, 12, 2, '#1b5e8e'); r(bx + 20, 20, 24, 2, '#e67e22');
    }
  }
  // Đèn hậu + cản sau
  r(1, 36, 3, 6, '#e74c3c'); r(1, 36, 1, 6, '#ff8a80');
  r(2, 46, 7, 3, '#7f8c8d');

  // ---- Cabin ----
  r(cabX - 1, 14, 43, 31, DARK);
  r(cabX, 15, 41, 29, cab.main);
  r(cabX, 15, 41, 2, cab.light);
  r(cabX, 36, 41, 8, cab.dark);
  if (kind === 'refrigerated') r(cabX, 33, 41, 3, '#2e86c1');
  // Kính chắn gió (phía trước, bên phải) + cửa sổ bên có tài xế
  r(cabX + 22, 18, 17, 13, DARK); r(cabX + 23, 19, 15, 11, '#8ec6e6'); r(cabX + 25, 20, 6, 2, '#d6eefb'); r(cabX + 35, 25, 3, 5, '#6aa8cc');
  r(cabX + 3, 18, 17, 13, DARK); r(cabX + 4, 19, 15, 11, '#8ec6e6');
  r(cabX + 9, 22, 6, 6, '#f1c8a0'); r(cabX + 8, 21, 8, 2, '#2a1c14'); r(cabX + 8, 28, 9, 2, cab.shirt);
  // Cửa, tay nắm, gương
  r(cabX + 20, 18, 1, 25, DARK); r(cabX + 16, 33, 4, 2, '#cfd3d6');
  r(cabX + 21, 22, 2, 7, DARK); r(cabX + 22, 21, 3, 2, DARK);
  // Mặt trước: lưới tản nhiệt, đèn pha, cản
  r(cabX + 39, 24, 2, 18, cab.dark);
  r(cabX + 36, 32, 5, 8, '#2b2f33'); r(cabX + 37, 33, 3, 1, '#5d6368'); r(cabX + 37, 36, 3, 1, '#5d6368');
  r(cabX + 36, 28, 5, 4, '#ffe27a'); r(cabX + 38, 29, 2, 2, '#ffffff');
  r(cabX + 34, 42, 8, 4, '#9aa0a6'); r(cabX + 34, 42, 8, 1, '#d0d4d8');

  // ---- Bánh xe ----
  const wheel = (cx: number, heavy = false) => {
    r(cx - 10, 41, 20, 3, DARK);
    r(cx - 7, 42, 14, 15, DARK); r(cx - 9, 44, 18, 11, DARK);
    r(cx - 6, 45, 12, 9, '#2d2a27');
    r(cx - 4, 46, 8, 7, heavy ? '#7f8c8d' : '#b8bec4'); r(cx - 2, 48, 4, 3, '#5d6368');
  };
  wheel(26); wheel(W - 18);
  if (kind === 'heavy_container') wheel(44, true);
  // Phóng 1,5 lần (180×90, container 198×90): xe tải ~5,9 m dài gấp ~1,4 lần taxi 130×65 và cao hơn hẳn (xe tải 2,75 m vs taxi 1,45 m).
  const TRUCK_SCALE = 1.5;
  const scaled = surface(Math.round(W * TRUCK_SCALE), Math.round(60 * TRUCK_SCALE));
  scaled.ctx.drawImage(canvas, 0, 0, scaled.canvas.width, scaled.canvas.height);
  return scaled.canvas;
}

function logisticsPropTexture(key: string): HTMLCanvasElement | null {
  // ==========================================
  // ĐỒ VẬT TRANG TRÍ BÃI BỐC DỠ (LOADING DOCK PROPS)
  // ==========================================
  if (key === 'prop_dock_pallet') {
    const { canvas, ctx } = surface(32, 16);
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // Bóng đổ tiếp đất trên vỉa hè
    r(2, 12, 28, 4, '#26190e40');
    r(4, 13, 24, 2, '#26190e25');
    // 3 Chân trụ đỡ gỗ pallet (trái, giữa, phải)
    r(3, 8, 5, 4, '#3e2210'); r(4, 8, 3, 4, '#7a4822');
    r(14, 8, 4, 4, '#3e2210'); r(15, 8, 2, 4, '#7a4822');
    r(24, 8, 5, 4, '#3e2210'); r(25, 8, 3, 4, '#7a4822');
    // Thanh nan đế dưới cùng
    r(2, 11, 28, 2, '#543015'); r(3, 11, 26, 1, '#8e5628');
    // Mặt sàn ván gỗ pallet trên cùng
    r(1, 4, 30, 4, '#3e2210');
    r(2, 5, 28, 3, '#9c6434');
    r(2, 4, 28, 1, '#cfa070'); // Viền vát sáng
    // Các khe rãnh nan gỗ
    r(8, 5, 1, 3, '#3e2210');
    r(16, 5, 1, 3, '#3e2210');
    r(23, 5, 1, 3, '#3e2210');
    return canvas;
  }

  if (key === 'prop_cargo_carton') {
    const { canvas, ctx } = surface(16, 16);
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    r(1, 13, 14, 3, '#26190e30');
    r(2, 3, 12, 11, '#6e2c00');
    r(3, 4, 10, 9, '#b9770e');
    r(3, 4, 10, 2, '#d68910');
    r(7, 4, 2, 9, '#d35400');
    r(10, 8, 2, 3, '#ffffff');
    return canvas;
  }

  if (key === 'prop_foam_box_cold') {
    const { canvas, ctx } = surface(16, 16);
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    r(1, 13, 14, 3, '#26190e30');
    r(2, 4, 12, 10, '#5d6d7e');
    r(3, 5, 10, 8, '#eaeded');
    r(3, 5, 10, 2, '#ffffff');
    r(2, 8, 12, 2, '#2980b9');
    return canvas;
  }

  if (key === 'prop_produce_crate') {
    const { canvas, ctx } = surface(16, 16);
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    r(1, 13, 14, 3, '#26190e30');
    r(2, 4, 12, 10, '#4a2c11');
    r(3, 5, 10, 8, '#8e5a35');
    r(3, 5, 10, 2, '#ba8254');
    r(3, 9, 10, 1, '#4a2c11');
    r(4, 3, 3, 3, '#27ae60');
    r(8, 2, 4, 3, '#e67e22');
    r(11, 3, 2, 3, '#e74c3c');
    return canvas;
  }

  if (key === 'prop_hand_trolley') {
    const { canvas, ctx } = surface(20, 24);
    const r = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    r(2, 20, 16, 3, '#26190e35');
    r(4, 16, 4, 6, '#1a1815');
    r(12, 16, 4, 6, '#1a1815');
    r(3, 18, 14, 2, '#922b21');
    r(4, 18, 12, 1, '#e74c3c');
    r(3, 6, 2, 13, '#c0392b');
    r(15, 6, 2, 13, '#c0392b');
    r(3, 4, 14, 2, '#1a1815');
    return canvas;
  }

  return null;
}

/**
 * Xe chạy đường dọc nhìn thẳng từ phía trước (`down`, xe xuôi nam) hoặc phía sau (`up`, xe ngược bắc):
 * khóa `vehicle_ns_<loại>_<biến thể>_<down|up>`; neo giữa-đáy, đáy canvas là mặt đường.
 */
function vehicleNsTexture(key: string): HTMLCanvasElement | null {
  const m = /^vehicle_ns_(motorbike|bicycle|car|minibus|truck)_(\d+)_(down|up)$/.exec(key);
  if (!m) return null;
  const type = m[1];
  const variant = Number(m[2]);
  const front = m[3] === 'down';
  const DARK = '#1a1815';
  const SKIN = '#f1c8a0';
  const GLASS = '#8ec6e6';
  const SIZE: Record<string, [number, number]> = { motorbike: [32, 60], bicycle: [28, 56], car: [52, 44], minibus: [60, 66], truck: [60, 68] };
  const [w, h] = SIZE[type];
  const { canvas, ctx } = surface(w, h);
  const r = (x: number, y: number, rw: number, rh: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, rw, rh); };
  const shadow = () => { r(2, h - 4, w - 4, 4, '#26190e40'); r(4, h - 5, w - 8, 3, '#26190e25'); };

  if (type === 'motorbike' || type === 'bicycle') {
    const bike = type === 'motorbike';
    const v = variant % 3;
    const jacket = v === 2 ? { main: '#3a6ea5', light: '#5f95c9', dark: '#274f7a' } : { main: '#2e8b3e', light: '#4cb25d', dark: '#1f6a2d' };
    const pal = [{ main: '#3f9b4a', light: '#6fcb7a' }, { main: '#3a7ca5', light: '#6aa6cc' }, { main: '#c0392b', light: '#e8604f' }][v];
    const cx = w / 2;
    shadow();
    // Bánh xe (phía trước thì bánh trước, phía sau thì bánh sau), phuộc/khung
    const tw = bike ? 6 : 4;
    r(cx - tw / 2, h - 18, tw, 16, DARK); r(cx - tw / 2 + 1, h - 17, tw - 2, 14, '#2d2a27');
    r(cx - 1, h - 30, 2, 14, '#9aa0a6');
    // Chân
    r(cx - 6, h - 30, 4, 14, DARK); r(cx - 5, h - 29, 2, 12, '#3b4e4e'); r(cx + 2, h - 30, 4, 14, DARK); r(cx + 3, h - 29, 2, 12, '#3b4e4e');
    if (bike && !front && v === 0) { r(cx - 8, h - 38, 16, 10, DARK); r(cx - 7, h - 37, 14, 8, pal.main); r(cx - 7, h - 37, 14, 2, pal.light); }
    // Thân, tay, ghi-đông
    const top = bike ? 14 : 12;
    r(cx - 7, top + 2, 14, 20, DARK); r(cx - 6, top + 3, 12, 18, jacket.main); r(cx - 6, top + 3, 3, 18, jacket.light); r(cx + 3, top + 3, 3, 18, jacket.dark);
    if (!front) r(cx - 3, top + 2, 6, 2, '#f4f4f4');
    r(cx - 12, top + 8, 6, 12, DARK); r(cx - 11, top + 9, 4, 10, jacket.main); r(cx + 6, top + 8, 6, 12, DARK); r(cx + 7, top + 9, 4, 10, jacket.main);
    r(cx - 11, top + 19, 4, 3, SKIN); r(cx + 7, top + 19, 4, 3, SKIN);
    r(cx - 13, top + 21, 26, 2, DARK);
    // Đèn: pha trắng ở phía trước, đèn hậu đỏ ở phía sau
    if (front) { r(cx - 3, h - 36, 6, 4, DARK); r(cx - 2, h - 35, 4, 2, '#ffe27a'); } else r(cx - 2, h - 20, 4, 3, '#e74c3c');
    // Đầu + mũ (xe máy: mũ vải rộng vành; xe đạp: nón lá)
    r(cx - 5, top - 8, 10, 10, DARK); r(cx - 4, top - 7, 8, 8, front ? SKIN : '#1a1815');
    if (front) { r(cx - 4, top - 7, 8, 2, '#1a1815'); r(cx - 3, top - 4, 1, 2, '#1a1815'); r(cx + 2, top - 4, 1, 2, '#1a1815'); r(cx - 1, top - 1, 2, 1, '#b5594a'); }
    if (bike) { r(cx - 5, top - 14, 10, 7, DARK); r(cx - 4, top - 13, 8, 5, '#e4c485'); r(cx - 9, top - 9, 18, 3, DARK); r(cx - 8, top - 9, 16, 2, '#d1ab62'); }
    else { r(cx - 1, 0, 2, 1, DARK); r(cx - 4, 1, 8, 1, '#f0e2a0'); r(cx - 7, 2, 14, 1, '#e9d792'); r(cx - 10, 3, 20, 1, '#f0e2a0'); r(cx - 12, 4, 24, 2, '#d9c581'); }
    if (!bike && front) { r(cx - 7, h - 40, 14, 8, DARK); r(cx - 6, h - 39, 12, 6, '#c89b5c'); r(cx - 5, h - 42, 6, 3, '#4cae3b'); }
    return canvas;
  }

  if (type === 'car') {
    const BODY = [
      { body: '#e4bd48', hi: '#f4d97a', lo: '#c79a2c' }, { body: '#e6eaed', hi: '#ffffff', lo: '#b9c1c8' }, { body: '#b4bcc4', hi: '#d6dce2', lo: '#8c949c' },
      { body: '#c0392b', hi: '#e8604f', lo: '#8f2a20' }, { body: '#2e6fa8', hi: '#5f9cd0', lo: '#215582' }, { body: '#343a41', hi: '#5a626b', lo: '#22272c' },
    ][variant % 6];
    shadow();
    r(3, 33, 8, 9, DARK); r(41, 33, 8, 9, DARK);
    r(9, 4, 34, 22, DARK); r(10, 5, 32, 5, BODY.body); r(10, 5, 32, 1, BODY.hi);
    r(10, 10, 32, 14, front ? GLASS : '#5a8fb0'); r(12, 11, 5, 2, '#d6eefb');
    if (front) { r(23, 14, 8, 8, SKIN); r(22, 13, 10, 3, '#2a1c14'); r(23, 22, 8, 2, '#2e86c1'); }
    r(2, 22, 48, 16, DARK); r(3, 23, 46, 14, BODY.body); r(3, 23, 46, 3, BODY.hi); r(3, 31, 46, 6, BODY.lo);
    if (variant % 6 === 0) r(17, 1, 18, 5, '#ffffff'), r(21, 2, 10, 3, '#e74c3c');
    if (front) { r(5, 26, 8, 4, '#fff3b0'); r(39, 26, 8, 4, '#fff3b0'); r(18, 29, 16, 5, '#2b2f33'); r(20, 31, 12, 1, '#5d6368'); }
    else { r(4, 25, 9, 4, '#e74c3c'); r(39, 25, 9, 4, '#e74c3c'); r(20, 28, 12, 3, BODY.lo); }
    r(4, 35, 44, 3, '#4a4540'); r(22, 34, 8, 3, '#f4f4f4');
    return canvas;
  }

  if (type === 'minibus') {
    const COLORS = ['#f4f6f7', '#4cae3b', '#f4c542', '#c0392b'];
    const body = COLORS[variant % 4];
    shadow();
    r(5, h - 14, 10, 12, DARK); r(w - 15, h - 14, 10, 12, DARK);
    r(2, 6, w - 4, 50, DARK); r(3, 7, w - 6, 48, body); r(3, 7, w - 6, 3, '#ffffff55');
    r(6, 12, w - 12, front ? 20 : 15, DARK); r(7, 13, w - 14, front ? 18 : 13, front ? GLASS : '#5a8fb0');
    r(w / 2 - 1, 13, 2, front ? 18 : 13, DARK);
    if (front) { r(12, 17, 7, 7, SKIN); r(11, 16, 9, 2, '#2a1c14'); r(w - 20, 17, 7, 7, SKIN); r(w - 21, 16, 9, 2, '#2a1c14'); }
    r(3, 36, w - 6, 8, '#00000022'); r(3, 40, w - 6, 3, '#2e6da4');
    if (front) { r(6, 44, 9, 5, '#fff3b0'); r(w - 15, 44, 9, 5, '#fff3b0'); r(20, 45, w - 40, 5, '#2b2f33'); }
    else { r(6, 44, 9, 5, '#e74c3c'); r(w - 15, 44, 9, 5, '#e74c3c'); r(w / 2 - 4, 34, 8, 4, '#f4f4f4'); }
    r(4, 50, w - 8, 4, '#4a4540'); r(w / 2 - 5, 50, 10, 3, '#f4f4f4');
    r(w / 2 - 12, 2, 24, 5, DARK); r(w / 2 - 11, 3, 22, 3, '#bdc3c7');
    return canvas;
  }

  // truck
  const BOX = ['#d9b36a', '#e05a47', '#e6f0f5', '#6fb35a'][variant % 4];
  shadow();
  r(5, h - 14, 10, 12, DARK); r(w - 15, h - 14, 10, 12, DARK);
  if (front) {
    r(2, 0, w - 4, 38, DARK); r(3, 1, w - 6, 36, BOX); r(3, 1, w - 6, 3, '#ffffff55'); r(3, 30, w - 6, 6, '#00000022');
    r(7, 28, w - 14, 28, DARK); r(8, 29, w - 16, 26, '#e8ecef');
    r(10, 32, w - 20, 12, GLASS); r(w / 2 - 1, 32, 2, 12, DARK);
    r(14, 36, 7, 6, SKIN); r(13, 35, 9, 2, '#2a1c14');
    r(8, 47, 9, 5, '#fff3b0'); r(w - 17, 47, 9, 5, '#fff3b0'); r(21, 47, w - 42, 6, '#2b2f33');
    r(6, 54, w - 12, 4, '#4a4540'); r(w / 2 - 5, 54, 10, 3, '#f4f4f4');
  } else {
    r(2, 2, w - 4, 52, DARK); r(3, 3, w - 6, 50, BOX); r(3, 3, w - 6, 3, '#ffffff55');
    r(w / 2 - 1, 5, 2, 46, DARK); r(w / 2 - 4, 26, 2, 5, '#9aa0a6'); r(w / 2 + 2, 26, 2, 5, '#9aa0a6');
    r(5, 44, 8, 5, '#e74c3c'); r(w - 13, 44, 8, 5, '#e74c3c');
    r(4, 54, w - 8, 4, '#4a4540'); r(w / 2 - 5, 54, 10, 3, '#f4f4f4');
  }
  return canvas;
}

function vehicleTexture(key: string): HTMLCanvasElement | null {
  if (key.startsWith('vehicle_ns_')) return vehicleNsTexture(key);
  // Tỉ lệ ~20-22 px/mét như xe tải: ô tô dài 100 px (4,5 m) cao ~35 px, xe máy dài ~52 px (1,9 m).
  // Mọi mẫu vẽ quay mặt sang phải rồi lật ngang khi hướng trái; neo giữa-đáy, đáy canvas ~ mặt đường.
  const DARK = '#1a1815';
  const makeSurface = (w: number, h: number, flip: boolean) => {
    const { canvas, ctx } = surface(w, h);
    if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const r = (x: number, y: number, rw: number, rh: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, rw, rh); };
    return { canvas, r };
  };
  // Bánh xe tròn đường kính d (lẻ), tâm (cx, cy): lốp, vành bạc, trục.
  const drawWheel = (r: (x: number, y: number, w: number, h: number, c: string) => void, cx: number, cy: number, rad: number) => {
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.round(Math.sqrt(rad * rad - dy * dy));
      r(cx - half, cy + dy, half * 2 + 1, 1, DARK);
    }
    const inner = rad - 2;
    for (let dy = -inner; dy <= inner; dy++) {
      const half = Math.round(Math.sqrt(inner * inner - dy * dy));
      r(cx - half, cy + dy, half * 2 + 1, 1, '#2d2a27');
    }
    const hub = Math.max(2, rad - 4);
    for (let dy = -hub; dy <= hub; dy++) {
      const half = Math.round(Math.sqrt(hub * hub - dy * dy));
      r(cx - half, cy + dy, half * 2 + 1, 1, '#b8bec4');
    }
    r(cx - 1, cy - 1, 2, 2, '#5d6368');
  };
  // ---- Xe máy kiểu hoạt hình dày nét: bánh to có gai lốp + vành trắng, thân xe 3 mảng sáng/chính/tối ----
  type Pal = { main: string; dark: string; light: string };
  const PAL_GREEN: Pal = { main: '#3f9b4a', dark: '#2c7336', light: '#6fcb7a' };
  const PAL_BLUE: Pal = { main: '#3a7ca5', dark: '#27597a', light: '#6aa6cc' };
  const PAL_RED: Pal = { main: '#c0392b', dark: '#8f2b20', light: '#e8604f' };
  type R4 = (x: number, y: number, w: number, h: number, c: string) => void;
  const disc = (r: R4, cx: number, cy: number, rad: number, col: string) => {
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.round(Math.sqrt(rad * rad - dy * dy + 0.5));
      r(cx - half, cy + dy, half * 2 + 1, 1, col);
    }
  };
  const chunkyWheel = (r: R4, cx: number, cy: number) => {
    disc(r, cx, cy, 9, DARK);
    // gai lốp nhô quanh bánh
    for (const [dx, dy, w, h] of [[-1, -10, 2, 1], [-1, 10, 2, 1], [-10, -1, 1, 2], [10, -1, 1, 2], [6, -8, 2, 2], [-8, -8, 2, 2], [6, 7, 2, 2], [-8, 7, 2, 2]] as const) r(cx + dx, cy + dy, w, h, DARK);
    disc(r, cx, cy, 7, '#3a3631');
    disc(r, cx, cy, 6, '#eef1f3');
    disc(r, cx, cy, 4, '#c8cdd2');
    r(cx - 5, cy, 11, 1, '#9aa5ad'); r(cx, cy - 5, 1, 11, '#9aa5ad');
    disc(r, cx, cy, 2, '#5d6368'); r(cx - 1, cy - 1, 2, 2, '#2c3e50');
  };
  // Vẽ xe (không người) với mặt đường ở y=58; r đã bao gồm độ lệch dọc. kind: 'cub' (xe số, hộp giao hàng) hoặc 'scooter'.
  const drawBike = (r: R4, kind: 'cub' | 'scooter', pal: Pal, box: boolean) => {
    r(3, 56, 56, 4, '#26190e40'); r(8, 55, 46, 3, '#26190e25');
    r(2, 47, 16, 3, '#6b7078'); r(2, 47, 16, 1, '#9aa0a6');                 // ống xả
    chunkyWheel(r, 13, 49);
    chunkyWheel(r, 47, 49);
    if (kind === 'cub') {
      r(2, 39, 22, 3, DARK); r(2, 39, 22, 1, pal.light); r(3, 40, 20, 1, pal.main);   // chắn bùn sau
      r(14, 38, 26, 10, DARK); r(15, 39, 24, 8, pal.main); r(15, 39, 24, 2, pal.light); r(15, 44, 24, 3, pal.dark);
      r(24, 45, 12, 6, '#4a4540'); r(25, 46, 10, 2, '#6b7078');                      // block máy
      r(10, 34, 26, 5, DARK); r(11, 34, 24, 3, '#5a3a24'); r(11, 34, 24, 1, '#7a5436'); // yên
      if (box) {
        r(2, 35, 24, 2, '#6b7078');                                                  // baga
        r(3, 21, 22, 14, DARK); r(4, 22, 20, 12, '#d9b37b'); r(4, 22, 20, 3, '#ecd0a0'); r(4, 31, 20, 3, '#bf9a64');
        r(12, 22, 3, 12, '#f0e8d8'); r(4, 27, 20, 2, '#f0e8d8');                     // băng keo
      }
    } else {
      r(3, 32, 25, 16, DARK); r(4, 33, 23, 14, pal.main); r(4, 33, 23, 3, pal.light); r(4, 44, 23, 3, pal.dark);
      r(9, 38, 11, 3, '#cfd8dc'); r(9, 38, 11, 1, '#ffffff');                        // tấm ốp bên
      r(5, 28, 25, 5, DARK); r(6, 28, 23, 3, '#2b3340'); r(6, 28, 23, 1, '#47536a');  // yên
      r(27, 45, 18, 4, DARK); r(28, 45, 16, 2, '#8a5a33');                           // sàn để chân
    }
    // cổ + tấm chắn chân, phuộc, chắn bùn trước, ghi-đông, đèn
    r(44, 26, 8, 22, DARK); r(45, 27, 6, 20, pal.main); r(45, 27, 2, 20, pal.light);
    r(46, 40, 3, 10, '#8a9199');
    r(42, 41, 15, 3, DARK); r(43, 41, 13, 2, pal.main);
    r(42, 23, 13, 3, DARK); r(44, 20, 2, 3, DARK); r(42, 17, 7, 3, '#9aa0a6'); r(52, 23, 4, 3, '#2a2a2a');
    r(53, 28, 7, 7, DARK); r(54, 29, 5, 5, '#ffe27a'); r(57, 30, 2, 2, '#ffffff');
    r(1, 40, 3, 4, '#e74c3c'); r(1, 44, 3, 3, '#f4f4f4');
  };
  // Cấu hình theo biến thể: xe số xanh + hộp giao hàng, tay ga xanh dương, xe số đỏ
  const bikeFor = (v: number): { kind: 'cub' | 'scooter'; pal: Pal; box: boolean } => {
    if (v % 3 === 0) return { kind: 'cub', pal: PAL_GREEN, box: true };
    if (v % 3 === 1) return { kind: 'scooter', pal: PAL_BLUE, box: false };
    return { kind: 'cub', pal: PAL_RED, box: false };
  };

  if (key.startsWith('vehicle_motorbike_parked_')) {
    const v = Number(key.slice(-1)) || 0;
    const { canvas, r } = makeSurface(62, 44, false);
    const b = bikeFor(v);
    drawBike((x, y, w, h, c) => r(x, y - 16, w, h, c), b.kind, b.pal, b.box);
    return canvas;
  }

  if (key.startsWith('vehicle_motorbike_rider_')) {
    const isRight = key.endsWith('right');
    const variantMatch = key.match(/_(\d+)_(?:left|right)$/);
    const variant = variantMatch ? Number(variantMatch[1]) % 3 : 0;
    const { canvas, r: r0 } = makeSurface(62, 65, !isRight);
    const r: R4 = (x, y, w, h, c) => r0(x, y + 3, w, h, c);
    const b = bikeFor(variant);
    drawBike(r, b.kind, b.pal, b.box);
    const jackets = [
      { main: '#2e8b3e', light: '#4cb25d', dark: '#1f6a2d' },
      { main: '#2e8b3e', light: '#4cb25d', dark: '#1f6a2d' },
      { main: '#3a6ea5', light: '#5f95c9', dark: '#274f7a' },
    ];
    const j = jackets[variant];
    const SKIN = '#f1c8a0';
    const PANTS = '#3b4e4e';
    // Chân: đùi trên yên, cẳng chân xuống bàn đạp, giày nâu
    r(20, 33, 16, 7, DARK); r(21, 34, 14, 5, PANTS); r(21, 34, 14, 1, '#567373');
    r(33, 36, 9, 13, DARK); r(34, 37, 7, 11, PANTS);
    r(31, 47, 13, 6, DARK); r(32, 48, 11, 4, '#8a5a33'); r(32, 48, 11, 1, '#b07a4a');
    // Thân áo khoác xanh lá, cổ áo trắng, túi áo
    r(18, 16, 15, 20, DARK); r(19, 17, 13, 18, j.main); r(19, 17, 3, 18, j.light); r(28, 17, 4, 18, j.dark);
    r(25, 16, 6, 3, '#f4f4f4'); r(22, 27, 5, 4, j.dark); r(22, 27, 5, 1, j.light);
    // Tay cầm ghi-đông
    r(29, 19, 8, 6, DARK); r(30, 20, 6, 4, j.main);
    r(35, 22, 8, 6, DARK); r(36, 23, 6, 4, j.main);
    r(41, 23, 9, 6, DARK); r(42, 24, 7, 4, SKIN);
    // Đầu chibi: tóc, mặt, mắt, má hồng
    r(23, 5, 17, 15, DARK); r(24, 6, 15, 13, SKIN);
    r(23, 8, 4, 10, '#1a1815'); r(24, 6, 15, 3, '#1a1815');
    r(31, 11, 3, 4, '#1a1815'); r(36, 11, 3, 4, '#1a1815'); r(32, 12, 1, 1, '#ffffff'); r(37, 12, 1, 1, '#ffffff');
    r(29, 15, 4, 2, '#e8907a'); r(36, 15, 3, 2, '#e8907a'); r(34, 17, 3, 1, '#b5594a');
    // Mũ vải rộng vành màu be
    r(24, -1, 15, 9, DARK); r(25, 0, 13, 7, '#e4c485'); r(25, 0, 13, 2, '#f2dca8'); r(25, 5, 13, 2, '#cba965');
    r(20, 6, 26, 4, DARK); r(21, 6, 24, 3, '#d1ab62'); r(21, 6, 24, 1, '#e4c485'); r(21, 9, 24, 1, '#a88445');
    return canvas;
  }

  if (key.startsWith('vehicle_car_')) {
    // Taxi vàng đô thị (sedan) ~4,5 m, vẽ trực tiếp ở 130×65 (cùng tỉ lệ xe máy có người lái cao 65 px, nhỏ hơn xe khách 148 px).
    // Greenhouse dựng theo từng hàng để có kính chắn gió/kính sau xiên.
    const isRight = key.endsWith('right');
    const { canvas, r } = makeSurface(130, 65, !isRight);
    const GLASS = '#8ec6e6';
    // `vehicle_car_v<n>_<hướng>`: n=0 taxi vàng; 1..5 sedan trắng, hatchback bạc, hatchback đỏ, sedan xanh, SUV đen. Khóa cũ `vehicle_car_<hướng>` = taxi.
    const variantMatch = /^vehicle_car_v(\d+)_/.exec(key);
    const carVariant = variantMatch ? Number(variantMatch[1]) % 6 : 0;
    const taxi = carVariant === 0;
    const CAR_PAL = [
      { body: '#e4bd48', hi: '#f4d97a', lo: '#c79a2c', seam: '#a07a1c', handle: '#7a5e14' },
      { body: '#e6eaed', hi: '#ffffff', lo: '#b9c1c8', seam: '#8a939a', handle: '#6b747a' },
      { body: '#b4bcc4', hi: '#d6dce2', lo: '#8c949c', seam: '#6a727a', handle: '#4f565c' },
      { body: '#c0392b', hi: '#e8604f', lo: '#8f2a20', seam: '#6f1f17', handle: '#4f1610' },
      { body: '#2e6fa8', hi: '#5f9cd0', lo: '#215582', seam: '#173f61', handle: '#112f48' },
      { body: '#343a41', hi: '#5a626b', lo: '#22272c', seam: '#16191d', handle: '#0d0f12' },
    ][carVariant];
    const BODY = CAR_PAL.body;
    const roofTop = carVariant === 5 ? 12 : 17;
    const bodyTop = 35;
    r(8, 57, 114, 6, '#26190e40'); r(13, 56, 104, 6, '#26190e25');
    // Cabin (greenhouse): viền tối, mui, kính
    const leftAt = (y: number) => 40 - Math.floor((y - roofTop) * 0.75);
    const rightAt = (y: number) => 90 + Math.floor((y - roofTop) * 0.8);
    for (let y = roofTop; y < bodyTop; y++) r(leftAt(y) - 1, y, rightAt(y) - leftAt(y) + 3, 1, DARK);
    for (let y = roofTop + 1; y < bodyTop; y++) {
      const l = leftAt(y);
      const rr = rightAt(y);
      if (y <= roofTop + 2) { r(l, y, rr - l + 1, 1, BODY); continue; }
      r(l, y, rr - l + 1, 1, GLASS);
    }
    r(leftAt(roofTop) + 1, roofTop + 1, rightAt(roofTop) - leftAt(roofTop) - 1, 1, CAR_PAL.hi);
    // Trụ A, B, C (màu thân xe)
    for (let y = roofTop + 3; y < bodyTop; y++) {
      r(leftAt(y) + 1, y, 5, 1, BODY);
      r(60, y, 5, 1, BODY);
      r(rightAt(y) - 5, y, 5, 1, BODY);
    }
    // Phản chiếu kính + tài xế + khách ghế sau
    r(68, 22, 4, 3, '#d6eefb'); r(43, 22, 4, 3, '#d6eefb');
    r(77, 22, 7, 7, '#f1c8a0'); r(76, 21, 9, 3, '#2a1c14'); r(77, 29, 7, 5, '#2e86c1');
    r(47, 25, 5, 5, '#f1c8a0'); r(46, 24, 7, 3, '#2a1c14');
    // Đèn mui "TAXI" (chỉ taxi)
    if (taxi) { r(61, 10, 16, 7, DARK); r(62, 11, 14, 5, '#ffffff'); r(65, 12, 4, 4, '#e74c3c'); r(70, 12, 4, 4, '#e74c3c'); }
    // Thân xe
    r(3, bodyTop - 1, 124, 22, DARK);
    r(4, bodyTop, 122, 20, BODY);
    r(4, bodyTop, 122, 3, CAR_PAL.hi);
    r(4, bodyTop + 12, 122, 8, CAR_PAL.lo);
    // Dải ca-rô taxi dọc thân (ô 2×2 xen kẽ); xe thường chỉ có đường gân thân
    if (taxi) for (let x = 8; x < 116; x += 4) { r(x, bodyTop + 8, 2, 2, DARK); r(x + 2, bodyTop + 10, 2, 2, DARK); }
    else r(6, bodyTop + 9, 118, 1, CAR_PAL.seam);
    // Cửa, tay nắm, gương
    r(33, bodyTop + 1, 1, 16, CAR_PAL.seam); r(61, bodyTop + 1, 1, 16, CAR_PAL.seam); r(91, bodyTop + 1, 1, 16, CAR_PAL.seam);
    r(53, bodyTop + 4, 5, 2, CAR_PAL.handle); r(83, bodyTop + 4, 5, 2, CAR_PAL.handle);
    r(92, bodyTop - 4, 5, 4, DARK);
    // Đèn trước/sau, lưới tản nhiệt, cản
    r(121, bodyTop + 3, 6, 5, '#fff3b0'); r(125, bodyTop + 4, 2, 3, '#ffffff');
    r(3, bodyTop + 3, 4, 6, '#e74c3c'); r(3, bodyTop + 3, 1, 6, '#ff8a80');
    r(122, bodyTop + 9, 5, 5, '#2b2f33'); r(123, bodyTop + 11, 3, 1, '#5d6368');
    r(0, bodyTop + 13, 9, 6, '#4a4540'); r(120, bodyTop + 13, 10, 6, '#4a4540'); r(120, bodyTop + 13, 10, 1, '#9aa0a6');
    // Bánh xe (có hốc bánh tối)
    for (const cx of [31, 100]) { r(cx - 12, bodyTop + 8, 24, 10, '#26190e'); drawWheel(r, cx, 52, 9); }
    return canvas;
  }

  if (key.startsWith('vehicle_bicycle_rider_')) {
    // Xe đạp xanh lá + người đạp đội nón lá theo ảnh mẫu: đầu to kiểu hoạt hình, áo khoác xanh, bánh vành trắng,
    // giỏ rau phía trước, baga sau chở thùng và gói hàng. Vẽ quay mặt sang phải rồi lật ngang khi hướng trái.
    const isRight = key.endsWith('right');
    const { canvas, r: r0 } = makeSurface(64, 64, !isRight);
    const r: R4 = (x, y, w, h, c) => r0(x, y + 2, w, h, c);
    const G = { main: '#3f9b4a', light: '#6fcb7a', dark: '#2c7336' };
    const J = { main: '#2e8b3e', light: '#4cb25d', dark: '#1f6a2d' };
    const SKIN = '#f1c8a0';
    const PANTS = '#1f4d33';
    r(4, 56, 56, 4, '#26190e40'); r(9, 55, 46, 3, '#26190e25');

    // Bánh xe: lốp đen dày, vành trắng, nan chéo xám, trục
    const wheel = (cx: number, cy: number) => {
      disc(r, cx, cy, 9, DARK);
      disc(r, cx, cy, 7, '#eef1f3');
      disc(r, cx, cy, 6, '#dfe3e6');
      r(cx - 6, cy, 13, 1, '#9aa5ad'); r(cx, cy - 6, 1, 13, '#9aa5ad');
      r(cx - 4, cy - 4, 1, 1, '#9aa5ad'); r(cx + 4, cy - 4, 1, 1, '#9aa5ad'); r(cx - 4, cy + 4, 1, 1, '#9aa5ad'); r(cx + 4, cy + 4, 1, 1, '#9aa5ad');
      disc(r, cx, cy, 2, '#5d6368'); r(cx - 1, cy - 1, 2, 2, '#2c3e50');
    };
    wheel(14, 49);
    wheel(49, 49);

    // Khung: càng sau, ống yên, ống ngang, ống xiên, phuộc xám
    const bar = (x: number, y: number, w: number, h: number) => { r(x, y, w, h, G.main); r(x, y, w, 1, G.light); };
    bar(15, 48, 16, 2);                                         // càng sau ngang
    for (let i = 0; i < 10; i++) bar(15 + i, 47 - i, 2, 2);     // ống nâng yên (seat stay)
    for (let i = 0; i < 8; i++) bar(30 - Math.floor(i * 0.75), 48 - i * 1, 2, 2); // ống yên
    bar(24, 37, 22, 2);                                         // ống ngang
    for (let i = 0; i < 16; i++) bar(46 - i, 38 + Math.floor(i * 0.7), 2, 2);     // ống xiên
    r(46, 33, 3, 6, '#9aa0a6');                                 // cổ phuộc
    for (let i = 0; i < 11; i++) r(47 + Math.floor(i * 0.2), 38 + i, 2, 2, '#8a9199'); // phuộc trước
    r(13, 48, 3, 3, '#5d6368'); r(48, 48, 3, 3, '#5d6368');     // trục bánh
    r(28, 48, 7, 3, '#5d6368'); r(29, 51, 5, 2, '#2c3e50');     // đĩa + bàn đạp
    // Chắn bùn trước nhỏ + đèn pha
    r(44, 41, 10, 2, G.dark);
    r(53, 31, 3, 3, DARK); r(54, 32, 1, 1, '#ffe27a');
    // Yên, ghi-đông
    r(19, 34, 10, 4, DARK); r(20, 34, 8, 2, '#3a342c');
    r(44, 27, 3, 7, '#9aa0a6'); r(41, 26, 12, 3, DARK); r(51, 26, 4, 3, '#2a2a2a');
    // Baga sau: thùng xanh + gói hàng cam
    r(2, 38, 17, 2, '#6b7078');
    r(4, 30, 14, 9, DARK); r(5, 31, 12, 7, G.main); r(5, 31, 12, 2, G.light); r(5, 36, 12, 2, G.dark);
    r(12, 28, 8, 10, DARK); r(13, 29, 6, 8, '#e09a3a'); r(13, 29, 6, 2, '#f0b860'); r(15, 29, 2, 8, '#f4e6c4');
    r(1, 40, 3, 4, '#e74c3c');
    // Giỏ trước đan, có rau
    r(49, 35, 14, 10, DARK); r(50, 36, 12, 8, '#c89b5c'); r(50, 36, 12, 2, '#dcb27a');
    r(50, 40, 12, 1, '#8a5a2f'); r(53, 36, 1, 8, '#a67c45'); r(58, 36, 1, 8, '#a67c45');
    r(50, 31, 7, 5, '#4cae3b'); r(52, 29, 4, 3, '#2e8b57'); r(58, 32, 4, 4, '#d8d78a'); r(50, 32, 3, 3, '#e8a33a');

    // Người đạp: chân → thân → tay → đầu → nón lá
    r(22, 36, 13, 7, DARK); r(23, 37, 11, 5, PANTS);                  // đùi
    r(31, 39, 7, 11, DARK); r(32, 40, 5, 9, PANTS);                   // cẳng chân
    r(29, 48, 11, 5, DARK); r(30, 49, 9, 3, '#8a5a33'); r(30, 49, 9, 1, '#b07a4a');   // giày
    r(20, 18, 16, 19, DARK); r(21, 19, 14, 17, J.main); r(21, 19, 3, 17, J.light); r(31, 19, 4, 17, J.dark);
    r(28, 18, 6, 3, '#f4f4f4');                                       // cổ áo
    r(32, 21, 9, 6, DARK); r(33, 22, 7, 4, J.main);                   // cánh tay
    r(39, 24, 9, 5, DARK); r(40, 25, 7, 3, J.main);                   // cẳng tay
    r(46, 25, 7, 5, DARK); r(47, 26, 5, 3, SKIN);                     // bàn tay trên ghi-đông
    r(24, 5, 15, 14, DARK); r(25, 6, 13, 12, SKIN);                   // đầu
    r(24, 5, 15, 5, '#1a1815'); r(24, 8, 4, 10, '#1a1815');           // tóc đen
    r(33, 10, 3, 4, '#1a1815'); r(34, 11, 1, 1, '#ffffff');           // mắt
    r(31, 14, 4, 2, '#e8907a'); r(36, 15, 3, 1, '#b5594a');           // má hồng + miệng
    // Nón lá: hình chóp rộng, màu kem
    r(31, -1, 4, 1, DARK); r(28, 0, 10, 1, '#d9c581'); r(30, 0, 6, 1, '#f0e2a0');
    r(25, 1, 16, 1, '#e9d792'); r(22, 2, 22, 1, '#f0e2a0'); r(19, 3, 28, 1, '#e9d792');
    r(17, 4, 32, 1, '#d9c581'); r(17, 5, 32, 1, '#b8a463');
    r(34, 6, 2, 3, DARK);                                             // quai nón
    return canvas;
  }

  if (key.startsWith('vehicle_minibus_')) {
    // Xe khách/xe buýt nhỏ dài ~7 m (148 px), cao ~2,6 m + hành lý trên nóc; 4 biến thể cùng bộ khung, cùng tỉ lệ xe tải/ô tô.
    const isRight = key.endsWith('right');
    const parts = key.split('_');
    let variant = 0;
    if (parts.length >= 4) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) variant = ((parsed % 4) + 4) % 4;
    }
    const W = 148;
    const DY = 8;
    const { canvas, r: raw } = makeSurface(W, 70, !isRight);
    const R = (x: number, y: number, w: number, h: number, c: string) => raw(x, y + DY, w, h, c);
    const GLASS = '#8ec6e6';
    const GLASS_HI = '#d6eefb';
    const SKIN = '#f1c8a0';

    R(4, 56, W - 8, 5, '#26190e40'); R(10, 55, W - 20, 4, '#26190e25');   // bóng đổ
    R(3, 43, W - 6, 5, DARK); R(4, 44, W - 8, 1, '#4a4540');            // khung gầm

    // Kính chắn gió xiên + tài xế (dx dịch kính về phía sau với xe có mũi dài)
    const windshield = (dx: number) => {
      const x0 = 125 + dx;
      const w = 17;
      R(x0 - 1, 12, w + 2, 20, DARK);
      R(x0, 13, w, 18, GLASS);
      R(x0, 28, w, 3, '#5a8fb0');                          // taplo
      R(x0 + 2, 14, 3, 2, GLASS_HI); R(x0 + 6, 14, 2, 1, GLASS_HI);
      R(x0 + 1, 27, 10, 1, DARK);                          // cần gạt nước
      R(x0 + 5, 19, 5, 5, SKIN); R(x0 + 4, 18, 7, 2, '#2a1c14'); R(x0 + 5, 24, 6, 4, '#2c3e50');   // tài xế
    };
    const wheelWell = (cx: number) => { R(cx - 11, 38, 22, 8, '#26190e'); drawWheel(raw, cx, 49 + DY, 8); };

    if (variant === 0) {
      // Xe khách 16 chỗ kiểu Solati/Transit: trắng, dải xanh biển, cửa lùa giữa thân
      R(2, 9, 144, 38, DARK); R(3, 10, 142, 36, '#f4f6f7'); R(3, 10, 142, 2, '#ffffff');
      R(3, 36, 142, 9, '#2e6da4'); R(3, 35, 142, 1, '#5a95c8'); R(3, 41, 142, 4, '#1f4d78');
      R(8, 15, 112, 15, DARK); R(9, 16, 110, 13, '#5a8fb0');
      for (let x = 9; x < 119; x += 22) R(x, 16, 3, 13, '#f4f6f7');
      for (let x = 14; x < 118; x += 22) { R(x, 17, 5, 2, '#b9dcf0'); R(x + 9, 19, 3, 2, '#b9dcf0'); }
      R(66, 13, 24, 32, DARK); R(67, 14, 22, 30, '#e4e9ec'); R(67, 16, 10, 13, '#5a8fb0'); R(78, 16, 10, 13, '#5a8fb0'); R(77, 14, 1, 30, '#9aa5ad'); R(84, 31, 3, 2, '#7f8c8d');
      R(56, 5, 20, 5, DARK); R(57, 6, 18, 3, '#bdc3c7');     // quạt thông gió nóc
      windshield(0);
      R(137, 22, 3, 7, DARK); R(138, 21, 4, 2, DARK);        // gương
    } else if (variant === 1) {
      // Xe buýt thành phố xanh lá: dải vàng, cửa đôi, bảng điện tử, dàn lạnh nóc
      R(2, 9, 144, 38, DARK); R(3, 10, 142, 36, '#4cae3b'); R(3, 10, 142, 3, '#6fd45c');
      R(3, 34, 142, 10, '#3a8a2c');
      R(3, 31, 112, 3, '#f4d03f'); R(24, 34, 70, 3, '#f4d03f'); R(50, 37, 30, 3, '#f4d03f');
      R(8, 15, 50, 15, DARK); R(9, 16, 48, 13, '#48c9b0');
      R(90, 15, 32, 15, DARK); R(91, 16, 30, 13, '#48c9b0');
      for (const x of [20, 34, 46, 100, 112]) { R(x, 16, 3, 13, '#a2d9ce'); R(x, 16, 1, 13, '#ffffff'); }
      R(62, 13, 26, 32, DARK); R(63, 14, 11, 30, '#2c3e50'); R(76, 14, 11, 30, '#2c3e50');
      R(64, 16, 9, 22, '#a2d9ce'); R(77, 16, 9, 22, '#a2d9ce'); R(65, 17, 1, 18, '#ffffff'); R(78, 17, 1, 18, '#ffffff');
      R(70, 7, 40, 4, DARK); R(71, 5, 38, 3, '#2d7a22'); R(72, 5, 36, 1, '#5ec84c');  // dàn lạnh nóc
      R(126, 3, 16, 7, DARK); R(127, 4, 14, 5, '#1a1815'); for (let i = 0; i < 5; i++) R(129 + i * 2, 6, 1, 2, '#f39c12'); // bảng LED tuyến
      windshield(0);
      R(137, 22, 3, 7, DARK);
    } else if (variant === 2) {
      // Xe buýt trường học vàng: mũi xe dài, 7 ô cửa sổ, viền đen, đèn cảnh báo nóc
      R(2, 9, 112, 38, DARK); R(3, 10, 110, 36, '#f5b81c'); R(3, 10, 110, 2, '#ffd75e');
      R(3, 33, 110, 2, DARK); R(3, 39, 110, 2, DARK);
      for (let i = 0; i < 7; i++) { R(7 + i * 14, 15, 12, 12, DARK); R(8 + i * 14, 16, 10, 10, GLASS); R(9 + i * 14, 17, 3, 2, GLASS_HI); }
      R(104, 12, 10, 32, DARK); R(105, 13, 8, 30, '#d98e04'); R(106, 15, 6, 16, GLASS); R(106, 33, 6, 8, '#d98e04');   // cửa gấp
      R(8, 5, 5, 4, DARK); R(9, 6, 3, 2, '#e74c3c'); R(100, 5, 5, 4, DARK); R(101, 6, 3, 2, '#f1c40f');                // đèn nóc
      // Mũi xe (capô) thấp phía trước
      R(112, 27, 35, 20, DARK); R(113, 28, 33, 18, '#f5b81c'); R(113, 28, 33, 2, '#ffd75e'); R(113, 38, 33, 2, DARK);
      R(143, 31, 4, 11, '#2b2f33'); R(144, 33, 2, 1, '#5d6368'); R(144, 36, 2, 1, '#5d6368'); R(143, 28, 4, 3, '#ffe27a');
      windshield(-14);
      R(100, 21, 3, 7, DARK);
      R(30, 28, 18, 4, DARK); R(32, 29, 14, 2, '#f5b81c');  // vạch chữ
    } else {
      // Xe khách đò màu retro chở hành lý nóc: cam/đỏ/xanh ngọc, rèm cửa, bạt xanh buộc dây cam
      R(2, 9, 144, 38, DARK); R(3, 10, 142, 36, '#e67e22'); R(3, 10, 142, 3, '#f5a05a');
      R(3, 32, 142, 3, '#fdebd0'); R(3, 35, 142, 4, '#c0392b'); R(3, 39, 142, 6, '#1f7a8c'); R(3, 39, 142, 1, '#48a9b8');
      R(8, 15, 112, 15, DARK); R(9, 16, 110, 13, '#7fd6d0');
      for (let x = 9; x < 119; x += 18) { R(x, 16, 3, 13, '#e67e22'); R(x + 3, 16, 15, 3, '#f7dc6f'); }
      for (let x = 14; x < 118; x += 18) R(x, 20, 3, 2, GLASS_HI);
      R(98, 13, 20, 32, DARK); R(99, 14, 18, 30, '#c0392b'); R(100, 16, 7, 14, '#7fd6d0'); R(109, 16, 7, 14, '#7fd6d0'); R(108, 14, 1, 30, DARK);
      // Giá nóc + hành lý
      R(6, 8, 130, 2, DARK);
      R(8, 1, 118, 8, DARK); R(9, 2, 116, 6, '#2e8b57'); R(9, 2, 116, 1, '#52b27a');
      R(12, 7, 2, 2, DARK); R(122, 7, 2, 2, DARK);
      for (const x of [26, 56, 90]) { R(x, 1, 3, 8, '#e67e22'); R(x, 1, 1, 8, '#f5a05a'); }
      R(14, -2, 20, 4, DARK); R(15, -1, 18, 2, '#c89b5c'); R(15, -1, 18, 1, '#dcb27a');
      R(98, -1, 18, 3, DARK); R(99, 0, 16, 1, '#8e44ad');
      windshield(0);
      R(137, 22, 3, 7, DARK);
    }
    // Đèn trước/sau, cản
    R(143, 38, 4, 5, '#fff3b0'); R(145, 39, 2, 2, '#ffffff');
    R(2, 34, 3, 7, '#e74c3c'); R(2, 34, 1, 7, '#ff8a80');
    R(142, 44, 6, 4, '#9aa0a6'); R(142, 44, 6, 1, '#d0d4d8'); R(0, 44, 6, 4, '#4a4540');
    wheelWell(32); wheelWell(114);
    // Phóng 1,3 lần (192×91) để xe khách ~8 m dài hơn hẳn taxi 130×65 (tỉ lệ ~1,5 lần) và cao hơn rõ rệt.
    const BUS_W = 192, BUS_H = 91;
    const scaled = surface(BUS_W, BUS_H);
    scaled.ctx.drawImage(canvas, 0, 0, W, 70, 0, 0, BUS_W, BUS_H);
    return scaled.canvas;
  }

  return null;
}
