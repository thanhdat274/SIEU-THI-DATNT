import { PRODUCTS, type Product } from './products';

/**
 * Hướng dẫn "Mua đơn đầu tiên" (GĐ38) — chống rời game sớm nhất của người mới.
 * Buổi đầu mở OrderPanel, người mới lạc trong 476 món + tab mối + meters. Lớp hướng dẫn này rút
 * OrderPanel về 3 món thiết yếu cấp thấp, có nút "+1 thùng" một chạm và theo dõi giỏ — thuần UI trên
 * OrderPanel, KHÔNG đổi orderTotal/placeOrder/kinh tế.
 *
 * File CHỈ có dữ liệu + hàm thuần (không đụng three/React/reputation). "Đơn đầu tiên" xác định qua
 * trạng thái đã quan sát được: mới toanh khi chưa đặt đơn (deliveries rỗng) và chưa bán được gì
 * (itemsSold = 0). Lưu ý: storage bản mới có sẵn 3 món (mi/nuoc/banh) nên bước tutorial 0
 * "Nhập hàng" đã tự hoàn thành ngay từ đầu — dùng dấu hiệu này thay cho `tutorialStep === 0`
 * để layer hướng dẫn vẫn kích hoạt đúng với người mới thật.
 */

/** 3 món thiết yếu cấp thấp nhất đang mở khóa ở `level` (ngày đầu = cấp 1 nên ra mi/nuoc/banh). */
export function guideProducts(level: number): Product[] {
  return [...PRODUCTS]
    .filter((p) => p.unlock <= level)
    .sort((a, b) => a.unlock - b.unlock || PRODUCTS.indexOf(a) - PRODUCTS.indexOf(b))
    .slice(0, 3);
}

/** Mã của các id hướng dẫn. */
export const guideIdsOf = (ps: Pick<Product, 'id'>[]) => ps.map((p) => p.id);

/** Những món hướng dẫn đã có trong giỏ (cart tính theo THÙNG, > 0 là đã thêm). */
export function guideInCart(ids: string[], cart: Record<string, number>): string[] {
  return ids.filter((id) => (cart[id] ?? 0) > 0);
}

/** Đã sẵn sàng đặt hàng: có ít nhất 1 trong các món hướng dẫn nằm trong giỏ. */
export function guideReady(ids: string[], cart: Record<string, number>): boolean {
  return guideInCart(ids, cart).length > 0;
}

/**
 * Lớp hướng dẫn ngày đầu có bật không: NGÀY 1, chưa bấm ẩn hướng dẫn (tutorialOff),
 * chưa đặt đơn nào (deliveries rỗng) và chưa bán được gì (itemsSold = 0).
 * Người chơi cũ (tutorialOff / sang ngày > 1 / đã đặt hoặc đã bán) không bao giờ thấy.
 */
export function guideActiveOn(day: number, tutorialOff: boolean, deliveries: readonly unknown[], itemsSold: number): boolean {
  return day === 1 && !tutorialOff && deliveries.length === 0 && itemsSold === 0;
}
