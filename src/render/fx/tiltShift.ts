import * as THREE from 'three';
import { RenderPipeline } from 'three/webgpu';
import { pass, screenUV, screenSize, uniform, float, vec2, smoothstep, abs } from 'three/tsl';
import type { GameRenderer } from '../scene';

/**
 * Tilt-shift: dải giữa màn hình nét, mép trên/dưới mờ dần → cảnh 3D nhìn như mô hình thu nhỏ.
 * Tham khảo kỹ thuật của nongtrai.jackle.dev (blur 9 tap, trọng số Gauss, dải nét ~44% chiều cao).
 * Viết bằng TSL để chạy được cả backend WebGPU lẫn WebGL2 của WebGPURenderer.
 *
 * File mẫu — chưa nối vào scene.ts. Dùng: `const fx = createTiltShift(renderer, scene, camera)`,
 * trong vòng lặp gọi `fx.render()` thay cho `renderer.render(scene, camera)`.
 */
export interface TiltShiftOptions {
  /** Vị trí tâm dải nét theo chiều cao màn hình (0 = đáy, 1 = đỉnh). */
  focus?: number;
  /** Bề rộng dải nét, tỉ lệ chiều cao màn hình. */
  band?: number;
  /** Độ mờ tối đa ở mép màn hình. 0 = tắt. */
  amount?: number;
}

export interface TiltShift {
  render(): void;
  /** Đổi tham số lúc chạy (ví dụ giảm `amount` về 0 trên máy yếu). */
  focus: { value: number };
  band: { value: number };
  amount: { value: number };
  dispose(): void;
}

// Trọng số kernel 3x3 kiểu Gauss: tâm 1, 4 ô cạnh 0.6376, 4 ô chéo 0.4066 (tổng 5.1768).
const W_SIDE = 0.637628;
const W_CORNER = 0.40657;
const W_SUM = 1 + 4 * W_SIDE + 4 * W_CORNER;

export function createTiltShift(
  renderer: GameRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts: TiltShiftOptions = {},
): TiltShift {
  const focus = uniform(opts.focus ?? 0.52);
  const band = uniform(opts.band ?? 0.44);
  const amount = uniform(opts.amount ?? 1.6);

  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');

  // k = 0 trong dải nét, tăng dần tới `amount` ở mép.
  const k = smoothstep(band.mul(0.5), band.mul(0.5).add(0.4), abs(screenUV.y.sub(focus))).mul(amount);
  // Bước lấy mẫu theo pixel màn hình, nên độ mờ không đổi khi đổi kích thước canvas.
  const s = vec2(3.5, 3.4).mul(k).mul(1.6).div(screenSize);

  const tap = (dx: number, dy: number) => color.sample(screenUV.add(vec2(s.x.mul(dx), s.y.mul(dy))));
  const side = tap(-1, 0).add(tap(1, 0)).add(tap(0, -1)).add(tap(0, 1)).mul(W_SIDE);
  const corner = tap(-1, -1).add(tap(1, -1)).add(tap(-1, 1)).add(tap(1, 1)).mul(W_CORNER);
  const blurred = color.add(side).add(corner).div(float(W_SUM));

  const pipeline = new RenderPipeline(renderer as never, blurred);

  return {
    render: () => pipeline.render(),
    focus,
    band,
    amount,
    dispose: () => pipeline.dispose?.(),
  };
}
