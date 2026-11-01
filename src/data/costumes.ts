// ============================================================================
// Data: Costume / Trang phục & ngoại hình nhân vật chính (mở khóa theo cấp)
// ----------------------------------------------------------------------------
// File dữ liệu STANDALONE: chỉ định nghĩa dữ liệu ngoại hình, KHÔNG phụ thuộc
// vào store/state, không import store.ts. Người chơi tự tích hợp vào UI/player.
//
// Mỗi Costume chỉ truyền các trường thuộc CharacterMeshOptions (xem
// src/render/characterModel.ts): archetype, gender, profession, bodyColor,
// hatColor, hasGlasses, skinColor, hairColor, scale. Profession của nhân vật
// chính luôn là 'player'.
//
// Lưu ý nhân vật player:
//  - Không set hatColor => tự đội nón lá vàng mặc định.
//  - Set hatColor       => đội mũ lưỡi trai/nón bảo hiểm màu tương ứng.
//  - hasGlasses true    => đeo kính gọng tối.
//  - bodyColor          => màu áo (top) chính của nhân vật chính.
// ============================================================================

/** Các tùy chọn ngoại hình khả dụng, khớp với CharacterMeshOptions. */
export interface CostumeOptions {
  bodyColor?: number;
  hatColor?: number;
  hasGlasses?: boolean;
  skinColor?: number;
  hairColor?: number;
  /** Biến thể giới tính: đổi kiểu tóc của các archetype trung tính (xem genderHairStyle). */
  gender?: 'male' | 'female';
}

export interface Costume {
  /** Định danh duy nhất của bộ trang phục. */
  id: string;
  /** Tên hiển thị của bộ trang phục. */
  name: string;
  /** Emoji biểu tượng đại diện. */
  icon: string;
  /** Cấp (level) cần đạt để mở khóa. */
  unlock: number;
  /** Giá mặc thử / mua (đồng). */
  price: number;
  /** Số lần tái sinh (prestige) tối thiểu để mở — trang phục NG+ độc quyền, giữ qua mọi vòng. */
  prestige?: number;
  /** Các tùy chọn ngoại hình truyền vào buildChibiCharacter. */
  options: CostumeOptions;
}

/**
 * Trang phục mặc định của nhân vật chính: giống hệt ngoại hình hiện tại
 * (áo xanh đậm 0x224870, đeo kính).
 */
export const DEFAULT_COSTUME: Costume = {
  id: 'default',
  name: 'Mặc định',
  icon: '🌾',
  unlock: 1,
  price: 0,
  options: {
    bodyColor: 0x224870,
    hasGlasses: true,
  },
};

