/**
 * Tên người chơi / tên tiệm đặt ở màn đăng nhập — dùng làm tên trên bảng xếp hạng.
 * Riêng máy (localStorage `th3d_player`), KHÔNG vào save. Khi vào game, tên này được ghi vào
 * `shopName` (cùng giới hạn 24 ký tự với setShopName) và theo danh thiếp lên bảng xếp hạng.
 * Server vẫn lọc lại (socialRules.sanitizeShopName); ở đây lọc trước cho người chơi biết lý do.
 */
export const NAME_MIN = 2;
export const NAME_MAX = 24;

/** Từ bẩn tách theo biên chữ (khớp danh sách mặc định phía server). */
const BANNED = ['dit', 'loz', 'cl', 'cmnd', 'dmm', 'dem', 'cav', 'lol', 'admin'];

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string };

const stripMarks = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd');

export function validatePlayerName(raw: string): NameCheck {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < NAME_MIN) return { ok: false, reason: `Tên cần ít nhất ${NAME_MIN} ký tự.` };
  if (name.length > NAME_MAX) return { ok: false, reason: `Tên tối đa ${NAME_MAX} ký tự.` };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f<>]/.test(name)) return { ok: false, reason: 'Tên có ký tự không hợp lệ.' };
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, reason: 'Tên cần có chữ hoặc số.' };
  const plain = stripMarks(name).toLowerCase();
  // Thông tin cá nhân: tên hiện công khai trên bảng xếp hạng
  if (/@|https?:|www\.|\.(com|vn|net|org)\b/.test(plain)) return { ok: false, reason: 'Đừng dùng email hay địa chỉ web làm tên.' };
  if (/(\d[\s.\-]*){9,}/.test(plain)) return { ok: false, reason: 'Đừng dùng số điện thoại hay dãy số dài làm tên.' };
  for (const w of BANNED) {
    if (new RegExp(`(^|[^a-z0-9])${w}($|[^a-z0-9])`).test(plain)) return { ok: false, reason: 'Tên có từ không phù hợp, hãy chọn tên khác.' };
  }
  return { ok: true, name };
}

const KEY = 'th3d_player';

export function loadPlayerName(): string {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { name?: unknown } | null;
    const r = validatePlayerName(typeof v?.name === 'string' ? v.name : '');
    return r.ok ? r.name : '';
  } catch { return ''; }
}

/** Lưu tên đã kiểm; trả kết quả kiểm để giao diện báo lỗi. Chuỗi rỗng = xóa tên. */
export function savePlayerName(raw: string): NameCheck | { ok: true; name: '' } {
  if (!raw.trim()) {
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    return { ok: true, name: '' };
  }
  const r = validatePlayerName(raw);
  if (r.ok) { try { localStorage.setItem(KEY, JSON.stringify({ name: r.name })); } catch { /* private mode */ } }
  return r;
}
