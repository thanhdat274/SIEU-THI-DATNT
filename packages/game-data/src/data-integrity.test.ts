import { PRODUCT_MAP } from './products';
import { RECIPES, RECIPE_MAP, PRODUCED_PRODUCTS } from './recipes';
import { SUPPLIERS, SUPPLIER_MAP, DEFAULT_SUPPLIER_ID } from './suppliers';
import { validateSpoilageData } from './spoilage';
import { SEASON_EVENTS, SEASON_YEAR_DAYS, getDayOfYear, getSeasonForDay, getSeasonWindow, getFestivalClaimWindow, seasonDaysLeft } from './seasons';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ Passed: ${message}`);
}

/** Toàn vẹn dữ liệu tĩnh: công thức, nhà cung cấp, hao hụt, lịch mùa (tham chiếu chéo, trùng id, khoảng ngày). */
export function runDataIntegrityTests(): void {
  console.log('\n--- Data integrity: recipes / suppliers / spoilage / seasons ---');

  // Công thức
  assert(new Set(RECIPES.map(r => r.id)).size === RECIPES.length, 'Id công thức không trùng');
  assert(RECIPES.every(r => RECIPE_MAP[r.id] === r), 'RECIPE_MAP khớp RECIPES');
  const missingProducts = RECIPES.flatMap(r => [r.outputProductId, ...r.inputs.map(i => i.productId)].filter(id => !PRODUCT_MAP[id]).map(id => `${r.id}:${id}`));
  assert(missingProducts.length === 0, `Mọi sản phẩm trong công thức có trong PRODUCT_MAP (thiếu: ${missingProducts.join(', ') || 'không'})`);
  assert(RECIPES.every(r => r.durationSeconds > 0 && r.outputQuantity > 0 && r.inputs.length > 0 && r.inputs.every(i => i.quantity > 0)), 'Công thức có thời gian, sản lượng, nguyên liệu dương');
  assert(RECIPES.every(r => r.unlockLevel >= 1), 'Cấp mở khóa công thức >= 1');
  assert(PRODUCED_PRODUCTS.every(p => !!PRODUCT_MAP[p.id]), 'Hàng tự sản xuất đều nằm trong PRODUCT_MAP');

  // Nhà cung cấp
  assert(new Set(SUPPLIERS.map(s => s.id)).size === SUPPLIERS.length, 'Id nhà cung cấp không trùng');
  assert(!!SUPPLIER_MAP[DEFAULT_SUPPLIER_ID], 'Nhà cung cấp mặc định tồn tại');
  assert(SUPPLIERS.every(s => s.unlockLevel >= 1 && s.minOrderValue >= 0 && s.delayDays >= 0 && s.discountRate > -1 && s.discountRate < 1), 'Cấp mở khóa, đơn tối thiểu, độ trễ, chiết khấu hợp lệ (âm = phụ phí giao nhanh)');
  assert(SUPPLIER_MAP[DEFAULT_SUPPLIER_ID].unlockLevel === 1, 'Nhà cung cấp mặc định mở từ cấp 1');

  // Hao hụt
  const spoilageErrors = validateSpoilageData();
  assert(spoilageErrors.length === 0, `validateSpoilageData sạch (${spoilageErrors.join('; ') || 'không lỗi'})`);

  // Lịch mùa
  assert(new Set(SEASON_EVENTS.map(e => e.id)).size === SEASON_EVENTS.length, 'Id sự kiện mùa không trùng');
  assert(SEASON_EVENTS.every(e => e.startDayOfYear >= 0 && e.endDayOfYear >= e.startDayOfYear && e.endDayOfYear < SEASON_YEAR_DAYS), 'Khoảng ngày mùa nằm trong năm');
  const sorted = [...SEASON_EVENTS].sort((a, b) => a.startDayOfYear - b.startDayOfYear);
  assert(sorted.every((e, i) => i === 0 || e.startDayOfYear > sorted[i - 1].endDayOfYear), 'Các sự kiện mùa không chồng ngày');
  assert(SEASON_EVENTS.every(e => e.demandMultiplier > 0), 'Hệ số nhu cầu mùa dương');
  assert(SEASON_EVENTS.every(e => (e.seasonalProductIds ?? []).every(id => !!PRODUCT_MAP[id])), 'Sản phẩm nổi bật của mùa có trong catalog');
  assert(SEASON_EVENTS.every(e => (e.goals ?? []).every(g => g.targetUnits > 0 && g.rewardMoney >= 0 && (!g.targetProductId || !!PRODUCT_MAP[g.targetProductId]))), 'Mục tiêu ngày hội hợp lệ');

  for (const e of SEASON_EVENTS) {
    // Tìm một ngày game rơi vào ngày đầu của sự kiện e và kiểm tra cửa sổ.
    let day = 1;
    while (getDayOfYear(day) !== e.startDayOfYear && day <= SEASON_YEAR_DAYS + 1) day++;
    const w = getSeasonWindow(day);
    assert(w?.event.id === e.id && w.firstDay === day, `Cửa sổ mùa ${e.id}: ngày đầu khớp`);
    assert(w !== null && w.lastDay - w.firstDay === e.endDayOfYear - e.startDayOfYear, `Cửa sổ mùa ${e.id}: độ dài khớp`);
    assert(seasonDaysLeft(day) === e.endDayOfYear - e.startDayOfYear + 1, `seasonDaysLeft ${e.id} ngày đầu = độ dài`);
    const after = getFestivalClaimWindow(w!.lastDay + 1);
    const next = getSeasonForDay(w!.lastDay + 1);
    assert(next !== null || (after !== null && after.claimUntilDay === w!.lastDay + 1), `Ngày ân hạn nhận thưởng sau ${e.id}`);
  }
  assert(getDayOfYear(1) === getDayOfYear(1 + SEASON_YEAR_DAYS), 'Năm mùa lặp lại sau SEASON_YEAR_DAYS ngày');
}
