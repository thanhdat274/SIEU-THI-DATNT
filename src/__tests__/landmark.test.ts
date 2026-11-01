import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import {
  feedCost, landmarkCustomerFactor, landmarkProgress, LANDMARK_CUSTOMER_BONUS_FACTOR,
  LANDMARK_FEED_CAP, LANDMARK_STAGES, LANDMARK_TARGETS,
} from '../data/landmark';

/**
 * Bộ test GĐ40 — "Công Trình Khu Phố" (Sân Chơi Trẻ Em): mục tiêu dài hạn mỗi ngày góp một lượt.
 *
 * Hợp đồng:
 * - landmarkProgress(c): index/into/pct/done; c<0 → toàn 0; đủ 28 → done; overshoot kẹp.
 * - feedCost(tier, level): nguyên dương, tròn nghìn, không giảm theo tier/level, trần CAP, sàn 1000.
 * - landmarkCustomerFactor(c): 1 khi c<28, ×1.06 từ 28.
 * - contributeLandmark (store): trừ feedCost + cộng contributions + ghi ngày; chặn góp kép cùng ngày,
 *     chặn khi hết tiền / đã done; chạm mốc giai đoạn → thưởng tiền+XP đúng một lần.
 * - Persistence: applySnapshot bù {0,0}; snapshot round-trip giữ giá trị; factor ván mới = 1.
 */

const TOTAL = LANDMARK_TARGETS[LANDMARK_TARGETS.length - 1];

