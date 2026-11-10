import { describe, expect, it } from 'vitest';
import { preserveMorningTips, preserveTodoItems, rackInTheOpen, type PreserveJob } from '../data/preserve';
import { TODO_SOURCES } from '../data/todo';
import { rainSpell } from '../data/weather';

/**
 * GĐ Hệ1-L3 (SPEC-CHIEU-SAU §1.11) — THẺ SỔ ĐẦU NGÀY + rackRainAgenda + mốc unlockMap + mồi "Mới mở".
 * Mục tiêu chấp nhận: "Người chưa đọc hướng dẫn vẫn biết phải cất giàn" — thẻ Sổ đầu ngày + dải việc
 * hôm nay nhắc kèm GIỜ MƯA khi giàn đang phơi ngoài. THUẦN, không đổi kinh tế, golden 30 nguyên.
 */

const phoiJob = (over: Partial<PreserveJob> = {}): PreserveJob => ({
  id: 1, defId: 'ps_banh_trang', startDay: 40, sun: 0, covered: false, wet: 0, allHomegrown: false, ...over,
});

/** Giờ mưa "HH:MM" của cơn mưa ngày đó. */
const spillClock = (start: number) => `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;

describe('preserveMorningTips — thẻ Sổ đầu ngày (chỉ hiện khi có việc)', () => {
  it('không có mẻ / giàn không để ngoài / chưa tới dịp lễ → rỗng (UI ẩn thẻ)', () => {
    // day 20 (dayOfYear 19): không lễ nào trong cửa sổ đếm lùi 6 ngày → thẻ rỗng.
    expect(preserveMorningTips({ day: 20, seed: 1, weather: 'sunny', jobs: [] })).toEqual([]);
    expect(preserveMorningTips({ day: 20, seed: 1, weather: 'sunny', jobs: [phoiJob({ covered: true })] })).toEqual([]);
  });

  it('giàn đang phơi + hôm nay mưa → nhắc cất kèm giờ mưa (đặt lên đầu)', () => {
    const spell = rainSpell(11, 40, 'rain');
    expect(spell).not.toBeNull();
    const tips = preserveMorningTips({ day: 40, seed: 11, weather: 'rain', jobs: [phoiJob(), phoiJob(), phoiJob()] });
    expect(tips[0].icon).toBe('☂️');
    expect(tips[0].text).toContain(`Mưa ${spillClock(spell!.start)}`);
    expect(tips[0].text).toContain('3 nong đang phơi');
    expect(tips[0].text).toContain('cất kịp trước mưa');
  });

  it('mẻ đủ nắng chờ thu → dòng "đủ nắng — gỡ về để thu"', () => {
    const tips = preserveMorningTips({ day: 40, seed: 1, weather: 'sunny', jobs: [phoiJob({ sun: 2 })] });
    expect(tips.some((t) => t.icon === '✅' && t.text.includes('Bánh tráng phơi sương đủ nắng'))).toBe(true);
  });
});

describe('rackInTheOpen — đếm nong đang phơi ngoài giàn', () => {
  it('chỉ đếm mẻ phơi CHƯA cất', () => {
    expect(rackInTheOpen([phoiJob(), phoiJob({ covered: true })])).toHaveLength(1);
  });
});

describe('preserveTodoItems — Sổ việc chung nhắc trước mưa 90 phút (SPEC-TOI-UU §T6)', () => {
  it('giàn để ngoài + hôm nay mưa → việc có giờ "☔ HH:MM mưa — sân còn N nong đang phơi"', () => {
    const spell = rainSpell(11, 40, 'rain');
    const items = preserveTodoItems({ minutes: 6 * 60, day: 40, seed: 11, weather: 'rain', jobs: [phoiJob(), phoiJob(), phoiJob()] });
    const it = items.find((i) => i.id === 'rack-rain')!;
    expect(it.go).toEqual({ panel: 'garden' });
    // hiện TRƯỚC mưa 90 phút game
    expect(it.at).toBe(Math.max(0, spell!.start - 90));
    expect(it.until).toBe(spell!.end);
    expect(it.text).toBe(`☔ ${spillClock(spell!.start)} mưa — sân còn 3 nong đang phơi`);
    // dòng mưa không lặp hai lần trong Sổ đầu ngày
    expect(items.filter((i) => /mưa/i.test(i.text))).toHaveLength(1);
    expect(it.morning).toBe(true);
  });

  it('giàn cất hết / không mưa / mưa đã qua → không có việc mưa', () => {
    const rain = (a: Parameters<typeof preserveTodoItems>[0]) => preserveTodoItems(a).filter((i) => i.id === 'rack-rain');
    expect(rain({ minutes: 0, day: 40, seed: 11, weather: 'rain', jobs: [] })).toEqual([]);
    expect(rain({ minutes: 0, day: 40, seed: 11, weather: 'sunny', jobs: [phoiJob()] })).toEqual([]);
    const spell = rainSpell(11, 40, 'rain')!;
    expect(rain({ minutes: spell.end, day: 40, seed: 11, weather: 'rain', jobs: [phoiJob()] })).toEqual([]);
  });

  it('mẻ đủ nắng → việc Sổ đầu ngày (morning), mở bảng Trang trại', () => {
    const items = preserveTodoItems({ minutes: 0, day: 40, seed: 1, weather: 'sunny', jobs: [phoiJob({ sun: 2 })] });
    expect(items.some((i) => i.morning && i.text.includes('đủ nắng') && i.urgency === 'today')).toBe(true);
  });

  it('hệ tự đăng ký nguồn "preserve" (không sửa todayAgenda/MorningPanel)', () => {
    expect(typeof TODO_SOURCES.preserve).toBe('function');
  });
});
