import { beforeEach, describe, expect, it } from 'vitest';
import { cashierRng, clearSimSeed, setSimSeed, simRng } from '../core/rand';

describe('cashierRng (GĐ1253 — dòng rút riêng cho quyết định thu ngân)', () => {
  beforeEach(() => clearSimSeed());

  it('chưa seed → Math.random (game thật), hai lần gọi khác nhau', () => {
    const a = cashierRng();
    const b = cashierRng();
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    // Math.random: gần như chắc chắn khác nhau
    expect(a).not.toBe(b);
  });

  it('cùng seed → cùng chuỗi (tất định); khác seed → chuỗi khác', () => {
    setSimSeed(12345);
    const seq1 = [cashierRng(), cashierRng(), cashierRng()];
    setSimSeed(12345);
    const seq2 = [cashierRng(), cashierRng(), cashierRng()];
    expect(seq1).toEqual(seq2);
    setSimSeed(999);
    const seq3 = [cashierRng(), cashierRng(), cashierRng()];
    expect(seq3).not.toEqual(seq1);
  });

  it('ĐỘC LẬP chuỗi chính: rút cashierRng không dịch chuỗi simRng và ngược lại', () => {
    setSimSeed(777);
    const mainBefore = [simRng()(), simRng()(), simRng()()];
    setSimSeed(777);
    // 5 lần rút thu ngân xen kẽ — chuỗi chính phải ra y hệt như không có chúng
    cashierRng(); cashierRng(); cashierRng(); cashierRng(); cashierRng();
    const mainAfter = [simRng()(), simRng()(), simRng()()];
    expect(mainAfter).toEqual(mainBefore);
    // và ngược lại: rút chuỗi chính không đổi chuỗi thu ngân
    setSimSeed(777);
    const cashierBefore = [cashierRng(), cashierRng()];
    setSimSeed(777);
    simRng()(); simRng()(); simRng()(); simRng()();
    expect([cashierRng(), cashierRng()]).toEqual(cashierBefore);
  });

  it('setSimSeed lại thì chuỗi thu ngân dựng lại từ đầu (không nối dòng cũ); clearSimSeed về Math.random', () => {
    setSimSeed(42);
    const first = cashierRng();
    setSimSeed(42);
    expect(cashierRng()).toBe(first);
    clearSimSeed();
    const x = cashierRng();
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });
});
