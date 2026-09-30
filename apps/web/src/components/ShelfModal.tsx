import React from 'react';
import { StoreFixture, InventoryItem } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { useGameStore } from '../store/useGameStore';
import {PixelDialog,PixelButton,ProductSlot,PixelProgress,EmptyState,money} from './pixel';
interface Props {fixture:StoreFixture;inventory:InventoryItem[];currentDay:number;onRestock:(id:string,p:string,n:number)=>void;onUnstock:(id:string,n:number)=>void;onClose:()=>void;}
export const ShelfModal:React.FC<Props>=({fixture,inventory,currentDay,onRestock,onUnstock,onClose})=>{
 const product=fixture.assignedProductId?PRODUCT_MAP[fixture.assignedProductId]:null;
 const limit=product?Math.min(fixture.maxCapacity,product.shelfCapacity):fixture.maxCapacity;
 const inBag=inventory.find(i=>i.productId===product?.id)?.quantity??0;
 const compatible=inventory.filter(i=>i.quantity>0 && PRODUCT_MAP[i.productId] && (fixture.type==='refrigerator'?PRODUCT_MAP[i.productId].storageType==='cold':PRODUCT_MAP[i.productId].storageType==='ambient'));
 const reason=fixture.currentStock>=limit ? 'Kệ đã đầy.' : inBag<=0 ? 'Trong kho không còn hàng này để bày thêm.' : '';
 return <PixelDialog title={fixture.label} subtitle={fixture.type==='refrigerator'?'Chỉ bày hàng cần giữ lạnh':'Chăm chút từng kệ hàng'} icon={fixture.type==='refrigerator'?'cold':'warehouse'} onClose={onClose}>
  <div className="info-card"><div className="section-label"><strong>Sức chứa kệ</strong><span>{fixture.currentStock}/{limit} món</span></div><PixelProgress label="Hàng trên kệ" value={fixture.currentStock} max={limit}/></div>
  {product ? <div className="info-card"><div className="product-row"><ProductSlot productId={product.id}/><div className="product-info"><h3>{product.name}</h3><p>{product.description}</p><p>Bán {money(product.baseSellingPrice)} · Vốn {money(product.purchasePrice)}</p><p>Trong kho: <strong>{inBag}</strong> món</p>{fixture.stockLots?.[0] && <p>Hạn gần nhất: ngày {fixture.stockLots[0].expiresOnDay} · còn {Math.max(0,fixture.stockLots[0].expiresOnDay-currentDay)} ngày</p>}</div></div>
   {reason && <p className="action-reason">{reason}</p>}<div className="action-grid"><PixelButton variant="teal" icon="plus" disabled={!!reason} onClick={()=>onRestock(fixture.id,product.id,1)}>Bày thêm 1</PixelButton><PixelButton variant="teal" disabled={!!reason} onClick={()=>onRestock(fixture.id,product.id,Math.min(inBag,limit-fixture.currentStock))}>Bày đầy kệ</PixelButton><PixelButton icon="minus" disabled={fixture.currentStock<=0} onClick={()=>onUnstock(fixture.id,1)}>Cất lại 1</PixelButton><PixelButton disabled={fixture.currentStock<=0} onClick={()=>onUnstock(fixture.id,fixture.currentStock)}>Cất hết vào kho</PixelButton></div></div>
   : <><p className="muted">Kệ đang trống. Chọn hàng phù hợp trong kho để bắt đầu bày.</p>{compatible.length ? compatible.map(i=><div className="product-row" key={i.productId}><ProductSlot productId={i.productId}/><div className="product-info"><h3>{PRODUCT_MAP[i.productId].name}</h3><p>Trong kho {i.quantity} · Bán {money(PRODUCT_MAP[i.productId].baseSellingPrice)}</p></div><PixelButton variant="teal" onClick={()=>onRestock(fixture.id,i.productId,Math.min(i.quantity,fixture.maxCapacity,PRODUCT_MAP[i.productId].shelfCapacity))}>Bày lên kệ</PixelButton></div>):<EmptyState title="Chưa có hàng phù hợp">Ghé đại lý để nhập hàng cho {fixture.type==='refrigerator'?'tủ mát':'kệ'}.</EmptyState>}</>}
  <PixelButton icon="truck" onClick={useGameStore.getState().openSupplierModal}>Nhập thêm từ đại lý</PixelButton>
 </PixelDialog>;
};
