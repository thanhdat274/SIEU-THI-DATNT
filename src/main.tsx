import { loadStories } from './data/biz';
import { skyAt } from './data/weather';
import { isMarketDay } from './data/chophien';
import { isRoadworks } from './data/roadwork';
import { isFestivalDeco } from './data/festivalDeco';
import { queueUrgency, accumulateBackup } from './world/storefrontWaitLamp';
import { ANIMAL_ORDER, type AnimalKind } from './data/garden';
import * as THREE from 'three';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { shopLayout, worldActions } from './core/actions';
import { initSaves, saveGame, startAutosave } from './core/save';
import { formatClock, SLEEP_FROM, useGame, type GameState } from './core/store';
import { newRoutineMarks, planRoutine } from './core/routine';
import { vehicleDef } from './data/biz';
import { checkChapters, eatBreakfast, stockReminders } from './core/biz';
import { hasSkill } from './data/titles';
import { furnitureDef, isCookStation } from './data/furniture';
import { initAudio, playSfx, setAmbience, setRain } from './core/audio';
import { hasUpgrade } from './data/upgrades';

// Trình duyệt chỉ mở tiếng sau tương tác đầu tiên — mỗi cú click là một cơ hội khởi động AudioContext
window.addEventListener('pointerdown', initAudio);
import { BuildMode } from './shop/buildMode';
import type { Counter } from './shop/groceryShop';
import { askPending } from './core/counterAsk';
import { CustomerManager } from './agents/customers';
import { Player } from './agents/player';
import { StaffManager } from './agents/staff';
import { ResidentManager } from './agents/residents';
import { BranchVisit } from './agents/branchVisit';
import { BizView } from './render/bizView';
import { CameraController } from './render/cameraController';
import { InteriorView } from './render/interiorView';
import { createRenderer, GFX_CHOICE, INITIAL_GFX, installRenderGuard, Lighting, LOW_POWER, type GameRenderer } from './render/scene';
import { GFX_LABEL, GFX_PRESETS, QualityGovernor, detectLevel, gfxStatus, onGfxChoice, readDeviceHints, readPerfLog, recordPerf, reportGfx, type GfxChoice } from './render/graphicsQuality';
import { applyCrowdLod } from './agents/walker';
import { createTiltShift } from './render/fx/tiltShift';
import { applyLightBudget, initLightPool } from './render/lightBudget';
import { NavGrid } from './world/navGrid';
import { createWorld } from './world/world';
import { tiemXoiStandState } from './data/tiemXoi';
import { quanNuocStandState, quanPatrons, quanTierOf } from './data/quanNuoc';
import { menuBoardLines } from './data/quanRecipes';
import { QUAN_HOUSE, quanHouseBoxes } from './world/quanNuocStand';
import { branchStandState, LANE_X } from './data/branches';
import { Hud, tutorialActive, tutorialStep } from './ui/Hud';
import './ui/controls.css';
import { LoginScreen } from './ui/LoginScreen';
import { pushCloudSave } from './net/cloud';
import { cancelSleep, checkpoint, inAlley, initCoop, isGuest, partnerPositions, updateCoop } from './net/coop';
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
// Guard mất ngữ cảnh render (GĐ175): máy hết VRAM/driver reset/mobile ẩn tab lâu — hiện dải
// cảnh báo trong UI (UiBoundary khống chế) thay vì màn hình đen im lặng.
let lossNotified = false;
installRenderGuard(renderer, (message) => {
  if (lossNotified) return;
  lossNotified = true;
  console.error('[render]', message);
  useGame.getState().notify(message);
  // Mất context đôi khi three tự dựng lại được (WebGL): 8 giây sau cho phép báo lại nếu tái diễn
  setTimeout(() => (lossNotified = false), 8000);
});
const controller = new CameraController(camera, renderer.domElement);
const lighting = new Lighting(scene);
// Tilt-shift: mép trên/dưới mờ nhẹ cho cảnh như mô hình thu nhỏ. Mặc định bật trên máy tính,
// tắt trên điện thoại (tốn thêm 1 lượt vẽ toàn màn hình); `?tilt=on|off` để chọn tay, nhớ cho lần sau.
const tiltPick = new URLSearchParams(location.search).get('tilt');
let tiltSaved: string | null = null;
try {
  if (tiltPick) localStorage.setItem('tilt', tiltPick);
  tiltSaved = localStorage.getItem('tilt');
} catch { /* chế độ ẩn danh */ }
const tiltChoice = tiltPick ?? tiltSaved;
const tiltShift = (tiltChoice ? tiltChoice === 'on' : !LOW_POWER) ? createTiltShift(renderer, scene, camera) : null;
// Lưới đi bộ phủ cả mặt đất 160×160 (±80m) để đi bộ tới được cửa hàng tiện lợi 24/7 (x=60, z=-64)
const grid = new NavGrid(80);
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
void loadStories(); // GĐ336: chuyện khách quen nạp lười ngay sau khi vào game
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
  // Máy này vừa được giao quyền chạy tiệm (thăng cấp từ khách): routineMarks/lastMinutes là
  // biến cục bộ, lúc còn là khách không chạy runRoutine nên có thể mang giá trị cũ — reset lại
  // để lịch tự động (mở/đóng cửa) chạy đúng từ trạng thái mới.
  if (s.coop?.role === 'runner' && prev.coop?.role !== 'runner') {
    routineMarks = newRoutineMarks();
    lastMinutes = useGame.getState().minutes;
  }
  if (s.screen === 'game' && prev.screen !== 'game') {
    controller.follow = player.position;
    // Lúc này save đã nạp xong, tiệm đã bày hàng: nạp trước nốt pipeline cho hàng hóa trong tiệm
    precompile();
    if (!isGuest()) useGame.getState().notify(`🏪 Ngày ${useGame.getState().day} · chúc buôn may bán đắt!`);
  }
});

