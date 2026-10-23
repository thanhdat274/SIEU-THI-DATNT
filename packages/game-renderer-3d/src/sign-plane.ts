import type { Scene } from '@babylonjs/core/scene';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';

/**
 * Biển hiệu: plane đứng, mặt trước (mặt không bị cull) hướng +Z (ra đường phía nam — người chơi ở quarter 0 nhìn từ +Z
 * về -Z, X sang phải). Không xoay quanh trục đứng. Scene tay phải đảo chiều cull nên dựng với BACKSIDE (đảo thứ tự đỉnh,
 * giữ nguyên vị trí). UV theo quy ước ảnh canvas (texture cập nhật với invertY = false): điểm (u=0, v=0) = pixel (0, 0) =
 * góc TRÊN-TRÁI khi nhìn từ phía đường, u tăng theo +X, v tăng xuống dưới (kiểm ở sign-plane.test.ts).
 */
export function createSignPlane(scene: Scene, name: string, width: number, height: number): Mesh {
  const plane = CreatePlane(name, { width, height, sideOrientation: Mesh.BACKSIDE }, scene);
  const uv = plane.getVerticesData(VertexBuffer.UVKind)!.slice();
  for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];
  plane.setVerticesData(VertexBuffer.UVKind, uv);
  return plane;
}
