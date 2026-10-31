import { describe, expect, it } from 'vitest';
import { idleTip, isSlowHour } from '../data/idle';
import { newGameData, useGame } from '../core/store';
import type { Furniture, GameState, Tier } from '../core/gameTypes';
import { newGarden } from '../data/garden';
import { newOnline } from '../data/online';
import { newSocial } from '../data/social';

/** Engine gợi ý việc lúc vắng khách: biên giờ vắng và thứ tự ưu tiên các việc. */

/** Dựng state thật: newGameData làm nền + đè từng trường (dirt, online… nằm ngoài newGameData). */
const seed = (over: Partial<GameState>) => useGame.setState({ ...newGameData(), ...over });
const tip = () => idleTip(useGame.getState());

/** Kệ gỗ có các ô theo danh sách đưa vào (kệ thật: 3 tầng × 4 ô, nhưng idle chỉ đọc mảng tiers). */
const shelf = (uid: number, tiers: Tier[]): Furniture => ({ uid, type: 'shelf', x: 0, z: 0, rot: 0, tiers });

/** Kho "đầy" theo sức chứa kho bậc 0 (20 thùng): 150 gạo-size mì = 5 thùng ≥ 25% → khỏi nhắc nhập. */
const FULL_STORAGE = { mi: 150 };

describe('isSlowHour — biên khung giờ vắng', () => {
  it('giữa buổi 8:30–11:00 (phút 510–659, traffic 0.6) là giờ vắng', () => {
    expect(isSlowHour(509)).toBe(false); // 8:29 vẫn còn cao điểm sáng
    expect(isSlowHour(510)).toBe(true); // 8:30 vào giữa buổi
    expect(isSlowHour(659)).toBe(true);
    expect(isSlowHour(660)).toBe(false); // 11:00 sang cao điểm trưa
  });

  it('buổi chiều 13:00–17:00 (phút 780–1019, traffic 0.6) là giờ vắng', () => {
    expect(isSlowHour(779)).toBe(false); // 12:59 còn cao điểm trưa
    expect(isSlowHour(780)).toBe(true); // 13:00 vào buổi chiều
    expect(isSlowHour(1019)).toBe(true);
    expect(isSlowHour(1020)).toBe(false); // 17:00 sang cao điểm tối
  });

  it('ngoài mọi band (5h sáng, 23h đêm) và tối muộn (traffic 0.8) không phải giờ vắng', () => {
    expect(isSlowHour(5 * 60)).toBe(false); // trước band sớm nhất (6:00)
    expect(isSlowHour(23 * 60)).toBe(false); // sau band muộn nhất (22:00)
    expect(isSlowHour(20 * 60 + 30)).toBe(false); // Tối muộn traffic đúng 0.8 — không < 0.8
  });
});

describe('idleTip — ván mới bắn mức 1 ngay', () => {
  it('ván mới sạch vẫn nhắc bày hàng: kho còn mì/nước/bánh, kệ 2 còn trống hoàn toàn', () => {
    // newGameData: kệ uid 1 còn ô cuối chưa gán món, kệ uid 2 toàn ô trống (emptyTiers) —
    // kho lại đang có mì/nước/bánh. Vậy mức 1 bắn ngay từ giây đầu: ĐÚNG hành vi mong muốn,
    // vì ván mới thật sự còn kệ trống và kho có hàng để bày.
    seed({});
    const t = tip();
    expect(t?.act).toBe('planogram');
    expect(t?.icon).toBe('🗺️');
    expect(t?.text).toContain('ô kệ trống');
  });
});

