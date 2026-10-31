import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import {
  rivalMomentum, rivalLeverFlags, rivalStanding, RIVAL_TREND_DAYS, RIVAL_TREND_FLAT, LEVER_RATING, LEVER_MISS_RATE, LEVER_PRICE_INDEX,
  type RivalTrendDay, type RivalLeverCtx, type BizState,
} from '../data/biz';
import { emptyStats } from '../core/gameTypes';
import { productById } from '../data/products';
import { snapshot, applySnapshot } from '../core/save';

/** GĐ60 "Rival đang tiến hay lui": xu hướng sức mạnh đối thủ + 4 đòn bẩy — thuần đọc + 1 append đêm, không đổi kinh tế. */

beforeEach(() => useGame.setState(newGameData()));

const td = (day: number, strength: number, delta = 0): RivalTrendDay => ({ day, strength, delta });

const statsD = (itemsSold = 100, missed = { stock: 0, price: 0, wait: 0 }) => ({
  ...emptyStats(), itemsSold, missed, revenue: 100000,
});

/** Đưa rival vào trạng thái hiện tại (được phép truyền sẵn rivalTrend để test append/cắt/clear). */
function rivalState(strength: number, trend?: RivalTrendDay[], day = 10) {
  useGame.setState({
    day,
    biz: { ...useGame.getState().biz, rival: { name: 'Tiệm X', strength, openedDay: 1 }, rivalTrend: trend ?? [] },
  });
  return useGame.getState();
}

describe('rivalMomentum — xu hướng nửa gần vs nửa trước (vùng chết RIVAL_TREND_FLAT%)', () => {
  it('rỗng → trung tính, zero', () => {
    const m = rivalMomentum([]);
    expect(m).toMatchObject({ dir: 'flat', last: 0, start: 0, streak: 0, delta: 0, pct: 0 });
  });

  it('1 ngày (quá ngắn) → trung tính nhưng vẫn báo mốc', () => {
    const m = rivalMomentum([td(1, 70)]);
    expect(m.dir).toBe('flat');
    expect(m.start).toBe(70);
    expect(m.last).toBe(70);
  });

  it('sức mạnh nửa gần cao hơn ≥3% → gaining, streak dương', () => {
    // 6 ngày: 3 đầu 60, 3 sau 66 → nửa gần 198 > nửa trước 180 (~10%) → gaining
    const t = [td(1, 60), td(2, 60), td(3, 60), td(4, 66), td(5, 66), td(6, 66)];
    const m = rivalMomentum(t);
    expect(m.dir).toBe('gaining');
    expect(m.delta).toBe(18);
    expect(m.pct).toBe(10);
    expect(m.last).toBe(66);
  });

  it('sức mạnh nửa gần thấp hơn ≥3% → fading', () => {
    const t = [td(1, 70), td(2, 70), td(3, 70), td(4, 66), td(5, 66), td(6, 66)]; // nửa trước 210 vs nửa gần 198 → down
    expect(rivalMomentum(t).dir).toBe('fading');
  });

  it('chênh < 3% → flat (vùng chết)', () => {
    const t = [td(1, 100), td(2, 100), td(3, 100), td(4, 101), td(5, 101), td(6, 100)]; // nửa trước 300 vs nửa gần 302 → ~0.7%
    expect(rivalMomentum(t).dir).toBe('flat');
  });

  it('streak = số đêm liên tiếp cùng hướng từ cuối', () => {
    // fading 4 ngày từ cuối, 2 ngày đầu tăng → streak = 4
    const t = [td(1, 50, 2), td(2, 52, 2), td(3, 50, -2), td(4, 48, -2), td(5, 46, -2), td(6, 44, -2)];
    const m = rivalMomentum(t);
    expect(m.dir).toBe('fading');
    expect(m.streak).toBe(4);
  });

  it('gaining streak dương, flat streak = 0', () => {
    expect(rivalMomentum([td(1, 50, 1), td(2, 52, 2), td(3, 54, 2)]).streak).toBe(2);
    expect(rivalMomentum([td(1, 50, 0), td(2, 51, 1)]).streak).toBe(0);
  });
});

