import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { quanNuocDay, quanNuocDrinkIds, newQuanNuoc, QUAN_NUOC_PRICE, QUAN_NUOC_WAGE, type QuanNuocState } from '../data/quanNuoc';
import { productById } from '../data/products';
import { ACHIEVEMENTS } from '../data/biz';
import { rentOf } from '../data/shopTiers';

/**
 * Bộ test GĐ7 — Quán Nước Đầu Ngõ: địa điểm thứ hai mở ở cấp 29, bán đồ uống rút nguyên liệu từ kho,
 * chạy theo ngày trong endDay (không mô phỏng real-time). quanNuocDay hoàn toàn xác định, không random.
 */

/** Giá bán trung bình của thực đơn đồ uống đã mở ở `level` (cùng công thức với quanNuocDay). */
const avgPrice = (level: number) => {
  const ids = quanNuocDrinkIds(level);
  return ids.reduce((n, id) => n + productById(id).sell, 0) / ids.length;
};

describe('quanNuocDrinkIds — thực đơn theo cấp', () => {
  it('đối chiếu category thật trong data/products: chỉ gồm món drink đã mở', () => {
    expect(quanNuocDrinkIds(1)).toEqual(['nuoc']); // cấp 1 mới có nước suối
    for (const id of quanNuocDrinkIds(29)) {
      const p = productById(id);
      expect(p.category, id).toBe('drink');
      expect(p.unlock, id).toBeLessThanOrEqual(29);
    }
    // Lên cấp cao có thêm món mới (ruou 35, bia_chai 42, ruou_whisky 78…)
    expect(quanNuocDrinkIds(29).length).toBeLessThan(quanNuocDrinkIds(78).length);
  });
});

describe('quanNuocDay — mô phỏng một ngày bán', () => {
  const run = (q: QuanNuocState, level = 29, storage: Record<string, number> = { nuoc: 999 }) =>
    quanNuocDay(q, level, storage, () => {})!;

  it('chưa mở quán thì không chạy (null) và không rút kho', () => {
    const calls: { id: string; qty: number }[] = [];
    expect(quanNuocDay(newQuanNuoc(), 29, { nuoc: 100 }, (id, qty) => calls.push({ id, qty }))).toBeNull();
    expect(calls).toEqual([]);
  });

  it('quy mô khách theo nhân viên và mức giá — đúng công thức chốt', () => {
    // 45 × 1.0 × (1 + 0.15×0) = 45 khách; mỗi khách 1.5 ly → ceil(67.5) = 68
    expect(run({ open: true, staff: 0, price: 'vua' })).toMatchObject({ customers: 45, wanted: 68, served: 68, short: false, wages: 0 });
    // Bình dân (traffic 1.2): 45 × 1.2 = 54 khách → 81 ly
    expect(run({ open: true, staff: 0, price: 're' })).toMatchObject({ customers: 54, wanted: 81 });
    // Đắt hơn (traffic 0.75): 45 × 0.75 = 33.75 → 34 khách → 51 ly
    expect(run({ open: true, staff: 0, price: 'cao' })).toMatchObject({ customers: 34, wanted: 51 });
    // Đủ 3 nhân viên: 45 × 1.45 = 65.25 → 65 khách → 98 ly; lương 3 × 150.000đ
    expect(run({ open: true, staff: 3, price: 'vua' })).toMatchObject({ customers: 65, wanted: 98, wages: 3 * QUAN_NUOC_WAGE });
  });

  it('doanh thu = served × giá bán TB thực đơn × hệ số mức giá', () => {
    const avg = avgPrice(29);
    expect(run({ open: true, staff: 0, price: 'vua' }).revenue).toBe(Math.round(68 * avg * 1.0));
    expect(run({ open: true, staff: 0, price: 'cao' }).revenue).toBe(Math.round(51 * avg * 1.3));
    // 2 nhân viên: 45 × 1.2 × 1.3 = 70.2 → 70 khách → 105 ly
    expect(run({ open: true, staff: 2, price: 're' }).revenue).toBe(Math.round(105 * avg * 0.85));
  });

  it('kho thiếu đồ uống: served bị chặn bởi tồn kho + short = true', () => {
    const out = run({ open: true, staff: 0, price: 'vua' }, 29, { nuoc: 10 });
    expect(out.served).toBe(10);
    expect(out.wanted).toBe(68);
    expect(out.short).toBe(true);
    expect(out.revenue).toBe(Math.round(10 * avgPrice(29)));
  });

  it('rút kho món tồn nhiều nhất trước, đúng tổng số ly phục vụ', () => {
    const calls: { id: string; qty: number }[] = [];
    const out = quanNuocDay({ open: true, staff: 0, price: 'vua' }, 29, { nuoc: 30, ngot: 50 }, (id, qty) => calls.push({ id, qty }))!;
    expect(out.served).toBe(68);
    // ngot (50) nhiều hơn nuoc (30) nên rút ngot trước: 50 + 18 = 68 ly
    expect(calls).toEqual([{ id: 'ngot', qty: 50 }, { id: 'nuoc', qty: 18 }]);
  });

  it('hoàn toàn xác định: chạy lại hai lần ra cùng kết quả (không Math.random)', () => {
    const a = run({ open: true, staff: 2, price: 'cao' }, 29, { nuoc: 12, bia: 30 });
    const b = run({ open: true, staff: 2, price: 'cao' }, 29, { nuoc: 12, bia: 30 });
    expect(b).toEqual(a);
  });
});

