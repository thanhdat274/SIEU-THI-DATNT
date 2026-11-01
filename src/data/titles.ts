/** Danh hiệu (thành tích) và kỹ năng chủ tiệm. */

/** Số liệu để xét danh hiệu. */
export interface TitleContext {
  level: number;
  day: number;
  customers: number;
  itemsSold: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  /** Số khách quen đã mở perk đầu tiên. */
  closeRegulars: number;
  ordersDone: number;
  staffCount: number;
  /** Số lần tái sinh (prestige) đã thực hiện — dùng cho danh hiệu NG+ độc quyền. */
  prestige: number;
  /** GĐ171: đã hoàn thành TRỌN BỘ mục tiêu vòng tái sinh hiện tại (checkTitles tính qua ngGoalProgress). */
  ngGoalsAllDone?: boolean;
}

export interface TitleDef {
  id: string;
  icon: string;
  name: string;
  description: string;
  done: (c: TitleContext) => boolean;
  /** Số lần tái sinh tối thiểu để mở — danh hiệu NG+ độc quyền, giữ qua mọi vòng. */
  prestige?: number;
  /** Icon thay cho 🔒 khi chưa mở (danh hiệu NG+). */
  lockIcon?: string;
}

export const TITLES: TitleDef[] = [
  { id: 'tap_su', icon: '🌱', name: 'Tập sự đầu hẻm', description: 'Mở tiệm tạp hóa nhỏ đầu ngõ.', done: () => true },
  { id: 'can_man', icon: '☀️', name: 'Chủ tiệm cần mẫn', description: 'Bám trụ buôn bán 7 ngày.', done: (c) => c.day > 7 },
  { id: 'tap_nap', icon: '🛒', name: 'Góc phố tấp nập', description: 'Phục vụ 100 lượt khách.', done: (c) => c.customers >= 100 },
  { id: 'trieu_dau', icon: '💵', name: 'Đồng ra đồng vào', description: 'Tổng doanh thu đạt 1 triệu.', done: (c) => c.revenue >= 1_000_000 },
  { id: 'nghin_mon', icon: '📦', name: 'Nghìn món qua tay', description: 'Bán được 1.000 món.', done: (c) => c.itemsSold >= 1000 },
  { id: 'uy_tin', icon: '⭐', name: 'Tiệm uy tín', description: 'Điểm đánh giá từ 4,5 với ít nhất 20 lời nhận xét.', done: (c) => c.reviewCount >= 20 && c.rating >= 4.5 },
  { id: 'tinh_xom', icon: '💛', name: 'Tình làng nghĩa xóm', description: 'Thân thiết với 3 khách quen.', done: (c) => c.closeRegulars >= 3 },
  { id: 'chuyen_tiec', icon: '🎉', name: 'Chuyên lo tiệc', description: 'Giao xong 5 đơn tiệc.', done: (c) => c.ordersDone >= 5 },
  { id: 'ong_chu', icon: '👔', name: 'Ông chủ nhỏ', description: 'Có 3 nhân viên.', done: (c) => c.staffCount >= 3 },
  { id: 'chuc_trieu', icon: '💰', name: 'Triệu phú hẻm', description: 'Tổng doanh thu đạt 50 triệu.', done: (c) => c.revenue >= 50_000_000 },
  { id: 'cap_30', icon: '🏪', name: 'Chủ cửa hàng tiện lợi', description: 'Đạt cấp 30.', done: (c) => c.level >= 30 },
  { id: 'mot_nam', icon: '📅', name: 'Tròn một năm', description: 'Buôn bán qua 365 ngày (một năm trong game).', done: (c) => c.day > 365 },
  { id: 'cap_60', icon: '🏬', name: 'Ông trùm siêu thị', description: 'Đạt cấp 60.', done: (c) => c.level >= 60 },
  // ── Mốc xa — cho người chơi dài hơi danh hiệu để phấn đấu ──
  { id: 'tam_ky', icon: '🗓️', name: 'Bám trụ ba tháng', description: 'Buôn bán qua 90 ngày.', done: (c) => c.day > 90 },
  { id: 'ngan_khach', icon: '👥', name: 'Ngàn khách tấp nập', description: 'Phục vụ 1.000 lượt khách.', done: (c) => c.customers >= 1000 },
  { id: 'dai_gia', icon: '🏦', name: 'Tài phiệt đầu hẻm', description: 'Tổng doanh thu đạt 1 tỷ.', done: (c) => c.revenue >= 1_000_000_000 },
  { id: 'cap_80', icon: '🎖️', name: 'Huyền thoại ngõ phố', description: 'Đạt cấp 80.', done: (c) => c.level >= 80 },
  { id: 'cap_90', icon: '👑', name: 'Đệ nhất phố hẻm', description: 'Đạt cấp 90 — mốc hiếm cuối run.', done: (c) => c.level >= 90 },
  // GĐ171: danh hiệu trọn bộ mục tiêu vòng tái sinh — nhét một lần duy nhất (titles giữ qua NG+),
  // đích cuối hướng danh hiệu cho cuốn mục tiêu vòng thay vì chỉ tiền.
  { id: 'chu_hem_lao_lang', icon: '🧭', name: 'Chủ hẻm lão làng', description: 'Hoàn thành trọn bộ mục tiêu của một vòng tái sinh (NG+).', done: (c) => c.ngGoalsAllDone === true },
];

