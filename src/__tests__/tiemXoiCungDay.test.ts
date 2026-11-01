import { describe, expect, it } from 'vitest';
import { dateOfDoy, dayOfYear } from '../data/calendar';
import { isXoiCungDay, newTiemXoi, tiemXoiCungMul, tiemXoiDinePlan, tiemXoiIds, TIEM_XOI_CUNG_MUL } from '../data/tiemXoi';

/** GĐ587: ngày cúng (ngày 1 & 15 lịch game) khách ăn xôi ×1,3. */
describe('tiệm xôi: ngày cúng', () => {
  it('đúng 2 ngày mỗi tháng (ngày 1 và 15)', () => {
    const days = Array.from({ length: 365 }, (_, i) => i + 1).filter((d) => isXoiCungDay(d));
    expect(days.length).toBe(24);
    for (const d of days) expect([1, 15]).toContain(dateOfDoy(dayOfYear(d)).day);
    expect(tiemXoiCungMul(undefined)).toBe(1);
  });
  it('ngày cúng ăn tại chỗ nhiều suất hơn ngày thường cùng thứ', () => {
    const t = { ...newTiemXoi(), open: true, staff: 2 };
    const storage = Object.fromEntries(tiemXoiIds(45).map((id) => [id, 999]));
    const cung = Array.from({ length: 60 }, (_, i) => i + 1).find((d) => isXoiCungDay(d))!;
    const plain = cung + 7;
    expect(isXoiCungDay(plain)).toBe(false);
    const a = tiemXoiDinePlan(t, 45, storage, 'cloudy', cung).portions;
    const b = tiemXoiDinePlan(t, 45, storage, 'cloudy', plain).portions;
    expect(a).toBe(Math.round(b * TIEM_XOI_CUNG_MUL));
  });
});

