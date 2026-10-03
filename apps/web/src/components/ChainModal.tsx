import React, { useMemo, useState } from 'react';
import { MAX_CHAIN_BRANCHES, PRODUCT_MAP, STORE_TYPES } from '@game/data';
import type { BranchSave, ChainState, InventoryItem } from '@game/shared';
import { branchStockUnits, stockTotals, type TransferItem } from '@game/core';
import { EmptyState, PixelButton, PixelDialog, PixelStat, ProductIcon, QuantityStepper, money } from './pixel';

export interface ChainModalProps {
  chain: ChainState;
  /** Kho tổng (kho của tiệm chính). */
  warehouse: InventoryItem[];
  playerMoney: number;
  playerLevel: number;
  day: number;
  onOpenBranch: (storeTypeId: string, name: string) => void | Promise<unknown>;
  onTransfer: (branchId: string, items: TransferItem[]) => boolean | Promise<boolean>;
  onReturn: (branchId: string, items: TransferItem[]) => boolean | Promise<boolean>;
  onClose: () => void;
}

type Direction = 'send' | 'return';

const nameOf = (productId: string) => PRODUCT_MAP[productId]?.name ?? productId;
const typeOf = (id: string) => STORE_TYPES.find((type) => type.id === id);

/** Số ngày còn lại của lô gần hết hạn nhất (undefined nếu không có lô ghi hạn). */
function soonestExpiryDays(item: InventoryItem, day: number): number | undefined {
  const days = (item.lots ?? []).filter((lot) => lot.quantity > 0).map((lot) => lot.expiresOnDay - day);
  return days.length ? Math.min(...days) : undefined;
}

const ExpiryTag: React.FC<{ days?: number }> = ({ days }) => {
  if (days === undefined) return null;
  const label = days <= 0 ? 'Hết hạn hôm nay' : `Còn ${days} ngày`;
  return <span style={{ fontSize: 11, color: days <= 1 ? '#b64c3d' : '#7a6a58' }}>{label}</span>;
};

