import { Engine } from '@babylonjs/core/Engines/engine';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CAMERA_BETA, isoAlpha } from './coords';
import type { FixtureBox } from './fixture-shapes';
import { boxesBounds, boundsCenter, boundsSize } from './box-bounds';
import { EMISSIVE_SCALE } from './style-spec';

/**
 * Studio chụp ảnh (dev/QA và ảnh xem trước giao diện): dựng một danh sách khối trong engine ngoài màn hình rồi
 * chụp ra PNG nền trong suốt. Dùng chung cho nội thất (`fixture-preview-3d`) và mảnh kit/tòa (`kit/`).
 */

export const STUDIO_PX = 192;
const IDLE_DISPOSE_MS = 10_000;
/** Gần 0 (không dùng đúng 0 để tránh suy biến trục lên của ArcRotateCamera). */
const TOP_VIEW_BETA = 0.001;
const FRAME_PAD = 0.05;
const FRAME_MARGIN = 1.08;

/** Góc chụp: 'iso' nghiêng như camera game; 'top' nhìn thẳng xuống (x sang phải, z xuống dưới); 'front' nhìn thẳng vào mặt trước (+z) từ phía trước. */
export type StudioView = 'iso' | 'top' | 'front';

/**
 * Góc quay (alpha) của camera theo từng góc chụp, trong hệ tay phải như cảnh game.
 * top: camera lệch về phía nam (+z) nên đầu ảnh là phía bắc (-z); front: camera ở +z nhìn về -z.
 */
export const STUDIO_ALPHA: Record<StudioView, number> = {
  iso: isoAlpha(0),
  top: Math.PI / 2,
  front: Math.PI / 2,
};

export interface StudioShot {
  /** Khóa cache: phải mã hóa mọi thứ làm ảnh khác đi (hình, góc chụp). */
  key: string;
  boxes: readonly FixtureBox[];
  target: { x: number; y: number; z: number };
  alpha: number;
  beta: number;
  /** Nửa kích thước vùng nhìn (đơn vị thế giới) theo ngang và dọc màn hình. */
  halfW: number;
  halfH: number;
  widthPx: number;
  heightPx: number;
}

/** Khung chụp tự tính từ hộp bao của các khối. Thuần, không cần WebGL. */
export function studioShotForBoxes(key: string, boxes: readonly FixtureBox[], view: StudioView = 'iso'): StudioShot {
  const bounds = boxesBounds(boxes);
  const size = boundsSize(bounds);
  const target = boundsCenter(bounds);
  const base = { key, boxes, target, alpha: STUDIO_ALPHA[view] };
  if (view === 'iso') {
    const radius = Math.hypot(size.x, size.y, size.z) / 2;
    const half = radius * FRAME_MARGIN + FRAME_PAD;
    return { ...base, beta: CAMERA_BETA, halfW: half, halfH: half, widthPx: STUDIO_PX, heightPx: STUDIO_PX };
  }
  // Ảnh thẳng góc: tỉ lệ ảnh đúng tỉ lệ hộp bao, cạnh dài là STUDIO_PX.
  const halfW = size.x / 2 + FRAME_PAD;
  const halfH = (view === 'top' ? size.z : size.y) / 2 + FRAME_PAD;
  const long = Math.max(halfW, halfH);
  return {
    ...base,
    beta: view === 'top' ? TOP_VIEW_BETA : Math.PI / 2,
    halfW,
    halfH,
    widthPx: Math.max(1, Math.round((STUDIO_PX * halfW) / long)),
    heightPx: Math.max(1, Math.round((STUDIO_PX * halfH) / long)),
  };
}

