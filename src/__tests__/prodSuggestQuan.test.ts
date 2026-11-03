import { describe, expect, it } from 'vitest';
import { prodSuggestToday, quanMenuCropNeeds, type ProdSuggestArgs } from '../data/prodSuggest';
import { CROPS, cropById } from '../data/garden';
import { quanRecipeById } from '../data/quanRecipes';

const baseArgs = (over: Partial<ProdSuggestArgs> = {}): ProdSuggestArgs => ({
  level: 45,
  day: 150, // tháng 6 — vải đúng mùa (5–7)
  hot: [],
  storage: {},
  quanNuocOpen: true,
  quanNuocShort: false,
  stationOpen: () => false,
  branch: null,
  ...over,
});

describe('GĐ1101 — gợi ý "trồng để pha": nối thực đơn quán nước với cây trồng', () => {
  it('quanMenuCropNeeds nhận đúng giống từ món đã mở (vải của Trà vải, ổi/chuối của sinh tố)', () => {
    const needs = quanMenuCropNeeds(['tra_vai', 'sinh_to_oi', 'sinh_to_chuoi'], 45);
    expect(needs.has('vai')).toBe(true);
    expect(needs.has('oi')).toBe(true);
    expect(needs.has('chuoi')).toBe(true);
    // nguyên liệu mua ngoài (trà túi, sữa đặc, đá) không phải giống → không lọt
    expect(needs.has('tra')).toBe(false);
    expect(needs.size).toBe(3);
  });

  it('lọc món chưa mở: cấp 33 chưa có Trà vải (mở 34) → không nhu cầu vải', () => {
    expect(quanMenuCropNeeds(['tra_vai'], 33).has('vai')).toBe(false);
    expect(quanMenuCropNeeds(['tra_vai'], 34).has('vai')).toBe(true);
  });

  it('menu rỗng/không truyền → tập rỗng (hành vi cũ giữ nguyên)', () => {
    expect(quanMenuCropNeeds(undefined, 45).size).toBe(0);
    expect(quanMenuCropNeeds([], 45).size).toBe(0);
  });

  it('"Nên trồng" nhắc lý do thực đơn quán khi kho vải thiếu & đang mùa & món đã lên menu', () => {
    const day = 150; // tháng 6: vải mùa 5–7
    // đầy kho mọi nông sản khác để các gợi ý kệ-thiếu không chiếm 2 suất MAX_EACH
    const storage: Record<string, number> = {};
    for (const c of CROPS) if (c.productId !== 'x_vai') storage[c.productId] = 99;
    const s = prodSuggestToday(baseArgs({ day, quanMenu: ['tra_vai'], storage }));
    const vai = cropById('vai');
    const line = s.find((x) => x.panel === 'garden' && x.label === vai.name);
    expect(line).toBeDefined();
    expect(line!.detail).toContain('thực đơn quán cần để pha');
  });

  it('không lên menu thì không có lý do quán (chỉ kệ thiếu)', () => {
    const storage: Record<string, number> = {};
    for (const c of CROPS) if (c.productId !== 'x_vai') storage[c.productId] = 99;
    const s = prodSuggestToday(baseArgs({ day: 150, storage }));
    const line = s.find((x) => x.panel === 'garden' && x.label === cropById('vai').name);
    if (line) expect(line.detail).not.toContain('thực đơn quán');
  });

  it('món trong menu nhưng cây trái mùa → không gợi ý trồng (trái cây mua được)', () => {
    // vải mùa 5–7; day 0 = tháng 1 — trái mùa
    const s = prodSuggestToday(baseArgs({ day: 0, quanMenu: ['tra_vai'] }));
    expect(s.find((x) => x.panel === 'garden' && x.label === cropById('vai').name)).toBeUndefined();
  });
});
