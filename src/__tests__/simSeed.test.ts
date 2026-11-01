import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSimSeed, isSimSeeded, mulberry32, setSimSeed, simRng } from '../core/rand';
import { pickPayment } from '../data/payments';

/**
 * Bộ test GĐ27 — Nền Seeded RNG cho sim.
 *
 * Hợp đồng (xem src/core/rand.ts):
 *  - `simRng()` mặc định trả `Math.random` (động, nên mock vẫn chạy như cũ); `isSimSeeded()` = false.
 *  - `setSimSeed(n)` bật chuỗi `mulberry32(n)` xác định; `clearSimSeed()` quay về Math.random.
 *  - Consumer nối qua `simRng()` (GĐ27 nối `pickPayment`): cùng seed → cùng kết quả rẽ ngẫu nhiên.
 */
beforeEach(() => clearSimSeed());
afterEach(() => clearSimSeed());

describe('mulberry32 — PRNG xác định', () => {
  it('cùng seed cho cùng chuỗi, khác seed cho chuỗi khác', () => {
    const a1 = mulberry32(20261026);
    const a2 = mulberry32(20261026);
    const b = mulberry32(1);
    const seqA = [a1(), a1(), a1(), a1(), a1()];
    const seqA2 = [a2(), a2(), a2(), a2(), a2()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqA2);
    expect(seqA).not.toEqual(seqB);
  });

  it('giá trị luôn nằm trong [0, 1) và biến thiên', () => {
    const r = mulberry32(12345);
    const vals = Array.from({ length: 200 }, () => r());
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(new Set(vals.map((v) => v.toFixed(6))).size).toBeGreaterThan(190);
  });
});

describe('simRng — seam định hướng', () => {
  it('mặc định = Math.random và isSimSeeded = false', () => {
    expect(isSimSeeded()).toBe(false);
    expect(simRng()).toBe(Math.random);
  });

  it('setSimSeed bật seed; clearSimSeed tắt', () => {
    setSimSeed(7);
    expect(isSimSeeded()).toBe(true);
    const r = simRng();
    expect(r).not.toBe(Math.random);
    expect(r()).toBeGreaterThanOrEqual(0);
    clearSimSeed();
    expect(isSimSeeded()).toBe(false);
    expect(simRng()).toBe(Math.random);
  });

  it('cùng seed → cùng chuỗi giữa hai lần chạy (tái lập)', () => {
    const run = () => {
      setSimSeed(20261026);
      const r = simRng();
      return [r(), r(), r(), r(), r()];
    };
    expect(run()).toEqual(run());
  });
});

describe('pickPayment — consumer nối qua simRng', () => {
  it('cùng seed → cùng lựa chọn hình thức thanh toán (tái lập)', () => {
    const guess = () => {
      setSimSeed(99);
      return pickPayment(120000, 30);
    };
    expect(guess()).toBe(guess());
  });

  it('chưa seed: vẫn tôn trọng mock Math.random như trước (không phá test cũ)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const got = pickPayment(120000, 30);
    // roll cao + đơn lớn → nghiêng hình thức không tiền mặt
    expect(['bank', 'wallet', 'card']).toContain(got);
    vi.restoreAllMocks();
  });
});
