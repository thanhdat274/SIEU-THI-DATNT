import { describe, it, expect, beforeEach } from 'vitest';
import { newGameData, useGame, type GameState } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { newSocial } from '../data/social';
import { newOnline } from '../data/online';
import { newInspection } from '../data/licenses';
import { newAnalytics } from '../data/analytics';
import { slotCount } from '../data/furniture';

/** Một bản lưu "v1": dựng từ trạng thái mặc định rồi xoá/sửa đúng những gì các hệ mới đã thay đổi. */
function v1Save(): Parameters<typeof applySnapshot>[0] {
  const g = newGameData() as Record<string, unknown>;
  // Các hệ ra đời sau v1: bản cũ không có hẳn key, applySnapshot phải bù lại từ mặc định
  for (const key of ['social', 'online', 'licenses', 'inspection', 'analytics']) delete g[key];
  // Trang trại cũ: chuồng gà tập thể thay cho hệ chuồng theo loài
  g.garden = { ...(g.garden as Record<string, unknown>), pens: undefined, coop: { chickens: 5, fedDay: 3, eggs: 7, feedKg: 2 } };
  // Kệ kho từng đặt trong tiệm (giờ đã có nhà kho riêng, mua 200000)
  g.furniture = [...(g.furniture as object[]), { uid: 3, type: 'stockRack', x: 2.2, z: 0.4, rot: 0, tiers: [] }];
  // Chi nhánh cũ: một thu ngân đang làm "cả ngày"
  g.branch = {
    open: true, shelf: { mi: 10 },
    staff: [{ id: 1, name: 'Nhân viên cũ', role: 'cashier', skill: 2, wage: 20000, shift: 'full' }],
    simAt: 480, lastTrip: 0, revenueToday: 0, customersToday: 0, lostToday: 0, missedToday: 0,
  };
  // Bản lưu trước khi có hạt giống thời tiết
  delete g.weatherSeed;
  g.saveVersion = 1;
  return g as unknown as Parameters<typeof applySnapshot>[0];
}

describe('save migration v1 → v2', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('bản v1 được nâng lên v2 với đầy đủ các hệ mới', () => {
    applySnapshot(v1Save());
    // saveVersion do migrate() ghi vào lúc nạp, không nằm trong kiểu GameState tĩnh
    const s = useGame.getState() as GameState & { saveVersion?: number };
    expect(s.saveVersion).toBe(2);
    // Chuồng gà cũ dựng lại thành chuồng theo loài, đúng số liệu
    expect(s.garden.pens.chicken).toEqual({ count: 5, fedDay: 3, pending: 7, feedKg: 2 });
    // Các phần còn lại của trang trại bù từ mặc định
    expect(Array.isArray(s.garden.plots)).toBe(true);
    // Kệ kho cũ bị dỡ khỏi tiệm, hoàn đúng 200000 (ván mới có 300000)
    expect(s.furniture.some((f) => (f.type as string) === 'stockRack')).toBe(false);
    expect(s.money).toBe(300000 + 200000);
    // Nhân viên chi nhánh làm "cả ngày" chuyển sang ca sáng
    expect(s.branch?.staff[0]?.shift).toBe('morning');
    // Hạt giống thời tiết gieo mới, dự báo nối tiếp đủ 2 ngày
    expect(typeof s.weatherSeed).toBe('number');
    expect(s.forecast).toHaveLength(2);
    // Các hệ mới có đủ object mặc định
    expect(s.social).toEqual(newSocial());
    expect(s.online).toEqual(newOnline());
    expect(s.licenses).toEqual({});
    expect(s.inspection).toEqual(newInspection());
    expect(s.analytics).toEqual(newAnalytics());
    // Ngày ân hạn của chuỗi điểm danh
    expect(s.giftGraceDay).toBe(0);
  });

  it('bản v2 thiếu field con thì bù từ mặc định, field có sẵn giữ nguyên', () => {
    applySnapshot({ ...snapshot(), social: { followers: 123 }, biz: { loyalty: { on: true, stamps: 3 } } } as unknown as Parameters<typeof applySnapshot>[0]);
    const s = useGame.getState();
    // Giữ nguyên giá trị mới
    expect(s.social.followers).toBe(123);
    expect(s.biz.loyalty.on).toBe(true);
    expect(s.biz.loyalty.stamps).toBe(3);
    // Bù đủ field mặc định, cả lồng sâu 2 tầng
    expect(s.social.posts).toEqual([]);
    expect(s.social.buzz).toBeNull();
    expect(s.social.promoDay).toBe(0);
    expect(s.biz.loyalty.redeemed).toBe(0);
    expect(s.biz.loyalty.given).toBe(0);
    expect(s.biz.rival).toBeNull();
  });

  it('Record merge theo key, mảng thì thay trọn', () => {
    applySnapshot({
      ...snapshot(),
      storage: { mi: 3 },
      storageLots: { mi: [{ qty: 3, life: 45 }] },
      activeCombos: ['combo_free'],
    } as unknown as Parameters<typeof applySnapshot>[0]);
    const s = useGame.getState();
    // Record<string, số>: merge theo key, key không có ở bản lưu lấy từ mặc định
    expect(s.storage).toEqual({ mi: 3, nuoc: 10, banh: 5 });
    // Record<string, Lot[]>: value là mảng thì lấy nguyên mảng bản lưu
    expect(s.storageLots.mi).toEqual([{ qty: 3, life: 45 }]);
    // Mảng thường thay trọn, không trộn với mặc định
    expect(s.activeCombos).toEqual(['combo_free']);
  });

  it('snapshot → applySnapshot → snapshot bất biến ở các key chính', () => {
    useGame.setState({ ...newGameData(), day: 9, money: 432100, shopName: 'Round Trip' });
    const before = snapshot();
    applySnapshot(before);
    const after = snapshot();
    expect(after.day).toBe(9);
    expect(after.money).toBe(432100);
    expect(after.saveVersion).toBe(2);
    for (const key of ['stats', 'totals', 'biz', 'garden', 'social', 'branch'] as const) {
      expect(JSON.stringify(after[key])).toBe(JSON.stringify(before[key]));
    }
  });
it('kit ván mới: mọi kệ/tủ đủ số ô đúng định nghĩa (đề phòng kit cũ thiếu ô làm Sơ đồ kệ sập)', () => {
    const { furniture } = newGameData();
    for (const f of furniture) {
      expect(f.tiers.length, `furniture uid ${f.uid} (${f.type}) thiếu ô`).toBe(slotCount(f.type));
    }
  });
});
