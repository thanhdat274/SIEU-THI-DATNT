/**
 * Tiền hiển thị (Cài đặt → Tiền tệ). Số liệu trong game luôn là đồng; ở đây chỉ đổi cách VẼ chữ.
 * Chữ tiền nằm rải khắp nơi (formatMoney lẫn hàng trăm chuỗi viết sẵn "5.000đ"), nên thay vì sửa từng chỗ,
 * `initCurrencyDom` quét mọi nút chữ trên trang: bật đô la thì đổi "12.000đ" → "$0.48", bật lại đồng thì khôi phục
 * nguyên văn. Chữ do React vẽ lại sau đó cũng được đổi tiếp (MutationObserver), nên chuyển qua lại không sót màn nào.
 */
import { getSettings, onSettings, type Settings } from './settings';
import { fmtNum } from './format';

export const USD_RATE = 25000;

/** "12.000đ" / "12.000 đ" / "12000₫" / "12,000đ" (bản tiếng Anh) — số kiểu Việt (chấm ngăn nghìn), đơn vị không dính chữ cái sau (khỏi nhầm "5 đơn"). */
// Bản tiếng Anh ngăn nghìn bằng phẩy ("12,000đ") — nhánh phẩy đứng TRƯỚC \d+ để không bị đọc "12" + phần thập phân ",000".
const VND_RE = /(\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+(?!\d)|\d+)(?:,\d+)?(\s?)(?:đ|₫)(?![\p{L}])/gu;

export function usdText(vnd: number): string {
  const d = vnd / USD_RATE;
  const a = Math.abs(d);
  const digits = a >= 100 ? 0 : 2;
  return `${d < 0 ? '-' : ''}$${a.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Đổi mọi số tiền đồng trong một đoạn chữ sang đô la. Đoạn không có tiền thì giữ nguyên. */
export function toUsdText(text: string): string {
  return text.replace(VND_RE, (_m, n: string) => usdText(Number(n.replace(/[.,]/g, ''))));
}

/** Cho nơi không có DOM (chữ vẽ lên canvas 3D): số tiền theo tiền tệ đang chọn. */
export function moneyShown(vnd: number, cur: Settings['currency'] = getSettings().currency): string {
  return cur === 'usd' ? usdText(vnd) : `${fmtNum(Math.round(vnd))}đ`;
}

const shown = new WeakMap<Text, { orig: string; out: string }>();
let obs: MutationObserver | null = null;

function convertNode(t: Text) {
  const rec = shown.get(t);
  const v = t.nodeValue ?? '';
  if (rec && rec.out === v) return; // chính mình vừa ghi
  const out = toUsdText(v);
  if (out !== v) { shown.set(t, { orig: v, out }); t.nodeValue = out; } else shown.delete(t);
}

function walk(root: Node, fn: (t: Text) => void) {
  if (root.nodeType === 3) return fn(root as Text);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) fn(n as Text);
}

function restoreNode(t: Text) {
  const rec = shown.get(t);
  if (rec && t.nodeValue === rec.out) t.nodeValue = rec.orig;
  shown.delete(t);
}

export function applyCurrencyDom(cur: Settings['currency'] = getSettings().currency) {
  if (typeof document === 'undefined' || !document.body) return;
  obs?.disconnect();
  obs = null;
  if (cur === 'usd') {
    walk(document.body, convertNode);
    obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') convertNode(m.target as Text);
        else m.addedNodes.forEach((n) => walk(n, convertNode));
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  } else {
    walk(document.body, restoreNode);
  }
}

let started = false;
export function initCurrencyDom() {
  if (started || typeof document === 'undefined') return;
  started = true;
  let last = getSettings().currency;
  const run = () => applyCurrencyDom();
  if (document.body) run(); else document.addEventListener('DOMContentLoaded', run, { once: true });
  onSettings((s) => { if (s.currency !== last) { last = s.currency; applyCurrencyDom(s.currency); } });
}
