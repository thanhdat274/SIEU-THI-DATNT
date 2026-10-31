import { lazyGltfLoader } from './gltfLoader';
import * as THREE from 'three';

/**
 * Biển treo "mở/đóng cửa" trước cửa tiệm (gđ179 "Biển nói ra trạng thái tiệm").
 * Một cột gỗ nhỏ + biển treo dựng Blender (`scripts/blender_sign.py` → GLB Draco, lazy) đặt trên
 * vỉa hè ngay cạnh cửa. Mặt trước biển có tấm trạng thái phát sáng cha: xanh (#2ecc71) = tiệm
 * đang mở, đỏ (#e74c3c) dìm = tiệm đóng — tín hiệu không lời cho nhịp mở/đóng cửa (routine GĐ-ngày).
 * Chỉ hình ảnh; **không chặn lưới đi lại** (boxes rỗng — convention kit prop GĐ172/177).
 */

/** Vị trí đặt: vỉa hè sát cửa tiệm (cửa ở x=4, mặt tiền z=1), giữa cửa và cột đèn lồng (5.9,2.1). */
export const OPEN_SIGN_POS: [number, number, number] = [5.05, 0, 1.45];
/** Tên node trạng thái trong GLB — code đổi màu/độ sáng theo shopOpen. */
export const STATE_NODE = 'bien_mo_cua_state';
/** Ghé sát tường tiệm để cửa ra vào không vướng, và né không đè cửa (4,1). */
export const OPEN_SIGN_HEAD_CLEARANCE = 1.6;

/** Màu trạng thái: mở = xanh lời, đóng = đỏ dìm (nhị hàng ngày, soi rõ từ xa vẫn đọc được). */
export const OPEN_COLOR = 0x2ecc71;
export const CLOSED_COLOR = 0xe74c3c;

/** Rà vị trí đặt: ngoài thế giới / giữa lòng đường / đè mặt tiền / chắn cửa / đè cột đèn là bug — soi bằng test. */
export function openSignProblems(): string[] {
  const problems: string[] = [];
  const [x, , z] = OPEN_SIGN_POS;
  if (Math.abs(x) > 80 || Math.abs(z) > 80) problems.push(`biển mở/đóng @${x},${z}: ngoài thế giới ±80`);
  if (z > 3 && z < 9) problems.push(`biển mở/đóng @${x},${z}: giữa lòng đường`);
  if (x >= 0 && x <= 8 && z >= -22 && z <= 1) problems.push(`biển mở/đóng @${x},${z}: đè mặt tiền tiệm`);
  if (Math.hypot(x - 4, z - 1) < 0.8) problems.push(`biển mở/đóng @${x},${z}: chắn trước cửa tiệm (x=4,z=1)`);
  if (x === 5.9 && z === 2.1) problems.push(`biển mở/đóng @${x},${z}: đè đúng cột đèn lồng`);
  return problems;
}

export interface OpenSign {
  group: THREE.Group;
  /** Bật theo trạng thái tiệm: true = mở (xanh), false = đóng (đỏ dìm). */
  update(open: boolean, time: number): void;
  /** GLB đã về chưa (fallback thủ tục hiện nếu chưa/không về được). */
  loaded: boolean;
}

/** Biển treo thủ tục làm "cái xác" dự phòng — GLB về thì thay phần mình, không về vẫn có biển. */
function fallbackSign(stateMat: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a26 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x455a64 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 2.4, 8), wood);
  post.position.y = 1.2;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.12), wood);
  board.position.y = 2.02;
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.46, 5), metal);
  l.position.set(-0.27, 2.36, 0);
  const r = l.clone();
  r.position.x = 0.27;
  const state = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.28), stateMat);
  state.position.set(0, 2.07, 0.09);
  for (const m of [post, board, l, r, state]) { m.castShadow = true; m.receiveShadow = false; }
  g.add(post, l, r, board, state);
  return g;
}

export function createOpenSign(baseUrl = '/models/facade/'): OpenSign {
  const group = new THREE.Group();
  group.name = 'openSign';
  const [x, , z] = OPEN_SIGN_POS;
  group.position.set(x, 0, z);

  const stateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, emissiveIntensity: 0 });
  // Vật liệu trạng thái của chính GLB — phải điều khiển chung với fallback (QA gđ177 bắt kiểu lỗi
  // này: emissive mặc định cháy sáng cố định nếu không bật/tắt theo state).
  let glbState: THREE.MeshStandardMaterial | null = null;

  const fallback = fallbackSign(stateMat);
  group.add(fallback);

  // Đung đưa nhẹ khi mở — biển treo mang hơi gió, nhưng chỉ đung khi tiệm còn "sống" (đang mở)
  fallback.position.z = 0;

  const api: OpenSign = { group, loaded: false, update: (open, time) => {
    const on = open ? 1 : 0;
    const color = open ? OPEN_COLOR : CLOSED_COLOR;
    // Mở: xanh rạng, đóng: đỏ dìm (0.45) để tối không còn chói
    const intensity = open ? 1.15 : 0.45;
    stateMat.emissive.setHex(color);
    stateMat.emissiveIntensity = intensity;
    if (glbState) { glbState.emissive.setHex(color); glbState.emissiveIntensity = intensity; }
    // Đung đưa nhẹ quanh trục dọc khi đang mở (biển treo "sống"), đứng yên khi đóng
    const target = on * Math.sin(time * 1.6) * 0.06;
    group.rotation.z += (target - group.rotation.z) * 0.12;
  } };

  const loader = lazyGltfLoader();
  fetch(`${baseUrl}facade-manifest.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
    .then(() => loader.load(
      `${baseUrl}bien_mo_cua.glb`,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true; o.receiveShadow = false;
            if (o.name === STATE_NODE || o.userData.name === STATE_NODE) {
              const m = (o as THREE.Mesh).material;
              if (m && !Array.isArray(m)) glbState = m as THREE.MeshStandardMaterial;
            }
          }
        });
        if (glbState) { glbState.emissive.setHex(CLOSED_COLOR); glbState.emissiveIntensity = 0.45; }
        group.add(root);
        fallback.visible = false;
        api.loaded = true;
      },
      undefined,
      () => { /* giữ fallback — biển vẫn hiện */ },
    ))
    .catch(() => { /* offline: chỉ cái xác thủ tục */ });

  // Khởi điểm đóng cửa để không nhấp nháy xanh khi chưa có state
  api.update(false, 0);
  return api;
}
