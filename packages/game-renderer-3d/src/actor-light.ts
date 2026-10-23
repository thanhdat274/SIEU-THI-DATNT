import { lightingAt, type SkyLighting } from './sky-3d';

export interface LightTint { r: number; g: number; b: number }

/** Tối thiểu mỗi kênh: người/xe không bao giờ đen hẳn ban đêm. */
const TINT_FLOOR = 0.22;
const WHITE: LightTint = { r: 1, g: 1, b: 1 };

const channels = (c: number): [number, number, number] => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

/** Ánh sáng nền (đèn hemi) của cảnh, chưa chuẩn hoá. Chỉ dùng hemi: nắng chỉ đổi theo góc nên không làm người tối đi giữa ngày. */
function surfaceLight(l: SkyLighting): [number, number, number] {
  const h = channels(l.hemiColor);
  return [h[0] * l.hemiIntensity, h[1] * l.hemiIntensity, h[2] * l.hemiIntensity];
}

const NOON = surfaceLight(lightingAt(12, 0, 1, 0));

/**
 * Màu nhân cho sprite người / xe: ánh sáng cảnh hiện tại chia cho ánh sáng trưa trời quang (= 1, màu gốc).
 * Đêm tối và ngả xanh như mặt đất, mưa xám/tối hơn. Hàm thuần.
 */
export function actorLightTint(l: SkyLighting): LightTint {
  const raw = surfaceLight(l);
  const [r, g, b] = raw.map((v, i) => Math.max(TINT_FLOOR, Math.min(1, v / NOON[i])));
  return { r, g, b };
}

export const NEUTRAL_TINT: LightTint = WHITE;

export function sameTint(a: LightTint, b: LightTint): boolean {
  return Math.abs(a.r - b.r) < 1e-3 && Math.abs(a.g - b.g) < 1e-3 && Math.abs(a.b - b.b) < 1e-3;
}
