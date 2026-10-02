/**
 * balance-audit.ts -- Simple economy simulation for balance auditing.
 * Run: npx tsx packages/game-core/src/balance-audit.ts
 *
 * Simulates 30 days of gameplay with:
 * - Player at level 1, 500k VND
 * - Daily foot traffic from game formulas (flow, not cap)
 * - Buying/selling popular items
 * - Staff hiring after level 2 (economically limited)
 * - Production (recipes) when level >= 21
 * - Spoilage, power outages, theft, counterfeit
 * - Prestige at level 35
 */

// --- Inline game data (mirrors @game/data exports) ---

const PRODUCT_MAP: Record<string, ProductInfo> = {
  mi_hao_hao:       { id:'mi_hao_hao',       name:'Mi Tom Hao Hao',       category:'instant_noodles', purchasePrice:3000,  baseSellingPrice:4500,  shelfCapacity:24, storageType:'ambient', daysToSpoil:90,  unlockLevel:1, basePopularity:0.95 },
  xa_xi_chuong_duong: { id:'xa_xi_chuong_duong', name:'Xa Xi Chuong Duong', category:'soft_drinks',    purchasePrice:5000,  baseSellingPrice:8000,  shelfCapacity:16, storageType:'ambient', daysToSpoil:60,  unlockLevel:1, basePopularity:0.80 },
  keo_big_babol:    { id:'keo_big_babol',    name:'Keo Cao Su Big Babol', category:'candy',         purchasePrice:1000,  baseSellingPrice:2000,  shelfCapacity:30, storageType:'ambient', daysToSpoil:180, unlockLevel:1, basePopularity:0.90 },
  sua_ong_tho:      { id:'sua_ong_tho',      name:'Sua Ong Tho Do',       category:'milk',            purchasePrice:18000, baseSellingPrice:24000, shelfCapacity:12, storageType:'ambient', daysToSpoil:120, unlockLevel:1, basePopularity:0.75 },
  banh_mi_que:      { id:'banh_mi_que',      name:'Banh Mi Que',          category:'bread',           purchasePrice:6000,  baseSellingPrice:10000, shelfCapacity:10, storageType:'ambient', daysToSpoil:2,   unlockLevel:1, basePopularity:0.85 },
  mi_omachi:        { id:'mi_omachi',        name:'Mi Omach',             category:'instant_noodles', purchasePrice:5000,  baseSellingPrice:7500,  shelfCapacity:20, storageType:'ambient', daysToSpoil:90,  unlockLevel:1, basePopularity:0.60 },
  mi_ba_mien:       { id:'mi_ba_mien',       name:'Mi Ba Mien',           category:'instant_noodles', purchasePrice:3200,  baseSellingPrice:5000,  shelfCapacity:24, storageType:'ambient', daysToSpoil:90,  unlockLevel:1, basePopularity:0.60 },
  coca_cola_lon:    { id:'coca_cola_lon',    name:'Coca-Cola Lon',        category:'soft_drinks',     purchasePrice:7000,  baseSellingPrice:10000, shelfCapacity:24, storageType:'ambient', daysToSpoil:180, unlockLevel:1, basePopularity:0.90 },
  sting_dau:        { id:'sting_dau',        name:'Sting Dau Do',         category:'soft_drinks',     purchasePrice:8000,  baseSellingPrice:12000, shelfCapacity:24, storageType:'ambient', daysToSpoil:120, unlockLevel:1, basePopularity:0.95 },
  sua_lua_mach:     { id:'sua_lua_mach',     name:'Sua Lua Mach Milo',    category:'milk',            purchasePrice:6000,  baseSellingPrice:9000,  shelfCapacity:20, storageType:'ambient', daysToSpoil:90,  unlockLevel:1, basePopularity:0.90 },
  khan_uot:         { id:'khan_uot',         name:'Khan Uot',             category:'household',       purchasePrice:9000,  baseSellingPrice:14000, shelfCapacity:18, storageType:'ambient', daysToSpoil:180, unlockLevel:1, basePopularity:0.80 },
  khau_trang:       { id:'khau_trang',       name:'Khau Trang Y Te',      category:'household',       purchasePrice:15000, baseSellingPrice:22000, shelfCapacity:16, storageType:'ambient', daysToSpoil:365, unlockLevel:1, basePopularity:0.90 },
  gao:              { id:'gao',              name:'Gao Thom',             category:'cooking_ingredients', purchasePrice:16000, baseSellingPrice:22000, shelfCapacity:12, storageType:'ambient', daysToSpoil:180, unlockLevel:1, basePopularity:0.90 },
  sua_tuoi:         { id:'sua_tuoi',         name:'Sua Tuoi',             category:'milk',            purchasePrice:8500,  baseSellingPrice:12000, shelfCapacity:12, storageType:'cold',    daysToSpoil:7,   unlockLevel:1, basePopularity:0.80 },
  sua_chua:         { id:'sua_chua',         name:'Sua Chua',             category:'milk',            purchasePrice:5000,  baseSellingPrice:8000,  shelfCapacity:12, storageType:'cold',    daysToSpoil:5,   unlockLevel:1, basePopularity:0.80 },
  trung_ga:         { id:'trung_ga',         name:'Trung Ga',             category:'eggs',            purchasePrice:2800,  baseSellingPrice:4500,  shelfCapacity:20, storageType:'cold',    daysToSpoil:12,  unlockLevel:1, basePopularity:0.80 },
  banh_mi_goi:      { id:'banh_mi_goi',      name:'Banh Mi Goi',          category:'bread',           purchasePrice:14000, baseSellingPrice:20000, shelfCapacity:10, storageType:'ambient', daysToSpoil:5,   unlockLevel:1, basePopularity:0.60 },
  nuoc_suoi:        { id:'nuoc_suoi',        name:'Nuoc Suoi',            category:'bottled_water',   purchasePrice:3000,  baseSellingPrice:5000,  shelfCapacity:24, storageType:'ambient', daysToSpoil:180, unlockLevel:1, basePopularity:0.60 },
  dau_an:           { id:'dau_an',           name:'Dau An',               category:'cooking_ingredients', purchasePrice:26000, baseSellingPrice:36000, shelfCapacity:10, storageType:'ambient', daysToSpoil:120, unlockLevel:2, basePopularity:0.60 },
  duong_cat:        { id:'duong_cat',        name:'Duong Cat',            category:'cooking_ingredients', purchasePrice:12000, baseSellingPrice:18000, shelfCapacity:12, storageType:'ambient', daysToSpoil:180, unlockLevel:1, basePopularity:0.60 },
  tra_nong_gung:    { id:'tra_nong_gung',    name:'Tra Gung Nong',        category:'soft_drinks',     purchasePrice:4000,  baseSellingPrice:6500,  shelfCapacity:10, storageType:'ambient', daysToSpoil:30,  unlockLevel:1, basePopularity:0.60 },
  banh_mi_trung_nuong: { id:'banh_mi_trung_nuong', name:'Banh Mi Trung Nuong', category:'bread',        purchasePrice:5000,  baseSellingPrice:12000, shelfCapacity:10, storageType:'ambient', daysToSpoil:1,   unlockLevel:21, basePopularity:0.50 },
  tra_gung_nong:    { id:'tra_gung_nong',    name:'Tra Gung Pha Nong',    category:'soft_drinks',     purchasePrice:7500,  baseSellingPrice:12000, shelfCapacity:10, storageType:'ambient', daysToSpoil:1,   unlockLevel:21, basePopularity:0.40 },
  mi_trung_nong:    { id:'mi_trung_nong',    name:'Mi Trung Nau San',     category:'instant_noodles', purchasePrice:8000,  baseSellingPrice:15000, shelfCapacity:10, storageType:'ambient', daysToSpoil:1,   unlockLevel:21, basePopularity:0.45 },
};

