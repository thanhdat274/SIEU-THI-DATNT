/** Original Nắng Hẻm warehouse pixel art, rendered once and cached by key. */
export function warehouseTexture(key:string):HTMLCanvasElement|null {
 if(!key.startsWith('warehouse_')&&!key.startsWith('fixture_warehouse_'))return null;
 const canvas=document.createElement('canvas');
 canvas.width=key==='warehouse_sign'?128:key==='warehouse_floor'||key==='warehouse_wall'?32:64;
 canvas.height=key==='warehouse_sign'?24:key==='warehouse_floor'||key==='warehouse_wall'?32:48;
 const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;
 const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const ink='#33251D',wood='#936044',light='#C69464',paper='#FFF2D6',teal='#357F72';
 if(key==='warehouse_floor'){r(0,0,32,32,'#C7C4AF');r(0,0,32,1,'#ABAB94');r(0,0,1,32,'#ABAB94');r(1,1,30,1,'#DAD7C1');r(9,22,5,1,'#B4B29F');return canvas;}
 if(key==='warehouse_wall'){r(0,0,32,32,'#D7C9A4');r(1,1,30,8,'#E8DABB');r(29,0,3,32,'#B6A27E');r(0,26,32,6,teal);r(0,26,32,1,'#6F9C86');return canvas;}
 if(key==='warehouse_sign'){
   r(0,0,128,24,ink);r(1,1,126,22,light);r(3,3,122,18,teal);
   const letters:Record<string,string[]>={N:['10001','11001','10101','10011','10001','10001','10001'],H:['10001','10001','10001','11111','10001','10001','10001'],A:['01110','10001','10001','11111','10001','10001','10001'],K:['10001','10010','10100','11000','10100','10010','10001'],O:['01110','10001','10001','10001','10001','10001','01110']};
   [...'NHA KHO'].forEach((l,i)=>letters[l]?.forEach((line,y)=>[...line].forEach((v,x)=>{if(v==='1')r(24+i*12+x*2,7+y*2,2,2,paper);})));r(49,3,2,2,paper);r(51,5,2,1,paper);return canvas;
 }
 const [type,,state='empty']=key.split(':');
 r(3,44,59,3,'#593A2B33');
 if(type==='fixture_warehouse_receiving'){
   r(1,17,62,6,ink);r(2,18,60,3,light);r(5,23,4,23,wood);r(55,23,4,23,wood);r(28,8,19,10,paper);r(30,10,13,1,wood);r(30,13,10,1,wood);
   if(state!=='empty'){r(9,8,15,9,ink);r(10,9,13,7,teal);r(14,10,5,1,paper);}return canvas;
 }
 const cold=type==='fixture_warehouse_cold';
 r(1,1,62,42,ink);r(3,3,58,37,cold?'#BFD2C4':wood);r(6,6,52,32,cold?'#94B6B0':'#593A2B');
 for(const y of [17,31])r(4,y,56,3,cold?paper:light);
 const count=state==='full'?8:state==='low'?2:0;
 for(let i=0;i<count;i++){const x=8+(i%4)*12,y=6+Math.floor(i/4)*14;r(x,y,10,10,cold?'#DBE7D8':light);r(x+4,y,2,10,cold?teal:wood);r(x+1,y+4,3,3,paper);}
 if(cold){r(30,3,2,36,paper);r(26,19,2,7,ink);r(34,19,2,7,ink);r(4,5,1,11,paper);}else{r(3,3,2,37,light);r(59,3,2,37,wood);}
 r(4,43,5,4,ink);r(55,43,5,4,ink);return canvas;
}
