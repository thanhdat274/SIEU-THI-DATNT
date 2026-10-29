/**
 * Sinh kit asset low-poly ra GLB — không cần Blender, dùng đúng Three.js mà game đang dùng.
 * Mỗi vật phẩm = nhiều khối cơ bản gán màu đỉnh (vertex color) rồi gộp thành MỘT mesh,
 * nên mỗi GLB chỉ tốn 1 lần vẽ khi đưa vào game. Xuống `public/models/kit/` kèm manifest
 * kiểm kê số triangle (kiểu pipeline của Xóm Nông Trại) để soi asset nào phình to.
 *
 * Chạy: npx tsx scripts/build-kit-assets.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const OUT_DIR = path.resolve('public/models/kit');

// GLTFExporter khi đóng gói GLB nhị phân dùng FileReader để Blob → ArrayBuffer;
// Node không có sẵn nên bọc một lớp tối thiểu (chỉ đường dùng bởi exporter).
class FileReaderShim {
  onloadend: (() => void) | null = null;
  onload: (() => void) | null = null;
  result: ArrayBuffer | null = null;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onload?.();
      this.onloadend?.();
    });
  }
}
(globalThis as { FileReader?: unknown }).FileReader = FileReaderShim;

/** Khối cơ bản: mặt phẳng cạnh rõ (không chọn lọc) cho kiểu low-poly giòn, tròn cạnh cho kiểu mềm. */
function facet(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}

/** Gán một màu phẳng cho toàn bộ đỉnh của khối (trước khi gộp). Ghi RGBA (4 kênh):
 * Blender 5.2 chỉ nhận COLOR_0 dạng VEC4 khi import — VEC3 của ba.js bị bỏ qua yên tĩnh. */
function paint(geo: THREE.BufferGeometry, hex: number) {
  const c = new THREE.Color(hex).convertSRGBToLinear();
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    arr[i * 4] = c.r;
    arr[i * 4 + 1] = c.g;
    arr[i * 4 + 2] = c.b;
    arr[i * 4 + 3] = 1;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 4));
  return geo;
}

function part(geo: THREE.BufferGeometry, hex: number, x = 0, y = 0, z = 0, rot?: [number, number, number], scale?: [number, number, number]) {
  if (scale) geo.scale(...scale);
  if (rot) geo.rotateX(rot[0]), geo.rotateY(rot[1]), geo.rotateZ(rot[2]);
  geo.translate(x, y, z);
  return paint(geo, hex);
}

const GREEN_D = 0x4f9638, GREEN = 0x6fb54a, GREEN_L = 0x8fc95e;
const TERRA = 0xb5654a, TERRA_D = 0x96513a, SOIL = 0x4a3527;
const WOOD = 0xa9743f, WOOD_D = 0x8a5a2e, WOOD_L = 0xc08b52;
const BAMBOO = 0x8cb43e, BAMBOO_D = 0x6f942f;
const STEEL = 0x5a6a72, TANK = 0xc3d6de, TANK_D = 0xa8bfc9;
const RED = 0xd63031, RED_D = 0xb02626;

/** Chậu cây kiểng: chậu đất nung 8 cạnh + bụi lá tròn trịa vài chấm hoa. */
function chauCay() {
  const parts = [
    part(facet(new THREE.CylinderGeometry(0.30, 0.20, 0.32, 8)), TERRA, 0, 0.16, 0),
    part(facet(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 8)), TERRA_D, 0, 0.34, 0),
    part(facet(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 8)), SOIL, 0, 0.36, 0),
    // Bụi lá: icosahedron mặt thô, ba tông xanh chồng lên nhau
    part(facet(new THREE.IcosahedronGeometry(0.26, 0)), GREEN_D, 0, 0.58, 0),
    part(facet(new THREE.IcosahedronGeometry(0.20, 0)), GREEN, 0.13, 0.72, 0.05),
    part(facet(new THREE.IcosahedronGeometry(0.17, 0)), GREEN_L, -0.12, 0.76, -0.04),
    // Vài chấm hoa nhỏ cho đỡ đơn điệu
    part(facet(new THREE.SphereGeometry(0.045, 6, 4)), 0xf2b6c6, 0.10, 0.88, 0.08),
    part(facet(new THREE.SphereGeometry(0.04, 6, 4)), 0xf5d76e, -0.16, 0.90, 0.02),
    part(facet(new THREE.SphereGeometry(0.04, 6, 4)), 0xf2b6c6, 0.02, 0.80, -0.16),
  ];
  return parts;
}

