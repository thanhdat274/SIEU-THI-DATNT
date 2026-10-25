import * as THREE from 'three';
import { useGame, type Furniture } from '../core/store';
import { footprint, frontDir, furnitureDef, type FurnitureType } from '../data/furniture';
import { Building, WINDOW_W, createCounter } from '../world/buildings';
import type { Warehouse } from '../world/warehouse';
import type { NavGrid } from '../world/navGrid';
import { FurnitureView } from './furnitureView';

import { SHOP_CENTER_X, SHOP_FRONT_Z, SHOP_TIERS } from '../data/shopTiers';

interface LocalCounter {
  key: string;
  x: number;
  z: number;
  pay: [number, number];
  /** Hướng hàng chờ kéo dài ra từ chỗ trả tiền. */
  dir: [number, number];
  cashier: [number, number];
}

export interface Counter {
  key: string;
  center: THREE.Vector3;
  pay: THREE.Vector3;
  dir: [number, number];
  cashier: THREE.Vector3;
}

/** Vị trí quầy chính trong tiệm: rot như đồ nội thất (hướng mặt trước, chỗ khách trả tiền). */
export interface MainCounter { x: number; z: number; rot: number }
/** Quầy chính mặc định quay mặt ra phía -x (rot 3). */
const DEFAULT_COUNTER_ROT = 3;

/**
 * Tiệm tạp hóa: tường, quầy thu ngân và nội thất do người chơi đặt.
 * Mở rộng tiệm thì vỏ tòa nhà được xây lại to hơn; mặt tiền giữ nguyên, nới ra phía sau.
 * Các "điểm đứng" (trước kệ, chỗ trả tiền, hàng chờ) dùng cho khách và nhân vật.
 */
export class GroceryShop {
  building!: Building;
  counter!: THREE.Group;
  views = new Map<number, FurnitureView>();
  private furnitureGroup = new THREE.Group();
  private grid: NavGrid | null = null;
  private tier = -1;

  constructor(private scene: THREE.Scene, private warehouse: Warehouse) {
    this.rebuildShell();
    this.sync();
    useGame.subscribe((s, prev) => {
      if (s.shopTier !== prev.shopTier) this.rebuildShell();
      else if (s.mainCounter !== prev.mainCounter) this.placeCounter();
      else if (s.style !== prev.style || s.stylePreview !== prev.stylePreview) this.applyStyle();
      if (s.furniture !== prev.furniture || s.shopTier !== prev.shopTier) this.sync();
    });
  }

  get width() { return SHOP_TIERS[this.tier].width; }
  get depth() { return SHOP_TIERS[this.tier].depth; }
  /** Quầy chính: người chơi dời được, chưa dời thì ở góc phải phía trước, chừa lối sau quầy cho thu ngân đứng. */
  private get counterPos(): MainCounter {
    return useGame.getState().mainCounter ?? { x: this.width / 2 - 1.7, z: this.depth / 2 - 1.9, rot: DEFAULT_COUNTER_ROT };
  }

  /** Đặt hình quầy chính theo vị trí hiện tại. */
  private placeCounter() {
    const c = this.counterPos;
    this.counter.rotation.y = ((c.rot - 2) * Math.PI) / 2;
    this.counter.position.set(c.x, 0, c.z);
  }

  /** Xây (lại) tường, sàn, mái, quầy theo cấp tiệm hiện tại. */
  private rebuildShell() {
    const s = useGame.getState();
    if (this.building) {
      this.building.group.remove(this.furnitureGroup);
      this.scene.remove(this.building.group);
      this.building.dispose();
    }
    this.tier = s.shopTier;
    const { width, depth } = SHOP_TIERS[this.tier];
    this.building = new Building({
      name: 'Tạp hóa', width, depth, height: 3,
      wallColor: s.style.wall, roofColor: s.style.roof, floorColor: s.style.floor, backDoorX: this.backDoorX, sideWindows: false,
      ceilingFan: true, airCon: this.tier >= 1,
    });
    this.building.group.position.set(SHOP_CENTER_X, 0, SHOP_FRONT_Z - depth / 2);
    // Nhà kho nối ngay sau tiệm, cửa trước của kho thông với cửa sau của tiệm
    this.warehouse.place(SHOP_CENTER_X + this.backDoorX, SHOP_FRONT_Z - depth);
    this.building.group.add(this.furnitureGroup);

    this.counter = createCounter();
    this.placeCounter();
    this.building.interior.add(this.counter);
    this.scene.add(this.building.group);
    this.applyStyle();

    if (this.grid) {
      this.grid.setStatic('shop', this.building.staticBoxes());
      this.grid.setStatic('warehouse', this.warehouse.building.staticBoxes());
      this.grid.rebuildBase();
      this.applyToGrid(s.furniture);
    }
  }

