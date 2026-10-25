import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type DayStats } from '../core/store';
import { bizEndOfDay, startCounter } from '../core/biz';
import {
  bizTraffic, COUNTER_AD_TRAFFIC, counterActive, counterById, COUNTERS, newBiz, PRICE_WAR_CUT, rivalNightly,
} from '../data/biz';
import { REGULARS } from '../data/regulars';

/** Bộ test B6 — phản công đối thủ chủ động: đối đầu giá, quảng cáo xuyên hẻm, tri ân khách quen. */

const stats = (itemsSold: number): DayStats => ({
  revenue: 500000, spent: 100000, wages: 0, itemsSold, customers: 5, unhappy: 0, xp: 0,
});

describe('COUNTERS — dữ liệu chiến thuật liền mạch', () => {
  it('mỗi chiến thuật có hit > 0, hồi dài hơn 1 ngày, đối đầu giá không tốn tiền trước', () => {
    for (const c of COUNTERS) {
      expect(c.hit, c.id).toBeGreaterThan(0);
      expect(c.cooldown, c.id).toBeGreaterThan(1);
    }
    expect(counterById('price').cost).toBe(0);
    expect(counterById('ad').cost).toBeGreaterThan(0);
  });
  it('counterActive chỉ đúng chiến thuật đúng ngày', () => {
    const c = { tactic: 'price' as const, day: 10 };
    expect(counterActive(c, 10, 'price')).toBe(true);
    expect(counterActive(c, 11, 'price')).toBe(false);
    expect(counterActive(c, 10, 'ad')).toBe(false);
    expect(counterActive(null, 10, 'price')).toBe(false);
  });
});

describe('startCounter — chọn chiến thuật trong ngày', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), day: 10, level: 10, money: 2000000,
      biz: { ...newBiz(), rival: { name: 'Tạp hóa Thử', strength: 60, openedDay: 9 } },
    });
  });
  it('chạy được: trừ tiền, ghi đợt và thời gian hồi', () => {
    startCounter('ad');
    const b = useGame.getState().biz;
    expect(b.counter).toEqual({ tactic: 'ad', day: 10 });
    expect(b.counterReady.ad).toBe(10 + counterById('ad').cooldown);
    expect(useGame.getState().money).toBe(2000000 - counterById('ad').cost);
  });
  it('mỗi ngày chỉ một đợt; chiến thuật cũ hồi xong mới dùng lại được', () => {
    startCounter('price');
    expect(useGame.getState().biz.counter?.tactic).toBe('price');
    startCounter('gift');
    expect(useGame.getState().biz.counter?.tactic).toBe('price'); // bị chặn, vẫn là đợt cũ
    useGame.setState({ day: 11 });
    startCounter('gift');
    expect(useGame.getState().biz.counter).toEqual({ tactic: 'gift', day: 11 });
    useGame.setState({ day: 12 });
    startCounter('price'); // hồi 3 ngày: từ ngày 10 → được dùng lại ngày 13
    expect(useGame.getState().biz.counter?.tactic).toBe('gift');
    useGame.setState({ day: 13 });
    startCounter('price');
    expect(useGame.getState().biz.counter?.tactic).toBe('price');
  });
  it('không có đối thủ thì không chạy được', () => {
    useGame.setState({ biz: { ...newBiz() } });
    startCounter('ad');
    expect(useGame.getState().biz.counter).toBeNull();
    expect(useGame.getState().money).toBe(2000000);
  });
});

