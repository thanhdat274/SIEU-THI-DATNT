import React, { useState } from 'react';
import { StoreFixture, PlayerData, WorldTime, SaveGameData, CustomerState } from '@game/shared';
import { PRODUCT_MAP } from '@game/data';
import { summarizeAnnualRevenue } from '@game/core';
import { PixelDialog, PixelStat, PixelButton, ProductSlot, EmptyState, money } from './pixel';
import { useGameStore } from '../store/useGameStore';
import { StaffModal } from './StaffModal';
import { StaffCandidate, StaffMember, StaffShift } from '@game/shared';
import { RestockJobTarget } from '@game/shared';

interface Props {
  fixture: StoreFixture;
  player: PlayerData;
  worldTime: WorldTime;
  shelves: StoreFixture[];
  customers?: CustomerState[];
  statistics: SaveGameData['statistics'];
  onCheckout: (fixtureId?: string) => void;
  onToggleStoreStatus: () => void;
  onAdvanceDay: () => void;
  staff: StaffMember[];
  staffCandidates: StaffCandidate[];
  wageDebt: number;
  onHireStaff: (candidateId: string) => { success: boolean; reason?: string };
  onSetStaffShift: (staffId: string, shift: StaffShift) => boolean;
  restockTargets?: RestockJobTarget[];
  onAssignRefillJob?: (staffId: string, fixtureId: string) => { success: boolean; reason?: string };
  onClose: () => void;
  initialShowStaff?: boolean;
}

