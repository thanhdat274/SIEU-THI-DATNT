import { describe, expect, it } from 'vitest';
import { farmhandPreserve, phoiReady, preserveDefById, type PreserveJob } from '../data/preserve';
import { farmhandPayoff } from '../data/farmhandPayoff';
import { homegrownSell } from '../data/farmValue';
import { productById } from '../data/products';
import { nextWeather } from '../data/weather';
import { newGarden, type GardenState } from '../data/garden';

/**
 * GĐ Hệ1-L4 (SPEC-CHIEU-SAU §1.8/1.11) — PHỤ TRẠI TỰ CẤT/THU SÂN PHƠI + cập nhật farmhandPayoff.
 * Chấp nhận: "Thẻ payoff hiện đúng số tiền cứu được". THUẦN — `farmhandPreserve` tất định từ
 * `nextWeather` (chuỗi Markov R5, không simRng) → golden 30 vẫn nguyên (cấp 30 < PHOI_UNLOCK 34).
 */

const banhTrang = 'ps_banh_trang'; // hx_banh_trang, outputQty 5, need 2 nắng
const job = (over: Partial<PreserveJob> = {}): PreserveJob => ({
  id: 1, defId: banhTrang, startDay: 40, sun: 0, covered: false, wet: 0, allHomegrown: false, ...over,
});
const def = preserveDefById(banhTrang);
const batchVal = (homegrown: boolean) => Math.round((homegrown ? homegrownSell(def.outputId) : productById(def.outputId).sell) * def.outputQty);

describe('farmhandPreserve — phụ trại lo sân phơi hộ mỗi tối', () => {
  it('không mẻ phơi → không việc (jobs nguyên, không news, rackLog mặc định)', () => {
    const r = farmhandPreserve({ jobs: [], day: 40, seed: 1, weather: 'sunny' });
    expect(r.picked).toEqual([]);
    expect(r.news).toEqual([]);
    expect(r.jobs).toEqual([]);
  });

  it('thu mẻ đủ nắng đem vào kèm nhãn theo allHomegrown; mẻ dở để nguyên', () => {
    const ready = job({ id: 1, sun: 2, allHomegrown: true });
    const notReady = job({ id: 2, sun: 1 });
    const r = farmhandPreserve({ jobs: [ready, notReady], day: 40, seed: 1, weather: 'sunny' });
    expect(r.picked).toEqual([{ productId: def.outputId, qty: def.outputQty, homegrown: true }]);
    expect(r.jobs).toHaveLength(1);
    expect(r.jobs[0].id).toBe(2); // mẻ dở còn lại
    expect(r.news[0]).toContain('gỡ 1 nong phơi đủ nắng');
  });

  it('trời MAI có mưa/giông → cất mẻ còn phơi dở (covered=true) + rackLog kín; tạnh → mang ra', () => {
    // chọn seed/ngày sao cho nextWeather hôm sau là mưa/giông
    let wetSeed = -1, wetDay = -1;
    for (let s = 1; s < 60 && wetSeed < 0; s++)
      for (let d = 30; d < 200; d++)
        if (['rain', 'storm'].includes(nextWeather(s, d + 1, 'sunny'))) { wetSeed = s; wetDay = d; break; }
    expect(wetSeed).toBeGreaterThan(0);
    const wetTmr = nextWeather(wetSeed, wetDay + 1, 'sunny');
    const a = farmhandPreserve({ jobs: [job({ sun: 1 })], day: wetDay, seed: wetSeed, weather: 'sunny' });
    expect(a.jobs[0].covered).toBe(true);
    expect(a.rackLog.out).toEqual([]);
    expect(a.rackLog.day).toBe(wetDay + 1);
    expect(a.news.some((n) => n.includes('cất'))).toBe(true);

    const drySeed = wetSeed + 1;
    const b = farmhandPreserve({ jobs: [job({ sun: 1 })], day: wetDay, seed: drySeed, weather: 'sunny' });
    expect(b.jobs[0].covered).toBe(false);
    expect(b.rackLog.out).toEqual([[0, 1440]]);
    expect(b.news.some((n) => n.includes('mang'))).toBe(true);
  });
});

describe('farmhandPayoff — Hệ 1 L4: tiền "cứu được" của phụ trại có đúng số phơi', () => {
  const g = (jobs: PreserveJob[]): GardenState => ({ ...newGarden(), preserveJobs: jobs });

  it('thu mẻ chín đúng cả giá nhà trồng lẫn giá thường', () => {
    const p = farmhandPayoff(g([job({ sun: 2, allHomegrown: true })]), {}, 40);
    expect(p.preserveGathered).toBe(1);
    expect(p.gatheredValue).toBe(batchVal(true));
    expect(p.gatheredQty).toBe(1);
    expect(p.ok).toBe(true);
  });

  it('mẻ dở mà MAI GIÔNG → cất giùm cứu đúng giá mẻ (preserveSavedValue), dòng nêu món phơi', () => {
    let stormSeed = -1, stormDay = -1;
    for (let s = 1; s < 80 && stormSeed < 0; s++)
      for (let d = 30; d < 400; d++)
        if (nextWeather(s, d + 1, 'sunny') === 'storm') { stormSeed = s; stormDay = d; break; }
    expect(stormSeed).toBeGreaterThan(0);
    const p = farmhandPayoff(g([job({ sun: 1, allHomegrown: false })]), {}, stormDay, { seed: stormSeed, weather: 'sunny' });
    expect(p.preserveSavedValue).toBe(batchVal(false));
    expect(p.ok).toBe(true);
    expect(p.line).toContain('cất giùm 1 mẻ phơi');
  });

  it('mais không giông (mưa thường) → chưa có tiền "cứu" (chỉ thu mẻ chín), không thổi phồng', () => {
    let rainSeed = -1, rainDay = -1;
    for (let s = 1; s < 80 && rainSeed < 0; s++)
      for (let d = 30; d < 400; d++)
        if (nextWeather(s, d + 1, 'sunny') === 'rain') { rainSeed = s; rainDay = d; break; }
    expect(rainSeed).toBeGreaterThan(0);
    const p = farmhandPayoff(g([job({ sun: 1 })]), {}, rainDay, { seed: rainSeed, weather: 'sunny' });
    expect(p.preserveSavedValue).toBe(0);
    expect(p.preserveGathered).toBe(0);
  });

  it('không truyền seed/weather → không đo được thời tiết mai: chỉ tính gom, không kể tiền cứu giông', () => {
    const p = farmhandPayoff(g([job({ sun: 1 })]), {}, 40);
    expect(p.preserveSavedValue).toBe(0);
  });

  it('trại rỗng vẫn ok:false dòng rỗng (không đổi hành vi cũ)', () => {
    const p = farmhandPayoff(newGarden(), {}, 40);
    expect(p.ok).toBe(false);
    expect(p.line).toBe('');
  });
});
