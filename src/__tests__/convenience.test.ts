import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { runBranch } from '../core/slices/branch';
import { putStock } from '../core/stock';
import { productById, unlockedProducts } from '../data/products';
import { COOKED_PRODUCTS } from '../data/recipes';
import { customersPerDay } from '../data/levels';
import { dailyWage, type Staff } from '../data/staff';
import {
  CONVENIENCE, VENDING_CAP, VENDING_ITEMS, VENDING_THEFT, branchPowerBill, itemWeight, isNightItem, mealFactor, newBranch, vendingTotal,
} from '../data/branches';

/** Bộ test đợt 45 — 2 tính năng chiều sâu cho cửa hàng tiện lợi 24/7: máy bán hàng tự động ngoài cửa + thực đơn theo ca. */

afterEach(() => vi.restoreAllMocks());

describe('máy bán hàng tự động — dữ liệu', () => {
  it('mọi món nạp được vào máy đều là sản phẩm hợp lệ', () => {
    for (const id of VENDING_ITEMS) expect(productById(id), id).toBeTruthy();
  });

  it('máy có sức chứa hữu hạn và tổng hàng đếm đúng', () => {
    expect(VENDING_CAP).toBeGreaterThan(0);
    expect(vendingTotal({ mi: 2, nuoc: 3 })).toBe(5);
    expect(vendingTotal({})).toBe(0);
  });
});

describe('máy bán hàng tự động — bán cả khi đóng cửa', () => {
  it('quầy đóng, không thu ngân, không mở cửa vẫn bán được từ máy và ghi doanh thu + trừ hàng trong máy', () => {
    // Random 0.2: mỗi bước 10 phút bán đúng 1 món (lưu lượng chi nhánh giờ thấp, kỳ vọng < 1 món/bước)
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const base = useGame.getState();
    const msgs: string[] = [];
    const branch = newBranch();
    branch.open = false;
    branch.vendingEnabled = true;
    branch.vendingStock = { mi: 20, nuoc: 20 };
    branch.simAt = 12 * 60; // giữa trưa, đông khách
    const s: any = {
      ...base,
      branch,
      money: 0,
      stats: { ...base.stats },
      garden: { ...base.garden, homegrown: {} },
      notify: (m: string) => { msgs.push(m); },
    };
    const out = runBranch(() => s, 14 * 60); // 2 tiếng
    expect(out.branch!.vendingRevenueToday!).toBeGreaterThan(0);
    expect(vendingTotal(out.branch!.vendingStock!)).toBeLessThan(40);
    expect(out.branch!.customersToday).toBe(0); // quầy đóng nên không bán hàng trên kệ
    expect(out.money!).toBeGreaterThan(0);
  });
});

describe('thực đơn theo ca', () => {
  it('điểm tâm sáng được đẩy mạnh buổi sáng, không buổi tối', () => {
    expect(mealFactor('banh_mi_trung_nuong', 8 * 60)).toBeGreaterThan(1);
    expect(mealFactor('banh_mi_trung_nuong', 20 * 60)).toBe(1);
    expect(itemWeight('banh_mi_trung_nuong', 8 * 60)).toBeGreaterThan(itemWeight('banh_mi_trung_nuong', 20 * 60));
  });

  it('đồ ăn nhanh trưa được đẩy mạnh giờ trưa', () => {
    expect(mealFactor('com_hop_ga', 12 * 60)).toBeGreaterThan(1);
    expect(mealFactor('com_hop_ga', 20 * 60)).toBe(1);
  });

  it('món đêm vẫn mạnh ban đêm (mì ly, nước tăng lực)', () => {
    expect(isNightItem('x_mi_ly_tp')).toBe(true);
    expect(itemWeight('x_mi_ly_tp', 23 * 60)).toBeGreaterThan(itemWeight('x_mi_ly_tp', 12 * 60));
  });
});

// ── Cân bằng GĐ6: lãi ròng chi nhánh ≈ 30–50% lãi ròng tổng ở cận cấp 26–40 ──
// Doanh thu thô chi nhánh (~69% tổng) gây hiểu lầm: chưa trừ giá vốn hàng bán (hàng chi nhánh
// rút từ kho chung đã nhập bằng giá buy), lương ca, tiền điện và phí xe chở. Sau khi trừ hết,
// chi nhánh cũ (331 khách/ngày) chiếm tới ~82% lãi ròng tổng → giảm lưu lượng còn ~88 khách/ngày.