/** Cảnh và camera của studio: hệ tay phải, trực giao, hai đèn; cùng quy ước với cảnh game để ảnh không bị lật gương. */
export function buildStudioScene(engine: AbstractEngine): { scene: Scene; camera: ArcRotateCamera } {
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(0, 0, 0, 0);
  const camera = new ArcRotateCamera('studio_cam', STUDIO_ALPHA.iso, CAMERA_BETA, 20, Vector3.Zero(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  const hemi = new HemisphericLight('studio_hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  // Phần "đất" của đèn bán cầu mặc định là đen làm mặt thẳng đứng tối sầm; dùng xám sáng trung tính để màu token hiện đúng.
  hemi.groundColor = new Color3(0.62, 0.62, 0.62);
  const sun = new DirectionalLight('studio_sun', new Vector3(-0.4, -1, -0.5), scene);
  sun.intensity = 0.6;
  return { scene, camera };
}

interface Rig {
  canvas: HTMLCanvasElement;
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
}

let rig: Rig | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string | null>>();

function ensureRig(): Rig {
  if (rig) return rig;
  const canvas = document.createElement('canvas');
  canvas.width = STUDIO_PX;
  canvas.height = STUDIO_PX;
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: false, antialias: true, alpha: true }, false);
  engine.setSize(STUDIO_PX, STUDIO_PX);
  rig = { canvas, engine, ...buildStudioScene(engine) };
  return rig;
}

function disposeRig(): void {
  if (!rig) return;
  rig.scene.dispose();
  rig.engine.dispose();
  rig = null;
}

function scheduleIdleDispose(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    disposeRig();
  }, IDLE_DISPOSE_MS);
}

function addBoxes(scene: Scene, boxes: readonly FixtureBox[], made: { dispose: () => void }[]): void {
  const mats = new Map<string, StandardMaterial>();
  for (const b of boxes) {
    const matKey = `${b.color}${b.emissive ? 'e' : ''}${b.alpha !== undefined ? `a${b.alpha}` : ''}`;
    let mat = mats.get(matKey);
    if (!mat) {
      mat = new StandardMaterial(`studio_${matKey}`, scene);
      mat.diffuseColor = Color3.FromHexString(b.color);
      mat.specularColor = Color3.Black();
      if (b.emissive) mat.emissiveColor = Color3.FromHexString(b.color).scale(EMISSIVE_SCALE);
      mat.alpha = b.alpha ?? 1;
      mats.set(matKey, mat);
      made.push(mat);
    }
    const mesh = CreateBox('studio_box', { width: b.sx, height: b.sy, depth: b.sz }, scene);
    mesh.position.set(b.cx, b.cy, b.cz);
    mesh.material = mat;
    made.push(mesh);
  }
}

async function renderOne(shot: StudioShot): Promise<string | null> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  const { canvas, engine, scene, camera } = ensureRig();
  const made: { dispose: () => void }[] = [];
  try {
    addBoxes(scene, shot.boxes, made);
    camera.target.set(shot.target.x, shot.target.y, shot.target.z);
    camera.alpha = shot.alpha;
    camera.beta = shot.beta;
    engine.setSize(shot.widthPx, shot.heightPx);
    camera.orthoLeft = -shot.halfW;
    camera.orthoRight = shot.halfW;
    camera.orthoTop = shot.halfH;
    camera.orthoBottom = -shot.halfH;
    // Không chạy vòng lặp render: đợi shader sẵn sàng, vẽ một khung rồi đọc canvas ngay trong cùng tác vụ (buffer chưa bị xóa).
    await scene.whenReadyAsync();
    scene.render();
    return canvas.toDataURL('image/png');
  } finally {
    for (const item of made) item.dispose();
  }
}

/**
 * Chụp một khung (data URL PNG nền trong suốt). Có cache theo `shot.key`; các lần gọi xếp hàng để dùng chung một engine
 * ngoài màn hình, engine tự giải phóng sau 10 giây rảnh. Trả null khi không có DOM/WebGL hoặc chụp lỗi.
 */
export function renderStudioShot(shot: StudioShot): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  const hit = cache.get(shot.key);
  if (hit) return hit;
  const job = queue.then(async () => {
    try {
      return await renderOne(shot);
    } catch (err) {
      console.warn('[Studio] Chụp ảnh lỗi:', shot.key, err);
      cache.delete(shot.key);
      return null;
    } finally {
      scheduleIdleDispose();
    }
  });
  queue = job;
  cache.set(shot.key, job);
  return job;
}

/** Chụp một danh sách khối bất kỳ (mảnh kit, cả tòa...) với khung tự tính từ hộp bao. */
export function renderBoxesPreview(key: string, boxes: readonly FixtureBox[], view: StudioView = 'iso'): Promise<string | null> {
  return renderStudioShot(studioShotForBoxes(`${key}|${view}`, boxes, view));
}
