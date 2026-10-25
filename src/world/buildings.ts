import * as THREE from 'three';
import { registerLight } from '../render/lightBudget';

// Biến tạm dùng lại mỗi khung cho updateDoor/updateView, tránh cấp phát rác
const _doorRel = new THREE.Vector3();
const _doorStep = new THREE.Vector3();
const _doorQuat = new THREE.Quaternion();
const _toCam = new THREE.Vector3();
const _wallDir = new THREE.Vector3();

export interface BuildingOptions {
  name: string;
  width: number;
  depth: number;
  height: number;
  wallColor: number;
  roofColor: number;
  floorColor?: number;
  /** Cửa gỗ (nhà ở) hay cửa kính (tiệm). */
  doorStyle?: 'glass' | 'wood' | 'solid';
  /** Chừa lối đi ở tường sau, tâm lệch chừng này so với giữa tường (vd. cửa sau tiệm sang nhà kho). */
  backDoorX?: number;
  /** false: tường hai bên không trổ cửa sổ (để kê kệ sát tường). */
  sideWindows?: boolean;
  /** Quạt trần quay giữa phòng. */
  ceilingFan?: boolean;
  /** Máy lạnh treo tường sau (tiệm đã nâng cấp). */
  airCon?: boolean;
}

/**
 * Tòa nhà có tường, mái và khoảng trống bên trong.
 * Khi camera lại gần, mái và tường phía trước mờ đi để thấy đồ đạc bên trong.
 */
export class Building {
  group = new THREE.Group();
  interior = new THREE.Group();
  private roof: THREE.Group;
  /** Đồ gắn mặt tiền (biển hiệu...): hiện rõ khi ở ngoài, ẩn khi vào cảnh trong nhà để khỏi che phòng. */
  readonly facade = new THREE.Group();
  private roofMat: THREE.MeshStandardMaterial;
  /** Hai đầu hồi tam giác dưới mái, sơn cùng màu tường. */
  private gable: THREE.Mesh;
  private door: THREE.Group;
  /** Mảng tường phía trên cửa ra vào. */
  private lintel: THREE.Mesh;
  private floor: THREE.Mesh;
  private walls: THREE.Mesh[] = [];
  /** Bản lề hai cánh cửa: xoay từ 0 (đóng) tới DOOR_OPEN. */
  private hinges: THREE.Group[] = [];
  private doorOpen = 0;
  /** Vị trí khung trước của từng người (riêng mỗi cửa), để biết họ đang đi về hướng nào. */
  private lastPos = new WeakMap<THREE.Vector3, THREE.Vector3>();
  private lamp: THREE.PointLight;
  /** Khung cửa (vị trí + trục) tính một lần: tòa nhà đứng yên, khỏi suy diễn lại mỗi khung. */
  private doorCenter = new THREE.Vector3();
  private doorAlong = new THREE.Vector3();
  private doorOut = new THREE.Vector3();
  private doorFrameReady = false;
  private lampRegistered = false;
  private bulbMat: THREE.MeshStandardMaterial;
  /** Cánh quạt trần, quay liên tục. */
  private fanBlades: THREE.Object3D[] = [];
  /** Tâm các cửa sổ (toạ độ trong nhà); `alongX`: nằm trên tường trước/sau. Rộng WINDOW_W. */
  windows: { x: number; z: number; alongX: boolean }[] = [];

