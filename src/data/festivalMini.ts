import type { FurnitureType } from './furniture';

/**
 * Hệ 7 — Trò khéo tay dịp lễ (SPEC-CHIEU-RONG §7).
 *
 * Mỗi dịp lễ có một trò 30–60 giây làm bằng tay (gói bánh chưng, xếp giỏ quà, bày mâm ngũ quả,
 * phất đèn ông sao); làm khéo thì mẻ hàng lễ hôm đó ra nhiều hơn một chút, không làm thì
 * thợ làm hộ và không mất gì.
 *
 * File này chỉ KHUNG DỮ LIỆU + BẢNG THƯỞNG THUẦN (R15: chưa có khung mini-game; các trò tương tác
 * thật nằm ở `src/ui/minigames/`). Có thể test mà không cần store:
 *   - mọi trò tất định theo `miniSeed(weatherSeed, day, miniId)` (R4 — hai máy cùng seed ra cùng đề);
 *   - mỗi trò chỉ tính thưởng 1 lần mỗi ngày lễ (R7), có trần nhỏ (§7.3);
 *   - luôn bỏ qua được bằng nút "Để thợ làm" → nhận kết quả cơ bản như cũ (§7.3).
 *
 * L1: khung + bảng thưởng + 1 trò giả (`tap_test`) để thử khung trên điện thoại.
 *     Các trò thật (Xếp giỏ quà / Gói bánh chưng / Mâm ngũ quả / Đèn ông sao) lần lượt vào L2–L5;
 *     `scoreFestivalMini` (slice) + miniBonus/flair cũng theo các lát đó.
 */

export type MiniMode = 'fast' | 'calm';

export interface MiniReward {
  /** Mẻ kế tiếp của công thức đó (trong ngày) ra thêm số đơn vị này. */
  bonusQty?: number;
  /** Điểm trang trí cộng tạm tới hết dịp (mâm ngũ quả / đèn ông sao). */
  flair?: number;
  xp: number;
}

export interface FestivalMiniDef {
  id: string;
  name: string;
  icon: string;
  /** Id các dịp lễ (FESTIVALS) mà trò này mở — chỉ chơi được trong dịp. */
  festivals: string[];
  /** Cấp mở ≥ 32 (R1: golden cấp 30 không đổi). */
  unlock: number;
  /** Loại thưởng gắn với việc đã có: mẻ nấu (bonusQty) hay điểm trang trí (flair). */
  target: { kind: 'recipe'; recipeId: string } | { kind: 'decor'; furniture: FurnitureType };
  /** Giây thật của mức "Nhanh tay" (30–60). Mức "Thong thả" không đếm giờ, thưởng 2/3. */
  seconds: number;
  /** Bảng thưởng: điểm 0–100 (client tính) → phần thưởng. THUẦN, test được. */
  reward: (score: number, mode: MiniMode) => MiniReward;
}

/** Thợ làm hộ — kết quả cơ bản như không chơi (0 điểm, không thưởng thêm). */
export const noBonusReward = (score: number, mode: MiniMode): MiniReward => {
  void score; void mode;
  return { xp: 0 };
};

/**
 * Mẻ sau ra thêm tối đa `maxExtra` đơn vị, tuỳ điểm 0–100. Mức "Thong thả" lấy 2/3 (§7.3).
 * XP thưởng theo độ khéo (điểm 0 → nửa xp, điểm 100 → đủ xp).
 */
export const recipeMiniReward = (maxExtra: number, xp: number) =>
  (score: number, mode: MiniMode): MiniReward => {
    const frac = Math.max(0, Math.min(1, score / 100));
    const bonusQty = Math.max(0, Math.round(maxExtra * frac * (mode === 'calm' ? 2 / 3 : 1)));
    return { bonusQty, xp: Math.round(xp * (0.5 + 0.5 * frac)) };
  };

