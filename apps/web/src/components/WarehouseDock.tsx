import React from 'react';
import { InventoryItem, StoreFixture, COLD_WAREHOUSE_CAPACITY, isSalesFixture } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { PixelButton, PixelIcon, ProductSlot, EmptyState } from './pixel';
interface Props {inventory:InventoryItem[]; fixtures:StoreFixture[]; isOpen:boolean; onToggle:()=>void; onAutoRestock:()=>void; onOpenSupplier:()=>void; onLocateWarehouse:()=>void; currentDay:number;}
export const WarehouseDock: React.FC<Props> = ({inventory,fixtures,isOpen,onToggle,onAutoRestock,onOpenSupplier,onLocateWarehouse,currentDay}) => {
  if(!isOpen) return null;
  const items=inventory.filter(i=>i.quantity>0);
  const cold=items.reduce((n,i)=>n+(PRODUCT_MAP[i.productId]?.storageType==='cold'?i.quantity:0),0);
  const restockable=fixtures.filter(f=>isSalesFixture(f) && f.assignedProductId && f.currentStock<Math.min(f.maxCapacity,PRODUCT_MAP[f.assignedProductId]?.shelfCapacity ?? f.maxCapacity) && items.some(i=>i.productId===f.assignedProductId && i.quantity>0));
  const empty=fixtures.filter(f=>isSalesFixture(f) && f.currentStock===0).length;
  return <aside className="warehouse-dock" aria-label="Kho hàng"><header className="dock-heading"><div className="dock-title"><div><PixelIcon name="warehouse"/><h2>Kho sau tiệm</h2></div><PixelButton icon="close" aria-label="Thu gọn kho" onClick={onToggle}/></div><div className="dock-meta"><span>{items.reduce((n,i)=>n+i.quantity,0)} món hàng</span><span>Mát {cold}/{COLD_WAREHOUSE_CAPACITY}</span></div></header>
    <div className="dock-list">{items.length ? items.map(item=><div key={item.productId} className="dock-product"><ProductSlot productId={item.productId}/><div><strong>{PRODUCT_MAP[item.productId]?.name ?? item.productId}</strong><p>{item.lots?.[0] ? `Hạn: còn ${Math.max(0,item.lots[0].expiresOnDay-currentDay)} ngày` : 'Hàng trong kho'}</p></div><span className="dock-count">{item.quantity}</span></div>) : <EmptyState title="Kho đang trống">Đặt hàng từ đại lý để chuẩn bị ngày bán mới.</EmptyState>}</div>
    <footer className="dock-actions"><PixelButton icon="warehouse" onClick={onLocateWarehouse}>Xem nhà kho</PixelButton><p>{empty>0 ? `${empty} kệ đang trống. ` : ''}{restockable.length ? `${restockable.length} kệ có thể châm từ kho.` : 'Chưa có hàng phù hợp để châm các kệ.'}{cold>=COLD_WAREHOUSE_CAPACITY?' Kho mát đã đầy.':''}</p><PixelButton icon="plus" variant="teal" onClick={onAutoRestock} disabled={!restockable.length}>Châm các kệ</PixelButton><PixelButton icon="truck" onClick={onOpenSupplier}>Ghé đại lý</PixelButton></footer>
  </aside>;
};

