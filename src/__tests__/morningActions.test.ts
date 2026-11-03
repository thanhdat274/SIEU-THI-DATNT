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