  constructor(public opts: BuildingOptions) {
    const { width: w, depth: d, height: h, wallColor, roofColor } = opts;
    const t = 0.2; // độ dày tường

    this.floor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.1, d),
      new THREE.MeshStandardMaterial({ map: tileTexture(opts.floorColor ?? 0xd8cfc0, w, d) }),
    );
    this.floor.position.y = 0.05;
    this.floor.receiveShadow = true;
    this.group.add(this.floor);

    const wallMat = () => new THREE.MeshStandardMaterial({ color: wallColor, transparent: true });
    const addWall = (sx: number, sz: number, x: number, z: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), wallMat());
      wall.position.set(x, h / 2, z);
      wall.castShadow = wall.receiveShadow = true;
      this.walls.push(wall);
      this.group.add(wall);
      return wall;
    };
    // Cửa sổ gắn vào mảng tường; ghi lại tâm (toạ độ trong nhà) để màn sắp xếp chừa chỗ
    const addWin = (wall: THREE.Mesh, alongX: boolean, offset: number) => {
      wall.add(createWindow(alongX, offset, t));
      this.windows.push({ x: wall.position.x + (alongX ? offset : 0), z: wall.position.z + (alongX ? 0 : offset), alongX });
    };
    // Tường sau: nguyên một mảng, hoặc hai mảng chừa lối đi (mảng tường trên lối đi gắn vào mảng trái để mờ theo)
    let back: THREE.Mesh;
    if (opts.backDoorX === undefined) back = addWall(w, t, 0, -d / 2);
    else {
      const gapL = opts.backDoorX - DOOR_W / 2;
      const gapR = opts.backDoorX + DOOR_W / 2;
      back = addWall(gapL + w / 2, t, (-w / 2 + gapL) / 2, -d / 2);
      const rightPart = addWall(w / 2 - gapR, t, (gapR + w / 2) / 2, -d / 2);
      const over = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, h - DOOR_H, t), wallMat());
      over.position.set(opts.backDoorX - back.position.x, DOOR_H + (h - DOOR_H) / 2 - h / 2, 0);
      back.add(over);
      // Cửa sổ chỉ đặt ở mảng rộng hơn cho khỏi đè lối đi
      if (w / 2 - gapR >= 3) addWin(rightPart, true, 0);
    }
    const left = addWall(t, d, -w / 2, 0);
    const right = addWall(t, d, w / 2, 0);
    // Tường trước chừa cửa ra vào ở giữa
    const side = (w - DOOR_W) / 2;
    const frontL = addWall(side, t, -w / 2 + side / 2, d / 2);
    const frontR = addWall(side, t, w / 2 - side / 2, d / 2);

    // Cửa sổ gắn vào tường (mờ cùng tường), cứ khoảng 3m tường một ô
    const windowsAlong = (wall: THREE.Mesh, length: number, alongX: boolean) => {
      const count = Math.floor(length / 3);
      for (let i = 0; i < count; i++) addWin(wall, alongX, (i - (count - 1) / 2) * (length / count));
    };
    if (opts.backDoorX === undefined) windowsAlong(back, w, true);
    if (opts.sideWindows !== false) {
      windowsAlong(left, d, false);
      windowsAlong(right, d, false);
    }
    if (side >= 1.4) {
      addWin(frontL, true, 0);
      addWin(frontR, true, 0);
    }

    // Cửa ra vào: khung gỗ, mảng tường phía trên, hai cánh tự mở vào trong khi có người tới gần.
    // Không tính là vật cản (để người đi qua được) nên để riêng, không nằm trong walls.
    this.door = new THREE.Group();
    this.door.position.set(0, 0, d / 2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6d4c33, transparent: true });
    this.lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, h - DOOR_H, t), wallMat());
    this.lintel.position.y = DOOR_H + (h - DOOR_H) / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, 0.1, t + 0.06), frameMat);
    top.position.y = DOOR_H;
    this.door.add(this.lintel, top);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, DOOR_H, t + 0.06), frameMat);
      post.position.set(sx * (DOOR_W / 2 - 0.05), DOOR_H / 2, 0);
      // Cánh cửa xoay quanh bản lề ở mép khung, mở vào trong gần sát tường
      const hinge = new THREE.Group();
      hinge.position.set(sx * (DOOR_W / 2 - 0.1), 0, -t / 2);
      hinge.userData.side = sx;
      this.hinges.push(hinge);
      const leaf = createDoorLeaf(DOOR_W / 2 - 0.1, opts.doorStyle ?? 'glass', sx);
      leaf.position.x = -sx * (DOOR_W / 4 - 0.05);
      hinge.add(leaf);
      this.door.add(post, hinge);
    }
    this.group.add(this.door);
    const mat = createExitMat();
    mat.position.set(0, 0.11, d / 2 - 0.55);
    this.group.add(mat);

    // Mái ngói hai dốc, nóc chạy theo chiều ngang; hai đầu hồi tam giác cùng màu tường
    const rise = Math.min(d * 0.35, 2.2);
    const over = 0.4;
    const run = d / 2 + over;
    const slope = Math.hypot(run, rise);
    const angle = Math.atan2(rise, run);
    this.roof = new THREE.Group();
    this.roof.position.y = h;
    this.roofMat = new THREE.MeshStandardMaterial({ color: roofColor, transparent: true, map: roofTexture() });
    this.roofMat.map!.repeat.set((w + 2 * over) / 1.2, slope / 1.2);
    for (const sz of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * over, 0.12, slope), this.roofMat);
      // Mép dưới mái thấp hơn đỉnh tường một chút để che kín
      plane.position.set(0, rise / 2 - 0.15, (sz * run) / 2);
      plane.rotation.x = sz * angle;
      plane.castShadow = true;
      this.roof.add(plane);
    }
    const gableRise = (rise * (d / 2)) / run - 0.15;
    const gable = new THREE.Shape();
    gable.moveTo(-d / 2, 0);
    gable.lineTo(d / 2, 0);
    gable.lineTo(0, gableRise);
    gable.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: w, bevelEnabled: false });
    gableGeo.rotateY(Math.PI / 2);
    gableGeo.translate(-w / 2, 0, 0);
    this.gable = new THREE.Mesh(gableGeo, wallMat());
    this.gable.castShadow = true;
    this.roof.add(this.gable);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * over + 0.1, 0.16, 0.24), this.roofMat);
    ridge.position.y = rise - 0.05;
    this.roof.add(ridge);
    this.group.add(this.roof);

    // Đèn tuýp gắn tường sau (máng trắng + ống sáng), bật khi trời tối
    this.bulbMat = new THREE.MeshStandardMaterial({ color: 0xf4fbff, emissive: 0xe8f4ff, emissiveIntensity: 0 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.5 });
    const fixture = new THREE.Group();
    const tubeLen = Math.min(1.4, w * 0.3);
    const count = w >= 6 ? 2 : 1;
    // Có cửa sau thì chừa khoảng trên cửa (chỗ treo biển), chia đèn đều trên đoạn tường rộng hơn
    let segL = -w / 2;
    let segR = w / 2;
    if (opts.backDoorX !== undefined) {
      const clear = 0.9;
      const leftEnd = opts.backDoorX - clear;
      const rightStart = opts.backDoorX + clear;
      if (leftEnd + w / 2 >= w / 2 - rightStart) segR = leftEnd;
      else segL = rightStart;
    }
    for (let i = 0; i < count; i++) {
      const x = opts.backDoorX !== undefined
        ? segL + ((segR - segL) * (i + 0.5)) / count
        : count === 1 ? 0 : (i - 0.5) * w * 0.45;
      const z = -d / 2 + t / 2;
      const housing = new THREE.Mesh(new THREE.BoxGeometry(tubeLen + 0.1, 0.08, 0.06), housingMat);
      housing.position.set(x, h - 0.45, z + 0.03);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, tubeLen, 10), this.bulbMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(x, h - 0.5, z + 0.08);
      for (const s of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.1), housingMat);
        cap.position.set(x + s * (tubeLen / 2 + 0.02), h - 0.48, z + 0.05);
        fixture.add(cap);
      }
      fixture.add(housing, tube);
    }
    this.lamp = new THREE.PointLight(0xf2f6ff, 0, Math.max(w, d) * 1.6, 1.2);
    this.lamp.position.set(0, h - 0.7, -d / 2 + 1.2);
    // Gắn trên tường, không nằm trong interior để khỏi thành vật cản trên lưới đi lại
    fixture.add(this.lamp);
    this.group.add(fixture);

    // Quạt trần: mỗi quạt phụ trách chừng 25 m², treo đều theo bề ngang
    if (opts.ceilingFan) {
      const fans = THREE.MathUtils.clamp(Math.round((w * d) / 25), 1, 4);
      for (let i = 0; i < fans; i++) {
        const fan = createCeilingFan(h);
        fan.position.set(-w / 2 + (w / fans) * (i + 0.5), 0, 0);
        this.fanBlades.push(fan.getObjectByName('blades')!);
        this.group.add(fan);
      }
    }
    // Máy lạnh treo tường trái, gần góc sau (tường sau đã kín đèn tuýp và cửa sang nhà kho)
    if (opts.airCon) {
      const ac = createAirCon();
      ac.rotation.y = Math.PI / 2; // mặt gió hướng vào trong tiệm
      ac.position.set(-w / 2 + t / 2, h - 0.6, -d / 2 + 1.8);
      this.group.add(ac);
    }

    this.group.add(this.interior, this.facade);
  }

  /** Bật đèn trong nhà, 0 = tắt, 1 = sáng hẳn. */
  setLamp(level: number) {
    if (!this.lampRegistered) {
      this.lampRegistered = true;
      registerLight(this.lamp, this.lamp.getWorldPosition(new THREE.Vector3()));
    }
    this.lamp.intensity = level * 6;
    this.bulbMat.emissiveIntensity = level * 2;
  }

  /**
   * Cửa mở khi có người đi vào/ra qua cửa (đi thẳng về phía cửa, hoặc đứng ngay ngưỡng cửa),
   * đi ngang qua trên vỉa hè thì không mở. Đi khỏi thì từ từ đóng lại.
   * Người ở xa cửa bị loại ngay từ phép trừ — chỉ ai lại gần mới tốn phép tính tiếp theo.
   */
  updateDoor(dt: number, people: THREE.Vector3[]) {
    for (const b of this.fanBlades) b.rotation.y += dt * 9;
    if (!this.doorFrameReady) {
      this.doorFrameReady = true;
      this.door.getWorldPosition(this.doorCenter);
      const q = this.door.getWorldQuaternion(_doorQuat);
      this.doorAlong.set(1, 0, 0).applyQuaternion(q);
      this.doorOut.set(0, 0, 1).applyQuaternion(q);
    }
    const near = people.some((p) => {
      const rel = _doorRel.subVectors(p, this.doorCenter);
      const a = Math.abs(rel.dot(this.doorAlong)), n = rel.dot(this.doorOut);
      if (a > DOOR_W / 2 + 0.3 || Math.abs(n) > 1.8) return false;
      // Đứng ngay ngưỡng cửa (trong lòng khung) thì luôn mở
      if (Math.abs(n) < 0.5) return true;
      let prev = this.lastPos.get(p);
      if (!prev) {
        prev = p.clone();
        this.lastPos.set(p, prev);
        return false;
      }
      // Đang tiến về phía tường (vào hoặc ra), chứ không phải đi dọc theo vỉa hè
      const step = _doorStep.copy(rel).add(this.doorCenter).sub(prev);
      const toward = -Math.sign(n) * step.dot(this.doorOut);
      prev.copy(p);
      return toward > 1e-4 && toward > Math.abs(step.dot(this.doorAlong));
    });
    this.doorOpen = THREE.MathUtils.clamp(this.doorOpen + (near ? dt * 4 : -dt * 2.2), 0, 1);
    // Nhanh lúc đầu, chậm dần khi gần mở hẳn
    const k = 1 - (1 - this.doorOpen) ** 2;
    for (const h of this.hinges) h.rotation.y = -h.userData.side * DOOR_OPEN * k;
  }

  /** Sơn lại tường, sàn, mái. */
  setColors(wall: number, floor: number, roof: number) {
    for (const w of [...this.walls, this.gable, this.lintel]) (w.material as THREE.MeshStandardMaterial).color.setHex(wall);
    this.roofMat.color.setHex(roof);
    const floorMat = this.floor.material as THREE.MeshStandardMaterial;
    floorMat.map?.dispose();
    floorMat.map = tileTexture(floor, this.opts.width, this.opts.depth);
    floorMat.needsUpdate = true;
  }

  /** Hộp (toạ độ thế giới) của tường và đồ cố định, để chặn trên lưới đi lại. */
  staticBoxes(): THREE.Box3[] {
    this.group.updateWorldMatrix(true, true);
    // Tường chỉ tính thân tường, không tính đồ gắn trên nó (mảng tường trên lối đi sau, cửa sổ)
    const wallBoxes = this.walls.map((w) => {
      w.geometry.computeBoundingBox();
      return w.geometry.boundingBox!.clone().applyMatrix4(w.matrixWorld);
    });
    return [...wallBoxes, ...this.interior.children.map((o) => new THREE.Box3().setFromObject(o))];
  }

  /** Điểm (x, z) có nằm trong tòa nhà không. */
  contains(x: number, z: number, margin = 0) {
    const p = this.group.position;
    return Math.abs(x - p.x) < this.opts.width / 2 + margin && Math.abs(z - p.z) < this.opts.depth / 2 + margin;
  }

  /** Mờ mái và tường khi camera ở gần, hoặc khi đang ở cảnh trong nhà (`indoors`). */
  updateView(camera: THREE.Camera, indoors = false) {
    // Tính khoảng cách tới mép tòa nhà, để tiệm to cũng nhìn vào trong được
    const size = Math.max(this.opts.width, this.opts.depth) / 2;
    const dist = camera.position.distanceTo(this.group.position) - size;
    const inside = indoors ? 1 : THREE.MathUtils.clamp((25 - dist) / 8, 0, 1); // 0 = ngoài, 1 = trong
    this.facade.visible = !indoors;
    setOpacity(this.roof, 1 - inside);
    setOpacity(this.door, indoors ? 0 : 1 - inside * 0.85);

    // Tường nằm giữa camera và tòa nhà thì mờ, tường phía xa vẫn giữ
    const toCam = _toCam.copy(camera.position).sub(this.group.position).setY(0).normalize();
    for (const wall of this.walls) {
      // Pháp tuyến hướng ra ngoài của tường (theo chiều mỏng của hộp), không theo vị trí
      // vì hai mảng tường trước nằm lệch sang hai bên cửa
      const box = (wall.geometry as THREE.BoxGeometry).parameters;
      const dir = box.width > box.depth
        ? _wallDir.set(0, 0, Math.sign(wall.position.z))
        : _wallDir.set(Math.sign(wall.position.x), 0, 0);
      dir.applyQuaternion(this.group.quaternion);
      const front = box.width > box.depth && wall.position.z > 0;
      // Trong nhà luôn hạ tường có cửa để thấy lối ra
      const facing = dir.dot(toCam) > 0.3 || (indoors && front);
      // Trong nhà: tường phía trước hạ thấp còn một gờ (như Stardew), chừa khe cửa để biết lối ra
      cutWall(wall, indoors && facing, this.opts.height);
      setOpacity(wall, facing && !indoors ? 1 - inside * 0.85 : 1);
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      const mat = o.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    });
  }
}

