import React, { useMemo } from 'react';
import { isStaffActiveAt } from '@game/core';
import { PRODUCT_MAP } from '@game/data';
import { PixelButton, money } from './pixel';
import { useGameStore } from '../store/useGameStore';
import { sanitizeBuildingTitle, sanitizeBuildingTypeLabel } from './building-name';
import './building-panel.css';

export { sanitizeBuildingTitle, sanitizeBuildingTypeLabel };

export interface BuildingPanelAction {
  label: string;
  onClick: () => void;
}

interface Props {
  title: string;
  typeLabel: string;
  /** Tình trạng: mở/đóng cửa. */
  statusLabel: string;
  isOpen: boolean;
  /** Số khách đang ở trong tòa; undefined = không đếm được. */
  customerCount?: number;
  revenueToday?: number;
  revenue7d?: number;
  lowStockItems?: string[];
  activeStaffCount?: number;
  actions: BuildingPanelAction[];
  onClose: () => void;
  onEnterInside?: () => void;
  canEnter?: boolean;
}

/** Bảng nổi thông tin tòa nhà được chọn trong 3D; F1 + F2 đầy đủ thông tin kinh doanh và nút vào trong. */
export const BuildingPanel: React.FC<Props> = ({
  title,
  typeLabel,
  statusLabel,
  isOpen,
  customerCount: propCustomerCount,
  revenueToday: propRevenueToday,
  revenue7d: propRevenue7d,
  lowStockItems: propLowStockItems,
  activeStaffCount: propActiveStaffCount,
  actions,
  onClose,
  onEnterInside,
  canEnter = true,
}) => {
  const stats = useMemo(() => {
    const vp = typeof window !== 'undefined' ? (window as unknown as { __viewport?: { getSimulation?: () => unknown } }).__viewport : null;
    const sim = (vp?.getSimulation?.() ?? (typeof window !== 'undefined' ? (window as unknown as { __gameDebug?: { simulation?: unknown } }).__gameDebug?.simulation : null)) as {
      getTime: () => { day: number; hour: number; minute: number };
      getCurrentDayRecord?: () => { revenue?: number };
      getDailyRecords?: () => Record<number, { revenue?: number }>;
      getMorningBrief?: () => { lowStockItems?: string[] };
      getStaff?: () => Array<{ id: string; shift?: string }>;
      getCustomers?: () => unknown[];
    } | null;

    let revToday = propRevenueToday;
    let rev7d = propRevenue7d;
    let lowStock = propLowStockItems;
    let activeStaff = propActiveStaffCount;
    let customers = propCustomerCount;

    if (sim && typeof sim.getTime === 'function') {
      const time = sim.getTime();
      const curRec = sim.getCurrentDayRecord?.();
      if (revToday === undefined) {
        revToday = curRec?.revenue ?? 0;
      }
      if (rev7d === undefined) {
        const records = sim.getDailyRecords?.() ?? {};
        let sum = revToday;
        for (let d = Math.max(1, time.day - 6); d < time.day; d++) {
          sum += records[d]?.revenue ?? 0;
        }
        rev7d = sum;
      }
      if (lowStock === undefined) {
        const brief = sim.getMorningBrief?.();
        const lowPids: string[] = brief?.lowStockItems ?? [];
        lowStock = lowPids.map(id => PRODUCT_MAP[id]?.name ?? id);
      }
      if (activeStaff === undefined) {
        const staffList = sim.getStaff?.() ?? [];
        activeStaff = staffList.filter(m => isStaffActiveAt(m as never, undefined, time)).length;
      }
      if (customers === undefined) {
        customers = sim.getCustomers?.()?.length ?? 0;
      }
    } else {
      const store = useGameStore.getState();
      if (revToday === undefined) {
        revToday = store.currentDayRecord?.revenue ?? 0;
      }
      if (rev7d === undefined) {
        const records = store.dailyRecords ?? {};
        let sum = revToday;
        const curDay = store.worldTime?.day ?? 1;
        for (let d = Math.max(1, curDay - 6); d < curDay; d++) {
          sum += records[d]?.revenue ?? 0;
        }
        rev7d = sum;
      }
      if (lowStock === undefined) {
        const lowPids = (store.fixtures ?? [])
          .filter(f => f.assignedProductId && f.currentStock <= 2)
          .map(f => f.assignedProductId!);
        lowStock = Array.from(new Set(lowPids)).map(id => PRODUCT_MAP[id]?.name ?? id);
      }
      if (customers === undefined) {
        customers = store.customers?.length ?? 0;
      }
      if (activeStaff === undefined) {
        activeStaff = 0;
      }
    }

    return {
      revToday: revToday ?? 0,
      rev7d: rev7d ?? 0,
      lowStock: lowStock ?? [],
      activeStaff: activeStaff ?? 0,
      customers: customers ?? 0,
    };
  }, [propRevenueToday, propRevenue7d, propLowStockItems, propActiveStaffCount, propCustomerCount]);

  const handleEnter = () => {
    if (onEnterInside) {
      onEnterInside();
    } else if (typeof window !== 'undefined') {
      const vp = (window as unknown as { __viewport?: { enterBuilding?: (id?: string) => void } }).__viewport;
      vp?.enterBuilding?.();
    }
  };

  const safeTitle = sanitizeBuildingTitle(title);
  const safeTypeLabel = sanitizeBuildingTypeLabel(typeLabel, safeTitle);

  return (
    <aside className="building-panel pixel-panel" role="complementary" aria-label={`Thông tin ${safeTitle}`}>
      <header className="building-panel-head">
        <div>
          <h2>{safeTitle}</h2>
          <p className="muted">{safeTypeLabel}</p>
        </div>
        <PixelButton icon="close" variant="wood" aria-label="Đóng" onClick={onClose} />
      </header>
      <dl className="building-panel-stats">
        <div>
          <dt>Tình trạng</dt>
          <dd className={isOpen ? 'is-open' : 'is-closed'}>{statusLabel}</dd>
        </div>
        <div>
          <dt>Doanh thu hôm nay</dt>
          <dd>{money(stats.revToday)}</dd>
        </div>
        <div>
          <dt>Doanh thu 7 ngày</dt>
          <dd>{money(stats.rev7d)}</dd>
        </div>
        <div>
          <dt>Khách hiện tại</dt>
          <dd>{stats.customers} người</dd>
        </div>
        <div>
          <dt>Nhân viên trực ca</dt>
          <dd>{stats.activeStaff > 0 ? `${stats.activeStaff} người` : 'Chưa có'}</dd>
        </div>
        <div>
          <dt>Tồn kho thấp</dt>
          <dd className={stats.lowStock.length > 0 ? 'is-warning' : ''}>
            {stats.lowStock.length > 0
              ? `${stats.lowStock.length} món (${stats.lowStock.slice(0, 2).join(', ')}${stats.lowStock.length > 2 ? '…' : ''})`
              : 'Đầy đủ'}
          </dd>
        </div>
      </dl>
      <div className="building-panel-actions">
        {canEnter && (
          <PixelButton variant="wood" icon="door" onClick={handleEnter}>
            Vào trong
          </PixelButton>
        )}
        {actions.map(action => (
          <PixelButton key={action.label} onClick={action.onClick}>
            {action.label}
          </PixelButton>
        ))}
      </div>
    </aside>
  );
};
