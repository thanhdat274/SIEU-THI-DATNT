/** GĐ651: phần trong menu Thêm (chỉ hiện khi bấm ⋯) — nạp lười, không nằm trong gói tải ban đầu. */
import { Fragment, lazy, Suspense, useMemo, useState } from 'react';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice } from '../render/graphicsQuality';
import { useGame } from '../core/store';
import { ToolButton, type ToolDef } from './HudToolButton';
import { groupTools } from './groupTools';
import { HUBS } from './hubs';
import { SYSTEM_UNLOCKS } from '../data/unlockMap';
import { PRODUCTS } from '../data/products';
import { t } from '../core/i18n';

// Xuất nhật ký chơi thử, bật/tắt số liệu ẩn danh, xem gửi những gì → đã chuyển vào Cài đặt → Dữ liệu.

const HudKeys = lazy(() => import('./HudKeys').then((m) => ({ default: m.HudKeys })));
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function MoreMenuBody({ tools, level, onHelp, keys, setKeys, setOpen, onSettings }: {
  tools: ToolDef[]; level: number; onHelp: () => void; keys: boolean; setKeys: (v: boolean) => void; setOpen: (v: boolean) => void; onSettings: () => void;
}) {
  // SPEC-TOI-UU §T6 (L3): mở Sổ việc chung từ menu ⋯ (không đụng dải HUD / chip / MorningPanel).
  const openTodo = () => useGame.getState().openPanel({ type: 'todo' } as never);
  // GĐ2347: Sổ thông báo — xem lại mọi tin đã hiện lên HUD trong phiên.
  const openNotifLog = () => useGame.getState().openPanel({ type: 'log' } as never);
  return (
    <>
      {keys ? (
        <Suspense fallback={null}><HudKeys /></Suspense>
      ) : (
        <>
          {/* SPEC-TOI-UU §T6 (L6): tìm nhanh bảng / hệ / món — ô gõ luôn hiện ở đầu menu (không cần bấm nút mở). */}
          <HubSearch onPick={() => setOpen(false)} />
          {/* Tiêu đề nhóm nhỏ trước từng cụm; gom theo nhóm để mỗi tiêu đề chỉ hiện 1 lần (playtest M5) */}
          {groupTools(tools).map((t, i, arr) => (
            <Fragment key={t.label}>
              {t.group && t.group !== arr[i - 1]?.group && <div className="hud-more-group">{t.group}</div>}
              <ToolButton tool={t} level={level} onPicked={() => setOpen(false)} />
            </Fragment>
          ))}
          <GfxButton level={level} />
          <ToolButton tool={{ icon: '⚙️', label: t('hud.cai_dat'), on: onSettings }} level={level} />
          {!TOUCH && <ToolButton tool={{ icon: '⌨️', label: t('hud.phim'), on: () => setKeys(true) }} level={level} />}
          {/* Xem lại hướng dẫn mở tiệm: cả máy cảm xúc lẫn desktop đều cần */}
          <ToolButton tool={{ icon: '📖', label: t('hud.huong_dan'), on: onHelp }} level={level} onPicked={() => setOpen(false)} />
          <ToolButton tool={{ icon: '🚶', label: t('hud.dao_pho'), lock: 3, on: () => useGame.getState().openPanel({ type: 'stroll' } as never) }} level={level} onPicked={() => setOpen(false)} />
          <ToolButton tool={{ icon: '✉️', label: t('hud.hom_thu'), on: () => useGame.getState().openPanel({ type: 'mailbox' } as never) }} level={level} onPicked={() => setOpen(false)} />
          {/* GĐ2347: xem lại thông báo đã trôi / đang bị gom — mọi tin trong phiên đọc lại được */}
          <ToolButton tool={{ icon: '🔔', label: t('hud.so_thong_bao_2'), on: openNotifLog }} level={level} onPicked={() => setOpen(false)} />
          {/* SPEC-TOI-UU §T6 (L3): Sổ việc chung — gộp mọi việc gấp/hôm nay/rảnh về một bảng. */}
          <ToolButton tool={{ icon: '🗒️', label: t('hud.so_viec'), on: openTodo }} level={level} onPicked={() => setOpen(false)} />
        </>
      )}
    </>
  );
}

