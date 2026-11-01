import { describe, expect, it, beforeEach } from 'vitest';
import { commitBonusValue, commitDeposit, reservedMissing, contractValue, CONTRACT_COMMIT_BONUS, CONTRACT_COMMIT_DEPOSIT, supplyContractById } from '../data/contracts';
import { newGameData, useGame } from '../core/store';

/** Cam kết kỳ hợp đồng: trữ sẵn hàng để nhận thưởng tin cậy (cọc hoàn lại) — quyết định đổi-lấy vs linh hoạt. */

beforeEach(() => useGame.setState(newGameData()));

const def = () => supplyContractById('quan_nhau')!; // bia 12, ngot 10, nuoc 8, snack 10

describe('commit helpers (data/contracts)', () => {
  it('thưởng tin cậy = 6% giá kỳ; cọc = 10% giá kỳ (tỉ lệ đúng với giá kỳ thật)', () => {
    expect(CONTRACT_COMMIT_BONUS).toBe(0.06);
    expect(CONTRACT_COMMIT_DEPOSIT).toBe(0.1);
    const d = def();
    const v = contractValue(d);
    expect(commitDeposit(d)).toBe(Math.round((v * 0.1) / 1000) * 1000);
    expect(commitBonusValue(d)).toBe(Math.round((v * 0.06) / 1000) * 1000);
    expect(commitBonusValue(d)).toBeLessThan(commitDeposit(d));
  });

  it('reservedMissing: ngăn đầy đủ → rỗng; thiếu → liệt kê đúng', () => {
    const full = { bia: 12, ngot: 10, nuoc: 8, snack: 10 };
    expect(reservedMissing(def(), full)).toEqual([]);
    const partial = { bia: 12, ngot: 5 };
    expect(reservedMissing(def(), partial)).toContainEqual({ id: 'ngot', need: 5 });
    expect(reservedMissing(def(), undefined).length).toBeGreaterThan(0);
  });
});

describe('commitContract / releaseContract / deliverContract (orders slice)', () => {
  function setup() {
    const d = def();
    const storage: Record<string, number> = {};
    for (const [id, q] of Object.entries(d.items)) storage[id] = q; // vừa đủ
    useGame.setState({
      level: d.unlock + 5,
      storage,
      contracts: { quan_nhau: { defId: 'quan_nhau', dueDay: useGame.getState().day + d.periodDays, delivered: 0, pending: false } },
    });
    return d;
  }

  it('cam kết: chuyển đúng số hàng ra khỏi kho bán chung, trừ cọc, đánh dấu committed', () => {
    const d = setup();
    const before = useGame.getState().money;
    const deposit = commitDeposit(d);
    useGame.getState().commitContract('quan_nhau');
    const cs = useGame.getState().contracts['quan_nhau'];
    expect(cs.committed).toBe(true);
    expect(cs.locked).toEqual(d.items); // đã trữ đủ
    expect(useGame.getState().money).toBe(before - deposit);
    // kho bán chung không còn hàng nào của món đó
    const store = useGame.getState().storage;
    for (const id of Object.keys(d.items)) expect(store[id] ?? 0).toBe(0);
  });

  it('cam kết khi kho thiếu → không cam kết, tiền không đổi', () => {
    const d = setup();
    useGame.setState({ storage: { bia: 2 } }); // thiếu
    const m0 = useGame.getState().money;
    useGame.getState().commitContract('quan_nhau');
    expect(useGame.getState().contracts['quan_nhau'].committed).toBeFalsy();
    expect(useGame.getState().money).toBe(m0); // không trừ cọc
  });

  it('hủy cam kết: trả hàng về kho, hoàn cọc, bỏ committed', () => {
    const d = setup();
    const m0 = useGame.getState().money;
    useGame.getState().commitContract('quan_nhau');
    const mAfterCommit = useGame.getState().money;
    useGame.getState().releaseContract('quan_nhau');
    const cs = useGame.getState().contracts['quan_nhau'];
    expect(cs.committed).toBeFalsy();
    expect(cs.locked).toBeUndefined();
    expect(useGame.getState().money).toBe(m0); // hoàn cọc → về mốc ban đầu
    expect(useGame.getState().money).toBeGreaterThan(mAfterCommit);
    // hàng về lại kho bán chung
    const store = useGame.getState().storage;
    for (const [id, q] of Object.entries(d.items)) expect(store[id]).toBe(q);
  });

  it('giao đã cam kết: lấy từ ngăn trữ, + thưởng tin cậy + hoàn cọc, xóa cam kết', () => {
    const d = setup();
    useGame.getState().commitContract('quan_nhau');
    const beforeMoney = useGame.getState().money; // sau khi trừ cọc
    const pay = contractValue(d);
    const bonus = commitBonusValue(d);
    const deposit = commitDeposit(d);
    const items = Object.values(d.items).reduce((n, q) => n + q, 0);
    const ok = useGame.getState().deliverContract('quan_nhau');
    expect(ok).toBe(true);
    const cs = useGame.getState().contracts['quan_nhau'];
    expect(cs.committed).toBeFalsy();
    expect(cs.locked).toBeUndefined();
    expect(cs.delivered).toBe(1);
    // tiền tăng đúng pay + bonus + cọc hoàn
    expect(useGame.getState().money - beforeMoney).toBe(pay + bonus + deposit);
    // doanh thu hôm nay + itemsSold đã tính
    expect(useGame.getState().stats.revenue).toBe(pay + bonus);
    expect(useGame.getState().stats.itemsSold).toBe(items);
    expect(useGame.getState().totals.contractsDone).toBe(1);
  });

  it('giao không cam kết (path cũ) vẫn nguyên hành vi', () => {
    const d = setup();
    const pay = contractValue(d);
    const beforeMoney = useGame.getState().money;
    const ok = useGame.getState().deliverContract('quan_nhau');
    expect(ok).toBe(true);
    expect(useGame.getState().money - beforeMoney).toBe(pay); // không có bonus/cọc
    expect(useGame.getState().contracts['quan_nhau'].committed).toBeFalsy();
  });
});
