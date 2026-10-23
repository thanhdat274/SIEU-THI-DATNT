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
];

/**
 * Lọc các bộ trang phục đã mở khóa theo cấp hiện tại của người chơi.
 * @param level Cấp (level) hiện tại của nhân vật chính.
 */
export function costumesFor(level: number): Costume[] {
  return COSTUMES.filter((c) => c.unlock <= level);
}

/**
 * Tìm một bộ trang phục theo id.
 * @param id Định danh của bộ trang phục.
 * @returns Costume tương ứng hoặc undefined nếu không tìm thấy.
 */
export function costumeById(id: string): Costume | undefined {
  return COSTUMES.find((c) => c.id === id);
}