const CUT_H = 0.45;

/** Hạ tường xuống còn gờ thấp CUT_H (ẩn cửa sổ gắn trên nó), hoặc dựng lại như cũ. */
function cutWall(wall: THREE.Mesh, cut: boolean, h: number) {
  wall.scale.y = cut ? CUT_H / h : 1;
  wall.position.y = cut ? CUT_H / 2 : h / 2;
  for (const c of wall.children) c.visible = !cut;
}

/** Thảm chùi chân trước cửa, in mũi tên chỉ ra ngoài. */
function createExitMat() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2f6b3a';
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#f1c40f';
  g.lineWidth = 8;
  g.strokeRect(8, 8, 240, 144);
  g.fillStyle = '#f1c40f';
  g.font = 'bold 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('LỐI RA', 128, 62);
  // Mũi tên chỉ xuống dưới ảnh = chỉ ra phía cửa
  g.beginPath();
  g.moveTo(98, 84);
  g.lineTo(158, 84);
  g.lineTo(128, 140);
  g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshStandardMaterial({ map: tex }));
  mat.rotation.x = -Math.PI / 2;
  mat.receiveShadow = true;
  return mat;
}

/** Làm mờ một vật và mọi thứ gắn trên nó (cửa sổ trên tường, các tấm mái). */
function setOpacity(obj: THREE.Object3D, opacity: number) {
  obj.visible = opacity > 0.02;
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mat = o.material as THREE.MeshStandardMaterial;
    // Kính vốn đã trong: mờ theo tỉ lệ độ trong gốc
    const base: number = (mat.userData.baseOpacity ??= mat.opacity);
    mat.opacity = base * opacity;
    mat.depthWrite = opacity > 0.99 && base >= 1;
  });
}

