import type { BuildingInterior, InteriorSpec } from './building-registry';
import type { RoofInfo } from './map-builder';

/** Dựng vỏ trong khi camera cách tâm tòa không quá số ô này (dựng sẵn để lần bóc mái đầu không bị khựng). */
export const INTERIOR_BUILD_RADIUS = 20;
/** Giải phóng vỏ trong khi camera xa hơn số ô này và mái đã đậy (xa hơn bán kính dựng để không dựng/hủy liên tục). */
export const INTERIOR_DISPOSE_RADIUS = 36;
/** Mái có độ đục dưới ngưỡng này (đang bóc hoặc đã bóc) thì vỏ trong được hiện. */
export const INTERIOR_SHOW_BELOW_ROOF_ALPHA = 0.999;
/** Cường độ đèn đêm trên ngưỡng này thì bóng đèn trong nhà sáng (cùng ngưỡng cửa sổ đêm của map-builder). */
export const INTERIOR_NIGHT_LAMPS_ON = 0.3;

export interface InteriorDecisionInput {
  built: boolean;
  roofAlpha: number;
  /** Khoảng cách (ô) từ tiêu điểm camera tới tâm vỏ trong. */
  distance: number;
}

export interface InteriorDecision {
  build: boolean;
  dispose: boolean;
  show: boolean;
}

/**
 * Quyết định vòng đời vỏ trong: dựng khi gần hoặc đã bóc mái; hiện chỉ khi mái đang mờ; giải phóng khi ở xa và mái đã đậy.
 * Thuần, không cần WebGL.
 */
export function decideInterior({ built, roofAlpha, distance }: InteriorDecisionInput): InteriorDecision {
  const peeled = roofAlpha < INTERIOR_SHOW_BELOW_ROOF_ALPHA;
  if (!built) return { build: peeled || distance <= INTERIOR_BUILD_RADIUS, dispose: false, show: false };
  const dispose = !peeled && distance > INTERIOR_DISPOSE_RADIUS;
  return { build: false, dispose, show: peeled && !dispose };
}

interface Entry {
  spec: InteriorSpec;
  interior: BuildingInterior | null;
  /** Dựng lỗi một lần thì không thử lại (tránh lặp lỗi mỗi khung hình). */
  failed: boolean;
}

/**
 * Quản lý các vỏ trong dựng lười: mỗi khung hình hỏi `decideInterior` cho từng tòa rồi dựng, hiện/ẩn hoặc giải phóng.
 * Giải phóng cả mesh lẫn vật liệu riêng của vỏ trong.
 */
export class InteriorManager {
  private entries: Entry[] = [];
  private lampsOn = 0;

  /** Thay danh sách vỏ trong (sau khi dựng lại bản đồ); vỏ trong cũ bị giải phóng. */
  public reset(specs: readonly InteriorSpec[]): void {
    this.disposeAll();
    this.entries = specs.map((spec) => ({ spec, interior: null, failed: false }));
  }

  public setNight(lampsOn: number): void {
    this.lampsOn = lampsOn;
    for (const e of this.entries) if (e.interior) this.applyGlow(e.interior, this.glowShown(e.interior));
  }

  public update(roofs: readonly RoofInfo[], focus: { x: number; z: number } | undefined): void {
    for (const e of this.entries) {
      if (e.failed) continue;
      const roof = roofs.find((r) => r.id === e.spec.buildingId && !r.warehouse);
      const distance = focus ? Math.hypot(focus.x - e.spec.center.x, focus.z - e.spec.center.z) : 0;
      const d = decideInterior({ built: e.interior !== null, roofAlpha: roof?.alpha ?? 1, distance });
      if (d.dispose && e.interior) {
        this.disposeInterior(e.interior);
        e.interior = null;
        continue;
      }
      if (d.build && !e.interior) {
        try {
          e.interior = e.spec.build();
        } catch (err) {
          console.warn('[Interior] Dựng vỏ trong lỗi:', e.spec.buildingId, err);
          e.failed = true;
          continue;
        }
        // Dựng xong ở trạng thái ẩn; khung hình sau quyết định hiện.
        for (const m of e.interior.meshes) m.isVisible = false;
        continue;
      }
      if (e.interior) this.setShown(e.interior, d.show);
    }
  }

  /** Phòng (gồm tường bao) của tòa `buildingId`, nếu có vỏ trong riêng. */
  public boundsOf(buildingId: string): InteriorSpec['bounds'] {
    return this.entries.find((e) => e.spec.buildingId === buildingId)?.spec.bounds;
  }

  /** Số vỏ trong đang được dựng. */
  public get builtCount(): number {
    return this.entries.filter((e) => e.interior).length;
  }

  /** Tổng số mục vẽ của các vỏ trong đang dựng (đo ngân sách chi tiết). */
  public get drawItems(): number {
    return this.entries.reduce((s, e) => s + (e.interior?.drawItems ?? 0), 0);
  }

  public dispose(): void {
    this.disposeAll();
    this.entries = [];
  }

  private glowShown(interior: BuildingInterior): boolean {
    return this.lampsOn > INTERIOR_NIGHT_LAMPS_ON && interior.meshes.some((m) => m.isVisible && !interior.glowMeshes.includes(m));
  }

  private applyGlow(interior: BuildingInterior, on: boolean): void {
    for (const m of interior.glowMeshes) m.isVisible = on;
  }

  private setShown(interior: BuildingInterior, show: boolean): void {
    const glow = new Set(interior.glowMeshes);
    for (const m of interior.meshes) if (!glow.has(m)) m.isVisible = show;
    this.applyGlow(interior, show && this.lampsOn > INTERIOR_NIGHT_LAMPS_ON);
  }

  private disposeInterior(interior: BuildingInterior): void {
    for (const m of interior.meshes) m.dispose(false, false);
    for (const mat of interior.materials) mat.dispose();
  }

  private disposeAll(): void {
    for (const e of this.entries) {
      if (e.interior) this.disposeInterior(e.interior);
      e.interior = null;
    }
  }
}
