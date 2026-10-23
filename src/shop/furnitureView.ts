import * as THREE from 'three';
import type { Tier } from '../core/store';
import { furnitureDef, type FurnitureType } from '../data/furniture';
import { createCounter } from '../world/buildings';
import { createProductModel } from '../render/productModels';

/** Hình 3D của một món nội thất. Kệ/tủ hiện đúng số món hàng (mô hình 3D) còn trên mỗi tầng. */
export class FurnitureView {
  group = new THREE.Group();
  private boxes: THREE.Group[][] = [];

  constructor(public type: FurnitureType) {
    if (type === 'plant') this.buildPlant();
    else if (type === 'wall') this.buildWall();
    else if (type === 'checkout') this.buildCheckout();
    else if (type === 'cartStation') this.buildCartStation();
    else if (type === 'freezer') this.buildChest(0xf4f6f7, 0.85, true);
    else if (type === 'produce') this.buildChest(0x8b5a2b, 0.75, false);
    else this.buildShelf(type === 'fridge' ? 0xdfe6e9 : type === 'bigShelf' ? 0x95a5a6 : 0x8b5a2b, type === 'fridge');
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }

  private buildShelf(color: number, fridge: boolean) {
    const def = furnitureDef(this.type);
    const [w, d] = def.size;
    const height = fridge || def.tiers > 3 ? 1.9 : 1.7;
    const tierGap = (height - 0.25) / def.tiers;
    const frameMat = new THREE.MeshStandardMaterial({ color });

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, height, 0.08), frameMat);
    back.position.set(0, height / 2, -d / 2 + 0.04);
    this.group.add(back);
    for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, height, d), frameMat);
      side.position.set(x, height / 2, 0);
      this.group.add(side);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), frameMat);
    top.position.y = height;
    this.group.add(top);

    if (fridge) {
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.1, height - 0.1, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xaee4ff, transparent: true, opacity: 0.25 }),
      );
      glass.position.set(0, height / 2, d / 2 - 0.02);
      this.group.add(glass);
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.12, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      light.position.set(0, height - 0.08, d / 2 - 0.08);
      this.group.add(light);
    }

    const slotW = (w - 0.2) / def.slots;
    const spacing = (slotW - 0.04) / def.capacity;
    for (let t = 0; t < def.tiers; t++) {
      const y = 0.12 + t * tierGap;
      const board = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.04, d - 0.04), frameMat);
      board.position.y = y;
      this.group.add(board);

      const boxH = Math.min(0.3, tierGap - 0.12);
      for (let s = 0; s < def.slots; s++) {
        const slot: THREE.Group[] = [];
        for (let i = 0; i < def.capacity; i++) {
          const box = new THREE.Group();
          box.userData.size = [spacing * 0.9, boxH, Math.min(0.3, d - 0.2)];
          box.position.set(-w / 2 + 0.12 + slotW * s + spacing * (i + 0.5), y + 0.02, 0.02);
          box.visible = false;
          this.group.add(box);
          slot.push(box);
        }
        this.boxes.push(slot);
      }
    }
  }

  /** Tủ nằm (tủ đông, quầy rau): các tầng là các hàng xếp từ trước ra sau, hơi bậc thang. */
  private buildChest(color: number, height: number, glass: boolean) {
    const def = furnitureDef(this.type);
    const [w, d] = def.size;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), new THREE.MeshStandardMaterial({ color }));
    body.position.y = height / 2;
    this.group.add(body);
    if (glass) {
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.06, 0.03, d - 0.06),
        new THREE.MeshStandardMaterial({ color: 0xaee4ff, transparent: true, opacity: 0.3 }),
      );
      lid.position.y = height + 0.25;
      this.group.add(lid);
    }
    const slotW = (w - 0.16) / def.slots;
    const spacing = (slotW - 0.04) / def.capacity;
    const rowDepth = (d - 0.1) / def.tiers;
    for (let t = 0; t < def.tiers; t++) {
      // Tầng 1 ở phía trước (gần khách)
      const z = d / 2 - 0.05 - rowDepth * (t + 0.5);
      const y = height + 0.02 + t * 0.08;
      for (let s = 0; s < def.slots; s++) {
        const slot: THREE.Group[] = [];
        for (let i = 0; i < def.capacity; i++) {
          const box = new THREE.Group();
          box.userData.size = [spacing * 0.9, 0.16, rowDepth * 0.85];
          box.position.set(-w / 2 + 0.1 + slotW * s + spacing * (i + 0.5), y, z);
          box.visible = false;
          this.group.add(box);
          slot.push(box);
        }
        this.boxes.push(slot);
      }
    }
  }

  private buildCheckout() {
    const [w, d] = furnitureDef('checkout').size;
    // Mẫu quầy để khách ở −z, còn đồ đặt thì phía trước là +z: quay nửa vòng
    const counter = createCounter(w, d);
    counter.rotation.y = Math.PI;
    this.group.add(counter);
  }

  private buildCartStation() {
    const [w, d] = furnitureDef('cartStation').size;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
    rail.position.set(0, 0.9, -d / 2 + 0.05);
    this.group.add(rail);
    for (let i = 0; i < 3; i++) {
      const cart = createCart();
      cart.position.set(0, 0, -d / 2 + 0.35 + i * 0.18);
      this.group.add(cart);
    }
  }

  private buildPlant() {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0xa04000 }),
    );
    pot.position.y = 0.175;
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x27ae60 }),
    );
    leaves.position.y = 0.6;
    leaves.scale.y = 1.3;
    this.group.add(pot, leaves);
  }

  private buildWall() {
    const [w, d] = furnitureDef('wall').size;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), new THREE.MeshStandardMaterial({ color: 0xfff3b0 }));
    wall.position.y = 0.75;
    wall.receiveShadow = true;
    wall.userData.paintable = true;
    this.group.add(wall);
  }

  /** Vách ngăn lấy theo màu tường tiệm. */
  setWallColor(color: number) {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.paintable) (o.material as THREE.MeshStandardMaterial).color.setHex(color);
    });
  }

  update(tiers: Tier[]) {
    tiers.forEach((tier, t) => {
      this.boxes[t]?.forEach((box, i) => {
        box.visible = !!tier.productId && i < tier.count;
        if (!tier.productId || box.userData.productId === tier.productId) return;
        box.userData.productId = tier.productId;
        box.clear();
        const [w, h, d] = box.userData.size as number[];
        box.add(createProductModel(tier.productId, w, h, d));
      });
    });
  }

  /** Biến thành bóng mờ xanh/đỏ để xem trước khi đặt. */
  makeGhost() {
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.material = (o.material as THREE.Material).clone();
      o.material.transparent = true;
      o.material.opacity = 0.55;
      o.material.depthWrite = false;
      o.castShadow = false;
    });
  }
}

/** Xe đẩy siêu thị (dùng cho bãi xe và khách đang đẩy xe). */
export function createCart(): THREE.Group {
  const cart = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.6, roughness: 0.4 });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), metal);
  basket.position.y = 0.65;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
  handle.position.set(0, 0.95, -0.38);
  cart.add(basket, handle);
  for (const [x, z] of [[-0.2, -0.28], [0.2, -0.28], [-0.2, 0.28], [0.2, 0.28]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.06, z);
    cart.add(wheel);
  }
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.04), metal);
  leg.position.set(0, 0.28, -0.3);
  cart.add(leg);
  return cart;
}
