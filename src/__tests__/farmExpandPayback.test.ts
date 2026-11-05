import { describe, expect, it } from 'vitest';
import { farmExpandPayback } from '../data/farmValue';

// GĐ1248 — "Mở rộng đất trại 15–40tr hồi vốn bao lâu?" (soi quyết định mua thêm đất,
// song song tiemXoiExpandPayback GĐ1247 / branchBuildPayback). Helper thuần đọc.
// Các giá trị khớp LAND_TIERS + bestCrop trong tầm cấp (đã trừ giống, đúng mùa ×1,5).

describe('GĐ1248 farmExpandPayback — hồi vốn mở rộng đất trại', () => {
  const land0 = { land: 0, plots: Array.from({ length: 4 }) } as any; // 4 luống → mua tier1 (8 luống)
  const land1 = { land: 1, plots: Array.from({ length: 8 }) } as any; // 8 luống → mua tier2 (12 luống)

  it('cấp 1: giống hời nhất rau cải 37.867/luống/ngày ×4 luống mới = 151.468/ngày → hồi 100 ngày (chậm)', () => {
    const fb = farmExpandPayback(land0, 1, 5);
    expect(fb!.tierName).toBe('Mua thêm đất phía sau');
    expect(fb!.cost).toBe(15_000_000);
    expect(fb!.extraPlots).toBe(4);
    expect(fb!.perPlotPerDay).toBe(37_867);
    expect(fb!.netPerDay).toBe(151_468);
    expect(fb!.paybackDays).toBe(100);
    expect(fb!.verdict).toBe('slow');
  });

  it('cấp 20: mở cây ăn trái lâu năm 88.267/luống/ngày ×4 = 353.068/ngày → hồi 43 ngày (đáng)', () => {
    const fb = farmExpandPayback(land0, 20, 5);
    expect(fb!.perPlotPerDay).toBe(88_267);
    expect(fb!.netPerDay).toBe(353_068);
    expect(fb!.paybackDays).toBe(43);
    expect(fb!.verdict).toBe('worth');
  });

  it('đất tier2 "Trang trại đầu ngõ" 40tr với 4 luống mới → hồi 114 ngày (chậm, giá đắt hơn)', () => {
    const fb = farmExpandPayback(land1, 38, 5);
    expect(fb!.tierName).toBe('Trang trại đầu ngõ');
    expect(fb!.cost).toBe(40_000_000);
    expect(fb!.extraPlots).toBe(4);
    expect(fb!.netPerDay).toBe(353_068);
    expect(fb!.paybackDays).toBe(114);
    expect(fb!.verdict).toBe('slow');
  });

  it('đã rộng nhất (land = 2) → null, không dự toán', () => {
    const maxed = { land: 2, plots: Array.from({ length: 12 }) } as any;
    expect(farmExpandPayback(maxed, 38, 5)).toBeNull();
  });

  it('cấp 0 chưa mở giống nào → nodata (paybackDays null)', () => {
    const fb = farmExpandPayback(land0, 0, 5);
    expect(fb!.verdict).toBe('nodata');
    expect(fb!.netPerDay).toBe(0);
    expect(fb!.paybackDays).toBeNull();
  });

  it('tính thuần + tất định: hai lần gọi cùng state cho kết quả y hệt', () => {
    const a = farmExpandPayback(land0, 20, 5);
    const b = farmExpandPayback(land0, 20, 5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(b!.verdict).toBe('worth');
  });
});
