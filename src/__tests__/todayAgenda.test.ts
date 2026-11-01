import { describe, expect, it } from 'vitest';
import {
  contractAgenda, eveningPrepAgenda, goldenHourAgenda, partyOrderAgenda,
  phoneSlotAgenda, regularVisitAgenda, runningCookAgenda, todayAgenda,
} from '../data/todayAgenda';
import { REGULARS, regularById, visitsToday } from '../data/regulars';
import { PHONE_SLOTS } from '../data/phoneOrders';
import { RECIPE_MAP } from '../data/recipes';
import { goldenHourBands } from '../data/rhythm';
import { supplyContractById } from '../data/contracts';

/** GĐ162 — Dải "Kế hoạch hôm nay": ghép 6 nguồn hẹn giờ CÓ SẴN thành 1 danh sách
 *  theo thứ tự thời gian. Helper thuần đọc, nhận từng tham số cụ thể; mọi nguồn
 *  đều deterministic (visitsToday theo weatherSeed, PHONE_SLOTS cố định) nên
 *  không cần setSimSeed — seed ván dùng thẳng, quy ước GĐ27/28. */

// Seed/day kiểm chứng bằng tay: visitsToday(seed=1, day=10) trả ĐÚNG 7 người này
// (level 40 mở hết khách + món ưa thích; rep bỏ qua để không phụ thuộc danh tiếng).
const SEED = 1;
const DAY = 10;
const LEVEL = 40;
const EXPECTED_VISITORS = [
  'bac_tam', 'anh_tuan', 'chuong_tho_dien', 'chu_cuong_xuong', 'chu_sau_ca', 'bac_ba_xe_om', 'co_xuan_cho',
];

const base = {
  day: DAY,
  seed: SEED,
  level: LEVEL,
  regulars: {} as Record<string, never>,
};

describe('regularVisitAgenda — khách quen ghé hôm nay', () => {
  it('đúng danh sách visitsToday (deterministic theo seed), chip ở đầu khung ghé', () => {
    const items = regularVisitAgenda(base);
    expect(items.map((i) => i.key)).toEqual(EXPECTED_VISITORS.map((id) => `visit-${id}`));
    for (const it of items) {
      const def = regularById(it.key.replace('visit-', ''))!;
      expect(it.atMinutes).toBe(def.visitFrom);
      expect(it.untilMinutes).toBe(def.visitUntil);
      expect(it.label).toBe(`${def.visitFrom / 60}h ${def.name} ghé`);
      expect(it.panel).toBe('regulars');
    }
  });

  it('nguồn khớp thật với visitsToday gọi trực tiếp (không lệch pha)', () => {
    const coming = REGULARS.filter((d) => visitsToday(d, DAY, SEED, LEVEL, undefined));
    expect(coming.map((d) => d.id)).toEqual(EXPECTED_VISITORS);
  });

  it('lời hẹn giữ món đúng ngày → chip thành "ghé lấy {món}"', () => {
    const id = EXPECTED_VISITORS[0]; // bac_tam — khung 8h–11h
    const def = regularById(id)!;
    const items = regularVisitAgenda({ ...base, reservations: { [id]: { productId: 'gao', qty: 2, day: DAY } } });
    const chip = items.find((i) => i.key === `visit-${id}`)!;
    expect(chip.icon).toBe('🤝');
    expect(chip.label).toBe(`${def.visitFrom / 60}h ${def.name} lấy Gạo`); // tên chip bỏ ghi chú lượng "(túi 5kg)"
  });

  it('lời hẹn của người HÔM NAY không ghé → không tạo chip (hẹn chỉ chốt khi khách ghé)', () => {
    // anh_minh_nhau (khung 15–19h) KHÔNG nằm trong danh sách ghé của seed=1/day=10
    const items = regularVisitAgenda({ ...base, reservations: { anh_minh_nhau: { productId: 'bia', qty: 5, day: DAY } } });
    expect(items.find((i) => i.key === 'visit-anh_minh_nhau')).toBeUndefined();
  });

  it('lời hẹn giữ món hẹn ngày mai → vẫn là chip "ghé" thường hôm nay', () => {
    const id = EXPECTED_VISITORS[0];
    const items = regularVisitAgenda({ ...base, reservations: { [id]: { productId: 'gao', qty: 1, day: DAY + 1 } } });
    expect(items.find((i) => i.key === `visit-${id}`)!.icon).toBe('👋');
  });
});