const DOOR_W = 1.4;
const DOOR_H = 2.2;
export const WINDOW_W = 1.1;
const DOOR_OPEN = 1.4;



/** Cửa sổ khung trắng, kính xanh nhạt chia 4 ô, có bậu; xuyên qua tường dày t, tâm cao 1.6m. */
function createWindow(alongX: boolean, offset: number, t: number) {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd3f0, transparent: true, opacity: 0.8, metalness: 0.2, roughness: 0.15 });
  const W = WINDOW_W;
  const H = 1.0;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, t + 0.04), glassMat));
  const bars: [number, number, number, number][] = [
    [W + 0.1, 0.08, 0, H / 2], [W + 0.1, 0.08, 0, -H / 2], [0.08, H, W / 2, 0], [0.08, H, -W / 2, 0], [0.05, H, 0, 0], [W, 0.05, 0, 0],
  ];
  for (const [sx, sy, x, y] of bars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, t + 0.08), frameMat);
    bar.position.set(x, y, 0);
    g.add(bar);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(W + 0.25, 0.06, t + 0.2), frameMat);
  sill.position.y = -H / 2 - 0.07;
  g.add(sill);
  // Toạ độ tính từ tâm tường (cao 1.5m)
  g.position.y = 0.1;
  if (alongX) g.position.x = offset;
  else {
    g.rotation.y = Math.PI / 2;
    g.position.z = offset;
  }
  return g;
}