describe('actions qua store thật — mua, tuyển, nghỉ, đổi giá', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('mua quán cần cấp 29: cấp 1 thì từ chối kèm thông báo, không trừ tiền', () => {
    const msgs: string[] = [];
    useGame.setState({ notify: (m) => { msgs.push(m); } });
    expect(useGame.getState().buyQuanNuoc()).toBe(false);
    expect(msgs.some((m) => m.includes('cấp 29'))).toBe(true);
    const s = useGame.getState();
    expect(s.money).toBe(300000);
    expect(s.biz.quanNuoc.open).toBe(false);
  });

  it('đủ cấp + đủ tiền: trừ 25.000.000đ, mở quán kèm tin khai trương 🧋', () => {
    const msgs: string[] = [];
    useGame.setState({ level: 29, money: 26_000_000, notify: (m) => { msgs.push(m); } });
    expect(useGame.getState().buyQuanNuoc()).toBe(true);
    const s = useGame.getState();
    expect(s.money).toBe(26_000_000 - QUAN_NUOC_PRICE);
    expect(s.biz.quanNuoc.open).toBe(true);
    expect(s.stats.spent).toBe(QUAN_NUOC_PRICE);
    expect(msgs.some((m) => m.includes('🧋'))).toBe(true);
  });

  it('đủ cấp nhưng thiếu tiền: từ chối mở quán', () => {
    useGame.setState({ level: 29, money: QUAN_NUOC_PRICE - 1 });
    expect(useGame.getState().buyQuanNuoc()).toBe(false);
    expect(useGame.getState().biz.quanNuoc.open).toBe(false);
  });

  it('hire/fire chặn biên: tối đa 3 người, fire về 0 thì dừng, không hoàn phí tuyển', () => {
    const s0 = useGame.getState();
    useGame.setState({ level: 29, money: 1_000_000, biz: { ...s0.biz, quanNuoc: { open: true, staff: 0, price: 'vua' } } });
    const g = () => useGame.getState();
    expect(g().hireQuanNuoc()).toBe(true);
    expect(g().biz.quanNuoc.staff).toBe(1);
    expect(g().money).toBe(700_000);
    g().hireQuanNuoc();
    g().hireQuanNuoc();
    expect(g().biz.quanNuoc.staff).toBe(3);
    expect(g().money).toBe(100_000);
    // Chặn biên trên: không tuyển quá 3
    expect(g().hireQuanNuoc()).toBe(false);
    expect(g().biz.quanNuoc.staff).toBe(3);
    expect(g().money).toBe(100_000);
    // Fire dần về 0 rồi chặn biên dưới
    g().fireQuanNuoc();
    g().fireQuanNuoc();
    g().fireQuanNuoc();
    expect(g().biz.quanNuoc.staff).toBe(0);
    expect(g().fireQuanNuoc()).toBe(false);
    expect(g().biz.quanNuoc.staff).toBe(0);
    expect(g().money).toBe(100_000); // không hoàn phí tuyển
  });

  it('hire cần quán đã mở', () => {
    expect(useGame.getState().hireQuanNuoc()).toBe(false);
    expect(useGame.getState().biz.quanNuoc.staff).toBe(0);
  });

  it('setQuanNuocPrice đổi mức giá', () => {
    useGame.getState().setQuanNuocPrice('cao');
    expect(useGame.getState().biz.quanNuoc.price).toBe('cao');
    useGame.getState().setQuanNuocPrice('re');
    expect(useGame.getState().biz.quanNuoc.price).toBe('re');
  });
});

