import { describe, it, expect } from 'vitest';
import { quanHandPayoff, quanHandPayoffLine } from '../data/quanHandPayoff';
import { quanRecipeById, recipeCupCost } from '../data/quanRecipes';
import { QUAN_HAND_CUPS, QUAN_HAND_BONUS, QUAN_HAND_BATCHES } from '../data/quanNuoc';
import type { QuanNuocState } from '../data/quanNuoc';

/**
 * GĐ1307 — "mẻ TỰ PHA +20% tay nghề đáng bao nhiêu /mẻ và cả ngày?": soi phần thưởng GĐ427 (bán ngay
 * 5 ly cho khách chờ giá +20%) + giới hạn mẻ/ngày + kẹt nguyên liệu (nút câm lặng). Helper THUẦN ĐỌC —
 * TÁI DỰNG pick-logic brewQuanHand, CHỈ nhân/gộp số ghi sẵn (Nguyên tắc c), không import store (co-op an
 * toàn), không đổi kinh tế/save/seed (Luật 5).
 */
const q = (patch: Partial<QuanNuocState> = {}): QuanNuocState => ({ open: true, staff: 0, price: 'vua', ...patch });

describe('GĐ1307 — quanHandPayoff (mẻ Tự pha +20% tay nghề đáng bao nhiêu)', () => {
  it('HẾT mẻ hôm nay → null (không nhắc, để người chơi yên)', () => {
    const day = 40;
    const h = quanHandPayoff({ level: 40, menu: ['nuoc_chanh'], storage: { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 }, priceMul: 1, day, q: q({ tier: 0, hand: { day, n: QUAN_HAND_BATCHES } }) });
    expect(h).toBeNull();
  });

  it('chưa có món trên thực đơn → null (chưa pha được gì, không ồn)', () => {
    const h = quanHandPayoff({ level: 40, menu: [], storage: {}, priceMul: 1, day: 40, q: q() });
    expect(h).toBeNull();
  });

  it('đủ nguyên liệu: mẻ kế tiếp đúng món, extra = 5×giá×mul×0.2, dayExtra = extra×còn mẻ', () => {
    const day = 40;
    const p = quanHandPayoff({ level: 40, menu: ['nuoc_chanh'], storage: { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 }, priceMul: 1, day, q: q() })!;
    expect(p).not.toBeNull();
    expect(p.item.id).toBe('nuoc_chanh');
    expect(p.locked).toBe(false);
    expect(p.batchesLeft).toBe(QUAN_HAND_BATCHES); // tier 0 → 3 mẻ, chưa pha
    const perCup = quanRecipeById('nuoc_chanh')!.price * 1;
    expect(p.revenue).toBe(Math.round(QUAN_HAND_CUPS * perCup * QUAN_HAND_BONUS));
    expect(p.extra).toBe(Math.round(QUAN_HAND_CUPS * perCup * (QUAN_HAND_BONUS - 1))); // = +20%
    expect(p.net).toBe(p.revenue - Math.round(QUAN_HAND_CUPS * recipeCupCost(quanRecipeById('nuoc_chanh')!)));
    expect(p.dayExtra).toBe(p.extra * p.batchesLeft);
  });

  it('XOAY theo mẻ đã pha hôm nay: done=1 → chọn món THỨ HAI (giống brewQuanHand)', () => {
    const day = 40;
    const storage = { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1, tra: 1 };
    const p = quanHandPayoff({ level: 40, menu: ['tra_da', 'nuoc_chanh'], storage, priceMul: 1, day, q: q({ tier: 0, hand: { day, n: 1 } }) })!;
    expect(p.item.id).toBe('nuoc_chanh'); // menu[(1+0)%2] = nuoc_chanh
    expect(p.batchesLeft).toBe(QUAN_HAND_BATCHES - 1); // đã pha 1 → còn 2
  });

  it('bậc cà phê (tier 2) → thêm mẻ mỗi bậc: còn 5 chưa pha', () => {
    const p = quanHandPayoff({ level: 40, menu: ['nuoc_chanh'], storage: { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 }, priceMul: 1, day: 40, q: q({ tier: 2 }) })!;
    expect(p.batchesLeft).toBe(QUAN_HAND_BATCHES + 2);
  });

  it('TẤT CẢ món thiếu nguyên liệu → locked=true, line nhắc nhập (nút thật câm lặng không pha)', () => {
    const day = 40;
    const p = quanHandPayoff({ level: 40, menu: ['nuoc_chanh'], storage: {}, priceMul: 1, day, q: q() })!;
    expect(p).not.toBeNull();
    expect(p.locked).toBe(true);
    expect(p.revenue).toBe(0);
    expect(quanHandPayoffLine(p)).toContain('nhập rồi pha');
  });

  it('mức giá CAO (mul 1.3) → extra/mẻ cao hơn đúng hệ số (CHỈ nhân số ghi sẵn)', () => {
    const base = quanHandPayoff({ level: 40, menu: ['nuoc_chanh'], storage: { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 }, priceMul: 1, day: 40, q: q() })!;
    const cao = quanHandPayoff({ level: 40, menu: ['nuoc_chanh'], storage: { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 }, priceMul: 1.3, day: 40, q: q() })!;
    expect(cao.extra).toBe(Math.round(base.extra * 1.3));
    expect(cao.revenue).toBeGreaterThan(base.revenue);
  });

  it('line: rỗng khi null (không ồn)', () => {
    expect(quanHandPayoffLine(null)).toBe('');
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    const arg = { level: 40, menu: ['nuoc_chanh'], storage: { x_chanh_khong_hat: 1, x_duong: 1, x_nuoc_da: 1 }, priceMul: 1, day: 40, q: q() };
    expect(quanHandPayoff(arg)).toEqual(quanHandPayoff(arg));
  });

  it('khớp hằng số sim: +20% tay nghề = QUAN_HAND_BONUS và mỗi mẻ 5 ly = QUAN_HAND_CUPS', () => {
    expect(QUAN_HAND_BONUS).toBe(1.2);
    expect(QUAN_HAND_CUPS).toBe(5);
  });
});