/** Một cánh cửa (kính khung nhôm, hoặc gỗ có ô kính nhỏ), gốc ở giữa mép dưới. */
/** `side`: bản lề ở bên nào (-1 trái, 1 phải), tay nắm nằm ở mép còn lại. */
function createDoorLeaf(width: number, style: 'glass' | 'wood' | 'solid', side: number) {
  const g = new THREE.Group();
  if (style === 'solid') {
    // Cửa sắt kín (kho): tấm thép sơn xám, gân ngang, tay nắm dài
    const steel = new THREE.MeshStandardMaterial({ color: 0x607d8b, metalness: 0.5, roughness: 0.5, transparent: true });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width, DOOR_H - 0.05, 0.06), steel);
    panel.position.y = DOOR_H / 2;
    g.add(panel);
    const rib = new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.5, roughness: 0.5, transparent: true });
    for (const y of [0.45, 1.1, 1.75]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.06, 0.08), rib);
      bar.position.y = y;
      g.add(bar);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.05), new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8, transparent: true }));
    handle.position.set(-side * width * 0.38, DOOR_H * 0.48, 0.07);
    g.add(handle);
    return g;
  }
  if (style === 'wood') {
    const wood = new THREE.Mesh(new THREE.BoxGeometry(width, DOOR_H - 0.05, 0.06), new THREE.MeshStandardMaterial({ color: 0x8a5a36, transparent: true }));
    wood.position.y = DOOR_H / 2;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(width * 0.55, 0.45, 0.08), new THREE.MeshStandardMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.7 }));
    pane.position.y = DOOR_H * 0.72;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, transparent: true }));
    knob.position.set(-side * width * 0.38, DOOR_H * 0.48, 0.06);
    g.add(wood, pane, knob);
    return g;
  }
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8d99a6, transparent: true, metalness: 0.5 });
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.1, DOOR_H - 0.15, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.5 }),
  );
  glass.position.y = DOOR_H / 2;
  g.add(glass);
  const bars: [number, number, number, number][] = [
    [width, 0.07, 0, 0.05], [width, 0.07, 0, DOOR_H - 0.05], [0.06, DOOR_H, -width / 2, DOOR_H / 2], [0.06, DOOR_H, width / 2, DOOR_H / 2],
  ];
  for (const [sx, sy, x, y] of bars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.05), frameMat);
    bar.position.set(x, y, 0);
    g.add(bar);
  }
  return g;
}

