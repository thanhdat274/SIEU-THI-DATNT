import React, {useState} from 'react';
import {PlayerData, InventoryItem, SupplierOrder, ProductCategory, COLD_WAREHOUSE_CAPACITY} from '@game/shared';
import {ALL_PRODUCTS, PRODUCT_MAP, PRODUCT_CATEGORY_LABELS} from '@game/data';
import {PixelDialog, PixelStat, PixelButton, ProductSlot, QuantityStepper, money} from './pixel';
interface Props {player:PlayerData;pendingOrders:SupplierOrder[];inventory:InventoryItem[];currentDay:number;onOrder:(id:string,n:number)=>void;onClose:()=>void;}
export const SupplierModal:React.FC<Props>=({player,pendingOrders,inventory,currentDay,onOrder,onClose})=>{
  const [quantities,setQuantities]=useState<Record<string,number>>({}),[category,setCategory]=useState<ProductCategory|'all'>('all');
  const coldUsed=inventory.reduce((n,i)=>n+(PRODUCT_MAP[i.productId]?.storageType==='cold'?i.quantity:0),0);
  const coldReserved=pendingOrders.reduce((n,i)=>n+(PRODUCT_MAP[i.productId]?.storageType==='cold'?i.quantity:0),0);
  return <PixelDialog title="Đại lý đầu hẻm" subtitle="Chọn hàng hôm nay · Giao sáng ngày mai" icon="truck" onClose={onClose}>
    <div className="summary-row"><PixelStat label="Tiền vốn hiện có" value={money(player.money)} icon="coin"/><div><strong>Giao ngày {currentDay+1}</strong><p className="muted">Kho mát: {coldUsed+coldReserved}/{COLD_WAREHOUSE_CAPACITY} chỗ, gồm đơn chờ</p></div></div>
    <label className="form-filter">Nhóm hàng<select value={category} onChange={e=>setCategory(e.target.value as ProductCategory|'all')}><option value="all">Tất cả mặt hàng</option>{Object.entries(PRODUCT_CATEGORY_LABELS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    {ALL_PRODUCTS.filter(p=>category==='all'||p.category===category).map(product=>{
      const quantity=quantities[product.id] ?? 1,cost=quantity*product.purchasePrice,locked=product.unlockLevel>player.level;
      const coldFull=product.storageType==='cold' && coldUsed+coldReserved+quantity>COLD_WAREHOUSE_CAPACITY;
      const reason=locked ? `Mở khóa ở cấp ${product.unlockLevel}` : cost>player.money ? `Thiếu ${money(cost-player.money)}` : coldFull ? 'Kho mát không đủ chỗ' : '';
      return <article key={product.id} className={`product-row ${locked?'is-locked':''}`} aria-label={product.name}>
        <ProductSlot productId={product.id}/><div className="product-info"><h3>{product.name}</h3><p>{PRODUCT_CATEGORY_LABELS[product.category]}{product.storageType==='cold'?' · Giữ mát':''}</p><p>Giá sỉ <strong>{money(product.purchasePrice)}</strong> · Tổng <strong>{money(cost)}</strong></p>{reason&&<p className="action-reason">{reason}</p>}</div>
        <div className="product-actions"><QuantityStepper label={`Số lượng ${product.name}`} value={quantity} disabled={locked} onChange={n=>setQuantities(old=>({...old,[product.id]:n}))}/><PixelButton variant="teal" onClick={()=>onOrder(product.id,quantity)} disabled={!!reason} aria-label={`Đặt ${product.name}`}>Đặt hàng</PixelButton></div>
      </article>;
    })}
    <section className="pending-orders"><h3>Đơn hàng đang giao · {pendingOrders.length}</h3>{pendingOrders.length ? pendingOrders.map(order=><div className="pending-item" key={order.id}><strong>{PRODUCT_MAP[order.productId]?.name ?? order.productId} × {order.quantity}</strong><span>Ngày {order.arrivalDay}</span></div>) : <p className="muted">Chưa có đơn hàng đang giao.</p>}</section>
  </PixelDialog>;
};
