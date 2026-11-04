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

  it('GĐ1237: ưu tiên món HOT chưa bày ở kệ này dù kho ít hơn (châm đúng đồ khách đang cần)', () => {
    const storage = { mi: 9, banh: 3 };
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    const f = shelf([null]); // ô trống, chưa bày gì
    const hot = new Set(['banh']);
    // không hot → mi (kho 9); có hot banh → banh (hot + chưa bày, điểm 3 > 2)
    expect(pickForShelf(f, storage, allowed)).toBe('mi');
    expect(pickForShelf(f, storage, allowed, hot)).toBe('banh');
  });

  it('GĐ1237: đa dạng thắng "châm thêm món hot đang bày" (hot đã bày chỉ điểm 1)', () => {
    const storage = { mi: 9, banh: 3 };
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    const f = shelf(['mi', null]); // kệ đang bày mì; hot chính là mì
    const hot = new Set(['mi']);
    // hot mi ĐÃ bày → chỉ 1; banh chưa bày → 2 → chọn banh (đa dạng), dù mi kho nhiều hơn
    expect(pickForShelf(f, storage, allowed, hot)).toBe('banh');
  });

  it('GĐ1237: hot đang bày được ưu tiên hơn món nguội đang bày (châm thêm món chạy)', () => {
    const storage = { mi: 9, banh: 3 };
    const allowed = allowedForType('shelf', [P.mi, P.banh]);
    const f = shelf(['banh', null]); // kệ đang bày bánh (nguội); hot = mi, chưa bày
    const hot = new Set(['mi']);
    expect(pickForShelf(f, storage, allowed, hot)).toBe('mi'); // mi hot + chưa bày (3) > bánh (2)
  });
});
