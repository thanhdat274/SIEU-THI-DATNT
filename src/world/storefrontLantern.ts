import { lazyGltfLoader } from './gltfLoader';
import * as THREE from 'three';
import { registerLight } from '../render/lightBudget';

/**
 * Đèn lồng cột trước cửa tiệm (gđ177 "Đầu ngõ lên đèn").
 * Một cột đèn lồng Blender (`scripts/blender_lantern.py` → GLB Draco, lazy) đặt bên cửa để
 * chập tối hẻm sáng lên một vũng vàng ấm ngay trước tiệm — đúng cảm giác "tiệm nhỏ đầu ngõ,
 * ấm áp đời thường". Chỉ hình ảnh; **không chặn lưới đi lại** (boxes rỗng — cùng convention
 * kit prop GĐ172). Nguồn sáng thật đăng ký vào quỹ ánh sáng (lightBudget) để không vượt ngân sách.
 */

/** Vị trí đặt: bên phải cửa tiệm (cửa ở x=4, mặt tiền z=1), trên vỉa hè z≈2, ngoài lòng đường. */
export const STOREFRONT_LANTERN_POS: [number, number, number] = [5.9, 0, 2.1];
/** Tên node phát sáng trong GLB — code bật/tắt emissive theo giờ. */
export const GLOW_NODE = 'den_long_glow';

/** Độ sáng đèn theo giờ game: 0 = trưa, 1 = chập tối→đêm. Cùng công thức đèn đường/inhouse (17h–5h30). */
export function lanternGlow(minutes: number): number {
  const hour = (((minutes / 60) % 24) + 24) % 24;
  return Math.min(1, Math.max(0, Math.max(hour - 17, 5.5 - hour)));
}

/** Rà vị trí đặt: ngoài thế giới / giữa lòng đường / đè mặt tiền / chắn trước cửa là bug — soi bằng test. */
export function storefrontLanternProblems(): string[] {
  const problems: string[] = [];
  const [x, , z] = STOREFRONT_LANTERN_POS;
  if (Math.abs(x) > 80 || Math.abs(z) > 80) problems.push(`đèn lồng @${x},${z}: ngoài thế giới ±80`);
  if (z > 3 && z < 9) problems.push(`đèn lồng @${x},${z}: giữa lòng đường`);
  if (x >= 0 && x <= 8 && z >= -22 && z <= 1) problems.push(`đèn lồng @${x},${z}: đè mặt tiền tiệm`);
  if (Math.hypot(x - 4, z - 1) < 0.8) problems.push(`đèn lồng @${x},${z}: chắn trước cửa tiệm (x=4,z=1)`);
  return problems;
}

export interface StorefrontLantern {
  group: THREE.Group;
  /** forward progress: 0 = trưa sáng, 1 = chập tối→đêm. */
  update(level: number): void;
  /** GLB đã về chưa (fallback thủ tục hiện nếu chưa/không về được). */
  loaded: boolean;
}

/** Quầng sáng loang quanh lồng, nhìn rõ từ xa lúc đêm (giống chao đèn đường GĐ-lamps). */
function lanternGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 190, 120, 0.95)');
  grad.addColorStop(0.4, 'rgba(255, 170, 96, 0.35)');
  grad.addColorStop(1, 'rgba(255, 160, 80, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cột + lồng lồng thủ tục làm "cái xác" dự phòng — GLB về thì thay phần mình, không về vẫn có hình đèn. */
function fallbackLantern(glowMat: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a26 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x455a64 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffcf90, transparent: true, opacity: 0.55, roughness: 0.3 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.3, 8), wood);
  post.position.y = 1.15;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 6), metal);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.3, 2.35, 0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8), glass);
  body.position.set(0.62, 1.72, 0);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), glowMat);
  glow.position.set(0.62, 1.72, 0);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xcc3f3f }));
  cap.position.set(0.62, 2.02, 0);
  cap.rotation.x = Math.PI;
  for (const m of [post, arm, body, glow, cap]) { m.castShadow = true; m.receiveShadow = false; }
  g.add(post, arm, body, cap, glow);
  return g;
}

export function createStorefrontLantern(baseUrl = '/models/facade/'): StorefrontLantern {
  const group = new THREE.Group();
  group.name = 'storefrontLantern';
  const [x, , z] = STOREFRONT_LANTERN_POS;
  group.position.set(x, 0, z);

  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffb35c, emissive: 0xff9a3c, emissiveIntensity: 0 });
  // Vật liệu phát sáng của chính GLB (node den_long_glow) — phải bật/tắt cùng glowMat, nếu không
  // lõi lồng sẽ cháy sáng cả ban ngày (QA gđ177 bắt được: emissive mặc định của GLB = 3 cố định).
  let glbGlow: THREE.MeshStandardMaterial | null = null;
  const pulse = new THREE.Sprite(new THREE.SpriteMaterial({
    map: lanternGlowTexture(), color: 0xffc178, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pulse.position.set(0.62, 1.72, 0);
  pulse.scale.setScalar(2.6);
  group.add(pulse);

  // Nguồn sáng thật ở vị trí lồng đèn (toạ độ thế giới), đăng ký vào quỹ ánh sáng để không vượt ngân sách
  const light = new THREE.PointLight(0xffb35c, 0, 13, 1.6);
  registerLight(light, new THREE.Vector3(x + 0.62, 1.7, z));

  // Cái xác thủ tục hiện ngay; GLB về thì thay phần thân
  const fallback = fallbackLantern(glowMat);
  group.add(fallback);

  const api: StorefrontLantern = { group, loaded: false, update: (level) => {
    glowMat.emissiveIntensity = level * 2.6;
    if (glbGlow) glbGlow.emissiveIntensity = level * 2.6;
    pulse.material.opacity = level * 0.8;
    light.intensity = level * 26;
  } };

  const loader = lazyGltfLoader();
  fetch(`${baseUrl}facade-manifest.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
    .then(() => loader.load(
      `${baseUrl}den_long.glb`,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true; o.receiveShadow = false;
            if (o.name === GLOW_NODE || o.userData.name === GLOW_NODE) {
              const m = (o as THREE.Mesh).material;
              if (m && !Array.isArray(m)) glbGlow = m as THREE.MeshStandardMaterial;
            }
          }
        });
        if (glbGlow) glbGlow.emissiveIntensity = 0;
        group.add(root);
        fallback.visible = false;
        api.loaded = true;
      },
      undefined,
      () => { /* giữ fallback — đèn vẫn sáng */ },
    ))
    .catch(() => { /* offline: chỉ cái xác thủ tục, đèn vẫn sáng */ });

  return api;
}