// Bấm chuột (không kéo) chỉ dùng cho chế độ xây; nhân vật đi bằng phím hoặc cần điều khiển.
// Trên màn cảm ứng, chạm ngắn lên mặt đất = đi tới đó (kéo dài vẫn là pan camera).
const _tapRay = new THREE.Raycaster();
const _tapNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _tapHit = new THREE.Vector3();
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button === 2 && controller.dragged <= 6 && useGame.getState().placing) buildMode.cancel();
  if (e.button !== 0 || controller.dragged > 6 || !playing()) return;
  buildMode.click(e);
  // Chạm ngắn trên điện thoại để đi tới chỗ đó (đang xây/đang đặt đồ thì không chiếm)
  const s = useGame.getState();
  if (e.pointerType === 'touch' && !s.buildMode && !s.placing && !player.asleep) {
    const rect = renderer.domElement.getBoundingClientRect();
    _tapNdc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    _tapRay.setFromCamera(_tapNdc, camera);
    if (_tapRay.ray.intersectPlane(_groundPlane, _tapHit)) {
      _tapHit.x = THREE.MathUtils.clamp(_tapHit.x, -80, 80);
      _tapHit.z = THREE.MathUtils.clamp(_tapHit.z, -80, 80);
      player.walkTo(_tapHit.clone());
    }
  }
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
// Hẻm online: thành viên khác đứng quầy cũng được khách hỏi (mặc cả/ghi sổ) như chơi đơn — câu hỏi hiện cho cả hẻm
customers.playerAtCounter = (counter) => playerAt(counter) || partnerAt(counter);

/** Chỗ đứng khi tới tiệm: sau quầy chính, tính tiền được ngay. */
const shopSpot = () => shop.counters()[0].cashier;
/** Đi nhanh (xe ôm) mất chừng này phút trong game; trang trại ở cuối đường thứ hai nên xa hơn. */
const TRAVEL_MINUTES: Record<'shop' | 'ranch', number> = { shop: 10, ranch: 15 };

worldActions.travel = (to) => {
  const s = useGame.getState();
  if (!playing() || s.buildMode) return;
  const spot = to === 'shop' ? shopSpot() : to === 'ranch' ? world.farmSpot.clone() : null;
  if (spot) player.teleport(spot.x, spot.z);
  else wakeUp();
  controller.follow = player.position;
  // Ở hẻm online đồng hồ là chung: một người đi lại không được tua giờ của cả hẻm
  const travel = to === 'home' ? 0 : inAlley() ? 0 : Math.round(TRAVEL_MINUTES[to] * (vehicleDef(s.biz.vehicle)?.travel ?? 1));
  // Cập nhật location ngay để UI phản hồi đúng vị trí sau khi di chuyển (đặc biệt quan trọng trong online mode)
  const isShared = world.currentHome === world.sharedHome;
  const location = to === 'shop' ? 'Tạp hóa' : to === 'ranch' ? 'Trang trại đầu ngõ' : (isShared ? 'Nhà chung của hẻm' : 'Nhà của bạn');
  useGame.setState({ minutes: s.minutes + travel, panel: null, location });
  s.notify(to === 'shop' ? '🛵 Đã tới tiệm' : to === 'ranch' ? '🚜 Đã tới trang trại' : '🛵 Đã về nhà');
};

// Trang trại: dựng hình theo bậc đất đang mở và đàn vật nuôi trong chuồng (đổi khi mua / mở rộng)
world.farm.rebuild(useGame.getState().garden.land);
world.farm.setBuildings(useGame.getState().garden.buildings);
world.farm.setPlots(useGame.getState().garden.plots, useGame.getState().day);
let lastFarmLand = useGame.getState().garden.land;
let lastPenCounts: Partial<Record<AnimalKind, number>> = {};
let lastFarmBuildings = useGame.getState().garden.buildings;
let lastPlots = useGame.getState().garden.plots;
let lastFarmDay = useGame.getState().day;
const syncFarmAnimals = (s: ReturnType<typeof useGame.getState>) => {
  for (const kind of ANIMAL_ORDER) {
    const n = s.garden.pens[kind]?.count ?? 0;
    if (n !== lastPenCounts[kind]) {
      lastPenCounts[kind] = n;
      world.farm.setAnimals(kind, n);
    }
  }
};
syncFarmAnimals(useGame.getState());
useGame.subscribe((s) => {
  if (s.garden.land !== lastFarmLand) {
    lastFarmLand = s.garden.land;
    world.farm.rebuild(s.garden.land);
    world.farm.setPlots(s.garden.plots, s.day);
  }
  if (s.garden.buildings !== lastFarmBuildings) {
    lastFarmBuildings = s.garden.buildings;
    world.farm.setBuildings(s.garden.buildings);
  }
  // Cây trên luống đổi khi trồng/tưới/thu hoạch hoặc sang ngày (đổi màu đất tưới)
  if (s.garden.plots !== lastPlots || s.day !== lastFarmDay) {
    lastPlots = s.garden.plots;
    lastFarmDay = s.day;
    world.farm.setPlots(s.garden.plots, s.day);
  }
  syncFarmAnimals(s);
});

