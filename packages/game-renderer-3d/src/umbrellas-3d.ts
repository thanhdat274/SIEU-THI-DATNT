import type { Scene } from '@babylonjs/core/scene';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { getRainProtection, rainGearProfile, type RainProtection } from '@game/core';
import { shelterZoneAt } from '@game/data';
import { billboardCenter, isoAlpha, pixelToWorld } from './coords';
import type { RoofInfo } from './map-builder';
import { hiddenByRoof } from './crowd-3d';
import { SCALE_TARGETS } from './scale-spec';

const UMBRELLA_RADIUS = SCALE_TARGETS.accessories.umbrellaRadius;
const UMBRELLA_HEIGHT_OFFSET = SCALE_TARGETS.adultPlayer + 0.12;

export const UMBRELLA_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
};

/**
 * Kiểm tra xem nhân vật có nên mở ô hay không:
 * - Trời đang mưa (rainIntensity > 0)
 * - Nhân vật không ở trong nhà (shelterZone !== 'building' và không bị che bởi mái còn đậy)
 * - getRainProtection chọn 'umbrella'
 */
export function shouldOpenUmbrella(
  rainIntensity: number,
  characterId: string,
  day: number,
  worldX: number,
  worldZ: number,
  roofs: readonly RoofInfo[],
): { open: boolean; color: string } {
  if (rainIntensity <= 0.05) return { open: false, color: '' };
  if (hiddenByRoof(worldX, worldZ, roofs)) return { open: false, color: '' };

  const px = worldX * 32;
  const py = worldZ * 32;
  const zone = shelterZoneAt(px, py);
  if (zone?.kind === 'building') {
    return { open: false, color: '' };
  }

  const protection: RainProtection = getRainProtection({ rainIntensity }, { id: characterId }, day);
  if (protection === 'none') return { open: false, color: '' };

  const profile = rainGearProfile(characterId, day);
  // Nếu dùng áo mưa hoặc ô: trong 3D đều dựng đĩa che mưa trên đầu với màu đặc trưng
  const color = protection === 'raincoat' ? profile.coatColor : profile.umbrellaColor;
  return { open: true, color };
}

interface UmbrellaEntry {
  mesh: Mesh;
  colorName: string;
  seen: number;
}

export class Umbrellas3D {
  private readonly entries = new Map<string, UmbrellaEntry>();
  private readonly pool: Mesh[] = [];
  private readonly materials = new Map<string, StandardMaterial>();
  private frameId = 0;

  constructor(private readonly scene: Scene) {}

  private materialFor(colorName: string): StandardMaterial {
    let mat = this.materials.get(colorName);
    if (!mat) {
      mat = new StandardMaterial(`umb_mat_${colorName}`, this.scene);
      const hex = UMBRELLA_COLORS[colorName] ?? '#3b82f6';
      mat.diffuseColor = Color3.FromHexString(hex);
      mat.specularColor = Color3.Black();
      mat.backFaceCulling = false;
      this.materials.set(colorName, mat);
    }
    return mat;
  }

  private acquire(): Mesh {
    const reused = this.pool.pop();
    if (reused) {
      reused.isVisible = true;
      return reused;
    }
    const disc = CreateDisc('umbrella_canopy', { radius: UMBRELLA_RADIUS, tessellation: 16 }, this.scene);
    disc.rotation.x = Math.PI / 2;
    disc.bakeCurrentTransformIntoVertices();
    disc.isPickable = false;
    return disc;
  }

  public update(
    actors: ReadonlyArray<{ id: string; x: number; y: number }>,
    rainIntensity: number,
    day: number,
    quarter: number,
    beta: number,
    roofs: readonly RoofInfo[],
  ): void {
    this.frameId++;

    if (rainIntensity > 0.05) {
      for (const a of actors) {
        const world = pixelToWorld(a.x, a.y);
        const check = shouldOpenUmbrella(rainIntensity, a.id, day, world.x, world.z, roofs);
        if (!check.open) continue;

        let e = this.entries.get(a.id);
        if (!e) {
          e = { mesh: this.acquire(), colorName: '', seen: 0 };
          this.entries.set(a.id, e);
        }
        e.seen = this.frameId;
        e.mesh.isVisible = true;
        if (e.colorName !== check.color) {
          e.colorName = check.color;
          e.mesh.material = this.materialFor(check.color);
        }

        const c = billboardCenter(world.x, world.z, UMBRELLA_HEIGHT_OFFSET, isoAlpha(quarter), beta);
        e.mesh.position.set(c.x, c.y + 0.1, c.z);
      }
    }

    for (const [id, e] of this.entries) {
      if (e.seen === this.frameId) continue;
      e.mesh.isVisible = false;
      this.pool.push(e.mesh);
      this.entries.delete(id);
    }
  }

  public dispose(): void {
    for (const e of this.entries.values()) e.mesh.dispose();
    for (const m of this.pool) m.dispose();
    this.entries.clear();
    this.pool.length = 0;
    for (const mat of this.materials.values()) mat.dispose();
    this.materials.clear();
  }
}
