import * as THREE from 'three';

/**
 * Tiệm xôi 3D (GĐ430): gian hàng nhỏ phía tây đầu hẻm, đối diện quán nước. Chỉ hình ảnh, không chặn
 * lưới đi lại. `lot` = biển gỗ "TIỆM XÔI" khi đủ cấp chưa mở; `stall` = sạp có nồi chõ bốc hơi, mâm xôi
 * màu và mái che vàng khi đã mở. main.tsx bật/ẩn theo `tiemXoiStandState`.
 */
export interface TiemXoiStand { group: THREE.Group; lot: THREE.Group; stall: THREE.Group }

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

  group.add(lot, stall);
  lot.visible = false;
  stall.visible = false;
  return { group, lot, stall };
}
