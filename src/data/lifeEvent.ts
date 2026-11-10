// ============================================================================
// Hệ 2 · Tình làng nghĩa xóm — Cơ chế 2: Việc nhà trong hẻm (SPEC-CHIEU-SAU §2.5)
// ----------------------------------------------------------------------------
// Lát L3: ĐÁM GIỖ HẰNG NĂM cho 6 khách quen mở sớm nhất + ô `biz.lifeEvent`
//          + 3 mức cỗ (gọn/đủ/linh đình) + thẻ Sổ đầu ngày + lifeEventAgenda.
//
// Giỗ là việc LẶP HẰNG NĂM: ngày cố định băm từ id (`gioDoy`, salt KHÁC
// `birthdayDoy` của regulars.ts) nên KHÔNG LƯU (R4) — hai máy chơi chung luôn
// khớp, người chơi nhớ được "tháng Ba là giỗ nhà Bà Năm" qua từng năm.
//
// Thực đơn lấy từ MÓN ĐÃ CÓ (món nấu nhà làm) — giỗ thật cần xôi, thịt kho,
// giò lụa/chả giò, canh, gà luộc. Hàng Hệ 1 (dưa hành / củ kiệu muối-ủ) sẽ được
// hệ 1 L5/L7 bổ sung sau; đến đó ta thêm vào mâm. Ghi rõ theo CLAUDE.md §4.
// Mỗi def 3 mức cỗ: gọn / đủ / linh đình — chọn mức khi nhận lời (đánh đổi như placeBet).
// ============================================================================

import { dayOfYear, dateOfDoy } from './calendar';
import { regularById, type RegularProgress } from './regulars';
import { RECIPES, STATION_BY_OUTPUT, type CookingStation } from './recipes';
import { productById } from './products';

/** Loại việc nhà trong hẻm. */
export type LifeEventKind = 'gio' | 'cuoi' | 'day_thang' | 'tan_gia' | 'mung_tho';

/** Một việc lớn của khách quen; tiệm được nhờ lo cỗ. */
export interface LifeEventDef {
  id: string;
  kind: LifeEventKind;
  /** regularId chủ việc. */
  host: string;
  /** Thân thiết tối thiểu để được nhờ (giỗ: 25). */
  minFriendship: number;
  /** Báo trước (ngày) để kịp nấu; giỗ 6 ngày. */
  noticeDays: number;
  /** Vùng miền cho thực đơn (Bắc/Nam) — giỗ dùng mẫu chung theo vùng (§2.11). */
  region: 'bac' | 'nam';
  /** Ba mức cỗ: gọn / đủ / linh đình. Người chơi CHỌN mức khi nhận lời. */
  menus: [Record<string, number>, Record<string, number>, Record<string, number>];
  bonus: [number, number, number];
  friendship: [number, number, number];
}

/** Trạng thái một việc đang mời/đã nhận. */
export interface LifeEventState {
  defId: string;
  eventDay: number;
  tier: 0 | 1 | 2;
  accepted: boolean;
}

/** Cổng cấp cho toàn bộ hệ (golden L30 an toàn — R1). */
export const LIFE_EVENT_UNLOCK = 32;
/** Giỗ chỉ mời khi chủ đã đủ thân (spec §2.5: minFriendship giỗ = 25). */
export const GIO_FRIEND_MIN = 25;
export const GIO_NOTICE_DAYS = 6;

/** Ngày giỗ cố định trong năm (0-based), băm từ id — salt khác `birthdayDoy` (regulars.ts). */
export function gioDoy(def: LifeEventDef): number {
  let h = 13;
  for (let i = 0; i < def.id.length; i++) h = (h * 31 + def.id.charCodeAt(i)) & 0x7fffffff;
  return h % 365;
}

