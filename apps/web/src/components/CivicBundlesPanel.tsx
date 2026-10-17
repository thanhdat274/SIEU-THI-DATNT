import React, { useState } from 'react';
import { BUILDING_TYPE_DEFS, CIVIC_DEFS, civicBundleById } from '@game/data';
import { BUNDLE_REASON_MESSAGES, CIVIC_REVEAL_GOALS, donorDisplayName, previewDonationCost, type BundleCardView, type BundleSlotView, type SlotBlockReason } from '@game/core';
import type { InventoryItem } from '@game/shared';
import { PixelButton, ProductIcon, money } from './pixel';

export type DonateArgs = { bundleId: string; slotId: string; productId?: string; quantity?: number; amount?: number };

export interface BundlesProps {
  views: readonly BundleCardView[];
  inventory: readonly InventoryItem[];
  day: number;
  playerMoney: number;
  /** Lô trống có thể xây (để nút "Xây ngay"). */
  buildableParcelIds: readonly string[];
  onDonate: (args: DonateArgs) => Promise<{ success: boolean; reason?: string; completedBundleId?: string } | null | undefined>;
  /** Nhật ký sổ góp (mới nhất trước), ví dụ "Ngày 3 — Xóm góp đủ sổ Công viên". */
  journalLines?: readonly string[];
  /** Có chữ = không được góp TIỀN (hẻm chung: chủ hẻm đặt quyền 'none'); vẫn góp hàng được. */
  cashBlockedReason?: string;
  onBuildOnParcel?: (parcelId: string, buildingTypeId?: string) => void;
  /** playerId → tên hiển thị (không lộ uid/email); mặc định: 'local' = Bạn, còn lại 'Thành viên cũ'. */
  donorNameOf?: (playerId: string) => string;
}

/** Mã lý do (core) → tiếng Việt. */
export const BUNDLE_REASON_TEXT: Readonly<Record<string, string>> = BUNDLE_REASON_MESSAGES;

const BLOCK_TEXT: Record<SlotBlockReason, string> = {
  slot_full: 'Đã đủ',
  no_stock: 'Hết hàng',
  expiring: 'Lô sắp hết hạn',
  no_money: 'Hết tiền',
  bundle_done: 'Đã xong',
};

const typeName = (typeId: string): string => BUILDING_TYPE_DEFS[typeId as keyof typeof BUILDING_TYPE_DEFS]?.name ?? typeId;
/** Điều kiện mục tiêu xóm phố → câu tiếng Việt cho thẻ chưa hiện. */
const goalText = (c: { kind: string; targetValue: number; buildingTypeId?: string }): string =>
  c.kind === 'total_population_at_least' ? `dân số xóm ≥ ${c.targetValue}`
    : c.kind === 'district_qol_at_least' ? `chỉ số sống khu ≥ ${c.targetValue}`
    : `xây ${c.targetValue} ${typeName(c.buildingTypeId ?? '')}`;

export const CivicBundlesPanel: React.FC<BundlesProps> = (rawProps) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const props: BundlesProps = rawProps;
  const { views, buildableParcelIds, onBuildOnParcel, journalLines = [] } = props;
  const donorName = rawProps.donorNameOf ?? ((id: string) => donorDisplayName(id));
  const open = views.find(v => v.id === openId);
  if (open) return <BundleDetail view={open} {...props} onBack={() => setOpenId(null)} />;
  return <div data-bundles-list>
    <p className="muted" style={{ margin: '0 0 8px' }}>Cả xóm góp hàng và quỹ để xây công trình công cộng. Giá trị góp dự kiến khoảng 80% giá xây.</p>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))' }}>
      {views.map(v => {
        const goal = CIVIC_REVEAL_GOALS.find(g => g.id === v.revealGoalId);
        const hidden = v.status === 'hidden';
        return <li key={v.id} className="pixel-panel" style={{ padding: 8, opacity: hidden ? 0.55 : 1, position: 'relative', display: 'grid', gap: 4 }} data-bundle-card={v.id} data-bundle-status={v.status}>
          {v.status === 'collecting' && v.hasDonatable && <span aria-label="Kho có hàng góp được" data-bundle-dot style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: '50%', background: 'var(--brick, #c0392b)' }} />}
          <strong>{hidden ? '🔒 ' : v.status === 'built' ? '🏛 ' : ''}{typeName(v.buildingTypeId)}</strong>
          {hidden && <span className="muted" style={{ fontSize: 12 }}>Mở ở cấp thành phố {v.revealedByCityLevel}{goal ? ` hoặc đạt: ${goalText(goal.condition)}` : ''}</span>}
          {v.status === 'collecting' && <><div aria-hidden style={{ height: 8, background: 'rgba(0,0,0,0.12)' }}><div style={{ width: `${(v.slotsDone / v.slotsTotal) * 100}%`, height: '100%', background: 'var(--teal)' }} /></div><span style={{ fontSize: 12 }}>{v.slotsDone}/{v.slotsTotal} ô</span></>}
          {v.status === 'complete' && <><span style={{ color: 'var(--teal)', fontWeight: 'bold' }}>✓ Hoàn thành</span>
            <PixelButton variant="teal" style={{ minHeight: 44, whiteSpace: 'normal' }} disabled={!onBuildOnParcel || buildableParcelIds.length === 0} onClick={() => onBuildOnParcel?.(buildableParcelIds[0], v.buildingTypeId)}>{buildableParcelIds.length === 0 ? 'Chưa có lô trống' : `Xây ngay (còn ${money(v.remainingCost)})`}</PixelButton></>}
          {v.status === 'built' && <span style={{ color: 'var(--teal)', fontWeight: 'bold' }}>Đã khánh thành{v.completedDay ? ` · góp xong ngày ${v.completedDay}` : ''}</span>}
          {!hidden && <PixelButton variant="wood" style={{ minHeight: 44 }} onClick={() => setOpenId(v.id)}>Chi tiết</PixelButton>}
        </li>;
      })}
    </ul>
    {journalLines.length > 0 && <details style={{ marginTop: 8 }} data-bundle-journal open>
      <summary>Nhật ký sổ góp ({journalLines.length})</summary>
      <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 4, fontSize: 12 }}>{journalLines.map((line, i) => <li key={i}>{line}</li>)}</ul>
    </details>}
  </div>;
};

