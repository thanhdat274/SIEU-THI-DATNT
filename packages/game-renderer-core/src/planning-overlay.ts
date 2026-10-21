/**
 * planning-overlay.ts — hình học bóng mờ giữ chỗ quy hoạch của người khác (OpenSpec `open-world-coop-land` 1.3).
 * THUẦN (không Pixi): đổi một giữ chỗ từ snapshot thành các hộp px thế giới + nhãn + màu, để `viewport.ts` chỉ việc vẽ và test được.
 */
import { RECLAMATION_WAVES, resolveParcel } from '@game/data';
import type { PlanningReservationSnapshot } from '@game/shared';

const TILE = 32;

export interface PlanningBox { x: number; y: number; w: number; h: number }
export interface PlanningOverlay { accountId: string; label: string; color: number; boxes: PlanningBox[]; labelAt: { x: number; y: number } }

/** Màu ổn định theo tài khoản (cùng người luôn cùng màu), tránh trùng màu xanh/cam của lớp QA. */
const PALETTE = [0xe84a8a, 0x8a5cf5, 0x00b8c4, 0xf2a900, 0xe8553a, 0x4aa86a] as const;
export function planningColorFor(accountId: string): number {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) hash = (hash * 31 + accountId.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const rectBox = (r: { x0: number; y0: number; x1: number; y1: number }): PlanningBox => ({ x: r.x0 * TILE, y: r.y0 * TILE, w: (r.x1 - r.x0 + 1) * TILE, h: (r.y1 - r.y0 + 1) * TILE });

/** Hộp bao thế giới của một giữ chỗ; bỏ qua lô/đợt không tồn tại. Giữ chỗ của chính mình (`selfAccountId`) không vẽ. */
export function planningOverlays(list: readonly PlanningReservationSnapshot[] | undefined, selfAccountId: string | null | undefined, now = Date.now()): PlanningOverlay[] {
  const out: PlanningOverlay[] = [];
  for (const reservation of list ?? []) {
    if (reservation.accountId === selfAccountId || reservation.expiresAt <= now) continue;
    const boxes: PlanningBox[] = [];
    const t = reservation.targets;
    if (t.kind === 'tiles') {
      for (const tile of t.tiles) boxes.push({ x: tile.x * TILE, y: tile.y * TILE, w: TILE, h: TILE });
    } else if (t.kind === 'parcels') {
      for (const id of t.parcelIds) { const parcel = resolveParcel(id); if (parcel) boxes.push(rectBox(parcel.rect)); }
    } else if (t.kind === 'placement') {
      const parcel = resolveParcel(t.placement.parcelId);
      if (parcel) boxes.push(rectBox(parcel.rect));
    } else if (t.kind === 'wave') {
      const wave = RECLAMATION_WAVES.find(item => item.id === t.waveId);
      if (wave) boxes.push(rectBox(wave.region));
    }
    if (!boxes.length) continue;
    const top = boxes.reduce((best, box) => (box.y < best.y || (box.y === best.y && box.x < best.x) ? box : best), boxes[0]);
    out.push({
      accountId: reservation.accountId,
      label: `${reservation.name ?? reservation.accountId} đang quy hoạch`,
      color: planningColorFor(reservation.accountId),
      boxes,
      labelAt: { x: top.x + 2, y: Math.max(0, top.y - 16) },
    });
  }
  return out;
}

/** Chữ ký để chỉ vẽ lại khi nội dung đổi (gia hạn chỉ đổi `expiresAt` thì không vẽ lại). */
export function planningOverlaySignature(overlays: readonly PlanningOverlay[]): string {
  return overlays.map(o => `${o.accountId}|${o.label}|${o.boxes.map(b => `${b.x},${b.y},${b.w},${b.h}`).join(';')}`).join('#');
}