  /** Cửa sau (sang nhà kho): lệch về góc phải tường sau, tránh dãy kệ giữa tiệm. */
  get backDoorX() { return this.width / 2 - 1.0; }

  /** Điểm ngay trong cửa sau, để kiểm tra không bị kệ chắn lối sang kho. */
  private get backDoorInside() { return this.local(this.backDoorX, -this.depth / 2 + 0.6); }

  private applyStyle() {
    const s = useGame.getState();
    const { wall, floor, roof } = { ...s.style, ...s.stylePreview };
    this.building.setColors(wall, floor, roof);
    for (const view of this.views.values()) view.setWallColor(wall);
  }

  /** Gắn lưới đi lại; gọi sau khi các lớp vật cản khác (nhà, cây) đã setStatic. */
  attachGrid(grid: NavGrid) {
    this.grid = grid;
    grid.setStatic('shop', this.building.staticBoxes());
    grid.setStatic('warehouse', this.warehouse.building.staticBoxes());
    grid.rebuildBase();
    this.applyToGrid(useGame.getState().furniture);
  }

  /** Tạo / xoá / cập nhật hình 3D theo danh sách nội thất trong store. */
  private sync() {
    const list = useGame.getState().furniture;
    const alive = new Set(list.map((f) => f.uid));
    for (const [uid, view] of this.views) {
      if (!alive.has(uid)) {
        this.furnitureGroup.remove(view.group);
        view.dispose();
        this.views.delete(uid);
      }
    }
    for (const f of list) {
      let view = this.views.get(f.uid);
      if (!view) {
        view = new FurnitureView(f.type);
        view.group.userData.uid = f.uid;
        this.views.set(f.uid, view);
        this.furnitureGroup.add(view.group);
      }
      view.group.position.set(f.x, 0, f.z);
      view.group.rotation.y = (f.rot * Math.PI) / 2;
      view.update(f.tiers);
      view.setWallColor(useGame.getState().style.wall);
    }
    if (this.grid) this.applyToGrid(list);
  }

  private applyToGrid(list: Furniture[]) {
    const grid = this.grid!;
    grid.restoreBase();
    for (const f of list) grid.blockBox(this.footprintBox(f.type, f.x, f.z, f.rot));
  }

  /** Hộp sàn (toạ độ thế giới) của một món đồ. */
  footprintBox(type: FurnitureType, x: number, z: number, rot: number) {
    const [w, d] = footprint(type, rot);
    const c = this.local(x, z);
    return new THREE.Box3(new THREE.Vector3(c.x - w / 2, 0, c.z - d / 2), new THREE.Vector3(c.x + w / 2, 2, c.z + d / 2));
  }

  /** Các quầy (toạ độ trong tiệm): quầy chính cố định + quầy phụ do người chơi đặt. */
  private localCounters(list: Furniture[], main: MainCounter = this.counterPos): LocalCounter[] {
    const [mx, mz] = frontDir(main.rot);
    const counters: LocalCounter[] = [
      { key: 'main', x: main.x, z: main.z, pay: [main.x + mx, main.z + mz], dir: [mx, mz], cashier: [main.x - mx * 0.95, main.z - mz * 0.95] },
    ];
    for (const f of list) {
      if (f.type !== 'checkout') continue;
      const [fx, fz] = frontDir(f.rot);
      counters.push({
        key: `f${f.uid}`, x: f.x, z: f.z, dir: [fx, fz],
        pay: [f.x + fx * 1.0, f.z + fz * 1.0],
        cashier: [f.x - fx * 0.9, f.z - fz * 0.9],
      });
    }
    return counters;
  }

  /** Các quầy (toạ độ thế giới) để khách xếp hàng và thu ngân đứng. */
  counters(): Counter[] {
    return this.localCounters(useGame.getState().furniture).map((c) => ({
      key: c.key,
      center: this.local(c.x, c.z),
      cashier: this.local(...c.cashier),
      dir: c.dir,
      pay: this.local(...c.pay),
    }));
  }

  /** Vị trí thứ i trong hàng chờ của một quầy; 0 là chỗ trả tiền. */
  queueSpot(counter: Counter, i: number) {
    return counter.pay.clone().add(new THREE.Vector3(counter.dir[0] * 0.7 * i, 0, counter.dir[1] * 0.7 * i));
  }

