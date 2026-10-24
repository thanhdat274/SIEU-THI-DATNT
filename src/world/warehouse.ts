import * as THREE from 'three';
import { storageUsed, useGame } from '../core/store';
import { needsCold } from '../data/freshness';
import { CASES_PER_RACK, WAREHOUSE_TIERS, warehouseTier } from '../data/warehouse';
import { Building } from './buildings';

/** Nhà kho nối sau tiệm: cửa trước của kho (giữa tường) thông với cửa sau của tiệm. */
export const WAREHOUSE_WIDTH = 12;
export const WAREHOUSE_DEPTH = 8;
const WIDTH = WAREHOUSE_WIDTH;
const DEPTH = WAREHOUSE_DEPTH;
/** Độ dày tường (khớp Building): hai tường áp sát nhau. */
const WALL = 0.2;

/** Chỗ đứng để tương tác với một món trong kho (toạ độ thế giới). */
export interface WarehouseSpot {
  position: THREE.Vector3;
  kind: 'rack' | 'fridge' | 'desk';
  /** Toạ độ trong kho, để tính lại khi kho dời theo tiệm mở rộng. */
  local: [number, number];
}

/**
 * Nhà kho: kệ sắt xếp thùng carton, tủ lạnh kho, bàn nhận hàng; mỗi món có bảng số treo trên đầu
 * (như game tham khảo). Đủ chỗ đặt sẵn cho cấp cao nhất; kệ, tủ chưa mở thì mờ và ghi "🔒".
 */
export class Warehouse {
  building: Building;
  spots: WarehouseSpot[] = [];
  private racks: { group: THREE.Group; crates: THREE.Mesh[]; label: Label }[] = [];
  private fridges: { group: THREE.Group; label: Label }[] = [];
  private desk: Label;

  constructor(scene: THREE.Scene) {
    this.building = new Building({
      name: 'Nhà kho', width: WIDTH, depth: DEPTH, height: 3.2,
      wallColor: 0xb0bec5, roofColor: 0x546e7a, floorColor: 0x9e9e9e, doorStyle: 'solid',
    });
    const inside = this.building.interior;

    // Kệ thành hai hàng dọc tường sau (hàng trước chừa lối đi giữa hai hàng); 12m rộng vừa đủ 9 kệ tier cuối
    const maxRacks = WAREHOUSE_TIERS[WAREHOUSE_TIERS.length - 1].racks;
    const PER_ROW = 6;
    for (let i = 0; i < maxRacks; i++) {
      const row = Math.floor(i / PER_ROW);
      const x = -WIDTH / 2 + 1.1 + (i % PER_ROW) * 1.75;
      const z = -DEPTH / 2 + 0.55 + row * 1.4;
      const { group, crates } = createRack();
      group.position.set(x, 0, z);
      const label = new Label(1.4);
      label.mesh.position.set(0, 2.25, 0.3);
      group.add(label.mesh);
      inside.add(group);
      this.racks.push({ group, crates, label });
      this.spots.push({ position: new THREE.Vector3(), local: [x, z + 0.95], kind: 'rack' });
    }

    // Tủ lạnh dọc tường phải, quay mặt vào trong; chia đều chiều sâu kho để không tràn qua cửa
    const maxFridges = WAREHOUSE_TIERS[WAREHOUSE_TIERS.length - 1].fridges;
    for (let i = 0; i < maxFridges; i++) {
      const z = -DEPTH / 2 + 0.8 + i * ((DEPTH - 1.6 - 0.7) / (maxFridges - 1));
      const group = createFridge();
      group.position.set(WIDTH / 2 - 0.5, 0, z);
      group.rotation.y = -Math.PI / 2;
      const label = new Label(1.1);
      label.mesh.position.set(0, 2.15, 0.4);
      group.add(label.mesh);
      inside.add(group);
      this.fridges.push({ group, label });
      this.spots.push({ position: new THREE.Vector3(), local: [WIDTH / 2 - 1.5, z], kind: 'fridge' });
    }

    // Bàn nhận hàng gần cửa, bên trái
    const desk = createDesk();
    desk.position.set(-WIDTH / 2 + 1.2, 0, DEPTH / 2 - 1.6);
    this.desk = new Label(1.1);
    this.desk.mesh.position.set(0, 1.75, 0.3);
    desk.add(this.desk.mesh);
    inside.add(desk);
    this.spots.push({ position: new THREE.Vector3(), local: [-WIDTH / 2 + 1.2, DEPTH / 2 - 0.8], kind: 'desk' });

    // Biển "NHÀ KHO" gắn phẳng lên mặt tường sau của tiệm, ngay trên cửa thông sang kho
    const sign = createWallSign('NHÀ KHO');
    sign.position.set(0, DOOR_TOP + 0.32, DEPTH / 2 + WALL * 1.5 + 0.03);
    this.building.group.add(sign);

    scene.add(this.building.group);
    this.refresh();
    useGame.subscribe((s, prev) => {
      if (s.storage !== prev.storage || s.deliveries !== prev.deliveries || s.warehouseTier !== prev.warehouseTier) this.refresh();
    });
  }

  /** Đặt kho sau tiệm: `doorX` là tâm cửa sau tiệm, `shopBackZ` là mặt tường sau tiệm (toạ độ thế giới). */
  place(doorX: number, shopBackZ: number) {
    const c = this.building.group.position.set(doorX, 0, shopBackZ - WALL - DEPTH / 2);
    for (const s of this.spots) s.position.set(c.x + s.local[0], 0, c.z + s.local[1]);
  }