/** +2 → +6 điểm trang trí tới hết dịp (mâm ngũ quả / đèn ông sao). */
export const flairMiniReward = (xp: number) =>
  (score: number, mode: MiniMode): MiniReward => {
    void mode;
    const frac = Math.max(0, Math.min(1, score / 100));
    const flair = 2 + Math.round(4 * frac);
    return { flair, xp: Math.round(xp * (0.5 + 0.5 * frac)) };
  };

/** Giỏ quà: công thức thưởng cho một dịp lễ cụ thể (giỏ quà chỉ gói được đúng mùa của nó). */
export const GIO_QUA_RECIPES: Record<string, string> = {
  tet: 'recipe_gio_tet',
  valentine: 'recipe_gio_valentine',
  quoc_te_phu_nu: 'recipe_gio_83',
  trung_thu: 'recipe_gio_trung_thu',
  nha_giao: 'recipe_gio_2011',
  giang_sinh: 'recipe_gio_giang_sinh',
};

// ─────────────────────────── Các trò ───────────────────────────

export const FESTIVAL_MINIS: FestivalMiniDef[] = [
  // ① Xếp giỏ quà — dùng cho 6 dịp, gắn với mẻ giỏ quà ở bàn gói (L2). Mẻ thường ra 2 giỏ.
  {
    id: 'gio_qua',
    name: 'Xếp giỏ quà',
    icon: '🎁',
    festivals: ['tet', 'valentine', 'quoc_te_phu_nu', 'trung_thu', 'nha_giao', 'giang_sinh'],
    unlock: 32,
    target: { kind: 'recipe', recipeId: 'gio_qua' },
    seconds: 45,
    reward: recipeMiniReward(1, 8), // mẻ hôm đó ra thêm 0–1 giỏ
  },
  // ② Gói bánh chưng — Tết, gắn với recipe_banh_chung_tu (L3). Mẻ thường ra 10 cái.
  {
    id: 'banh_chung',
    name: 'Gói bánh chưng',
    icon: '🍙',
    festivals: ['tet'],
    unlock: 32,
    target: { kind: 'recipe', recipeId: 'recipe_banh_chung_tu' },
    seconds: 45,
    reward: recipeMiniReward(3, 10), // mẻ hôm đó ra thêm 0–3 cái
  },
  // ③ Bày mâm ngũ quả — Tết, gắn với đồ trang trí mâm ngũ quả (L4).
  {
    id: 'mam_ngu_qua',
    name: 'Bày mâm ngũ quả',
    icon: '🍊',
    festivals: ['tet'],
    unlock: 32,
    target: { kind: 'decor', furniture: 'mam_ngu_qua' },
    seconds: 40,
    reward: flairMiniReward(8), // +2 → +6 điểm trang trí hết dịp Tết
  },
  // ④ Phất đèn ông sao — Trung thu, gắn với đồ trang trí đèn ông sao (L5).
  {
    id: 'den_ong_sao',
    name: 'Phất đèn ông sao',
    icon: '🏮',
    festivals: ['trung_thu'],
    unlock: 32,
    target: { kind: 'decor', furniture: 'den_ong_sao' },
    seconds: 40,
    reward: flairMiniReward(8), // +2 → +6 điểm trang trí hết dịp Trung thu
  },
  // ⑤ Rót khuôn bánh flan — Hội thi làm bánh (SPEC §7.6), gắn với recipe_banh_flan (mẻ thường 24 cái).
  {
    id: 'banh_flan',
    name: 'Rót khuôn bánh flan',
    icon: '🍮',
    festivals: ['hoi_banh'],
    unlock: 39, // = cấp mở recipe_banh_flan / nồi hấp
    target: { kind: 'recipe', recipeId: 'recipe_banh_flan' },
    seconds: 40,
    reward: recipeMiniReward(3, 10), // mẻ hôm đó ra thêm 0–3 cái flan
  },
  // ⑥ Pha nước theo đơn — Mùa hè (SPEC §7.6), gắn với recipe_vai_da_xay (mẻ thường 8 ly).
  {
    id: 'pha_nuoc',
    name: 'Pha nước theo đơn',
    icon: '🥤',
    festivals: ['he'],
    unlock: 43, // = cấp mở recipe_vai_da_xay
    target: { kind: 'recipe', recipeId: 'recipe_vai_da_xay' },
    seconds: 45,
    reward: recipeMiniReward(2, 8), // mẻ hôm đó ra thêm 0–2 ly
  },
  // ⑦ Xếp két lên xe đẩy — Giải bóng đá phường (SPEC §7.6), gắn với recipe_ca_vien_chien_mam (mẻ thường 9 xiên).
  {
    id: 'xep_ket',
    name: 'Xếp két lên xe đẩy',
    icon: '🛒',
    festivals: ['bong_da_phuong'],
    unlock: 55, // = cấp mở recipe_ca_vien_chien_mam
    target: { kind: 'recipe', recipeId: 'recipe_ca_vien_chien_mam' },
    seconds: 30,
    reward: recipeMiniReward(2, 8),
  },
  // Trò giả để thử khung trên điện thoại (L1) — chỉ mở qua hash #mini=tap_test, không vô UI thật.
  {
    id: 'tap_test',
    name: 'Kiểm tay',
    icon: '👆',
    festivals: [],
    unlock: 1,
    target: { kind: 'decor', furniture: 'mam_ngu_qua' },
    seconds: 30,
    reward: recipeMiniReward(1, 4),
  },
];