describe('endDay tích hợp — quán chạy theo ngày', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Dựng ván ở cấp 29 với quán đã mở; trả về các lời thông báo để kiểm tin cuối ngày. */
  const setupQuan = (storage: Record<string, number>, quan: Partial<QuanNuocState> = {}) => {
    useGame.setState({ ...newGameData() });
    const s = useGame.getState();
    const msgs: string[] = [];
    useGame.setState({
      level: 29,
      money: 100_000_000,
      minutes: 20 * 60, // đủ giờ để đi ngủ, chạy trọn endDay
      weather: 'cloudy', // GĐ414: trời mây = hệ số khách ×1, giữ số liệu cũ
      storage: { ...storage },
      notify: (m: string) => { msgs.push(m); },
      // Đánh dấu đủ mọi thành tựu để tiền cuối ngày chỉ còn doanh thu/lương/tiền nhà của quán
      biz: { ...s.biz, achievements: ACHIEVEMENTS.map((a) => a.id), quanNuoc: { ...s.biz.quanNuoc, open: true, ...quan } },
    });
    return msgs;
  };

  it('quán mở + kho đủ nước: money tăng đúng revenue − lương, kho trừ đúng số ly, có tin Quán nước', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const storage = { nuoc: 40, ngot: 40, bia: 40 };
    const msgs = setupQuan(storage);
    // Kỳ vọng tính riêng bằng quanNuocDay trên cùng kho (đồ uống hạn 90 ngày, không hỏng qua đêm)
    const q = quanNuocDay({ open: true, staff: 0, price: 'vua' }, 29, { ...storage }, () => {})!;
    expect(q.served).toBe(68);
    expect(useGame.getState().sleep()).toBe(true);
    const s = useGame.getState();
    // Không nhân viên chính, không chi nhánh: money chỉ tăng revenue quán, trừ tiền nhà tier 0
    expect(s.money).toBe(100_000_000 + q.revenue - rentOf(0));
    expect(s.biz.quanNuocLast).toEqual({ day: 1, revenue: q.revenue, served: 68, wanted: 68, wages: 0, profit: q.revenue });
    // Kho trừ đúng 68 ly đồ uống (kệ không bị đụng tới)
    const drinkLeft = quanNuocDrinkIds(29).reduce((n, id) => n + (s.storage[id] ?? 0), 0);
    expect(drinkLeft).toBe(120 - 68);
    expect(msgs.some((m) => m.includes('🧋 Quán nước: 68/68 ly'))).toBe(true);
  });

  it('GĐ437: hôm nay có tự pha thì tin cuối ngày ghi số mẻ', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const msgs = setupQuan({ nuoc: 40, ngot: 40, bia: 40 });
    const st = useGame.getState();
    useGame.setState({ biz: { ...st.biz, quanNuoc: { ...st.biz.quanNuoc, hand: { day: st.day, n: 2 } } } });
    expect(useGame.getState().sleep()).toBe(true);
    expect(msgs.some((m) => m.includes('🧋 Quán nước:') && m.includes('tự pha 2 mẻ'))).toBe(true);
  });

  it('GĐ438: tin quán dài nhất (3 nhân viên, tự pha, 4 món thiếu) vẫn ≤90 ký tự', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const msgs = setupQuan({ nuoc: 400 }, { staff: 3, menu: ['tra_da', 'ca_phe_den', 'nuoc_chanh', 'nuoc_mia'], hand: { day: 1, n: 5 } });
    expect(useGame.getState().sleep()).toBe(true);
    // Tin quán nằm trong dòng tóm tắt sáng ghép bằng " · "; cắt riêng đoạn quán (tới mục kế tiếp có icon 📋)
    const all = msgs.find((m) => m.includes('🧋 Quán nước:'))!;
    const line = all.slice(all.indexOf('🧋 Quán nước:')).split(' · 📋')[0];
    expect(line).toContain('tự pha 5 mẻ');
    expect([...line].length).toBeLessThanOrEqual(90);
  });

  it('có nhân viên + mức giá bình dân: doanh thu theo mul, lương trừ đủ', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    setupQuan({ nuoc: 500 }, { staff: 1, price: 're' });
    const q = quanNuocDay({ open: true, staff: 1, price: 're' }, 29, { nuoc: 500 }, () => {})!;
    expect(q.customers).toBe(62); // 45 × 1.2 × 1.15 = 62.1
    expect(q.wanted).toBe(93);
    expect(q.wages).toBe(QUAN_NUOC_WAGE);
    expect(useGame.getState().sleep()).toBe(true);
    const s = useGame.getState();
    expect(s.money).toBe(100_000_000 + q.revenue - q.wages - rentOf(0));
    expect(s.biz.quanNuocLast).toEqual({ day: 1, revenue: q.revenue, served: 93, wanted: 93, wages: q.wages, profit: q.revenue - q.wages });
  });

  it('kho không có nước: served 0, vẫn trả lương, tin nhắc nhập thêm đồ uống', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const msgs = setupQuan({ mi: 10 }, { staff: 1 }); // chỉ có mì (dry), sạch đồ uống
    const q = quanNuocDay({ open: true, staff: 1, price: 'vua' }, 29, { mi: 10 }, () => {})!;
    expect(q.served).toBe(0);
    expect(q.short).toBe(true);
    expect(useGame.getState().sleep()).toBe(true);
    const s = useGame.getState();
    expect(s.money).toBe(100_000_000 - q.wages - rentOf(0));
    expect(s.biz.quanNuocLast).toEqual({ day: 1, revenue: 0, served: 0, wanted: q.wanted, wages: q.wages, profit: -q.wages });
    expect(msgs.some((m) => m.includes(`🧋 Quán nước: 0/${q.wanted} ly`) && m.includes('kho thiếu đồ uống'))).toBe(true);
  });

  it('quán chưa mở: endDay không đụng tới quán nước', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const storage = { nuoc: 40 };
    setupQuan(storage, { open: false });
    expect(useGame.getState().sleep()).toBe(true);
    const s = useGame.getState();
    expect(s.biz.quanNuocLast).toBeUndefined();
    expect(s.storage.nuoc).toBe(40); // kho nguyên vẹn
  });
});

