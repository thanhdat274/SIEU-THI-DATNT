import { skyAt } from './data/weather';
import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import { shopLayout, worldActions } from './core/actions';
import { initSaves, saveGame, startAutosave } from './core/save';
import { formatClock, ROUTINE, SLEEP_FROM, useGame, type GameState } from './core/store';
import { vehicleDef } from './data/biz';
import { checkChapters, eatBreakfast, stockReminders } from './core/biz';
import { hasSkill } from './data/titles';
import { furnitureDef, isCookStation } from './data/furniture';
import { initAudio, playSfx, setRain } from './core/audio';
import { hasUpgrade } from './data/upgrades';

// Trình duyệt chỉ mở tiếng sau tương tác đầu tiên — mỗi cú click là một cơ hội khởi động AudioContext
window.addEventListener('pointerdown', initAudio);
import { BuildMode } from './shop/buildMode';
import type { Counter } from './shop/groceryShop';
import { CustomerManager } from './agents/customers';
import { Player } from './agents/player';
import { StaffManager } from './agents/staff';
import { ResidentManager } from './agents/residents';
import { BranchVisit } from './agents/branchVisit';
import { BizView } from './render/bizView';
import { CameraController } from './render/cameraController';
import { InteriorView } from './render/interiorView';
import { AdaptiveResolution, createRenderer, Lighting, LOW_POWER, type GameRenderer } from './render/scene';
import { applyLightBudget, initLightPool } from './render/lightBudget';
import { NavGrid } from './world/navGrid';
import { createWorld } from './world/world';
import { Hud } from './ui/Hud';
import './ui/controls.css';
import { LoginScreen } from './ui/LoginScreen';
import { pushCloudSave } from './net/cloud';
import { checkpoint, inAlley, initCoop, isGuest, partnerPositions, updateCoop } from './net/coop';
import { watchUser } from './net/firebase';
import { useSession } from './net/session';

// Thời gian đứng yên cho tới khi rời màn đăng nhập
useGame.setState({ speed: 0 });
watchUser((user) => useSession.setState({
  authChecked: true,
  account: user && { uid: user.uid, name: user.displayName ?? user.email ?? 'Chủ tiệm', email: user.email, photo: user.photoURL },
  cloudStatus: user ? 'idle' : 'off',
  cloudUpdatedAt: null,
}));
const playing = () => useSession.getState().screen === 'game';
const container = document.getElementById('game')!;
const { renderer, scene, camera } = createRenderer(container);
const controller = new CameraController(camera, renderer.domElement);
const lighting = new Lighting(scene);
const grid = new NavGrid();
const world = createWorld(scene, grid);
const { shop } = world;
const customers = new CustomerManager(scene, grid, shop);
const buildMode = new BuildMode(scene, camera, renderer.domElement, shop);
const staff = new StaffManager(scene, grid, shop);
customers.guardOnDuty = () => staff.guardOnDuty();

const residents = new ResidentManager(scene);
const branchVisit = new BranchVisit(scene, world.convenienceViews);
const bizView = new BizView(scene, world.home, world.sharedHome, shop);
const player = new Player(grid);
scene.add(player.mesh);
const interior = new InteriorView(scene, controller, [player.mesh]);
// Giường, chỗ thức dậy, chỗ ăn sáng của phòng mình (đổi khi vào hẻm online: nhà chung nhiều phòng)
const room = { ...world.roomSpots(0) };
const bedPos = room.bed.clone();
const wakeSpot = room.wake.clone();
const standSpot = room.nightstand.clone();
const wakeUp = () => player.teleport(wakeSpot.x, wakeSpot.z);
wakeUp();
controller.follow = player.position;
controller.target.copy(player.position);

initCoop({
  scene, player,
  actors: () => [...customers.customers, ...staff.workers.values()],
  resetSim: () => {
    customers.reset();
    staff.reset();
    residents.reset();
  },
});

