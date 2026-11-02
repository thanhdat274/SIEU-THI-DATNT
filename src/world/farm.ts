import * as THREE from 'three';
import { ANIMAL_ORDER, CROPS, landPlots, type AnimalKind, type Plot } from '../data/garden';
import { createBeastMakers, type Beast } from './farmBeasts';
import { createCropBuilder } from './farmCrops';

/**
 * Trang trại đầu ngõ: mảnh đất có rào nằm nam con đường thứ hai (từ tiệm đi bằng nút 🚜).
 * Bắt đầu nhỏ — vài luống rau, kho nông cụ, giếng nước và chuồng gà — mở rộng dần theo bậc đất
 * trong data/garden (LAND_TIERS): thêm luống, thùng cám sỉ, chuồng vịt/ngỗng, bò, heo, dê, gà Đông Tảo.
 * Vật nuôi 3D đi rong trong sân riêng, mổ cám, tối về chuồng; công trình trại (hệ tưới, nhà lưới,
 * bãi thả, bù nhìn mới) dựng sẵn và hiện dần theo setBuildings; chỉ cập nhật khi chủ ở gần.
 * Chỉ dựng hình; tương tác ở main.tsx, trạng thái ở core/slices/garden.
 */
export const FARM_CENTER = new THREE.Vector3(24, 0, -70);
/** Mảnh đất (đủ cho bậc mở rộng cuối): x 11..37, z -80..-60, cổng quay lên đường thứ hai. */
const W = 26, D = 20;
/** Sân thả theo loài (toạ độ trong group). */
const PENS: Record<AnimalKind, { x1: number; z1: number; x2: number; z2: number; home: THREE.Vector3; speed: number }> = {
  chicken: { x1: 5.2, z1: 1.2, x2: 10.8, z2: 6.8, home: new THREE.Vector3(9.05, 0, 3.0), speed: 0.55 },
  duck: { x1: -11, z1: 3, x2: -7.6, z2: 7.2, home: new THREE.Vector3(-9.6, 0, 6.6), speed: 0.4 },
  cow: { x1: -2, z1: 2.6, x2: 4, z2: 6.6, home: new THREE.Vector3(0.5, 0, 7.0), speed: 0.3 },
  pig: { x1: 7.6, z1: -7, x2: 11.9, z2: -4.6, home: new THREE.Vector3(9.8, 0, -7.2), speed: 0.35 },
  goose: { x1: -11, z1: -9.2, x2: -6.8, z2: -6.4, home: new THREE.Vector3(-9.6, 0, -8.6), speed: 0.45 },
  goat: { x1: -5.6, z1: -9.2, x2: -1.4, z2: -6.4, home: new THREE.Vector3(-3.6, 0, -8.6), speed: 0.42 },
  dong_tao: { x1: -0.4, z1: -9.2, x2: 3.8, z2: -6.4, home: new THREE.Vector3(1.8, 0, -8.6), speed: 0.32 },
};
/** Chỗ đứng tương tác cạnh cổng và cạnh giếng nước. */
const SPOT = new THREE.Vector3(FARM_CENTER.x - 6, 0, FARM_CENTER.z + 6.5);
const WELL_SPOT = new THREE.Vector3(FARM_CENTER.x - 4, 0, FARM_CENTER.z + 4.2);
const GATE_X = -6;

