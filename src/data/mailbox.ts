/**
 * Hòm thư: gom những thứ đang chờ NHẬN vào một chỗ. Không có kho thư riêng trong save —
 * thư local được SUY RA từ trạng thái (quà điểm danh / vòng quay hôm nay chưa dùng), thư online
 * (lẵng hoa, lời khen, lô chợ) lấy từ server khi đăng nhập. THUẦN ĐỌC: không đổi state, không đụng golden.
 */
import { registerTodo, type TodoItem } from './todo';

export interface MailItem {
  id: string;
  icon: string;
  title: string;
  body: string;
  /** Bấm "Mở" thì sang bảng nào. */
  panel: 'gifts';
}

export interface MailInput { day: number; giftLastDay: number; wheelLastDay: number }

export function localMail(s: MailInput): MailItem[] {
  const out: MailItem[] = [];
  if (s.giftLastDay !== s.day) {
    out.push({ id: `gift-${s.day}`, icon: '🎁', title: 'Quà điểm danh hôm nay', body: 'Bạn chưa nhận quà điểm danh của ngày hôm nay.', panel: 'gifts' });
  }
  if (s.wheelLastDay !== s.day) {
    out.push({ id: `wheel-${s.day}`, icon: '🎡', title: 'Vòng quay may mắn', body: 'Còn một lượt quay miễn phí hôm nay.', panel: 'gifts' });
  }
  return out;
}

/** Chip giờ vắng: nhắc có thư khi rảnh, không chen vào việc gấp. */
export function mailTodoItems(s: MailInput): TodoItem[] {
  const n = localMail(s).length;
  if (!n) return [];
  return [{ id: `mailbox-${s.day}`, icon: '✉️', text: `Hòm thư có ${n} thứ chờ nhận`, urgency: 'idle', go: { panel: 'mailbox' } }];
}

registerTodo('mailbox', (s) => mailTodoItems(s));
