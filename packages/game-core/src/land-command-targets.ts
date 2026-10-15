/**
 * land-command-targets.ts — ánh xạ lệnh đất sang vùng quy hoạch (OpenSpec `open-world-coop-land`, 1.2).
 *
 * THUẦN: chỉ đọc payload lệnh, trả danh sách `PlanningTargets` mà lệnh đó đụng tới. Server dùng nó để từ chối
 * lệnh đụng giữ chỗ của người khác (`reserved_by_other`); lệnh không phải lệnh đất trả mảng rỗng.
 */
import type { PlanningTargets } from './planning-reservation';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 64;
const tile = (value: unknown): value is { x: number; y: number } => isRecord(value) && Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y);

function placementTarget(buildingId: unknown, placement: unknown): PlanningTargets | null {
  if (!isRecord(placement) || !str(placement.parcelId) || !Number.isSafeInteger(placement.originX)) return null;
  return { kind: 'placement', placement: { buildingId: str(buildingId) ? buildingId : '', parcelId: placement.parcelId, originX: placement.originX as number } };
}

function targetOf(action: unknown): PlanningTargets | null {
  if (!isRecord(action)) return null;
  switch (action.type) {
    case 'reclaim_wave': return str(action.waveId) ? { kind: 'wave', waveId: action.waveId } : null;
    case 'buy_parcel':
    case 'lease_parcel':
    case 'open_building': return str(action.parcelId) ? { kind: 'parcels', parcelIds: [action.parcelId] } : null;
    case 'buy_plot':
    case 'relocate_building': return placementTarget(action.plotId ?? action.buildingId, action.placement);
    case 'expand_footprint': return Array.isArray(action.tiles) && action.tiles.every(tile) ? { kind: 'tiles', tiles: (action.tiles as Array<{ x: number; y: number }>).map(t => ({ x: t.x, y: t.y })) } : null;
    default: return null;
  }
}

/** Các vùng đất mà lệnh (hoặc từng thao tác của `layout_batch`) đụng tới; rỗng nếu không phải lệnh đất. */
export function landCommandTargets(payload: unknown): PlanningTargets[] {
  if (!isRecord(payload)) return [];
  if (payload.type === 'layout_batch') {
    if (!Array.isArray(payload.actions)) return [];
    return payload.actions.map(targetOf).filter((target): target is PlanningTargets => target !== null);
  }
  const single = targetOf(payload);
  return single ? [single] : [];
}

/** Kiểm dữ liệu giữ chỗ từ client (không tin): trả `PlanningTargets` sạch, đã giới hạn kích thước, hoặc null nếu sai dạng. */
export const MAX_RESERVED_TILES = 400;
export const MAX_RESERVED_PARCELS = 8;
export function parsePlanningTargets(input: unknown): PlanningTargets | null {
  if (!isRecord(input)) return null;
  switch (input.kind) {
    case 'tiles':
      return Array.isArray(input.tiles) && input.tiles.length > 0 && input.tiles.length <= MAX_RESERVED_TILES && input.tiles.every(tile)
        ? { kind: 'tiles', tiles: (input.tiles as Array<{ x: number; y: number }>).map(t => ({ x: t.x, y: t.y })) } : null;
    case 'parcels':
      return Array.isArray(input.parcelIds) && input.parcelIds.length > 0 && input.parcelIds.length <= MAX_RESERVED_PARCELS && input.parcelIds.every(str)
        ? { kind: 'parcels', parcelIds: [...(input.parcelIds as string[])] } : null;
    case 'placement': {
      const target = isRecord(input.placement) ? placementTarget(input.placement.buildingId, input.placement) : null;
      return target;
    }
    case 'wave': return str(input.waveId) ? { kind: 'wave', waveId: input.waveId } : null;
    default: return null;
  }
}
