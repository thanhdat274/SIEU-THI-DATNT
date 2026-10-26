import { WEATHER, type Sky, type WeatherInfo } from '../data/weather';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

/** Điện thoại / máy tính bảng: giảm độ phân giải, bóng và hạt mưa cho đỡ nóng máy. */
export const LOW_POWER = matchMedia('(pointer: coarse)').matches;

/** Mọi renderer đều biết làm những việc này — dùng để đánh type chung cho WebGL/WebGPU. */
export interface GameRenderer {
  domElement: HTMLCanvasElement;
  setPixelRatio(value: number): void;
  getPixelRatio(): number;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setAnimationLoop(callback: ((time: number) => void) | null): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  shadowMap: { enabled: boolean; type: number; autoUpdate?: boolean; needsUpdate?: boolean };
  init?(): Promise<unknown>;
}

export function createRenderer(container: HTMLElement) {
  // WebGPU: đường ống render thế hệ mới của trình duyệt — điều phối nhẹ hơn WebGL,
  // mở đường compute shader (đám đông, hạt) về sau. Không có WebGPU thì three tự
  // rơi về backend WebGL2 với đúng scene/material hiện có, không phải đổi code gì.
  // Chrome trên Windows bỏ qua powerPreference khi xin card cho WebGPU (crbug.com/369219127):
  // laptop hai card sẽ chạy WebGPU trên card onboard yếu → giật, CPU full. WebGL2 (ANGLE) thì
  // chọn đúng card rời, nên trên Windows mặc định dùng backend WebGL2 của chính WebGPURenderer
  // (scene/material/TSL giữ nguyên). `?renderer=webgpu` / `?renderer=webgl` để chọn tay, nhớ cho lần sau.
  const pick = new URLSearchParams(location.search).get('renderer');
  let saved: string | null = null;
  try {
    if (pick) localStorage.setItem('renderer', pick);
    saved = localStorage.getItem('renderer');
  } catch { /* chế độ ẩn danh */ }
  const choice = pick ?? saved;
  const forceWebGL = choice ? choice === 'webgl' : /Windows/.test(navigator.userAgent);
  const renderer = new WebGPURenderer({ antialias: !LOW_POWER, powerPreference: 'high-performance', forceWebGL }) as unknown as WebGPURenderer & GameRenderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOW_POWER ? 1.5 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft đã bị bỏ, three tự đổi về PCF kèm cảnh báo
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
const FLASH_SKY = new THREE.Color(0xe8eeff);
// Biến tạm dùng lại mỗi khung, tránh cấp phát rác trong vòng render
const sunDir = new THREE.Vector3();
const stormShade = new THREE.Color();

/**
 * Tự co giãn độ phân giải theo FPS: máy yếu hạ pixel ratio để giữ khung mượt,
 * khỏe lại thì nâng dần về nét. Tránh tình trạng 20 FPS cứng đầu trên card yếu.
 * Các bậc sắp từ cao xuống thấp và không vượt nét gốc của màn hình.
 */
export class AdaptiveResolution {
  private idx = 0;
  private elapsed = 0;
  private frames = 0;
  private goodStreak = 0;
  private readonly steps: number[];

  constructor(private renderer: GameRenderer) {
    const native = Math.min(window.devicePixelRatio, LOW_POWER ? 1.5 : 2);
    const all = [native, 1.5, 1.25, 1];
    this.steps = [...new Set(all.filter((v) => v <= native + 0.01))].sort((a, b) => b - a);
    this.renderer.setPixelRatio(this.steps[0]);
  }

  update(dt: number) {
    this.elapsed += dt;
    this.frames++;
    if (this.elapsed < 2) return;
    const fps = this.frames / this.elapsed;
    this.elapsed = 0;
    this.frames = 0;
    if (fps < 45 && this.idx < this.steps.length - 1) {
      this.renderer.setPixelRatio(this.steps[++this.idx]);
      this.goodStreak = 0;
    } else if (fps > 57 && this.idx > 0 && ++this.goodStreak >= 3) {
      this.renderer.setPixelRatio(this.steps[--this.idx]);
      this.goodStreak = 0;
    }
  }
}

/** Bóng nắng phủ quanh camera bấy nhiêu mét: nhỏ thì bóng sắc nét. */
const SHADOW_RANGE = 26;
const RAIN_DROPS = LOW_POWER ? 2000 : 5000;
const RAIN_BOX = { w: 70, h: 30 };
const CLOUDS = LOW_POWER ? 8 : 14;
const CLOUD_HEIGHT = 30;
const STARS = LOW_POWER ? 160 : 280;
const DOME_R = 470;
/** Màu sương chân trời (trời đêm hơi sáng nhẹ như đô thị, trưa trắng hơn). */
const SKY_HAZE = new THREE.Color(0xe6eef4);

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
  /** Vòm trời gradient + mặt trời / trăng / sao — toàn vật liệu Basic (không ăn đèn, khỏi recompile shader). */
  private dome: THREE.Mesh;
  private sunDisc: THREE.Mesh;
  private moonDisc: THREE.Mesh;
  private stars: THREE.Points;
  private zenithC = new THREE.Color();
  private horizonC = new THREE.Color();
  private moonDir = new THREE.Vector3();

  constructor(private scene: THREE.Scene) {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(LOW_POWER ? 512 : 2048);
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

    // Vòm trời gradient: mỗi đỉnh tô màu giữa chân trời (sương sáng) và đỉnh trời (đậm),
    // cập nhật theo giờ — thay cho nền một màu phẳng
    const skyGeo = new THREE.SphereGeometry(DOME_R, 24, 14);
    skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
    this.dome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.dome.renderOrder = -1;
    scene.add(this.dome);

    // Mặt trời / trăng là đĩa Basic quay về tâm; sao là Points — đêm mới hiện (điều opacity, không bật/tắt visible để khỏi biên dịch lại pipeline)
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshBasicMaterial({ color: 0xffe8b0, fog: false, transparent: true, depthWrite: false }));
    this.moonDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 24), new THREE.MeshBasicMaterial({ color: 0xdfe6f0, fog: false, transparent: true, depthWrite: false }));
    scene.add(this.sunDisc, this.moonDisc);
    const starPos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      const a = Math.random() * Math.PI * 2;
      // Giữ sao ở dải thấp (3°–33°) cho camera city-builder vốn ngẩng max ~40°
      const y = 0.05 + Math.random() * 0.5;
      const r = Math.sqrt(1 - y * y);
      starPos.set([Math.cos(a) * r * (DOME_R - 20), y * (DOME_R - 20), Math.sin(a) * r * (DOME_R - 20)], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(this.stars);

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
        // Mây đổ bóng tốn kém và bóng chúng cũng nhạt; tắt hẳn trên mobile để đỡ lãng phí shader
        puff.castShadow = !LOW_POWER;
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
    sunDir.set(Math.cos(angle), Math.max(height, 0.05), 0.45).normalize();
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
    sky.lerp(stormShade.copy(STORM_SKY).multiplyScalar(0.3 + 0.7 * daylight), clouds * 0.7);
    if (this.flash > 0) sky.lerp(FLASH_SKY, this.flash * 0.6);
    const sceneFog = this.scene.fog as THREE.Fog;
    sceneFog.color.copy(sky);
    sceneFog.near = THREE.MathUtils.lerp(80, 4, fog);
    sceneFog.far = THREE.MathUtils.lerp(400, 42, fog);

    // Vòm trời: đỉnh trời đậm hơn chân trời; mây dày thì cả vòm xám đi
    this.horizonC.copy(sky).lerp(SKY_HAZE, 0.12 + 0.26 * daylight).lerp(STORM_SKY, clouds * 0.35);
    this.zenithC.copy(sky).multiplyScalar(0.7 + clouds * 0.12);
    const domePos = this.dome.geometry.attributes.position;
    const domeCol = this.dome.geometry.attributes.color;
    for (let i = 0; i < domePos.count; i++) {
      const t = Math.min(1, Math.max(0, domePos.getY(i) / DOME_R));
      domeCol.setXYZ(
        i,
        this.horizonC.r + (this.zenithC.r - this.horizonC.r) * t,
        this.horizonC.g + (this.zenithC.g - this.horizonC.g) * t,
        this.horizonC.b + (this.zenithC.b - this.horizonC.b) * t,
      );
    }
    domeCol.needsUpdate = true;

    // Mặt trời theo hướng nắng; trăng đối diện mọc lúc mặt trời lặn; sao chỉ thấy trời quang đêm
    this.sunDisc.position.copy(sunDir).multiplyScalar(DOME_R - 30);
    this.sunDisc.lookAt(0, 0, 0);
    (this.sunDisc.material as THREE.MeshBasicMaterial).opacity = Math.min(1, daylight * 1.4) * (1 - clouds * 0.75);
    // Trăng đối diện mặt trời, mọc lúc mặt trời lặn — kẹp độ cao thấp vừa cho camera ngẩng max ~40° nhìn thấy được
    this.moonDir.set(-sunDir.x, THREE.MathUtils.clamp(-sunDir.y * 0.9 + 0.12, 0.05, 0.42), -sunDir.z).normalize();
    this.moonDisc.position.copy(this.moonDir).multiplyScalar(DOME_R - 30);
    this.moonDisc.lookAt(0, 0, 0);
    (this.moonDisc.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.max(0, (0.45 - daylight) * 2)) * (1 - clouds * 0.8);
    (this.stars.material as THREE.PointsMaterial).opacity = Math.min(1, Math.max(0, (0.35 - daylight) * 2)) * (1 - clouds * 0.85);
    this.stars.rotation.y += dt * 0.004;

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
