import * as THREE from 'three';
import { useGame } from '../core/store';
import { LIFE_EVENT_UNLOCK, gioHostOn, gioHouseIndex } from '../data/lifeEvent';
import { regularById } from '../data/regulars';
import { NEIGHBOR_HOUSES, houseDoor } from '../data/phoneOrders';

/**
 * Hệ 2 L8 (SPEC §2.9) — RẠP ĐÁM TRONG 3D. Ngày có đám giỗ của một khách quen, dựng rạp bạt trước
 * "nhà" chủ giỗ trong hẻm và vài người trong cụm tụ lại đứng cạnh rạp. THUẦN về dữ liệu (chủ giỗ =
 * `gioHostOn(day)` R4, chỗ dựng = `gioHouseIndex(host)` băm ổn định → cùng người luôn về cùng nhà),
 * không đụng kinh tế/RNG/save → golden L30 giữ nguyên; cổng cấp ≥ `LIFE_EVENT_UNLOCK=32` (R1).
 *
 * Dựng bằng hộp thủ tục như quanNuocStand.ts, không dùng asset ngoài / GLB mới: 4 cột + mái bạt sọc
 * + biển "GIỖ NHÀ {tên}" + 2 bàn + vài nhân vật tụ lại. Rạp chỉ là hình ảnh (không chặn lưới nav —
 * giữ `boxes: []` như branchStand để NPC không va chạm thêm).
 */
export interface RapDam {
  group: THREE.Group;
  /** Vẽ lại biển tên chủ giỗ trên rạp. */
  setHost(name: string): void;
}

const CANOPY_W = 3.6;
const CANOPY_D = 2.6;
const POLE_H = 2.2;

/** Dải bạt sọc đỏ-trắng làm mái rạp (CanvasTexture — luôn sinh local, nhẹ, không cần asset).
 *  Môi trường không có DOM (test node) → trả null để gọi ra dùng màu đặc thay thế. */
function stripeTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c62828' : '#f7f7f7';
    ctx.fillRect(i * 64, 0, 64, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

/** Nhân vật đứng tụ lại cạnh rạp (thân + đầu + nón) — đủ gợi "khách trong cụm", rẻ về đa giác. */
function guest(color: number, hatColor: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.62, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.31;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.9 }));
  head.position.y = 0.68;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.08, 8), new THREE.MeshStandardMaterial({ color: hatColor }));
  hat.position.y = 0.8;
  g.add(body, head, hat);
  return g;
}

export function createRapDam(): RapDam {
  const group = new THREE.Group();

  // Cột rạp: 4 góc
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.7 });
  const px = CANOPY_W / 2 - 0.15;
  const pz = CANOPY_D / 2 - 0.15;
  for (const [sx, sz] of [
    [-px, -pz], [px, -pz], [-px, pz], [px, pz],
  ] as const) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, POLE_H, 6), poleMat);
    pole.position.set(sx, POLE_H / 2, sz);
    group.add(pole);
  }

  // Mái bạt sọc (hơi nghiêng để trông như bạt căng); không có DOM → màu đỏ đặc
  const stripe = stripeTexture();
  const canopyMat = new THREE.MeshStandardMaterial(stripe ? { map: stripe, roughness: 0.9 } : { color: 0xc62828, roughness: 0.9 });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(CANOPY_W, 0.04, CANOPY_D), canopyMat);
  canopy.position.y = POLE_H;
  canopy.rotation.z = 0.03;
  group.add(canopy);

  // Diềm bạt chớp chớp ở mép trước
  const frill = new THREE.Mesh(new THREE.BoxGeometry(CANOPY_W, 0.25, 0.05), new THREE.MeshStandardMaterial({ color: 0xc62828 }), );
  frill.position.set(0, POLE_H - 0.14, CANOPY_D / 2 - 0.03);
  group.add(frill);

  // Bàn tròn + khách tụ lại
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x9c6b3f, roughness: 0.8 });
  for (let t = 0; t < 2; t++) {
    const tx = -0.9 + t * 1.7;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 10), tableMat);
    top.position.set(tx, 0.03, 0.3);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), tableMat);
    leg.position.set(tx, -0.15, 0.3);
    group.add(top, leg);
    for (let c = 0; c < 2; c++) {
      const gst = guest([0xd84315, 0x6a1b9a, 0x2e7d32][(t + c) % 3], [0x37474f, 0xff8f00][c % 2]);
      gst.position.set(tx + (c === 0 ? -0.55 : 0.55), 0, 0.25);
      group.add(gst);
    }
  }

  // Biển "GIỖ NHÀ {tên}" treo trước rạp — vẽ lại khi đổi chủ giỗ qua setHost.
  const banner = makeBanner('GIỖ');
  banner.position.set(0, POLE_H - 0.6, CANOPY_D / 2 - 0.02);
  group.add(banner);

  const setHost = (name: string) => {
    group.userData.banner = name; // để test đọc userData
    const img = (banner.material as THREE.MeshStandardMaterial).map?.image as HTMLCanvasElement | undefined;
    if (!img) return; // không DOM (test node) — chỉ ghi tên
    const ctx = img.getContext('2d')!;
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`GIỖ NHÀ ${name}`, img.width / 2, img.height / 2 + 4);
    (banner.material as THREE.MeshStandardMaterial).map!.needsUpdate = true;
  };

  return { group, setHost };
}

/** Mặt biển chữ: nền xanh, chữ trắng (bản đầu — setHost vẽ lại theo chủ giỗ). */
function makeBanner(_initial: string): THREE.Mesh {
  if (typeof document === 'undefined') {
    return new THREE.Mesh(new THREE.PlaneGeometry(CANOPY_W - 0.5, 0.55), new THREE.MeshStandardMaterial({ color: 0x1565c0 }));
  }
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 44px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(_initial, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CANOPY_W - 0.5, 0.55), new THREE.MeshStandardMaterial({ map: tex }));
  return mesh;
}

export interface RapDamSync {
  group: THREE.Group;
}

/**
 * Gắn rạp đám vào scene và đồng bộ theo ngày chơi: hôm nào có giỗ (chủ = `gioHostOn(day)`, cấp ≥ 32)
 * thì hiện rạp trước nhà chủ, hôm khác ẩn hẳn để không chặn view. Chạy một lần tạo, rồi qua subscribe
 * khi ngày / cấp đổi (pattern farm/quanNuoc).
 */
export function installRapDamSync(scene: THREE.Scene): RapDamSync {
  const { group, setHost } = createRapDam();
  group.visible = false;
  group.traverse((o) => { o.frustumCulled = true; });
  scene.add(group);

  let lastDay = -1;
  let lastLevel = -1;
  const update = () => {
    const s = useGame.getState();
    const host = s.level >= LIFE_EVENT_UNLOCK ? gioHostOn(s.day) : null;
    if (!host) {
      group.visible = false;
      return;
    }
    group.visible = true;
    setHost(regularById(host)?.name ?? host);
    const h = NEIGHBOR_HOUSES[gioHouseIndex(host)];
    const door = houseDoor(h);
    group.position.set(door.x, 0, door.z + 1.6);
  };
  update();
  useGame.subscribe((s) => {
    if (s.day !== lastDay || s.level !== lastLevel) {
      lastDay = s.day;
      lastLevel = s.level;
      update();
    }
  });

  return { group };
}
