import * as THREE from 'three';

/**
 * Biển "mở/đóng cửa" của tiệm (gđ179, làm lại GĐ1819).
 * GĐ1819: bỏ cột gỗ đứng giữa vỉa hè (người dùng chê xấu, che cửa). Thay bằng tấm biển nhỏ
 * treo dây trên tường ngay bên phải cửa — giống biển "OPEN/CLOSED" các tiệm thật. Hai mặt chữ
 * vẽ canvas: "MỞ CỬA" nền xanh khi tiệm mở, "ĐÃ ĐÓNG" nền đỏ khi đóng.
 * Chỉ hình ảnh; **không chặn lưới đi lại** (gắn sát tường, cao trên đầu người).
 */

/** Vị trí: tường mặt tiền (z=1) bên phải cửa (cửa x=4, rộng 1.4 → mép phải 4.7), sát mặt tường. */
export const OPEN_SIGN_POS: [number, number, number] = [5.25, 1.75, 1.12];
/** Đáy biển cao hơn đầu người để không vướng. */
export const OPEN_SIGN_HEAD_CLEARANCE = 1.6;
export const OPEN_SIGN_SIZE = { w: 0.56, h: 0.3 };

export const OPEN_COLOR = 0x2ecc71;
export const CLOSED_COLOR = 0xe74c3c;

/** Rà vị trí: phải nằm sát tường mặt tiền, không đè khung cửa, không lọt xuống tầm đầu người. */
export function openSignProblems(): string[] {
  const problems: string[] = [];
  const [x, y, z] = OPEN_SIGN_POS;
  if (Math.abs(z - 1) > 0.2) problems.push(`biển mở/đóng @${x},${z}: không sát tường mặt tiền`);
  if (Math.abs(x - 4) < 0.7 + OPEN_SIGN_SIZE.w / 2) problems.push(`biển mở/đóng @${x}: đè khung cửa`);
  if (y - OPEN_SIGN_SIZE.h / 2 < OPEN_SIGN_HEAD_CLEARANCE) problems.push(`biển mở/đóng: thấp hơn đầu người`);
  return problems;
}

export interface OpenSign {
  group: THREE.Group;
  /** true = mở (xanh "MỞ CỬA"), false = đóng (đỏ "ĐÃ ĐÓNG"). */
  update(open: boolean, time: number): void;
  loaded: boolean;
}

function faceTexture(open: boolean): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 136;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#f5ead2';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = open ? '#27ae60' : '#c0392b';
    g.fillRect(10, 10, c.width - 20, c.height - 20);
    g.fillStyle = '#fff';
    g.font = 'bold 50px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(open ? 'MỞ CỬA' : 'ĐÃ ĐÓNG', c.width / 2, c.height / 2 + 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createOpenSign(): OpenSign {
  const group = new THREE.Group();
  group.name = 'openSign';
  const [x, y, z] = OPEN_SIGN_POS;
  group.position.set(x, y, z);

  const { w, h } = OPEN_SIGN_SIZE;
  const hasDom = typeof document !== 'undefined';
  const openMat = new THREE.MeshStandardMaterial(hasDom ? { map: faceTexture(true), emissive: 0xffffff, emissiveIntensity: 0.15 } : { color: OPEN_COLOR });
  const closedMat = new THREE.MeshStandardMaterial(hasDom ? { map: faceTexture(false), emissive: 0xffffff, emissiveIntensity: 0.1 } : { color: CLOSED_COLOR });
  if (hasDom) { openMat.emissiveMap = openMat.map; closedMat.emissiveMap = closedMat.map; }

  // Tấm biển treo dưới một cái đinh, hai sợi dây chữ V — xoay nhẹ quanh đinh.
  const pivot = new THREE.Group();
  pivot.position.y = 0.2;
  group.add(pivot);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), openMat);
  face.position.set(0, -0.2, 0.012);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.02), new THREE.MeshStandardMaterial({ color: 0x6b4a26 }));
  back.position.y = -0.2;
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1a });
  for (const s of [-1, 1]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4), cordMat);
    cord.position.set(s * w * 0.22, -0.02, 0);
    cord.rotation.z = s * 0.95;
    pivot.add(cord);
  }
  const nail = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), cordMat);
  pivot.add(face, back, nail);
  back.castShadow = true;

  let lastOpen: boolean | null = null;
  const api: OpenSign = { group, loaded: true, update: (open, time) => {
    if (open !== lastOpen) { face.material = open ? openMat : closedMat; lastOpen = open; }
    const target = open ? Math.sin(time * 1.3) * 0.025 : 0;
    pivot.rotation.z += (target - pivot.rotation.z) * 0.1;
  } };
  api.update(false, 0);
  return api;
}