// Quán nước đầu hẻm: khoảnh đất hiện khi đủ cấp (29) chưa mua, dựng quầy khi đã mở; bật số bàn ghế
// theo nhân viên (setStaff chỉ chạy khi staff đổi — tránh gán lại mỗi khung). Đồng bộ như pattern farm:
// chạy một lần ngay sau khi tạo world, rồi qua subscribe khi cấp / trạng thái quán đổi.
let lastStandStaff = -1;
let lastStandLevel = 0;
let lastStandOpen = false;
let lastStandLast: unknown = null;
let lastStandTier: number | undefined;
let lastStandMenu: string | null = null;
let lastStandWalls = false;
const syncQuanNuocStand = () => {
  const s = useGame.getState();
  const st = quanNuocStandState(s.level, s.biz.quanNuoc.open);
  world.quanNuoc.lot.visible = st === 'lot';
  world.quanNuoc.stand.visible = st === 'open';
  world.kit.setQuanDecor(st === 'open');
  // GĐ425: nhà quán nước chặn lưới đi lại khi đã mở (chỉ vào qua cửa); đổi trạng thái thì dựng lại lưới
  if ((st === 'open') !== lastStandWalls) {
    lastStandWalls = st === 'open';
    const p = world.quanNuoc.group.position;
    grid.setStatic('quanNuoc', lastStandWalls ? quanHouseBoxes(p.x, p.z) : []);
    shop.attachGrid(grid);
  }
  if (s.biz.quanNuoc.staff !== lastStandStaff) {
    lastStandStaff = s.biz.quanNuoc.staff;
    world.quanNuoc.setStaff(s.biz.quanNuoc.staff);
  }
  world.quanNuoc.setTier(quanTierOf(s.biz.quanNuoc));
  world.quanNuoc.setPatrons(quanPatrons(s.biz.quanNuoc.staff, s.biz.quanNuocLast?.served));
  const menuKey = (s.biz.quanNuoc.menu ?? []).join();
  if (menuKey !== lastStandMenu) {
    lastStandMenu = menuKey;
    world.quanNuoc.setMenu(menuBoardLines(s.biz.quanNuoc.menu));
  }
};
syncQuanNuocStand();
useGame.subscribe((s) => {
  if (s.level !== lastStandLevel || s.biz.quanNuoc.open !== lastStandOpen || s.biz.quanNuoc.staff !== lastStandStaff || (s.biz.quanNuoc.menu ?? []).join() !== lastStandMenu || s.biz.quanNuocLast !== lastStandLast || s.biz.quanNuoc.tier !== lastStandTier) {
    lastStandTier = s.biz.quanNuoc.tier;
    lastStandLast = s.biz.quanNuocLast;
    lastStandLevel = s.level;
    lastStandOpen = s.biz.quanNuoc.open;
    syncQuanNuocStand();
  }
});

// Tiệm xôi 3D (GĐ430): biển đất khi đủ cấp, sạp xôi khi đã mở. Tải lười (cấp 40 mới cần), đặt phía tây
// hẻm đối diện quán nước, chỉ hình ảnh, không chặn lưới.
let tiemXoiStand: import('./world/tiemXoiStand').TiemXoiStand | null = null;
let tiemXoiLoading = false;
const syncTiemXoi = () => {
  const s = useGame.getState();
  const st = tiemXoiStandState(s.level, !!s.biz.tiemXoi?.open);
  if (!tiemXoiStand) {
    if (st !== 'hidden' && !tiemXoiLoading) {
      tiemXoiLoading = true;
      void import('./world/tiemXoiStand').then((m) => {
        tiemXoiStand = m.createTiemXoiStand();
        tiemXoiStand.group.position.set(LANE_X - 4, 0, 1);
        scene.add(tiemXoiStand.group);
        syncTiemXoi();
      });
    }
    return;
  }
  tiemXoiStand.lot.visible = st === 'lot';
  tiemXoiStand.stall.visible = st === 'open';
  tiemXoiStand.setCooks(1 + (s.biz.tiemXoi?.staff ?? 0));
};
syncTiemXoi();
useGame.subscribe(syncTiemXoi);

