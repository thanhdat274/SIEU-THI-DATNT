import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Culling/ray';
import { FixedStepSimulationRunner, type GameSimulation } from '@game/core';
import { WAREHOUSE_BOUNDS } from '@game/data';
import type { GameTileMap } from '@game/shared';
import { getDebugVisualTime, getWeatherFxSettings, resolveWeatherQuality, onThunder, type GameViewport, type GameViewportOptions, type MinimapSnapshot, type PlanningOverlay } from '@game/renderer-core';
import { CAMERA_BETA, CAMERA_FOV, cameraGroundViewBounds, groundViewRadius, isoAlpha, pixelToWorld, snapGround, stepZoom, worldToTile, zoomHalfHeight, zoomRadius } from './coords';
import { buildCityMap, type RoofInfo } from './map-builder';
import { Actors3D } from './actors-3d';
import { createActorAtlas, type ActorAtlas } from './actor-atlas';
import { Crowd3D } from './crowd-3d';
import { Characters3D } from './characters-3d';
import { Fixtures3D } from './fixtures-3d';
import { Stock3D } from './stock-3d';
import { Overlay3D } from './overlay-3d';
import { Sky3D } from './sky-3d';
import { Weather3D } from './weather-3d';
import { WorldDecor3D } from './world-decor-3d';
import { Vehicles3D } from './vehicles-3d';
import { TrafficSignals3D } from './traffic-signals-3d';
import { ActorShadows3D } from './actor-shadows-3d';
import { Umbrellas3D } from './umbrellas-3d';
import { ModelLibrary } from './model-library';
import { Logistics3D } from './logistics-3d';
import { lightingAt } from './sky-3d';
import { actorLightTint } from './actor-light';
import { pickTarget, resolveTileTarget, type TileTarget } from './tile-target';
import { ALPHA_HIDDEN, facadeAlpha, OCCLUDER_ALPHA, rayHitsBox, shouldOpenRoof, stepAlpha } from './roof-fade';
import { AdaptiveResolutionController } from './adaptive-resolution';
import { exceedsDragThreshold, isClickRelease } from './pointer-gesture';

/** Chiều cao khung hình "pixel" (px ảo); canvas thật được phóng lên bằng nearest-neighbour. */
const PIXEL_TARGET_HEIGHT = 360;
/** Độ dời chuột (px) vượt qua là kéo (pan) thay vì click — cùng ngưỡng Pixi (viewport-input.ts). */
/** Chiều cao khung viền sáng khi chọn tòa (đơn vị thế giới, cao hơn tường ~1.6 để đọc là viền). */
const SELECTION_FRAME_HEIGHT = 2.0;
/** Màu viền sáng khi chọn tòa (vàng nhạt, phát sáng). */
/** Độ dày thanh viền chọn (đơn vị thế giới). */
const SELECTION_BAR_THICKNESS = 0.08;
const SELECTION_COLOR = new Color3(1, 0.85, 0.25);

/** Renderer 3D (Babylon): bản đồ khối (map-builder), người chơi và bạn co-op dạng sprite pixel, camera iso pixel. */
export class BabylonGameViewport implements GameViewport {
  private readonly canvas: HTMLCanvasElement;
  private tileMap: GameTileMap;
  private readonly simulation: GameSimulation;
  private readonly runner: FixedStepSimulationRunner;
  private readonly onZoomChange?: (zoom: number) => void;
  private readonly onViewBasisChange?: (right: { x: number; y: number }, down: { x: number; y: number }) => void;
  private readonly getPartnerAvatar?: GameViewportOptions['getPartnerAvatar'];
  private readonly onParcelTap?: (parcelId: string) => void;
  private readonly onBuildingSelect?: (buildingId: string | null) => void;

  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;
  private mapMeshes: Mesh[] = [];
  private roofs: RoofInfo[] = [];
  private actors: Actors3D | null = null;
  private crowd: Crowd3D | null = null;
  private characters: Characters3D | null = null;
  private fixtures: Fixtures3D | null = null;
  private stock: Stock3D | null = null;
  private soldOutStalls: readonly string[] = [];
  private overlay: Overlay3D | null = null;
  private sky: Sky3D | null = null;
  private weather: Weather3D | null = null;
  private worldDecor: WorldDecor3D | null = null;
  private vehicles: Vehicles3D | null = null;
  private trafficSignals: TrafficSignals3D | null = null;
  private actorShadows: ActorShadows3D | null = null;
  private umbrellas: Umbrellas3D | null = null;
  private logistics: Logistics3D | null = null;
  private targetPan = { x: 0, z: 0 };
  private pendingPlanning: readonly PlanningOverlay[] = [];
  private pendingWaveOverlay = false;
  private actorAtlas: ActorAtlas | null = null;
  private openedWaves: readonly string[] = [];
  private readonly resolutionAdapter = new AdaptiveResolutionController();
  private updateNightLighting: ((lampsOn: number) => void) | null = null;
  private updateTreeWind: ((timeSec: number, windStrength: number, reducedMotion: boolean) => void) | null = null;
  private treeWindTimer = 0;
  private timeSec = 0;
  private thunderCleanup: (() => void) | null = null;
  private inspectedBuildingId: string | null = null;
  private savedZoomRadius: number | null = null;

