import {
  ALL_PRODUCTS, DECOR, FIXTURE_SHOP, PRODUCT_MAP, RECIPES, SEASON_EVENTS, STALLS, STORY_CHAPTERS, SEASONAL_DECOR,
} from '@game/data';

/**
 * Kiểm tra chéo dữ liệu nội dung (catalog, công thức, quầy, cốt truyện, mùa, trang trí).
 * Trả về danh sách lỗi dạng chữ; rỗng = hợp lệ. Chỉ đọc dữ liệu, không sửa gì.
 */
export function validateContent(): string[] {
  const errors: string[] = [];
  const dup = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label}: id trùng "${id}"`);
      seen.add(id);
    }
  };

  // Sản phẩm
  dup('Sản phẩm', ALL_PRODUCTS.map(p => p.id));
  for (const [id, p] of Object.entries(PRODUCT_MAP)) {
    if (!p.name.trim()) errors.push(`Sản phẩm ${id}: thiếu tên`);
    if (!Number.isSafeInteger(p.purchasePrice) || p.purchasePrice <= 0) errors.push(`Sản phẩm ${id}: giá nhập phải là số nguyên dương`);
    if (!Number.isSafeInteger(p.baseSellingPrice) || p.baseSellingPrice <= 0) errors.push(`Sản phẩm ${id}: giá bán phải là số nguyên dương`);
    if (!p.intermediate && p.baseSellingPrice <= p.purchasePrice) errors.push(`Sản phẩm ${id}: giá bán không lớn hơn giá nhập`);
    if (!p.spriteId.trim()) errors.push(`Sản phẩm ${id}: thiếu spriteId`);
  }

  // Công thức và trạm
  dup('Công thức', RECIPES.map(r => r.id));
  const stations = new Map(FIXTURE_SHOP.filter(item => item.type === 'kitchen_station').map(item => [item.id, item]));
  for (const recipe of RECIPES) {
    const station = stations.get(recipe.stationShopId);
    if (!station) errors.push(`Công thức ${recipe.id}: trạm "${recipe.stationShopId}" không phải kitchen_station trong FIXTURE_SHOP`);
    else {
      if (!station.functional) errors.push(`Công thức ${recipe.id}: trạm "${station.id}" chưa functional`);
      if (recipe.unlockLevel < station.unlockLevel) errors.push(`Công thức ${recipe.id}: mở ở cấp ${recipe.unlockLevel} trước khi trạm mở (cấp ${station.unlockLevel})`);
    }
    if (!PRODUCT_MAP[recipe.outputProductId]) errors.push(`Công thức ${recipe.id}: đầu ra "${recipe.outputProductId}" không có trong catalog`);
    if (!recipe.inputs.length) errors.push(`Công thức ${recipe.id}: không có nguyên liệu`);
    for (const input of recipe.inputs) {
      if (!PRODUCT_MAP[input.productId]) errors.push(`Công thức ${recipe.id}: nguyên liệu "${input.productId}" không có trong catalog`);
      if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) errors.push(`Công thức ${recipe.id}: số lượng "${input.productId}" phải là số nguyên dương`);
    }
    if (!Number.isSafeInteger(recipe.outputQuantity) || recipe.outputQuantity <= 0) errors.push(`Công thức ${recipe.id}: số lượng đầu ra không hợp lệ`);
    if (!(recipe.durationSeconds > 0)) errors.push(`Công thức ${recipe.id}: thời gian nấu phải dương`);
  }
  for (const station of stations.values()) {
    if (station.functional && !RECIPES.some(r => r.stationShopId === station.id)) errors.push(`Trạm "${station.id}" đã functional nhưng chưa có công thức nào`);
  }

  // Quầy vỉa hè
  dup('Quầy', STALLS.map(s => s.id));
  for (const stall of STALLS) {
    for (const ing of stall.ingredients) if (!PRODUCT_MAP[ing.productId]) errors.push(`Quầy ${stall.id}: nguyên liệu "${ing.productId}" không có trong catalog`);
    if (stall.maxServings < stall.baseServings) errors.push(`Quầy ${stall.id}: công suất tối đa nhỏ hơn nhu cầu cơ bản`);
  }

  // Cốt truyện
  dup('Chương', STORY_CHAPTERS.map(c => c.id));
  STORY_CHAPTERS.forEach((c, i) => {
    if (c.chapter !== i + 1) errors.push(`Chương ${c.id}: số chương ${c.chapter} không liên tiếp (mong ${i + 1})`);
    if (!c.dialog.length) errors.push(`Chương ${c.id}: thiếu lời thoại`);
    if (c.rewardMoney <= 0) errors.push(`Chương ${c.id}: thưởng tiền phải dương`);
    if (i > 0 && c.unlockLevel < STORY_CHAPTERS[i - 1].unlockLevel) errors.push(`Chương ${c.id}: cấp mở nhỏ hơn chương trước`);
  });

  // Mùa và mục tiêu ngày hội
  for (const season of SEASON_EVENTS) {
    for (const id of season.seasonalProductIds ?? []) if (!PRODUCT_MAP[id]) errors.push(`Mùa ${season.id}: sản phẩm "${id}" không có trong catalog`);
    for (const goal of season.goals ?? []) {
      if (goal.targetProductId && !PRODUCT_MAP[goal.targetProductId]) errors.push(`Mùa ${season.id}/${goal.id}: sản phẩm "${goal.targetProductId}" không có trong catalog`);
      if (goal.targetStallId && !STALLS.some(s => s.id === goal.targetStallId)) errors.push(`Mùa ${season.id}/${goal.id}: quầy "${goal.targetStallId}" không tồn tại`);
    }
    if (!SEASONAL_DECOR[season.id]?.length) errors.push(`Mùa ${season.id}: chưa có trang trí theo sự kiện`);
  }

  // Trang trí
  dup('Trang trí', DECOR.map(d => d.id));
  for (const decor of DECOR) if (!decor.exclusive && decor.cost <= 0) errors.push(`Trang trí ${decor.id}: đồ mua được phải có giá`);

  return errors;
}
