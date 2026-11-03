import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { updatePhones } from '../core/slices/orders';
import { PHONE_SLOTS } from '../data/phoneOrders';

/** GĐ1058 — core/slices/orders.updatePhones nhánh GỢI Ý THUÊ COURIER TRỜI MƯA (dòng 55–58):
 *  trong vòng khung giờ điện thoại, tiệm mở + CHƯA có nhân viên giao hàng + trời mưa/bão mà hôm nay
 *  chưa nhắc thì báo một lần "Trời mưa, nhiều người muốn gọi đặt hàng — thuê nhân viên giao hàng…"
 *  (nếu không ai giao thì lỡ hết đơn app/điện thoại). Mưa không có courier là hiểm họa doanh thu online. */

const msg = () => {
  const out: string[] = [];
  useGame.setState({ notify: (m: string) => void out.push(m) });
  return out;
};

beforeEach(() => {
  useGame.setState({
    ...newGameData(),
    level: 20, minutes: 600, phoneSlot: 0, phoneHintDay: 0, shopOpen: true, weather: 'rain', staff: [],
  });
});

describe('GĐ1058 — gợi ý thuê courier khi trời mưa', () => {
  it('trời mưa + chưa có courier + chưa nhắc hôm nay → báo gợi ý + đánh dấu đã nhắc (nhánh else-if)', () => {
    const out = msg();
    updatePhones(useGame.setState, useGame.getState);
    expect(out.some((m) => m.includes('Trời mưa') && m.includes('thuê nhân viên giao hàng'))).toBe(true);
    expect(useGame.getState().phoneHintDay).toBe(useGame.getState().day);
  });

  it('KHÔNG mưa (nắng) → không nhắc', () => {
    useGame.setState({ weather: 'sunny' });
    const out = msg();
    updatePhones(useGame.setState, useGame.getState);
    expect(out.some((m) => m.includes('Trời mưa'))).toBe(false);
  });

  it('đã nhắc hôm nay (phoneHintDay === day) → không nhắc lần hai', () => {
    useGame.setState({ phoneHintDay: useGame.getState().day });
    const out = msg();
    updatePhones(useGame.setState, useGame.getState);
    expect(out.some((m) => m.includes('Trời mưa'))).toBe(false);
  });

  it('ĐÃ CÓ courier → không nhắc (vì hiểm họa không còn)', () => {
    useGame.setState({ staff: [{ id: 1, role: 'courier' } as never] });
    const out = msg();
    updatePhones(useGame.setState, useGame.getState);
    expect(out.some((m) => m.includes('Trời mưa'))).toBe(false);
  });
});