  private zoom = 2;
  private quarter = 0;
  /** Lệch camera khỏi người chơi do kéo chuột (đơn vị thế giới); về 0 khi người chơi đi. */
  private pan = { x: 0, z: 0 };
  private drag: { x: number; y: number } | null = null;
  private prevImageRendering = '';
  private resizeObserver: ResizeObserver | null = null;
  private pointerDownPos: { x: number; y: number } | null = null;
  private pointerButton = 0;
  private isPointerDragging = false;
  private activePointerId: number | null = null;
  private selectedBuildingId: string | null = null;
  private selectionGroundMesh: Mesh | null = null;
  private selectionFrameBars: Mesh[] = [];
  private selectionGroundMat: StandardMaterial | null = null;
  private selectionBarMat: StandardMaterial | null = null;

  constructor(options: GameViewportOptions) {
    this.canvas = options.canvas;
    this.tileMap = options.tileMap;
    this.simulation = options.simulation;
    this.onZoomChange = options.onZoomChange;
    this.onViewBasisChange = options.onViewBasisChange;
    this.getPartnerAvatar = options.getPartnerAvatar;
    this.onParcelTap = options.onParcelTap;
    this.onBuildingSelect = options.onBuildingSelect;
    this.runner = new FixedStepSimulationRunner(options.simulation);
  }

  public async initialize(): Promise<void> {
    if (this.engine) return;
    const engine = new Engine(this.canvas, false, { preserveDrawingBuffer: false, stencil: false, antialias: false }, false);
    const scene = new Scene(engine);
    // Hệ tay phải: Babylon mặc định hệ tay trái làm phép chiếu bị lật gương (điểm +X hiện bên trái màn hình
    // ngược bản 2D). Bật right-handed ngay khi tạo scene để +X hiện bên phải, khớp bản 2D.
    scene.useRightHandedSystem = true;
    scene.clearColor = Color4.FromHexString('#2b3a2bff');

    // Camera phối cảnh (fov dọc CAMERA_FOV); bán kính theo bậc zoom đặt ở applyZoom.
    const camera = new ArcRotateCamera('cam', isoAlpha(this.quarter), CAMERA_BETA, zoomRadius(this.zoom), Vector3.Zero(), scene);
    camera.fov = CAMERA_FOV;
    camera.minZ = 0.1;
    camera.maxZ = 500;

    this.sky = new Sky3D(scene);
    this.weather = new Weather3D(scene, Weather3D.maxDropsFor(resolveWeatherQuality(getWeatherFxSettings())));

    this.engine = engine;
    this.scene = scene;
    this.camera = camera;
    this.actorAtlas = await createActorAtlas(scene);
    this.actors = new Actors3D();
    this.actors.initialize(this.actorAtlas);
    this.crowd = new Crowd3D(this.actorAtlas, this.simulation);
    this.characters = new Characters3D(scene, this.simulation);
    this.overlay = new Overlay3D(this.canvas, this.simulation, scene);
    this.fixtures = new Fixtures3D(scene, this.simulation);
    this.stock = new Stock3D(scene, this.simulation);
    this.stock.setStallSoldOut(this.soldOutStalls);
    this.worldDecor = new WorldDecor3D(scene, this.simulation);
    this.worldDecor.setTileMap(this.tileMap);
    this.worldDecor.setPlanning(this.pendingPlanning);
    if (this.pendingWaveOverlay) {
      this.worldDecor.showWaveOverlay(true);
    }
    this.vehicles = new Vehicles3D(scene, this.simulation, this.sky);
    await this.vehicles.load();
    this.trafficSignals = new TrafficSignals3D(scene, this.sky);
    this.actorShadows = new ActorShadows3D(scene);
    this.umbrellas = new Umbrellas3D(scene);
    this.logistics = new Logistics3D(scene, this.simulation, this.vehicles, this.crowd);

    this.prevImageRendering = this.canvas.style.imageRendering;
    this.canvas.style.imageRendering = 'pixelated';
    this.buildMap();
    void this.preloadModels();
    this.applyResolution();
    this.applyZoom();

    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('contextmenu', this.preventMenu);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    this.resizeObserver = new ResizeObserver(() => { this.applyResolution(); this.applyZoom(); });
    this.resizeObserver.observe(this.canvas);

    this.thunderCleanup = onThunder(e => this.sky?.triggerThunder(e.strength));
    engine.runRenderLoop(this.renderTick);
    this.emitViewBasis();
  }

  /** Dựng lại toàn bộ bản đồ (xem map-builder.ts). Giữ nguyên trạng thái alpha của các mái đã bóc và viền chọn tòa. */
  private buildMap(): void {
    const prevRoofAlphas = new Map<string, { alpha: number; wallAlpha: number }>();
    for (const r of this.roofs) {
      prevRoofAlphas.set(r.id, { alpha: r.alpha, wallAlpha: r.wallAlpha });
    }

    // Giải phóng mesh cũ mà KHÔNG hủy material dùng chung của ModelLibrary / mats pool
    for (const m of this.mapMeshes) m.dispose(false, false);
    const built = buildCityMap(this.scene!, this.tileMap);

    // Phục hồi alpha mái đã bóc trước đó
    for (const r of built.roofs) {
      const prev = prevRoofAlphas.get(r.id);
      if (prev) {
        r.alpha = prev.alpha;
        r.wallAlpha = prev.wallAlpha;
        const roofAlpha = Math.min(r.alpha, r.wallAlpha);
        for (const m of r.fadeMaterials) m.alpha = roofAlpha;
        for (const m of r.wallMaterials) m.alpha = r.wallAlpha;
        const facade = facadeAlpha(roofAlpha);
        for (const m of r.facadeMaterials) m.alpha = facade;
        const visible = roofAlpha > ALPHA_HIDDEN;
        for (const m of r.meshes) m.isVisible = visible;
      }
    }

    this.mapMeshes = built.meshes;
    this.roofs = built.roofs;
    this.fixtures?.setRoofs(built.roofs);
    this.stock?.setMap(built.roofs, this.tileMap.stalls);
    this.sky?.setLampSource(built.lampMaterial, built.lampHeadMesh);
    for (const m of built.civicNightMeshes ?? []) {
      this.sky?.addLightMesh(m);
    }
    for (const m of built.shadowCasters ?? []) {
      this.sky?.addShadowCaster(m);
    }
    this.updateNightLighting = built.updateNightLighting ?? null;
    this.updateTreeWind = built.updateTreeWind ?? null;
    this.weather?.setRoadMaterial(built.roadMaterial);

    // Cập nhật lại khung viền tòa đang chọn (nếu có)
    if (this.selectedBuildingId) {
      this.updateSelectionVisual();
    }
  }

