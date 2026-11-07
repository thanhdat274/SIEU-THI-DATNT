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

export type MachineId = 'vending_drink' | 'scale_machine' | 'claw_machine' | 'massage_chair' | 'shoe_shine' | 'cotton_candy' | 'photo_booth';

export const MACHINE_TYPES: Record<MachineId, { name: string; price: number; fee: number; icon: string }> = {
  vending_drink: { name: 'Máy bán nước tự động', price: 120_000, fee: 1_200, icon: '🥤' },
  scale_machine: { name: 'Máy cân sức khỏe', price: 100_000, fee: 1_000, icon: '⚖️' },
  claw_machine: { name: 'Máy gắp thú', price: 180_000, fee: 1_800, icon: '🧸' },
  // GĐ1537 — ghế mát-xa chân (cấp 38): đắt hơn, phí cao hơn, vẫn hoàn vốn ~100 lượt.
  massage_chair: { name: 'Ghế mát-xa chân', price: 240_000, fee: 2_400, icon: '💆' },
  // GĐ1547 — máy đánh giày (cấp 42), hoàn vốn 100 lượt.
  shoe_shine: { name: 'Máy đánh giày', price: 200_000, fee: 2_000, icon: '👞' },
  // GĐ1548 — máy kẹo bông (cấp 46), hoàn vốn 100 lượt.
  cotton_candy: { name: 'Máy kẹo bông', price: 250_000, fee: 2_500, icon: '🍭' },
  // GĐ1551 — máy chụp ảnh lấy liền (cấp 50), hoàn vốn 100 lượt.
  photo_booth: { name: 'Máy chụp ảnh lấy liền', price: 300_000, fee: 3_000, icon: '📸' },
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
  // GĐ1541 — cuối tuần trẻ con theo bố mẹ đi chợ: máy gắp thú ×1,5 (cấp ≥ NIGHT_FEE_LEVEL); GĐ1549 thêm máy kẹo bông.
  if ((type === 'claw_machine' || type === 'cotton_candy') && day !== undefined && level >= NIGHT_FEE_LEVEL && isWeekend(day)) return Math.round(machineFee(type) * 1.5);
  const base = machineFee(type);
  if (level < NIGHT_FEE_LEVEL || minutes < NIGHT_FEE_START || !NIGHT_MACHINES.has(type)) return base;
  return Math.round(base * 1.5);
}

/** GĐ1539 — dòng thông tin khi cầm/dời máy thu phí ở chế độ xây: phí/lượt và số lượt hoàn vốn. */
export function machinePopupLine(type: Furniture['type'], earned?: number): string | null {
  if (!isMachine(type)) return null;
  const t = MACHINE_TYPES[type];
  const night = NIGHT_MACHINES.has(type) ? ' · tối ×1,5' : type === 'claw_machine' || type === 'cotton_candy' ? ' · cuối tuần ×1,5' : '';
  return `${t.icon} ${t.fee.toLocaleString('vi-VN')}đ/lượt · hoàn vốn ~${Math.round(t.price / t.fee)} lượt${night}${earned ? ` · đã thu ${earned.toLocaleString('vi-VN')}đ` : ''}`;
}

// GĐ1544 — chơi máy xong khách vui, hay mua thêm một món: cấp ≥40, 30% thêm 1 món muốn mua.
export const MACHINE_IMPULSE_LEVEL = 40;
export const MACHINE_IMPULSE_CHANCE = 0.3;
export const machineImpulse = (level: number, roll: number): boolean =>
  level >= MACHINE_IMPULSE_LEVEL && roll < MACHINE_IMPULSE_CHANCE;

// GĐ1564 — dòng "máy thu phí hôm nay" tách từ stats.byService (vốn gộp chung với dịch vụ khác).
export function machineDayLine(byService: Record<string, number> | undefined): string | null {
  const rows = Object.entries(byService ?? {}).filter(([id, v]) => isMachine(id) && v > 0).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  const total = rows.reduce((n, [, v]) => n + v, 0);
  return `🎰 Máy thu phí hôm nay: ${total.toLocaleString('vi-VN')}đ (${rows.map(([id, v]) => `${MACHINE_TYPES[id as MachineId].icon} ${v.toLocaleString('vi-VN')}đ`).join(' · ')})`;
}

/** GĐ1565 — tổng phí máy trong ngày (cho dòng "trong đó máy thu phí" ở Tổng kết ngày). */
export const machineDayTotal = (byService: Record<string, number> | undefined): number =>
  Object.entries(byService ?? {}).reduce((n, [id, v]) => n + (isMachine(id) ? v : 0), 0);

// GĐ1566 — máy gắp thú thỉnh thoảng gắp trúng (~1/20 lượt, cấp ≥44): chỉ bong bóng vui, không đụng tiền.
// Băm theo máy/ngày/phút — không rút RNG nên chuỗi mô phỏng không đổi.
export const CLAW_WIN_LEVEL = 44;
export const clawWin = (type: string, level: number, uid: number, day: number, minutes: number): boolean =>
  type === 'claw_machine' && level >= CLAW_WIN_LEVEL && (uid * 7 + day * 31 + Math.floor(minutes)) % 20 === 0;

// GĐ1567 — từ 14h, máy đã đặt (không hỏng) mà hôm nay chưa thu đồng nào: gợi ý dời gần cửa.
export function idleMachineHint(furniture: Furniture[], byService: Record<string, number> | undefined, minutes: number): string | null {
  if (minutes < 14 * 60) return null;
  const idle = [...new Set(furniture.filter((f) => isMachine(f.type) && !f.broken && !(byService?.[f.type] ?? 0)).map((f) => f.type as MachineId))];
  if (!idle.length) return null;
  return `💤 Chưa ai chơi hôm nay: ${idle.map((t) => MACHINE_TYPES[t].icon + ' ' + MACHINE_TYPES[t].name).join(', ')} — thử dời gần cửa ra vào`;
}
