import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type DayStats } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { RIVAL_UNLOCK } from '../data/rivals';

/** GĐ1059 — core/biz.bizEndOfDay khối "Rival đời mới" (dòng 264–275): sau khi đánh bại một
 *  đối thủ (rivalsBeaten > 0), hết thời gian nghỉ (day+1 ≥ rivalNextDay) và roll < 0.25 thì một
 *  cửa hàng mới khai trương đầu hẻm — bậc quy mô to dần theo số lần đánh bại (rivalTier), tên
 *  catalog lặp vòng thêm hậu tố "(cơ sở N)", tính cách rút tránh lặp thế hệ trước (GĐ60/170).
 *  Đây là vòng cạnh tranh giữ chân cuối game — đối thủ mới nối tiếp, không bao giờ hẻm vắng. */

const stats = (over: Partial<DayStats> = {}): DayStats => ({
  revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0,
  byItem: {},
  ...over,
});

const seedState = (over: Partial<ReturnType<typeof newGameData>> = {}) => {
  useGame.setState({ ...newGameData(), day: 40, level: 20, money: 2_000_000, ...over });
  const s = useGame.getState();
  // Cửa hàng đã đóng cửa (không rival, không counter) — sạch khe để else-if đời mới chạy
  s.biz = { ...s.biz, rival: null, counter: null, rivalsBeaten: 1, rivalNextDay: 20, rivalForSale: undefined };
  return s;
};

describe('GĐ1059 — rival đời mới khai trương sau khi đánh bại đối thủ', () => {
  beforeEach(() => useGame.setState(newGameData()));

  it('đủ điều kiện + roll < 0.25 → cửa hàng mới khai trương, tin báo bậc quy mô', () => {
    const s = seedState();
    const rand = Math.random;
    Math.random = () => 0.1; // spawn check < 0.25 → bật đời mới
    const out = bizEndOfDay({ ...s, biz: { ...s.biz } }, stats());
    Math.random = rand;
    expect(out.biz.rival).not.toBeNull();
    expect(out.biz.rival!.name.length).toBeGreaterThan(0);
    expect(out.news.some((n) => n.includes('vừa khai trương ở đầu hẻm'))).toBe(true);
  });

  it('roll ≥ 0.25 → KHÔNG khai trương (giữ hẻm vắng, rival vẫn null)', () => {
    const s = seedState({ day: 30 });
    const rand = Math.random;
    Math.random = () => 0.5; // spawn check ≥ 0.25 → chưa đến giờ
    const out = bizEndOfDay({ ...s, biz: { ...s.biz } }, stats());
    Math.random = rand;
    expect(out.biz.rival).toBeNull();
    expect(out.news.some((n) => n.includes('vừa khai trương'))).toBe(false);
  });

  it('CHƯA đánh bại đối thủ nào (rivalsBeaten 0, prestige 0) → không bao giờ có đời mới', () => {
    const s = seedState({ day: 45 });
    s.biz = { ...s.biz, rivalsBeaten: 0, prestige: { ...s.biz.prestige, level: 0 } };
    const rand = Math.random;
    Math.random = () => 0.01;
    const out = bizEndOfDay({ ...s, biz: { ...s.biz } }, stats());
    Math.random = rand;
    expect(out.biz.rival).toBeNull();
    expect(out.news.some((n) => n.includes('vừa khai trương'))).toBe(false);
  });
});
