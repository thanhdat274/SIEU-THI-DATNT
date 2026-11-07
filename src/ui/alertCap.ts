import { useEffect, useState, type RefObject } from 'react';

/** Playtest P0 M4: tối đa bao nhiêu thẻ thông báo hiện cùng lúc (còn lại gom sau nút "+N"). */
export const ALERT_CAP = 2;

/**
 * Chọn thẻ nào ẩn: thẻ nguy cấp (danger) và hướng dẫn ngày đầu luôn hiện, không tính vào hạn mức;
 * các thẻ khác hiện theo thứ tự trong DOM tới đủ `cap`, phần còn lại ẩn.
 */
export function pickHidden(classLists: readonly string[][], cap = ALERT_CAP): boolean[] {
  let shown = 0;
  return classLists.map((c) => {
    if (c.includes('danger') || c.includes('hud-tutorial')) return false;
    shown += 1;
    return shown > cap;
  });
}

/** Ẩn bớt thẻ con `.hud-alert` của khung, theo dõi DOM thay đổi. Trả số thẻ đang bị gom. */
export function useAlertCap(ref: RefObject<HTMLElement | null>, expanded: boolean): number {
  const [hiddenCount, setHiddenCount] = useState(0);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const apply = () => {
      const cards = [...box.children].filter((e): e is HTMLElement => e instanceof HTMLElement && e.classList.contains('hud-alert'));
      const hide = expanded ? cards.map(() => false) : pickHidden(cards.map((e) => [...e.classList]));
      cards.forEach((e, i) => { e.style.display = hide[i] ? 'none' : ''; });
      setHiddenCount(hide.filter(Boolean).length);
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(box, { childList: true });
    return () => mo.disconnect();
  }, [ref, expanded]);
  return hiddenCount;
}