/**
 * Nút đồ họa trong menu Thêm: bấm để xoay vòng Tự động → Thấp → Vừa → Cao. Tự động thì ghi kèm
 * mức máy đang chạy. Tuỳ chọn riêng máy, không vào save — menu vẫn mở để bấm tiếp cho tới mức ưng.
 */
function GfxButton({ level }: { level: number }) {
  const [choice, setChoice] = useState(gfxStatus().choice);
  const st = gfxStatus();
  const label = choice === 'auto' ? t('hud.do_hoa_tu_dong', { v0: GFX_LABEL[st.level] }) : t('hud.do_hoa', { v0: GFX_LABEL[choice] });
  const next = () => {
    const c = GFX_CYCLE[(GFX_CYCLE.indexOf(choice) + 1) % GFX_CYCLE.length];
    setGfxChoice(c);
    setChoice(c);
  };
  return <ToolButton tool={{ icon: '🎨', label, on: next }} level={level} />;
}

// ───────────────── SPEC-TOI-UU §T6 (L6): Tìm nhanh ─────────────────

/** Bỏ dấu tiếng Việt để tìm được "ke hoach" như gõ "kế hoạch". */
function norm(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd');
}

interface SearchHit {
  key: string;
  icon: string;
  name: string;
  group: string;
  panel: () => { type: string } | string;
}

/** Dựng chỉ mục tìm nhanh: bảng (HUBS) + hệ (SYSTEM_UNLOCKS) + món (PRODUCTS). BREAKN từ dữ liệu tĩnh. */
function buildIndex(): SearchHit[] {
  const out: SearchHit[] = [];
  for (const hub of Object.keys(HUBS)) {
    for (const [id, label] of HUBS[hub]) {
      out.push({ key: `b:${hub}:${id}`, icon: '📑', name: label, group: t('hud.bang', { hub }), panel: () => ({ type: id }) });
    }
  }
  for (const s of SYSTEM_UNLOCKS) {
    if (!s.panel) continue;
    const run = s.panel;
    out.push({ key: `s:${s.id}`, icon: s.icon, name: s.name, group: t('hud.he'), panel: () => run() as unknown as { type: string } });
  }
  for (const p of PRODUCTS) {
    out.push({ key: `p:${p.id}`, icon: '🍎', name: p.name, group: t('hud.mon_2'), panel: () => 'prices' });
  }
  out.push({ key: 'b:todo', icon: '🗒️', name: t('hud.so_viec'), group: t('hud.bang_2'), panel: () => ({ type: 'todo' as const }) });
  return out;
}

/** Ô tìm nhanh trong menu ⋯: gõ vài chữ (không dấu cũng được), bấm kết quả là mở đúng bảng/hệ/món. */
function HubSearch({ onPick }: { onPick: () => void }) {
  const openPanel = useGame((s) => s.openPanel);
  const [q, setQ] = useState('');
  const res = useMemo(() => {
    const nq = norm(q.trim());
    if (nq.length < 2) return [];
    return buildIndex()
      .filter((h) => norm(h.name).includes(nq) || norm(h.group).includes(nq))
      .slice(0, 12);
  }, [q]);
  const open = (h: SearchHit) => {
    const raw = typeof h.panel === 'function' ? h.panel() : h.panel;
    const t = typeof raw === 'string' ? raw : raw?.type;
    if (t) openPanel({ type: t } as never);
    onPick();
  };
  return (
    <div className="hud-more-search">
      <input
        className="hud-more-search-input"
        value={q}
        placeholder={t('hud.tim_bang_he_mon_khong_can')}
        onChange={(e) => setQ(e.target.value)}
      />
      {res.length > 0 && (
        <div className="hud-more-search-results">
          {res.map((h) => (
            <button key={h.key} className="hud-more-search-hit" onClick={() => open(h)}>
              <span>{h.icon}</span>
              <span className="hud-more-search-name">{h.name}</span>
              <span className="hud-more-search-group">{h.group}</span>
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && res.length === 0 && <div className="hud-more-search-empty">{t('hud.khong_thay_gi_khop')}</div>}
    </div>
  );
}

