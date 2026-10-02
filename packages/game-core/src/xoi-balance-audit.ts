/**
 * Phân tích cân bằng tiệm xôi bằng số liệu thật từ @game/data (không dùng bản sao nội tuyến).
 * Phần 1: lãi gộp từng món theo công thức; Phần 2: vốn đầu tư và thời gian hoàn vốn theo lượng khách giả định.
 * Đây là phân tích tĩnh trên dữ liệu, KHÔNG thay thế mô phỏng/playtest có khách thật.
 * Chạy: yarn --ignore-engines workspace @game/core tsx src/xoi-balance-audit.ts
 */
import { DINING_ADD_ON_RULES, FIXTURE_SHOP, LAND_PLOTS, PRODUCT_MAP, RECIPES, XOI_PLOT_ID } from '@game/data';

const vnd = (n: number) => Math.round(n).toLocaleString('en-US');
const price = (id: string) => PRODUCT_MAP[id]?.purchasePrice ?? 0;

console.log('=== TIỆM XÔI: LÃI GỘP THEO CÔNG THỨC (số liệu thật) ===');
const nepPerPortion = price('nep') / 5; // 1 kg nếp hấp ra 5 phần
console.log(`Nếp: ${vnd(price('nep'))} ₫/kg → ${vnd(nepPerPortion)} ₫/phần (1 kg = 5 phần nếp chín)`);
console.log('Món                 | Giá vốn/lô | Giá bán/lô | Lãi/lô  | Biên%  | Lãi/phần | Lô/phút (30s)');
const dishes = RECIPES.filter(r => r.stationShopId === 'quay_xoi');
const profitPerDish: Record<string, number> = {};
for (const recipe of dishes) {
  const cost = recipe.inputs.reduce((sum, input) => sum + (input.productId === 'nep_chin' ? nepPerPortion : price(input.productId)) * input.quantity, 0);
  const out = PRODUCT_MAP[recipe.outputProductId];
  const revenue = out.baseSellingPrice * recipe.outputQuantity;
  const profit = revenue - cost;
  profitPerDish[out.id] = profit / recipe.outputQuantity;
  console.log(`${out.name.padEnd(19)} | ${vnd(cost).padStart(10)} | ${vnd(revenue).padStart(10)} | ${vnd(profit).padStart(7)} | ${(profit / revenue * 100).toFixed(1).padStart(5)}% | ${vnd(profit / recipe.outputQuantity).padStart(8)} | ${(60 / recipe.durationSeconds).toFixed(1)}`);
}
const avgProfitPerPortion = Object.values(profitPerDish).reduce((a, b) => a + b, 0) / Object.values(profitPerDish).length;
const popularity = (id: string) => PRODUCT_MAP[id].demandProfile.basePopularity;
const popSum = Object.keys(profitPerDish).reduce((s, id) => s + popularity(id), 0);
const weightedProfit = Object.keys(profitPerDish).reduce((s, id) => s + profitPerDish[id] * popularity(id) / popSum, 0);
console.log(`Lãi trung bình/phần: ${vnd(avgProfitPerPortion)} ₫ (có trọng số độ phổ biến: ${vnd(weightedProfit)} ₫)`);

console.log('\n=== GỌI THÊM TẠI BÀN (khách ăn tại chỗ) ===');
for (const rule of DINING_ADD_ON_RULES) {
  for (const add of rule.addOns) {
    const p = PRODUCT_MAP[add.productId];
    console.log(`${rule.id} → ${p.name}: xác suất ${add.chance}, bán ${vnd(p.baseSellingPrice)} ₫, vốn ${vnd(p.purchasePrice)} ₫, lãi ${vnd(p.baseSellingPrice - p.purchasePrice)} ₫`);
  }
}

console.log('\n=== VỐN ĐẦU TƯ VÀ HOÀN VỐN ===');
const plot = LAND_PLOTS.find(p => p.id === XOI_PLOT_ID)!;
const station = (id: string) => FIXTURE_SHOP.find(f => f.id === id)!;
const minimal = plot.cost + station('thung_ngam').cost + station('xung_hap').cost + station('quay_xoi').cost;
console.log(`Mua tiệm: ${vnd(plot.cost)} ₫ (cấp ${plot.level}); trạm tối thiểu (thùng + xửng + quầy): ${vnd(station('thung_ngam').cost + station('xung_hap').cost + station('quay_xoi').cost)} ₫`);
console.log(`Vốn tối thiểu (chưa tính kệ/bàn/quầy thu ngân mặc định và nguyên liệu): ${vnd(minimal)} ₫`);
console.log('Khách xôi/ngày | Lãi/ngày (trung bình 1 phần/khách) | Ngày hoàn vốn');
for (const customers of [5, 10, 20, 40, 80]) {
  const perDay = customers * weightedProfit;
  console.log(`${String(customers).padStart(14)} | ${vnd(perDay).padStart(34)} | ${(minimal / perDay).toFixed(1)}`);
}
