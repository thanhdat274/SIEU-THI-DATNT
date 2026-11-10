import { useClock, useGame } from '../core/store';
import '../core/todoLegacy';
import { isSlowHour } from '../data/idle';
import { idleTodo, timedTodos, todos, type TodoItem } from '../data/todo';
import { worldActions } from '../core/actions';
import { tutorialActive } from './tutorialSteps';

/** GĐ459: dải hẹn hôm nay + chip giờ vắng tách lazy khỏi Hud.
 *  SPEC-TOI-UU §T6: cả hai giờ chỉ là hai CÁCH NHÌN của Sổ việc chung (`todos()` — data/todo.ts).
 *  Hệ mới muốn lên dải/chip thì `registerTodo` trong file data của hệ đó, KHÔNG sửa file này. */

/** Bấm một việc: mở đúng bảng (hay lau nhà luôn). */
const goTodo = (it: TodoItem, openPanel: (p: never) => void) => {
  if (!it.go) return;
  if ('act' in it.go) worldActions.mop();
  else openPanel({ type: it.go.panel } as never);
};

/** SPEC-TOI-UU §T2-b: thay `useGame()` (đăng ký cả store) bằng selector trả CHUỖI khoá — chuỗi so theo giá trị
 *  nên component chỉ vẽ lại khi dải/chip thật sự đổi nội dung; state đầy đủ lấy bằng getState() lúc vẽ. */
const todoKey = (st: ReturnType<typeof useGame.getState>, minutes: number, withTodos: boolean) =>
  `${st.panel ? 1 : 0}${st.shopOpen ? 1 : 0}${st.speed > 0 ? 1 : 0}${tutorialActive(st) ? 1 : 0}|` +
  (withTodos ? todos(st, minutes).map((i) => `${i.id}~${i.text}~${i.icon}~${i.urgency}`).join(';') : '');

/** Chip gợi ý giờ vắng khách: việc đáng làm nhất lúc này, bấm là mở đúng bảng (hay lau nhà luôn). */
export function IdleChip({ items }: { items?: TodoItem[] }) {
  const minutes = useClock((c) => Math.floor(c.minutes));
  useGame((st) => todoKey(st, minutes, !items));
  const s = useGame.getState();
  // Chỉ nhắc khi đúng là giờ vắng, tiệm đang mở, không bảng nào che màn, đồng hồ đang chạy,
  // và tutorial ngày đầu không đang hiện (tránh chồng hướng dẫn mới vào game).
  if (!(isSlowHour(minutes) && s.shopOpen && !s.panel && s.speed > 0 && !tutorialActive(s))) return null;
  const tip = idleTodo(items ?? todos(s, minutes));
  if (!tip) return null;
  return tip.go ? (
    <button className="hud-chip hud-idle" title={`${tip.text} · bấm để làm ngay`} onClick={() => goTodo(tip, s.openPanel as never)}>
      <span aria-hidden="true">{tip.icon}</span>
      <span>{tip.text}</span>
    </button>
  ) : (
    <div className="hud-chip hud-idle" title={tip.text}>
      <span aria-hidden="true">{tip.icon}</span>
      <span>{tip.text}</span>
    </div>
  );
}

/** GĐ162 — Dải "Kế hoạch hôm nay": mọi hẹn giờ trong ngày (khách quen ghé, giờ vàng,
 *  mẻ nấu, khe điện thoại, hợp đồng/đơn tiệc hạn giao, giàn phơi sắp mưa, việc nhà trong hẻm…)
 *  ghép lại thành MỘT dải ngang theo thứ tự thời gian, trả lời "BÂY GIỜ việc kế tiếp của tôi là gì?".
 *  Hôm nay có ít nhất 1 hẹn → dải THAY slot IdleChip (chip đầu tiên — đang đến hạn
 *  hoặc đang trong khung — được nhấn mạnh viền vàng); 0 hẹn → IdleChip hiện như cũ,
 *  dải ẩn hoàn toàn. Bấm chip mở đúng bảng liên quan. Giờ đọc 1 lần/phút game
 *  (useClock theo phút nguyên, như GĐ161) — không vẽ lại 60fps. */
export function TodayAgendaStrip() {
  const minutes = useClock((c) => Math.floor(c.minutes));
  useGame((st) => todoKey(st, minutes, true));
  const s = useGame.getState();
  const all = todos(s, minutes);
  const items = timedTodos(all);
  // Không có hẹn nào (hoặc đang hướng dẫn ngày đầu — như IdleChip, tránh chồng lớp) → trả slot IdleChip.
  if (!items.length || tutorialActive(s)) return <IdleChip items={all} />;
  // Bảng đang mở thì nhường chỗ (như IdleChip đã làm) — không chồng lớp dưới panel.
  if (s.panel) return null;
  return (
    <div className="hud-agenda" role="list" aria-label="Kế hoạch hôm nay">
      {items.map((it, i) => (
        <button
          key={it.id}
          role="listitem"
          className={`hud-agenda-chip${i === 0 ? ' next' : ''}`}
          title={`${it.text} · bấm để mở bảng liên quan`}
          onClick={() => goTodo(it, s.openPanel as never)}
        >
          <span aria-hidden="true">{it.icon}</span>
          <span>{it.text}</span>
        </button>
      ))}
    </div>
  );
}
