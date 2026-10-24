import * as THREE from 'three';
import { GroceryShop } from '../shop/groceryShop';
import { Building } from './buildings';
import { Warehouse, WAREHOUSE_DEPTH } from './warehouse';
import type { NavGrid } from './navGrid';
import { SHOP_CENTER_X, SHOP_FRONT_Z, SHOP_TIERS } from '../data/shopTiers';
import { HOUSE_SIZE, houseDoor, NEIGHBOR_HOUSES } from '../data/phoneOrders';
import { BRANCH_LAYOUT, CONVENIENCE, LANE_X, ROAD2_Z } from '../data/branches';
import { FurnitureView } from '../shop/furnitureView';

/** Các điểm trong một phòng ngủ (toạ độ thế giới). */
export interface RoomSpots { bed: THREE.Vector3; wake: THREE.Vector3; nightstand: THREE.Vector3 }

export interface World {
  /** Tiệm có thể được xây lại khi mở rộng, nên lấy danh sách mỗi lần dùng. */
  readonly buildings: Building[];
  /** Vị trí giường (toạ độ thế giới) để ngủ và thức dậy. */
  bed: THREE.Object3D;
  /** Tủ đầu giường (chỗ ăn sáng), toạ độ thế giới. */
  nightstand: THREE.Vector3;
  /** Nhà riêng, để bày đồ mua thêm vào trong. */
  home: Building;
  /** Nhà chung nhiều phòng (chỉ hiện khi chơi hẻm online). */
  sharedHome: Building;
  /** Nhà đang dùng: nhà riêng, hoặc nhà chung nhiều phòng khi chơi hẻm online. */
  readonly currentHome: Building;
  /** Đổi giữa nhà riêng (chơi một mình) và nhà chung nhiều phòng (hẻm online). */
  useSharedHome(on: boolean): void;
  /** Giường, chỗ ngủ dậy và chỗ ăn sáng của phòng `room` (toạ độ thế giới); nhà riêng chỉ có một phòng. */
  roomSpots(room: number): RoomSpots;
  shop: GroceryShop;
  warehouse: Warehouse;
  /** Cửa hàng tiện lợi 24/7, xa tiệm chính, trên con đường thứ hai. */
  convenience: Building;
  /** Kệ, tủ trong cửa hàng tiện lợi (cùng kiểu với tiệm chính), theo thứ tự BRANCH_LAYOUT. */
  convenienceViews: FurnitureView[];
  /** Nhà hàng xóm dọc hẻm, theo id trong NEIGHBOR_HOUSES; mỗi nhà có cờ báo đơn chờ giao trước cửa. */
  houses: Map<string, { building: Building; door: THREE.Vector3; marker: THREE.Object3D }>;
}

