import { describe, expect, it } from 'vitest';
import { pickForShelf, allowedForType } from '../data/planogram';
import { furnitureDef } from '../data/furniture';

const shelf = (tiers: (string | null)[]) => ({ tiers: tiers.map((productId) => ({ productId })), type: 'shelf' as const });

const P = {
  nuoc: { id: 'nuoc', category: 'drink' },
  mi: { id: 'mi', category: 'dry' },
  banh: { id: 'banh', category: 'dry' },
  kem: { id: 'kem', category: 'cold' },
};

describe('pickForShelf — tự chọn món cho ô trống (GĐ1236)', () => {
  it('món kho còn nhiều nhất, trong ngành kệ', () => {
    const storage = { nuoc: 2, mi: 9, banh: 3 };
    const allowed = allowedForType('shelf', [P.nuoc, P.mi, P.banh]);
    const f = shelf([null]); // ô trống
    expect(pickForShelf(f, storage, allowed)).toBe('mi'); // mi còn 9 > banh 3 > nuoc 2 (nuoc là drink, kệ dry nên không được chọn)
  });

  it('ưu tiên món CHƯA bày ở kệ này (tránh lặp 1 món đầy các tầng)', () => {
    const storage = { mi: 9, banh: 3 };
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    // kệ đang bày đầy mì → ô trống nên chọn bánh (dù kho mì nhiều hơn)
    const f = shelf(['mi', 'mi', null]);
    expect(pickForShelf(f, storage, allowed)).toBe('banh');
  });

  it('món không còn trong kho → không chọn', () => {
    const storage = { mi: 0, banh: 5 };
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    expect(pickForShelf(shelf([null, null]), storage, allowed)).toBe('banh');
    expect(pickForShelf(shelf([null, null]), { banh: 0 }, allowed)).toBeNull();
  });

  it('không có món hợp lệ trong kho → null (ô để trống)', () => {
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    expect(pickForShelf(shelf([null]), {}, allowed)).toBeNull();
  });

  it('thuần: cùng đầu vào ra cùng kết quả (không đổi theo state)', () => {
    const storage = { mi: 4, banh: 2 };
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    const f = shelf(['banh', null, null]);
    expect(pickForShelf(f, storage, allowed)).toBe(pickForShelf(f, storage, allowed));
  });

  it('allowedForType lọc đúng ngành của kệ (không cho món lạnh/cold lên kệ dry)', () => {
    const allowed = allowedForType('shelf', [P.mi, P.banh, P.kem, P.nuoc]);
    const ids = allowed.map((p) => p.id);
    expect(ids).toContain('mi');
    expect(ids).toContain('banh');
    expect(ids).not.toContain('kem'); // cold → phải tủ mát, không phải kệ
    // furnitureDef thật của 'shelf' có categories hợp lệ
    expect(furnitureDef('shelf').tiers).toBeGreaterThan(0);
  });
});
