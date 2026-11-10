/**
 * GĐ Hệ2-L1 (SPEC-CHIEU-SAU §2.3/2.8) — QUAN HỆ GIỮA CÁC KHÁCH QUEN + chỉ số "Tình làng".
 * File THUẦN, chỉ đọc: 22 cạnh giữa 28 khách quen (họ hàng / bạn bè / láng giềng / đồng nghề / khắc khẩu),
 * trọng số lan thân thiết `TIE_WEIGHT`, và hàm `alleyBond` đo độ gắn kết cả hẻm.
 * L1 KHÔNG đổi gì trong ván (không đụng endDay/kinh tế/save) → golden L30 an toàn.
 */

export type TieKind = 'ho_hang' | 'ban_be' | 'lang_gieng' | 'dong_nghe' | 'khac_khau';

export interface RegularTie {
  a: string;
  b: string;
  kind: TieKind;
  /** Căn cứ / chuyện giữa hai người (ghi chú cho người duyệt & hiển thị). */
  note: string;
}

/** Độ lan thân thiết theo loại quan hệ. Cạnh khắc khẩu âm: lo chu đáo A thì B hơi dỗi. */
export const TIE_WEIGHT: Record<TieKind, number> = {
  ho_hang: 0.5,
  ban_be: 0.3,
  lang_gieng: 0.25,
  dong_nghe: 0.2,
  khac_khau: -0.3,
};

export const TIE_LABEL: Record<TieKind, string> = {
  ho_hang: 'Họ hàng',
  ban_be: 'Bạn bè',
  lang_gieng: 'Láng giềng',
  dong_nghe: 'Đồng nghề',
  khac_khau: 'Khắc khẩu',
};

export const TIE_ICON: Record<TieKind, string> = {
  ho_hang: '👨‍👩‍👧',
  ban_be: '🤝',
  lang_gieng: '🏘️',
  dong_nghe: '🔧',
  khac_khau: '⚡',
};

/** 22 cạnh giữa 28 khách quen, suy từ vai + các đơn/hợp đồng đang có (SPEC §2.3, bảng cần người duyệt). */
export const REGULAR_TIES: RegularTie[] = [
  { a: 'ba_nam', b: 'bac_tam', kind: 'lang_gieng', note: 'đơn `mung_tho`: Bà Năm đặt cỗ mừng thọ Bác Tám' },
  { a: 'ba_nam', b: 'be_na', kind: 'ho_hang', note: 'bà–cháu, cùng là khách đầu game' },
  { a: 'bac_tam', b: 'co_nga_hoi', kind: 'ban_be', note: 'cùng lo việc phường' },
  { a: 'bac_tam', b: 'bac_doi_hoi', kind: 'ban_be', note: 'hội xóm và hội làng' },
  { a: 'bac_doi_hoi', b: 'suc_khanh_long', kind: 'ban_be', note: 'lễ hội làng gắn với chùa' },
  { a: 'chu_ba', b: 'bac_ba_xe_om', kind: 'khac_khau', note: 'hai người giành cuốc đầu hẻm' },
  { a: 'chu_ba', b: 'bac_hung_me', kind: 'ban_be', note: 'xe hư là ghé' },
  { a: 'bac_hung_me', b: 'chuong_tho_dien', kind: 'dong_nghe', note: 'thợ trong xóm' },
  { a: 'chu_tu_ho', b: 'chu_cuong_xuong', kind: 'lang_gieng', note: 'lò gạch và xưởng gỗ' },
  { a: 'chu_cuong_xuong', b: 'anh_minh_nhau', kind: 'ban_be', note: 'thợ xưởng nhậu ở quán' },
  { a: 'anh_minh_nhau', b: 'chu_sau_ca', kind: 'dong_nghe', note: 'mối cá của quán' },
  { a: 'ba_ba_thit', b: 'co_xuan_cho', kind: 'ban_be', note: 'cùng chợ' },
  { a: 'ba_ba_thit', b: 'chu_sau_ca', kind: 'khac_khau', note: 'thịt với cá giành khách chợ' },
  { a: 'co_mai_bar', b: 'thang_barber', kind: 'lang_gieng', note: 'quán vỉa hè cạnh tiệm tóc' },
  { a: 'co_thao_quen', b: 'co_nga_hoi', kind: 'ban_be', note: '"quen hội"' },
  { a: 'co_mua_hoa', b: 'co_thao_quen', kind: 'ban_be', note: 'hoa và bánh cưới' },
  { a: 'chi_lan', b: 'anh_giao_ngan', kind: 'ho_hang', note: 'chị–em' },
  { a: 'anh_tuan', b: 'dung_gym', kind: 'ban_be', note: 'bạn bè' },
  { a: 'bac_si_hai', b: 'suc_khanh_long', kind: 'ban_be', note: 'khám miễn phí ở sân chùa' },
  { a: 'chi_be_live', b: 'vy_live', kind: 'khac_khau', note: 'giành người xem' },
  { a: 'chi_be_live', b: 'chi_hanh_online', kind: 'dong_nghe', note: 'đồng nghề' },
  { a: 'anh_tuan', b: 'vy_live', kind: 'ho_hang', note: 'anh–em' },
];