/** Danh sách toàn bộ bộ trang phục, dàn cấp mở khóa từ 1 đến 60. */
export const COSTUMES: Costume[] = [
  // ──────────────────────────────────────────────
  // TRANG PHỤC CŨ (11 bộ gốc)
  // ──────────────────────────────────────────────
  {
    id: 'default',
    name: 'Mặc định',
    icon: '🌾',
    unlock: 1,
    price: 0,
    options: {
      bodyColor: 0x224870,
      hasGlasses: true,
    },
  },
  {
    id: 'ao_thun_xanh',
    name: 'Áo thun xanh',
    icon: '👕',
    unlock: 2,
    price: 1000,
    options: {
      bodyColor: 0x3498db,
      hasGlasses: false,
    },
  },
  {
    id: 'do_the_thao',
    name: 'Đồ thể thao',
    icon: '🏃',
    unlock: 5,
    price: 3500,
    options: {
      bodyColor: 0x00b894,
      hatColor: 0x00cec9,
      hasGlasses: false,
    },
  },
  {
    id: 'ao_so_mi_tim',
    name: 'Áo sơ mi tím',
    icon: '🧑‍💼',
    unlock: 8,
    price: 6000,
    options: {
      bodyColor: 0x6c5ce7,
      hasGlasses: true,
    },
  },
  {
    id: 'do_yoga',
    name: 'Đồ yoga',
    icon: '🧘',
    unlock: 12,
    price: 15000,
    options: {
      bodyColor: 0x9b59b6,
      hatColor: 0x9b59b6,
      hasGlasses: false,
    },
  },
  {
    id: 'ao_khoac_den',
    name: 'Áo khoác đen',
    icon: '🧥',
    unlock: 12,
    price: 10000,
    options: {
      bodyColor: 0x2d3436,
      hatColor: 0x2d3436,
      hasGlasses: true,
    },
  },
  {
    id: 'ao_ba_ba',
    name: 'Áo bà ba',
    icon: '👘',
    unlock: 18,
    price: 15000,
    options: {
      bodyColor: 0x8b5e34,
      hasGlasses: false,
    },
  },
  {
    id: 'do_cong_so',
    name: 'Đồ công sở',
    icon: '👔',
    unlock: 25,
    price: 22000,
    options: {
      bodyColor: 0x34495e,
      hasGlasses: true,
    },
  },
  {
    id: 'ao_dai',
    name: 'Áo dài ngọc bích',
    icon: '👘',
    unlock: 32,
    price: 32000,
    options: {
      bodyColor: 0x1abc9c,
      hasGlasses: false,
    },
  },
  {
    id: 'trang_phuc_dau_bep',
    name: 'Đầu bếp',
    icon: '👨‍🍳',
    unlock: 40,
    price: 45000,
    options: {
      bodyColor: 0xf5f6fa,
      hatColor: 0xffffff,
      hasGlasses: false,
    },
  },
  {
    id: 'trang_phuc_hoang_gia',
    name: 'Trang phục hoàng gia',
    icon: '👑',
    unlock: 50,
    price: 80000,
    options: {
      bodyColor: 0x8e44ad,
      hatColor: 0xf1c40f,
      hasGlasses: false,
    },
  },
  {
    id: 'trang_phuc_huyen_thoai',
    name: 'Trang phục huyền thoại',
    icon: '⭐',
    unlock: 60,
    price: 120000,
    options: {
      bodyColor: 0xe67e22,
      hatColor: 0xe74c3c,
      hasGlasses: false,
    },
  },
  // ──────────────────────────────────────────────
  // TRANG PHỤC MỚI (15 bộ – mở rộng từ 11 lên 26)
  // ──────────────────────────────────────────────
  {
    id: 'dong_phuc_hoc_sinh',
    name: 'Đồng phục học sinh',
    icon: '🎒',
    unlock: 3,
    price: 2000,
    options: {
      bodyColor: 0xf5f5f5,
      hatColor: 0xf1c40f,
      hasGlasses: false,
    },
  },
  {
    id: 'ao_polo_tre_trung',
    name: 'Áo polo trẻ trung',
    icon: '👕',
    unlock: 7,
    price: 7000,
    options: {
      bodyColor: 0x00b894,
      hasGlasses: false,
    },
  },
  {
    id: 'dong_phuc_sinh_vien',
    name: 'Đồng phục sinh viên',
    icon: '📖',
    unlock: 8,
    price: 5000,
    options: {
      bodyColor: 0xecf0f1,
      hatColor: 0x3498db,
      hasGlasses: false,
    },
  },
  {
    id: 'trang_phuc_mua_he',
    name: 'Đồ mùa hè',
    icon: '🌊',
    unlock: 9,
    price: 8000,
    options: {
      bodyColor: 0x74b9ff,
      hasGlasses: false,
    },
  },
  {
    id: 'ao_hoodie_do_thi',
    name: 'Áo hoodie đô thị',
    icon: '🧥',
    unlock: 10,
    price: 12000,
    options: {
      bodyColor: 0x636e72,
      hasGlasses: false,
    },
  },
  {
    id: 'do_bao_ho_ld',
    name: 'Đồ bảo hộ lao động',
    icon: '🦺',
    unlock: 6,
    price: 8000,
    options: {
      bodyColor: 0xe67e22,
      hatColor: 0xf39c12,
      hasGlasses: true,
    },
  },
  {
    id: 'trang_phuc_the_thao_den',
    name: 'Đồ thể thao đen',
    icon: '⚽',
    unlock: 14,
    price: 18000,
    options: {
      bodyColor: 0x2d3436,
      hatColor: 0x636e72,
      hasGlasses: false,
    },
  },
  {
    id: 'ao_ba_ba_nam',
    name: 'Áo bà ba Nam',
    icon: '👔',
    unlock: 15,
    price: 20000,
    options: {
      bodyColor: 0x2d3436,
      hasGlasses: false,
    },
  },
  {
    id: 'ao_so_mi_cs_nu',
    name: 'Áo sơ mi công sở nữ',
    icon: '👚',
    unlock: 15,
    price: 18000,
    options: {
      bodyColor: 0xffffff,
      hasGlasses: true,
    },
  },
  {
    id: 'ao_dai_hue_tim',
    name: 'Áo dài Huế tím',
    icon: '🌸',
    unlock: 20,
    price: 28000,
    options: {
      bodyColor: 0x9b59b6,
      hasGlasses: false,
    },
  },
  {
    id: 'do_hoa_si',
    name: 'Đồ họa sĩ',
    icon: '🎨',
    unlock: 22,
    price: 25000,
    options: {
      bodyColor: 0x2c3e50,
      hasGlasses: true,
    },
  },
  {
    id: 'trang_phuc_dong',
    name: 'Áo khoác mùa đông',
    icon: '🧣',
    unlock: 28,
    price: 35000,
    options: {
      bodyColor: 0xd63031,
      hatColor: 0xd63031,
      hasGlasses: false,
    },
  },
  {
    id: 'trang_phuc_van_phong_nam',
    name: 'Vest nam lịch lãm',
    icon: '💼',
    unlock: 35,
    price: 50000,
    options: {
      bodyColor: 0x34495e,
      hatColor: 0x2c3e50,
      hasGlasses: true,
    },
  },
  {
    id: 'vest_cong_so',
    name: 'Vest công sở',
    icon: '🤵',
    unlock: 45,
    price: 60000,
    options: {
      bodyColor: 0x1a1a2e,
      hasGlasses: true,
    },
  },
  {
    id: 'ao_dai_truyen_thong',
    name: 'Áo dài truyền thống',
    icon: '👘',
    unlock: 38,
    price: 42000,
    options: {
      bodyColor: 0xd63031,
      hasGlasses: false,
    },
  },
  // ──────────────────────────────────────────────
  // BIẾN THỂ GIỚI TÍNH (gender đổi kiểu tóc cho archetype trung tính)
  // ──────────────────────────────────────────────
  {
    id: 'nu_chu_tiem',
    name: 'Nữ — Chị chủ tiệm',
    icon: '👩‍🌾',
    unlock: 14,
    price: 15000,
    options: {
      gender: 'female',
      bodyColor: 0xfd79a8,
      hairColor: 0x6e472e,
      hasGlasses: false,
    },
  },
  {
    id: 'nu_cong_so',
    name: 'Nữ — Đồ công sở',
    icon: '👩‍💼',
    unlock: 26,
    price: 30000,
    options: {
      gender: 'female',
      bodyColor: 0x00cec9,
      hairColor: 0x1a1e24,
      hasGlasses: true,
    },
  },
  {
    id: 'nam_ba_ba_trang',
    name: 'Nam — Áo bà ba trắng',
    icon: '👨',
    unlock: 24,
    price: 26000,
    options: {
      gender: 'male',
      bodyColor: 0xf5f6fa,
      hatColor: 0xf5f6fa,
      hasGlasses: false,
    },
  },
];

