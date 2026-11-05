import { describe, expect, it } from 'vitest';
import { animalBuyPayback } from '../data/farmValue';
import type { GardenState } from '../data/garden';

const mkG = (buildings: any, pens: any): GardenState => ({
  land: 0, plots: [], pens: pens ?? {}, buildings: buildings ?? {},
  wood: 0, stone: 0, fence: 0, plantRight: 0,
} as any);

describe('animalBuyPayback', () => {
  it('gà đẻ, chưa nuôi, không bãi thả: lãi 1.764đ/con/ngày → hồi vốn ~57 ngày (đáng)', () => {
    // rev = 0.9 trứng/ngày = 0.09 vỉ × 39.600 (homegrown) = 3.564; cám 0.12kg × 15.000 = 1.800
    const bp = animalBuyPayback('chicken', mkG({}, {}));
    expect(bp.verdict).toBe('worth');
    expect(bp.perDay).toBe(1764);
    expect(bp.paybackDays).toBe(57);
    expect(bp.line).toContain('Lãi ~1.764đ/con/ngày (đã trừ cám)');
    expect(bp.line).toContain('hồi vốn ~57 ngày');
    expect(bp.line).toContain('(đáng)');
  });

  it('bãi thả 1 sao làm gà hồi vốn nhanh hơn: +8% trứng −10% cám → 45 ngày', () => {
    const bp = animalBuyPayback('chicken', mkG({ bai_tha: 1 }, {}));
    expect(bp.perDay).toBe(2229);
    expect(bp.paybackDays).toBe(45);
    expect(bp.paybackDays!).toBeLessThan(animalBuyPayback('chicken', mkG({}, {})).paybackDays!);
  });

  it('vịt đẻ lãi mỏng hơn giá: 2.520đ/ngày → hồi vốn 72 ngày → slow (chậm)', () => {
    const bp = animalBuyPayback('duck', mkG({}, {}));
    expect(bp.verdict).toBe('slow');
    expect(bp.perDay).toBe(2520);
    expect(bp.paybackDays).toBe(72);
    expect(bp.line).toContain('(chậm)');
  });

  it('bò sữa: lãi 63.700đ/ngày → hồi vốn 51 ngày (đáng)', () => {
    const bp = animalBuyPayback('cow', mkG({}, {}));
    expect(bp.verdict).toBe('worth');
    expect(bp.perDay).toBe(63700);
    expect(bp.paybackDays).toBe(51);
  });

  it('dê sữa: giá 3.8tr, lãi 51.120đ/ngày → 75 ngày → slow', () => {
    const bp = animalBuyPayback('goat', mkG({}, {}));
    expect(bp.verdict).toBe('slow');
    expect(bp.perDay).toBe(51120);
    expect(bp.paybackDays).toBe(75);
  });

  it('heo thịt (vỗ béo): thu hồi một lần khi xuất chuồng — payback = 12 ngày cho ăn', () => {
    // doanh thu 30kg × 45.600 = 1.368.000; chi = 700.000 giá + 12 × 26.000 cám = 1.012.000 → lãi 356.000/vụ
    const bp = animalBuyPayback('pig', mkG({}, {}));
    expect(bp.verdict).toBe('worth');
    expect(bp.perDay).toBe(29667);
    expect(bp.paybackDays).toBe(12);
    expect(bp.line).toContain('xuất chuồng sau 12 ngày cho ăn');
  });

  it('nhánh loss (biên tổng hợp bãi thả âm): lỗ → không có ngày hồi vốn, không khuyên mua', () => {
    const bp = animalBuyPayback('chicken', mkG({ bai_tha: -10 }, {}));
    expect(bp.verdict).toBe('loss');
    expect(bp.paybackDays).toBeNull();
    expect(bp.line).toContain('Chưa đáng');
    expect(bp.line).toContain('lỗ ~2.887đ/ngày');
  });

  it('thuần: hai lần gọi trên cùng state cho kết quả như nhau', () => {
    const g = mkG({ bai_tha: 1 }, { chicken: { count: 2 } });
    expect(animalBuyPayback('pig', g)).toEqual(animalBuyPayback('pig', g));
  });
});
