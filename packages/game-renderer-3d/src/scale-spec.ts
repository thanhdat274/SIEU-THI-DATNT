/**
 * scale-spec.ts
 * Nguồn chân lý duy nhất (Single Source of Truth) định nghĩa kích thước mục tiêu
 * và hàm tính toán tỉ lệ scale đều (uniform scale) cho toàn bộ đối tượng 3D trong renderer.
 *
 * Mốc chuẩn: Chiều cao cửa tiệm / tầng trệt D = 1.6 đơn vị thế giới.
 */

/** Chiều cao cửa tiệm / tầng tường D làm mốc chuẩn (đơn vị thế giới) */
export const DOOR_HEIGHT_D = 1.6;

/** Kích thước mục tiêu theo đơn vị thế giới */
export const SCALE_TARGETS = {
  /** Chiều cao mốc cửa tiệm D */
  door: DOOR_HEIGHT_D,

  /** Người lớn: 0.80 * D = 1.28 */
  adultPlayer: 0.80 * DOOR_HEIGHT_D, // 1.28
  /** Trẻ em / khách nhỏ (nếu có): 0.60 * D = 0.96 */
  childPlayer: 0.60 * DOOR_HEIGHT_D, // 0.96

  /** Xe máy: dài 0.95 * D = 1.52, cao 0.55 * D = 0.88 */
  motorbike: {
    length: 0.95 * DOOR_HEIGHT_D, // 1.52
    height: 0.55 * DOOR_HEIGHT_D, // 0.88
    width: 0.28 * DOOR_HEIGHT_D, // ~0.45
    /** Người lái xe máy ngồi trên, đỉnh đầu ≈ 0.95 * D = 1.52 */
    riderHeadY: 0.95 * DOOR_HEIGHT_D, // 1.52
  },

  /** Ô tô / xe cơ giới */
  car: {
    /** Sedan: dài 2.0 * D = 3.2, cao 0.75 * D = 1.20 */
    sedan: {
      length: 2.0 * DOOR_HEIGHT_D, // 3.20
      height: 0.75 * DOOR_HEIGHT_D, // 1.20
    },
    /** SUV: dài ~2.1 * D, cao 0.90 * D = 1.44 */
    suv: {
      length: 2.1 * DOOR_HEIGHT_D, // 3.36
      height: 0.90 * DOOR_HEIGHT_D, // 1.44
    },
    /** Taxi: dài ~2.15 * D, cao 0.85 * D = 1.36 */
    taxi: {
      length: 2.15 * DOOR_HEIGHT_D, // 3.44
      height: 0.85 * DOOR_HEIGHT_D, // 1.36
    },
    /** Van: dài ~2.2 * D, cao 0.90 * D = 1.44 */
    van: {
      length: 2.2 * DOOR_HEIGHT_D, // 3.52
      height: 0.90 * DOOR_HEIGHT_D, // 1.44
    },
    /** Xe tải / xe giao hàng logistics: dài 2.6 * D = 4.16, cao 1.20 * D = 1.92 */
    truck: {
      length: 2.6 * DOOR_HEIGHT_D, // 4.16
      height: 1.20 * DOOR_HEIGHT_D, // 1.92
    },
    delivery: {
      length: 2.6 * DOOR_HEIGHT_D, // 4.16
      height: 1.20 * DOOR_HEIGHT_D, // 1.92
    },
    ambulance: {
      length: 2.6 * DOOR_HEIGHT_D, // 4.16
      height: 1.20 * DOOR_HEIGHT_D, // 1.92
    },
    police: {
      length: 2.3 * DOOR_HEIGHT_D, // 3.68
      height: 0.78 * DOOR_HEIGHT_D, // 1.25
    },
  },

  /** Đèn đường: 1.70 * D = 2.72 */
  streetLamp: 1.70 * DOOR_HEIGHT_D, // 2.72

  /** Cây xanh: 1.50 - 2.20 * D = 2.40 - 3.52 (ổn định theo seed/id) */
  treeMin: 1.50 * DOOR_HEIGHT_D, // 2.40
  treeMax: 2.20 * DOOR_HEIGHT_D, // 3.52

  /** Nội thất & Thiết bị */
  fixtures: {
    /** Kệ gondola: 0.75 * D = 1.20 */
    gondola: 0.75 * DOOR_HEIGHT_D, // 1.20
    /** Kệ kho (pallet rack): 1.10 * D = 1.76 */
    warehouseRack: 1.10 * DOOR_HEIGHT_D, // 1.76
    /** Quầy thu ngân: 0.45 * D = 0.72 */
    counter: 0.45 * DOOR_HEIGHT_D, // 0.72
    /** Tủ lạnh / tủ mát: 0.90 * D = 1.44 */
    fridge: 0.90 * DOOR_HEIGHT_D, // 1.44
  },

  /** Bộ kit chi tiết tòa (kit/): kích thước chuẩn theo D */
  kit: {
    /** Lối cửa: rộng 0.56 * D = 0.90, cao = D trừ lanh tô 0.45 của mặt tiền (tường cao D) = 1.15 */
    doorWidth: 0.56 * DOOR_HEIGHT_D, // 0.90
    doorHeight: DOOR_HEIGHT_D - 0.45, // 1.15
    /** Bề dày khung cửa/cửa sổ: 0.045 * D = 0.07; bề sâu khung cửa 0.1 * D = 0.16 */
    frameThickness: 0.045 * DOOR_HEIGHT_D, // 0.072
    frameDepth: 0.1 * DOOR_HEIGHT_D, // 0.16
    /** Cửa sổ mặt tiền: rộng 0.56 * D, cao 0.44 * D; bậu đặt cao 0.31 * D so với sàn */
    windowWidth: 0.56 * DOOR_HEIGHT_D, // 0.90
    windowHeight: 0.44 * DOOR_HEIGHT_D, // 0.70
    windowSillHeight: 0.31 * DOOR_HEIGHT_D, // 0.50
    /** Trụ góc: cạnh 0.09 * D = 0.14 */
    postSize: 0.09 * DOOR_HEIGHT_D, // 0.144
    /** Phào chân tường cao 0.0625 * D = 0.10; phào trần cao 0.05 * D = 0.08 */
    baseboardHeight: 0.0625 * DOOR_HEIGHT_D, // 0.10
    corniceHeight: 0.05 * DOOR_HEIGHT_D, // 0.08
  },

  /** Phụ kiện đính kèm người */
  accessories: {
    /** Bán kính bóng chân tỉ lệ theo người: ~0.24 đơn vị */
    actorShadowRadius: 0.24,
    /** Bán kính ô che mưa 3D: ~0.36 đơn vị */
    umbrellaRadius: 0.36,
    /** Đường kính nón lá 3D: ~0.42 đơn vị */
    nonLaDiameter: 0.42,
    nonLaHeight: 0.14,
  },
} as const;

