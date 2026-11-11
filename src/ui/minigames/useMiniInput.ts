import { useEffect, useRef } from 'react';

/**
 * Hệ 7 — đầu vào chạm/kéo thống nhất chuột + cảm ứng (SPEC-CHIEU-RONG §7.4).
 *
 * Các trò vẽ bằng DOM/CSS + canvas 2D cần một cách chung để biết ngón/chuột đang ở đâu, theo
 * toạ độ CHUẨN HOÁ 0..1 so với khung container (đỡ phụ thuộc kích thước màn hình — mục tiêu
 * chạy mượt trên điện thoại nhỏ và máy yếu).
 *
 * Trả về một ref chứa vị trí con trỏ hiện tại (`x`,`y` ∈ [0,1], `null` khi đang không chạm),
 * cập nhật qua sự kiện Pointer (gộp mouse/touch/pen nên chỉ cần một bộ lắng nghe).
 */
export function useMiniInput(ref: React.RefObject<HTMLElement | null>) {
  const pos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const toLocal = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };
    const down = (e: PointerEvent) => {
      const p = toLocal(e);
      if (!p) return;
      pos.current = p;
      try { el.setPointerCapture(e.pointerId); } catch { /* máy yếu / cũ */ }
    };
    const move = (e: PointerEvent) => {
      if (pos.current) { const p = toLocal(e); if (p) pos.current = p; }
    };
    const up = () => { pos.current = null; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [ref]);

  return pos;
}
