import { PRODUCT_MAP } from './products';
import { RECIPES, RECIPE_MAP } from './recipes';
import { COMBOS, comboProductId, comboSellingPrice, comboCost, validateCombos } from './combos';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ Passed: ${message}`);
}

/**
 * Kiểm tra bếp đa món + combo (OpenSpec `multi-dish-kitchen-combos`, GĐ4 mục 5).
 * Combo được LẮP RÁP qua Recipe như thành phẩm "suất"; mọi logic phải nhất quán và deterministic.
 */
export function runComboTests(): void {
  console.log('\n--- Multi-dish kitchen & combos ---');

  // 1. Validate dữ liệu combo sạch.
  assert(validateCombos().length === 0, `validateCombos sạch (${validateCombos().join('; ') || 'không lỗi'})`);

  // 2. Ít nhất 1 combo bếp xôi + 1 combo quán nước (phạm vi mục GĐ4-5).
  const xoiCombos = COMBOS.filter(c => c.shopStationShopId === 'quay_xoi');
  const drinkCombos = COMBOS.filter(c => c.shopStationShopId === 'drink_counter');
  assert(xoiCombos.length >= 1, `Có ≥1 combo tiệm xôi (${xoiCombos.length})`);
  assert(drinkCombos.length >= 1, `Có ≥1 combo quán nước (${drinkCombos.length})`);

  // 3. Mỗi combo: ≥2 thành viên là thành phẩm của đúng trạm, và có recipe lắp ráp.
  for (const combo of COMBOS) {
    assert(combo.memberProductIds.length >= 2, `Combo ${combo.id} đủ ≥2 thành viên`);
    for (const pid of combo.memberProductIds) {
      const p = PRODUCT_MAP[pid];
      const r = RECIPES.find(x => x.outputProductId === pid);
      assert(!!p && !!r, `Combo ${combo.id} thành viên ${pid} là thành phẩm (product + recipe)`);
      assert(r!.stationShopId === combo.shopStationShopId, `Combo ${combo.id} thành viên ${pid} sản xuất tại trạm ${combo.shopStationShopId}`);
    }
    const pid = comboProductId(combo);
    const assembleRecipe = RECIPES.find(x => x.outputProductId === pid);
    assert(!!assembleRecipe, `Combo ${combo.id} có recipe lắp ráp (${pid})`);
    assert(assembleRecipe!.stationShopId === combo.shopStationShopId, `Combo ${combo.id} lắp ráp đúng trạm ${combo.shopStationShopId}`);
    // Recipe lắp ráp tiêu đúng mỗi thành viên ≥1 (FEFO khi sản xuất).
    for (const memberId of combo.memberProductIds) {
      const needed = assembleRecipe!.inputs.find(i => i.productId === memberId)?.quantity ?? 0;
      assert(needed >= 1, `Combo ${combo.id} lắp ráp tiêu thành viên ${memberId} (≥1)`);
    }
    // Giá combo khớp khai báo.
    const cp = PRODUCT_MAP[pid];
    assert(cp!.baseSellingPrice === comboSellingPrice(combo), `Combo ${combo.id} giá bán ${cp?.baseSellingPrice} = comboSellingPrice ${comboSellingPrice(combo)}`);
    assert(cp!.purchasePrice === comboCost(combo), `Combo ${combo.id} giá vốn ${cp?.purchasePrice} = comboCost ${comboCost(combo)}`);
    assert(cp!.baseSellingPrice > cp!.purchasePrice, `Combo ${combo.id} có lãi (${cp?.baseSellingPrice} > ${cp?.purchasePrice})`);
    assert(combo.discountFraction > 0 && combo.discountFraction < 0.5, `Combo ${combo.id} chiết khấu hợp lý (${combo.discountFraction})`);
  }

  // 4. Giá combo = tổng giá bán lẻ × (1 − discount) — thấp hơn bán lẻ nhưng lãi dương.
  for (const combo of COMBOS) {
    const retailTotal = combo.memberProductIds.reduce((s, id) => s + PRODUCT_MAP[id].baseSellingPrice, 0);
    assert(comboSellingPrice(combo) < retailTotal, `Combo ${combo.id} giá ${comboSellingPrice(combo)} < bán lẻ ${retailTotal}`);
    assert(comboSellingPrice(combo) > comboCost(combo), `Combo ${combo.id} lãi gộp dương`);
  }

  // 5. Combo thuộc set món tự nhận kệ của shop (đầu ra recipe trạm tương ứng).
  const xoiSet = new Set(RECIPES.filter(r => r.stationShopId === 'quay_xoi').map(r => r.outputProductId));
  const drinkSet = new Set(RECIPES.filter(r => ['drink_counter', 'blender', 'sugarcane_press'].includes(r.stationShopId)).map(r => r.outputProductId));
  assert(COMBOS.filter(c => c.shopStationShopId === 'quay_xoi').every(c => xoiSet.has(comboProductId(c))), 'Mọi combo xôi nằm trong set món kệ tiệm xôi');
  assert(COMBOS.filter(c => c.shopStationShopId === 'drink_counter').every(c => drinkSet.has(comboProductId(c))), 'Mọi combo nước nằm trong set món kệ quán nước');

  // 6. Món mới của bếp đa món tồn tại, có recipe và nằm trong set kệ.
  const newXoi = ['xoi_thap_cam_tp', 'xoi_trung_cha_tp', 'xoi_bap_tp'];
  for (const id of newXoi) {
    assert(!!PRODUCT_MAP[id] && RECIPES.some(r => r.outputProductId === id), `Món xôi mới ${id} có sản phẩm + recipe`);
    assert(xoiSet.has(id), `Món xôi mới ${id} nằm trong set kệ tiệm xôi`);
  }
  const newDrinks = ['tra_sua_tp', 'sinh_to_xoai_tp', 'ca_phe_sua_da_tp'];
  for (const id of newDrinks) {
    assert(!!PRODUCT_MAP[id] && RECIPES.some(r => r.outputProductId === id), `Thức uống mới ${id} có sản phẩm + recipe`);
    assert(drinkSet.has(id), `Thức uống mới ${id} nằm trong set kệ quán nước`);
  }

  // 7. Recipe lắp ráp combo nằm trong RECIPE_MAP (ID không trùng).
  assert(new Set(RECIPES.map(r => r.id)).size === RECIPES.length, 'Id công thức không trùng sau khi thêm món/combo');
  for (const combo of COMBOS) {
    assert(!!RECIPE_MAP[`recipe_${combo.id}`], `Recipe lắp ráp recipe_${combo.id} có trong RECIPE_MAP`);
  }

  console.log('combos: PASS');
}
