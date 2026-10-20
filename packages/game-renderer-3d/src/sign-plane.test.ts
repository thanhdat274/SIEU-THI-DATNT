import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { createSignPlane } from './sign-plane';

// UV của biển (v = 0 ở HÀNG TRÊN của canvas, như DynamicTexture.update(false)), nhìn từ phía đường (+Z nhìn về -Z, X sang phải, Y lên).
{
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const sign = createSignPlane(scene, 'sign', 6, 1);
  sign.position.set(10, 3, 5);
  sign.computeWorldMatrix(true);
  const pos = sign.getVerticesData(VertexBuffer.PositionKind)!;
  const uv = sign.getVerticesData(VertexBuffer.UVKind)!;
  // Mặt thấy được: scene tay phải cull mặt có pháp tuyến (theo thứ tự đỉnh) hướng +Z khi nhìn từ +Z → cần pháp tuyến -Z.
  const idx = sign.getIndices()!;
  const [a, b, c] = [0, 1, 2].map(k => ({ x: pos[idx[k] * 3], y: pos[idx[k] * 3 + 1] }));
  assert.ok((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0, 'thứ tự đỉnh đảo: mặt thấy được hướng +Z (ra đường) trong scene tay phải');
  const m = sign.getWorldMatrix();
  const corners: Array<{ x: number; y: number; z: number; u: number; v: number }> = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const p = { x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2] };
    const wx = p.x * m.m[0] + p.y * m.m[4] + p.z * m.m[8] + m.m[12];
    const wy = p.x * m.m[1] + p.y * m.m[5] + p.z * m.m[9] + m.m[13];
    const wz = p.x * m.m[2] + p.y * m.m[6] + p.z * m.m[10] + m.m[14];
    corners.push({ x: wx, y: wy, z: wz, u: uv[i * 2], v: uv[i * 2 + 1] });
  }
  const topLeft = corners.find(c => c.u === 0 && c.v === 0)!;
  const bottomRight = corners.find(c => c.u === 1 && c.v === 1)!;
  const topRight = corners.find(c => c.u === 1 && c.v === 0)!;
  assert.ok(topLeft.x < topRight.x, '(u=0,v=0) nằm bên TRÁI (u=1,v=0) khi nhìn từ đường → chữ đọc xuôi');
  assert.ok(topLeft.y > bottomRight.y, '(u=0,v=0) nằm ở HÀNG TRÊN so với (u=1,v=1)');
  assert.ok(Math.abs(topLeft.x - 7) < 1e-9 && Math.abs(topLeft.y - 3.5) < 1e-9, 'góc trên-trái = (x0, ymax)');
  assert.ok(corners.every(c => Math.abs(c.z - 5) < 1e-9), 'biển phẳng, không xoay quanh trục đứng');
  engine.dispose();
}
console.log('PASS sign-plane: UV biển hiệu đọc xuôi khi nhìn từ phía đường');
