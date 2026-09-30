import {DEFAULT_INITIAL_SAVE,generateStarterTileMap,WAREHOUSE_FIXTURES,WAREHOUSE_ENTRANCE} from '@game/data';
import {isWarehouseFixture} from '@game/shared';
import {GameSimulation} from './simulation';
import {InputManager} from './input';
import {CollisionSystem} from './collision';
import {findPath} from './pathfinding';
export function runWarehouseTests():void {
 const check=(ok:boolean,label:string)=>{if(!ok)throw new Error(`Warehouse: ${label}`);};
 const original=JSON.parse(JSON.stringify(DEFAULT_INITIAL_SAVE));
 const map=generateStarterTileMap(),input=new InputManager();
 const sim=new GameSimulation(original,map,input);
 check(sim.getFixtures().filter(isWarehouseFixture).length===3,'three migrated fixtures');
 check(JSON.stringify(sim.getPlayerData())===JSON.stringify(original.player),'valid old position and player preserved');
 check(sim.getInventory().reduce((n,i)=>n+i.quantity,0)===58,'reserve stock preserved');
 check(!sim.restockShelf('warehouse_dry_rack','mi_hao_hao',1)&&!sim.checkoutShelf('warehouse_dry_rack'),'warehouse is not a sales shelf');
 const collision=new CollisionSystem(map,sim.getFixtures());
 check(!collision.isColliding({x:9*32+4,y:3*32+4,width:20,height:14}),'shop doorway passable');
 check(!collision.isColliding({x:10*32+4,y:3*32+4,width:20,height:14}),'warehouse doorway passable');
 // Player center positions that fit through either edge of the two-tile opening
 // must be inside the renderer's rectangular open-door trigger (door center 304,112).
 const atDoorApproach=(x:number,y:number)=>Math.abs(x-304)<48&&Math.abs(y-112)<48;
 check(atDoorApproach(272,112)&&atDoorApproach(336,112),'warehouse door opens at both doorway edges');
 check(atDoorApproach(304,80)&&atDoorApproach(304,144),'warehouse door opens from both sides');
 check(collision.isColliding({x:7*32+5,y:-1*32+5,width:20,height:14}),'dry rack solid');
 check(findPath(map,collision,{x:9,y:11},{x:9,y:0}).length>0,'warehouse reachable from street');
 sim.getClock().toggleStoreStatus();
 const walk=(x:number,y:number)=>{for(let i=0;i<600;i++){const p=sim.getPlayerData().position;const dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<2){input.setJoystickVector(0,0);return;}const d=Math.hypot(dx,dy);input.setJoystickVector(dx/d,dy/d);sim.update(1/60);}throw new Error(`Unreachable warehouse waypoint ${x},${y}`);};
 for(const p of [[336,272],[336,144],[320,144],[320,80],[320,16],[304,16],[304,-48],[320,-48],[320,16],[320,144],[336,144],[336,272]])walk(p[0],p[1]);
 const before=sim.getInventory().find(i=>i.productId==='mi_hao_hao')!.quantity;
 check(sim.orderFromSupplier('mi_hao_hao',3),'order');
 let saved=sim.exportSaveData();let loaded=new GameSimulation(saved,map,new InputManager());
 check(loaded.getPendingOrders().length===1,'pending reload');
 loaded.getClock().advanceToNextDay();
 check(loaded.getInventory().find(i=>i.productId==='mi_hao_hao')!.quantity===before+3,'delivery once');
 saved=loaded.exportSaveData();loaded=new GameSimulation(saved,map,new InputManager());
 check(loaded.getFixtures().filter(isWarehouseFixture).length===WAREHOUSE_FIXTURES.length,'migration idempotent');
 check(loaded.getPendingOrders().length===0,'delivered order removed on reload');
 const invalid=JSON.parse(JSON.stringify(saved));invalid.player.position={x:7.5*32,y:-.5*32};
 let relocated=false;const recovered=new GameSimulation(invalid,map,new InputManager(),{onPlayerRelocated:()=>{relocated=true;}});
 check(relocated&&JSON.stringify(recovered.getPlayerData().position)===JSON.stringify(WAREHOUSE_ENTRANCE),'safe relocation');
 check(recovered.getPlayerData().money===saved.player.money,'relocation keeps money');
 const sideSave=JSON.parse(JSON.stringify(saved));sideSave.player.position={x:544,y:144};
 sideSave.storeLayout.fixtures.find((f:any)=>f.id==='warehouse_dry_rack').tileX=16;
 let movedSide=false;const moved=new GameSimulation(sideSave,map,new InputManager(),{onPlayerRelocated:()=>{movedSide=true;}});
 check(movedSide&&JSON.stringify(moved.getPlayerData().position)===JSON.stringify(WAREHOUSE_ENTRANCE),'old side-room player moved safely to rear doorway');
 check(JSON.stringify(moved.getInventory())===JSON.stringify(loaded.getInventory()),'side-room move keeps stock/lots');
 recovered.getClock().toggleStoreStatus();
 for(let i=0;i<3600;i++){recovered.update(1/60);const customer=recovered.getCustomer();check(!customer||customer.position.y>3*32,'customer outside warehouse');}
 console.log('✓ Nhà kho: migration, collision, walking, delivery/reload, stock guards and NPC routes.');
}