const BundleDetail: React.FC<BundlesProps & { view: BundleCardView; onBack: () => void }> = ({ cashBlockedReason, view, inventory, day, playerMoney, buildableParcelIds, onDonate, onBuildOnParcel, donorNameOf, onBack }) => {
  const donorName = donorNameOf ?? ((id: string) => donorDisplayName(id));
  const [sheet, setSheet] = useState<BundleSlotView | null>(null);
  const [message, setMessage] = useState('');
  const def = CIVIC_DEFS.find(c => c.buildingTypeId === view.buildingTypeId);
  const liveSlot = sheet ? view.slots.find(s => s.id === sheet.id) ?? null : null;
  return <div data-bundle-detail={view.id}>
    <PixelButton variant="wood" style={{ minHeight: 44 }} onClick={onBack}>← Danh sách sổ</PixelButton>
    <h3 style={{ margin: '8px 0 2px' }}>{typeName(view.buildingTypeId)}</h3>
    {def && <p className="muted" style={{ margin: 0 }}>Chỉ số sống tối đa +{def.qolPoints} · bán kính {def.radiusTiles} ô</p>}
    <p style={{ margin: '6px 0' }} data-bundle-cost>Đã góp <strong>{money(view.donatedValue)}</strong> / giá xây <strong>{money(view.buildCost)}</strong> — còn phải trả <strong>{money(view.remainingCost)}</strong></p>
    {message && <p role="status" style={{ margin: '4px 0', color: 'var(--brick)' }}>{message}</p>}
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
      {view.slots.map(slot => <li key={slot.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }} data-bundle-slot={slot.id}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {slot.kind === 'goods' ? slot.accepted.map(a => <ProductIcon key={a.productId} productId={a.productId} size={28} />) : <span aria-hidden>💰</span>}
          <strong>{slot.label}</strong>
        </div>
        <span>{slot.kind === 'cash' ? `${money(slot.current)} / ${money(slot.target)}` : `${slot.current}/${slot.target}`}</span>
        {slot.kind === 'goods' && <span className="muted" style={{ fontSize: 12 }}>Trong kho: {slot.available} (lô còn hạn ≥ 1 ngày)</span>}
        {(() => { const blocked = slot.kind === 'cash' && !!cashBlockedReason && slot.canDonate; return <PixelButton variant={slot.canDonate && !blocked ? 'teal' : 'paper'} style={{ minHeight: 44, whiteSpace: 'normal' }} disabled={!slot.canDonate || blocked} onClick={() => { setMessage(''); setSheet(slot); }}>{blocked ? cashBlockedReason : slot.canDonate ? 'Góp' : BLOCK_TEXT[slot.blockReason ?? 'slot_full']}</PixelButton>; })()}
      </li>)}
    </ul>
    {view.topDonor && <p className="muted" style={{ margin: '6px 0 0' }}>Góp nhiều nhất: {donorName(view.topDonor.playerId)} ({view.topDonor.percent}%)</p>}
    {view.status === 'complete' && <PixelButton variant="teal" style={{ minHeight: 44, width: '100%', marginTop: 8, whiteSpace: 'normal' }} disabled={!onBuildOnParcel || buildableParcelIds.length === 0} onClick={() => onBuildOnParcel?.(buildableParcelIds[0], view.buildingTypeId)}>{buildableParcelIds.length === 0 ? 'Chưa có lô trống để xây' : `Xây ngay (còn ${money(view.remainingCost)})`}</PixelButton>}
    {liveSlot && <DonateSheet bundleId={view.id} slot={liveSlot} inventory={inventory} day={day} playerMoney={playerMoney} onClose={() => setSheet(null)}
      onSubmit={async (args) => {
        const res = await onDonate(args);
        if (!res) return;
        if (res.success) setSheet(null);
        else setMessage(BUNDLE_REASON_TEXT[res.reason ?? ''] ?? res.reason ?? 'Không góp được.');
      }} />}
  </div>;
};

