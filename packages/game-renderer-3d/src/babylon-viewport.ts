import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { FixedStepSimulationRunner, type GameSimulation } from '@game/core';
import type { GameTileMap } from '@game/shared';
import type { GameViewport, GameViewportOptions, MinimapSnapshot, PlanningOverlay } from '@game/renderer';
import { isoAlpha, pixelToWorld, snapTo, stepZoom, ZOOM_BASE_TILES } from './coords';

/** Chiều cao khung hình "pixel" (px ảo); canvas thật được phóng lên bằng nearest-neighbour. */
const PIXEL_TARGET_HEIGHT = 360;
/** Góc nghiêng camera (beta của ArcRotateCamera, rad): ~55° từ phương thẳng đứng. */
const CAMERA_BETA = 0.96;
const WALL_HEIGHT = 1.6;

type TileKind = 'street' | 'sidewalk' | 'grass' | 'store' | 'warehouse';
const TILE_COLORS: Record<TileKind | 'wall' | 'outside' | 'player', string> = {
  street: '#4a4a52', sidewalk: '#bfb5a0', grass: '#6aa84f', store: '#d9c08c', warehouse: '#8d7b5a',
  wall: '#e8dcc0', outside: '#5b8f45', player: '#d9534f',
};

/** Phân loại ô `ground` giống renderer Pixi: 1 đường, 2 vỉa hè (cỏ nếu hàng < 11), 3 sàn tiệm, 9 sàn kho. */
function tileKind(id: number, worldY: number): TileKind {
  if (id === 1) return 'street';
  if (id === 3) return 'store';
  if (id === 9) return 'warehouse';
  if (id === 2 && worldY < 11) return 'grass';
  return 'sidewalk';
}

/** Renderer 3D (Babylon) — giai đoạn B: sàn lưới, tường khối, người chơi dạng khối, camera iso pixel. */
export class BabylonGameViewport implements GameViewport {
  private readonly canvas: HTMLCanvasElement;
  private tileMap: GameTileMap;
  private readonly simulation: GameSimulation;
  private readonly runner: FixedStepSimulationRunner;
  private readonly onZoomChange?: (zoom: number) => void;

  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;
  private mapMeshes: Mesh[] = [];
  private player: Mesh | null = null;
  private openedWaves: readonly string[] = [];

