import { describe, expect, it } from 'vitest';
import { returnReminder } from '../data/returnReminder';
import { yearReward, yearEnd, yearOf } from '../data/yearReport';
import { formatMoney } from '../data/products';

// GĐ2224 — lớp nhắc "đã N ngày chưa quay" (màn đăng nhập), nối vào mốc thưởng tròn năm.
// THUẦN đọc từ lastSeenAt (real thời gian) + day/level có sẵn: không đụng state/save/sim/seed.
// Mọi khẳng định từ đúng daysAway (floor nguyên ngày) và yearReward/yearEnd (yearReport).

const DAY_MS = 86_400_000;
const now = 1_800_000_000_000; // mốc fake ổn định

describe('GĐ2224 — returnReminder (đã N ngày chưa quay · nối thưởng tròn năm)', () => {
  it('chơi đều (vắng < 1 ngày thật) → null, không nhắc phiền', () => {
    // lastSeenAt chỉ 12h trước → daysAway 0
    const r = returnReminder(now, now - 12 * 3_600_000, 100, 30);
    expect(r).toBeNull();
  });

  it('vắng đúng 1 ngày thật → nhắc, kể số ngày chưa quay', () => {
    const r = returnReminder(now, now - DAY_MS, 100, 30);
    expect(r).not.toBeNull();
    expect(r!.daysAway).toBe(1);
    expect(r!.line).toContain('1 ngày chưa quay');
  });

  it('vắng 5 ngày, còn 10 ngày game tới hết năm → nêu thưởng tròn năm theo công thức', () => {
    // gameDay 355 năm 1 → yearEnd(1)=365 → còn 10 ngày (≤14 tầm nhắc)
    const r = returnReminder(now, now - 5 * DAY_MS, 355, 30);
    expect(r!.kind).toBe('year');
    expect(r!.gameDaysToYearEnd).toBe(10);
    expect(r!.line).toContain('thưởng tròn năm');
    expect(r!.line).toContain(formatMoney(yearReward(30))); // 30 → 250k + 450k = 700.000đ
    expect(r!.line).toContain('10 ngày nữa');
  });

  it('còn đúng 0 ngày game (hết năm hôm nay) vẫn nêu thưởng tròn năm', () => {
    const lastDay = yearEnd(1); // 365
    const r = returnReminder(now, now - 2 * DAY_MS, lastDay, 10);
    expect(r!.kind).toBe('year');
    expect(r!.gameDaysToYearEnd).toBe(0);
  });

  it('còn xa mốc năm (giữa năm) → nhắc cơ bản, không bịa thưởng', () => {
    const r = returnReminder(now, now - 3 * DAY_MS, 100, 30);
    expect(r!.kind).toBe('plain');
    expect(r!.line).toContain('3 ngày chưa quay');
    expect(r!.line).not.toContain('thưởng tròn năm'); // không nêu đúng số tiền khi mốc còn xa — tránh bịa mục tiêu
  });

  it('line luôn ≤ 90 ký tự (giới hạn HUD/cảnh báo) với cấp cao nhất', () => {
    const r = returnReminder(now, now - 9 * DAY_MS, yearEnd(yearOf(300)) - 4, 100);
    expect(r!.line.length).toBeLessThanOrEqual(90);
    expect(r!.line.startsWith('🐢 Đã')).toBe(true);
  });
});
