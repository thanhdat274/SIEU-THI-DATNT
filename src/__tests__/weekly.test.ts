import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeWeek, emptyWeek, newBiz, WEEKLY_CHALLENGES, weeklyChallenge, WEEK_DAYS, type WeekTally,
} from '../data/biz';
import { COMBO_UNLOCK } from '../data/combos';
import { GARDEN_UNLOCK } from '../data/garden';
import { COOK_UNLOCK } from '../data/recipes';
import { SERVICES } from '../data/services';
import { SOCIAL_UNLOCK } from '../data/social';
import { ONLINE_UNLOCK } from '../data/online';
import { bizEndOfDay } from '../core/biz';
import { newGameData, useGame, type DayStats, type GameState } from '../core/store';

/** Thử thách tuần: chọn thử thách xác định, chốt tuần có thưởng theo chuỗi, tích lũy counter ngày. */

const minOf = (id: string) => WEEKLY_CHALLENGES.find((c) => c.id === id)!.minLevel;

describe('weeklyChallenge — chọn thử thách xác định', () => {
  it('cùng week + level luôn ra cùng thử thách (không random)', () => {
    expect(weeklyChallenge(4, 12)).toBe(weeklyChallenge(4, 12));
    // Tuần 4 và 11 cùng rơi vào ô xoay thứ 4 của pool cấp 12
    expect(weeklyChallenge(4, 12).id).toBe(weeklyChallenge(11, 12).id);
  });

  it('cấp 1 chỉ có thử thách doanh thu', () => {
    const ids = new Set(Array.from({ length: 12 }, (_, w) => weeklyChallenge(w, 1).id));
    expect(ids).toEqual(new Set(['wq_revenue']));
  });

  it('cấp 30 đủ 9 thử thách, xoay hết một vòng rồi lặp lại', () => {
    const first = Array.from({ length: 9 }, (_, w) => weeklyChallenge(w, 30).id);
    expect(new Set(first).size).toBe(9);
    expect(weeklyChallenge(9, 30).id).toBe(first[0]);
    expect(weeklyChallenge(10, 30).id).toBe(first[1]);
  });

  it('mốc mở khớp với unlock thật của từng hệ', () => {
    expect(minOf('wq_service')).toBe(SERVICES[0].unlock);
    expect(minOf('wq_combo')).toBe(COMBO_UNLOCK);
    expect(minOf('wq_farm')).toBe(GARDEN_UNLOCK);
    expect(minOf('wq_social')).toBe(SOCIAL_UNLOCK);
    expect(minOf('wq_online')).toBe(ONLINE_UNLOCK);
    expect(minOf('wq_cooked')).toBe(COOK_UNLOCK);
    expect(minOf('wq_cook_orders')).toBe(COOK_UNLOCK);
  });
});

describe('closeWeek — chấm thử thách tuần', () => {
  const tally = (over: Partial<WeekTally> = {}): WeekTally => ({ ...emptyWeek(1), revenue: 900000, ...over });

  it('đạt doanh thu: tiền thưởng giữ thưởng gốc (GĐ169 bỏ nhân tiền chuỗi), XP chuỗi từ tuần đạt thứ 3', () => {
    const r0 = closeWeek(tally(), 7, 1, 0);
    expect(r0.week).toBe(1);
    expect(r0.challenge!.id).toBe('wq_revenue');
    expect(r0.challenge!.met).toBe(true);
    expect(r0.challenge!.target).toBe(900000);
    expect(r0.challenge!.reward).toBe(150000);
    expect(r0.challengeStreak).toBe(1);
    expect(r0.streakXp).toBe(0); // chuỗi 1 — chưa đủ mốc XP
    // GĐ169: tiền không còn nhân 1.2→1.8 theo chuỗi — luôn thưởng gốc
    expect(closeWeek(tally(), 7, 1, 2).challenge!.reward).toBe(150000);
    const r5 = closeWeek(tally(), 7, 1, 5);
    expect(r5.challenge!.reward).toBe(150000);
    expect(r5.challengeStreak).toBe(6);
    // XP chuỗi: streak 2 (đạt tuần này lên 3) và streak 5 (lên 6) đều +35% xpToNext(1)=35 → +12
    expect(closeWeek(tally(), 7, 1, 2).streakXp).toBe(12);
    expect(r5.streakXp).toBe(12);
  });

  it('không đạt: thưởng 0, current/target đúng, chuỗi về 0', () => {
    const r = closeWeek(tally({ revenue: 800000 }), 7, 1, 3);
    expect(r.challenge!.met).toBe(false);
    expect(r.challenge!.reward).toBe(0);
    expect(r.challenge!.current).toBe(800000);
    expect(r.challenge!.target).toBe(900000);
    expect(r.challengeStreak).toBe(0);
    expect(r.challenge!.desc).toContain('900.000đ');
  });

  it('measure ngoài doanh thu đọc đúng counter trong WeekTally', () => {
    const r = closeWeek(tally({ fiveStars: 35 }), 7, 30, 0);
    expect(r.challenge!.id).toBe('wq_five');
    expect(r.challenge!.current).toBe(35);
    expect(r.challenge!.target).toBe(35); // 5 + cấp 30
    expect(r.challenge!.met).toBe(true);
    expect(r.challenge!.reward).toBe(990000); // 120.000 × (1 + 0.25×29)
    // WeekTally thiếu counter (save cũ) thì coi như 0
    const missing = closeWeek(tally(), 7, 30, 0);
    expect(missing.challenge!.current).toBe(0);
    expect(missing.challenge!.met).toBe(false);
  });
});

