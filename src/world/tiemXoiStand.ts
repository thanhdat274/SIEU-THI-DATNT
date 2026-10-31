import * as THREE from 'three';

/**
 * Tiệm xôi 3D (GĐ430): gian hàng nhỏ phía tây đầu hẻm, đối diện quán nước. Chỉ hình ảnh, không chặn
 * lưới đi lại. `lot` = biển gỗ "TIỆM XÔI" khi đủ cấp chưa mở; `stall` = sạp có nồi chõ bốc hơi, mâm xôi
 * màu và mái che vàng khi đã mở. main.tsx bật/ẩn theo `tiemXoiStandState`.
 */
export interface TiemXoiStand { group: THREE.Group; lot: THREE.Group; stall: THREE.Group; /** GĐ434: số người nấu đứng sau sạp (chủ + thợ). */ setCooks(n: number): void; /** GĐ447: hơi bốc to khi chủ đã đồ mẻ hôm nay. */ setSteaming(on: boolean): void; setBig(on: boolean): void }

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
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.9), mat(0xa0522d));
  counter.position.y = 0.45;
  stall.add(counter);
  // Nồi chõ đồ xôi + hơi nước
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.5, 14), mat(0x95a5a6));
  pot.position.set(-0.6, 1.15, 0);
  const steam = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
  steam.position.set(-0.6, 1.62, 0);
  stall.add(pot, steam);
  // GĐ462: bếp mở rộng thêm nồi thứ hai sau sạp
  const pot2 = pot.clone();
  pot2.position.set(-0.6, 0.25, -0.75);
  pot2.visible = false;
  stall.add(pot2);
  // Mâm xôi màu: gấc đỏ, lá dứa xanh, đậu xanh vàng, nếp trắng
  [0xe74c3c, 0x27ae60, 0xf1c40f, 0xfdfdfd].forEach((c, i) => {
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), mat(c));
    tray.position.set(0.05 + i * 0.32, 0.94, 0.1);
    stall.add(tray);
  });
  for (const x of [-1.15, 1.15]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), mat(0x5d4037));
    pole.position.set(x, 1.15, 0.4);
    stall.add(pole);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 1.4), mat(0xf6c445));
  roof.position.set(0, 2.32, 0.15);
  roof.rotation.x = 0.2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshStandardMaterial({ map: signTexture('XÔI NÓNG') }));
  sign.position.set(0, 2.0, 0.46);
  stall.add(roof, sign);

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
    c.position.set(x, 0, -0.75);
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
  return { group, lot, stall, setCooks, setSteaming, setBig };
}
