import * as THREE from 'three';

/**
 * Tiệm xôi 3D (GĐ430, GĐ483 thành nhà): cửa hàng nhỏ phía tây đầu hẻm, đối diện quán nước. Chỉ hình ảnh, không chặn
 * lưới đi lại. `lot` = biển gỗ "TIỆM XÔI" khi đủ cấp chưa mở; `stall` = sạp có nồi chõ bốc hơi, mâm xôi
 * màu và mái che vàng khi đã mở. main.tsx bật/ẩn theo `tiemXoiStandState`.
 */
/** GĐ483: tiệm xôi thành cửa hàng nhỏ có nhà (người chơi chọn) — toạ độ cục bộ quanh gốc tiệm (thế giới 46, 0, 1).
 *  Mặt tiền z 0.4 (thế giới 1.4) chừa vỉa hè; cửa giữa rộng 1.5 m; quầy + nồi trong nhà nên mưa vẫn bán. */
export const XOI_HOUSE = { x: 0, z: -1.4, width: 4.2, depth: 3.6, height: 2.8 } as const;
export const XOI_DOOR_HALF = 0.75;

/** Khối chặn lưới đi lại (toạ độ thế giới theo gốc ox, oz): tường sau, hai hông, hai đoạn mặt tiền, quầy. */
export function xoiHouseBoxes(ox: number, oz: number): THREE.Box3[] {
  const { x, z, width: W, depth: D, height: H } = XOI_HOUSE;
  const cx = ox + x, cz = oz + z, t = 0.12;
  const b = (x1: number, z1: number, x2: number, z2: number) => new THREE.Box3(new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, H, z2));
  const front = cz + D / 2, back = cz - D / 2;
  return [
    b(cx - W / 2, back - t / 2, cx + W / 2, back + t / 2),
    b(cx - W / 2 - t / 2, back, cx - W / 2 + t / 2, front),
    b(cx + W / 2 - t / 2, back, cx + W / 2 + t / 2, front),
    b(cx - W / 2, front - t / 2, cx - XOI_DOOR_HALF, front + t / 2),
    b(cx + XOI_DOOR_HALF, front - t / 2, cx + W / 2, front + t / 2),
    b(cx - 0.95, cz - 0.45, cx + 0.95, cz + 0.45),
  ];
}

export interface TiemXoiStand { group: THREE.Group; lot: THREE.Group; stall: THREE.Group; /** GĐ434: số người nấu đứng sau sạp (chủ + thợ). */ setCooks(n: number): void; /** GĐ447: hơi bốc to khi chủ đã đồ mẻ hôm nay. */ setSteaming(on: boolean): void; setBig(on: boolean): void; /** GĐ486: số khách ngồi ăn (0–2). */ setDiners(n: number): void }

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

function signTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffeaa7';
    ctx.font = '800 38px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 46);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createTiemXoiStand(): TiemXoiStand {
  const group = new THREE.Group();
  const lot = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), mat(0x8b5a2b));
  post.position.y = 0.6;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.36), new THREE.MeshStandardMaterial({ map: signTexture('TIỆM XÔI') }));
  board.position.set(0, 1.1, 0.06);
  lot.add(post, board);

  const stall = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 0.9), mat(0xa0522d));
  counter.position.set(0, 0.45, XOI_HOUSE.z);
  stall.add(counter);
  // Nồi chõ đồ xôi + hơi nước
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.5, 14), mat(0x95a5a6));
  pot.position.set(-0.7, 1.15, XOI_HOUSE.z);
  const steam = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
  steam.position.set(-0.7, 1.62, XOI_HOUSE.z);
  stall.add(pot, steam);
  // GĐ462: bếp mở rộng thêm nồi thứ hai sau sạp
  const pot2 = pot.clone();
  pot2.position.set(1.4, 0.25, XOI_HOUSE.z - 1.2);
  pot2.visible = false;
  stall.add(pot2);
  // Mâm xôi màu: gấc đỏ, lá dứa xanh, đậu xanh vàng, nếp trắng
  [0xe74c3c, 0x27ae60, 0xf1c40f, 0xfdfdfd].forEach((c, i) => {
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), mat(c));
    tray.position.set(-0.15 + i * 0.27, 0.94, XOI_HOUSE.z + 0.1);
    stall.add(tray);
  });
  // Nhà: sàn, tường, mái, mặt tiền có cửa giữa, biển TIỆM XÔI
  const { width: W, depth: D, height: H } = XOI_HOUSE;
  const hz = XOI_HOUSE.z, front = hz + D / 2, back = hz - D / 2, T = 0.12;
  const wallM = mat(0xfff1d6), trimM = mat(0xc0392b);
  const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    stall.add(b);
  };
  add(W, 0.06, D, mat(0xd9c7a8), 0, 0.03, hz);
  add(W, H, T, wallM, 0, H / 2, back);
  add(T, H, D, wallM, -W / 2, H / 2, hz);
  add(T, H, D, wallM, W / 2, H / 2, hz);
  const seg = W / 2 - XOI_DOOR_HALF;
  add(seg, H, T, wallM, -(XOI_DOOR_HALF + seg / 2), H / 2, front);
  add(seg, H, T, wallM, XOI_DOOR_HALF + seg / 2, H / 2, front);
  add(XOI_DOOR_HALF * 2, 0.5, T, wallM, 0, H - 0.25, front);
  add(W + 0.4, 0.16, D + 0.5, mat(0x8e2a1f), 0, H + 0.08, hz + 0.1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.05, 0.8), mat(0xf6c445));
  roof.position.set(0, H - 0.5, front + 0.4);
  roof.rotation.x = 0.28;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('TIỆM XÔI') }));
  sign.position.set(0, H + 0.45, front + 0.32);
  add(2.35, 0.6, 0.06, trimM, 0, H + 0.45, front + 0.28);
  stall.add(roof, sign);
  // GĐ485: bàn nhỏ + 2 ghế đẩu cho khách ngồi ăn tại chỗ (góc trong bên phải cửa, chỉ hình ảnh)
  add(0.6, 0.06, 0.6, mat(0x8b5a2b), 1.45, 0.62, front - 0.6);
  add(0.08, 0.6, 0.08, mat(0x5d4037), 1.45, 0.3, front - 0.6);
  for (const dx of [-0.42, 0.42]) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 10), mat(0x2e86de));
    stool.position.set(1.45 + dx, 0.2, front - 0.6);
    stall.add(stool);
  }
  const diners: THREE.Group[] = [-0.42, 0.42].map((dx, i) => {
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.55, 8), mat([0x27ae60, 0x8e44ad][i]));
    body.position.y = 0.68;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xf1c27d));
    head.position.y = 1.1;
    d.add(body, head);
    d.position.set(1.45 + dx, 0, front - 0.6);
    d.visible = false;
    stall.add(d);
    return d;
  });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.07, 10), mat(0xfdfdfd));
  bowl.position.set(1.45, 0.69, front - 0.6);
  stall.add(bowl);

  // Người nấu đứng sau sạp: một chủ sạp luôn có + mỗi thợ thêm một người (tối đa 3)
  const cooks: THREE.Group[] = [];
  const skin = mat(0xf1c27d);
  [-0.7, 0, 0.7].forEach((x, i) => {
    const c = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.75, 8), mat([0xffffff, 0x3498db, 0xe67e22][i]));
    body.position.y = 0.9;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin);
    head.position.y = 1.43;
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.16, 12), mat(0xf5deb3));
    hat.position.y = 1.6;
    c.add(body, head, hat);
    c.position.set(x, 0, XOI_HOUSE.z - 0.8);
    c.visible = i === 0;
    stall.add(c);
    cooks.push(c);
  });
  const setCooks = (n: number) => cooks.forEach((c, i) => { c.visible = i < Math.max(1, Math.min(3, n)); });

  group.add(lot, stall);
  lot.visible = false;
  stall.visible = false;
  const setSteaming = (on: boolean) => { steam.scale.setScalar(on ? 1.8 : 1); (steam.material as THREE.MeshStandardMaterial).opacity = on ? 0.6 : 0.45; };
  const setBig = (on: boolean) => { pot2.visible = on; };
  const setDiners = (n: number) => diners.forEach((d, i) => { d.visible = i < n; });
  return { group, lot, stall, setCooks, setSteaming, setBig, setDiners };
}
