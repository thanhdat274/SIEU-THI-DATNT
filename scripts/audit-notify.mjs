// Rà thông báo: đếm theo ký tự (code point) và theo grapheme, kiểm NFC, ước lượng nội suy dài hơn 6 ký tự.
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
const root = 'src';
const files = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  if (n === '__tests__' || n === 'dev') return [];
  return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
});
const re = /notify\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
const all = [];
for (const f of files(root)) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(re)) all.push({ f, t: m[1].slice(1, -1) });
}
const seg = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const rows = all.map(({ f, t }) => {
  // Biểu thức điều kiện ${c ? 'a' : 'b'}: tính theo nhánh chuỗi dài nhất (trường hợp xấu nhất), không phải 6 ký tự.
  const x = t.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, (e) => {
    const lits = [...e.matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map((m) => (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, 'xxxxxx'));
    return lits.length && e.includes('?') ? lits.sort((a, b) => b.length - a.length)[0] : 'xxxxxx';
  });
  return { f, t, cp: [...x].length, gr: [...seg.segment(x)].length, nf: t !== t.normalize('NFC'), ph: (t.match(/\$\{/g) || []).length };
});
console.log('tổng', rows.length, '| không NFC', rows.filter((r) => r.nf).length, '| >90 (code point)', rows.filter((r) => r.cp > 90).length);
console.log('dài nhất cp', Math.max(...rows.map((r) => r.cp)), '| grapheme', Math.max(...rows.map((r) => r.gr)));
const real = rows.map((r) => ({ ...r, est: r.cp + r.ph * 6 }));
console.log('ước lượng >90 nếu mỗi ${} dài 12 ký tự:', real.filter((r) => r.est > 90).length);
for (const r of real.filter((r) => r.est > 85).sort((a, b) => b.est - a.est)) console.log(r.est, r.cp, r.f, '|', r.t);