/** Thùng gỗ tạp hóa: hộp tròn cạnh + hai đai đóng ghim + bốn thanh nẹp góc. */
function thungGo() {
  const W = 0.64, H = 0.44, D = 0.46;
  const parts = [
    part(new RoundedBoxGeometry(W, H, D, 1, 0.03), WOOD, 0, H / 2, 0),
    // Đai ngang trên dưới, đậm hơn thân
    part(new RoundedBoxGeometry(W + 0.03, 0.07, D + 0.03, 1, 0.02), WOOD_D, 0, 0.09, 0),
    part(new RoundedBoxGeometry(W + 0.03, 0.07, D + 0.03, 1, 0.02), WOOD_D, 0, H - 0.09, 0),
    // Bốn thanh nẹp góc đứng sáng màu
    [-1, 1].flatMap((sx) => [-1, 1].map((sz) =>
      part(new RoundedBoxGeometry(0.06, H + 0.02, 0.06, 1, 0.015), WOOD_L, (sx * (W - 0.05)) / 2, H / 2, (sz * (D - 0.05)) / 2),
    )),
  ];
  return parts.flat();
}

/** Bồn nước tôn trên khung sắt — trên mọi nóc nhà hẻm Việt Nam. */
function bonNuoc() {
  const LEG_H = 0.82, R = 0.34;
  const parts: THREE.BufferGeometry[] = [];
  // Khung sắt: bốn chân nghiêng nhẹ vào tâm + hai vành đai
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
    parts.push(part(
      facet(new THREE.CylinderGeometry(0.022, 0.022, LEG_H, 6)),
      STEEL,
      sx * 0.21, LEG_H / 2, sz * 0.21,
      [sz * 0.06, 0, -sx * 0.06],
    ));
  }
  parts.push(part(facet(new THREE.TorusGeometry(0.30, 0.014, 5, 12)), STEEL, 0, LEG_H * 0.45, 0, [Math.PI / 2, 0, 0]));
  parts.push(part(facet(new THREE.TorusGeometry(0.26, 0.014, 5, 12)), STEEL, 0, LEG_H * 0.75, 0, [Math.PI / 2, 0, 0]));
  // Thân bồn: trụ tôn sáng, hai miệng loa soong
  parts.push(part(facet(new THREE.CylinderGeometry(R, R, 0.52, 12)), TANK, 0, LEG_H + 0.26, 0));
  parts.push(part(facet(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.05, 12)), TANK_D, 0, LEG_H + 0.02, 0));
  parts.push(part(facet(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.05, 12)), TANK_D, 0, LEG_H + 0.5, 0));
  // Nắp vòm tẹt + núm xoay
  parts.push(part(facet(new THREE.SphereGeometry(R + 0.01, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2.6)), TANK_D, 0, LEG_H + 0.52, 0));
  parts.push(part(facet(new THREE.CylinderGeometry(0.035, 0.05, 0.06, 8)), STEEL, 0, LEG_H + 0.72, 0));
  // Ống nước rút xuống chân khung
  parts.push(part(facet(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6)), TANK_D, 0.28, LEG_H * 0.5, 0.28));
  return parts;
}

/** Ghế nhựa đỏ thấp — chuẩn ngồi hẻm Sài Gòn. */
function choNhua() {
  const parts: THREE.BufferGeometry[] = [
    // Mặt ghế: đĩa dày bo tròn, 16 cạnh mềm
    part(facet(new THREE.CylinderGeometry(0.18, 0.16, 0.035, 16)), RED, 0, 0.44, 0),
    // Viền mép dưới: vành dày 6 mm
    part(facet(new THREE.TorusGeometry(0.16, 0.006, 4, 16)), RED, 0, 0.422, 0, [Math.PI / 2, 0, 0]),
    // Thân ghế (vỏ dưới): chỏm cong ngược, nối liền với mặt
    part(
      facet(new THREE.SphereGeometry(0.165, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)),
      RED, 0, 0.44, 0,
    ),
    // Đế loe: đáy rộng hơn để ngồi thoải mái
    part(facet(new THREE.CylinderGeometry(0.14, 0.12, 0.04, 14)), RED_D, 0, 0.395, 0),
    // Chân trước: thẳng đứng hơn một chút
    part(
      facet(new THREE.CylinderGeometry(0.018, 0.02, 0.37, 6)),
      RED_D, 0, 0.185, 0.12,
    ),
    // Chân sau: hơi ngả về sau
    part(
      facet(new THREE.CylinderGeometry(0.018, 0.02, 0.37, 6)),
      RED_D, 0, 0.185, -0.12,
      [0.10, 0, 0],
    ),
    // Hai chân bên
    part(
      facet(new THREE.CylinderGeometry(0.016, 0.018, 0.36, 6)),
      RED_D, -0.12, 0.18, 0,
      [-0.06, 0, 0],
    ),
    part(
      facet(new THREE.CylinderGeometry(0.016, 0.018, 0.36, 6)),
      RED_D, 0.12, 0.18, 0,
      [0.06, 0, 0],
    ),
    // Tựa lưng: thanh dọc trái + phải
    part(
      facet(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6)),
      RED_D, -0.07, 0.60, -0.13,
    ),
    part(
      facet(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6)),
      RED_D, 0.07, 0.60, -0.13,
    ),
    // Thanh ngang tựa lưng
    part(
      facet(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6)),
      RED_D, 0, 0.73, -0.13,
      [0, 0, 0],
    ),
    // Nắp tựa lưng: vòm cong nhẹ
    part(
      facet(new THREE.SphereGeometry(0.08, 10, 4, 0, Math.PI, 0, Math.PI / 2)),
      RED, 0, 0.73, -0.13,
    ),
  ];
  return parts;
}

