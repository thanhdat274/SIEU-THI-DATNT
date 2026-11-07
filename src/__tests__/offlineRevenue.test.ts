import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import {
  GAME_MINUTES_PER_DAY, OFFLINE_EFFICIENCY, OFFLINE_PLAY_RATE, OFFLINE_MIN_MINUTES, offlineCapMinutes, offlineRevenue,
} from '../data/offlineRevenue';
import { MINUTES_PER_SECOND } from '../core/gameTypes';

const base = {
  awayMinutes: 120,
  level: 10,
  recentAvgDailyProfit: 1_440_000, // = 1.000đ mỗi phút game
  hasDineSeat: true,
  hasCookStation: true,
  hasCookedStocked: true,
};

describe('offlineRevenue — doanh thu vắng mặt (GĐ1497)', () => {
  it('hằng số: hiệu suất 55%, tối thiểu 5 phút, trần 30 + cấp×5 phút, ngày 1440 phút game', () => {
    expect(OFFLINE_EFFICIENCY).toBe(0.55);
    expect(OFFLINE_MIN_MINUTES).toBe(5);
    expect(offlineCapMinutes(10)).toBe(80);
    expect(offlineCapMinutes(1)).toBe(35);
    expect(GAME_MINUTES_PER_DAY).toBe(1440);
  });

  it('vắng < 5 phút: không tính', () => {
    const r = offlineRevenue({ ...base, awayMinutes: 4 });
    expect(r.gain).toBe(0);
    expect(r.reason).toContain('5 phút');
  });

  it('thiếu điều kiện từng loại đều ra đúng lý do, gain = 0', () => {
    expect(offlineRevenue({ ...base, hasDineSeat: false }).reason).toContain('bàn ghế');
    expect(offlineRevenue({ ...base, hasCookStation: false }).reason).toContain('trạm nấu');
    expect(offlineRevenue({ ...base, hasCookedStocked: false }).reason).toContain('món nấu');
    expect(offlineRevenue({ ...base, hasDineSeat: false }).gain).toBe(0);
  });

  it('chưa có lãi gần đây thì không ước tính được', () => {
    const r = offlineRevenue({ ...base, recentAvgDailyProfit: 0 });
    expect(r.gain).toBe(0);
    expect(r.reason).toContain('lãi bán hàng');
  });

  it('công thức: phút vắng (chốt trần) × MPS × 55% × lãi/phút game, làm tròn chẵn trăm', () => {
    const r = offlineRevenue(base); // vắng 120 phút > trần cấp 10 = 80 phút
    expect(r.minutesCounted).toBe(80);
    // GĐ1531: gameMinutes = 80 × 60 × 2 × 5% = 480; lãi 1.000đ/phút game → 480.000đ
    expect(r.gain).toBe(480_000);
    // khách ước lượng theo giá trị đơn mặc định 50.000đ
    expect(r.customers).toBe(10);
    expect(r.reason).toBeNull();
  });

  it('trần tăng theo cấp: cấp 30 tính được 180 phút', () => {
    const r = offlineRevenue({ ...base, level: 30 }); // trần 180 < 120 phút vắng → tính hết
    expect(r.minutesCounted).toBe(120);
    expect(r.gain).toBe(Math.round((120 * 60 * MINUTES_PER_SECOND * OFFLINE_PLAY_RATE * 1_000) / 100) * 100);
  });
});

describe('collectOfflineRevenue — action qua store (GĐ1497)', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
  });

  const furniture = [
    { uid: 1, type: 'dining_table', x: 0, z: 0, rot: 0, tiers: [] },
    { uid: 2, type: 'chair', x: 0.85, z: 0, rot: 0, tiers: [] },
    { uid: 3, type: 'hot_kettle', x: -2, z: 0, rot: 0, tiers: [] },
    { uid: 4, type: 'produce', x: -4, z: 0, rot: 0, tiers: [{ productId: 'xuc_xich_nuong', count: 5 }] },
  ] as never;

  it('đủ điều kiện + vắng 60 phút: cộng tiền vào két + thông báo có số khách', () => {
    useGame.setState({
      level: 30,
      furniture,
      lastSeenAt: Date.now() - 60 * 60_000,
      history: [{ day: 1, profit: 1_440_000, salesProfit: 1_440_000 }] as never,
    });
    const s0 = useGame.getState();
    const r = s0.collectOfflineRevenue();
    expect(r.reason).toBeNull();
    expect(r.gain).toBeGreaterThan(0);
    expect(r.customers).toBeGreaterThanOrEqual(1);
    expect(useGame.getState().money).toBe(s0.money + r.gain);
    // Không cộng XP/không cộng lượt sao: servedCounts giữ nguyên
    expect(useGame.getState().servedCounts).toEqual({});
  });

  it('lastSeenAt = 0 (ván mới) hoặc vừa rời < 5 phút: không thu', () => {
    useGame.setState({ level: 30, furniture, lastSeenAt: 0 });
    expect(useGame.getState().collectOfflineRevenue().gain).toBe(0);
    useGame.setState({ lastSeenAt: Date.now() - 2 * 60_000 });
    expect(useGame.getState().collectOfflineRevenue().reason).toContain('5 phút');
  });
});

describe('GĐ1531 tỉ lệ vắng mặt ≈ 5% tốc độ chơi thật', () => {
  it('1 phút thật vắng = 5% số phút game của 1 phút chơi thật', () => {
    const away = offlineRevenue({ ...base, awayMinutes: 60, level: 30 }).gain;
    const active = 60 * 60 * MINUTES_PER_SECOND * 1_000; // 60 phút chơi thật × 1.000đ/phút game
    expect(away / active).toBeCloseTo(0.05, 3);
  });
});