describe('idleTip — từng mức ưu tiên', () => {
  it('mức 1 bày hàng: đếm đúng số ô trống (ô chưa gán món và ô hết hàng đều tính)', () => {
    seed({
      furniture: [shelf(1, [
        { productId: 'mi', count: 4 },
        { productId: 'mi', count: 0 }, // ô hết hàng
        { productId: null, count: 0 }, // ô chưa gán món
        { productId: 'nuoc', count: 3 },
      ])],
      storage: { mi: 10, nuoc: 10 },
      dirt: 0,
    });
    const t = tip();
    expect(t?.act).toBe('planogram');
    expect(t?.text).toContain('2 ô kệ trống');
  });

  it('mức 1 cần cả kho còn hàng: kho rỗng hết thì không nhắc bày', () => {
    seed({ furniture: [shelf(1, [{ productId: 'mi', count: 0 }, { productId: null, count: 0 }])], storage: {} });
    expect(tip()?.act).not.toBe('planogram');
  });

  it('mức 2 nhập hàng: kho còn 1/20 thùng (< 25% sức chứa kho bậc 0)', () => {
    seed({ furniture: [], storage: { mi: 2 } }); // không có kệ → khỏi dính mức 1
    const t = tip();
    expect(t?.act).toBe('order');
    expect(t?.icon).toBe('📦');
    expect(t?.text).toContain('1/20 thùng');
  });

  it('biên 25%: kho từ 5/20 thùng trở lên thì bỏ qua mức nhập hàng', () => {
    seed({ furniture: [], storage: { mi: 150 } }); // 150 mì / 30 món-thùng = 5 thùng
    expect(tip()?.act).not.toBe('order');
  });

  it('mức 4 lau nhà: dirt ≥ 30 thì nhắc, dưới ngưỡng thì không', () => {
    seed({ furniture: [], storage: FULL_STORAGE, dirt: 30 });
    expect(tip()?.act).toBe('mop');
    expect(tip()?.icon).toBe('🧹');
    seed({ furniture: [], storage: FULL_STORAGE, dirt: 29 });
    expect(tip()?.act).not.toBe('mop');
  });

  it('mức 5 mẻ nấu xong: job remaining ≤ 0 là nấu xong chờ lấy, còn lại thì không', () => {
    seed({
      furniture: [], storage: FULL_STORAGE, dirt: 0,
      cookJobs: [{ id: 1, recipeId: 'recipe_mi_trung', remaining: 0, total: 8 }],
    });
    const t = tip();
    expect(t?.act).toBe('cook');
    expect(t?.icon).toBe('🍲');
    seed({
      furniture: [], storage: FULL_STORAGE, dirt: 0,
      cookJobs: [{ id: 1, recipeId: 'recipe_mi_trung', remaining: 5, total: 8 }],
    });
    expect(tip()?.act).not.toBe('cook');
  });

  it('mức 6 đơn app: chỉ đếm đơn status new, đơn đang giao không tính', () => {
    seed({
      furniture: [], storage: FULL_STORAGE, dirt: 0,
      online: {
        ...newOnline(), open: true,
        orders: [
          { id: 1, customer: 'Chị Mai Q.7', items: { mi: 2 }, km: 3, placedAt: 540, dueAt: 600, status: 'new' },
          { id: 2, customer: 'Anh Tuấn Q.3', items: { nuoc: 1 }, km: 5, placedAt: 545, dueAt: 610, status: 'shipping' },
        ],
      },
    });
    const t = tip();
    expect(t?.act).toBe('online');
    expect(t?.icon).toBe('🛵');
    expect(t?.text).toContain('1 đơn app');
  });

  it('mức 7 giờ vàng: cấp 3 (mở bảng Giá bán) mà chưa đặt thì nhắc; đã đặt thì thôi', () => {
    seed({ furniture: [], storage: FULL_STORAGE, dirt: 0, level: 3, happyHour: null });
    const t = tip();
    expect(t?.act).toBe('prices');
    expect(t?.icon).toBe('⏰');
    seed({ furniture: [], storage: FULL_STORAGE, dirt: 0, level: 3, happyHour: { from: 14, off: 10 } });
    expect(tip()?.act).not.toBe('prices');
  });

  it('mức 8 xã hội: cấp 8 và hôm nay chưa đăng bài (promoDay ≠ day) thì nhắc', () => {
    seed({ furniture: [], storage: FULL_STORAGE, dirt: 0, level: 8, day: 3, happyHour: { from: 14, off: 10 }, social: { ...newSocial(), promoDay: 0 } });
    const t = tip();
    expect(t?.act).toBe('social');
    expect(t?.icon).toBe('📱');
    // Đã đăng hôm nay thì rơi xuống mặc định
    seed({ furniture: [], storage: FULL_STORAGE, dirt: 0, level: 8, day: 3, happyHour: { from: 14, off: 10 }, social: { ...newSocial(), promoDay: 3 } });
    expect(tip()?.act).toBe('morning');
  });

  it('mức 9 mặc định: tiệm gọn gàng, trại trống thì gợi ý xem sổ đầu ngày', () => {
    seed({
      furniture: [], storage: FULL_STORAGE, dirt: 0, level: 8, day: 3,
      happyHour: { from: 14, off: 10 },
      social: { ...newSocial(), promoDay: 3 },
      garden: newGarden(), // 4 luống trống, chưa nuôi con nào
    });
    const t = tip();
    expect(t?.act).toBe('morning');
    expect(t?.icon).toBe('📋');
    expect(t?.text).toBe('🍃 Vắng khách — hợp lúc xem lại sổ đầu ngày');
  });

  it('trang trại: trứng đủ vỉ, sữa, heo xuất chuồng, luống chín đều ra act garden với icon theo việc', () => {
    const base = { furniture: [], storage: FULL_STORAGE, dirt: 0, level: 8, happyHour: { from: 14, off: 10 } };
    // Gà đẻ đủ 10 quả (1 vỉ)
    seed({ ...base, garden: { ...newGarden(), pens: { chicken: { count: 2, fedDay: 2, feedKg: 1, pending: 10 } } } });
    expect(tip()?.icon).toBe('🥚');
    // Bò cho 1 lốc sữa
    seed({ ...base, garden: { ...newGarden(), pens: { cow: { count: 1, fedDay: 2, feedKg: 0, pending: 1 } } } });
    expect(tip()?.icon).toBe('🥛');
    // Heo đủ 12 ngày vỗ béo
    seed({ ...base, garden: { ...newGarden(), pens: { pig: { count: 1, fedDay: 2, feedKg: 0, pending: 0, fattened: 12 } } } });
    expect(tip()?.icon).toBe('🐖');
    // Luống rau cải chín (3 ngày lớn đủ)
    seed({ ...base, garden: { ...newGarden(), plots: [{ crop: 'rau_cai', growth: 3, wateredDay: 3 }] } });
    expect(tip()?.icon).toBe('🧺');
    // Chuồng gà đói mà kho hết cám gà (kho vẫn đầy mì — kho rỗng sẽ dính mức nhập hàng trước)
    seed({ ...base, garden: { ...newGarden(), pens: { chicken: { count: 2, fedDay: 0, feedKg: 0, pending: 0 } } } });
    expect(tip()?.icon).toBe('🌽');
    // Vườn có cây chưa tưới, trời nắng
    seed({ ...base, garden: { ...newGarden(), plots: [{ crop: 'rau_cai', growth: 1, wateredDay: 2 }] } });
    expect(tip()?.icon).toBe('💧');
  });
});

