import { describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import { runBranch } from '../core/slices/branch';
import { productById } from '../data/products';
import {
  CONVENIENCE, VENDING_CAP, VENDING_ITEMS, VENDING_THEFT, itemWeight, isNightItem, mealFactor, newBranch, vendingTotal,
} from '../data/branches';

/** Bộ test đợt 45 — 2 tính năng chiều sâu cho cửa hàng tiện lợi 24/7: máy bán hàng tự động ngoài cửa + thực đơn theo ca. */

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
