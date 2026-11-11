#!/usr/bin/env node
/**
 * SPEC-TOI-UU §T1 (L4) — Đọc số liệu telemetry ẩn danh và in `docs/telemetry/BAO-CAO-<ngày>.md`
 * với năm bảng ứng năm câu hỏi ở SPEC. Không dựng dashboard.
 *
 * Nguồn dữ liệu: ưu tiên MongoDB (telemetry collection, như server), nếu không kết nối được thì
 * đọc thư mục `docs/telemetry/export/` (các file .json, mỗi file là 1 mảng bản ghi DayReport).
 * Chạy: `npm run telemetry:report`.
 */
import { config } from 'dotenv';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../server/.env') });
const env = process.env;
const DATE = new Date().toISOString().slice(0, 10);

// hiện độ khích lệ nếu có nhiều hơn 30 bản ghi cùng một install trong một ngày (dấu hiệu sửa)
const ESCAPE_LEVEL = 200;

async function load(collection) {
  const docs = await collection.find({}).sort({ createdAt: 1 }).toArray();
  const reports = [];
  for (const d of docs) {
    const r = d.report;
    if (!r || typeof r !== 'object') continue;
    r._install = d.install;
    r._createdAt = d.createdAt;
    r._at = r._createdAt;
    reports.push(r);
  }
  return reports;
}

async function loadFromExport(dir) {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const reports = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
    for (const r of arr) if (r && typeof r === 'object') reports.push(r);
  }
  return reports;
}

const pct = (a, b) => (b === 0 ? '—' : `${(100 * a / b).toFixed(0)}%`);
const vi = (n) => (n ?? 0).toLocaleString('vi-VN');

