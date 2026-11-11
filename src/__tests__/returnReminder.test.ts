import { describe, expect, it } from 'vitest';
import { returnNudge, returnNudgeWeek, returnReminder } from '../data/returnReminder';
import { yearReward, yearEnd, yearOf } from '../data/yearReport';
import { formatMoney } from '../data/products';
import { emptyWeek, weeklyChallenge, WEEK_DAYS, type WeekTally } from '../data/bizWeeks';

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
    expect(r!.line).toContain('9 ngày chưa quay');
  });

  // ── GĐ2225 — mở rộng: ngoài thưởng tròn năm, còn nối sự kiện mùa + mốc niên giám mùa ──
  it('GĐ2225 — đang trong tuần sự kiện mùa → nêu mùa + giá trị mỗi sao (SEASON_REWARD_PER_STAR)', () => {
    // day 103 thuộc cửa sổ Xuân (102–106): daysLeft = 106 − 102 = 4
    const items = returnNudge(now, now - 2 * DAY_MS, 103, 30);
    const s = items.find((i) => i.key === 'season');
    expect(s).toBeDefined();
    expect(s!.text).toContain('Lễ hội Xuân');
    expect(s!.text).toContain('4 ngày');
    expect(s!.text).toContain('≈25.000đ'); // SEASON_REWARD_PER_STAR định dạng vi-VN
  });

  it('GĐ2225 — mốc niên giám còn gần (cách ≤3 sao) → nêu mốc + thưởng', () => {
    // total 14 sao, mốc đầu tiên 15 → cách 1 sao; day 100 không năm/mùa gần
    const items = returnNudge(now, now - 4 * DAY_MS, 100, 30, 14, []);
    const a = items.find((i) => i.key === 'almanac');
    expect(a).toBeDefined();
    expect(a!.text).toContain('mốc niên giám 15 sao');
    expect(a!.text).toContain(formatMoney(330_000)); // almanacMilestoneReward(15,30) = 150k+150k+30k = 330.000đ
  });

  it('GĐ2225 — mốc niên giám còn xa (cách >3 sao) → không nêu, rơi về nhắc cơ bản', () => {
    const items = returnNudge(now, now - 4 * DAY_MS, 100, 30, 20, [15]); // mốc 30 còn cách 10
    expect(items.find((i) => i.key === 'almanac')).toBeUndefined();
    expect(items[0].key).toBe('plain');
  });

  // ── GĐ2226 — nhắc deadline thử thách tuần ở màn đăng nhập (mốc quay lại ngắn hạn) ──
  it('GĐ2226 — giữa tuần, đang hụt mục tiêu → nhắc deadline + thiếu + thưởng theo đúng thử thách', () => {
    const wk = returnNudgeWeek(now, now - 2 * DAY_MS, 4, 10, emptyWeek(1), []);
    expect(wk).not.toBeNull();
    const ch = weeklyChallenge(Math.ceil(4 / WEEK_DAYS), 10);
    const target = ch.target(10, []);
    expect(wk!.text).toContain('còn ~4 ngày'); // day 4 → WEEK_DAYS − 3
    expect(wk!.text).toContain(target.toLocaleString('vi-VN'));
    expect(wk!.text).toContain(`"${ch.title}"`);
    expect(wk!.text).toContain(formatMoney(ch.reward(10)));
  });

  it('GĐ2226 — chưa có sổ tuần (week null) → null', () => {
    expect(returnNudgeWeek(now, now - 2 * DAY_MS, 4, 10, null, [])).toBeNull();
  });

  it('GĐ2226 — đã đạt mục tiêu tuần này → null', () => {
    const ch = weeklyChallenge(Math.ceil(4 / WEEK_DAYS), 10);
    const t = ch.target(10, []);
    const fake: WeekTally = ch.measure === 'revenue'
      ? { ...emptyWeek(1), revenue: t }
      : { ...emptyWeek(1), [ch.measure]: t };
    expect(returnNudgeWeek(now, now - 2 * DAY_MS, 4, 10, fake, [])).toBeNull();
  });

  it('GĐ2226 — chơi đều (vắng < 1 ngày) → null', () => {
    expect(returnNudgeWeek(now, now - 12 * 3_600_000, 4, 10, emptyWeek(1), [])).toBeNull();
  });
});
