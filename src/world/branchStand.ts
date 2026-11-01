import * as THREE from 'three';
import { CONVENIENCE } from '../data/branches';

/**
 * "Cái xác" 3D cho cửa hàng tiện lợi theo trạng thái sở hữu (GĐ26) — dựng bằng hộp thủ tục như
 * quanNuocStand.ts, không dùng asset ngoài. Toà nhà 24/7 đã có (world.ts `createConvenienceStore`)
 * nhưng luôn hiện kể cả khi người chơi chưa mua mặt bằng; lớp này bổ sung hai phần hình ảnh mà
 * main.tsx bật/ẩn theo `branchStandState(level, bought, open)`:
 *  - `lot`      : mảnh đất trống RAO BÁN (đủ cấp chưa mua) — sàn + hàng rào thấp + biển gỗ + marker 🏪.
 *  - openSign   : biển "MỞ CỬA 24/7" xanh phát sáng trên mặt tiền (đã mua + đang mở).
 *  - closedSign : biển "ĐÓNG CỬA" đỏ trên mặt tiền (đã mua, đang đóng).
 * `boxes` để rỗng: lưới đi lại của toà nhà cửa hàng tiện lợi đã được đăng ký chặn nav sẵn
 * (`convenience.staticBoxes()` giữ nguyên trong mọi trạng thái) nên mảnh đất chỉ là hình ảnh,
 * NPC không bao giờ đi xuyên vào mặt bằng — không cần đổi nav theo trạng thái.
 */
export interface BranchStand {
  /** Mảnh đất trống rao bán, đặt ở mặt bằng CONVENIENCE (world.ts định vị + thêm vào scene). */
  lot: THREE.Group;
  /** Biển "MỞ CỬA 24/7", gắn vào facade mặt tiền (world.ts). */
  openSign: THREE.Group;
  /** Biển "ĐÓNG CỬA", gắn vào facade mặt tiền (world.ts). */
  closedSign: THREE.Group;
  /** Để rỗng cho an toàn đi lại (nav do toà nhà sẵn có lo). */
  boxes: THREE.Box3[];
}

export function createBranchStand(): BranchStand {
  return { lot: buildLot(), openSign: buildDoorSign(true), closedSign: buildDoorSign(false), boxes: [] };
}

/** Mặt biển chữ: nền màu, chữ trắng đậm — dùng cho biển RAO BÁN và biển MỞ/ĐÓNG CỬA. */
function signFace(text: string, bg: string, font = 120): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 200;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${font}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Mảnh đất trống RAO BÁN đúng footprint toà nhà (16×10): sàn, hàng rào thấp, biển gỗ, marker 🏪. */
function buildLot(): THREE.Group {
  const g = new THREE.Group();
  const soil = new THREE.MeshStandardMaterial({ color: 0xc0a878, roughness: 0.92 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x9e9585, roughness: 0.9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2b, roughness: 0.8 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  const W = CONVENIENCE.width;
  const D = CONVENIENCE.depth;
  // Sàn xi măng mỏng sát đất đúng khuôn mặt bằng
  box(W, 0.08, D, soil, 0, 0.04, 0);
  // Hàng rào thấp quanh mép: cọc góc + thanh ngang để rõ "đang rao bán, chưa xây"
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [0, -D / 2], [0, D / 2]] as const) {
    box(0.28, 0.75, 0.28, postMat, x, 0.4, z);
  }
  for (const [x, z, w, d] of [
    [0, -D / 2, W - 0.5, 0.14], [0, D / 2, W - 0.5, 0.14],
    [-W / 2, 0, 0.14, D - 0.5], [W / 2, 0, 0.14, D - 0.5],
  ] as const) {
    box(w, 0.12, d, wood, x, 0.55, z);
  }
  // Biển gỗ "RAO BÁN / MẶT BẰNG KINH DOANH" ở mép trước (mặt nhìn ra con đường thứ hai, phía +z)
  const front = D / 2;
  box(0.14, 1.4, 0.14, postMat, -4.6, 0.85, front - 0.9);
  box(0.14, 1.4, 0.14, postMat, 4.6, 0.85, front - 0.9);
  box(7.6, 0.6, 0.14, wood, 0, 1.75, front - 0.9);
  const board1 = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 0.5), new THREE.MeshStandardMaterial({ map: signFace('RAO BÁN', '#e65100', 128), roughness: 0.6 }));
  board1.position.set(0, 1.82, front - 0.79);
  const board2 = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 0.44), new THREE.MeshStandardMaterial({ map: signFace('MẶT BẰNG KINH DOANH', '#8a5a36', 72), roughness: 0.6 }));
  board2.position.set(0, 1.34, front - 0.79);
  g.add(board1, board2);
  // Marker 🏪 kiểu createDeliveryMarker: cột mảnh + hộp cam phát sáng nổi, main.tsx sẽ nhấp nhô
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
  pole.position.set(-6.5, 0.8, front - 2.5);
  const markerBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.34, 0.46),
    new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xffa300, emissiveIntensity: 1.0 }),
  );
  markerBox.position.set(-6.5, 2.05, front - 2.5);
  markerBox.name = 'markerBox';
  g.add(pole, markerBox);
  return g;
}

/** Biển treo trên cửa kính mặt tiền: xanh "MỞ CỬA 24/7" (open) hoặc đỏ "ĐÓNG CỬA" (closed). */
function buildDoorSign(open: boolean): THREE.Group {
  const g = new THREE.Group();
  const color = open ? 0xe8ffea : 0xffe3e3;
  const bg = open ? '#0a7d32' : '#c0392b';
  const glow = open ? 0xa5ffcc : 0xff9a8d;
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.62, 0.1), new THREE.MeshStandardMaterial({ color }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.52),
    new THREE.MeshStandardMaterial({ map: signFace(open ? 'MỞ CỬA 24/7' : 'ĐÓNG CỬA', bg, open ? 92 : 116), emissive: glow, emissiveMap: signFace(open ? 'MỞ CỬA 24/7' : 'ĐÓNG CỬA', bg, open ? 92 : 116), emissiveIntensity: open ? 0.65 : 0.12 }),
  );
  face.position.z = 0.06;
  g.add(board, face);
  return g;
}
