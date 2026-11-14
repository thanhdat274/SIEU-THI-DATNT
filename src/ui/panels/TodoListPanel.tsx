import { useClock, useGame } from '../../core/store';
import { todos, type TodoItem } from '../../data/todo';
import { worldActions } from '../../core/actions';
import { Footer, styles } from './shared';
import { t } from '../../core/i18n';

/**
 * Sổ việc chung (SPEC-TOI-UU §T6-L3): gộp mọi nguồn việc đã đăng ký (`todos()`) thành MỘT bảng,
 * ba nhóm Gấp · Hôm nay · Khi rảnh theo mức gấp, mỗi nhóm tối đa 5 dòng rồi gập "+N".
 * Bấm một dòng là mở đúng bảng (hay lau nhà luôn nếu việc đó là `act: 'mop'`).
 * KHÔNG thêm nguồn vào đây — hệ mới gọi `registerTodo` trong file data của mình (data/todo.ts).
 */

const CAP = 5;

const GROUPS: { key: TodoItem['urgency']; title: string; icon: string }[] = [
  { key: 'now', title: t('panels_misc.gap'), icon: '🔴' },
  { key: 'today', title: t('panels_misc.hom_nay_2'), icon: '🟡' },
  { key: 'idle', title: t('panels_misc.khi_ranh'), icon: '⚪' },
];

/** Bấm một việc: mở đúng bảng (hay lau nhà luôn) — cùng quy ước với dải HUD (HudAgenda). */
function goTodo(it: TodoItem, openPanel: (p: never) => void) {
  if (!it.go) return;
  if ('act' in it.go) worldActions.mop();
  else {
    // T6-L3: chuyển focus "đúng chỗ" nếu nguồn việc có chỉ định (vd mở đúng tab Phơi trong Trang trại).
    const { panel, focus } = it.go;
    openPanel({ type: panel, ...(focus ? { focus } : {}) } as never);
  }
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
  const closePanel = useGame((s) => s.closePanel);
  const list = todos(useGame.getState(), minutes);

  return (
    <>
      <h2 style={styles.title}>{t('panels_misc.so_viec')}</h2>
      <p style={styles.sub}>
        {t('panels_misc.moi_viec_gap_hom_nay_nen')}
      </p>
      {list.length === 0 ? (
        <p style={{ ...styles.card, opacity: 0.85 }}>{t('panels_misc.hom_nay_khong_con_viec_gi')}</p>
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
                  /* `color` phải đặt tường minh: <button> không kế thừa màu chữ của panel —
                     thiếu nó là chữ đen mặc định của trình duyệt chìm trên thẻ nền tối (QA người chơi). */
                  <button
                    key={`${g.key}:${it.id}`}
                    style={{ ...styles.card, ...styles.btn, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => goTodo(it, openPanel as never)}
                  >
                    <span style={{ fontSize: 15 }}>{it.icon}</span>
                    <span style={{ flex: 1 }}>{it.text}</span>
                    {when(it.at) && <span style={{ opacity: 0.75, fontSize: 12, whiteSpace: 'nowrap' }}>🕐 {when(it.at)}</span>}
                  </button>
                ))}
                {hidden > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.6, paddingLeft: 4 }}>+{hidden}{' '}{t('panels_misc.muc')}{' '}{g.title.toLowerCase()}{' '}{t('panels_misc.nua')}</div>
                )}
              </div>
            </div>
          );
        })
      )}
      <Footer onClose={closePanel} />
    </>
  );
}
