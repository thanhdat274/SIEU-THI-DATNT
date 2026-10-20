import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { GameSimulation } from '@game/core';
import { PRODUCT_MAP, effectiveShelfCapacity, productPixels } from '@game/data';
import { isSalesFixture, type StoreFixture } from '@game/shared';
import { fixtureFootprint } from './fixture-shapes';
import { roofIndexAt } from './fixtures-3d';
import { ALPHA_HIDDEN } from './roof-fade';
import { shelfStockQuads, soldOutSignQuad, stallSignQuad, type StockQuad } from './shelf-stock';
import type { RoofInfo } from './map-builder';

const SYNC_INTERVAL = 0.5;
const ICON_PX = 16;
const ATLAS_PX = 512;
const ATLAS_COLS = ATLAS_PX / ICON_PX;
/** Ô 0–1 của atlas dành cho biển "HẾT" (32×16 px); icon sản phẩm từ ô 2. */
const FIRST_ICON_CELL = 2;
const SIGN_FONT = "'VT323', 'Courier New', monospace";

interface StallInfo { id: string; tileX: number; tileY: number; widthTiles: number }
interface Group { mesh: Mesh; mat: StandardMaterial; roof: number; alpha: number; count: number }

/**
 * Hàng trên kệ/tủ mát (icon sản phẩm pixel), biển "HẾT" khi kệ trống và quầy vỉa hè hết hàng.
 * Mọi icon dùng chung một atlas canvas (NEAREST); mỗi mái một mesh gộp, dựng lại chỉ khi chữ ký tồn kho đổi (kiểm mỗi 0,5s).
 */
export class Stock3D {
  private readonly atlas: DynamicTexture;
  private readonly cells = new Map<string, number>();
  private readonly groups = new Map<number, Group>();
  private stallBodies: Mesh[] = [];
  private stallBodyMat: StandardMaterial | null = null;
  private roofs: readonly RoofInfo[] = [];
  private stalls: readonly StallInfo[] = [];
  private soldOutStalls = new Set<string>();
  private signature = '';
  private sinceSync = SYNC_INTERVAL;
  private dirty = true;

