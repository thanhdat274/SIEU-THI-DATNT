// QA bố cục responsive (không chạy tự động): dán vào console khi game đang chạy (hoặc nạp bằng eval) rồi gọi `await __sweep()` ở từng viewport.
// Kết quả `bad` rỗng = mọi hộp thoại nằm trong khung nhìn, không tràn ngang, nút đạt vùng chạm (chế độ cảm ứng). `__chrome()` kiểm HUD/footer/điều khiển.
window.__sleep = ms => new Promise(r => setTimeout(r, ms));
window.__esc = async () => { for (let i = 0; i < 3; i++) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await __sleep(250); } };
window.__dlg = () => {
  const root = document.querySelector('.store-layout-dialog,.change-product-modal,.pixel-dialog');
  if (!root) return null;
  const W = innerWidth, H = innerHeight, rr = root.getBoundingClientRect(), out = [];
  const inScrollX = e => { for (let p = e.parentElement; p && p !== root; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true; } return false; };
  root.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && getComputedStyle(e).visibility !== 'hidden' && r.right > rr.right + 1 && !inScrollX(e)) out.push((typeof e.className === 'string' ? e.className : e.tagName).slice(0, 26) + '@' + Math.round(r.right)); });
  const touch = document.documentElement.dataset.input === 'touch';
  const small = touch ? [...root.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && !b.classList.contains('layout-cell') && !b.classList.contains('save-slot-delete') && (r.height < 43 || r.width < 43); }).map(b => (b.getAttribute('aria-label') || b.textContent || b.className).trim().slice(0, 16) + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)) : [];
  return { title: (root.querySelector('h2') || {}).textContent, inVp: rr.left >= -1 && rr.top >= -1 && rr.right <= W + 1 && rr.bottom <= H + 1, rect: [rr.left, rr.top, rr.width, rr.height].map(Math.round), hOver: root.scrollWidth > root.clientWidth + 1, over: out.slice(0, 4), small: small.slice(0, 5), doc: document.documentElement.scrollWidth > W };
};
window.__tour = async () => {
  const res = []; const open = () => document.querySelector('.btn-management').click();
  open(); await __sleep(400); const n = document.querySelectorAll('.management-card').length; res.push(__dlg());
  for (let i = 0; i < n; i++) {
    const c = document.querySelectorAll('.management-card')[i]; if (!c) break;
    if (c.disabled || c.classList.contains('is-disabled')) continue;
    c.click(); await __sleep(500); const d = __dlg(); if (d && d.title !== 'Sổ quản lý tiệm') res.push(d);
    await __esc(); if (!document.querySelector('.management-card')) { open(); await __sleep(400); }
  }
  await __esc(); return res.filter(Boolean);
};
window.__tour2 = async () => {
  const res = []; const sel = '.footer-actions button, .hud-actions button';
  const labels = [...document.querySelectorAll(sel)].filter(b => !b.classList.contains('btn-management')).map(b => b.getAttribute('aria-label'));
  for (const l of labels) {
    const b = [...document.querySelectorAll(sel)].find(x => x.getAttribute('aria-label') === l);
    if (!b || /Tốc độ|Mở cửa|Đóng cửa|Kho hàng/.test(l)) continue;
    b.click(); await __sleep(600); const d = __dlg(); if (d) { d.via = l; res.push(d); } await __esc();
  }
  const t = document.querySelector('.btn-store-toggle');
  if (t && /Đóng cửa/.test(t.getAttribute('aria-label') || '')) { t.click(); await __sleep(500); }
  const lay = [...document.querySelectorAll('.hud-actions button')].find(x => x.getAttribute('aria-label') === 'Sắp xếp cửa hàng');
  if (lay) { lay.click(); await __sleep(700); const d = __dlg(); if (d) { d.via = 'layout'; res.push(d); } await __esc(); }
  return res;
};
window.__sweep = async () => {
  const all = [...await __tour(), ...await __tour2()];
  const bad = all.filter(d => !d.inVp || d.hOver || d.over.length || d.doc || d.small.length);
  return { W: innerWidth, H: innerHeight, input: document.documentElement.dataset.input, n: all.length, bad: bad.map(d => ({ t: (d.title || '').slice(0, 18), via: d.via, inVp: d.inVp, h: d.hOver, over: d.over.slice(0, 2), small: d.small.slice(0, 3), rect: d.rect })) };
};
// Kiểm tra chung ngoài modal: thanh UI trong khung nhìn, không tràn ngang.
window.__chrome = () => {
  const W = innerWidth, H = innerHeight, bad = [];
  document.querySelectorAll('.account-bar *, .game-hud *, .game-footer *, .world-tools *, .touch-controls *, .toast-stack *, .voice-panel *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(e).display !== 'none' && (r.right > W + 1 || r.left < -1 || r.bottom > H + 1)) bad.push((typeof e.className === 'string' ? e.className : e.tagName).slice(0, 24) + ':' + Math.round(r.right) + ',' + Math.round(r.bottom)); });
  const wv = document.querySelector('.world-viewport').getBoundingClientRect(); const rs = document.documentElement;
  return { W, H, sw: rs.scrollWidth, size: rs.dataset.size, or: rs.dataset.orient, world: Math.round(wv.width) + 'x' + Math.round(wv.height), bad: bad.slice(0, 5) };
};
'qa ok';