/** Thế giới ban đầu: mặt đất, con đường, nhà riêng và tiệm tạp hóa nhỏ. */
export function createWorld(scene: THREE.Scene, grid: NavGrid): World {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x7cb05a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 6),
    new THREE.MeshStandardMaterial({ color: 0x555555 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, 6);
  road.receiveShadow = true;
  scene.add(road);

  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 2),
    new THREE.MeshStandardMaterial({ color: 0xbdbdbd }),
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(0, 0.02, 2);
  sidewalk.receiveShadow = true;
  scene.add(sidewalk);

  // Con đường thứ hai cho cửa hàng tiện lợi, nối với đường chính bằng một hẻm dọc
  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  road2.rotation.x = -Math.PI / 2;
  road2.position.set(LANE_X + 20, 0.01, ROAD2_Z);
  road2.receiveShadow = true;
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(5, 3 - ROAD2_Z), new THREE.MeshStandardMaterial({ color: 0x5e5e5e }));
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(LANE_X, 0.012, (3 + ROAD2_Z) / 2);
  lane.receiveShadow = true;
  scene.add(road2, lane);
  const { building: convenience, views: convenienceViews } = createConvenienceStore();
  scene.add(convenience.group);

  // Nhà riêng
  const home = new Building({
    name: 'Nhà của bạn', width: 6, depth: 6, height: 3, wallColor: 0xf5e6c8, roofColor: 0xb03a2e, doorStyle: 'wood',
  });
  home.group.position.set(-12, 0, -2);
  const bed = createBed();
  bed.position.set(-1.6, 0, -1.7);
  const nightstand = createNightstand();
  nightstand.position.set(-0.45, 0, -2.45);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 1.4), new THREE.MeshStandardMaterial({ color: 0xc0504d }));
  rug.position.set(0.6, 0.11, 0.6);
  rug.receiveShadow = true;
  home.interior.add(bed, nightstand);
  // Thảm nằm sát sàn, không chặn đường đi
  home.group.add(rug);
  scene.add(home.group);

  const warehouse = new Warehouse(scene);
  const shop = new GroceryShop(scene, warehouse);
  const maxTier = SHOP_TIERS[SHOP_TIERS.length - 1];

  // Vài cái cây cho sinh động
  const treeBoxes: THREE.Box3[] = [];
  for (let i = 0; i < 25; i++) {
    const x = (Math.random() - 0.5) * 140;
    let z = -10 - Math.random() * 60;
    // Chừa đất cho tiệm mở rộng tới cỡ siêu thị, cộng nhà kho nối phía sau
    const reserved = maxTier.depth + WAREHOUSE_DEPTH + 1;
    if (Math.abs(x - SHOP_CENTER_X) < maxTier.width / 2 + 2 && z > SHOP_FRONT_Z - reserved - 2) {
      z -= reserved + 4;
    }
    // Chừa hẻm dọc, con đường thứ hai và mặt bằng cửa hàng tiện lợi
    if (Math.abs(x - LANE_X) < 4 || (x > LANE_X - 12 && z < ROAD2_Z + 5)) continue;
    scene.add(createTree(x, z));
    treeBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0, z), new THREE.Vector3(0.4, 1, 0.4)));
  }

  grid.setStatic('trees', treeBoxes);
  grid.setStatic('home', home.staticBoxes());
  grid.setStatic('convenience', convenience.staticBoxes());

  // Nhà chung cho hẻm online: chỉ hiện (thay nhà riêng) khi đang chơi chung
  const shared = createSharedHome();
  let current = home;

  // Nhà hàng xóm: khách gọi điện đặt hàng, giao tận cửa
  const houses: World['houses'] = new Map();
  const houseBoxes: THREE.Box3[] = [];
  for (const def of NEIGHBOR_HOUSES) {
    const b = new Building({
      name: def.name, width: HOUSE_SIZE, depth: HOUSE_SIZE, height: 2.8, wallColor: def.wallColor, roofColor: def.roofColor, doorStyle: 'wood',
    });
    b.group.position.set(def.x, 0, def.z);
    scene.add(b.group);
    houseBoxes.push(...b.staticBoxes());
    const d = houseDoor(def);
    const marker = createDeliveryMarker();
    marker.position.set(d.x, 0, d.z);
    marker.visible = false;
    scene.add(marker);
    houses.set(def.id, { building: b, door: new THREE.Vector3(d.x, 0, d.z), marker });
  }
  grid.setStatic('houses', houseBoxes);
  shop.attachGrid(grid);
  const soloSpots: RoomSpots = {
    bed: bed.getWorldPosition(new THREE.Vector3()).setY(0),
    wake: bed.getWorldPosition(new THREE.Vector3()).setY(0).add(new THREE.Vector3(1.3, 0, 0.3)),
    nightstand: nightstand.getWorldPosition(new THREE.Vector3()).setY(0).add(new THREE.Vector3(0.7, 0, 0.6)),
  };
  return {
    sharedHome: shared.building,
    get currentHome() { return current; },
    useSharedHome(on) {
      const next = on ? shared.building : home;
      if (next === current) return;
      scene.remove(current.group);
      scene.add(next.group);
      current = next;
      grid.setStatic('home', next.staticBoxes());
      // Dựng lại lưới đi lại (kèm nội thất trong tiệm) theo tường nhà mới
      shop.attachGrid(grid);
    },
    roomSpots(room) {
      if (current === home) return soloSpots;
      return shared.rooms[Math.max(0, Math.min(shared.rooms.length - 1, room))];
    },
    get buildings() { return [current, shop.building, warehouse.building, convenience, ...[...houses.values()].map((h) => h.building)]; },
    houses,
    bed,
    nightstand: nightstand.getWorldPosition(new THREE.Vector3()).setY(0).add(new THREE.Vector3(0.7, 0, 0.6)),
    home,
    shop,
    warehouse,
    convenience,
    convenienceViews,
  };
}