// Cửa hàng tiện lợi theo trạng thái sở hữu (GĐ26): mảnh đất RAO BÁN khi đủ cấp chưa mua, toà nhà +
// biển "ĐÓNG CỬA" khi đã mua, biển "MỞ CỬA 24/7" khi đang mở. Toà nhà cửa hàng tiện lợi (convenience)
// là của chính nó, không chạm vào thế giới; chỉ bật/ẩn theo `branchStandState` trong subscribe.
let lastBranchLevel = 0;
let lastBranchBought: boolean | null = null;
let lastBranchOpen: boolean | null = null;
const syncBranchStand = () => {
  const s = useGame.getState();
  const st = branchStandState(s.level, !!s.branch, s.branch?.open ?? false);
  world.convenience.group.visible = st === 'closed' || st === 'open';
  world.branchStand.lot.visible = st === 'lot';
  world.branchStand.openSign.visible = st === 'open';
  world.branchStand.closedSign.visible = st === 'closed';
};
syncBranchStand();
useGame.subscribe((s) => {
  const bought = !!s.branch;
  const open = s.branch?.open ?? false;
  if (s.level !== lastBranchLevel || bought !== lastBranchBought || open !== lastBranchOpen) {
    lastBranchLevel = s.level;
    lastBranchBought = bought;
    lastBranchOpen = open;
    syncBranchStand();
  }
});

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
 * Lịch tự động: chạy khi đồng hồ vượt qua mỗi mốc (kể cả khi tua 3×/8×).
 * Người chơi vẫn tự đóng/mở cửa, đi lại được; lịch chỉ làm việc chưa làm.
 * Mốc giờ xét theo trạng thái (đã qua giờ chưa) chứ không chỉ "vừa vượt mốc" — xem core/routine.ts.
 */
let lastMinutes = useGame.getState().minutes;
// Ngày gần nhất đã áp cảnh chợ phiên cho kit (gđ181): chỉ đổi khi isMarketDay(day) thay đổi
let lastMarketDay = isMarketDay(useGame.getState().day);
// Hôm nay có sửa đường trước hẻm không (gđ184): đổi cảnh rào chắn khi sự kiện market roadworks thay đổi
let lastRoadwork = isRoadworks(useGame.getState().weatherSeed, useGame.getState().day, useGame.getState().level);
let lastFestival = isFestivalDeco(useGame.getState().day);
// GĐ186 "sắp mất khách": đếm thời lượng game mà quầy có ~BACKUP_WAITING khách đợi trở lên (0 khi dừng)
let lastUrgMinutes = useGame.getState().minutes;
let backedUpGameSec = 0;
let routineMarks = newRoutineMarks();
function runRoutine() {
  const s = useGame.getState();
  const prev = lastMinutes;
  lastMinutes = s.minutes;
  // Đồng hồ lùi (ngủ dậy, nạp bản lưu) thì khung hình này không xét mốc nào. Lùi nhiều (qua đêm,
  // đổi bản lưu) thì bỏ mốc cũ để lịch chạy lại đúng theo ngày/giờ mới.
  if (s.minutes <= prev) {
    if (prev - s.minutes > 120) routineMarks = newRoutineMarks();
    return;
  }
  const atShop = s.location === shop.building.opts.name;
  const todo = planRoutine({
    day: s.day, minutes: s.minutes, autoRoutine: s.autoRoutine, autoOpenAt: s.autoOpenAt, atShop, shopOpen: s.shopOpen,
  }, routineMarks);
  routineMarks = todo.marks;

  if (todo.walkToShop) {
    player.walkTo(shopSpot());
    controller.follow = player.position;
    s.notify(`🚶 ${formatClock(s.minutes)} · Ra tiệm chuẩn bị mở cửa`);
  }
  if (todo.openShop) {
    // Tua nhanh thì đi bộ không kịp giờ mở cửa: tới thẳng quầy để không bỏ khách đứng chờ
    if (!atShop) {
      const spot = shopSpot();
      player.teleport(spot.x, spot.z);
      controller.follow = player.position;
    }
    if (!s.shopOpen) s.toggleShop();
  }
  if (todo.closeShop && s.shopOpen) s.toggleShop();
  if (todo.goHome) {
    if (todo.stocktake) s.notify(stocktake());
    // Về nhà từ bất cứ đâu (trong tiệm, ngoài đường, trang trại...), không chỉ khi đang đứng trong tiệm.
    // Đi bộ theo nhịp đồng hồ game nên tua 3×/8× vẫn về tới nhà trong cùng số phút như 1×.
    if (player.position.distanceTo(wakeSpot) > 2) {
      player.walkTo(wakeSpot.clone());
      controller.follow = player.position;
    }
  }
}