/** RNG có hạt mồi: mô phỏng nhiều bước nên phải chốt được số, không để random trôi nổi từng lần chạy. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const balanceCrew = (role: Staff['role'], shift: Staff['shift'], id: number, wage: number): Staff =>
  ({ id, name: `NV${id}`, role, skill: 3, wage, shift, xp: 0, daysWorked: 0 } as unknown as Staff);

/** Lãi ròng tiệm chính cấp 26 theo công thức (ghi rõ để sau này đối chiếu khi đổi số):
 *  khách = customersPerDay(26) = 124; mỗi khách ~2.5 món (không xe đẩy: 1 + random(0..3));
 *  giá bán/vốn = trung bình cộng các món đã mở ở cấp 26 (trừ thịt cá tươi, cộng đồ nấu);
 *  trừ lương 8 nhân viên ca nguyên ngày (32k × 1.6), tiền nhà tier 3 (20k + 9×30k), vận hành 2% doanh thu. */
function mainShopNet26() {
  const mix = [
    ...unlockedProducts(26).filter((p) => p.category !== 'meat'),
    ...COOKED_PRODUCTS.filter((p) => p.unlock <= 26),
  ];
  const avgSell = mix.reduce((n, p) => n + p.sell, 0) / mix.length;
  const avgBuy = mix.reduce((n, p) => n + p.buy, 0) / mix.length;
  const revenue = customersPerDay(26) * 2.5 * avgSell;
  return revenue - customersPerDay(26) * 2.5 * avgBuy - 8 * 32_000 * 1.6 - (20_000 + 9 * 30_000) - revenue * 0.02;
}

describe('cân bằng kinh tế chi nhánh cấp 26', () => {
  it('lãi ròng 1 ngày chi nhánh nằm trong biên 30–50% lãi ròng tổng', () => {
    vi.spyOn(Math, 'random').mockImplementation(seeded(20261026));
    const base = useGame.getState();
    const b = newBranch();
    b.open = true;
    b.simAt = 6 * 60;
    b.eventDay = 5; // tắt sự kiện đêm: sự kiện chỉ gây thiệt hại, tắt đi lấy trần lãi để so biên
    // Kệ mix đều mọi món đã mở ở cấp 26 như xe chở từ kho chung (không có thịt cá tươi)
    const mix = [
      ...unlockedProducts(26).filter((p) => p.category !== 'meat'),
      ...COOKED_PRODUCTS.filter((p) => p.unlock <= 26),
    ];
    const per = Math.max(1, Math.floor(CONVENIENCE.shelfCap / mix.length));
    for (const p of mix) b.shelf[p.id] = per;
    // Đủ nhân viên 3 ca như bot: 3 thu ngân, giao hàng sáng, xếp hàng chiều, bảo vệ đêm, quản lý sáng
    b.staff = [
      balanceCrew('cashier', 'morning', 1, 32_000),
      balanceCrew('cashier', 'afternoon', 2, 32_000),
      balanceCrew('cashier', 'night', 3, 32_000),
      balanceCrew('courier', 'morning', 4, 35_000),
      balanceCrew('stocker', 'afternoon', 5, 32_000),
      balanceCrew('guard', 'night', 6, 38_000),
      balanceCrew('manager', 'morning', 7, 58_000),
    ];
    // Kho chung đầy để xe chở hàng hoạt động như chơi thật
    const k = { storage: {} as Record<string, number>, storageLots: {} };
    for (const p of mix) putStock(k as never, p.id, 400);
    const s: any = {
      ...base, branch: b, money: 50_000_000, level: 26, day: 5, licenses: { alcohol: 99 }, atBranch: false,
      stats: { ...base.stats }, garden: { ...base.garden, homegrown: {} },
      storage: k.storage, storageLots: k.storageLots, notify: () => {},
    };
    const out = runBranch(() => s, 30 * 60); // chạy trọn 24h (6h hôm nay → 6h mai)
    const fin = out.branch!;
    // Giá vốn món đã bán: kệ vơi × giá nhập, trừ phần mất trộm (không tạo ra doanh thu)
    let gone = 0, cogsGone = 0;
    for (const p of mix) {
      const d = per - (fin.shelf[p.id] ?? 0);
      if (d > 0) { gone += d; cogsGone += d * p.buy; }
    }
    const cogsSold = Math.round(cogsGone - fin.lostToday * (gone ? cogsGone / gone : 0));
    const wages = b.staff.reduce((n, st) => n + dailyWage(st), 0);
    const branchNet = fin.revenueToday - cogsSold - wages - branchPowerBill(fin) - (50_000_000 + fin.revenueToday - (out.money ?? 0));
    const mainNet = mainShopNet26();
    const share = branchNet / (branchNet + mainNet);
    // Trần lãi tuyệt đối kèm số (cùng công thức trên, kệ mix cấp 26, nhân viên đủ 3 ca):
    // doanh thu ~2,6–3,1tr; giá vốn ~1,6tr; lương 294k; điện 164k; phí xe ~150k → lãi ròng ~0,4–0,6tr/ngày
    expect(branchNet).toBeGreaterThan(300_000);
    expect(branchNet).toBeLessThan(700_000);
    expect(share).toBeGreaterThanOrEqual(0.3);
    expect(share).toBeLessThanOrEqual(0.5);
  });
});
