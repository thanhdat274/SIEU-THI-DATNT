import React,{useState} from 'react';
import {InventoryItem} from '@game/shared';
import {PRODUCT_MAP,PRODUCT_CATEGORY_LABELS} from '@game/data';
import {useGameStore} from '../store/useGameStore';
import {PixelDialog,ProductSlot,PixelStat,PixelButton,EmptyState,money} from './pixel';
export const InventoryModal:React.FC<{inventory:InventoryItem[];currentDay:number;onClose:()=>void}>=({inventory,currentDay,onClose})=>{
 const items=inventory.filter(i=>i.quantity>0),[selected,setSelected]=useState<string|null>(null);
 const player=useGameStore(s=>s.player);
 // Đợt 14C: action chính "Ghé đại lý nhập hàng" chuyển xuống sticky footer (luôn nhìn thấy khi cuộn danh sách),
 // danh sách + chi tiết nằm trong vùng cuộn chính. Giữ nguyên logic hiện tại.
 return <PixelDialog title="Túi hàng & sổ kho" subtitle="Hàng dự trữ trong nhà kho · dùng chung sổ kho" icon="bag" onClose={onClose} footer={<PixelButton icon="truck" variant="teal" onClick={useGameStore.getState().openSupplierModal}>Ghé đại lý nhập hàng</PixelButton>}>
  <div className="summary-row inventory-summary"><PixelStat label="Hàng trong kho" value={items.reduce((n,i)=>n+i.quantity,0)} icon="warehouse"/><PixelStat label="Vốn tồn kho" value={money(items.reduce((n,i)=>n+(PRODUCT_MAP[i.productId]?.purchasePrice??0)*i.quantity,0))} icon="coin"/><div><strong>Cấp {player.level}</strong><p className="muted">{player.experience}/{player.experienceToNextLevel} XP</p></div></div>
  {items.length?<div className="inventory-grid">{items.map(i=>{const p=PRODUCT_MAP[i.productId],open=selected===i.productId,lot=i.lots?.[0];return <React.Fragment key={i.productId}><button type="button" className="inventory-card" onClick={()=>setSelected(open?null:i.productId)} aria-expanded={open} aria-pressed={open}><ProductSlot productId={i.productId} quantity={i.quantity}/><div><h3>{p?.name??i.productId}</h3><p className="inventory-meta">{p?PRODUCT_CATEGORY_LABELS[p.category]:'Mặt hàng khác'}</p><p>{lot?`Hạn: còn ${Math.max(0,lot.expiresOnDay-currentDay)} ngày`:'Trong kho'}</p></div><span className="inventory-chevron" aria-hidden="true">{open?'⌄':'›'}</span></button>{open&&p&&<div className="info-card inventory-detail"><p className="muted">{p.description}</p><p>Vốn {money(p.purchasePrice)} · Bán {money(p.baseSellingPrice)} · Lãi {money(p.baseSellingPrice-p.purchasePrice)}/món</p>{lot&&<p>Hạn gần nhất: ngày {lot.expiresOnDay}{p.storageType==='cold'?' · Giữ trong kho mát':''}</p>}</div>}</React.Fragment>;})}</div>:<EmptyState title="Túi hàng đang trống">Nhập hàng ở đại lý để bắt đầu một ngày bán mới.</EmptyState>}
 </PixelDialog>;
};
