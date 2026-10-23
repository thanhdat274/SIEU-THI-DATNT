import * as THREE from 'three';

/**
 * Camera kiểu city builder:
 * - Kéo chuột trái: di chuyển (bỏ bám nhân vật)
 * - Kéo chuột phải / Q E: xoay
 * - Cuộn chuột: zoom
 */
export class CameraController {
  target = new THREE.Vector3(0, 0, 0);
  distance = 30;
  yaw = Math.PI / 4;
  pitch = 0.9; // radian, góc nhìn từ trên xuống

  minDistance = 6;
  maxDistance = 80;
  bounds = 60;

  /** Điểm camera bám theo (nhân vật). Kéo chuột để tạm bỏ bám. */
  follow: THREE.Vector3 | null = null;
  /** Số pixel đã kéo trong lần nhấn chuột hiện tại, để phân biệt bấm và kéo. */
  dragged = 0;

  private keys = new Set<string>();
  private dragButton = -1;
  /** Các ngón tay đang chạm màn hình (cảm ứng). */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; angle: number; midY: number } | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(private camera: THREE.PerspectiveCamera, private dom: HTMLElement) {
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        // Ngón thứ hai chạm xuống: chuyển sang chế độ hai ngón, không tính là bấm để đi
        if (this.touches.size === 2) {
          this.pinch = this.pinchState();
          this.dragged = 999;
          this.dragButton = -1;
          return;
        }
      }
      this.dragButton = e.button;
      this.dragged = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });
    const lift = (e: PointerEvent) => {
      this.dragButton = -1;
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) this.pinch = null;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    };
    // Để main.tsx xử lý bấm (đi tới, đặt đồ) trước, rồi mới xoá trạng thái kéo
    dom.addEventListener('pointerup', (e) => queueMicrotask(() => lift(e)));
    dom.addEventListener('pointercancel', lift);
    dom.addEventListener('pointermove', (e) => {
      if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch) this.onPinch();
      else this.onDrag(e);
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance *= 1 + Math.sign(e.deltaY) * 0.1;
      this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    }, { passive: false });
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  private onDrag(e: PointerEvent) {
    if (this.dragButton < 0) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.dragButton === 2) {
      this.yaw -= dx * 0.005;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.005, 0.3, 1.45);
    } else {
      const scale = this.distance * 0.0015;
      this.pan(-dx * scale, -dy * scale);
      this.follow = null;
      this.dragged += Math.abs(dx) + Math.abs(dy);
    }
  }

  private pinchState() {
    const [a, b] = [...this.touches.values()];
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      midY: (a.y + b.y) / 2,
    };
  }

  /** Hai ngón: chụm/mở để zoom, xoay hai ngón để xoay camera, cùng kéo lên/xuống để nghiêng. */
  private onPinch() {
    if (this.touches.size < 2 || !this.pinch) return;
    const now = this.pinchState();
    if (now.dist > 10) {
      this.distance = THREE.MathUtils.clamp(this.distance * (this.pinch.dist / now.dist), this.minDistance, this.maxDistance);
    }
    let turn = now.angle - this.pinch.angle;
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    this.yaw += turn;
    this.pitch = THREE.MathUtils.clamp(this.pitch + (now.midY - this.pinch.midY) * 0.004, 0.3, 1.45);
    this.pinch = now;
  }

  /** Di chuyển theo hướng camera đang nhìn (trên mặt phẳng). */
  private pan(right: number, forward: number) {
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    this.target.x += right * cos + forward * sin;
    this.target.z += -right * sin + forward * cos;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -this.bounds, this.bounds);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -this.bounds, this.bounds);
  }

  update(dt: number) {
    if (this.follow) this.target.lerp(this.follow, Math.min(1, dt * 6));
    if (this.keys.has('q')) this.yaw += 1.5 * dt;
    if (this.keys.has('e')) this.yaw -= 1.5 * dt;

    const horizontal = this.distance * Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + horizontal * Math.sin(this.yaw),
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + horizontal * Math.cos(this.yaw),
    );
    this.camera.lookAt(this.target);
  }
}
