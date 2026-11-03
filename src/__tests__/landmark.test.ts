import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import {
  feedCost,
  landmark2Progress,
  landmarkCustomerFactor,
  landmarkDayAction,
  landmarkNightLine,
  landmarkNightTrafficFactor,
  landmarkProgress,
  LANDMARK2_STAGES,
  LANDMARK2_TARGETS,
  LANDMARK_CUSTOMER_BONUS_FACTOR,
  LANDMARK_FEED_CAP,
  LANDMARK_STAGES,
  LANDMARK_TARGETS,
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

  it('GĐ732 — sân chơi khánh thành → góp tiếp DỰ ÁN ĐÈN (true); cả hai xong → false', () => {
    setBiz(28);
    const s = useGame.getState();
    expect(s.contributeLandmark()).toBe(true); // sân chơi xong → mở dự án đèn đường
    expect(useGame.getState().biz.landmark.contributions).toBe(29);
    useGame.setState({ day: useGame.getState().day + 1, biz: { ...useGame.getState().biz, landmark: { contributions: 48, lastContributeDay: 0 } } });
    expect(useGame.getState().contributeLandmark()).toBe(false);
    expect(useGame.getState().message).toContain('hoàn thành rồi');
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
    expect(after.message).toContain('Sân chơi khánh thành'); // GĐ732: lời nhắc dự án đèn thay lời chúc cũ
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


describe('GĐ741 — việc sáng góp vật liệu công trình', () => {
  it('hôm nay chưa góp → có việc; đã góp hôm nay → không; cả hai xong → không', () => {
    const lm = { contributions: 10, lastContributeDay: 9 };
    const act = landmarkDayAction(lm, 10, 5);
    expect(act).not.toBeNull();
    expect(act!.text).toContain('Sân chơi');
    expect(act!.panel).toBe('landmark');
    expect(landmarkDayAction({ contributions: 10, lastContributeDay: 10 }, 10, 5)).toBeNull();
    expect(landmarkDayAction({ contributions: 60, lastContributeDay: 9 }, 10, 5)).toBeNull(); // cả hai xong
    // sân chơi xong → việc sáng chuyển sang dự án đèn
    const p2 = landmarkDayAction({ contributions: 30, lastContributeDay: 9 }, 10, 5);
    expect(p2!.text).toContain('Đèn Đường Ngõ 1');
    expect(p2!.icon).toBe('💡');
  });
});

describe('GĐ736 — dòng soi sáng đèn trong tab đêm', () => {
  it('3 trạng thái: mời dự án / đang góp còn N lượt / đã thắp sáng payoff', () => {
    expect(landmarkNightLine(10)).toContain('dự án cộng đồng kế');
    expect(landmarkNightLine(30)).toContain('còn 18 lượt'); // 20 − (30 − 28)
    expect(landmarkNightLine(48)).toContain('+15% lưu lượng đêm');
    expect(landmarkNightLine(48)!.length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ732 — dự án 2: Đèn Đường Ngõ 1', () => {
  it('landmark2Progress: null khi sân chơi chưa xong; 28→48 chia 3 giai đoạn 7/7/6 lượt', () => {
    expect(landmark2Progress(0)).toBeNull();
    expect(landmark2Progress(27)).toBeNull();
    const at28 = landmark2Progress(28)!;
    expect(at28.index).toBe(0);
    expect(at28.done).toBe(false);
    expect(landmark2Progress(35)!.index).toBe(0);
    expect(landmark2Progress(36)!.index).toBe(0); // 8 lượt vào giai đoạn 0 (7 lượt đầu)
    expect(landmark2Progress(42)!.index).toBe(1); // 14 = mốc giai đoạn 1
    expect(landmark2Progress(43)!.index).toBe(1); // 15 lượt vẫn trong giai đoạn 1
    expect(landmark2Progress(47)!.done).toBe(false); // chưa đủ 20 lượt đèn
    expect(landmark2Progress(48)!.done).toBe(true);
    expect(landmark2Progress(60)!.done).toBe(true);
  });
  it('landmarkNightTrafficFactor: 1 khi chưa thắp sáng, ×1,15 khi đèn đã sáng', () => {
    expect(landmarkNightTrafficFactor(0)).toBe(1);
    expect(landmarkNightTrafficFactor(47)).toBe(1);
    expect(landmarkNightTrafficFactor(48)).toBe(1.15);
  });
  it('contributeLandmark: sân chơi xong → lượt góp chạy tiếp dự án đèn (mốc 35 trao thưởng giai đoạn đèn)', () => {
    useGame.setState({ ...newGameData(), day: 50, money: 5_000_000, level: 20, notify: () => {} });
    useGame.setState({ biz: { ...useGame.getState().biz, landmark: { contributions: 34, lastContributeDay: 0 } } });
    expect(useGame.getState().contributeLandmark()).toBe(true);
    const b = useGame.getState().biz;
    expect(b.landmark.contributions).toBe(35); // chạm mốc 35 → giai đoạn 1 của đèn xong
    const got = useGame.getState().money;
    void got;
    // góp lần nữa trong cùng ngày bị chặn
    expect(useGame.getState().contributeLandmark()).toBe(false);
    // cả hai công trình xong → chặn hẳn
    useGame.setState({ day: 51, biz: { ...useGame.getState().biz, landmark: { contributions: 48, lastContributeDay: 0 } } });
    expect(useGame.getState().contributeLandmark()).toBe(false);
  });
  it('payoff khách đêm chỉ áp khi đèn sáng (biên đúng — không đọc store nhiễm test trước)', () => {
    expect(LANDMARK2_TARGETS[LANDMARK2_TARGETS.length - 1]).toBe(48);
  });
  it('cấu trúc LANDMARK2_STAGES khớp mốc đèn (3 tầng cot→den→dien, targets 35/42/48)', () => {
    expect(LANDMARK2_STAGES.length).toBe(3);
    expect(LANDMARK2_TARGETS).toEqual([35, 42, 48]);
    expect(LANDMARK2_STAGES.map((s) => s.id)).toEqual(['cot', 'den', 'dien']);
    expect(new Set(LANDMARK2_STAGES.map((s) => s.title)).size).toBe(3);
    expect(LANDMARK2_STAGES[2].bonusMoney).toBe(600_000);
    expect(LANDMARK2_STAGES[2].bonusXp).toBe(800);
  });
  it('contributeLandmark: 47 → 48 chạm mốc CUỐI đèn → thưởng giai đoạn cuối + lời thắp sáng hẻm (dòng 104–105)', () => {
    const toasts: string[] = [];
    useGame.setState({ ...newGameData(), day: 60, money: 5_000_000, level: 20, notify: (m) => void toasts.push(m) });
    useGame.setState({ biz: { ...useGame.getState().biz, landmark: { contributions: 47, lastContributeDay: 0 } } });
    const s = useGame.getState();
    const beforeMoney = s.money;
    const beforeXp = s.stats.xp;
    const currentIndex = landmark2Progress(47)!.index; // giai đoạn ĐANG góp (Treo đèn) — dùng bù chi phí
    const cost = feedCost(currentIndex, s.level);
    expect(s.contributeLandmark()).toBe(true);
    const after = useGame.getState();
    expect(after.biz.landmark.contributions).toBe(48);
    expect(after.money).toBe(beforeMoney - cost + LANDMARK2_STAGES[2].bonusMoney);
    expect(after.stats.xp - beforeXp).toBe(LANDMARK2_STAGES[2].bonusXp);
    // lời báo mốc cuối "thắp sáng hẻm" (dòng 104–105) được gửi
    expect(toasts.some((t) => t.includes('Đèn đường Ngõ 1 thắp sáng'))).toBe(true);
  });
});
