import { lazyGltfLoader } from './gltfLoader';
import * as THREE from 'three';

/**
 * Bộ cây xanh & đồ vườn GLB tải tự do từ 3DLabTools (người dùng chọn ngày 2026-11-08):
 * cây đa, dừa, phượng, đào/mai/quất Tết, chuối, sen, luống lúa + vài món CC0 nhẹ (kaykit/kenney).
 * Model gốc rất nặng (10–30 MB) nên đã qua bước tối ưu (@gltf-transform/cli optimize:
 * simplify + texture webp 1024 + draco) trước khi đưa vào public/models/nature.
 * Giống kitProps: chỉ trang trí, KHÔNG chặn lưới đi lại (không boxes), tải lười sau khi
 * thế giới đã chạy. Khác kitProps: model nguồn toạ độ bừa, nên placement khai báo `height`
 * mục tiêu — lúc tải đo bbox rồi auto-fit chiều cao + đáy chạm đất (pos.y là độ cao đáy).
 * GĐ1830b — dàn lại theo góp ý: cây tách cụm thoáng, mỗi cụm một ý (gốc đa + ghế, vườn đào mai,
 * dừa ven đường), bỏ kệ treo + thùng sau nhà (bày vụng); thêm mùa theo lịch thật (GĐ1830b):
 * phượng nở đỏ tháng 5–7, đào/mai nở Tết tháng 1–2, ngoài mùa tán sậm màu — chọn đúng đời thực.
 */

/** Toàn bộ module có file trong public/models/nature (nature-manifest.json kiểm kê). */
export const NATURE_MODULES = [
  'banyan', 'coconut', 'poinciana', 'apricot', 'peach', 'kumquat', 'lotus', 'rice',
  'banana', 'garden_tree', 'garden_bench', 'timber_fence',
] as const;
export type NatureModule = (typeof NATURE_MODULES)[number];

export interface NaturePlacement {
  module: NatureModule;
  pos: [number, number, number];
  /** Chiều cao mục tiêu (m) — model auto-fit về đúng chiều cao này khi tải. */
  height: number;
  rotY?: number;
}

/**
 * Bảng vị trí đặt (GĐ1830b — dàn lại cho thoáng, mỗi cụm một ý, cây to cách nhau ≥ 7 m):
 * - "Gốc đa giữa đất" phía tây: một cây đa to làm mốc nhìn, ghế vườn cạnh chân cây.
 * - "Vườn Tết" tây nam: đào + mai + sen trải rộng quanh đất trống, mỗi cây một góc.
 * - "Ven đường": dừa dọc đất trống phía đông hẻm và góc tây nam, chuối nép cạnh khóm tre
 *   có sẵn, cây vườn nhỏ rải vỉa hè cùng nhịp chậu cây của kit.
 * - "Cánh đồng": luống lúa rời nhau cạnh trang trại (đông và tây mảnh trại).
 * - Quất chậu hai mép mặt tiền tiệm (ngoài hành lang x2..6 phải trống), rào gỗ liền mép bắc
 *   đường thứ hai. Chỉ hình ảnh — không chặn lưới.
 */
