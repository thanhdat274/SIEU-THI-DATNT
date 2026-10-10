import assert from 'node:assert/strict';
import { suggestPrice, PRICE_SUGGEST_DEFAULT_MAX_RAISE_PCT } from './price-suggest';

/**
 * Bảng giá gợi ý theo nhu cầu thực tế — phần lõi THUẦN (tính năng đề xuất #3).
 * Ràng buộc: gợi ý chỉ dựa trên lịch sử bán đã lưu (chung 2 phía) → kết quả giống nhau chơi lẻ & co-op.
 * Export `runPriceSuggestTests`.
 */
export function runPriceSuggestTests(): void {
  const low = (n: number) => ({ day: n, units: 0, price: 10 });
  const high = (n: number) => ({ day: n, units: 5, price: 10 });

  // ---- Chưa đủ dữ liệu → giữ giá ----
  {
    const r = suggestPrice({ productId: 'mi_hao_hao', series: [], unitCost: 6, currentPrice: 10 });
    assert.equal(r.action, 'hold');
    assert.equal(r.suggestedPrice, 10);
    assert.equal(r.avgUnits, null);
  }

  // ---- Bán chậm & còn lãi → hạ giá (nhưng không dưới sàn có lãi) ----
  {
    const series = [10, 11, 12].map(low); // đều bán 0 đơn vị
    const r = suggestPrice({ productId: 'x', series, unitCost: 4, currentPrice: 10 });
    assert.equal(r.action, 'cut', 'bán chậm + lãi → cut');
    assert.ok(r.suggestedPrice <= 10 && r.suggestedPrice >= r.floorPrice, 'giá mới không vượt quá giá cũ và ≥ sàn');
    assert.ok(r.avgUnits !== null && r.avgUnits < 1, 'trung bình thấp');
  }

  // ---- Bán chạy & còn lãi → nâng giá ----
  {
    const series = [10, 11, 12].map(high); // đều bán 5 đơn vị
    const r = suggestPrice({ productId: 'y', series, unitCost: 4, currentPrice: 10 });
    assert.equal(r.action, 'raise', 'cháy hàng + lãi → raise');
    assert.equal(r.suggestedPrice, Math.round(10 * (1 + PRICE_SUGGEST_DEFAULT_MAX_RAISE_PCT)));
  }

  // ---- Giá thấp không còn lãi → không hạ xuống dưới sàn / không đề xuất cut khi hết biên ----
  {
    // unitCost gần bằng giá bán → margin mỏng → giữ giá (không cut tới lỗ).
    const series = [10, 11, 12].map(low);
    const r = suggestPrice({ productId: 'z', series, unitCost: 9.5, currentPrice: 10 });
    assert.equal(r.action, 'hold', 'khi biên lợi nhuận quá mỏng → giữ giá thay vì cut đến lỗ');
    assert.ok(r.suggestedPrice >= r.floorPrice, 'không bao giờ gợi ý dưới sàn');
  }

  // ---- Phạm vi ổn định (trung bình giữa low và high) → giữ giá ----
  {
    const series = [
      { day: 10, units: 2, price: 10 },
      { day: 11, units: 3, price: 10 },
      { day: 12, units: 2, price: 10 },
    ];
    const r = suggestPrice({ productId: 'w', series, unitCost: 4, currentPrice: 10 });
    assert.equal(r.action, 'hold', 'mức bán trung bình + lãi ổn → hold');
  }

  // ---- Deterministic: cùng input → cùng output ----
  {
    const input = { productId: 'mi_hao_hao', series: [10, 11, 12].map(low), unitCost: 4, currentPrice: 10 };
    assert.deepEqual(suggestPrice(input), suggestPrice(input), 'thuần → cùng input ra cùng gợi ý');
  }
}
