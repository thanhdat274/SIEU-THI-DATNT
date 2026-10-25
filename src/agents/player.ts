import * as THREE from 'three';
import { joystick } from '../core/actions';
import { buildChibiCharacter, type CharacterParts } from '../render/characterModel';
import type { NavGrid } from '../world/navGrid';
import { useGame } from '../core/store';
import { costumeById } from '../data/costumes';
import { playerPace } from '../data/biz';

const SPEED = 3.5; // m/giây

// Biến tạm dùng lại mỗi khung, tránh cấp phát rác trong vòng render
const _input = new THREE.Vector2();

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

  /**
   * Đi tới điểm, tự tìm đường vòng qua tường.
   * Đường này do lịch tự động / nút đi nhanh vạch ra: nhân vật đi theo nhịp đồng hồ game
   * (xem `timeScale` ở `update`) nên tua 3×, 8× vẫn về tới nơi trong cùng số phút như 1×.
   */
  walkTo(target: THREE.Vector3) {
    this.path = this.grid.findPath(this.position, target);
  }

  /**
   * @param timeScale tốc độ tua thời gian (1 / 3 / 8): chỉ nhân vào lúc đi theo đường tự động,
   *   để tua nhanh thì nhân vật kịp đi về nhà trong cùng số phút game như khi chạy 1×.
   *   Người chơi tự bấm phím thì luôn đi tốc độ thật, không bị tua nhanh làm lao vọt.
   * @returns true nếu nhân vật đang di chuyển.
   */
  update(dt: number, cameraYaw: number, timeScale = 1): boolean {
    if (this.asleep) return false;
    const input = _input.set(
      (this.has('d', 'arrowright') ? 1 : 0) - (this.has('a', 'arrowleft') ? 1 : 0),
      (this.has('s', 'arrowdown') ? 1 : 0) - (this.has('w', 'arrowup') ? 1 : 0),
    );

    // Không bấm phím thì lấy cần điều khiển ảo (kéo nửa chừng thì đi chậm)
    let pace = 1;
    if (input.lengthSq() === 0 && Math.hypot(joystick.x, joystick.y) > 0) {
      input.set(joystick.x, joystick.y);
      pace = Math.min(1, input.length() * 1.3);
    }
    // Người chơi đang tự điều khiển thì bỏ đường tự động, đi tốc độ thật (không nhân timeScale)
    const manual = input.lengthSq() > 0;
    if (manual) {
      this.path = [];
      input.normalize();
      // Đổi hướng phím theo góc camera: W luôn là "đi vào trong màn hình"
      const sin = Math.sin(cameraYaw);
      const cos = Math.cos(cameraYaw);
      const dx = input.x * cos + input.y * sin;
      const dz = -input.x * sin + input.y * cos;
      this.moveStep(dx, dz, SPEED * pace * this.paceMul() * dt);
      this.face(dx, dz, dt);
      this.animate(dt, true);
      return true;
    }
    if (!this.path.length) {
      this.animate(dt, false);
      return false;
    }

    // Đi theo đường tự động. Tua 3×/8×: đi nhanh gấp bấy nhiêu lần để cùng số phút trong game
    // là tới nơi như 1×. Chia bước ≤ 0.2 m để bước một khung quá dài không xuyên qua tường.
    const stepDt = dt * timeScale;
    let budget = SPEED * this.paceMul() * stepDt;
    let moved = false;
    let lastX = 0;
    let lastZ = 0;
    while (budget > 1e-4 && this.path.length) {
      const next = this.path[0];
      const dx = next.x - this.position.x;
      const dz = next.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) {
        this.path.shift();
        continue;
      }
      const nx = dx / dist;
      const nz = dz / dist;
      const travel = Math.min(budget, dist, 0.2);
      const px = this.position.x;
      const pz = this.position.z;
      this.moveStep(nx, nz, travel);
      budget -= travel;
      lastX = nx;
      lastZ = nz;
      if (this.position.x === px && this.position.z === pz) break; // kẹt vật cản: khung sau thử lại
      moved = true;
    }
    if (moved) this.face(lastX, lastZ, stepDt);
    this.animate(stepDt, moved);
    return moved;
  }

  /** Hệ số đi nhanh: nhà đẹp ngủ ngon, ăn sáng, có xe (ngoài đường). */
  private paceMul() {
    const g = useGame.getState();
    return playerPace(g.biz, g.day, g.location === 'Ngoài đường');
  }

  /**
   * Dời một bước ngắn theo hướng (dx, dz), trượt dọc theo tường thay vì kẹt.
   * Đứng trong vật cản (vừa đặt đồ đè lên) thì cho đi ra.
   */
  private moveStep(dx: number, dz: number, meters: number) {
    const p = this.position;
    const stuck = this.grid.isBlocked(p.x, p.z);
    if (stuck || !this.grid.isBlocked(p.x + dx * meters, p.z)) p.x += dx * meters;
    if (stuck || !this.grid.isBlocked(p.x, p.z + dz * meters)) p.z += dz * meters;
  }

  /** Xoay dần người về hướng đi. */
  private face(dx: number, dz: number, dt: number) {
    this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 14));
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
