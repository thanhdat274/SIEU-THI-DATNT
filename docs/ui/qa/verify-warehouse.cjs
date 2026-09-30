const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
const assert=(ok,label)=>{if(!ok)throw new Error(label);};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 const open=async()=>{await page.goto('http://127.0.0.1:5173/');await page.locator('.game-hud').waitFor();};
 const state=async()=>page.evaluate(async()=>{const u=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/store/useGameStore.ts'))?.name;const {useGameStore}=await import(u);const s=useGameStore.getState();return {player:s.player,inventory:s.inventory,fixtures:s.fixtures,world:s.worldTime};});
 const seed=async(position,hour=7)=>{await page.evaluate(async({position,hour})=>{const {db,SAVE_STORAGE_KEY}=await import('/src/db.ts');const s=await db.saves.get(SAVE_STORAGE_KEY);s.player.position=position;s.worldTime.hour=hour;s.worldTime.isStoreOpen=false;await db.saves.put(s);},{position,hour});await page.reload();await page.locator('.game-hud').waitFor();};
 await open();await page.getByRole('button',{name:'Đóng cửa tiệm',exact:true}).click();
 const start=await state();await page.getByRole('button',{name:'Xem nhà kho',exact:true}).click();await page.waitForTimeout(500);
 assert(JSON.stringify(start.player.position)===JSON.stringify((await state()).player.position),'locate does not teleport');
 await page.screenshot({path:'docs/ui/qa/warehouse-overview.png'});
 // Place only the isolated test save beside the rack, then exercise real controls.
 await seed({x:256,y:16});await page.keyboard.press('e');await page.getByRole('dialog',{name:'Nhà kho sau tiệm',exact:true}).waitFor();
 const before=await state();await page.keyboard.press('w');assert(JSON.stringify(before.player.position)===JSON.stringify((await state()).player.position),'modal input gate');
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('[role=dialog]')),'focus contained');
 await page.screenshot({path:'docs/ui/qa/warehouse-modal.png'});
 await page.getByRole('button',{name:'Châm các kệ từ kho',exact:true}).click();const stocked=await state();
 const total=s=>s.inventory.find(i=>i.productId==='mi_hao_hao')?.quantity+(s.fixtures.find(f=>f.id==='shelf_wooden_noodles').currentStock);
 assert(total(before)===total(stocked),'restock conserves stock');
 await page.getByRole('button',{name:'Ghé đại lý nhập hàng',exact:true}).click();assert(await page.getByRole('dialog').count()===1,'single dialog');
 const row=page.getByRole('article',{name:'Mì Tôm Hảo Hảo',exact:true});await row.getByRole('spinbutton').fill('3');await row.getByRole('button').last().click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Sổ bán hàng',exact:true}).click();await page.getByRole('button',{name:'Qua ngày mới',exact:true}).click();
 const received=await state();assert(total(received)===total(stocked)+3,'delivery adds exactly three');
 // Arrange a shelf dialog through the same public coordinator used by E,
 // then exercise the real transfer controls (no direct inventory mutation).
 await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/store/useGameStore.ts'))?.name;const {useGameStore}=await import(u);const s=useGameStore.getState();s.openFixtureModal(s.fixtures.find(f=>f.id==='shelf_wooden_noodles'));});
 await page.getByRole('button',{name:'Cất lại 1',exact:true}).click();assert(total(await state())===total(received),'unstock conserves warehouse total');
 await page.getByRole('button',{name:'Bày thêm 1',exact:true}).click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Sổ bán hàng',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Mở cửa đón khách',exact:true}).click();
 const saleBefore=await state();await page.getByRole('button',{name:'Bán Mì Tôm Hảo Hảo',exact:true}).click();const saleAfter=await state();assert(saleAfter.player.money-saleBefore.player.money===4500&&saleAfter.player.experience-saleBefore.player.experience===5,'sale money and XP');
 await page.getByRole('dialog').getByRole('button',{name:'Đóng cửa tiệm',exact:true}).click();await page.keyboard.press('Escape');
 await page.keyboard.press('e');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Lưu tiến trình',exact:true}).click();await page.getByRole('button',{name:'Lưu tiến trình ngay',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu tiến trình thành công.'}).waitFor();await page.reload();await page.locator('.game-hud').waitFor();assert(total(await state())===total(received)-1,'reload stock after sale');
 const metrics=[];
 for(const v of [{width:1920,height:1080},{width:1366,height:768},{width:1024,height:768},{width:844,height:390},{width:667,height:375}]){await page.setViewportSize(v);await page.getByRole('button',{name:'Định vị nhà kho',exact:true}).click();await page.waitForTimeout(350);await page.screenshot({path:`docs/ui/qa/warehouse-${v.width}.png`});await page.keyboard.press('e');await page.getByRole('dialog').waitFor();await page.screenshot({path:`docs/ui/qa/warehouse-panel-${v.width}.png`});metrics.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,dialogFits:document.querySelector('[role=dialog]').getBoundingClientRect().bottom<=innerHeight})));await page.keyboard.press('Escape');}
 await page.setViewportSize({width:1366,height:768});await seed({x:256,y:16},20);await page.screenshot({path:'docs/ui/qa/warehouse-night.png'});
 await context.close();
 const reduced=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:2,reducedMotion:'reduce'});const p=await reduced.newPage();await p.goto('http://127.0.0.1:5173/');await p.locator('.game-hud').waitFor();await p.getByRole('button',{name:'Định vị nhà kho'}).click();await p.waitForTimeout(500);await p.screenshot({path:'docs/ui/qa/warehouse-dpr2-reduced.png'});
 await fs.writeFile('docs/ui/qa/warehouse-metrics.json',JSON.stringify({functional:'pass',metrics},null,2));console.log(metrics);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
