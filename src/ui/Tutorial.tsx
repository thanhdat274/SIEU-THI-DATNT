import { useGame } from '../core/store';
import { dismissTutorial } from '../core/biz';
import { tutorialSteps } from './tutorialSteps';

/** Hướng dẫn ngày đầu: danh sách việc tự tích khi làm xong. Chế độ review (mục 📖 Hướng dẫn ở menu
 *  Thêm) xem lại mọi lúc, chỉ đọc — không ghi cờ ẩn vào bản lưu. */
export function Tutorial({ review, onDone }: { review: boolean; onDone: () => void }) {
  const off = useGame((s) => s.biz.tutorialOff);
  const day = useGame((s) => s.day);
  const steps = useGame((s) => tutorialSteps(s).map((x) => `${x.done ? 1 : 0}${x.label}`).join('|'));
  // Chỉ hướng dẫn ngày đầu: sang ngày 2 là tắt, tránh đè thông báo mỗi sáng; review thì luôn hiện
  if (!review && (off || day > 1)) return null;
  const list = steps.split('|').map((x) => ({ done: x[0] === '1', label: x.slice(1) }));
  const allDone = list.every((x) => x.done);
  // Ngày đầu mà đủ bước rồi thì khỏi hiện; chế độ review thì chuyển sang lời chúc
  if (allDone && !review) return null;
  return (
    <div className="hud-alert info hud-tutorial">
      <b>{review ? '🧭 Xem lại hướng dẫn' : '🧭 Ngày đầu mở tiệm'}</b>
      {allDone ? (
        <p>✅ Bạn đã làm đủ các bước mở tiệm rồi. Còn Việc hôm nay ở chip La bàn và nút 📜 Nhiệm vụ.</p>
      ) : (
        <ul>{list.map((x) => <li key={x.label} className={x.done ? 'done' : undefined}>{x.done ? '✅' : '⬜'} {x.label}</li>)}</ul>
      )}
      {review
        ? <button className="hud-btn" onClick={onDone}>Xong</button>
        : <button className="hud-btn" onClick={dismissTutorial}>Ẩn hướng dẫn</button>}
    </div>
  );
}
