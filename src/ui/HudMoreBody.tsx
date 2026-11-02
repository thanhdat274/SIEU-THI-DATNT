/** GĐ651: phần trong menu Thêm (chỉ hiện khi bấm ⋯) — nạp lười, không nằm trong gói tải ban đầu. */
import { Fragment, lazy, Suspense, useState } from 'react';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice } from '../render/graphicsQuality';
import { ToolButton, type ToolDef } from './HudToolButton';

const HudKeys = lazy(() => import('./HudKeys').then((m) => ({ default: m.HudKeys })));
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function MoreMenuBody({ tools, level, onHelp, keys, setKeys, setOpen }: {
  tools: ToolDef[]; level: number; onHelp: () => void; keys: boolean; setKeys: (v: boolean) => void; setOpen: (v: boolean) => void;
}) {
  return (
    <>
      {keys ? (
        <Suspense fallback={null}><HudKeys /></Suspense>
      ) : (
        <>
          {/* Tiêu đề nhóm nhỏ trước từng cụm liên tiếp; thứ tự nút giữ nguyên như cũ */}
          {tools.map((t, i) => (
            <Fragment key={t.label}>
              {t.group && t.group !== tools[i - 1]?.group && <div className="hud-more-group">{t.group}</div>}
              <ToolButton tool={t} level={level} onPicked={() => setOpen(false)} />
            </Fragment>
          ))}
          <GfxButton level={level} />
          {!TOUCH && <ToolButton tool={{ icon: '⌨️', label: 'Phím', on: () => setKeys(true) }} level={level} />}
          {/* Xem lại hướng dẫn mở tiệm: cả máy cảm xúc lẫn desktop đều cần */}
          <ToolButton tool={{ icon: '📖', label: 'Hướng dẫn', on: onHelp }} level={level} onPicked={() => setOpen(false)} />
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
  const label = choice === 'auto' ? `Đồ họa: Tự động (${GFX_LABEL[st.level]})` : `Đồ họa: ${GFX_LABEL[choice]}`;
  const next = () => {
    const c = GFX_CYCLE[(GFX_CYCLE.indexOf(choice) + 1) % GFX_CYCLE.length];
    setGfxChoice(c);
    setChoice(c);
  };
  return <ToolButton tool={{ icon: '🎨', label, on: next }} level={level} />;
}

