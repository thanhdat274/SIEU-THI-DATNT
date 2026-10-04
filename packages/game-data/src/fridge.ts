import type { Product } from '@game/shared';

/** Nhóm hàng thường được bày trong tủ mát ở cửa hàng tiện lợi/tạp hóa thật (khách muốn uống/ăn lạnh). */
const CHILLED_DISPLAY_CATEGORIES: ReadonlySet<string> = new Set(['soft_drinks', 'bottled_water', 'milk', 'alcohol']);

/** Hàng nhiệt độ thường nhưng bày tủ mát vẫn hợp lý: trái cây/rau ăn tươi, sô-cô-la, bánh kem, nước bổ. */
const CHILLED_DISPLAY_IDS: ReadonlySet<string> = new Set([
  'tao', 'nho_xanh', 'nho_tim', 'dua_hau', 'xoai', 'cam', 'buoi', 'chanh_day', 'vai', 'na', 'thanh_long_trang',
  'thanh_long_tim', 'mang_cut', 'chom_chom', 'oi', 'thom', 'dua_luoi_nhat', 'sau_rieng_ri6', 'bo', 'bo_sap_dak_lak',
  'dua_leo', 'xa_lach', 'bong_cai_xanh', 'ca_rot', 'rau_mui', 'ot_chuong',
  'socola_thanh', 'socola_den_thanh', 'socola_sua_thanh', 'socola_ferrero', 'socola_toblerone', 'socola_lindt',
  'banh_mochi', 'banh_tart_trung', 'collagen_nuoc', 'tra_thao_moc_giai_nhiet',
]);

/** Hàng không nên làm lạnh dù thuộc nhóm đồ uống/sữa/rượu: dạng bột, bình 20L, rượu mạnh. */
const NEVER_CHILLED_IDS: ReadonlySet<string> = new Set([
  'ca_phe_hoa_tan', 'nuoc_binh_20l', 'sua_bot_ensure_gold',
  'ruou_nep_cam', 'ruou_vodka_ha_noi', 'whisky_red_label', 'whisky_black_label', 'cognac_hennessy_vs',
]);

/** Tủ mát nhận hàng cần bảo quản lạnh, cộng thêm hàng thường nên bày lạnh để khách mua uống/ăn ngay. */
export function fridgeAccepts(product: Pick<Product, 'id' | 'category' | 'storageType'>): boolean {
  if (product.storageType === 'cold') return true;
  if (NEVER_CHILLED_IDS.has(product.id)) return false;
  return CHILLED_DISPLAY_CATEGORIES.has(product.category) || CHILLED_DISPLAY_IDS.has(product.id);
}

/** Tủ đông (mua từ danh mục nội thất, `shopId: 'freezer'`) chỉ nhận hàng đông lạnh; tủ mát nhận hàng lạnh + hàng thường bày lạnh, không nhận hàng đông lạnh. */
export function refrigerationAccepts(
  fixture: { shopId?: string; parentId?: string },
  product: Pick<Product, 'id' | 'category' | 'storageType'>,
  fixtures: readonly { id: string; shopId?: string }[] = [],
): boolean {
  // Ô phụ của tủ không mang shopId: tra theo tủ cha.
  const shopId = fixture.shopId ?? (fixture.parentId ? fixtures.find(item => item.id === fixture.parentId)?.shopId : undefined);
  if (shopId === 'freezer') return product.category === 'frozen';
  return product.category !== 'frozen' && fridgeAccepts(product);
}

/** Hàng thường được bày trong tủ mát hợp lý như hàng lạnh (đồ uống, trái cây...) nên được thêm sức hút khi bày lạnh. */
export function isChilledDisplayItem(product: Pick<Product, 'id' | 'category' | 'storageType'>): boolean {
  return product.storageType !== 'cold' && fridgeAccepts(product);
}

/** Hệ số nhu cầu cho hàng thường đang bày trong tủ mát: trời càng nóng khách càng thích đồ lạnh. */
export function chilledDisplayAppeal(weatherId: string): number {
  if (weatherId === 'hot') return 1.45;
  if (weatherId === 'sunny') return 1.25;
  if (weatherId === 'cold' || weatherId === 'rainy' || weatherId === 'heavy_rain' || weatherId === 'storm') return 1.05;
  return 1.12;
}

/** Bày tủ mát giúp hàng thường tươi lâu hơn: giảm số ngày hạn bị trừ mỗi ngày (0 = không đổi). */
export function fridgeShelfLifeBonus(product: Pick<Product, 'category' | 'storageType'>): number {
  if (product.storageType === 'cold') return 0;
  if (product.category === 'fresh_produce' || product.category === 'bread') return 0.25;
  if (product.category === 'milk' || product.category === 'candy' || product.category === 'snacks') return 0.15;
  return 0;
}
