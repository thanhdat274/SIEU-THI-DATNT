import type { PhoneOrder } from './phoneOrders';

// GĐ1556 — xếp thứ tự thẻ điện thoại (tham khảo cẩm nang HappyTown: "Giao được trước / Sắp hết giờ"):
// đơn đang mang đi lên đầu, hẹn gần nhất trước; rồi tới cuộc đang đổ chuông — đủ hàng trong kho
// trước, cùng nhóm thì sắp hết giờ nghe máy trước. Thuần, không đổi state.
export function sortPhoneOrders(orders: readonly PhoneOrder[], storage: Record<string, number>): PhoneOrder[] {
  const ready = (o: PhoneOrder) => Object.entries(o.items).every(([id, q]) => (storage[id] ?? 0) >= q);
  const key = (o: PhoneOrder): [number, number] =>
    o.status === 'carrying' ? [0, o.dueAt] : [ready(o) ? 1 : 2, o.answerBy];
  return [...orders].sort((a, b) => {
    const [ga, ta] = key(a);
    const [gb, tb] = key(b);
    return ga - gb || ta - tb;
  });
}
