import { useClock, useGame } from '../../core/store';
import { todos, type TodoItem } from '../../data/todo';
import { worldActions } from '../../core/actions';
import { styles } from './shared';

/**
 * Sổ việc chung (SPEC-TOI-UU §T6-L3): gộp mọi nguồn việc đã đăng ký (`todos()`) thành MỘT bảng,
 * ba nhóm Gấp · Hôm nay · Khi rảnh theo mức gấp, mỗi nhóm tối đa 5 dòng rồi gập "+N".
 * Bấm một dòng là mở đúng bảng (hay lau nhà luôn nếu việc đó là `act: 'mop'`).
 * KHÔNG thêm nguồn vào đây — hệ mới gọi `registerTodo` trong file data của mình (data/todo.ts).
 */

const CAP = 5;

const GROUPS: { key: TodoItem['urgency']; title: string; icon: string }[] = [
  { key: 'now', title: 'Gấp', icon: '🔴' },
  { key: 'today', title: 'Hôm nay', icon: '🟡' },
  { key: 'idle', title: 'Khi rảnh', icon: '⚪' },
];

/** Bấm một việc: mở đúng bảng (hay lau nhà luôn) — cùng quy ước với dải HUD (HudAgenda). */
function goTodo(it: TodoItem, openPanel: (p: never) => void) {
  if (!it.go) return;
  if ('act' in it.go) worldActions.mop();
  else openPanel({ type: it.go.panel } as never);
}

/** Giờ hẹn / hết hiệu lực (phút trong ngày) → chuỗi "t7:05" gọn cho dòng việc. */
function when(at: number | undefined): string | null {
  if (at === undefined) return null;
  const m = ((at % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export function TodoListPanel() {
  const minutes = useClock((c) => Math.floor(c.minutes));
  const openPanel = useGame((s) => s.openPanel);
  const list = todos(useGame.getState(), minutes);

  return (
    <>
      <h2 style={styles.title}>🗒️ Sổ việc</h2>
      <p style={styles.sub}>
        Mọi việc gấp / hôm nay / nên làm khi rảnh gộp về một nơi. Bấm một việc là tới đúng bảng.
      </p>
      {list.length === 0 ? (
        <p style={{ ...styles.card, opacity: 0.85 }}>🎉 Hôm nay không còn việc gì phải chú ý — cứ để tiệm chạy, hoặc mở rộng sâu hệ đang có.</p>
      ) : (
        GROUPS.map((g) => {
          const items = list.filter((it) => it.urgency === g.key);
          if (items.length === 0) return null;
          const shown = items.slice(0, CAP);
          const hidden = items.length - shown.length;
          return (
            <div key={g.key} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginBottom: 4 }}>
                {g.icon} {g.title} <span style={{ fontWeight: 400, opacity: 0.6 }}>({items.length})</span>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {shown.map((it) => (
                  <button
                    key={`${g.key}:${it.id}`}
                    style={{ ...styles.card, ...styles.btn, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => goTodo(it, openPanel as never)}
                  >
                    <span style={{ fontSize: 15 }}>{it.icon}</span>
                    <span style={{ flex: 1 }}>{it.text}</span>
                    {when(it.at) && <span style={{ opacity: 0.6, fontSize: 12, whiteSpace: 'nowrap' }}>🕐 {when(it.at)}</span>}
                  </button>
                ))}
                {hidden > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.6, paddingLeft: 4 }}>+{hidden} mục {g.title.toLowerCase()} nữa…</div>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