/** Khóa chuẩn hoá của một cạnh: `a|b` luôn theo thứ tự chữ cái → dùng cho dedup và `tiesMended`. */
export function tieKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Cấp mở Hệ 2 — lan thân thiết theo cạnh (R1: ≥32 nên golden L30 không đổi). */
export const TIES_UNLOCK = 32;

/** Xoá nợ cho một người → họ hàng của họ +2 ("nhớ ơn"), flat (SPEC §2.4). */
export const FORGIVE_HO_HANG_GAIN = 2;

/** Mỗi người nhận lan tối đa ±3 điểm trong một ngày (SPEC §2.4, chống lạm phát thân thiết). */
export const RIPPLE_DAILY_CAP = 3;

/**
 * Cơ chế 1 — "Tiếng lành, tiếng dữ" lan theo cạnh (SPEC §2.4).
 * Với `delta` của sự kiện gốc ở `sourceId`, trả danh sách `{ id, delta }` cho các người có cạnh:
 *  - `weighted` (mặc định, cho đơn riêng): delta × TIE_WEIGHT theo loại cạnh (khắc khẩu âm → lo A thì B dỗi).
 *  - `only` (cho xoá nợ/quỵt nợ): chỉ lan tới đúng loại quan hệ đó, `weighted:false` dùng delta thẳng (flat).
 * THUẦN — slice áp qua `adjustFriendship` + trần riêng.
 */
export function rippleFriendship(
  sourceId: string,
  delta: number,
  opts: { only?: TieKind; weighted?: boolean } = {},
): { id: string; delta: number }[] {
  return tiesOf(sourceId)
    .filter((t) => !opts.only || t.kind === opts.only)
    .map((t) => ({ id: otherOf(t, sourceId), delta: opts.weighted === false ? delta : Math.round(delta * TIE_WEIGHT[t.kind]) }));
}

/** Một cạnh có được xem là "khắc khẩu" không (tính cả cạnh đã hoà giải: đã mended thì không còn). */
export function tieIsHostile(t: RegularTie, tiesMended: string[] = []): boolean {
  if (t.kind !== 'khac_khau') return false;
  return !tiesMended.includes(tieKey(t.a, t.b));
}

/** Tất cả cạnh của một người (cả hoà giải lẫn chưa). */
export function tiesOf(regularId: string): RegularTie[] {
  return REGULAR_TIES.filter((t) => t.a === regularId || t.b === regularId);
}

/** Người cùng phía với regularId trong cạnh t (người kia). */
export function otherOf(t: RegularTie, regularId: string): string {
  return t.a === regularId ? t.b : t.a;
}

/**
 * Chỉ số "Tình làng" (SPEC §2.8): với mỗi cạnh không khắc khẩu (trừ khắc khẩu đã hoà giải),
 * lấy `min(thân thiết A, thân thiết B)` quy về 0–1 (đủ 40 là 1), cộng lại, chia tổng số cạnh thân → 0–100%.
 * THUẦN — chỉ đọc từ `regulars` (Record id → { friendship }) và `tiesMended`.
 */
export function alleyBond(
  regulars: Record<string, { friendship: number }>,
  tiesMended: string[] = [],
  FRIENDLY_AT = 40,
): number {
  const friendly = REGULAR_TIES.filter((t) => !tieIsHostile(t, tiesMended));
  if (friendly.length === 0) return 0;
  let sum = 0;
  for (const t of friendly) {
    const fa = regulars[t.a]?.friendship ?? 0;
    const fb = regulars[t.b]?.friendship ?? 0;
    const mins = Math.min(fa, fb);
    sum += Math.min(1, mins / FRIENDLY_AT);
  }
  return Math.round((sum / friendly.length) * 100);
}
