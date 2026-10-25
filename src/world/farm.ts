import * as THREE from 'three';

/**
 * Mảnh đất trang trại sau nhà (lùi hẳn khỏi mặt đường, giữa nhà số 12 và đất chừa cho siêu thị): đất cày có
 * hàng rào gỗ, cổng ở góc tây nam, lối đất chạy giữa nhà mình và nhà số 12 ra vỉa hè. Trong rào có 4 luống rau (khớp PLOT_COUNT của data/garden) và chuồng gà có sân thả.
 * Chỉ dựng hình; tương tác ở main.tsx, trạng thái ở core/slices/garden.
 */
export const FARM_CENTER = new THREE.Vector3(-12.5, 0, -15.5);
const W = 10, D = 9;

export function createFarm() {
  const group = new THREE.Group();
  group.position.copy(FARM_CENTER);
  const boxes: THREE.Box3[] = [];
  const block = (x: number, z: number, sx: number, sz: number, h = 1) =>
    boxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(FARM_CENTER.x + x, h / 2, FARM_CENTER.z + z), new THREE.Vector3(sx, h, sz)));

  // Nền đất trong rào
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x8a6b45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.015;
  ground.receiveShadow = true;
  group.add(ground);

  // Lối đất từ cổng chạy thẳng ra vỉa hè (x = -16.5, giữa tường tây nhà mình và nhà số 12)
  const GATE_X = -4;
  const pathLen = 1.5 - (FARM_CENTER.z + D / 2);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, pathLen), new THREE.MeshStandardMaterial({ color: 0xa88a5e }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(GATE_X, 0.014, D / 2 + pathLen / 2);
  path.receiveShadow = true;
  group.add(path);

  // Hàng rào gỗ quanh mảnh đất, chừa cổng 2 m ở mép nam
  const wood = new THREE.MeshStandardMaterial({ color: 0x9c6b3c });
  const fence = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const seg = new THREE.Group();
    for (const y of [0.35, 0.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.06), wood);
      rail.position.y = y;
      rail.castShadow = true;
      seg.add(rail);
    }
    for (let t = 0; t <= len + 0.01; t += 1.25) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood);
      post.position.set(t - len / 2, 0.45, 0);
      post.castShadow = true;
      seg.add(post);
    }
    seg.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(seg);
    block((x1 + x2) / 2, (z1 + z2) / 2, Math.max(0.15, Math.abs(x2 - x1)), Math.max(0.15, Math.abs(z2 - z1)));
  };
  const hw = W / 2, hd = D / 2;
  fence(-hw, -hd, hw, -hd);
  fence(-hw, hd, GATE_X - 1, hd);
  fence(GATE_X + 1, hd, hw, hd);
  fence(-hw, -hd, -hw, hd);
  fence(hw, -hd, hw, hd);

  // 4 luống rau 2×2 có rãnh, thấp nên đi lại giữa các luống được
  const soil = new THREE.MeshStandardMaterial({ color: 0x5a3a1f });
  const ridge = new THREE.MeshStandardMaterial({ color: 0x4a2f18 });
  for (let i = 0; i < 4; i++) {
    const bed = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.6), soil);
    base.position.y = 0.06;
    base.receiveShadow = true;
    bed.add(base);
    for (let r = -1; r <= 1; r++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.22), ridge);
      row.position.set(0, 0.15, r * 0.5);
      bed.add(row);
    }
    bed.position.set(-2.8 + (i % 2) * 3.4, 0, -2.2 + Math.floor(i / 2) * 2.6);
    group.add(bed);
  }

  // Chuồng gà góc tây bắc: nhà gỗ mái đỏ + sân thả rào lưới thấp
  const coop = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.2), new THREE.MeshStandardMaterial({ color: 0xa0622d }));
  body.position.y = 0.6;
  body.castShadow = true;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.1), wood);
  legs.position.y = 0.08;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.6, 4), new THREE.MeshStandardMaterial({ color: 0xb03a2e }));
  roof.position.y = 1.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x2b1a0e }));
  hole.position.set(0, 0.45, 0.61);
  coop.add(body, legs, roof, hole);
  coop.position.set(3.2, 0, -3);
  group.add(coop);
  block(3.2, -3, 1.6, 1.2, 1.6);
  const net = new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5 });
  for (const [x, z, sx, sz] of [[2.2, -0.8, 0.04, 2.6], [4.2, -0.8, 0.04, 2.6], [3.2, 0.5, 2, 0.04]] as const) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.5, sz), net);
    m.position.set(x, 0.25, z);
    group.add(m);
    block(x, z, Math.max(0.15, sx), Math.max(0.15, sz), 0.5);
  }

  // Biển gỗ cạnh cổng
  const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), wood);
  signPost.position.set(GATE_X + 1.4, 0.6, hd + 0.4);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0xc89b5c }));
  board.position.set(GATE_X + 1.4, 1.15, hd + 0.45);
  group.add(signPost, board);

  return { group, boxes, spot: new THREE.Vector3(FARM_CENTER.x + 1.6, 0, FARM_CENTER.z + 0.2) };
}
