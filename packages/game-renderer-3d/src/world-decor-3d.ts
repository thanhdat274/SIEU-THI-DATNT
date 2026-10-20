import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { GameSimulation } from '@game/core';
import type { GameTileMap } from '@game/shared';
import { TILE_SIZE } from '@game/shared';
import type { PlanningOverlay } from '@game/renderer';
import { createSignPlane } from './sign-plane';
import { computeWaveDecor, computeWaveOverlay, worldDecorKey, type DecorSign, type TileRect, type WorldDecorInput } from './wave-decor';

/** Lớp trang trí đặt trên mặt đất, cao hơn vỉa hè (0,08) để không bị chìm. */
const ZONE_Y = 0.12;
const SIGN_FONT = "'VT323', 'Be Vietnam Pro', monospace";
const SIGN_HEIGHT = 0.6;
const SIGN_PX_PER_UNIT = 28;
/** Điểm ảnh bản vẽ vùng trên mỗi ô (đủ để nét đứt và sọc rào rõ). */
const ZONE_PX_PER_TILE = 8;

type ZoneStyle = 'locked' | 'construction' | 'district' | 'parcel' | 'overlay';

/** Trang trí đợt khai hoang (vùng khóa, công trường, lô bán) + bóng quy hoạch co-op + overlay QA: dựng lại chỉ khi dữ liệu đổi. */
export class WorldDecor3D {
  private meshes: Mesh[] = [];
  private qaMeshes: Mesh[] = [];
  private planningMeshes: Mesh[] = [];
  private key = '';
  private planningSig = '';
  private placed: WorldDecorInput['placed'] = [];
  private qaOn = false;

  constructor(private readonly scene: Scene, private readonly simulation: GameSimulation) {}

  /** Chân diện các tòa phụ đã dựng (lô có tòa thì không cắm biển). */
  public setTileMap(tileMap: GameTileMap): void {
    const placed: Array<{ left: number; right: number; bottom: number }> = [];
    for (const b of tileMap.buildings ?? []) {
      if (!b.bounds || /^grocery_main/.test(b.id) || b.id === 'main') continue;
      placed.push({ left: b.bounds.left, right: b.bounds.right, bottom: b.bounds.bottom });
    }
    this.placed = placed;
  }

  /** Gọi mỗi khung: rẻ khi trạng thái không đổi. */
  public update(): void {
    const world = this.simulation.getWorldOpenState();
    const input: WorldDecorInput = {
      openedWaves: world.openedWaves,
      wavesUnderConstruction: world.wavesUnderConstruction,
      ownedParcelIds: this.simulation.getOwnedParcelIds(),
      day: this.simulation.getTime().day,
      placed: this.placed,
    };
    const key = worldDecorKey(input);
    if (key === this.key) return;
    this.key = key;
    this.clear(this.meshes);
    const decor = computeWaveDecor(input);
    for (const c of decor.construction) {
      this.zone(c.region, 'construction', '#8a6b45');
      this.excavators(c.region);
      this.sign(c.sign);
    }
    for (const l of decor.locked) { this.zone(l.region, 'locked', '#1c2430'); this.sign(l.sign); }
    for (const d of decor.districts) { this.zone(d.region, 'district', d.color); this.sign(d.sign); }
    for (const p of decor.parcels) { this.zone(p.rect, 'parcel', p.owned ? '#3fbf5f' : p.corner ? '#ffa500' : '#d8d2c0'); this.sign(p.sign); }
  }