const DonateSheet: React.FC<{ bundleId: string; slot: BundleSlotView; inventory: readonly InventoryItem[]; day: number; playerMoney: number; onClose: () => void; onSubmit: (args: DonateArgs) => Promise<void> }> = ({ bundleId, slot, inventory, day, playerMoney, onClose, onSubmit }) => {
  const usable = slot.accepted.filter(a => a.eligible > 0);
  const [productId, setProductId] = useState(usable[0]?.productId ?? slot.accepted[0]?.productId ?? '');
  const eligible = slot.accepted.find(a => a.productId === productId)?.eligible ?? 0;
  const maxQty = slot.kind === 'cash' ? Math.min(slot.short, playerMoney) : Math.min(slot.short, eligible);
  const [qty, setQty] = useState(Math.min(slot.kind === 'cash' ? 50_000 : 1, maxQty) || 0);
  const [busy, setBusy] = useState(false);
  const value = slot.kind === 'cash' ? qty : previewDonationCost(inventory, productId, qty, day);
  const clamp = (n: number) => Math.max(0, Math.min(maxQty, Math.floor(n)));
  const submit = async () => {
    if (busy || qty <= 0) return;
    setBusy(true);
    await onSubmit(slot.kind === 'cash' ? { bundleId, slotId: slot.id, amount: qty } : { bundleId, slotId: slot.id, productId, quantity: qty });
    setBusy(false);
  };
  const bundleName = civicBundleById(bundleId)?.buildingTypeId ?? '';
  return <div role="dialog" aria-label={`Góp vào ${slot.label}`} data-donate-sheet style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'var(--paper, #f6ecd2)', borderTop: '3px solid var(--wood, #6b4a2b)', padding: 12, display: 'grid', gap: 8, maxHeight: '70vh', overflowY: 'auto' }}>
    <strong>Góp: {slot.label} · {typeName(bundleName)}</strong>
    {slot.kind === 'goods' && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {slot.accepted.map(a => <PixelButton key={a.productId} variant={a.productId === productId ? 'teal' : 'paper'} disabled={a.eligible <= 0} style={{ minHeight: 44 }} onClick={() => { setProductId(a.productId); setQty(Math.min(qty || 1, slot.short, a.eligible)); }}><ProductIcon productId={a.productId} size={24} /> {a.name} ({a.eligible})</PixelButton>)}
    </div>}
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <PixelButton variant="wood" style={{ minHeight: 44, minWidth: 44 }} aria-label="Giảm" disabled={qty <= 0} onClick={() => setQty(clamp(qty - (slot.kind === 'cash' ? 50_000 : 1)))}>−</PixelButton>
      <strong data-donate-qty style={{ minWidth: 80, textAlign: 'center' }}>{slot.kind === 'cash' ? money(qty) : qty}</strong>
      <PixelButton variant="wood" style={{ minHeight: 44, minWidth: 44 }} aria-label="Tăng" disabled={qty >= maxQty} onClick={() => setQty(clamp(qty + (slot.kind === 'cash' ? 50_000 : 1)))}>+</PixelButton>
      {slot.kind === 'goods' && <PixelButton variant="wood" style={{ minHeight: 44 }} onClick={() => setQty(maxQty)}>Góp tối đa ({maxQty})</PixelButton>}
    </div>
    {slot.kind === 'cash' && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <PixelButton variant="wood" style={{ minHeight: 44 }} onClick={() => setQty(clamp(slot.short * 0.25))}>25%</PixelButton>
      <PixelButton variant="wood" style={{ minHeight: 44 }} onClick={() => setQty(clamp(slot.short * 0.5))}>50%</PixelButton>
      <PixelButton variant="wood" style={{ minHeight: 44 }} onClick={() => setQty(maxQty)}>Phần còn lại</PixelButton>
    </div>}
    <span data-donate-cost>{slot.kind === 'cash' ? `Góp ${money(value)} vào quỹ xây dựng` : `Giá vốn: ${money(value)} — hàng này không bán được nữa`}</span>
    <div style={{ display: 'flex', gap: 8 }}>
      <PixelButton variant="paper" style={{ minHeight: 44, flex: 1 }} onClick={onClose}>Hủy</PixelButton>
      <PixelButton variant="teal" style={{ minHeight: 44, flex: 2 }} disabled={busy || qty <= 0} onClick={submit}>Góp</PixelButton>
    </div>
  </div>;
};
