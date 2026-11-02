import * as THREE from 'three';
import type { AnimalKind } from '../data/garden';

/** Dựng mô hình 3D vật nuôi trang trại (gà, vịt, bò, heo, ngỗng, dê, gà Đông Tảo); tách từ farm.ts (GĐ986). */
export interface Beast {
  root: THREE.Group;
  head: THREE.Group | null;
  /** Chân có khớp ở hông để vung so le lúc đi. */
  legs: THREE.Object3D[];
  /** Pha bước chân (tăng theo tốc độ loài khi đang đi). */
  gait: number;
  target: THREE.Vector3;
  wait: number;
  peck: number;
}

/** Mỗi lần gọi tạo bộ vật liệu riêng và trả hàm dựng từng loài. */
export function createBeastMakers(): Record<AnimalKind, () => Beast> {
  const beastMats = {
    chickenWhite: new THREE.MeshStandardMaterial({ color: 0xf2ede2 }),
    chickenBrown: new THREE.MeshStandardMaterial({ color: 0xb5713a }),
    beak: new THREE.MeshStandardMaterial({ color: 0xe8a13c }),
    comb: new THREE.MeshStandardMaterial({ color: 0xd0342c }),
    leg: new THREE.MeshStandardMaterial({ color: 0xd8b13c }),
    duckWhite: new THREE.MeshStandardMaterial({ color: 0xf7f4ec }),
    gooseGrey: new THREE.MeshStandardMaterial({ color: 0xe9e7df }),
    beakOrange: new THREE.MeshStandardMaterial({ color: 0xe87b2a }),
    dongTaoDark: new THREE.MeshStandardMaterial({ color: 0x6e3b1f }),
    legGrey: new THREE.MeshStandardMaterial({ color: 0x9aa0a6 }),
    goatCream: new THREE.MeshStandardMaterial({ color: 0xe8e0d0 }),
    cowWhite: new THREE.MeshStandardMaterial({ color: 0xf0ece4 }),
    cowBlack: new THREE.MeshStandardMaterial({ color: 0x33302c }),
    pink: new THREE.MeshStandardMaterial({ color: 0xe8a8a0 }),
  };
  const box = (parent: THREE.Group, sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    parent.add(m);
    return m;
  };
  /** Chân vật nuôi: geometry dịch xuống nửa thân để xoay quanh KHỚP hông (y = đỉnh chân), bước chân nhìn thật hơn. */
  const legOf = (parent: THREE.Group, sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    geo.translate(0, -sy / 2, 0);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const makeChicken = (): Beast => {
    const root = new THREE.Group();
    const mat = Math.random() < 0.6 ? beastMats.chickenWhite : beastMats.chickenBrown;
    box(root, 0.3, 0.24, 0.42, 0, 0.28, 0, mat);
    const tail = box(root, 0.08, 0.16, 0.14, 0, 0.38, -0.24, mat);
    tail.rotation.x = -0.5;
    const head = new THREE.Group();
    box(head, 0.16, 0.16, 0.16, 0, 0.08, 0, mat, false);
    box(head, 0.04, 0.09, 0.1, 0, 0.2, 0, beastMats.comb, false);
    box(head, 0.06, 0.05, 0.12, 0, 0.06, 0.12, beastMats.beak, false);
    head.position.set(0, 0.38, 0.22);
    const legs = [-0.08, 0.08].map((x) => legOf(root, 0.04, 0.18, 0.04, x, 0.18, 0, beastMats.leg));
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 2, peck: 0 };
  };
  const makeDuck = (): Beast => {
    const root = new THREE.Group();
    box(root, 0.34, 0.22, 0.44, 0, 0.24, 0, beastMats.duckWhite);
    const tail = box(root, 0.12, 0.12, 0.12, 0, 0.32, -0.26, beastMats.duckWhite);
    tail.rotation.x = -0.7;
    const head = new THREE.Group();
    box(head, 0.14, 0.14, 0.16, 0, 0.07, 0, beastMats.duckWhite, false);
    // Mỏ vịt dẹt và rộng, vàng đậm hơn mỏ gà
    box(head, 0.1, 0.04, 0.14, 0, 0.05, 0.13, beastMats.beak, false);
    head.position.set(0, 0.36, 0.24);
    head.rotation.x = 0.15;
    const legs = [-0.09, 0.09].map((x) => legOf(root, 0.04, 0.14, 0.04, x, 0.14, 0, beastMats.beak));
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 2, peck: 0 };
  };
  const makeCow = (): Beast => {
    const root = new THREE.Group();
    box(root, 1.0, 0.55, 0.6, 0, 0.75, 0, beastMats.cowWhite);
    // Đốm đen loang lổ
    box(root, 0.26, 0.18, 0.62, -0.22, 0.82, 0, beastMats.cowBlack, false);
    box(root, 0.2, 0.14, 0.62, 0.25, 0.66, 0, beastMats.cowBlack, false);
    const head = new THREE.Group();
    box(head, 0.3, 0.28, 0.3, 0, 0, 0.05, beastMats.cowWhite, false);
    box(head, 0.24, 0.12, 0.1, 0, -0.06, 0.22, beastMats.pink, false); // mõm hồng
    // Sừng nhỏ hai bên
    box(head, 0.05, 0.12, 0.05, -0.16, 0.16, 0, beastMats.beak, false);
    box(head, 0.05, 0.12, 0.05, 0.16, 0.16, 0, beastMats.beak, false);
    head.position.set(0, 1.05, 0.42);
    const legs = [[-0.32, -0.2], [0.32, -0.2], [-0.32, 0.2], [0.32, 0.2]].map(([x, z]) => legOf(root, 0.1, 0.5, 0.1, x, 0.5, z, beastMats.cowWhite));
    const tail = box(root, 0.05, 0.4, 0.05, 0, 0.75, -0.34, beastMats.cowWhite);
    tail.rotation.x = 0.4;
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 3, peck: 0 };
  };
  const makePig = (): Beast => {
    const root = new THREE.Group();
    box(root, 0.62, 0.4, 0.9, 0, 0.36, 0, beastMats.pink);
    const head = new THREE.Group();
    box(head, 0.34, 0.3, 0.26, 0, 0, 0, beastMats.pink, false);
    // Mũi heo hồng đậm với 2 lỗ
    const snout = box(head, 0.18, 0.12, 0.06, 0, -0.03, 0.15, new THREE.MeshStandardMaterial({ color: 0xd98880 }), false);
    void snout;
    box(head, 0.03, 0.03, 0.02, -0.045, -0.03, 0.19, beastMats.cowBlack, false);
    box(head, 0.03, 0.03, 0.02, 0.045, -0.03, 0.19, beastMats.cowBlack, false);
    // Tai hé
    box(head, 0.08, 0.14, 0.04, -0.15, 0.17, 0, beastMats.pink, false);
    box(head, 0.08, 0.14, 0.04, 0.15, 0.17, 0, beastMats.pink, false);
    head.position.set(0, 0.44, 0.52);
    const curl = box(root, 0.05, 0.05, 0.05, 0, 0.52, -0.48, beastMats.pink, false);
    curl.rotation.x = 0.6;
    const legs = [[-0.18, -0.28], [0.18, -0.28], [-0.18, 0.28], [0.18, 0.28]].map(([x, z]) => legOf(root, 0.09, 0.2, 0.09, x, 0.2, z, beastMats.pink));
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 3, peck: 0 };
  };
  const makeGoose = (): Beast => {
    const root = new THREE.Group();
    box(root, 0.42, 0.28, 0.55, 0, 0.3, 0, beastMats.gooseGrey);
    const tail = box(root, 0.14, 0.14, 0.14, 0, 0.4, -0.32, beastMats.gooseGrey);
    tail.rotation.x = -0.7;
    const head = new THREE.Group();
    // Cổ ngỗng dài vươn cao hơn vịt
    box(head, 0.16, 0.16, 0.18, 0, 0.08, 0, beastMats.gooseGrey, false);
    box(head, 0.09, 0.05, 0.14, 0, 0.05, 0.14, beastMats.beakOrange, false);
    head.position.set(0, 0.52, 0.3);
    head.rotation.x = 0.2;
    const legs = [-0.11, 0.11].map((x) => legOf(root, 0.05, 0.16, 0.05, x, 0.16, 0, beastMats.beakOrange));
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 2, peck: 0 };
  };
  const makeGoat = (): Beast => {
    const root = new THREE.Group();
    box(root, 0.55, 0.35, 0.5, 0, 0.5, 0, beastMats.goatCream);
    const head = new THREE.Group();
    box(head, 0.18, 0.18, 0.2, 0, 0, 0.04, beastMats.goatCream, false);
    // Sừng dê cong ra sau
    for (const x of [-0.08, 0.08]) box(head, 0.035, 0.14, 0.035, x, 0.12, -0.04, beastMats.beak, false);
    // Râu cằm + mõm hồng
    box(head, 0.06, 0.1, 0.05, 0, -0.12, 0.1, beastMats.cowWhite, false);
    box(head, 0.12, 0.07, 0.06, 0, -0.04, 0.15, beastMats.pink, false);
    head.position.set(0, 0.72, 0.3);
    const legs = [[-0.17, -0.15], [0.17, -0.15], [-0.17, 0.15], [0.17, 0.15]].map(([x, z]) => legOf(root, 0.06, 0.34, 0.06, x, 0.34, z, beastMats.goatCream));
    const tail = box(root, 0.05, 0.14, 0.05, 0, 0.6, -0.28, beastMats.goatCream);
    tail.rotation.x = 0.5;
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 3, peck: 0 };
  };
  const makeDongTao = (): Beast => {
    const root = new THREE.Group();
    box(root, 0.44, 0.38, 0.58, 0, 0.5, 0, beastMats.dongTaoDark);
    const tail = box(root, 0.1, 0.2, 0.16, 0, 0.64, -0.32, beastMats.dongTaoDark);
    tail.rotation.x = -0.5;
    const head = new THREE.Group();
    box(head, 0.2, 0.2, 0.2, 0, 0.1, 0, beastMats.dongTaoDark, false);
    // Mào to đỏ như gà cháu giống quý
    box(head, 0.05, 0.12, 0.12, 0, 0.26, 0, beastMats.comb, false);
    box(head, 0.07, 0.06, 0.14, 0, 0.08, 0.14, beastMats.beak, false);
    head.position.set(0, 0.62, 0.3);
    // Chân sần cao xanh xám — đặc trưng gà Đông Tảo
    const legs = [-0.12, 0.12].map((x) => legOf(root, 0.07, 0.32, 0.07, x, 0.32, 0, beastMats.legGrey));
    root.add(head);
    return { root, head, legs, gait: Math.random() * 6, target: root.position.clone(), wait: Math.random() * 2.5, peck: 0 };
  };
  const makers: Record<AnimalKind, () => Beast> = {
    chicken: makeChicken, duck: makeDuck, goose: makeGoose, cow: makeCow, pig: makePig, goat: makeGoat, dong_tao: makeDongTao,
  };
  return makers;
}
