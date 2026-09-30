const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
(async()=>{const b=await chromium.launch({headless:true});const results=[];
 for(const mobile of [false,true]){
  const c=await b.newContext({viewport:mobile?{width:667,height:375}:{width:1366,height:768},hasTouch:mobile,reducedMotion:'reduce'});const p=await c.newPage();p.setDefaultTimeout(10000);await p.goto('http://127.0.0.1:5173/');await p.locator('.game-hud').waitFor();
  await p.evaluate(async()=>{const {db,SAVE_STORAGE_KEY}=await import('/src/db.ts');const s=await db.saves.get(SAVE_STORAGE_KEY);s.worldTime.isStoreOpen=false;s.player.position={x:320,y:144};await db.saves.put(s);});await p.reload();await p.locator('.game-hud').waitFor();
  // React's HUD snapshot intentionally does not sync on every movement frame.
  // Read an actual simulation export persisted through the real Save UI.
  const position=async()=>{await p.getByRole('button',{name:'Lưu tiến trình',exact:true}).click();await p.getByRole('button',{name:'Lưu tiến trình ngay',exact:true}).click();await p.getByRole('status').filter({hasText:'Đã lưu tiến trình thành công.'}).waitFor();const pos=await p.evaluate(async()=>{const {db,SAVE_STORAGE_KEY}=await import('/src/db.ts');return (await db.saves.get(SAVE_STORAGE_KEY)).player.position;});await p.keyboard.press('Escape');return pos;};
  const move=async(key,dx,dy,time)=>{if(!mobile){await p.keyboard.down(key);await p.waitForTimeout(time);await p.keyboard.up(key);}else{const r=await p.getByRole('group',{name:'Joystick di chuyển'}).boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+dx*28,r.y+r.height/2+dy*28);await p.waitForTimeout(time);await p.mouse.up();}};
  await move('w',0,-1,1000);await move('a',-1,0,500);
  const inside=await position();console.log({mobile,inside});assert(inside.y<3*32,'real controls enter rear warehouse');
  if(!mobile)await p.keyboard.press('e');else await p.getByRole('button',{name:'Tương tác',exact:true}).click();await p.getByRole('dialog',{name:'Nhà kho sau tiệm',exact:true}).waitFor();await p.keyboard.press('Escape');
  if(!mobile){await move('d',1,0,500);await move('s',0,1,1000);const outside=await position();assert(outside.y>3*32,'keyboard leaves rear warehouse');}
  await p.waitForTimeout(6000);const image1=await p.locator('canvas').screenshot();await p.waitForTimeout(1000);const image2=await p.locator('canvas').screenshot();assert(image1.equals(image2),'reduced-motion canvas stable');
  results.push({mobile,entered:inside,reducedMotionStatic:true});await c.close();
 }
 await fs.writeFile('docs/ui/qa/warehouse-controls.json',JSON.stringify(results,null,2));console.log(results);await b.close();})().catch(e=>{console.error(e);process.exit(1);});