  private zoom = 2;
  private quarter = 0;
  /** Lệch camera khỏi người chơi do kéo chuột (đơn vị thế giới); về 0 khi người chơi đi. */
  private pan = { x: 0, z: 0 };
  private drag: { x: number; y: number } | null = null;
  private prevImageRendering = '';
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: GameViewportOptions) {
    this.canvas = options.canvas;
    this.tileMap = options.tileMap;
    this.simulation = options.simulation;
    this.onZoomChange = options.onZoomChange;
    this.runner = new FixedStepSimulationRunner(options.simulation);
  }

  public async initialize(): Promise<void> {
    if (this.engine) return;
    const engine = new Engine(this.canvas, false, { preserveDrawingBuffer: false, stencil: false, antialias: false }, false);
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromHexString('#2b3a2bff');

    const camera = new ArcRotateCamera('cam', isoAlpha(this.quarter), CAMERA_BETA, 60, Vector3.Zero(), scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
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
    this.player = CreateBox('player', { width: 0.6, height: 1.1, depth: 0.6 }, scene);
    this.player.material = this.material('player');

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
  }

  private material(kind: keyof typeof TILE_COLORS): StandardMaterial {
    const mat = new StandardMaterial(`m_${kind}`, this.scene!);
    mat.diffuseColor = Color3.FromHexString(TILE_COLORS[kind]);
    mat.specularColor = Color3.Black();
    return mat;
  }

  /** Dựng lại sàn và tường từ `tileMap`: mỗi loại ô là một mesh với thin instances (một lần vẽ cho cả loại). */
  private buildMap(): void {
    const scene = this.scene!;
    for (const m of this.mapMeshes) { m.material?.dispose(); m.dispose(); }
    this.mapMeshes = [];

    const { width, height } = this.tileMap;
    const ox = this.tileMap.originTileX ?? 0;
    const oy = this.tileMap.originTileY ?? 0;
    const ground = this.tileMap.layers.find(l => l.name === 'ground')?.data;
    const walls = this.tileMap.layers.find(l => l.name === 'walls')?.data;

    const outside = CreateGround('outside', { width: width + 80, height: height + 80 }, scene);
    outside.position.set(ox + width / 2, -0.02, oy + height / 2);
    outside.material = this.material('outside');
    this.mapMeshes.push(outside);

    const tiles = new Map<TileKind, number[]>();
    const wallTiles: number[] = [];
    for (let ly = 0; ly < height; ly++) {
      for (let lx = 0; lx < width; lx++) {
        const i = ly * width + lx;
        const x = lx + ox;
        const y = ly + oy;
        if (ground) {
          const kind = tileKind(ground[i], y);
          let list = tiles.get(kind);
          if (!list) tiles.set(kind, list = []);
          list.push(x, y);
        }
        if (walls?.[i]) wallTiles.push(x, y);
      }
    }

    for (const [kind, list] of tiles) {
      const mesh = CreateGround(`ground_${kind}`, { width: 1, height: 1 }, scene);
      mesh.material = this.material(kind);
      this.setInstances(mesh, list, 0);
      this.mapMeshes.push(mesh);
    }
    if (wallTiles.length) {
      const mesh = CreateBox('walls', { width: 1, height: WALL_HEIGHT, depth: 1 }, scene);
      mesh.material = this.material('wall');
      this.setInstances(mesh, wallTiles, WALL_HEIGHT / 2);
      this.mapMeshes.push(mesh);
    }
    for (const m of this.mapMeshes) m.freezeWorldMatrix();
  }

  /** Đặt thin instances cho mesh tại tâm các ô (cặp x, y liên tiếp trong `xy`). */
  private setInstances(mesh: Mesh, xy: number[], yOffset: number): void {
    const count = xy.length / 2;
    const buffer = new Float32Array(count * 16);
    for (let k = 0; k < count; k++) {
      Matrix.Translation(xy[k * 2] + 0.5, yOffset, xy[k * 2 + 1] + 0.5).copyToArray(buffer, k * 16);
    }
    mesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
  }

  /** Khung hình nội bộ ~PIXEL_TARGET_HEIGHT px rồi phóng nguyên lần lên canvas (nearest) → chất pixel. */
  private applyResolution(): void {
    if (!this.engine) return;
    const cssHeight = Math.max(1, this.canvas.clientHeight);
    this.engine.setHardwareScalingLevel(Math.max(1, Math.round(cssHeight / PIXEL_TARGET_HEIGHT)));
    this.engine.resize();
  }

  /** Nửa chiều cao vùng nhìn (đơn vị thế giới) theo zoom; khung ortho theo tỉ lệ canvas. */
  private halfHeight(): number { return ZOOM_BASE_TILES / this.zoom / 2; }

  private applyZoom(): void {
    const cam = this.camera;
    if (!cam || !this.engine) return;
    const half = this.halfHeight();
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    cam.orthoTop = half;
    cam.orthoBottom = -half;
    cam.orthoLeft = -half * aspect;
    cam.orthoRight = half * aspect;
  }

  private renderTick = (): void => {
    const engine = this.engine;
    const scene = this.scene;
    const cam = this.camera;
    if (!engine || !scene || !cam || !this.player) return;
    this.runner.advance(Math.min(engine.getDeltaTime() / 1000, 0.25));

    const pos = pixelToWorld(...this.playerPixel());
    this.player.position.set(pos.x, 0.55, pos.z);
    if (this.simulation.getIsMoving()) this.pan = { x: 0, z: 0 };

    // Khóa tâm camera theo lưới pixel ảo để mép khối không "bơi" khi camera trượt.
    const step = (2 * this.halfHeight()) / Math.max(1, engine.getRenderHeight());
    cam.target.set(snapTo(pos.x + this.pan.x, step), 0, snapTo(pos.z + this.pan.z, step));
    scene.render();
  };

  private playerPixel(): [number, number] {
    const p = this.simulation.getPlayerRenderPosition(this.runner.getAlpha());
    return [p.x, p.y];
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.deltaY < 0) this.zoomIn(1); else if (e.deltaY > 0) this.zoomOut(1);
  };

  private preventMenu = (e: Event): void => e.preventDefault();

  /** Kéo chuột phải hoặc giữa để dời camera (chuột trái để dành cho chọn/tương tác về sau). */
  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 1 && e.button !== 2) return;
    e.preventDefault();
    this.drag = { x: e.clientX, y: e.clientY };
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.drag || !this.camera) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    this.drag = { x: e.clientX, y: e.clientY };
    const perPx = (2 * this.halfHeight()) / Math.max(1, this.canvas.clientHeight);
    // Kiểu "nắm kéo": cảnh đi theo chuột. Hướng phải/lên của màn hình chiếu xuống mặt đất; trục dọc giãn theo góc nghiêng.
    const right = this.camera.getDirection(Vector3.Right());
    const up = this.camera.getDirection(Vector3.Up());
    const upLen = Math.hypot(up.x, up.z) || 1;
    const ky = perPx / Math.sin(CAMERA_BETA);
    this.pan.x += -right.x * dx * perPx + (up.x / upLen) * dy * ky;
    this.pan.z += -right.z * dx * perPx + (up.z / upLen) * dy * ky;
  };

  private handlePointerUp = (): void => { this.drag = null; };

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
  public setStallSoldOut(_ids: readonly string[]): void {}
  public setPlanningReservations(_overlays: readonly PlanningOverlay[]): void {}
  public showWaveOverlay(_show: boolean): boolean { return false; }
  public addFloatingGain(_x: number, _y: number, _text: string, _color?: number): void {}
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
    this.scene?.dispose();
    this.engine?.dispose();
    this.canvas.style.imageRendering = this.prevImageRendering;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.player = null;
    this.mapMeshes = [];
  }
}
