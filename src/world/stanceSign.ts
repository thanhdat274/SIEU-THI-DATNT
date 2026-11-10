import * as THREE from 'three';
import { STANCE_META, type StanceId } from '../data/stance';

/**
 * Tấm biển phụ "ĐỊNH VỊ" của tiệm (Hệ 3 §3.9): biển thứ hai dưới bảng hiệu tiệm, đổi chữ theo
 * hướng đang treo (biz.stance / stance2). Cùng mẫu `storefrontSign` — chỉ hình ảnh, **không chặn
 * lưới đi lại** (gắn sát tường mặt tiền trên đầu người). Khi chưa treo biển nào: hiện "CHỪA TREO"
 * màu xám; treo hai biển thì tấm biển liệt kê cả hai (Hệ3-L8 "hai biển cùng lúc").
 */

/** Vị trí: tường mặt tiền (z=1) bên trái cửa (cửa x=4) đối xứng với biển mở/đóng ở x=5,25. */
export const STANCE_SIGN_POS: [number, number, number] = [2.65, 1.98, 1.12];
/** Đáy biển cao hơn đầu người để không vướng. */
export const STANCE_SIGN_HEAD_CLEARANCE = 1.6;
export const STANCE_SIGN_SIZE = { w: 1.1, h: 0.36 };

/** Màu nền theo hướng (khớp bảng màu thẻ Định vị). */
const BG_BY_ID: Record<StanceId, string> = { binh_dan: '2ecc71', dac_san: '9b59b6', tien_loi: '2980b9' };
const NONE_BG = '7f8c8d';

/** Vẽ mặt biển: nền màu + dòng chữ hướng đang treo (một hoặc hai, phân cách “/”). */
function faceTexture(label: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 168;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#f5ead2';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = `#${bg}`;
    g.fillRect(10, 10, c.width - 20, c.height - 20);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 52px "Segoe UI", Arial, sans-serif';
    g.fillText(label, c.width / 2, c.height / 2 + 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export interface StanceSign {
  group: THREE.Group;
  /** Cập nhật chữ theo danh sách hướng đang treo (rỗng = chưa treo). */
  update(ids: StanceId[]): void;
  loaded: boolean;
}

export function createStanceSign(): StanceSign {
  const group = new THREE.Group();
  group.name = 'stanceSign';
  const [x, y, z] = STANCE_SIGN_POS;
  group.position.set(x, y, z);

  const { w, h } = STANCE_SIGN_SIZE;
  const hasDom = typeof document !== 'undefined';
  const noneMat = new THREE.MeshStandardMaterial(hasDom ? { map: faceTexture('CHỪA TREO', NONE_BG), emissive: 0xffffff, emissiveIntensity: 0.12 } : { color: 0x7f8c8d });
  if (hasDom) noneMat.emissiveMap = noneMat.map;
  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const getMat = (label: string, id?: StanceId) => {
    const bg = id ? BG_BY_ID[id] : NONE_BG;
    const key = `${id ?? 'none'}|${label}`;
    let m = matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial(hasDom ? { map: faceTexture(label, bg), emissive: 0xffffff, emissiveIntensity: 0.12 } : { color: id ? 0x8e8e8e : 0x7f8c8d });
      if (hasDom) m.emissiveMap = m.map;
      matCache.set(key, m);
    }
    return m;
  };

  // Tấm biển treo dưới một cái đinh, hai sợi dây chữ V — xoay nhẹ quanh đinh (như biển mở/đóng).
  const pivot = new THREE.Group();
  pivot.position.y = 0.2;
  group.add(pivot);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.02), new THREE.MeshStandardMaterial({ color: 0x6b4a26 }));
  back.position.y = -0.2;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), noneMat);
  face.position.set(0, -0.2, 0.012);
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

  let lastKey = '__none__';
  const api: StanceSign = { group, loaded: true, update: (ids) => {
    const key = ids.join(',');
    if (key === lastKey) return;
    lastKey = key;
    const label = ids.length === 0 ? 'CHỪA TREO' : ids.map((id) => STANCE_META[id].name).join(' / ');
    face.material = ids.length === 0 ? noneMat : getMat(label, ids[0]);
  } };
  api.update([]);
  return api;
}