  /** Bóng mờ giữ chỗ quy hoạch của người khác (hộp px thế giới → ô). */
  public setPlanning(overlays: readonly PlanningOverlay[]): void {
    const sig = overlays.map(o => `${o.accountId}|${o.label}|${o.boxes.map(b => `${b.x},${b.y},${b.w},${b.h}`).join(';')}`).join('#');
    if (sig === this.planningSig) return;
    this.planningSig = sig;
    this.clear(this.planningMeshes);
    const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
    for (const o of overlays) {
      const color = hex(o.color);
      for (const b of o.boxes) {
        const rect: TileRect = { x0: b.x / TILE_SIZE, y0: b.y / TILE_SIZE, x1: (b.x + b.w) / TILE_SIZE - 1, y1: (b.y + b.h) / TILE_SIZE - 1 };
        this.zone(rect, 'overlay', color, this.planningMeshes, 0.2, 0.14);
      }
      this.sign({ text: o.label, cx: o.labelAt.x / TILE_SIZE + 2.5, cz: o.labelAt.y / TILE_SIZE, width: Math.max(4, o.label.length * 0.38), bg: color }, this.planningMeshes, 1.6);
    }
  }

  /** Overlay QA: viền vùng đợt và từng lô kèm mã (giống `showWaveOverlay` của Pixi). */
  public showWaveOverlay(show: boolean): boolean {
    if (show === this.qaOn) return true;
    this.qaOn = show;
    this.clear(this.qaMeshes);
    if (!show) return true;
    for (const item of computeWaveOverlay()) {
      this.zone(item.rect, 'overlay', item.color, this.qaMeshes, item.kind === 'parcel' ? 0.28 : 0, 0.18);
      this.sign({ text: item.label, cx: item.labelAt.x + 1.8, cz: item.labelAt.z, width: Math.max(2.2, item.label.length * 0.34), bg: '#222' }, this.qaMeshes, 1.2);
    }
    return true;
  }

  public dispose(): void {
    this.clear(this.meshes);
    this.clear(this.qaMeshes);
    this.clear(this.planningMeshes);
  }

  private clear(list: Mesh[]): void {
    for (const m of list) m.dispose(false, true);
    list.length = 0;
  }

