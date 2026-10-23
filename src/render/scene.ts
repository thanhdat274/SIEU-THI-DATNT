import { WEATHER, type Sky, type WeatherInfo } from '../data/weather';
import * as THREE from 'three';

/** Điện thoại / máy tính bảng: giảm độ phân giải, bóng và hạt mưa cho đỡ nóng máy. */
export const LOW_POWER = matchMedia('(pointer: coarse)').matches;

export function createRenderer(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOW_POWER ? 1.5 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 500);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { renderer, scene, camera };
}

const DAY_SKY = new THREE.Color(0x87b5e0);
const DUSK_SKY = new THREE.Color(0xf0a060);
const NIGHT_SKY = new THREE.Color(0x0b1530);
const STORM_SKY = new THREE.Color(0x7d8a96);

/** Bóng nắng phủ quanh camera bấy nhiêu mét: nhỏ thì bóng sắc nét. */
const SHADOW_RANGE = 26;
const RAIN_DROPS = LOW_POWER ? 2000 : 5000;
const RAIN_BOX = { w: 70, h: 30 };
const CLOUDS = 14;
const CLOUD_HEIGHT = 30;

/**
 * Ánh sáng ngày đêm và thời tiết: mặt trời chạy theo giờ, bóng đổ bám theo chỗ camera nhìn,
 * mây trôi (có bóng in xuống đất), mưa, sương mù và chớp khi giông.
 */
export class Lighting {
  sun = new THREE.DirectionalLight(0xfff4e0, 2);
  ambient = new THREE.HemisphereLight(0xffffff, 0x444422, 1);
  /** Thời tiết đang hiện (chuyển dần sang thời tiết mới). */
  private now: Pick<WeatherInfo, 'clouds' | 'rain' | 'fog'> = { ...WEATHER.sunny };
  private rain: THREE.LineSegments;
  private rainPos: Float32Array;
  private clouds: THREE.Group[] = [];
  private flash = 0;
  private nextFlash = 5;