// Sang ngày mới (ngủ, ngất, hoặc chơi lại): thức dậy cạnh giường, xoá khách cũ, tự động lưu.
// Ở hẻm online: tiến trình là của cả hẻm, máy chạy ghi về server thay vì lưu vào máy.
useGame.subscribe((s, prev) => {
  if (s.day === prev.day) return;
  wakeUp();
  customers.reset();
  staff.reset();
  residents.reset();
  if (inAlley()) return checkpoint();
  saveGame();
  if (useSession.getState().account) pushCloudSave();
});
startAutosave(
  () => useSession.getState().screen === 'game' && !inAlley(),
  () => void (useSession.getState().account && pushCloudSave()),
);
// Đổi trang phục (khi mở khóa): dựng lại mô hình nhân vật chính
let lastCostume = useGame.getState().costume;
useGame.subscribe((s) => {
  if (s.costume !== lastCostume) {
    lastCostume = s.costume;
    player.rebuild();
  }
});
useSession.subscribe((s, prev) => {
  // Vào/rời hẻm online: đổi sang nhà chung nhiều phòng, về đúng phòng của mình
  if (!!s.coop !== !!prev.coop || s.coop?.room !== prev.coop?.room) {
    world.useSharedHome(!!s.coop);
    const spots = world.roomSpots(s.coop?.room ?? 0);
    bedPos.copy(spots.bed);
    wakeSpot.copy(spots.wake);
    standSpot.copy(spots.nightstand);
    wakeUp();
  }
  if (s.screen === 'game' && prev.screen !== 'game') {
    controller.follow = player.position;
    // Lúc này save đã nạp xong, tiệm đã bày hàng: nạp trước nốt pipeline cho hàng hóa trong tiệm
    precompile();
    if (!isGuest()) useGame.getState().notify(`🏪 Ngày ${useGame.getState().day} · chúc buôn may bán đắt!`);
  }
});

// Bấm chuột (không kéo) chỉ dùng cho chế độ xây; nhân vật đi bằng phím hoặc cần điều khiển
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button === 2 && controller.dragged <= 6 && useGame.getState().placing) buildMode.cancel();
  if (e.button !== 0 || controller.dragged > 6 || !playing()) return;
  buildMode.click(e);
});

/** Đồ vật tương tác được bằng phím riêng (N, G, K, B) khi đứng gần. */
interface Interactable {
  position: THREE.Vector3;
  radius: number;
  hint: () => string;
  /** Mã phím (KeyboardEvent.code) làm việc này, hiện trong gợi ý dạng [N]. */
  key: string;
  action: () => void;
}

/** Người chơi đứng gần một quầy (tính tiền được ở quầy đó). */
const playerAt = (counter: Counter) => player.position.distanceTo(counter.center) < 2;
/** Thành viên khác trong hẻm đứng quầy cũng tính tiền được. */
const partnerAt = (counter: Counter) => partnerPositions().some((p) => p.distanceTo(counter.center) < 2);
const nearCounter = () => shop.counters().some(playerAt);
customers.playerAtCounter = playerAt;

/** Chỗ đứng khi tới tiệm: sau quầy chính, tính tiền được ngay. */
const shopSpot = () => shop.counters()[0].cashier;
/** Đi nhanh (xe ôm) mất chừng này phút trong game. */
const TRAVEL_MINUTES = 10;

worldActions.travel = (to) => {
  const s = useGame.getState();
  if (!playing() || s.buildMode) return;
  const spot = to === 'shop' ? shopSpot() : null;
  if (spot) player.teleport(spot.x, spot.z);
  else wakeUp();
  controller.follow = player.position;
  // Ở hẻm online đồng hồ là chung: một người đi lại không được tua giờ của cả hẻm
  const travel = inAlley() ? 0 : Math.round(TRAVEL_MINUTES * (vehicleDef(s.biz.vehicle)?.travel ?? 1));
  useGame.setState({ minutes: s.minutes + travel, panel: null });
  s.notify(to === 'shop' ? '🛵 Đã tới tiệm' : '🛵 Đã về nhà');
};

/** Số món còn trên kệ và số ô trống, để báo lúc kiểm kê cuối ngày. */
function stocktake() {
  const s = useGame.getState();
  const tiers = s.furniture.flatMap((f) => f.tiers);
  const empty = tiers.filter((t) => !t.productId || t.count === 0).length;
  const onShelf = tiers.reduce((n, t) => n + t.count, 0);
  const inStore = Object.values(s.storage).reduce((n, q) => n + q, 0);
  return `📋 Kiểm kê xong: ${onShelf} món trên kệ, ${inStore} món trong kho${empty ? `, ${empty} ô kệ trống` : ''}. Về nhà nghỉ thôi!`;
}