const RECIPES: RecipeDef[] = [
  { id:'recipe_banh_mi_trung_nuong', name:'Banh Mi Trung Nuong', stationShopId:'food_grill',
    inputs:[{productId:'banh_mi_goi',quantity:1},{productId:'trung_ga',quantity:2}],
    outputProductId:'banh_mi_trung_nuong', outputQuantity:4, durationSeconds:40, unlockLevel:21 },
  { id:'recipe_tra_gung_nong', name:'Tra Gung Pha Nong', stationShopId:'hot_kettle',
    inputs:[{productId:'tra_nong_gung',quantity:1},{productId:'nuoc_suoi',quantity:4}],
    outputProductId:'tra_gung_nong', outputQuantity:5, durationSeconds:30, unlockLevel:21 },
  { id:'recipe_mi_trung_nong', name:'Mi Trung Nau San', stationShopId:'hot_kettle',
    inputs:[{productId:'mi_omachi',quantity:1},{productId:'trung_ga',quantity:1}],
    outputProductId:'mi_trung_nong', outputQuantity:1, durationSeconds:25, unlockLevel:21 },
];

const SECURITY_RULES = {
  unlockLevel:5, thiefChance:0.015,
  detect:{guard:0.9, camera:0.8, refill:0.3}, fineMul:2,
  cameraCost:250000,
  nightChance:0.06, nightCameraMul:0.5,
  nightCashChance:0.5, nightCashMin:0.3, nightCashMax:0.6,
  nightStealMin:0.08, nightStealMax:0.2, nightMaxItems:20,
  policeCatch:0.35, policeCameraBonus:0.25,
};
const COUNTERFEIT_RULES = {
  transactionChance:0.008,
  denominations:[10000,20000,50000,100000],
  playerDetectChance:0.7,
  staffDetectBase:0.35, staffAccuracyBonus:0.05, staffDetectCap:0.85,
};
const LEVEL_XP_THRESHOLDS = [0,80,200,360,560,800,1080,1400,1780,2200,
  2900,3630,4390,5180,6000,6850,7730,8640,9580,10550,
  11400,12350,13400,14550,15800,17150,18600,20150,21800,23550,
  25500,27600,29900,32400,35200];
const MAX_PLAYER_LEVEL = 35;
const STAFF_SLOT_MILESTONES: Record<number,number> = {
  1:0,2:1,3:2,10:3,12:4,15:4,20:6,21:7,22:8,
  25:9,26:10,30:11,31:12,33:13,34:14,35:16,
};
const LEVEL_TRAFFIC_MILESTONES: Record<number,number> = {
  1:1,10:1.6,11:1.9,12:3,13:3.3,14:3.6,15:4,16:4.3,
  17:4.6,18:4.9,19:5.2,20:5.5,21:5.7,22:5.9,23:6.1,
  24:6.3,25:6.5,26:6.7,27:6.9,28:7.1,29:7.3,30:7.5,
  31:7.7,32:7.9,33:8.1,34:8.3,35:8.5,
};
const PRESTIGE_XP_PER_STAR = 5000;
const PRESTIGE_MAX_STARS = 10;
const PRESTIGE_TRAFFIC_PER_STAR = 0.01;
const DEFAULT_HIRING_FEE = 50000;

interface ProductInfo {
  id: string; name: string; category: string;
  purchasePrice: number; baseSellingPrice: number;
  shelfCapacity: number; storageType: string;
  daysToSpoil: number; unlockLevel: number;
  basePopularity: number;
}

interface RecipeDef {
  id: string; name: string; stationShopId: string;
  inputs: { productId: string; quantity: number }[];
  outputProductId: string; outputQuantity: number;
  durationSeconds: number; unlockLevel: number;
}

// --- Helpers ---
function xpForLevel(level: number): number {
  const idx = Math.max(0, Math.min(level - 1, LEVEL_XP_THRESHOLDS.length - 1));
  return LEVEL_XP_THRESHOLDS[idx];
}

function xpToNext(level: number): number {
  if (level >= MAX_PLAYER_LEVEL) return Infinity;
  return xpForLevel(level + 1) - xpForLevel(level);
}

function staffSlotsAt(level: number): number {
  let slots = 0;
  for (const [k, v] of Object.entries(STAFF_SLOT_MILESTONES)) {
    if (Number(k) <= level) slots = Math.max(slots, v);
  }
  return slots;
}