describe('save cũ — tự bù quanNuoc mặc định', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('bản lưu trước GĐ7 thiếu biz.quanNuoc: applySnapshot bù mặc định (open false)', () => {
    const save = snapshot();
    delete (save.biz as unknown as Record<string, unknown>).quanNuoc;
    delete (save.biz as unknown as Record<string, unknown>).quanNuocLast;
    applySnapshot(save);
    const s = useGame.getState();
    expect(s.biz.quanNuoc).toEqual(newQuanNuoc());
    expect(s.biz.quanNuoc.open).toBe(false);
    expect(s.biz.quanNuocLast).toBeUndefined();
  });

  it('bản lưu có sẵn quanNuoc/quanNuocLast: giữ nguyên giá trị, field khác của biz vẫn bù mặc định', () => {
    applySnapshot({
      ...snapshot(),
      biz: {
        quanNuoc: { open: true, staff: 2, price: 'cao' },
        quanNuocLast: { day: 5, revenue: 123456, served: 10, wanted: 68 },
      },
    } as unknown as Parameters<typeof applySnapshot>[0]);
    const s = useGame.getState();
    expect(s.biz.quanNuoc).toEqual({ open: true, staff: 2, price: 'cao' });
    expect(s.biz.quanNuocLast).toEqual({ day: 5, revenue: 123456, served: 10, wanted: 68 });
    // Field không có ở bản lưu lấy từ mặc định
    expect(s.biz.rival).toBeNull();
    expect(s.biz.loyalty.on).toBe(false);
  });
});

