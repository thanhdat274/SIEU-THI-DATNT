import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { TILE_SIZE, type Direction, type Vector2D } from '@game/shared';
import { billboardCenter, facingFromMovement, isoAlpha, pixelToWorld } from './coords';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { createActorSprite, type ActorAtlas } from './actor-atlas';
import type { LightTint } from './actor-light';

/** Chiều rộng và chiều cao logic (pixel) của khung nhân vật trong atlas LimeZu (chars.json). */
export const ACTOR_FRAME_WIDTH = 32;
export const ACTOR_FRAME_HEIGHT = 51;

/** Kích thước sprite theo đơn vị thế giới 3D (1 ô = 32px = 1 đơn vị). */
export const ACTOR_WORLD_WIDTH = ACTOR_FRAME_WIDTH / TILE_SIZE; // 1.0
export const ACTOR_WORLD_HEIGHT = ACTOR_FRAME_HEIGHT / TILE_SIZE; // 1.59375

export interface PartnerAvatarInfo {
  position: Vector2D;
  direction: string;
  isMoving?: boolean;
  name?: string;
}

/**
 * Quản lý sprite 2D của nhân vật trong không gian 3D (Babylon SpriteManager).
 * Luôn hướng mặt về camera (billboard), chân sprite đặt đúng toạ độ mặt đất.
 */
export class Actors3D {
  private playerSprite: Sprite | null = null;
  private partnerSprite: Sprite | null = null;
  private availableKeys: ReadonlyMap<string, unknown> = new Map();

  private animTimer = 0;
  private partnerShown: { x: number; y: number } | null = null;
  private prevPlayerPixel: [number, number] | null = null;
  private playerFacing: Direction = 'down';
  private prevPartnerPos: { x: number; y: number } | null = null;
  private partnerFacing: Direction = 'down';
  private motionQuery: MediaQueryList | null = null;

  public initialize(atlas: ActorAtlas): void {
    const manager = atlas.manager;
    this.availableKeys = atlas.frames;

    const player = createActorSprite('player', manager);
    player.width = ACTOR_WORLD_WIDTH;
    player.height = ACTOR_WORLD_HEIGHT;
    player.cellRef = 'player_down_idle_0';

    const partner = createActorSprite('partner', manager);
    partner.width = ACTOR_WORLD_WIDTH;
    partner.height = ACTOR_WORLD_HEIGHT;
    partner.cellRef = 'partner_down_idle_0';
    partner.isVisible = false;

    this.playerSprite = player;
    this.partnerSprite = partner;

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
  }

  /** Nhân màu người chơi và bạn co-op theo ánh sáng cảnh (ban ngày = màu gốc). */
  public setLightTint(t: LightTint): void {
    const c = new Color4(t.r, t.g, t.b, 1);
    this.playerSprite?.color.copyFrom(c);
    this.partnerSprite?.color.copyFrom(c);
  }

