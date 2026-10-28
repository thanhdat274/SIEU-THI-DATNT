import { describe, expect, it } from 'vitest';
import { rivalUndercutAlerts, type Rival } from '../data/biz';
import { productById } from '../data/products';

const priceOf = (id: string) => (id === 'mi' ? 5000 : id === 'banh' ? 8000 : 6000);
const carriedAll = new Set(['mi', 'banh', 'nuoc']);

function rival(over: Partial<Rival>): Rival {
  return { name: 'Quán Thắng', strength: 60, openedDay: 1, personality: 'cutter', ...over };
}

describe('rivalUndercutAlerts (GĐ42) — cảnh báo đối thủ hạ giá', () => {
  it('chưa có rival → null', () => {
    expect(rivalUndercutAlerts(null, priceOf, 1, carriedAll)).toBeNull();
  });

  it('rival chưa bày bảng giá → null', () => {
    expect(rivalUndercutAlerts(rival({}), priceOf, 1, carriedAll)).toBeNull();
  });

  it('rival bán rẻ ≥5% một món mình có → báo đúng tên món + tên rival', () => {
    const a = rivalUndercutAlerts(rival({ prices: { mi: 4500 } }), priceOf, 1, carriedAll);
    expect(a).toEqual({ rival: 'Quán Thắng', items: ['Mì gói'] });
  });

  it('rival bán rẻ nhưng món mình KHÔNG giữ → lọc bỏ, báo null', () => {
    // rival hạ giá 'nuoc', nhưng mình không bày nước
    const a = rivalUndercutAlerts(rival({ prices: { nuoc: 5000 } }), priceOf, 1, new Set(['mi', 'banh']));
    expect(a).toBeNull();
  });

  it('giá rival chưa đủ rẻ (không dưới 95% giá mình) → không báo', () => {
    // mi: rival 4800, mình 5000*0.95=4750 → 4800 không dưới → không dưới giá
    const a = rivalUndercutAlerts(rival({ prices: { mi: 4800 } }), priceOf, 1, carriedAll);
    expect(a).toBeNull();
  });

  it('nhiều món bị hạ → liệt kê đủ (mặc định tối đa 3)', () => {
    const a = rivalUndercutAlerts(rival({ prices: { mi: 4500, banh: 7000, nuoc: 5000 } }), priceOf, 1, carriedAll);
    expect(a).toEqual({ rival: 'Quán Thắng', items: ['Mì gói', 'Bánh kẹo', 'Nước suối'] });
  });

  it('tối đa n món (n=2)', () => {
    const a = rivalUndercutAlerts(rival({ prices: { mi: 4500, banh: 7000, nuoc: 5000 } }), priceOf, 1, carriedAll, 2);
    expect(a!.items.length).toBe(2);
  });

  it('đang giảm giá (saleUntil) khiến món cận biên bị hạ 5% thêm → cũng báo', () => {
    // không sale: rival 4800 ở mi, 4800 >= 5000*0.95=4750 → không coi là hạ giá;
    // có sale 0.95: 4800*0.95=4560 < 4750 → bị coi là hạ giá
    const noSale = rivalUndercutAlerts(rival({ prices: { mi: 4800 } }), priceOf, 1, carriedAll);
    expect(noSale).toBeNull();
    const sale = rivalUndercutAlerts(rival({ prices: { mi: 4800 }, saleUntil: 5 }), priceOf, 3, carriedAll);
    expect(sale).not.toBeNull();
    expect(sale!.items).toEqual(['Mì gói']);
  });

  it('tên món tra đúng productById (id thật)', () => {
    const id = 'mi';
    expect(productById(id).name).toBe('Mì gói');
    // đảm bảo helper dùng đúng cơ chế bên dưới
    const a = rivalUndercutAlerts(rival({ prices: { mi: 4500 } }), priceOf, 1, new Set(['mi']));
    expect(a!.items[0]).toBe(productById('mi').name);
  });

  it('helper thuần, không trạng thái: chạy 2 lần cùng đầu vào giống hệt', () => {
    const r = rival({ prices: { mi: 4500, banh: 7000 } });
    expect(rivalUndercutAlerts(r, priceOf, 1, carriedAll)).toEqual(rivalUndercutAlerts(r, priceOf, 1, carriedAll));
  });
});
