// Dán vào console / javascript_tool của trang game đang chạy → trả JSON hộp + chữ thật của giao diện hiện tại.
// Dùng để dựng bản BASELINE trong Figma đúng từ code (r = hộp: x,y,w,h,bg,viền,độ dày viền,bo góc,isImage; t = chữ: x,y,w,h,text,size,weight,color,upper,italic).
window.__ext = function () {
  const hx = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); const a = p.length > 3 ? p[3] : 1; if (a < 0.05) return null; return '#' + p.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('') + (a < 0.98 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''); };
  const out = []; const vw = innerWidth, vh = innerHeight;
  const walk = el => {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > vh * 3) return;
    const tag = el.tagName; const bg = hx(cs.backgroundColor); const bw = parseFloat(cs.borderTopWidth) || 0; const bc = bw ? hx(cs.borderTopColor) : null;
    const hasImg = cs.backgroundImage !== 'none' && !bg;
    if (bg || bc || hasImg || ['IMG', 'SVG', 'CANVAS', 'svg'].includes(tag)) out.push(['r', Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), bg || (hasImg ? '#cccccc66' : null), bc, bw, parseFloat(cs.borderTopLeftRadius) || 0, ['IMG', 'CANVAS', 'svg'].includes(tag) ? 1 : 0]);
    if (['svg', 'CANVAS', 'IMG'].includes(tag)) return;
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (b.width < 1) continue; out.push(['t', Math.round(b.x), Math.round(b.y), Math.round(b.width) + 1, Math.round(b.height), n.textContent.trim().replace(/\s+/g, ' '), parseFloat(cs.fontSize), +cs.fontWeight, hx(cs.color) || '#000000', cs.textTransform === 'uppercase' ? 1 : 0, cs.fontStyle === 'italic' ? 1 : 0]); }
      else if (n.nodeType === 1) walk(n);
    }
  };
  walk(document.body); return JSON.stringify({ vw, vh, n: out });
};