/** Quầy, kệ và tủ thay đổi khi xây dựng / mở rộng tiệm, nên tính lại mỗi lần. */
const fixedInteractables: Interactable[] = [
  { position: bedPos, radius: 2, hint: () => (player.asleep ? (inAlley() ? '💤 Chờ cả hẻm ngủ... [N] Dậy' : '💤 Đang ngủ...') : '[N] Đi ngủ'), key: 'KeyN', action: goToBed },
  // Trang trại nam đường thứ hai: đứng cạnh cổng bấm V mở bảng trại (trồng, tưới, thu hoạch, cho gà ăn)
  { position: world.farmSpot, radius: 4, hint: () => '[V] Trang trại', key: 'KeyV', action: () => useGame.getState().openPanel({ type: 'garden' }) },
  // Giếng nước trong trại: tưới nhanh tất cả luống không cần mở bảng
  // GĐ432 cửa hàng nước: đứng sau quầy pha bấm P tự pha một mẻ (B4 "tự đứng quầy")
  { position: world.quanNuoc.group.position.clone().add(new THREE.Vector3(QUAN_HOUSE.x, 0, QUAN_HOUSE.z - 0.9)), radius: 1.6,
    hint: () => (useGame.getState().biz.quanNuoc.open ? '[P] Tự pha 5 ly ở quầy' : 'Quán nước chưa mở'), key: 'KeyP', action: () => { useGame.getState().brewQuanHand(); } },
  // GĐ435: trước sạp tiệm xôi (x=46, z≈2.4) bấm J mở bảng quán nước — nơi có mục tiệm xôi
  { position: new THREE.Vector3(LANE_X - 4, 0, 2.4), radius: 1.8,
    hint: () => (useGame.getState().biz.tiemXoi?.open ? (useGame.getState().biz.tiemXoi.handDay === useGame.getState().day ? '[J] Xem tiệm xôi (hôm nay đã đồ)' : '[J] Tự đồ một mẻ xôi') : useGame.getState().level >= 40 ? '[J] Mở tiệm xôi' : ''), key: 'KeyJ',
    action: () => {
      const g = useGame.getState();
      if (g.biz.tiemXoi?.open && g.biz.tiemXoi.handDay !== g.day) g.steamXoiHand();
      else if (g.biz.tiemXoi?.open) g.openPanel({ type: 'quannuoc' });
      else if (g.level >= 40) g.openPanel({ type: 'quannuoc' });
    } },
  { position: world.farm.wellSpot, radius: 2.6, hint: () => '[T] Tưới luống từ giếng', key: 'KeyT', action: () => useGame.getState().waterGarden() },
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
  if (player.asleep) {
    // Ở hẻm: đang nằm chờ người khác thì được dậy (rút phiếu ngủ)
    if (inAlley()) {
      cancelSleep();
      player.standUp();
    }
    return;
  }
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

/** Tự lau nhà: đứng trong tiệm bấm C (giữ để lau liên tục), mỗi lần bớt một ít bẩn. */
const DIRT_PER_MOP = 5;
function mopFloor() {
  const s = useGame.getState();
  if (s.panel || s.buildMode || !playing() || player.asleep) return;
  if (s.location !== shop.building.opts.name) return void s.notify('🧹 Vào trong tiệm mới lau nhà được');
  if (s.dirt < 1) return void s.notify('✨ Sàn tiệm đã sạch bong');
  s.addDirt(-DIRT_PER_MOP);
  const left = useGame.getState().dirt;
  if (left < 1) s.notify('✨ Lau xong rồi, sàn tiệm sạch bong');
}

function interact() {
  const st = useGame.getState();
  if (st.panel || st.buildMode || !playing()) return;
  nearestInteractable()?.action();
}

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest?.('input, textarea')) return;
  // Phím O: đóng / mở cửa tiệm ở bất cứ đâu
  if (e.code === 'KeyO') {
    const st = useGame.getState();
    if (!st.panel && !st.buildMode && playing()) st.toggleShop();
    return;
  }
  if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) {
    mopFloor();
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
  mop: mopFloor,
  rotate: () => buildMode.rotate(),
  place: () => buildMode.confirm(),
  cancel: () => buildMode.cancel(),
});

Object.assign(shopLayout, {
  plan: () => shop.plan(),
  check: shop.quickCheck.bind(shop),
  layoutCheck: shop.layoutCheck.bind(shop),
  checkMainCounter: shop.checkMainCounter.bind(shop),
});

function updateStatus() {
  const s = useGame.getState();
  const inside = world.buildings.find((b) => b.contains(player.position.x, player.position.z));
  // Trang trại không có tòa nhà: đứng gần cổng là coi như đang ở trại (nút đi lại hiện "Về nhà")
  const nearFarm = !inside && player.position.distanceTo(world.farmSpot) < 12;
  const location = inside ? inside.opts.name : nearFarm ? 'Trang trại đầu ngõ' : 'Ngoài đường';
  if (s.buildMode) {
    // Gợi ý do chế độ xây quản lý
    if (!s.placing && s.hint !== null) useGame.setState({ hint: null });
    if (location !== s.location) useGame.setState({ location });
    return;
  }
  const hint = s.panel ? null : nearestInteractable()?.hint() || null;
  if (location !== s.location || hint !== s.hint) useGame.setState({ location, hint });
}

