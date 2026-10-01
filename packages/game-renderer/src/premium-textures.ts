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
 if(key==='tile_chair'){const {canvas,ctx}=surface(24,32);ctx.fillStyle=C.tealDark;ctx.fillRect(4,0,16,14);ctx.fillRect(2,14,20,9);ctx.fillRect(3,23,3,9);ctx.fillRect(17,23,3,9);ctx.fillStyle=C.teal;ctx.fillRect(6,2,12,10);ctx.fillRect(4,15,16,5);ctx.fillStyle=C.paper;ctx.fillRect(9,3,1,6);ctx.fillRect(14,3,1,6);return canvas;}
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
 const shirt=npc?[C.teal,'#7B5E99','#D48B38'][variant%3]:'#BA3B28';
 const shirtLight=npc?['#4E9B8E','#9B7BB8','#EDB15E'][variant%3]:'#D95A45';
 const shirtDark=npc?['#1E544A','#4C3563','#8C5317'][variant%3]:'#7A1F12';

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
 const [type,productId='none',state='empty']=key.split(':'),cold=type==='fixture_refrigerator',cash=type==='fixture_cashier';
 const {canvas,ctx}=surface(cold?32:64,48),w=canvas.width;
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
 if(cold){
   // Refrigerator: 2.5D metallic mint/steel frame with reflective glass doors
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

 const quantity=state==='full'?9:state==='low'?3:0,product=PRODUCT_MAP[productId],pixels=productPixels(product);
 for(let row=0;row<3;row++){
   for(let col=0;col<(cold?2:5);col++){
     if(row*(cold?2:5)+col>=quantity)continue;
     const x=6+col*(cold?10:10),y=7+row*11;
     for(const p of pixels){
       ctx.fillStyle=p.color;
       ctx.fillRect(x+Math.floor(p.x/2),y+Math.floor(p.y/2),Math.max(1,Math.ceil(p.w/2)),Math.max(1,Math.ceil(p.h/2)));
     }
   }
    // 2.5D Shelf plank with highlight and depth
    const shelfY = 16+row*11;
    if(cold){
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
 r(4,44,6,2,'#1A1009'); r(w-10,44,6,2,'#1A1009'); // Sturdy feet
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

function vehicleTexture(key: string): HTMLCanvasElement | null {
  if (key.startsWith('vehicle_motorbike_parked_')) {
    const v = Number(key.slice(-1));
    const { canvas, ctx } = surface(44, 34);
    const r = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
    };
    const bodyColors = [
      { main: '#c0392b', dark: '#962d22', light: '#e74c3c', cowl: '#f5f5f5' }, // Wave đỏ yếm trắng
      { main: '#1b4f72', dark: '#154360', light: '#2874a6', cowl: '#fcf3cf' }, // Dream xanh đậm, yếm tem kem
      { main: '#f4f6f7', dark: '#bdc3c7', light: '#ffffff', cowl: '#e5e7e9' }, // Lead trắng thanh lịch
    ][v] ?? { main: '#c0392b', dark: '#962d22', light: '#e74c3c', cowl: '#f5f5f5' };

    // Bóng đổ nghiêng chân chống trên vỉa hè
    r(4, 29, 36, 4, '#26190e38');
    r(8, 28, 28, 5, '#26190e20');

    // Bánh xe căm tròn (đường kính 11)
    const drawWheel = (wx: number, wy: number) => {
      r(wx + 3, wy + 0, 5, 11, '#1a1815');
      r(wx + 1, wy + 1, 9, 9, '#1a1815');
      r(wx + 0, wy + 3, 11, 5, '#1a1815');
      r(wx + 2, wy + 2, 7, 7, '#bdc3c7');
      r(wx + 3, wy + 3, 5, 5, '#2c3e50');
      r(wx + 4, wy + 4, 3, 3, '#e5e7eb');
      r(wx + 5, wy + 5, 1, 1, '#1a1815');
    };
    drawWheel(3, 19);  // Bánh sau
    drawWheel(29, 19); // Bánh trước

    // Chân chống nghiêng (tựa vào vỉa hè)
    r(19, 24, 2, 8, '#2c3e50');
    r(18, 30, 3, 2, '#1a1815');

    // Bô xe mạ crom & lốc máy
    r(14, 25, 15, 3, '#e5e7eb');
    r(16, 24, 11, 1, '#ffffff');
    r(10, 26, 6, 2, '#95a5a6');
    r(17, 21, 9, 5, '#7f8c8d');
    r(18, 22, 6, 3, '#bdc3c7');

    // Phuộc trước & dè trước
    r(33, 16, 2, 8, '#bdc3c7');
    r(28, 18, 8, 3, bodyColors.main);
    r(29, 17, 5, 2, bodyColors.light);

    if (v === 2) {
      // Lead scooter: thân liền kín, sàn phẳng và yếm lớn.
      r(11, 16, 19, 7, bodyColors.dark);
      r(13, 14, 18, 8, bodyColors.main);
      r(16, 14, 11, 2, bodyColors.light);
      r(25, 11, 8, 12, bodyColors.cowl);
      r(27, 13, 4, 8, '#ffffff');
      r(14, 22, 14, 3, '#28343a');
      r(8, 12, 18, 4, '#1a1a1a');
      r(9, 11, 16, 4, '#2c3e50');
      r(10, 11, 13, 1, '#4a6572');
      r(6, 13, 4, 2, '#bdc3c7');
    } else {
      // Wave/Dream underbone: yếm trước tách khỏi thân, để lộ sườn và máy.
      r(13, 17, 17, 5, bodyColors.dark);
      r(14, 15, 16, 5, bodyColors.main);
      r(16, 15, 11, 2, bodyColors.light);
      r(25, 12, 7, 10, bodyColors.cowl);
      r(26, 14, 4, 6, v === 1 ? '#fcf3cf' : '#ffffff');
      r(8, 12, 17, 4, '#1a1a1a');
      r(9, 11, 15, 4, '#2c3e50');
      r(10, 11, 13, 1, '#4a6572');
      r(6, 13, 4, 2, '#bdc3c7');
      if (v === 1) {
        r(5, 10, 8, 1, '#bdc3c7');
        r(5, 10, 1, 4, '#7f8c8d');
        r(27, 15, 2, 3, '#f4e6b7');
      }
    }

    // Ghi-đông & đầu xe
    r(30, 8, 3, 5, '#7f8c8d');
    r(29, 7, 5, 2, '#bdc3c7');
    r(28, 7, 2, 2, '#1a1815'); // Tay nắm
    // Gương chiếu hậu
    r(28, 2, 3, 3, '#2c3e50');
    r(29, 3, 1, 1, '#d4efdf');
    r(29, 5, 1, 2, '#7f8c8d');

    // Đèn pha & xi nhan
    r(33, 10, 3, 3, '#f1c40f');
    r(34, 11, 1, 1, '#ffffff');
    r(32, 13, 2, 2, '#f39c12');
    r(7, 14, 2, 2, '#e74c3c'); // Đèn hậu đỏ

    return canvas;
  }

  if (key.startsWith('vehicle_motorbike_rider_')) {
    const isRight = key.endsWith('right');
    const variantMatch = key.match(/_(\d+)_(?:left|right)$/);
    const variant = variantMatch ? Number(variantMatch[1]) % 3 : 0;
    const { canvas, ctx } = surface(48, 44);
    const r = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(isRight ? x : (48 - x - w), y, w, h);
    };

    // Soft 2.5D contact drop shadow underneath on asphalt
    r(4, 40, 40, 4, '#26190e40');
    r(8, 39, 32, 5, '#26190e25');

    // Wheels (diameter 12, rounded corners)
    const drawWheel = (wx: number, wy: number) => {
      r(wx + 3, wy + 0, 6, 12, '#1a1815');
      r(wx + 1, wy + 1, 10, 10, '#1a1815');
      r(wx + 0, wy + 3, 12, 6, '#1a1815');
      r(wx + 3, wy + 1, 6, 1, '#3a342c');
      r(wx + 3, wy + 2, 6, 8, '#bdc3c7');
      r(wx + 2, wy + 3, 8, 6, '#bdc3c7');
      r(wx + 3, wy + 3, 6, 6, '#2c3e50');
      r(wx + 4, wy + 4, 4, 4, '#e5e7eb');
      r(wx + 5, wy + 5, 2, 2, '#1a1815');
    };

    // Bánh sau & Bánh trước
    drawWheel(4, 29);
    drawWheel(32, 29);

    // Phuộc trước mạ crôm nghiêng chéo
    r(37, 26, 2, 10, '#bdc3c7');
    r(36, 22, 2, 8, '#e5e7eb');
    r(35, 18, 2, 6, '#7f8c8d');
    // Dè chắn bùn trước ôm bánh xe
    r(31, 27, 9, 3, '#c0392b');
    r(32, 26, 6, 2, '#e74c3c');

    // Gắp sau & phuộc lò xo sau
    r(11, 33, 14, 3, '#7f8c8d');
    r(14, 26, 3, 8, '#e74c3c');
    r(15, 26, 1, 8, '#bdc3c7');

    // Ống bô xe máy mạ crôm sáng bóng
    r(16, 36, 16, 3, '#e5e7eb');
    r(18, 35, 12, 1, '#ffffff');
    r(10, 36, 7, 2, '#7f8c8d');
    r(8, 35, 3, 2, '#95a5a6');

    // Lốc máy & gác chân
    r(20, 31, 10, 7, '#34495e');
    r(22, 32, 7, 5, '#7f8c8d');
    r(23, 33, 5, 3, '#bdc3c7');
    r(21, 37, 4, 2, '#1a1815');

    const riderBikeColors = [
      { main: '#c0392b', dark: '#962d22', light: '#e74c3c', cowl: '#ffffff' }, // Wave đỏ
      { main: '#1b4f72', dark: '#154360', light: '#2874a6', cowl: '#fcf3cf' }, // Dream xanh
      { main: '#f4f6f7', dark: '#bdc3c7', light: '#ffffff', cowl: '#e5e7e9' }, // Lead trắng
    ][variant];
    // Dáng xe số cho Wave/Dream; Lead có thân kín và sàn scooter.
    r(14, 25, 22, 7, riderBikeColors.dark);
    r(15, 24, 20, 7, riderBikeColors.main);
    r(18, 24, 14, 3, riderBikeColors.light);
    if (variant === 2) {
      r(26, 20, 10, 13, riderBikeColors.dark);
      r(28, 20, 8, 12, riderBikeColors.main);
      r(29, 22, 5, 8, riderBikeColors.cowl);
      r(18, 31, 14, 3, '#28343a'); // sàn để chân
    } else {
      r(28, 21, 8, 12, riderBikeColors.dark);
      r(29, 21, 6, 11, riderBikeColors.cowl);
      r(30, 22, 4, 9, variant === 1 ? '#fcf3cf' : '#ffffff');
      r(33, 19, 4, 8, riderBikeColors.main);
      if (variant === 1) r(29, 24, 2, 5, '#f4e6b7'); // Dream cream accent
    }

    // Yên xe da đen dài mềm mại
    r(10, 20, 20, 5, '#1a1a1a');
    r(11, 19, 18, 5, '#2c3e50');
    r(12, 19, 16, 2, '#34495e');
    r(13, 20, 14, 1, '#4a6572');
    r(8, 22, 4, 2, '#bdc3c7'); // Tay dắt sau

    // Ghi-đông, cụm đồng hồ, gương chiếu hậu
    r(34, 14, 3, 6, '#7f8c8d');
    r(32, 13, 6, 3, '#2c3e50');
    r(33, 12, 4, 2, '#bdc3c7');
    r(36, 12, 3, 2, '#1a1815');
    r(31, 7, 3, 3, '#2c3e50');
    r(32, 8, 1, 1, '#d4efdf');
    r(32, 10, 1, 3, '#7f8c8d');

    // Đèn pha trước & xi nhan
    r(37, 18, 3, 4, '#f1c40f');
    r(38, 19, 2, 2, '#ffffff');
    r(36, 22, 2, 2, '#f39c12');
    // Đèn hậu đỏ
    r(9, 23, 2, 3, '#e74c3c');
    r(9, 24, 1, 1, '#ffffff');

    // Vệt đèn pha chiếu sáng mặt đường
    r(40, 16, 6, 8, 'rgba(255, 241, 118, 0.35)');
    r(44, 14, 4, 12, 'rgba(255, 241, 118, 0.18)');

    // ============================================
    // RIDER (Người lái xe máy cân đối, tư thế tự nhiên)
    // ============================================
    // Chân & Giày
    r(14, 22, 9, 6, '#1f618d'); // Đùi
    r(15, 23, 8, 4, '#2980b9');
    r(16, 23, 6, 2, '#5dade2');
    r(21, 26, 5, 8, '#1f618d'); // Cẳng chân
    r(22, 27, 4, 7, '#2980b9');
    r(21, 34, 7, 3, '#2c3e50'); // Giày sneaker
    r(23, 34, 5, 1, '#7f8c8d');
    r(21, 36, 7, 1, '#ecf0f1');

    // Thân áo khoác gió cam thể thao
    r(13, 11, 12, 13, '#ba4a00');
    r(14, 12, 11, 11, '#d35400');
    r(15, 12, 9, 3, '#e67e22');
    r(16, 14, 2, 8, '#ffffff');

    // Cánh tay vươn tới tay lái ghi-đông
    r(19, 13, 12, 4, '#ba4a00');
    r(20, 14, 10, 3, '#d35400');
    r(22, 14, 8, 1, '#e67e22');
    r(29, 14, 6, 4, '#ba4a00');
    r(30, 15, 5, 2, '#d35400');
    // Bàn tay nắm chặt tay lái
    r(34, 13, 3, 3, '#2a180e');
    r(34, 13, 2, 2, '#f0c494');
    r(35, 13, 1, 1, '#fce0bf');

    // Cổ & cằm
    r(20, 10, 4, 3, '#d35400');
    r(21, 9, 3, 2, '#f0c494');

    // Nón 3/4 che kín đầu, có vành, kính và quai cằm.
    r(18, 1, 12, 10, '#252b35');
    r(19, 1, 10, 8, '#9d3028');
    r(20, 2, 8, 5, '#d84b3d');
    r(21, 2, 6, 1, '#f6b6a8');
    r(27, 5, 4, 2, '#a8d1cf');
    r(18, 8, 8, 2, '#252b35');

    // Mặt nghiêng nhìn về trước
    r(24, 5, 5, 5, '#f0c494');
    r(25, 6, 3, 3, '#fce0bf');
    r(27, 5, 2, 2, '#1f1612'); // Mắt
    r(27, 5, 1, 1, '#ffffff'); // Ánh mắt
    r(26, 8, 2, 1, '#e8a08c'); // Má hồng

    // Quai nón bảo hiểm ôm cằm
    r(22, 7, 2, 4, '#1a1a1a');
    r(23, 10, 2, 1, '#bdc3c7');

    return canvas;
  }

  if (key.startsWith('vehicle_car_')) {
    const isRight = key.endsWith('right');
    const { canvas, ctx } = surface(68, 36);
    const r = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(isRight ? x : (68 - x - w), y, w, h);
    };

    // Soft 2.5D drop shadow underneath on asphalt
    r(4, 32, 60, 4, '#26190e40');
    r(8, 31, 52, 5, '#26190e25');

    // 14x14 Car Wheels with alloy hubcaps
    const drawCarWheel = (wx: number, wy: number) => {
      r(wx + 4, wy + 0, 6, 14, '#1a1815');
      r(wx + 2, wy + 1, 10, 12, '#1a1815');
      r(wx + 1, wy + 2, 12, 10, '#1a1815');
      r(wx + 0, wy + 4, 14, 6, '#1a1815');
      // Tire highlight
      r(wx + 4, wy + 1, 6, 1, '#3a342c');
      // Silver rim
      r(wx + 3, wy + 3, 8, 8, '#bdc3c7');
      r(wx + 2, wy + 4, 10, 6, '#bdc3c7');
      // Alloy 5-spoke hub
      r(wx + 4, wy + 4, 6, 6, '#7f8c8d');
      r(wx + 5, wy + 5, 4, 4, '#e5e7eb');
      r(wx + 6, wy + 6, 2, 2, '#1a1815');
    };
    drawCarWheel(8, 21);  // Bánh sau
    drawCarWheel(46, 21); // Bánh trước

    // Chassis & Undercarriage
    r(6, 26, 56, 3, '#1a1815');
    r(22, 27, 24, 2, '#34495e');

    // Car Body - taxi đô thị vàng kem với ca-rô nhận diện.
    // Thân dưới (Lower body)
    r(4, 16, 60, 11, '#5f4b23'); // Outline thân dưới
    r(5, 17, 58, 9, '#e4bd48');  // Vàng taxi thành phố
    r(6, 17, 56, 2, '#f4d975');  // Dải sáng thân xe
    r(4, 21, 60, 2, '#b69235');  // Nẹp sườn

    // Mũi xe & Đuôi xe vát góc khí động học
    r(57, 19, 5, 7, '#e4bd48');  // Đầu mũi xe
    r(61, 20, 2, 5, '#5f4b23');  // Cản trước (bumper)
    r(2, 20, 3, 6, '#5f4b23');   // Cản sau

    // Cabin / Mui xe (Roof & Pillars)
    r(14, 6, 36, 11, '#5f4b23'); // Outline mui
    r(15, 7, 34, 10, '#e4bd48');
    r(16, 7, 32, 2, '#f4d975');  // Nóc xe sáng

    // TAXI rooftop badge (Hộp đèn mào TAXI vàng sáng)
    r(27, 2, 12, 5, '#5f4b23');
    r(28, 3, 10, 3, '#f1c40f');
    r(29, 3, 8, 1, '#fff4c4');   // Đèn mào sáng rực
    r(30, 4, 6, 2, '#1a1815');   // Chữ TAXI

    // Windshield & Windows (Kính chắn gió & cửa sổ có bóng người lái)
    // Kính sau nghiêng
    r(16, 9, 5, 8, '#5f4b23');
    r(17, 10, 4, 6, '#a2d9ce');
    // Kính cửa sau & cửa trước
    r(22, 9, 10, 7, '#d4efdf');
    r(33, 9, 10, 7, '#d4efdf');
    r(32, 8, 2, 8, '#5f4b23');   // Cột B
    // Kính chắn gió trước nghiêng
    r(44, 9, 7, 8, '#a2d9ce');
    r(45, 10, 5, 6, '#ffffff');  // Vệt phản chiếu ánh sáng trên kính chắn gió

    // Bóng người lái xe bên trong cabin
    r(35, 11, 4, 4, '#2c3e50');  // Đầu người lái
    r(36, 13, 2, 2, '#f0c494');  // Mặt người lái
    r(39, 14, 2, 2, '#1a1815');  // Vành vô lăng

    // Tay nắm cửa và dải ca-rô taxi dọc thân.
    r(24, 18, 4, 1, '#f5e8bd');
    r(35, 18, 4, 1, '#f5e8bd');
    r(22, 20, 4, 2, '#f5eed8');
    r(30, 20, 4, 2, '#f5eed8');
    r(38, 20, 4, 2, '#f5eed8');
    r(26, 20, 4, 2, '#493c28');
    r(34, 20, 4, 2, '#493c28');

    // Headlights & Taillights
    // Đèn pha trước chiếu sáng
    r(60, 18, 4, 4, '#f1c40f');
    r(61, 19, 3, 2, '#ffffff');
    r(59, 22, 3, 2, '#f39c12');  // Xi nhan trước
    // Đèn hậu đỏ LED
    r(3, 18, 3, 5, '#c0392b');
    r(3, 19, 2, 2, '#e74c3c');
    r(3, 21, 2, 1, '#f39c12');  // Xi nhan sau

    // Vệt đèn pha ô tô rọi dài trên đường
    r(64, 16, 4, 8, 'rgba(255, 241, 118, 0.40)');

    return canvas;
  }
  return null;
}
