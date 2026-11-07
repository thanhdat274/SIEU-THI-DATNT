import type { Furniture } from '../core/gameTypes';

// ─────────────────────────────────────────────────────────────────────────────
// GĐ1493 — máy tự phục vụ thu phí mỗi lượt (đặt được như nội thất, không cần
// nhân viên): ~15% khách mới ghé máy trống chơi 1 lượt rồi vẫn vào mua hàng.
// Cân bằng: giá máy ≈ phí/lượt × ~100 (hoàn vốn ~100 lượt, đối chiếu máy thu phí
// của khu ăn uống tham khảo — máy gắp thú 1.500/+15 = đúng 100 lượt).
// ─────────────────────────────────────────────────────────────────────────────

/** Tỉ lệ khách mới ghé chơi một máy đang trống. */
export const MACHINE_VISIT_CHANCE = 0.15;
/** Một lượt dùng máy kéo dài bao nhiêu giây game. */
export const MACHINE_USE_SECONDS = 6;

export type MachineId = 'vending_drink' | 'scale_machine' | 'claw_machine' | 'massage_chair';

export const MACHINE_TYPES: Record<MachineId, { name: string; price: number; fee: number; icon: string }> = {
  vending_drink: { name: 'Máy bán nước tự động', price: 120_000, fee: 1_200, icon: '🥤' },
  scale_machine: { name: 'Máy cân sức khỏe', price: 100_000, fee: 1_000, icon: '⚖️' },
  claw_machine: { name: 'Máy gắp thú', price: 180_000, fee: 1_800, icon: '🧸' },
  // GĐ1537 — ghế mát-xa chân (cấp 38): đắt hơn, phí cao hơn, vẫn hoàn vốn ~100 lượt.
  massage_chair: { name: 'Ghế mát-xa chân', price: 240_000, fee: 2_400, icon: '💆' },
};

export const isMachine = (type: string): type is MachineId => type in MACHINE_TYPES;

/** Phí mỗi lượt của một máy đã đặt (đọc từ bảng, không từ instance). */
export const machineFee = (type: Furniture['type']): number =>
  MACHINE_TYPES[type as MachineId]?.fee ?? 0;

/**
 * Tìm một máy đang trống để khách ghé chơi (duyệt theo thứ tự đặt — máy gần cửa
 * tự nhiên được ghé trước vì khách đi vào từ cửa). Trả null khi mọi máy đều bận.
 */
export function freeMachine(furniture: Furniture[], busyUids: ReadonlySet<number>): Furniture | null {
  for (const f of furniture) {
    if (!isMachine(f.type) || f.broken) continue;
    if (!busyUids.has(f.uid)) return f;
  }
  return null;
}