/**
 * Danh hiệu NG+ độc quyền — chỉ mở khi đã tái sinh đủ số lần (prestige.level ≥ N) và vẫn phải
 * thỏa `done`. Mỗi cấp tái sinh nhét một danh hiệu để người cày xong vòng 1 có lý do chạy thêm vòng.
 */
export const PRESTIGE_TITLES: TitleDef[] = [
  { id: 'nguoi_giu_lua', icon: '🔥', lockIcon: '🥚', name: 'Người giữ lửa hẻm', prestige: 1, description: 'Tái sinh lần đầu — bắt đầu lại từ cấp 1 nhưng giữ bộ sưu tập.', done: () => true },
  { id: 'do_ten_con', icon: '🏮', lockIcon: '🎐', name: 'Đệ tử giữ hồn', prestige: 2, description: 'Tái sinh hai lần — ngọn lửa buôn bán tiếp nối.', done: () => true },
  { id: 'phu_gia_dai_do', icon: '🏛️', lockIcon: '🏚️', name: 'Phú gia đại hộ', prestige: 3, description: 'Tái sinh ba lần — của cải đổi đời, tiếng tăm đổi dòng.', done: () => true },
  { id: 'long_than_hall', icon: '🐉', lockIcon: '🐍', name: 'Chủ tiệm thế hệ mới', prestige: 4, description: 'Tái sinh bốn lần — vượt qua chính mình ở mọi thế hệ.', done: () => true },
  { id: 'bat_tu_thuong_nhan', icon: '♾️', lockIcon: '🔁', name: 'Thương nhân bất tử', prestige: 5, description: 'Tái sinh năm lần — gần chạm tới tuyệt đỉnh tiệm hẻm.', done: () => true },
  { id: 'truyen_thuyet_sang_ngo', icon: '🌌', lockIcon: '🌫️', name: 'Truyền thuyết đầu ngõ', prestige: 6, description: 'Tái sinh tối đa — huyền thoại sống mãi trong từng ngõ.', done: () => true },
];

export const ALL_TITLES: TitleDef[] = [...TITLES, ...PRESTIGE_TITLES];

export type SkillId =
  | 'quick_hands' | 'good_boss' | 'charm' | 'negotiator' | 'local_legend' | 'fresh_keeper' | 'sharp_eye' | 'big_basket'
  | 'cool_pack' | 'neat_shelves' | 'zero_waste' | 'master_manager' | 'snack_master' | 'drink_master' | 'fast_cook';

