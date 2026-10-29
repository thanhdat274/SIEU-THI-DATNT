import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Kit prop GLB sinh bằng script (`scripts/build-kit-assets.ts` — Three.js → GLB, màu đỉnh,
 * không texture) đặt điểm xuyết quanh hẻm cho đỡ trống trải, theo tinh thần pipeline của
 * Xóm Nông Trại: model nhẹ nén gọn + manifest kiểm kê, tải lười sau khi thế giới đã chạy.
 * Vị trí đặt là ảnh trang trí; **không chặn lưới đi lại** (boxes rỗng) — cùng convention
 * với quán nước ở quanNuocStand.ts: NPC không bị vấp đồ trang trí.
 */

/** Toàn bộ module mà script hiện sinh ra — placement chỉ được trỏ vào đây. */
export const KIT_MODULES = ['chau_cay', 'thung_go', 'khom_tre', 'bon_nuoc', 'cho_nhua', 'xe_day', 'rao_chan', 'bang_ghe'] as const;
export type KitModule = (typeof KIT_MODULES)[number];

export interface KitPlacement {
  module: KitModule;
  pos: [number, number, number];
  /** Xoay quanh trục đứng (radian) để mỗi món không xoay lưng như đen. */
  rotY?: number;
  scale?: number;
}

/**
 * Bảng vị trí đặt — chỗ đất trống/mép vỉa hè đã kiểm tra không đè cửa đi, không nằm giữa
 * lòng đường (z 3..9), không trong nhà: hai chậu cây hai bên cửa nhà + trước mặt tiền tiệm
 * (mặt tiền z=1 cố định, tiệm lớn lên phía sau), thùng gỗ xó giữa nhà và tiệm, tre ven khu
 * cây phía tây (z ≤ -10), bồn nước góc sau nhà, ghế nhựa rải vỉa hè, gánh hàng rong trước
 * dãy nhà hàng xóm.
 */
export const KIT_PLACEMENTS: KitPlacement[] = [
  { module: 'chau_cay', pos: [-13.5, 0, 1.3], rotY: 0.4, scale: 1.25 },
  { module: 'chau_cay', pos: [-10.5, 0, 1.3], rotY: 2.6, scale: 1.1 },
  { module: 'chau_cay', pos: [1.5, 0, 1.35], rotY: 1.2, scale: 1.2 },
  { module: 'chau_cay', pos: [6.5, 0, 1.35], rotY: 4.4, scale: 1.3 },
  { module: 'thung_go', pos: [-8.3, 0, 1.1], rotY: 0.5 },
  { module: 'thung_go', pos: [-8.2, 0, 0.45], rotY: 1.1 },
  { module: 'khom_tre', pos: [-40, 0, -16], rotY: 0.8, scale: 1.4 },
  { module: 'khom_tre', pos: [-43.5, 0, -23], rotY: 2.9, scale: 1.15 },
  { module: 'khom_tre', pos: [37, 0, -19], rotY: 1.7, scale: 1.3 },
  { module: 'bon_nuoc', pos: [-8.8, 0, -7.6], rotY: 0.2 },
  { module: 'cho_nhua', pos: [7.6, 0, 2.55], rotY: 0.9 },
  { module: 'cho_nhua', pos: [-14.8, 0, 2.3], rotY: 2.2 },
  { module: 'cho_nhua', pos: [-15.6, 0, 1.7], rotY: 3.1 },
  { module: 'xe_day', pos: [17.5, 0, 2.15], rotY: 0.35 },
  // Băng ghế hẻm (gđ195): chỗ bà con ngồi hóng mát — cạnh nhà phía tây, bên đống chậu cây gần tre,
  // và trên vỉa hè phía đông đối diện dãy quán; vẫn chỉ đồ trang trí, không chặn lưới đi lại.
  { module: 'bang_ghe', pos: [-18, 0, -6], rotY: 0.9 },
  { module: 'bang_ghe', pos: [15.2, 0, 2.1], rotY: -0.4 },
  { module: 'bang_ghe', pos: [-45, 0, -22], rotY: 2.2 },
];

/**
 * Gánh hàng chợ phiên (gđ181): những món `xe_day` chỉ dựng thêm dọc hẻm khi `isMarketDay(day)`
 * (mỗi 7 ngày, GĐ135) — "con hẻm sống theo lịch": ngày thường vắng, phiên chợ thì hàng bày ra mép
 * vỉa hè sát lòng đường. Tái dùng module xe_day có sẵn (không cần Blender mới), bật/tắt bằng
 * `setMarketDay`; vẫn không chặn lưới đi lại (chỉ hình ảnh).
 */
