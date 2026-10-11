import React, { useState } from 'react';
import { SPECIAL_REQUEST_MAP, PRODUCT_MAP } from '@game/data';
import { absMinute, type SpecialRequestState } from '@game/core';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore';
import { money, PixelButton, PixelIcon, ProductIcon } from './pixel';

interface Props {
  state: SpecialRequestState;
  onFulfill: (instanceId: string) => { success: boolean; reason?: string };
}

/** Chip gọn + bảng nhỏ liệt kê yêu cầu đặc biệt của khách VIP đang chờ; giao hàng bằng một chạm. */
export const SpecialRequestPanel: React.FC<Props> = ({ state, onFulfill }) => {
  const { worldTime, inventory, addToast } = useGameStore(useShallow((s) => ({ worldTime: s.worldTime, inventory: s.inventory, addToast: s.addToast })));
  const [open, setOpen] = useState(false);
  const now = absMinute(worldTime.day, worldTime.hour * 60 + worldTime.minute);
  const active = state.active.filter((r) => r.status === 'active' && r.expiresMinute >= now);
  if (active.length === 0) return null;

  const have = (productId: string) => {
    const inv = inventory.find((i) => i.productId === productId);
    if (!inv) return 0;
    return inv.lots?.length ? inv.lots.filter((l) => l.expiresOnDay > worldTime.day).reduce((n, l) => n + l.quantity, 0) : inv.quantity;
  };
  const soonest = Math.min(...active.map((r) => r.expiresMinute - now));

  return (
    <div className="special-requests" aria-label="Yêu cầu đặc biệt của khách">
      <button type="button" className="special-requests-chip" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <PixelIcon name="star" size={18} />
        <strong>VIP ×{active.length}</strong>
        <span>còn {Math.max(0, soonest)}′</span>
      </button>
      {open && (
        <ul className="special-requests-list">
          {active.map((r) => {
            const def = SPECIAL_REQUEST_MAP[r.defId];
            if (!def) return null;
            const ready = def.requiredItems.every((i) => have(i.productId) >= i.quantity);
            return (
              <li key={r.instanceId} className="special-request-card">
                <header><strong>{def.title}</strong><span>còn {Math.max(0, r.expiresMinute - now)}′</span></header>
                <div className="special-request-items">
                  {def.requiredItems.map((i) => (
                    <span key={i.productId} className={have(i.productId) >= i.quantity ? 'ok' : 'short'} title={PRODUCT_MAP[i.productId]?.name ?? i.productId}>
                      <ProductIcon productId={i.productId} size={24} />×{i.quantity}
                    </span>
                  ))}
                </div>
                <footer>
                  <span>+{money(def.rewardMoney)} · +{def.rewardReputation} uy tín</span>
                  <PixelButton
                    variant="primary"
                    disabled={!ready}
                    onClick={() => {
                      const res = onFulfill(r.instanceId);
                      if (!res.success && res.reason) addToast(res.reason, 'warn');
                    }}
                  >
                    {ready ? 'Giao' : 'Thiếu hàng'}
                  </PixelButton>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
