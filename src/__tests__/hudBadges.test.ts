import { describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import { gardenBadgeOf, loanBadgeOf, onlineBadgeOf, rivalBadgeOf, licenseBadgeOf, challengeBadgeOf, triBadgeOf, fairBadgeOf, dossierBadgeOf, socialBadgeOf } from '../ui/hudBadges';

const base = () => useGame.getState();
const withBiz = (o: object) => { const s = base(); return { ...s, biz: { ...s.biz, ...o } } as ReturnType<typeof base>; };

describe('GĐ952 — hudBadges', () => {
  it('ván mới: không badge nào bật', () => {
    const s = base();
    for (const f of [rivalBadgeOf, onlineBadgeOf, loanBadgeOf, licenseBadgeOf, triBadgeOf, dossierBadgeOf, gardenBadgeOf, socialBadgeOf]) expect(f(s)).toBeUndefined();
    expect(typeof challengeBadgeOf(s) === 'string' || challengeBadgeOf(s) === undefined).toBe(true);
    expect(typeof fairBadgeOf(s) === 'string' || fairBadgeOf(s) === undefined).toBe(true);
  });
  it('rival & nợ: hiện số, nợ gần hạn thêm ⚠️', () => {
    expect(rivalBadgeOf(withBiz({ rival: { strength: 41.6 } }))).toBe('⚔️ 42');
    const s = withBiz({ loan: { principal: 2_500_000, dueDay: s0().day + 1 } });
    expect(loanBadgeOf(s)).toBe('🏦 2.5tr ⚠️');
    expect(loanBadgeOf({ ...withBiz({ loan: { principal: 300_000, dueDay: s0().day + 30 } }) })).toBe('🏦 300k');
  });
  it('đơn online mới được đếm', () => {
    const s = { ...base(), online: { ...base().online, orders: [{ status: 'new' }, { status: 'done' }, { status: 'new' }] } } as never;
    expect(onlineBadgeOf(s)).toBe('2 đơn mới');
  });
  it('đình chỉ giấy phép ưu tiên', () => {
    const s = base();
    expect(licenseBadgeOf({ ...s, inspection: { ...s.inspection, suspendedDay: s.day } } as never)).toBe('⛔ Đình chỉ');
  });
});
function s0() { return base(); }
