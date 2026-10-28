import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import {
  daysAway, welcomeBackReward,
  WELCOME_BACK_CAP, WELCOME_BACK_MAX_DAYS, WELCOME_BACK_MIN_DAYS, WELCOME_BACK_PER_LEVEL_FLOOR,
} from '../data/gifts';

/**
 * Bộ test GĐ39 — "Chào mừng quay lại": thưởng giữ chân khi quay lại sau ≥2 ngày THẬT vắng mặt.
 *
 * Hợp đồng:
 * - daysAway(now, lastSeenAt): số ngày thật trôi qua (muốn tròn ngày); lastSeenAt thiếu/0/điêu → 0.
 * - welcomeBackReward(daysAway, level, avgProfit): 0 khi < MIN_DAYS; lump = round-thousand(
 *     max(avgProfit, level×PER_LEVEL_FLOOR) × min(daysAway, MAX_DAYS) ), trần CAP — chống lạm phát.
 * - checkWelcomeBack (store): đủ ngày mới thưởng + thông báo, luôn làm mới lastSeenAt; không thưởng
 *     kép khi còn chơi.
 * - Persistence: applySnapshot bù lastSeenAt=0 cho bản cũ; snapshot round-trip giữ giá trị.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-01-03T12:00:00Z').getTime();

describe('daysAway — đếm ngày thật, an toàn với dữ liệu xấu', () => {
  it('lastSeenAt thiếu/0 → 0 (ván mới, bản lưu cũ)', () => {
    expect(daysAway(NOW, 0)).toBe(0);
    expect(daysAway(NOW, -5)).toBe(0);
  });

  it('now bằng/trước lastSeenAt, hoặc now điêu → 0', () => {
    expect(daysAway(NOW, NOW)).toBe(0);
    expect(daysAway(NOW, NOW + DAY)).toBe(0);
    expect(daysAway(0, NOW)).toBe(0);
    expect(daysAway(-100, NOW)).toBe(0);
  });

  it('đếm nguyên ngày, làm tròn xuống ở chính biên', () => {
    expect(daysAway(NOW + 3 * DAY, NOW)).toBe(3); // đúng 3 ngày
    expect(daysAway(NOW + 3 * DAY - 1, NOW)).toBe(2); // dưới 3 ngày vài ms → 2
    expect(daysAway(NOW + 2 * DAY, NOW)).toBe(2); // đúng ở biên tối thiểu
    expect(daysAway(NOW + DAY + 1, NOW)).toBe(1); //  1 ngày + 1ms → vẫn 1
  });
});

describe('welcomeBackReward — 0 khi chưa đủ ngày; lump có tầng, tròn nghìn, trần', () => {
  it('chưa đủ WELCOME_BACK_MIN_DAYS ngày → 0, kể cả avgProfit lớn', () => {
    expect(welcomeBackReward(0, 50, 10_000_000)).toBe(0);
    expect(welcomeBackReward(1, 50, 10_000_000)).toBe(0);
    expect(welcomeBackReward(WELCOME_BACK_MIN_DAYS - 1, 50, 10_000_000)).toBe(0);
  });

  it('đúng 2 ngày thì > 0 (tiệm mới không cần có lịch sử lãi)', () => {
    const r = welcomeBackReward(WELCOME_BACK_MIN_DAYS, 1, 0);
    expect(r).toBeGreaterThan(0);
    expect(r % 1000).toBe(0);
  });

  it('tăng theo số ngày vắng (đến MAX thì chững, không phình thêm)', () => {
    const r2 = welcomeBackReward(2, 5, 20000);
    const r7 = welcomeBackReward(7, 5, 20000);
    const rMax = welcomeBackReward(WELCOME_BACK_MAX_DAYS, 5, 20000);
    const rBeyond = welcomeBackReward(99, 5, 20000);
    expect(r7).toBeGreaterThan(r2);
    expect(rMax).toBe(r7);
    expect(rBeyond).toBe(r7); // vắng lâu hơn hiệu lực tối đa → không thêm
  });

  it('dùng tầng theo cấp khi avgProfit = 0 (tiệm mới): tầng lớn hơn theo cấp', () => {
    expect(welcomeBackReward(2, 1, 0)).toBe(2 * WELCOME_BACK_PER_LEVEL_FLOOR);
    expect(welcomeBackReward(2, 10, 0)).toBe(2 * 10 * WELCOME_BACK_PER_LEVEL_FLOOR);
    expect(welcomeBackReward(2, 10, 0)).toBeGreaterThan(welcomeBackReward(2, 1, 0));
  });

  it('nền là max(avgProfit, levelFloor): avgProfit lớn hơn tầng thì dùng avgProfit', () => {
    const r = welcomeBackReward(2, 1, 3333); // max(3333, 2000) = 3333 → 6666 → tròn 7000
    expect(r).toBe(7000);
    expect(r % 1000).toBe(0);
  });

  it('trần WELCOME_BACK_CAP không bao giờ vượt dù avgProfit cực lớn', () => {
    expect(welcomeBackReward(WELCOME_BACK_MAX_DAYS, 1000, 500_000_000)).toBe(WELCOME_BACK_CAP);
    expect(welcomeBackReward(99, 1, 1_000_000_000)).toBe(WELCOME_BACK_CAP);
    expect(welcomeBackReward(7, 1, 100_000_000)).toBe(WELCOME_BACK_CAP);
  });

  it('đơn điệu không giảm khi ngày vắng / cấp / lãi tăng', () => {
    let prev = -1;
    for (let d = 0; d <= 12; d++) {
      const v = welcomeBackReward(d, 5, 20000);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    for (let l = 1; l <= 200; l++) {
      expect(welcomeBackReward(3, l, 0)).toBeGreaterThanOrEqual(welcomeBackReward(3, l - 1, 0));
    }
    for (let p = 0; p <= 50_000_000; p += 1_000_000) {
      expect(welcomeBackReward(3, 5, p)).toBeGreaterThanOrEqual(welcomeBackReward(3, 5, Math.max(0, p - 1_000_000)));
    }
  });
});

describe('checkWelcomeBack qua store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    useGame.setState({ ...newGameData(), money: 1000, message: null });
  });
  afterEach(() => vi.useRealTimers());

  it('vắng ≥ 2 ngày → thưởng tiền, thông báo, làm mới lastSeenAt', () => {
    useGame.setState({ lastSeenAt: NOW - 2 * DAY });
    const r = useGame.getState().checkWelcomeBack();
    const s = useGame.getState();
    expect(r).toBe(welcomeBackReward(2, 1, 0));
    expect(s.money).toBe(1000 + r);
    expect(s.totals.revenue).toBe(r); // tính vào tổng doanh thu như thu nhập
    expect(s.message).toContain('Chào mừng quay lại');
    expect(s.lastSeenAt).toBe(NOW);
  });

  it('về trong 2 ngày → KHÔNG thưởng, chỉ làm mới lastSeenAt', () => {
    useGame.setState({ lastSeenAt: NOW - DAY }); // 1 ngày
    const r = useGame.getState().checkWelcomeBack();
    const s = useGame.getState();
    expect(r).toBe(0);
    expect(s.money).toBe(1000);
    expect(s.totals.revenue).toBe(0);
    expect(s.message).toBeNull(); // không lên tiếng
    expect(s.lastSeenAt).toBe(NOW);
  });

  it('luôn làm mới lastSeenAt trong cả hai trường hợp', () => {
    useGame.setState({ lastSeenAt: NOW - 3 * DAY });
    useGame.getState().checkWelcomeBack();
    expect(useGame.getState().lastSeenAt).toBe(NOW);
    useGame.setState({ lastSeenAt: NOW - DAY });
    useGame.getState().checkWelcomeBack();
    expect(useGame.getState().lastSeenAt).toBe(NOW);
  });

  it('không thưởng kép khi vẫn đang chơi (lastSeenAt tươi → lần gọi sau < 2 ngày)', () => {
    useGame.setState({ lastSeenAt: NOW - 3 * DAY });
    const first = useGame.getState().checkWelcomeBack();
    useGame.setState({ money: 1000, totals: { ...useGame.getState().totals, revenue: 0 } }); // cô lập lần gọi 2
    const second = useGame.getState().checkWelcomeBack();
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);
    expect(useGame.getState().money).toBe(1000); // không cộng thêm lần hai
    expect(useGame.getState().totals.revenue).toBe(0);
  });
});

describe('persistence — lastSeenAt đi qua snapshot/applySnapshot', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('bản lưu cũ thiếu lastSeenAt → applySnapshot bù 0 (mặc định)', () => {
    const raw = { ...newGameData() } as Record<string, unknown>;
    delete raw.lastSeenAt;
    applySnapshot(raw as Parameters<typeof applySnapshot>[0]);
    expect(useGame.getState().lastSeenAt).toBe(0);
  });

  it('bản lưu có lastSeenAt → applySnapshot giữ nguyên giá trị', () => {
    applySnapshot({ ...newGameData(), lastSeenAt: 123_456_789 } as unknown as Parameters<typeof applySnapshot>[0]);
    expect(useGame.getState().lastSeenAt).toBe(123_456_789);
  });

  it('snapshot luôn ghi mốc thời gian hiện tại (giữ bản tươi khi chơi đều)', () => {
    const now = Date.now();
    const snap = snapshot();
    expect(snap.lastSeenAt).toBeGreaterThanOrEqual(now);
    expect(snap.lastSeenAt).toBeLessThanOrEqual(now + 5_000);
  });
});