  /** Tải trước các model 3D (cây, đèn đường, đồ đường phố). Khi tải xong, tái dựng bản đồ để cập nhật model 3D mà không gián đoạn game. */
  private async preloadModels(): Promise<void> {
    if (!this.scene) return;
    const currentScene = this.scene;
    const lib = ModelLibrary.getInstance();
    const results = await Promise.all([
      lib.loadModel(currentScene, 'tree'),
      lib.loadModel(currentScene, 'street_lamp'),
      lib.loadModel(currentScene, 'bush'),
      lib.loadModel(currentScene, 'construction_barrier'),
      lib.loadModel(currentScene, 'traffic_cone'),
      lib.loadModel(currentScene, 'dumpster'),
      lib.loadModel(currentScene, 'building_civic_clinic'),
      lib.loadModel(currentScene, 'building_civic_police'),
      lib.loadModel(currentScene, 'building_civic_school'),
      lib.loadModel(currentScene, 'building_low_detail_wide_a'),
      lib.loadModel(currentScene, 'furniture_fridge'),
      lib.loadModel(currentScene, 'furniture_fridge_large'),
      lib.loadModel(currentScene, 'furniture_fridge_small'),
      lib.loadModel(currentScene, 'furniture_kitchen_bar'),
      lib.loadModel(currentScene, 'furniture_computer_screen'),
    ]);
    if (this.scene !== currentScene || !this.scene) return;
    if (results.some(r => r !== null)) {
      this.buildMap();
      this.worldDecor?.update();
      this.fixtures?.markDirty();
    }
  }

  /** Khung hình nội bộ ~PIXEL_TARGET_HEIGHT px rồi phóng nguyên lần lên canvas (nearest) → chất pixel. */
  private applyResolution(): void {
    if (!this.engine) return;
    const cssHeight = Math.max(1, this.canvas.clientHeight);
    const baseScaling = Math.max(1, Math.round(cssHeight / PIXEL_TARGET_HEIGHT));
    this.engine.setHardwareScalingLevel(this.resolutionAdapter.resolveScalingLevel(baseScaling));
    this.engine.resize();
  }

  /** Nửa chiều cao vùng nhìn (đơn vị thế giới) tại tâm theo zoom. */
  private halfHeight(): number { return zoomHalfHeight(this.zoom); }

  /** Zoom = đổi bán kính camera sao cho khung nhìn tại tâm cao đúng bằng ortho cũ (xem zoomRadius). */
  private applyZoom(): void {
    const cam = this.camera;
    if (!cam || !this.engine) return;
    cam.fov = CAMERA_FOV;
    cam.radius = zoomRadius(this.zoom);
  }