describe('landmarkProgress — tiến độ tích luỹ', () => {
  it('0 → index 0 / into 0 / pct 0 / chưa done', () => {
    expect(landmarkProgress(0)).toEqual({ index: 0, into: 0, pct: 0, done: false });
  });

  it('âm (dữ liệu xấu) → toàn 0, chưa done', () => {
    expect(landmarkProgress(-5)).toEqual({ index: 0, into: 0, pct: 0, done: false });
    expect(landmarkProgress(-1)).toEqual({ index: 0, into: 0, pct: 0, done: false });
  });

  it('đúng mốc 7/14/21 → index đúng, into = bề ngang giai đoạn', () => {
    expect(landmarkProgress(7)).toEqual({ index: 0, into: 7, pct: 0.25, done: false });
    expect(landmarkProgress(14)).toEqual({ index: 1, into: 7, pct: 0.5, done: false });
    expect(landmarkProgress(21)).toEqual({ index: 2, into: 7, pct: 0.75, done: false });
    expect(landmarkProgress(28)).toEqual({ index: 3, into: 7, pct: 1, done: true });
  });

  it('bên trong giai đoạn 0 và giai đoạn tiếp: index giữ, into kẹp bề ngang', () => {
    expect(landmarkProgress(3)).toEqual({ index: 0, into: 3, pct: Math.round((3 / 28) * 1000) / 1000, done: false });
    expect(landmarkProgress(9)).toEqual({ index: 0, into: 7, pct: Math.round((9 / 28) * 1000) / 1000, done: false });
    expect(landmarkProgress(17)).toEqual({ index: 1, into: 7, pct: Math.round((17 / 28) * 1000) / 1000, done: false });
  });

  it('overshoot (>28) → done, pct kẹp 1, index 3', () => {
    const p = landmarkProgress(40);
    expect(p.done).toBe(true);
    expect(p.pct).toBe(1);
    expect(p.index).toBe(3);
  });

  it('pct đơn điệu không giảm theo contributions và không vượt 1', () => {
    let prev = -1;
    for (let c = 0; c <= 50; c++) {
      const p = landmarkProgress(c).pct;
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
  });
});

describe('feedCost — chi phí một lượt góp', () => {
  it('nguyên dương, làm tròn 1000, sàn ≥ 1000', () => {
    for (const tier of [0, 1, 2, 3]) {
      for (const lvl of [1, 2, 50, 100]) {
        const c = feedCost(tier, lvl);
        expect(Number.isInteger(c)).toBe(true);
        expect(c % 1000).toBe(0);
        expect(c).toBeGreaterThanOrEqual(1000);
      }
    }
  });

  it('không giảm theo tier (cùng level)', () => {
    for (const lvl of [1, 25, 100]) {
      let prev = -1;
      for (let tier = 0; tier <= 3; tier++) {
        const c = feedCost(tier, lvl);
        expect(c).toBeGreaterThanOrEqual(prev);
        prev = c;
      }
    }
  });

  it('không giảm theo level (cùng tier)', () => {
    for (const tier of [0, 1, 2, 3]) {
      let prev = -1;
      for (let lvl = 1; lvl <= 100; lvl++) {
        const c = feedCost(tier, lvl);
        expect(c).toBeGreaterThanOrEqual(prev);
        prev = c;
      }
    }
  });

  it('không bao giờ vượt LANDMARK_FEED_CAP, và trần trong khoảng hợp lệ', () => {
    expect(LANDMARK_FEED_CAP).toBeGreaterThanOrEqual(50_000);
    expect(LANDMARK_FEED_CAP).toBeLessThanOrEqual(500_000);
    for (let tier = 0; tier <= 3; tier++) {
      for (let lvl = 1; lvl <= 100; lvl++) {
        expect(feedCost(tier, lvl)).toBeLessThanOrEqual(LANDMARK_FEED_CAP);
      }
    }
  });

  it('chạm trần ở dải max (tier 3, level 100)', () => {
    expect(feedCost(3, 100)).toBeLessThanOrEqual(LANDMARK_FEED_CAP);
  });
});

describe('landmarkCustomerFactor — hệ số khách sau khánh thành', () => {
  it('1 khi chưa khánh thành (0, 5, 27), không đổi nền kinh tế ván mới', () => {
    expect(landmarkCustomerFactor(0)).toBe(1);
    expect(landmarkCustomerFactor(5)).toBe(1);
    expect(landmarkCustomerFactor(27)).toBe(1);
  });

  it('×1.06 từ khi khánh thành (28 trở lên)', () => {
    expect(LANDMARK_CUSTOMER_BONUS_FACTOR).toBe(1.06);
    expect(landmarkCustomerFactor(28)).toBe(1.06);
    expect(landmarkCustomerFactor(40)).toBe(1.06);
  });
});

describe('contributeLandmark qua store', () => {
  const setBiz = (contributions: number, lastContributeDay = 0) =>
    useGame.setState({ ...newGameData(), money: 1_000_000, message: null, biz: { ...useGame.getState().biz, landmark: { contributions, lastContributeDay } } });

  beforeEach(() => useGame.setState({ ...newGameData(), money: 1_000_000 }));

  it('thành công: trừ feedCost, contributions +1, ghi lastContributeDay = day', () => {
    setBiz(0);
    const s = useGame.getState();
    const before = s.money;
    const cost = feedCost(0, s.level);
    expect(s.contributeLandmark()).toBe(true);
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(1);
    expect(after.biz.landmark.lastContributeDay).toBe(after.day);
    expect(after.money).toBe(before - cost);
    expect(after.message).toContain('+1/28');
  });

  it('góp lần 2 cùng ngày → false (không góp kép), tiền/contributions không đổi', () => {
    setBiz(1, 1); // đã góp ngày 1
    const s = useGame.getState();
    const beforeMoney = s.money;
    expect(s.contributeLandmark()).toBe(false);
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(1);
    expect(after.money).toBe(beforeMoney);
    expect(after.message).toContain('Hôm nay đã góp');
  });

  it('không đủ tiền cho feedCost → false, không đổi gì', () => {
    useGame.setState({ ...newGameData(), money: 0, message: null });
    const s = useGame.getState();
    expect(s.contributeLandmark()).toBe(false);
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(0);
    expect(after.money).toBe(0);
    expect(after.message).toContain('Chưa đủ tiền');
  });

  it('đã khánh thành (done) → false và báo', () => {
    setBiz(28);
    const s = useGame.getState();
    expect(s.contributeLandmark()).toBe(false);
    expect(useGame.getState().message).toContain('khánh thành');
  });

  it('chạm mốc giai đoạn → thưởng đúng tiền + XP một lần, contributions = mốc', () => {
    setBiz(6); // góp xong → 7 = mốc giai đoạn 0
    const s = useGame.getState();
    const cost = feedCost(0, s.level);
    const beforeMoney = s.money;
    const beforeXpAcc = s.stats.xp;
    const stage = LANDMARK_STAGES[0];
    expect(s.contributeLandmark()).toBe(true);
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(7);
    expect(after.money).toBe(beforeMoney - cost + stage.bonusMoney);
    expect(after.stats.xp - beforeXpAcc).toBe(stage.bonusXp);
    expect(after.message).toContain(`${stage.title} hoàn thành`);
  });

  it('hoàn thành giai đoạn cuối (→28) → thưởng cuối + lời chúc khánh thành', () => {
    useGame.setState({ ...newGameData(), money: 2_000_000, message: null, biz: { ...useGame.getState().biz, landmark: { contributions: 27, lastContributeDay: 0 } } });
    const s = useGame.getState();
    const stage = LANDMARK_STAGES[3];
    const beforeMoney = s.money;
    const beforeXpAcc = s.stats.xp;
    expect(s.contributeLandmark()).toBe(true);
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(28);
    expect(after.money).toBe(beforeMoney - feedCost(landmarkProgress(27).index, s.level) + stage.bonusMoney);
    expect(after.stats.xp - beforeXpAcc).toBe(stage.bonusXp);
    expect(after.message).toContain('khánh thành — cả hẻm cảm ơn bạn');
  });

  it('giai đoạn không phải mốc thì không thưởng (không double-grant ở cùng giá trị)', () => {
    setBiz(7); // đã chạm mốc 7
    const s = useGame.getState();
    const beforeMoney = s.money;
    const beforeXpAcc = s.stats.xp;
    expect(s.contributeLandmark()).toBe(true); // → 8, không phải mốc
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(8);
    expect(after.money).toBe(beforeMoney - feedCost(0, s.level)); // không cộng thưởng
    expect(after.stats.xp - beforeXpAcc).toBe(0);
  });

  it('cấu trúc LANDMARK_STAGES khớp mốc cộng dồn (4 tầng, id móng…khánh thành)', () => {
    expect(LANDMARK_STAGES.length).toBe(4);
    expect(LANDMARK_TARGETS).toEqual([7, 14, 21, 28]);
    expect(LANDMARK_STAGES.map((s) => s.id)).toEqual(['mo', 'khung', 'mai', 'khanh']);
    expect(new Set(LANDMARK_STAGES.map((s) => s.title)).size).toBe(4);
  });
});

describe('persistence — biz.landmark qua snapshot/applySnapshot', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('bản lưu cũ thiếu landmark → applySnapshot bù {0, 0} (MERGE_DEEP qua biz)', () => {
    const raw = { ...newGameData() } as Record<string, unknown>;
    const biz = { ...((raw.biz as Record<string, unknown>) ?? {}), landmark: undefined };
    delete (biz as Record<string, unknown>).landmark;
    raw.biz = biz;
    applySnapshot(raw as Parameters<typeof applySnapshot>[0]);
    expect(useGame.getState().biz.landmark).toEqual({ contributions: 0, lastContributeDay: 0 });
  });

  it('bản lưu có giá trị → giữ nguyên qua round-trip', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, landmark: { contributions: 12, lastContributeDay: 9 } } });
    applySnapshot(snapshot() as Parameters<typeof applySnapshot>[0]);
    expect(useGame.getState().biz.landmark).toEqual({ contributions: 12, lastContributeDay: 9 });
  });

  it('kinh tế ván mới không đổi: factor = 1 khi chưa khánh thành', () => {
    expect(landmarkCustomerFactor(useGame.getState().biz.landmark.contributions)).toBe(1);
  });
});