export const CashierModal: React.FC<Props> = ({
  player,
  worldTime,
  customers = [],
  statistics,
  onCheckout,
  onToggleStoreStatus,
  onAdvanceDay,
  staff,
  staffCandidates,
  wageDebt,
  onHireStaff,
  onSetStaffShift,
  restockTargets = [],
  onAssignRefillJob,
  onClose,
  initialShowStaff = false,
}) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'reports'>('checkout');
  const [showStaff, setShowStaff] = useState(initialShowStaff);
  const { dailyRecords = {}, currentDayRecord } = useGameStore();

  const activeCustomer = customers.find((c) => c.stage === 'checkout');
  const queueCount = customers.filter((c) => c.stage === 'to_checkout').length;

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
      restockTargets={restockTargets}
      onAssignRefillJob={onAssignRefillJob}
      onClose={() => (initialShowStaff ? onClose() : setShowStaff(false))}
    />;
  }

  return (
    <PixelDialog
      title="Sổ bán hàng của Cô Năm"
      subtitle="Từng món bán đi, từng niềm vui ở lại"
      icon="book"
      onClose={onClose}
    >
      <div className="summary-row">
        <PixelStat label="Tiền trong hòm" value={money(player.money)} icon="coin" />
        <PixelStat label="Uy tín trong xóm" value={player.reputation} icon="heart" />
        <PixelStat label="Cấp cửa tiệm" value={player.level} icon="star" />
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px 0', borderBottom: '2px solid #583c28', paddingBottom: 8 }}>
        <PixelButton
          variant={activeTab === 'checkout' ? 'wood' : 'paper'}
          icon="bag"
          onClick={() => setActiveTab('checkout')}
          aria-label="Thu ngân tại quầy"
        >
          Thu ngân tại quầy {queueCount > 0 ? `(${queueCount})` : ''}
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
                  <span style={{ fontWeight: 'bold', color: '#2a7a43' }}>
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
                  borderTop: '1px dashed #d1c4b2',
                }}
              >
                <div>
                  <span className="muted">Tổng hóa đơn: </span>
                  <strong style={{ fontSize: 16, color: '#b64c3d' }}>{money(totalBill)}</strong>
                </div>
                <PixelButton
                  variant="teal"
                  disabled={!worldTime.isStoreOpen}
                  onClick={() => onCheckout(activeCustomer.targetFixtureId)}
                  aria-label={`Thu tiền ${money(totalBill)}`}
                >
                  Thu tiền {money(totalBill)}
                </PixelButton>
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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const annual = summarizeAnnualRevenue(dailyRecords, worldTime.day, currentDayRecord ?? undefined);
            return (
              <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }} aria-label="Doanh thu năm">
                <strong>Doanh thu năm {annual.year}: {money(annual.revenue)}{annual.referenceThreshold ? ` / ngưỡng tham khảo ${money(annual.referenceThreshold)}` : ''}</strong>
                <div className="pixel-progress"><span style={{ width: `${Math.round(annual.progress * 100)}%` }} /></div>
                <p className="muted" style={{ margin: 0 }}>{annual.note}</p>
              </div>
            );
          })()}
          {/* Current day live report */}
          <div style={{ background: '#f5efe6', padding: 12, borderRadius: 4, border: '1px solid #d1c4b2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, color: '#4a2e18' }}>Báo cáo hôm nay (Ngày {worldTime.day})</h3>
              <span className="muted">Đang mở sổ</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
              <PixelStat label="Số khách" value={`${currentDayRecord?.customersServed ?? 0} người`} icon="person" />
              <PixelStat label="Giao dịch" value={`${currentDayRecord?.transactionsCount ?? 0} lượt`} icon="book" />
              <PixelStat label="Món đã bán" value={`${currentDayRecord?.itemsSold ?? 0} cái`} icon="bag" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid #e0d5c5', paddingTop: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Doanh thu bán hàng:</span>
                <strong>{money(currentDayRecord?.revenue ?? 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Giá vốn hàng bán (COGS):</span>
                <span style={{ color: '#b64c3d' }}>- {money(currentDayRecord?.cogs ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #d1c4b2', paddingTop: 4 }}>
                <strong>Lợi nhuận gộp:</strong>
                <strong style={{ color: (currentDayRecord?.grossProfit ?? 0) >= 0 ? '#2a7a43' : '#b64c3d' }}>
                  {money(currentDayRecord?.grossProfit ?? 0)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Tổn thất hàng quá hạn:</span>
                <span style={{ color: '#b64c3d' }}>- {money(currentDayRecord?.spoilageCost ?? 0)} ({currentDayRecord?.spoilageCount ?? 0} món)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px double #583c28', paddingTop: 4, fontWeight: 'bold' }}>
                <span>Lợi nhuận ròng:</span>
                <span style={{ color: (currentDayRecord?.netProfit ?? 0) >= 0 ? '#2a7a43' : '#b64c3d', fontSize: 14 }}>
                  {money(currentDayRecord?.netProfit ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTop: '1px dotted #ccc', fontSize: 11, color: '#776655' }}>
                <span>Tiền mua nhập hàng hôm nay (cashflow):</span>
                <span>{money(currentDayRecord?.purchaseTotal ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Past days history */}
          <div>
            <h3 style={{ margin: '8px 0 6px 0', color: '#4a2e18' }}>Lịch sử ngày trước đã chốt</h3>
            {pastDays.length === 0 ? (
              <EmptyState title="Chưa có ngày chốt sổ">
                Khi qua ngày mới lúc 22:00 hoặc bấm nút Qua ngày mới, sổ sách ngày hiện tại sẽ được tự động chốt an toàn và lưu trữ vào lịch sử.
              </EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {pastDays.map((rec) => (
                  <div
                    key={rec.day}
                    style={{
                      background: '#fffdfa',
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: '1px solid #e0d5c5',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong>Ngày {rec.day}</strong>
                      <span className="muted" style={{ fontSize: 10 }}>
                        Chốt lúc: {rec.closedAt ? new Date(rec.closedAt).toLocaleTimeString('vi-VN') : 'Đã chốt'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                      <div>Doanh thu: <strong>{money(rec.revenue)}</strong></div>
                      <div>Giá vốn: <span style={{ color: '#b64c3d' }}>{money(rec.cogs)}</span></div>
                      <div>Lãi ròng: <strong style={{ color: rec.netProfit >= 0 ? '#2a7a43' : '#b64c3d' }}>{money(rec.netProfit)}</strong></div>
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      {rec.customersServed} khách · {rec.transactionsCount} giao dịch · {rec.itemsSold} món bán {rec.spoilageCount > 0 ? `· Hỏng ${rec.spoilageCount} món` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PixelDialog>
  );
};
