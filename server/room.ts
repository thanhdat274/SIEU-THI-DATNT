/**
 * Logic thuần của hẻm online (Tạp Hóa 3D) — tách khỏi server/index.ts để test được:
 * không đụng ws/firebase/mongo/network, chỉ tính toán quyết định rồi trả về kế hoạch để người gọi gửi.
 */

/** Giới hạn số người trong một hẻm. */
export const MAX_MEMBERS = 4;

/** Bỏ chữ dễ nhầm (0/O, 1/I/L) cho mã đọc qua điện thoại. */
export const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

/** Sinh mã hẻm (rng truyền vào để test được tính ổn định). */
export const newAlleyCode = (rng: () => number = Math.random) =>
  Array.from({ length: CODE_LEN }, () => CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]).join('');

/** Người đang online trong một hẻm (phiên bản thuần, không giữ ws). */
export interface RoomPeer { id: number; name: string; visible: boolean }

/** Cấu trúc phòng một hẻm: danh sách peer, máy đang chạy (runner), và các khoá công việc. */
export interface Room {
  peers: RoomPeer[];
  /** id của peer đang chạy mô phỏng; null = chưa ai. */
  runner: number | null;
  /** key công việc -> id peer đang giữ (vd. 'build' để sửa bố cục). */
  locks: Map<string, number>;
}

export interface HandOffPlan {
  /** Peer được nâng thành máy chạy; null = không đổi. */
  promote: number | null;
  /** Peer phải rớt xuống (máy chạy cũ); null = không ai. */
  demote: number | null;
  /** Thông báo cho cả hẻm; null = không báo. */
  notify: string | null;
}

/**
 * Máy chạy ẩn tab thì game trên máy đó đứng (trình duyệt ngừng vẽ), cả hẻm đứng theo:
 * giao quyền chạy cho người đang mở tab. Ai cũng ẩn tab thì giữ nguyên.
 * Thuần: trả về kế hoạch (promote/demote/notify), người gọi tự gửi ws.
 */
export function handOffPlan(peers: RoomPeer[], runner: number | null, reason: 'left' | 'hidden', oldName: string): HandOffPlan {
  const current = runner != null ? peers.find((p) => p.id === runner) : undefined;
  if (current?.visible) return { promote: null, demote: null, notify: null };
  const next = peers.find((p) => p.visible && p.id !== runner)
    ?? (current ? undefined : peers[0]);
  if (!next) return { promote: null, demote: null, notify: null };
  const why = reason === 'hidden' ? `${oldName} vừa ẩn tab` : `${oldName} đã rời hẻm`;
  return { promote: next.id, demote: current ? current.id : null, notify: `🏪 ${why}, máy ${next.name} đang chạy tiệm` };
}

/**
 * Khoá một công việc (vd. 'build' = sửa bố cục) để mỗi lúc chỉ một người làm.
 * Thuần: nhận/trả map khoá, trả về kết quả để người gọi gửi lock-denied/quảng bá.
 */
export function tryLock(locks: Map<string, number>, key: string, actor: number, on: boolean):
  { granted: boolean; deniedBy?: number } {
  const holder = locks.get(key);
  if (on) {
    if (holder != null && holder !== actor) return { granted: false, deniedBy: holder };
    locks.set(key, actor);
    return { granted: true };
  }
  // tắt: chỉ người đang giữ được nhả
  if (holder === actor) locks.delete(key);
  return { granted: true };
}

/** Nhả toàn bộ khoá một peer đang giữ (khi người đó rời đi); trả về các key đã nhả. */
export function releaseLocksFor(locks: Map<string, number>, peerId: number): string[] {
  const released: string[] = [];
  for (const [key, id] of locks) if (id === peerId) { locks.delete(key); released.push(key); }
  return released;
}

/** Kiểm tra một người có được tham gia hẻm (chưa có mặt + chưa đủ người). */
export function canJoin(members: { uid: string }[], uid: string): boolean {
  return !members.some((m) => m.uid === uid) && members.length < MAX_MEMBERS;
}

/** Một bản checkpoint hợp lệ để ghi về server (bắt buộc có day và money là số). */
export function isValidCheckpoint(d: unknown): d is Record<string, unknown> {
  const o = d as Record<string, unknown> | null;
  return !!o && typeof o === 'object' && typeof o.day === 'number' && typeof o.money === 'number';
}
