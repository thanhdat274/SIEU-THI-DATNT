import * as THREE from 'three';
import type { Tier } from '../core/store';
import { furnitureDef, isCookStation, type FurnitureType } from '../data/furniture';
import { MACHINE_TYPES, type MachineId } from '../data/machines';
import { STATIONS } from '../data/recipes';

/** GĐ1504 — nhóm đồ dùng bếp/trang trí Việt dựng theo builder chung. */
const DECOR_TYPES = new Set<string>(['kho_dao', 'ke_gia_vi', 'ke_chen', 'thung_rac', 'tham_chan', 'den_long', 'tranh_dong_ho', 'bon_rua']);
import { createCounter } from '../world/buildings';
import { productParts } from '../render/productModels';
import type { ShelfInstancer } from './shelfInstancer';

/** Vật liệu dùng chung cho chi tiết trang trí kệ/tủ — dùng chung nên KHÔNG dispose theo từng kệ. */
const PRICE_STRIP = new THREE.MeshStandardMaterial({ color: 0xf5efdc, roughness: 1 });
const METAL_TRIM = new THREE.MeshStandardMaterial({ color: 0xb8bdc2, metalness: 0.5, roughness: 0.4 });
const HANDLE = new THREE.MeshStandardMaterial({ color: 0xcfd6da, metalness: 0.6, roughness: 0.35 });
const SHARED_MATS = new Set<THREE.Material>([PRICE_STRIP, METAL_TRIM, HANDLE]);

/** Biểu tượng emoji lơ lửng (dấu hiệu kệ trống, biểu tượng trạm nấu). */
function makeBadgeSprite(text: string, scale = 0.55): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '46px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 36);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

/** Hình 3D của một món nội thất. Kệ/tủ hiện đúng số món hàng (mô hình 3D) còn trên mỗi tầng. */
export class FurnitureView {
  group = new THREE.Group();
  private boxes: THREE.Group[][] = [];
  /** Mặt tầng kệ (mỗi tầng một material riêng) để tô đỏ khi ô đã gán món mà hết hàng. */
  private boards: THREE.Mesh[] = [];
  private baseColor = 0;
  private topY = 2.2;
  /** Dấu ⚠️ nổi trên kệ khi có ô đã gán món mà hết hàng (kệ trống mà khách đang tìm). */
  private emptyMark: THREE.Sprite | null = null;
  /** Hàng hóa trên kệ vẽ bằng InstancedMesh theo từng món: 1 draw call / món thay vì 1 draw call / hộp. */
  private instanced = new Map<string, THREE.InstancedMesh[]>();
  /** Chữ ký danh sách hộp đã vẽ cho từng món — trùng thì bỏ qua dựng lại InstancedMesh. */
  private instSig = new Map<string, string>();
  private readonly _m = new THREE.Matrix4();

  constructor(public type: FurnitureType, private readonly shared?: ShelfInstancer) {
    if (type === 'plant') this.buildPlant();
    else if (type === 'wall') this.buildWall();
    else if (type === 'checkout') this.buildCheckout();
    else if (type === 'cartStation') this.buildCartStation();
    else if (type === 'dining_table') this.buildDiningTable();
    else if (type === 'chair') this.buildChair();
    else if (type === 'vending_drink' || type === 'scale_machine' || type === 'claw_machine') this.buildMachine();
    else if (type === 'toilet_squat' || type === 'toilet_porcelain' || type === 'toilet_smart') this.buildToilet();
    else if (DECOR_TYPES.has(type)) this.buildDecorProp();
    else if (isCookStation(type)) this.buildCookStation();
    else if (type === 'freezer') this.buildChest(0xf4f6f7, 0.85, true);
    else if (type === 'produce') this.buildChest(0x8b5a2b, 0.75, false);
    else if (type === 'meat_counter') this.buildChest(0xf3e9e9, 0.9, true);
    else this.buildShelf(type === 'fridge' ? 0xdfe6e9 : type === 'bigShelf' ? 0x95a5a6 : 0x8b5a2b, type === 'fridge');
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    // Kệ/tủ đứng yên: tính ma trận một lần rồi tắt auto-update, đỡ cho cả nghìn hộp hàng
    // phải ghép ma trận lại mỗi khung. Thân group vẫn tự cập nhật để xây/chuyển đổi chỗ được.
    this.group.updateMatrixWorld(true);
    this.group.traverse((o) => {
      if (o !== this.group) o.matrixAutoUpdate = false;
    });
  }

