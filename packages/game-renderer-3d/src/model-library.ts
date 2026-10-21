import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import '@babylonjs/loaders/glTF/index.js';
import { SCALE_TARGETS } from './scale-spec';

export type ModelKind =
  | 'tree'
  | 'street_lamp'
  | 'construction_barrier'
  | 'traffic_cone'
  | 'dumpster'
  | 'bush'
  | 'building_civic_clinic'
  | 'building_civic_police'
  | 'building_civic_school'
  | 'building_low_detail_wide_a'
  | 'furniture_fridge'
  | 'furniture_fridge_large'
  | 'furniture_fridge_small'
  | 'furniture_kitchen_bar'
  | 'furniture_computer_screen';

export interface ModelSpec {
  url: string;
  /** Tỉ lệ gốc của model tương quan với 1 ô thế giới */
  scale: number;
  /** Chiều cao tương đối hoặc cao độ chuẩn */
  targetHeight: number;
}

/** Bảng ánh xạ loại vật → đường dẫn model + thông số tỉ lệ */
export const MODEL_CATALOG: Record<ModelKind, ModelSpec> = {
  tree: {
    url: '/assets/models/nature-kit/tree_default.glb',
    scale: ((SCALE_TARGETS.treeMin + SCALE_TARGETS.treeMax) / 2) / 1.708,
    targetHeight: (SCALE_TARGETS.treeMin + SCALE_TARGETS.treeMax) / 2, // ~2.96 (1.85 * D)
  },
  street_lamp: {
    url: '/assets/models/city-kit-roads/light-curved.glb',
    scale: SCALE_TARGETS.streetLamp / 0.675, // 1.7 * D = 2.72
    targetHeight: SCALE_TARGETS.streetLamp,
  },
  construction_barrier: {
    url: '/assets/models/city-kit-roads/construction-barrier.glb',
    scale: 3.5, // dài ~0.8 ô, cao ~0.45 ô
    targetHeight: 0.45,
  },
  traffic_cone: {
    url: '/assets/models/city-kit-roads/construction-cone.glb',
    scale: 4.0, // cao ~0.38 ô
    targetHeight: 0.38,
  },
  dumpster: {
    url: '/assets/models/city-kit-roads/dumpster.glb',
    scale: 3.0, // dài ~0.9 ô, rộng ~0.8 ô, cao ~0.6 ô
    targetHeight: 0.6,
  },
  bush: {
    url: '/assets/models/nature-kit/plant_bush.glb',
    scale: 2.5, // đường kính ~1.0 ô, cao ~0.6 ô
    targetHeight: 0.6,
  },
  building_civic_clinic: {
    url: '/assets/models/city-kit/building-c.glb',
    scale: 6.8, // size 0.88x1.09x0.89 -> rộng ~6 ô, sâu ~7.4 ô, cao ~6.0 ô (khớp footprint 6x8)
    targetHeight: 6.0,
  },
  building_civic_police: {
    url: '/assets/models/city-kit/building-d.glb',
    scale: 7.1, // size 0.84x0.90x1.29 -> rộng ~6 ô, sâu ~6.4 ô, cao ~9.1 ô (khớp footprint 6x8)
    targetHeight: 9.1,
  },
  building_civic_school: {
    url: '/assets/models/city-kit/building-e.glb',
    scale: 4.88, // size 1.64x1.01x0.89 -> rộng ~8.0 ô, sâu ~4.9 ô, cao ~4.3 ô (khớp footprint 8x8)
    targetHeight: 4.3,
  },
  building_low_detail_wide_a: {
    url: '/assets/models/city-kit/low-detail-building-wide-a.glb',
    scale: 6.0, // size 1.0x0.5x1.1 -> rộng ~6.0 ô, sâu ~3.0 ô, cao ~6.6 ô
    targetHeight: 6.6,
  },
  furniture_fridge: {
    url: '/assets/models/furniture-kit/kitchenFridge.glb',
    scale: SCALE_TARGETS.fixtures.fridge / 0.917, // 0.90 * D = 1.44
    targetHeight: SCALE_TARGETS.fixtures.fridge,
  },
  furniture_fridge_large: {
    url: '/assets/models/furniture-kit/kitchenFridgeLarge.glb',
    scale: SCALE_TARGETS.fixtures.fridge / 0.917,
    targetHeight: SCALE_TARGETS.fixtures.fridge,
  },
  furniture_fridge_small: {
    url: '/assets/models/furniture-kit/kitchenFridgeSmall.glb',
    scale: (SCALE_TARGETS.fixtures.fridge * 0.8) / 0.60,
    targetHeight: SCALE_TARGETS.fixtures.fridge * 0.8,
  },
  furniture_kitchen_bar: {
    url: '/assets/models/furniture-kit/kitchenBar.glb',
    scale: SCALE_TARGETS.fixtures.counter / 0.419, // 0.45 * D = 0.72
    targetHeight: SCALE_TARGETS.fixtures.counter,
  },
  furniture_computer_screen: {
    url: '/assets/models/furniture-kit/computerScreen.glb',
    scale: 1.0,
    targetHeight: 0.29,
  },
};

