/**
 * Hệ thống responsive dùng chung cho toàn bộ giao diện (HUD, footer, modal, toast, điều khiển cảm ứng).
 *
 * Không có nhánh theo tên/model thiết bị. Mọi quyết định bố cục dựa trên: kích thước khung nhìn thực
 * (innerWidth/innerHeight), hướng màn hình, kiểu con trỏ chính, safe-area và chiều cao thật của các thanh UI.
 * Kết quả được ghi lên <html> để CSS (`responsive.css`) dùng:
 *   data-size    compact (<640) | medium (<1024) | expanded (<1600) | wide (>=1600)   theo bề ngang khả dụng
 *   data-orient  portrait | landscape
 *   data-short   "true" khi chiều cao < 500px (điện thoại ngang): CSS gom thanh dưới thành cột bên phải
 *   --hud-bottom toạ độ đáy của HUD; toast/chip hướng dẫn neo theo biến này thay vì số cố định
 *   --footer-h   chiều cao thanh dưới (0 khi nó là cột bên phải); voice/thẻ tóm tắt neo phía trên nó
 *   --account-h  chiều cao thanh tài khoản
 * Canvas thế giới có hệ thống scale riêng (game-renderer) nên không bị ảnh hưởng ở đây.
 */

/** Ngưỡng dùng chung: dưới đây kho hàng là ngăn kéo phủ lên thế giới thay vì cột cố định. */
export const OVERLAY_DOCK_QUERY = '(max-width: 1023px), (max-height: 499px)';

const SIZE_BREAKPOINTS: ReadonlyArray<readonly [number, string]> = [[640, 'compact'], [1024, 'medium'], [1600, 'expanded']];

export function sizeClassFor(width: number): string {
  for (const [limit, name] of SIZE_BREAKPOINTS) if (width < limit) return name;
  return 'wide';
}

function viewportSize(): { width: number; height: number } {
  // innerWidth/innerHeight đổi cùng lúc với media query CSS (kể cả khi thanh địa chỉ di động co/giãn), nên data-* luôn khớp CSS.
  return { width: window.innerWidth, height: window.innerHeight };
}

let installed = false;

export function installResponsive(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const root = document.documentElement;
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule());
  const observed = new Set<Element>();
  let raf = 0;

  const setVar = (name: string, value: string) => { if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value); };
  const setAttr = (name: string, value: string) => { if (root.getAttribute(name) !== value) root.setAttribute(name, value); };

  const measure = () => {
    raf = 0;
    const { width, height } = viewportSize();
    setAttr('data-size', sizeClassFor(width));
    setAttr('data-orient', height > width ? 'portrait' : 'landscape');
    setAttr('data-short', height < 500 ? 'true' : 'false');
    setVar('--app-h', `${Math.round(height)}px`);

    const hud = document.querySelector<HTMLElement>('.game-hud');
    const footer = document.querySelector<HTMLElement>('.game-footer');
    const account = document.querySelector<HTMLElement>('.account-bar');
    if (hud) setVar('--hud-bottom', `${Math.ceil(hud.getBoundingClientRect().bottom)}px`);
    if (account) setVar('--account-h', `${Math.ceil(account.getBoundingClientRect().height)}px`);
    if (footer) {
      const r = footer.getBoundingClientRect();
      // Cột bên phải (điện thoại ngang): không chiếm chiều cao của thế giới.
      setVar('--footer-h', r.width >= r.height ? `${Math.ceil(r.height)}px` : '0px');
    }
    for (const el of [hud, footer, account]) {
      if (el && !observed.has(el)) { observed.add(el); resizeObserver?.observe(el); }
    }
    // Phần tử bị gỡ khỏi DOM (vào/ra màn chơi): thôi theo dõi để không giữ tham chiếu.
    for (const el of observed) if (!el.isConnected) { observed.delete(el); resizeObserver?.unobserve(el); }
  };
  function schedule() { if (!raf) raf = window.setTimeout(measure, 16); }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule); // thanh địa chỉ/bàn phím di động
  // HUD/footer chỉ có sau khi tải xong màn chơi: kiểm lại định kỳ nhẹ cho tới khi cả ba thanh được theo dõi.
  const poll = window.setInterval(() => { schedule(); }, 1000);
  window.addEventListener('pagehide', () => window.clearInterval(poll), { once: true });
  measure();
}
