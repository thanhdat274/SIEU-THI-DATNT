import { describe, it, expect } from 'vitest';
import { categoryMix } from '../data/categoryMix';
import type { ItemHealth } from '../data/analytics';
import type { Category } from '../data/products';

const item = (id: string, profit30: number, revenue30: number): ItemHealth =>
  ({ id, name: id, profit30, revenue30, qty30: 0, profit21: 0, margin: 0, dailyQty: 0, daysLeft: null, spoilShare: 0, lostShare: 0, abc: 'C' }) as ItemHealth;

const cat: Record<string, Category> = { gao: 'dry', banh: 'dry', nuoc: 'drink', mi: 'frozen' };
const categoryOf = (id: string) => cat[id] ?? 'dry';

describe('categoryMix — gộp lời 30 ngày theo khu hàng', () => {
  it('gộp đúng lời/doanh thu theo category và xếp giảm dần', () => {
    const r = categoryMix([
      item('gao', 200_000, 1_000_000),
      item('banh', -10_000, 50_000), // cùng khu khô với gao
      item('nuoc', 50_000, 400_000),
    ], categoryOf);
    const dry = r.lines.find((l) => l.category === 'dry')!;
    const drink = r.lines.find((l) => l.category === 'drink')!;
    expect(dry.itemCount).toBe(2);
    expect(dry.profit30).toBe(190_000);
    expect(drink.profit30).toBe(50_000);
    // xếp giảm dần: khô (190k) đứng trên uống (50k)
    expect(r.lines[0].category).toBe('dry');
    expect(r.lines[0].profit30).toBeGreaterThan(r.lines[1].profit30);
    expect(r.best?.category).toBe('dry');
  });

  it('margin = lời/doanh thu của cả khu', () => {
    const r = categoryMix([item('gao', 190_000, 950_000)], categoryOf);
    expect(r.lines[0].margin).toBeCloseTo(190_000 / 950_000, 5);
  });

  it('nhận diện khu đang LỖ 30 ngày và khu tệ nhất (âm)', () => {
    const r = categoryMix([
      item('gao', 200_000, 1_000_000),
      item('nuoc', 30_000, 300_000),
      item('mi', -40_000, 20_000), // khu đông lạnh lỗ
    ], categoryOf);
    expect(r.losing.map((l) => l.category)).toEqual(['frozen']);
    expect(r.worst?.category).toBe('frozen');
    expect(r.worst!.profit30).toBe(-40_000);
    expect(r.totalProfit30).toBe(190_000);
  });

  it('danh sách rỗng → không khu nào', () => {
    const r = categoryMix([], categoryOf);
    expect(r.lines).toEqual([]);
    expect(r.best).toBeNull();
    expect(r.worst).toBeNull();
    expect(r.losing).toEqual([]);
  });

  it('nhãn khu lấy từ CATEGORIES', () => {
    const r = categoryMix([item('nuoc', 10_000, 100_000)], categoryOf);
    expect(r.lines[0].label).toBe('Đồ uống');
  });
});
