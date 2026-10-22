import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF/index.js';
import { CHARACTER_CATALOG, CHARACTER_MODELS, CHARACTER_PRESENTATION } from '../../../packages/game-renderer-3d/src/character-models';
import { DOOR_HEIGHT_D } from '../../../packages/game-renderer-3d/src/scale-spec';
import { createStreetVendorCart } from '../../../packages/game-renderer-3d/src/character-outfits-3d';

type FilterMode = 'nearest' | 'linear';
const canvas = document.querySelector<HTMLCanvasElement>('#gallery');
const status = document.querySelector<HTMLElement>('#status');
const legend = document.querySelector<HTMLElement>('#legend');
if (!canvas || !status || !legend) throw new Error('Character gallery markup is incomplete');

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.965, 0.925, 0.835, 1);

const camera = new ArcRotateCamera('character_gallery_camera', -Math.PI / 4, 1.08, 18, new Vector3(0, 0.65, 0), scene);
camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
camera.lowerRadiusLimit = 15.5;
camera.upperRadiusLimit = 15.5;
camera.panningSensibility = 0;
camera.wheelPrecision = 0;
camera.lowerAlphaLimit = camera.alpha;
camera.upperAlphaLimit = camera.alpha;
camera.lowerBetaLimit = camera.beta;
camera.upperBetaLimit = camera.beta;
camera.attachControl(canvas, true);
const roots = new Map<number, TransformNode>();
const animationGroups: AnimationGroup[] = [];
let marker: Mesh | null = null;
let target: Mesh | null = null;
let columns = 4;
let rows = 3;
function updateGrid(): void {
  columns = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight()) < 1.1 ? 3 : 4;
  rows = Math.ceil(CHARACTER_MODELS.length / columns);
  const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
  const rowSpacing = 2.15;
  const colSpacing = 2.8;
  const requiredHeight = (rows * rowSpacing) / 2 + 1.65;
  const requiredWidthAsHeight = ((columns * colSpacing) / 2 + 1.0) / aspect;
  const halfHeight = Math.max(requiredHeight, requiredWidthAsHeight);
  camera.orthoTop = halfHeight;
  camera.orthoBottom = -halfHeight;
  camera.orthoLeft = -halfHeight * aspect;
  camera.orthoRight = halfHeight * aspect;
  const markerX = -((columns * colSpacing) / 2 + 0.55);
  if (marker) marker.position.x = markerX;
  if (target) target.position.x = markerX;
  for (const [index, root] of roots) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    root.position.x = (column - (Math.min(columns, CHARACTER_MODELS.length - row * columns) - 1) / 2) * colSpacing;
    root.position.z = (row - (rows - 1) / 2) * rowSpacing;
  }
}
function resizeCamera(): void {
  updateGrid();
}
resizeCamera();

new HemisphericLight('gallery_fill', new Vector3(0, 1, 0), scene).intensity = 0.9;
const keyLight = new DirectionalLight('gallery_key', new Vector3(-0.4, -1, 0.5), scene);
keyLight.position.set(3, 8, -4);
keyLight.intensity = 0.35;
scene.getLightByName('gallery_fill')!.intensity = 0.65;

const floorMaterial = new StandardMaterial('gallery_floor_material', scene);
floorMaterial.diffuseColor = Color3.FromHexString('#e6cfa3');
floorMaterial.ambientColor = Color3.FromHexString('#e6cfa3');
floorMaterial.specularColor = Color3.Black();
const floor = CreateBox('gallery_floor', { width: 18, height: 0.08, depth: 9 }, scene);
floor.position.y = -0.07;
floor.material = floorMaterial;
floor.isPickable = false;

// Hai mốc đứng cạnh nhân vật: cửa/tầng 1,60 và chiều cao mục tiêu 1,28.
const markerMaterial = new StandardMaterial('gallery_marker_material', scene);
markerMaterial.diffuseColor = Color3.FromHexString('#d9795f');
markerMaterial.specularColor = Color3.Black();
marker = CreateCylinder('door_height_marker', { height: DOOR_HEIGHT_D, diameter: 0.035, tessellation: 8 }, scene);
marker.position.set(-7.2, DOOR_HEIGHT_D / 2, 0);
marker.material = markerMaterial;
marker.isPickable = false;
const targetMaterial = new StandardMaterial('gallery_target_material', scene);
targetMaterial.diffuseColor = Color3.FromHexString('#3f7a54');
targetMaterial.specularColor = Color3.Black();
target = CreateBox('character_height_marker', { width: 0.72, height: 0.035, depth: 0.05 }, scene);
target.position.set(-7.2, 1.28, 0);
target.material = targetMaterial;
target.isPickable = false;

const textureSets = new Set<Texture>();
let filterMode: FilterMode = 'linear';
let loaded = 0;
let failed = 0;
let poseMode: 'bind' | 'idle' = 'idle';

function applyTextureFilter(mode: FilterMode): void {
  filterMode = mode;
  const sampling = mode === 'nearest' ? Texture.NEAREST_SAMPLINGMODE : Texture.BILINEAR_SAMPLINGMODE;
  for (const texture of textureSets) texture.updateSamplingMode(sampling);
  document.querySelector<HTMLButtonElement>('#nearest')?.setAttribute('aria-pressed', String(mode === 'nearest'));
  document.querySelector<HTMLButtonElement>('#linear')?.setAttribute('aria-pressed', String(mode === 'linear'));
}

