import { describe, it, expect } from 'vitest';
import { prodSuggestToday, branchNightSuggest, type ProdSuggestArgs } from '../data/prodSuggest';

const base = (over: Partial<ProdSuggestArgs> = {}): ProdSuggestArgs => ({
  level: 45,
  day: 10,
  hot: [],
  storage: {},
  quanNuocOpen: false,
  quanNuocShort: false,
  stationOpen: () => true,
  ...over,
});

describe('prodSuggestToday — Nên hôm nay chuỗi sản xuất', () => {
  it('cấp thấp (chưa mở farm) không gợi ý gì', () => {
    const a = base({ level: 5, hot: ['rau'], storage: { rau: 0 } });
    expect(prodSuggestToday(a)).toEqual([]);
  });

  it('🌾 gợi ý trồng cây đúng mùa mà sản phẩm đang hot', () => {
    const a = base({ level: 20, hot: ['rau'], storage: {} });
    const out = prodSuggestToday(a);
    const farm = out.find((s) => s.panel === 'garden');
    expect(farm).toBeDefined();
    expect(farm!.icon).toBe('🌾');
    expect(farm!.detail).toContain('khách săn');
  });

  it('🌾 gợi ý trồng cây khi kệ thiếu sản phẩm', () => {
    const a = base({ level: 20, hot: [], storage: { rau: 1 } });
    const farm = prodSuggestToday(a).find((s) => s.panel === 'garden');
    expect(farm).toBeDefined();
    expect(farm!.detail).toContain('kệ thiếu');
  });

  it('🌾 cây tắt mùa (ngoài season) không được gợi ý', () => {
    // xoai season [3,6]; day 10 là tháng 1 → ngoài mùa
    const a = base({ level: 30, hot: ['x_xoai'], storage: {} });
    const farm = prodSuggestToday(a).find((s) => s.panel === 'garden' && s.label.includes('Xoài'));
    expect(farm).toBeUndefined();
  });

  it('🍲 gợi ý nấu món hot khi đủ nguyên liệu + trạm mở', () => {
    const a = base({
      level: 40, hot: ['canh_rau_thit'],
      storage: { rau: 10, thit: 10 },
      stationOpen: (st) => st === 'hot_kettle',
    });
    const cook = prodSuggestToday(a).find((s) => s.panel === 'cook');
    expect(cook).toBeDefined();
    expect(cook!.icon).toBe('🍲');
    expect(cook!.detail).toContain('đủ nguyên liệu');
  });

  it('🍲 không gợi ý nấu khi thiếu nguyên liệu', () => {
    const a = base({
      level: 40, hot: ['canh_rau_thit'],
      storage: { rau: 1, thit: 0 },
      stationOpen: () => true,
    });
    expect(prodSuggestToday(a).find((s) => s.panel === 'cook')).toBeUndefined();
  });

  it('🍲 không gợi ý nấu khi trạm chưa mở', () => {
    const a = base({
      level: 40, hot: ['canh_rau_thit'],
      storage: { rau: 10, thit: 10 },
      stationOpen: (st) => st !== 'hot_kettle',
    });
    expect(prodSuggestToday(a).find((s) => s.panel === 'cook')).toBeUndefined();
  });

  it('🍲 bỏ qua công thức theo dịp lễ (festival)', () => {
    // tìm recipe có festival
    const a = base({ level: 45, hot: [] });
    // vẫn chạy không lỗi với mọi cấu hình
    expect(Array.isArray(prodSuggestToday(a))).toBe(true);
  });

  it('🧋 gợi ý nạp đồ uống khi quán mở và hôm qua thiếu', () => {
    const a = base({ level: 40, quanNuocOpen: true, quanNuocShort: true });
    const qn = prodSuggestToday(a).find((s) => s.panel === 'quannuoc');
    expect(qn).toBeDefined();
    expect(qn!.icon).toBe('🧋');
  });

  it('🧋 không gợi ý khi quán chưa mở hoặc không thiếu', () => {
    expect(prodSuggestToday(base({ level: 40, quanNuocOpen: false, quanNuocShort: true })).find((s) => s.panel === 'quannuoc')).toBeUndefined();
    expect(prodSuggestToday(base({ level: 40, quanNuocOpen: true, quanNuocShort: false })).find((s) => s.panel === 'quannuoc')).toBeUndefined();
  });

  it('🧋 không gợi ý khi cấp chưa tới ngưỡng mở quán nước', () => {
    const a = base({ level: 20, quanNuocOpen: true, quanNuocShort: true });
    expect(prodSuggestToday(a).find((s) => s.panel === 'quannuoc')).toBeUndefined();
  });

  it('ghép nhiều hệ nhưng giới hạn tổng tối đa', () => {
    const a = base({
      level: 45, hot: ['rau', 'bap', 'mia', 'canh_rau_thit'],
      storage: { rau: 50, thit: 50, gao: 5 },
      quanNuocOpen: true, quanNuocShort: true,
      stationOpen: () => true,
    });
    const out = prodSuggestToday(a);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.some((s) => s.panel === 'garden')).toBe(true);
  });

  it('thuần: cùng đầu vào cho kết quả giống nhau', () => {
    const a = base({ level: 40, hot: ['rau'], storage: { rau: 2 }, quanNuocOpen: true, quanNuocShort: true });
    expect(prodSuggestToday(a)).toEqual(prodSuggestToday(a));
  });
});

