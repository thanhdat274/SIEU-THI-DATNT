import React, { useState } from 'react';
import type { RegularCustomerProgress } from '@game/shared';
import { REGULAR_CUSTOMERS, PRODUCT_MAP } from '@game/data';
import { PixelDialog, PixelProgress } from './pixel';

interface Props {
  regulars: Record<string, RegularCustomerProgress>;
  onClose: () => void;
}

export const RegularsModal: React.FC<Props> = ({ regulars, onClose }) => {
  const [selectedId, setSelectedId] = useState<string>(REGULAR_CUSTOMERS[0].id);
  const selectedDef = REGULAR_CUSTOMERS.find((c) => c.id === selectedId) ?? REGULAR_CUSTOMERS[0];
  const progress = regulars[selectedDef.id] ?? {
    id: selectedDef.id,
    friendship: 0,
    unlockedPerks: [],
    discoveredProductIds: [],
    totalVisits: 0,
  };

  const hearts = Math.min(5, Math.floor(progress.friendship / 20));
  const heartString = '♥ '.repeat(hearts) + '♡ '.repeat(5 - hearts);

  return (
    <PixelDialog
      icon="star"
      title="SỔ KHÁCH QUEN ĐẦU HẺM"
      subtitle="Xây dựng tình làng nghĩa xóm · Khám phá sở thích & mở khóa đặc quyền"
      onClose={onClose}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 190px) 1fr', gap: 12, maxHeight: '65vh', overflow: 'hidden' }}>
        {/* Cột trái: Danh sách khách quen */}
        <div style={{ display: 'grid', gap: 6, overflowY: 'auto', paddingRight: 4 }}>
          {REGULAR_CUSTOMERS.map((reg) => {
            const prog = regulars[reg.id];
            const pts = prog?.friendship ?? 0;
            const h = Math.min(5, Math.floor(pts / 20));
            const isSelected = reg.id === selectedId;

            return (
              <button
                key={reg.id}
                onClick={() => setSelectedId(reg.id)}
                className={`pixel-btn ${isSelected ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '6px 8px',
                  textAlign: 'left',
                  background: isSelected ? 'var(--sand-light, #fbf4e2)' : undefined,
                  borderColor: isSelected ? 'var(--rust, #b44a2c)' : undefined,
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#ec4899' }}>{'♥'.repeat(h)}</span>
                  <span>{reg.name}</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted, #666)', marginTop: 2 }}>{reg.roleTitle}</div>
              </button>
            );
          })}
        </div>

        {/* Cột phải: Chi tiết khách quen đang chọn */}
        <div style={{ overflowY: 'auto', paddingRight: 4, display: 'grid', gap: 10 }}>
          {/* Thông tin cá nhân & Thân thiết */}
          <div className="pixel-panel" style={{ padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14 }}>{selectedDef.name}</h3>
                <span className="muted" style={{ fontSize: 10 }}>{selectedDef.roleTitle}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: '#ec4899', letterSpacing: 2 }}>{heartString}</div>
                <div style={{ fontSize: 9, color: 'var(--muted, #666)' }}>{progress.friendship} / 100 điểm thân thiết</div>
              </div>
            </div>

            <p style={{ margin: '8px 0', fontSize: 11, fontStyle: 'italic', color: '#444' }}>
              &ldquo;{selectedDef.bio}&rdquo;
            </p>

            <PixelProgress label="Mức độ thân thiết" value={progress.friendship % 20} max={20} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted, #666)', marginTop: 2 }}>
              <span>Đã ghé tiệm: {progress.totalVisits} lần</span>
              <span>Độ kiên nhẫn: {selectedDef.patienceSeconds}s</span>
            </div>
          </div>

          {/* Món ăn ưa thích */}
          <div className="pixel-panel" style={{ padding: 10 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--rust, #b44a2c)' }}>SỞ THÍCH MÓN HÀNG</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
              {selectedDef.favoriteProductIds.map((pid) => {
                const isDiscovered = progress.discoveredProductIds.includes(pid);
                const prod = PRODUCT_MAP[pid];

                return (
                  <div
                    key={pid}
                    style={{
                      padding: 6,
                      background: isDiscovered ? 'rgba(42, 122, 67, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      border: '1px dashed',
                      borderColor: isDiscovered ? '#2a7a43' : '#ccc',
                      borderRadius: 3,
                      fontSize: 10,
                    }}
                  >
                    {isDiscovered ? (
                      <>
                        <div style={{ fontWeight: 'bold', color: '#2a7a43' }}>✓ {prod?.name ?? pid}</div>
                        <div style={{ fontSize: 9, color: '#666' }}>Món ruột đã biết</div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: '#888', fontWeight: 'bold' }}>? ? ? ? ?</div>
                        <div style={{ fontSize: 8, color: '#999' }}>Bán thử để khám phá</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Đặc quyền thân thiết */}
          <div className="pixel-panel" style={{ padding: 10 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--rust, #b44a2c)' }}>ĐẶC QUYỀN MỞ KHÓA</h4>
            <div style={{ display: 'grid', gap: 6 }}>
              {selectedDef.perks.map((perk) => {
                const isUnlocked = progress.unlockedPerks.includes(perk.title) || progress.friendship >= perk.threshold;

                return (
                  <div
                    key={perk.title}
                    style={{
                      padding: 6,
                      background: isUnlocked ? 'rgba(147, 51, 234, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid',
                      borderColor: isUnlocked ? '#9333ea' : '#e5e5e5',
                      borderRadius: 3,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 10, color: isUnlocked ? '#7e22ce' : '#777' }}>
                        {isUnlocked ? '★ ' : '🔒 '}{perk.title}
                      </span>
                      <span style={{ fontSize: 9, color: isUnlocked ? '#16a34a' : '#888' }}>
                        {isUnlocked ? 'ĐÃ MỞ' : `Cần ${perk.threshold} điểm`}
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{perk.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PixelDialog>
  );
};
