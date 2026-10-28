import { describe, it, expect, vi } from 'vitest';

// Bot playtest là công cụ dev-only chạy trong trình duyệt, nhưng phải không bao giờ vỡ: test này
// chạy bot 3 ngày trong môi trường node với các đối tượng 3D giả (shop/customers/staff/player)
// để chốt: chạy hết không ném lỗi, tổng kết đủ trường và số liệu hữu hạn.

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

import { createPlaytest } from '../dev/playtest';
import { newGameData, useGame } from '../core/store';
import { newGarden } from '../data/garden';
import { DAY_START } from '../core/gameTypes';

const shop = {
  width: 10, depth: 8,
  counters: () => [{ center: { x: 0, z: 0 } }],
  fullCheck: () => false,
} as unknown as Parameters<typeof createPlaytest>[0];
const customers = { update: () => {} } as unknown as Parameters<typeof createPlaytest>[1];
const staff = { update: () => {}, cashierSpeed: () => 0 } as unknown as Parameters<typeof createPlaytest>[2];
const player = {
  teleport: () => {},
  position: { distanceTo: () => 5 },
} as unknown as Parameters<typeof createPlaytest>[3];

describe('bot playtest (dev tool) chạy an toàn trong môi trường giả', () => {
  it('chạy 3 ngày cấp 26 không ném lỗi, tổng kết đủ trường và số liệu hữu hạn', { timeout: 60_000 }, async () => {
    const base = newGameData();
    useGame.setState({
      ...base,
      day: 25, level: 26, money: 50_000_000, minutes: DAY_START,
      garden: newGarden(),
      furniture: [
        { uid: 1, type: 'shelf', x: -1.8, z: -2, rot: 0, tiers: Array.from({ length: 12 }, () => ({ productId: null, count: 0 })) },
        { uid: 2, type: 'shelf', x: 0.4, z: -2, rot: 0, tiers: Array.from({ length: 12 }, () => ({ productId: null, count: 0 })) },
        { uid: 9, type: 'fryer', x: 2, z: 2, rot: 0, tiers: [] },
        { uid: 10, type: 'food_grill', x: 3, z: 2, rot: 0, tiers: [] },
      ] as typeof base.furniture,
    });
    const run = createPlaytest(shop, customers, staff, player);
    const res = run(3);
    expect(res).toBeInstanceOf(Promise); // runner bất đồng bộ: nhả main thread giữa các ngày cho automation
    const { rows, summary } = await res;
    expect(rows.length).toBe(3);
    expect(summary.days).toBe(3);
    expect(Number.isFinite(summary.money)).toBe(true);
    expect(Number.isFinite(summary.revenuePerDay)).toBe(true);
    expect(Number.isFinite(summary.profitPerDay)).toBe(true);
    expect(summary).toHaveProperty('onlineDelivered');
    expect(summary).toHaveProperty('farmHarvest');
    expect(summary).toHaveProperty('branchDay');
    // Cấp 26: quán nước chưa mở (cấp 29) — tổng kết vẫn có sẵn field, doanh thu quán phải bằng 0
    expect(summary.quanRevenue).toBe(0);
    expect(summary.quanDay).toBe(0);
    // Bot tự nâng cấp/nhập hàng: cấp không giảm, tiền không thành NaN
    const s = useGame.getState();
    expect(s.level).toBeGreaterThanOrEqual(26);
    expect(Number.isFinite(s.money)).toBe(true);
  });

  it('chạy 5 ngày cấp 30 với 80 triệu: bot mở được quán nước, tuyển đủ 3 người và ghi được doanh thu', { timeout: 60_000 }, async () => {
    const base = newGameData();
    useGame.setState({
      ...base,
      day: 29, level: 30, money: 80_000_000, minutes: DAY_START,
      garden: newGarden(),
      // Cấp 30 đã nên có Tổng kho: quán nước rút đồ uống từ kho chung, kho chật sẽ chặn nhập hàng
      warehouseTier: 3,
      furniture: [
        { uid: 1, type: 'shelf', x: -1.8, z: -2, rot: 0, tiers: Array.from({ length: 12 }, () => ({ productId: null, count: 0 })) },
        { uid: 2, type: 'shelf', x: 0.4, z: -2, rot: 0, tiers: Array.from({ length: 12 }, () => ({ productId: null, count: 0 })) },
        { uid: 9, type: 'fryer', x: 2, z: 2, rot: 0, tiers: [] },
        { uid: 10, type: 'food_grill', x: 3, z: 2, rot: 0, tiers: [] },
      ] as typeof base.furniture,
    });
    const run = createPlaytest(shop, customers, staff, player);
    const { rows, summary } = await run(5);
    expect(rows.length).toBe(5);
    // Bot mua quán trong kỳ (mở cấp 29, giá 25 triệu) và bắt đầu ghi doanh thu từng ngày
    expect(summary.quanDay).toBeGreaterThan(0);
    expect(summary.quanRevenue).toBeGreaterThan(0);
    // Doanh thu quán nằm trong bảng từng ngày qua field quanRev (định dạng "…k" như các cột tiền khác)
    expect(rows.every((r) => /^\d+k$/.test(r.quanRev ?? ''))).toBe(true);
    // Bot tuyển đủ 3 nhân viên quán (khách đông hơn) và mô phỏng endDay đã rút đồ uống khỏi kho
    const s = useGame.getState();
    expect(s.biz.quanNuoc.open).toBe(true);
    expect(s.biz.quanNuoc.staff).toBe(3);
  });
});
