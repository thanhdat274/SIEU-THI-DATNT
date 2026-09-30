/**
 * Quét cân bằng không đầu (headless): chạy nhiều hạt giống × nhiều ngày với kệ luôn đầy,
 * in dải chỉ số giá, tần suất sự kiện, khách/ngày và số khách bỏ đi.
 * Đây là số đo từ mô phỏng, KHÔNG thay thế playtest thật với người chơi.
 * Chạy: yarn workspace @game/core balance
 */
import { isSalesFixture } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, PRICED_CATEGORIES, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { createMarketState } from './market';

const SEEDS = ['balance-a', 'balance-b', 'balance-c', 'balance-d', 'balance-e'];
const DAYS = Number(process.env.BALANCE_DAYS ?? 40);
const PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];

const range = () => ({ min: Infinity, max: -Infinity });
const widen = (r: { min: number; max: number }, v: number) => { r.min = Math.min(r.min, v); r.max = Math.max(r.max, v); };

const priceRange: Record<string, { min: number; max: number }> = Object.fromEntries(PRICED_CATEGORIES.map(c => [c, range()]));
const wholesaleRange: Record<string, { min: number; max: number }> = Object.fromEntries(PRICED_CATEGORIES.map(c => [c, range()]));
const eventDays: Record<string, number> = {};
const weatherDays: Record<string, number> = {};
const maxStepSeen = { price: 0, wholesale: 0 };
let totalCustomers = 0, totalDays = 0, stockouts = 0, priceWalkouts = 0, eventStarts = 0;

for (const seed of SEEDS) {
  const save = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(seed, 1) };
  save.player = { ...save.player, level: 6, money: 5_000_000 };
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  const refill = () => sim.getFixtures().filter(isSalesFixture).forEach((shelf, i) => {
    shelf.assignedProductId = PRODUCTS[i % PRODUCTS.length];
    shelf.currentStock = 14;
    shelf.stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: 3000, provenance: 'known' }];
  });
  refill();
  let day = sim.getTime().day;
  let hour = sim.getTime().hour;
  let prevPrice: Record<string, number> = {};
  let prevWholesale: Record<string, number> = {};
  const seenEvents = new Set<string>();
  const observe = () => {
    const market = sim.getMarketState();
    for (const category of PRICED_CATEGORIES) {
      const price = market.priceIndex?.[category] ?? 1;
      const wholesale = market.suppliers?.['dai_ly_dau_hem']?.priceIndex[category] ?? 1;
      widen(priceRange[category], price);
      widen(wholesaleRange[category], wholesale);
      if (prevPrice[category] !== undefined) maxStepSeen.price = Math.max(maxStepSeen.price, Math.abs(price - prevPrice[category]));
      if (prevWholesale[category] !== undefined) maxStepSeen.wholesale = Math.max(maxStepSeen.wholesale, Math.abs(wholesale - prevWholesale[category]));
      prevPrice[category] = price;
      prevWholesale[category] = wholesale;
    }
    const weather = sim.getMarketSummary().weather.id;
    weatherDays[weather] = (weatherDays[weather] ?? 0) + 1;
    for (const event of sim.getMarketSummary().events.filter(e => e.status === 'active')) {
      eventDays[event.id] = (eventDays[event.id] ?? 0) + 1;
      if (!seenEvents.has(event.id + event.startsIn + day)) { /* đếm theo ngày hoạt động */ }
    }
  };
  observe();
  let guard = 0;
  while (sim.getTime().day < 1 + DAYS && guard++ < 6_000_000) {
    const t = sim.getTime();
    if (t.day !== day) {
      const record = sim.getDailyRecords()[day];
      if (record) { stockouts += record.outOfStockWalkouts ?? 0; priceWalkouts += record.priceWalkouts ?? 0; }
      day = t.day; totalDays++; refill(); observe();
    }
    if (t.hour !== hour) { hour = t.hour; refill(); } // kệ luôn đầy: số khách không bị chặn bởi hàng trong harness
    if (!t.isStoreOpen && t.hour >= 8 && t.hour < 20) sim.getClock().toggleStoreStatus();
    sim.update(0.25);
  }
  totalCustomers += sim.getStatistics().totalCustomersServed;
  eventStarts += sim.getMarketState().events.length;
}

const fmt = (r: { min: number; max: number }) => `${r.min.toFixed(2)}–${r.max.toFixed(2)}`;
console.log(`Quét cân bằng: ${SEEDS.length} hạt giống × ${DAYS} ngày (${totalDays} ngày quan sát)`);
console.log(`Khách phục vụ/ngày: ${(totalCustomers / (SEEDS.length * DAYS)).toFixed(1)}; hết hàng bỏ đi: ${stockouts}; bỏ vì giá: ${priceWalkouts}`);
console.log(`Bước giá tham chiếu lớn nhất/ngày: ${maxStepSeen.price.toFixed(3)}; bước giá sỉ lớn nhất/ngày: ${maxStepSeen.wholesale.toFixed(3)}`);
console.log('Chỉ số giá tham chiếu theo nhóm (min–max):', PRICED_CATEGORIES.map(c => `${c} ${fmt(priceRange[c])}`).join('; '));
console.log('Chỉ số giá sỉ theo nhóm (min–max):', PRICED_CATEGORIES.map(c => `${c} ${fmt(wholesaleRange[c])}`).join('; '));
console.log('Ngày có sự kiện đang chạy:', JSON.stringify(eventDays), `(số sự kiện đã lên lịch: ${eventStarts})`);
console.log('Phân bố thời tiết (ngày):', JSON.stringify(weatherDays));