/**
 * Tùy chọn bù đầu to Chibi của Mini Characters (mặc định tắt per User Request).
 * KHÔNG bóp méo mesh.
 */
export const characterHeadCompensation = false;

export interface BoundingBoxDimensions {
  width: number;
  height: number;
  length: number;
}

/**
 * Tính hệ số scale ĐỀU (uniform scale factor) từ bounding box gốc
 * sao cho chiều cao (hoặc chiều dài) khớp chính xác mục tiêu mà KHÔNG làm méo mô hình.
 *
 * @param originalDim Kích thước thật đo từ bounding box của model gốc (chưa scale)
 * @param targetDim Kích thước mục tiêu mong muốn
 * @param matchAxis Trục ưu tiên khớp: 'height' (mặc định cho người, cây, nội thất) hoặc 'length' (cho xe)
 */
export function calculateUniformScale(
  originalDim: BoundingBoxDimensions,
  targetValue: number,
  matchAxis: 'height' | 'length' = 'height'
): number {
  const original = matchAxis === 'length' ? originalDim.length : originalDim.height;
  if (!original || original <= 0) return 1.0;
  return targetValue / original;
}

/**
 * Tính chiều cao cây ngẫu nhiên ổn định theo seed hoặc id trong khoảng [treeMin, treeMax]
 */
export function resolveTreeHeightForId(id: string | number): number {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const ratio = (hash % 1000) / 1000;
  return SCALE_TARGETS.treeMin + ratio * (SCALE_TARGETS.treeMax - SCALE_TARGETS.treeMin);
}