describe('idleTip — thứ tự ưu tiên khi chồng điều kiện', () => {
  const busy = {
    level: 8,
    day: 3,
    dirt: 50,
    garden: { ...newGarden(), pens: { pig: { count: 1, fedDay: 2, feedKg: 0, pending: 0, fattened: 12 } } },
  };

  it('kệ trống + sàn bẩn + trại chín → trả mức 1 (bày hàng)', () => {
    seed({
      ...busy,
      furniture: [shelf(1, [{ productId: 'mi', count: 4 }, { productId: null, count: 0 }])],
      storage: { mi: 10 },
    });
    expect(tip()?.act).toBe('planogram');
  });

  it('bỏ điều kiện 1 (không còn ô trống) → trả mức tiếp theo (nhập hàng)', () => {
    seed({ ...busy, furniture: [], storage: { mi: 2 } });
    expect(tip()?.act).toBe('order');
  });

  it('bỏ luôn điều kiện 2 (kho đầy) → mức 3 vẫn thắng mức 4 (trại chín thắng lau nhà)', () => {
    seed({ ...busy, furniture: [], storage: FULL_STORAGE });
    expect(tip()?.act).toBe('garden');
  });

  it('trại trống + sàn bẩn → mức 4 (lau nhà) thắng mọi mức sau', () => {
    seed({ ...busy, furniture: [], storage: FULL_STORAGE, garden: newGarden() });
    expect(tip()?.act).toBe('mop');
  });
});

describe('idleTip — xác định hoàn toàn', () => {
  it('cùng một state gọi hai lần ra cùng gợi ý (không dùng Math.random)', () => {
    seed({
      level: 8, day: 3, dirt: 40,
      furniture: [shelf(1, [{ productId: 'mi', count: 4 }, { productId: null, count: 0 }])],
      storage: { mi: 10 },
      garden: { ...newGarden(), plots: [{ crop: 'bap', growth: 4, wateredDay: 3 }] },
    });
    const a = idleTip(useGame.getState());
    const b = idleTip(useGame.getState());
    expect(a).toEqual(b);
    expect(a?.act).toBe('planogram');
  });
});
