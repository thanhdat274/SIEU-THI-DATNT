import { useEffect, useState } from 'react';
import { HUD_TOUR_STEPS } from '../data/hudTour';

/**
 * GĐ1503 — lớp tour HUD: dim 4 dải quanh ô được khoanh (chừa lỗ cho element thật
 * nhận bấm), đi tiếp khi bấm ĐÚNG element được khoanh, có nút Bỏ qua. Không đụng
 * kinh tế — gọi onDone là cờ "đã xem" trong store.
 */
export function HudTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = HUD_TOUR_STEPS[Math.min(index, HUD_TOUR_STEPS.length - 1)];

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.querySelector(step.sel);
    if (!el) {
      // Element không tồn tại (màn hình khác) → bỏ qua bước, tránh treo tour
      setIndex((v) => v + 1);
      return;
    }
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step.sel]);

  // Bấm vào element được khoanh thì đi tiếp: element nằm NGOÀI lớp phủ (lỗ chừa trống)
  // nên click của nó KHÔNG bubble lên overlay — phải nghe ở document (bắt pha capture).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onDocClick = (e: MouseEvent) => {
      const el = document.querySelector(step.sel);
      if (!el || !el.contains(e.target as Node)) return;
      if (index + 1 >= HUD_TOUR_STEPS.length) onDone();
      else setIndex(index + 1);
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [step.sel, index, onDone]);

  // Môi trường node (test render tĩnh) hoặc hết bước → không vẽ gì
  if (typeof document === 'undefined' || index >= HUD_TOUR_STEPS.length) return null;
  if (!rect) return null;

  const pad = 6;
  const [l, t, r, b] = [rect.left - pad, rect.top - pad, rect.right + pad, rect.bottom + pad];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const shade = (x: number, y: number, w: number, h: number, key: string) =>
    w > 0 && h > 0 ? <div key={key} className="hud-tour-shade" style={{ left: x, top: y, width: w, height: h }} /> : null;
  const tipBelow = step.tip === 'below';
  const tipTop = tipBelow ? b + 10 : Math.max(10, t - 86);

  return (
    <div className="hud-tour">
      {shade(0, 0, vw, t, 'top')}
      {shade(0, b, vw, vh - b, 'bottom')}
      {shade(0, t, l, b - t, 'left')}
      {shade(r, t, vw - r, b - t, 'right')}
      <div className="hud-tour-ring" style={{ left: l, top: t, width: r - l, height: b - t }} />
      <div className={`hud-tour-tip ${tipBelow ? 'below' : 'above'}`} style={{ left: Math.max(10, Math.min(l, vw - 320)), top: tipTop }}>
        <b>{step.text}</b>
        <small>{`Bấm đúng ô được khoanh để đi tiếp · ${index + 1}/${HUD_TOUR_STEPS.length}`}</small>
      </div>
      <button
        className="hud-tour-skip"
        onClick={(e) => { e.stopPropagation(); onDone(); }}
      >
        Bỏ qua hướng dẫn
      </button>
    </div>
  );
}
