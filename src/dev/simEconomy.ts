import * as THREE from 'three';
import { useGame, newGameData } from '../core/store';
import { DAY_START, emptyStats } from '../core/gameTypes';
import { emptyTiers } from '../core/stock';
import { newGarden } from '../data/garden';
import { SHOP_TIERS } from '../data/shopTiers';
import { WAREHOUSE_TIERS } from '../data/warehouse';
import { emptyQuestLog, emptyTotals } from '../data/quests';
import { NavGrid } from '../world/navGrid';
import { Warehouse } from '../world/warehouse';
import { GroceryShop } from '../shop/groceryShop';
import { CustomerManager } from '../agents/customers';
import { StaffManager } from '../agents/staff';
import { Player } from '../agents/player';
import { createAutoplay, type AutoplayRunner, type AutoplayOptions } from './autoplay';
import type { Furniture } from '../core/store';

/**
 * GĐ105 — khảo sát kinh tế vòng ngày: dựng một ván ở cấp `level` trên STORE THẬT rồi chạy autoplay
 * nhiều ngày liền, tách nguồn thu theo ngày (bán hàng vs nhiệm vụ vs kèo). Đo lường thuần túy — KHÔNG
 * đổi công thức kinh tế/giá/thưởng, chỉ ghi nhận số (quest/bet do harness claim, profit đọc từ summary).
 *
 * Môi trường: chạy được trong TEST (node, theo pattern playtest.test: world 3D chạy headless với stub
 * canvas/document của test) và trong TRÌNH DUYỆT (game.simEconomy(level, days)).
 */

/** Số kệ mở đầu cho cấp N: đủ ít để bot tự đầu tư mở rộng theo thực tế, không quá sơ khai. */
const shelfSeed = (level: number) => Math.min(12, 2 + Math.floor(level / 4));

/** Vốn mở đầu: tương đối dư so với nhu cầu bậc tiệm để bot bày hàng/đầu tư như một ván đang chơi. */
const seedMoney = (level: number, shopTier: number) => Math.max(2_000_000, level * 1_500_000 + SHOP_TIERS[shopTier].price);

/** Gieo store sạch ở cấp `level` (giống cách QA/playtest dựng save). Trả về level thật đã seed. */
export function seedLevel(level: number): number {
  const lv = Math.max(1, Math.min(100, level));
  const base = newGameData();
  const tierIdx = [...SHOP_TIERS].reverse().findIndex((t) => t.unlock <= lv);
  const shopTier = tierIdx < 0 ? 0 : SHOP_TIERS.length - 1 - tierIdx;
  const whTier = [...WAREHOUSE_TIERS].reverse().findIndex((t) => t.unlock <= lv);
  const warehouseTier = whTier < 0 ? 0 : WAREHOUSE_TIERS.length - 1 - whTier;
  const furniture: Furniture[] = Array.from({ length: shelfSeed(lv) }, (_, i) => ({
    uid: i + 1,
    type: 'shelf',
    x: -1.8 + (i % 3) * 2.2,
    z: -2 - Math.floor(i / 3) * 1.6,
    rot: 0,
    tiers: emptyTiers('shelf'),
  }));
  useGame.setState({
    ...base,
    day: 1,
    level: lv,
    xp: 0,
    money: seedMoney(lv, shopTier),
    minutes: DAY_START,
    shopTier,
    warehouseTier,
    furniture,
    stats: emptyStats(),
    totals: emptyTotals(),
    questLog: emptyQuestLog(),
    garden: newGarden(),
    mainCounter: null,
    staff: [],
    shopOpen: false,
    panel: null,
    buildMode: false,
    placing: null,
  });
  return lv;
}

export interface EconomyRow {
  day: number;
  level: number;
  /** Lãi vận hành (doanh thu − chi nhập − lương − tiền nhà) đọc từ summary cuối ngày. */
  operationalProfit: number;
  /** Tiền thưởng nhiệm vụ ngày nhận hôm đó. */
  quest: number;
  /** Tiền kèo trúng hôm đó. */
  bet: number;
}

