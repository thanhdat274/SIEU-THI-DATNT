import React from 'react';
import type { FestivalGoalProgressInfo, UpcomingSeasonEvent } from '@game/core';
import type { ActivePartyOrder, InventoryItem } from '@game/shared';
import { PARTY_ORDER_MAP, PRODUCT_MAP } from '@game/data';
import { money, PixelButton, PixelDialog, PixelProgress } from './pixel';

export interface NeighborhoodEventsPayload {
  current: {
    eventId: string;
    name: string;
    blurb: string;
    daysLeft: number;
    demandMultiplier: number;
    preferredCategories: string[];
  } | null;
  upcoming: UpcomingSeasonEvent[];
  seasonalOrders: ActivePartyOrder[];
  festivalGoals: FestivalGoalProgressInfo[];
}

export interface NeighborhoodEventsModalProps {
  events: NeighborhoodEventsPayload;
  inventory: InventoryItem[];
  today: number;
  rushQuote?: (orderId: string) => number;
  onRespondPartyOrder?: (orderId: string, accept: boolean) => void;
  onFulfillPartyOrder?: (orderId: string) => void;
  onRushFulfillPartyOrder?: (orderId: string) => void;
  onClaimFestivalGoal?: (goalId: string) => void;
  onClose: () => void;
}

const checkStock = (orderId: string, inventory: InventoryItem[]) => {
  const def = PARTY_ORDER_MAP[orderId];
  if (!def) return false;
  for (const item of def.items) {
    const inv = inventory.find((i) => i.productId === item.productId);
    const usable = inv?.lots
      ? inv.lots.reduce((sum, l) => sum + l.quantity, 0)
      : (inv?.quantity ?? 0);
    if (usable < item.quantity) return false;
  }
  return true;
};

const expiringSoon = (deadlineDay: number, today: number) => {
  const left = Math.max(0, deadlineDay - today);
  return left <= 1 ? ' ⚠ sắp hết hạn' : '';
};

