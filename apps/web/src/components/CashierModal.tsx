import React, { useState } from 'react';
import { StoreFixture, PlayerData, WorldTime, SaveGameData, CustomerState } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { summarizeAnnualRevenue, buildDayChannelBreakdown } from '@game/core';
import { PixelDialog, PixelStat, PixelButton, ProductSlot, EmptyState, money } from './pixel';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/useGameStore';
import { StaffModal } from './StaffModal';
import { StaffCandidate, StaffMember, StaffShift } from '@game/shared';
import { RestockJobTarget } from '@game/shared';
import type { CustomerCreditAccount } from '@game/shared';

interface Props {
  fixture: StoreFixture;
  player: PlayerData;
  worldTime: WorldTime;
  shelves: StoreFixture[];
  customers?: CustomerState[];
  statistics: SaveGameData['statistics'];
  onCheckout: (fixtureId?: string, checkoutId?: string, onCredit?: boolean, dineIn?: boolean) => void;
  creditAccounts?: CustomerCreditAccount[];
  creditTerms?: (regularId: string) => { eligible: boolean; limit: number; used: number; available: number };
  canDineIn?: (customer: CustomerState) => boolean;
  onRepayCredit?: (creditId: string) => void;
  onToggleStoreStatus: () => void;
  onAdvanceDay: () => void;
  staff: StaffMember[];
  staffCandidates: StaffCandidate[];
  wageDebt: number;
  onHireStaff: (candidateId: string) => { success: boolean; reason?: string };
  onSetStaffShift: (staffId: string, shift: StaffShift) => boolean;
  onPayWageDebt?: () => void;
  restockTargets?: RestockJobTarget[];
  onAssignRefillJob?: (staffId: string, fixtureId: string) => { success: boolean; reason?: string };
  onClose: () => void;
  initialShowStaff?: boolean;
}