/**
 * Lịch tự động: chạy khi đồng hồ vượt qua mỗi mốc (kể cả khi tua nhanh).
 * Người chơi vẫn tự đóng/mở cửa, đi lại được; lịch chỉ làm việc chưa làm.
 */
let lastMinutes = useGame.getState().minutes;
let routineWalkDay = -1;
let routineOpenDay = -1;
function runRoutine() {
  const s = useGame.getState();
  const prev = lastMinutes;
  lastMinutes = s.minutes;
  if (!s.autoRoutine || s.minutes <= prev) return;
  const crossed = (at: number) => prev < at && s.minutes >= at;
  const atShop = () => s.location === shop.building.opts.name;
  // Ra tiệm / mở cửa mỗi ngày một lần, kể cả khi nạp save, ngủ dậy muộn hay tua qua mốc giờ
  const inDay = (at: number) => s.minutes >= at && s.minutes < ROUTINE.close;
  if (inDay(ROUTINE.goToShop) && routineWalkDay !== s.day && !atShop()) {
    routineWalkDay = s.day;
    player.walkTo(shopSpot());
    controller.follow = player.position;
    s.notify(`🚶 ${formatClock(s.minutes)} · Ra tiệm chuẩn bị mở cửa`);
  }
  if (inDay(ROUTINE.open) && routineOpenDay !== s.day) {
    routineOpenDay = s.day;
    // Tua nhanh thì đi bộ không kịp giờ mở cửa: tới thẳng quầy để không bỏ khách đứng chờ
    if (!atShop()) {
      const spot = shopSpot();
      player.teleport(spot.x, spot.z);
      controller.follow = player.position;
    }
    if (!s.shopOpen) s.toggleShop();
  }
  if (s.minutes - prev > 120) return;
  if (crossed(ROUTINE.close) && s.shopOpen) s.toggleShop();
  if (crossed(ROUTINE.goHome)) {
    s.notify(stocktake());
    if (atShop()) {
      player.walkTo(wakeSpot.clone());
      controller.follow = player.position;
    }
  }
}

/** Quầy, kệ và tủ thay đổi khi xây dựng / mở rộng tiệm, nên tính lại mỗi lần. */
const fixedInteractables: Interactable[] = [
  { position: bedPos, radius: 2, hint: () => (player.asleep ? '💤 Đang ngủ...' : '[N] Đi ngủ'), key: 'KeyN', action: goToBed },
];

// Danh sách đồ tương tác chỉ đổi khi đơn mang đi / đồ trong tiệm / chỗ kho đổi — cache theo dấu hiệu đó
let interactablesKey = -1;
let interactablesCache: Interactable[] = [];
function currentInteractables(): Interactable[] {
  const s = useGame.getState();
  let carrying = 0;
  for (const o of s.phoneOrders) if (o.status === 'carrying') carrying++;
  const key = carrying * 100003 + s.furniture.length * 101 + world.warehouse.spots.length;
  if (key !== interactablesKey) {
    interactablesKey = key;
    interactablesCache = buildInteractables();
  }
  return interactablesCache;
}

function buildInteractables(): Interactable[] {
  return [
    ...fixedInteractables,
    // Đơn gọi điện đã soạn hàng: tới trước cửa nhà khách để giao
    ...useGame.getState().phoneOrders
      .filter((o) => o.status === 'carrying' && world.houses.has(o.houseId))
      .map((o) => ({
        position: world.houses.get(o.houseId)!.door,
        radius: 1.6,
        hint: () => {
          const late = useGame.getState().minutes > o.dueAt;
          return `[G] Giao hàng cho ${o.caller}${late ? ' (đã trễ hẹn)' : ` · hẹn ${formatClock(o.dueAt)}`}`;
        },
        key: 'KeyG',
        action: () => useGame.getState().deliverPhone(o.id),
      })),
    ...world.warehouse.spots.map((spot) => ({
      position: spot.position,
      radius: 1.2,
      hint: () => spot.kind === 'desk' ? '[K] Đặt hàng (bàn nhận hàng)' : '[K] Xem kho hàng',
      key: 'KeyK',
      action: () => useGame.getState().openPanel({ type: spot.kind === 'desk' ? 'order' : 'storage' }),
    })),
    ...useGame.getState().furniture
      .filter((f) => furnitureDef(f.type).tiers > 0)
      .map((f) => ({
        position: shop.spotFor(f),
        radius: 1.2,
        hint: () => `[B] Bày hàng lên ${furnitureDef(f.type).name.toLowerCase()}`,
        key: 'KeyB',
        action: () => useGame.getState().openPanel({ type: 'shelf', uid: f.uid }),
      })),
    // Trạm nấu: đứng gần bấm M mở Sổ nấu (nguyên liệu lấy từ kho, nấu xong về kho)
    ...useGame.getState().furniture
      .filter((f) => isCookStation(f.type))
      .map((f) => ({
        position: shop.spotFor(f),
        radius: 1.3,
        hint: () => `[M] Nấu ăn ở ${furnitureDef(f.type).name.toLowerCase()}`,
        key: 'KeyM',
        action: () => useGame.getState().openPanel({ type: 'cook' }),
      })),
  ];
}

