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
  /** Vẽ lại bảng phấn thực đơn sau quầy (GĐ416) từ các dòng `menuBoardLines`. */
  setMenu(lines: string[]): void;
  /** Khách ngồi ở các ghế bàn đang hiện (GĐ426), hình khối đơn giản, không phải agent. */
  setPatrons(n: number): void;
  /** Bậc cửa hàng (GĐ429): đổi biển hiệu + màu mái hiên theo quầy / quán / cà phê. */
  setTier(n: number): void;
  /** GĐ488: ẩn mái khi chủ đứng trong quán. */
  setRoofHidden(on: boolean): void;
  /** Hộp các khối chính nếu muốn chặn nav — để rỗng cho an toàn đi lại. */
  boxes: THREE.Box3[];
}

/** Biển hiệu + màu mái hiên theo bậc cửa hàng (GĐ429). */
export const QUAN_TIER_SIGNS = ['QUẦY NƯỚC', 'QUÁN NƯỚC', 'CÀ PHÊ'];
const QUAN_TIER_AWNINGS = [0xff8a3d, 0x2e86de, 0x6f4e37];

/** Màu các ly/chai bày trên quầy, lấy cảm hứng từ IMPULSE_COLORS trong buildings.ts. */
const CUP_COLORS = [0xe84393, 0x0984e3, 0xfdcb6e, 0xe17055, 0x00b894, 0x6c5ce7, 0xd63031, 0xff7a00];

export function createQuanNuocStand(): QuanNuocStand {
  const group = new THREE.Group();
  const lot = buildLot();
  const stand = buildStand();
  group.add(lot, stand.group);
  lot.visible = false;
  stand.group.visible = false;
  return { group, lot, stand: stand.group, setStaff: stand.setStaff, setMenu: stand.setMenu, setPatrons: stand.setPatrons, setTier: stand.setTier, setRoofHidden: stand.setRoofHidden, boxes: [] };
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

/** Kích thước nhà quán nước (GĐ424, bước 1 "cửa hàng nước thật"): toạ độ cục bộ quanh gốc quán
 *  (thế giới 54.4, 0, 1). Mép tây 52.6 chừa hẻm (≤52.5), mép trước z 1.8 chừa vỉa hè/đường (z ≥ 3). */
export const QUAN_HOUSE = { x: 1.0, z: -1.7, width: 5.6, depth: 5, height: 3 } as const;

/** GĐ488: điểm (thế giới) có nằm trong nhà quán nước đặt ở gốc (ox, oz) không. */
export const insideQuanHouse = (ox: number, oz: number, x: number, z: number) =>
  Math.abs(x - ox - QUAN_HOUSE.x) < QUAN_HOUSE.width / 2 && Math.abs(z - oz - QUAN_HOUSE.z) < QUAN_HOUSE.depth / 2;

/** Nửa bề rộng lối cửa giữa mặt tiền (m). */
export const QUAN_DOOR_HALF = 0.85;

/**
 * Khối chặn lưới đi lại của nhà quán nước (GĐ425, bước 2): tường sau, hai tường hông, hai đoạn mặt tiền
 * hai bên cửa, quầy pha và tủ mát — toạ độ THẾ GIỚI theo gốc quán (ox, oz). Cửa giữa để trống nên người
 * chơi/NPC chỉ vào được qua cửa.
 */
export function quanHouseBoxes(ox: number, oz: number): THREE.Box3[] {
  const { x, z, width: W, depth: D, height: H } = QUAN_HOUSE;
  const cx = ox + x, cz = oz + z, t = 0.12;
  const b = (x1: number, z1: number, x2: number, z2: number) =>
    new THREE.Box3(new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, H, z2));
  const front = cz + D / 2, back = cz - D / 2;
  return [
    b(cx - W / 2, back - t / 2, cx + W / 2, back + t / 2),
    b(cx - W / 2 - t / 2, back, cx - W / 2 + t / 2, front),
    b(cx + W / 2 - t / 2, back, cx + W / 2 + t / 2, front),
    b(cx - W / 2, front - t / 2, cx - QUAN_DOOR_HALF, front + t / 2),
    b(cx + QUAN_DOOR_HALF, front - t / 2, cx + W / 2, front + t / 2),
    b(cx - 1.65, cz - 0.6, cx + 1.65, cz + 0.2),
    b(cx + W / 2 - 1.15, back, cx + W / 2, back + 0.85),
  ];
}

