import { describe, expect, it } from 'vitest';
import { landmarkPayoff, LANDMARK_PAYOFF_WINDOW, LANDMARK_TOTAL_TURNS } from '../data/landmarkPayoff';
import {
  feedCost, landmarkProgress, LANDMARK_CUSTOMER_BONUS_FACTOR,
  LANDMARK_FEED_CAP, LANDMARK_TARGETS,
} from '../data/landmark';
import type { DayRecord } from '../core/gameTypes';

/**
 * Bộ test GĐ158 — "Sân chơi khu phố: góp bao nhiêu, còn bao nhiêu, đáng không?"
 *
 * Hợp đồng của landmarkPayoff (thuần đọc, không đụng state):
 * - An toàn: landmark undefined/null/âm/NaN → coi như 0 lượt; history undefined/rỗng →
 *   dailyGainEst/paybackDays null (không bịa số).
 * - Luật charge thật của contributeLandmark: lượt thứ (i+1) thu feedCost(landmarkProgress(i).index, level)
 *   → lượt 1–14 tier 0, lượt 15–21 tier 1, lượt 22–28 tier 2 (tier 3 không bao giờ bị thu).
 * - spentEst + remainingCostEst = ước trọn dự án ở level hiện tại (bất kể đang góp tới đâu).
 * - dailyGainEst = round(avgRevenue7 × 6%); paybackDays = (spent+remaining)/gain, 1 chữ số.
 */

const rec = (day: number, revenue: number): DayRecord => ({ day, revenue, profit: 0, customers: 0, unhappy: 0 });

/** Số cứng cấp 1: feedCost(0..2, 1) = 8000/12000/16000 (roundThousand của 8150/12150/16150). */
const FULL_LEVEL1 = 14 * 8000 + 7 * 12000 + 7 * 16000; // = 308.000đ trọn dự án

describe('landmarkPayoff — an toàn đầu vào', () => {
  it('landmark undefined/null → coi như ván mới (0 lượt, còn đủ 28)', () => {
    for (const lm of [undefined, null]) {
      const p = landmarkPayoff(lm, 1, []);
      expect(p.done).toBe(false);
      expect(p.contributedTurns).toBe(0);
      expect(p.spentEst).toBe(0);
      expect(p.remainingTurns).toBe(LANDMARK_TOTAL_TURNS);
      expect(p.remainingCostEst).toBe(FULL_LEVEL1);
      expect(p.dailyGainEst).toBeNull();
      expect(p.paybackDays).toBeNull();
    }
  });

  it('contributions âm/NaN (dữ liệu xấu) → 0 lượt, không âm tiền', () => {
    expect(landmarkPayoff({ contributions: -5 }, 1, []).contributedTurns).toBe(0);
    expect(landmarkPayoff({ contributions: -5 }, 1, []).spentEst).toBe(0);
    expect(landmarkPayoff({ contributions: Number.NaN }, 1, []).contributedTurns).toBe(0);
  });

  it('history undefined/rỗng → dailyGainEst + paybackDays null (đang góp lẫn đã xong)', () => {
    for (const history of [undefined, null, []]) {
      const mid = landmarkPayoff({ contributions: 10 }, 1, history);
      expect(mid.dailyGainEst).toBeNull();
      expect(mid.paybackDays).toBeNull();
      const done = landmarkPayoff({ contributions: 28 }, 1, history);
      expect(done.dailyGainEst).toBeNull();
      expect(done.paybackDays).toBeNull();
    }
  });

  it('level xấu (NaN/âm) → không sinh NaN', () => {
    const p = landmarkPayoff({ contributions: 5 }, Number.NaN, []);
    expect(Number.isFinite(p.spentEst)).toBe(true);
    expect(Number.isFinite(p.remainingCostEst)).toBe(true);
  });
});

