import { describe, expect, it } from 'vitest';
import { farmhandPayoff, FARMHAND_GATHER_MIN } from '../data/farmhandPayoff';
import { newGarden, type GardenState, type Pen, type Plot } from '../data/garden';
import { homegrownSell } from '../data/farmValue';

// GĐ2222 — phụ trại TỰ LO TRẠI mỗi tối đáng bao nhiêu: tưới luống khô, cho chuồng đói ăn,
// gom trứng vỉ + sữa + thu hoạch luống chín. Helper thuần đọc (không đổi state/sim/save),
// tất định (không RNG) — mọi khẳng định dùng số CHÍNH XÁC từ dữ liệu thật.

const fmt = (n: number) => n.toLocaleString('vi-VN');

/** Luống trồng cây id, đã lớn growth ngày, đã/chưa tưới hôm nay. */
const plot = (crop: string, growth: number, wateredDay: number): Plot => ({ crop, growth, wateredDay });
const pen = (count: number, fedDay: number, feedKg: number, pending: number): Pen => ({ count, fedDay, feedKg, pending });

const g = (p: Partial<GardenState>): GardenState => ({ ...newGarden(), ...p });

describe('GĐ2222 — farmhandPayoff (phụ trại tự lo trại tối nay)', () => {
  it('tưới: luống có cây chưa tưới hôm nay → đếm cần tưới', () => {
    const p = farmhandPayoff(g({ plots: [plot('rau_cai', 1, 10)] }), {}, 11);
    expect(p.watered).toBe(1);
    expect(p.fedPens).toBe(0);
    expect(p.ok).toBe(true);
  });

  it('luống đã tưới hôm nay → không đếm', () => {
    const p = farmhandPayoff(g({ plots: [plot('rau_cai', 1, 11)] }), {}, 11);
    expect(p.watered).toBe(0);
  });

  it('cho ăn: chuồng gà đói + kho đủ cám → đếm chuồng cần cho ăn', () => {
    // 3 gà, cần 3×0.12=0.36kg, máng 0 → cần 1 bao cám gà; kho có 5 bao.
    const p = farmhandPayoff(g({ pens: { chicken: pen(3, 10, 0, 0) } }), { cam_ga: 5 }, 11);
    expect(p.fedPens).toBe(1);
  });

  it('chuồng đói nhưng kho HẾT cám → không đếm là sẽ được cho ăn', () => {
    const p = farmhandPayoff(g({ pens: { chicken: pen(3, 10, 0, 0) } }), { cam_ga: 0 }, 11);
    expect(p.fedPens).toBe(0);
  });

  it('chuồng hôm nay ĐÃ cho ăn (fedDay=day) → không phải việc tối nay', () => {
    const p = farmhandPayoff(g({ pens: { chicken: pen(3, 11, 0, 0) } }), { cam_ga: 5 }, 11);
    expect(p.fedPens).toBe(0);
  });

  it('gom trứng đủ vỉ: 15 quả gà → 1 vỉ = 1 món trứng, giá homegrownSell', () => {
    const p = farmhandPayoff(g({ pens: { chicken: pen(3, 11, 0, 15) } }), {}, 11);
    expect(p.gatheredQty).toBe(1);
    expect(p.gatheredValue).toBe(homegrownSell('trung')); // 33000×1.2 = 39600
  });

  it('gom sữa: bò đang chờ 3 lốc → 3 món sữa tươi', () => {
    const p = farmhandPayoff(g({ pens: { cow: pen(1, 11, 0, 3) } }), {}, 11);
    expect(p.gatheredQty).toBe(3);
    expect(p.gatheredValue).toBe(3 * homegrownSell('sua_tuoi')); // 3×45600
  });

  it('trứng chưa đủ vỉ (9 quả) → chưa gom (không bịa vỉ lẻ)', () => {
    const p = farmhandPayoff(g({ pens: { chicken: pen(3, 11, 0, 9) } }), {}, 11);
    expect(p.gatheredQty).toBe(0);
    expect(p.gatheredValue).toBe(0);
  });

  it('thu hoạch luống chín: rau cải 8 món × homegrownSell(rau)', () => {
    // rau_cải days=3, growth 3 → chín; yieldQty 8.
    const p = farmhandPayoff(g({ plots: [plot('rau_cai', 3, 11)] }), {}, 11);
    expect(p.gatheredQty).toBe(8);
    expect(p.gatheredValue).toBe(8 * homegrownSell('rau')); // 8×19200 = 153600
  });

  it('luống chưa chín → không thu hoạch', () => {
    const p = farmhandPayoff(g({ plots: [plot('rau_cai', 2, 11)] }), {}, 11);
    expect(p.gatheredQty).toBe(0);
  });

  it('trại rỗng (không luống, không chuồng) → ok:false, dòng rỗng', () => {
    const p = farmhandPayoff(newGarden(), {}, 11);
    expect(p.ok).toBe(false);
    expect(p.line).toBe('');
  });

  it('line ≤ 90 ký tự, nêu hoạt động + giá trị đ (khi gom đủ ngưỡng)', () => {
    const p = farmhandPayoff(g({
      plots: [plot('rau_cai', 3, 10)],
      pens: { chicken: pen(3, 10, 0, 15) },
    }), { cam_ga: 5 }, 11);
    expect(p.ok).toBe(true);
    expect(p.line.length).toBeLessThanOrEqual(90);
    expect(p.line).toContain('tưới 1 luống');
    expect(p.line).toContain('cho ăn 1 chuồng');
    expect(p.line).toContain('gom/thu');
    expect(p.line).toContain(fmt((8 * homegrownSell('rau')) + homegrownSell('trung')));
  });

  it('chỉ tưới (không gom giá trị ≥ ngưỡng) → vẫn ok nhưng không kể tiền', () => {
    const p = farmhandPayoff(g({ plots: [plot('rau_cai', 1, 10)] }), {}, 11);
    expect(p.ok).toBe(true);
    expect(p.gatheredValue).toBeLessThan(FARMHAND_GATHER_MIN);
    expect(p.line).not.toContain('≈');
  });
});