/** Cờ báo trước cửa nhà đang chờ giao hàng: cột mảnh và hộp hàng vàng lơ lửng. */
function createDeliveryMarker(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
  pole.position.y = 0.8;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.32, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xff9800, emissiveIntensity: 0.6 }),
  );
  box.position.y = 1.85;
  box.name = 'box';
  g.add(pole, box);
  return g;
}

/** Giường gỗ: đệm trắng, gối, chăn xanh gấp mép, đầu giường cao. */
function createBed(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a36 });
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  box(1.5, 0.3, 2.2, 0, 0.25, 0, wood); // khung
  box(1.6, 1.0, 0.1, 0, 0.5, -1.1, wood); // đầu giường
  box(1.6, 0.55, 0.08, 0, 0.28, 1.1, wood); // chân giường
  box(1.4, 0.18, 2.1, 0, 0.49, 0, new THREE.MeshStandardMaterial({ color: 0xf4f1ea })); // đệm
  // Chăn phủ 2/3 giường, mép trên gấp lại màu sáng hơn
  box(1.46, 0.08, 1.4, 0, 0.61, 0.33, new THREE.MeshStandardMaterial({ color: 0x3b7dd8 }));
  box(1.47, 0.09, 0.22, 0, 0.62, -0.42, new THREE.MeshStandardMaterial({ color: 0x8fb8ee }));
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (const x of [-0.34, 0.34]) {
    box(0.6, 0.14, 0.38, x, 0.65, -0.82, pillowMat);
  }
  return g;
}

/** Tủ đầu giường có đèn ngủ (bật khi trời tối, xem Building.setLamp). */
function createNightstand(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.45), new THREE.MeshStandardMaterial({ color: 0x9b6a43 }));
  top.position.y = 0.28;
  top.castShadow = true;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  base.position.y = 0.7;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 0.22, 14),
    new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc870, emissiveIntensity: 0.6 }),
  );
  shade.position.y = 0.93;
  shade.name = 'lampShade';
  g.add(top, base, shade);
  return g;
}

function createTree(x: number, z: number): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x6e4b2a }),
  );
  trunk.position.y = 0.6;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32 }),
  );
  leaves.position.y = 2.2;
  trunk.castShadow = leaves.castShadow = true;
  tree.add(trunk, leaves);
  tree.position.set(x, 0, z);
  return tree;
}

/** Số phòng ngủ của nhà chung, bằng số thành viên tối đa của một hẻm. */
const SHARED_ROOMS = 4;
const ROOM_COLORS = [0xc0504d, 0x4f81bd, 0x9bbb59, 0xf79646];

/**
 * Nhà chung cho hẻm online, cùng chỗ với nhà riêng nhưng to hơn (12 × 10 m, mặt tiền giữ nguyên):
 * phía trước là phòng khách chung, phía sau là 4 phòng ngủ cạnh nhau, mỗi thành viên một phòng.
 */
