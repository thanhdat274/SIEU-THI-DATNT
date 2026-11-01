// GĐ678 — mutation tạm: cho glb trở lại nhánh cache-first của /assets (tái hiện bug cũ).
// Chạy: node dev/mutate_sw.cjs  (restore bằng `git restore public/sw.js`)
const fs = require('fs');
const p = 'public/sw.js';
const s = fs.readFileSync(p, 'utf8');
const s2 = s.replace(
  "if (url.pathname.startsWith('/assets/') && /\\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|json|ico)$/.test(url.pathname)) {",
  "if (/\\.(?:js|css|glb)$/.test(url.pathname) || url.pathname.startsWith('/assets/')) {",
);
if (s2 === s) { console.log('NO CHANGE — pattern không khớp'); process.exit(1); }
fs.writeFileSync(p, s2);
console.log('mutated: glb đã vào nhánh cache-first');
