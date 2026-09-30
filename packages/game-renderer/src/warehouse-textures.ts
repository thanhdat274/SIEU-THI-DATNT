/** Original Nắng Hẻm warehouse pixel art, rendered once and cached by key. */
export function warehouseTexture(key:string):HTMLCanvasElement|null {
 if(!key.startsWith('warehouse_')&&!key.startsWith('fixture_warehouse_'))return null;
 const canvas=document.createElement('canvas');
 canvas.width=key==='warehouse_sign'?64:key==='warehouse_floor'||key==='warehouse_wall'?32:64;
 canvas.height=key==='warehouse_sign'?20:key==='warehouse_floor'||key==='warehouse_wall'?32:48;
 const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;
 const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const ink='#33251D',wood='#936044',light='#C69464',paper='#FFF2D6',teal='#357F72';
 if(key==='warehouse_floor'){r(0,0,32,32,'#C7C4AF');r(0,0,32,1,'#ABAB94');r(0,0,1,32,'#ABAB94');r(1,1,30,1,'#DAD7C1');r(9,22,5,1,'#B4B29F');return canvas;}
 if(key==='warehouse_wall'){r(0,0,32,32,'#D7C9A4');r(1,1,30,8,'#E8DABB');r(29,0,3,32,'#B6A27E');r(0,26,32,6,teal);r(0,26,32,1,'#6F9C86');return canvas;}
 if(key==='warehouse_sign'){
   r(0,0,64,20,ink);r(1,1,62,18,light);r(3,3,58,14,teal);
   const letters:Record<string,string[]>={
     N:['10001','11001','10101','10011','10001','10001','10001'],
     H:['10001','10001','10001','11111','10001','10001','10001'],
     A:['01110','10001','10001','11111','10001','10001','10001'],
     K:['10001','10010','10100','11000','10100','10010','10001'],
     O:['01110','10001','10001','10001','10001','10001','01110']
   };
   const xOffsets:Record<number,number>={0:10,1:17,2:24,4:35,5:42,6:49};
   [...'NHA KHO'].forEach((l,i)=>{
     const ox=xOffsets[i];
     if(ox!==undefined&&letters[l]){
       letters[l].forEach((line,y)=>[...line].forEach((v,x)=>{if(v==='1')r(ox+x,7+y,1,1,paper);}));
     }
   });
   r(26,5,2,1,paper);r(25,4,2,1,paper);return canvas;
 }
 if(key==='warehouse_door_track'){
   canvas.width=64;canvas.height=6;
   r(0,1,64,4,ink);r(0,2,64,2,'#7A6A58');r(0,2,64,1,'#A89F91');
   for(const bx of [4,20,44,60]){r(bx,0,2,6,ink);r(bx,2,2,2,paper);}
   return canvas;
 }
 if(key==='warehouse_door_left'||key==='warehouse_door_right'){
   canvas.width=32;canvas.height=32;
   const isLeft=key==='warehouse_door_left';
   r(0,0,32,32,ink);
   r(1,1,30,30,wood);
   r(10,1,1,30,'#744A32');r(11,1,1,30,light);
   r(21,1,1,30,'#744A32');r(22,1,1,30,light);
   r(1,1,30,2,light);r(1,29,30,2,'#593A2B');
   for(let i=0;i<26;i++){
     const x=isLeft?3+i:28-i;
     r(x,3+i,3,2,ink);
     r(x,3+i,2,1,light);
   }
   for(const [bx,by] of [[2,2],[26,2],[2,26],[26,26]]){
     r(bx,by,4,4,ink);r(bx+1,by+1,2,2,'#24584F');r(bx+1,by+1,1,1,paper);
   }
   const hx=isLeft?27:3;
   r(hx,12,2,8,ink);r(hx+(isLeft?-1:1),14,1,4,'#24584F');r(hx,13,1,1,paper);
   for(const rx of [6,22]){r(rx,0,3,4,ink);r(rx+1,1,1,2,paper);}
   return canvas;
 }
 const [type,,state='empty']=key.split(':');
 // 2.5D ambient drop shadow
 r(4,43,56,4,'#26190E45');
 r(2,45,60,2,'#26190E20');

 if(type==='fixture_warehouse_receiving'){
   // 2.5D Stardew Valley Rustic Cargo Desk
   r(1,15,62,8,ink);
   r(2,16,60,6,'#8B552F'); // Desktop surface
   r(2,16,60,2,'#D8A572'); // Top edge highlight
   r(2,22,60,2,'#593A2B'); // Desktop underside shadow
   // Desk sturdy wood legs
   r(5,24,6,22,ink); r(6,24,4,22,'#7A4822'); r(6,24,1,22,'#B0774D');
   r(53,24,6,22,ink); r(54,24,4,22,'#7A4822'); r(54,24,1,22,'#B0774D');
   // Clipboard invoice document on desk
   r(27,6,20,12,ink);
   r(28,7,18,10,paper);
   r(30,9,14,1,'#734A29');
   r(30,12,11,1,'#734A29');
   r(30,15,8,1,'#734A29');
   if(state!=='empty'){
     // Delivery cardboard box on desk with parcel tape
     r(8,6,17,11,ink);
     r(9,7,15,9,'#B5804C');
     r(9,7,15,2,'#DEAA73'); // Box top light
     r(15,7,3,9,'#EAD09D'); // Tape
   }
   return canvas;
 }
 const cold=type==='fixture_warehouse_cold';
 // Warehouse Shelving / Walk-in Cold Storage Unit
 r(1,2,62,42,ink);
 r(2,3,60,40,cold?'#85A89E':'#744A32');
 r(2,3,60,2,cold?'#D8F2EA':'#C69464'); // 2.5D Top cap highlight
 r(5,6,54,34,cold?'#2E5249':'#3D2416'); // Recessed dark interior

 for(const y of [17,31]) {
   r(3,y,58,4,cold?'#4C756B':'#593A2B');
   r(3,y,58,1,cold?paper:light); // Shelf highlight
   r(3,y+3,58,1,ink);            // Shelf shadow
 }

 const count=state==='full'?8:state==='low'?2:0;
 for(let i=0;i<count;i++){
   const x=8+(i%4)*13,y=7+Math.floor(i/4)*14;
   // Crates / barrels stored on warehouse rack
   r(x,y,11,10,ink);
   r(x+1,y+1,9,8,cold?'#D0E5DB':'#A87346');
   r(x+1,y+1,9,2,cold?'#EDF8F3':'#D8A572');
   r(x+4,y+1,2,8,cold?teal:'#6E4122');
 }
 if(cold){
   r(31,3,2,38,'#EAF8F4'); // Cold room double door central seal
   r(27,19,2,8,ink); r(27,20,1,6,paper); // Handle left
   r(35,19,2,8,ink); r(35,20,1,6,paper); // Handle right
 }
 r(4,44,6,3,ink);r(54,44,6,3,ink);
 return canvas;
}
