import * as THREE from 'three';
import { formatMoney } from '../../data/products';

/**
 * Juice kiểu game nông trại (Xóm Nông Trại): mỗi lần tính tiền xong, một bong bóng
 * "+12.000đ" bay lên từ quầy rồi tan — phản hồi bằng mắt ngay "vừa bán được bao nhiêu",
 * ghép với sfx 'sale' và chip tiền trên HUD đã có.
 * Sprite vẽ chữ lên canvas một lần khi sinh, bay bằng vòng update — không DOM, không re-render UI.
 */

/** Chữ trên bong bóng: số âm không có nghĩa ở đây — kẹp về 0 để khỏi in "+−3đ". */
export function coinPopLabel(amount: number): string {
  return `+${formatMoney(Math.max(0, amount))}`;
}

export const COIN_POP_LIFETIME = 1.4;
const RISE = 1.15;

/** Đường đi của bong bóng theo tuổi (giây): bay lên chậm dần, phình nhẹ lúc mới sinh, mờ dần cuối. */
export function coinPopPose(age: number): { y: number; opacity: number; scale: number } {
  const t = Math.min(1, Math.max(0, age / COIN_POP_LIFETIME));
  const ease = 1 - (1 - t) * (1 - t); // ease-out quad
  const born = Math.min(1, age / 0.12); // phình lên trong 0.12s đầu
  const fade = 1 - Math.max(0, (t - 0.65) / 0.35); // 35% cuối mờ dần
  return { y: ease * RISE, opacity: fade, scale: 0.6 + 0.4 * born };
}

/** Vẽ pill "+12.000đ 💰" lên canvas — nền tím-than, viền vàng, đúng bảng màu UI của game. */
function drawPill(canvas: HTMLCanvasElement, label: string) {
  const g = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 96;
  g.clearRect(0, 0, 256, 96);
  g.fillStyle = 'rgba(58, 58, 77, 0.92)';
  g.strokeStyle = '#f1c40f';
  g.lineWidth = 6;
  const r = 44, w = 256 - 12, h = 96 - 12, x = 6, y = 6;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = '700 44px "Segoe UI", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 128, 51);
}

export class CoinPopFX {
  private pool: { sprite: THREE.Sprite; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; age: number; live: boolean }[] = [];
  private readonly max = 10;

  constructor(private scene: THREE.Scene) {}

  /** Tạo pool lười ở lần spawn đầu: sim trong node test new CustomerManager không được chạm DOM. */
  private ensurePool() {
    if (this.pool.length || typeof document === 'undefined') return;
    for (let i = 0; i < this.max; i++) {
      const canvas = document.createElement('canvas');
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.center.set(0.5, 0);
      sprite.scale.set(0.92, 0.345, 1);
      sprite.renderOrder = 20;
      sprite.visible = false;
      this.scene.add(sprite);
      this.pool.push({ sprite, canvas, tex, age: 0, live: false });
    }
  }

  /** Sinh bong bóng tại một điểm (thường là tâm quầy thu ngân). amount ≤ 0 thì bỏ qua — không có gì để khoe. */
  spawn(at: THREE.Vector3, amount: number) {
    if (amount <= 0) return;
    this.ensurePool();
    if (!this.pool.length) return; // môi trường không DOM (node test) — im lặng bỏ qua
    // Hết pool thì giật của thằng già nhất đang bay — bán dồn dập vẫn luôn có phản hồi mới nhất
    let slot = this.pool.find((s) => !s.live);
    if (!slot) {
      slot = this.pool.reduce((a, b) => (a.age > b.age ? a : b));
    }
    drawPill(slot.canvas, coinPopLabel(amount));
    slot.tex.needsUpdate = true;
    slot.sprite.position.copy(at);
    slot.sprite.position.y = 1.15;
    slot.age = 0;
    slot.live = true;
    slot.sprite.visible = true;
  }

  /** Cập nhật bằng giây THẬT (không nhân speed) — tua 8× bong bóng vẫn bay đủ lâu để đọc. */
  update(dt: number) {
    for (const s of this.pool) {
      if (!s.live) continue;
      s.age += dt;
      if (s.age >= COIN_POP_LIFETIME) {
        s.live = false;
        s.sprite.visible = false;
        continue;
      }
      const pose = coinPopPose(s.age);
      s.sprite.position.y = 1.15 + pose.y;
      (s.sprite.material as THREE.SpriteMaterial).opacity = pose.opacity;
      const k = pose.scale;
      s.sprite.scale.set(0.92 * k, 0.345 * k, 1);
    }
  }

  /** Dọn dẹp khi bóc cả cảnh (hẻm online reset, test...). */
  dispose() {
    for (const s of this.pool) {
      this.scene.remove(s.sprite);
      s.tex.dispose();
      (s.sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.pool = [];
  }
}