describe('hiệu ứng trong ngày của đợt phản công', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 10, level: 10, money: 1000000, prices: { nuoc: 10000 } });
  });
  it('đối đầu giá: mọi món rẻ hơn PRICE_WAR_CUT, hết ngày giá về lại', () => {
    expect(useGame.getState().priceOf('nuoc')).toBe(10000);
    useGame.setState({ biz: { ...newBiz(), counter: { tactic: 'price', day: 10 } } });
    expect(useGame.getState().priceOf('nuoc')).toBe(Math.round(10000 * (1 - PRICE_WAR_CUT)));
    useGame.setState({ day: 11 });
    expect(useGame.getState().priceOf('nuoc')).toBe(10000);
  });
  it('quảng cáo xuyên hẻm: khách ghé cộng thêm đúng hệ số', () => {
    const base = bizTraffic(newBiz(), 10);
    useGame.setState({ biz: { ...newBiz(), counter: { tactic: 'ad', day: 10 } } });
    expect(bizTraffic(useGame.getState().biz, 10)).toBeCloseTo(base * COUNTER_AD_TRAFFIC);
    expect(bizTraffic(useGame.getState().biz, 11)).toBeCloseTo(base);
  });
  it('tri ân khách quen: khách ghé hôm nay được +2 thân thiết', () => {
    const def = REGULARS[0];
    const fav = def.favorites[0];
    const seed = () => useGame.setState({
      regulars: { [def.id]: { friendship: 10, visits: 5, perks: [], discovered: [fav] } },
    });
    seed();
    useGame.getState().regularVisit(def.id, [{ id: 'nuoc', price: 6000 }], true);
    const plain = useGame.getState().regulars[def.id].friendship;
    seed();
    useGame.setState({ biz: { ...newBiz(), counter: { tactic: 'gift', day: 10 } } });
    useGame.getState().regularVisit(def.id, [{ id: 'nuoc', price: 6000 }], true);
    expect(useGame.getState().regulars[def.id].friendship).toBe(plain + 2);
  });
});

describe('bizEndOfDay — chấm điểm đợt phản công và trả đũa của đối thủ', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(), day: 10, level: 10,
      biz: { ...newBiz(), rival: { name: 'Tạp hóa Thử', strength: 60, openedDay: 9 }, counter: null },
    });
  });
  const fresh = () => {
    const s = useGame.getState();
    return { ...s, biz: { ...newBiz(), rival: { name: 'Tạp hóa Thử', strength: 60, openedDay: 9 }, counter: { tactic: 'price' as const, day: 10 } } };
  };

  it('đối đầu giá thắng (≥30 món): đối thủ mất thêm đúng hit', () => {
    const rand = Math.random;
    Math.random = () => 0.99; // không bán giảm giá tự phát, không trả đũa
    const out = bizEndOfDay(fresh(), stats(35));
    Math.random = rand;
    expect(out.biz.counter).toBeNull();
    const nightly = rivalNightly({ name: 'x', strength: 60, openedDay: 1 }, { rating: 3.5, missRate: 0, priceIndex: 1, adsActive: false });
    expect(out.biz.rival!.strength).toBe(nightly - counterById('price').hit);
    expect(out.news.some((n) => n.includes('hiệu quả'))).toBe(true);
  });

  it('đối đầu giá thua (<30 món): đợt vô hiệu, không cộng hit', () => {
    const rand = Math.random;
    Math.random = () => 0.99;
    const out = bizEndOfDay(fresh(), stats(10));
    Math.random = rand;
    const nightly = rivalNightly({ name: 'x', strength: 60, openedDay: 1 }, { rating: 3.5, missRate: 0, priceIndex: 1, adsActive: false });
    expect(out.biz.rival!.strength).toBe(nightly);
    expect(out.news.some((n) => n.includes('vô hiệu'))).toBe(true);
  });

  it('bị đánh mà vẫn trụ: có khi đối thủ trả đũa bằng đợt giảm giá ngày mai (+lại chút sức mạnh)', () => {
    const rand = Math.random;
    let call = 0;
    Math.random = () => (++call === 2 ? 0.1 : 0.99); // lượt 1: không sale tự phát; lượt 2: trả đũa
    const out = bizEndOfDay(fresh(), stats(35));
    Math.random = rand;
    expect(out.biz.rival!.saleUntil).toBe(11);
    expect(out.news.some((n) => n.includes('trả đũa'))).toBe(true);
  });

  it('đợt phản công đủ mạnh có thể khiến đối thủ đóng cửa', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, rival: { name: 'Tạp hóa Yếu', strength: 2, openedDay: 9 }, counter: { tactic: 'ad', day: 10 } } });
    const s = useGame.getState();
    const rand = Math.random;
    Math.random = () => 0.99;
    const out = bizEndOfDay({ ...s, biz: { ...s.biz, rival: { name: 'Tạp hóa Yếu', strength: 2, openedDay: 9 }, counter: { tactic: 'ad', day: 10 } } }, stats(35));
    Math.random = rand;
    expect(out.biz.rival).toBeNull();
    expect(out.biz.rivalsBeaten).toBe(1);
  });
});
