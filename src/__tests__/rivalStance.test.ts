import { describe, expect, it } from 'vitest';
import {
  rivalNightAI, STANCE_MATCH, STANCE_KRYPTONITE, RIVAL_SALE_DAYS, RIVAL_AGGRESSIVE_POACH_MULT,
  RIVAL_BAD_REVIEW_POWER, RIVAL_KRYPTONITE_PRESSURE, RIVAL_UNDERCUT, STAFF_POACH_CHANCE, type Rival,
} from '../data/rivals';
import type { StanceId } from '../data/stance';

// Hệ 3 L7 (SPEC §3.6) — ĐỐI THỦ PHẢN ỨNG theo hướng biển định vị của tiệm mình (chỉ khi có biển hiệu lực).
// cutter→Bình dân: đua giá không lại → khuyến mãi ngắn ngày (saleAdvice), không ép giá dài hạn.
// quality→Đặc sản: tranh nhà phê bình — mỗi review chất lượng xấu của mình → rival +2 sức mạnh (strengthBonus).
// aggressive→Tiện lợi: tăng xác suất móc nhân viên (poachMult).
// "Khắc tinh" (cutter đấu Đặc sản...): chiến thuật rival vô dụng → sức ép −25% (phá giá nhạt hơn).

const rival = (personality: Rival['personality'], strength = 80): Rival =>
  ({ name: 'Tiệm X', strength, openedDay: 1, personality });

interface Ctx {
  day: number; byItem: Record<string, { qty: number }>; priceOf: () => number;
  friendships: Record<string, number>; giftCounter: boolean; staff: { id: number; name: string; skill: number }[];
  rng?: () => number; level?: number; stance?: StanceId; badReview?: number;
}
const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  day: 100, byItem: { mi: { qty: 5 } }, priceOf: () => 10000,
  friendships: {}, giftCounter: false, staff: [{ id: 1, name: 'Nhân', skill: 90 }],
  rng: () => 0, ...over,
});

describe('Hệ3-L7 — đối thủ phản ứng theo biển (SPEC §3.6)', () => {
  it('không treo biển (hoặc hướng trung tính) → hành vi rival đúng như cũ, không bonus/sale', () => {
    const res = rivalNightAI(rival('cutter'), ctx());
    expect(res.saleAdvice).toBeUndefined();
    expect(res.strengthBonus ?? 0).toBe(0);
    expect(res.rival.prices!.mi).toBe(Math.round(10000 * RIVAL_UNDERCUT.cutter / 100) * 100); // phá giá như thường 0.88
  });

  it('cutter gặp Bình dân: bỏ ép giá dài hạn, chuyển khuyến mãi ngắn ngày (saleAdvice = day+3)', () => {
    const res = rivalNightAI(rival('cutter'), ctx({ stance: 'binh_dan' }));
    expect(res.saleAdvice).toBe(100 + RIVAL_SALE_DAYS);
    expect(res.rival.prices!.mi).toBe(10000); // không hạ giá hôm nay (undercut = 1)
    expect(res.rival.saleUntil).toBeUndefined(); // sale do core đặt từ saleAdvice
  });

  it('cutter gặp Đặc sản = khắc tinh: phá giá nhạt hơn (sức ép −25%)', () => {
    const res = rivalNightAI(rival('cutter'), ctx({ stance: 'dac_san' }));
    const weakened = 1 - (1 - RIVAL_UNDERCUT.cutter) * RIVAL_KRYPTONITE_PRESSURE; // 0.91
    expect(res.rival.prices!.mi).toBe(Math.round(10000 * weakened / 100) * 100);
  });

  it('quality gặp Đặc sản: mỗi review chất lượng xấu hôm nay → rival +2 sức mạnh', () => {
    expect(rivalNightAI(rival('quality'), ctx({ stance: 'dac_san', badReview: 2 })).strengthBonus).toBe(RIVAL_BAD_REVIEW_POWER * 2);
    expect(rivalNightAI(rival('quality'), ctx({ stance: 'dac_san', badReview: 0 })).strengthBonus ?? 0).toBe(0);
  });

  it('aggressive gặp Tiện lợi: tăng xác suất móc nhân viên (×mult)', () => {
    const rng = () => 0.05; // nằm giữa STAFF_POACH_CHANCE (0.04) và ×1.6 (0.064)
    const noStance = rivalNightAI(rival('aggressive'), ctx({ rng }));
    expect(noStance.poachedStaffId).toBeUndefined(); // 0.05 ≥ 0.04 → không móc bình thường
    const tien = rivalNightAI(rival('aggressive'), ctx({ rng, stance: 'tien_loi' }));
    expect(tien.poachedStaffId).toBe(1); // 0.05 < 0.064 → móc
    expect(RIVAL_AGGRESSIVE_POACH_MULT).toBeGreaterThan(1);
  });

  it('bản đồ match/khắc tinh khớp SPEC §3.6 (cutter↔Đặc sản là khắc tinh rõ)', () => {
    expect(STANCE_MATCH.cutter).toBe('binh_dan');
    expect(STANCE_MATCH.quality).toBe('dac_san');
    expect(STANCE_MATCH.aggressive).toBe('tien_loi');
    expect(STANCE_KRYPTONITE.cutter).toBe('dac_san');
    expect(STANCE_KRYPTONITE.quality).toBe('tien_loi');
    expect(STANCE_KRYPTONITE.aggressive).toBe('binh_dan');
    // mọi persona: match ≠ khắc tinh (không mâu thuẫn hai nhánh reaction)
    for (const p of ['cutter', 'quality', 'aggressive'] as const) {
      expect(STANCE_MATCH[p]).not.toBe(STANCE_KRYPTONITE[p]);
    }
  });
});