/** Danh sách model nội thất sử dụng màu vật liệu gốc (material-color): giữ albedoColor, bỏ unlit, specular = 0. */
export const MATERIAL_COLOR_MODELS: ReadonlySet<ModelKind> = new Set<ModelKind>([
  'furniture_fridge',
  'furniture_fridge_large',
  'furniture_fridge_small',
  'furniture_kitchen_bar',
  'furniture_computer_screen',
]);


/** Danh sách model không cần texture ảnh mà được tô lại màu chuẩn bằng diffuseColor. */
export const RECOLOR_MODELS: ReadonlySet<ModelKind> = new Set<ModelKind>(['tree', 'bush']);
export interface LoadedModelContainer {
  kind: ModelKind;
  root: Mesh;
  renderMeshes: Mesh[];
}

/**
 * Cấu hình lấy mẫu NEAREST cho texture trong material để giữ nguyên chất pixel/voxel sắc nét.
 */
export function applyNearestSampling(scene: Scene): void {
  for (const mat of scene.materials) {
    if (mat instanceof StandardMaterial) {
      if (mat.diffuseTexture instanceof Texture) {
        mat.diffuseTexture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
      }
    } else if (mat instanceof PBRMaterial) {
      if (mat.albedoTexture instanceof Texture) {
        mat.albedoTexture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
      }
    }
  }
}

/**
 * ModelLibrary: Quản lý tải model 3D một lần, caching mesh gốc (ẩn),
 * và hỗ trợ fallback tạo khối dựng code khi tải lỗi để game không bao giờ treo.
 */
export class ModelLibrary {
  private static instance: ModelLibrary | null = null;
  private readonly sceneTemplates = new WeakMap<Scene, Map<ModelKind, LoadedModelContainer>>();
  private readonly sceneLoadPromises = new WeakMap<Scene, Map<ModelKind, Promise<LoadedModelContainer | null>>>();
  private readonly sceneFailedModels = new WeakMap<Scene, Set<ModelKind>>();

  public static getInstance(): ModelLibrary {
    if (!ModelLibrary.instance) {
      ModelLibrary.instance = new ModelLibrary();
    }
    return ModelLibrary.instance;
  }

  /**
   * Reset instance singleton và giải phóng toàn bộ template mesh đang giữ (nếu có).
   */
  public static resetInstance(): void {
    if (ModelLibrary.instance) {
      ModelLibrary.instance.dispose();
      ModelLibrary.instance = null;
    }
  }

  public dispose(): void {
    // WeakMap tự dọn khi scene bị thu gom, nhưng nếu cần dọn thủ công thì resetInstance dọn sạch instance.
  }

  public isFailed(scene: Scene, kind: ModelKind): boolean {
    return this.sceneFailedModels.get(scene)?.has(kind) ?? false;
  }

  public getLoadedModel(scene: Scene, kind: ModelKind): LoadedModelContainer | null {
    if (scene.isDisposed) return null;
    return this.sceneTemplates.get(scene)?.get(kind) ?? null;
  }