export const NeighborhoodEventsModal: React.FC<NeighborhoodEventsModalProps> = ({
  events,
  inventory,
  today,
  rushQuote,
  onRespondPartyOrder,
  onFulfillPartyOrder,
  onRushFulfillPartyOrder,
  onClaimFestivalGoal,
  onClose,
}) => {
  return (
    <PixelDialog icon="star" title="Sự kiện xóm phố" subtitle="Lễ hội mùa, đơn tiệc xóm và mục tiêu ngày hội" onClose={onClose}>
      {/* Lễ hội đang diễn ra */}
      <h3 style={{ margin: '0 0 6px 0' }}>Đang diễn ra</h3>
      {events.current ? (
        <div className="pixel-panel" style={{ padding: 10, display: 'grid', gap: 6, borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>🎉 {events.current.name}</strong>
            <span className="badge">Còn {events.current.daysLeft} ngày</span>
          </div>
          <span className="muted" style={{ fontSize: '0.9rem' }}>{events.current.blurb}</span>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Khách ghé {events.current.demandMultiplier >= 1 ? `x${events.current.demandMultiplier.toFixed(1)}` : 'đổi nhịp'} · ưu tiên: {events.current.preferredCategories.join(', ')}
          </span>
        </div>
      ) : (
        <div className="muted" style={{ padding: 8, fontSize: '0.85rem' }}>Hôm nay xóm không có lễ hội. Xem phần sắp tới để chuẩn bị hàng.</div>
      )}

      {/* Lễ hội sắp tới */}
      {events.upcoming.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 6px 0' }}>Sắp tới</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {events.upcoming.slice(0, 4).map((e) => (
              <li key={e.eventId} className="pixel-panel" style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>{e.name}</strong> <span className="muted" style={{ fontSize: '0.8rem' }}>· {e.blurb}</span></span>
                <span className="tabular" style={{ fontSize: '0.85rem' }}>sau {e.daysUntil} ngày</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Đơn tiệc mùa */}
      <h3 style={{ margin: '12px 0 6px 0' }}>Đơn tiệc theo mùa</h3>
      {events.seasonalOrders.length === 0 ? (
        <div className="muted" style={{ padding: 8, fontSize: '0.85rem' }}>Chưa có đơn tiệc mùa nào đang mở. Đơn mùa chỉ xuất hiện đúng dịp lễ.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {events.seasonalOrders.map((ord) => {
            const def = PARTY_ORDER_MAP[ord.orderId];
            if (!def) return null;
            const hasStock = checkStock(ord.orderId, inventory);
            return (
              <div key={ord.orderId} className="pixel-panel" style={{ padding: 10, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{def.title}</strong>
                  <span className="badge">
                    {ord.status === 'pending' ? 'Chờ duyệt' : ord.status === 'accepted' ? `Hạn ${ord.deadlineDay}${expiringSoon(ord.deadlineDay, today)}` : ord.status === 'completed' ? 'Đã giao' : ord.status === 'declined' ? 'Đã từ chối' : 'Quá hạn'}
                  </span>
                </div>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{def.customerName} — {def.description}</span>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.85rem' }}>
                  {def.items.map((it) => {
                    const prod = PRODUCT_MAP[it.productId];
                    const inv = inventory.find((i) => i.productId === it.productId);
                    const cur = inv?.quantity ?? 0;
                    return <li key={it.productId} style={{ color: cur >= it.quantity ? 'inherit' : 'var(--brick)' }}>{prod?.name ?? it.productId}: {cur}/{it.quantity} {cur >= it.quantity ? '✓' : '(thiếu)'}</li>;
                  })}
                </ul>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span className="tabular" style={{ color: 'var(--color-primary)' }}>Thưởng {money(def.reward.money)} · +{def.reward.reputation} Uy tín</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(ord.status === 'pending' || ord.status === 'accepted') && !hasStock && onRushFulfillPartyOrder && rushQuote && (() => {
                      const cost = rushQuote(ord.orderId);
                      return <PixelButton variant="teal" disabled={cost < 0} onClick={() => onRushFulfillPartyOrder(ord.orderId)}>{cost < 0 ? 'Hết nguồn hỏa tốc' : `Nhập hỏa tốc & giao (${money(cost)})`}</PixelButton>;
                    })()}
                    {ord.status === 'pending' && onRespondPartyOrder && (
                      <>
                        <PixelButton variant="teal" onClick={() => onRespondPartyOrder(ord.orderId, true)}>Nhận đơn</PixelButton>
                        <PixelButton variant="paper" onClick={() => onRespondPartyOrder(ord.orderId, false)}>Từ chối</PixelButton>
                      </>
                    )}
                    {ord.status === 'accepted' && onFulfillPartyOrder && (
                      <PixelButton variant="teal" disabled={!hasStock} onClick={() => onFulfillPartyOrder(ord.orderId)}>{hasStock ? 'Giao hàng (FEFO)' : 'Chưa đủ hàng'}</PixelButton>
                    )}
                    {ord.status === 'completed' && <span className="muted">✓ Hoàn tất</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mục tiêu ngày hội */}
      {events.festivalGoals.length > 0 && (
        <>
          <h3 style={{ margin: '12px 0 6px 0' }}>Mục tiêu ngày hội</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {events.festivalGoals.map((f) => (
              <div key={f.goalId} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{f.title}</strong>
                  <span className="tabular" style={{ fontSize: '0.85rem' }}>{f.currentValue.toLocaleString()} / {f.targetValue.toLocaleString()}</span>
                </div>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{f.description} Tính tới ngày {f.lastDay}, nhận đến {f.claimUntilDay}.</span>
                <PixelProgress label={f.title} value={f.currentValue} max={f.targetValue} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tabular" style={{ fontSize: '0.85rem' }}>Thưởng {money(f.rewardMoney)} · +{f.rewardReputation} Uy tín</span>
                  <PixelButton variant="teal" disabled={!f.completed || f.claimed} onClick={() => void onClaimFestivalGoal?.(f.goalId)} style={{ minWidth: 90 }}>
                    {f.claimed ? 'Đã nhận' : f.completed ? 'Nhận thưởng' : 'Chưa xong'}
                  </PixelButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PixelDialog>
  );
};