  /** Cập nhật thùng trên kệ, số trên bảng và kệ/tủ nào đã mở. */
  refresh() {
    const s = useGame.getState();
    const tier = warehouseTier(s.warehouseTier);
    let left = storageUsed(s.storage);
    this.racks.forEach((r, i) => {
      const open = i < tier.racks;
      setGhost(r.group, !open);
      const n = open ? Math.max(0, Math.min(left, CASES_PER_RACK)) : 0;
      if (open) left -= n;
      r.crates.forEach((c, k) => (c.visible = k < n));
      r.label.set(open ? `📦 ${n}/${CASES_PER_RACK} thùng` : '🔒 Nâng cấp kho');
    });
    // Phần hàng cần lạnh đang được giữ lạnh, chia đều cho các tủ đang có
    const coldUnits = Object.entries(s.storage).reduce((n, [id, q]) => n + (q > 0 && needsCold(id) ? q : 0), 0);
    const chilled = Math.min(coldUnits, tier.cold);
    const per = tier.cold / tier.fridges;
    this.fridges.forEach((f, i) => {
      const open = i < tier.fridges;
      setGhost(f.group, !open);
      const n = open ? Math.max(0, Math.min(per, chilled - per * i)) : 0;
      f.label.set(open ? `❄️ ${Math.round(n)}/${Math.round(per)}` : '🔒');
    });
    this.desk.set(`🧾 ${s.deliveries.length} đơn`);
  }
}

/** Bảng số treo trên đồ trong kho (chữ trên nền tối), luôn quay mặt về camera cho dễ đọc. */
class Label {
  mesh: THREE.Sprite;
  private canvas = document.createElement('canvas');
  private texture: THREE.CanvasTexture;
  private text = '';

  constructor(width: number, private bg = '#263238', private fg = '#ffeaa7') {
    this.canvas.width = 320;
    this.canvas.height = 80;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture }));
    this.mesh.scale.set(width, width / 4, 1);
  }

  set(text: string) {
    if (text === this.text) return;
    this.text = text;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 320, 80);
    ctx.fillStyle = this.bg;
    ctx.beginPath();
    ctx.roundRect(3, 3, 314, 74, 14);
    ctx.fill();
    ctx.fillStyle = this.fg;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 43);
    this.texture.needsUpdate = true;
  }
}

/** Mép trên khung cửa (khớp DOOR_H của Building). */
const DOOR_TOP = 2.2;

/** Biển tên gắn tường: tấm nền viền gỗ, chữ vẽ trên mặt phẳng (không xoay theo camera). */
function createWallSign(text: string) {
  const W = 1.5;
  const H = 0.38;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1e3d33';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.fillStyle = '#f1f8e9';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, H + 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex }));
  face.position.z = 0.021;
  group.add(board, face);
  return group;
}

/** Kệ sắt 4 tầng, mỗi tầng 5 thùng carton (ẩn tới khi có hàng). */
function createRack() {
  const group = new THREE.Group();
  const w = 1.6;
  const d = 0.6;
  const metal = new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.4, roughness: 0.6 });
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 0.05), metal);
    post.position.set(x, 1, z);
    group.add(post);
  }
  const cardboard = new THREE.MeshStandardMaterial({ color: 0xc8a165 });
  const crates: THREE.Mesh[] = [];
  const per = CASES_PER_RACK / 4;
  const boxW = (w - 0.1) / per;
  for (let t = 0; t < 4; t++) {
    const y = 0.06 + t * 0.48;
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), metal);
    board.position.y = y;
    group.add(board);
    for (let i = 0; i < per; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(boxW * 0.9, 0.34, d * 0.8), cardboard);
      crate.position.set(-w / 2 + 0.05 + boxW * (i + 0.5), y + 0.19, 0);
      crate.castShadow = true;
      crate.visible = false;
      group.add(crate);
      crates.push(crate);
    }
  }
  return { group, crates };
}

/** Tủ lạnh đứng hai cánh. */
function createFridge() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.85, 0.7), new THREE.MeshStandardMaterial({ color: 0xf5f6fa }));
  body.position.y = 0.925;
  body.castShadow = true;
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.02, 0.01), new THREE.MeshStandardMaterial({ color: 0x95a5a6 }));
  seam.position.set(0, 1.25, 0.355);
  group.add(body, seam);
  for (const y of [0.75, 1.55]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.04), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
    handle.position.set(0.33, y, 0.37);
    group.add(handle);
  }
  return group;
}

/** Bàn gỗ nhận hàng, có tờ phiếu trên mặt bàn. */
function createDesk() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.7), wood);
  top.position.y = 0.78;
  top.castShadow = true;
  group.add(top);
  for (const x of [-0.6, 0.6]) for (const z of [-0.3, 0.3]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.06), wood);
    leg.position.set(x, 0.39, z);
    group.add(leg);
  }
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  paper.position.set(0.15, 0.82, 0);
  group.add(paper);
  return group;
}

/** Kệ, tủ chưa mở: mờ đi. */
function setGhost(group: THREE.Group, ghost: boolean) {
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mat = o.material as THREE.MeshStandardMaterial;
    if (!mat.userData.ownCopy) {
      o.material = mat.clone();
      (o.material as THREE.Material).userData.ownCopy = true;
    }
    const m = o.material as THREE.MeshStandardMaterial;
    m.transparent = ghost;
    m.opacity = ghost ? 0.3 : 1;
  });
}