export function createFarm() {
  const group = new THREE.Group();
  group.position.copy(FARM_CENTER);
  const boxes: THREE.Box3[] = [];
  const block = (x: number, z: number, sx: number, sz: number, h = 1) =>
    boxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(FARM_CENTER.x + x, h / 2, FARM_CENTER.z + z), new THREE.Vector3(sx, h, sz)));

  const wood = new THREE.MeshStandardMaterial({ color: 0x9c6b3c });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x7a5230 });
  // Màu đất luống: sẫm lại khi đã tưới hôm nay (setPlots chỉnh theo wateredDay)
  const SOIL_DRY = 0x74512e;
  const SOIL_WET = 0x3d240d;

  // Nền đất trong rào
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x8a6b45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.015;
  ground.receiveShadow = true;
  group.add(ground);

  // Lối đất từ cổng chạy lên nối con đường thứ hai
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3), new THREE.MeshStandardMaterial({ color: 0xa88a5e }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(GATE_X, 0.014, D / 2 + 1.5);
  path.receiveShadow = true;
  group.add(path);

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
  // Hàng rào quanh mảnh đất, chừa cổng 2 m ở mép bắc (nhìn lên đường thứ hai)
  const hw = W / 2, hd = D / 2;
  fence(-hw, -hd, hw, -hd);
  fence(-hw, hd, GATE_X - 1, hd);
  fence(GATE_X + 1, hd, hw, hd);
  fence(-hw, -hd, -hw, hd);
  fence(hw, -hd, hw, hd);

  // Cổng vòm gỗ hai trụ + thanh ngang, biển chữ treo giữa nhìn ra đường
  for (const dx of [-1.5, 1.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), darkWood);
    post.position.set(GATE_X + dx, 1.2, hd);
    post.castShadow = true;
    group.add(post);
    block(GATE_X + dx, hd, 0.2, 0.2, 2.4);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.14), darkWood);
  beam.position.set(GATE_X, 2.35, hd);
  beam.castShadow = true;
  group.add(beam);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.62),
    new THREE.MeshStandardMaterial({ map: signTexture('TRẠNG TRẠI ĐẦU NGÕ'), emissive: 0xffffff, emissiveMap: signTexture('TRẠNG TRẠI ĐẦU NGÕ'), emissiveIntensity: 0.2 }),
  );
  sign.position.set(GATE_X, 1.95, hd + 0.08);
  // Mặt sau là ván gỗ trơn — đừng nhìn chữ bị mirror từ trong trại
  const signBack = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), darkWood);
  signBack.position.set(GATE_X, 1.95, hd + 0.02);
  signBack.rotation.y = Math.PI;
  group.add(sign, signBack);

  // Đất luống đổi màu theo tưới (setPlots chỉnh màu theo wateredDay)
  const makeBed = () => {
    const soil = new THREE.MeshStandardMaterial({ color: SOIL_DRY });
    const ridge = new THREE.MeshStandardMaterial({ color: 0x4a2f18 });
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
    return { bed, soil };
  };
  // Luống xếp hai hàng × sáu cột, bày dần từ tây sang đông theo bậc mở rộng
  const bedPos = (i: number) => ({ x: -11 + Math.floor(i / 2) * 3.4, z: i % 2 ? -5.9 : -2.5 });
  const bedBases: { soil: THREE.MeshStandardMaterial }[] = [];
  for (let i = 0; i < 4; i++) {
    const { bed, soil } = makeBed();
    const p = bedPos(i);
    bed.position.set(p.x, 0, p.z);
    group.add(bed);
    bedBases.push({ soil });
  }

  // Bù nhìn giữ ruộng giữa các luống: cột gỗ, tay ái, đầu rá, mũ nón
  const scare = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), wood);
  pole.position.y = 0.75;
  const arms = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), wood);
  arms.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd9a066 }));
  head.position.y = 1.5;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xc9a227 }));
  hat.position.y = 1.68;
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.2), new THREE.MeshStandardMaterial({ color: 0xb04a3a }));
  shirt.position.set(0, 1.02, 0);
  scare.add(pole, arms, head, hat, shirt);
  scare.position.set(-5.6, 0, -4.2);
  scare.rotation.y = 0.5;
  group.add(scare);

  // Kho nông cụ: nhà gỗ mái dốc, cửa quay vào trại, mấy bó rơm trước cửa
  const shed = new THREE.Group();
  const shedWall = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xb98a4f }));
  shedWall.position.y = 0.9;
  shedWall.castShadow = true;
  const shedDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d3f22 }));
  shedDoor.position.set(0, 0.65, -1.11);
  const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 2.9), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
  shedRoof.position.y = 1.95;
  shedRoof.rotation.x = -0.18;
  shed.add(shedWall, shedDoor, shedRoof);
  for (const [x, z] of [[-0.9, -1.55], [-1.5, -1.85]] as const) {
    const hay = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0xd9b44a }));
    hay.position.set(x, 0.23, z);
    hay.rotation.y = Math.random() * 0.6;
    hay.castShadow = true;
    shed.add(hay);
  }
  shed.position.set(-hw + 1.8, 0, hd - 1.5);
  group.add(shed);
  block(-hw + 1.8, hd - 1.5, 3, 2.2, 1.8);

  // Giếng nước kiểu quê thật: vành xi măng vuông, mái ngói nhị dốc trên hai trụ gỗ,
  // tời quay có tay quay, dây treo gầu nước — chỗ tưới luống [T]
  const well = new THREE.Group();
  const cement = new THREE.MeshStandardMaterial({ color: 0x9a9a92 });
  const wellWater = new THREE.MeshStandardMaterial({ color: 0x2c5d80, roughness: 0.15 });
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xb5543d });
  for (const [x, z, sx, sz] of [[0, 0.66, 1.5, 0.18], [0, -0.66, 1.5, 0.18], [0.66, 0, 0.18, 1.14], [-0.66, 0, 0.18, 1.14]] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.5, sz), cement);
    wall.position.set(x, 0.25, z);
    wall.castShadow = true;
    well.add(wall);
  }
  for (const x of [-0.47, 0.47]) {
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 1.5), cement);
    lid.position.set(x, 0.53, 0);
    lid.castShadow = true;
    well.add(lid);
  }
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 1.14), wellWater);
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.28;
  well.add(hole);
  for (const x of [-0.47, 0.47]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), darkWood);
    p.position.set(x, 1.05, 0);
    p.castShadow = true;
    well.add(p);
  }
  const wellRoofL = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.0), terracotta);
  wellRoofL.position.set(0, 2.28, -0.42);
  wellRoofL.rotation.x = 0.5;
  wellRoofL.castShadow = true;
  const wellRoofR = wellRoofL.clone();
  wellRoofR.position.z = 0.42;
  wellRoofR.rotation.x = -0.5;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.09, 0.12), darkWood);
  ridge.position.y = 2.52;
  well.add(wellRoofL, wellRoofR, ridge);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), darkWood);
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 1.75;
  const crank = new THREE.Group();
  const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), darkWood);
  crankArm.position.x = 0.17;
  const crankGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), darkWood);
  crankGrip.position.set(0.34, -0.15, 0);
  crank.add(crankArm, crankGrip);
  crank.position.set(0.65, 1.75, 0);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 6), new THREE.MeshStandardMaterial({ color: 0xe8dcc0 }));
  rope.position.y = 1.38;
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x8a6b45 }));
  bucket.position.y = 0.95;
  const bucketRim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 12), darkWood);
  bucketRim.rotation.x = Math.PI / 2;
  bucketRim.position.y = 1.06;
  well.add(axle, crank, rope, bucket, bucketRim);
  well.position.set(-4, 0, 4.2);
  group.add(well);
  block(-4, 4.2, 1.6, 1.6, 2.5);

  // Chuồng gà sàn cao kiểu trại thật: chân đỡ, ván tường, cửa + cầu thang dốc, ổ đẻ lồi bên hông
  const coop = new THREE.Group();
  const coopWood = new THREE.MeshStandardMaterial({ color: 0xa0622d });
  for (const [x, z] of [[-0.9, -0.6], [0.9, -0.6], [-0.9, 0.6], [0.9, 0.6]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), darkWood);
    leg.position.set(x, 0.35, z);
    coop.add(leg);
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.9), darkWood);
  floor.position.y = 0.76;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.7), coopWood);
  body.position.y = 1.37;
  body.castShadow = true;
  for (const y of [1.1, 1.37, 1.64]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.035, 1.72), darkWood);
    plank.position.y = y;
    coop.add(plank);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.03), new THREE.MeshStandardMaterial({ color: 0x2b1a0e }));
  door.position.set(-0.45, 1.12, 0.86);
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.03), new THREE.MeshStandardMaterial({ color: 0xf5e6c8, emissive: 0xf5e6c8, emissiveIntensity: 0.15 }));
  window_.position.set(0.45, 1.3, 0.86);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 1.15), darkWood);
  ramp.position.set(-0.45, 0.42, 1.4);
  ramp.rotation.x = -0.55;
  const nest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), coopWood);
  nest.position.set(1.4, 1.15, -0.3);
  nest.castShadow = true;
  const nestHole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0x2b1a0e }));
  nestHole.rotation.z = Math.PI / 2;
  nestHole.position.set(1.76, 1.15, -0.3);
  const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.09, 1.25), new THREE.MeshStandardMaterial({ color: 0xb03a2e }));
  roofL.position.set(0, 2.12, -0.5);
  roofL.rotation.x = 0.45;
  roofL.castShadow = true;
  const roofR = roofL.clone();
  roofR.position.z = 0.5;
  roofR.rotation.x = -0.45;
  coop.add(floor, body, door, window_, ramp, nest, nestHole, roofL, roofR);
  coop.position.set(8.6, 0, 4.4);
  coop.rotation.y = Math.PI;
  group.add(coop);
  block(8.6, 4.4, 2.9, 2, 2.1);

  // Máng ăn dài trong sân gà + can nước cạnh chuồng
  const trough = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.32), wood);
  tray.position.y = 0.12;
  const feed = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.22), new THREE.MeshStandardMaterial({ color: 0xc9a86a }));
  feed.position.y = 0.2;
  trough.add(tray, feed);
  trough.position.set(7.2, 0, 6.2);
  group.add(trough);
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0x5e8aa0 }));
  jug.position.set(9.9, 0.21, 6.2);
  jug.castShadow = true;
  group.add(jug);

  const net = new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5 });
  const penNet = (parent: THREE.Object3D, x1: number, z1: number, x2: number, z2: number) => {
    const segs: [number, number, number, number][] = [
      [x1, (z1 + z2) / 2, 0.04, z2 - z1],
      [x2, (z1 + z2) / 2, 0.04, z2 - z1],
      [(x1 + x2) / 2, z1, x2 - x1, 0.04],
      [(x1 + x2) / 2, z2, x2 - x1, 0.04],
    ];
    for (const [x, z, sx, sz] of segs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.5, sz), net);
      m.position.set(x, 0.25, z);
      parent.add(m);
      if (parent === group) block(x, z, Math.max(0.15, sx), Math.max(0.15, sz), 0.5);
    }
  };
  penNet(group, PENS.chicken.x1, PENS.chicken.z1, PENS.chicken.x2, PENS.chicken.z2);

  // Nhà vịt nhỏ cạnh thau nước (vịt thích nghịch nước)
  const duckHouse = new THREE.Group();
  const dBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.1), new THREE.MeshStandardMaterial({ color: 0x9c7a4f }));
  dBody.position.y = 0.4;
  dBody.castShadow = true;
  const dDoor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.03), new THREE.MeshStandardMaterial({ color: 0x2b1a0e }));
  dDoor.position.set(0, 0.22, 0.56);
  const dRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.4), new THREE.MeshStandardMaterial({ color: 0x6b8f4e }));
  dRoof.position.y = 0.92;
  dRoof.rotation.x = 0.12;
  duckHouse.add(dBody, dDoor, dRoof);
  duckHouse.position.set(-9.4, 0, 7.6);
  group.add(duckHouse);
  block(-9.4, 7.6, 1.4, 1.2, 1);
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x6a8fa0 }));
  tub.position.set(-8.4, 0.11, 4.4);
  tub.castShadow = true;
  group.add(tub);
  const tubWater = new THREE.Mesh(new THREE.CircleGeometry(0.38, 12), wellWater);
  tubWater.rotation.x = -Math.PI / 2;
  tubWater.position.set(-8.4, 0.23, 4.4);
  group.add(tubWater);

  // Chuồng bò: nhà gỗ rộng mái đỏ + máng cỏ dài trước cửa
  const barn = new THREE.Group();
  const bWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.9, 2), new THREE.MeshStandardMaterial({ color: 0xa9784a }));
  bWall.position.y = 0.95;
  bWall.castShadow = true;
  const bDoor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x5d3f22 }));
  bDoor.position.set(0, 0.7, -1.01);
  const bRoofL = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.09, 1.5), new THREE.MeshStandardMaterial({ color: 0x9c3b2e }));
  bRoofL.position.set(0, 2.2, -0.62);
  bRoofL.rotation.x = 0.4;
  bRoofL.castShadow = true;
  const bRoofR = bRoofL.clone();
  bRoofR.position.z = 0.62;
  bRoofR.rotation.x = -0.4;
  barn.add(bWall, bDoor, bRoofL, bRoofR);
  barn.position.set(0.5, 0, 8.4);
  group.add(barn);
  block(0.5, 8.4, 4.4, 2.2, 2);
  const crib = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.5), wood);
  crib.position.set(0.5, 0.15, 6.9);
  crib.castShadow = true;
  group.add(crib);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.36), new THREE.MeshStandardMaterial({ color: 0x5fa84e }));
  grass.position.set(0.5, 0.34, 6.9);
  group.add(grass);

  // Chuồng heo: nhà gạch mái tôn + bãi đất (heo thích lội đất)
  const sty = new THREE.Group();
  const brick = new THREE.MeshStandardMaterial({ color: 0xa8563e });
  const sWall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 2), brick);
  sWall.position.y = 0.65;
  sWall.castShadow = true;
  const sDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.04), new THREE.MeshStandardMaterial({ color: 0x3a2618 }));
  sDoor.position.set(0, 0.3, 1.01);
  const sRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 2.4), new THREE.MeshStandardMaterial({ color: 0x7f8c99 }));
  sRoof.position.y = 1.48;
  sRoof.rotation.x = 0.1;
  sty.add(sWall, sDoor, sRoof);
  sty.position.set(9.8, 0, -8.6);
  group.add(sty);
  block(9.8, -8.6, 3, 2.2, 1.4);
  const mud = new THREE.Mesh(new THREE.PlaneGeometry(PENS.pig.x2 - PENS.pig.x1 + 0.6, PENS.pig.z2 - PENS.pig.z1 + 0.6), new THREE.MeshStandardMaterial({ color: 0x74553a }));
  mud.rotation.x = -Math.PI / 2;
  mud.position.set((PENS.pig.x1 + PENS.pig.x2) / 2, 0.02, (PENS.pig.z1 + PENS.pig.z2) / 2);
  mud.receiveShadow = true;
  group.add(mud);

  // Chuồng ngỗng cạnh thau nước lớn (ngỗng thích ngâm mình) — dãy nam trại
  const gooseHouse = new THREE.Group();
  const gBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0xa8926b }));
  gBody.position.y = 0.45;
  gBody.castShadow = true;
  const gDoor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.03), new THREE.MeshStandardMaterial({ color: 0x2b1a0e }));
  gDoor.position.set(0, 0.28, 0.61);
  const gRoof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.5), new THREE.MeshStandardMaterial({ color: 0x8a6a3e }));
  gRoof.position.y = 1.0;
  gRoof.rotation.x = 0.12;
  gooseHouse.add(gBody, gDoor, gRoof);
  gooseHouse.position.set(-9.4, 0, -9.3);
  group.add(gooseHouse);
  block(-9.4, -9.3, 1.6, 1.3, 1);
  const gooseTub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.26, 12), new THREE.MeshStandardMaterial({ color: 0x6a8fa0 }));
  gooseTub.position.set(-11.4, 0.13, -7.2);
  gooseTub.castShadow = true;
  group.add(gooseTub);
  const gooseWater = new THREE.Mesh(new THREE.CircleGeometry(0.47, 12), wellWater);
  gooseWater.rotation.x = -Math.PI / 2;
  gooseWater.position.set(-11.4, 0.27, -7.2);
  group.add(gooseWater);

  // Chuồng dê: nhà gỗ nhỏ hai mái như chuồng bò thu nhỏ
  const goatShed = new THREE.Group();
  const gtWall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 1.5), new THREE.MeshStandardMaterial({ color: 0xb08a58 }));
  gtWall.position.y = 0.65;
  gtWall.castShadow = true;
  const gtDoor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.85, 0.04), new THREE.MeshStandardMaterial({ color: 0x5d3f22 }));
  gtDoor.position.set(0, 0.42, 0.76);
  const gtRoofL = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.07, 1.05), new THREE.MeshStandardMaterial({ color: 0x9c3b2e }));
  gtRoofL.position.set(0, 1.48, -0.42);
  gtRoofL.rotation.x = 0.42;
  gtRoofL.castShadow = true;
  const gtRoofR = gtRoofL.clone();
  gtRoofR.position.z = 0.42;
  gtRoofR.rotation.x = -0.42;
  goatShed.add(gtWall, gtDoor, gtRoofL, gtRoofR);
  goatShed.position.set(-3.5, 0, -9.2);
  group.add(goatShed);
  block(-3.5, -9.2, 2.5, 1.6, 1.4);
  // Khúc cây gỗ ngọn cỏ cho dê bứt trước cửa
  for (const [x, z] of [[-5.0, -8.4], [-2.1, -8.2]] as const) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), darkWood);
    log.rotation.z = Math.PI / 2;
    log.position.set(x, 0.1, z);
    log.castShadow = true;
    group.add(log);
  }

  // Chuồng gà Đông Tảo: kiểu chuồng gà cao chân to bản (giống quý chân sần to)
  const dtCoop = new THREE.Group();
  const dtWood = new THREE.MeshStandardMaterial({ color: 0x8a5426 });
  for (const [x, z] of [[-1.0, -0.6], [1.0, -0.6], [-1.0, 0.6], [1.0, 0.6]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), darkWood);
    leg.position.set(x, 0.45, z);
    dtCoop.add(leg);
  }
  const dtFloor = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 2.0), darkWood);
  dtFloor.position.y = 0.95;
  const dtBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 1.8), dtWood);
  dtBody.position.y = 1.6;
  dtBody.castShadow = true;
  const dtDoor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.03), new THREE.MeshStandardMaterial({ color: 0x2b1a0e }));
  dtDoor.position.set(-0.5, 1.32, 0.91);
  const dtRamp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 1.4), darkWood);
  dtRamp.position.set(-0.5, 0.5, 1.55);
  dtRamp.rotation.x = -0.5;
  const dtRoofL = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.09, 1.35), new THREE.MeshStandardMaterial({ color: 0x7a2f26 }));
  dtRoofL.position.set(0, 2.42, -0.55);
  dtRoofL.rotation.x = 0.45;
  dtRoofL.castShadow = true;
  const dtRoofR = dtRoofL.clone();
  dtRoofR.position.z = 0.55;
  dtRoofR.rotation.x = -0.45;
  dtCoop.add(dtFloor, dtBody, dtDoor, dtRamp, dtRoofL, dtRoofR);
  dtCoop.position.set(1.8, 0, -9.2);
  group.add(dtCoop);
  block(1.8, -9.2, 3.1, 2.1, 2.4);

  // ----- Công trình trại: dựng sẵn, hiện dần theo setBuildings -----
  // Hệ tưới nhỏ giọt: bơm nước cạnh giếng + ống nhựa chạy về vườn, nhỏ giọt lên từng luống
  const irrigation = new THREE.Group();
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a7f9e });
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0x2e6da4 }));
  pump.position.y = 0.23;
  pump.castShadow = true;
  const pumpDial = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }));
  pumpDial.position.set(0.13, 0.3, 0.18);
  irrigation.add(pump, pumpDial);
  irrigation.position.set(-5.2, 0, 4.6);
  const mainPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 8.6, 8), pipeMat);
  mainPipe.rotation.x = Math.PI / 2 - 0.32;
  mainPipe.position.set(-8.4, 0.14, 1.3);
  irrigation.add(mainPipe);
  for (const x of [-11.7, -8.3]) {
    const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 6), pipeMat);
    drip.rotation.x = Math.PI / 2;
    drip.position.set(x, 0.1, -4.1);
    irrigation.add(drip);
    for (let z = -6.1; z <= -2.1; z += 1.25) {
      const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), pipeMat);
      spike.position.set(x, 0.16, z);
      irrigation.add(spike);
    }
  }
  irrigation.visible = false;
  group.add(irrigation);

  // Nhà lưới phủ bốn luống tây: khung vòm thép + màng trắng mờ hai đầu hở (kiểu nhà lưới rau VN)
  const greenhouse = new THREE.Group();
  const arch = new THREE.MeshStandardMaterial({ color: 0xb8c4cc, metalness: 0.5, roughness: 0.4 });
  const film = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
  for (let i = 0; i <= 5; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.035, 6, 14, Math.PI), arch);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(-12.0 + i * 1.3, 0, -4.2);
    greenhouse.add(rib);
  }
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 6.5, 14, 1, true, 0, Math.PI), film);
  cover.rotation.z = Math.PI / 2;
  cover.rotation.x = 0;
  cover.position.set(-9.4, 0, -4.2);
  greenhouse.add(cover);
  for (const z of [-4.2 - 2.3, -4.2 + 2.3]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6.5, 6), arch);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-9.4, 0.05, z);
    greenhouse.add(rail);
  }
  greenhouse.visible = false;
  group.add(greenhouse);

  // Bãi thả cỏ: miếng cỏ xanh mướt + rào thấp + mấy bụi cỏ — gia cầm chạy bãi đắp trứng
  const runPen = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.4), new THREE.MeshStandardMaterial({ color: 0x63a83e }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.02;
  lawn.receiveShadow = true;
  runPen.add(lawn);
  for (let x = -2.7; x <= 2.7; x += 0.9) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x4f9132 }));
    tuft.position.set(x + 0.2, 0.15, (x % 1.8) - 0.9);
    runPen.add(tuft);
  }
  for (const [x, z, sx, sz] of [[0, -1.7, 5.8, 0.05], [0, 1.7, 5.8, 0.05], [-2.9, 0, 0.05, 3.4], [2.9, 0, 0.05, 3.4]] as const) {
    const fenceLow = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.42, sz), wood);
    fenceLow.position.set(x, 0.21, z);
    runPen.add(fenceLow);
  }
  runPen.position.set(7.7, 0, -1.0);
  runPen.visible = false;
  group.add(runPen);

  // Bù nhìn "bản mới" khi đã mua: áo vàng tươi, mũ đỏ, hai lon thiếc kêu lanh canh đuổi chim
  const scareNew = new THREE.Group();
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.24), new THREE.MeshStandardMaterial({ color: 0xe8b72a }));
  coat.position.y = 1.02;
  const newHat = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xd0342c }));
  newHat.position.y = 1.7;
  scareNew.add(coat, newHat);
  const tinMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.7, roughness: 0.3 });
  for (const x of [-0.55, 0.55]) {
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), tinMat);
    tin.position.set(x, 1.0, 0);
    scareNew.add(tin);
  }
  scareNew.position.set(-5.6, 0, -4.2);
  scareNew.rotation.y = 0.5;
  scareNew.visible = false;
  group.add(scareNew);

  // Phần dựng thêm theo bậc mở rộng: luống mới, thùng cám sỉ, sân thả gà nới + chuồng vịt/bò/heo
  const extra = new THREE.Group();
  group.add(extra);
  const rebuild = (tier: number) => {
    extra.clear();
    bedBases.length = 4; // luống ngoài bậc 0 dựng lại từ đầu
    const plots = landPlots(Math.max(0, Math.min(2, tier)));
    for (let i = 4; i < plots; i++) {
      const { bed, soil } = makeBed();
      const p = bedPos(i);
      bed.position.set(p.x, 0, p.z);
      extra.add(bed);
      bedBases.push({ soil });
    }
    if (tier >= 1) {
      // Thùng cám sỉ cạnh kho
      const silo = new THREE.Group();
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12), new THREE.MeshStandardMaterial({ color: 0xc0c8cc }));
      tank.position.y = 0.75;
      tank.castShadow = true;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x8f9aa0 }));
      cap.position.y = 1.7;
      silo.add(tank, cap);
      silo.position.set(-hw + 5.2, 0, hd - 1.4);
      extra.add(silo);
      block(-hw + 5.2, hd - 1.4, 1.2, 1.2, 1.6);
      // Chuồng vịt và ngỗng chỉ dựng khi có đất bậc 2 (cùng bậc mở khoá)
      penNet(extra, PENS.duck.x1, PENS.duck.z1, PENS.duck.x2, PENS.duck.z2);
      penNet(extra, PENS.goose.x1, PENS.goose.z1, PENS.goose.x2, PENS.goose.z2);
    }
    if (tier >= 2) {
      // Bậc lớn nhất: sân bò, bãi heo, vườn dê và sân gà Đông Tảo rào lưới
      penNet(extra, PENS.cow.x1, PENS.cow.z1, PENS.cow.x2, PENS.cow.z2);
      penNet(extra, PENS.pig.x1, PENS.pig.z1, PENS.pig.x2, PENS.pig.z2);
      penNet(extra, PENS.goat.x1, PENS.goat.z1, PENS.goat.x2, PENS.goat.z2);
      penNet(extra, PENS.dong_tao.x1, PENS.dong_tao.z1, PENS.dong_tao.x2, PENS.dong_tao.z2);
    }
  };

  /** Công trình trại đã mua (theo sao) thì hiện hình tương ứng. */
  const setBuildings = (b: Partial<Record<string, number>>) => {
    irrigation.visible = (b.tuoi_tu_dong ?? 0) > 0;
    greenhouse.visible = (b.nha_luoi ?? 0) > 0;
    runPen.visible = (b.bai_tha ?? 0) > 0;
    scareNew.visible = (b.bu_nhin ?? 0) > 0;
  };

  // ----- Cây trồng trên luống: mầm → đang lớn → gần chín → chín sai trái -----
  // Vẽ theo garden.plots; mỗi luống chỉ dựng lại khi (giống, giai đoạn, tưới) đổi — tức đổi theo ngày, không phải mỗi khung.
  const cropsRoot = new THREE.Group();
  group.add(cropsRoot);
  const plotViews: (THREE.Group | null)[] = [];
  const plotKeys: string[] = [];
  const buildCrop = createCropBuilder();


  /** Cập nhật cây trên từng luống theo trạng thái vườn (main gọi khi garden.plots hoặc ngày đổi). */
  const setPlots = (plots: Plot[], day: number) => {
    plots.forEach((p, i) => {
      const def = p.crop ? CROPS.find((c) => c.id === p.crop) : undefined;
      const watered = p.wateredDay === day;
      const bed = bedBases[i];
      if (bed) bed.soil.color.setHex(watered ? SOIL_WET : SOIL_DRY);
      const stage = def ? (p.growth >= def.days ? 3 : p.growth / def.days < 0.3 ? 0 : p.growth / def.days < 0.7 ? 1 : 2) : -1;
      const key = def ? `${p.crop}:${stage}:${watered ? 'w' : 'd'}` : '-';
      if (plotKeys[i] === key) return;
      plotKeys[i] = key;
      if (plotViews[i]) {
        cropsRoot.remove(plotViews[i]!);
        plotViews[i] = null;
      }
      if (!def) return;
      const g = buildCrop(p.crop!, stage);
      const pos = bedPos(i);
      g.position.set(pos.x, 0.14, pos.z);
      g.rotation.y = ((i * 137) % 360) * (Math.PI / 180); // quay lệch nhau cho tự nhiên
      cropsRoot.add(g);
      plotViews[i] = g;
    });
  };

  // ----- Vật nuôi 3D: đi rong trong sân, cúi mổ, tối về chuồng -----
  const beasts = Object.fromEntries(ANIMAL_ORDER.map((k) => [k, [] as Beast[]])) as Record<AnimalKind, Beast[]>;
  const makers = createBeastMakers();
  const place = (kind: AnimalKind, b: Beast) => {
    const pen = PENS[kind];
    b.root.position.set(pen.x1 + Math.random() * (pen.x2 - pen.x1), 0, pen.z1 + Math.random() * (pen.z2 - pen.z1));
    group.add(b.root);
  };
  const setAnimals = (kind: AnimalKind, n: number) => {
    const list = beasts[kind];
    while (list.length < n) {
      const b = makers[kind]();
      place(kind, b);
      list.push(b);
    }
    while (list.length > n) group.remove(list.pop()!.root);
  };

  // Vector tạm cho bước di chuyển của vật nuôi (không cấp phát mỗi khung)
  const _dir = new THREE.Vector3();

  /** dt theo giờ game; ngoài ~60 m thì main không gọi (vật đứng yên). */
  const update = (dt: number, hour: number) => {
    const night = hour >= 18.5 || hour < 5.5;
    for (const kind of Object.keys(beasts) as AnimalKind[]) {
      const pen = PENS[kind];
      for (const b of beasts[kind]) {
        if (night) b.target.copy(pen.home);
        else if (b.wait <= 0) {
          b.target.set(pen.x1 + Math.random() * (pen.x2 - pen.x1), 0, pen.z1 + Math.random() * (pen.z2 - pen.z1));
          b.wait = 1.5 + Math.random() * 4;
        }
        const dir = _dir.copy(b.target).sub(b.root.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.08) {
          dir.normalize();
          const step = Math.min(dist, pen.speed * dt);
          b.root.position.addScaledVector(dir, step);
          b.root.rotation.y = Math.atan2(dir.x, dir.z);
          if (b.head) b.head.rotation.x = 0;
          b.peck = 0;
          // Vung chân so le theo nhịp — loài đi nhanh bước dồn быстрее
          b.gait += dt * (4 + pen.speed * 10);
          for (let i = 0; i < b.legs.length; i++) b.legs[i].rotation.x = Math.sin(b.gait + (i % 2) * Math.PI) * 0.55;
        } else {
          b.wait -= dt;
          b.peck += dt;
          for (const l of b.legs) l.rotation.x *= Math.max(0, 1 - dt * 8);
          if (b.head) b.head.rotation.x = b.wait > 0.4 ? Math.abs(Math.sin(b.peck * 6)) * (kind === 'cow' ? 0.35 : 0.9) : 0;
        }
      }
    }
  };

  return { group, boxes, rebuild, setBuildings, setAnimals, setPlots, update, spot: SPOT, wellSpot: WELL_SPOT };
}

/** Chữ trắng in đậm trên nền gỗ (biển cổng trang trại), vẽ vừa khít khung. */
function signTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6b4a2a';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#8a6a44';
  g.lineWidth = 10;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = '#ffffff';
  // Co cỡ chữ cho khít chiều rộng biển, không bị cắt
  const size = Math.min(120, (c.width * 0.92 / text.length) * 1.55);
  g.font = `900 ${size}px "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
