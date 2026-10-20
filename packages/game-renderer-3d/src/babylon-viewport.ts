import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Culling/ray';
import { FixedStepSimulationRunner, type GameSimulation } from '@game/core';
import { WAREHOUSE_BOUNDS } from '@game/data';
import type { GameTileMap } from '@game/shared';
import type { GameViewport, GameViewportOptions, MinimapSnapshot, PlanningOverlay } from '@game/renderer';
import { CAMERA_BETA, CAMERA_FOV, groundViewRadius, isoAlpha, pixelToWorld, snapGround, stepZoom, worldToTile, zoomHalfHeight, zoomRadius } from './coords';
import { buildCityMap, type RoofInfo } from './map-builder';
import { Actors3D } from './actors-3d';
import { createActorAtlas, type ActorAtlas } from './actor-atlas';
import { Crowd3D } from './crowd-3d';
import { Fixtures3D } from './fixtures-3d';
import { Stock3D } from './stock-3d';
import { Overlay3D } from './overlay-3d';
import { pickTarget, resolveTileTarget, type TileTarget } from './tile-target';
import { ALPHA_HIDDEN, OCCLUDER_ALPHA, rayHitsBox, shouldOpenRoof, stepAlpha } from './roof-fade';

/** Chiều cao khung hình "pixel" (px ảo); canvas thật được phóng lên bằng nearest-neighbour. */
const PIXEL_TARGET_HEIGHT = 360;
/** Độ dời chuột (px) vượt qua là kéo (pan) thay vì click — cùng ngưỡng Pixi (viewport-input.ts). */
const DRAG_THRESHOLD_PX = 4;
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
  private fixtures: Fixtures3D | null = null;
  private stock: Stock3D | null = null;
  private soldOutStalls: readonly string[] = [];
  private overlay: Overlay3D | null = null;
  private actorAtlas: ActorAtlas | null = null;
  private openedWaves: readonly string[] = [];

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

    const hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.75;
    hemi.groundColor = new Color3(0.45, 0.42, 0.5);
    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.35), scene);
    sun.intensity = 0.55;

    this.engine = engine;
    this.scene = scene;
    this.camera = camera;
    this.actorAtlas = await createActorAtlas(scene);
    this.actors = new Actors3D();
    this.actors.initialize(this.actorAtlas);
    this.crowd = new Crowd3D(this.actorAtlas, this.simulation);
    this.overlay = new Overlay3D(this.canvas, this.simulation, scene);
    this.fixtures = new Fixtures3D(scene, this.simulation);
    this.stock = new Stock3D(scene, this.simulation);
    this.stock.setStallSoldOut(this.soldOutStalls);

    this.prevImageRendering = this.canvas.style.imageRendering;
    this.canvas.style.imageRendering = 'pixelated';
    this.buildMap();
    this.applyResolution();
    this.applyZoom();

    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('contextmenu', this.preventMenu);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    this.resizeObserver = new ResizeObserver(() => { this.applyResolution(); this.applyZoom(); });
    this.resizeObserver.observe(this.canvas);

    engine.runRenderLoop(this.renderTick);
    this.emitViewBasis();
  }

  /** Dựng lại toàn bộ bản đồ (xem map-builder.ts). */
  private buildMap(): void {
    for (const m of this.mapMeshes) m.dispose(false, true);
    const built = buildCityMap(this.scene!, this.tileMap);
    this.mapMeshes = built.meshes;
    this.roofs = built.roofs;
    this.fixtures?.setRoofs(built.roofs);
    this.stock?.setMap(built.roofs, this.tileMap.stalls);
  }

  /** Khung hình nội bộ ~PIXEL_TARGET_HEIGHT px rồi phóng nguyên lần lên canvas (nearest) → chất pixel. */
  private applyResolution(): void {
    if (!this.engine) return;
    const cssHeight = Math.max(1, this.canvas.clientHeight);
    this.engine.setHardwareScalingLevel(Math.max(1, Math.round(cssHeight / PIXEL_TARGET_HEIGHT)));
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

    const renderPixel = this.playerPixel();
    const pos = pixelToWorld(...renderPixel);
    this.actors?.update(
      elapsed,
      renderPixel,
      this.simulation.getPlayerData().direction,
      this.simulation.getIsMoving(),
      this.quarter,
      CAMERA_BETA,
      this.getPartnerAvatar?.(),
    );
    if (this.simulation.getIsMoving()) this.pan = { x: 0, z: 0 };
    this.updateRoofFade(elapsed, pos);
    this.fixtures?.update(elapsed);
    this.stock?.update(elapsed);
    // Sau khi mái đã bóc/đậy: khách trong tòa còn mái thì ẩn.
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    this.crowd?.update(
      elapsed,
      this.quarter,
      CAMERA_BETA,
      this.roofs,
      {
        centerX: pos.x + this.pan.x,
        centerZ: pos.z + this.pan.z,
        radius: groundViewRadius(this.zoom, aspect, CAMERA_BETA),
        zoom: this.zoom,
      },
      this.canvas.clientWidth < 768,
    );

    // Khóa tâm camera theo lưới pixel ảo (ở mặt phẳng tâm) để sprite/mép khối quanh người chơi không "bơi" khi camera trượt.
    const step = (2 * this.halfHeight()) / Math.max(1, engine.getRenderHeight());
    const snapped = snapGround(pos.x + this.pan.x, pos.z + this.pan.z, cam.alpha, CAMERA_BETA, step);
    cam.target.set(snapped.x, 0, snapped.z);
    scene.render();
    this.overlay?.update(elapsed, this.quarter, CAMERA_BETA, this.roofs, this.getPartnerAvatar?.());
  };

  /** Bóc mái mượt: mái + tường mặt tiền mờ dần khi người chơi vào tòa (và kho thông với tiệm chính; tòa kề sát giữ mái), tường tòa che người chơi hạ còn OCCLUDER_ALPHA. */
  private updateRoofFade(elapsed: number, pos: { x: number; z: number }): void {
    const cam = this.camera;
    const inside = this.roofs.filter(r => pos.x >= r.x0 && pos.x < r.x1 && pos.z >= r.z0 && pos.z < r.z1);
    const origin = { x: pos.x, y: 0.9, z: pos.z };
    // Tia từ người chơi về phía mắt camera (phối cảnh: hướng thật tới vị trí camera, không phải hướng song song).
    const toCam = cam ? new Vector3(cam.position.x - origin.x, cam.position.y - origin.y, cam.position.z - origin.z).normalize() : null;
    for (const r of this.roofs) {
      const open = shouldOpenRoof(r, inside);
      const occluding = !open && toCam !== null
        && rayHitsBox(origin, toCam, { x0: r.x0, x1: r.x1, y0: 0, y1: r.top, z0: r.z0, z1: r.z1 });
      r.alpha = stepAlpha(r.alpha, open ? 0 : 1, elapsed);
      r.wallAlpha = stepAlpha(r.wallAlpha, occluding ? OCCLUDER_ALPHA : 1, elapsed);
      // Tòa che người chơi thì mái cũng không thể đặc.
      const roofAlpha = Math.min(r.alpha, r.wallAlpha);
      for (const m of r.fadeMaterials) m.alpha = roofAlpha;
      for (const m of r.wallMaterials) m.alpha = r.wallAlpha;
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

  /** Kéo chuột để dời camera: chỉ chuột giữa/phải (chuột trái dành cho click/chọn); ghi lại vị trí/nút để phân biệt click với kéo. */
  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button > 2) return;
    e.preventDefault();
    this.pointerButton = e.button;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.isPointerDragging = false;
    this.drag = { x: e.clientX, y: e.clientY };
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.drag || !this.camera) return;
    // Với mọi nút, vượt ngưỡng 4px là kéo (hủy click tiềm năng), giống Pixi.
    if (this.pointerDownPos && !this.isPointerDragging) {
      if (Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y) > DRAG_THRESHOLD_PX) {
        this.isPointerDragging = true;
      }
    }
    // Chỉ chuột giữa/phải dời camera; chuột trái dành cho click/chọn (không pan).
    if (this.pointerButton === 0 || !this.isPointerDragging) return;
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
    const wasDragging = this.isPointerDragging;
    const button = this.pointerButton;
    const downPos = this.pointerDownPos;
    this.drag = null;
    this.pointerDownPos = null;
    this.isPointerDragging = false;
    // Click: chuột trái, chưa kéo, thả ngay trên canvas (giống handlePointerUp của Pixi).
    if (wasDragging || button !== 0 || !downPos || e.target !== this.canvas) return;
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

  /** Chọn/bỏ chọn tòa `buildingId` (null = bỏ), cập nhật viền sáng và báo callback (giai đoạn F sẽ nối UI). */
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
    if (this.scene) this.buildMap();
  }

  public setOpenedWaves(openedWaves: readonly string[]): void { this.openedWaves = openedWaves; }

  // Chưa vẽ ở giai đoạn B (xem docs/plans/3d-migration-plan.md, C–G).
  public setStallSoldOut(ids: readonly string[]): void {
    this.soldOutStalls = ids;
    this.stock?.setStallSoldOut(ids);
  }
  public setPlanningReservations(_overlays: readonly PlanningOverlay[]): void {}
  public showWaveOverlay(_show: boolean): boolean { return false; }
  public addFloatingGain(x: number, y: number, text: string, color: number = 0xf4a261): void {
    this.overlay?.addFloatingGain(x, y, text, color);
  }
  public locateWarehouse(): void { this.pan = { x: 0, z: 0 }; }

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
    const half = this.halfHeight();
    const aspect = this.engine ? this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight()) : 1;
    const cx = p.x + this.pan.x;
    const cz = p.z + this.pan.z;
    const ox = this.tileMap.originTileX ?? 0;
    const oy = this.tileMap.originTileY ?? 0;
    return {
      view: { x0: cx - half * aspect, y0: cz - half, x1: cx + half * aspect, y1: cz + half },
      player: { x: p.x, y: p.z },
      map: { x0: ox, y0: oy, x1: ox + this.tileMap.width, y1: oy + this.tileMap.height },
      openedWaves: this.openedWaves.length ? this.openedWaves : this.simulation.getWorldOpenState().openedWaves,
      owned: this.simulation.getOwnedParcelIds(),
      built: this.simulation.getOccupiedParcelBuildings(),
    };
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('contextmenu', this.preventMenu);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.engine?.stopRenderLoop();
    this.overlay?.destroy();
    this.crowd?.dispose();
    this.fixtures?.dispose();
    this.stock?.dispose();
    this.actors?.dispose();
    this.actorAtlas?.manager.dispose();
    for (const m of this.selectionFrameBars) m.dispose();
    this.selectionGroundMesh?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.canvas.style.imageRendering = this.prevImageRendering;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.actors = null;
    this.crowd = null;
    this.fixtures = null;
    this.stock = null;
    this.overlay = null;
    this.actorAtlas = null;
    this.mapMeshes = [];
    this.roofs = [];
    this.selectionFrameBars = [];
    this.selectionBarMat = null;
    this.selectionGroundMesh = null;
    this.selectedBuildingId = null;
  }
}