/** Gánh hàng rong: xe đẩy gỗ sơn xanh, bánh hai bên, mái vải che, vài hộp hàng trên mâm. */
function xeDay() {
  const parts = [
    // Thùng xe sơn xanh tuổi đời, mặt mâm gỗ sáng
    part(new RoundedBoxGeometry(1.0, 0.5, 0.56, 1, 0.03), 0x2e6e4e, 0, 0.62, 0),
    part(new RoundedBoxGeometry(1.06, 0.045, 0.62, 1, 0.015), WOOD_L, 0, 0.89, 0),
    // Hai bánh xe: lốp đen, mo táp sáng
    part(facet(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12)), 0x33363a, -0.325, 0.23, 0, [0, 0, Math.PI / 2]),
    part(facet(new THREE.CylinderGeometry(0.08, 0.08, 0.055, 8)), 0xcfd4d8, -0.325, 0.23, 0, [0, 0, Math.PI / 2]),
    part(facet(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12)), 0x33363a, 0.325, 0.23, 0, [0, 0, Math.PI / 2]),
    part(facet(new THREE.CylinderGeometry(0.08, 0.08, 0.055, 8)), 0xcfd4d8, 0.325, 0.23, 0, [0, 0, Math.PI / 2]),
    // Chân chống trước + tay đẩy sau vươn lên
    part(facet(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)), STEEL, -0.42, 0.21, 0.18),
    part(facet(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)), STEEL, -0.42, 0.21, -0.18),
    part(new RoundedBoxGeometry(0.34, 0.035, 0.045, 1, 0.012), WOOD_D, 0.66, 0.98, 0.16, [0, 0, 0.25]),
    part(new RoundedBoxGeometry(0.34, 0.035, 0.045, 1, 0.012), WOOD_D, 0.66, 0.98, -0.16, [0, 0, 0.25]),
    // Mái vải căng trên bốn cột mảnh, nghiêng nhẹ về sau
    part(facet(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6)), STEEL, -0.44, 1.2, 0.24),
    part(facet(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 6)), STEEL, -0.44, 1.2, -0.24),
    part(facet(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6)), STEEL, 0.44, 1.14, 0.24),
    part(facet(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6)), STEEL, 0.44, 1.14, -0.24),
    part(new RoundedBoxGeometry(1.14, 0.02, 0.72, 1, 0.008), 0xf5e6c8, -0.02, 1.52, 0, [0, 0, 0.12]),
    // Hàng hoá trên mâm: hộp, lọ, nải chuối
    part(facet(new THREE.BoxGeometry(0.22, 0.16, 0.18)), 0xe84393, -0.3, 0.99, 0.1),
    part(facet(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 8)), 0xfdcb6e, -0.06, 1.01, -0.12),
    part(facet(new THREE.IcosahedronGeometry(0.09, 0)), 0x00b894, 0.2, 0.99, 0.12),
    part(facet(new THREE.IcosahedronGeometry(0.075, 0)), 0xe17055, 0.34, 0.97, -0.1),
  ];
  return parts;
}

/** Rào chắn công trình "đang sửa đường" (gđ184): thanh ngang vạch đỏ/kem + hai chân đỏ + đế.
 * Dựng ở mép vỉa hè trước hẻm khi hôm nay có sự kiện market `roadworks` (lượt khách giảm) —
 * tiếng "đường đang sửa" hiện ra bằng hình, không chỉ ở bản tin. */