/** Cửa hàng nước: nhà nhỏ tường + mái + mặt tiền kính, bên trong quầy pha, tủ mát, kệ ly, máy xay,
 *  bảng phấn thực đơn; bàn ghế ngoài hiên bật theo số nhân viên. */
function buildStand(): { group: THREE.Group; setStaff(n: number): void; setMenu(lines: string[]): void; setPatrons(n: number): void; setTier(n: number): void; setRoofHidden(on: boolean): void } {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xbfe9e2, roughness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x26a69a, roughness: 0.6 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x1f6f68, roughness: 0.7 });
  const floor = new THREE.MeshStandardMaterial({ color: 0xd9c7a8, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xe8c190, roughness: 0.7 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0xb98a4a, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.4, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.28, roughness: 0.1 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  const { x: cx, z: cz, width: W, depth: D, height: H } = QUAN_HOUSE;
  const front = cz + D / 2;
  const back = cz - D / 2;
  const T = 0.12;
  // Sàn, ba bức tường, mái bằng có viền màu thương hiệu
  box(W, 0.06, D, floor, cx, 0.03, cz);
  box(W, H, T, wall, cx, H / 2, back);
  box(T, H, D, wall, cx - W / 2, H / 2, cz);
  box(T, H, D, wall, cx + W / 2, H / 2, cz);
  const roofSlab = box(W + 0.4, 0.16, D + 0.5, roof, cx, H + 0.08, cz + 0.1);
  box(W + 0.42, 0.3, 0.08, trim, cx, H - 0.1, front + 0.36);
  // Mặt tiền: hai trụ, kính hai bên, cửa trống ở giữa (rộng 1.4 m) để nhìn vào trong
  box(0.18, H, 0.18, trim, cx - W / 2, H / 2, front);
  box(0.18, H, 0.18, trim, cx + W / 2, H / 2, front);
  box(0.3, H, 0.14, trim, cx - 0.7, H / 2, front);
  box(0.3, H, 0.14, trim, cx + 0.7, H / 2, front);
  box(W / 2 - 0.85, H - 0.6, 0.04, glass, cx - (W / 4 + 0.42), (H - 0.6) / 2 + 0.3, front);
  box(W / 2 - 0.85, H - 0.6, 0.04, glass, cx + (W / 4 + 0.42), (H - 0.6) / 2 + 0.3, front);
  box(W, 0.5, 0.14, trim, cx, H - 0.25, front);
  // Mái hiên vải sọc phía trước + biển tên
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.8 });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.05, 0.9), awningMat);
  awning.position.set(cx, H - 0.45, front + 0.45);
  awning.rotation.x = 0.28;
  g.add(awning);
  const signMat = new THREE.MeshStandardMaterial({ map: drinkSignTexture('QUÁN NƯỚC'), roughness: 0.6 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.44), signMat);
  sign.position.set(cx, H + 0.42, front + 0.37);
  box(2.75, 0.55, 0.06, trim, cx, H + 0.42, front + 0.33);
  g.add(sign);
  // Quầy pha chạy ngang trong nhà, khách đứng phía cửa
  const counterZ = cz - 0.2;
  box(3.2, 0.95, 0.7, woodDark, cx, 0.475, counterZ);
  box(3.3, 0.05, 0.8, wood, cx, 0.97, counterZ);
  // Máy xay + bình trà + ly bày trên quầy
  box(0.22, 0.12, 0.22, metal, cx - 1.1, 1.06, counterZ);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.3, 10), glass);
  jar.position.set(cx - 1.1, 1.27, counterZ);
  g.add(jar);
  const drinkMats = CUP_COLORS.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
  for (let k = 0; k < 6; k++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 10), drinkMats[k % drinkMats.length]);
    cup.position.set(cx - 0.4 + k * 0.28, 1.08, counterZ + 0.15);
    cup.castShadow = true;
    g.add(cup);
  }
  // Tủ mát cửa kính sáng đèn ở góc trong + kệ ly trên tường sau
  box(1.0, 1.9, 0.7, metal, cx + W / 2 - 0.65, 0.95, back + 0.5);
  const fridgeGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshStandardMaterial({ color: 0xe0f7ff, emissive: 0x9fe8ff, emissiveIntensity: 0.6 }));
  fridgeGlow.position.set(cx + W / 2 - 0.65, 1.0, back + 0.86);
  g.add(fridgeGlow);
  for (const y of [1.5, 2.0]) {
    box(1.6, 0.04, 0.3, wood, cx - 1.4, y, back + 0.2);
    for (let k = 0; k < 5; k++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8), drinkMats[(k + (y > 1.7 ? 3 : 0)) % drinkMats.length]);
      c.position.set(cx - 2.0 + k * 0.3, y + 0.08, back + 0.2);
      g.add(c);
    }
  }
  // Bảng phấn thực đơn treo tường sau, giữa nhà
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 256;
  boardCanvas.height = 192;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  box(1.2, 0.92, 0.04, woodDark, cx + 0.3, 1.85, back + 0.09);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9 }));
  board.position.set(cx + 0.3, 1.85, back + 0.115);
  g.add(board);
  const setMenu = (lines: string[]) => {
    const ctx = boardCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#2f3b33';
    ctx.fillRect(0, 0, 256, 192);
    ctx.fillStyle = '#f5f1e6';
    ctx.font = '700 26px "Segoe UI", Arial, sans-serif';
    ctx.fillText('THỰC ĐƠN', 14, 32);
    ctx.font = '22px "Segoe UI", Arial, sans-serif';
    lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, 14, 70 + i * 34, 228));
    boardTex.needsUpdate = true;
  };
  setMenu([]);
  // Bàn ghế: bàn đầu tiên trong nhà (trước quầy), các bàn sau ngoài hiên (z < 3, không xuống đường)
  const tablePos: [number, number][] = [[cx - 1.5, cz + 1.3], [cx - 1.6, front + 0.75], [cx + 1.6, front + 0.75]];
  const tableGroups: THREE.Group[] = [];
  const patrons: THREE.Group[] = [];
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.8 });
  for (const [tx, tz] of tablePos) {
    const t = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), woodDark);
    leg.position.y = 0.35;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.66), wood);
    top.position.y = 0.72;
    t.add(leg, top);
    for (const ax of [-0.5, 0.5]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.6 }));
      stool.position.set(ax, 0.21, 0);
      t.add(stool);
      // Khách ngồi trên ghế, quay mặt vào bàn
      const p = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.5, 8), new THREE.MeshStandardMaterial({ color: CUP_COLORS[patrons.length % CUP_COLORS.length], roughness: 0.7 }));
      body.position.y = 0.67;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skin);
      head.position.y = 1.06;
      p.add(body, head);
      p.position.set(ax, 0, 0);
      p.visible = false;
      t.add(p);
      patrons.push(p);
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
  let patronCount = 0;
  const showPatrons = () => {
    const seats = patrons.filter((_, i) => tableGroups[Math.floor(i / 2)].visible);
    patrons.forEach((p) => { p.visible = false; });
    seats.slice(0, patronCount).forEach((p) => { p.visible = true; });
  };
  const setPatrons = (n: number) => { patronCount = Math.max(0, Math.floor(n)); showPatrons(); };
  const setStaffAll = (n: number) => { setStaff(n); showPatrons(); };
  let tierNow = -1;
  const setTier = (n: number) => {
    if (n === tierNow) return;
    tierNow = n;
    signMat.map?.dispose();
    signMat.map = drinkSignTexture(QUAN_TIER_SIGNS[n] ?? QUAN_TIER_SIGNS[0]);
    signMat.needsUpdate = true;
    awningMat.color.setHex(QUAN_TIER_AWNINGS[n] ?? QUAN_TIER_AWNINGS[0]);
  };
  return { group: g, setStaff: setStaffAll, setMenu, setPatrons, setTier, setRoofHidden: (on: boolean) => { roofSlab.visible = !on; } };
}

/** Mặt biển "ĐỒ UỐNG": chữ trắng đậm trên nền xanh cyan (màu thương hiệu quán). */
function drinkSignTexture(text = 'ĐỒ UỐNG'): THREE.CanvasTexture {
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
  ctx.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