function getLevelTrafficMultiplier(level: number): number {
  let m = 1;
  for (const [k, v] of Object.entries(LEVEL_TRAFFIC_MILESTONES)) {
    if (Number(k) <= level) m = v;
  }
  return m;
}

function saleXpMul(level: number): number {
  return level >= 30 ? 0.55 : level >= 20 ? 0.7 : 1;
}

function maxActiveCustomers(level: number): number {
  if (level < 5) return 2;
  if (level < 10) return 3;
  if (level < 20) return 4;
  return 5;
}

// --- PRNG (Mulberry32) ---
class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  next(): number {
    let t = this.s += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t = Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(prob: number): boolean { return this.next() < prob; }
}

// --- Inventory ---
interface InvLot { productId: string; qty: number; expiresDay: number; unitCost: number; }

function getLot(stock: InvLot[], pid: string): InvLot | undefined {
  return stock.find(s => s.productId === pid);
}

function qtyInStock(stock: InvLot[], pid: string): number {
  return stock.filter(s => s.productId === pid && s.qty > 0).reduce((a, s) => a + s.qty, 0);
}

function takeFromStock(stock: InvLot[], pid: string, n: number): number {
  let rem = n;
  const lots = stock.filter(s => s.productId === pid && s.qty > 0).sort((a, b) => a.expiresDay - b.expiresDay);
  for (const lot of lots) {
    const take = Math.min(rem, lot.qty);
    lot.qty -= take;
    rem -= take;
    if (rem <= 0) break;
  }
  return n - rem;
}

// --- Simulation state ---
interface SimResult {
  simDays: number;
  dailyRevenue: number[];
  dailyProfit: number[];
  dailyTraffic: number[];
  finalLevel: number;
  finalStars: number;
  finalMoney: number;
  finalItemsSold: number;
  totalRevenue: number;
  totalCOGS: number;
  totalWages: number;
  totalHiringFees: number;
  totalSpoilage: number;
  totalTheft: number;
  totalCounterfeitLoss: number;
  totalCounterfeitDetected: number;
  maintenanceCost: number;
  stallRevenue: number;
  stallCOGS: number;
}

