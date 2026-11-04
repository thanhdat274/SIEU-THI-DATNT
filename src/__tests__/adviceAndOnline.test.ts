import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { expiringSoon, EXPIRY_WARN_DAYS } from '../data/advice';
import { analyticsAdvice, shelfCount, type ItemHealth } from '../data/analytics';
import { migrateTiers } from '../core/stock';
import { updateOnline } from '../core/slices/online';
import { furnitureDef } from '../data/furniture';
import { ACCEPT_WINDOW } from '../data/online';
import type { Furniture } from '../core/gameTypes';

/**
 * GĐ699 — phủ các khối logic thuần còn lộ nhỏ (covlines GĐ693):
 *  advice.ts 223-241  expiringSoon gộp kho + kệ, hạn ngắn nhất lên trước
 *  analytics.ts 87-89, 168-183  shelfCount + analyticsAdvice (nhập thêm / bỏ món lỗ / hỏng nhiều / lỡ nhiều / chuyển kệ)
 *  stock.ts 115-126   migrateTiers bù ô khi số ô kệ đổi giữa các bản save
 *  online.ts 44-47, 92-96, 103-105  app huỷ đơn không nhận kịp; toggle; nhận đơn thiếu hàng
 */

const g = () => useGame.getState();

describe('expiringSoon — hàng sắp hết hạn (GĐ699)', () => {
  it('gộp kho + kệ theo món, hạn ngắn nhất lên trước, bỏ món hạn dài', () => {
    const rows = expiringSoon(
      { nuoc: 5, gao: 9 },
      { nuoc: [{ qty: 5, life: 2 }], gao: [{ qty: 9, life: 30 }] }, // gạo hạn dài → bỏ
      [
        { productId: 'banh', count: 3, lots: [{ qty: 3, life: 1 }] },
        { productId: 'nuoc', count: 2, lots: [{ qty: 2, life: 2 }] }, // cùng món với kho → gộp
      ],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'banh', life: 1, onShelf: 3, inStorage: 0, qty: 3 });
    expect(rows[1]).toMatchObject({ id: 'nuoc', life: 2, inStorage: 5, onShelf: 2, qty: 7 });
  });

  it('chỉ tính lô trong ngưỡng cảnh báo (EXPIRY_WARN_DAYS)', () => {
    expect(EXPIRY_WARN_DAYS).toBe(2);
    const rows = expiringSoon({ mi: 4 }, { mi: [{ qty: 4, life: 3 }] }, []); // life 3 > 2 → bỏ
    expect(rows).toHaveLength(0);
  });
});

describe('analyticsAdvice — gợi ý từ sổ sức khoẻ (GĐ699)', () => {
  const h = (over: Partial<ItemHealth>): ItemHealth => ({
    id: 'mi', name: 'Mì gói', qty30: 10, profit30: 100000, revenue30: 500000, profit21: 100000,
    margin: 0.2, dailyQty: 3, daysLeft: 10, spoilShare: 0, lostShare: 0, abc: 'C', ...over,
  });

  it('mỗi tình trạng sinh đúng một lời khuyên với nhãn riêng', () => {
    const out = analyticsAdvice(
      [
        h({ id: 'nuoc', name: 'Nước suối', daysLeft: 1, dailyQty: 3 }),
        h({ id: 'bia', name: 'Bia', profit21: -50_000 }),
        h({ id: 'keo', name: 'Kẹo', spoilShare: 0.5 }),
        h({ id: 'snack', name: 'Snack', lostShare: 0.5 }),
      ],
      {}, [],
    );
    expect(out.some((a) => a.icon === '📦' && a.text.includes('Nước suối'))).toBe(true);
    expect(out.some((a) => a.icon === '🪦' && a.text.includes('Cân nhắc bỏ Bia'))).toBe(true);
    expect(out.some((a) => a.icon === '🗑️' && a.text.includes('Kẹo hỏng 50%'))).toBe(true);
    expect(out.some((a) => a.icon === '🚶' && a.text.includes('bày đầy kệ hơn'))).toBe(true);
  });

  it('chuyển món bán chạy lên kệ đông khách: cần ≥2 kệ và có kệ kém hơn nửa trung bình', () => {
    const out = analyticsAdvice([h({})], { 1: 10, 2: 1 }, [1, 2]);
    const move = out.find((a) => a.icon === '🔄');
    expect(move).toBeDefined();
    expect(move!.text).toContain('chuyển lên kệ đông khách hơn');
    // chỉ 1 kệ thì không gợi ý chuyển
    expect(analyticsAdvice([h({})], { 1: 10 }, [1]).some((a) => a.icon === '🔄')).toBe(false);
  });
});

