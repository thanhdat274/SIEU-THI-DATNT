import { describe, expect, it } from 'vitest';
import { managerAutoPayoff, MANAGER_AUTO_REFS } from '../data/managerAutoPayoff';
import { managerNeedToRestock } from '../agents/staff';

// GĐ2220 — quản lý TỰ NHẬP HÀNG khi kho sắp cạn: giá trị "thuê quản lý để nó tự canh kho".
// Helper thuần đọc, an toàn sim: không đổi state/save/kinh tế.
describe('GĐ2220 — managerAutoPayoff (quản lý tự nhập hàng)', () => {
  const { MANAGER_LOW_STOCK, MANAGER_TARGET } = MANAGER_AUTO_REFS;

  it('món đang bày, đã bán, kho dưới ngưỡng (storage+pending < LOW) → ok, tự đặt bù đúng luật', () => {
    // storage=2 + pending=0 < LOW=6 → cần đặt TARGET−2
    const p = managerAutoPayoff({
      shelved: ['mi'], storage: { mi: 2 }, pending: {},
      sales: { mi: 3 }, salesToday: {}, missLog: undefined,
    });
    expect(p.ok).toBe(true);
    expect(p.orderCount).toBe(1);
    expect(p.orderNames).toEqual(['Mì gói']); // tên món thật
    // khớp đúng luật managerNeedToRestock
    expect(managerNeedToRestock({ shelved: ['mi'], storage: { mi: 2 }, pending: {}, sales: { mi: 3 }, salesToday: {} })).toEqual({ mi: MANAGER_TARGET - 2 });
  });

  it('vừa đủ ngưỡng trở lên (storage ≥ LOW) → không cần nhập, không nêu (ok:false)', () => {
    const p = managerAutoPayoff({
      shelved: ['mi'], storage: { mi: MANAGER_LOW_STOCK }, pending: {},
      sales: { mi: 3 }, salesToday: {}, missLog: undefined,
    });
    expect(p.ok).toBe(false);
    expect(p.line).toBe('');
  });

  it('hàng đang về (pending) tính vào → không đặt trùng', () => {
    const p = managerAutoPayoff({
      shelved: ['mi'], storage: { mi: 1 }, pending: { mi: 6 },
      sales: { mi: 3 }, salesToday: {}, missLog: undefined,
    });
    expect(p.ok).toBe(false); // 1+6=7 ≥ ngưỡng 6
  });

  it('món chưa bán qua lần nào → không tự nhập (khớp luật)', () => {
    const p = managerAutoPayoff({
      shelved: ['mi'], storage: { mi: 1 }, pending: {},
      sales: {}, salesToday: {}, missLog: undefined,
    });
    expect(p.ok).toBe(false);
  });

  it('lỡ hết hàng hôm nay trong nhóm canh → quy ra tiền đang lỡ, hiện dòng', () => {
    // mi đang cần đặt (storage 0 < 6, đã bán) + missLog có khách bỏ vì hết hàng mi
    const mkMiss = (cnt: number) => ({ 'stock:mi': cnt });
    const p = managerAutoPayoff({
      shelved: ['mi'], storage: {}, pending: {},
      sales: { mi: 5 }, salesToday: {}, missLog: mkMiss(50), // lãi/lượt mi = 2000 → 100.000đ lỡ > ngưỡng
    });
    expect(p.ok).toBe(true);
    expect(p.loss).toBeGreaterThan(0);
    expect(p.line).toContain('lỡ');
    expect(p.line).toMatch(/\d+\.\d+|~\d+/); // đã format tiền
  });

  it('món hết hàng NHƯNG không thuộc nhóm canh (chưa bày/chưa bán) → không tính vào loss', () => {
    // 'nuoc' hết hàng trong missLog, nhưng không bày (shelved chỉ có mi) → không cộng
    const p = managerAutoPayoff({
      shelved: ['mi'], storage: { mi: 2 }, pending: {},
      sales: { mi: 3 }, salesToday: {},
      missLog: { 'stock:nuoc': 5 },
    });
    // mi cần đặt (ok vì có món cần đặt), nhưng loss=0 vì nuoc ngoài nhóm, mi không hết hàng
    expect(p.ok).toBe(true);
    expect(p.loss).toBe(0);
    expect(p.orderCount).toBe(1);
  });

  it('line ≤ 90 ký tự, nêu rõ tự nhập / khỏi canh', () => {
    const p = managerAutoPayoff({
      shelved: ['mi', 'nuoc', 'banh'], storage: { mi: 1, nuoc: 2, banh: 3 }, pending: {},
      sales: { mi: 9, nuoc: 9, banh: 9 }, salesToday: {}, missLog: undefined,
    });
    expect(p.ok).toBe(true);
    expect(p.orderCount).toBe(3);
    expect(p.line.length).toBeLessThanOrEqual(90);
    expect(p.line).toContain('Quản lý tự nhập');
  });
});
