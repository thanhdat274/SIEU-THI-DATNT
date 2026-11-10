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

/** Một lời mời việc nhà hợp lệ (giỗ hằng năm HOẶC việc lớn một lần) — slice sẽ thêm tier/accepted. */
export interface LifeEventOffer {
  defId: string;
  eventDay: number;
}

/** Nhãn tiếng Việt cho loại việc (thẻ Sổ đầu ngày + agenda). */
export const LIFE_EVENT_KIND_LABEL: Record<LifeEventKind, string> = {
  gio: 'Đám giỗ', cuoi: 'Đám cưới', day_thang: 'Đầy tháng', tan_gia: 'Tân gia', mung_tho: 'Mừng thọ',
};

/** Quãng báo trước cho việc lớn một lần (cưới/đầy tháng/tân gia/mừng thọ). */
export const BIG_EVENT_NOTICE_DAYS = 7;
/** Việc lớn một lần chỉ nhờ khi đã RẤT thân (spec §2.5: minFriendship việc lớn = 40). */
export const BIG_EVENT_FRIEND_MIN = 40;

/**
 * Sinh lời mời việc nhà cho `day` (thuần, R4 — giỗ không lưu; việc lớn theo dõi bằng `done`).
 * - GIỖ hằng năm: ngày băm từ id, chỉ mời khi trong cửa sổ báo trước (1..noticeDays). Cổng: cấp
 *   ≥ LIFE_EVENT_UNLOCK · chủ mở · thân ≥ minFriendship.
 * - VIỆC LỚN một lần (cưới/đầy tháng/tân gia/mừng thọ): kích khi thân ≥ minFriendship (40) và chưa
 *   nằm trong `done` (đã làm/từ chối) — 1 việc/ván (R7). eventDay = day + noticeDays.
 * Nhiều mời trùng → ưu tiên GIỖ (ngày thật trên lịch) trước, rồi việc nhỏ sớm nhất (slice chỉ giữ 1).
 * `seed` dành cho lịch tất định — giỗ không dùng, việc lớn không cần.
 */