  /**
   * Kiểm tra nhanh vị trí đặt: nằm trong tiệm, không chồng lên đồ khác, không chắn cửa, quầy.
   * Trả về lý do nếu không hợp lệ.
   */
  quickCheck(
    type: FurnitureType, x: number, z: number, rot: number, ignoreUid?: number,
    list: Furniture[] = useGame.getState().furniture,
    main: MainCounter = this.counterPos,
  ): string | null {
    const [w, d] = footprint(type, rot);
    const margin = 0.12;
    if (Math.abs(x) + w / 2 > this.width / 2 - margin || Math.abs(z) + d / 2 > this.depth / 2 - margin) return 'Phải đặt trong tiệm';
    const overlaps = (ox: number, oz: number, ow: number, od: number) =>
      Math.abs(x - ox) < (w + ow) / 2 && Math.abs(z - oz) < (d + od) / 2;
    const [cw, cd] = footprint('checkout', main.rot);
    if (overlaps(main.x, main.z, cw, cd)) return 'Chồng lên quầy';
    if (overlaps(0, this.depth / 2 - 0.5, 1.8, 1.0)) return 'Không được chắn cửa ra vào';
    if (overlaps(this.backDoorX, -this.depth / 2 + 0.5, 1.8, 1.0)) return 'Không được chắn cửa sang nhà kho';
    if (type !== 'plant') {
      for (const z of this.windowZones()) if (overlaps(z.x, z.z, z.w, z.d)) return 'Không được che cửa sổ (chắn ánh sáng)';
    }

    const others = list.filter((f) => f.uid !== ignoreUid);
    for (const f of others) {
      const [ow, od] = footprint(f.type, f.rot);
      if (overlaps(f.x, f.z, ow, od)) return 'Chồng lên đồ khác';
    }
    // Chỗ trả tiền và chỗ thu ngân của mọi quầy (kể cả quầy đang đặt) phải trống
    const candidate = { uid: -1, type, x, z, rot, tiers: [] } as Furniture;
    const allCounters = this.localCounters([...others, candidate], main);
    const candidateCounter = allCounters.find((it) => it.key === 'f-1');
    for (const ct of allCounters) {
      if (ct === candidateCounter) continue;
      if (overlaps(ct.pay[0], ct.pay[1], 0.6, 0.6)) return 'Không được chắn chỗ khách trả tiền';
      if (overlaps(ct.cashier[0], ct.cashier[1], 0.6, 0.6)) return 'Không được chắn chỗ thu ngân đứng';
    }
    if (candidateCounter) {
      const inBox = (px: number, pz: number, f: Furniture) => {
        const [ow, od] = footprint(f.type, f.rot);
        return Math.abs(px - f.x) < ow / 2 + 0.3 && Math.abs(pz - f.z) < od / 2 + 0.3;
      };
      for (const f of others) {
        if (inBox(...candidateCounter.pay, f) || inBox(...candidateCounter.cashier, f)) return 'Trước hoặc sau quầy bị chắn';
      }
    }
    return null;
  }

  /** Kiểm tra đầy đủ: sau khi đặt, khách vẫn đi tới được mọi quầy và mọi kệ. */
  fullCheck(type: FurnitureType, x: number, z: number, rot: number, ignoreUid?: number): string | null {
    const quick = this.quickCheck(type, x, z, rot, ignoreUid);
    if (quick) return quick;
    const others = useGame.getState().furniture.filter((f) => f.uid !== ignoreUid);
    return this.layoutCheck([...others, { uid: -1, type, x, z, rot, tiers: [] } as Furniture]);
  }

  /** Cả bố cục (vd. bản nháp ở màn sắp xếp): khách đi tới được mọi quầy và lấy được hàng ở mọi kệ. */
  layoutCheck(all: Furniture[], main: MainCounter = this.counterPos): string | null {
    if (!this.grid) return null;
    const grid = this.grid;
    grid.restoreBase();
    for (const f of all) grid.blockBox(this.footprintBox(f.type, f.x, f.z, f.rot));
    let reason: string | null = null;
    const start = this.doorInside;
    for (const ct of this.localCounters(all, main)) {
      if (!grid.reachable(start, this.local(...ct.pay))) reason = 'Khách sẽ không tới được quầy';
      else if (!grid.reachable(start, this.local(...ct.cashier))) reason = 'Thu ngân sẽ không vào được quầy';
      if (reason) break;
    }
    if (!reason && !grid.reachable(start, this.backDoorInside)) reason = 'Lối ra cửa sau sang nhà kho bị chắn';
    for (const f of all) {
      if (reason) break;
      if (furnitureDef(f.type).tiers && !grid.reachable(start, this.spotFor(f))) reason = `Phía trước ${furnitureDef(f.type).name} bị chắn, khách không lấy hàng được`;
    }
    this.applyToGrid(useGame.getState().furniture);
    return reason;
  }