function report(reports) {
  const rows = [];
  const byInstall = new Map();
  for (const r of reports) {
    const i = r._install ?? r.install ?? '?';
    if (!byInstall.has(i)) byInstall.set(i, []);
    byInstall.get(i).push(r);
  }
  const installs = [...byInstall.values()];

  // 1) Phễu: bao nhiêu install qua ngày 1/3/7; rời ở cấp nào.
  const reach = { d1: 0, d3: 0, d7: 0 };
  const exitLevel = new Map();
  const total = installs.length;
  for (const arr of installs) {
    const maxDay = Math.max(...arr.map((r) => r.day ?? 0));
    if (maxDay >= 1) reach.d1++;
    if (maxDay >= 3) reach.d3++;
    if (maxDay >= 7) reach.d7++;
    const last = arr[arr.length - 1];
    const lv = Math.min(last?.level ?? 0, ESCAPE_LEVEL);
    exitLevel.set(lv, (exitLevel.get(lv) ?? 0) + 1);
  }
  const levels = [...exitLevel.entries()].sort((a, b) => a[0] - b[0]);
  const dropTop = (() => {
    const bands = [1, 10, 30, 60, 100];
    return bands.map((b) => {
      const n = levels.filter(([lv]) => lv < b).reduce((s, [, c]) => s + c, 0);
      return `${b}: ${pct(n, total)}`;
    }).join(' · ');
  })();

  // 2) Phút thật để tới cấp 10/30/60/100 (cộng dồn realSec theo ngày game).
  const toLevel = { 10: [], 30: [], 60: [], 100: [] };
  const MIN = 60;
  for (const arr of installs) {
    // tìm ngày game đầu tiên đạt cấp, cộng dồn realSec tới đó.
    const sorted = [...arr].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    for (const lv of Object.keys(toLevel)) {
      let c = 0;
      for (const r of sorted) {
        c += r.realSec ?? 0;
        if ((r.level ?? 0) >= Number(lv)) { if (toLevel[lv].length < 40) toLevel[lv].push(c / MIN); break; }
      }
    }
  }
  const med = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s[Math.floor(s.length / 2)]; return m.toFixed(0); };

  // 3) Bảng nào ít mở / hệ mở khoá nhưng không dùng.
  const panelSum = new Map();
  const usedSet = new Map();
  for (const r of reports) {
    for (const [p, n] of Object.entries(r.panels ?? {})) panelSum.set(p, (panelSum.get(p) ?? 0) + n);
    for (const u of r.used ?? []) usedSet.set(u, (usedSet.get(u) ?? 0) + 1);
  }
  const leastPanels = [...panelSum.entries()].sort((a, b) => a[1] - b[1]).slice(0, 10);

  // 4) FPS thật theo gfx × device.
  const fpsCells = new Map();
  for (const r of reports) {
    const k = `${r.gfx ?? '?'}/${r.device ?? '?'}`;
    const v = fpsCells.get(k) ?? [];
    if (typeof r.fps === 'number') v.push(r.fps);
    fpsCells.set(k, v);
  }

  // 5) Rời game sau chuyện gì — bản ghi gần nhất của install không quay lại (ngày game tăng rồi dừng).
  const exitFlags = { fainted: 0, shortfall: 0, inspectFail: 0, clean: 0 };
  for (const arr of installs) {
    const last = arr[arr.length - 1];
    if (!last) continue;
    if (last.fainted) exitFlags.fainted++;
    else if (last.shortfall) exitFlags.shortfall++;
    else if (last.inspectFail) exitFlags.inspectFail++;
    else exitFlags.clean++;
  }

  rows.push(`# Báo cáo người chơi — ${DATE}`);
  rows.push('');
  rows.push(`Nguồn: telemetry ẩn danh · **${vi(total)}** người (install) · **${vi(reports.length)}** bản ghi.`);
  rows.push('');
  rows.push('## 1. Phễu giữ chân');
  rows.push('');
  rows.push('| Mốc | Số người | Tỉ lệ |');
  rows.push('|---|---|---|');
  rows.push(`| Qua ngày 1 | ${vi(reach.d1)} | ${pct(reach.d1, total)} |`);
  rows.push(`| Qua ngày 3 | ${vi(reach.d3)} | ${pct(reach.d3, total)} |`);
  rows.push(`| Qua ngày 7 | ${vi(reach.d7)} | ${pct(reach.d7, total)} |`);
  rows.push('');
  rows.push(`Rời trước cấp (so tổng): ${dropTop}`);
  rows.push('');
  rows.push('## 2. Phút chơi thật tới mốc cấp');
  rows.push('');
  rows.push('| Cấp | Trung vị phút | Số người đạt |');
  rows.push('|---|---|---|');
  for (const [lv, arr] of Object.entries(toLevel)) rows.push(`| ${lv} | ${arr.length ? `${med(arr)} phút` : '—'} | ${arr.length} |`);
  rows.push('');
  rows.push('## 3. Những thứ ít được dùng');
  rows.push('');
  rows.push('Bảng mở ít nhất (lượt mở bảng):');
  rows.push('');
  rows.push('| Bảng | Lượt mở |');
  rows.push('|---|---|');
  for (const [p, n] of leastPanels) rows.push(`| ${p} | ${vi(n)} |`);
  rows.push('');
  rows.push(`Hệ có thao tác (số bản ghi có dùng): ${[...usedSet.entries()].sort((a, b) => b[1] - a[1]).map(([u, n]) => `${u}=${vi(n)}`).join(', ')}`);
  rows.push('');
  rows.push('## 4. FPS thật');
  rows.push('');
  rows.push('| Đồ hoạ / thiết bị | Trung vị FPS | Mẫu |');
  rows.push('|---|---|---|');
  for (const [k, arr] of [...fpsCells.entries()].sort()) rows.push(`| ${k} | ${med(arr) ?? '—'} | ${vi(arr.length)} |`);
  rows.push('');
  rows.push('## 5. Rời game sau chuyện gì (bản ghi cuối của người không quay lại)');
  rows.push('');
  rows.push('| Dấu hiệu | Số người |');
  rows.push('|---|---|');
  rows.push(`| Ngất | ${vi(exitFlags.fainted)} |`);
  rows.push(`| Âm tiền | ${vi(exitFlags.shortfall)} |`);
  rows.push(`| Bị thanh tra phạt | ${vi(exitFlags.inspectFail)} |`);
  rows.push(`| Kết thúc bình thường | ${vi(exitFlags.clean)} |`);
  rows.push('');
  return rows.join('\n');
}

async function main() {
  const exportDir = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/telemetry/export');
  let reports;
  let source;
  try {
    if (env.MONGO_URI || env.MONGODB_URI) {
      const client = await new MongoClient(env.MONGO_URI ?? env.MONGODB_URI).connect();
      const collection = client.db(env.MONGODB_DATABASE ?? 'taphoa3d').collection('telemetry');
      reports = await load(collection);
      source = 'MongoDB (telemetry)';
      await client.close();
    } else {
      throw new Error('chưa có MONGO_URI');
    }
  } catch {
    reports = await loadFromExport(exportDir);
    source = `export/ (${reports.length} bản)`;
  }
  const md = report(reports);
  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/telemetry');
  mkdirSync(outDir, { recursive: true });
  const file = resolve(outDir, `BAO-CAO-${DATE}.md`);
  writeFileSync(file, md + '\n', 'utf8');
  console.log(`Đã ghi ${file} (nguồn: ${source})`);
  console.log(md.split('\n').slice(0, 6).join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
