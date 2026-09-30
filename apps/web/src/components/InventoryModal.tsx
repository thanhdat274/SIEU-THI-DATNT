import React,{useState} from 'react';
import {InventoryItem} from '@game/shared';
import {PRODUCT_MAP,PRODUCT_CATEGORY_LABELS} from '@game/data';
import {useGameStore} from '../store/useGameStore';
import {PixelDialog,ProductSlot,PixelStat,PixelButton,EmptyState,money} from './pixel';
export const InventoryModal:React.FC<{inventory:InventoryItem[];currentDay:number;onClose:()=>void}>=({inventory,currentDay,onClose})=>{
 const items=inventory.filter(i=>i.quantity>0),[selected,setSelected]=useState<string|null>(items[0]?.productId??null);
 const item=items.find(i=>i.productId===selected),product=item?PRODUCT_MAP[item.productId]:null;
 const player=useGameStore(s=>s.player);
 return <PixelDialog title="Túi hàng & sổ kho" subtitle="Hàng dự trữ trong nhà kho · dùng chung sổ kho, không phải túi mang riêng" icon="bag" onClose={onClose}>
  <div className="summary-row"><PixelStat label="Hàng trong kho" value={items.reduce((n,i)=>n+i.quantity,0)} icon="warehouse"/><PixelStat label="Vốn tồn kho" value={money(items.reduce((n,i)=>n+(PRODUCT_MAP[i.productId]?.purchasePrice??0)*i.quantity,0))} icon="coin"/><div><strong>Cấp {player.level}</strong><p className="muted">{player.experience}/{player.experienceToNextLevel} XP</p></div></div>
  {items.length?<div className="inventory-grid">{items.map(i=><button type="button" className="inventory-card" key={i.productId} onClick={()=>setSelected(i.productId)} aria-pressed={selected===i.productId}><ProductSlot productId={i.productId} quantity={i.quantity}/><div><h3>{PRODUCT_MAP[i.productId]?.name??i.productId}</h3><p>{PRODUCT_MAP[i.productId]?PRODUCT_CATEGORY_LABELS[PRODUCT_MAP[i.productId].category]:'Mặt hàng khác'}</p><p>{i.lots?.[0] ? `Hạn: còn ${Math.max(0,i.lots[0].expiresOnDay-currentDay)} ngày`:'Trong kho'}</p></div></button>)}</div>:<EmptyState title="Túi hàng đang trống">Nhập hàng ở đại lý để bắt đầu một ngày bán mới.</EmptyState>}
  {product&&item&&<div className="info-card inventory-detail"><h3>{product.name}</h3><p className="muted">{product.description}</p><p>Vốn {money(product.purchasePrice)} · Bán {money(product.baseSellingPrice)} · Lãi mỗi món {money(product.baseSellingPrice-product.purchasePrice)}</p>{item.lots?.[0]&&<p>Hạn gần nhất: ngày {item.lots[0].expiresOnDay}{product.storageType==='cold'?' · Giữ trong kho mát':''}</p>}</div>}
  <PixelButton icon="truck" variant="teal" onClick={useGameStore.getState().openSupplierModal}>Ghé đại lý nhập hàng</PixelButton>
 </PixelDialog>;
};
