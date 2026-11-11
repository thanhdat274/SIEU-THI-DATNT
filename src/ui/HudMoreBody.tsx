/** GĐ651: phần trong menu Thêm (chỉ hiện khi bấm ⋯) — nạp lười, không nằm trong gói tải ban đầu. */
import { Fragment, lazy, Suspense, useState } from 'react';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice } from '../render/graphicsQuality';
import { exportReportsJson } from '../core/dayReport';
import { ToolButton, type ToolDef } from './HudToolButton';
import { groupTools } from './groupTools';
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