  private renderTick = (): void => {
    const engine = this.engine;
    const scene = this.scene;
    const cam = this.camera;
    if (!engine || !scene || !cam) return;
    const elapsed = Math.min(engine.getDeltaTime() / 1000, 0.25);
    this.runner.advance(elapsed);

    this.timeSec += elapsed;
    const renderPixel = this.playerPixel();
    const pos = pixelToWorld(...renderPixel);
    const focus = { x: pos.x + this.pan.x, z: pos.z + this.pan.z };
    if (this.simulation.getIsMoving()) {
      if (this.inspectedBuildingId) {
        this.exitBuilding();
      }
      this.pan = { x: 0, z: 0 };
      this.targetPan = { x: 0, z: 0 };
    }
    this.updateRoofFade(elapsed, pos);
    this.fixtures?.update(elapsed, focus);
    this.stock?.update(elapsed, focus);
    this.worldDecor?.update();
    this.trafficSignals?.update(elapsed, this.simulation.getIntersectionSignals(), this.simulation.getStoreFrontSignal());
    this.logistics?.update(this.quarter, CAMERA_BETA, this.roofs);

    this.treeWindTimer += elapsed;
    if (this.treeWindTimer >= 0.066) {
      this.treeWindTimer = 0;
      const weatherId = this.simulation.getEffectiveWeatherId();
      const isStorm = weatherId === 'storm' || weatherId === 'thunder' || weatherId === 'heavy_rain';
      const windStrength = isStorm ? 2.5 : 1.0;
      const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this.updateTreeWind?.(this.timeSec, windStrength, !!reducedMotion);
    }

    // Camera pan animation (cho locateWarehouse mượt 0.4s)
    const panDx = this.targetPan.x - this.pan.x;
    const panDz = this.targetPan.z - this.pan.z;
    if (Math.abs(panDx) > 0.001 || Math.abs(panDz) > 0.001) {
      const panStep = Math.min(1, (elapsed / 0.4) * 2.5);
      this.pan.x += panDx * panStep;
      this.pan.z += panDz * panStep;
    } else {
      this.pan.x = this.targetPan.x;
      this.pan.z = this.targetPan.z;
    }

    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    // Người/xe là sprite nên không nhận đèn Babylon: nhân màu theo cùng ánh sáng cảnh (giờ + mưa).
    const lightTime = getDebugVisualTime() ?? this.simulation.getTime();
    const currentSkyLighting = lightingAt(lightTime.hour, lightTime.minute, lightTime.day, this.weather?.getRain() ?? 0);
    const actorTint = actorLightTint(currentSkyLighting);
    const viewBounds = {
      centerX: pos.x + this.pan.x,
      centerZ: pos.z + this.pan.z,
      radius: groundViewRadius(this.zoom, aspect, CAMERA_BETA),
      zoom: this.zoom,
    };
    this.vehicles?.setLightTint(actorTint);
    this.vehicles?.update(this.quarter, CAMERA_BETA, viewBounds, currentSkyLighting.lampsOn);

    // Cập nhật nhân vật: nếu Characters3D (model 3D Kenney) đã sẵn sàng thì dùng 3D,
    // ngược lại fallback về sprite 2D Actors3D + Crowd3D.
    const use3DCharacters = Boolean(this.characters?.isReady);
    const rain = this.weather?.getRain() ?? this.simulation.getRainIntensity();

    let allFeet: Array<{ x: number; z: number }>;
    let talkBubbles: readonly import('./characters-3d').CrowdTalkBubble[];

    if (use3DCharacters && this.characters) {
      this.characters.setLightTint(actorTint);
      this.characters.update(
        elapsed,
        renderPixel,
        this.simulation.getIsMoving(),
        this.roofs,
        this.getPartnerAvatar?.(),
        viewBounds,
        rain,
        lightTime.day,
      );
      allFeet = [...this.characters.getActiveFeet()];
      talkBubbles = this.characters.getTalkBubbles();
    } else {
      this.actors?.setLightTint(actorTint);
      this.crowd?.setLightTint(actorTint);
      this.actors?.update(
        elapsed,
        renderPixel,
        this.simulation.getPlayerData().direction,
        this.simulation.getIsMoving(),
        this.quarter,
        CAMERA_BETA,
        this.getPartnerAvatar?.(),
      );
      this.crowd?.update(
        elapsed,
        this.quarter,
        CAMERA_BETA,
        this.roofs,
        viewBounds,
        this.canvas.clientWidth < 768,
      );
      const visibleActors = this.crowd?.getVisibleActors() ?? [];
      allFeet = [
        { x: pos.x, z: pos.z },
        ...visibleActors.map(a => pixelToWorld(a.x, a.y)),
      ];
      talkBubbles = this.crowd?.getTalkBubbles() ?? [];

      // Ô che mưa 2D fallback
      const rainActors = [
        { id: 'player', x: renderPixel[0], y: renderPixel[1] },
        ...visibleActors,
      ];
      this.umbrellas?.update(rainActors, rain, lightTime.day, this.quarter, CAMERA_BETA, this.roofs);
    }

    if (use3DCharacters) {
      // Khi dùng 3D, ô che mưa và thùng hàng đã được gắn trực tiếp trên xương/model của nhân vật
      this.umbrellas?.update([], 0, lightTime.day, this.quarter, CAMERA_BETA, this.roofs);
    }

    this.actorShadows?.update(allFeet, currentSkyLighting.sunIntensity, currentSkyLighting.lampsOn);

    // Khóa tâm camera theo lưới pixel ảo (ở mặt phẳng tâm) để sprite/mép khối quanh người chơi không "bơi" khi camera trượt.
    const step = (2 * this.halfHeight()) / Math.max(1, engine.getRenderHeight());
    const snapped = snapGround(pos.x + this.pan.x, pos.z + this.pan.z, cam.alpha, CAMERA_BETA, step);
    cam.target.set(snapped.x, 0, snapped.z);

    // Tự hạ độ phân giải khi FPS < 45 trong 3s, phục hồi khi FPS > 58 trong 10s (Task 4)
    const instantFps = engine.getFps();
    const isPaused = typeof document !== 'undefined' && (document.hidden || !!document.documentElement.dataset.dialogs);
    if (this.resolutionAdapter.update(elapsed, instantFps, isPaused)) {
      this.applyResolution();
    }

    this.updateSky(elapsed, pos);
    scene.render();
    this.overlay?.update(elapsed, this.quarter, CAMERA_BETA, this.roofs, this.getPartnerAvatar?.(), talkBubbles);
  };

  /** Giờ, ánh sáng, mưa và đường ướt. Có giờ/mưa debug (setDebugTime, chỉ dev) thì dùng thay mô phỏng, giống bản 2D. */
  private updateSky(elapsed: number, pos: { x: number; z: number }): void {
    const sky = this.sky;
    const weather = this.weather;
    const cam = this.camera;
    if (!sky || !weather || !cam || !this.engine) return;
    const debug = getDebugVisualTime();
    const t = debug ?? this.simulation.getTime();
    const fx = getWeatherFxSettings();
    const rainRaw = debug?.rain ?? this.simulation.getRainIntensity();
    const wetRaw = debug?.rain !== undefined ? Math.min(1, debug.rain * 1.5) : this.simulation.getRoadWetness();
    const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    const half = Math.max(8, Math.min(24, groundViewRadius(this.zoom, aspect, CAMERA_BETA) * 0.9));
    weather.update(elapsed, rainRaw, wetRaw, fx.enabled ? fx.intensity : 0, reduced, { x: pos.x + this.pan.x, z: pos.z + this.pan.z }, half);
    sky.setShadowsEnabled(!this.resolutionAdapter.isDownscaled);
    sky.update(t.hour, t.minute, t.day, weather.getRain(), elapsed);
    const skyLighting = lightingAt(t.hour, t.minute, t.day, weather.getRain());
    this.updateNightLighting?.(skyLighting.lampsOn);
  }