  public update(
    elapsed: number,
    playerRenderPixel: [number, number],
    playerDirection: Direction,
    playerMoving: boolean,
    quarter: number,
    cameraBeta: number,
    partnerAvatar?: PartnerAvatarInfo | null,
  ): void {
    if (!this.playerSprite || !this.partnerSprite) return;

    this.animTimer += elapsed;
    const reducedMotion = this.motionQuery?.matches ?? false;

    // Chân sprite chạm đất tại (x, z): billboard song song mặt phẳng màn hình nên tâm = chân + (H/2)·(vector lên
    // của camera) → mép dưới trùng chân, đúng cả với camera phối cảnh.
    const alpha = isoAlpha(quarter);

    // 1. Cập nhật Player
    const playerMode = playerMoving ? 'walk' : 'idle';
    const playerFrame = reducedMotion ? 0 : Math.floor(this.animTimer * (playerMoving ? 8 : 1.5)) % (playerMoving ? 4 : 2);
    // Hướng sprite lấy theo hướng ĐI TRÊN MÀN HÌNH (từ độ dời pixel thật, đổi qua groundBasis) thay vì hướng
    // cardinal của sim — vì camera chéo 45° nên di chuyển diagonal bị vectorToDirection nén bằng phép so sánh
    // dấu phẩy động, không ổn định. Đứng yên giữ hướng cũ.
    const playerFacing = this.resolveFacing(this.prevPlayerPixel, playerRenderPixel, playerMoving, quarter, this.playerFacing);
    this.playerFacing = playerFacing;
    this.prevPlayerPixel = [playerRenderPixel[0], playerRenderPixel[1]];
    const playerKey = `player_${playerFacing}_${playerMode}_${playerFrame}`;
    if (this.availableKeys.has(playerKey)) {
      this.playerSprite.cellRef = playerKey;
    }

    const playerWorld = pixelToWorld(playerRenderPixel[0], playerRenderPixel[1]);
    const pc = billboardCenter(playerWorld.x, playerWorld.z, ACTOR_WORLD_HEIGHT, alpha, cameraBeta);
    this.playerSprite.position.set(pc.x, pc.y, pc.z);

    // 2. Cập nhật Partner (co-op)
    if (partnerAvatar) {
      this.partnerSprite.isVisible = true;

      // Nội suy mượt vị trí bạn co-op từ server snapshots (giống Pixi)
      const target = partnerAvatar.position;
      const shown = this.partnerShown ?? { x: target.x, y: target.y };
      const gap = Math.hypot(target.x - shown.x, target.y - shown.y);
      if (gap > 96) {
        shown.x = target.x;
        shown.y = target.y;
      } else {
        const k = Math.min(1, elapsed * 12);
        shown.x += (target.x - shown.x) * k;
        shown.y += (target.y - shown.y) * k;
      }
      this.partnerShown = shown;

      const partnerMoving = partnerAvatar.isMoving ?? gap > 1.5;
      const partnerMode = partnerMoving ? 'walk' : 'idle';
      const partnerFrame = reducedMotion ? 0 : Math.floor(this.animTimer * (partnerMoving ? 8 : 1.5)) % (partnerMoving ? 4 : 2);
      // Hướng sprite cũng theo hướng đi trên màn hình (từ độ dời vị trí thật), đứng yên giữ hướng cũ.
      const partnerFacing = this.resolveFacing(this.prevPartnerPos, { x: shown.x, y: shown.y }, partnerMoving, quarter, this.partnerFacing);
      this.prevPartnerPos = { x: shown.x, y: shown.y };
      this.partnerFacing = partnerFacing;

      let partnerKey = `partner_${partnerFacing}_${partnerMode}_${partnerFrame}`;
      if (!this.availableKeys.has(partnerKey)) {
        partnerKey = `player_${partnerFacing}_${partnerMode}_${partnerFrame}`;
      }
      if (this.availableKeys.has(partnerKey)) {
        this.partnerSprite.cellRef = partnerKey;
      }

      const partnerWorld = pixelToWorld(shown.x, shown.y);
      const qc = billboardCenter(partnerWorld.x, partnerWorld.z, ACTOR_WORLD_HEIGHT, alpha, cameraBeta);
      this.partnerSprite.position.set(qc.x, qc.y, qc.z);
    } else {
      this.partnerSprite.isVisible = false;
      this.partnerShown = null;
      this.prevPartnerPos = null;
    }
  }

  /** Hướng sprite theo độ dời thật trên (x, z bản đồ) qua `facingFromMovement`; đứng yên / chưa có dữ liệu giữ hướng cũ. */
  private resolveFacing(
    prev: { x: number; y: number } | [number, number] | null,
    curr: { x: number; y: number } | [number, number],
    moving: boolean,
    quarter: number,
    fallback: Direction,
  ): Direction {
    const toPos = (v: { x: number; y: number } | [number, number]): { x: number; y: number } =>
      Array.isArray(v) ? { x: v[0], y: v[1] } : v;
    if (moving && prev) {
      const a = toPos(prev);
      const b = toPos(curr);
      const dx = b.x - a.x;
      const dz = b.y - a.y;
      if (Math.abs(dx) + Math.abs(dz) > 0.01) return facingFromMovement(dx, dz, quarter);
    }
    return fallback;
  }

  public dispose(): void {
    this.playerSprite?.dispose();
    this.partnerSprite?.dispose();
    this.playerSprite = null;
    this.partnerSprite = null;
    this.partnerShown = null;
    this.availableKeys = new Map();
  }
}