export const KIT_MARKET_PLACEMENTS: KitPlacement[] = [
  { module: 'xe_day', pos: [-3.2, 0, 2.6], rotY: 0.5 },
  { module: 'xe_day', pos: [0.4, 0, 2.7], rotY: 1.4 },
  { module: 'xe_day', pos: [8.4, 0, 2.5], rotY: 4.6 },
];

/**
 * Rào chắn công trình "đang sửa đường" (gđ184): những `rao_chan` chỉ dựng ở mép vỉa hè trước mặt
 * tiền khi hôm nay có sự kiện market `roadworks` (giảm lượt khách đi ngang — xem `dayEffects`).
 * Cùng kiểu GĐ181/182: con hẻm đổi cảnh theo lịch kinh tế, chỉ báo tín hiệu bằng hình; bật/tắt
 * bằng `setRoadwork`; KHÔNG chặn lưới đi lại (chỉ trang trí). Đặt ở mép vỉa hè (z 1.5..3), không
 * giữa lòng đường — "đường phía trước đang sửa" chứ không chắn lối.
 */
export const KIT_ROADWORK_PLACEMENTS: KitPlacement[] = [
  { module: 'rao_chan', pos: [-2.2, 0, 2.6], rotY: 0.08, scale: 1.05 },
  { module: 'rao_chan', pos: [4.6, 0, 2.5], rotY: -0.06, scale: 1.05 },
];

/** Chỗ trượt đứng: đè vào nhà / lòng đường / ngoài thế giới là bug đặt chỗ, soi bằng test. */
export function kitPlacementProblems(): string[] {
  const problems: string[] = [];
  const inRect = (x: number, z: number, x1: number, z1: number, x2: number, z2: number) =>
    x >= x1 && x <= x2 && z >= z1 && z <= z2;
  const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS];
  for (const p of all) {
    const [x, , z] = p.pos;
    if (!KIT_MODULES.includes(p.module)) problems.push(`${p.module}: không có trong kit`);
    if (Math.abs(x) > 80 || Math.abs(z) > 80) problems.push(`${p.module} @${x},${z}: ngoài thế giới ±80`);
    // Lòng đường chính (z 3..9) và đường thứ hai (ROAD2_Z=−64, rộng 6): tránh 3 mép mỗi bên
    if (z > 3 && z < 9) problems.push(`${p.module} @${x},${z}: giữa lòng đường chính`);
    if (Math.abs(z - -64) < 3 && x > 27 && x < 87) problems.push(`${p.module} @${x},${z}: giữa lòng đường thứ hai`);
    // Nhà riêng (6×6 tại −12,−2) và khối nhà riêng sau nhà
    if (inRect(x, z, -15, -5.2, -9, 1.2)) problems.push(`${p.module} @${x},${z}: đè nhà riêng`);
    // Mặt tiền tiệm (x 0..8, front z=1) — tiệm lớn lên phía sau nên đủ cỡ siêu thị cũng chỉ về phía −z
    if (inRect(x, z, 0, -22, 8, 1)) problems.push(`${p.module} @${x},${z}: đè mặt tiền tiệm`);
  }
  // Hai món chen nhau quá sát nhìn như lỗi đặt chỗ (kể cả base lẫn chợ phiên)
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i].pos, b = all[j].pos;
      if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.55) {
        problems.push(`${all[i].module} & ${all[j].module}: chèn nhau <0.55 m`);
      }
    }
  }
  return problems;
}

export interface KitProps {
  group: THREE.Group;
  /** Số prop đã hiện ra (kết thúc khi bằng KIT_PLACEMENTS.length). */
  loaded: number;
  /** Module tải lỗi (không còn file, mạng offline...) — game vẫn chơi bình thường. */
  failed: string[];
  /** Nhóm gánh hàng chợ phiên (gđ181) — con của `group`, mặc định ẩn; bật bằng setMarketDay. */
  marketGroup: THREE.Group;
  /** Bật/tắt cảnh chợ phiên (gánh hàng dựng thêm dọc hẻm khi isMarketDay). */
  setMarketDay(on: boolean): void;
  /** Nhóm rào chắn sửa đường (gđ184) — con của `group`, mặc định ẩn; bật bằng setRoadwork. */
  roadworkGroup: THREE.Group;
  /** Bật/tắt cảnh "đang sửa đường" (rào chắn trước hẻm khi có sự kiện market roadworks). */
  setRoadwork(on: boolean): void;
}

/**
 * Bắt đầu tải kit: trả về group trống để `scene.add` NGAY (thế giới không phải chờ), các prop
 * vừa tải xong vừa chen vào. Lỗi mạng chỉ ghi console — kit là đồ trang trí, không có vẫn chơi được.
 */