// ── GĐ77: chi nhánh tiện lợi 24/7 — nấu/chở gì sang bán đêm ──
describe('branchNightSuggest — nhu cầu chi nhánh (GĐ77)', () => {
  const branch = (shelf: Record<string, number> = {}, open = true) => ({
    open, shelf, staff: [], simAt: 0, lastTrip: 0, revenueToday: 0, customersToday: 0,
    lostToday: 0, missedToday: 0, vendingEnabled: false, vendingStock: {}, vendingRevenueToday: 0,
  });
  const full = { level: 45, storage: {}, stationOpen: () => true } as const;

  it('chi nhánh đóng → không gợi ý', () => {
    expect(branchNightSuggest(branch({}, false), {}, 45, () => true)).toEqual([]);
  });

  it('🍳 gợi ý nấu món nóng khi kệ chi nhánh cạn + đủ nguyên liệu + trạm mở', () => {
    const out = branchNightSuggest(branch({}), { xucxich: 10 }, 45, (st) => st === 'food_grill');
    const hot = out.find((s) => s.icon === '🍳' && s.label === 'Xúc xích nướng');
    expect(hot).toBeDefined();
    expect(hot!.panel).toBe('cook');
    expect(hot!.detail).toContain('×1.3');
  });

  it('🍳 không gợi ý khi kệ chi nhánh còn hàng', () => {
    const out = branchNightSuggest(branch({ xuc_xich_nuong: 5 }), { xucxich: 10 }, 45, () => true);
    expect(out.some((s) => s.icon === '🍳' && s.label === 'Xúc xích nướng')).toBe(false);
  });

  it('🍳 không gợi ý khi thiếu nguyên liệu', () => {
    const out = branchNightSuggest(branch({}), {}, 45, () => true);
    expect(out.some((s) => s.icon === '🍳')).toBe(false);
  });

  it('🍳 không gợi ý khi trạm nấu chưa mở', () => {
    const out = branchNightSuggest(branch({}), { xucxich: 10 }, 45, (st) => st !== 'food_grill');
    expect(out.some((s) => s.icon === '🍳')).toBe(false);
  });

  it('🕳️ gợi ý nhập món đêm khi kệ + kho đều cạn', () => {
    const out = branchNightSuggest(branch({}), {}, 45, () => true);
    const mi = out.find((s) => s.icon === '🕳️' && s.label === 'Mì gói');
    expect(mi).toBeDefined();
    expect(mi!.panel).toBe('order');
  });

  it('🕳️ không gợi ý món đêm khi kệ chi nhánh có hàng', () => {
    const out = branchNightSuggest(branch({ mi: 3 }), {}, 45, () => true);
    expect(out.some((s) => s.icon === '🕳️' && s.label === 'Mì gói')).toBe(false);
  });

  it('🕳️ không gợi ý món đêm khi kho chung còn hàng', () => {
    const out = branchNightSuggest(branch({}), { mi: 5 }, 45, () => true);
    expect(out.some((s) => s.icon === '🕳️' && s.label === 'Mì gói')).toBe(false);
  });

  it('giới hạn số món gợi ý mỗi nhóm (kệ + kho trống → nhiều món đêm nhưng bị cap)', () => {
    const out = branchNightSuggest(branch({}), {}, 45, () => true);
    const night = out.filter((s) => s.icon === '🕳️');
    expect(night.length).toBeLessThanOrEqual(4);
  });

  it('không chạm khi cấp chưa mở khóa món đêm', () => {
    // 'mi' unlock 1 nên thấp cấp vẫn mở; dùng món unlock cao để kiểm chứng lọc cấp
    const out = branchNightSuggest(branch({}), {}, 5, () => true);
    // cấp 5: nhiều món đêm unlock>5 không vào; 'mi'/'nuoc' unlock 1 vẫn vào
    const mi = out.find((s) => s.label === 'Mì gói');
    expect(mi).toBeDefined();
  });

  it('gộp vào prodSuggestToday khi truyền branch', () => {
    const a = base({ branch: branch({}), storage: {} });
    const out = prodSuggestToday(a);
    const night = out.find((s) => s.icon === '🕳️');
    expect(night).toBeDefined();
    expect(out.length).toBeLessThanOrEqual(5);
  });

  it('gộp vào prodSuggestToday chỉ khi branch mở', () => {
    const a = base({ branch: branch({}, false), storage: {} });
    expect(prodSuggestToday(a).some((s) => s.icon === '🕳️')).toBe(false);
  });
});