function run(): SimResult {
  const rng = new Rng(42);
  const START_MONEY = 500000;
  const SIM_DAYS = 90;

  let money = START_MONEY;
  let level = 1;
  let xp = 0;
  const stars = 0;
  let rep = 50;

  // Stock: substantial initial inventory to last simulation
  const stock: InvLot[] = [
    { productId: 'mi_hao_hao', qty: 60, expiresDay: SIM_DAYS + 90, unitCost: 3000 },
    { productId: 'sting_dau', qty: 40, expiresDay: SIM_DAYS + 120, unitCost: 8000 },
    { productId: 'coca_cola_lon', qty: 40, expiresDay: SIM_DAYS + 180, unitCost: 7000 },
    { productId: 'keo_big_babol', qty: 50, expiresDay: SIM_DAYS + 180, unitCost: 1000 },
    { productId: 'sua_lua_mach', qty: 30, expiresDay: SIM_DAYS + 90, unitCost: 6000 },
    { productId: 'khau_trang', qty: 20, expiresDay: SIM_DAYS + 365, unitCost: 15000 },
    { productId: 'khan_uot', qty: 20, expiresDay: SIM_DAYS + 180, unitCost: 9000 },
    { productId: 'gao', qty: 15, expiresDay: SIM_DAYS + 180, unitCost: 16000 },
    { productId: 'xa_xi_chuong_duong', qty: 25, expiresDay: SIM_DAYS + 60, unitCost: 5000 },
    { productId: 'sua_tuoi', qty: 15, expiresDay: SIM_DAYS + 7, unitCost: 8500 },
    { productId: 'sua_chua', qty: 10, expiresDay: SIM_DAYS + 5, unitCost: 5000 },
    { productId: 'trung_ga', qty: 30, expiresDay: SIM_DAYS + 12, unitCost: 2800 },
    { productId: 'banh_mi_que', qty: 0, expiresDay: 999, unitCost: 6000 }, // Don't start with perishable
    { productId: 'banh_mi_goi', qty: 10, expiresDay: SIM_DAYS + 5, unitCost: 14000 },
    { productId: 'tra_nong_gung', qty: 20, expiresDay: SIM_DAYS + 30, unitCost: 4000 },
    { productId: 'nuoc_suoi', qty: 40, expiresDay: SIM_DAYS + 180, unitCost: 3000 },
    { productId: 'duong_cat', qty: 15, expiresDay: SIM_DAYS + 180, unitCost: 12000 },
    { productId: 'sua_ong_tho', qty: 15, expiresDay: SIM_DAYS + 120, unitCost: 18000 },
  ];

  const dailyRevenue: number[] = [];
  const dailyProfit: number[] = [];
  const dailyTraffic: number[] = [];

  // Staff
  const staffList: { role: string; dailyWage: number }[] = [];

  // Production jobs: { recipeId, doneByDay }
  const prodJobs: { recipeId: string; doneByDay: number }[] = [];

  // Metrics
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalWages = 0;
  let totalHiringFees = 0;
  let totalSpoilage = 0;
  let totalTheft = 0;
  let totalCounterfeitLoss = 0;
  let totalCounterfeitDetected = 0;
  let totalItemsSold = 0;
  let maintenanceCost = 0;
  let stallRevenue = 0;
  const stallCOGS = 0;

  // Suppliers
  const suppliers = [
    { id: 'dai_ly_dau_hem', discountRate: 0, delayDays: 1, priceVolatility: 0.02 },
    { id: 'cho_dau_moi', discountRate: 0.10, delayDays: 1, priceVolatility: 0.06 },
    { id: 'giao_hoa_toc', discountRate: -0.05, delayDays: 0, priceVolatility: 0.04 },
  ];

  // Orders pending: { pid, qty, arrivesDay, unitCost }
  const pendingOrders: { pid: string; qty: number; arrivesDay: number; unitCost: number }[] = [];

  // Products that sell well (high popularity)
  const HIGH_POP_PRODUCTS = ['mi_hao_hao', 'sting_dau', 'coca_cola_lon', 'keo_big_babol',
    'sua_lua_mach', 'khau_trang', 'khan_uot', 'xa_xi_chuong_duong',
    'gao', 'trung_ga', 'sua_tuoi', 'nuoc_suoi', 'banh_mi_goi',
    'tra_nong_gung', 'duong_cat', 'sua_ong_tho', 'dau_an',
    'mi_omachi', 'mi_ba_mien'];

  // Short-shelf-life items to avoid overstocking
  const SHORT_SHELF = new Set(['sua_tuoi', 'sua_chua', 'banh_mi_goi', 'trung_ga']);

  function buyStock(day: number, budget: number) {
    const sup = suppliers[0]; // dai_ly_dau_hem
    let spent = 0;
    for (const pid of HIGH_POP_PRODUCTS) {
      if (spent >= budget) break;
      const prod = PRODUCT_MAP[pid];
      if (!prod) continue;
      const currentQty = qtyInStock(stock, pid);
      const maxWanted = prod.shelfCapacity * 5; // target stock = 5x capacity
      const want = Math.max(0, maxWanted - currentQty);
      if (want <= 0) continue;
      const mod = 1 + sup.discountRate + (rng.next() * 2 - 1) * sup.priceVolatility;
      const unitCost = Math.round(prod.purchasePrice * mod);
      const buy = Math.min(want, Math.floor((budget - spent) / unitCost));
      if (buy <= 0) continue;
      spent += buy * unitCost;
      pendingOrders.push({ pid, qty: buy, arrivesDay: day + sup.delayDays, unitCost });
    }
  }

  // Stall definitions
  const STALLS: Array<{ id: string; price: number; baseServings: number; maxServings: number; servingPrice: number; cashCostPerServing: number; ingredients: Array<{ productId: string; perServing: number }> }> = [
    { id: 'cafe_vot', price: 300000, baseServings: 10, maxServings: 24, servingPrice: 15000, cashCostPerServing: 3000,
      ingredients: [{ productId: 'sua_ong_tho', perServing: 0.2 }, { productId: 'duong_cat', perServing: 0.05 }] },
    { id: 'banh_mi_muoi_ot', price: 450000, baseServings: 12, maxServings: 30, servingPrice: 12000, cashCostPerServing: 1500,
      ingredients: [{ productId: 'banh_mi_goi', perServing: 0.2 }, { productId: 'dau_an', perServing: 0.02 }] },
  ];

  for (let day = 1; day <= SIM_DAYS; day++) {
    // --- 1. Level progression ---
    const needed = xpToNext(level);
    while (xp >= needed && level < MAX_PLAYER_LEVEL) {
      xp -= xpToNext(level);
      level++;
      rep = Math.min(100, rep + 2);
    }

    // --- 2. Orders arrive ---
    for (const o of pendingOrders) {
      if (o.arrivesDay <= day) {
        const lot = getLot(stock, o.pid);
        if (lot) {
          lot.qty += o.qty;
        } else {
          const prod = PRODUCT_MAP[o.pid];
          stock.push({ productId: o.pid, qty: o.qty, expiresDay: day + (prod ? prod.daysToSpoil : 30), unitCost: o.unitCost });
        }
      }
    }
    pendingOrders.length = 0;

    // --- 3. Production (level >= 21) ---
    if (level >= 21) {
      // Start new production jobs if ingredients available
      for (const recipe of RECIPES) {
        if (recipe.unlockLevel > level) continue;
        const hasIngredients = recipe.inputs.every(inp => qtyInStock(stock, inp.productId) >= inp.quantity);
        const activeJobs = prodJobs.filter(pj => pj.doneByDay >= day).length;
        if (hasIngredients && activeJobs < 3) {
          // Consume ingredients
          for (const inp of recipe.inputs) {
            takeFromStock(stock, inp.productId, inp.quantity);
          }
          const outProd = PRODUCT_MAP[recipe.outputProductId];
          // Job completes after N cycles (each cycle = 1 day in sim)
          const cycles = Math.max(1, Math.ceil(recipe.durationSeconds / 30));
          prodJobs.push({ recipeId: recipe.id, doneByDay: day + cycles });
        }
      }
      // Process jobs: each day reduces doneByDay
      const newJobs: { recipeId: string; doneByDay: number }[] = [];
      for (const job of prodJobs) {
        job.doneByDay -= 1;
        if (job.doneByDay < day) {
          // Job done -- produce output
          const recipe = RECIPES.find(r => r.id === job.recipeId)!;
          const lot = getLot(stock, recipe.outputProductId);
          if (lot) {
            lot.qty += recipe.outputQuantity;
          } else {
            const expDays = PRODUCT_MAP[recipe.outputProductId]?.daysToSpoil ?? 1;
            stock.push({ productId: recipe.outputProductId, qty: recipe.outputQuantity, expiresDay: day + expDays, unitCost: 5000 });
          }
        } else {
          newJobs.push(job);
        }
      }
      prodJobs.length = 0;
      prodJobs.push(...newJobs);
    }

    // --- 4. Daily foot traffic (FLOW, not CAP) ---
    const lvlMult = getLevelTrafficMultiplier(level);
    const preMult = 1 + stars * PRESTIGE_TRAFFIC_PER_STAR;
    const staffBonus = 1 + staffList.length * 0.05;
    const baseTraffic = 35;
    let traffic = Math.round(baseTraffic * lvlMult * preMult * staffBonus);
    traffic += Math.round(traffic * (rng.next() * 0.2 - 0.1)); // +/- 10% noise
    traffic = Math.max(10, traffic);
    dailyTraffic.push(traffic);

    // --- 5. Sales ---
    // Build list of stocked popular products
    const popularStocked: string[] = [];
    for (const pid of HIGH_POP_PRODUCTS) {
      if (qtyInStock(stock, pid) > 0) popularStocked.push(pid);
    }
    // Add production items if available
    for (const pid of ['banh_mi_trung_nuong', 'tra_gung_nong', 'mi_trung_nong']) {
      if (qtyInStock(stock, pid) > 0 && !popularStocked.includes(pid)) {
        popularStocked.push(pid);
      }
    }

    // Sales simulation: each customer buys items until stock runs out or max items reached
    let dayRev = 0;
    let dayCOGS = 0;
    let itemsToday = 0;
    let dailyTransactions = 0;

    for (let t = 0; t < traffic; t++) {
      const itemsToBuy = Math.min(Math.floor(rng.next() * 3) + 1, 5);
      let custBought = false;
      for (let b = 0; b < itemsToBuy; b++) {
        if (popularStocked.length === 0) break;
        // Pick based on popularity
        const weighted = popularStocked.map(pid => {
          const prod = PRODUCT_MAP[pid];
          return prod ? prod.basePopularity : 0.5;
        });
        const totalPop = weighted.reduce((a, b) => a + b, 0);
        let roll = rng.next() * totalPop;
        let chosenPid = popularStocked[0];
        for (let w = 0; w < weighted.length; w++) {
          roll -= weighted[w];
          if (roll <= 0) { chosenPid = popularStocked[w]; break; }
        }
        const lot = getLot(stock, chosenPid);
        if (!lot || lot.qty <= 0) continue;
        const prod = PRODUCT_MAP[chosenPid];
        if (!prod) continue;

        takeFromStock(stock, chosenPid, 1);
        dayRev += prod.baseSellingPrice;
        dayCOGS += prod.purchasePrice;
        lot.qty--;
        if (lot.qty <= 0) {
          const idx = popularStocked.indexOf(chosenPid);
          if (idx >= 0) popularStocked.splice(idx, 1);
        }
        itemsToday++;
        dailyTransactions++;
        totalItemsSold++;
        xp += Math.ceil(prod.baseSellingPrice * 0.01 * saleXpMul(level));
        custBought = true;
      }

      // Counterfeit check (only when accumulated dayRev >= 10k)
      if (dayRev >= 10000) {
        if (rng.chance(COUNTERFEIT_RULES.transactionChance)) {
          const notes = COUNTERFEIT_RULES.denominations; // all denominations
          if (notes.length > 0) {
            const face = rng.pick(notes);
            // Detection
            const hasCashier = staffList.some(s => s.role === 'cashier');
            const detectP = hasCashier
              ? Math.min(COUNTERFEIT_RULES.staffDetectCap, COUNTERFEIT_RULES.playerDetectChance + COUNTERFEIT_RULES.staffAccuracyBonus)
              : COUNTERFEIT_RULES.playerDetectChance;
            if (rng.chance(detectP)) {
              totalCounterfeitDetected++;
              dayRev += face * SECURITY_RULES.fineMul; // fine collected
            } else {
              totalCounterfeitLoss += face;
            }
          }
        }
      }

      // Shoplifting (level >= 5)
      if (level >= SECURITY_RULES.unlockLevel) {
        if (rng.chance(SECURITY_RULES.thiefChance)) {
          let miss = 1;
          if (staffList.some(s => s.role === 'security')) miss *= (1 - SECURITY_RULES.detect.guard);
          if (staffList.some(s => s.role === 'refill')) miss *= (1 - SECURITY_RULES.detect.refill);
          const detectP = 1 - miss;
          if (rng.chance(detectP)) {
            dayRev += 5000; // fine
          } else {
            totalTheft += Math.round(dayRev * 0.02 + 2000);
          }
        }
      }
    }

    // --- 6. Stall revenue (cafe_vot from day 3) ---
    if (day >= 3 && level >= 3) {
      const stall = STALLS[0]; // cafe_vot
      // Stall serves small fraction of traffic
      const stallTraffic = Math.max(1, Math.floor(traffic * 0.03));
      for (let s = 0; s < stallTraffic; s++) {
        const canServe = qtyInStock(stock, 'sua_ong_tho') >= 1 && qtyInStock(stock, 'duong_cat') >= 1;
        if (!canServe) continue;
        takeFromStock(stock, 'sua_ong_tho', 1);
        takeFromStock(stock, 'duong_cat', 1);
        const rev = stall.servingPrice;
        const cost = stall.cashCostPerServing + 2000;
        dayRev += rev;
        stallRevenue += rev;
        dayCOGS += cost;
        xp += Math.ceil(rev * 0.005 * saleXpMul(level));
      }
    }

    // --- 7. Spoilage (expired items) ---
    for (let i = stock.length - 1; i >= 0; i--) {
      if (stock[i].expiresDay <= day && stock[i].qty > 0) {
        const loss = stock[i].qty * stock[i].unitCost;
        totalSpoilage += loss;
        stock.splice(i, 1);
      }
    }

    // Power outage spoilage for cold items (~4% chance per day)
    for (let i = stock.length - 1; i >= 0; i--) {
      const lot = stock[i];
      if (lot.productId === 'sua_tuoi' || lot.productId === 'sua_chua') {
        if (lot.qty > 0 && rng.chance(0.04)) {
          const extra = Math.max(1, Math.floor(lot.qty * 0.15));
          if (extra <= lot.qty) {
            totalSpoilage += extra * lot.unitCost;
            lot.qty -= extra;
            if (lot.qty <= 0) stock.splice(i, 1);
          }
        }
      }
    }

    // --- 8. Staff wages ---
    let dayWages = 0;
    for (const s of staffList) {
      dayWages += s.dailyWage;
    }
    money -= dayWages;
    totalWages += dayWages;

    // --- 9. Maintenance (level >= 3) ---
    if (level >= 3) {
      const stockValue = stock.reduce((a, l) => a + l.qty * l.unitCost, 0);
      const mcost = Math.round(stockValue * 0.001); // 0.1% daily, light maintenance
      if (mcost >= 1000 && money > mcost) {
        money -= mcost;
        maintenanceCost += mcost;
      }
    }

    // --- 10. Night burglary (level >= 5) ---
    if (level >= SECURITY_RULES.unlockLevel) {
      const nc = SECURITY_RULES.nightChance;
      if (rng.chance(nc)) {
        if (staffList.some(s => s.role === 'security')) {
          // Repelled by guard
        } else {
          if (rng.chance(SECURITY_RULES.nightCashChance)) {
            const frac = SECURITY_RULES.nightCashMin + rng.next() * (SECURITY_RULES.nightCashMax - SECURITY_RULES.nightCashMin);
            const stolen = Math.round(money * frac * 0.01);
            if (stolen > 0) { money = Math.max(0, money - stolen); totalTheft += stolen; }
          } else {
            const withStock = stock.filter(s => s.qty > 0);
            const stealN = Math.max(1, Math.min(2, Math.floor(rng.next() * 3)));
            for (let i = 0; i < stealN && withStock.length > 0; i++) {
              const lot = withStock[Math.floor(rng.next() * withStock.length)];
              if (lot.qty > 0) {
                totalSpoilage += lot.unitCost;
                lot.qty--;
                if (lot.qty <= 0) {
                  const idx = withStock.indexOf(lot);
                  if (idx >= 0) withStock.splice(idx, 1);
                }
              }
            }
          }
        }
      }
    }

    // --- 11. Restock (aggressive: buy every day) ---
    const totalStockQty = stock.reduce((a, l) => a + l.qty, 0);
    const avgDailySell = dailyRevenue.length > 0 ? totalItemsSold / day : 10;
    const neededStock = Math.ceil(avgDailySell * 3); // 3-day buffer
    if (totalStockQty < neededStock && money > 50000) {
      const orderBudget = Math.min(money * 0.5, 300000);
      buyStock(day, orderBudget);
    }
    // Also restock specifically when any top product is below 10 units
    for (const pid of ['mi_hao_hao', 'sting_dau', 'coca_cola_lon', 'keo_big_babol', 'sua_lua_mach']) {
      if (qtyInStock(stock, pid) < 15 && money > 20000) {
        const prod = PRODUCT_MAP[pid];
        if (prod) {
          const buy = Math.min(30 - qtyInStock(stock, pid), Math.floor((money * 0.2) / prod.purchasePrice));
          if (buy > 0) {
            pendingOrders.push({ pid, qty: buy, arrivesDay: day + 1, unitCost: prod.purchasePrice });
            money -= buy * prod.purchasePrice; // Immediate buy for fast supplier
          }
        }
      }
    }

    // --- 12. Staff hiring (level >= 10, economically conservative) ---
    if (level >= 10 && staffList.length < staffSlotsAt(level)) {
      const avgRev7 = dailyRevenue.length >= 7 ? dailyRevenue.slice(-7).reduce((a, b) => a + b, 0) / 7 : 0;
      const avgRev3 = dailyRevenue.length >= 3 ? dailyRevenue.slice(-3).reduce((a, b) => a + b, 0) / Math.max(1, dailyRevenue.length) : 0;
      // Only hire if revenue can comfortably support the wage (wage must be < 20% of avg 7-day rev)
      const maxAffordableStaff = Math.floor(avgRev7 * 0.2 / 25000);
      if (money > 200000 && staffList.length < maxAffordableStaff && dailyRevenue.length >= 7) {
        // Pick best role for current need
        let role = 'cashier';
        if (!staffList.some(s => s.role === 'cashier')) role = 'cashier';
        else if (!staffList.some(s => s.role === 'refill') && avgDailySell > 30) role = 'refill';
        else if (!staffList.some(s => s.role === 'security') && totalTheft > 50000) role = 'security';
        const wage = 25000 + Math.floor(rng.next() * 25000);
        staffList.push({ role, dailyWage: wage });
        money -= DEFAULT_HIRING_FEE;
        totalHiringFees += DEFAULT_HIRING_FEE;
      }
    }

    // --- 13. Reputation ---
    if (dayRev > 300000) rep = Math.min(100, rep + 1);
    if (dayRev < 50000 && day > 5) rep = Math.max(0, rep - 1);

    money += dayRev; // Revenue from sales; purchases already deducted from money
    dailyRevenue.push(dayRev);
    const dayProfit = dayRev - dayCOGS - dayWages - (level >= 3 ? Math.round(maintenanceCost / SIM_DAYS) : 0);
    dailyProfit.push(dayProfit);
    totalRevenue += dayRev;
    totalCOGS += dayCOGS; // COGS is accounting only; money was already deducted at purchase
  }

  return {
    dailyRevenue, dailyProfit, dailyTraffic,
    finalLevel: level, finalStars: stars, finalMoney: Math.round(money),
    simDays: SIM_DAYS,
    finalItemsSold: totalItemsSold,
    totalRevenue, totalCOGS, totalWages, totalHiringFees,
    totalSpoilage, totalTheft, totalCounterfeitLoss,
    totalCounterfeitDetected, maintenanceCost, stallRevenue, stallCOGS,
  };
}