  /** Kiểm tra dời quầy chính tới (x, z, rot): trong tiệm, không đè đồ/cửa, trước sau quầy trống và đi tới được. */
  checkMainCounter(x: number, z: number, rot: number, list: Furniture[] = useGame.getState().furniture): string | null {
    const [w, d] = footprint('checkout', rot);
    if (Math.abs(x) + w / 2 > this.width / 2 - 0.12 || Math.abs(z) + d / 2 > this.depth / 2 - 0.12) return 'Phải đặt trong tiệm';
    const overlaps = (ox: number, oz: number, ow: number, od: number) =>
      Math.abs(x - ox) < (w + ow) / 2 && Math.abs(z - oz) < (d + od) / 2;
    if (overlaps(0, this.depth / 2 - 0.5, 1.8, 1.0)) return 'Không được chắn cửa ra vào';
    if (overlaps(this.backDoorX, -this.depth / 2 + 0.5, 1.8, 1.0)) return 'Không được chắn cửa sang nhà kho';
    for (const wz of this.windowZones()) if (overlaps(wz.x, wz.z, wz.w, wz.d)) return 'Không được che cửa sổ (chắn ánh sáng)';
    for (const f of list) {
      const [ow, od] = footprint(f.type, f.rot);
      if (overlaps(f.x, f.z, ow, od)) return 'Chồng lên đồ khác';
    }
    const main: MainCounter = { x, z, rot };
    const mine = this.localCounters(list, main)[0];
    const near = (px: number, pz: number, f: Furniture) => {
      const [ow, od] = footprint(f.type, f.rot);
      return Math.abs(px - f.x) < ow / 2 + 0.3 && Math.abs(pz - f.z) < od / 2 + 0.3;
    };
    for (const spot of [mine.pay, mine.cashier]) {
      if (Math.abs(spot[0]) > this.width / 2 - 0.3 || Math.abs(spot[1]) > this.depth / 2 - 0.3) return 'Trước hoặc sau quầy sát tường';
      if (list.some((f) => near(spot[0], spot[1], f))) return 'Trước hoặc sau quầy bị chắn';
    }
    // Quầy phụ không được bị quầy chính đè lên chỗ trả tiền / chỗ thu ngân
    for (const ct of this.localCounters(list, main).slice(1)) {
      if (overlaps(ct.pay[0], ct.pay[1], 0.6, 0.6) || overlaps(ct.cashier[0], ct.cashier[1], 0.6, 0.6)) return 'Chắn quầy thu ngân phụ';
    }
    return this.layoutCheck(list, main);
  }

  /** Khoảng sàn sát trước mỗi cửa sổ (sâu 0.5m) phải để trống cho ánh sáng vào. */
  windowZones() {
    const depth = 0.5;
    return this.building.windows.map((wn) => {
      // Dời từ tâm tường vào trong nhà nửa độ dày tường + nửa vùng chừa
      const inX = wn.alongX ? 0 : -Math.sign(wn.x) * (0.1 + depth / 2);
      const inZ = wn.alongX ? -Math.sign(wn.z) * (0.1 + depth / 2) : 0;
      return { x: wn.x + inX, z: wn.z + inZ, w: wn.alongX ? WINDOW_W : depth, d: wn.alongX ? depth : WINDOW_W };
    });
  }

  /** Mặt bằng cho màn sắp xếp (toạ độ trong tiệm, gốc ở giữa sàn, +z là phía cửa). */
  plan() {
    const c = this.counterPos;
    const [cw, cd] = footprint('checkout', c.rot);
    return {
      width: this.width, depth: this.depth, counter: { x: c.x, z: c.z, w: cw, d: cd, rot: c.rot }, doorW: 1.4,
      backDoorX: this.backDoorX, windows: this.windowZones(),
    };
  }

  /** Đổi toạ độ trong tiệm ra toạ độ thế giới. */
  local(x: number, z: number) {
    return new THREE.Vector3(x, 0, z).add(this.building.group.position);
  }

  /** Đổi toạ độ thế giới ra toạ độ trong tiệm. */
  toLocal(p: THREE.Vector3) {
    return p.clone().sub(this.building.group.position);
  }

  /** Ngoài cửa, trên vỉa hè. */
  get doorOutside() { return this.local(0, this.depth / 2 + 0.8); }
  /** Ngay sau cửa, bên trong. */
  get doorInside() { return this.local(0, this.depth / 2 - 0.9); }

  /** Chỗ đứng trước một kệ để lấy hàng (offset ngang để khách không đứng chồng). */
  spotFor(f: Furniture, spread = 0) {
    const [fx, fz] = frontDir(f.rot);
    const [, d] = furnitureDef(f.type).size;
    const dist = d / 2 + 0.7;
    // Hướng ngang = vuông góc với hướng mặt trước
    return this.local(f.x + fx * dist + fz * spread, f.z + fz * dist - fx * spread);
  }

}
