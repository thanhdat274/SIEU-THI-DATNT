import * as THREE from 'three';

/** Mức sáng nhấp nháy của marker theo thời gian (ms): 0.25–0.85. */
export const markerGlow = (nowMs: number) => 0.55 + Math.sin(nowMs / 350) * 0.3;

/**
 * Marker hướng dẫn ngày đầu (bước "Đứng quầy"): đĩa và vòng vàng phát sáng trên sàn ngay chỗ
 * đứng sau quầy chính. Tạo một lần, chỉ hiện/ẩn theo điều kiện — không dựng lại nên không có gì phải dọn dẹp.
 */
export function createTutorialMarker(scene: THREE.Scene) {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc107, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc107, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  disc.rotation.x = ring.rotation.x = -Math.PI / 2;
  disc.position.y = ring.position.y = 0.03;
  group.add(disc, ring);
  group.visible = false;
  scene.add(group);
  return {
    group,
    /** Hiện/ẩn marker; khi hiện thì đặt vào `spot` và nhấp nháy. */
    update(visible: boolean, spot: THREE.Vector3, nowMs: number) {
      group.visible = visible;
      if (!visible) return;
      group.position.copy(spot);
      const glow = markerGlow(nowMs);
      (disc.material as THREE.MeshBasicMaterial).opacity = glow * 0.35;
      (ring.material as THREE.MeshBasicMaterial).opacity = glow;
    },
  };
}
