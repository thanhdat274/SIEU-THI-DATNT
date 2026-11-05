import { describe, it, expect } from 'vitest';
import { fastTipInfo, fastTipLine } from '../data/fastDeliveryTip';
import { DELIVERY_MINUTES, FAST_TIP, fastWindow, ON_TIME_TIP } from '../data/phoneOrders';
import { formatMoney } from '../data/products';

/**
 * GĐ1311 — "Giao nhanh nửa đầu khung hẹn có đáng vội?": soi cửa sổ boa ×2 của đơn điện thoại.
 * HUD chỉ hiện 'hẹn HH:MM (còn X phút)' (PhoneAlerts.tsx:54) nên người chơi tưởng "kịp hẹn là đủ";
 * helper DÙNG THẲNG fastWindow (phoneOrders.ts:90) + tip orders.ts:207 (round ×1000) — CHỈ đọc/nhân số
 * sẵn (Nguyên tắc c), không import store (co-op an toàn), không đổi kinh tế/save/seed (Luật 5).
 */
describe('GĐ1311 — fastTipInfo / fastTipLine (boa gấp đôi nửa đầu khung giao)', () => {
  const CALLED = 8.5 * 60; // 510 — khung 8h30

  it('fastDeadline = calledAt + DELIVERY_MINUTES/2 (mốc tính TỪ LÚC GỌI, không phải nửa quãng giờ hẹn)', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    const t = fastTipInfo(o, 10000, CALLED);
    expect(t.fastDeadline).toBe(fastWindow(o as never));
    expect(t.fastDeadline).toBe(CALLED + DELIVERY_MINUTES / 2); // 510 + 37.5 = 547.5
    expect(t.fastDeadline).not.toBe(CALLED + DELIVERY_MINUTES / 2 + CALLED); // không phải giữa quãng còn lại
  });

  it('deadlineClock floor mốc .5 → 09:07 (an toàn chiều sớm: đúng thực tế cắt ở 09:07:30)', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    expect(fastTipInfo(o, 10000, CALLED).deadlineClock).toBe('09:07');
  });

  it('tiền boa nhanh = round(value×FAST_TIP/1000)×1000, gấp đôi boa kịp hẹn khi làm tròn sạch', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    const t = fastTipInfo(o, 20000, CALLED); // 20000×0.3=6000 · 20000×0.15=3000 (sạch, ×2 đúng)
    expect(t.fastTip).toBe(Math.round((20000 * FAST_TIP) / 1000) * 1000);
    expect(t.onTimeTip).toBe(Math.round((20000 * ON_TIME_TIP) / 1000) * 1000);
    expect(t.fastTip).toBe(6000);
    expect(t.onTimeTip).toBe(3000);
    expect(t.delta).toBe(3000); // = onTimeTip (đúng ×2)
  });

  it('TRUNG THỰC với làm tròn 1000: boa KHÔNG bịa, lặp đúng tip orders.ts:207', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    // value 10000: 0.3×10000=3000 · 0.15×10000=1500→round(1.5)=2→2000
    const t = fastTipInfo(o, 10000, CALLED);
    expect(t.fastTip).toBe(3000);
    expect(t.onTimeTip).toBe(2000);
    expect(t.delta).toBe(1000);
  });

  it('fastLeft = ceil(fastDeadline − minutes); còn trong cửa sổ thì có dòng', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    expect(fastTipInfo(o, 10000, CALLED + 37).fastLeft).toBe(Math.ceil(547.5 - 547)); // 1
    expect(fastTipLine(o, 10000, CALLED + 37)).toBeTruthy();
  });

  it('đúng ngưỡng: giao lúc minutes = fastDeadline vẫn tính nhanh (<=) → hết cửa sổ mới hết dòng', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    // minutes = 547.5 (chạm mốc) → fastLeft 0, dòng rỗng (không còn boa ×2)
    expect(fastTipLine(o, 10000, 547.5)).toBe('');
    // minutes ngay trước mốc (547 < 547.5) → còn mốc, vẫn dòng
    expect(fastTipLine(o, 10000, 547)).toContain('09:07');
    // lỡ hẳn cửa sổ (548) → rỗng, không ồn
    expect(fastTipLine(o, 10000, 548)).toBe('');
  });

  it('line mang đủ con số thật: mốc giờ + boa nhanh + nhãn gấp đôi + boa kịp hẹn', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    const line = fastTipLine(o, 20000, CALLED);
    expect(line).toContain('09:07');
    expect(line).toContain(formatMoney(6000));
    expect(line).toContain('gấp đôi');
    expect(line).toContain(formatMoney(3000));
  });

  it('line ≤ 90 code point (không phình; là DÒNG PANEL không nguồn notify)', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    for (const value of [5000, 10000, 24000]) {
      const line = fastTipLine(o, value, CALLED);
      expect([...line].length).toBeLessThanOrEqual(90);
    }
  });

  it('THUẦN: cùng đầu vào ⇒ cùng kết quả (deterministic)', () => {
    const o = { calledAt: CALLED, dueAt: CALLED + DELIVERY_MINUTES };
    expect(fastTipInfo(o, 10000, CALLED)).toEqual(fastTipInfo(o, 10000, CALLED));
    expect(fastTipLine(o, 10000, CALLED)).toBe(fastTipLine(o, 10000, CALLED));
  });
});