describe('shelfCount + migrateTiers (GĐ699)', () => {
  it('shelfCount cộng theo món, bỏ ô trống', () => {
    const out = shelfCount([
      { tiers: [{ productId: 'mi', count: 4 }, { productId: null, count: 0 }] },
      { tiers: [{ productId: 'mi', count: 2 }, { productId: 'nuoc', count: 3 }] },
    ] as never);
    expect(out).toEqual({ mi: 6, nuoc: 3 });
  });

  it('migrateTiers: bù ô trống khi kệ nhiều tầng hơn bản cũ, giữ hàng tầng đầu', () => {
    const def = furnitureDef('shelf'); // bất kỳ kệ nào có tiers × slots
    const f = { id: 1, type: 'shelf', tiers: [{ productId: 'mi', count: 5, lots: [] }] } as unknown as Furniture;
    const out = migrateTiers(f);
    expect(out.tiers).toHaveLength(def.tiers * def.slots);
    expect(out.tiers[0].productId).toBe('mi');
  });
});

describe('online: huỷ/toggle/nhận đơn (GĐ699)', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), level: 10, money: 5_000_000, notify: () => {} }));

  it('đơn mới quá ACCEPT_WINDOW không ai nhận: app tự huỷ + trừ điểm, báo tin', () => {
    const order = {
      id: 1, customer: 'Chị Hồng', km: 1, items: { nuoc: 2 }, placedAt: 600,
      dueAt: 660, status: 'new' as const,
    };
    useGame.setState({
      minutes: 600 + ACCEPT_WINDOW + 1,
      online: { ...g().online, open: true, orders: [order], nextAt: 9999 },
    });
    updateOnline(useGame.setState, useGame.getState);
    const st = g();
    expect(st.online.orders).toHaveLength(0);
    expect(st.online.ratingCount).toBe(1);
    expect(st.online.ratingSum / st.online.ratingCount).toBeLessThan(5); // điểm bị trừ
  });

  it('toggleOnline: tạm ngưng rồi mở lại', () => {
    useGame.setState({ online: { ...g().online, open: true, done: 3 } });
    g().toggleOnline();
    expect(g().online.open).toBe(false);
    g().toggleOnline();
    expect(g().online.open).toBe(true);
  });

  it('acceptOnline thiếu hàng: từ chối, báo món thiếu, đơn giữ nguyên', () => {
    const order = {
      id: 2, customer: 'Anh Tú', km: 2, items: { bia: 6 }, placedAt: 600,
      dueAt: 700, status: 'new' as const,
    };
    useGame.setState({ online: { ...g().online, open: true, orders: [order] }, storage: {} });
    const out: string[] = [];
    useGame.setState({ notify: (m: string) => out.push(m) });
    expect(g().acceptOnline(2, 'own')).toBe(false);
    expect(out.join(' ')).toContain('Kho còn thiếu');
    expect(g().online.orders).toHaveLength(1);
  });
});

describe('GĐ1182 — đơn app bỏ lỡ (tally onlineMissed / onlineMissedCount)', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), level: 10, money: 5_000_000, notify: () => {} }));

  it('từ chối đơn: bỏ đơn khỏi danh sách, onlineMissedCount +1, onlineMissed = tiền sau hoa hồng', () => {
    const order = { id: 7, customer: 'Cô Lan', km: 1, items: { nuoc: 2 }, placedAt: 600, dueAt: 700, status: 'new' as const };
    useGame.setState({ minutes: 610, online: { ...g().online, open: true, orders: [order] } });
    const pre = g().stats;
    g().declineOnline(7);
    const st = g();
    expect(st.online.orders).toHaveLength(0);
    expect(st.stats.onlineMissedCount).toBe((pre.onlineMissedCount ?? 0) + 1);
    expect(st.stats.onlineMissed).toBeGreaterThan(0);
  });

  it('app tự huỷ đơn quá ACCEPT_WINDOW: tally qua updateOnline', () => {
    const order = { id: 8, customer: 'Bà Tư', km: 1, items: { mi: 4 }, placedAt: 600, dueAt: 700, status: 'new' as const };
    useGame.setState({
      minutes: 600 + ACCEPT_WINDOW + 5,
      online: { ...g().online, open: true, orders: [order], nextAt: 9999 },
    });
    updateOnline(useGame.setState, useGame.getState);
    const st = g();
    expect(st.online.orders).toHaveLength(0);
    expect(st.stats.onlineMissedCount).toBe(1);
    expect(st.stats.onlineMissed).toBeGreaterThan(0);
  });
});
