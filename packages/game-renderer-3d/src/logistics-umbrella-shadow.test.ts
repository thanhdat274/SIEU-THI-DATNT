import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager';
import { actorShadowAlpha } from './actor-shadows-3d';
import { shouldOpenUmbrella, UMBRELLA_COLORS } from './umbrellas-3d';
import { logisticsBoxPosition, CARGO_BOX_COLORS, Logistics3D } from './logistics-3d';
import { Vehicles3D } from './vehicles-3d';
import { Crowd3D } from './crowd-3d';
import type { LogisticsWorkerState } from '@game/shared';

// 1. Kiểm tra độ đậm của bóng theo giờ (actorShadowAlpha)
{
  // Ban ngày (nắng mạnh = 0.8, đèn tắt = 0): bóng đậm rõ nét
  const dayAlpha = actorShadowAlpha(0.8, 0);
  assert.ok(dayAlpha >= 0.30 && dayAlpha <= 0.42, `day alpha (${dayAlpha}) nằm trong khoảng 0.30..0.42`);

  // Ban đêm (nắng tắt = 0, đèn bật = 1): bóng nhạt đi
  const nightAlpha = actorShadowAlpha(0, 1);
  assert.ok(nightAlpha >= 0.08 && nightAlpha <= 0.16, `night alpha (${nightAlpha}) nằm trong khoảng 0.08..0.16`);

  // Ban ngày bóng luôn đậm hơn ban đêm
  assert.ok(dayAlpha > nightAlpha, 'bóng ban ngày đậm hơn ban đêm');
}

// 2. Kiểm tra khi nào bật ô (shouldOpenUmbrella)
{
  // Không mưa -> không mở ô
  const noRain = shouldOpenUmbrella(0, 'cust-1', 1, 10, 10, []);
  assert.equal(noRain.open, false);

  // Mưa rất nhỏ (<= 0.05) -> không mở ô
  const drizzle = shouldOpenUmbrella(0.02, 'cust-1', 1, 10, 10, []);
  assert.equal(drizzle.open, false);

  // Mưa to (0.8) ngoài trời (không bị che mái) -> kiểm tra getRainProtection
  const rainCheck = shouldOpenUmbrella(0.8, 'cust-umbrella-tester', 1, 5, 20, []);
  // Nếu characterId này được roll umbrella thì open = true và có màu hợp lệ
  if (rainCheck.open) {
    assert.ok(Object.keys(UMBRELLA_COLORS).includes(rainCheck.color), 'màu ô hợp lệ');
  }

  // Đứng dưới mái tòa nhà còn đậy -> không mở ô
  const dummyRoofs = [{
    id: 'store',
    x0: 8,
    x1: 14,
    z0: 10,
    z1: 16,
    meshes: [{ isVisible: true } as any],
    facadeMeshes: [],
    wallMeshes: [],
    fadeMaterials: [],
    facadeMaterials: [],
    wallMaterials: [],
    alpha: 1,
    wallAlpha: 1,
    top: 2,
    warehouse: false,
  }];
  const insideBuilding = shouldOpenUmbrella(0.8, 'cust-umbrella-tester', 1, 10, 12, dummyRoofs);
  assert.equal(insideBuilding.open, false, 'trong nhà không mở ô');
}

// 3. Kiểm tra dữ liệu hậu cần -> vị trí thùng hàng trên tay nhân viên
{
  const workerRight: LogisticsWorkerState = {
    id: 'w1',
    x: 600,
    y: 380,
    direction: 'right',
    carryingBox: true,
    boxType: 'carton',
    target: 'dock',
  };
  const posRight = logisticsBoxPosition(workerRight, 0, 0.96);
  assert.ok(Number.isFinite(posRight.x) && Number.isFinite(posRight.y) && Number.isFinite(posRight.z));
  assert.equal(posRight.y, 0.75, 'độ cao thùng ngang ngực');

  const workerLeft: LogisticsWorkerState = {
    ...workerRight,
    direction: 'left',
  };
  const posLeft = logisticsBoxPosition(workerLeft, 0, 0.96);
  // Hướng phải vs trái thì x khác nhau (lệch theo hướng đi)
  assert.notEqual(posRight.x, posLeft.x);

  // Màu thùng hàng theo loại
  assert.equal(CARGO_BOX_COLORS.carton, '#c29b63');
  assert.equal(CARGO_BOX_COLORS.foam_cold, '#e2e8f0');
  assert.equal(CARGO_BOX_COLORS.produce_crate, '#65a30d');
  assert.equal(CARGO_BOX_COLORS.trolley, '#dc2626');
}