describe('thời tiết ảnh hưởng khách quán nước (GĐ414)', () => {
  const q: QuanNuocState = { open: true, staff: 1, price: 'vua' };
  const day = (w?: Parameters<typeof quanNuocDay>[4]) => quanNuocDay(q, 29, { nuoc: 9999 }, () => {}, w)!;

  it('nắng đông hơn, mưa/bão vắng hơn, không truyền = như trời mây', () => {
    expect(day('cloudy')).toEqual(day());
    expect(day('sunny').customers).toBeGreaterThan(day().customers);
    expect(day('rain').customers).toBeLessThan(day().customers);
    expect(day('storm').customers).toBeLessThan(day('rain').customers);
  });

  it('dự phóng dùng cùng hệ số với ngày bán thật', async () => {
    const { quanNuocProjection } = await import('../data/quanNuoc');
    for (const w of ['sunny', 'rain', 'storm', 'fog', 'cloudy'] as const) {
      const d = day(w);
      const p = quanNuocProjection(q, 29, 9999, w);
      expect([p.customers, p.wanted, p.served, p.revenue]).toEqual([d.customers, d.wanted, d.served, d.revenue]);
    }
  });
});

describe('GĐ467: cuối tuần quán đông hơn', () => {
  it('T7/CN ×1.2, ngày thường và không truyền ngày ×1', async () => {
    const { quanWeekendMul, quanNuocProjection } = await import('../data/quanNuoc');
    const { isWeekend } = await import('../data/calendar');
    const sat = [1, 2, 3, 4, 5, 6, 7].find((d) => isWeekend(d))!;
    const mon = [1, 2, 3, 4, 5, 6, 7].find((d) => !isWeekend(d))!;
    expect(quanWeekendMul()).toBe(1);
    expect(quanWeekendMul(mon)).toBe(1);
    expect(quanWeekendMul(sat)).toBe(1.2);
    const q = { open: true, staff: 0, price: 'vua' as const };
    expect(quanNuocProjection(q, 29, 1e9, 'cloudy', sat).customers).toBeGreaterThan(quanNuocProjection(q, 29, 1e9, 'cloudy', mon).customers);
  });
});

describe('GĐ469: ước tính chở hàng biết cuối tuần', () => {
  it('teahouseHaulRead cuối tuần cần nhiều hơn ngày thường', async () => {
    const { teahouseHaulRead } = await import('../data/teahouseHaul');
    const { isWeekend } = await import('../data/calendar');
    const sat = [1, 2, 3, 4, 5, 6, 7].find((d) => isWeekend(d))!;
    const mon = [1, 2, 3, 4, 5, 6, 7].find((d) => !isWeekend(d))!;
    const q = { open: true, staff: 0, price: 'vua' as const };
    expect(teahouseHaulRead(100, q, 29, sat).daysLeft).toBeLessThan(teahouseHaulRead(100, q, 29, mon).daysLeft);
  });
});

describe('GĐ473: kế hoạch nạp đồ uống biết cuối tuần', () => {
  it('teahouseFillPlan cuối tuần nạp nhiều hơn', async () => {
    const { teahouseFillPlan } = await import('../data/teahouseHaul');
    const { isWeekend } = await import('../data/calendar');
    const sat = [1, 2, 3, 4, 5, 6, 7].find((d) => isWeekend(d))!;
    const mon = [1, 2, 3, 4, 5, 6, 7].find((d) => !isWeekend(d))!;
    const q = { open: true, staff: 0, price: 'vua' as const };
    expect(teahouseFillPlan(q, 29, 0, () => 24, sat).topup).toBeGreaterThan(teahouseFillPlan(q, 29, 0, () => 24, mon).topup);
  });
});
