import { describe, expect, it } from 'vitest';
import { maintenancePayoff } from '../data/maintenancePayoff';
import { brokenShelfLoss } from '../data/brokenShelfLoss';
import { productById } from '../data/products';
import type { ItemHealth } from '../data/analytics';

const H = (id: string, dailyQty: number): ItemHealth =>
  ({ id, dailyQty, qty30: 0, profit30: 0, revenue30: 0, profit21: 0, margin: 0, daysLeft: 1 }) as ItemHealth;

/**
 * GĐ1279 — Khóa BẤT BIẾN TRUNG THỰC của cặp helper bảo trì:
 *   - `maintenancePayoff` (GĐ1190): rủi ro TIỀN SỬA kệ/đêm — bỏ hẳn món đang HỎNG (`f.broken → continue`,
 *     "đang hỏng là tiền đã chìm, không phải rủi ro qua đêm").
 *   - `brokenShelfLoss` (GĐ1273): LỠ DOANH THU khi kệ HỎNG chặn bán — CHỈ đếm món HỎNG bị chặn.
 * Hai helper PHÂN HOẠCH broken-vs-chạy: một kệ hỏng chỉ bị tính LỠ BÁN (brokenShelfLoss), KHÔNG bị tính
 * thêm rủi ro sửa/đêm (maintenancePayoff) → không double-count một món. Đây là tính chất mà ShopLifeTabs
 * đang dựa vào khi hiện đồng thời "kệ hỏng chặn ~X/ngày" và "rủi ro ~Y tiền sửa/đêm"; khóa lại để phòng
 * hồi quy (nếu sau này ai đó bỏ `f.broken` khỏi maintenancePayoff là test đỏ ngay).
 */
describe('GĐ1279 — coherence: soi bảo trì KHÔNG double-count (maintenancePayoff × brokenShelfLoss)', () => {
  it('kệ hỏng chặn bán → lostPerDay>0 nhưng KHÔNG còn là rủi ro sửa qua đêm (không double-charge)', () => {
    const A = { type: 'shelf' as const, broken: true, wear: 60, tiers: [{ productId: 'mi', count: 6 }] };
    const B = { type: 'shelf' as const, broken: false, wear: 90, tiers: [{ productId: 'nuoc', count: 4 }] };
    const maint = maintenancePayoff({ level: 30, furniture: [A, B], hasContract: false });
    const loss = brokenShelfLoss([A, B], [H('mi', 10), H('nuoc', 5)]);
    // A hỏng → bị loại khỏi rủi ro qua đêm; chỉ B (chạy) góp rủi ro sửa.
    expect(loss.hasBroken).toBe(true);
    expect(loss.lostPerDay).toBe(10 * productById('mi').sell); // A chặn bán mì
    expect(maint.nbWearing).toBe(1); // chỉ B là rủi ro sửa/đêm (A hỏng rồi, không phải rủi ro tới)
  });

  it('sửa kệ hỏng xong (broken=false) → hết lỡ bán, rủi ro sửa QUAY LẠI cho món đó', () => {
    const A = { type: 'shelf' as const, broken: false, wear: 60, tiers: [{ productId: 'mi', count: 6 }] };
    const loss = brokenShelfLoss([A], [H('mi', 10)]);
    const maint = maintenancePayoff({ level: 30, furniture: [A], hasContract: false });
    expect(loss.hasBroken).toBe(false); // lành → không còn lỡ bán
    expect(loss.lostPerDay).toBe(0);
    expect(maint.nbWearing).toBe(1); // giờ lại là rủi ro sửa/đêm (không còn trong brokenShelfLoss)
  });

  it('phân hoạch: món ĐANG HỎNG ∈ {lỡ bán}, món CHẠY ∈ {rủi ro sửa} — không món nào ở CẢ HAI', () => {
    const A = { type: 'shelf' as const, broken: true, wear: 60, tiers: [{ productId: 'mi', count: 6 }] };
    const B = { type: 'shelf' as const, broken: true, wear: 60, tiers: [{ productId: 'rau', count: 3 }] };
    const C = { type: 'shelf' as const, broken: false, wear: 90, tiers: [{ productId: 'nuoc', count: 4 }] };
    const hs = [H('mi', 10), H('rau', 4), H('nuoc', 5)];
    const maint = maintenancePayoff({ level: 30, furniture: [A, B, C], hasContract: false });
    const loss = brokenShelfLoss([A, B, C], hs);
    // 2 kệ hỏng bị loại khỏi rủi ro sửa/đêm; chỉ C (chạy) là rủi ro.
    expect(maint.nbWearing).toBe(1);
    expect(loss.lines).toHaveLength(2); // A, B chặn bán
    expect(loss.lostPerDay).toBe(10 * productById('mi').sell + 4 * productById('rau').sell);
    // C chạy → không nằm trong lỡ bán (chỉ đếm A, B hỏng)
    const blockedNames = new Set(loss.lines.flatMap((l) => l.itemNames));
    expect(blockedNames.has('Nước suối')).toBe(false);
    expect(blockedNames.has('Mì gói')).toBe(true);
    expect(blockedNames.has('Rau củ')).toBe(true);
  });

  it('thuần — cùng đầu vào cho cùng kết quả (không RNG)', () => {
    const f = [
      { type: 'shelf' as const, broken: true, wear: 60, tiers: [{ productId: 'mi', count: 6 }] },
      { type: 'shelf' as const, broken: false, wear: 90, tiers: [{ productId: 'nuoc', count: 4 }] },
    ];
    const hs = [H('mi', 10), H('nuoc', 5)];
    expect(brokenShelfLoss(f, hs)).toEqual(brokenShelfLoss(f, hs));
    expect(maintenancePayoff({ level: 30, furniture: f, hasContract: false }))
      .toEqual(maintenancePayoff({ level: 30, furniture: f, hasContract: false }));
  });
});
