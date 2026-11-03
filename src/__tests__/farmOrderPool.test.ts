import { describe, expect, it } from 'vitest';
import { ANIMALS, CROPS, FARM_ORDER_POOL, cropById, farmOrderCapacity, farmOrderProduce } from '../data/garden';

describe('GĐ1100 — đơn quán xóm lấy thêm trái cây nhà (chanh dây/nhãn/mít)', () => {
  it('pool đơn gồm 3 trái cây mới nối cuối, giữ nguyên 14 món cũ đúng thứ tự (bảo toàn RNG)', () => {
    const old14 = ['trung', 'trung_vit', 'trung_goos', 'sua_tuoi', 'sua_de', 'rau', 'bap', 'mia', 'traicay', 'x_chuoi', 'x_vai', 'x_buoi', 'x_thit_heo', 'thit_ga_dt'];
    expect(FARM_ORDER_POOL.slice(0, 14)).toEqual(old14);
    expect(FARM_ORDER_POOL.slice(14)).toEqual(['x_chanh_day', 'x_nhan', 'x_mit']);
    expect(new Set(FARM_ORDER_POOL).size).toBe(FARM_ORDER_POOL.length);
  });

  it('3 trái cây mới đều mở > mốc golden 30 (không lọt sim cấp 30)', () => {
    for (const id of ['chanhday', 'nhan', 'mit']) {
      const c = cropById(id);
      expect(c.unlock).toBeGreaterThan(30);
      expect(FARM_ORDER_POOL).toContain(c.productId);
    }
  });

  it('farmOrderProduce chỉ trả món trại kịp làm ≥3 — trái cây mới không rơi vào đơn khi không trồng', () => {
    // trại trống: không món nào trong pool được trả (kể cả trái cây mới)
    const emptyGarden = { plots: [], landTier: 0, pens: {} } as never;
    const produce = farmOrderProduce(emptyGarden);
    for (const id of ['x_chanh_day', 'x_nhan', 'x_mit']) {
      expect(produce).not.toContain(id);
    }
  });

  it('trồng chanh dây đủ chín kịp hạn đơn → x_chanh_day vào danh sách đơn được (kênh bán mới có thật)', () => {
    const g = {
      plots: Array.from({ length: 4 }, () => ({ crop: 'chanhday', growth: 5, wateredDay: 1 })),
      landTier: 0, pens: {},
    } as never;
    const cap = farmOrderCapacity(g);
    expect((cap['x_chanh_day'] ?? 0)).toBeGreaterThanOrEqual(3);
    expect(farmOrderProduce(g)).toContain('x_chanh_day');
    // nhãn/mít chưa trồng thì không vào
    expect(farmOrderProduce(g)).not.toContain('x_nhan');
  });

  it('mọi sản phẩm trong pool đều là nông sản nhà có thật (CROPS/ANIMALS)', () => {
    const homegrown = new Set([
      ...CROPS.map((c) => c.productId),
      ...Object.values(ANIMALS).map((a) => a.productId),
    ]);
    for (const id of FARM_ORDER_POOL) expect(homegrown.has(id)).toBe(true);
  });
});