// 4. KIỂM THỬ TÁI HIỆN BẰNG NULLENGINE:
// Thứ tự gọi: logistics.update() đặt đối tượng trước, sau đó vehicles.update() / crowd.update() chạy sau
// Đối tượng đặt từ ngoài phải KHÔNG bị dọn nhầm (mesh.isVisible = true).
// Khi activeEvent = null: xe và người phải biến mất (isVisible = false hoặc bị dọn).
{
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;

  // Mock simulation
  let activeEventMock: any = {
    id: 'test_delivery_1',
    type: 'supplier_delivery',
    truckType: 'truck_dry_goods',
    truckPosition: { x: 688, y: 422.4 },
    direction: 'left',
    doorsOpen: true,
    phase: 'unloading',
    totalBoxes: 4,
    boxesRemaining: 4,
    statusText: 'Đang bốc kiện hàng vào kho',
    worker: {
      id: 'worker_test_1',
      x: 750,
      y: 388,
      direction: 'left',
      carryingBox: true,
      boxType: 'carton',
      target: 'truck',
    },
  };

  const simMock: any = {
    getLogisticsState: () => ({
      activeEvent: activeEventMock,
      loadingDockLocation: { dockX: 544, dockY: 352, truckBayX: 688, truckBayY: 422.4 },
    }),
    getStreetVehicles: () => [],
    peekCustomers: () => [],
    peekVisibleStaff: () => [],
    getTime: () => ({ hour: 12, minute: 0, day: 1, isStoreOpen: true }),
    getEffectiveWeatherId: () => 'clear',
    getCivicPopulation: () => 10,
    setStreetCrossings: () => {},
    getStreetPedestrians: () => [],
    getRainIntensity: () => 0,
    getWeatherSeed: () => 12345,
  };

  const vehicles = new Vehicles3D(scene, simMock, null);
  const manager = new SpriteManager('test_mgr', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 16, { width: 32, height: 51 }, scene);
  const atlasMock = {
    manager,
    frames: new Map(),
  };
  const crowd = new Crowd3D(atlasMock as any, simMock);
  const logistics = new Logistics3D(scene, simMock, vehicles, crowd);

  const view = { centerX: 20, centerZ: 12, radius: 25, zoom: 2 };

  // FRAME 1: logistics.update() chạy TRƯỚC, rồi vehicles.update() và crowd.update() chạy SAU
  logistics.update(0, 0.96, []);
  crowd.update(0.016, 0, 0.96, [], view, false);
  vehicles.update(0, 0.96, view, 0);

  // Assert sau frame 1: Xe tải và nhân viên bê thùng PHẢI hiển thị (isVisible === true)
  const truckMesh = vehicles.findVehicleMesh('logistics_truck');
  assert.ok(truckMesh, 'Xe tải logistics_truck phải tồn tại trong cảnh');
  assert.equal(truckMesh?.isVisible, true, 'Xe tải PHẢI isVisible = true sau khi vehicles.update() chạy sau');

  const workerSprite = crowd.findPersonSprite('logistics_worker');
  assert.ok(workerSprite, 'Nhân viên logistics_worker phải tồn tại trong cảnh');
  assert.equal(workerSprite?.isVisible, true, 'Nhân viên PHẢI isVisible = true sau khi crowd.update() chạy sau');

  assert.equal(logistics.boxMesh?.isVisible, true, 'Thùng hàng trên tay PHẢI isVisible = true');

  // FRAME 2: Sự kiện kết thúc (activeEvent = null)
  activeEventMock = null;
  logistics.update(0, 0.96, []);
  crowd.update(0.016, 0, 0.96, [], view, false);
  vehicles.update(0, 0.96, view, 0);

  // Assert sau khi sự kiện kết thúc: Không còn xe, người hay thùng kẹt lại
  const truckMeshAfter = vehicles.findVehicleMesh('logistics_truck');
  assert.ok(!truckMeshAfter || truckMeshAfter.isVisible === false, 'Xe tải phải biến mất sau khi activeEvent kết thúc');

  const workerSpriteAfter = crowd.findPersonSprite('logistics_worker');
  assert.ok(!workerSpriteAfter || workerSpriteAfter.isVisible === false, 'Nhân viên phải biến mất sau khi activeEvent kết thúc');

  assert.equal(logistics.boxMesh?.isVisible, false, 'Thùng hàng phải ẩn khi activeEvent kết thúc');

  logistics.dispose();
  crowd.dispose();
  vehicles.dispose();
  scene.dispose();
  engine.dispose();
}

console.log('PASS logistics-umbrella-shadow: test thuần dữ liệu hậu cần, ô che mưa và bóng chân nhân vật');
