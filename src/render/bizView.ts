import * as THREE from 'three';
import { useGame } from '../core/store';
import { petActive } from '../data/biz';
import type { GroceryShop } from '../shop/groceryShop';
import type { Building } from '../world/buildings';

const mat = (color: number, emissive = 0) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? 0.5 : 0 });

// Vị trí lệch dùng lại mỗi khung cho mèo/chó (không cấp phát rác)
const _offset = new THREE.Vector3();

function box(g: THREE.Group, sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

/**
 * Chỗ đặt đồ trong phòng khách nhà chung (toạ độ trong nhà 12×10, xem createSharedHome): sát tường ngoài
 * và tường trước, chừa lối trước cửa 4 phòng ngủ. [x, y, z, xoay quanh trục đứng]
 */
const SHARED_SPOTS: Record<string, [number, number, number, number]> = {
  den_ngu: [-3, 0.48, 2.6, 0], // trên bàn giữa phòng khách
  quat: [-5.3, 0.1, 4.5, 0],
  tu_quan_ao: [5.55, 0.1, 3.3, 0],
  tivi: [-5.6, 0.1, 2.8, Math.PI / 2], // sát tường trái, quay vào bàn
  may_lanh: [3, 2.35, 4.75, Math.PI], // trên tường trước, thổi vào trong
};

/**
 * Đồ mua thêm cho nhà, đặt sẵn chỗ. Nhà riêng: toạ độ trong nhà 6×6, giường ở góc trái sau.
 * Nhà chung (hẻm online): bày ở phòng khách chung vì là đồ của cả hẻm.
 */
function homeItem(id: string, shared = false): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    case 'den_ngu':
      box(g, 0.12, 0.25, 0.12, 0, 0.12, 0, mat(0x795548));
      box(g, 0.26, 0.18, 0.26, 0, 0.32, 0, mat(0xfff3c4, 0xffe082));
      g.position.set(-0.45, 0.55, -2.45);
      break;
    case 'quat':
      box(g, 0.08, 1.1, 0.08, 0, 0.55, 0, mat(0x90a4ae));
      box(g, 0.55, 0.55, 0.12, 0, 1.2, 0, mat(0x4fc3f7));
      box(g, 0.4, 0.05, 0.4, 0, 0.03, 0, mat(0x607d8b));
      g.position.set(2.2, 0.1, -2.2);
      break;
    case 'tu_quan_ao':
      box(g, 0.6, 2, 1.4, 0, 1, 0, mat(0x8d6e63));
      box(g, 0.04, 0.2, 0.04, -0.31, 1, 0.15, mat(0xffd54f));
      box(g, 0.04, 0.2, 0.04, -0.31, 1, -0.15, mat(0xffd54f));
      g.position.set(2.55, 0.1, -0.4);
      break;
    case 'tivi':
      box(g, 1.2, 0.5, 0.45, 0, 0.25, 0, mat(0x6d4c41));
      box(g, 1.1, 0.65, 0.08, 0, 0.85, 0, mat(0x212121));
      box(g, 0.95, 0.52, 0.02, 0, 0.85, 0.05, mat(0x1e88e5, 0x1565c0));
      g.position.set(1.0, 0.1, -2.6);
      break;
    case 'may_lanh':
      box(g, 1.0, 0.32, 0.25, 0, 0, 0, mat(0xf5f5f5));
      box(g, 0.8, 0.04, 0.02, 0, -0.1, 0.13, mat(0x9e9e9e));
      g.position.set(-1.4, 2.35, -2.75);
      break;
  }
  const spot = shared && SHARED_SPOTS[id];
  if (spot) {
    g.position.set(spot[0], spot[1], spot[2]);
    g.rotation.y = spot[3];
  }
  return g;
}

function createCat(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xffa726);
  box(g, 0.42, 0.2, 0.24, 0, 0.12, 0, fur);
  box(g, 0.2, 0.18, 0.2, 0.26, 0.26, 0, fur);
  box(g, 0.05, 0.08, 0.05, 0.3, 0.38, 0.06, fur);
  box(g, 0.05, 0.08, 0.05, 0.3, 0.38, -0.06, fur);
  box(g, 0.32, 0.05, 0.05, -0.32, 0.18, 0, mat(0xef6c00));
  return g;
}

function createDog(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xd7a35b);
  box(g, 0.6, 0.3, 0.3, 0, 0.35, 0, fur);
  for (const [x, z] of [[0.22, 0.1], [0.22, -0.1], [-0.22, 0.1], [-0.22, -0.1]]) box(g, 0.08, 0.22, 0.08, x, 0.11, z, fur);
  box(g, 0.28, 0.26, 0.26, 0.4, 0.55, 0, fur);
  box(g, 0.12, 0.1, 0.14, 0.58, 0.5, 0, mat(0x8d6e63));
  box(g, 0.06, 0.12, 0.06, 0.38, 0.72, 0.1, mat(0x8d6e63));
  box(g, 0.06, 0.12, 0.06, 0.38, 0.72, -0.1, mat(0x8d6e63));
  box(g, 0.22, 0.05, 0.05, -0.38, 0.46, 0, fur);
  return g;
}

/** Hiển thị phần đời sống thêm: đồ trong nhà riêng, mèo nằm quầy, chó giữ cửa tiệm. */
export class BizView {
  /** Mỗi món có hai bản: trong nhà riêng và trong phòng khách nhà chung (chỉ một nhà hiện lúc nào). */
  private decor = new Map<string, THREE.Group[]>();
  private cat = createCat();
  private dog = createDog();
  private t = 0;

  constructor(scene: THREE.Scene, home: Building, sharedHome: Building, private shop: GroceryShop) {
    for (const id of ['den_ngu', 'quat', 'tu_quan_ao', 'tivi', 'may_lanh']) {
      const solo = homeItem(id);
      const shared = homeItem(id, true);
      solo.visible = shared.visible = false;
      home.interior.add(solo);
      sharedHome.interior.add(shared);
      this.decor.set(id, [solo, shared]);
    }
    this.cat.visible = this.dog.visible = false;
    scene.add(this.cat, this.dog);
  }

  update(dt: number) {
    const s = useGame.getState();
    for (const [id, copies] of this.decor) for (const g of copies) g.visible = s.biz.home.includes(id);
    this.t += dt;
    const counter = this.shop.counters()[0];
    const cat = s.biz.pets.cat;
    this.cat.visible = !!cat && !!counter;
    if (cat && counter) {
      // Mèo nằm trên quầy; đói thì ngồi dưới đất kêu
      const fed = petActive(cat, s.day);
      this.cat.position.copy(counter.center).add(_offset.set(0.5, fed ? 1.0 : 0, 0));
      this.cat.scale.y = 1 + Math.sin(this.t * 2) * 0.04;
    }
    const dog = s.biz.pets.dog;
    this.dog.visible = !!dog;
    if (dog) {
      this.dog.position.copy(this.shop.doorInside).add(_offset.set(1.3, 0, -0.3));
      this.dog.rotation.y = Math.PI / 2 + Math.sin(this.t * 0.7) * 0.4;
    }
  }
}