describe('goldenHourAgenda — giờ vàng còn lại trong ngày', () => {
  it('đầu ngày: đủ 3 khung vàng (sáng 6h · trưa 11h · tối 17h), tăng dần', () => {
    const items = goldenHourAgenda(5 * 60);
    expect(items.map((i) => i.atMinutes)).toEqual([6 * 60, 11 * 60, 17 * 60]);
    expect(items.map((i) => i.label)).toEqual(['6h Giờ vàng', '11h Giờ vàng', '17h Giờ vàng']);
    expect(items.every((i) => i.panel === 'morning' && i.icon === '⭐')).toBe(true);
  });

  it('đang trong khung trưa: khung trưa vẫn hiện (còn thời gian), khung sáng đã qua bị lọc', () => {
    const items = goldenHourAgenda(12 * 60);
    expect(items.map((i) => i.key)).toEqual(['golden-trua', 'golden-toi']);
  });

  it('quá 20h (hết khung tối, khuya ×0.8 không phải giờ vàng) → rỗng', () => {
    expect(goldenHourAgenda(21 * 60)).toEqual([]);
  });

  it('khớp nguồn: đúng các band ×≥1.35 của TIME_BANDS', () => {
    expect(goldenHourBands().map((b) => b.id)).toEqual(['sang', 'trua', 'toi']);
  });
});

describe('runningCookAgenda — mẻ nấu đang chạy', () => {
  const MI = 'recipe_mi_trung';

  it('mẻ chạy: chip "HHh {món} xong" = bây giờ + phút còn lại', () => {
    const items = runningCookAgenda(14 * 60, [{ id: 1, recipeId: MI, remaining: 8, total: 8 }]);
    expect(items).toEqual([{
      key: 'cookjob-1',
      atMinutes: 14 * 60 + 8,
      untilMinutes: 14 * 60 + 8 + 45,
      icon: '🍳',
      label: '14h08 Mì trứng nấu sẵn xong',
      panel: 'cook',
    }]);
  });

  it('nhiều mẻ cùng chạy: mỗi mẻ một chip, sắp theo lúc xong', () => {
    const items = runningCookAgenda(13 * 60, [
      { id: 1, recipeId: MI, remaining: 30, total: 30 },   // xong 13h30
      { id: 2, recipeId: 'recipe_com_suon', remaining: 10, total: 30 }, // xong 13h10
    ]);
    expect(items.map((i) => i.label)).toEqual(['13h10 Cơm sườn nướng xong', '13h30 Mì trứng nấu sẵn xong']);
  });

  it('công thức lạ (save lệch schema) → bỏ qua, không sập', () => {
    expect(runningCookAgenda(600, [{ id: 9, recipeId: 'mon_la', remaining: 5, total: 5 }])).toEqual([]);
  });
});

