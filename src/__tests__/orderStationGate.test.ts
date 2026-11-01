import { describe, it, expect } from 'vitest';
import { orderFulfillable, offerForDay, partyOrderById } from '../data/orders';

describe('Đơn tiệc món nhà làm — chỉ mời khi có đúng trạm nấu', () => {
  it('orderFulfillable: món nhà làm cần đúng trạm, món thường không cần', () => {
    const comTrua = partyOrderById('com_trua_vp')!; // cơm hộp gà — cần Bếp nướng
    expect(orderFulfillable(comTrua, ['food_grill'])).toBe(true);
    expect(orderFulfillable(comTrua, ['hot_kettle'])).toBe(false);
    const gioTet = partyOrderById('gio_qua_tet_dn')!; // giỏ quà Tết — cần Bàn gói quà
    expect(orderFulfillable(gioTet, ['gift_wrap'])).toBe(true);
    expect(orderFulfillable(gioTet, ['hot_kettle'])).toBe(false);
    // Đơn toàn hàng nhập (không món nhà làm) thì không cần trạm nào
    const congTrinh = partyOrderById('cong_trinh')!;
    expect(orderFulfillable(congTrinh, [])).toBe(true);
  });

  it('offerForDay không bao giờ mời đơn cần trạm nấu khi người chơi chưa có trạm đó', () => {
    // Quét nhiều seed/ngày ở cấp cao (mọi đơn đã mở): đơn được mời phải làm được với trạm đang có
    for (let seed = 1; seed <= 40; seed++) {
      for (let day = 3; day <= 60; day++) {
        const o = offerForDay(seed, day, 99, {}, []);
        if (o) expect(orderFulfillable(partyOrderById(o.id)!, [])).toBe(true);
      }
    }
  });
});
