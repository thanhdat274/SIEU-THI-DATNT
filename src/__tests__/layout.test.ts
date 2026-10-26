import { beforeEach, describe, expect, it } from 'vitest';
import type { Furniture } from '../core/store';
import { newGameData, useGame } from '../core/store';
import { productById } from '../data/products';
import {
  heatColor, impulseChance, rowFactor, impulseOptions, impulseWeight, isDisplay, shelfAttention, spotVisibility,
  stockedAttention, visibilityLabel, weightedPick, type ShopGeom,
} from '../data/layout';

/** Bộ test B4 — vị trí kệ quyết định doanh số: độ được để ý, hàng chớp nhoáng, heatmap. */

// Tiệm 8×6 như bậc 0: cửa vào ở (0, 3), quầy chính chỗ trả tiền ~ (1.3, 1.1)
const geom: ShopGeom = { width: 8, depth: 6, paySpots: [{ x: 1.3, z: 1.1 }] };

describe('spotVisibility — kệ gần cửa/lối đi được để ý hơn', () => {
  it('giá trị trong biên 0.25–1', () => {
    for (let x = -4; x <= 4; x += 0.5) {
      for (let z = -3; z <= 3; z += 0.5) {
        const v = spotVisibility(x, z, geom);
        expect(v).toBeGreaterThanOrEqual(0.25);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  it('kệ ngay lối vào đắc địa hơn kệ giữa tiệm, kệ giữa hơn kệ góc sâu cuối tiệm', () => {
    const door = spotVisibility(0, 1.8, geom);
    const mid = spotVisibility(-2.5, -0.5, geom);
    const back = spotVisibility(-3.4, -2.4, geom);
    expect(door).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(back);
    // Chênh lệch đủ lớn để người chơi cảm nhận (khoảng 4 lần giữa hai đầu)
    expect(door / back).toBeGreaterThan(2.5);
  });
  it('nhãn đọc đúng ngưỡng', () => {
    expect(visibilityLabel(0.9)).toContain('Đắc địa');
    expect(visibilityLabel(0.6)).toContain('Tạm được');
    expect(visibilityLabel(0.3)).toContain('Khuất');
  });
});

describe('shelfAttention / stockedAttention — món được để ý theo kệ dễ thấy nhất', () => {
  const mk = (uid: number, x: number, z: number, stocked: string[] = ['nuoc']): Furniture =>
    ({ uid, type: 'shelf', x, z, rot: 0, tiers: stocked.map((id) => ({ productId: id, count: 2 })) });
  it('kệ bày hàng mới có attention; vách/kệ trống không', () => {
    const list: Furniture[] = [mk(1, 0, 1.8), mk(2, -3.4, -2.4, []), { uid: 3, type: 'wall', x: 0, z: 0, rot: 0, tiers: [] }];
    const att = shelfAttention(list, geom);
    expect(att.has(1)).toBe(true);
    expect(att.has(2)).toBe(true); // kệ trống vẫn là kệ, chỉ là chưa bày
    expect(att.has(3)).toBe(false);
    expect(att.get(1)!).toBeGreaterThan(att.get(2)!);
  });
  it('cùng món ở hai kệ: lấy kệ dễ thấy hơn', () => {
    const list = [mk(1, 0, 1.8, ['nuoc']), mk(2, -3.4, -2.4, ['nuoc'])];
    const att = stockedAttention(list, geom);
    expect(att.nuoc).toBeCloseTo(spotVisibility(0, 1.8, geom) * rowFactor(0, 3), 5); // ô đầu nằm tầng sát sàn
  });
  it('isDisplay: đúng các loại bày được hàng', () => {
    expect(isDisplay({ uid: 1, type: 'fridge', x: 0, z: 0, rot: 0, tiers: [] })).toBe(true);
    expect(isDisplay({ uid: 1, type: 'plant', x: 0, z: 0, rot: 0, tiers: [] })).toBe(false);
    expect(isDisplay({ uid: 1, type: 'hot_kettle', x: 0, z: 0, rot: 0, tiers: [] })).toBe(false);
  });
});

describe('hàng chớp nhoáng cạnh quầy thu ngân', () => {
  const nearCounter: Furniture = {
    uid: 7, type: 'shelf', x: 2.0, z: 0.2, rot: 0,
    tiers: [{ productId: 'x_keo', count: 3 }, { productId: 'gao', count: 2 }],
  };
  const farShelf: Furniture = {
    uid: 8, type: 'shelf', x: -3.0, z: -2.0, rot: 0, tiers: [{ productId: 'x_keo', count: 3 }],
  };
  it('chỉ lấy món nhỏ (dry/drink ≤ 15k) trong bán kính quanh chỗ trả tiền', () => {
    const opts = impulseOptions([nearCounter, farShelf], { x: 1.3, z: 1.1 });
    expect(opts).toEqual([{ uid: 7, productId: 'x_keo' }]); // gao đắt và kệ xa đều bị loại
  });
  it('kệ hỏng thì không ai với lấy được', () => {
    const broken = { ...nearCounter, broken: true };
    expect(impulseOptions([broken], { x: 1.3, z: 1.1 })).toEqual([]);
  });
  it('xếp hàng càng lâu càng dễ mua kẹp thêm, có trần', () => {
    expect(impulseChance(0)).toBeLessThan(impulseChance(3));
    expect(impulseChance(20)).toBe(impulseChance(50));
    expect(impulseChance(0)).toBeGreaterThan(0);
  });
  it('món rẻ hấp dẫn hơn món đắt trong cùng tầm giá', () => {
    expect(impulseWeight('x_keo')).toBeGreaterThan(impulseWeight('x_banh_quy'));
  });
});

describe('weightedPick — chọn theo trọng số', () => {
  it('trọng số lệch thì phân bố lệch theo', () => {
    const items = ['a', 'b'] as const;
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) counts[weightedPick(items, (x) => (x === 'a' ? 3 : 1), () => i / 1000)]++;
    expect(counts.a).toBeGreaterThan(700);
    expect(counts.a + counts.b).toBe(1000);
  });
  it('rng trả 0 chọn phần tử đầu', () => {
    expect(weightedPick(['a', 'b'], () => 1, () => 0)).toBe('a');
  });
});

describe('store — heatmap doanh số theo kệ', () => {
  beforeEach(() => {
    useGame.setState({
      ...newGameData(),
      furniture: [
        {
          uid: 5, type: 'shelf', x: 0, z: 1, rot: 0,
          tiers: [{ productId: 'nuoc', count: 2, lots: [{ qty: 2, life: 5 }] }, { productId: null, count: 0 }],
        },
      ] as Furniture[],
    });
  });

  it('khách lấy hàng thì kệ đó được cộng heat', () => {
    useGame.getState().takeFromShelf('nuoc', 5);
    expect(useGame.getState().shelfHeat[5]).toBe(1);
    useGame.getState().takeFromShelf('nuoc');
    expect(useGame.getState().shelfHeat[5]).toBe(2);
  });

  it('bán kệ thì xoá heat của kệ đó', () => {
    useGame.getState().takeFromShelf('nuoc', 5);
    useGame.getState().sellFurniture(5);
    expect(useGame.getState().shelfHeat[5]).toBeUndefined();
  });

  it('heatColor cho màu khác nhau hai đầu thang', () => {
    expect(heatColor(0)).not.toBe(heatColor(1));
    expect(heatColor(0)).toContain('hsl(200');
    expect(heatColor(1)).toContain('hsl(0');
  });

  it('x_keo là món chớp nhoáng hợp lệ (dry, rẻ)', () => {
    const p = productById('x_keo');
    expect(p.category).toBe('dry');
    expect(p.sell).toBeLessThanOrEqual(15000);
  });
});