export function lifeEventFor(args: {
  day: number;
  seed?: number;
  level: number;
  regulars: Record<string, RegularProgress>;
  /** Các việc lớn một lần đã làm/từ chối (biz.lifeEventsDone). */
  done?: string[];
}): LifeEventOffer | null {
  if (args.level < LIFE_EVENT_UNLOCK) return null;
  let gio: LifeEventOffer | null = null;
  let big: LifeEventOffer | null = null;
  for (const def of LIFE_EVENTS) {
    const host = regularById(def.host);
    if (!host || args.level < host.unlock) continue;
    if ((args.regulars[def.host]?.friendship ?? 0) < def.minFriendship) continue;
    if (def.kind === 'gio') {
      const eventDay = nextGioDay(def, args.day);
      const daysUntil = eventDay - args.day;
      if (daysUntil < 1 || daysUntil > def.noticeDays) continue;
      if (!gio || eventDay < gio.eventDay || (eventDay === gio.eventDay && def.id < gio.defId)) gio = { defId: def.id, eventDay };
    } else {
      if ((args.done ?? []).includes(def.id)) continue;
      const eventDay = args.day + def.noticeDays;
      if (!big || def.id < big.defId) big = { defId: def.id, eventDay };
    }
  }
  return gio ?? big;
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

// ───────────────────────── Thực đơn mẫu theo vùng (§2.11: 28 việc dùng chung 4–5 mẫu) ─────────────────────────
// Món NẤU CÓ THẬT (CLAUDE.md §3/§4). Hàng Hệ 1 (dưa hành/củ kiệu muối-ủ) sẽ bổ sung vào mâm khi hệ 1 L5/L7 có sản phẩm.
const M_BAC: [Record<string, number>, Record<string, number>, Record<string, number>] = [
  { thit_kho_trung: 4, xoi_man: 5 },
  { thit_kho_trung: 8, cha_lua: 4, xoi_man: 8 },
  { thit_kho_trung: 12, cha_lua: 6, xoi_ga: 8, canh_rau_thit: 8, ga_luoc: 4 },
];
const M_NAM: [Record<string, number>, Record<string, number>, Record<string, number>] = [
  { thit_kho_trung: 4, xoi_dua: 5 },
  { thit_kho_trung: 8, cha_gio_chien: 5, xoi_dua: 8 },
  { thit_kho_trung: 12, cha_gio_chien: 8, xoi_dua: 8, canh_rau_thit: 8, ga_luoc: 4 },
];

/** 6 giỗ cho 6 khách quen MỞ SỚM NHẤT (unlock 1–6): Bà Năm, Chú Ba, Bé Na, Chú Thắng, Cô Mai, Bác Hùng. */
const LIFE_EVENTS_GIO: LifeEventDef[] = [
  { id: 'gio_ba_nam', kind: 'gio', host: 'ba_nam', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [100000, 200000, 320000], friendship: [6, 10, 14] },
  { id: 'gio_chu_ba', kind: 'gio', host: 'chu_ba', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [100000, 200000, 320000], friendship: [6, 10, 14] },
  { id: 'gio_be_na', kind: 'gio', host: 'be_na', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'nam', menus: M_NAM, bonus: [100000, 200000, 320000], friendship: [6, 10, 14] },
  { id: 'gio_thang_barber', kind: 'gio', host: 'thang_barber', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [100000, 200000, 320000], friendship: [6, 10, 14] },
  { id: 'gio_co_mai', kind: 'gio', host: 'co_mai_bar', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'nam', menus: M_NAM, bonus: [100000, 200000, 320000], friendship: [6, 10, 14] },
  { id: 'gio_bac_hung', kind: 'gio', host: 'bac_hung_me', minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [100000, 200000, 320000], friendship: [6, 10, 14] },
];

/** Vùng miền (thực đơn mẫu §2.11) cho giỗ của 22 khách quen còn lại — GĐ Hệ2-L7 mở giỗ đủ 28 người (§2.8). */
const GIO_REGION_EXTRA: Record<string, 'bac' | 'nam'> = {
  bac_tam: 'bac', chi_lan: 'bac', anh_tuan: 'bac', bac_si_hai: 'bac', anh_giao_ngan: 'bac',
  chu_tu_ho: 'nam', co_mua_hoa: 'nam', chuong_tho_dien: 'bac', ba_ba_thit: 'nam', anh_minh_nhau: 'nam',
  co_nga_hoi: 'bac', chu_cuong_xuong: 'bac', bac_doi_hoi: 'bac', co_thao_quen: 'nam', suc_khanh_long: 'nam',
  chu_sau_ca: 'nam', chi_be_live: 'nam', chi_hanh_online: 'bac', bac_ba_xe_om: 'nam', co_xuan_cho: 'nam',
  dung_gym: 'bac', vy_live: 'nam',
};

/** Giỗ cho đủ 28 khách quen (SPEC §2.8): 22 người còn lại, cùng ngày băm từ id (`gioDoy`) + mẫu mâm theo vùng. */
const LIFE_EVENTS_GIO_EXTRA: LifeEventDef[] = Object.entries(GIO_REGION_EXTRA).map(([host, region]) => ({
  id: `gio_${host}`, kind: 'gio', host,
  minFriendship: GIO_FRIEND_MIN, noticeDays: GIO_NOTICE_DAYS, region,
  menus: region === 'nam' ? M_NAM : M_BAC, bonus: [100000, 200000, 320000], friendship: [6, 10, 14],
}));

/**
 * GĐ Hệ2-L4 — Việc lớn MỘT LẦN mỗi ván (SPEC §2.5/§2.10): cưới / đầy tháng / tân gia / mừng thọ.
 * Kích khi thân ≥ BIG_EVENT_FRIEND_MIN (40) — chủ rất thân mới nhờ; 1 việc/ván (R7, theo dõi `done`).
 * Thưởng và lan mạnh hơn giỗ (việc quyết định đời nhà người).
 */
const LIFE_EVENTS_BIG: LifeEventDef[] = [
  // ── 💒 Đám cưới ──
  { id: 'cuoi_chi_lan', kind: 'cuoi', host: 'chi_lan', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [160000, 320000, 520000], friendship: [8, 12, 16] },
  { id: 'cuoi_co_mai', kind: 'cuoi', host: 'co_mai_bar', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'nam', menus: M_NAM, bonus: [160000, 320000, 520000], friendship: [8, 12, 16] },
  { id: 'cuoi_anh_minh', kind: 'cuoi', host: 'anh_minh_nhau', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'nam', menus: M_NAM, bonus: [160000, 320000, 520000], friendship: [8, 12, 16] },
  // ── 👶 Đầy tháng ──
  { id: 'day_thang_co_xuan', kind: 'day_thang', host: 'co_xuan_cho', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'nam', menus: M_NAM, bonus: [140000, 280000, 460000], friendship: [7, 11, 15] },
  { id: 'day_thang_chi_hanh', kind: 'day_thang', host: 'chi_hanh_online', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [140000, 280000, 460000], friendship: [7, 11, 15] },
  // ── 🏠 Tân gia ──
  { id: 'tan_gia_chu_cuong', kind: 'tan_gia', host: 'chu_cuong_xuong', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [150000, 300000, 480000], friendship: [7, 11, 15] },
  { id: 'tan_gia_anh_tuan', kind: 'tan_gia', host: 'anh_tuan', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [150000, 300000, 480000], friendship: [7, 11, 15] },
  // ── 🧧 Mừng thọ ──
  { id: 'mung_tho_bac_tam', kind: 'mung_tho', host: 'bac_tam', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'bac', menus: M_BAC, bonus: [150000, 300000, 480000], friendship: [7, 11, 15] },
  { id: 'mung_tho_su_cu', kind: 'mung_tho', host: 'suc_khanh_long', minFriendship: BIG_EVENT_FRIEND_MIN, noticeDays: BIG_EVENT_NOTICE_DAYS, region: 'nam', menus: M_NAM, bonus: [150000, 300000, 480000], friendship: [7, 11, 15] },
];

const LIFE_EVENTS_ALL: LifeEventDef[] = [...LIFE_EVENTS_GIO, ...LIFE_EVENTS_GIO_EXTRA, ...LIFE_EVENTS_BIG];

const LIFE_EVENT_FALLBACK: Record<string, LifeEventDef> = Object.fromEntries(
  LIFE_EVENTS_ALL.map((d) => [d.id, d]),
);

/** Toàn bộ def việc nhà (6 giỗ hằng năm + việc lớn một lần). */
export const LIFE_EVENTS: LifeEventDef[] = LIFE_EVENTS_ALL;
