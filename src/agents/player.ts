import * as THREE from 'three';
import { joystick } from '../core/actions';
import { buildChibiCharacter, type CharacterParts } from '../render/characterModel';
import type { NavGrid } from '../world/navGrid';
import { useGame } from '../core/store';
import { costumeById } from '../data/costumes';
import { playerPace } from '../data/biz';

const SPEED = 3.5; // m/giây

/** Nhân vật chính: đi bằng WASD / phím mũi tên, hoặc bấm chuột lên mặt đất. */
export class Player {
  mesh = new THREE.Group();
  private parts: CharacterParts;
  private path: THREE.Vector3[] = [];
  private keys = new Set<string>();
  private gait = 0;
  private phase = 0;

  constructor(private grid: NavGrid) {
    this.parts = buildChibiCharacter(this.look());
    this.mesh.add(this.parts.root);

    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  /** Lấy tùy chọn ngoại hình theo costume đang dùng trong store. */
  private look() {
    const id = useGame.getState().costume || 'default';
    const def = costumeById(id);
    return { profession: 'player' as const, ...(def?.options ?? {}) };
  }

  /** Dựng lại mô hình theo costume hiện tại (đổi trang phục giữa chừng). */
  rebuild() {
    this.mesh.remove(this.parts.root);
    this.parts = buildChibiCharacter(this.look());
    this.mesh.add(this.parts.root);
  }

  get position() { return this.mesh.position; }

  teleport(x: number, z: number) {
    this.standUp();
    this.mesh.position.set(x, 0, z);
    this.path = [];
  }

  /** Đang nằm trên giường: không đi lại được cho tới khi teleport/đứng dậy. */
  asleep = false;

  /** Nằm ngửa trên giường (đầu giường quay về -z), chân ở cuối giường. */
  lieOn(bed: THREE.Vector3) {
    this.path = [];
    this.asleep = true;
    this.mesh.position.set(bed.x, 0.6, bed.z + 0.55);
    this.mesh.rotation.y = 0;
    this.parts.root.rotation.x = -Math.PI / 2;
  }

  standUp() {
    if (!this.asleep) return;
    this.asleep = false;
    this.parts.root.rotation.x = 0;
    this.mesh.position.y = 0;
  }

  /** Đi tới điểm, tự tìm đường vòng qua tường. */
  walkTo(target: THREE.Vector3) {
    this.path = this.grid.findPath(this.position, target);
  }

  /** Trả về true nếu nhân vật đang di chuyển. */
  update(dt: number, cameraYaw: number): boolean {
    if (this.asleep) return false;
    const input = new THREE.Vector2(
      (this.has('d', 'arrowright') ? 1 : 0) - (this.has('a', 'arrowleft') ? 1 : 0),
      (this.has('s', 'arrowdown') ? 1 : 0) - (this.has('w', 'arrowup') ? 1 : 0),
    );

    // Không bấm phím thì lấy cần điều khiển ảo (kéo nửa chừng thì đi chậm)
    let pace = 1;
    if (input.lengthSq() === 0 && Math.hypot(joystick.x, joystick.y) > 0) {
      input.set(joystick.x, joystick.y);
      pace = Math.min(1, input.length() * 1.3);
    }

    let dir = new THREE.Vector3();
    if (input.lengthSq() > 0) {
      this.path = [];
      input.normalize();
      // Đổi hướng phím theo góc camera: W luôn là "đi vào trong màn hình"
      const sin = Math.sin(cameraYaw);
      const cos = Math.cos(cameraYaw);
      dir.set(input.x * cos + input.y * sin, 0, -input.x * sin + input.y * cos);
    } else if (this.path.length) {
      const next = this.path[0];
      dir = next.clone().sub(this.position).setY(0);
      if (dir.length() < 0.1) {
        this.path.shift();
        return this.path.length > 0;
      }
      dir.normalize();
    } else {
      this.animate(dt, false);
      return false;
    }

    // Nhà đẹp ngủ ngon, ăn sáng, có xe (ngoài đường) thì đi nhanh hơn
    const g = useGame.getState();
    const step = SPEED * pace * playerPace(g.biz, g.day, g.location === 'Ngoài đường') * dt;
    const p = this.position;
    // Thử đi từng trục để trượt dọc theo tường thay vì kẹt.
    // Nếu đang đứng trong vật cản (vừa đặt đồ đè lên) thì cho đi ra.
    const stuck = this.grid.isBlocked(p.x, p.z);
    if (stuck || !this.grid.isBlocked(p.x + dir.x * step, p.z)) p.x += dir.x * step;
    if (stuck || !this.grid.isBlocked(p.x, p.z + dir.z * step)) p.z += dir.z * step;

    const targetAngle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, targetAngle, Math.min(1, dt * 14));
    this.animate(dt, true);
    return true;
  }

  /**
   * Chuyển động bước đi linh hoạt của Player:
   * - Khớp gối chân co duỗi
   * - Đánh tay mềm mại
   * - Thân trên nhấp nhô & xoay nhẹ theo nhịp chạy
   */
  private animate(dt: number, moving: boolean) {
    this.phase += dt * (moving ? 13 : 2.5);
    const targetGait = moving ? Math.sin(this.phase) * 0.65 : 0;
    this.gait += (targetGait - this.gait) * Math.min(1, dt * 14);

    const {
      torso,
      headGroup,
      leftLeg,
      rightLeg,
      leftShin,
      rightShin,
      leftArm,
      rightArm,
      leftForearm,
      rightForearm,
    } = this.parts;

    // Chân & Đầu gối
    leftLeg.rotation.x = this.gait;
    rightLeg.rotation.x = -this.gait;
    leftLeg.rotation.z = moving ? 0.04 : 0;
    rightLeg.rotation.z = moving ? -0.04 : 0;

    // Gập gối khi nhấc chân
    leftShin.rotation.x = moving ? Math.max(0, -this.gait * 0.95) : 0;
    rightShin.rotation.x = moving ? Math.max(0, this.gait * 0.95) : 0;

    // Tay & Cẳng tay
    leftArm.rotation.x = -this.gait * 0.8;
    rightArm.rotation.x = this.gait * 0.8;
    leftArm.rotation.z = moving ? -0.15 : -0.08;
    rightArm.rotation.z = moving ? 0.15 : 0.08;

    leftForearm.rotation.x = moving ? 0.28 + Math.max(0, this.gait * 0.4) : 0.15;
    rightForearm.rotation.x = moving ? 0.28 + Math.max(0, -this.gait * 0.4) : 0.15;

    // Thân trên và đầu
    if (moving) {
      torso.position.y = Math.abs(Math.sin(this.phase * 2)) * 0.055;
      torso.rotation.y = Math.sin(this.phase) * 0.09;
      torso.rotation.z = Math.sin(this.phase) * 0.04;
      headGroup.rotation.y = -Math.sin(this.phase) * 0.05;
      headGroup.rotation.z = -Math.sin(this.phase) * 0.025;
    } else {
      torso.position.y = Math.sin(this.phase) * 0.012;
      torso.rotation.y = 0;
      torso.rotation.z = 0;
      headGroup.rotation.y = Math.sin(this.phase * 0.5) * 0.03;
      headGroup.rotation.z = 0;
    }
  }

  private has(...keys: string[]) {
    return keys.some((k) => this.keys.has(k));
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
