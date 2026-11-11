/**
 * SPEC-CHIEU-RONG §6.4c — sinh `server/marketWhitelist.json`: danh sách mã hàng HỢP LỆ ra chợ liên hẻm.
 * Mỗi lần thêm hàng khô không theo mùa hãy chạy lại: `npm run gen:whitelist`.
 * Chợ chỉ nhận hàng khô (category 'dry') KHÔNG thuộc SEASONAL_GOODS (§6.4c). Hàng nhãn riêng (Hệ 4)
 * tái dùng id sản phẩm gốc trong `line.productId` nên đã nằm trong danh sách — không cần thêm riêng.
 */
import { writeFileSync } from 'node:fs';
import { PRODUCTS } from '../src/data/products';
import { HOMEMADE_PRODUCTS, NEIGHBOR2_PRODUCTS } from '../src/data/homemade';
import { REGION_PRODUCTS } from '../src/data/regionSpecialty';
import { LATE_GAME_PRODUCTS } from '../src/data/lateGameProducts';
import { SEASONAL_GOODS } from '../src/data/calendar';

type P = { id: string; category: string };
const all: P[] = [
  ...(PRODUCTS as unknown as P[]), ...(HOMEMADE_PRODUCTS as unknown as P[]), ...(NEIGHBOR2_PRODUCTS as unknown as P[]),
  ...(REGION_PRODUCTS as unknown as P[]), ...(LATE_GAME_PRODUCTS as unknown as P[]),
];
const ids = all.filter((p) => p.category === 'dry' && !SEASONAL_GOODS.has(p.id)).map((p) => p.id);
const uniq = [...new Set(ids)].sort();
writeFileSync(
  'server/marketWhitelist.json',
  JSON.stringify({ productIds: uniq, generatedAt: new Date().toISOString(), count: uniq.length }, null, 2) + '\n',
);
console.log(`Đã ghi server/marketWhitelist.json — ${uniq.length} mặt hàng khô không theo mùa.`);
