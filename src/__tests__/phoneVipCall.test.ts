import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { updatePhones } from '../core/slices/orders';
import { PHONE_SLOTS } from '../data/phoneOrders';
import { REGULARS, emptyProgress } from '../data/regulars';

/** GĐ1062 — core/slices/orders.updatePhones dòng 55 (nhánh `call.vip` của `s.notify`):
 *  cuộc gọi VIP (khách quen đủ thân ≥ VIP_REP 4.5 giới thiệu "mối lớn" — gói 8–14 món một loại, giá hời
 *  ×VIP_MUL 1.5). Thông báo riêng: `👑 <caller> (người nhà của <khách quen>) đặt GÓI LỚN: …`.
 *  Rót qua updatePhones để chạy đúng dòng cấp notify. Tìm thấy weatherSeed=3/day=26/slot=2 (11:30)
 *  qua brute-force phoneCallFor trong điều kiện đúng như updatePhones truyền (level 20 < COOK_UNLOCK 21
 *  nên không bị nhánh đơn nấu chặn trước). */

const msg = () => {
  const out: string[] = [];
  useGame.setState({ notify: (m: string) => void out.push(m) });
  return out;
};

const repLog = Array.from({ length: 10 }, () => ({ price: 1, stock: 1, clean: 1, speed: 1, quality: 1 }));

beforeEach(() => {
  useGame.setState({
    ...newGameData(),
    day: 26, level: 20, weatherSeed: 3, weather: 'sunny',
    minutes: PHONE_SLOTS[2] + 1, // 11:31 → kịp rơi vào khung 11:30 (slot 2)
    phoneSlot: 2, shopOpen: true,
    regulars: Object.fromEntries(REGULARS.filter((r) => r.unlock <= 20).map((r) => [r.id, { ...emptyProgress(), friendship: 5 }])),
    repLog,
    storage: { mi: 10, nuoc: 10, banh: 5 },
    furniture: [], // không có quầy thịt — đúng điều kiện brute-force
    staff: [{ id: 99, name: 'Giao', role: 'courier', skill: 3, wage: 100000, shift: 'morning' }],
  });
});

describe('GĐ1062 — updatePhones thông báo đơn VIP (GÓI LỚN)', () => {
  it('khách quen đủ thân (rep ≥ 4.5) + roll < VIP_CHANCE → call.vip → notify `👑 … GÓI LỚN`', () => {
    const out = msg();
    updatePhones(useGame.setState, useGame.getState);
    expect(out.some((m) => m.includes('👑') && m.includes('GÓI LỚN'))).toBe(true);
    // đơn VIP vào danh sách đang chờ trả lời (vip flag)
    expect(useGame.getState().phoneOrders.some((o) => o.vip)).toBe(true);
  });

  it('danh tiếng chưa đủ (rep < VIP_REP 4.5) → không bao giờ có đơn VIP', () => {
    useGame.setState({ repLog: Array.from({ length: 10 }, () => ({ price: 0, stock: 0, clean: 0, speed: 0, quality: 0 })) });
    const out = msg();
    updatePhones(useGame.setState, useGame.getState);
    expect(out.some((m) => m.includes('GÓI LỚN'))).toBe(false);
    expect(useGame.getState().phoneOrders.some((o) => o.vip)).toBe(false);
  });
});