/** Ngày giỗ dạng "ngày/tháng" (cùng lịch Sổ đầu ngày) để CalendarPanel đánh dấu. */
export function gioLabel(def: LifeEventDef): string {
  const d = dateOfDoy(gioDoy(def));
  return `${d.day}/${d.month}`;
}

/** Ngày chơi (tuyệt đối) của giỗ sắp tới KỂ TỪ `day` (bao gồm cả hôm đó). */
export function nextGioDay(def: LifeEventDef, day: number): number {
  const diff = gioDoy(def) - dayOfYear(day);
  return day + (diff <= 0 ? 365 + diff : diff);
}

/** Một lời mời giỗ hợp lệ (chưa là LifeEventState đầy đủ — slice sẽ thêm tier/accepted). */
export interface LifeEventOffer {
  defId: string;
  eventDay: number;
}

/**
 * Sinh lời mời giỗ hằng năm cho `day` (thuần, R4 — không lưu).
 * Cổng: cấp ≥ LIFE_EVENT_UNLOCK · chủ đã mở · thân thiết ≥ def.minFriendship ·
 * giỗ sắp tới trong cửa sổ báo trước (1..noticeDays). Nhiều giỗ trùng cửa sổ →
 * chọn sớm nhất (việc sau lùi 3 ngày do slice chỉ giữ 1 việc). `seed` dành cho
 * L4 (việc lớn một lần) — giỗ không dùng.
 */
export function lifeEventFor(args: {
  day: number;
  seed?: number;
  level: number;
  regulars: Record<string, RegularProgress>;
}): LifeEventOffer | null {
  if (args.level < LIFE_EVENT_UNLOCK) return null;
  let best: LifeEventOffer | null = null;
  for (const def of LIFE_EVENTS) {
    const host = regularById(def.host);
    if (!host || args.level < host.unlock) continue;
    if ((args.regulars[def.host]?.friendship ?? 0) < def.minFriendship) continue;
    const eventDay = nextGioDay(def, args.day);
    const daysUntil = eventDay - args.day;
    if (daysUntil < 1 || daysUntil > def.noticeDays) continue;
    if (!best || eventDay < best.eventDay || (eventDay === best.eventDay && def.id < best.defId)) {
      best = { defId: def.id, eventDay };
    }
  }
  return best;
}

/** Trạm nấu liệt kê trong mâm — dùng chung `STATION_BY_OUTPUT` như `orderFulfillable`. */
export function menuStations(menu: Record<string, number>): CookingStation[] {
  const st = new Set<CookingStation>();
  Object.keys(menu).forEach((id) => {
    const s = STATION_BY_OUTPUT[id as keyof typeof STATION_BY_OUTPUT];
    if (s) st.add(s);
  });
  return [...st];
}

/** Đã có đủ mọi trạm nấu để làm mâm này chưa (cùng tinh thần `orderFulfillable`). */
export function menuFulfillable(menu: Record<string, number>, stations: CookingStation[]): boolean {
  return menuStations(menu).every((s) => stations.includes(s));
}

/** Trị giá mâm theo giá bán sỉ của từng món (token cho tổng giờ nấu/thưởng). */
export function menuValue(menu: Record<string, number>): number {
  return Object.entries(menu).reduce((n, [id, q]) => n + (productById(id)?.sell ?? 0) * q, 0);
}

/** Tổng số món trong mâm (số "suất" để ước lượng). */
export function menuSize(menu: Record<string, number>): number {
  return Object.values(menu).reduce((n, q) => n + q, 0);
}

/** Thông tin nấu từng món (phút + số món mỗi mẻ) theo outputId — để ước tổng giờ nấu trong thẻ. */
const COOK_INFO: Record<string, { min: number; qty: number }> = Object.fromEntries(
  RECIPES.map((r) => [r.outputId, { min: r.durationMin, qty: r.outputQty }]),
);