export function loadKitProps(baseUrl = '/models/kit/'): { group: THREE.Group; done: Promise<KitProps>; marketGroup: THREE.Group; setMarketDay(on: boolean): void; roadworkGroup: THREE.Group; setRoadwork(on: boolean): void } {
  const group = new THREE.Group();
  group.name = 'kitProps';
  // Nhóm gánh hàng chợ phiên (gđ181): con của group, mặc định ẩn — setMarketDay bật khi isMarketDay.
  const marketGroup = new THREE.Group();
  marketGroup.name = 'marketDayProps';
  marketGroup.visible = false;
  group.add(marketGroup);
  // Nhóm rào chắn sửa đường (gđ184): con của group, mặc định ẩn — setRoadwork bật khi roadworks.
  const roadworkGroup = new THREE.Group();
  roadworkGroup.name = 'roadworkProps';
  roadworkGroup.visible = false;
  group.add(roadworkGroup);
  const result: KitProps = { group, loaded: 0, failed: [], marketGroup, setMarketDay: (on) => { marketGroup.visible = on; }, roadworkGroup, setRoadwork: (on) => { roadworkGroup.visible = on; } };
  const done = new Promise<KitProps>((resolve) => {
    const finish = () => resolve(result);
    if (KIT_PLACEMENTS.length === 0) return finish();
    const loader = new GLTFLoader();
    // Kit đã qua bước nén Draco của Blender (scripts/blender_kit_atlas.py): nhỏ gấp ~8 lần.
    // Decoder để local (public/decoders/draco, copy từ node_modules/three) — không phụ thuộc CDN,
    // trình duyệt tải đúng một lần rồi cache cho mọi model nén sau này.
    const draco = new DRACOLoader().setDecoderPath('/decoders/draco/');
    loader.setDRACOLoader(draco);
    // Đặt một GLB vào đúng chỗ (gốc, xoay, tới scale) + đổ bóng xuống đất
    const place = (root: THREE.Object3D, p: KitPlacement, parent: THREE.Object3D) => {
      root.position.set(...p.pos);
      if (p.rotY) root.rotation.y = p.rotY;
      if (p.scale) root.scale.setScalar(p.scale);
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = false; }
      });
      parent.add(root);
    };
    let pending = KIT_PLACEMENTS.length;
    const settle = (ok: boolean, module: KitModule) => {
      if (!ok && !result.failed.includes(module)) result.failed.push(module);
      if (++result.loaded >= pending) finish();
    };
    // Lấy manifest trước: biết file nào có thật, không thì chỉ tải những module còn nguyên
    fetch(`${baseUrl}kit-manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
      .then((manifest: { modules: Record<string, unknown> }) => {
        const available = new Set(Object.keys(manifest.modules));
        const live = KIT_PLACEMENTS.filter((p) => available.has(p.module));
        if (!live.length) {
          result.failed.push(...KIT_MODULES);
          return finish();
        }
        pending = live.length;
        result.loaded = 0;
        for (const p of live) {
          loader.load(
            `${baseUrl}${p.module}.glb`,
            (gltf) => { place(gltf.scene, p, group); settle(true, p.module); },
            undefined,
            () => settle(false, p.module),
          );
        }
        // Chợ phiên (gđ181): tải thêm vài `xe_day` vào marketGroup, ẩn cho tới setMarketDay(true).
        // Load/hiển thị độc lập với nhóm base — không ảnh hưởng `done`/`loaded` của kit chính.
        const marketLive = KIT_MARKET_PLACEMENTS.filter((p) => available.has(p.module));
        for (const p of marketLive) {
          loader.load(
            `${baseUrl}${p.module}.glb`,
            (gltf) => { place(gltf.scene, p, marketGroup); },
            undefined,
            () => { if (!result.failed.includes(p.module)) result.failed.push(p.module); },
          );
        }
        // Sửa đường (gđ184): tải `rao_chan` vào roadworkGroup, ẩn cho tới setRoadwork(true).
        const roadworkLive = KIT_ROADWORK_PLACEMENTS.filter((p) => available.has(p.module));
        for (const p of roadworkLive) {
          loader.load(
            `${baseUrl}${p.module}.glb`,
            (gltf) => { place(gltf.scene, p, roadworkGroup); },
            undefined,
            () => { if (!result.failed.includes(p.module)) result.failed.push(p.module); },
          );
        }
      })
      .catch((err) => {
        console.warn('[kit] Không tải được kit prop — chơi tiếp không sao:', err?.message ?? err);
        result.failed.push(...KIT_MODULES);
        finish();
      });
  });
  return { group, done, marketGroup, setMarketDay: result.setMarketDay, roadworkGroup, setRoadwork: result.setRoadwork };
}
