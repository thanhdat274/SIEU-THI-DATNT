import * as THREE from 'three';

/**
 * "Cái xác" 3D của quán nước đầu ngõ (GĐ12) — hoàn toàn hình ảnh, dựng bằng hộp thủ tục như
 * world.ts/buildings.ts, không dùng asset ngoài. Có hai lớp:
 *  - `lot`: khoảnh đất (sàn mỏng, vài viên gạch, tấm biển gỗ "ĐỒ UỐNG") + marker 🧋 phát sáng,
 *    hiện khi đủ cấp mở quán (cấp 29) mà chưa mua — gợi sự chú ý.
 *  - `stand`: quầy nước thật sự (mặt quầy + ly/chai màu + cây dù che nắng + bàn ghế theo số nhân
 *    viên), hiện khi đã mở quán.
 * Cả hai mặc định ẩn; bên ngoài bật/ẩn qua `visible`. `boxes` cố tình để rỗng: quán đặt sát mép
 * hẻm chỉ để hình ảnh, không chặn lưới đi lại nên NPC không bị mắc kẹt (ưu tiên an toàn điều hướng).
 */
export interface QuanNuocStand {
  group: THREE.Group;
  lot: THREE.Group;
  stand: THREE.Group;
  /** Bật/ẩn số bàn ghế theo số nhân viên: 0 = chỉ quầy + cây dù; 1→3 = thêm bàn. */
  setStaff(n: number): void;
  /** Hộp các khối chính nếu muốn chặn nav — để rỗng cho an toàn đi lại. */
  boxes: THREE.Box3[];
}

/** Màu các ly/chai bày trên quầy, lấy cảm hứng từ IMPULSE_COLORS trong buildings.ts. */
const CUP_COLORS = [0xe84393, 0x0984e3, 0xfdcb6e, 0xe17055, 0x00b894, 0x6c5ce7, 0xd63031, 0xff7a00];

export function createQuanNuocStand(): QuanNuocStand {
  const group = new THREE.Group();
  const lot = buildLot();
  const stand = buildStand();
  group.add(lot, stand.group);
  lot.visible = false;
  stand.group.visible = false;
  return { group, lot, stand: stand.group, setStaff: stand.setStaff, boxes: [] };
}

/** Khoảnh đất trống đủ cấp chưa mua: sàn mỏng, gạch mép, biển gỗ "ĐỒ UỐNG", marker 🧋 gợi chú ý. */
function buildLot(): THREE.Group {
  const g = new THREE.Group();
  const soil = new THREE.MeshStandardMaterial({ color: 0xc8a165, roughness: 0.9 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xb0a893, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  // Khoảnh đất: sàn nâu nhạt mỏng sát đất + vài viên gạch ở bốn góc cho rõ mép
  box(3.0, 0.08, 2.5, soil, 0, 0.04, 0);
  for (const [x, z] of [[-1.4, 0.9], [1.4, 0.9], [-1.4, -0.9], [1.4, -0.9]] as const) box(0.5, 0.06, 0.5, stone, x, 0.09, z);
  // Tấm biển gỗ nhỏ ở mép trước: hai cọc + mặt viết chữ "ĐỒ UỐNG"
  box(0.08, 1.1, 0.08, wood, -1.3, 0.6, 1.15);
  box(0.08, 1.1, 0.08, wood, 1.3, 0.6, 1.15);
  box(2.7, 0.5, 0.08, wood, 0, 1.35, 1.15);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.42), new THREE.MeshStandardMaterial({ map: drinkSignTexture(), roughness: 0.6 }));
  face.position.set(0, 1.35, 1.205);
  g.add(face);
  // Marker 🧋 kiểu createDeliveryMarker: cột mảnh + hộp xanh cyan phát sáng nổi phía trên
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
  pole.position.y = 0.8;
  const markerBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.32, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x26a69a, emissive: 0x00e5ff, emissiveIntensity: 0.9 }),
  );
  markerBox.position.y = 2.05;
  markerBox.name = 'markerBox';
  g.add(pole, markerBox);
  return g;
}

/** Quầy nước thật sự: mặt quầy + ly/chai màu + cây dù, và bàn ghế bật theo nhân viên. */
function buildStand(): { group: THREE.Group; setStaff(n: number): void } {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xe8c190, roughness: 0.7 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0xb98a4a, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.4, metalness: 0.5 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  // Quầy nước: chân đế, thân, mặt quầy — dài theo x, khách đứng phía +z (mặt rộng)
  const H = 0.95;
  box(3.0, 0.05, 1.0, wood, 0, 0.025, -0.8);
  box(3.0, H - 0.05, 0.9, woodDark, 0, H / 2, -0.8);
  box(3.0, 0.04, 1.05, wood, 0, H - 0.02, -0.8);
  // Ly/chai màu bày trên quầy: ba cột × ba chai, độ cao đổi chút cho sinh động
  const drinkMats = CUP_COLORS.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
  let k = 0;
  for (const col of [-1, 0, 1]) {
    for (const row of [-1, 0, 1]) {
      const m = drinkMats[k % drinkMats.length];
      const cupH = 0.18 + (k % 4) * 0.05;
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, cupH, 10), m);
      bottle.position.set(col * 0.9, H + cupH / 2, -0.62 + row * 0.22 + ((k % 2) ? 0.04 : -0.04));
      bottle.castShadow = true;
      g.add(bottle);
      k++;
    }
  }
  // Cây dù/ô che nắng: cột + mặt nón xếp nghiêng ở sau quầy
  const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 8), metal);
  umbrellaPole.position.set(-1.35, 1.15, -1.45);
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: 0xe65100, side: THREE.DoubleSide, roughness: 0.7 }),
  );
  canopy.position.set(-1.35, 2.44, -1.45);
  canopy.rotation.x = 0.22;
  g.add(umbrellaPole, canopy);
  // Bàn ghế đặt phía mặt rộng của quầy (+z), xếp theo hàng — mỗi bàn nhỏ + 3 ghế quanh
  const tablePos: [number, number][] = [[-0.95, 0.62], [0.05, 1.02], [1.0, 0.62]];
  const tableGroups: THREE.Group[] = [];
  for (const [tx, tz] of tablePos) {
    const t = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), woodDark);
    leg.position.y = 0.35;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.72), wood);
    top.position.y = 0.72;
    t.add(leg, top);
    for (const [ax, az] of [[0.52, 0], [0, -0.46], [-0.46, -0.16]] as const) {
      const chair = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.34), woodDark);
      seat.position.y = 0.46;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.045), woodDark);
      back.position.y = 0.63;
      chair.add(seat, back);
      chair.position.set(ax, 0, az);
      chair.rotation.y = Math.atan2(ax, az);
      t.add(chair);
    }
    t.position.set(tx, 0, tz);
    t.visible = false;
    g.add(t);
    tableGroups.push(t);
  }
  const setStaff = (n: number) => {
    const count = THREE.MathUtils.clamp(Math.floor(n), 0, tableGroups.length);
    tableGroups.forEach((t, i) => { t.visible = i < count; });
  };
  return { group: g, setStaff };
}

/** Mặt biển "ĐỒ UỐNG": chữ trắng đậm trên nền xanh cyan (màu thương hiệu quán). */
function drinkSignTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 146;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#26a69a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ĐỒ UỐNG', c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