let reminderSlot = -1;
// Mức đồ họa + bộ tự hạ nhiều tầng (độ nét → bóng → đám đông → đồ trang trí); bóng cập nhật 30 hình/giây
initLightPool(scene, GFX_PRESETS[INITIAL_GFX].lightPool);
const nativeDpr = window.devicePixelRatio || 1;
let gfxChoice: GfxChoice = GFX_CHOICE;
let gfx = new QualityGovernor(INITIAL_GFX, nativeDpr, gfxChoice === 'auto');
/** Đã báo "tự giảm đồ họa" trong phiên này chưa — chỉ báo một lần, không làm phiền. */
let gfxNotified = false;
let lastPerfDay = -1;
function applyGfx() {
  const p = gfx.preset;
  renderer.setPixelRatio(gfx.step.pixelRatio);
  // Không đổi castShadow lúc chạy: đổi là mọi vật liệu biên dịch lại pipeline → đứng hình vài giây.
  // Đã dựng có bóng thì chỉ làm mờ hẳn bóng + ngừng vẽ shadow pass (vòng render đọc preset.shadows);
  // dựng không bóng (mức Thấp) thì bật bóng phải chờ tải lại trang.
  if (lighting.sun.castShadow) lighting.sun.shadow.intensity = p.shadows ? 1 : 0;
  world.kit.setDecor(p.decor);
  reportGfx(gfxChoice, gfx.step.level, gfx.avgFps);
}
applyGfx();
onGfxChoice((c) => {
  gfxChoice = c;
  const level = c === 'auto' ? detectLevel(readDeviceHints()) : c;
  gfx = new QualityGovernor(level, nativeDpr, c === 'auto');
  applyGfx();
  useGame.getState().notify(`🎨 Đồ họa: ${GFX_LABEL[c]}. Bóng, mưa, mây đổi hẳn sau khi tải lại trang.`);
});
renderer.shadowMap.autoUpdate = false;
let frameNo = 0;
// Mảng người dùng lại mỗi khung cho updateDoor (không cấp phát mảng mới mỗi khung)
const peopleScratch: THREE.Vector3[] = [];
// Cờ giao hàng: chỉ tính lại khi danh sách đơn thay đổi
let lastPhoneOrders: GameState['phoneOrders'] | null = null;
const waitingHouses = new Set<string>();

