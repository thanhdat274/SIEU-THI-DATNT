/**
 * Đo lãi gộp/ngày theo cấp thành phố mà mỗi sổ góp (civic-city-goals) bật: cấp 4/5/7/9.
 * Ánh xạ cấp thành phố → cấp người chơi: nguồn `BUILDING_TYPE_DEFS[loại].unlockLevel` của tòa civic mà sổ đó xây
 * (park 10, clinic 15, ward_police 20, primary_school 25) — không có công thức cấp thành phố → cấp người chơi trong code.
 * So một trang sổ (≈80% giá xây `CIVIC_DEFS`) với số ngày lãi gộp. Kệ luôn đầy (giá vốn 3.000) ⇒ lãi là TRẦN.
 * Chạy: yarn --cwd packages/game-core civic-bundle-sweep   (QA_SEEDS mặc định 3, QA_DAYS mặc định 15)
 */
import { isSalesFixture } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, BUILDING_TYPE_DEFS, CIVIC_BUNDLES, CIVIC_DEFS, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';

const SEEDS = Number(process.env.QA_SEEDS ?? 3);
const DAYS = Number(process.env.QA_DAYS ?? 15);
const PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'xa_phong', 'banh_quy', 'sua_ong_tho', 'keo_cao_su'];
const PAGE_RATIO = 0.8;
const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };

function grossPerDay(level: number, seed: string): number {
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
  save.player = { ...save.player, level, money: 20_000_000 };
  save.worldTime = { ...save.worldTime, isStoreOpen: false };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const refill = () => sim.getFixtures().filter(isSalesFixture).forEach((shelf, i) => {
    shelf.assignedProductId = shelf.assignedProductId ?? PRODUCTS[i % PRODUCTS.length];
    shelf.currentStock = Math.max(shelf.currentStock ?? 0, 14);
    shelf.stockLots = [{ quantity: shelf.currentStock, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  });
  refill();
  if (!sim.getTime().isStoreOpen) sim.getClock().toggleStoreStatus();
  const startDay = sim.getTime().day;
  let day = startDay, hour = sim.getTime().hour, guard = 0;
  const gross: number[] = [];
  while (sim.getTime().day < startDay + DAYS && guard++ < 8_000_000) {
    const t = sim.getTime();
    if (t.day !== day) { gross.push(sim.getDailyRecords()[day]?.grossProfit ?? 0); day = t.day; refill(); }
    if (t.hour !== hour) { hour = t.hour; refill(); }
    if (!t.isStoreOpen && t.hour >= 7 && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }
  return gross.reduce((a, b) => a + b, 0) / Math.max(1, gross.length);
}

console.log(`Sổ góp theo cấp thành phố: ${SEEDS} seed × ${DAYS} ngày (kệ đầy ⇒ lãi gộp là TRẦN)`);
for (const bundle of CIVIC_BUNDLES) {
  const def = CIVIC_DEFS.find(d => d.buildingTypeId === bundle.buildingTypeId)!;
  const level = BUILDING_TYPE_DEFS[bundle.buildingTypeId as keyof typeof BUILDING_TYPE_DEFS].unlockLevel;
  const gains = Array.from({ length: SEEDS }, (_, i) => grossPerDay(level, `civic-bundle-${i + 1}`));
  const page = def.buildCost * PAGE_RATIO;
  const gross = median(gains);
  console.log(`${bundle.id}: cấp TP ${bundle.revealedByCityLevel} → cấp người chơi ${level} | lãi gộp/ngày p50 ${vnd(gross)} (${gains.map(vnd).join(' / ')}) | giá xây ${vnd(def.buildCost)}, một trang ≈80% = ${vnd(page)} = ${(page / gross).toFixed(2)} ngày lãi ${page / gross < 0.5 || page / gross > 3 ? '⚠ LỆCH' : 'OK'}`);
}
