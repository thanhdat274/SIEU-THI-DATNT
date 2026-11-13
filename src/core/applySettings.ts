/** Áp cài đặt lên DOM (độ sáng, cỡ giao diện, cỡ chữ, giảm chuyển động, tương phản, icon tương phản). Gọi một lần lúc khởi động. */
import { getSettings, onSettings, type Settings } from './settings';

const FONT: Record<Settings['fontSize'], string> = { small: '14px', normal: '16px', large: '19px' };

export function applyDom(s: Settings = getSettings()) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const game = document.getElementById('game');
  const ui = document.getElementById('ui');
  if (ui) (ui.style as CSSStyleDeclaration & { zoom: string }).zoom = s.uiScale === 1 ? '' : String(s.uiScale);
  root.style.fontSize = FONT[s.fontSize];
  // Mù màu: lọc SVG áp lên cả cảnh 3D lẫn giao diện (độ sáng của cảnh ghép thêm vào cùng filter)
  const cb = s.colorblind === 'off' ? '' : ` url(#cb-${s.colorblind})`;
  if (game) game.style.filter = (s.brightness === 1 ? '' : `brightness(${s.brightness})`) + cb;
  if (ui) ui.style.filter = ((s.highContrast ? 'contrast(1.25) saturate(1.1)' : '') + cb).trim();
  root.classList.toggle('reduce-motion', s.reduceMotion);
  root.classList.toggle('high-contrast', s.highContrast);
  root.classList.toggle('icon-contrast', s.iconContrast);
}

let styleEl: HTMLStyleElement | null = null;
export function initSettingsDom() {
  if (typeof document === 'undefined') return;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.textContent = `
      .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    `;
    document.head.appendChild(styleEl);
    // Ma trận mô phỏng/bù mù màu (protan = đỏ, deutan = lục, tritan = lam)
    const m = (v: string) => `<feColorMatrix type="matrix" values="${v}"/>`;
    const svg = document.createElement('div');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<svg width="0" height="0"><defs>
      <filter id="cb-protan" color-interpolation-filters="sRGB">${m('0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0')}</filter>
      <filter id="cb-deutan" color-interpolation-filters="sRGB">${m('0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0')}</filter>
      <filter id="cb-tritan" color-interpolation-filters="sRGB">${m('0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0')}</filter>
    </defs></svg>`;
    document.body.appendChild(svg);
  }
  applyDom();
  onSettings((s) => applyDom(s));
}
