import React from 'react';
import type { SkillState, SkillType } from '@game/shared';
import { SKILL_PERKS, SKILL_XP_PER_LEVEL } from '@game/data';
import { PixelButton, PixelDialog, PixelProgress } from './pixel';

interface SkillsModalProps {
  skillState: SkillState;
  onChoosePerk: (perkId: string) => void;
  onClose: () => void;
}

const SKILL_NAMES: Record<SkillType, { name: string; icon: string; desc: string }> = {
  management: {
    name: 'Quản lý tiệm',
    icon: 'briefcase',
    desc: 'Tối ưu hóa thao tác thu ngân và năng suất nhân viên',
  },
  marketing: {
    name: 'Buôn bán & Ngoại giao',
    icon: 'star',
    desc: 'Tăng sức hút khách hàng, tiền boa và chiết khấu nhập sỉ',
  },
  storage: {
    name: 'Kho bãi & Bảo quản',
    icon: 'package',
    desc: 'Mở rộng sức chứa kệ và kéo dài độ tươi ngon của hàng hóa',
  },
};

export const SkillsModal: React.FC<SkillsModalProps> = ({
  skillState,
  onChoosePerk,
  onClose,
}) => {
  const [selectedSkill, setSelectedSkill] = React.useState<SkillType>('management');

  const currentLevel = skillState.levels[selectedSkill] ?? 1;
  const currentXp = skillState.xp[selectedSkill] ?? 0;
  const isMaxLevel = currentLevel >= SKILL_XP_PER_LEVEL.length;
  const nextLevelXp = isMaxLevel ? currentXp : SKILL_XP_PER_LEVEL[currentLevel];
  const prevLevelXp = SKILL_XP_PER_LEVEL[currentLevel - 1] ?? 0;
  const progressInLevel = currentXp - prevLevelXp;
  const neededInLevel = nextLevelXp - prevLevelXp;

  const perks = SKILL_PERKS.filter((p) => p.skill === selectedSkill);

  return (
    <PixelDialog
      icon="star"
      title="KỸ NĂNG & ĐẶC QUYỀN"
      subtitle="Bồi dưỡng tay nghề và mở khóa bí quyết kinh doanh"
      onClose={onClose}
    >
      {/* Tab bar chọn cây kỹ năng */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['management', 'marketing', 'storage'] as SkillType[]).map((st) => {
          const info = SKILL_NAMES[st];
          const active = selectedSkill === st;
          return (
            <PixelButton
              key={st}
              variant={active ? 'teal' : 'paper'}
              onClick={() => setSelectedSkill(st)}
              style={{ flex: 1, padding: '6px 4px', fontSize: '0.85rem' }}
            >
              {info.name} (Lv.{skillState.levels[st] ?? 1})
            </PixelButton>
          );
        })}
      </div>

      {/* Thông tin cấp độ & thanh XP */}
      <div className="pixel-panel" style={{ padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <strong>{SKILL_NAMES[selectedSkill].name}</strong>
          <span className="badge">Cấp {currentLevel}</span>
        </div>
        <p className="muted" style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>
          {SKILL_NAMES[selectedSkill].desc}
        </p>

        {isMaxLevel ? (
          <div className="tabular" style={{ color: 'var(--color-primary)' }}>
            ★ Đã đạt cấp tối đa
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
              <span>Tiến độ kinh nghiệm</span>
              <span className="tabular">{progressInLevel} / {neededInLevel} XP</span>
            </div>
            <PixelProgress
              label="XP"
              value={progressInLevel}
              max={neededInLevel}
            />
          </div>
        )}
      </div>

      {/* Danh sách đặc quyền (Perks) */}
      <h3 style={{ margin: '0 0 8px 0' }}>Bí quyết & Đặc quyền</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {perks.map((perk) => {
          const unlocked = skillState.chosenPerks.includes(perk.id);
          const reqLevel = perk.tier + 1;
          const canUnlock = currentLevel >= reqLevel && !unlocked;

          return (
            <div
              key={perk.id}
              className="pixel-panel"
              style={{
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                background: unlocked ? 'rgba(78, 175, 124, 0.08)' : undefined,
                borderLeft: unlocked ? '3px solid #4eaf7c' : undefined,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong>{perk.name}</strong>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    (Bậc {perk.tier} · Cần cấp {reqLevel})
                  </span>
                </div>
                <div className="muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>
                  {perk.description}
                </div>
              </div>

              <div>
                {unlocked ? (
                  <span style={{ color: '#4eaf7c', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    ✓ Đã mở
                  </span>
                ) : (
                  <PixelButton
                    variant="teal"
                    disabled={!canUnlock}
                    onClick={() => onChoosePerk(perk.id)}
                    style={{ minWidth: 90 }}
                  >
                    {canUnlock ? 'Mở khóa' : `Cần Lv.${reqLevel}`}
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
