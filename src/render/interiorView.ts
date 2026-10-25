import * as THREE from 'three';
import type { Building } from '../world/buildings';
import type { CameraController } from './cameraController';

const FADE_S = 0.22;

/**
 * Cảnh trong nhà kiểu Stardew Valley: bước qua cửa thì màn hình tối thoáng qua,
 * rồi thấy căn phòng (mất mái, tường phía trước hạ thấp; cảnh bên ngoài vẫn hiện để biết mình ở đâu),
 * camera kéo lại gần. Ra khỏi cửa thì trở về như cũ.
 */
export class InteriorView {
  /** Tòa nhà đang hiện cảnh bên trong. */
  current: Building | null = null;
  private pending: Building | null = null;
  private fade = 0;
  private fadingIn = false;
  private overlay: HTMLDivElement;
  private outdoorDistance = 0;
  private hidden = new Set<THREE.Object3D>();

  constructor(private scene: THREE.Scene, private controller: CameraController, private keep: THREE.Object3D[]) {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed', inset: '0', background: '#000', opacity: '0', pointerEvents: 'none',
    });
    // Nằm dưới lớp giao diện: chỉ cảnh 3D tối đi, thanh menu vẫn hiện
    document.getElementById('ui')!.before(this.overlay);
  }

  /** Gọi mỗi khung hình, sau khi ánh sáng đã tính màu trời. */
  update(dt: number, at: Building | null) {
    if (at !== this.current && !this.fadingIn && this.fade === 0) {
      this.pending = at;
      this.fadingIn = true;
    }
    if (this.fadingIn) {
      this.fade = Math.min(1, this.fade + dt / FADE_S);
      if (this.fade === 1) {
        this.switchTo(this.pending);
        this.fadingIn = false;
      }
    } else if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / FADE_S);
    this.overlay.style.opacity = String(this.fade);

    if (this.current) this.hideOverhead();
  }

  /** Bỏ cảnh trong nhà ngay (vd. về màn đăng nhập). */
  reset() {
    this.switchTo(null);
    this.fade = 0;
    this.fadingIn = false;
    this.overlay.style.opacity = '0';
  }

  private switchTo(b: Building | null) {
    const was = this.current;
    this.current = b;
    if (b && !was) this.outdoorDistance = this.controller.distance;
    if (b) {
      const size = Math.max(b.opts.width, b.opts.depth);
      this.controller.distance = THREE.MathUtils.clamp(size * 1.5, 11, 30);
    } else {
      if (was) this.controller.distance = this.outdoorDistance;
      for (const o of this.hidden) o.visible = true;
      this.hidden.clear();
    }
  }

  /** Ẩn mây và mưa (trong nhà không mưa, mây không che phòng). */
  private hideOverhead() {
    for (const o of this.scene.children) {
      if (o instanceof THREE.Light || this.keep.includes(o)) continue;
      if ((o.position.y > 6 || o instanceof THREE.LineSegments) && o.visible) {
        o.visible = false;
        this.hidden.add(o);
      }
    }
  }
}