describe('Tích lũy tuần qua endDay', () => {
  const emptyDay = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });
  const dayStats = (over: Partial<DayStats> = {}): DayStats => ({
    ...emptyDay(),
    revenue: 100000, spent: 60000, itemsSold: 10, customers: 30,
    byItem: { mi: { qty: 5, revenue: 60000, cost: 30000 }, com_hop_ga: { qty: 2, revenue: 40000, cost: 20000 } },
    onlineDone: 2, cookOrders: 1, farmHarvest: 3, socialPosts: 1, combos: 2, services: 5000, fiveStars: 2,
    ...over,
  });

  /** Chạy liền 7 ngày endDay từ `startDay`, trả về trạng thái mới và kết quả ngày cuối (ngày chốt tuần). */
  function runWeek(s: GameState, startDay: number, over: Partial<DayStats> = {}) {
    let cur = s;
    let out = null as ReturnType<typeof bizEndOfDay> | null;
    for (let d = startDay; d < startDay + WEEK_DAYS; d++) {
      out = bizEndOfDay({ ...cur, day: d }, dayStats(over));
      cur = { ...cur, day: d + 1, biz: out.biz };
    }
    return { state: cur, last: out! };
  }

  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 1, level: 30 });
  });

  it('newBiz mặc định weekStreak = 0', () => {
    expect(newBiz().weekStreak).toBe(0);
  });

  it('counters tuỳ chọn cộng dồn từng ngày, kể cả món nhà làm đọc từ sổ bán theo món', () => {
    let s = useGame.getState();
    for (let d = 1; d <= 6; d++) {
      s = { ...s, day: d + 1, biz: bizEndOfDay({ ...s, day: d }, dayStats()).biz };
    }
    const w = s.biz.week;
    expect(w.cookedSold).toBe(12); // com_hop_ga 2 món/ngày × 6 ngày
    expect(w.cookOrders).toBe(6);
    expect(w.onlineDone).toBe(12);
    expect(w.farmHarvest).toBe(18);
    expect(w.socialPosts).toBe(6);
    expect(w.combos).toBe(12);
    expect(w.services).toBe(30000);
    expect(w.fiveStars).toBe(12);
    expect(w.revenue).toBe(600000);
  });

  it('hết 7 ngày chốt tuần: có challenge trong báo cáo, trượt thì nhắc lại và chuỗi về 0', () => {
    const { state, last } = runWeek(useGame.getState(), 1);
    const r = state.biz.lastWeek!;
    expect(r.week).toBe(1);
    expect(r.revenue).toBe(700000);
    expect(r.challenge).toBeTruthy();
    expect(r.challenge!.current).toBe(14); // 2 lời khen 5★/ngày < 5 + 30
    expect(r.challenge!.met).toBe(false);
    expect(state.biz.weekStreak).toBe(0);
    expect(last.news.some((n) => n.includes('🎯') && n.includes('chưa xong'))).toBe(true);
    // Tuần mới bắt đầu với mục tiêu doanh thu kế tiếp
    expect(state.biz.week.startDay).toBe(8);
    expect(state.biz.week.goal).toBe(770000); // 700.000 × 1.1
  });

  it('tuần 2 hoàn thành thử thách dịch vụ: nhận thưởng, chuỗi tuần tăng', () => {
    const week1 = runWeek(useGame.getState(), 1); // tuần 1 trượt (thiếu 5★)
    // Đánh dấu ngày có khách bỏ vì chờ quầy (không "sạch") để cô lập thưởng thử thách tuần,
    // tránh nhận thêm thưởng Nếp vận hành (GĐ79) làm đổi con số money chính xác.
    const week2 = runWeek(week1.state, 8, { services: 80000, missed: { wait: 1 } });
    const r = week2.state.biz.lastWeek!;
    expect(r.week).toBe(2);
    expect(r.challenge!.id).toBe('wq_service');
    expect(r.challenge!.met).toBe(true);
    expect(r.challenge!.current).toBe(560000);
    expect(r.challenge!.target).toBe(540000);
    expect(r.challenge!.reward).toBe(825000); // 100.000 × (1 + 0.25×29)
    expect(r.challengeStreak).toBe(1);
    expect(week2.state.biz.weekStreak).toBe(1);
    // Mục tiêu doanh thu tuần 2 không đạt nên toàn bộ tiền về là thưởng thử thách
    expect(week2.last.money).toBe(825000);
    expect(week2.last.news.some((n) => n.includes('🎯') && n.includes('chuỗi 1 tuần'))).toBe(true);
  });

  it('hoàn thành tiếp tuần 3: tiền giữ thưởng gốc (chuỗi 2 — tuần sau mới tới mốc XP)', () => {
    let { state } = runWeek(useGame.getState(), 1);
    ({ state } = runWeek(state, 8, { services: 80000 }));
    const week3 = runWeek(state, 15, { combos: 10 });
    const r = week3.state.biz.lastWeek!;
    expect(r.challenge!.id).toBe('wq_combo');
    expect(r.challenge!.met).toBe(true);
    expect(r.challenge!.target).toBe(68); // 8 + 2×30
    expect(r.challenge!.reward).toBe(1073000); // 130.000×8.25 = 1.073.000 — GĐ169 bỏ nhân ×1.2
    expect(r.streakXp).toBe(0); // chuỗi 2 — chưa đủ 3
    expect(week3.state.biz.weekStreak).toBe(2);
  });

  it('stats.fiveStars tăng khi nhận lời khen 5★ và chảy vào sổ tuần', () => {
    useGame.setState({ ...newGameData(), day: 1, level: 30 });
    useGame.getState().addReview(5);
    useGame.getState().addReview(5);
    useGame.getState().addReview(4);
    const s = useGame.getState();
    expect(s.totals.fiveStars).toBe(2);
    expect(s.stats.fiveStars).toBe(2);
    const out = bizEndOfDay(s, s.stats);
    expect(out.biz.week.fiveStars).toBe(2);
  });
});
