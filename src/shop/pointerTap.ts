import * as THREE from 'three';
import { useGame } from '../core/store';
import type { BuildMode } from './buildMode';
import type { Player } from '../agents/player';
import type { CameraController } from '../render/cameraController';

/**
 * Bấm chuột (không kéo) chỉ dùng cho chế độ xây; nhân vật đi bằng phím hoặc cần điều khiển.
 * Trên màn cảm ứng, chạm ngắn lên mặt đất = đi tới đó (kéo dài vẫn là pan camera).
 */
export function installPointerTap(
  renderer: { domElement: HTMLCanvasElement },
  camera: THREE.Camera,
  controller: CameraController,
  buildMode: BuildMode,
  player: Player,
  playing: () => boolean,
) {
  const _tapRay = new THREE.Raycaster();
  const _tapNdc = new THREE.Vector2();
  const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const _tapHit = new THREE.Vector3();
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (e.button === 2 && controller.dragged <= 6 && useGame.getState().placing) buildMode.cancel();
    if (e.button !== 0 || controller.dragged > 6 || !playing()) return;
    buildMode.click(e);
    // Chạm ngắn trên điện thoại để đi tới chỗ đó (đang xây/đang đặt đồ thì không chiếm)
    const s = useGame.getState();
    if (e.pointerType === 'touch' && !s.buildMode && !s.placing && !player.asleep) {
      const rect = renderer.domElement.getBoundingClientRect();
      _tapNdc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      _tapRay.setFromCamera(_tapNdc, camera);
      if (_tapRay.ray.intersectPlane(_groundPlane, _tapHit)) {
        _tapHit.x = THREE.MathUtils.clamp(_tapHit.x, -80, 80);
        _tapHit.z = THREE.MathUtils.clamp(_tapHit.z, -80, 80);
        player.walkTo(_tapHit.clone());
      }
    }
  });
}