  /** Giải phóng tài nguyên GPU khi món nội thất rời khỏi tiệm. */
  dispose() {
    this.shared?.removeOwner(this);
    // InstancedMesh: geometry/vật liệu là DÙNG CHUNG cho mọi kệ, chỉ giải phóng bộ đệm instance
    for (const parts of this.instanced.values()) for (const im of parts) im.dispose();
    this.instanced.clear();
    const freeMat = (m: THREE.Material) => {
      (m as unknown as { map?: THREE.Texture }).map?.dispose();
      m.dispose();
    };
    this.group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) return; // đã xử lý ở trên
      if (!(o instanceof THREE.Mesh || o instanceof THREE.Sprite)) return;
      o.geometry?.dispose();
      const mat = o.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => { if (!SHARED_MATS.has(m)) freeMat(m); });
      else if (!SHARED_MATS.has(mat)) freeMat(mat);
    });
  }

  /** Trạm nấu: bệ gỗ + dụng cụ riêng từng trạm + biểu tượng trạm nổi trên cao. */
  private buildCookStation() {
    const def = furnitureDef(this.type);
    const [w, d] = def.size;
    const steel = new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.4, roughness: 0.5 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), wood);
    base.position.y = 0.45;
    this.group.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), steel);
    top.position.y = 0.93;
    this.group.add(top);
    this.topY = 1.6;
    const heat = (color: number) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 });
    switch (this.type) {
      case 'hot_kettle': {
        // GĐ1394: nồi nấu to có nắp + 2 quai trên bếp (trước là ấm có vòi — không hợp phở/cháo/món kho).
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.26, 16), steel);
        pot.position.set(0, 1.09, 0);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 16), steel);
        lid.position.set(0, 1.235, 0);
        const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.05), steel);
        handleL.position.set(-0.27, 1.17, 0);
        const handleR = handleL.clone();
        handleR.position.x = 0.27;
        this.group.add(pot, lid, handleL, handleR);
        break;
      }
      case 'food_grill': {
        const grill = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.12, d * 0.6), steel);
        grill.position.set(0, 1.02, 0);
        const fire = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.03, d * 0.45), heat(0xe67e22));
        fire.position.set(0, 1.09, 0);
        this.group.add(grill, fire);
        break;
      }
      case 'blender': {
        const jar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.09, 0.34, 12),
          new THREE.MeshStandardMaterial({ color: 0xaee4ff, transparent: true, opacity: 0.7 }),
        );
        jar.position.set(0, 1.14, 0);
        const motor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.26), steel);
        motor.position.set(0, 0.99, 0);
        this.group.add(jar, motor);
        break;
      }
      case 'drink_counter': {
        for (const dx of [-0.25, 0, 0.25]) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xf5f6fa }));
          cup.position.set(dx, 1.03, 0.14);
          this.group.add(cup);
        }
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.26, 12), heat(0x6e2c00));
        pot.position.set(-0.4, 1.09, -0.12);
        this.group.add(pot);
        break;
      }
      case 'fryer': {
        const vat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.16, d * 0.55), steel);
        vat.position.set(0, 1.04, 0);
        const oil = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.02, d * 0.42), heat(0xf9ca24));
        oil.position.set(0, 1.13, 0);
        this.group.add(vat, oil);
        break;
      }
      case 'sugarcane_press': {
        for (const dx of [-0.11, 0.11]) {
          const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12), steel);
          roller.rotation.z = Math.PI / 2;
          roller.position.set(dx, 1.15, 0);
          this.group.add(roller);
        }
        break;
      }
      case 'rice_station': {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.22, 14), heat(0xf5cba7));
        pot.position.set(0, 1.06, 0);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 14), wood);
        lid.position.set(0.14, 1.22, 0.06);
        lid.rotation.z = 0.5;
        this.group.add(pot, lid);
        break;
      }
      case 'steamer': {
        for (const [i, y] of [1.05, 1.24].entries()) {
          const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.17, 14), i === 0 ? steel : wood);
          tier.position.set(0, y, 0);
          this.group.add(tier);
        }
        break;
      }
      case 'gift_wrap': {
        // Bàn gói quà: vài hộp quà sắc màu + dây nơ vàng xếp trên mặt bàn
        const wrap = (color: number, x: number, z: number, size: number) => {
          const box = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.8, size), new THREE.MeshStandardMaterial({ color }));
          box.position.set(x, 0.96 + size * 0.4, z);
          box.rotation.y = x * 0.8;
          const ribbon = new THREE.Mesh(new THREE.BoxGeometry(size * 1.04, size * 0.12, size * 0.18), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
          ribbon.position.copy(box.position);
          ribbon.rotation.copy(box.rotation);
          this.group.add(box, ribbon);
        };
        wrap(0xc0392b, -0.22, 0.05, 0.24);
        wrap(0x27ae60, 0.16, -0.12, 0.2);
        wrap(0x2980b9, 0.05, 0.16, 0.16);
        break;
      }
    }
    const st = STATIONS.find((x) => x.id === this.type);
    const badge = makeBadgeSprite(st?.icon ?? '🍳');
    badge.position.y = this.topY;
    this.group.add(badge);
  }

  private buildShelf(color: number, fridge: boolean) {
    const def = furnitureDef(this.type);
    const [w, d] = def.size;
    const height = fridge || def.tiers > 3 ? 1.9 : 1.7;
    const tierGap = (height - 0.25) / def.tiers;
    const frameMat = new THREE.MeshStandardMaterial({ color });
    this.baseColor = color;
    this.topY = height + 0.4;

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
    // Đế kệ thụt vào trong (tóc kệ) như kệ siêu thị thật
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.1, d - 0.06), new THREE.MeshStandardMaterial({ color: 0x3a3a40 }));
    plinth.position.y = 0.05;
    this.group.add(plinth);

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
      // Tay nắm dọc hai bên cửa kính
      for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, height * 0.45, 0.045), HANDLE);
        handle.position.set(x, height / 2, d / 2 + 0.025);
        this.group.add(handle);
      }
    }

    const slotW = (w - 0.2) / def.slots;
    // Tủ mát sâu 0.7m xếp 2 cột × 3 hàng sâu như tủ nước ngoài đời; kệ thường cũng 2 hàng sâu
    // thay vì 1 hàng thưa — chai lọ to hơn và đầy kệ hơn.
    const depthRows = fridge ? 3 : 2;
    const cols = Math.ceil(def.capacity / depthRows);
    const colW = (slotW - 0.04) / cols;
    const rowDepth = (d - 0.12) / depthRows;
    for (let t = 0; t < def.tiers; t++) {
      const y = 0.12 + t * tierGap;
      // Mỗi tầng một mặt riêng để tô đỏ khi ô của tầng đó hết hàng
      const board = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.04, d - 0.04), new THREE.MeshStandardMaterial({ color }));
      board.position.y = y;
      this.group.add(board);
      this.boards.push(board);
      // Kệ hở có thanh tem giá dọc mép trước từng tầng — kệ tạp hóa thật nào cũng có
      if (!fridge) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.055, 0.015), PRICE_STRIP);
        strip.position.set(0, y + 0.045, d / 2 - 0.012);
        this.group.add(strip);
      }

      const boxH = Math.min(0.3, tierGap - 0.12);
      for (let s = 0; s < def.slots; s++) {
        const slot: THREE.Group[] = [];
        for (let i = 0; i < def.capacity; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols); // lấp hàng trước trước, hàng sau lộ dần khi sắp hết
          const box = new THREE.Group();
          box.userData.size = [colW * 0.9, boxH, rowDepth * 0.85];
          box.position.set(-w / 2 + 0.12 + slotW * s + colW * (col + 0.5), y + 0.02, d / 2 - 0.06 - rowDepth * (row + 0.5));
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
    this.baseColor = color;
    this.topY = height + 0.5;
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
      // Viền nhôm quanh miệng tủ đông + tay nắm phía trước
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.07, d + 0.04), METAL_TRIM);
      rim.position.y = height - 0.01;
      this.group.add(rim);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.07), HANDLE);
      grip.position.set(0, height + 0.06, d / 2 - 0.02);
      this.group.add(grip);
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

  /** GĐ1490 — bàn ăn khu ăn tại chỗ: mặt bàn gỗ sáng + 4 chân, để tô/ly trên mặt cho ra dáng quán ăn. */
  private buildDiningTable() {
    const [w, d] = furnitureDef(this.type).size;
    const wood = new THREE.MeshStandardMaterial({ color: 0xb98a4e });
    const leg = new THREE.MeshStandardMaterial({ color: 0x6e4a22 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), wood);
    top.position.y = 0.72;
    this.group.add(top);
    for (const [x, z] of [[-w / 2 + 0.09, -d / 2 + 0.09], [w / 2 - 0.09, -d / 2 + 0.09], [-w / 2 + 0.09, d / 2 - 0.09], [w / 2 - 0.09, d / 2 - 0.09]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), leg);
      l.position.set(x, 0.36, z);
      this.group.add(l);
    }
    // Tô nước/đĩa trống trên bàn — nhìn phát biết là chỗ khách ngồi ăn
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xf5f6fa }));
    bowl.position.set(0.18, 0.78, 0.1);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0xaee4ff, transparent: true, opacity: 0.75 }));
    cup.position.set(-0.22, 0.8, -0.12);
    this.group.add(bowl, cup);
  }

  /** GĐ1490 — ghế ăn: đệm + lưng ghế + 4 chân, quay mặt về phía trước (khách xoay ghế nhìn mặt bàn). */
  private buildChair() {
    const wood = new THREE.MeshStandardMaterial({ color: 0xa9713c });
    const leg = new THREE.MeshStandardMaterial({ color: 0x6e4a22 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), wood);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.05), wood);
    back.position.set(0, 0.68, -0.2);
    this.group.add(seat, back);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), leg);
      l.position.set(x, 0.225, z);
      this.group.add(l);
    }
  }

  private buildWall() {
    const [w, d] = furnitureDef('wall').size;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), new THREE.MeshStandardMaterial({ color: 0xfff3b0 }));
    wall.position.y = 0.75;
    wall.receiveShadow = true;
    wall.userData.paintable = true;
    this.group.add(wall);
  }

  /** GĐ1493 — máy tự phục vụ: thân máy + mặt hiển thị/phiếu hướng ra trước, từng loại khác chi tiết. */
  private buildMachine() {
    const [w, d] = furnitureDef(this.type).size;
    const body = new THREE.MeshStandardMaterial({ color: this.type === 'claw_machine' ? 0xc0392b : this.type === 'vending_drink' ? 0x2980b9 : 0xf5f6fa });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), body);
    shell.position.y = 0.8;
    this.group.add(shell);
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 0.7, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x22313f, emissive: 0x22313f, emissiveIntensity: 0.25 }),
    );
    face.position.set(0, 1.1, d / 2 + 0.015);
    this.group.add(face);
    switch (this.type) {
      case 'vending_drink': {
        // Hàng nước xếp sau cửa kính
        for (const [x, y] of [[-0.2, 1.2], [0.02, 1.2], [0.24, 1.2], [-0.2, 0.95], [0.02, 0.95]]) {
          const can = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
          can.position.set(x, y, d / 2 - 0.08);
          this.group.add(can);
        }
        break;
      }
      case 'scale_machine': {
        // Sàn cân nhô ra trước + cột màn hình
        const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.06, d * 0.9), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
        pad.position.y = 0.03;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
        post.position.set(w / 2 - 0.1, 0.5, -d / 2 + 0.1);
        this.group.add(pad, post);
        break;
      }
      case 'claw_machine': {
        // Buồng kính + chồng thú bông bên trong
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.75, 0.7, d * 0.6),
          new THREE.MeshStandardMaterial({ color: 0xaee4ff, transparent: true, opacity: 0.3 }),
        );
        glass.position.set(0, 1.05, 0);
        this.group.add(glass);
        for (const [x, z] of [[-0.15, -0.05], [0.1, 0.08], [0.18, -0.1]]) {
          const plush = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfd79a8 }));
          plush.position.set(x, 0.86, z);
          this.group.add(plush);
        }
        break;
      }
    }
    const badge = makeBadgeSprite(MACHINE_TYPES[this.type as MachineId].icon, 0.5);
    badge.position.y = 1.95;
    this.group.add(badge);
  }

  /** GĐ1494 — nhà vệ sinh: bồn + biển người ra vào; thông minh thêm thân máy cao. */
  private buildToilet() {
    const [w, d] = furnitureDef(this.type).size;
    const white = new THREE.MeshStandardMaterial({ color: 0xf8f9fa });
    const floorPad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), new THREE.MeshStandardMaterial({ color: 0xbdc3c7 }));
    floorPad.position.y = 0.02;
    this.group.add(floorPad);
    if (this.type === 'toilet_squat') {
      // Bồn ngồi xổm: ô sàn men trắng trũng giữa tấm sàn
      const bowl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.06, d * 0.5), white);
      bowl.position.y = 0.06;
      this.group.add(bowl);
    } else {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.24, 12), white);
      bowl.position.set(0, 0.16, 0.08);
      const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.14), white);
      tank.position.set(0, 0.42, -d / 2 + 0.1);
      this.group.add(bowl, tank);
      if (this.type === 'toilet_smart') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 1.5, d * 0.4), new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
        body.position.set(0, 0.75, -d / 2 + 0.05);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.03), new THREE.MeshStandardMaterial({ color: 0x22313f }));
        panel.position.set(w * 0.25, 1.0, d / 2 - 0.06);
        this.group.add(body, panel);
      }
    }
    const badge = makeBadgeSprite('🚽', 0.45);
    badge.position.y = 1.8;
    this.group.add(badge);
  }

  /** GĐ1504 — đồ dùng bếp/trang trí Việt: mỗi món một dựng đơn giản đúng hình, điểm 🩷 đọc từ FurnitureDef. */
  private buildDecorProp() {
    const [w, d] = furnitureDef(this.type).size;
    const wood = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const steel = new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.5, roughness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf5f6fa });
    const red = new THREE.MeshStandardMaterial({ color: 0xc0392b });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    switch (this.type) {
      case 'tham_chan': {
        const mat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), red);
        mat.position.y = 0.015;
        this.group.add(mat);
        break;
      }
      case 'thung_rac': {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
        body.position.y = 0.25;
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x1e8449 }));
        lid.position.y = 0.52;
        this.group.add(body, lid);
        break;
      }
      case 'den_long': {
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), steel);
        string.position.y = 1.35;
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c, emissiveIntensity: 0.4 }));
        lantern.position.y = 0.95;
        lantern.scale.y = 1.15;
        const caps = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), gold);
        caps.position.y = 1.13;
        this.group.add(string, lantern, caps);
        break;
      }
      case 'kho_dao': {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.06), steel);
        bar.position.y = 1.1;
        this.group.add(bar);
        for (const x of [-0.18, -0.06, 0.06, 0.18]) {
          const knife = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), steel);
          knife.position.set(x, 0.95, 0);
          this.group.add(knife);
        }
        break;
      }
      case 'ke_gia_vi': {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), wood);
        frame.position.y = 0.9;
        this.group.add(frame);
        for (const x of [-0.15, 0, 0.15]) {
          const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), white);
          jar.position.set(x, 1.2, 0);
          this.group.add(jar);
        }
        break;
      }
      case 'ke_chen': {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), wood);
        frame.position.y = 0.35;
        this.group.add(frame);
        for (const y of [0.25, 0.5]) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.05, 12), white);
          plate.position.set(0, y + 0.05, 0);
          this.group.add(plate);
        }
        break;
      }
      case 'tranh_dong_ho': {
        // Tranh treo cao như tranh tường: khung gỗ + mặt tranh vàng chữ
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, 0.05), wood);
        frame.position.y = 1.4;
        const art = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.72, 0.02), new THREE.MeshStandardMaterial({ color: 0xf9e79f }));
        art.position.set(0, 1.4, 0.03);
        this.group.add(frame, art);
        break;
      }
      case 'bon_rua': {
        const basin = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), steel);
        basin.position.y = 0.75;
        const legs = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.62, d * 0.85), new THREE.MeshStandardMaterial({ color: 0x616e6e }));
        legs.position.y = 0.31;
        const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), steel);
        tap.position.set(0, 0.95, -d / 2 + 0.08);
        this.group.add(basin, legs, tap);
        break;
      }
    }
    const badge = makeBadgeSprite('🩷', 0.35);
    badge.position.y = 1.75;
    this.group.add(badge);
  }

  /** Vách ngăn lấy theo màu tường tiệm. */
  setWallColor(color: number) {    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.paintable) (o.material as THREE.MeshStandardMaterial).color.setHex(color);
    });
  }

  update(tiers: Tier[]) {
    // Thu gom các hộp đang hiển thị theo từng món hàng; mỗi món được vẽ bằng 1 InstancedMesh cho cả kệ
    const seen = new Map<string, THREE.Group[]>();
    tiers.forEach((tier, t) => {
      const slot = this.boxes[t];
      if (!slot) return;
      for (let i = 0; i < slot.length; i++) {
        const box = slot[i];
        if (!tier.productId || i >= tier.count) { box.visible = false; continue; }
        box.visible = false; // InstancedMesh chịu trách nhiệm vẽ
        let list = seen.get(tier.productId);
        if (!list) { list = []; seen.set(tier.productId, list); }
        list.push(box);
      }
    });
    // Gỡ InstancedMesh của món không còn trên kệ nữa
    for (const pid of [...(this.shared ? this.instSig.keys() : this.instanced.keys())]) if (!seen.has(pid)) this.dropInstanced(pid);
    for (const [pid, boxes] of seen) this.renderInstanced(pid, boxes);
    this.refreshEmptyMark(tiers);
  }

  private renderInstanced(productId: string, boxes: THREE.Group[]) {
    if (this.shared) return this.renderShared(productId, boxes);
    let parts = this.instanced.get(productId);
    if (!parts) {
      const [w, h, d] = boxes[0].userData.size as number[];
      const cap = this.boxes.reduce((n, slot) => n + slot.length, 0);
      parts = productParts(productId, w, h, d).map(({ geometry, material }) => {
        const im = new THREE.InstancedMesh(geometry, material, cap);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(im);
        return im;
      });
      this.instanced.set(productId, parts);
    }
    // Kệ không đổi (cùng hộp, cùng chỗ) thì khỏi dựng lại ma trận + hình cầu bao: update() chạy mỗi lần state đổi
    let sig = '';
    for (const b of boxes) sig += b.id + ',';
    if (this.instSig.get(productId) === sig) return;
    this.instSig.set(productId, sig);
    for (const im of parts) {
      for (let i = 0; i < boxes.length; i++) {
        this._m.identity().setPosition(boxes[i].position);
        im.setMatrixAt(i, this._m);
      }
      im.count = boxes.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  }

  /** Gộp xuyên kệ (GĐ886): gửi ma trận (toạ độ cha của kệ) cho ShelfInstancer; kệ không đổi thì bỏ qua. */
  private renderShared(productId: string, boxes: THREE.Group[]) {
    const g = this.group;
    let sig = `${g.position.x},${g.position.z},${g.rotation.y}|`;
    for (const b of boxes) sig += b.id + ',';
    if (this.instSig.get(productId) === sig) return;
    this.instSig.set(productId, sig);
    g.updateMatrix();
    const mats = boxes.map((b) => new THREE.Matrix4().multiplyMatrices(g.matrix, this._m.identity().setPosition(b.position)));
    this.shared!.set(this, productId, boxes[0].userData.size as number[], mats);
  }

  private dropInstanced(productId: string) {
    if (this.shared) {
      this.shared.set(this, productId, [], null);
      this.instSig.delete(productId);
      return;
    }
    const parts = this.instanced.get(productId);
    if (!parts) return;
    for (const im of parts) {
      this.group.remove(im);
      im.dispose();
    }
    this.instanced.delete(productId);
    this.instSig.delete(productId);
  }

  /** Ô đã gán món mà hết hàng: tô đỏ mặt tầng đó và nổi dấu ⚠️ trên kệ — chủ tiệm nhìn phát biết chỗ cần châm. */
  private refreshEmptyMark(tiers: Tier[]) {
    if (!this.boxes.length) return;
    const def = furnitureDef(this.type);
    const emptyRow = new Set<number>();
    tiers.forEach((tier, i) => {
      if (tier.productId && tier.count <= 0) emptyRow.add(Math.floor(i / def.slots));
    });
    this.boards.forEach((board, row) => {
      (board.material as THREE.MeshStandardMaterial).color.setHex(emptyRow.has(row) ? 0xe17055 : this.baseColor);
    });
    if (emptyRow.size) {
      if (!this.emptyMark) {
        this.emptyMark = makeBadgeSprite('⚠️', 0.5);
        this.emptyMark.position.y = this.topY;
        this.group.add(this.emptyMark);
      }
      this.emptyMark.visible = true;
    } else if (this.emptyMark) {
      this.emptyMark.visible = false;
    }
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
