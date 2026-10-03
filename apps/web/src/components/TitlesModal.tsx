import React from 'react';
import type { TitleDef } from '@game/shared';
import { PixelButton, PixelDialog } from './pixel';

export interface TitleWithState extends TitleDef {
  unlocked: boolean;
  isActive: boolean;
}

export interface TitlesModalProps {
  titles: TitleWithState[];
  activeTitle?: string;
  onSelectTitle: (titleId?: string) => void;
  onClose: () => void;
}

export const TitlesModal: React.FC<TitlesModalProps> = ({
  titles,
  activeTitle,
  onSelectTitle,
  onClose,
}) => {
  const currentActive = titles.find((t) => t.id === activeTitle);

  return (
    <PixelDialog
      icon="star"
      title="DANH HIỆU CHỦ TIỆM"
      subtitle="Ghi nhận thành tựu và phong cách quản lý tiệm"
      onClose={onClose}
    >
      {/* Khung danh hiệu đang dùng */}
      <div
        className="pixel-panel"
        style={{
          padding: '10px 14px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff9e6',
          border: '2px solid #e2b842',
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: '#7a5220', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Danh hiệu đang hiển thị:
          </span>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#8a2b00', marginTop: 2 }}>
            {currentActive ? `${currentActive.icon} ${currentActive.name}` : 'Chưa chọn danh hiệu'}
          </div>
        </div>
        {activeTitle && (
          <PixelButton variant="paper" onClick={() => onSelectTitle(undefined)}>
            Gỡ danh hiệu
          </PixelButton>
        )}
      </div>

      {/* Danh sách các danh hiệu */}
      <div style={{ display: 'grid', gap: 8, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
        {titles.map((title) => {
          return (
            <div
              key={title.id}
              className="pixel-panel"
              style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: title.unlocked ? 1 : 0.65,
                background: title.isActive ? '#fdf5dc' : title.unlocked ? '#ffffff' : '#f0f0f0',
                border: title.isActive ? '2px solid #b85d19' : '1px solid #d4c5b3',
              }}
            >
              <div style={{ flex: 1, marginRight: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{title.icon}</span>
                  <strong style={{ fontSize: 13, color: title.unlocked ? '#2c1e13' : '#777777' }}>
                    {title.name}
                  </strong>
                  {title.isActive && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        background: '#357f72',
                        color: '#fff',
                        borderRadius: 3,
                        fontWeight: 'bold',
                      }}
                    >
                      ĐANG DÙNG
                    </span>
                  )}
                  {!title.unlocked && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        background: '#999999',
                        color: '#fff',
                        borderRadius: 3,
                      }}
                    >
                      CHƯA MỞ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#594433', marginTop: 3 }}>
                  {title.description}
                </div>
              </div>

              <div>
                {title.unlocked ? (
                  title.isActive ? (
                    <PixelButton variant="paper" onClick={() => onSelectTitle(undefined)}>
                      Bỏ chọn
                    </PixelButton>
                  ) : (
                    <PixelButton variant="teal" onClick={() => onSelectTitle(title.id)}>
                      Trang bị
                    </PixelButton>
                  )
                ) : (
                  <PixelButton variant="paper" disabled>
                    Khóa
                  </PixelButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PixelDialog>
  );
};
