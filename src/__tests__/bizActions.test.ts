import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { buyRivalShop, buyUpgrade, takeLoan } from '../core/biz';
import { loanTopUps, RIVAL_BUY_DAYS } from '../data/biz';
import { newBranch } from '../data/branches';

/**
 * GĐ697 — phủ hành động kinh doanh còn lộ (biz.ts, covlines GĐ693):
 *  116-129  mua lại mặt bằng rival khi ĐÃ có chi nhánh → hàng kho chuyển sang kệ chi nhánh
 *  147-152  vay thêm khi đang nợ (cộng gốc, dời hạn)
 *  207-214  mua thiết bị một lần (camera)
 */

const g = () => useGame.getState();

beforeEach(() => useGame.setState({ ...newGameData(), level: 20, money: 100_000_000, day: 12, notify: () => {} }));

describe('kinh doanh: mua lại mặt bằng rival (GĐ697)', () => {
  it('đã có chi nhánh: trả tiền, hàng kho chở sang kệ chi nhánh, mở rivalBuyUntil', () => {
    useGame.setState({
      biz: { ...g().biz, rivalForSale: { name: 'Tạp hóa Cô Ba', price: 50_000_000, until: 20 } },
      branch: { ...newBranch(), shelf: {}, simAt: 600 },
      storage: { mi: 50, nuoc: 30 },
    });
    const before = g();
    buyRivalShop();
    const st = g();
    expect(st.money).toBe(before.money - 50_000_000);
    expect(st.biz.rivalForSale).toBeUndefined();
    expect(st.biz.rivalBuyUntil).toBe(before.day + RIVAL_BUY_DAYS);
    // hàng thật từ kho sang kệ chi nhánh
    expect((st.branch?.shelf.mi ?? 0) + (st.branch?.shelf.nuoc ?? 0)).toBeGreaterThan(0);
    expect(st.storage.mi).toBeLessThan(50);
    expect(st.storage.nuoc).toBeLessThan(30);
  });

  it('không có mặt bằng chào bán: báo và không đổi tiền', () => {
    useGame.setState({ biz: { ...g().biz, rivalForSale: undefined } });
    const before = g().money;
    buyRivalShop();
    expect(g().money).toBe(before);
  });
});

describe('kinh doanh: vay vốn (GĐ697)', () => {
  it('đang nợ mà vay thêm: cộng gốc, dời hạn trả, báo rõ', () => {
    useGame.setState({
      biz: { ...g().biz, loan: { principal: 1_000_000, takenDay: 5, dueDay: 35, interestPaid: 0 } },
    });
    const amount = loanTopUps(g().level, 1_000_000)[0];
    expect(amount).toBeDefined();
    takeLoan(amount);
    const loan = g().biz.loan!;
    expect(loan.principal).toBe(1_000_000 + amount);
    expect(loan.dueDay).toBe(g().day + 30);
    expect(g().money).toBe(100_000_000 + amount);
  });

  it('vay thêm khoản vượt hạn mức thì bị từ chối', () => {
    useGame.setState({
      biz: { ...g().biz, loan: { principal: 1_000_000, takenDay: 5, dueDay: 35, interestPaid: 0 } },
    });
    const before = g().money;
    takeLoan(999_999_999);
    expect(g().money).toBe(before);
    expect(g().biz.loan!.principal).toBe(1_000_000);
  });
});

describe('kinh doanh: thiết bị một lần (GĐ697)', () => {
  it('mua camera: trừ tiền, ghi vào upgrades, không mua trùng được', () => {
    buyUpgrade('camera');
    expect(g().biz.upgrades).toContain('camera');
    expect(g().money).toBe(100_000_000 - 800_000);
    const after = g().money;
    buyUpgrade('camera'); // trùng: im lặng
    expect(g().money).toBe(after);
  });

  it('chưa đủ cấp thì không mua được', () => {
    useGame.setState({ level: 10 }); // camera mở ở cấp 15
    buyUpgrade('camera');
    expect(g().biz.upgrades ?? []).not.toContain('camera');
    expect(g().money).toBe(100_000_000);
  });
});
