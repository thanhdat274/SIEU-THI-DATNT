import { describe, expect, it } from 'vitest';
import { newGameData } from '../core/store';
import { buildMorningActions, type MorningActionsCtx } from '../ui/panels/morningActions';

/** GĐ945 — danh sách "Việc hôm nay" dựng bằng hàm thuần, không cần render component. */
const base = (over: Partial<MorningActionsCtx> = {}): MorningActionsCtx => {
  const g = newGameData();
  return {
    day: 2, level: 1, weather: g.weather, weatherSeed: g.weatherSeed, storage: {}, staff: [], regulars: {}, expected: [], debts: {},
    biz: g.biz, branch: null, branchChores: [], quanHealth: null, haveStock: () => true, dueContracts: [], chophien: null, lastSummary: null,
    ...over,
  };
};
describe('GĐ945 — buildMorningActions', () => {
  it('ngày thường, save mới: không có việc bức thiết, không có nhắc cuối tuần', () => {
    const a = buildMorningActions(base());
    expect(a.some((x) => x.danger || x.text.includes('Cuối tuần'))).toBe(false);
  });
  it('cuối tuần: có nhắc châm kệ ăn vặt', () => {
    const a = buildMorningActions(base({ day: 6 }));
    expect(a.some((x) => x.text.includes('Cuối tuần'))).toBe(true);
  });
  it('nợ ngân hàng sắp hạn: việc bức thiết xếp đầu', () => {
    const g = newGameData();
    const a = buildMorningActions(base({ day: 6, biz: { ...g.biz, loan: { principal: 100000, dueDay: 7 } } as never }));
    expect(a[0].danger).toBe(true); expect(a[0].text).toContain('Nợ ngân hàng');
  });
  it('hợp đồng tới hạn hôm nay: danger, panel contracts', () => {
    const a = buildMorningActions(base({ dueContracts: [{ cs: { dueDay: 2 }, def: { title: 'HĐ A' } as never }] }));
    expect(a[0]).toMatchObject({ danger: true, panel: 'contracts' }); expect(a[0].text).toContain('HĐ A');
  });
});

describe('GĐ1102 (QA nối) — việc sáng "món menu quán ngừng bán" qua buildMorningActions', () => {
  const withQuan = (menu: string[] | undefined, open: boolean, storage: Record<string, number> = {}) => {
    const g = newGameData();
    return base({
      level: 45,
      storage,
      biz: { ...g.biz, quanNuoc: { open, staff: 1, price: 'vua' as const, menu } } as never,
    });
  };

  it('quán mở + menu Trà vải + hết vải → có việc sáng danger nêu đúng món', () => {
    const a = buildMorningActions(withQuan(['tra_vai'], true, { tra: 5, x_duong: 9, x_nuoc_da: 4 }));
    const act = a.find((x) => x.text.includes('Trà vải ngừng bán'));
    expect(act).toBeDefined();
    expect(act!.danger).toBe(true);
    expect(act!.panel).toBe('quannuoc');
  });

  it('quán đóng → không có việc này; quán mở nhưng đủ nguyên liệu → không có', () => {
    expect(buildMorningActions(withQuan(['tra_vai'], false, {})).some((x) => x.text.includes('ngừng bán'))).toBe(false);
    const a = buildMorningActions(withQuan(['tra_vai'], true, { tra: 5, x_vai: 3, x_duong: 9, x_nuoc_da: 4 }));
    expect(a.some((x) => x.text.includes('ngừng bán'))).toBe(false);
  });

  it('menu không truyền (save cũ) → không lỗi, không việc', () => {
    const a = buildMorningActions(withQuan(undefined, true, {}));
    expect(a.filter((x) => x.text.includes('ngừng bán')).length).toBe(0);
  });
});

describe('GĐ1572 — nhắc máy đánh giày ngày mưa', () => {
  const shoe = [{ uid: 1, type: 'shoe_shine' }] as never;
  it('mưa + có máy + cấp 42 → có nhắc', () => {
    expect(buildMorningActions(base({ level: 42, weather: 'rain', furniture: shoe })).some((x) => x.text.includes('đánh giày'))).toBe(true);
  });
  it('nắng, thiếu máy hoặc dưới cấp → không', () => {
    expect(buildMorningActions(base({ level: 42, weather: 'sunny', furniture: shoe })).some((x) => x.text.includes('đánh giày'))).toBe(false);
    expect(buildMorningActions(base({ level: 42, weather: 'rain', furniture: [] })).some((x) => x.text.includes('đánh giày'))).toBe(false);
    expect(buildMorningActions(base({ level: 41, weather: 'rain', furniture: shoe })).some((x) => x.text.includes('đánh giày'))).toBe(false);
  });
});
