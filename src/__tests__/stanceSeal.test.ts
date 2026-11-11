import { describe, expect, it } from 'vitest';
import {
  hasStanceSeal, stanceSeals, isStanceSealable, sealImportMul, sealPatience, sealYieldBonus,
  SEAL_IMPORT_DISCOUNT, SEAL_YIELD_BONUS, SEAL_PATIENCE_BONUS, STANCE_SEAL_TIER,
  activeSigns, stanceTraffic,
  type StanceState, type StanceId,
} from '../data/stance';
import { ngGoalProgress } from '../data/ngGoals';

// Hệ 3 L8 (SPEC §3.7) — ẤN định vị giữ qua NG+.
// Đạt bậc 5 một hướng → nhận ẤN, lưu biz.prestige.seals, giữ qua prestigeRestart.
// Ấn Bình dân: nhập rẻ 2%. Ấn Đặc sản: mỗi mẻ nấu/phơi ra thêm 1. Ấn Tiện lợi: kiên nhẫn +10%.
// Đủ 3 ấn → danh hiệu + treo 2 biển. Mọi hiệu lực gated bởi CÓ ẤN → không có ấn (golden L30, save cũ) trung tính.

const ref = (seals?: StanceId[]) => ({ prestige: { seals } });
const st = (fitDays: number, id: StanceId = 'binh_dan'): StanceState => ({ id, since: 1, fitDays, missStreak: 0 });

describe('Hệ3-L8 — ấn: state, helper trung tính, lợi vĩnh viễn, NG goal', () => {
  it('không có prestige.seals → rỗng, mọi hiệu lực trung tính (1 / 0)', () => {
    expect(stanceSeals({ prestige: {} })).toEqual([]);
    expect(hasStanceSeal({ prestige: {} }, 'binh_dan')).toBe(false);
    expect(sealImportMul({})).toBe(1);
    expect(sealPatience({})).toBe(1);
    expect(sealYieldBonus({})).toBe(0);
  });

  it('hằng số đúng SPEC: ấn bậc 5, nhập −2%, yield +1, patience +10%', () => {
    expect(STANCE_SEAL_TIER).toBe(5);
    expect(SEAL_IMPORT_DISCOUNT).toBe(0.98);
    expect(SEAL_YIELD_BONUS).toBe(1);
    expect(SEAL_PATIENCE_BONUS).toBe(0.1);
  });

  it('isStanceSealable: đủ bậc 5 (50 ngày khớp) nhận ấn, < bậc 5 thì chưa', () => {
    expect(isStanceSealable(st(50))).toBe(true);
    expect(isStanceSealable(st(35))).toBe(false); // bậc 4
    expect(isStanceSealable(st(0))).toBe(false);
  });

  it('Ấn Bình dân: có ấn → nhập rẻ 2%; không có → 1', () => {
    const e = ref(['binh_dan']);
    expect(sealImportMul(e)).toBe(SEAL_IMPORT_DISCOUNT);
    expect(sealImportMul(ref(['dac_san']))).toBe(1);
    expect(sealImportMul(ref(['binh_dan', 'tien_loi']))).toBe(SEAL_IMPORT_DISCOUNT);
  });

  it('Ấn Đặc sản: có ấn → mỗi mẻ ra thêm 1; không có → 0', () => {
    expect(sealYieldBonus(ref(['dac_san']))).toBe(SEAL_YIELD_BONUS);
    expect(sealYieldBonus(ref(['binh_dan']))).toBe(0);
  });

  it('Ấn Tiện lợi: có ấn → kiên nhẫn +10%; không có → 1', () => {
    expect(sealPatience(ref(['tien_loi']))).toBe(1 + SEAL_PATIENCE_BONUS);
    expect(sealPatience(ref(['binh_dan']))).toBe(1);
  });

  it('NG goal theo hướng: bậc 3 hướng nào → mục tiêu hướng đó hoàn thành, hướng khác chưa', () => {
    const base = { prestigeLevel: 1, level: 60, staffCount: 4, ordersDone: 20, supplierRel: {}, marketClearedDay: 5, rivalsBeaten: 1 };
    const tier3 = ngGoalProgress({ ...base, stance: st(21, 'dac_san') }); // bậc 3 (21 ngày khớp)
    const byId = Object.fromEntries(tier3.map((g) => [g.id, g.done]));
    expect(byId['ng_stance_dac']).toBe(true);
    expect(byId['ng_stance_binh']).toBe(false);
    expect(byId['ng_stance_tien']).toBe(false);

    // không treo biển → chưa mục tiêu hướng nào
    const none = ngGoalProgress(base);
    expect(Object.fromEntries(none.map((g) => [g.id, g.done]))['ng_stance_binh']).toBe(false);
  });

  it('3 mục tiêu hướng đều có thưởng và đo theo vòng (prestige level ≥ 1)', () => {
    const goals = ngGoalProgress({ prestigeLevel: 1, level: 1, staffCount: 0, ordersDone: 0, supplierRel: {}, marketClearedDay: 0, rivalsBeaten: 0, stance: st(50, 'tien_loi') });
    const stance = goals.filter((g) => g.id.startsWith('ng_stance_'));
    expect(stance).toHaveLength(3);
    expect(stance.every((g) => g.reward > 0)).toBe(true);
    expect(stance.find((g) => g.id === 'ng_stance_tien')!.done).toBe(true);
  });

  it('activeSigns: một biển → mult 1 (giữ hành vi cũ); hai biển → mỗi biển 0.6', () => {
    expect(activeSigns({ stance: st(50, 'binh_dan') })).toHaveLength(1);
    const two = activeSigns({ stance: st(50, 'binh_dan'), stance2: st(21, 'dac_san') });
    expect(two).toHaveLength(2);
    expect(two[0].mult).toBe(0.6); expect(two[0].st.id).toBe('binh_dan');
    expect(two[1].mult).toBe(0.6); expect(two[1].st.id).toBe('dac_san');
  });

  it('hai biển cùng lúc: hiệu ứng mỗi hướng cộng dồn ×0.6; một biển giữ nguyên bậc', () => {
    // Bình dân bậc5 traffic 1+0.2=1.2; Đặc sản bậc5 1−0.15=0.85. Hai biển: 1 + 0.6·0.2 − 0.6·0.15 = 1.03
    expect(stanceTraffic({ stance: st(50, 'binh_dan'), stance2: st(50, 'dac_san') })).toBeCloseTo(1 + 0.6 * 0.2 - 0.6 * 0.15);
    // một biển (dù là stance2 duy nhất) → mult 1, đúng bậc cũ
    expect(stanceTraffic({ stance: st(50, 'binh_dan') })).toBeCloseTo(1.2);
    expect(stanceTraffic({ stance: st(50, 'dac_san') })).toBeCloseTo(0.85);
    expect(stanceTraffic({ stance2: st(50, 'binh_dan') })).toBeCloseTo(1.2);
  });
});
