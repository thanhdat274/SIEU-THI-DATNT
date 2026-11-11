import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, newGameData } from '../core/store';
import { useSession } from '../net/session';

/**
 * Hệ 6 — Cộng đồng online không đồng bộ (SPEC-CHIEU-RONG §6.6): chợ liên hẻm, lẵng hoa, thư và danh thiếp
 * ở đợt đầu CHỈ cho bản lưu cá nhân. 5 action social2 phải TỰ CHẶN khi đang ở hẻm online (mẫu doPrestige)
 * để không làm lệch state chung của tiệm (két/kho/biz.social2) — co-opGuard đã xếp chúng vào LOCAL_ONLY,
 * test này khoá hành vi thật ở tầng store.
 */
describe('social2 — chỉ bản lưu cá nhân (chặn khi hẻm online, §6.6)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData() });
    useSession.setState({ coop: null });
  });

  const enterAlley = () =>
    useSession.setState({ coop: { role: 'player', alley: 'ABC', name: 'Tôi', selfId: 1, room: 0, peers: [] } });

  const grabMsgs = () => {
    const msgs: string[] = [];
    useGame.setState({ notify: (m: string) => { msgs.push(m); } });
    return msgs;
  };

  it('claimInbox ở hẻm online: no-op — không đổi tiền/kho/social2, báo "chơi đơn"', () => {
    enterAlley();
    const msgs = grabMsgs();
    const before = useGame.getState();
    useGame.setState({ money: 100 });
    useGame.getState().claimInbox([
      { id: 'x1', kind: 'lot_sold', from: 'u', payload: { money: 5000 }, createdAt: 0 },
    ]);
    const s = useGame.getState();
    expect(s.money).toBe(100);                       // không nhận tiền bán lô
    expect(s.biz.social2).toEqual(before.biz.social2); // không thay đổi bộ nhớ nhanh
    expect(msgs.some((m) => m.includes('chơi đơn'))).toBe(true);
  });

  it('postMarketLot ở hẻm online: return sớm trước khi chạm mạng', async () => {
    enterAlley();
    const msgs = grabMsgs();
    const before = useGame.getState();
    await useGame.getState().postMarketLot({ productId: 'x_mi', qty: 6, unit: 0, suggestPrice: 100 });
    const s = useGame.getState();
    expect(s.money).toBe(before.money);
    expect(s.biz.social2?.lotsWeek.n ?? 0).toBe(0);  // không đếm lô đã đăng
    expect(msgs.some((m) => m.includes('chơi đơn'))).toBe(true);
  });

  it('buyMarketLot ở hẻm online: no-op, không trừ tiền', async () => {
    enterAlley();
    const msgs = grabMsgs();
    useGame.setState({ money: 1_000_000 });
    const before = useGame.getState().money;
    await useGame.getState().buyMarketLot({ id: 'lot1', seller: 'u', productId: 'x_mi', qty: 10, unit: 0, price: 5000 });
    expect(useGame.getState().money).toBe(before);
    expect(msgs.some((m) => m.includes('chơi đơn'))).toBe(true);
  });

  it('toggleCardPublic ở hẻm online: no-op, không bật danh thiếp', async () => {
    enterAlley();
    const msgs = grabMsgs();
    await useGame.getState().toggleCardPublic(true);
    const s = useGame.getState();
    expect(s.biz.social2?.cardPublic ?? false).toBe(false);
    expect(msgs.some((m) => m.includes('chơi đơn'))).toBe(true);
  });

  it('pushCard ở hẻm online: no-op, không đẩy danh thiếp lên server', async () => {
    enterAlley();
    const msgs = grabMsgs();
    useGame.setState({ biz: { ...useGame.getState().biz, social2: { ...useGame.getState().biz.social2!, cardPublic: true } } });
    const before = useGame.getState().biz.social2;
    await useGame.getState().pushCard();
    expect(useGame.getState().biz.social2).toEqual(before);
    expect(msgs.some((m) => m.includes('chơi đơn'))).toBe(true);
  });
});
