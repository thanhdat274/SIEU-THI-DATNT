import { describe, it, expect } from 'vitest';

// Sổ cái tiền (GĐ33): chạy bot playtest trên game ở ván phát triển (mọi hệ thu/chi cùng hoạt động:
// tiệm chính + chi nhánh + quán nước + online + trại + thuê + lương + điện) và CHỤP lại từng lần biến
// đổi money qua useGame.subscribe — khóa các bất biến sổ cái mà từng test đơn lẻ bỏ sót:
//   A. Mọi giá trị money trung gian phải hữu hạn (không NaN/Infinity — bắt "tiền biến mất"/thành NaN).
//   B. Tiền không bao giờ rơi xuống dưới ngưỡng lỗ sâu (bắt lỗi chi phí chạy trốn chạm đáy).
//   C. Khớp cộng dồn: money cuối == money đầu + Σ mọi delta (mọi thay đổi tiền đều qua set → subscribe,
//      không có thay đổi "ngoài sổ").
//   D. Chặn cú nhảy khủng: không một lần biến đổi ĐƠN lẻ nào vượt 10× dòng tiền ròng lớn nhất một ngày
//      (bắt lớp lỗi "×1000 off-by-one" như lương 176M của GĐ6 — một giao dịch lớn hơn cả dòng tiền cả ngày
//      là bất thường). Biên tính theo dữ liệu, không phải hằng số ma thuật.

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));
// vi được dùng để tái lập seed: bot phải tái lập được (GĐ28) — nhưng để test sổ cái, seed cố định bớt biến động
import { vi } from 'vitest';

import { createPlaytest } from '../dev/playtest';
import { newGameData, useGame } from '../core/store';
import { newGarden } from '../data/garden';
import { setSimSeed, clearSimSeed } from '../core/rand';
import { DAY_START } from '../core/gameTypes';

const shop = {
  width: 10, depth: 8,
  counters: () => [{ center: { x: 0, z: 0 } }],
  fullCheck: () => false,
} as unknown as Parameters<typeof createPlaytest>[0];
const customers = { update: () => {} } as unknown as Parameters<typeof createPlaytest>[1];
const staff = { update: () => {}, cashierSpeed: () => 0 } as unknown as Parameters<typeof createPlaytest>[2];
const player = { teleport: () => {}, position: { distanceTo: () => 5 } } as unknown as Parameters<typeof createPlaytest>[3];

describe('sổ cái tiền (GĐ33) — mọi biến đổi money qua toàn run phải lành', () => {
  it('4 ngày ở ván phát triển: không NaN, không tụt đáy, khớp cộng dồn, không cú nhảy khủng', { timeout: 90_000 }, async () => {
    setSimSeed(20261027);
    const base = newGameData();
    const startMoney = 500_000_000;
    useGame.setState({
      ...base,
      day: 40, level: 45, money: startMoney, minutes: DAY_START,
      garden: newGarden(),
      furniture: [
        { uid: 1, type: 'shelf', x: -1.8, z: -2, rot: 0, tiers: Array.from({ length: 12 }, () => ({ productId: null, count: 0 })) },
        { uid: 2, type: 'shelf', x: 0.4, z: -2, rot: 0, tiers: Array.from({ length: 12 }, () => ({ productId: null, count: 0 })) },
        { uid: 9, type: 'fryer', x: 2, z: 2, rot: 0, tiers: [] },
        { uid: 10, type: 'food_grill', x: 3, z: 2, rot: 0, tiers: [] },
      ] as typeof base.furniture,
    });

    const s0 = useGame.getState();
    let prevMoney = s0.money;
    let minMoney = s0.money;
    let anyNonFinite = false;
    const deltas: number[] = [];
    const byDay = new Map<number, number>(); // dòng tiền ròng của mỗi ngày (theo ngày khi phát sinh)
    const unsub = useGame.subscribe((s, p) => {
      const d = s.money - p.money;
      if (!Number.isFinite(s.money) || !Number.isFinite(s.money - p.money)) anyNonFinite = true;
      deltas.push(d);
      byDay.set(p.day, (byDay.get(p.day) ?? 0) + d);
      if (s.money < minMoney) minMoney = s.money;
      prevMoney = s.money;
    });

    try {
      const run = createPlaytest(shop, customers, staff, player);
      await run(4);
    } finally {
      unsub();
      clearSimSeed();
    }

    const final = useGame.getState().money;

    // A — không một lần đọc money trung gian nào thành NaN/Infinity (bắt "tiền thăng thiên")
    expect(anyNonFinite, 'money trung gian bị NaN/Infinity').toBe(false);
    expect(Number.isFinite(final)).toBe(true);

    // B — không tụt xuống đáy lỗ sâu (ván 500M đã phát triển không nên cháy túi)
    expect(minMoney, `money tụt quá sâu: ${minMoney}`).toBeGreaterThanOrEqual(-1_000_000);

    // C — khớp cộng dồn: cuối == đầu + Σ mọi delta (không có biến đổi "ngoài sổ")
    const sum = deltas.reduce((n, v) => n + v, 0);
    expect(startMoney + sum, 'money cuối != đầu + Σ delta (có thay đổi ngoài sổ lệch)').toBeCloseTo(final, 2);

    // D — không cú nhảy khủng: một lần biến đổi đơn lẻ ≤ 10× dòng tiền ròng lớn nhất một ngày
    const peakDailyNet = Math.max(...Array.from(byDay.values()).map(Math.abs), 1);
    const maxSingle = Math.max(...deltas.map(Math.abs), 0);
    expect(maxSingle, `cú nhảy đơn lẻ ${maxSingle} vượt 10× dòng cả ngày ${peakDailyNet}`)
      .toBeLessThanOrEqual(peakDailyNet * 10 + 1);

    // Hệ đã thực sự hoạt động: có tiền lưu chuyển (không phải ván chết)
    expect(deltas.length).toBeGreaterThan(0);
    expect(Number.isFinite(peakDailyNet)).toBe(true);
  });
});
