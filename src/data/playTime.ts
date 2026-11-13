/**
 * Đồng hồ thời gian chơi trong ngày (chống nghiện — Quy định sức khỏe).
 * Đếm giây khi tab HIỆN và game đang chạy, gộp ghi localStorage mỗi phút: `th3d_playtime`
 * (theo ngày địa phương, sang ngày mới tự đếm lại). Chỉ là thông tin hiển thị, không chặn chơi.
 */

const KEY = 'th3d_playtime';
const FLUSH_SEC = 60;
/** Mốc cảnh báo (phút): quá 120 phút nên nghỉ, 180 phút là giới hạn khuyến nghị (Quy định). */
export const PLAY_WARN_MIN = 120;
export const PLAY_LIMIT_MIN = 180;

type Rec = { date: string; minutes: number };
const todayKey = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD giờ địa phương

function read(): Rec {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Rec | null;
    if (r && typeof r.minutes === 'number' && r.date === todayKey()) return r;
  } catch { /* private mode */ }
  return { date: todayKey(), minutes: 0 };
}

function write(r: Rec) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* private mode */ }
}

/** Số phút đã chơi hôm nay (làm tròn lên từ giây chưa flush + số phút đã lưu). */
export function playMinutesToday(): number {
  return Math.min(read().minutes + Math.floor(unflushedSec / 60), 24 * 60);
}

let unflushedSec = 0;
let timer: ReturnType<typeof setInterval> | undefined;

/** Bắt đầu đếm (gọi một lần khi app khởi động). Tab ẩn thì không tính. */
export function startPlayTimeTracker(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    unflushedSec += 1;
    if (unflushedSec >= FLUSH_SEC) {
      const r = read();
      r.minutes += Math.floor(unflushedSec / 60);
      unflushedSec = 0;
      write(r);
    }
  }, 1000);
}
