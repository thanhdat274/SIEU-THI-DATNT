// Bản tóm tắt trạng thái game (digest) để làm nền cho "bảng góp ý người dùng ảo" (persona feedback panel).
// Đọc PROGRESS.md + promt_game.md, trích ra: giai đoạn hiện tại, vài GĐ gần nhất, tầm nhìn,
// tính năng chính, luật cứng và ngân sách chống phình — để các persona mô phỏng góp ý BÁM tính năng
// thật, không bịa. Phần nội dung góp ý do agent viết; script này chỉ cho cái "sàn" tất định.
// Chạy: `npm run persona:digest` — in digest ra stdout. Không đọc/ghi file nào khác.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lấy số GĐ lớn nhất xuất hiện trong văn bản (định dạng GĐxxxx hoặc GĐx). */
export function latestGd(text) {
  const gds = [...text.matchAll(/GĐ(\d{2,4})/g)].map((m) => Number(m[1]));
  return gds.length ? Math.max(...gds) : null;
}

/** Trích các dòng "GĐxxxx (...)" trong phần Trạng thái hiện tại (mốc gần đây). */
export function recentMilestones(text) {
  const lines = text.split('\n').filter((l) => /^[-*]\s*\*{0,2}\s*GĐ(\d{2,4})/.test(l.trim()));
  return lines
    .map((l) => l.trim().replace(/^[-*]\s*\*{0,2}\s*/, ''))
    .slice(0, 12);
}

/** Trích danh sách luật cứng (mục "Luật cứng" trong promt_game.md) — dòng đánh số `n.`. */
export function hardRules(text) {
  return [...text.matchAll(/^\s*\d+\.\s(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((l) => l.length > 0)
    .slice(0, 12);
}

/** Trích bảng "Ngân sách chống phình": các hàng dạng `| Thứ | ... |`. */
export function budgetsTable(text) {
  return text
    .split('\n')
    .filter((l) => /^\|/.test(l.trim()) && !/^\|\s*(Thứ|---)/.test(l.trim()))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((cells) => cells.length >= 2 && cells[0]);
}

/** Trích tầm nhìn: các dòng dưới tiêu đề "Tầm nhìn game" đến hết đoạn Game là gì. */
export function vision(text) {
  const lines = text.split('\n');
  let start = lines.findIndex((l) => /Tầm nhìn game/.test(l));
  if (start === -1) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    // Dừng khi gặp tiêu đề mục khác (## / #); các dòng `**…**` là NỘI DUNG tầm nhìn, giữ lại.
    if (/^#{1,6}\s/.test(l)) break;
    if (l.trim()) out.push(l.trim());
  }
  return out.join(' ');
}

/**
 * Dựng digest từ nội dung PROGRESS.md và promt_game.md.
 * @returns {object} digest có cấu trúc (sàn tất định để agent viết góp ý bám thực tế).
 */
export function buildDigest({ progress, prompt }) {
  if (!progress || !prompt) throw new Error('Cần cả progress (PROGRESS.md) và prompt (promt_game.md)');
  return {
    gameName: 'Tạp Hóa 3D',
    generatedAt: new Date().toISOString().slice(0, 10),
    currentGd: latestGd(progress),
    recentMilestones: recentMilestones(progress),
    vision: vision(progress),
    hardRules: hardRules(prompt),
    budgets: budgetsTable(prompt),
  };
}

/** Đọc 2 file từ đĩa và buildDigest. Dùng khi chạy CLI. */
export function digestFromDisk() {
  const progress = readFileSync(join(ROOT, 'PROGRESS.md'), 'utf8');
  const prompt = readFileSync(join(ROOT, 'promt_game.md'), 'utf8');
  return buildDigest({ progress, prompt });
}

if (process.argv[1]?.endsWith('persona-digest.mjs')) {
  const d = digestFromDisk();
  const fmtBudget = (cells) => `${cells[0]} — trần: ${cells[1] ?? ''}`;
  console.log(`# Digest game ${d.gameName}`);
  console.log(`Tạo: ${d.generatedAt} · GĐ hiện tại: ${d.currentGd ?? '?'}`);
  console.log('\n## Tầm nhìn');
  console.log(d.vision);
  console.log('\n## Trạng thái hiện tại (GĐ gần đây)');
  for (const m of d.recentMilestones) console.log(`- ${m}`);
  console.log('\n## Luật cứng');
  d.hardRules.forEach((r, i) => console.log(`${i + 1}. ${r}`));
  console.log('\n## Ngân sách chống phình');
  for (const c of d.budgets) console.log(`- ${fmtBudget(c)}`);
  console.log('\n(Digest tất định — dùng làm nền; nội dung góp ý do agent viết theo skill feedback-panel.)');
}
