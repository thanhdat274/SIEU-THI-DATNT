import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { registerLight } from '../render/lightBudget';

/**
 * Vị trí dựng đèn: [x, z, hướng cần que đèn].
 * Đường chính hai bên (que hướng vào lòng đường, hai bên so le nhau),
 * con đường thứ hai phía bắc, hẻm dọc phía tây.
 */
const SPOTS: [number, number, number][] = [
  // Bờ nam đường chính (que hướng -z)
  ...[-63, -49, -35, -21, -7, 7, 21, 35, 49, 63].map((x): [number, number, number] => [x, 9.7, Math.PI]),
  // Bờ bắc: chừa trước cửa từng nhà và mặt tiền tiệm
  ...[-33.5, -24.5, -17.2, -7, 15.2, 23.5, 30.5, 40].map((x): [number, number, number] => [x, 1.55, 0]),
  // Con đường thứ hai, phía bắc (que hướng -z về phía đường)
  ...[43, 57, 66, 75].map((x): [number, number, number] => [x, -52.4, Math.PI]),
  // Hẻm dọc, phía tây (que hướng +x về phía hẻm)
  ...[-10, -32].map((z): [number, number, number] => [46.9, z, Math.PI / 2]),
];

/**
 * Đèn đường dọc khu phố: cột sơn xám, que vươn ra lòng đường, đầu đèn phát sáng lúc trời tối.
 * Ban ngày chỉ còn cột; tối đi thì đầu đèn sáng dần, nguồn sáng thật do quỹ ánh sáng (lightBudget) chọn.
 */
export class StreetLamps {
  readonly group = new THREE.Group();
  /** Cột đèn là vật cản trên lưới đi lại (đăng ký vào NavGrid khi dựng thế giới). */
  readonly boxes: THREE.Box3[] = [];
  private headMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffd28a, emissiveIntensity: 0 });
  private glowMat = new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  private lights: THREE.PointLight[] = [];

  constructor() {
    // GĐ907: thân đèn (đế/cột/que/chao) gộp 1 hình + bóng 1 hình, vẽ bằng InstancedMesh: 24 cột × 5 mesh → 2 draw call
    const { metalGeo, bulbGeo } = lampGeometries();
    const metal = new THREE.InstancedMesh(metalGeo, new THREE.MeshStandardMaterial({ color: 0x455a64 }), SPOTS.length);
    const bulbs = new THREE.InstancedMesh(bulbGeo, this.headMat, SPOTS.length);
    metal.castShadow = true;
    const m = new THREE.Matrix4();
    SPOTS.forEach(([x, z, rot], i) => {
      m.makeRotationY(rot).setPosition(x, 0, z);
      metal.setMatrixAt(i, m);
      bulbs.setMatrixAt(i, m);
    });
    metal.instanceMatrix.needsUpdate = bulbs.instanceMatrix.needsUpdate = true;
    metal.computeBoundingSphere();
    bulbs.computeBoundingSphere();
    this.group.add(metal, bulbs);
    for (const [x, z, rot] of SPOTS) {
      const lamp = createLamp(this.glowMat);
      lamp.position.set(x, 0, z);
      lamp.rotation.y = rot;
      this.group.add(lamp);
      const light = lamp.getObjectByName('light')! as THREE.PointLight;
      this.lights.push(light);
      // Nguồn sáng thật nằm ở đầu que (vươn +z 0.95 m sau khi quay); bật/tắt do quỹ ánh sáng lo
      registerLight(light, new THREE.Vector3(x + Math.sin(rot) * 0.95, 4.1, z + Math.cos(rot) * 0.95));
      this.boxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0.5, z), new THREE.Vector3(0.3, 1, 0.3)));
    }
  }

  /** @param level 0 = ban ngày, 1 = sáng hẳn (cùng mức với đèn trong nhà) */
  update(level: number) {
    this.headMat.emissiveIntensity = level * 2.5;
    this.glowMat.opacity = level * 0.8;
    // Luôn đặt lại intensity (kể cả 0): nếu bỏ sớm thì đèn giữ nguyên cường độ cũ
    // qua cả buổi ngày, toả vũng sáng mờ khó chịu ngoài nắng
    for (const light of this.lights) light.intensity = level * 36;
  }
}

/** Quầng sáng loang quanh chao đèn, nhìn rõ từ xa lúc đêm. */
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 216, 156, 0.95)');
  grad.addColorStop(0.4, 'rgba(255, 202, 124, 0.35)');
  grad.addColorStop(1, 'rgba(255, 192, 112, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Hình học cột đèn ở gốc toạ độ cột (que vươn +z): thân kim loại gộp một khối, bóng đèn riêng (vật liệu phát sáng). */
function lampGeometries(): { metalGeo: THREE.BufferGeometry; bulbGeo: THREE.BufferGeometry } {
  const base = new THREE.CylinderGeometry(0.11, 0.15, 0.3, 8).translate(0, 0.15, 0);
  const pole = new THREE.CylinderGeometry(0.05, 0.08, 4.3, 8).translate(0, 2.45, 0);
  const arm = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6).rotateX(Math.PI / 2).translate(0, 4.5, 0.5);
  const head = new THREE.BoxGeometry(0.26, 0.12, 0.72).translate(0, 4.48, 0.95);
  const parts = [base, pole, arm, head];
  const metalGeo = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  return { metalGeo, bulbGeo: new THREE.BoxGeometry(0.18, 0.06, 0.56).translate(0, 4.4, 0.95) };
}

/** Một cột đèn: chỉ còn quầng sáng và nguồn sáng thật (thân đèn do InstancedMesh vẽ). */
function createLamp(glowMat: THREE.SpriteMaterial): THREE.Group {
  const g = new THREE.Group();
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(0, 4.3, 0.95);
  glow.scale.setScalar(2.4);
  const light = new THREE.PointLight(0xffd9a0, 0, 16, 1.8);
  light.position.set(0, 4.15, 0.95);
  light.name = 'light';
  g.add(glow, light);
  return g;
}