/** Ngói: các hàng sóng sẫm, nền trắng để nhuộm theo màu mái. */
function roofTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < 64; y += 16) ctx.fillRect(0, y, 64, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < 64; x += 16) for (let y = 0; y < 64; y += 16) ctx.fillRect(x + ((y / 16) % 2) * 8, y + 3, 2, 13);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Sàn gạch: mỗi viên 1m, có ron sẫm màu. */
function tileTexture(color: number, w: number, d: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(color);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = `#${base.clone().multiplyScalar(0.8).getHexString()}`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(w, d);
  return texture;
}

/** Màu hộp/chai hàng lặt vặt bày ở mặt quầy phía khách (kẹo, dầu gội, khăn giấy...). */
const IMPULSE_COLORS = [0xe84393, 0x0984e3, 0x00b894, 0xfdcb6e, 0xe17055, 0x6c5ce7, 0xffffff, 0xd63031];

/**
 * Quầy thu ngân kiểu siêu thị mini: chân đế trắng, thân gỗ sáng, mặt khách là các ô kệ bày hàng lặt vặt,
 * giữa quầy có tấm bảng "THU NGÂN" nhô cao, máy tính tiền và khay đặt hàng trên mặt quầy.
 * Gốc ở sàn; dài theo x (`w`), khách đứng phía −z, thu ngân đứng phía +z.
 */
/** Quạt trần: ty treo, bầu motor và 4 cánh gỗ (nhóm 'blades' để quay). */
function createCeilingFan(h: number): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.35, metalness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.7 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), metal);
  rod.position.y = h - 0.2;
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 14), metal);
  canopy.position.y = h - 0.03;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.14, 16), metal);
  motor.position.y = h - 0.45;
  const blades = new THREE.Group();
  blades.name = 'blades';
  blades.position.y = h - 0.48;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 4) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.15), wood);
    blade.position.x = 0.45;
    blade.rotation.x = 0.12;
    arm.add(blade);
    blades.add(arm);
  }
  g.add(rod, canopy, motor, blades);
  return g;
}