export interface SkillDef {
  id: SkillId;
  icon: string;
  name: string;
  description: string;
  /** Cấp tối thiểu để học. */
  unlock: number;
  /** Nhóm kỹ năng: management / storage / cooking. */
  category: 'management' | 'storage' | 'cooking';
}

export const SKILLS: SkillDef[] = [
  // ──────────────────────────────────────────────
  // QUẢN LÝ & BUÔN BÁN (Management & Marketing)
  // ──────────────────────────────────────────────
  { id: 'quick_hands', icon: '🖐️', name: 'Tay thoăn thoắt', description: 'Bạn tính tiền nhanh hơn 20%.', unlock: 5, category: 'management' },
  { id: 'charm', icon: '😄', name: 'Duyên bán hàng', description: 'Khách nhạy giá ít hơn 15% (chịu giá cao hơn chút).', unlock: 5, category: 'management' },
  { id: 'good_boss', icon: '🧑‍💼', name: 'Chủ tiệm chu đáo', description: 'Lương nhân viên giảm 10%.', unlock: 20, category: 'management' },
  { id: 'master_manager', icon: '📊', name: 'Bậc thầy điều phối', description: 'Nhân viên bổ sung kệ và thu ngân làm việc nhanh hơn 20%.', unlock: 30, category: 'management' },
  { id: 'negotiator', icon: '🤝', name: 'Mối quen giảm giá', description: 'Nhập hàng mọi mối rẻ thêm 5%.', unlock: 10, category: 'management' },
  { id: 'local_legend', icon: '📣', name: 'Tiếng lành đồn xa', description: 'Thêm 10% người đi đường ghé tiệm.', unlock: 30, category: 'management' },
  { id: 'big_basket', icon: '🧺', name: 'Khéo mời chào', description: 'Khách hay mua thêm một món.', unlock: 40, category: 'management' },

  // ──────────────────────────────────────────────
  // BẢO QUẢN (Storage)
  // ──────────────────────────────────────────────
  { id: 'fresh_keeper', icon: '🧊', name: 'Giữ hàng tươi', description: 'Hàng tươi, hàng mát hỏng chậm hơn 25%.', unlock: 15, category: 'storage' },
  { id: 'sharp_eye', icon: '👁️', name: 'Mắt tinh', description: 'Dễ phát hiện kẻ trộm và tiền giả hơn hẳn.', unlock: 25, category: 'storage' },
  { id: 'cool_pack', icon: '❄️', name: 'Bọc giữ tươi', description: 'Hàng tươi sống được bảo quản tốt hơn, hạn sử dụng tăng thêm 1 ngày.', unlock: 12, category: 'storage' },
  { id: 'neat_shelves', icon: '📐', name: 'Kê xếp gọn gàng', description: 'Tăng 20% sức chứa tối đa của các kệ bán hàng.', unlock: 22, category: 'storage' },
  { id: 'zero_waste', icon: '♻️', name: 'Bảo quản chu đáo', description: 'Giảm 50% tốc độ hư hỏng thực phẩm tươi sống.', unlock: 35, category: 'storage' },

  // ──────────────────────────────────────────────
  // NẤU ĂN (Cooking)
  // ──────────────────────────────────────────────
  { id: 'fast_cook', icon: '🔥', name: 'Nấu nhanh', description: 'Thời gian nấu giảm 25%.', unlock: 18, category: 'cooking' },
  { id: 'snack_master', icon: '🍢', name: 'Bậc thầy món vặt', description: 'Món ăn vặt tự chế bán được giá cao hơn 15%.', unlock: 24, category: 'cooking' },
  { id: 'drink_master', icon: '🧋', name: 'Pha chế chuyên nghiệp', description: 'Đồ uống tự chế tạo ra chất lượng cao, khách boa thêm 10%.', unlock: 28, category: 'cooking' },
];

/** Cứ 5 cấp được một điểm kỹ năng. */
export const skillPoints = (level: number) => Math.floor(level / 5);

export const hasSkill = (skills: readonly string[], id: SkillId) => skills.includes(id);