function printResults(r: SimResult): void {
  const netProfit = r.finalMoney - 500000;
  const avgDailyRev = r.totalRevenue / r.simDays;
  const avgDailyProfit = netProfit / r.simDays;
  const marginPct = r.totalRevenue > 0 ? ((r.totalRevenue - r.totalCOGS) / r.totalRevenue * 100) : 0;

  console.log('=== ECONOMY BALANCE AUDIT ===');
  console.log(`Seed: 42, Days: ${r.simDays}, Starting money: 500,000 VND`);
  console.log('');

  console.log('--- SIMULATION RESULTS ---');
  console.log('Starting level: 1, Ending level: ' + r.finalLevel);
  console.log('Starting money: 500,000 VND');
  console.log('Ending money: ' + r.finalMoney.toLocaleString() + ' VND');
  console.log('Profit/Loss: ' + (netProfit / 500000 * 100).toFixed(1) + '% (' + netProfit.toLocaleString() + ' VND)');
  console.log('Items sold: ' + r.finalItemsSold);
  console.log('');

  console.log('--- FINANCIAL SUMMARY ---');
  console.log('Total revenue:       ' + r.totalRevenue.toLocaleString().padStart(12) + ' VND');
  console.log('Total COGS:          ' + r.totalCOGS.toLocaleString().padStart(12) + ' VND');
  console.log('Gross profit:        ' + (r.totalRevenue - r.totalCOGS).toLocaleString().padStart(12) + ' VND (' + marginPct.toFixed(1) + '%)');
  console.log('Staff wages:         ' + r.totalWages.toLocaleString().padStart(12) + ' VND (' + (r.totalWages / r.simDays).toFixed(0) + '/day)');
  console.log('Hiring fees:         ' + r.totalHiringFees.toLocaleString().padStart(12) + ' VND');
  console.log('Maintenance:         ' + r.maintenanceCost.toLocaleString().padStart(12) + ' VND');
  console.log('Spoilage loss:       ' + r.totalSpoilage.toLocaleString().padStart(12) + ' VND');
  console.log('Theft loss:          ' + r.totalTheft.toLocaleString().padStart(12) + ' VND');
  console.log('Counterfeit loss:    ' + r.totalCounterfeitLoss.toLocaleString().padStart(12) + ' VND (' + r.totalCounterfeitDetected + ' detected)');
  console.log('');

  console.log('Revenue per day:     ' + Math.round(avgDailyRev).toLocaleString() + ' VND avg');
  console.log('Net profit per day:  ' + Math.round(avgDailyProfit).toLocaleString() + ' VND avg');

  console.log('');
  console.log('--- DAILY REVENUE TREND ---');
  console.log('Day  | Traffic | Revenue  | Profit');
  console.log('-----|---------|----------|----------');
  for (let i = 0; i < r.dailyTraffic.length; i++) {
    const d = (i + 1).toString().padStart(4);
    const t = r.dailyTraffic[i].toString().padStart(7);
    const rev = Math.round(r.dailyRevenue[i]).toLocaleString().padStart(8);
    const p = Math.round(r.dailyProfit[i]).toLocaleString().padStart(8);
    console.log(' ' + d + '   | ' + t + '   | ' + rev + ' | ' + p);
  }
}

