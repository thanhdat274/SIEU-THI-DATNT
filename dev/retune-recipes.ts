import { RECIPES } from '../src/data/recipes';
import { productById } from '../src/data/products';

// Giá vốn/giá bán mới cho món nấu: bán ra ≈ 1.9× tiền nguyên liệu cả mẻ (margin theo báo cáo)
const out = new Map<string, { buy: number; sell: number }>();
for (const r of RECIPES) {
  // Combo dùng món nấu làm nguyên liệu: lấy giá vốn vừa tính của món nấu đó
  const inputCost = r.inputs.reduce((n, i) => n + (out.get(i.productId)?.buy ?? productById(i.productId).buy) * i.quantity, 0);
  const buy = Math.max(100, Math.round(inputCost / r.outputQty / 100) * 100);
  const sell = Math.max(buy + 100, Math.round((inputCost * 1.9) / r.outputQty / 100) * 100);
  out.set(r.outputId, { buy, sell });
}
for (const [id, v] of out) console.log(`${id}|${v.buy}|${v.sell}`);