function configureMaterials(materials: readonly (import('@babylonjs/core/Materials/material').Material | null)[]): void {
  for (const material of materials) {
    if (material instanceof StandardMaterial) {
      material.specularColor = Color3.Black();
      if (material.diffuseTexture instanceof Texture) textureSets.add(material.diffuseTexture);
    } else if (material instanceof PBRMaterial) {
      material.metallic = 0;
      material.roughness = 1;
      if (material.albedoTexture instanceof Texture) textureSets.add(material.albedoTexture);
    }
  }
  applyTextureFilter(filterMode);
}

function addLegend(kind: string, height: string, ok: boolean, rolePreview = false): void {
  const item = document.createElement('div');
  item.className = 'item';
  const name = document.createElement('span');
  name.textContent = kind;
  const result = document.createElement('span');
  result.className = ok ? 'ok' : 'bad';
  result.textContent = ok ? `${height} / ${CHARACTER_CATALOG[kind as keyof typeof CHARACTER_CATALOG].targetHeight.toFixed(2)}m` : 'TẢI LỖI';
  item.append(name, result);
  if (rolePreview) {
    const role = document.createElement('small');
    role.className = 'ok';
    role.textContent = '· mẫu người bán hàng';
    item.append(role);
  }
  legend.append(item);
}

function setPoseMode(mode: 'bind' | 'idle'): void {
  poseMode = mode;
  for (const group of animationGroups) group.stop();
  if (mode === 'idle') {
    for (const group of animationGroups) {
      if (group.name.toLowerCase().includes('idle')) group.start(true);
    }
  }
  document.querySelector<HTMLButtonElement>('#bind-pose')?.setAttribute('aria-pressed', String(mode === 'bind'));
  document.querySelector<HTMLButtonElement>('#idle-pose')?.setAttribute('aria-pressed', String(mode === 'idle'));
}

async function loadGallery(): Promise<void> {
  const jobs = CHARACTER_MODELS.map(async (kind, index) => {
    const spec = CHARACTER_CATALOG[kind];
    try {
      const slash = spec.url.lastIndexOf('/');
      const container = await SceneLoader.LoadAssetContainerAsync(spec.url.slice(0, slash + 1), spec.url.slice(slash + 1), scene);
      configureMaterials(container.materials);
      const instantiated = container.instantiateModelsToScene((name) => `gallery_${kind}_${name}`);
      const root = instantiated.rootNodes[0] as TransformNode;
      root.scaling.setAll(spec.scale);
      root.computeWorldMatrix(true);
      const bounds = root.getHierarchyBoundingVectors(true);
      const rawHeight = bounds.max.y - bounds.min.y;
      root.position.x -= (bounds.min.x + bounds.max.x) / 2;
      root.position.y -= bounds.min.y;
      root.position.z -= (bounds.min.z + bounds.max.z) / 2;
      root.computeWorldMatrix(true);
      if (kind === 'character_female_a' || kind === 'character_male_a') {
        createStreetVendorCart(scene, root, `gallery_${kind}`, spec.scale);
      }
      roots.set(index, root);
      loaded++;
      addLegend(kind, rawHeight.toFixed(2), true, kind === 'character_female_a' || kind === 'character_male_a');
      container.removeAllFromScene();
      // Play only idle; starting every GLB clip at once deforms the model with conflicting poses.
      animationGroups.push(...instantiated.animationGroups);
      if (poseMode === 'idle') {
        const idle = instantiated.animationGroups.find((group) => group.name.toLowerCase().includes('idle'));
        idle?.start(true);
      }
      updateGrid();
    } catch (error) {
      failed++;
      addLegend(kind, '—', false);
      console.error(`[CharacterGallery] Failed to load ${kind}`, error);
    }
  });
  await Promise.all(jobs);
  const feminine = CHARACTER_MODELS.filter((kind) => CHARACTER_PRESENTATION[kind] === 'feminine').length;
  const masculine = CHARACTER_MODELS.length - feminine;
  status.textContent = `${loaded}/12 model · ${feminine} tạo hình nữ / ${masculine} nam · ${failed} lỗi · mốc 1,28/1,60m`;
}

document.querySelector('#nearest')?.addEventListener('click', () => applyTextureFilter('nearest'));
document.querySelector('#linear')?.addEventListener('click', () => applyTextureFilter('linear'));
document.querySelector('#bind-pose')?.addEventListener('click', () => setPoseMode('bind'));
document.querySelector('#idle-pose')?.addEventListener('click', () => setPoseMode('idle'));
document.querySelector('#save')?.addEventListener('click', () => {
  const anchor = document.createElement('a');
  anchor.download = 'character-gallery.png';
  anchor.href = engine.getRenderingCanvas()?.toDataURL('image/png') ?? '';
  anchor.click();
});

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => { engine.resize(); resizeCamera(); });
window.addEventListener('beforeunload', () => {
  roots.forEach((root) => root.dispose(false, false));
  scene.dispose();
  engine.dispose();
});
void loadGallery();
