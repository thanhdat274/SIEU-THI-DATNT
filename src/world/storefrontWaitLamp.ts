import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Đèn báo "khách đang đợi" trước hiên tiệm (gđ180 "Có khách chờ quầy — nhìn là biết").
 * Một quả đèn lồng nhỏ gắn tường cạnh cửa; lõi phát sáng ấm bật khi có khách đang đợi ở quầy
 * (`waiting > 0`, sim đã có — KHÔNG thêm mô phỏng, chỉ tái dùng world state). Tín hiệu không lời:
 * chủ đang ở sau nhà / xa quầy vẫn thấy "đèn sáng là có khách chờ", ghé về kịp câu quầy.
 * Chỉ hình ảnh; **không chặn lưới đi lại** (boxes rỗng — convention kit prop GĐ172/177/179).
 */

/** Vị trí đặt: bên trái cửa tiệm (đối xứng cột đèn lồng GĐ177 bên phải x=5.9), sát tường z=1. */
export const WAIT_LAMP_POS: [number, number, number] = [3.1, 0, 1.3];
/** Tên node phát sáng trong GLB — code bật/tắt theo có khách đợi. */
export const GLOW_NODE = 'cho_doi_glow';
/** Quá nhiều đèn phát sáng cũng được, nhưng đừng để đèn rời đèn khác quá dày — rà bằng test. */

/** Đèn báo chỉ có ý nghĩa khi tiệm đang mở; cuối ngày đóng cửa thì không còn khách chờ. */
export interface WaitLampActive { open: boolean; waiting: number }

/** Rà vị trí đặt: ngoài thế giới / giữa lòng đường / đè mặt tiền / chắn cửa / chồng cột đèn biển là bug. */
export function waitLampProblems(): string[] {
  const problems: string[] = [];
  const [x, , z] = WAIT_LAMP_POS;
  if (Math.abs(x) > 80 || Math.abs(z) > 80) problems.push(`đèn báo khách đợi @${x},${z}: ngoài thế giới ±80`);
  if (z > 3 && z < 9) problems.push(`đèn báo @${x},${z}: giữa lòng đường`);
  if (Math.hypot(x - 4, z - 1) < 0.7) problems.push(`đèn báo @${x},${z}: chắn trước cửa tiệm (x=4,z=1)`);
  if (x === 5.9 && z === 2.1) problems.push(`đèn báo @${x},${z}: đè đúng cột đèn lồng`);
  if (x === 5.05 && z === 1.45) problems.push(`đèn báo @${x},${z}: đè đúng biển mở/đóng cửa`);
  return problems;
}

export interface WaitLamp {
  group: THREE.Group;
  /** Bật theo trạng thái "khách đang đợi": waiting>0 và tiệm mở → sáng ấm (kèm nhấp nhô nhẹ). */
  update(active: WaitLampActive, time: number): void;
  /** GLB đã về chưa (fallback thủ tục hiện nếu chưa/không về được). */
  loaded: boolean;
}

/** Quầng sáng ấm loang quanh đèn báo, dễ nhìn từ xa khi có khách chờ. */
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(48, 48, 3, 48, 48, 46);
  grad.addColorStop(0, 'rgba(255, 200, 130, 0.95)');
  grad.addColorStop(0.45, 'rgba(255, 185, 110, 0.4)');
  grad.addColorStop(1, 'rgba(255, 176, 96, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 96);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Quả đèn thủ tục làm "cái xác" dự phòng — GLB về thì thay phần mình, không về vẫn có đèn. */
function fallbackWaitLamp(glowMat: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a26 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x455a64 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffd18b, transparent: true, opacity: 0.5, roughness: 0.3 });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.44), wood);
  arm.position.set(0, 1.52, 0.22);
  const glassBall = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 9), glass);
  glassBall.position.set(0, 1.28, 0.44);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), glowMat);
  glow.position.set(0, 1.28, 0.44);
  for (const m of [arm, glassBall, glow, new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 6), metal)]) {
    if (m instanceof THREE.Mesh) { m.castShadow = true; m.receiveShadow = false; g.add(m); }
  }
  return g;
}

export function createWaitLamp(baseUrl = '/models/facade/'): WaitLamp {
  const group = new THREE.Group();
  group.name = 'waitLamp';
  const [x, , z] = WAIT_LAMP_POS;
  group.position.set(x, 0, z);

  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffb35c, emissive: 0xffa53c, emissiveIntensity: 0 });
  // Vật liệu phát sáng của chính GLB (node cho_doi_glow) — điều khiển chung với glowMat (QA gđ177
  // bắt kiểu lỗi này: emissive mặc định của GLB cháy sáng cố định nếu không bật/tắt theo state).
  let glbGlow: THREE.MeshStandardMaterial | null = null;
  const pulse = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffc178, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pulse.position.set(0, 1.3, 0.44);
  pulse.scale.setScalar(1.7);
  group.add(pulse);

  const fallback = fallbackWaitLamp(glowMat);
  group.add(fallback);

  const api: WaitLamp = { group, loaded: false, update: (a, time) => {
    const on = a.open && a.waiting > 0 ? 1 : 0;
    // Càng đông khách đợi càng sáng rõ (1..~1.8); tắt hẳn khi không ai chờ
    const level = Math.min(1, 0.55 + a.waiting * 0.25);
    const intensity = on * level * 1.6;
    glowMat.emissiveIntensity = intensity;
    if (glbGlow) glbGlow.emissiveIntensity = intensity;
    pulse.material.opacity = on * (0.35 + 0.25 * Math.sin(time * 3));
    // Không có nguồn sáng thật — chỉ là tín hiệu không lời, tránh thêm light cho một prop nhỏ
  } };

  const loader = new GLTFLoader();
  const draco = new DRACOLoader().setDecoderPath('/decoders/draco/');
  loader.setDRACOLoader(draco);
  fetch(`${baseUrl}facade-manifest.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
    .then(() => loader.load(
      `${baseUrl}den_cho.glb`,
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
      () => { /* giữ fallback */ },
    ))
    .catch(() => { /* offline: chỉ cái xác thủ tục */ });

  api.update({ open: false, waiting: 0 }, 0);
  return api;
}