// Marker hướng dẫn ngày đầu (bước "Đứng quầy"): đĩa và vòng vàng phát sáng trên sàn ngay chỗ
// đứng sau quầy chính. Tạo một lần như marker giao hàng, chỉ hiện/ẩn theo điều kiện — không dựng
// lại nên không có gì phải dọn dẹp.
const tutorialMarker = new THREE.Group();
const tutorialDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.42, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc107, transparent: true, opacity: 0.28, depthWrite: false }),
);
const tutorialRing = new THREE.Mesh(
  new THREE.RingGeometry(0.42, 0.6, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc107, transparent: true, opacity: 0.9, depthWrite: false }),
);
tutorialDisc.rotation.x = tutorialRing.rotation.x = -Math.PI / 2;
tutorialDisc.position.y = tutorialRing.position.y = 0.03;
tutorialMarker.add(tutorialDisc, tutorialRing);
tutorialMarker.visible = false;
scene.add(tutorialMarker);

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
    // Bảng tổng kết hoặc hội thoại cốt truyện đang mở thì dừng thời gian; có câu hỏi ở quầy
    // cũng dừng — khách đứng chờ chủ quyết định, không đếm ngược vội (GĐ102: ở 8× cửa sổ 15 phút
    // game chỉ còn ~1 giây thực, người chơi không kịp đọc là cơ hội rơi hết vào chọn hộ).
    // Ở hẻm bảng tổng kết và hội thoại cốt truyện không dừng giờ: một người đọc tổng kết không bắt cả hẻm đứng chờ
    const speed = (state.panel?.type === 'summary' && !inAlley()) || (state.biz.chapterPending && !inAlley()) || askPending() ? 0 : state.speed;
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

    // Tua 3×/8×: nhân vật đi bộ vẫn cùng nhịp đồng hồ game (đường tự động của lịch), còn người
    // chơi tự bấm phím thì đi tốc độ thật — xem Player.update.
    const moving = (speed > 0 || guest) && !state.panel && player.update(dt, controller.yaw, speed);
    if (moving) controller.follow = player.position;
    autoBreakfast();
    if (!guest) {
      staff.update(dt * speed, nearCounter());
      customers.update(dt * speed, (counter) =>
        Math.max(playerAt(counter) || partnerAt(counter) ? (hasSkill(useGame.getState().skills, 'quick_hands') ? 1.2 : 1) : 0, staff.cashierSpeed(counter))
        * (hasUpgrade(useGame.getState().biz, 'pos') ? 1.5 : 1));
    }
    // Bong bóng tiền ở quầy bay theo giờ THỰC: tua 8× vẫn kịp đọc "+12.000đ" trước khi tan
    customers.coinFx.update(dt);
    if (!guest) residents.update(dt * speed);
    // Cửa hàng tiện lợi: chỉ dựng nhân vật khi chủ ghé; chủ đứng trong tiệm thì tự bán được khi thiếu thu ngân
    if (!guest) branchVisit.update(dt * speed, player.position);
    // Gà trong trang trại chỉ đi rong khi chủ ở gần (đứng ở tiệm thì trại đứng yên, đỡ tốn FPS)
    if (player.position.distanceTo(world.farmSpot) < 60) world.farm.update(dt * speed, (state.minutes / 60) % 24);
    // Hẻm online: chỉ máy chạy tính (ai trong hẻm đứng ở chi nhánh cũng tính), máy khách nhận qua state —
    // máy khách tự ghi thì hai máy giành nhau giá trị này mỗi khung hình
    if (!guest) {
      const atBranch = [player.position, ...partnerPositions()].some((p) => world.convenience.contains(p.x, p.z));
      if (atBranch !== state.atBranch) useGame.setState({ atBranch });
    }
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
  setAmbience(hour);
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
    // Chỉ quay/nhấp nhô marker của nhà ĐANG đợi giao — không phí khi không có đơn nào trên đường
    if (waitingHouses.has(id)) {
      const box = h.marker.getObjectByName('box');
      if (box) {
        box.position.y = 1.85 + bob;
        box.rotation.y += dt * 1.5;
      }
    }
  }
  // Quán nước đầu hẻm: hộp 🧋 của khoảnh đất nhấp nhô + xoay đánh mắt khi đang chờ mua (chỉ khoảnh đất hiện)
  if (world.quanNuoc.lot.visible) {
    const mbox = world.quanNuoc.lot.getObjectByName('markerBox');
    if (mbox) {
      mbox.position.y = 2.05 + bob;
      mbox.rotation.y += dt * 1.5;
    }
  }
  // Cửa hàng tiện lợi: marker 🏪 của mảnh đất RAO BÁN nhấp nhô + xoay khi đang chờ mua mặt bằng
  if (world.branchStand.lot.visible) {
    const mbox = world.branchStand.lot.getObjectByName('markerBox');
    if (mbox) {
      mbox.position.y = 2.05 + bob;
      mbox.rotation.y += dt * 1.5;
    }
  }
  // Hướng dẫn ngày đầu tới bước "Đứng quầy": đĩa vàng sáng dìm/nhạt ngay chỗ đứng sau quầy chính,
  // chỉ hiện khi chủ đang ở trong tiệm (toạ độ quầy theo dõi cache của shop nên dời quầy vẫn đúng)
  const tutStep = tutorialActive(g) ? tutorialStep(g) : -1;
  tutorialMarker.visible = tutStep === 3 && g.location === shop.building.opts.name;
  if (tutorialMarker.visible) {
    tutorialMarker.position.copy(shopSpot());
    const glow = 0.55 + Math.sin(performance.now() / 350) * 0.3;
    (tutorialDisc.material as THREE.MeshBasicMaterial).opacity = glow * 0.35;
    (tutorialRing.material as THREE.MeshBasicMaterial).opacity = glow;
  }
  for (const b of world.buildings) {
    b.updateView(camera, b === interior.current);
    b.setLamp(lamp);
    b.updateDoor(dt, peopleScratch);
  }
  // Đèn đường bật cùng giờ với đèn trong nhà; nguồn sáng thật chỉ dành cho đèn gần chỗ nhìn
  world.streetLamps.update(lamp);
  // Đèn lồng cửa tiệm (gđ177): bật sáng ấm chập tối, cùng giờ với đèn đường
  world.storefront.update(lamp);
  // Đèn ấm của riêng người chơi (gđ185): hiên nhà + cổng trại sáng ấm cùng giờ
  world.compoundWarm.update(lamp);
  // Đèn ấm quán nước (gđ187): chỗ khách quen tụ họp cũng ấm chập tối — chỉ khi quán MỞ (có quán thật)
  world.quanNuocWarm.update(lamp, world.quanNuoc.stand.visible);
  // Biển mở/đóng cửa trước tiệm (gđ179): tấm trạng thái đổi màu theo tiệm đang mở/đóng, đung nhẹ khi mở
  world.openSign.update(g.shopOpen, performance.now() / 1000);
  // Đèn báo "khách đang đợi" cạnh cửa (gđ180): sáng ấm khi có khách chờ quầy và tiệm mở
  // GĐ186: cộng thêm mức KHẨN "sắp mất khách" khi hàng đông lâu — nháy nhanh để chủ ghé về quầy
  let urgAdv = g.minutes - lastUrgMinutes;
  if (urgAdv < 0) lastUrgMinutes = g.minutes; // sang ngày đồng hồ về sáng: không tính cục giật
  backedUpGameSec = accumulateBackup(backedUpGameSec, g.waiting ?? 0, Math.max(0, urgAdv) * 60);
  lastUrgMinutes = g.minutes;
  world.waitLamp.update(
    { open: g.shopOpen, waiting: g.waiting ?? 0, urgency: queueUrgency(g.waiting ?? 0, backedUpGameSec) },
    performance.now() / 1000,
  );
  // Chợ phiên (gđ181): 7 ngày một lần gánh hàng dựng thêm dọc hẻm — đổi cảnh một lần theo ngày
  const marketDay = isMarketDay(g.day);
  if (marketDay !== lastMarketDay) {
    lastMarketDay = marketDay;
    world.kit.setMarketDay(marketDay);
    // (GĐ182) Sáng phiên chợ: nhắc để người chơi biết hôm nay đông khách + tối gánh hàng dư
    if (marketDay) g.notify('🛒 Hôm nay có chợ phiên — khách đông! Tối xem "Chợ phiên" để bán bớt hàng dư.');
  }
  // Sửa đường trước hẻm (gđ184): hôm nào có sự kiện market roadworks, dựng rào chắn công trình ở mép vỉa hè —
  // người chơi thấy "đường đang sửa" bằng hình (đồng thời kinh tế ngày vẫn ít khách đi ngang như sim đã tính)
  const roadwork = isRoadworks(g.weatherSeed, g.day, g.level);
  if (roadwork !== lastRoadwork) {
    lastRoadwork = roadwork;
    world.kit.setRoadwork(roadwork);
  }
  // Con hẻm vào dịp (gđ197): hôm nào có lễ hội (Tết, Trung thu, 20/11...), dựng dãy cờ ngang hẻm —
  // kinh tế ngày vẫn đông khách theo sim, cảnh hẻm "vào dịp" hiện ra bằng màu.
  const festival = isFestivalDeco(g.day);
  if (festival !== lastFestival) {
    lastFestival = festival;
    world.kit.setFestival(festival);
  }
  applyLightBudget(controller.target);
  // Bóng đổ cập nhật 30 hình/giây là đủ (nắng di chuyển chậm): tiết kiệm một nửa vệt vẽ bóng; mức Thấp tắt hẳn
  if ((frameNo++ & 1) === 0 && gfx.preset.shadows) renderer.shadowMap.needsUpdate = true;
  applyCrowdLod(controller.target, gfx.preset.npcCap, gfx.preset.animFarDist);
  const prevLevel = gfx.step.level;
  if (gfx.update(dt)) {
    applyGfx();
    if (gfx.step.level !== prevLevel && !gfxNotified && playing()) {
      gfxNotified = true;
      g.notify(`🎨 Máy hơi nặng nên game tự giảm đồ họa xuống "${GFX_LABEL[gfx.step.level]}" cho mượt hơn. Đổi ở ⋯ Thêm → Đồ họa.`);
    }
  } else reportGfx(gfxChoice, gfx.step.level, gfx.avgFps);
  // Nhật ký hiệu năng riêng máy: mỗi ngày game ghi FPS trung bình + mức đang dùng (xem game.perf())
  if (playing() && g.day !== lastPerfDay) {
    if (lastPerfDay >= 0) recordPerf({ day: lastPerfDay, fps: gfx.avgFps, level: gfx.step.level });
    lastPerfDay = g.day;
  }

  if (tiltShift) tiltShift.render();
  else renderer.render(scene, camera);
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
  [24, 8, -60, 24, 0, -72],  // trang trại đầu ngõ
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
  // Ghi ra console đang vẽ bằng gì, trên card nào — để dò khi máy người chơi bị giật
  const backend = (renderer as { backend?: { isWebGPUBackend?: boolean; device?: { adapterInfo?: GPUAdapterInfo } } }).backend;
  const info = backend?.device?.adapterInfo;
  console.warn(`[render] ${backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2'}${info ? ` · ${info.vendor} ${info.architecture} ${info.description}` : ''}`);
});