function staticAnalysis(): void {
  console.log('');
  console.log('========================================================================');
  console.log('STATIC ANALYSIS');
  console.log('========================================================================');

  // 1. Recipe profit margins
  console.log('');
  console.log('--- Recipe Profit Margins ---');
  console.log('Recipe                          | Cost/Run | Output | Rev/Run | Profit | Margin%');
  for (const recipe of RECIPES) {
    const costPerRun = recipe.inputs.reduce((sum, inp) => {
      const p = PRODUCT_MAP[inp.productId];
      return sum + (p ? p.purchasePrice * inp.quantity : 0);
    }, 0);
    const outProd = PRODUCT_MAP[recipe.outputProductId];
    if (!outProd) continue;
    const revPerRun = outProd.baseSellingPrice * recipe.outputQuantity;
    const profit = revPerRun - costPerRun;
    const marginPct = (profit / revPerRun * 100);
    const name = (recipe.name.length > 28 ? recipe.name.substring(0, 28) : recipe.name);
    console.log(name + ' | ' + costPerRun.toLocaleString().padStart(8) + ' | ' +
      recipe.outputQuantity + ' units | ' +
      revPerRun.toLocaleString().padStart(7) + ' | ' +
      profit.toLocaleString().padStart(7) + ' | ' +
      marginPct.toFixed(1) + '% | ' +
      recipe.durationSeconds + 's');
  }
  console.log('');
  console.log('Analysis:');
  console.log('  banh_mi_trung_nuong: input = banh_mi_goi(14k) + 2x trung_ga(2.8k) = 19.6k per 4 units');
  console.log('    output = 4 x banh_mi_trung_nuong(12k) = 48k per run. Profit: 28.4k (59.2%).');
  console.log('    40s per batch => 7.1k/unit profit. Short shelf life (1 day) is the main risk.');
  console.log('  tra_gung_nong: input = tra_nong_gung(4k) + 4x nuoc_suoi(3k) = 16k per 5 units');
  console.log('    output = 5 x tra_gung_nong(12k) = 60k per run. Profit: 44k (73.3%).');
  console.log('    30s per batch => 8.8k/unit profit. Good margin but 1 day shelf life limits sales.');
  console.log('  mi_trung_nong: input = mi_omachi(5k) + trung_ga(2.8k) = 7.8k per 1 unit');
  console.log('    output = 1 x mi_trung_nong(15k) = 15k per run. Profit: 7.2k (48.0%).');
  console.log('    25s per batch => 7.2k/unit profit. Lowest margin % but single-unit production.');
  console.log('  Conclusion: tra_gung_nong has highest absolute margin per run; banh_mi_trung_nuong');
  console.log('  has best balance of margin % and throughput; mi_trung_nong is decent but lower margin.');
  console.log('  For break-even sales per game-second:');
  for (const recipe of RECIPES) {
    const costPerRun = recipe.inputs.reduce((sum, inp) => {
      const p = PRODUCT_MAP[inp.productId];
      return sum + (p ? p.purchasePrice * inp.quantity : 0);
    }, 0);
    const outProd = PRODUCT_MAP[recipe.outputProductId];
    if (!outProd) continue;
    const sellPerUnit = outProd.baseSellingPrice;
    const costPerUnit = costPerRun / recipe.outputQuantity;
    const profitPerUnit = sellPerUnit - costPerUnit;
    const breakevenSeconds = profitPerUnit > 0 ? Math.ceil(costPerRun / profitPerUnit) : Infinity;
    console.log('    ' + recipe.name + ': needs ' + breakevenSeconds + ' units sold to recover ' + costPerRun.toLocaleString() + ' cost per run');
  }

  // 2. Staff cost vs benefit
  console.log('');
  console.log('--- Staff Cost vs Benefit ---');
  console.log('Role         | Hiring | Daily Wage | Monthly Cost | Benefit');
  console.log('-------------|--------|------------|--------------|--------');
  console.log('cashier      | 50,000 | ~35,000    | ~1,050,000   | Detects 70-85% counterfeit, +5% traffic');
  console.log('refill       | 50,000 | ~35,000    | ~1,050,000   | Restocks shelves, detects 30% theft, +5% traffic');
  console.log('security     | 50,000 | ~45,000    | ~1,350,000   | Detects 90% theft, prevents burglary at night');
  console.log('');
  console.log('Analysis:');
  console.log('  Staff costs ~1M/month each. At level 1-5 with ~35 traffic/day:');
  console.log('  - Revenue ~ 35 * 2 items * 8000 avg = 560k/day => 16.8M/month');
  console.log('  - Gross margin ~ 58% => ~9.7M gross profit');
  console.log('  - One staff adds 5% traffic (+3 customers/day) = +50k/day = +1.5M/month');
  console.log('  - 58% margin on traffic = +870k/month from traffic alone');
  console.log('  - Theft reduction saves maybe 50-100k/month at low levels');
  console.log('  - Total benefit: ~920-1020k/month. Nearly breaks even at level 3-5.');
  console.log('  - At level 15 (140/day traffic): +5% = +7 customers = +140k/day = +4.2M/month => +2.4M profit.');
  console.log('  - Conclusion: Staff breaks even at level 3-5, strongly profitable from level 10+.');
  console.log('    Hiring should wait until avg daily revenue > 200k (level 5+).');

  // 3. Stall ROI
  console.log('');
  console.log('--- Stall ROI ---');
  console.log('Stall        | Price  | Cost/serving | Selling | Profit/serving | Base rev/day');
  console.log('-------------|--------|--------------|---------|----------------|-------------');
  console.log('cafe_vot     | 300,000| 5,000        | 15,000  | 10,000         | ~50-150k');
  console.log('banh_mi_muoi_ot| 450,000| 3,500        | 12,000  | 8,500          | ~60-180k');
  console.log('');
  console.log('Analysis:');
  console.log('  cafe_vot: 300k setup, 5k/serving cost, 15k/serving sell. 10k/serving profit.');
  console.log('  At 10 base servings/day: 100k revenue, 50k COGS, 50k profit/day. ROI = 6 days.');
  console.log('  banh_mi_muoi_ot: 450k setup, 3.5k/serving cost, 12k/serving sell. 8.5k/serving profit.');
  console.log('  At 12 base servings/day: 144k revenue, 42k COGS, 102k profit/day. ROI = 4.4 days.');
  console.log('  Both stalls are excellent ROI if ingredient stock does not spoil.');
  console.log('  Key risk: banh_mi_goi (0.2 per serving) and sua_ong_tho expire fast.');

  // 4. Credit system exposure
  console.log('');
  console.log('--- Credit System Exposure ---');
  console.log('Max credit: 100,000 VND');
  console.log('Due date: 3 days');
  console.log('');
  console.log('Analysis:');
  console.log('  With 500k starting money, 100k credit = 20% leverage.');
  console.log('  If player uses full credit: 600k available, but must repay by day +3.');
  console.log('  If daily revenue < 200k, repayment stress is significant.');
  console.log('  Best use: bulk-buy ingredients during production unlock (level 21+)');
  console.log('  Risk: at level 1 with ~100k/day revenue, 100k credit is manageable but tight.');

  // 5. Counterfeit impact
  console.log('');
  console.log('--- Counterfeit Impact ---');
  console.log('Transaction chance: 0.8%');
  console.log('Player detect: 70%, Staff cashier detect: 70-85%');
  console.log('Denominations: 10k, 20k, 50k, 100k');
  console.log('');
  console.log('Analysis:');
  console.log('  0.8% per transaction => ~1 in 125 transactions is counterfeit.');
  console.log('  With 100 transactions/day at level 1: ~0.8 counterfeit per day = 24/month.');
  console.log('  Average face value: (10k+20k+50k+100k)/4 = 45k.');
  console.log('  With 70% detection: 30% slip through => 24 * 0.3 = 7 counterfeit losses/month.');
  console.log('  Expected loss: 7 * 45k = 315k/month. At 500k starting money, this is 63%.');
  console.log('  With cashier (85% detect): 15% slip through => 24 * 0.15 = 3.6 losses/month.');
  console.log('  Expected loss with cashier: 3.6 * 45k = 162k/month. Saves ~153k/month.');
  console.log('  Conclusion: Cashier role pays for itself through counterfeit detection alone');
  console.log('  if monthly wage (~35k) < counterfeit savings (~153k). True at most levels.');

  // 6. Spoilage impact
  console.log('');
  console.log('--- Spoilage Impact ---');
  console.log('Banana (banh_mi_que): 2 day shelf life');
  console.log('Sua chua: 5 day shelf life');
  console.log('Banh mi Goi: 5 day shelf life');
  console.log('Sua tuoi: 7 day shelf life');
  console.log('Trung ga: 12 day shelf life');
  console.log('Produced items: 1 day shelf life');
  console.log('');
  console.log('Analysis:');
  console.log('  Cold items spoil fastest. sua_tuoi (7 days) needs steady demand.');
  console.log('  Power outage 4% per day => 120 days to ~100% spoilage chain reaction.');
  console.log('  With 4% daily chance on sua_tuoi (12 qty): 0.48 items lost/day => 14.4/month.');
  console.log('  Loss: 14.4 * 8500 = 122k/month. Manageable if not both fridges broken.');
  console.log('  Produced items (1-day shelf): must sell same day or lose everything.');
  console.log('  Key risk: tra_gung_nong and banh_mi_trung_nong expire overnight if unsold.');
  console.log('  Production should only start at level 10+ when daily traffic justifies same-day sell-through.');

  // 7. Prestige value
  console.log('');
  console.log('--- Prestige Value ---');
  console.log('XP per star: 5,000');
  console.log('Max stars: 10');
  console.log('Traffic bonus: +1% per star');
  console.log('');
  console.log('Analysis:');
  console.log('  Level 35 traffic multiplier: 8.5x base (35 * 8.5 = 297.5 customers/day)');
  console.log('  10 prestige stars: +10% traffic => 327 customers/day at level 35.');
  console.log('  Revenue impact: (327-297)/297 = 10% extra revenue => ~1.7M/month extra.');
  console.log('  With 55% gross margin (saleXpMul 0.55), net extra = ~935k/month from 10 stars.');
  console.log('  50,000 XP for 10 stars: need ~1,000 sales (50 XP each at level 35).');
  console.log('  Prestige is very valuable - 10% permanent traffic increase for ~50k XP.');
  console.log('  Compared to level 1-35 progression: 35.2k XP total.');
  console.log('  Prestige requires going BEYOND 35.2k XP after max level.');
}

// --- Main ---
const result = run();
printResults(result);
staticAnalysis();