const nearestInteractable = () => {
  let best: Interactable | null = null;
  let bestDist = Infinity;
  for (const it of currentInteractables()) {
    const d = player.position.distanceTo(it.position);
    if (d < it.radius && d < bestDist) {
      best = it;
      bestDist = d;
    }
  }
  return best;
};

/** Nằm lên giường một lúc cho thấy nhân vật ngủ, rồi mới sang ngày mới. */
function goToBed() {
  const s = useGame.getState();
  if (player.asleep) return;
  if (s.minutes < SLEEP_FROM) return void s.sleep(); // báo "chưa buồn ngủ"
  player.lieOn(bedPos);
  controller.follow = player.position;
  setTimeout(() => {
    if (!player.asleep) return;
    if (!useGame.getState().sleep()) player.standUp();
  }, 1500);
}

// Bàn ăn sáng cạnh tủ đầu giường: bước tới là tự gọi tô phở (trước 11h, chưa ăn hôm nay)
let atBreakfast = false;
function autoBreakfast() {
  const s = useGame.getState();
  const near = player.position.distanceTo(standSpot) < 1.3;
  if (near && !atBreakfast && s.minutes <= 11 * 60 && s.biz.breakfastDay !== s.day) eatBreakfast();
  atBreakfast = near;
}

function interact() {
  const st = useGame.getState();
  if (st.panel || st.buildMode || !playing()) return;
  nearestInteractable()?.action();
}

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, textarea')) return;
  // Phím O: đóng / mở cửa tiệm ở bất cứ đâu
  if (e.code === 'KeyO') {
    const st = useGame.getState();
    if (!st.panel && !st.buildMode && playing()) st.toggleShop();
    return;
  }
  // Mỗi việc một phím (N ngủ, G giao hàng, K kho, B bày hàng): chỉ chạy khi đứng gần đúng chỗ đó
  const it = nearestInteractable();
  if (!it || it.key !== e.code) return;
  e.preventDefault();
  interact();
});

Object.assign(worldActions, {
  interact,
  rotate: () => buildMode.rotate(),
  place: () => buildMode.confirm(),
  cancel: () => buildMode.cancel(),
});

Object.assign(shopLayout, {
  plan: () => shop.plan(),
  check: shop.quickCheck.bind(shop),
  layoutCheck: shop.layoutCheck.bind(shop),
});

function updateStatus() {
  const s = useGame.getState();
  const inside = world.buildings.find((b) => b.contains(player.position.x, player.position.z));
  const location = inside ? inside.opts.name : 'Ngoài đường';
  if (s.buildMode) {
    // Gợi ý do chế độ xây quản lý
    if (!s.placing && s.hint !== null) useGame.setState({ hint: null });
    if (location !== s.location) useGame.setState({ location });
    return;
  }
  const hint = s.panel ? null : nearestInteractable()?.hint() ?? null;
  if (location !== s.location || hint !== s.hint) useGame.setState({ location, hint });
}

let reminderSlot = -1;
// Tự co giãn độ phân giải theo FPS + bóng đổ cập nhật 30 hình/giây
initLightPool(scene, LOW_POWER ? 4 : 8);
const resScale = new AdaptiveResolution(renderer);
renderer.shadowMap.autoUpdate = false;
let frameNo = 0;
// Mảng người dùng lại mỗi khung cho updateDoor (không cấp phát mảng mới mỗi khung)
const peopleScratch: THREE.Vector3[] = [];
// Cờ giao hàng: chỉ tính lại khi danh sách đơn thay đổi
let lastPhoneOrders: GameState['phoneOrders'] | null = null;
const waitingHouses = new Set<string>();