export const CashierModal: React.FC<Props> = ({
  fixture,
  player,
  worldTime,
  customers = [],
  statistics,
  onCheckout,
  creditAccounts = [],
  creditTerms,
  canDineIn,
  onRepayCredit,
  onToggleStoreStatus,
  onAdvanceDay,
  staff,
  staffCandidates,
  wageDebt,
  onHireStaff,
  onSetStaffShift,
  onPayWageDebt,
  restockTargets = [],
  onAssignRefillJob,
  onClose,
  initialShowStaff = false,
}) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'reports' | 'credits'>('checkout');
  const [showStaff, setShowStaff] = useState(initialShowStaff);
  const { dailyRecords = {}, currentDayRecord } = useGameStore(useShallow((s) => ({ dailyRecords: s.dailyRecords, currentDayRecord: s.currentDayRecord })));

  // Mỗi quầy thu ngân có hàng riêng; khách chưa gán quầy (làn cũ) thuộc quầy đang mở.
  const ownLane = (c: { cashierFixtureId?: string }) => !c.cashierFixtureId || c.cashierFixtureId === fixture.id;
  const activeCustomer = customers.find((c) => c.stage === 'checkout' && ownLane(c));
  const queueCount = customers.filter((c) => c.stage === 'to_checkout' && ownLane(c)).length;

  let totalBill = 0;
  let basketItems: { productId: string; name: string; quantity: number; unitPrice: number }[] = [];

  if (activeCustomer) {
    if (activeCustomer.basket && activeCustomer.basket.length > 0) {
      basketItems = activeCustomer.basket.map((item) => {
        const prod = PRODUCT_MAP[item.productId];
        const subtotal = item.quantity * item.unitPrice;
        totalBill += subtotal;
        return {
          productId: item.productId,
          name: prod?.name || item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        };
      });
    } else if (activeCustomer.reservedProductId) {
      const prod = PRODUCT_MAP[activeCustomer.reservedProductId];
      const price = prod?.baseSellingPrice || 0;
      totalBill += price;
      basketItems = [
        {
          productId: activeCustomer.reservedProductId,
          name: prod?.name || activeCustomer.reservedProductId,
          quantity: 1,
          unitPrice: price,
        },
      ];
    }
  }

  // Sorted past days descending
  const todayChannels = currentDayRecord ? buildDayChannelBreakdown(currentDayRecord) : null;
  const pastDays = Object.values(dailyRecords)
    .filter((r) => r.day < worldTime.day || !!r.closedAt)
    .sort((a, b) => b.day - a.day);

  if (showStaff) {
    return <StaffModal
      player={player}
      day={worldTime.day}
      candidates={staffCandidates}
      staff={staff}
      wageDebt={wageDebt}
      onHire={onHireStaff}
      onSetShift={onSetStaffShift}
      onPayWageDebt={onPayWageDebt}
      restockTargets={restockTargets}
      onAssignRefillJob={onAssignRefillJob}
      onClose={() => (initialShowStaff ? onClose() : setShowStaff(false))}
    />;
  }

  // Đợt 14D — Cashier action-first: khi đang bán (tab quầy + có khách), đưa action chính “Thu tiền”
  // vào sticky footer để luôn dễ chạm khi cuộn; không đổi bất kỳ logic thu ngân.
  // UI-AUDIT B05: giữ footer (và nút “Thu tiền” disabled + hint) khi có khách nhưng cửa đóng —
  // trước kia footer ẩn hẳn → mất nút thu tiền, khó hiểu. Không đổi luồng tiền.
  const checkoutFooter = activeTab === 'checkout' && activeCustomer ? (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
      <PixelButton variant="teal" disabled={!worldTime.isStoreOpen} title={!worldTime.isStoreOpen ? 'Cửa đang đóng — mở cửa để thu tiền' : undefined} onClick={() => onCheckout(activeCustomer.targetFixtureId, activeCustomer.checkoutId)} aria-label={`Thu tiền ${money(totalBill)}`}>
        Thu tiền {money(totalBill)}
      </PixelButton>
      {worldTime.isStoreOpen && activeCustomer.regularId && creditTerms?.(activeCustomer.regularId).eligible && (
        <PixelButton
          variant="wood"
          disabled={totalBill > creditTerms(activeCustomer.regularId).available}
          title={totalBill > creditTerms(activeCustomer.regularId).available ? `Vượt hạn mức mua chịu (còn ${money(creditTerms(activeCustomer.regularId).available)})` : undefined}
          onClick={() => onCheckout(activeCustomer.targetFixtureId, activeCustomer.checkoutId, true)}
          aria-label={`Bán chịu ${money(totalBill)}`}
        >
          Bán chịu
        </PixelButton>
      )}
      {worldTime.isStoreOpen && canDineIn?.(activeCustomer) && (
        <PixelButton variant="wood" onClick={() => onCheckout(activeCustomer.targetFixtureId, activeCustomer.checkoutId, false, true)} aria-label="Thanh toán và ăn tại bàn">
          Ăn tại bàn
        </PixelButton>
      )}
      {!worldTime.isStoreOpen && (
        <span className="muted" style={{ fontSize: 11 }}>Cửa đang đóng — mở cửa để thu tiền.</span>
      )}
    </div>
  ) : undefined;

  return (
    <PixelDialog
      title="Sổ bán hàng của Cô Năm"
      subtitle="Từng món bán đi, từng niềm vui ở lại"
      icon="book"
      onClose={onClose}
      footer={checkoutFooter}
    >
      <div className="summary-row">
        <PixelStat label="Tiền trong hòm" value={money(player.money)} icon="coin" />
        <PixelStat label="Uy tín trong xóm" value={player.reputation} icon="heart" />
        <PixelStat label="Cấp cửa tiệm" value={player.level} icon="star" />
      </div>

      <div className="feature-tabs" style={{ display: 'flex', gap: 8, margin: '12px 0 16px 0', borderBottom: '2px solid var(--color-outline-soft)', paddingBottom: 8 }}>
        <PixelButton
          variant={activeTab === 'checkout' ? 'wood' : 'paper'}
          icon="bag"
          onClick={() => setActiveTab('checkout')}
          aria-label="Thu ngân tại quầy"
        >
          Thu ngân tại quầy {queueCount > 0 ? `(${queueCount})` : ''}
        </PixelButton>
        <PixelButton variant={activeTab === 'credits' ? 'wood' : 'paper'} icon="coin" onClick={() => setActiveTab('credits')} aria-label="Sổ mua chịu">
          Sổ mua chịu ({creditAccounts.filter(account => account.status === 'open' || account.status === 'overdue').length})
        </PixelButton>
        <PixelButton
          variant={activeTab === 'reports' ? 'wood' : 'paper'}
          icon="book"
          onClick={() => setActiveTab('reports')}
          aria-label="Báo cáo ngày & giá vốn"
        >
          Báo cáo ngày & Lãi lỗ
        </PixelButton>
        <PixelButton variant="paper" icon="person" onClick={() => setShowStaff(true)} aria-label="Quản lý nhân viên">
          Nhân viên
        </PixelButton>
      </div>

      {activeTab === 'checkout' ? (
        <>
          <div className="section-label">
            <h3>Bán hàng tại quầy</h3>
            <span>{statistics.totalCustomersServed} lượt đã phục vụ</span>
          </div>
          <p className="muted">
            Doanh thu tích lũy: {money(statistics.totalRevenue)} · XP {player.experience}/{player.experienceToNextLevel}
          </p>

          {!worldTime.isStoreOpen && (
            <p className="action-reason">Tiệm đang đóng cửa. Hãy mở cửa để đón khách vào mua sắm.</p>
          )}

          {activeCustomer ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>Khách đang chờ thanh toán</strong>
                {queueCount > 0 && <span className="muted">Còn {queueCount} khách đang đợi xếp hàng</span>}
              </div>

              {basketItems.map((item) => (
                <div className="product-row" key={item.productId}>
                  <ProductSlot productId={item.productId} />
                  <div className="product-info">
                    <h3>{item.name}</h3>
                    <p>
                      Số lượng: {item.quantity} · Đơn giá: {money(item.unitPrice)}
                    </p>
                  </div>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>
                    {money(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: '1px dashed var(--color-panel-dark)',
                }}
              >
                <span className="muted">Tổng hóa đơn: </span>
                <strong style={{ fontSize: 16, color: 'var(--color-text)' }}>{money(totalBill)}</strong>
              </div>
            </div>
          ) : (
            <EmptyState title="Chưa có khách tại quầy">
              {queueCount > 0
                ? `Có ${queueCount} khách đang tới quầy thu ngân.`
                : 'Hiện chưa có khách nào ở quầy. Mở cửa tiệm và bày đủ hàng lên kệ để đón khách.'}
            </EmptyState>
          )}

          <div className="summary-row" style={{ marginTop: 16 }}>
            <div>
              <strong>{worldTime.isStoreOpen ? 'Cửa tiệm đang mở' : 'Cửa tiệm đang nghỉ'}</strong>
              <p className="muted">
                Ngày {worldTime.day} · {String(worldTime.hour).padStart(2, '0')}:
                {String(worldTime.minute).padStart(2, '0')}
              </p>
            </div>
            <PixelButton icon="door" onClick={onToggleStoreStatus}>
              {worldTime.isStoreOpen ? 'Đóng cửa tiệm' : 'Mở cửa đón khách'}
            </PixelButton>
          </div>

          <div className="summary-row">
            <div>
              <strong>Chuẩn bị một ngày mới</strong>
              <p className="muted">Chuyển sang 07:00 sáng hôm sau, nhận đơn hàng đến hạn và chốt sổ ngày.</p>
            </div>
            <PixelButton icon="moon" variant="wood" onClick={onAdvanceDay}>
              Qua ngày mới
            </PixelButton>
          </div>
        </>
      ) : activeTab === 'credits' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-label"><h3>Sổ mua chịu khách quen</h3><span>Hạn mức riêng theo độ thân thiết</span></div>
          {creditAccounts.length === 0 ? <EmptyState title="Chưa có khoản mua chịu">Khách quen từ 40 điểm thân thiết mới đủ điều kiện mua chịu.</EmptyState> : creditAccounts.map(account => (
            <div className="summary-row" key={account.id}>
              <div><strong>{account.id} · {account.status === 'open' ? 'Đang nợ' : account.status === 'overdue' ? 'Quá hạn' : account.status === 'paid' ? 'Đã trả' : 'Nợ xấu'}</strong><p className="muted">Khách quen {account.regularId} · hạn ngày {account.dueDay}</p></div>
              <strong>{money(account.balance || account.amount)}</strong>
              {(account.status === 'open' || account.status === 'overdue') && <PixelButton variant="teal" onClick={() => onRepayCredit?.(account.id)}>Thu nợ</PixelButton>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const annual = summarizeAnnualRevenue(dailyRecords, worldTime.day, currentDayRecord ?? undefined);
            return (
              <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }} aria-label="Doanh thu năm">
                <strong>Doanh thu năm {annual.year}: {money(annual.revenue)}</strong>
                <div className="pixel-progress"><span style={{ width: `${Math.min(100, Math.round(annual.progress * 100))}%` }} /></div>
                <p className="muted cashier-annual-prose" style={{ margin: 0 }}>
                  {annual.taxActive
                    ? `Đang chịu thuế GTGT + TNCN — thuế ước tính: ${money(annual.estimatedTax)} (đã khấu trừ: ${money(annual.taxPaidYear)})`
                    : `Chưa vượt ngưỡng miễn thuế ${money(annual.threshold)}/năm. Vượt ngưỡng sẽ nộp GTGT ${annual.policy.vatRate * 100}% + TNCN ${annual.policy.pitRate * 100}%.`}
                </p>
              </div>
            );
          })()}
          {/* Current day live report */}
          <div className="day-report-panel" style={{ background: 'var(--color-panel)', padding: 12, borderRadius: 4, border: '1px solid var(--color-outline-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Báo cáo hôm nay (Ngày {worldTime.day})</h3>
              <span className="muted">Đang mở sổ</span>
            </div>

            <div className="feature-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
              <PixelStat label="Số khách" value={`${todayChannels?.totalCustomers ?? 0} người`} icon="person" />
              <PixelStat label="Giao dịch" value={`${todayChannels?.totalTransactions ?? 0} lượt`} icon="book" />
              <PixelStat label="Món đã bán" value={`${currentDayRecord?.itemsSold ?? 0} cái`} icon="bag" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--color-panel-dark)', paddingTop: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Doanh thu bán hàng:</span>
                <strong>{money(currentDayRecord?.revenue ?? 0)}</strong>
              </div>
              {todayChannels && todayChannels.stalls.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">· Tiệm (quầy thu ngân) — {todayChannels.shopCustomers} khách</span>
                    <span>{money(todayChannels.shopRevenue)} <span className="muted">(lãi gộp {money(todayChannels.shopGrossProfit)})</span></span>
                  </div>
                  {todayChannels.stalls.map(line => (
                    <div key={line.stallId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">· {line.name} — {line.servings} suất</span>
                      <span>{money(line.revenue)} <span className="muted">(lãi gộp {money(line.grossProfit)}{line.estimated ? ', ước' : ''})</span></span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Giá vốn hàng bán (COGS):</span>
                <span style={{ color: 'var(--color-brick)' }}>- {money(currentDayRecord?.cogs ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-panel-dark)', paddingTop: 4 }}>
                <strong>Lợi nhuận gộp:</strong>
                <strong style={{ color: (currentDayRecord?.grossProfit ?? 0) >= 0 ? 'var(--color-green)' : 'var(--color-brick)' }}>
                  {money(currentDayRecord?.grossProfit ?? 0)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Tổn thất hàng quá hạn:</span>
                <span style={{ color: 'var(--color-brick)' }}>- {money(currentDayRecord?.spoilageCost ?? 0)} ({currentDayRecord?.spoilageCount ?? 0} món)</span>
              </div>
              {(currentDayRecord?.counterfeitLoss ?? 0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Tiền giả nhận nhầm:</span>
                <span style={{ color: 'var(--color-brick)' }}>- {money(currentDayRecord?.counterfeitLoss ?? 0)}</span>
              </div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-outline)', paddingTop: 4, fontWeight: 'bold' }}>
                <span>Lợi nhuận ròng:</span>
                <span style={{ color: (currentDayRecord?.netProfit ?? 0) >= 0 ? 'var(--color-green)' : 'var(--color-brick)', fontSize: 14 }}>
                  {money(currentDayRecord?.netProfit ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTop: '1px dotted var(--color-outline-soft)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span>Tiền mua nhập hàng hôm nay (cashflow):</span>
                <span>{money(currentDayRecord?.purchaseTotal ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Past days history */}
          <div>
            <h3 style={{ margin: '8px 0 6px 0', color: 'var(--color-text)' }}>Lịch sử ngày trước đã chốt</h3>
            {pastDays.length === 0 ? (
              <EmptyState title="Chưa có ngày chốt sổ">
                Khi qua ngày mới lúc 22:00 hoặc bấm nút Qua ngày mới, sổ sách ngày hiện tại sẽ được tự động chốt an toàn và lưu trữ vào lịch sử.
              </EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'min(220px, calc(var(--dialog-avail-h) * 0.45))', overflowY: 'auto' }}>
                {pastDays.map((rec) => { const ch = buildDayChannelBreakdown(rec); return (
                  <div
                    key={rec.day}
                    style={{
                      background: 'var(--color-panel-hover)',
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: '1px solid var(--color-outline-soft)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong>Ngày {rec.day}</strong>
                      <span className="muted" style={{ fontSize: 10 }}>
                        Chốt lúc: {rec.closedAt ? new Date(rec.closedAt).toLocaleTimeString('vi-VN') : 'Đã chốt'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 96px), 1fr))', gap: 4 }}>
                      <div>Doanh thu: <strong>{money(rec.revenue)}</strong></div>
                      <div>Giá vốn: <span style={{ color: 'var(--color-brick)' }}>{money(rec.cogs)}</span></div>
                      <div>Lãi ròng: <strong style={{ color: rec.netProfit >= 0 ? 'var(--color-green)' : 'var(--color-brick)' }}>{money(rec.netProfit)}</strong></div>
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      {ch.totalCustomers} khách · {ch.totalTransactions} giao dịch · {rec.itemsSold} món bán {rec.spoilageCount > 0 ? `· Hỏng ${rec.spoilageCount} món` : ''}
                    </div>
                    {ch.stalls.length > 0 && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                        Tiệm {money(ch.shopRevenue)} · {ch.stalls.map(line => `${line.name} ${money(line.revenue)} (${line.servings} suất)`).join(' · ')}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
          </div>
        </div>
      )}
    </PixelDialog>
  );
};