  constructor(private scene: THREE.Scene) {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(LOW_POWER ? 1024 : 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -SHADOW_RANGE;
    cam.right = cam.top = SHADOW_RANGE;
    cam.near = 1;
    cam.far = 160;
    scene.add(this.sun, this.sun.target, this.ambient);
    scene.background = DAY_SKY.clone();
    scene.fog = new THREE.Fog(DAY_SKY.clone(), 60, 400);

    // Mưa: mỗi giọt là một đoạn thẳng ngắn, rơi trong một hộp bám theo camera
    this.rainPos = new Float32Array(RAIN_DROPS * 6);
    for (let i = 0; i < RAIN_DROPS; i++) this.resetDrop(i, new THREE.Vector3(), Math.random() * RAIN_BOX.h);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xb8cde0, transparent: true, opacity: 0.55 }));
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // Mây: cụm cầu dẹt, đổ bóng xuống đất khi trôi qua
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, roughness: 1 });
    for (let i = 0; i < CLOUDS; i++) {
      const cloud = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < puffs; j++) {
        const r = 2.5 + Math.random() * 2.5;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
        puff.position.set((j - puffs / 2) * 2.8 + Math.random(), Math.random() * 1.2, (Math.random() - 0.5) * 4);
        puff.scale.y = 0.5;
        puff.castShadow = true;
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 140, CLOUD_HEIGHT + Math.random() * 6, (Math.random() - 0.5) * 140);
      this.clouds.push(cloud);
      scene.add(cloud);
    }
  }

  private resetDrop(i: number, focus: THREE.Vector3, y = RAIN_BOX.h) {
    const x = focus.x + (Math.random() - 0.5) * RAIN_BOX.w;
    const z = focus.z + (Math.random() - 0.5) * RAIN_BOX.w;
    const p = this.rainPos;
    p.set([x, y, z, x + 0.15, y + 0.7, z], i * 6);
  }

  /**
   * @param minutes giờ trong game
   * @param weather trời lúc này (mây, mưa, sương theo giờ)
   * @param focus chỗ camera đang nhìn (bóng đổ và mưa bám theo)
   * @param dt giây thật
   */
  update(minutes: number, weather: Sky, focus: THREE.Vector3, dt: number) {
    // Đổi thời tiết từ từ trong vài giây
    const target = weather;
    const k = Math.min(1, dt * 0.4);
    this.now.clouds += (target.clouds - this.now.clouds) * k;
    this.now.rain += (target.rain - this.now.rain) * k;
    this.now.fog += (target.fog - this.now.fog) * k;
    const { clouds, rain, fog } = this.now;

    const hour = (minutes / 60) % 24;
    // 5h mọc, 19h lặn
    const angle = ((hour - 5) / 14) * Math.PI;
    const height = Math.sin(angle);
    const sunDir = new THREE.Vector3(Math.cos(angle), Math.max(height, 0.05), 0.45).normalize();
    this.sun.position.copy(focus).addScaledVector(sunDir, 70);
    this.sun.target.position.copy(focus);
    // Mây dày thì nắng yếu, bóng nhạt
    const daylight = THREE.MathUtils.clamp(height * 3, 0, 1);
    this.sun.intensity = 2.4 * daylight * (1 - clouds * 0.8);
    this.ambient.intensity = (0.25 + 0.85 * daylight) * (1 - clouds * 0.4);

    // Chớp khi giông: trời loé sáng chốc lát
    this.flash = Math.max(0, this.flash - dt * 6);
    if (weather.thunder && (this.nextFlash -= dt) <= 0) {
      this.flash = 1;
      this.nextFlash = 4 + Math.random() * 8;
    }
    this.ambient.intensity += this.flash * 2.5;

    const sky = this.scene.background as THREE.Color;
    if (daylight > 0.5) sky.copy(DAY_SKY).lerp(DUSK_SKY, 1 - (daylight - 0.5) * 2);
    else sky.copy(NIGHT_SKY).lerp(DUSK_SKY, daylight * 2);
    sky.lerp(STORM_SKY.clone().multiplyScalar(0.3 + 0.7 * daylight), clouds * 0.7);
    if (this.flash > 0) sky.lerp(new THREE.Color(0xe8eeff), this.flash * 0.6);
    const sceneFog = this.scene.fog as THREE.Fog;
    sceneFog.color.copy(sky);
    sceneFog.near = THREE.MathUtils.lerp(80, 4, fog);
    sceneFog.far = THREE.MathUtils.lerp(400, 42, fog);

    // Mây trôi theo gió, ra khỏi vùng thì quay lại phía bên kia
    const visibleClouds = Math.round(clouds * CLOUDS);
    this.clouds.forEach((c, i) => {
      c.visible = i < visibleClouds;
      c.position.x += dt * (1.2 + rain * 2.5);
      if (c.position.x > focus.x + 80) c.position.x -= 160;
      if (c.position.x < focus.x - 80) c.position.x += 160;
      if (Math.abs(c.position.z - focus.z) > 80) c.position.z = focus.z + (Math.random() - 0.5) * 140;
      const shade = 1 - clouds * 0.45;
      ((c.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setScalar(shade);
    });

    // Mưa rơi chéo theo gió; giọt chạm đất thì sinh lại trên cao
    const drops = Math.round(rain * RAIN_DROPS);
    this.rain.visible = drops > 0;
    if (drops > 0) {
      const p = this.rainPos;
      const fall = dt * 24;
      for (let i = 0; i < drops; i++) {
        const o = i * 6;
        p[o + 1] -= fall;
        p[o + 4] -= fall;
        p[o] -= fall * 0.06;
        p[o + 3] -= fall * 0.06;
        const far = Math.abs(p[o] - focus.x) > RAIN_BOX.w / 2 || Math.abs(p[o + 2] - focus.z) > RAIN_BOX.w / 2;
        if (p[o + 1] < 0 || far) this.resetDrop(i, focus, far ? Math.random() * RAIN_BOX.h : RAIN_BOX.h);
      }
      this.rain.geometry.setDrawRange(0, drops * 2);
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