/** Bảng chọn số lượng chuyển hàng giữa kho tổng và một chi nhánh. */
const TransferPanel: React.FC<{
  branch: BranchSave;
  warehouse: InventoryItem[];
  day: number;
  onTransfer: ChainModalProps['onTransfer'];
  onReturn: ChainModalProps['onReturn'];
}> = ({ branch, warehouse, day, onTransfer, onReturn }) => {
  const type = typeOf(branch.storeType);
  const [direction, setDirection] = useState<Direction>('send');
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const branchUnits = branchStockUnits(branch);
  const capacityLeft = Math.max(0, (type?.stockCapacity ?? 0) - branchUnits);
  const rows = useMemo(() => {
    const source = direction === 'send'
      ? warehouse.filter((item) => item.quantity > 0 && !!type && item.productId in type.baseDailyDemand)
      : branch.stock.filter((item) => item.quantity > 0);
    return [...source].sort((a, b) => nameOf(a.productId).localeCompare(nameOf(b.productId), 'vi'));
  }, [direction, warehouse, branch.stock, type]);

  const picked: TransferItem[] = rows
    .map((item) => ({ productId: item.productId, quantity: Math.min(item.quantity, amounts[item.productId] ?? 0) }))
    .filter((item) => item.quantity > 0);
  const pickedUnits = picked.reduce((total, item) => total + item.quantity, 0);
  const overCapacity = direction === 'send' && pickedUnits > capacityLeft;

  const switchDirection = (next: Direction) => { setDirection(next); setAmounts({}); };
  const submit = async () => {
    if (!picked.length || overCapacity || busy) return;
    setBusy(true);
    try {
      const ok = await (direction === 'send' ? onTransfer(branch.id, picked) : onReturn(branch.id, picked));
      if (ok) setAmounts({});
    } finally { setBusy(false); }
  };

  return (
    <div className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="tablist" aria-label="Hướng chuyển hàng">
        <PixelButton variant={direction === 'send' ? 'teal' : 'paper'} role="tab" aria-selected={direction === 'send'} onClick={() => switchDirection('send')}>Kho tổng → {branch.name}</PixelButton>
        <PixelButton variant={direction === 'return' ? 'teal' : 'paper'} role="tab" aria-selected={direction === 'return'} onClick={() => switchDirection('return')}>{branch.name} → kho tổng</PixelButton>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        {direction === 'send'
          ? `Chỉ chuyển được món ${type?.name ?? 'chi nhánh'} bán. Chuyển tức thời, lấy lô gần hết hạn trước, giữ nguyên hạn dùng và giá vốn. Chỗ trống: ${capacityLeft}/${type?.stockCapacity ?? 0}.`
          : 'Trả hàng về kho tổng tức thời; bị từ chối nếu kho tổng không đủ chỗ.'}
      </p>
      {!rows.length
        ? <EmptyState title={direction === 'send' ? 'Kho tổng không có hàng phù hợp' : 'Chi nhánh đang hết hàng'}>
          {direction === 'send' ? `Nhập thêm đồ ${type?.name ?? ''} bán về kho trước.` : 'Không có gì để trả về.'}
        </EmptyState>
        : <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {rows.map((item) => (
            <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <ProductIcon productId={item.productId} size={28} />
                <span style={{ display: 'grid' }}>
                  <strong>{nameOf(item.productId)} <span className="muted tabular">×{item.quantity}</span></strong>
                  <ExpiryTag days={soonestExpiryDays(item, day)} />
                </span>
              </span>
              <QuantityStepper label={`Số lượng ${nameOf(item.productId)}`} min={0} max={item.quantity}
                value={Math.min(item.quantity, amounts[item.productId] ?? 0)}
                onChange={(value) => setAmounts((current) => ({ ...current, [item.productId]: value }))} />
            </div>
          ))}
        </div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <PixelButton variant="brick" disabled={!picked.length || overCapacity || busy} onClick={submit}>
          {direction === 'send' ? 'Chuyển hàng' : 'Trả về kho'} ({pickedUnits})
        </PixelButton>
        {overCapacity && <span role="alert" style={{ color: '#b64c3d', fontSize: 12 }}>Vượt chỗ trống của chi nhánh ({capacityLeft}).</span>}
      </div>
    </div>
  );
};

const BranchCard: React.FC<{
  branch: BranchSave;
  warehouse: InventoryItem[];
  day: number;
  expanded: boolean;
  onToggle: () => void;
  onTransfer: ChainModalProps['onTransfer'];
  onReturn: ChainModalProps['onReturn'];
}> = ({ branch, warehouse, day, expanded, onToggle, onTransfer, onReturn }) => {
  const type = typeOf(branch.storeType);
  const units = branchStockUnits(branch);
  const value = stockTotals(branch.stock, day).value;
  const last = branch.reports[branch.reports.length - 1];
  const lowStock = branch.stock.length === 0;
  return (
    <div className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong>{branch.name} <span className="muted">({type?.name ?? branch.storeType})</span></strong>
        <span className="muted" style={{ fontSize: 12 }}>Mở ngày {branch.openedDay} · Danh tiếng {Math.round(branch.reputation)}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
        <span>Tồn: <strong className="tabular">{units}/{type?.stockCapacity ?? '?'}</strong> <span className="muted">(vốn {money(value)})</span></span>
        <span>Tổng doanh thu: <strong className="tabular">{money(branch.totalRevenue)}</strong></span>
        <span className="muted">Lương nền: {money(type?.staffWagePerDay ?? 0)}/ngày</span>
      </div>
      {last
        ? <div style={{ fontSize: 13 }}>
          <span className="muted">Ngày {last.day}: </span>
          bán <strong className="tabular">{last.unitsSold}</strong> món, doanh thu <strong className="tabular">{money(last.revenue)}</strong>,
          lãi gộp <strong className="tabular">{money(last.revenue - last.cogs)}</strong>, lương {money(last.wages)}
          {last.spoilageLoss > 0 && <>, hao hụt {money(last.spoilageLoss)}</>}
          {last.stockouts.length > 0 && <div style={{ color: '#b64c3d' }}>Bán hụt (hết hàng): {last.stockouts.map(nameOf).join(', ')}</div>}
        </div>
        : <span className="muted" style={{ fontSize: 13 }}>Chi nhánh chạy nền từ ngày kế tiếp; chưa có báo cáo ngày.</span>}
      {lowStock && <span style={{ color: '#a86b12', fontSize: 13 }}>Kho chi nhánh trống: chuyển hàng từ kho tổng để có hàng bán.</span>}
      <div><PixelButton variant="teal" aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Đóng chuyển hàng' : 'Chuyển hàng'}</PixelButton></div>
      {expanded && <TransferPanel branch={branch} warehouse={warehouse} day={day} onTransfer={onTransfer} onReturn={onReturn} />}
    </div>
  );
};

/** Tổng quan chuỗi chi nhánh: ví chung, kho tổng, từng chi nhánh, mở chi nhánh mới và chuyển/trả hàng. */
export const ChainModal: React.FC<ChainModalProps> = ({ chain, warehouse, playerMoney, playerLevel, day, onOpenBranch, onTransfer, onReturn, onClose }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState(false);
  const warehouseTotals = stockTotals(warehouse, day);
  const dailyWages = chain.branches.reduce((total, branch) => total + (typeOf(branch.storeType)?.staffWagePerDay ?? 0), 0);
  const chainFull = chain.branches.length >= MAX_CHAIN_BRANCHES;

  const reasonFor = (typeId: string): string | undefined => {
    const type = typeOf(typeId);
    if (!type) return 'Loại hình không tồn tại.';
    if (playerLevel < type.unlockLevel) return `Cần cấp ${type.unlockLevel}`;
    if (chainFull) return `Chuỗi tối đa ${MAX_CHAIN_BRANCHES} chi nhánh`;
    if (chain.branches.filter((branch) => branch.storeType === type.id).length >= type.maxBranches) return `${type.name} tối đa ${type.maxBranches}`;
    if (playerMoney < type.openCost) return 'Không đủ tiền';
    return undefined;
  };

  const open = async (typeId: string) => {
    if (opening) return;
    setOpening(true);
    try { await onOpenBranch(typeId, (newNames[typeId] ?? '').trim()); setNewNames((current) => ({ ...current, [typeId]: '' })); }
    finally { setOpening(false); }
  };

  return (
    <PixelDialog icon="warehouse" title="CHUỖI CHI NHÁNH" subtitle="Ví và kho tổng dùng chung. Chi nhánh tự chạy nền mỗi khi sang ngày; hãy chuyển hàng cho chi nhánh để có thứ bán" onClose={onClose}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
          <PixelStat label="Ví chung" value={money(playerMoney)} icon="coin" />
          <PixelStat label="Kho tổng" value={`${warehouseTotals.units} món · ${money(warehouseTotals.value)}`} icon="warehouse" />
          <PixelStat label="Chi nhánh" value={`${chain.branches.length}/${MAX_CHAIN_BRANCHES}`} icon="door" />
          <PixelStat label="Lương nền/ngày" value={money(dailyWages)} icon="person" />
        </div>

        <h3 style={{ margin: '4px 0 0' }}>Chi nhánh của bạn</h3>
        {!chain.branches.length
          ? <EmptyState title="Chưa có chi nhánh">Mở chi nhánh đầu tiên ở mục bên dưới khi đủ cấp và tiền.</EmptyState>
          : chain.branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} warehouse={warehouse} day={day}
              expanded={expandedId === branch.id} onToggle={() => setExpandedId(expandedId === branch.id ? null : branch.id)}
              onTransfer={onTransfer} onReturn={onReturn} />
          ))}

        <h3 style={{ margin: '4px 0 0' }}>Mở chi nhánh mới</h3>
        {STORE_TYPES.map((type) => {
          const reason = reasonFor(type.id);
          return (
            <div key={type.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{type.name}</strong>
                <span className="muted" style={{ fontSize: 12 }}>Cấp {type.unlockLevel} · tối đa {type.maxBranches}</span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                Bán: {Object.keys(type.baseDailyDemand).map(nameOf).join(', ')}. Sức chứa {type.stockCapacity}, lương nền {money(type.staffWagePerDay)}/ngày. Chi nhánh mở bán từ ngày kế tiếp.
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" maxLength={48} placeholder={`Tên chi nhánh (VD: ${type.name} số 1)`} aria-label={`Tên chi nhánh ${type.name}`}
                  value={newNames[type.id] ?? ''} onChange={(event) => setNewNames((current) => ({ ...current, [type.id]: event.target.value }))}
                  style={{ flex: '1 1 160px', minWidth: 0 }} />
                <PixelButton variant="brick" disabled={!!reason || opening} onClick={() => open(type.id)}>Mở {money(type.openCost)}</PixelButton>
                {reason && <span className="muted" style={{ fontSize: 12 }}>{reason}</span>}
              </div>
            </div>
          );
        })}
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Giới hạn hiện tại: chưa có chế độ điều hành trực tiếp chi nhánh, đóng/bán chi nhánh hay bản đồ riêng cho chi nhánh xa. Số liệu cầu/lương là đề xuất tạm, chưa playtest.
        </p>
      </div>
    </PixelDialog>
  );
};
