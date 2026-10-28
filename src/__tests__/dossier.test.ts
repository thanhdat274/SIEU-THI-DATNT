import { describe, it, expect } from 'vitest';
import { MASTER_BADGES, badgeEarned, dossierEarnedCount, type DossierInput } from '../data/dossier';

const base: DossierInput = {
  supplierTier: 0, regularTier: 0, closeRegulars: 0, fairTaken: false, prepClaimed: false,
  servicesOwned: 0, servicesPaidBack: 0, demographicsCount: 0, landmarkContrib: 0,
  prestigeLevel: 0, rivalArcs: 0, perfectDays: 0,
};
const withD = (p: Partial<DossierInput>): DossierInput => ({ ...base, ...p });

describe('GĐ71 — Hồ sơ tiệm + Huy hiệu thâm niên (dossier, meta-progression)', () => {
  it('bốn huy hiệu, mỗi cái yêu cầu ≥ 3 điều kiện hệ', () => {
    expect(MASTER_BADGES).toHaveLength(4);
    for (const b of MASTER_BADGES) expect(b.criteria.length).toBeGreaterThanOrEqual(3);
  });

  it('Mối Tứ Phương 🤝: đủ cả 3 phía mua (mối bậc 2 + chợ phiên + đón lễ)', () => {
    const b = MASTER_BADGES[0];
    expect(badgeEarned(withD({ supplierTier: 2, fairTaken: true, prepClaimed: true }), b)).toBe(true);
    // thiếu bất kỳ một phía → chưa đạt (một trục không đủ)
    expect(badgeEarned(withD({ supplierTier: 4, fairTaken: false, prepClaimed: true }), b)).toBe(false);
    expect(badgeEarned(withD({ supplierTier: 1, fairTaken: true, prepClaimed: true }), b)).toBe(false);
  });

  it('Bán Tứ Phía 💛: đủ cả 3 phía bán (tiệm bậc 2 + 3 khách ruột + 3 phân khúc)', () => {
    const b = MASTER_BADGES[1];
    expect(badgeEarned(withD({ regularTier: 2, closeRegulars: 3, demographicsCount: 3 }), b)).toBe(true);
    expect(badgeEarned(withD({ regularTier: 4, closeRegulars: 2, demographicsCount: 3 }), b)).toBe(false);
    expect(badgeEarned(withD({ regularTier: 1, closeRegulars: 3, demographicsCount: 3 }), b)).toBe(false);
  });

  it('Nhà Buôn Đủ Nghề 🛠️: 3 dịch vụ + 2 thu hồi vốn + 2 ngày hoàn hảo', () => {
    const b = MASTER_BADGES[2];
    expect(badgeEarned(withD({ servicesOwned: 3, servicesPaidBack: 2, perfectDays: 2 }), b)).toBe(true);
    expect(badgeEarned(withD({ servicesOwned: 5, servicesPaidBack: 1, perfectDays: 2 }), b)).toBe(false);
  });

  it('Huyền Thoại Hẻm 🏆: endgame gộp 5 hệ (mối vàng + tiệm vàng + NG+ + công trình + 5 ngày hoàn hảo)', () => {
    const b = MASTER_BADGES[3];
    const full = withD({ supplierTier: 4, regularTier: 4, prestigeLevel: 1, landmarkContrib: 1, perfectDays: 5 });
    expect(badgeEarned(full, b)).toBe(true);
    // thiếu NG+ → chưa đạt dù mọi thứ cao
    expect(badgeEarned(withD({ ...full, prestigeLevel: 0 }), b)).toBe(false);
    // thiếu công trình → chưa đạt
    expect(badgeEarned(withD({ ...full, landmarkContrib: 0 }), b)).toBe(false);
  });

  it('dossierEarnedCount đếm đúng số huy hiệu (0 → 4)', () => {
    expect(dossierEarnedCount(base)).toBe(0);
    expect(dossierEarnedCount(withD({ supplierTier: 2, fairTaken: true, prepClaimed: true }))).toBe(1);
    expect(dossierEarnedCount(withD({
      supplierTier: 4, regularTier: 4, closeRegulars: 3, fairTaken: true, prepClaimed: true,
      servicesOwned: 3, servicesPaidBack: 2, demographicsCount: 3, prestigeLevel: 1, landmarkContrib: 1, perfectDays: 5,
    }))).toBe(4);
  });
});