export interface EconomyAverages {
  level: number;
  days: number;
  professionPerDay: number;
  questPerDay: number;
  betPerDay: number;
  /** ratio = (quest + bet) / operationalProfit — ẩn nếu profit ≤ 0 (chưa có số ý nghĩa). */
  ratio: number | null;
  finalLevel: number;
  totalQuest: number;
  totalBet: number;
  totalProfit: number;
}

/** Dựng world 3D headless (three.js chạy không cần WebGL — chỉ thao tác đồ thị đối tượng). */
export function buildEconomyWorld() {
  const scene = new THREE.Scene();
  const grid = new NavGrid(80);
  const warehouse = new Warehouse(scene);
  const shop = new GroceryShop(scene, warehouse);
  const customers = new CustomerManager(scene, grid, shop);
  const staff = new StaffManager(scene, grid, shop);
  const player = new Player(grid);
  return { scene, grid, warehouse, shop, customers, staff, player };
}

/**
 * Chạy khảo sát `days` ngày ở cấp `level` trên store thật, trả về bảng theo ngày + đường trung bình.
 * In bảng trung bình ra stdout (console.log) để Leader dùng số liệu.
 * Biến thể async: nhả main thread giữa các batch tick để worker test không bị block (và không vướng
 * lỗi RPC timeout của vitest).
 */
export async function runEconomySim(level: number, days: number, opts: AutoplayOptions = {}): Promise<{ rows: EconomyRow[]; averages: EconomyAverages }> {
  seedLevel(level);
  const world = buildEconomyWorld();
  const players = createAutoplay(world.shop, world.customers, world.staff, world.player, opts) as AutoplayRunner;
  const log = await players.async(days);
  const rows: EconomyRow[] = log.map((r) => ({
    day: r.day as number,
    level: r.level as number,
    operationalProfit: profitNum(r.profit as string),
    quest: r.quest as number,
    bet: r.bet as number,
  }));
  const n = rows.length;
  const totalProfit = rows.reduce((n0, r) => n0 + r.operationalProfit, 0);
  const totalQuest = rows.reduce((n0, r) => n0 + r.quest, 0);
  const totalBet = rows.reduce((n0, r) => n0 + r.bet, 0);
  const professionPerDay = n ? totalProfit / n : 0;
  const questPerDay = n ? totalQuest / n : 0;
  const betPerDay = n ? totalBet / n : 0;
  const ratio = professionPerDay > 0 ? (questPerDay + betPerDay) / professionPerDay : null;
  const averages: EconomyAverages = {
    level,
    days: n,
    professionPerDay,
    questPerDay,
    betPerDay,
    ratio,
    finalLevel: n ? rows[n - 1].level : level,
    totalQuest,
    totalBet,
    totalProfit,
  };
  // in-line BẢNG SỐ TRUNG BÌNH
  // eslint-disable-next-line no-console
  console.log(`\n[BẢNG KHẢO SÁT GIĐ105] level=${level} · ${n} ngày (kết thúc cấp ${averages.finalLevel})`);
  // eslint-disable-next-line no-console
  console.log(
    `  operationalProfit/ngày ~ ${fmt(professionPerDay)} · nhiệm vụ/ngày ~ ${fmt(questPerDay)} · kèo/ngày ~ ${fmt(betPerDay)}` +
      ` · tỉ số (nhiệm vụ+kèo)/lãi bán ~ ${ratio === null ? 'N/A (lãi ≤ 0)' : ratio.toFixed(2)}`,
  );
  return { rows, averages };
}

const fmt = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;
const profitNum = (p: string | number) => {
  if (p === '-') return 0;
  if (typeof p === 'number') return p;
  const k = parseFloat(p);
  return Number.isFinite(k) ? k * 1000 : 0;
};