describe('eveningPrepAgenda — gợi ý bắt đầu nấu kịp giờ vàng tối (GĐ161)', () => {
  const MI = RECIPE_MAP['recipe_mi_trung'];

  it('có trạm + đủ nguyên liệu, chưa có mẻ nào → chip "trước 17h Nấu {món}"', () => {
    const items = eveningPrepAgenda({
      minutes: 14 * 60, level: 21, stations: ['hot_kettle'],
      storage: { mi: 10, trung: 1 }, cookSpeedMul: 1, bartenderBoost: 1, cookJobsCount: 0,
    });
    // Chỉ mì trứng đủ nguyên liệu → mốc bắt đầu muộn nhất = 17h − 8 phút
    expect(items).toEqual([{
      key: 'cook-prep',
      atMinutes: 17 * 60 - MI.durationMin,
      untilMinutes: 17 * 60,
      icon: '🍳',
      label: 'trước 17h Nấu Mì trứng nấu sẵn',
      panel: 'cook',
    }]);
  });

  it('đang có mẻ chạy → không gợi ý nữa (chỉ còn chip "xong")', () => {
    expect(eveningPrepAgenda({
      minutes: 14 * 60, level: 21, stations: ['hot_kettle'],
      storage: { mi: 10, trung: 1 }, cookSpeedMul: 1, bartenderBoost: 1, cookJobsCount: 1,
    })).toEqual([]);
  });

  it('quá 17h → hết nghĩa "kịp giờ vàng tối"', () => {
    expect(eveningPrepAgenda({
      minutes: 17 * 60, level: 21, stations: ['hot_kettle'],
      storage: { mi: 10, trung: 1 }, cookSpeedMul: 1, bartenderBoost: 1, cookJobsCount: 0,
    })).toEqual([]);
  });

  it('thiếu nguyên liệu / chưa có trạm → không chip (đừng hứa điều không làm được)', () => {
    expect(eveningPrepAgenda({
      minutes: 14 * 60, level: 21, stations: ['hot_kettle'],
      storage: {}, cookSpeedMul: 1, bartenderBoost: 1, cookJobsCount: 0,
    })).toEqual([]);
    expect(eveningPrepAgenda({
      minutes: 14 * 60, level: 21, stations: ['blender'],
      storage: { mi: 10, trung: 1 }, cookSpeedMul: 1, bartenderBoost: 1, cookJobsCount: 0,
    })).toEqual([]);
  });

  it('món khóa trên cấp hiện tại → không gợi ý', () => {
    expect(eveningPrepAgenda({
      minutes: 14 * 60, level: 5, stations: ['hot_kettle'],
      storage: { mi: 10, trung: 1 }, cookSpeedMul: 1, bartenderBoost: 1, cookJobsCount: 0,
    })).toEqual([]);
  });
});

describe('phoneSlotAgenda — khe điện thoại còn lại hôm nay', () => {
  it('chưa mở điện thoại (cấp < 3) hoặc không có nhân viên giao hàng → rỗng', () => {
    expect(phoneSlotAgenda(0, 2, true)).toEqual([]);
    expect(phoneSlotAgenda(0, 10, false)).toEqual([]);
  });

  it('đầu ngày: đủ 9 khe giờ cố định, chip "HHh Điện thoại"', () => {
    const items = phoneSlotAgenda(0, 5, true);
    expect(items.map((i) => i.atMinutes)).toEqual(PHONE_SLOTS);
    expect(items[0].label).toBe('8h30 Điện thoại');
    expect(items.every((i) => i.panel === 'morning' && i.icon === '📞')).toBe(true);
    // Khe chỉ còn hiệu lực trong cửa sổ nghe máy (20 phút)
    expect(items[0].untilMinutes).toBe(PHONE_SLOTS[0] + 20);
  });

  it('giữa ngày: chỉ còn các khe CHƯA tới (khe đang tới thời điểm vẫn giữ)', () => {
    const items = phoneSlotAgenda(10 * 60, 5, true);
    expect(items.map((i) => i.atMinutes)).toEqual(PHONE_SLOTS.filter((s) => s >= 10 * 60));
  });

  it('quá cửa sổ nghe máy của khe cuối (21h) → rỗng', () => {
    expect(phoneSlotAgenda(21 * 60 + 21, 5, true)).toEqual([]);
  });
});