describe('landmarkPayoff — đang góp (giữa đường)', () => {
  it('10 lượt, cấp 1: ước đã góp 80.000đ, còn 18 lượt ≈ 228.000đ', () => {
    const p = landmarkPayoff({ contributions: 10 }, 1, []);
    expect(p.done).toBe(false);
    expect(p.contributedTurns).toBe(10);
    expect(p.spentEst).toBe(10 * 8000); // 10 lượt đầu đều tier 0 (mốc nhảy ở 14)
    expect(p.remainingTurns).toBe(18);
    // còn lại: 4 lượt tier 0 + 7 lượt tier 1 + 7 lượt tier 2
    expect(p.remainingCostEst).toBe(4 * 8000 + 7 * 12000 + 7 * 16000);
    expect(p.dailyGainEst).toBeNull();
    expect(p.paybackDays).toBeNull();
  });

  it('27 lượt, cấp 1: còn đúng 1 lượt = feedCost giai đoạn 2 (16.000đ)', () => {
    const p = landmarkPayoff({ contributions: 27 }, 1, []);
    expect(p.remainingTurns).toBe(1);
    expect(p.remainingCostEst).toBe(feedCost(landmarkProgress(27).index, 1));
    expect(p.remainingCostEst).toBe(16_000);
  });

  it('0 lượt: còn đủ 28 lượt = ước trọn dự án (308.000đ ở cấp 1)', () => {
    const p = landmarkPayoff({ contributions: 0 }, 1, []);
    expect(p.remainingTurns).toBe(28);
    expect(p.remainingCostEst).toBe(FULL_LEVEL1);
  });
});

describe('landmarkPayoff — đã khánh thành (28 lượt)', () => {
  it('done, còn 0 lượt, còn phải góp 0đ, đã góp = ước trọn dự án', () => {
    const p = landmarkPayoff({ contributions: 28 }, 1, []);
    expect(p.done).toBe(true);
    expect(p.contributedTurns).toBe(28);
    expect(p.remainingTurns).toBe(0);
    expect(p.remainingCostEst).toBe(0);
    expect(p.spentEst).toBe(FULL_LEVEL1);
  });

  it('overshoot (>28, dữ liệu lạ) → kẹp 28 lượt, done, không âm remaining', () => {
    const p = landmarkPayoff({ contributions: 40 }, 1, []);
    expect(p.done).toBe(true);
    expect(p.contributedTurns).toBe(28);
    expect(p.remainingTurns).toBe(0);
    expect(p.remainingCostEst).toBe(0);
    expect(p.spentEst).toBe(FULL_LEVEL1);
  });

  it('dailyGainEst = round(avgRevenue7 × 6%) và paybackDays 1 chữ số (cấp 1)', () => {
    const history = Array.from({ length: 7 }, (_, i) => rec(i + 1, 100_000));
    const p = landmarkPayoff({ contributions: 28 }, 1, history);
    const expectedGain = Math.round(100_000 * (LANDMARK_CUSTOMER_BONUS_FACTOR - 1)); // 6.000đ
    expect(expectedGain).toBe(6_000);
    expect(p.dailyGainEst).toBe(expectedGain);
    // 308.000 / 6.000 = 51.333… → 51.3
    expect(p.paybackDays).toBeCloseTo(51.3, 5);
    expect(p.paybackDays).toBe(Math.round((FULL_LEVEL1 / expectedGain) * 10) / 10);
  });

  it('level cao: mọi số vẫn bám feedCost thật và không vượt trần từng lượt', () => {
    const p = landmarkPayoff({ contributions: 28 }, 100, []);
    let sum = 0;
    for (let i = 0; i < LANDMARK_TOTAL_TURNS; i++) sum += feedCost(landmarkProgress(i).index, 100);
    expect(p.spentEst).toBe(sum);
    expect(sum).toBeLessThanOrEqual(28 * LANDMARK_FEED_CAP);
  });
});

