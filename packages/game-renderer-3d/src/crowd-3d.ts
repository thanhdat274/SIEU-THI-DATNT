import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { NeighborhoodLife, weekdayOf, hashSeed, type GameSimulation } from '@game/core';
import { NEIGHBORHOOD_QUALITY, detailForZoom } from '@game/data';
import { resolveWeatherQuality } from '@game/renderer';
import { TILE_SIZE, getFixtureDimensions, type Direction } from '@game/shared';
import { createActorSprite, type ActorAtlas } from './actor-atlas';
import { NEUTRAL_TINT, type LightTint } from './actor-light';
import { billboardCenter, directionFromDelta, facingForCamera, isoAlpha, npcFrameKey, pixelToWorld, walkerLookFor } from './coords';
import type { RoofInfo } from './map-builder';

/** Vùng nhìn (đơn vị thế giới) để NPC nền chỉ chạy chi tiết gần camera. */
export interface CrowdView {
  centerX: number;
  centerZ: number;
  radius: number;
  zoom: number;
}

interface CrowdEntry {
  sprite: Sprite;
  look: number;
  direction: Direction;
  last: { x: number; y: number } | null;
  seen: number;
  tint: number;
}

/**
 * Khách, nhân viên và người đi đường khu phố: mỗi người một Sprite của SpriteManager chung (xem actor-atlas.ts).
 * Đồng bộ theo id: sprite chỉ tạo khi có người mới, người rời đi thì trả về hồ chứa (ẩn) để dùng lại; mỗi khung chỉ
 * cập nhật vị trí và khung hình. Người trong tòa còn mái thì ẩn, tòa đang bóc mái thì vẫn thấy.
 */
export interface CrowdTalkBubble {
  id: string;
  x: number;
  y: number;
  text: string;
  scale: number;
  bubbleAge: number;
}

export class Crowd3D {
  private readonly entries = new Map<string, CrowdEntry>();
  private readonly externalEntries = new Map<string, CrowdEntry>();
  private readonly pool: Sprite[] = [];
  private readonly life: NeighborhoodLife;
  private talkBubbles: CrowdTalkBubble[] = [];
  private devBubble: { text: string; age: number } | null = null;
  private readonly counterCenters = new Map<string, { x: number; y: number } | null>();
  private counterCacheAge = 0;
  private frameId = 0;
  private animTimer = 0;
  private motionQuery: MediaQueryList | null = null;
  private scratchColor = new Color4(1, 1, 1, 1);

  constructor(private readonly atlas: ActorAtlas, private readonly simulation: GameSimulation) {
    this.life = new NeighborhoodLife(hashSeed(String(simulation.getWeatherSeed())));
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
  }

  public get activeCount(): number { return this.entries.size; }

  private lightTint: LightTint = NEUTRAL_TINT;

  /** Màu nhân theo ánh sáng cảnh (xem actor-light.ts); áp lên mọi người ở lần đặt kế tiếp. */
  public setLightTint(t: LightTint): void { this.lightTint = t; }

  /** Màu sprite = màu riêng của người × ánh sáng cảnh (ban ngày = màu gốc). */
  private applyColor(e: CrowdEntry, tint: number): void {
    e.tint = tint;
    const l = this.lightTint;
    this.scratchColor.set(((tint >> 16) & 255) / 255 * l.r, ((tint >> 8) & 255) / 255 * l.g, (tint & 255) / 255 * l.b, 1);
    e.sprite.color.copyFrom(this.scratchColor);
  }

  private hasKey = (key: string): boolean => this.atlas.frames.has(key);
  private walkerLook = (i: number): number => walkerLookFor(this.hasKey, i);

  private acquire(): Sprite {
    const reused = this.pool.pop();
    if (reused) { reused.isVisible = true; return reused; }
    const sprite = createActorSprite('npc', this.atlas.manager);
    sprite.isPickable = false;
    return sprite;
  }