describe('contractAgenda / partyOrderAgenda — hạn giao hôm nay', () => {
  it('hợp đồng kỳ hạn đúng hôm nay → chip "Giao {tên}", xếp ở 20h, hiện tới 23h', () => {
    const def = supplyContractById('quan_nhau')!;
    const items = contractAgenda(DAY, { quan_nhau: { defId: 'quan_nhau', dueDay: DAY, delivered: 0, pending: true } });
    expect(items).toEqual([{
      key: 'contract-quan_nhau',
      atMinutes: 20 * 60,
      untilMinutes: 23 * 60,
      icon: def.icon,
      label: `Giao ${def.title}`,
      panel: 'contracts',
    }]);
  });

  it('hợp đồng hạn ngày khác / đã qua → không chip', () => {
    expect(contractAgenda(DAY, { quan_nhau: { defId: 'quan_nhau', dueDay: DAY + 1, delivered: 0, pending: true } })).toEqual([]);
    expect(contractAgenda(DAY, {})).toEqual([]);
  });

  it('đơn tiệc đã nhận hạn hôm nay → chip mở Nhiệm vụ; chưa nhận/hạn khác → không', () => {
    const items = partyOrderAgenda(DAY, { id: 'dam_cuoi', accepted: true, dueDay: DAY });
    expect(items).toHaveLength(1);
    expect(items[0].panel).toBe('quests');
    expect(items[0].label).toContain('Giao ');
    expect(partyOrderAgenda(DAY, { id: 'dam_cuoi', accepted: false, dueDay: DAY })).toEqual([]);
    expect(partyOrderAgenda(DAY, { id: 'dam_cuoi', accepted: true, dueDay: DAY + 1 })).toEqual([]);
    expect(partyOrderAgenda(DAY, null)).toEqual([]);
  });
});

describe('todayAgenda — ghép nguồn, lọc quá giờ, sắp thứ tự', () => {
  const full = {
    ...base,
    minutes: 7 * 60,
    storage: { mi: 10, trung: 1 },
    stations: ['hot_kettle'],
    hasCourier: true,
    contracts: { quan_nhau: { defId: 'quan_nhau', dueDay: DAY, delivered: 0, pending: true } },
    order: { id: 'dam_cuoi', accepted: true, dueDay: DAY },
  };

  it('sắp tăng dần theo phút, mọi chip còn hiệu lực tại thời điểm hiện tại', () => {
    const items = todayAgenda(full);
    expect(items.length).toBeGreaterThan(4);
    for (let i = 1; i < items.length; i++) expect(items[i].atMinutes).toBeGreaterThanOrEqual(items[i - 1].atMinutes);
    for (const it of items) expect(it.untilMinutes).toBeGreaterThan(full.minutes);
    // 7h: chip kế tiếp phải là việc đang trong khung đầu tiên (khách quen khung 8h–11h
    // chưa tới nhưng giờ vàng sáng 6h–8h30 đang chạy → đứng đầu)
    expect(items[0].key).toBe('golden-sang');
  });

  it('lọc đúng nguồn theo giờ: 12h — khách quen đang trong khung (9h–13h) vẫn giữ, khung đã qua bị lọc', () => {
    const items = todayAgenda({ ...full, minutes: 12 * 60 });
    const hours = items.map((i) => i.atMinutes);
    // Chú Thợ điện (khung 9h–13h) đang trong khung → chip 9h là việc kế tiếp
    expect(Math.min(...hours)).toBe(9 * 60);
    expect(items.some((i) => i.key === 'visit-bac_tam')).toBe(false);    // khung 8h–11h đã qua
    expect(items.some((i) => i.key === 'visit-anh_tuan')).toBe(true);    // khung 19h–22h chưa tới
    expect(hours).toContain(13 * 60);         // khe điện thoại 13h
    expect(hours).toContain(20 * 60);         // hợp đồng/đơn tiệc hạn hôm nay
  });

  it('0 hẹn (21h, cấp 1, không hợp đồng/đơn) → mảng rỗng — UI ẩn dải, trả slot IdleChip', () => {
    expect(todayAgenda({ ...base, minutes: 21 * 60, level: 1 })).toEqual([]);
  });

  it('nửa đêm (minutes > 1440): mọi mốc trong ngày đã qua → rỗng, không sập', () => {
    expect(todayAgenda({ ...base, minutes: 25 * 60 })).toEqual([]);
  });
});
