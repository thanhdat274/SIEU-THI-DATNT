import type { Furniture } from '../core/gameTypes';
import { isWeekend } from './calendar';

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

// GĐ1538 — giờ tối (từ 18h) dân xóm đi làm về: máy bán nước và ghế mát-xa đông khách,
// phí lượt ×1,5. Chỉ từ cấp 35 (> golden 30) để nhịp đầu game không đổi.
export const NIGHT_FEE_LEVEL = 35;
export const NIGHT_FEE_START = 18 * 60;
const NIGHT_MACHINES: ReadonlySet<string> = new Set(['vending_drink', 'massage_chair']);

/** Phí một lượt theo giờ trong ngày và cấp tiệm. */
export function machineFeeAt(type: Furniture['type'], minutes: number, level: number, day?: number): number {
  // GĐ1541 — cuối tuần trẻ con theo bố mẹ đi chợ: máy gắp thú ×1,5 (cấp ≥ NIGHT_FEE_LEVEL).
  if (type === 'claw_machine' && day !== undefined && level >= NIGHT_FEE_LEVEL && isWeekend(day)) return Math.round(machineFee(type) * 1.5);
  const base = machineFee(type);
  if (level < NIGHT_FEE_LEVEL || minutes < NIGHT_FEE_START || !NIGHT_MACHINES.has(type)) return base;
  return Math.round(base * 1.5);
}

/** GĐ1539 — dòng thông tin khi cầm/dời máy thu phí ở chế độ xây: phí/lượt và số lượt hoàn vốn. */
export function machinePopupLine(type: Furniture['type'], earned?: number): string | null {
  if (!isMachine(type)) return null;
  const t = MACHINE_TYPES[type];
  const night = NIGHT_MACHINES.has(type) ? ' · tối ×1,5' : '';
  return `${t.icon} ${t.fee.toLocaleString('vi-VN')}đ/lượt · hoàn vốn ~${Math.round(t.price / t.fee)} lượt${night}${earned ? ` · đã thu ${earned.toLocaleString('vi-VN')}đ` : ''}`;
}