  constructor(private readonly scene: Scene, private readonly simulation: GameSimulation) {
    this.atlas = new DynamicTexture('stock_atlas', { width: ATLAS_PX, height: ATLAS_PX }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    this.atlas.hasAlpha = true;
    this.drawSoldOutSign();
    this.atlas.update();
  }

  /** Sau mỗi lần dựng bản đồ: mái mới (để gán icon vào mái) và danh sách quầy vỉa hè. */
  public setMap(roofs: readonly RoofInfo[], stalls: readonly StallInfo[] | undefined): void {
    this.roofs = roofs;
    this.stalls = stalls ?? [];
    this.dirty = true;
    for (const m of this.stallBodies) m.dispose();
    this.stallBodies = [];
    if (this.stalls.length && !this.stallBodyMat) {
      this.stallBodyMat = new StandardMaterial('stall_body_mat', this.scene);
      this.stallBodyMat.diffuseColor = Color3.FromHexString('#b5835a');
      this.stallBodyMat.specularColor = Color3.Black();
    }
    for (const s of this.stalls) {
      // Quầy chưa có hình 3D riêng: một khối quầy đơn giản làm chỗ treo biển.
      const body = CreateBox(`stall_${s.id}`, { width: s.widthTiles * 0.95, height: 0.9, depth: 0.8 }, this.scene);
      body.position.set(s.tileX + s.widthTiles / 2, 0.45, s.tileY + 0.5);
      body.material = this.stallBodyMat;
      body.isPickable = false;
      this.stallBodies.push(body);
    }
  }

  /** Quầy hết vé/ngừng bán → hiện biển HẾT (cùng hợp đồng với bản Pixi). */
  public setStallSoldOut(ids: readonly string[]): void {
    if (ids.length === this.soldOutStalls.size && ids.every(id => this.soldOutStalls.has(id))) return;
    this.soldOutStalls = new Set(ids);
    this.dirty = true;
  }

  public update(elapsed: number): void {
    this.sinceSync += elapsed;
    if (this.sinceSync >= SYNC_INTERVAL || this.dirty) {
      this.sinceSync = 0;
      const sig = this.computeSignature();
      if (this.dirty || sig !== this.signature) {
        this.signature = sig;
        this.dirty = false;
        this.rebuild();
      }
    }
    this.applyRoofAlpha();
  }

  public dispose(): void {
    for (const g of this.groups.values()) { g.mesh.dispose(); g.mat.dispose(); }
    this.groups.clear();
    for (const m of this.stallBodies) m.dispose();
    this.stallBodies = [];
    this.stallBodyMat?.dispose();
    this.atlas.dispose();
  }

  /** Kệ gốc kèm ô phụ (theo thứ tự trong danh sách) cho mọi kệ/tủ bán hàng còn nguyên. */
  private salesGroups(): Array<{ root: StoreFixture; slots: StoreFixture[] }> {
    const fixtures = this.simulation.getFixtures();
    const children = new Map<string, StoreFixture[]>();
    for (const f of fixtures) {
      if (!f.parentId) continue;
      let list = children.get(f.parentId);
      if (!list) children.set(f.parentId, list = []);
      list.push(f);
    }
    const out: Array<{ root: StoreFixture; slots: StoreFixture[] }> = [];
    for (const f of fixtures) {
      if (f.parentId || !isSalesFixture(f) || f.maxCapacity <= 0) continue;
      out.push({ root: f, slots: [f, ...(children.get(f.id) ?? [])] });
    }
    return out;
  }

  private computeSignature(): string {
    let s = `${this.roofs.length}|`;
    for (const { root, slots } of this.salesGroups()) {
      s += `${root.id}@${root.tileX},${root.tileY},${root.rotation}:`;
      for (const slot of slots) s += `${slot.assignedProductId ?? ''}=${slot.currentStock},`;
      s += ';';
    }
    s += '|' + [...this.soldOutStalls].sort().join(',');
    return s;
  }

  private limitOf(slot: StoreFixture): number {
    const product = slot.assignedProductId ? PRODUCT_MAP[slot.assignedProductId] : undefined;
    return effectiveShelfCapacity(slot.maxCapacity, product?.shelfCapacity || slot.maxCapacity, this.simulation.getShelfCapacityBonus());
  }

  private rebuild(): void {
    const byRoof = new Map<number, StockQuad[]>();
    const add = (roof: number, quad: StockQuad) => {
      let list = byRoof.get(roof);
      if (!list) byRoof.set(roof, list = []);
      list.push(quad);
    };
    let newIcons = false;
    for (const { root, slots } of this.salesGroups()) {
      const fp = fixtureFootprint(root);
      const roof = roofIndexAt(this.roofs, fp.cx, fp.cz);
      for (const q of shelfStockQuads(root, slots, i => this.limitOf(slots[i]))) {
        if (q.productId && this.allocateIcon(q.productId)) newIcons = true;
        add(roof, q);
      }
      if (!root.broken && slots.every(s => s.currentStock <= 0)) add(roof, soldOutSignQuad(root));
    }
    for (const stall of this.stalls) {
      if (this.soldOutStalls.has(stall.id)) add(roofIndexAt(this.roofs, stall.tileX + 0.5, stall.tileY + 0.5), stallSignQuad(stall));
    }
    if (newIcons) this.atlas.update();

    for (const g of this.groups.values()) { g.count = 0; g.mesh.isVisible = false; }
    for (const [roof, quads] of byRoof) {
      const g = this.groupFor(roof);
      this.applyQuads(g.mesh, quads);
      g.count = quads.length;
      g.alpha = -1; // buộc applyRoofAlpha cập nhật
    }
  }

  private groupFor(roof: number): Group {
    let g = this.groups.get(roof);
    if (!g) {
      const mat = new StandardMaterial(`stock_mat_${roof}`, this.scene);
      mat.diffuseTexture = this.atlas;
      mat.emissiveColor = Color3.White();
      mat.disableLighting = true;
      mat.specularColor = Color3.Black();
      mat.backFaceCulling = false;
      mat.useAlphaFromDiffuseTexture = true;
      mat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
      mat.alphaCutOff = 0.4;
      const mesh = new Mesh(`stock_${roof}`, this.scene);
      mesh.material = mat;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      g = { mesh, mat, roof, alpha: 1, count: 0 };
      this.groups.set(roof, g);
    }
    return g;
  }

  private applyQuads(mesh: Mesh, quads: readonly StockQuad[]): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (const q of quads) {
      const base = positions.length / 3;
      const hx = (q.rx * q.w) / 2;
      const hz = (q.rz * q.w) / 2;
      const y0 = q.cy - q.h / 2;
      const y1 = q.cy + q.h / 2;
      // Trái-dưới, phải-dưới, phải-trên, trái-trên khi nhìn từ phía trước kệ.
      positions.push(q.cx - hx, y0, q.cz - hz, q.cx + hx, y0, q.cz + hz, q.cx + hx, y1, q.cz + hz, q.cx - hx, y1, q.cz - hz);
      normals.push(-q.rz, 0, q.rx, -q.rz, 0, q.rx, -q.rz, 0, q.rx, -q.rz, 0, q.rx);
      const r = this.uvRect(q.productId);
      uvs.push(r.u0, r.v1, r.u1, r.v1, r.u1, r.v0, r.u0, r.v0);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const data = new VertexData();
    data.positions = positions;
    data.normals = normals;
    data.uvs = uvs;
    data.indices = indices;
    data.applyToMesh(mesh, true);
  }

  /** Vùng UV (v0 = mép trên, v1 = mép dưới) của icon sản phẩm hoặc biển HẾT trong atlas. */
  private uvRect(productId: string | null): { u0: number; u1: number; v0: number; v1: number } {
    if (productId === null) return { u0: 0, u1: (ICON_PX * 2) / ATLAS_PX, v0: 1, v1: 1 - ICON_PX / ATLAS_PX };
    const cell = this.cells.get(productId) ?? FIRST_ICON_CELL;
    const cx = cell % ATLAS_COLS;
    const cy = Math.floor(cell / ATLAS_COLS);
    return {
      u0: (cx * ICON_PX) / ATLAS_PX,
      u1: ((cx + 1) * ICON_PX) / ATLAS_PX,
      v0: 1 - (cy * ICON_PX) / ATLAS_PX,
      v1: 1 - ((cy + 1) * ICON_PX) / ATLAS_PX,
    };
  }

  /** Vẽ icon sản phẩm vào atlas nếu chưa có; trả true khi vừa vẽ mới. */
  private allocateIcon(productId: string): boolean {
    if (this.cells.has(productId)) return false;
    const cell = FIRST_ICON_CELL + this.cells.size;
    if (cell >= ATLAS_COLS * ATLAS_COLS) return false;
    this.cells.set(productId, cell);
    const ctx = this.atlas.getContext() as CanvasRenderingContext2D;
    const ox = (cell % ATLAS_COLS) * ICON_PX;
    const oy = Math.floor(cell / ATLAS_COLS) * ICON_PX;
    for (const r of productPixels(PRODUCT_MAP[productId])) {
      ctx.fillStyle = r.color;
      ctx.fillRect(ox + r.x, oy + r.y, r.w, r.h);
    }
    return true;
  }

  private drawSoldOutSign(): void {
    const ctx = this.atlas.getContext() as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3a1410';
    ctx.fillRect(0, 0, ICON_PX * 2, ICON_PX);
    ctx.fillStyle = '#c8392b';
    ctx.fillRect(1, 1, ICON_PX * 2 - 2, ICON_PX - 2);
    ctx.fillStyle = '#fff2d6';
    ctx.font = `bold 13px ${SIGN_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HẾT', ICON_PX, ICON_PX / 2 + 1);
  }

  /** Icon trong tòa hiện dần khi mái mờ đi (cùng nhịp với fixture). */
  private applyRoofAlpha(): void {
    for (const g of this.groups.values()) {
      const roof = g.roof >= 0 ? this.roofs[g.roof] : undefined;
      const alpha = roof ? 1 - roof.alpha : 1;
      if (alpha === g.alpha) continue;
      g.alpha = alpha;
      g.mat.alpha = alpha;
      g.mesh.isVisible = alpha > ALPHA_HIDDEN && g.count > 0;
    }
  }
}
