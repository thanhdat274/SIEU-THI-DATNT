import React,{useState} from 'react';
import {InventoryItem,StoreFixture,SupplierOrder,COLD_WAREHOUSE_CAPACITY,isSalesFixture} from '@game/shared';
import {PRODUCT_MAP} from '@game/data';
import {useGameStore} from '../store/useGameStore';
import {PixelDialog,PixelButton,PixelStat,PixelProgress,ProductSlot,EmptyState} from './pixel';
interface Props {fixture:StoreFixture;inventory:InventoryItem[];fixtures:StoreFixture[];pendingOrders:SupplierOrder[];currentDay:number;onRestock:()=>void;onClose:()=>void;}
export const WarehouseModal:React.FC<Props>=({fixture,inventory,fixtures,pendingOrders,currentDay,onRestock,onClose})=>{
 const [group,setGroup]=useState<'all'|'ambient'|'cold'>(fixture.type==='warehouse_cold'?'cold':fixture.type==='warehouse_dry'?'ambient':'all');
 const items=inventory.filter(i=>i.quantity>0);
 const cold=items.reduce((n,i)=>n+(PRODUCT_MAP[i.productId]?.storageType==='cold'?i.quantity:0),0);
 const reserved=pendingOrders.reduce((n,o)=>n+(PRODUCT_MAP[o.productId]?.storageType==='cold'?o.quantity:0),0);
 const canRestock=fixtures.some(f=>isSalesFixture(f)&&f.assignedProductId&&f.currentStock<Math.min(f.maxCapacity,PRODUCT_MAP[f.assignedProductId]?.shelfCapacity??f.maxCapacity)&&items.some(i=>i.productId===f.assignedProductId));
 return <PixelDialog title="Nhà kho sau tiệm" subtitle="Nhận hàng · Kiểm kê · Chuẩn bị lên kệ" icon="warehouse" onClose={onClose}>
  <div className="summary-row"><PixelStat label="Hàng dự trữ" value={`${items.reduce((n,i)=>n+i.quantity,0)} món`} icon="warehouse"/><div><strong>Kho mát {cold}/{COLD_WAREHOUSE_CAPACITY}</strong><p className="muted">Đơn chờ giữ {reserved} chỗ · Còn {Math.max(0,COLD_WAREHOUSE_CAPACITY-cold-reserved)} chỗ</p></div></div>
  <PixelProgress label="Chỗ kho mát đã dùng và giữ" value={cold+reserved} max={COLD_WAREHOUSE_CAPACITY}/>
  <p className="muted">Hàng dự trữ dùng chung với sổ kho. Bày lên kệ lấy hàng từ đây; cất khỏi kệ trả hàng về kho.</p>
  <label className="form-filter">Khu bảo quản<select value={group} onChange={e=>setGroup(e.target.value as typeof group)}><option value="all">Toàn bộ nhà kho</option><option value="ambient">Giá hàng khô</option><option value="cold">Góc bảo quản lạnh</option></select></label>
  {items.filter(i=>group==='all'||PRODUCT_MAP[i.productId]?.storageType===group).map(i=><div className="product-row" key={i.productId}><ProductSlot productId={i.productId}/><div className="product-info"><h3>{PRODUCT_MAP[i.productId]?.name??i.productId}</h3><p>{PRODUCT_MAP[i.productId]?.storageType==='cold'?'Giữ lạnh':'Hàng khô'} · {i.quantity} món</p>{i.lots?.map(l=><p key={l.expiresOnDay}>Lô {l.quantity} món · Hạn ngày {l.expiresOnDay} · còn {Math.max(0,l.expiresOnDay-currentDay)} ngày</p>)}</div></div>)}
  {!items.some(i=>group==='all'||PRODUCT_MAP[i.productId]?.storageType===group)&&<EmptyState title="Khu kho này đang trống">Ghé đại lý để chuẩn bị hàng cho ngày bán mới.</EmptyState>}
  <section className="pending-orders"><h3>Khu nhận hàng · {pendingOrders.length} đơn đang giao</h3><p className="muted">Đơn đến hạn tự nhập kho khi qua ngày mới. Không cần nhận thêm lần nữa.</p>{pendingOrders.length?pendingOrders.map(o=><div className="pending-item" key={o.id}><strong>{PRODUCT_MAP[o.productId]?.name??o.productId} × {o.quantity}</strong><span>Giao ngày {o.arrivalDay}</span></div>):<p className="muted">Chưa có đơn đang giao.</p>}</section>
  {!canRestock&&<p className="action-reason">Chưa có kệ thiếu hàng phù hợp để châm từ kho. Chọn hàng tại kệ trống để bày món mới.</p>}
  <div className="save-actions"><PixelButton icon="plus" variant="teal" disabled={!canRestock} onClick={onRestock}>Châm các kệ từ kho</PixelButton><PixelButton icon="truck" onClick={useGameStore.getState().openSupplierModal}>Ghé đại lý nhập hàng</PixelButton></div>
 </PixelDialog>;
};
