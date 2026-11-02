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

/** GĐ551: ngày 1 kệ trống nên 'Cần nhập gấp' trùng gợi ý, chợ phiên/dự báo/so mối làm rối người mới — ẩn (GĐ552 gom cả dự báo + so mối). */
export const showRestockExtras = (day: number) => day > 1;

/** GĐ563: ghép `head + danh sách` ≤max ký tự; mục thừa gộp thành ' +N'. Không mục nào vừa thì chỉ còn head + số mục. */
export function fitList(head: string, items: string[], max = 90): string {
  for (let n = items.length; n > 0; n--) {
    const rest = items.length - n;
    const msg = `${head}${items.slice(0, n).join(', ')}${rest ? ` +${rest}` : ''}`;
    if ([...msg].length <= max) return msg;
  }
  return `${head}${items.length} mục`;
}

/** GĐ562: thông báo lên cấp ≤90 ký tự — chỉ tên mở khoá (bỏ phần mô tả sau ':'), thừa thì gộp '+N'. Danh sách đủ ở bảng Cấp độ. */
export function levelUpToast(level: number, gained: string[], max = 90): string {
  const head = `⭐ Lên cấp ${level}!`;
  if (!gained.length) return head;
  return fitList(`${head} Mở khóa: `, gained.map((g) => g.split(':')[0].trim()), max);
}

/** GĐ565: ghép tin bằng ' · ' ≤max ký tự; tin thừa gộp ' · +N tin' — bản đủ đọc lại ở Sổ đầu ngày. Tin đầu luôn giữ (cắt '…' nếu một mình đã dài). */
export function fitJoin(parts: string[], max = 90): string {
  const p = parts.filter(Boolean);
  for (let n = p.length; n > 1; n--) {
    const rest = p.length - n;
    const msg = p.slice(0, n).join(' · ') + (rest ? ` · +${rest} tin` : '');
    if ([...msg].length <= max) return msg;
  }
  const tail = p.length > 1 ? ` · +${p.length - 1} tin` : '';
  const first = [...(p[0] ?? '')];
  const room = max - [...tail].length;
  return (first.length <= room ? first.join('') : first.slice(0, room - 1).join('') + '…') + tail;
}