  /** Bóc mái mượt: mái + tường mặt tiền mờ dần khi người chơi vào tòa (và kho thông với tiệm chính; tòa kề sát giữ mái), tường tòa che người chơi hạ còn OCCLUDER_ALPHA. */
  private updateRoofFade(elapsed: number, pos: { x: number; z: number }): void {
    const cam = this.camera;
    const inside = this.roofs.filter(r => pos.x >= r.x0 && pos.x < r.x1 && pos.z >= r.z0 && pos.z < r.z1);
    const origin = { x: pos.x, y: 0.9, z: pos.z };
    // Tia từ người chơi về phía mắt camera (phối cảnh: hướng thật tới vị trí camera, không phải hướng song song).
    const toCam = cam ? new Vector3(cam.position.x - origin.x, cam.position.y - origin.y, cam.position.z - origin.z).normalize() : null;
    for (const r of this.roofs) {
      const isInspected = Boolean(this.inspectedBuildingId && (
        r.id === this.inspectedBuildingId ||
        (r.warehouse && /^grocery_main/.test(this.inspectedBuildingId)) ||
        (/^grocery_main/.test(r.id) && /^grocery_main/.test(this.inspectedBuildingId))
      ));
      const open = isInspected || shouldOpenRoof(r, inside);
      const occluding = !open && toCam !== null
        && rayHitsBox(origin, toCam, { x0: r.x0, x1: r.x1, y0: 0, y1: r.top, z0: r.z0, z1: r.z1 });
      r.alpha = stepAlpha(r.alpha, open ? 0 : 1, elapsed);
      r.wallAlpha = stepAlpha(r.wallAlpha, occluding ? OCCLUDER_ALPHA : 1, elapsed);
      // Tòa che người chơi thì mái cũng không thể đặc.
      const roofAlpha = Math.min(r.alpha, r.wallAlpha);
      for (const m of r.fadeMaterials) m.alpha = roofAlpha;
      for (const m of r.wallMaterials) m.alpha = r.wallAlpha;
      const facade = facadeAlpha(roofAlpha);
      for (const m of r.facadeMaterials) m.alpha = facade;
      const visible = roofAlpha > ALPHA_HIDDEN;
      for (const m of r.meshes) m.isVisible = visible;
    }
  }

  private playerPixel(): [number, number] {
    const p = this.simulation.getPlayerRenderPosition(this.runner.getAlpha());
    return [p.x, p.y];
  }

  /** Hướng bản đồ ứng với phải/xuống của màn hình, chiếu xuống mặt đất (X, Z) rồi chuẩn hóa.
   *  right = hướng phải của camera; down = NGƯỢC hướng lên của camera. Trả {x: X, y: Z}.
   *  Tính từ alpha với hệ tay phải (scene.useRightHandedSystem): right = (sin α, -cos α), down = (cos α, sin α). */
  private groundBasis(): { right: { x: number; y: number }; down: { x: number; y: number } } {
    if (!this.camera) return { right: { x: 1, y: 0 }, down: { x: 0, y: 1 } };
    const a = this.camera.alpha;
    return {
      right: { x: Math.sin(a), y: -Math.cos(a) },
      down: { x: Math.cos(a), y: Math.sin(a) },
    };
  }

