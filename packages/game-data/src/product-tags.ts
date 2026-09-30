import type { Product, ProductCategory } from '@game/shared';

/** Thẻ mặc định theo nhóm hàng; bộ chỉnh nhắm vào thẻ nên sản phẩm mới chỉ cần gắn thẻ. */
export const CATEGORY_TAGS: Record<ProductCategory, string[]> = {
  instant_noodles: ['instant_food', 'comfort_food'],
  snacks: ['snack'],
  candy: ['snack', 'sweet'],
  bottled_water: ['cold_drink', 'water'],
  soft_drinks: ['cold_drink'],
  milk: ['dairy', 'breakfast'],
  bread: ['breakfast', 'quick_food'],
  eggs: ['breakfast', 'fresh'],
  cooking_ingredients: ['cooking'],
  household: ['household'],
};

/** Thẻ riêng của từng sản phẩm; `replace` thay hẳn thẻ nhóm thay vì cộng thêm. */
export const PRODUCT_TAG_OVERRIDES: Record<string, { add?: string[]; replace?: string[] }> = {
  sua_ong_tho: { add: ['coffee_ingredient'] },
  banh_mi_que: { add: ['hot_food'] },
  kem_que: { replace: ['ice_cream', 'frozen', 'sweet'] },
  o_gap: { replace: ['rain_gear', 'household'] },
  ao_mua_bo: { replace: ['rain_gear', 'household'] },
  ca_phe_hoa_tan: { replace: ['hot_drink', 'breakfast', 'coffee_ingredient'] },
  tra_nong_gung: { replace: ['hot_drink', 'comfort_food'] },
  thit_heo_tuoi: { replace: ['fresh', 'cooking', 'meat'] },
  rau_cai_xanh: { replace: ['fresh', 'cooking', 'vegetable'] },
};

export const ALL_KNOWN_TAGS: string[] = Array.from(new Set([
  ...Object.values(CATEGORY_TAGS).flat(),
  ...Object.values(PRODUCT_TAG_OVERRIDES).flatMap(item => [...(item.add ?? []), ...(item.replace ?? [])]),
]));

const cache = new Map<string, readonly string[]>();

export function getProductTags(product: Pick<Product, 'id' | 'category'>): readonly string[] {
  const cached = cache.get(product.id);
  if (cached) return cached;
  const override = PRODUCT_TAG_OVERRIDES[product.id];
  const tags = Array.from(new Set(override?.replace ?? [...CATEGORY_TAGS[product.category], ...(override?.add ?? [])]));
  cache.set(product.id, tags);
  return tags;
}
