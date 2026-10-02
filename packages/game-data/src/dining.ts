/** Số liệu ăn tại chỗ, chuyển thể từ game gốc "tap-hoa-dau-hem" (balance.json › dining). Provisional, chưa playtest. */
export const DINING = {
  /** Mỗi lần gọi thêm kéo dài thời gian ngồi bàn thêm chừng này giây. */
  extraOrderSeconds: 12,
  /** Số lần gọi thêm tối đa của một lượt khách ngồi. */
  maxExtraOrders: 2,
} as const;

export interface DiningAddOn {
  productId: string;
  /** Xác suất khách gọi món này khi vừa ngồi xuống (0–1). */
  chance: number;
}

/** Khách mua một trong `whenProductIds` rồi ngồi bàn thì có thể gọi thêm `addOns` (lấy từ kho). Không gắn với tòa nhà nào. */
export interface DiningAddOnRule {
  id: string;
  whenProductIds: readonly string[];
  addOns: readonly DiningAddOn[];
}

export const DINING_ADD_ON_RULES: readonly DiningAddOnRule[] = [
  {
    id: 'xoi',
    whenProductIds: ['xoi_dau_xanh_tp', 'xoi_man_tp', 'xoi_trung_tp', 'xoi_dua_tp'],
    addOns: [{ productId: 'tra_da', chance: 0.45 }, { productId: 'sua_dau_nanh', chance: 0.2 }],
  },
];
