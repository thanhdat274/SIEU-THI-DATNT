import { useEffect } from 'react';

/**
 * SPEC-TOI-UU §T6-L3 — focus "đúng chỗ" khi mở bảng từ Sổ việc / dải HUD.
 * Bảng nhận `${focus}` thì gọi hook này với focus; hook cuộn phần tử có
 * `data-focus="${focus}"` vào giữa màn hình rồi nháy viền vàng 1,8 giây.
 * Không có phần tử khớp thì không làm gì (giữ bảng mở bình thường).
 */
export function useFocusPulse(focus?: string) {
  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '2px solid #f1c40f';
    el.style.borderRadius = '6px';
    const t = setTimeout(() => {
      el.style.outline = '';
      el.style.borderRadius = '';
    }, 1800);
    return () => clearTimeout(t);
  }, [focus]);
}