export const MINI_UNLOCK = 32;

export const miniDefById = (id: string): FestivalMiniDef | undefined =>
  FESTIVAL_MINIS.find((m) => m.id === id);

/** Trò khéo tay nên mở cho một dịp (trò thật đầu tiên gắn với dịp, bỏ trò giả tap_test). */
export const miniForFestival = (festivalId: string): FestivalMiniDef | undefined =>
  FESTIVAL_MINIS.find((m) => m.id !== 'tap_test' && m.festivals.includes(festivalId));

/** Trò này khéo tay có mở ở cấp `level` không. */
export const miniUnlocked = (def: FestivalMiniDef, level: number): boolean => def.unlock <= level;

/** Trò có đúng dịp đang diễn ra không (festivalId = `festivalOn(day)?.id`). */
export const miniInFestival = (def: FestivalMiniDef, festivalId: string | undefined): boolean =>
  def.festivals.length === 0 ? false : !!festivalId && def.festivals.includes(festivalId);

/** Công thức bị thưởng bonusQty của trò đang chơi hôm nay (giỏ quà chọn theo dịp). */
export const miniTargetRecipe = (def: FestivalMiniDef, festivalId: string | undefined): string | undefined => {
  if (def.target.kind !== 'recipe') return undefined;
  return def.target.recipeId === 'gio_qua' ? GIO_QUA_RECIPES[festivalId ?? ''] : def.target.recipeId;
};

/** Một dòng điểm trang trí thưởng (mâm ngũ quả / đèn ông sao) — lưu trong `biz.festivalFlair`. */
export interface FestivalFlairEntry {
  furniture: string;
  bonus: number;
  /** Ngày game hết hiệu lực (ngày cuối của dịp). */
  until: number;
}

/**
 * Tổng điểm trang trí 🩷 đang được cộng nhờ trò khéo tay (Hệ 7 §7.7, L4). THUẦN.
 * Cộng vào chuỗi `decorScoreOf` bên cạnh `vietSetDecorBonus` (customers.ts) — khi không có trò
 * (mọi bản lưu cũ, người chưa chơi trò) trả 0 nên không đổi nền kinh tế (không đụng golden).
 */
export function festivalFlairBonus(
  biz: { festivalFlair?: FestivalFlairEntry[] },
  day: number,
): number {
  let sum = 0;
  for (const f of biz.festivalFlair ?? []) if (day <= f.until) sum += f.bonus;
  return sum;
}
