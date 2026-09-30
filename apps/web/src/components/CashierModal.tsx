import React from 'react';
import {StoreFixture,PlayerData,WorldTime,SaveGameData} from '@game/shared';
import {PRODUCT_MAP} from '@game/data';
import {PixelDialog,PixelStat,PixelButton,ProductSlot,EmptyState,money} from './pixel';
interface Props {fixture:StoreFixture;player:PlayerData;worldTime:WorldTime;shelves:StoreFixture[];statistics:SaveGameData['statistics'];onCheckout:(id:string)=>void;onToggleStoreStatus:()=>void;onAdvanceDay:()=>void;onClose:()=>void;}
export const CashierModal:React.FC<Props>=({player,worldTime,shelves,statistics,onCheckout,onToggleStoreStatus,onAdvanceDay,onClose})=>{
 const stocked=shelves.filter(s=>s.currentStock>0&&s.assignedProductId&&PRODUCT_MAP[s.assignedProductId]);
 return <PixelDialog title="Sổ bán hàng của Cô Năm" subtitle="Từng món bán đi, từng niềm vui ở lại" icon="book" onClose={onClose}>
  <div className="summary-row"><PixelStat label="Tiền trong hòm" value={money(player.money)} icon="coin"/><PixelStat label="Uy tín trong xóm" value={player.reputation} icon="heart"/><PixelStat label="Cấp cửa tiệm" value={player.level} icon="star"/></div>
  <div className="section-label"><h3>Bán hàng tại quầy</h3><span>{statistics.totalCustomersServed} lượt đã phục vụ</span></div><p className="muted">Doanh thu tích lũy: {money(statistics.totalRevenue)} · XP {player.experience}/{player.experienceToNextLevel}</p>
  {!worldTime.isStoreOpen&&<p className="action-reason">Tiệm đang đóng cửa. Mở cửa để bán hàng.</p>}
  {stocked.length ? stocked.map(s=>{const p=PRODUCT_MAP[s.assignedProductId!];return <div className="product-row" key={s.id}><ProductSlot productId={p.id}/><div className="product-info"><h3>{p.name}</h3><p>Trên kệ còn {s.currentStock} món</p></div><PixelButton variant="teal" disabled={!worldTime.isStoreOpen} onClick={()=>onCheckout(s.id)} aria-label={`Bán ${p.name}`}>Bán {money(p.baseSellingPrice)}</PixelButton></div>;}) : <EmptyState title="Các kệ chưa có hàng">Bày hàng lên kệ trước khi bán tại quầy.</EmptyState>}
  <div className="summary-row"><div><strong>{worldTime.isStoreOpen?'Cửa tiệm đang mở':'Cửa tiệm đang nghỉ'}</strong><p className="muted">Ngày {worldTime.day} · {String(worldTime.hour).padStart(2,'0')}:{String(worldTime.minute).padStart(2,'0')}</p></div><PixelButton icon="door" onClick={onToggleStoreStatus}>{worldTime.isStoreOpen?'Đóng cửa tiệm':'Mở cửa đón khách'}</PixelButton></div>
  <div className="summary-row"><div><strong>Chuẩn bị một ngày mới</strong><p className="muted">Chuyển sang 07:00 sáng hôm sau, nhận đơn hàng đến hạn.</p></div><PixelButton icon="moon" variant="wood" onClick={onAdvanceDay}>Qua ngày mới</PixelButton></div>
 </PixelDialog>;
};