export const NATURE_PLACEMENTS: NaturePlacement[] = [
  // Cụm gốc đa phía tây — một mốc nhìn, thoáng xung quanh
  { module: 'banyan', pos: [-32, 0, -22], height: 12, rotY: 0.5 },
  { module: 'garden_bench', pos: [-29.8, 0, -19.2], height: 0.95, rotY: 0.75 },
  // Cụm vườn Tết tây nam — đào, mai, sen mỗi cây một góc, cách cây to ≥ 8 m
  { module: 'poinciana', pos: [-19, 0, -34], height: 9, rotY: 2.1 },
  { module: 'peach', pos: [-36, 0, -10], height: 4.6, rotY: 1.3 },
  { module: 'apricot', pos: [-23, 0, -40], height: 4.6, rotY: 3.9 },
  { module: 'lotus', pos: [-47, 0, -32], height: 0.8, rotY: 0.2 },
  // Chuối nép cạnh hai khóm tre có sẵn (tây -40..-43 z -16..-23; đông x37 z-19)
  { module: 'banana', pos: [-38, 0, -28], height: 4.6, rotY: 0.4 },
  { module: 'banana', pos: [41, 0, -26], height: 4.2, rotY: 2.8 },
  // Dừa ven đất trống — đông hẻm dọc (x > LANE_X + 6) và góc tây nam
  { module: 'coconut', pos: [62, 0, -18], height: 10, rotY: 1.1 },
  { module: 'coconut', pos: [57, 0, -38], height: 9.2, rotY: 4.4 },
  { module: 'coconut', pos: [-45, 0, -42], height: 9.5, rotY: 2.6 },
  // Cánh đồng: luống lúa rời nhau, ngoài mảnh trại x11..37
  { module: 'rice', pos: [45, 0, -70], height: 1.05, rotY: 0.15 },
  { module: 'rice', pos: [3, 0, -68], height: 0.9, rotY: 1.9 },
  // Cây vườn nhỏ dọc vỉa hè, tránh chậu kit (x -13.5/-10.5/1.5/6.5) và nhà (x -15..-9)
  { module: 'garden_tree', pos: [-24, 0, 1.5], height: 3.6, rotY: 1.1 },
  { module: 'garden_tree', pos: [14, 0, 1.5], height: 3.2, rotY: 3.3 },
  { module: 'garden_tree', pos: [-37, 0, 1.5], height: 3.8, rotY: 5.0 },
  // Quất chậu hai mép mặt tiền tiệm — ngoài hành lang x2..6 giữ trống
  { module: 'kumquat', pos: [-0.7, 0, 1.6], height: 1.7, rotY: 1.9 },
  { module: 'kumquat', pos: [8.8, 0, 1.6], height: 1.7, rotY: 2.2 },
  // Rào gỗ ghép liền dọc mép bắc đường thứ hai (mép vỉa hè z ≈ -52.8; mỗi đoạn ~1.6 m)
  { module: 'timber_fence', pos: [15, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [16.6, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [18.2, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [19.8, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [21.4, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [23, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [24.6, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [26.2, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [27.8, 0, -52.8], height: 1.1 },
  { module: 'timber_fence', pos: [29.4, 0, -52.8], height: 1.1 },
];

/**
 * Mùa nở của từng cây theo lịch thật (tháng dương) — đúng đời thực:
 * phượng rực đỏ mùa hè (5–7), đào/mai nở Tết (1–2). Ngoài mùa, tán nhân màu sậm lịm
 * (nhân màu lên mọi mesh của cây) để thấy rõ "hết mùa" mà không cần model riêng.
 */
const BLOOM_MONTHS: Partial<Record<NatureModule, number[]>> = {
  poinciana: [5, 6, 7],
  peach: [1, 2],
  apricot: [1, 2],
};
/** Màu nhân ngoài mùa: trầm đi vừa phải — hoa thành màu gạch sậm, tán vẫn xanh mà không rực. */
const OFF_BLOOM_TINT = 0xa8ae90;

/** Chỗ trượt đứng: ngoài thế giới ±80, giữa lòng đường chính (z 3..9) là bug đặt chỗ. */
export function naturePlacementProblems(): string[] {
  const problems: string[] = [];
  for (const p of NATURE_PLACEMENTS) {
    const [x, , z] = p.pos;
    if (!NATURE_MODULES.includes(p.module)) problems.push(`${p.module}: không có trong nature kit`);
    if (Math.abs(x) > 80 || Math.abs(z) > 80) problems.push(`${p.module} @${x},${z}: ngoài thế giới ±80`);
    if (z > 3 && z < 9) problems.push(`${p.module} @${x},${z}: giữa lòng đường chính`);
    if (z > -53 && z < -59) problems.push(`${p.module} @${x},${z}: giữa lòng đường thứ hai`);
    if (x > 47.5 && x < 52.5 && z < 3) problems.push(`${p.module} @${x},${z}: đè hẻm dọc`);
    if (x >= 11 && x <= 37 && z >= -80 && z <= -60) problems.push(`${p.module} @${x},${z}: đè mảnh trang trại`);
    if (x >= 0 && x <= 8 && z <= 1 && z >= -22) problems.push(`${p.module} @${x},${z}: đè mặt tiền tiệm`);
    if (x >= 2 && x <= 6 && z >= 0 && z <= 4) problems.push(`${p.module} @${x},${z}: bày trong hành lang trước cửa tiệm`);
  }
  return problems;
}

export interface NatureProps {
  group: THREE.Group;
  /** Số prop đã hiện ra. */
  loaded: number;
  /** Module tải lỗi (file mất, mạng offline...) — game vẫn chơi bình thường. */
  failed: string[];
  /** Hiện/ẩn đồ trang trí theo mức đồ họa (đồng bộ kit.setDecor). */
  setDecor(on: boolean): void;
  /** Gán tháng hiện tại (1–12) để cây đổi màu theo mùa: phượng đỏ hè, đào/mai nở Tết. */
  setSeason(month: number): void;
}

/**
 * Bắt đầu tải nature kit: trả group trống để scene.add NGAY, prop vừa tải vừa chen.
 * Mỗi model đo bbox lần đầu rồi auto-fit: scale theo chiều cao mục tiêu, đáy chạm
 * pos.y, tâm ngang về pos.x/z. Lỗi mạng chỉ ghi console — thiếu cây vẫn chơi được.
 */
export function loadNatureProps(baseUrl = '/models/nature/'): { group: THREE.Group; done: Promise<NatureProps>; setDecor(on: boolean): void; setSeason(month: number): void } {
  const group = new THREE.Group();
  group.name = 'natureProps';
  let decorOn = true;
  const setDecor = (on: boolean) => {
    decorOn = on;
    for (const c of group.children) c.visible = on;
  };
  // Mùa hiện tại: main.tsx gọi setSeason mỗi khi sang tháng mới; prop tải muộn tint theo đây
  let curMonth = 1;
  // Mỗi prop nở/mất-mùa theo module: giữ root + module để setSeason tô lại toàn bộ
  const tintables: { root: THREE.Object3D; module: NatureModule }[] = [];
  const applyTint = (root: THREE.Object3D, module: NatureModule) => {
    const bloom = BLOOM_MONTHS[module];
    if (!bloom) return;
    const tint = bloom.includes(curMonth) ? 0xffffff : OFF_BLOOM_TINT;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std && std.color) std.color.setHex(tint);
      }
    });
  };
  const setSeason = (month: number) => {
    curMonth = month;
    for (const t of tintables) applyTint(t.root, t.module);
  };
  const result: NatureProps = { group, loaded: 0, failed: [], setDecor, setSeason };
  const done = new Promise<NatureProps>((resolve) => {
    const finish = () => resolve(result);
    if (NATURE_PLACEMENTS.length === 0) return finish();
    const loader = lazyGltfLoader();
    let pending = NATURE_PLACEMENTS.length;
    // Đặt một GLB: auto-fit chiều cao mục tiêu, đáy chạm pos.y, tâm ngang về pos.x/z
    const place = (root: THREE.Object3D, p: NaturePlacement) => {
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const k = size.y > 1e-6 ? p.height / size.y : 1;
      root.scale.multiplyScalar(k);
      root.updateMatrixWorld(true);
      const fitted = new THREE.Box3().setFromObject(root);
      const center = fitted.getCenter(new THREE.Vector3());
      root.position.set(p.pos[0] - center.x, p.pos[1] - fitted.min.y, p.pos[2] - center.z);
      if (p.rotY) root.rotation.y = p.rotY;
      applyTint(root, p.module);
      if (BLOOM_MONTHS[p.module]) tintables.push({ root, module: p.module });
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = false; }
      });
      root.visible = decorOn;
      group.add(root);
    };
    const settle = (ok: boolean, module: NatureModule) => {
      if (!ok && !result.failed.includes(module)) result.failed.push(module);
      result.loaded++;
      if (result.loaded >= pending) finish();
    };
    // Đọc manifest trước: chỉ tải module còn nguyên file (thiếu thì bỏ qua, không đợi)
    fetch(`${baseUrl}nature-manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
      .then((manifest: { modules: Record<string, unknown> }) => {
        const available = new Set(Object.keys(manifest.modules));
        const live = NATURE_PLACEMENTS.filter((p) => available.has(p.module));
        pending = live.length;
        for (const p of live) {
          loader.load(
            `${baseUrl}${p.module}.glb`,
            (gltf) => { place(gltf.scene, p); settle(true, p.module); },
            undefined,
            () => settle(false, p.module),
          );
        }
        if (pending === 0) finish();
      })
      .catch((err) => {
        console.warn('[nature] Không tải được nature kit — chơi tiếp không sao:', err?.message ?? err);
        result.failed.push(...NATURE_MODULES);
        finish();
      });
  });
  return { group, done, setDecor, setSeason };
}
