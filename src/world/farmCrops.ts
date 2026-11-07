import * as THREE from 'three';
import { riceGeometry, riceMaterial } from '../render/riceModel';

/** Mô hình 3D cây trồng trên luống theo giống và giai đoạn lớn; tách từ farm.ts (GĐ987). */

/** Trả hàm dựng cây cho một luống: (giống, giai đoạn 0..3) → nhóm mesh đã co theo giai đoạn. Hình/material dùng chung trong một lần tạo. */
export function createCropBuilder(): (cropId: string, stage: number) => THREE.Group {
  interface CropLook {
    kind: 'leaf' | 'corn' | 'cane' | 'banana' | 'tree' | 'rice';
    canopy: number;
    trunk?: number;
    fruit?: number;
    fruitSize?: number;
    fruitN?: number;
  }
  /** Bề ngoài từng giống: rau lá / bắp / mía / chuối / cây ăn trái (tán + màu trái chín). */
  const CROP_LOOK: Record<string, CropLook> = {
    rau_cai: { kind: 'leaf', canopy: 0x3f9b3f },
    lua: { kind: 'rice', canopy: 0x5fae45 },
    bap: { kind: 'corn', canopy: 0x4f9e46, fruit: 0xe8c34a },
    mia: { kind: 'cane', canopy: 0x67a24a },
    traicay: { kind: 'tree', canopy: 0x3d8c3d, trunk: 0x7a5230, fruit: 0xd94f3d },
    traicay_nam: { kind: 'tree', canopy: 0x2f7d33, trunk: 0x6e4a28, fruit: 0xe8862c, fruitN: 8 },
    chuoi: { kind: 'banana', canopy: 0x3f9c3a, fruit: 0xf0d85a },
    oi: { kind: 'tree', canopy: 0x357f39, fruit: 0xe8a0b8, fruitN: 6 },
    xoai: { kind: 'tree', canopy: 0x2e7d36, fruit: 0xf0b02e, fruitSize: 0.06, fruitN: 6 },
    cam: { kind: 'tree', canopy: 0x2f8a3a, fruit: 0xf08c1e, fruitN: 7 },
    // GĐ1088 — Chanh dây: dáng cây ăn trái, quả tím (dáng tán như cam/ổi)
    chanhday: { kind: 'tree', canopy: 0x4da94f, fruit: 0x8e6f9f, fruitN: 6 },
    vai: { kind: 'tree', canopy: 0x3a8f42, fruit: 0xd23b3b, fruitSize: 0.045, fruitN: 9 },
    nhan: { kind: 'tree', canopy: 0x4a9950, fruit: 0xd8b64a, fruitSize: 0.045, fruitN: 9 },
    // GĐ1651 — Thơm: bụi lá thấp
    thom: { kind: 'leaf', canopy: 0x5a8f3a },
    mit: { kind: 'tree', canopy: 0x3f8f45, fruit: 0x9fb545, fruitSize: 0.1, fruitN: 3 },
    buoi: { kind: 'tree', canopy: 0x3c8c3f, fruit: 0xd9e06a, fruitSize: 0.08, fruitN: 4 },
  };

  // Hình đơn vị dùng chung + material cache theo màu — 12 luống đầy cây vẫn nhẹ
  const plantSphere = new THREE.SphereGeometry(1, 8, 6);
  const plantCyl = new THREE.CylinderGeometry(1, 1, 1, 6);
  const plantCone = new THREE.ConeGeometry(1, 1, 6);
  const cropMats = new Map<number, THREE.MeshStandardMaterial>();
  const cropMat = (color: number) => {
    let m = cropMats.get(color);
    if (!m) cropMats.set(color, (m = new THREE.MeshStandardMaterial({ color })));
    return m;
  };
  const add = (parent: THREE.Group, geo: THREE.BufferGeometry, color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, cropMat(color));
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  const makeLeafy = (look: CropLook): THREE.Group => {
    const g = new THREE.Group();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = -0.8 + c * 0.8, z = -0.35 + r * 0.7;
      add(g, plantSphere, look.canopy, 0.16, 0.11, 0.16, x, 0.08, z);
      add(g, plantSphere, 0x66b84f, 0.09, 0.07, 0.09, x, 0.15, z);
    }
    return g;
  };
  const makeCorn = (look: CropLook, ripe: boolean): THREE.Group => {
    const g = new THREE.Group();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = -0.8 + c * 0.8, z = -0.35 + r * 0.7;
      add(g, plantCyl, 0x5aa348, 0.025, 0.75, 0.025, x, 0.38, z);
      const leaf = add(g, plantCone, look.canopy, 0.07, 0.42, 0.02, x + 0.06, 0.35, z);
      leaf.rotation.z = -0.7;
      if (ripe) add(g, plantSphere, look.fruit!, 0.05, 0.11, 0.05, x - 0.06, 0.5, z);
    }
    return g;
  };
  /** Lúa: một mesh gộp cả luống; giai đoạn quyết định màu (xanh → trổ bông → vàng chín). */
  const makeRice = (stage: number): THREE.Group => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(riceGeometry(stage === 3 ? 'ripe' : stage === 2 ? 'heading' : 'young'), riceMaterial()));
    return g;
  };
  const makeCane = (look: CropLook): THREE.Group => {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const x = -0.55 + (i % 4) * 0.36 + (i > 3 ? 0.16 : 0), z = i > 3 ? 0.28 : -0.28;
      add(g, plantCyl, look.canopy, 0.035, 1.25, 0.035, x, 0.62, z);
      const leaf = add(g, plantCone, 0x7cb455, 0.06, 0.5, 0.015, x, 0.9, z);
      leaf.rotation.z = i % 2 ? 0.8 : -0.8;
    }
    return g;
  };
  const makeBanana = (look: CropLook, ripe: boolean): THREE.Group => {
    const g = new THREE.Group();
    add(g, plantCyl, 0x8fb56a, 0.09, 0.95, 0.09, 0, 0.48, 0); // thân giả chuối
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = add(g, plantCone, look.canopy, 0.09, 0.95, 0.02, Math.cos(a) * 0.32, 1.05, Math.sin(a) * 0.32);
      leaf.rotation.z = Math.cos(a);
      leaf.rotation.x = -Math.sin(a);
    }
    if (ripe) for (let i = 0; i < 5; i++) add(g, plantSphere, look.fruit!, 0.035, 0.1, 0.035, -0.07 + (i % 2) * 0.05, 0.62 - Math.floor(i / 2) * 0.12, 0.1);
    return g;
  };
  const makeTree = (look: CropLook, ripe: boolean): THREE.Group => {
    const g = new THREE.Group();
    add(g, plantCyl, look.trunk ?? 0x7a5230, 0.07, 0.6, 0.07, 0, 0.3, 0);
    add(g, plantSphere, look.canopy, 0.48, 0.42, 0.48, 0, 0.78, 0);
    add(g, plantSphere, look.canopy, 0.3, 0.26, 0.3, 0.26, 0.95, 0.12);
    add(g, plantSphere, look.canopy, 0.27, 0.24, 0.27, -0.25, 0.9, -0.14);
    if (ripe && look.fruit) {
      const n = look.fruitN ?? 7;
      const size = look.fruitSize ?? 0.05;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.5;
        const r = 0.34 + (i % 2) * 0.08;
        add(g, plantSphere, look.fruit, size, size, size, Math.cos(a) * r, 0.68 + (i % 3) * 0.13, Math.sin(a) * r);
      }
    }
    return g;
  };

  const herbScale = [0.3, 0.55, 0.8, 1];
  const treeScale = [0.35, 0.6, 0.85, 1];

  return (cropId, stage) => {
    const look = CROP_LOOK[cropId] ?? CROP_LOOK.traicay;
    const ripe = stage === 3;
    let g: THREE.Group;
    if (look.kind === 'leaf') g = makeLeafy(look);
    else if (look.kind === 'corn') g = makeCorn(look, ripe);
    else if (look.kind === 'rice') g = makeRice(stage);
    else if (look.kind === 'cane') g = makeCane(look);
    else if (look.kind === 'banana') g = makeBanana(look, ripe);
    else g = makeTree(look, ripe);
    g.scale.setScalar((look.kind === 'tree' || look.kind === 'banana' ? treeScale : herbScale)[stage]);
    return g;
  };
}
