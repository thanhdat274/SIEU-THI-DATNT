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

  // GĐ1048 — orders.ts nhánh BIÊN của cam kết/giao hợp đồng (dòng 312 `!def || !cs` ở commitContract,
  // 313 `cs.committed` cam kết lần 2, 317 thiếu cọc, 332 release chưa cam kết, 347 deliver id lạ):
  // đỡ gọi nhầm ghi sai tiền/hàng, báo lỗi rõ ràng.
  it('GĐ1048: cam kết id lạ → báo "Hợp đồng không hợp lệ", không đổi gì', () => {
    const toasts: string[] = [];
    useGame.setState({ notify: (m) => void toasts.push(m) });
    const before = useGame.getState().contracts;
    useGame.getState().commitContract('khong-co');
    expect(useGame.getState().contracts).toEqual(before);
    expect(toasts.some((t) => t.includes('Hợp đồng không hợp lệ'))).toBe(true);
  });

  it('GĐ1048: cam kết 2 lần → báo "đã cam kết rồi", cọc/hàng chỉ 1 lần', () => {
    const toasts: string[] = [];
    const d = setup();
    const m0 = useGame.getState().money;
    useGame.getState().commitContract('quan_nhau'); // lần 1
    useGame.setState({ notify: (m) => void toasts.push(m) });
    const m1 = useGame.getState().money;
    useGame.getState().commitContract('quan_nhau'); // lần 2 bị chặn
    expect(useGame.getState().money).toBe(m1); // không trừ cọc thêm
    expect(toasts.some((t) => t.includes('đã cam kết rồi'))).toBe(true);
    expect(useGame.getState().money).toBeLessThan(m0);
  });

  it('GĐ1048: thiếu tiền cọc → không cam kết, báo "Cần ... tiền cọc"', () => {
    const toasts: string[] = [];
    const d = setup();
    useGame.setState({ money: 0, notify: (m) => void toasts.push(m) });
    useGame.getState().commitContract('quan_nhau');
    expect(useGame.getState().contracts['quan_nhau'].committed).toBeFalsy();
    expect(useGame.getState().money).toBe(0);
    expect(toasts.some((t) => t.includes('tiền cọc'))).toBe(true);
  });

  it('GĐ1048: hủy cam kết khi CHƯA cam kết → báo "Chưa cam kết kỳ này", không hoàn gì', () => {
    const toasts: string[] = [];
    const d = setup();
    const m0 = useGame.getState().money;
    useGame.setState({ notify: (m) => void toasts.push(m) });
    useGame.getState().releaseContract('quan_nhau');
    expect(useGame.getState().money).toBe(m0); // không hoàn cọc
    expect(toasts.some((t) => t.includes('Chưa cam kết kỳ này'))).toBe(true);
  });

  it('GĐ1048: giao hợp đồng id lạ → trả false + báo "Hợp đồng không hợp lệ"', () => {
    const toasts: string[] = [];
    useGame.setState({ notify: (m) => void toasts.push(m) });
    expect(useGame.getState().deliverContract('khong-co')).toBe(false);
    expect(toasts.some((t) => t.includes('Hợp đồng không hợp lệ'))).toBe(true);
  });
});