describe('landmarkPayoff — cửa sổ doanh thu 7 ngày (history mới nhất ở CUỐI mảng)', () => {
  it('ít hơn 7 ngày → lấy trung bình đúng số ngày có', () => {
    const history = [rec(1, 50_000), rec(2, 70_000), rec(3, 90_000)];
    const p = landmarkPayoff({ contributions: 28 }, 1, history);
    expect(p.dailyGainEst).toBe(Math.round(70_000 * 0.06)); // 4.200đ
    expect(p.paybackDays).toBe(Math.round((FULL_LEVEL1 / 4_200) * 10) / 10);
  });

  it('nhiều hơn 7 ngày → chỉ 7 ngày GẦN NHẤT được tính (không lấy đầu mảng)', () => {
    const history = [rec(1, 1_000_000), ...Array.from({ length: LANDMARK_PAYOFF_WINDOW }, (_, i) => rec(i + 2, 100_000))];
    const p = landmarkPayoff({ contributions: 28 }, 1, history);
    expect(p.dailyGainEst).toBe(6_000); // bỏ ngày 1 triệu, giữ 7×100k
  });

  it('dòng hỏng (thiếu revenue) → coi như 0, không sập', () => {
    const bad = [{ day: 1, profit: 0, customers: 0, unhappy: 0 } as unknown as DayRecord, rec(2, 100_000)];
    const p = landmarkPayoff({ contributions: 28 }, 1, bad);
    expect(p.dailyGainEst).toBe(3_000);
  });
});

describe('landmarkPayoff — lời nhỏ & bất biến', () => {
  it('dailyGain < 1.000đ vẫn trả số (paybackDays dài) — UI tự đổi giọng "được cái đẹp hẻm"', () => {
    const history = Array.from({ length: 7 }, (_, i) => rec(i + 1, 5_000));
    const p = landmarkPayoff({ contributions: 28 }, 1, history);
    expect(p.dailyGainEst).toBe(300);
    expect(p.dailyGainEst).toBeLessThan(1_000);
    expect(p.paybackDays).toBe(Math.round((FULL_LEVEL1 / 300) * 10) / 10); // 1026.7 — UI không đọc to
  });

  it('doanh thu 0 → paybackDays null (không chia 0, không Infinity)', () => {
    const history = Array.from({ length: 7 }, (_, i) => rec(i + 1, 0));
    const p = landmarkPayoff({ contributions: 28 }, 1, history);
    expect(p.dailyGainEst).toBe(0);
    expect(p.paybackDays).toBeNull();
  });

  it('bất biến: spentEst + remainingCostEst = ước trọn dự án ở MỌI mức tiến độ', () => {
    for (let c = 0; c <= LANDMARK_TOTAL_TURNS; c++) {
      const p = landmarkPayoff({ contributions: c }, 12, []);
      expect(p.spentEst + p.remainingCostEst).toBe(
        Array.from({ length: LANDMARK_TOTAL_TURNS }, (_, i) => feedCost(landmarkProgress(i).index, 12)).reduce((a, b) => a + b, 0),
      );
    }
  });

  it('cấu trúc mốc khớp luật charge: 14 lượt tier 0 + 7 tier 1 + 7 tier 2 (không lượt nào tier 3)', () => {
    const tiers = Array.from({ length: LANDMARK_TOTAL_TURNS }, (_, i) => landmarkProgress(i).index);
    expect(tiers.filter((t) => t === 0).length).toBe(LANDMARK_TARGETS[1]); // 14 lượt đầu tới mốc 14
    expect(tiers.filter((t) => t === 1).length).toBe(LANDMARK_TARGETS[2] - LANDMARK_TARGETS[1]); // 7
    expect(tiers.filter((t) => t === 2).length).toBe(LANDMARK_TARGETS[3] - LANDMARK_TARGETS[2]); // 7
    expect(tiers.filter((t) => t === 3).length).toBe(0);
  });
});