  /** Một tấm phủ mặt đất có bản vẽ riêng (nền mờ + viền) theo kiểu. */
  private zone(r: TileRect, style: ZoneStyle, color: string, into: Mesh[] = this.meshes, fillAlpha?: number, y = ZONE_Y): void {
    const w = r.x1 - r.x0 + 1;
    const d = r.y1 - r.y0 + 1;
    const pw = Math.max(8, Math.round(w * ZONE_PX_PER_TILE));
    const ph = Math.max(8, Math.round(d * ZONE_PX_PER_TILE));
    const tex = new DynamicTexture('zone_tex', { width: pw, height: ph }, this.scene, false, Texture.NEAREST_SAMPLINGMODE);
    tex.hasAlpha = true;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, pw, ph);
    const fill = fillAlpha ?? (style === 'construction' ? 0.55 : style === 'locked' ? 0.28 : style === 'district' ? 0.08 : 0);
    if (fill > 0) { ctx.globalAlpha = fill; ctx.fillStyle = color; ctx.fillRect(0, 0, pw, ph); ctx.globalAlpha = 1; }
    const t = Math.max(2, Math.round(ZONE_PX_PER_TILE * 0.3));
    if (style === 'construction') {
      // Rào sọc vàng quanh vùng.
      const stripe = ZONE_PX_PER_TILE * 1.5;
      ctx.fillStyle = '#f2c230';
      for (let x = 0; x < pw; x += stripe * 2) { ctx.fillRect(x, 0, Math.min(stripe, pw - x), t); ctx.fillRect(x, ph - t, Math.min(stripe, pw - x), t); }
      for (let y2 = 0; y2 < ph; y2 += stripe * 2) { ctx.fillRect(0, y2, t, Math.min(stripe, ph - y2)); ctx.fillRect(pw - t, y2, t, Math.min(stripe, ph - y2)); }
    } else if (style === 'locked') {
      ctx.fillStyle = '#d8d2c0';
      const dash = ZONE_PX_PER_TILE * 1.5;
      for (let x = 0; x < pw; x += dash * 2) { ctx.fillRect(x, 0, Math.min(dash, pw - x), 2); ctx.fillRect(x, ph - 2, Math.min(dash, pw - x), 2); }
      for (let y2 = 0; y2 < ph; y2 += dash * 2) { ctx.fillRect(0, y2, 2, Math.min(dash, ph - y2)); ctx.fillRect(pw - 2, y2, 2, Math.min(dash, ph - y2)); }
    } else if (style === 'parcel' || style === 'overlay') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = style === 'overlay' ? 2 : 1.5;
      ctx.strokeRect(1, 1, pw - 2, ph - 2);
      ctx.globalAlpha = 1;
    }
    tex.update(true);
    const mat = new StandardMaterial('zone_mat', this.scene);
    mat.disableLighting = true;
    mat.emissiveColor = Color3.White();
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    const ground = CreateGround('zone', { width: w, height: d }, this.scene);
    ground.position.set(r.x0 + w / 2, y, r.y0 + d / 2);
    ground.material = mat;
    ground.isPickable = false;
    into.push(ground);
  }

  /** Ba máy xúc tượng trưng (khối vàng + gầu) trong công trường. */
  private excavators(r: TileRect): void {
    const w = r.x1 - r.x0 + 1;
    const d = r.y1 - r.y0 + 1;
    const mat = new StandardMaterial('excavator_mat', this.scene);
    mat.diffuseColor = Color3.FromHexString('#f2c230');
    mat.specularColor = Color3.Black();
    for (let i = 0; i < 3; i++) {
      const cx = r.x0 + w * (0.2 + 0.3 * i);
      const cz = r.y0 + d * 0.5;
      const body = CreateBox('excavator', { width: 1.1, height: 0.5, depth: 0.55 }, this.scene);
      body.position.set(cx, 0.4, cz);
      body.material = mat;
      body.isPickable = false;
      const arm = CreateBox('excavator_arm', { width: 0.9, height: 0.12, depth: 0.12 }, this.scene);
      arm.position.set(cx + 0.9, 0.8, cz);
      arm.rotation.z = 0.5;
      arm.material = mat;
      arm.isPickable = false;
      this.meshes.push(body, arm);
    }
  }

  /** Biển chữ đứng, luôn quay mặt về camera quanh trục dọc để đọc được ở mọi hướng xoay. */
  private sign(s: DecorSign, into: Mesh[] = this.meshes, lift = 0): void {
    const w = s.width;
    const pw = Math.round(w * SIGN_PX_PER_UNIT);
    const ph = Math.round(SIGN_HEIGHT * SIGN_PX_PER_UNIT);
    const tex = new DynamicTexture('decor_sign_tex', { width: pw, height: ph }, this.scene, false, Texture.NEAREST_SAMPLINGMODE);
    const draw = (): void => {
      // Font tải xong sau khi biển đã bị dựng lại/hủy: texture hết ngữ cảnh thì bỏ qua.
      const ctx = tex.getContext() as CanvasRenderingContext2D | null;
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#9aa0a4';
      ctx.fillRect(0, 0, pw, ph);
      ctx.fillStyle = s.bg;
      ctx.fillRect(1, 1, pw - 2, ph - 2);
      let size = ph - 4;
      ctx.font = `${size}px ${SIGN_FONT}`;
      while (size > 8 && ctx.measureText(s.text).width > pw - 6) ctx.font = `${--size}px ${SIGN_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f5f5f0';
      ctx.fillText(s.text, pw / 2, ph / 2 + 1);
      tex.update(false);
    };
    draw();
    if (typeof document !== 'undefined' && document.fonts) void document.fonts.load(`20px ${SIGN_FONT}`).then(draw, () => {});
    const mat = new StandardMaterial('decor_sign_mat', this.scene);
    mat.emissiveTexture = tex;
    mat.disableLighting = true;
    mat.specularColor = Color3.Black();
    const plane = createSignPlane(this.scene, 'decor_sign', w, SIGN_HEIGHT);
    plane.billboardMode = Mesh.BILLBOARDMODE_Y;
    plane.position.set(s.cx, ZONE_Y + 0.5 + SIGN_HEIGHT / 2 + lift, s.cz);
    plane.material = mat;
    plane.isPickable = false;
    into.push(plane);
  }
}