/** Ranh giới lỗi React: một component sập (vd save schema cũ thiếu field) không được phép trắng
 * cả game — 3D vẫn chạy, chỉ hiện dải nhỏ kèm nút tải lại thay vì mất trắng màn hình. */
class UiBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error, info: { componentStack?: string | null }) {
    console.error('[ui] lỗi giao diện:', err.message, info.componentStack ?? '');
  }
  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 1000,
            background: '#3a3a4d', color: '#fff', border: '1px solid #f1c40f', borderRadius: 10,
            padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, maxWidth: 'min(92vw, 480px)',
            boxShadow: '0 4px 16px rgba(0,0,0,.4)', lineHeight: 1.4,
          }}
        >
          ⚠️ Giao diện gặp lỗi: {this.state.err.message}
          <button
            onClick={() => location.reload()}
            style={{ marginLeft: 10, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f1c40f', fontWeight: 600, cursor: 'pointer' }}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const screen = useSession((s) => s.screen);
  return screen === 'game' ? <Hud /> : <LoginScreen />;
}

// Nạp bản lưu từ IndexedDB trước khi hiện màn đăng nhập (màn này đọc bản lưu đồng bộ)
// Vite hot-reload có thể chạy lại main.tsx: dùng lại root cũ thay vì createRoot lần hai trên cùng container (GĐ403)
const uiEl = document.getElementById('ui') as HTMLElement & { __root?: ReturnType<typeof createRoot> };
initSaves().finally(() => (uiEl.__root ??= createRoot(uiEl)).render(<UiBoundary><App /></UiBoundary>));

// PWA: đăng ký service worker để game cài ra màn hình chính iPhone/iOS
// (chỉ ở bản build/run thật; dev thì tắt để không gây nhiễu khi sửa code)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => { reg.update(); })
      .catch(() => { /* không bắt buộc — chỉ bật được PWA khi server cho phép */ });
  });
}

// Để debug trong console khi chạy dev
if (import.meta.env.DEV) {
  Object.assign(window, { game: { player, world, controller, grid, useGame, customers, buildMode, staff, renderer, scene, lighting, perf: () => ({ ...gfxStatus(), log: readPerfLog() }) } });
  import('./dev/autoplay').then(({ createAutoplay }) =>
    Object.assign((window as unknown as { game: object }).game, { autoplay: createAutoplay(shop, customers, staff, player) }),
  );
  import('./dev/playtest').then(({ createPlaytest }) =>
    Object.assign((window as unknown as { game: object }).game, { playtest: createPlaytest(shop, customers, staff, player) }),
  );
  // GĐ297: soi nút bị CẮT ở mép màn hình — `scrollWidth == clientWidth` không bắt được vì
  // html/body overflow:hidden. QA gọi `game.layoutAudit()` sau mỗi lần đổi cỡ màn.
  import('./dev/layoutAudit').then(({ layoutAudit }) =>
    Object.assign((window as unknown as { game: object }).game, { layoutAudit }),
  );
}