/**
 * Trang phục NG+ độc quyền — chỉ mở khi đã tái sinh đủ số lần (prestige.level ≥ N) và đạt cấp.
 * Giữ lại qua mọi vòng NG+ (bộ sưu tập tài khoản được prestigeRestart bảo toàn), là mồi chạy thêm vòng.
 */
export const PRESTIGE_COSTUMES: Costume[] = [
  {
    id: 'ao_thuong_gia_vang',
    name: 'Áo thương gia vàng',
    icon: '👑',
    unlock: 60,
    price: 5000000,
    prestige: 1,
    options: { bodyColor: 0xc9a227, hasGlasses: false },
  },
  {
    id: 'ao_truong_lao_do_dai',
    name: 'Trưởng lão đỏ (đạo bào)',
    icon: '🧧',
    unlock: 60,
    price: 12000000,
    prestige: 2,
    options: { bodyColor: 0xb03a2e, hasGlasses: false },
  },
  {
    id: 'ao_vua_ho',
    name: 'Hoàng bào (áo vua)',
    icon: '🐉',
    unlock: 60,
    price: 30000000,
    prestige: 3,
    options: { bodyColor: 0xf1c40f, hatColor: 0xe74c3c, hasGlasses: false },
  },
  {
    id: 'ao_tieu_phi_hop_tin',
    name: 'Bộ hợp kim thể thao',
    icon: '🌌',
    unlock: 60,
    price: 80000000,
    prestige: 5,
    options: { bodyColor: 0x2c3e50, hatColor: 0x16a085, hasGlasses: true },
  },
];

/**
 * Lọc các bộ trang phục đã mở khóa theo cấp và số lần tái sinh hiện tại của người chơi.
 * @param level Cấp (level) hiện tại của nhân vật chính.
 * @param prestige Số lần tái sinh đã thực hiện (prestige.level).
 */
export function costumesFor(level: number, prestige = 0): Costume[] {
  return [...COSTUMES, ...PRESTIGE_COSTUMES].filter((c) => c.unlock <= level && (c.prestige ?? 0) <= prestige);
}

/**
 * Tìm một bộ trang phục theo id (bao gồm cả NG+).
 * @param id Định danh của bộ trang phục.
 * @returns Costume tương ứng hoặc undefined nếu không tìm thấy.
 */
export function costumeById(id: string): Costume | undefined {
  return COSTUMES.find((c) => c.id === id) ?? PRESTIGE_COSTUMES.find((c) => c.id === id);
}