function raoChan() {
  const RED = 0xd63031, RED_D = 0x9f2626, CREAM = 0xf0e9da;
  const W = 1.3, H = 0.17;
  const parts: THREE.BufferGeometry[] = [];
  // Thanh ngang vạch cảnh báo: 5 đoạn đỏ/kem đan kề nhau (không chồng → không z-fight khi gộp)
  const n = 5, gap = 0.002;
  const segW = (W - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + segW / 2 + i * (segW + gap);
    parts.push(part(new RoundedBoxGeometry(segW, H, 0.06, 1, 0.02), i % 2 ? RED : CREAM, x, 0.88, 0));
  }
  // Hai chân đỏ hơi loe xuống đế
  parts.push(part(facet(new THREE.CylinderGeometry(0.03, 0.034, 0.72, 6)), RED_D, -0.34, 0.36, 0));
  parts.push(part(facet(new THREE.CylinderGeometry(0.03, 0.034, 0.72, 6)), RED_D, 0.34, 0.36, 0));
  // Đế chống trượt ngang chân đế
  parts.push(part(new RoundedBoxGeometry(0.95, 0.05, 0.05, 1, 0.02), RED_D, 0, 0.05, 0));
  return parts;
}

/** Khóm tre: ba thân đốt xanh, mỗi thân vót lá dẹt vươn ra. */
function khomTre() {
  const parts: THREE.BufferGeometry[] = [];
  const culms = [
    { x: 0, z: 0, h: 1.15, lean: 0.10 },
    { x: 0.16, z: 0.07, h: 0.92, lean: -0.13 },
    { x: -0.13, z: 0.09, h: 0.78, lean: 0.16 },
  ];
  for (const c of culms) {
    const SEG = 5, segH = c.h / SEG;
    let off = 0;
    for (let i = 0; i < SEG; i++) {
      // Đốt tre kê sát nhau theo độ cong tích luỹ, không để hở thấy nền
      const col = i % 2 ? BAMBOO_D : BAMBOO;
      const y = segH * i + segH / 2;
      off += c.lean / SEG * (2 * (y / c.h));
      parts.push(part(facet(new THREE.CylinderGeometry(0.032 - i * 0.002, 0.034 - i * 0.002, segH * 1.04, 6)), col, c.x + off, y, c.z));
    }
    // Lá bám sát ngọn: cụm 3 lá tỏa ra từ đốt trên cùng
    const topX = c.x + off, topY = c.h + segH * 0.4;
    for (let l = 0; l < 3; l++) {
      const a = (l / 3) * Math.PI * 2 + c.x;
      parts.push(part(
        new RoundedBoxGeometry(0.24, 0.014, 0.06, 1, 0.03),
        l % 2 ? GREEN : GREEN_L,
        topX + Math.cos(a) * 0.11, topY + 0.02, c.z + Math.sin(a) * 0.11,
        [0, -a, 0.5],
      ));
    }
  }
  return parts;
}

async function exportGlb(name: string, parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error(`${name}: gộp mesh thất bại`);
  parts.forEach((p) => p.dispose());
  const tris = (merged.index ? merged.index.count : merged.getAttribute('position').count) / 3;

  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  const scene = new THREE.Scene();
  scene.add(mesh);

  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    new GLTFExporter().parse(scene, (r) => resolve(r as ArrayBuffer), reject, { binary: true });
  });

  const file = `${name}.glb`;
  await writeFile(path.join(OUT_DIR, file), Buffer.from(glb));
  return { file, tris, kb: +(glb.byteLength / 1024).toFixed(1) };
}

const PROPS: Record<string, () => THREE.BufferGeometry[]> = {
  chau_cay: chauCay,
  thung_go: thungGo,
  khom_tre: khomTre,
  bon_nuoc: bonNuoc,
  cho_nhua: choNhua,
  xe_day: xeDay,
  rao_chan: raoChan,
};

/** Trần triangle mỗi module: vượt là cảnh báo để kịp đơn giản hoá, đỡ phình to âm thầm. */
const TRI_CAP = 2500;

await mkdir(OUT_DIR, { recursive: true });
const modules: Record<string, { file: string; tris: number; kb: number }> = {};
for (const [name, build] of Object.entries(PROPS)) {
  modules[name] = await exportGlb(name, build());
  if (modules[name].tris > TRI_CAP) console.warn(`⚠ ${name}: ${modules[name].tris} tris > cap ${TRI_CAP}, nên đơn giản hoá`);
  console.log(`✓ ${name}.glb — ${modules[name].tris} tris, ${modules[name].kb}KB`);
}

const manifest = {
  updated: Date.now() / 1000,
  generator: 'scripts/build-kit-assets.ts (three GLTFExporter, vertex color, không texture)',
  modules,
};
await writeFile(path.join(OUT_DIR, 'kit-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nManifest: ${path.join(OUT_DIR, 'kit-manifest.json')}`);