describe('rivalLeverFlags — lật từng đòn bẩy đúng ngưỡng', () => {
  const ctx = (o: Partial<RivalLeverCtx>): RivalLeverCtx => ({ rating: 4, missRate: 0.1, priceIndex: 1, adsActive: true, ...o });

  it('⭐ rating: ≥ LEVER_RATING ok, dưới thì lỗi', () => {
    expect(rivalLeverFlags(ctx({ rating: LEVER_RATING })).find((l) => l.lever === 'rating')!.ok).toBe(true);
    expect(rivalLeverFlags(ctx({ rating: LEVER_RATING - 0.1 })).find((l) => l.lever === 'rating')!.ok).toBe(false);
  });

  it('🚚 missRate: ≤ LEVER_MISS_RATE ok, cao hơn thì lỗi', () => {
    expect(rivalLeverFlags(ctx({ missRate: LEVER_MISS_RATE })).find((l) => l.lever === 'miss')!.ok).toBe(true);
    expect(rivalLeverFlags(ctx({ missRate: LEVER_MISS_RATE + 0.01 })).find((l) => l.lever === 'miss')!.ok).toBe(false);
  });

  it('🏷️ giá: |priceIndex−1| ≤ LEVER_PRICE_INDEX ok, ngoài thì lỗi', () => {
    expect(rivalLeverFlags(ctx({ priceIndex: 1.04 })).find((l) => l.lever === 'price')!.ok).toBe(true); // trong ±5%
    expect(rivalLeverFlags(ctx({ priceIndex: 1.06 })).find((l) => l.lever === 'price')!.ok).toBe(false);
    expect(rivalLeverFlags(ctx({ priceIndex: 0.96 })).find((l) => l.lever === 'price')!.ok).toBe(true); // dưới 1 cũng ok
  });

  it('📢 ads: có quảng cáo ok, không thì lỗi', () => {
    expect(rivalLeverFlags(ctx({ adsActive: true })).find((l) => l.lever === 'ads')!.ok).toBe(true);
    expect(rivalLeverFlags(ctx({ adsActive: false })).find((l) => l.lever === 'ads')!.ok).toBe(false);
  });

  it('một đòn bẩy fail làm đổi tập ✓/✗ (đủ 4 mục)', () => {
    const all = rivalLeverFlags(ctx({ rating: 3, missRate: 0.3, priceIndex: 1.2, adsActive: false }));
    expect(all.length).toBe(4);
    expect(all.filter((l) => l.ok)).toHaveLength(0);
    expect(all.map((l) => l.lever).sort()).toEqual(['ads', 'miss', 'price', 'rating'].sort());
  });
});

describe('rivalStanding — momentum + sức mạnh tuyệt đối → ahead/even/behind', () => {
  it('gaining → behind (dù sức mạnh yếu)', () => {
    expect(rivalStanding([td(1, 60), td(2, 63), td(3, 66)], 66)).toBe('behind');
  });
  it('fading → ahead', () => {
    expect(rivalStanding([td(1, 70), td(2, 70), td(3, 70), td(4, 66), td(5, 66), td(6, 66)], 66)).toBe('ahead');
  });
  it('flat: sức mạnh cao → behind, thấp → ahead, giữa → even', () => {
    expect(rivalStanding([td(1, 100), td(2, 100)], 100)).toBe('behind');
    expect(rivalStanding([td(1, 30), td(2, 30)], 30)).toBe('ahead');
    expect(rivalStanding([td(1, 55), td(2, 55)], 55)).toBe('even');
  });
  it('không đủ tín hiệu (0 mốc) + sức mạnh thấp → ahead (ren đối thủ yếu sẵn)', () => {
    expect(rivalStanding([], 30)).toBe('ahead');
  });
});

