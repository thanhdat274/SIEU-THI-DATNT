/**
 * GĐ1496 — Khoá một tab duy nhất (tham khảo màn "Game is open in another tab" của Midnight Bistro):
 * mở game ở tab thứ hai cùng trình duyệt thì bị chặn, vì 2 tab cùng chạy sẽ cùng ghi
 * IndexedDB/localStorage — bản của tab nào đóng sau đè mất tiến trình của tab kia.
 *
 * Dùng Web Locks API: trình duyệt tự nhả khoá khi tab đóng/refresh/crash nên không bao giờ
 * "khoá ma" (không cần heartbeat dò bản ghi cũ như cách tự chế bằng localStorage).
 * Trình duyệt cũ hoặc trang chạy ngoài secure context thì không có `navigator.locks` —
 * bỏ qua lớp khoá (không chặn người chơi chỉ vì mất lớp bảo vệ).
 */

/** Tên khoá trên origin; khác origin (mở bản build khác) không đụng nhau. */
const LOCK_NAME = 'tap-hoa-3d-truong';

type Release = () => void;
/** Phần Web Locks mình cần — khai tay để test chạy node thuần không có lib DOM. */
interface LocksLike {
  request(name: string, opts: { ifAvailable?: boolean }, cb: (lock: unknown) => Promise<unknown> | undefined): Promise<unknown>;
}

// Mỗi tab một `globalThis` riêng nên khoá đàm phán giữa các tab được; gắn thêm chỗ nhả khoá
// cho Vite HMR: chạy lại module trên CÙNG trang thì khoá cũ (promise còn treo) vẫn được nắm —
// phải nhả khoá cũ trước khi xin lại, nếu không dev sửa code sẽ tự khoá chính mình.
const g = globalThis as typeof globalThis & { __tabLockRelease?: Release; navigator?: { locks?: LocksLike } };

/** Lối thoát QA/dev/review: bỏ khoá khi URL có `lock=off`, hoặc ở các chế độ KHÔNG đụng save thật —
 *  `thu=1` (kho chơi thử riêng) và `dev=...` (hẻm online dev) — để nhiều tab/agent chạy song song.
 *  Tab chơi save thật (không tham số) vẫn bị khoá 1 tab như cũ. */
export const lockDisabledByParam = (search: string): boolean => {
  if (search.includes('lock=off')) return true;
  const q = new URLSearchParams(search);
  return q.get('thu') === '1' || q.has('dev');
};

/** Xin giữ khoá suốt vòng đời trang. Resolve `true` = giữ được (tab này được chơi),
 * `false` = tab khác đang mở. Không bao giờ reject (lỗi API coi như không khoá). */
export async function acquireTabLock(): Promise<boolean> {
  if (lockDisabledByParam(typeof location === 'undefined' ? '' : location.search)) {
    console.warn('[tabLock] bỏ qua khoá 1 tab (lock=off / thu=1 / dev=…)');
    return true;
  }
  const locks = g.navigator?.locks;
  if (!locks) {
    console.warn('[tabLock] trình duyệt không hỗ trợ Web Locks — bỏ qua khoá 1 tab');
    return true;
  }
  if (g.__tabLockRelease) {
    g.__tabLockRelease();
    // Nhường nhịp cho khoá cũ được gỡ hẳn (promise settle → trình duyệt trả khoá qua microtask)
    // trước khi xin lại, tránh đuổi chính mình trong cửa sổ hẹp giữa hai lượt xin.
    await undefined;
  }
  return new Promise<boolean>((resolve) => {
    locks
      .request(LOCK_NAME, { ifAvailable: true }, (lock) => {
        if (!lock) return; // tab khác đang giữ khoá
        resolve(true);
        return new Promise<void>((release) => {
          g.__tabLockRelease = release; // treo vô hạn giữ khoá tới khi tab đóng (hoặc HMR nhả)
        });
      })
      .then(
        () => resolve(false),
        (err) => {
          console.warn('[tabLock] lỗi Web Locks — bỏ qua khoá 1 tab:', err);
          resolve(true);
        },
      );
  });
}