const clock = new THREE.Clock();

/** Vòng lặp một khung hình — WebGPU cần renderer.init() xong mới được render nên tách ra riêng. */
function renderFrame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const state = useGame.getState();
  if (!playing()) {
    // Màn đăng nhập: thị trấn làm phông nền, camera lượn chậm quanh tiệm
    controller.follow = null;
    controller.yaw += dt * 0.06;
  } else {
    // Bảng tổng kết hoặc hội thoại cốt truyện đang mở thì dừng thời gian
    const speed = state.panel?.type === 'summary' || state.biz.chapterPending ? 0 : state.speed;
    const guest = isGuest();
    // Người vào phòng không tự chạy mô phỏng: giờ, khách, nhân viên đều do chủ phòng gửi sang
    if (speed && !guest) state.tick(dt);
    if (!guest) {
      runRoutine();
      checkChapters();
      // Mỗi 2 giờ trong game lúc tiệm mở: nhắc hàng sắp hết, sắp hỏng
      const slot = Math.floor(state.minutes / 120);
      if (state.shopOpen && slot !== reminderSlot) stockReminders();
      reminderSlot = slot;
    }

    const moving = (speed > 0 || guest) && !state.panel && player.update(dt, controller.yaw);
    if (moving) controller.follow = player.position;
    autoBreakfast();
    if (!guest) {
      staff.update(dt * speed, nearCounter());
      customers.update(dt * speed, (counter) =>
        Math.max(playerAt(counter) || partnerAt(counter) ? (hasSkill(useGame.getState().skills, 'quick_hands') ? 1.2 : 1) : 0, staff.cashierSpeed(counter))
        * (hasUpgrade(useGame.getState().biz, 'pos') ? 1.5 : 1));
    }
    if (!guest) residents.update(dt * speed);
    // Cửa hàng tiện lợi: chỉ dựng nhân vật khi chủ ghé; chủ đứng trong tiệm thì tự bán được khi thiếu thu ngân
    if (!guest) branchVisit.update(dt * speed, player.position);
    const atBranch = world.convenience.contains(player.position.x, player.position.z);
    if (atBranch !== state.atBranch) useGame.setState({ atBranch });
    updateCoop(dt);
    updateStatus();
  }

  bizView.update(dt);
  controller.update(dt);
  const g = useGame.getState();
  const sky = skyAt(g.weatherSeed, g.day, g.weather, g.minutes);
  lighting.update(g.minutes, sky, controller.target, dt);
  // Âm thanh môi trường: mưa nền theo cường độ, sấm đánh khi có giông
  setRain(sky.rain);
  if (sky.thunder) playSfx('thunder');
  // Bước vào nhà / tiệm thì chuyển sang cảnh bên trong
  // (đang ở trong thì phải ra khỏi cửa một chút mới tính là ra, đỡ chớp khi đứng ngay ngưỡng cửa)
  const { x, z } = player.position;
  const at = !playing() ? null
    : interior.current && world.buildings.includes(interior.current) && interior.current.contains(x, z, 0.4) ? interior.current
    : world.buildings.find((b) => b.contains(x, z)) ?? null;
  interior.update(dt, at);
  // Đèn trong nhà + đèn đường: bật từ chập tối (17h), tắt trước khi trời sáng hẳn (5h30).
  // Nhớ đủ: chủ thường thức dậy 6h — nếu tắt muộn hơn thì đèn còn sáng lửng giữa trời sáng,
  // vừa chói vừa thấy đèn bật–tắt khi đi lại.
  const hour = (useGame.getState().minutes / 60) % 24;
  const lamp = THREE.MathUtils.clamp(Math.max(hour - 17, 5.5 - hour), 0, 1);
  // Danh sách người dùng lại mỗi khung (không cấp phát mảng mới): cửa tự mở khi ai đó lại gần
  peopleScratch.length = 0;
  peopleScratch.push(player.position);
  for (const c of customers.customers) peopleScratch.push(c.position);
  for (const w of staff.workers.values()) peopleScratch.push(w.position);
  for (const p of partnerPositions()) peopleScratch.push(p);
  for (const p of branchVisit.people) peopleScratch.push(p);
  // Cờ giao hàng: chỉ tính lại khi danh sách đơn đổi, không lọc lại Set mỗi khung
  if (g.phoneOrders !== lastPhoneOrders) {
    lastPhoneOrders = g.phoneOrders;
    waitingHouses.clear();
    for (const o of g.phoneOrders) if (o.status === 'carrying') waitingHouses.add(o.houseId);
  }
  const bob = Math.sin(performance.now() / 300) * 0.12;
  for (const [id, h] of world.houses) {
    h.marker.visible = waitingHouses.has(id);
    const box = h.marker.getObjectByName('box');
    if (box) {
      box.position.y = 1.85 + bob;
      box.rotation.y += dt * 1.5;
    }
  }
  for (const b of world.buildings) {
    b.updateView(camera, b === interior.current);
    b.setLamp(lamp);
    b.updateDoor(dt, peopleScratch);
  }
  // Đèn đường bật cùng giờ với đèn trong nhà; nguồn sáng thật chỉ dành cho đèn gần chỗ nhìn
  world.streetLamps.update(lamp);
  applyLightBudget(controller.target);
  // Bóng đổ cập nhật 30 hình/giây là đủ (nắng di chuyển chậm): tiết kiệm một nửa vệt vẽ bóng
  if ((frameNo++ & 1) === 0) renderer.shadowMap.needsUpdate = true;
  resScale.update(dt);

  renderer.render(scene, camera);
}