/** Máy lạnh treo tường: dàn lạnh trắng, khe gió, cánh đảo gió, đèn báo xanh; mặt quay vào phòng (+z). */
function createAirCon(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.22), white);
  body.position.z = 0.11;
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x9aa3ab }));
  vent.position.set(0, -0.1, 0.225);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.02, 0.06), white);
  flap.position.set(0, -0.15, 0.21);
  flap.rotation.x = -0.4;
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.01), new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 1.5 }));
  led.position.set(0.38, 0.05, 0.225);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), white);
  pipe.position.set(0.42, -0.55, 0.03);
  g.add(body, vent, flap, led, pipe);
  return g;
}

export function createCounter(w = 1.6, d = 0.7): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xf0c890, roughness: 0.7 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0xd9a865, roughness: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.6 });
  const box = (bw: number, bh: number, bd: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  const H = 0.95; // mặt quầy
  const base = 0.12;
  // Chân đế trắng thụt vào một chút như ảnh mẫu
  box(w - 0.04, base, d - 0.04, white, 0, base / 2, 0);
  // Thân: lưng gỗ ở giữa, hai bên là ô kệ mở về phía khách
  const bodyH = H - base - 0.04;
  const bodyY = base + bodyH / 2;
  box(w, bodyH, 0.04, wood, 0, bodyY, 0.02); // vách giữa ngăn đôi quầy
  box(w, bodyH, d / 2 - 0.02, woodDark, 0, bodyY, d / 4 + 0.03); // nửa phía thu ngân: tủ kín
  // Mặt tủ phía thu ngân: hai cánh ngăn kéo có tay nắm
  for (const x of [-w / 4, w / 4]) {
    box(w / 2 - 0.06, bodyH * 0.42, 0.01, wood, x, base + bodyH * 0.72, d / 2 + 0.005);
    box(0.16, 0.025, 0.02, white, x, base + bodyH * 0.72, d / 2 + 0.015);
  }
  // Ô kệ phía khách: 2 tầng × 3 cột, có vách ngăn và hàng bày sẵn
  const cols = 3;
  const shelfD = d / 2 - 0.02;
  const zShelf = -shelfD / 2;
  for (let i = 0; i <= cols; i++) box(0.035, bodyH, shelfD, wood, -w / 2 + 0.0175 + (i * (w - 0.035)) / cols, bodyY, zShelf);
  const rows = [base + 0.02, base + bodyH / 2];
  for (const y of rows) box(w, 0.025, shelfD, wood, 0, y, zShelf);
  const cellW = (w - 0.035 * (cols + 1)) / cols;
  let k = 0;
  for (let c = 0; c < cols; c++) {
    const cx = -w / 2 + 0.035 + cellW / 2 + c * (cellW + 0.035);
    for (const y of rows) {
      const n = 4;
      const itemW = cellW / n - 0.015;
      const bottle = (c + Math.round(y * 10)) % 2 === 0;
      const ih = bottle ? bodyH / 2 - 0.12 : bodyH / 2 - 0.16;
      for (let j = 0; j < n; j++) {
        const m = new THREE.MeshStandardMaterial({ color: IMPULSE_COLORS[k++ % IMPULSE_COLORS.length], roughness: 0.5 });
        const x = cx - cellW / 2 + itemW / 2 + 0.0075 + j * (itemW + 0.015);
        if (bottle) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(itemW * 0.42, itemW * 0.45, ih, 8), m);
          b.position.set(x, y + 0.0125 + ih / 2, zShelf - 0.02);
          b.castShadow = true;
          g.add(b);
        } else {
          box(itemW, ih, shelfD * 0.7, m, x, y + 0.0125 + ih / 2, zShelf - 0.01);
        }
      }
    }
  }
  // Thanh chắn hàng phía trước mỗi tầng
  for (const y of rows) box(w, 0.02, 0.01, white, 0, y + 0.07, -d / 2 + 0.01);
  // Mặt quầy gỗ, chìa ra một chút
  box(w + 0.06, 0.04, d + 0.06, wood, 0, H - 0.02, 0);
  // Bảng "THU NGÂN" nhô cao giữa quầy, quay về phía khách
  const towerW = Math.min(0.5, w * 0.3);
  box(towerW, 0.32, 0.05, wood, -0.1, H + 0.16, -d / 2 + 0.06);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(towerW - 0.06, 0.16), new THREE.MeshBasicMaterial({ map: signTexture('THU NGÂN') }));
  sign.position.set(-0.1, H + 0.2, -d / 2 + 0.034);
  sign.rotation.y = Math.PI;
  g.add(sign);
  // Máy tính tiền ở đầu quầy phía thu ngân
  const pos = createRegister();
  // Mẫu máy tính tiền cũng lấy +z làm phía thu ngân nên giữ nguyên chiều: màn chính quay về thu ngân, màn phụ về khách
  pos.position.set(w / 2 - 0.35, H, 0.1);
  g.add(pos);
  // Khay đặt hàng của khách và bảng mã QR thanh toán
  box(Math.max(0.3, w / 2 - 0.45), 0.012, d * 0.55, new THREE.MeshStandardMaterial({ color: 0x2d3436 }), -w / 2 + Math.max(0.3, w / 2 - 0.45) / 2 + 0.08, H + 0.006, 0.02);
  const qr = new THREE.Group();
  qr.position.set(-0.1 + towerW / 2 + 0.12, H, -d / 2 + 0.12);
  qr.rotation.x = -0.25;
  box(0.12, 0.16, 0.012, new THREE.MeshStandardMaterial({ color: 0x00b894 }), 0, 0.08, 0, qr);
  const code = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshBasicMaterial({ map: qrTexture() }));
  code.position.set(0, 0.07, -0.007);
  code.rotation.y = Math.PI;
  qr.add(code);
  g.add(qr);
  return g;
}

