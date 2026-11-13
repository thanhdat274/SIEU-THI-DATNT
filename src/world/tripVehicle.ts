import * as THREE from 'three';
import { useGame } from '../core/store';
import type { HaulerId } from '../data/routes';

/**
 * Hệ 5 L9 (SPEC §5.10 "3D làm sau") — XE CHỞ HÀNG ĐẬU BÊN HÔNG NHÀ. Người chơi đã mua ba gác / xe tải
 * (`biz.hauler`) thì thấy xe đậu cạnh nhà riêng; xe đi tỉnh (`biz.trip` đang chạy) thì chỗ đậu trống,
 * về tới là hiện lại. Đặt ở hông nhà (KHÔNG phải hành lang trước tiệm — luật 7), 1 prop duy nhất, hộp
 * thủ tục nhẹ như rapDam.ts, không asset ngoài; chỉ hiển thị, không đụng kinh tế/RNG/save → golden y nguyên.
 */
export type ParkedKind = 'ba_gac' | 'xe_tai';

/** Xe nào đang đậu (null = không có xe riêng, hoặc xe đang đi tỉnh). Xe máy/xe khách không đậu. THUẦN. */
export function parkedHauler(hauler: HaulerId | undefined, onTrip: boolean): ParkedKind | null {
  if (onTrip) return null;
  return hauler === 'ba_gac' || hauler === 'xe_tai' ? hauler : null;
}

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

function wheel(): THREE.Mesh {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12), mat(0x222222));
  w.rotation.x = Math.PI / 2;
  return w;
}

function buildVehicle(kind: ParkedKind): THREE.Group {
  const g = new THREE.Group();
  const truck = kind === 'xe_tai';
  const len = truck ? 3.4 : 2.3;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 1.5), mat(truck ? 0x2e7d32 : 0x8d6e63));
  bed.position.set(0, 0.7, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(truck ? 1.1 : 0.8, truck ? 1.0 : 0.9, 1.4), mat(truck ? 0xf5f5f5 : 0xc62828));
  cab.position.set(len / 2 + (truck ? 0.45 : 0.2), truck ? 0.95 : 0.9, 0);
  g.add(bed, cab);
  for (const x of [-len / 3, len / 2]) for (const z of [-0.78, 0.78]) {
    const w = wheel();
    w.position.set(x, 0.28, z);
    g.add(w);
  }
  g.traverse((o) => { o.frustumCulled = true; });
  return g;
}

export function installTripVehicleSync(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group();
  root.position.set(-17.2, 0, -2); // hông tây nhà riêng (nhà ở x=-12, rộng 6)
  root.rotation.y = Math.PI / 2;
  root.visible = false;
  scene.add(root);
  let shown: ParkedKind | null = null;
  const update = () => {
    const b = useGame.getState().biz;
    const want = parkedHauler(b.hauler, !!b.trip);
    if (want === shown) return;
    shown = want;
    root.clear();
    if (want) root.add(buildVehicle(want));
    root.visible = want !== null;
  };
  update();
  useGame.subscribe(update);
  return root;
}