describe('GĐ588: panel tiệm xôi báo ngày cúng', () => {
  it('hiện hôm nay + báo trước hôm sau, chữ ≤90', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`${__dirname}/../ui/panels/TiemXoiSection.tsx`, 'utf8');
    expect(src).toContain('isXoiCungDay(day + 1)');
    expect([...'🙏 Mai là ngày cúng: khách mua xôi ×1,3 — thợ tự nấu đầy kho ×1,3'].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ589/599/635: tiemXoiCungAction — Sổ đầu ngày nhắc ngày cúng', () => {
  it('tiệm mở + ngày cúng: thiếu thợ nhắc thêm thợ, đủ thợ báo nấu đầy; còn lại null; ≤90', async () => {
    const { tiemXoiCungAction } = await import('../data/dayEventActions');
    const { TIEM_XOI_MAX_STAFF } = await import('../data/tiemXoi');
    expect(tiemXoiCungAction({ open: true, staff: 0 }, 15)?.text).toContain('thêm thợ');
    expect(tiemXoiCungAction({ open: true, staff: TIEM_XOI_MAX_STAFF }, 15)?.text).toContain('thợ nấu đầy kho');
    expect(tiemXoiCungAction({ open: false, staff: 1 }, 15)).toBeNull();
    expect(tiemXoiCungAction({ open: true, staff: 1 }, 16)).toBeNull();
    expect(tiemXoiCungAction(undefined, 15)).toBeNull();
    for (const n of [0, TIEM_XOI_MAX_STAFF]) expect([...tiemXoiCungAction({ open: true, staff: n }, 1)!.text].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ596: ngày cúng nấu đầy kho hơn', () => {
  it('mục tiêu kho ×1,3 ngày cúng, ngày thường như cũ, không truyền ngày = như cũ', async () => {
    const { tiemXoiDay, tiemXoiIds, TIEM_XOI_TARGET, TIEM_XOI_CUNG_MUL, isXoiCungDay } = await import('../data/tiemXoi');
    const t = { open: true, staff: 3, big: false };
    const ids = tiemXoiIds(50);
    const full = Object.fromEntries(ids.map((id) => [id, TIEM_XOI_TARGET]));
    const cung = Array.from({ length: 40 }, (_, i) => i + 1).find((d) => isXoiCungDay(d))!;
    expect(tiemXoiDay(t, 50, full, () => {})!.total).toBe(0);
    expect(tiemXoiDay(t, 50, full, () => {}, cung + 1)!.total).toBe(0);
    const extra = tiemXoiDay(t, 50, full, () => {}, cung)!;
    const want = ids.length * (Math.round(TIEM_XOI_TARGET * TIEM_XOI_CUNG_MUL) - TIEM_XOI_TARGET);
    expect(extra.total).toBe(Math.min(want, 60 * 4));
  });
});

describe('GĐ598: panel tiệm xôi hiện mục tiêu kho ngày cúng', () => {
  it('TiemXoiSection nhân mục tiêu theo tiemXoiCungMul', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/TiemXoiSection.tsx', 'utf8');
    expect(src).toContain('tiemXoiTarget(t) * tiemXoiCungMul(day)');
    expect(src).toContain('thợ tự nấu đầy kho ×1,3');
  });
});

describe('GĐ605: đơn trang trại hạn ngày cúng trả như cuối tuần', () => {
  it('farmOrderBonus ngày cúng ngày thường = WEEKEND_BONUS; tin ghi "ngày cúng", ≤90', async () => {
    const { farmOrderBonus, farmOrderNews, FARM_ORDER_BONUS, FARM_ORDER_WEEKEND_BONUS } = await import('../data/garden');
    const { isWeekend } = await import('../data/calendar');
    const d = Array.from({ length: 120 }, (_, i) => i + 1).find((x) => isXoiCungDay(x) && !isWeekend(x))!;
    const plain = Array.from({ length: 120 }, (_, i) => i + 1).find((x) => !isXoiCungDay(x) && !isWeekend(x))!;
    expect(farmOrderBonus(d)).toBe(FARM_ORDER_WEEKEND_BONUS);
    expect(farmOrderBonus(plain)).toBe(FARM_ORDER_BONUS);
    const news = farmOrderNews({ id: 1, from: 'Quán Chè Bà Tư', items: {}, dueDay: d, bonus: farmOrderBonus(d) } as never);
    expect(news).toContain('ngày cúng');
    expect([...news].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ609: ngày cúng khách tiệm chính hỏi đồ cúng', () => {
  it('CUNG_GOODS là món có thật, kéo nhẹ (≤ cuối tuần 0,2), customers.ts chỉ bật vào ngày cúng', async () => {
    const { CUNG_GOODS, CUNG_PULL } = await import('../data/tiemXoi');
    const { productById } = await import('../data/products');
    for (const id of CUNG_GOODS) expect(productById(id)?.id).toBe(id);
    expect(CUNG_PULL).toBeGreaterThan(0);
    expect(CUNG_PULL).toBeLessThanOrEqual(0.2);
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/agents/customers.ts', 'utf8');
    expect(src).toContain('isXoiCungDay(s.day) ? CUNG_GOODS.filter(unlocked) : []');
    expect(src).toContain('simRng()() < CUNG_PULL) return pick(cungGoods)');
  });
});

describe('GĐ612/613/633: cungGoodsAction — nhắc đồ cúng thiếu hàng', () => {
  it('ngày cúng & hôm trước nhắc món đã mở mà chưa có; có hàng/ngày thường thì null; ≤90', async () => {
    const { cungGoodsAction } = await import('../data/dayEventActions');
    const { CUNG_GOODS } = await import('../data/tiemXoi');
    const none = () => false;
    expect(cungGoodsAction(15, 99, none)?.text).toMatch(/^Ngày cúng khách hỏi .* — chưa có hàng$/);
    expect(cungGoodsAction(14, 99, none)?.text).toMatch(/^Mai ngày cúng — nhập sẵn /);
    expect(cungGoodsAction(10, 99, none)).toBeNull();
    expect(cungGoodsAction(15, 99, () => true)).toBeNull();
    expect(cungGoodsAction(15, 99, (id) => id === CUNG_GOODS[0])?.text).not.toContain(',');
    expect(cungGoodsAction(15, 0, none)).toBeNull();
    for (const d of [14, 15]) expect([...cungGoodsAction(d, 99, none)!.text].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ637: nextEventLine — đếm ngược ngày cúng / trận', () => {
  it('đếm đúng, ẩn trận khi chưa mở quán, hôm nay đúng dịp thì bỏ phần đó, ≤90', async () => {
    const { nextEventLine } = await import('../data/dayEventActions');
    expect(nextEventLine(14, 1, 29)).toContain('🙏 Ngày cúng mai');
    expect(nextEventLine(12, 1, 29)).toContain('🙏 Ngày cúng còn 3 ngày');
    expect(nextEventLine(15, 1, 29) ?? '').not.toContain('🙏');
    expect(nextEventLine(16, 1, 29)).toContain('🙏 Ngày cúng còn 16 ngày');
    const l = nextEventLine(16, 99, 29)!;
    expect(l).toContain('⚽ Trận mai (dự kiến)');
    expect(nextEventLine(17, 99, 29)).not.toContain('⚽ Trận');
    for (let d = 1; d <= 60; d++) expect([...(nextEventLine(d, 99, 29) ?? '')].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ638: nextEventLine báo lễ sắp tới trong 14 ngày', () => {
  it('đứng đầu dòng, đúng số ngày, cả năm ≤90 chữ', async () => {
    const { nextEventLine } = await import('../data/dayEventActions');
    const { upcomingFestival } = await import('../data/calendar');
    const d = Array.from({ length: 365 }, (_, i) => i + 1).find((x) => upcomingFestival(x, 14)?.inDays === 10)!;
    const f = upcomingFestival(d, 14)!;
    expect(nextEventLine(d, 1, 29)!.startsWith(`${f.festival.icon} ${f.festival.name} còn 10 ngày`)).toBe(true);
    for (let x = 1; x <= 366; x++) expect([...(nextEventLine(x, 99, 29) ?? '')].length).toBeLessThanOrEqual(90);
  });
});

describe('GĐ639: lịch năm đánh dấu ngày cúng', () => {
  it('CalendarPanel dùng isXoiCungDay cho ô ngày + tooltip', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/CalendarPanel.tsx', 'utf8');
    expect(src).toContain('isXoiCungDay(gd)');
    expect(src).toContain("' · ngày cúng'");
    expect(src).toContain('🙏 là ngày cúng (mùng 1, rằm)'); // GĐ642: chú thích
    expect(src).toContain("isQuanMatchDay(gd, 'sunny') ? ' · tối có trận (nếu không mưa)'"); // GĐ643
  });
});

describe('GĐ641: nextEventLine qua năm mới', () => {
  it('cuối năm đếm tới Tết dương lịch và ngày cúng mùng 1 năm sau', async () => {
    const { nextEventLine } = await import('../data/dayEventActions');
    const { festivalOn } = await import('../data/calendar');
    const ny = Array.from({ length: 400 }, (_, i) => i + 2).find((d) => festivalOn(d)?.id === 'tet_duong' && festivalOn(d - 1)?.id !== 'tet_duong')!;
    const l = nextEventLine(ny - 3, 1, 29)!;
    expect(l).toContain('Tết dương lịch còn 3 ngày');
    expect(l).toContain('🙏 Ngày cúng còn 3 ngày');
  });
});

describe('GĐ644: dòng đếm ngược bấm mở lịch năm', () => {
  it('MorningPanel gắn openPanel calendar vào dòng nextEvt', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/ReportPanels.tsx', 'utf8');
    expect(src).toContain("{nextEvt && <button onClick={() => openPanel({ type: 'calendar' })}");
  });
});

describe('GĐ645: mai dự báo mưa thì không báo trận mai', () => {
  it('nextEventLine bỏ trận mai khi forecast mưa, nhảy tới trận tuần sau; panel quán nước dùng forecast', async () => {
    const { nextEventLine } = await import('../data/dayEventActions');
    expect(nextEventLine(16, 99, 29, 'sunny')).toContain('⚽ Trận mai');
    expect(nextEventLine(16, 99, 29, 'rain')).toContain('⚽ Trận còn 8 ngày');
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/ui/panels/QuanNuocPanel.tsx', 'utf8')).toContain("isQuanMatchDay(day + 1, forecast[0] ?? 'sunny')");
  });
});

describe('GĐ652: lịch năm đánh dấu hàng lễ có/thiếu cho dịp ≤14 ngày', () => {
  it('CalendarPanel dùng haveStock (kho + kệ) và chỉ gắn ✓/⚠️ khi đang diễn ra hoặc ≤14 ngày', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/CalendarPanel.tsx', 'utf8');
    expect(src).toContain("running || inDays <= 14 ? (haveStock(id) ? ' ✓' : ' ⚠️') : ''");
    expect(src).toContain('f.tiers.some((t) => t.productId === id && t.count > 0)');
  });
});

describe('GĐ653: festivalStock không lặp món', () => {
  it('mọi lễ ở cấp cao: danh sách hàng nên nhập không trùng', async () => {
    const { FESTIVALS, festivalStock } = await import('../data/calendar');
    for (const f of FESTIVALS) {
      const g = festivalStock(f, 99);
      expect(new Set(g).size).toBe(g.length);
    }
  });
});

describe('GĐ654: tin lễ sắp tới gọn hàng nên nhập', () => {
  it('Tết cấp cao: tối đa 4 tên món + "+N món"; cấp thấp vẫn liệt kê đủ', async () => {
    const { morningNews, FESTIVALS, festivalStock, gameDayOfDoy, FESTIVAL_NOTICE_DAYS } = await import('../data/calendar');
    const tet = FESTIVALS.find((f) => f.id === 'tet')!;
    const d = gameDayOfDoy(tet.from) - FESTIVAL_NOTICE_DAYS;
    const line = morningNews(1, d, 99).find((l) => l.includes(tet.name))!;
    const n = festivalStock(tet, 99).length;
    expect(line).toContain(`+${n - 4} món`);
    expect(line.split('nhập sẵn ')[1].split(', ').length).toBe(4);
    const low = morningNews(1, d, 1).find((l) => l.includes(tet.name))!;
    expect(low).not.toContain('món');
  });
});

describe('GĐ656: thẻ lễ gần có nút đặt hàng còn thiếu', () => {
  it('CalendarPanel chỉ hiện nút khi lễ ≤14 ngày và có món ⚠️, bấm mở panel order', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/ui/panels/CalendarPanel.tsx', 'utf8');
    expect(src).toContain('(running || inDays <= 14) && goods.some((id) => !haveStock(id))');
    expect(src).toContain("openPanel({ type: 'order' })}>🛒 Đặt hàng còn thiếu");
  });
});