  /** Đặt một người từ ngoài (logistics): quản lý trong externalEntries, không bị dọn bởi update() */
  public placeExternalPerson(
    id: string, look: number, x: number, y: number, facing: Direction | null, walkingOverride: boolean | null,
    scale: number, tint: number, quarter: number, beta: number, roofs: readonly RoofInfo[],
  ): void {
    let e = this.externalEntries.get(id);
    if (!e) {
      e = { sprite: this.acquire(), look, direction: 'down', last: null, seen: 0, tint: 0xffffff };
      this.externalEntries.set(id, e);
    }
    e.look = look;

    const world = pixelToWorld(x, y);
    const sprite = e.sprite;
    if (hiddenByRoof(world.x, world.z, roofs)) {
      sprite.isVisible = false;
      e.last = { x, y };
      return;
    }
    sprite.isVisible = true;

    const dx = e.last ? x - e.last.x : 0;
    const dy = e.last ? y - e.last.y : 0;
    const walking = walkingOverride ?? Math.abs(dx) + Math.abs(dy) > 0.01;
    e.direction = facing ?? directionFromDelta(dx, dy, e.direction);
    e.last = { x, y };

    const shown = facingForCamera(e.direction, quarter);
    const reduced = this.motionQuery?.matches ?? false;
    const frame = reduced ? 0 : Math.floor(this.animTimer * (walking ? 8 : 1.5)) % (walking ? 4 : 2);
    const key = npcFrameKey(look, shown, walking, frame);
    const rect = this.atlas.frames.get(key);
    if (rect) {
      sprite.cellRef = key;
      sprite.width = (rect.w / TILE_SIZE) * scale;
      sprite.height = (rect.h / TILE_SIZE) * scale;
    }

    this.applyColor(e, tint);
    const c = billboardCenter(world.x, world.z, sprite.height, isoAlpha(quarter), beta);
    sprite.position.set(c.x, c.y, c.z);
  }

  /** Xóa người đặt từ ngoài khi sự kiện kết thúc. */
  public clearExternalPerson(id: string): void {
    const e = this.externalEntries.get(id);
    if (e) {
      e.sprite.isVisible = false;
      this.pool.push(e.sprite);
      this.externalEntries.delete(id);
    }
  }

  /** Tìm sprite người (nội bộ hoặc ngoài) phục vụ kiểm thử và debug. */
  public findPersonSprite(id: string): Sprite | null {
    return this.externalEntries.get(id)?.sprite ?? this.entries.get(id)?.sprite ?? null;
  }

  private place(
    id: string, look: number, x: number, y: number, facing: Direction | null, walkingOverride: boolean | null,
    scale: number, tint: number, sitting: boolean, ctx: { quarter: number; beta: number; roofs: readonly RoofInfo[]; reduced: boolean },
  ): void {
    let e = this.entries.get(id);
    if (!e) {
      e = { sprite: this.acquire(), look, direction: 'down', last: null, seen: 0, tint: 0xffffff };
      this.entries.set(id, e);
    }
    e.seen = this.frameId;
    e.look = look;

    const world = pixelToWorld(x, y);
    const sprite = e.sprite;
    if (hiddenByRoof(world.x, world.z, ctx.roofs)) {
      sprite.isVisible = false;
      e.last = { x, y };
      return;
    }
    sprite.isVisible = true;

    const dx = e.last ? x - e.last.x : 0;
    const dy = e.last ? y - e.last.y : 0;
    const walking = walkingOverride ?? Math.abs(dx) + Math.abs(dy) > 0.01;
    e.direction = facing ?? directionFromDelta(dx, dy, e.direction);
    e.last = { x, y };

    const shown = facingForCamera(sitting ? 'down' : e.direction, ctx.quarter);
    const frame = ctx.reduced ? 0 : Math.floor(this.animTimer * (walking ? 8 : 1.5)) % (walking ? 4 : 2);
    const key = npcFrameKey(look, shown, walking, frame);
    const rect = this.atlas.frames.get(key);
    if (rect) {
      sprite.cellRef = key;
      sprite.width = (rect.w / TILE_SIZE) * scale;
      sprite.height = (rect.h / TILE_SIZE) * scale;
    }

    this.applyColor(e, tint);
    // Chân sprite chạm đất (xem Actors3D): tâm = chân + (H/2)·(vector lên của camera).
    const c = billboardCenter(world.x, world.z + (sitting ? 5 / TILE_SIZE : 0), sprite.height, isoAlpha(ctx.quarter), ctx.beta);
    sprite.position.set(c.x, c.y, c.z);
  }

