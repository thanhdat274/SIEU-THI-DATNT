import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

const MATERIALS = new WeakMap<Scene, Map<string, StandardMaterial>>();

function materialFor(scene: Scene, color: string): StandardMaterial {
  let palette = MATERIALS.get(scene);
  if (!palette) {
    palette = new Map();
    MATERIALS.set(scene, palette);
    scene.onDisposeObservable.addOnce(() => {
      palette?.forEach((material) => material.dispose());
      palette?.clear();
      MATERIALS.delete(scene);
    });
  }
  let material = palette.get(color);
  if (!material) {
    material = new StandardMaterial(`npc_role_${color.replace('#', '')}`, scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    palette.set(color, material);
  }
  return material;
}

/** Create the first role silhouette: a compact, low-poly pushcart for street vendors. */
export function createStreetVendorCart(
  scene: Scene,
  parent: TransformNode,
  id: string,
  modelScale: number,
): Mesh[] {
  const scale = Math.max(0.001, modelScale);
  const meshes: Mesh[] = [];
  const addBox = (name: string, color: string, size: [number, number, number], pos: [number, number, number]): void => {
    const mesh = CreateBox(`${name}_${id}`, {
      width: size[0] / scale,
      height: size[1] / scale,
      depth: size[2] / scale,
    }, scene);
    mesh.position.set(pos[0] / scale, pos[1] / scale, pos[2] / scale);
    mesh.material = materialFor(scene, color);
    mesh.parent = parent;
    mesh.isPickable = false;
    meshes.push(mesh);
  };

  // Khung và thùng hàng đặt cạnh người, cùng mốc kích thước thế giới với nhân vật.
  addBox('vendor_cart_body', '#94704c', [0.34, 0.20, 0.26], [0.34, 0.22, 0]);
  addBox('vendor_cart_rim', '#c99d6a', [0.36, 0.035, 0.28], [0.34, 0.34, 0]);
  addBox('vendor_cart_handle', '#7f8c95', [0.025, 0.025, 0.34], [0.34, 0.43, -0.19]);
  addBox('vendor_cart_tomato', '#e47467', [0.09, 0.07, 0.09], [0.25, 0.39, 0.015]);
  addBox('vendor_cart_leaf', '#72b07e', [0.09, 0.07, 0.09], [0.34, 0.39, 0.015]);
  addBox('vendor_cart_corn', '#f2c168', [0.09, 0.07, 0.09], [0.43, 0.39, 0.015]);

  for (const z of [-0.14, 0.14]) {
    const wheel = CreateCylinder(`vendor_cart_wheel_${z}_${id}`, {
      height: 0.035 / scale,
      diameter: 0.12 / scale,
      tessellation: 10,
    }, scene);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0.34 / scale, 0.10 / scale, z / scale);
    wheel.material = materialFor(scene, '#5f6b77');
    wheel.parent = parent;
    wheel.isPickable = false;
    meshes.push(wheel);
  }
  return meshes;
}
