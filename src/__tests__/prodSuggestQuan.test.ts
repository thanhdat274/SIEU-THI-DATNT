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

describe('GĐ1110 — gợi ý "nuôi lấy sữa" khi thực đơn quán cần sữa tươi', () => {
  it('menu có Bạc xỉu (dùng sữa tươi) + kho sữa cạn → gợi ý nuôi Bò sữa', () => {
    const s = prodSuggestToday(baseArgs({ quanMenu: ['bac_xiu'] }));
    const line = s.find((x) => x.panel === 'garden' && x.label === 'Bò sữa');
    expect(line).toBeDefined();
    expect(line!.detail).toContain('thực đơn quán cần để pha');
  });

  it('đủ sữa (≥8) hoặc menu không có món sữa → không gợi ý', () => {
    expect(prodSuggestToday(baseArgs({ quanMenu: ['bac_xiu'], storage: { sua_tuoi: 9 } })).find((x) => x.label === 'Bò sữa')).toBeUndefined();
    expect(prodSuggestToday(baseArgs({ quanMenu: ['tra_vai'] })).find((x) => x.label === 'Bò sữa')).toBeUndefined();
    expect(prodSuggestToday(baseArgs({ quanMenu: undefined })).find((x) => x.label === 'Bò sữa')).toBeUndefined();
  });

  it('món sữa chưa mở cấp (Bạc xỉu mở 33, cấp 32) → không gợi ý', () => {
    expect(prodSuggestToday(baseArgs({ level: 32, quanMenu: ['bac_xiu'] })).find((x) => x.label === 'Bò sữa')).toBeUndefined();
  });
});

describe('GĐ1114 — gợi ý "nhập ngay" cho nguyên liệu mua ngoài của thực đơn quán', () => {
  it('menu có Trà vải, kho trà/đá cạn → gợi ý nhập (không gợi nguyên liệu nhà trồng ở khối này)', () => {
    const storage: Record<string, number> = { x_vai: 50, x_duong: 99 }; // đường đủ → suất MAX_EACH cho trà + đá
    for (const c of CROPS) if (c.productId !== 'x_vai') storage[c.productId] = 99; // chừa chỗ MAX_EACH cho gợi ý nhập
    const s = prodSuggestToday(baseArgs({ quanMenu: ['tra_vai'], storage }));
    const nhap = s.filter((x) => x.panel === 'order' && x.detail.includes('thực đơn quán cần để pha'));
    const labels = nhap.map((x) => x.label);
    expect(labels).toContain('Trà túi lọc');
    expect(labels).toContain('Nước đá');
    expect(labels).not.toContain('Vải'); // nhà trồng — gợi ý riêng GĐ1101
  });

  it('đủ kho nguyên liệu mua ngoài → không gợi ý; lặp nguyên liệu giữa các món chỉ gợi 1 lần', () => {
    const full = { tra: 99, x_duong: 99, x_nuoc_da: 99, x_vai: 50, x_sua_dac: 99, x_ca_phe_hoa_tan: 99 };
    expect(prodSuggestToday(baseArgs({ quanMenu: ['tra_vai'], storage: full })).filter((x) => x.panel === 'order' && x.detail.includes('thực đơn quán')).length).toBe(0);
    // trà dùng chung tra_vai + món trà khác → vẫn chỉ 1 dòng
    const s = prodSuggestToday(baseArgs({ quanMenu: ['tra_vai', 'tra_da'], storage: { x_nuoc_da: 99, x_vai: 50 } }));
    expect(s.filter((x) => x.label === 'Trà túi lọc').length).toBe(1);
  });

  it('món chưa mở cấp không tạo gợi ý nhập', () => {
    const s = prodSuggestToday(baseArgs({ level: 33, quanMenu: ['tra_vai'], storage: {} }));
    expect(s.filter((x) => x.panel === 'order' && x.detail.includes('thực đơn quán cần để pha')).length).toBe(0);
  });
});