  private counterCenter(fixtureId: string | undefined): { x: number; y: number } | null {
    if (!fixtureId) return null;
    if (this.counterCenters.has(fixtureId)) return this.counterCenters.get(fixtureId) ?? null;
    const counter = this.simulation.getFixtures().find((f) => f.id === fixtureId);
    let center: { x: number; y: number } | null = null;
    if (counter) {
      const { widthTiles, heightTiles } = getFixtureDimensions(counter);
      center = { x: (counter.tileX + widthTiles / 2) * TILE_SIZE, y: (counter.tileY + heightTiles / 2) * TILE_SIZE };
    }
    this.counterCenters.set(fixtureId, center);
    return center;
  }

  public update(elapsed: number, quarter: number, beta: number, roofs: readonly RoofInfo[], view: CrowdView, mobile: boolean): void {
    this.animTimer += elapsed;
    this.frameId++;
    this.counterCacheAge += elapsed;
    if (this.counterCacheAge > 1) { this.counterCacheAge = 0; this.counterCenters.clear(); }
    const sim = this.simulation;
    const ctx = { quarter, beta, roofs, reduced: this.motionQuery?.matches ?? false };

    // Khách: hướng theo độ dời; đang xếp hàng thanh toán thì quay mặt vào quầy (như Pixi).
    const customers = sim.peekCustomers();
    for (let idx = 0; idx < customers.length; idx++) {
      const c = customers[idx];
      const id = `c:${c.id ?? c.checkoutId ?? idx}`;
      let facing: Direction | null = null;
      const prev = this.entries.get(id)?.last;
      const moved = prev ? Math.abs(c.position.x - prev.x) + Math.abs(c.position.y - prev.y) > 0.01 : false;
      if (!moved && c.stage === 'checkout') {
        const center = this.counterCenter(c.cashierFixtureId);
        facing = center ? directionFromDelta(center.x - c.position.x, center.y - c.position.y, 'left') : 'left';
      }
      this.place(id, this.walkerLook(c.lookSeed ?? idx), c.position.x, c.position.y, facing, null, 1, 0xffffff, false, ctx);
    }

    // Nhân viên đang trong ca.
    const workers = sim.peekVisibleStaff();
    for (let idx = 0; idx < workers.length; idx++) {
      const w = workers[idx];
      const p = w.position ?? { x: 300 + idx * TILE_SIZE, y: 300 };
      this.place(`s:${w.id}`, this.walkerLook(idx + 3), p.x, p.y, null, null, 1, 0xffffff, false, ctx);
    }

    // Người đi đường: NeighborhoodLife của @game/core, đúng cùng logic với Pixi.
    const time = sim.getTime();
    const detail = detailForZoom(view.zoom);
    const r = view.radius * TILE_SIZE;
    const cx = view.centerX * TILE_SIZE;
    const cy = view.centerZ * TILE_SIZE;
    const vehicles = sim.getStreetVehicles();
    this.life.update(elapsed, {
      hour: time.hour, minute: time.minute, day: time.day, weekday: weekdayOf(time.day), rain: sim.getRainIntensity(),
      weatherId: sim.getEffectiveWeatherId(), vehicles, civicPopulation: sim.getCivicPopulation(), mobile,
    }, { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }, detail, resolveWeatherQuality());
    sim.setStreetCrossings(this.life.getCrossings());

    // Người đi bộ qua đường (vạch trước tiệm): sim.getStreetPedestrians(), đồng bộ theo id
    for (const ped of sim.getStreetPedestrians()) {
      if (ped.position.x < cx - r - 64 || ped.position.x > cx + r + 64 || ped.position.y < cy - r - 64 || ped.position.y > cy + r + 64) continue;
      const look = this.walkerLook(ped.variant);
      const walking = ped.state === 'walking';
      this.place('sp:' + ped.id, look, ped.position.x, ped.position.y, ped.direction, walking, 1, 0xffffff, false, ctx);
    }
    this.talkBubbles = [];
    const maxBubbles = NEIGHBORHOOD_QUALITY[resolveWeatherQuality()].bubbles;
    let bubbleIndex = 0;
    this.life.forEachVisible((n) => {
      if (n.x < cx - r - 64 || n.x > cx + r + 64 || n.y < cy - r - 64 || n.y > cy + r + 64) return;
      const look = this.hasKey(`npc_${n.spriteVariant}_down_idle_0`) ? n.spriteVariant : this.walkerLook(n.spriteVariant);
      const walking = n.pose === 'walking';
      this.place(`n:${n.id}`, look, n.x, n.y, n.facing, walking, n.scale, look >= 6 ? 0xffffff : n.tint, n.pose === 'sitting', ctx);
      if (n.bubble && bubbleIndex < maxBubbles) {
        bubbleIndex++;
        this.talkBubbles.push({
          id: n.id,
          x: n.x,
          y: n.y,
          text: n.bubble,
          scale: n.scale,
          bubbleAge: n.bubbleAge,
        });
      }
    });

    if (this.devBubble && this.talkBubbles.length === 0) {
      for (const [id, e] of this.entries) {
        if (e.seen === this.frameId && e.sprite.isVisible && e.last) {
          this.talkBubbles.push({
            id,
            x: e.last.x,
            y: e.last.y,
            text: this.devBubble.text,
            scale: 1,
            bubbleAge: this.devBubble.age,
          });
          break;
        }
      }
      if (this.talkBubbles.length === 0) {
        this.talkBubbles.push({
          id: 'dev_bubble_center',
          x: cx,
          y: cy,
          text: this.devBubble.text,
          scale: 1,
          bubbleAge: this.devBubble.age,
        });
      }
    }

    // Người đã rời: trả sprite về hồ chứa.
    for (const [id, e] of this.entries) {
      if (e.seen === this.frameId) continue;
      e.sprite.isVisible = false;
      this.pool.push(e.sprite);
      this.entries.delete(id);
    }
  }