/** Chữ trắng trên nền đỏ cho bảng quầy. */
function signTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mã QR giả (ô đen trắng ngẫu nhiên cố định) cho bảng thanh toán. */
function qrTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#000';
  let h = 7;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    if (h % 2) ctx.fillRect(x * 8, y * 8, 8, 8);
  }
  // Ba ô định vị ở góc như QR thật
  for (const [x, y] of [[0, 0], [40, 0], [0, 40]]) {
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, 24, 24);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + 4, 16, 16);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 8, y + 8, 8, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

/**
 * Máy tính tiền kiểu quầy ngoài đời: màn hình cảm ứng cho thu ngân, màn phụ quay về khách,
 * ngăn kéo đựng tiền, máy in hóa đơn, máy quẹt thẻ và súng quét mã vạch.
 * Gốc ở mặt quầy, thu ngân đứng phía +z.
 */
export function createRegister(): THREE.Group {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.5 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xb2bec3, roughness: 0.6 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    g.add(b);
    return b;
  };
  // Ngăn kéo tiền, có tay nắm phía thu ngân
  box(0.46, 0.1, 0.42, dark, 0, 0.05, 0);
  box(0.16, 0.02, 0.02, grey, 0, 0.05, 0.215);
  // Chân + màn hình chính nghiêng về thu ngân, hiện số tiền
  box(0.06, 0.18, 0.06, grey, 0, 0.19, -0.05);
  const screen = new THREE.Group();
  screen.position.set(0, 0.36, -0.03);
  screen.rotation.x = -0.35;
  g.add(screen);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.03), dark);
  frame.castShadow = true;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.26), new THREE.MeshBasicMaterial({ map: screenTexture('#0984e3', 'TỔNG', '125.000đ') }));
  display.position.z = 0.016;
  screen.add(frame, display);
  // Màn phụ nhỏ quay về phía khách
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ map: screenTexture('#00b894', 'CẢM ƠN', 'QUÝ KHÁCH') }));
  back.position.set(0, 0.03, -0.016);
  back.rotation.y = Math.PI;
  screen.add(back);
  // Máy in hóa đơn bên phải, có cuộn giấy thò ra
  box(0.16, 0.12, 0.18, grey, 0.33, 0.06, 0);
  box(0.08, 0.004, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff }), 0.33, 0.123, 0.08);
  // Máy quẹt thẻ bên trái
  box(0.08, 0.03, 0.14, dark, -0.32, 0.015, 0.08);
  box(0.06, 0.003, 0.04, new THREE.MeshBasicMaterial({ color: 0x55efc4 }), -0.32, 0.032, 0.05);
  // Súng quét mã vạch nằm cạnh
  const gun = box(0.05, 0.05, 0.16, new THREE.MeshStandardMaterial({ color: 0xfdcb6e }), -0.32, 0.025, -0.12);
  gun.rotation.y = 0.4;
  return g;
}

/** Mặt màn hình máy tính tiền: hai dòng chữ sáng trên nền màu. */
function screenTexture(bg: string, top: string, bottom: string) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 88;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 88);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(top, 64, 34);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(bottom, 64, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
