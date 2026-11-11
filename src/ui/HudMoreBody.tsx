/** GĐ651: phần trong menu Thêm (chỉ hiện khi bấm ⋯) — nạp lười, không nằm trong gói tải ban đầu. */
import { Fragment, lazy, Suspense, useMemo, useState } from 'react';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice } from '../render/graphicsQuality';
import { exportReportsJson } from '../core/dayReport';
import { useGame } from '../core/store';
import { ToolButton, type ToolDef } from './HudToolButton';
import { groupTools } from './groupTools';
import { HUBS } from './hubs';
import { SYSTEM_UNLOCKS } from '../data/unlockMap';
import { PRODUCTS } from '../data/products';
import { TELEMETRY_SCOPE, telemetryOptedIn, setTelemetryOptIn, telemetrySample } from '../data/telemetryConsent';

/** Tải file JSON 30 bản ghi ngày ẩn danh (SPEC-TOI-UU §T1) — người chơi thử gửi qua tin nhắn. */
function downloadPlayLog() {
  try {
    const blob = new Blob([exportReportsJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tap-hoa-nhat-ky-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch { /* bỏ qua */ }
}

const HudKeys = lazy(() => import('./HudKeys').then((m) => ({ default: m.HudKeys })));
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function MoreMenuBody({ tools, level, onHelp, keys, setKeys, setOpen }: {
  tools: ToolDef[]; level: number; onHelp: () => void; keys: boolean; setKeys: (v: boolean) => void; setOpen: (v: boolean) => void;
}) {
  const [teleOpen, setTeleOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <>
      {keys ? (
        <Suspense fallback={null}><HudKeys /></Suspense>
      ) : (
        <>
          {/* Tiêu đề nhóm nhỏ trước từng cụm; gom theo nhóm để mỗi tiêu đề chỉ hiện 1 lần (playtest M5) */}
          {groupTools(tools).map((t, i, arr) => (
            <Fragment key={t.label}>
              {t.group && t.group !== arr[i - 1]?.group && <div className="hud-more-group">{t.group}</div>}
              <ToolButton tool={t} level={level} onPicked={() => setOpen(false)} />
            </Fragment>
          ))}
          <GfxButton level={level} />
          {!TOUCH && <ToolButton tool={{ icon: '⌨️', label: 'Phím', on: () => setKeys(true) }} level={level} />}
          {/* Xem lại hướng dẫn mở tiệm: cả máy cảm xúc lẫn desktop đều cần */}
          <ToolButton tool={{ icon: '📖', label: 'Hướng dẫn', on: onHelp }} level={level} onPicked={() => setOpen(false)} />
          {/* SPEC-TOI-UU §T1 (L1): xuất 30 bản ghi ngày ẩn danh cục bộ (không gửi đi đâu). */}
          <ToolButton tool={{ icon: '📤', label: 'Xuất nhật ký chơi thử', on: downloadPlayLog }} level={level} onPicked={() => setOpen(false)} />
          {/* SPEC-TOI-UU §T1 (L2): bật/tắt + xem "gửi những gì" (mặc định TẮT). */}
          <ToolButton tool={{ icon: '📊', label: telemetryOptedIn() ? 'Số liệu ẩn danh: BẬT' : 'Số liệu ẩn danh: TẮT', on: () => setTeleOptIn() }} level={level} />
          <ToolButton tool={{ icon: '👁️', label: 'Xem gửi những gì', on: () => setTeleOpen(!teleOpen) }} level={level} />
          {teleOpen && (
            <pre className="hud-more-tele-sample">
              Scope {TELEMETRY_SCOPE} — bản ghi mẫu (ẩn danh), không tên/uid/vị trí:
              {telemetrySample()}
            </pre>
          )}
          {/* SPEC-TOI-UU §T6 (L6): tìm nhanh bảng / hệ / món. */}
          <ToolButton tool={{ icon: '🔍', label: searchOpen ? 'Tìm nhanh: đóng' : 'Tìm nhanh', on: () => setSearchOpen(!searchOpen) }} level={level} />
          {searchOpen && <HubSearch onPick={() => setOpen(false)} />}
        </>
      )}
    </>
  );
}

/** Đổi lựa chọn "Số liệu ẩn danh" (mặc định tắt, SPEC-TOI-UU §T1 L2). */
function setTeleOptIn() {
  setTelemetryOptIn(!telemetryOptedIn());
}

/**
 * Nút đồ họa trong menu Thêm: bấm để xoay vòng Tự động → Thấp → Vừa → Cao. Tự động thì ghi kèm
 * mức máy đang chạy. Tuỳ chọn riêng máy, không vào save — menu vẫn mở để bấm tiếp cho tới mức ưng.
 */
function GfxButton({ level }: { level: number }) {
  const [choice, setChoice] = useState(gfxStatus().choice);
  const st = gfxStatus();
  const label = choice === 'auto' ? `Đồ họa: Tự động (${GFX_LABEL[st.level]})` : `Đồ họa: ${GFX_LABEL[choice]}`;
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
      out.push({ key: `b:${hub}:${id}`, icon: '📑', name: label, group: `Bảng (${hub})`, panel: () => ({ type: id }) });
    }
  }
  for (const s of SYSTEM_UNLOCKS) {
    if (!s.panel) continue;
    const run = s.panel;
    out.push({ key: `s:${s.id}`, icon: s.icon, name: s.name, group: 'Hệ', panel: () => run() as unknown as { type: string } });
  }
  for (const p of PRODUCTS) {
    out.push({ key: `p:${p.id}`, icon: '🍎', name: p.name, group: 'Món', panel: () => 'prices' });
  }
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
    const t = typeof h.panel === 'function' ? (h.panel() as { type?: string }).type : h.panel;
    if (t) openPanel({ type: t } as never);
    onPick();
  };
  return (
    <div className="hud-more-search">
      <input
        className="hud-more-search-input"
        autoFocus
        value={q}
        placeholder="Tìm bảng, hệ, món… (không cần dấu)"
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
      {q.trim().length >= 2 && res.length === 0 && <div className="hud-more-search-empty">Không thấy gì khớp.</div>}
    </div>
  );
}