  /** QA / dev helper: force a talk bubble */
  public setDevBubble(text: string, age = 1): void {
    this.devBubble = { text, age };
  }

  /** Thu thập danh sách người đang hiển thị kèm id và vị trí chân pixel. */
  public getTalkBubbles(): readonly CrowdTalkBubble[] {
    return this.talkBubbles;
  }

  public getVisibleActors(): Array<{ id: string; x: number; y: number }> {
    const list: Array<{ id: string; x: number; y: number }> = [];
    for (const [id, e] of this.entries) {
      if (e.seen === this.frameId && e.sprite.isVisible && e.last) {
        list.push({ id, x: e.last.x, y: e.last.y });
      }
    }
    for (const [id, e] of this.externalEntries) {
      if (e.sprite.isVisible && e.last) {
        list.push({ id, x: e.last.x, y: e.last.y });
      }
    }
    return list;
  }

  /** Thu thập vị trí chân pixel của toàn bộ người trong crowd đang hiển thị. */
  public getVisibleFeet(): Array<{ x: number; y: number }> {
    const feet: Array<{ x: number; y: number }> = [];
    for (const e of this.entries.values()) {
      if (e.seen === this.frameId && e.sprite.isVisible && e.last) {
        feet.push(e.last);
      }
    }
    for (const e of this.externalEntries.values()) {
      if (e.sprite.isVisible && e.last) {
        feet.push(e.last);
      }
    }
    return feet;
  }

  public dispose(): void {
    for (const e of this.entries.values()) e.sprite.dispose();
    for (const e of this.externalEntries.values()) e.sprite.dispose();
    for (const s of this.pool) s.dispose();
    this.entries.clear();
    this.externalEntries.clear();
    this.pool.length = 0;
    this.counterCenters.clear();
  }
}

/** Người đứng trong tòa mà mái còn đậy (mesh mái đang hiện) thì ẩn; tòa đang bóc mái thì thấy. */
export function hiddenByRoof(x: number, z: number, roofs: readonly RoofInfo[]): boolean {
  for (const r of roofs) {
    if (x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1 && r.meshes[0]?.isVisible) return true;
  }
  return false;
}