/** Tổng phút nấu ước tính cho cả mâm (số mẻ × thời lượng mỗi mẻ). */
export function menuCookMinutes(menu: Record<string, number>): number {
  return Object.entries(menu).reduce((n, [id, q]) => {
    const c = COOK_INFO[id];
    if (!c) return n;
    return n + Math.ceil(q / c.qty) * c.min;
  }, 0);
}

export const lifeEventById = (id: string): LifeEventDef | undefined => LIFE_EVENT_FALLBACK[id];

/** 6 giỗ cho 6 khách quen MỞ SỚM NHẤT (unlock 1–6): Bà Năm, Chú Ba, Bé Na, Chú Thắng,
 *  Cô Mai, Bác Hùng. Thực đơn theo vùng Bắc/Nam từ món có thật (CLAUDE.md §3/§4). */
const LIFE_EVENTS_GIO: LifeEventDef[] = [
  {
    id: 'gio_ba_nam', kind: 'gio', host: 'ba_nam', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac',
    menus: [
      { thit_kho_trung: 4, xoi_man: 5 },                                        // gọn
      { thit_kho_trung: 8, cha_lua: 4, xoi_man: 8 },                            // đủ
      { thit_kho_trung: 12, cha_lua: 6, xoi_ga: 8, canh_rau_thit: 8, ga_luoc: 4 }, // linh đình
    ],
    bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
  },
  {
    id: 'gio_chu_ba', kind: 'gio', host: 'chu_ba', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac',
    menus: [
      { thit_kho_trung: 4, xoi_man: 5 },
      { thit_kho_trung: 8, cha_lua: 4, xoi_man: 8 },
      { thit_kho_trung: 12, cha_lua: 6, xoi_ga: 8, canh_rau_thit: 8, ga_luoc: 4 },
    ],
    bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
  },
  {
    id: 'gio_be_na', kind: 'gio', host: 'be_na', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'nam',
    menus: [
      { thit_kho_trung: 4, xoi_dua: 5 },
      { thit_kho_trung: 8, cha_gio_chien: 5, xoi_dua: 8 },
      { thit_kho_trung: 12, cha_gio_chien: 8, xoi_dua: 8, canh_rau_thit: 8, ga_luoc: 4 },
    ],
    bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
  },
  {
    id: 'gio_thang_barber', kind: 'gio', host: 'thang_barber', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac',
    menus: [
      { thit_kho_trung: 4, xoi_man: 5 },
      { thit_kho_trung: 8, cha_lua: 4, xoi_man: 8 },
      { thit_kho_trung: 12, cha_lua: 6, xoi_ga: 8, canh_rau_thit: 8, ga_luoc: 4 },
    ],
    bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
  },
  {
    id: 'gio_co_mai', kind: 'gio', host: 'co_mai_bar', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'nam',
    menus: [
      { thit_kho_trung: 4, xoi_dua: 5 },
      { thit_kho_trung: 8, cha_gio_chien: 5, xoi_dua: 8 },
      { thit_kho_trung: 12, cha_gio_chien: 8, xoi_dua: 8, canh_rau_thit: 8, ga_luoc: 4 },
    ],
    bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
  },
  {
    id: 'gio_bac_hung', kind: 'gio', host: 'bac_hung_me', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac',
    menus: [
      { thit_kho_trung: 4, xoi_man: 5 },
      { thit_kho_trung: 8, cha_lua: 4, xoi_man: 8 },
      { thit_kho_trung: 12, cha_lua: 6, xoi_ga: 8, canh_rau_thit: 8, ga_luoc: 4 },
    ],
    bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
  },
];

const LIFE_EVENT_FALLBACK: Record<string, LifeEventDef> = Object.fromEntries(
  LIFE_EVENTS_GIO.map((d) => [d.id, d]),
);

/** Toàn bộ def việc nhà (hiện: 6 giỗ; L4 thêm cưới/đầy tháng/tân gia/mừng thọ). */
export const LIFE_EVENTS: LifeEventDef[] = LIFE_EVENTS_GIO;