  /**
   * Tải template model cho scene nếu chưa có. Nếu tải lỗi, ghi nhận vào failedModels và trả về null (không throw).
   */
  public async loadModel(scene: Scene, kind: ModelKind): Promise<LoadedModelContainer | null> {
    if (scene.isDisposed) return null;

    let templates = this.sceneTemplates.get(scene);
    if (!templates) {
      templates = new Map();
      this.sceneTemplates.set(scene, templates);
    }
    const cached = templates.get(kind);
    if (cached) return cached;

    let failedSet = this.sceneFailedModels.get(scene);
    if (!failedSet) {
      failedSet = new Set();
      this.sceneFailedModels.set(scene, failedSet);
    }
    if (failedSet.has(kind)) return null;

    let promises = this.sceneLoadPromises.get(scene);
    if (!promises) {
      promises = new Map();
      this.sceneLoadPromises.set(scene, promises);
    }
    const existingPromise = promises.get(kind);
    if (existingPromise) return existingPromise;

    const spec = MODEL_CATALOG[kind];
    if (!spec) {
      failedSet.add(kind);
      return null;
    }
    const promise = (async () => {
      try {
        const lastSlash = spec.url.lastIndexOf('/');
        const rootUrl = lastSlash !== -1 ? spec.url.slice(0, lastSlash + 1) : '';
        const filename = lastSlash !== -1 ? spec.url.slice(lastSlash + 1) : spec.url;

        const result = await SceneLoader.ImportMeshAsync('', rootUrl, filename, scene);
        if (scene.isDisposed) {
          result.meshes.forEach(m => m.dispose());
          return null;
        }
        applyNearestSampling(scene);

        const root = (result.meshes.find(m => m.name === '__root__') ?? result.meshes[0]) as Mesh;
        const renderMeshes = result.meshes.filter(m => m !== root && (m as Mesh).geometry) as Mesh[];

        if (renderMeshes.length > 0) {
          // Kiểm tra material: mọi material của model phải có diffuseTexture/albedoTexture khác null
          // Nếu null (hoặc thiếu texture), ghi cảnh báo và coi như tải lỗi để chuyển sang fallback khối dựng code
          let hasMissingTexture = false;
          for (const mesh of renderMeshes) {
            const mat = mesh.material;
            if (!mat) {
              hasMissingTexture = true;
              break;
            }
            if (mat instanceof StandardMaterial) {
              if (!mat.diffuseTexture) {
                hasMissingTexture = true;
                break;
              }
            } else if (mat instanceof PBRMaterial) {
              if (!mat.albedoTexture) {
                hasMissingTexture = true;
                break;
              }
            } else {
              hasMissingTexture = true;
              break;
            }
          }

          if (RECOLOR_MODELS.has(kind)) {
            // Model nằm trong danh sách tô lại màu: bỏ unlit, đặt diffuseColor xanh đậm tự nhiên (#246820 lá, #5a3d28 thân)
            for (const mesh of renderMeshes) {
              const matName = (mesh.material?.name ?? '').toLowerCase();
              const recolorMat = new StandardMaterial(`${kind}_${mesh.name}_recolor`, scene);
              recolorMat.specularColor = Color3.Black();
              if (kind === 'tree') {
                if (matName.includes('wood') || matName.includes('bark') || mesh.name.toLowerCase().includes('primitive0')) {
                  recolorMat.diffuseColor = Color3.FromHexString('#5a3d28'); // Thân cây nâu gỗ sẫm
                  recolorMat.ambientColor = Color3.FromHexString('#2d1e14');
                } else {
                  recolorMat.diffuseColor = Color3.FromHexString('#246820'); // Tán lá xanh đậm tự nhiên, không bị chói trắng
                  recolorMat.ambientColor = Color3.FromHexString('#143d12');
                }
              } else if (kind === 'bush') {
                recolorMat.diffuseColor = Color3.FromHexString('#246820'); // Bụi xanh đậm
                recolorMat.ambientColor = Color3.FromHexString('#143d12');
              }
              mesh.material = recolorMat;
            }
          } else if (MATERIAL_COLOR_MODELS.has(kind)) {
            // Model nhóm "material-color": giữ màu gốc (albedoColor), bỏ unlit, specular = 0
            for (const mesh of renderMeshes) {
              const mat = mesh.material;
              if (!mat) continue;
              if (mat instanceof PBRMaterial) {
                const std = new StandardMaterial(`${kind}_${mesh.name}_std`, scene);
                std.diffuseColor = mat.albedoColor ? mat.albedoColor.clone() : Color3.White();
                std.specularColor = Color3.Black();
                if (mat.alpha !== undefined && mat.alpha < 1) {
                  std.alpha = mat.alpha;
                  std.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
                }
                mesh.material = std;
              } else if (mat instanceof StandardMaterial) {
                mat.specularColor = Color3.Black();
              }
            }
          } else if (hasMissingTexture) {
            console.warn(`[ModelLibrary] Model ${kind} có material thiếu texture (diffuseTexture/albedoTexture là null), tự động chuyển sang fallback dựng bằng code.`);
            root.dispose();
            failedSet!.add(kind);
            return null;
          }

          root.setEnabled(false); // Ẩn template gốc
          const container: LoadedModelContainer = { kind, root, renderMeshes };
          templates!.set(kind, container);
          return container;
        }

        // Không tìm thấy mesh có geometry
        failedSet!.add(kind);
        return null;
      } catch (err) {
        console.warn(`[ModelLibrary] Không thể tải model ${kind} từ ${spec.url}, tự động dùng fallback dựng bằng code.`, err);
        failedSet!.add(kind);
        return null;
      } finally {
        promises!.delete(kind);
      }
    })();

    promises.set(kind, promise);
    return promise;
  }
}
