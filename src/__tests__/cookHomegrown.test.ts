import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

/**
 * Bộ test GĐ1037 — `core/slices/orders.startCook` nhánh TRỪ HẾT HÀNG NHÀ TRỒNG khi nấu
 * (dòng 140 TRƯỚC ĐÂY 0%: `else delete homegrown[id]` — dùng ĐÚNG hết nguyên liệu nhà trồng
 * thì XOÁ key, chống exploit "nấu hết hàng nhà trồng, nhập lại rồi bán vẫn ăn premium +20%").
 *
 * Hợp đồng:
 * - Nấu tiêu nguyên liệu cả kho chung lẫn nhãn homegrown.
 * - Còn dư (homegrown > số nấu) → giữ phần dư (dòng 139).
 * - Dùng ĐÚNG hết (homegrown == số nấu) → XOÁ key (dòng 140).
 * - Không có trong homegrown → không đụng tới.
 */

const GRILL = { uid: 1, type: 'food_grill', x: 0, z: 0, rot: 0 } as const;

const prep = (homegrown: Record<string, number>, storage: Record<string, number>) =>
  useGame.setState({
    ...newGameData(),
    level: 22, // mở recipe_xuc_xich (xúc xích nướng)
    furniture: [GRILL as never],
    storage,
    garden: { ...newGameData().garden, homegrown },
  });

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('startCook — nấu tiêu hàng nhà trồng/nhà nuôi', () => {
  it('dùng ĐÚNG hết hàng nhà trồng (homegrown = qty 2) → XOÁ key (dòng 140)', () => {
    prep({ xucxich: 2 }, { xucxich: 2 });
    expect(useGame.getState().startCook('recipe_xuc_xich')).toBe(true);
    const a = useGame.getState();
    expect(a.garden.homegrown.xucxich).toBeUndefined();
    expect('xucxich' in a.garden.homegrown).toBe(false);
    expect(a.storage.xucxich).toBe(0); // kho chung cũng trừ
    expect(a.cookJobs.length).toBe(1);
  });

  it('còn DƯ hàng nhà trồng → giữ phần dư (dòng 139)', () => {
    prep({ xucxich: 5 }, { xucxich: 5 });
    useGame.getState().startCook('recipe_xuc_xich');
    const a = useGame.getState();
    expect(a.garden.homegrown.xucxich).toBe(3); // 5 − 2
    expect('xucxich' in a.garden.homegrown).toBe(true);
  });

  it('không có hàng nhà trồng → không đụng tới, chỉ trừ kho chung', () => {
    prep({}, { xucxich: 2 });
    useGame.getState().startCook('recipe_xuc_xich');
    const a = useGame.getState();
    expect(a.garden.homegrown.xucxich).toBeUndefined();
    expect(a.storage.xucxich).toBe(0);
    expect(a.cookJobs.length).toBe(1);
  });

  it('nhiều nguyên liệu, món nhà trồng hết → xoá đúng, món khác nguyên', () => {
    // recipe_com_hop_ga cần gao 1 + thit 5 + rau 3; chỉ gao có nhãn homegrown
    useGame.setState({
      ...newGameData(),
      level: 31, // com_hop_ga mở 31 (T3-L4 răng cưa 30→31)
      furniture: [GRILL as never],
      storage: { gao: 1, thit: 5, rau: 3 },
      garden: { ...newGameData().garden, homegrown: { gao: 1 } },
    });
    expect(useGame.getState().startCook('recipe_com_hop_ga')).toBe(true);
    const a = useGame.getState();
    expect(a.garden.homegrown.gao).toBeUndefined(); // dùng hết → xoá
  });
});
