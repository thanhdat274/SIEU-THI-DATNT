import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { StoreFixture } from '@game/shared';
import { CAMERA_BETA, isoAlpha } from './coords';
import { fixtureBoxes, type FixtureBox } from './fixture-shapes';
import { EMISSIVE_SCALE } from './fixtures-3d';

const PREVIEW_PX = 192;
const IDLE_DISPOSE_MS = 10_000;
/** Chiều cao nội thất cao nhất (kệ, tủ lạnh) để đặt tâm ngắm và biên khung hình. */
const FRAME_HEIGHT = 1.4;
/** Gần 0 (không dùng đúng 0 để tránh suy biến trục lên của ArcRotateCamera). */
const TOP_VIEW_BETA = 0.001;
const TOP_VIEW_PAD = 0.05;

type PreviewFixture = Pick<StoreFixture, 'type' | 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>;

/** Góc chụp: 'iso' nghiêng như camera game (thẻ, danh sách); 'top' nhìn thẳng từ trên xuống (ô trên bảng bố trí, được xoay bằng CSS). */
export type FixturePreviewView = 'iso' | 'top';

/** Khóa cache: mọi món cùng loại và cùng chân diện có cùng hình trong game nên dùng chung một ảnh. */
export function fixturePreviewKey(type: StoreFixture['type'], widthTiles: number, heightTiles: number, view: FixturePreviewView = 'iso'): string {
  return `${type}|${widthTiles}x${heightTiles}|${view}`;
}

/** Fixture giả đặt ở ô (0,0), không xoay, dùng để dựng đúng hình như trong game. */
export function previewFixtureFor(type: StoreFixture['type'], widthTiles: number, heightTiles: number): PreviewFixture {
  return { type, tileX: 0, tileY: 0, widthTiles, heightTiles, rotation: 0 };
}

interface PreviewRig {
  canvas: HTMLCanvasElement;
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
}

let rig: PreviewRig | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string | null>>();

function ensureRig(): PreviewRig {
  if (rig) return rig;
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_PX;
  canvas.height = PREVIEW_PX;
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: false, antialias: true, alpha: true }, false);
  engine.setSize(PREVIEW_PX, PREVIEW_PX);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  const camera = new ArcRotateCamera('preview_cam', isoAlpha(0), CAMERA_BETA, 20, Vector3.Zero(), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  new HemisphericLight('preview_hemi', new Vector3(0, 1, 0), scene).intensity = 0.85;
  const sun = new DirectionalLight('preview_sun', new Vector3(-0.4, -1, -0.5), scene);
  sun.intensity = 0.6;
  rig = { canvas, engine, scene, camera };
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
      mat = new StandardMaterial(`pv_${matKey}`, scene);
      mat.diffuseColor = Color3.FromHexString(b.color);
      mat.specularColor = Color3.Black();
      if (b.emissive) mat.emissiveColor = Color3.FromHexString(b.color).scale(EMISSIVE_SCALE);
      mat.alpha = b.alpha ?? 1;
      mats.set(matKey, mat);
      made.push(mat);
    }
    const mesh = CreateBox('pv_box', { width: b.sx, height: b.sy, depth: b.sz }, scene);
    mesh.position.set(b.cx, b.cy, b.cz);
    mesh.material = mat;
    made.push(mesh);
  }
}

async function renderOne(type: StoreFixture['type'], widthTiles: number, heightTiles: number, view: FixturePreviewView): Promise<string | null> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  const { canvas, engine, scene, camera } = ensureRig();
  const fix = previewFixtureFor(type, widthTiles, heightTiles);
  const cx = widthTiles / 2;
  const cz = heightTiles / 2;
  const made: { dispose: () => void }[] = [];
  try {
    addBoxes(scene, fixtureBoxes(fix, 0.5), made);

    camera.target.set(cx, FRAME_HEIGHT / 2, cz);
    camera.alpha = view === 'top' ? -Math.PI / 2 : isoAlpha(0);
    camera.beta = view === 'top' ? TOP_VIEW_BETA : CAMERA_BETA;
    if (view === 'top') {
      // Ảnh có tỉ lệ đúng chân diện để lấp đầy ô trên bảng bố trí.
      const longSide = Math.max(widthTiles, heightTiles);
      engine.setSize(Math.round((PREVIEW_PX * widthTiles) / longSide), Math.round((PREVIEW_PX * heightTiles) / longSide));
      camera.orthoLeft = -widthTiles / 2 - TOP_VIEW_PAD;
      camera.orthoRight = widthTiles / 2 + TOP_VIEW_PAD;
      camera.orthoTop = heightTiles / 2 + TOP_VIEW_PAD;
      camera.orthoBottom = -heightTiles / 2 - TOP_VIEW_PAD;
    } else {
      engine.setSize(PREVIEW_PX, PREVIEW_PX);
      const half = Math.max(widthTiles, heightTiles) * 0.62 + 0.3;
      camera.orthoLeft = -half;
      camera.orthoRight = half;
      camera.orthoTop = half;
      camera.orthoBottom = -half;
    }
    // Không chạy vòng lặp render: đợi shader sẵn sàng, vẽ một khung rồi đọc canvas ngay trong cùng tác vụ (buffer chưa bị xóa).
    await scene.whenReadyAsync();
    scene.render();
    return canvas.toDataURL('image/png');
  } finally {
    for (const item of made) item.dispose();
  }
}

/**
 * Chụp ảnh xem trước (data URL PNG nền trong suốt) của một loại nội thất từ chính các khối dựng bằng code dùng trong game
 * (`fixtureBoxes`, cũng là hình game dùng khi model Kenney chưa tải). Không dùng model Kenney: cách đặt chúng ở `fixtures-3d` chưa khớp với file.
 * Có cache theo loại + chân diện; các lần gọi xếp hàng để dùng chung một engine ngoài màn hình.
 * Trả null khi không có DOM/WebGL hoặc chụp lỗi (giao diện tự hiện ô trống).
 */
export function renderFixturePreview(type: StoreFixture['type'], widthTiles: number, heightTiles: number, view: FixturePreviewView = 'iso'): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  const key = fixturePreviewKey(type, widthTiles, heightTiles, view);
  const hit = cache.get(key);
  if (hit) return hit;
  const job = queue.then(async () => {
    try {
      return await renderOne(type, widthTiles, heightTiles, view);
    } catch (err) {
      console.warn('[FixturePreview] Chụp ảnh xem trước lỗi:', key, err);
      cache.delete(key);
      return null;
    } finally {
      scheduleIdleDispose();
    }
  });
  queue = job;
  cache.set(key, job);
  return job;
}
