import { describe, it, expect } from 'vitest';
import { orderAssessment, SPOIL_OVER_AT, ASSESS_MIN_DAILY, type AssessLine } from '../data/procure';
import { caseSize } from '../data/products';
import { shelfLife } from '../data/freshness';

/**
 * GĐ103-2 — Dự phóng đơn nhập (orderAssessment): hàm thuần đọc, không đụng store.
 * Dữ liệu gốc dùng đúng số trong data: mi = thùng 30 (hạn 45), rau = thùng 10 (hạn 3),
 * banhmi = thùng 20 (hạn 2), diem = thùng 50 (không hết hạn).
 *
 * GD103-2b hotfix theo spec UI/UX: đỏ "nhập dư" CHỈ khi bán không kịp hạn (sellDays > shelfDays)
 * VÀ ước hỏng ≥ 2 món; hỏng 1 món → vàng "bán chậm"; cầu < 0.5/ngày hoặc chưa bán lần nào →
 * xám "theo dõi thêm", không ước daysToSell (mẫu số ~0 cho số vô nghĩa kiểu "234 ngày").
 * Vượt trần kho vẫn đỏ như cũ.
 */
const line = (productId: string, cases: number, dailyQty: number, stockCases = 0): AssessLine => ({
  productId, cases, dailyQty, stockCases, shelfDays: shelfLife(productId),
});