// WebGPU khởi tạo bất đồng bộ (xin device từ GPU): xong xuôi mới bắt đầu vẽ khung đầu tiên
// Các góc đứng phủ kín thành phố: compileAsync chỉ biên dịch những gì camera thấy,
// nên đặt camera lần lượt từng khu để nạp sẵn pipeline — tới đâu cũng không khựng nữa.
const PRECOMPILE_AREAS: [number, number, number, number, number, number][] = [
  [4, 8, 14, 4, 0, 0],       // tiệm + quầy + mặt tiền
  [4, 6, -8, 4, 0, -4],      // nhìn vào kệ trong tiệm
  [-1, 10, 8, 0, 0, 2],      // đường chính + vỉa hè giữa
  [-26, 8, 6, -24, 0, -2],   // dãy nhà hàng xóm phía tây
  [28, 8, 6, 26, 0, -2],     // dãy nhà hàng xóm phía đông
  [60, 8, -46, 60, 0, -60],  // tiện lợi 24/7
  [50, 6, -22, 50, 0, -32],  // hẻm dọc
  [-12, 6, 6, -12, 0, -2],   // nhà của bạn
];
const precompileCamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 120);
const precompile = async () => {
  const r = renderer as GameRenderer & {
    compileAsync?: (s: THREE.Scene, c: THREE.Camera) => Promise<unknown>;
  };
  if (!r.compileAsync) return;
  for (const [x, y, z, lx, ly, lz] of PRECOMPILE_AREAS) {
    precompileCamera.position.set(x, y, z);
    precompileCamera.lookAt(lx, ly, lz);
    precompileCamera.updateMatrixWorld();
    try {
      await r.compileAsync(scene, precompileCamera);
    } catch {
      return; // backend không hỗ trợ (WebGL cũ) thì thôi, không thử lại
    }
  }
};
void (renderer.init ? renderer.init() : Promise.resolve()).then(() => {
  renderer.setAnimationLoop(renderFrame);
  void precompile();
});

function App() {
  const screen = useSession((s) => s.screen);
  return screen === 'game' ? <Hud /> : <LoginScreen />;
}

// Nạp bản lưu từ IndexedDB trước khi hiện màn đăng nhập (màn này đọc bản lưu đồng bộ)
initSaves().finally(() => createRoot(document.getElementById('ui')!).render(<App />));

// Để debug trong console khi chạy dev
if (import.meta.env.DEV) {
  Object.assign(window, { game: { player, world, controller, grid, useGame, customers, buildMode, staff, renderer, scene, lighting } });
  import('./dev/autoplay').then(({ createAutoplay }) =>
    Object.assign((window as unknown as { game: object }).game, { autoplay: createAutoplay(shop, customers, staff, player) }),
  );
  import('./dev/playtest').then(({ createPlaytest }) =>
    Object.assign((window as unknown as { game: object }).game, { playtest: createPlaytest(shop, customers, staff, player) }),
  );
}