  /** Báo cho InputManager cơ sở hướng nhìn mới nhất cho renderer (chỉ 3D; 2D không gọi). */
  private emitViewBasis(): void {
    const { right, down } = this.groundBasis();
    this.onViewBasisChange?.(right, down);
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.deltaY < 0) this.zoomIn(1); else if (e.deltaY > 0) this.zoomOut(1);
  };

  private preventMenu = (e: Event): void => e.preventDefault();

  /** Kéo chuột để dời camera (trái/giữa/phải, vượt 4px); ghi lại vị trí/nút để phân biệt click với kéo. */
  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button > 2) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    this.activePointerId = e.pointerId;
    e.preventDefault();
    this.pointerButton = e.button;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.isPointerDragging = false;
    this.drag = { x: e.clientX, y: e.clientY };
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    if (!this.drag || !this.camera) return;
    // Với mọi nút, vượt ngưỡng 4px là kéo (hủy click tiềm năng), giống Pixi.
    if (this.pointerDownPos && !this.isPointerDragging) {
      if (exceedsDragThreshold(this.pointerDownPos, { x: e.clientX, y: e.clientY })) {
        this.isPointerDragging = true;
        this.canvas.style.cursor = 'grabbing';
      }
    }
    // Mọi nút (trái/giữa/phải) kéo được camera sau khi vượt ngưỡng; dưới ngưỡng chuột trái vẫn là click.
    if (!this.isPointerDragging) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    this.drag = { x: e.clientX, y: e.clientY };
    const perPx = (2 * this.halfHeight()) / Math.max(1, this.canvas.clientHeight);
    // Kiểu "nắm kéo": cảnh đi theo chuột. Dùng groundBasis (hướng phải/xuống của màn hình chiếu xuống mặt đất);
    // trục dọc giãn theo góc nghiêng. perPx = 2·halfHeight / chiều cao canvas là tỉ lệ ĐÚNG tại mặt phẳng tâm
    // (bán kính camera = halfHeight / tan(fov/2) nên chiều cao khung tại khoảng cách tới tâm = 2·halfHeight).
    const { right, down } = this.groundBasis();
    const ky = perPx / Math.sin(CAMERA_BETA);
    this.pan.x += -right.x * dx * perPx + (-down.x) * dy * ky;
    this.pan.z += -right.y * dx * perPx + (-down.y) * dy * ky;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    const wasDragging = this.isPointerDragging;
    const button = this.pointerButton;
    const downPos = this.pointerDownPos;
    this.drag = null;
    this.pointerDownPos = null;
    this.isPointerDragging = false;
    this.canvas.style.cursor = 'default';
    // Click: chuột trái, chưa kéo, thả ngay trên canvas (giống handlePointerUp của Pixi).
    if (!isClickRelease(button, wasDragging) || !downPos || e.target !== this.canvas) return;
    if (!this.scene || !this.camera) return;
    this.handleTargetClick(this.targetFromPointer(e.clientX, e.clientY));
  };

  /** Mục tiêu dưới con trỏ: trước hết pick mesh tòa nhà đang hiện (mái, tường, biển, mái hiên) lấy buildingId;
   *  không trúng thì giao tia với mặt phẳng y=0 rồi tra ô (để bấm được lô đất). */
  private targetFromPointer(clientX: number, clientY: number): TileTarget {
    const scene = this.scene;
    const cam = this.camera;
    if (!scene || !cam) return null;
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const hit = scene.pick(px, py, m => m.isVisible && m.isEnabled() && !!m.metadata?.buildingId, false, cam);
    const pickedId = hit?.hit ? (hit.pickedMesh?.metadata?.buildingId as string | undefined) : undefined;
    let ground: TileTarget = null;
    if (!pickedId) {
      const ray = scene.createPickingRay(px, py, Matrix.Identity(), cam, false);
      const t = ray.intersectsPlane(Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up()));
      if (t !== null && t >= 0) {
        const point = ray.origin.add(ray.direction.scale(t));
        const tile = worldToTile(point.x, point.z);
        ground = resolveTileTarget(tile.x, tile.y, this.tileTargetContext());
      }
    }
    return pickTarget(pickedId, ground);
  }

  private tileTargetContext() {
    return {
      tileMap: this.tileMap,
      openedWaves: this.simulation.getWorldOpenState().openedWaves,
      ownedParcelIds: this.simulation.getOwnedParcelIds(),
    };
  }

  /** Xử lý một lần click: lô chưa mua → onParcelTap; tòa → chọn+viền sáng; chỗ trống → bỏ chọn. */
  private handleTargetClick(target: TileTarget): void {
    if (!target) {
      this.selectBuilding(null);
      return;
    }
    if (target.kind === 'parcel') {
      this.onParcelTap?.(target.id);
      return;
    }
    this.selectBuilding(target.id);
  }

  /** Bỏ chọn từ phía UI (đóng bảng): tắt viền sáng, không báo lại callback. */
  public clearBuildingSelection(): void {
    this.selectedBuildingId = null;
    this.exitBuilding();
    this.updateSelectionVisual();
  }

  /** F2: Trượt camera tới cửa tòa, zoom gần và bóc mái bằng roof-fade. */
  public enterBuilding(id?: string): void {
    const targetId = id ?? this.selectedBuildingId;
    if (!targetId) return;
    this.inspectedBuildingId = targetId;
    const b = this.tileMap.buildings?.find(item => item.id === targetId || (targetId.startsWith('grocery_main') && item.id.startsWith('grocery_main')));
    let doorX = 14;
    let doorZ = 12;
    if (b) {
      if (b.doorTiles && b.doorTiles.length > 0) {
        doorX = b.doorTiles[0].x + 0.5;
        doorZ = b.doorTiles[0].y + 0.5;
      } else if (b.bounds) {
        doorX = (b.bounds.left + b.bounds.right) / 2;
        doorZ = b.bounds.bottom;
      }
    }
    const pp = this.playerPixel();
    const pWorld = pixelToWorld(pp[0], pp[1]);
    this.targetPan = { x: doorX - pWorld.x, z: doorZ - pWorld.z };
    if (!this.savedZoomRadius && this.camera) {
      this.savedZoomRadius = this.camera.radius;
    }
    if (this.camera) {
      this.camera.radius = Math.min(this.camera.radius, 15);
    }
  }

  /** Trả camera về lại người chơi và đậy lại mái khi Esc hoặc người chơi di chuyển. */
  public exitBuilding(): void {
    if (!this.inspectedBuildingId) return;
    this.inspectedBuildingId = null;
    this.targetPan = { x: 0, z: 0 };
    if (this.savedZoomRadius && this.camera) {
      this.camera.radius = this.savedZoomRadius;
      this.savedZoomRadius = null;
    }
  }

  public getSimulation(): GameSimulation {
    return this.simulation;
  }

  public triggerDevThunder(strength = 1.0): void {
    this.sky?.triggerThunder(strength);
  }

  /** Chọn/bỏ chọn tòa `buildingId` (null = bỏ), cập nhật viền sáng và báo callback cho UI mở bảng tòa. */
  private selectBuilding(buildingId: string | null): void {
    this.selectedBuildingId = buildingId;
    this.updateSelectionVisual();
    this.onBuildingSelect?.(buildingId);
  }

  /** Chiều cao nóc (mặt trên mép mái thật) của tòa vùng `f`; dựa trên mesh mái của RoofInfo khớp chân diện. */
  private roofTopFor(f: { x0: number; y0: number; x1: number; y1: number }): number {
    let top = 0;
    for (const r of this.roofs) {
      if (r.x0 <= f.x1 && r.x1 >= f.x0 && r.z0 <= f.y1 && r.z1 >= f.y0) {
        const roof = r.meshes[0];
        // Mesh mái là hộp (cao 0.25) đặt ở position.y = wallHeight + 0.125 → nóc = position.y + 0.125.
        const y = roof ? roof.position.y + 0.125 : 1;
        if (y > top) top = y;
      }
    }
    return top;
  }

  /** Sinh mặt nền sáng (nếu chưa có) đánh dấu chân diện tòa đang chọn; không chọn thì ẩn. */
  private createSelectionMeshes(): void {
    const scene = this.scene;
    if (!scene) return;
    this.selectionGroundMat = new StandardMaterial('sel_ground_mat', scene);
    this.selectionGroundMat.diffuseColor = SELECTION_COLOR;
    this.selectionGroundMat.emissiveColor = SELECTION_COLOR;
    this.selectionGroundMat.alpha = 0.4;
    this.selectionGroundMat.specularColor = Color3.Black();
    this.selectionBarMat = new StandardMaterial('sel_bar_mat', scene);
    this.selectionBarMat.disableLighting = true;
    this.selectionBarMat.emissiveColor = SELECTION_COLOR;
    this.selectionGroundMesh = CreateGround('sel_ground', { width: 1, height: 1, updatable: true }, scene);
    this.selectionGroundMesh.material = this.selectionGroundMat;
    this.selectionGroundMesh.isPickable = false;
  }

  private updateSelectionVisual(): void {
    if (!this.scene || !this.simulation) return;
    if (!this.selectionGroundMesh) this.createSelectionMeshes();
    const f = this.selectedBuildingId ? this.buildingFootprint(this.selectedBuildingId) : null;
    if (!f) {
      for (const m of this.selectionFrameBars) m.dispose();
      this.selectionFrameBars = [];
      this.selectionGroundMesh!.isVisible = false;
      return;
    }
    const w = f.x1 - f.x0 + 1;
    const d = f.y1 - f.y0 + 1;
    this.selectionGroundMesh!.isVisible = true;
    this.selectionGroundMesh!.position.set(f.x0 + w / 2, 0.02, f.y0 + d / 2);
    this.selectionGroundMesh!.scaling.set(w, 1, d);
    // Khung cạnh (đường) nhô hơn tường/mái ~0.2 và CAO HƠN NÓC MÁI 0.1 → luôn nhìn thấy kể cả khi tòa còn mái.
    const y = Math.max(SELECTION_FRAME_HEIGHT, this.roofTopFor(f) + 0.1);
    const pad = 0.2;
    const t = SELECTION_BAR_THICKNESS;
    const bx0 = f.x0 - pad, bx1 = f.x1 + 1 + pad, bz0 = f.y0 - pad, bz1 = f.y1 + 1 + pad;
    // 4 thanh hộp tự phát sáng đặt trên cạnh mái (nét line 1px sẽ biến mất ở zoom thấp).
    const bars: [number, number, number, number][] = [
      [(bx0 + bx1) / 2, bz0, bx1 - bx0 + t, t],
      [(bx0 + bx1) / 2, bz1, bx1 - bx0 + t, t],
      [bx0, (bz0 + bz1) / 2, t, bz1 - bz0 + t],
      [bx1, (bz0 + bz1) / 2, t, bz1 - bz0 + t],
    ];
    for (const m of this.selectionFrameBars) m.dispose();
    this.selectionFrameBars = bars.map(([cx, cz, w, d], i) => {
      const bar = CreateBox(`sel_bar_${i}`, { width: w, height: t, depth: d }, this.scene!);
      bar.position.set(cx, y, cz);
      bar.material = this.selectionBarMat!;
      bar.isPickable = false;
      return bar;
    });
  }

  /** Chân diện chọn của tòa: hợp các ô được nhận là tòa đó (bounds kèm `top`, sàn mở rộng `floorTiles`, kho gắn liền tiệm chính). */
  private buildingFootprint(buildingId: string): { x0: number; y0: number; x1: number; y1: number } {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    for (const b of this.tileMap.buildings ?? []) {
      const bounds = b.bounds;
      if (!bounds) continue;
      const top = b.top ?? bounds.top;
      const isId = b.id === buildingId;
      const isMain = buildingId === 'main' && (b.id === 'main' || /^grocery_main/.test(b.id));
      if (isId || isMain) {
        grow(bounds.left, top);
        grow(bounds.right, bounds.bottom);
        for (const t of b.floorTiles ?? []) { grow(t.x, t.y); }
      }
    }
    if (buildingId === 'main' && Number.isFinite(x0)) {
      grow(WAREHOUSE_BOUNDS.left, WAREHOUSE_BOUNDS.top);
      grow(WAREHOUSE_BOUNDS.right, WAREHOUSE_BOUNDS.bottom);
    }
    if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0 };
    return { x0, y0, x1, y1 };
  }

  /** Q / R xoay camera 90° (E đã dùng cho tương tác). F9 (chỉ dev) bật Inspector của Babylon. */
  private handleKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (e.code === 'KeyQ') this.rotate(1);
    else if (e.code === 'KeyR') this.rotate(-1);
    else if (e.code === 'F9' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) void this.toggleInspector();
  };

  private rotate(dir: number): void {
    this.quarter = (this.quarter + dir + 4) % 4;
    if (this.camera) this.camera.alpha = isoAlpha(this.quarter);
    this.emitViewBasis();
  }

  private async toggleInspector(): Promise<void> {
    const scene = this.scene;
    if (!scene) return;
    await import('@babylonjs/core/Debug/debugLayer');
    if (scene.debugLayer.isVisible()) scene.debugLayer.hide();
    else await scene.debugLayer.show({ embedMode: true });
  }

  public updateTileMap(tileMap: GameTileMap): void {
    this.tileMap = tileMap;
    this.worldDecor?.setTileMap(tileMap);
    if (this.scene) this.buildMap();
  }

  public setOpenedWaves(openedWaves: readonly string[]): void { this.openedWaves = openedWaves; }

  public setStallSoldOut(ids: readonly string[]): void {
    this.soldOutStalls = ids;
    this.stock?.setStallSoldOut(ids);
  }
  public setPlanningReservations(overlays: readonly PlanningOverlay[]): void {
    this.pendingPlanning = overlays;
    this.worldDecor?.setPlanning(overlays);
  }
  public showWaveOverlay(show: boolean): boolean {
    this.pendingWaveOverlay = show;
    return this.worldDecor?.showWaveOverlay(show) ?? false;
  }
  public addFloatingGain(x: number, y: number, text: string, color: number = 0xf4a261): void {
    this.overlay?.addFloatingGain(x, y, text, color);
  }
  public panToWorld(x: number, z: number, immediate = false): void {
    const p = this.simulation.getPlayerData().position;
    const playerWorld = pixelToWorld(p.x, p.y);
    this.targetPan = {
      x: x - playerWorld.x,
      z: z - playerWorld.z,
    };
    if (immediate) {
      this.pan = { ...this.targetPan };
      if (this.camera) {
        this.camera.target.set(x, 0, z);
      }
    }
  }

  public locateWarehouse(): void {
    const p = this.simulation.getPlayerData().position;
    const playerWorld = pixelToWorld(p.x, p.y);
    const inWarehouse = p.x >= WAREHOUSE_BOUNDS.left * 32 && p.x < (WAREHOUSE_BOUNDS.right + 1) * 32 && p.y >= WAREHOUSE_BOUNDS.top * 32 && p.y < WAREHOUSE_BOUNDS.bottom * 32;
    const targetY = WAREHOUSE_BOUNDS.top * 32 + (WAREHOUSE_BOUNDS.bottom - WAREHOUSE_BOUNDS.top) * 16;
    const warehouseWorld = pixelToWorld(
      WAREHOUSE_BOUNDS.left * 32 + (WAREHOUSE_BOUNDS.right - WAREHOUSE_BOUNDS.left + 1) * 16,
      targetY + (inWarehouse ? 0 : 32),
    );
    this.targetPan = {
      x: warehouseWorld.x - playerWorld.x,
      z: warehouseWorld.z - playerWorld.z,
    };
  }

  public zoomIn(delta = 1): number { return this.setZoom(stepZoom(this.zoom, Math.abs(delta))); }
  public zoomOut(delta = 1): number { return this.setZoom(stepZoom(this.zoom, -Math.abs(delta))); }
  public getZoom(): number { return this.zoom; }

  private setZoom(zoom: number): number {
    if (zoom !== this.zoom) {
      this.zoom = zoom;
      this.applyZoom();
      this.onZoomChange?.(zoom);
    }
    return this.zoom;
  }

  public getMinimapSnapshot(): MinimapSnapshot {
    const [px, py] = this.playerPixel();
    const p = pixelToWorld(px, py);
    const aspect = this.engine ? this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight()) : 1;
    const cx = p.x + this.pan.x;
    const cz = p.z + this.pan.z;
    const bounds = cameraGroundViewBounds(cx, cz, this.zoom, this.quarter, aspect, CAMERA_BETA, CAMERA_FOV);
    const ox = this.tileMap.originTileX ?? 0;
    const oy = this.tileMap.originTileY ?? 0;
    return {
      view: bounds,
      player: { x: p.x, y: p.z },
      map: { x0: ox, y0: oy, x1: ox + this.tileMap.width, y1: oy + this.tileMap.height },
      openedWaves: this.openedWaves.length ? this.openedWaves : this.simulation.getWorldOpenState().openedWaves,
      owned: this.simulation.getOwnedParcelIds(),
      built: this.simulation.getOccupiedParcelBuildings(),
    };
  }

  public getResolutionAdapter(): AdaptiveResolutionController {
    return this.resolutionAdapter;
  }

  /** QA / debug: trigger a deterministic resident talk bubble */
  public setDevTalkBubble(text: string): void {
    this.crowd?.setDevBubble(text);
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('contextmenu', this.preventMenu);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.engine?.stopRenderLoop();
    this.overlay?.destroy();
    this.sky?.dispose();
    this.weather?.dispose();
    this.crowd?.dispose();
    this.fixtures?.dispose();
    this.stock?.dispose();
    this.worldDecor?.dispose();
    this.trafficSignals?.dispose();
    this.actorShadows?.dispose();
    this.umbrellas?.dispose();
    this.logistics?.dispose();
    this.vehicles?.dispose();
    this.characters?.dispose();
    this.actors?.dispose();
    this.actorAtlas?.manager.dispose();
    for (const m of this.selectionFrameBars) m.dispose();
    this.selectionGroundMesh?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    ModelLibrary.resetInstance();
    this.canvas.style.imageRendering = this.prevImageRendering;
    this.thunderCleanup?.();
    this.thunderCleanup = null;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.actors = null;
    this.characters = null;
    this.crowd = null;
    this.fixtures = null;
    this.stock = null;
    this.worldDecor = null;
    this.trafficSignals = null;
    this.actorShadows = null;
    this.umbrellas = null;
    this.logistics = null;
    this.vehicles = null;
    this.overlay = null;
    this.sky = null;
    this.weather = null;
    this.actorAtlas = null;
    this.mapMeshes = [];
    this.roofs = [];
    this.selectionFrameBars = [];
    this.selectionBarMat = null;
    this.selectionGroundMesh = null;
    this.selectedBuildingId = null;
  }
}