describe('GĐ103-2 — Dự phóng trước khi chốt đơn nhập (orderAssessment)', () => {
  it('số thùng nhỏ, bán đều → ổn: ước ngày hết hàng, không hỏng, không nhập dư', () => {
    const a = orderAssessment([line('mi', 1, 10)], 50, 0);
    expect(a.lines).toHaveLength(1);
    const l = a.lines[0]!;
    expect(l.level).toBe('ok');
    expect(l.over).toBe(false);
    expect(l.spoil).toBe(0);
    // 1 thùng mì = 30 món, bán 10/ngày → chừng 3 ngày hết
    expect(l.sellDays).toBeCloseTo(3, 5);
    expect(l.caseUse).toBe(1);
    expect(a.totalCases).toBe(1);
    expect(a.totalOver).toBe(false);
  });

  it('bán không kịp hạn và ước hỏng nhiều → nhập dư (đỏ) + ước hỏng', () => {
    // rau: thùng 10 món, hạn 3 ngày; 5 thùng = 50 món, bán 3/ngày → hỏng 50 − 9 = 41 món
    const a = orderAssessment([line('rau', 5, 3)], 50, 0);
    const l = a.lines[0]!;
    expect(l.over).toBe(true);
    expect(l.overWhy).toBe('hạn');
    expect(l.level).toBe('over');
    expect(l.spoil).toBe(41);
    expect(l.sellDays!).toBeGreaterThan(shelfLife('rau'));
  });

  it('[spec UI/UX] hàng hạn 3 ngày, nhập đủ nhiều để ước hỏng ≥ 2 món → ĐỎ "nhập dư"', () => {
    // rau hạn 3 ngày: 2 thùng = 20 món, bán 6.2/ngày → chừng 3.23 ngày hết hàng (vượt hạn),
    // ước hỏng ceil(20 − 6.2×3) = 2 món → đúng ngưỡng SPOIL_OVER_AT → đỏ
    expect(SPOIL_OVER_AT).toBe(2);
    const a = orderAssessment([line('rau', 2, 6.2)], 50, 0);
    const l = a.lines[0]!;
    expect(l.spoil).toBe(2);
    expect(l.sellDays!).toBeGreaterThan(shelfLife('rau'));
    expect(l.over).toBe(true);
    expect(l.overWhy).toBe('hạn');
    expect(l.level).toBe('over');
  });

  it('[spec UI/UX] cầu 0.3 món/ngày, nhập 1 thùng → KHÔNG đỏ: xám "chưa có dữ liệu bán", không ước ngày', () => {
    // Cầu < 0.5/ngày: mẫu số ~0 cho số vô nghĩa ("hết hàng mất ~234 ngày") — không tính daysToSell
    expect(0.3).toBeLessThan(ASSESS_MIN_DAILY);
    const a = orderAssessment([line('mi', 1, 0.3)], 50, 0);
    const l = a.lines[0]!;
    expect(l.over).toBe(false);
    expect(l.level).toBe('ok'); // xám mờ như trạng thái ổn
    expect(l.sellDays).toBeNull(); // không tính daysToSell
    expect(l.spoil).toBeNull();
    expect(l.caseUse).toBe(1);
  });

  it('kho gần đầy → dòng vượt trần chịu cảnh "kho", tổng đơn báo totalOver', () => {
    // trần 20, kho đã dùng 18 → còn 2 chỗ; đặt 3 thùng là vượt
    const a = orderAssessment([line('mi', 3, 10)], 20, 18);
    const l = a.lines[0]!;
    expect(l.over).toBe(true);
    expect(l.overWhy).toBe('kho');
    expect(l.level).toBe('over');
    expect(a.totalCases).toBe(21);
    expect(a.totalOver).toBe(true);
  });

  it('cảnh "kho" cộng dồn theo dòng: dòng trước vừa đủ, dòng sau đẩy vượt', () => {
    // trần 20, kho dùng 10 → còn 10; dòng 1 mì đặt 8 (vừa), dòng 2 gạo đặt 5 thùng → chỉ còn 2 chỗ
    // (gạo hạn dài, không dư vì hạn — dư thuần túy vì kho)
    const a = orderAssessment([line('mi', 8, 10), line('gao', 5, 5)], 20, 10);
    expect(a.lines[0]!.over).toBe(false);
    expect(a.lines[1]!.overWhy).toBe('kho');
    expect(a.totalCases).toBe(23);
    expect(a.totalOver).toBe(true);
  });

  it('vượt kho thì vẫn đỏ kể cả khi cầu thấp/chưa có dữ liệu bán (lỗi thật, không phụ thuộc demand)', () => {
    // cầu 0.2/ngày (xám vì bán chậm) nhưng kho chỉ còn 1 chỗ mà đặt 2 thùng → đỏ "kho"
    const a = orderAssessment([line('rau', 2, 0.2)], 50, 49);
    const l = a.lines[0]!;
    expect(l.overWhy).toBe('kho');
    expect(l.level).toBe('over');
    expect(l.sellDays).toBeNull(); // vẫn không ước ngày vì cầu thấp
  });

  it('hạn ngắn, chênh ít → vàng "bán chậm": ước hỏng < 2 món chứ chưa phải nhập dư', () => {
    // banhmi: thùng 20 món, hạn 2 ngày; bán 9.5/ngày → chừng 2.1 ngày hết hàng (vượt hạn),
    // ước hỏng ceil(20 − 19) = 1 món → chỉ vàng, không đỏ
    const a = orderAssessment([line('banhmi', 1, 9.5)], 50, 0);
    const l = a.lines[0]!;
    expect(l.spoil).toBe(1);
    expect(l.spoil).toBeLessThan(SPOIL_OVER_AT);
    expect(l.over).toBe(false);
    expect(l.level).toBe('near');
  });

  it('dư cả hạn lẫn kho → overWhy "hạn + kho"', () => {
    // trần 12, kho dùng 12; rau 2 thùng = 20 món, hạn 3, bán 1/ngày → hỏng 17 món + vượt trần
    const a = orderAssessment([line('rau', 2, 1)], 12, 12);
    const l = a.lines[0]!;
    expect(l.overWhy).toBe('hạn + kho');
    expect(l.level).toBe('over');
  });

  it('hàng không hết hạn thì không bao giờ dư vì hạn, chỉ có thể dư vì kho', () => {
    const ok = orderAssessment([line('diem', 3, 5)], 50, 0);
    expect(ok.lines[0]!.spoil).toBeNull();
    expect(ok.lines[0]!.over).toBe(false);
    expect(ok.lines[0]!.level).toBe('ok');

    const kho = orderAssessment([line('diem', 2, 5)], 50, 49);
    expect(kho.lines[0]!.overWhy).toBe('kho');
  });

  it('chưa có dữ liệu bán (dailyQty 0) → không ước ngày/hỏng, vẫn tính thùng kho', () => {
    const a = orderAssessment([line('mi', 2, 0)], 50, 0);
    const l = a.lines[0]!;
    expect(l.sellDays).toBeNull();
    expect(l.spoil).toBeNull();
    expect(l.over).toBe(false);
    expect(l.caseUse).toBe(2);
    expect(l.level).toBe('ok');
  });

  it('dòng đặt 0 thùng bị bỏ qua, chỉ dòng có đơn mới vào kết quả', () => {
    const a = orderAssessment([line('mi', 0, 10), line('rau', 1, 3)], 50, 0);
    expect(a.lines).toHaveLength(1);
    expect(a.lines[0]!.productId).toBe('rau');
    expect(a.totalCases).toBe(1);
  });

  it('tính tổng thùng đúng: kho đã dùng + toàn bộ thùng đặt, so với trần', () => {
    const a = orderAssessment([line('mi', 2, 10), line('rau', 3, 3), line('banhmi', 1, 9)], 12, 4);
    expect(a.totalCases).toBe(4 + 2 + 3 + 1);
    expect(a.totalOver).toBe(false); // 10 ≤ 12
  });

  it('tổng vừa trần thì không báo vượt', () => {
    const a = orderAssessment([line('mi', 2, 10), line('rau', 3, 3), line('banhmi', 1, 9)], 12, 6);
    expect(a.totalCases).toBe(12);
    expect(a.totalOver).toBe(false);
  });

  it('dùng đúng khối lượng thùng theo data (caseSize) khi quy món', () => {
    expect(caseSize('banhmi')).toBe(20);
    const a = orderAssessment([line('banhmi', 2, 20, 1)], 50, 0);
    // 1 thùng kho + 2 thùng đặt = 60 món; bán 20/ngày → 3 ngày; hạn 2 → hỏng 60 − 40 = 20
    const l = a.lines[0]!;
    expect(l.sellDays).toBeCloseTo(3, 5);
    expect(l.spoil).toBe(20);
    expect(l.level).toBe('over');
  });
});