function createSharedHome() {
  const W = 12, D = 10;
  const building = new Building({
    name: 'Nhà chung của hẻm', width: W, depth: D, height: 3, wallColor: 0xf5e6c8, roofColor: 0xb03a2e, doorStyle: 'wood',
  });
  // Mặt tiền trùng nhà riêng (z = 1), nhà lùi sâu về phía sau
  building.group.position.set(-12, 0, 1 - D / 2);
  const roomW = W / SHARED_ROOMS;
  const back = -D / 2;
  const front = 0.5; // vách ngăn phòng ngủ với phòng khách
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeedcb8 });
  const wall = (x1: number, z1: number, x2: number, z2: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.15, Math.abs(x2 - x1)), 2.2, Math.max(0.15, Math.abs(z2 - z1))), wallMat);
    m.position.set((x1 + x2) / 2, 1.1, (z1 + z2) / 2);
    m.castShadow = m.receiveShadow = true;
    building.interior.add(m);
  };
  // Vách giữa các phòng
  for (let i = 1; i < SHARED_ROOMS; i++) wall(-W / 2 + roomW * i, back + 0.1, -W / 2 + roomW * i, front);
  const rooms: RoomSpots[] = [];
  const worldPos = (x: number, z: number) => new THREE.Vector3(x, 0, z).add(building.group.position);
  for (let i = 0; i < SHARED_ROOMS; i++) {
    const left = -W / 2 + roomW * i;
    const cx = left + roomW / 2;
    // Vách trước phòng, chừa cửa 1,4 m bên phải (lưới đi lại cần khe đủ rộng)
    const doorL = cx + 0.1;
    wall(left + (i ? 0.075 : 0.1), front, doorL, front);
    const bed = createBed();
    bed.position.set(cx - 0.6, 0, back + 1.25);
    const stand = createNightstand();
    stand.position.set(cx + 1.0, 0, back + 0.4);
    building.interior.add(bed, stand);
    // Thảm mỗi phòng một màu cho dễ nhận phòng mình
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 1.6), new THREE.MeshStandardMaterial({ color: ROOM_COLORS[i] }));
    rug.position.set(cx + 0.85, 0.11, back + 3.2);
    rug.receiveShadow = true;
    building.group.add(rug);
    // Thức dậy ở cuối giường (giường dài tới back + 2.35), ăn sáng trước tủ đầu giường
    rooms.push({ bed: worldPos(cx - 0.6, back + 1.25), wake: worldPos(cx + 0.2, back + 3.0), nightstand: worldPos(cx + 0.85, back + 1.0) });
  }
  // Phòng khách: thảm lớn và bộ bàn ghế giữa nhà
  const rug = new THREE.Mesh(new THREE.BoxGeometry(4, 0.02, 2.2), new THREE.MeshStandardMaterial({ color: 0xc9a227 }));
  rug.position.set(-3, 0.11, 2.8);
  rug.receiveShadow = true;
  building.group.add(rug);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: 0x8a5a36 }));
  table.position.set(-3, 0.25, 2.8);
  table.castShadow = true;
  building.interior.add(table);
  return { building, rooms };
}

/** Cửa hàng tiện lợi 24/7: mặt kính, mái xanh, biển "24H" phát sáng (mặt tiền nhìn ra con đường thứ hai). */
function createConvenienceStore(): { building: Building; views: FurnitureView[] } {
  const b = new Building({
    name: CONVENIENCE.name, width: CONVENIENCE.width, depth: CONVENIENCE.depth, height: 3.4,
    wallColor: 0xf4f7fb, roofColor: 0x0b8a4a, floorColor: 0xe9ecef, doorStyle: 'glass', airCon: true, ceilingFan: true,
  });
  b.group.position.set(CONVENIENCE.x, 0, CONVENIENCE.z);
  // Biển hiệu và dải màu thương hiệu trên mặt tiền
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.9, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x0b8a4a, emissive: 0x19c26b, emissiveIntensity: 0.7 }),
  );
  sign.position.set(0, 3.9, CONVENIENCE.depth / 2 + 0.1);
  const h24 = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.9, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff9a2e, emissiveIntensity: 0.9 }),
  );
  h24.position.set(3.6, 3.9, CONVENIENCE.depth / 2 + 0.12);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(CONVENIENCE.width, 0.25, 0.1), new THREE.MeshStandardMaterial({ color: 0xff7a00 }));
  stripe.position.set(0, 3.25, CONVENIENCE.depth / 2 + 0.06);
  // Gắn vào mái để nhìn vào trong thì biển mờ theo mái, không che quầy kệ
  for (const m of [sign, h24, stripe]) {
    m.position.y -= b.roof.position.y;
    (m.material as THREE.MeshStandardMaterial).transparent = true;
    b.roof.add(m);
  }
  // Bên trong dùng đúng kệ, tủ, quầy của tiệm chính; hàng 3D được bày theo hàng đang có ở chi nhánh
  const views = BRANCH_LAYOUT.map((f) => {
    const v = new FurnitureView(f.type);
    v.group.position.set(f.x, 0, f.z);
    v.group.rotation.y = (f.rot * Math.PI) / 2;
    b.interior.add(v.group);
    return v;
  });
  // Mặt bằng rộng mở 24/7: thêm dãy đèn sáng phủ cả tiệm (đèn chung của tòa nhà chỉ chiếu góc sau)
  for (const [x, z] of [[-4.5, 1.5], [1, 1.5], [5.5, 1.5], [-4.5, -2.5], [1, -2.5], [5.5, -2.5]]) {
    const light = new THREE.PointLight(0xf6f9ff, 2.2, 9, 1.4);
    light.position.set(x, 3.0, z);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }));
    tube.position.set(x, 3.3, z);
    b.group.add(light, tube);
  }
  return { building: b, views };
}