describe('instrument core/biz.bizEndOfDay — append/slice/clear/no-rival', () => {
  it('append 1 mốc mỗi đêm: delta = sức mạnh mới − cũ, day = ngày mới', () => {
    const s = rivalState(70);
    const out = bizEndOfDay(s, statsD());
    const before = 70;
    const after = out.biz.rival!.strength;
    expect(out.biz.rivalTrend).toHaveLength(1);
    const e = out.biz.rivalTrend[0];
    expect(e.day).toBe(s.day + 1);
    expect(e.strength).toBe(after);
    expect(e.delta).toBe(after - before); // delta = new − old
  });

  it('cửa sổ lăn: giữ tối đa RIVAL_TREND_DAYS (slice −7) và vẫn thêm mốc mới', () => {
    const prime = [...Array(8)].map((_, i) => td(i + 1, 50 + i));
    const s = rivalState(50, prime, 8); // s.day=8, mốc mới ngày 9
    const out = bizEndOfDay(s, statsD());
    expect(out.biz.rivalTrend).toHaveLength(RIVAL_TREND_DAYS); // 8+1 → 7
    expect(out.biz.rivalTrend[0].day).toBe(3); // bỏ mốc cũ nhất (ngày 1..2)
    expect(out.biz.rivalTrend[RIVAL_TREND_DAYS - 1].day).toBe(9);
  });

  it('rival đóng cửa (strength ≤ 0) → clear rivalTrend trống, rival null', () => {
    // phá giá sâu (priceIndex 0.5) → delta âm mạnh → 3−14<0 → đóng cửa
    const sell = productById('bia').sell;
    useGame.setState({ prices: { bia: Math.round(sell * 0.5) } });
    const s = rivalState(3, [td(1, 60), td(2, 40)]);
    const out = bizEndOfDay(s, statsD());
    expect(out.biz.rival).toBeNull();
    expect(out.biz.rivalTrend).toEqual([]); // mỗi rival một arc — lịch sử sạch
  });

  it('không có rival → không append, rivalTrend giữ nguyên', () => {
    const prime = [td(1, 60), td(2, 62), td(3, 64)];
    useGame.setState({ biz: { ...useGame.getState().biz, rival: null, rivalsBeaten: 0, rivalTrend: prime } });
    const out = bizEndOfDay(useGame.getState(), statsD());
    expect(out.biz.rival).toBeNull();
    expect(out.biz.rivalTrend).toEqual(prime); // không đụng
  });
});

describe('save-safe — rivalTrend optional, bù [], round-trip giữ nguyên, hằng số', () => {
  it('applySnapshot thiếu biz.rivalTrend → tự bù [] cho save cũ', () => {
    const raw = { ...newGameData() };
    delete (raw.biz as Partial<BizState>).rivalTrend;
    applySnapshot(raw as never);
    expect((useGame.getState().biz as { rivalTrend?: RivalTrendDay[] }).rivalTrend).toEqual([]);
  });

  it('round-trip snapshot → applySnapshot giữ nguyên rivalTrend', () => {
    const t = [td(1, 60), td(2, 58), td(3, 56)];
    useGame.setState({ biz: { ...useGame.getState().biz, rivalTrend: t } });
    applySnapshot(snapshot());
    expect((useGame.getState().biz as { rivalTrend: RivalTrendDay[] }).rivalTrend).toEqual(t);
  });

  it('hằng số đúng mặc định: RIVAL_TREND_DAYS=7, RIVAL_TREND_FLAT=3, ngưỡng lever', () => {
    expect(RIVAL_TREND_DAYS).toBe(7);
    expect(RIVAL_TREND_FLAT).toBe(3);
    expect(LEVER_RATING).toBe(4);
    expect(LEVER_MISS_RATE).toBe(0.15);
    expect(LEVER_PRICE_INDEX).toBe(0.05);
  });
});
