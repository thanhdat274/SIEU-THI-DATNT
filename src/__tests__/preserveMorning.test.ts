import { describe, expect, it } from 'vitest';
import { preserveMorningTips, rackInTheOpen, type PreserveJob } from '../data/preserve';
import { rackRainAgenda, todayAgenda } from '../data/todayAgenda';
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

describe('rackRainAgenda — dải việc hôm nay nhắc trước mưa 90 phút', () => {
  it('giàn để ngoài + hôm nay mưa → chip "☔ HH:MM mưa — sân còn N nong đang phơi"', () => {
    const spell = rainSpell(11, 40, 'rain');
    const items = rackRainAgenda({ minutes: 6 * 60, day: 40, seed: 11, weather: 'rain', jobs: [phoiJob(), phoiJob(), phoiJob()] });
    expect(items).toHaveLength(1);
    const it = items[0];
    expect(it.key).toBe('rack-rain');
    expect(it.panel).toBe('garden');
    // hiện TRƯỚC mưa 90 phút game
    expect(it.atMinutes).toBe(Math.max(0, spell!.start - 90));
    expect(it.untilMinutes).toBe(spell!.end);
    expect(it.label).toBe(`☔ ${spillClock(spell!.start)} mưa — sân còn 3 nong đang phơi`);
  });

  it('giàn cất hết / không mưa / mưa đã qua → không chip', () => {
    expect(rackRainAgenda({ minutes: 0, day: 40, seed: 11, weather: 'rain', jobs: [] })).toEqual([]);
    expect(rackRainAgenda({ minutes: 0, day: 40, seed: 11, weather: 'sunny', jobs: [phoiJob()] })).toEqual([]);
    const spell = rainSpell(11, 40, 'rain')!;
    expect(rackRainAgenda({ minutes: spell.end, day: 40, seed: 11, weather: 'rain', jobs: [phoiJob()] })).toEqual([]);
  });

  it('nối vào todayAgenda: không mẻ phơi → không chip (dải cũ không đổi)', () => {
    const items = todayAgenda({ minutes: 0, day: 40, seed: 11, weather: 'rain', level: 40, regulars: {} });
    expect(items.some((i) => i.key === 'rack-rain')).toBe(false);
  });
});
