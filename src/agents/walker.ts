import * as THREE from 'three';
import { buildChibiCharacter, type CharacterParts } from '../render/characterModel';

const WALK_SPEED = 1.6; // m/giây (thời gian game)
export const RIDE_SPEED = 3.6; // m/giây khi cưỡi xe (nhanh gấp rưỡi chạy bộ của người chơi)

// Vector tạm dùng lại mỗi khung cho mọi nhân vật đang đi (không cấp phát rác)
const _stepDir = new THREE.Vector3();

/**
 * Bong bóng thoại trên đầu nhân vật: nền trắng viền mảnh, đuôi nhọn chỉ xuống đầu.
 * Emoji nằm trong bong bóng tròn; chữ ngắn ("Hết sữa!") nằm trong bong bóng dài.
 * Canvas 256×128 (2:1) nên sprite luôn giữ tỉ lệ 2:1 — lệch tỉ lệ là hình bị bóp dẹt.
 */
function emojiSprite(): { sprite: THREE.Sprite; set: (text: string | null) => void; dispose: () => void } {
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.renderOrder = 10;
  sprite.visible = false;
  const isEmoji = (t: string) => !/[a-zA-Z0-9À-ỹ]/.test(t);
  /** Vẽ bong bóng rộng w, cao h, căn giữa; đuôi nhọn ở đáy. */
  const bubble = (w: number, h: number) => {
    const x = (W - w) / 2, y = 6, r = Math.min(h / 2, 30);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.moveTo(W / 2 - 12, y + h - 1);
    ctx.lineTo(W / 2, y + h + 16);
    ctx.lineTo(W / 2 + 12, y + h - 1);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.save();
    ctx.translate(0, 3);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3d3d4e';
    ctx.stroke();
    // Che nét viền giữa thân bong bóng và đuôi
    ctx.fillRect(W / 2 - 10, y + h - 3, 20, 5);
  };
  return {
    sprite,
    set: (text) => {
      sprite.visible = !!text;
      if (!text) return;
      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isEmoji(text)) {
        sprite.scale.set(1.0, 0.5, 1);
        sprite.position.y = 2.15;
        bubble(96, 90);
        ctx.font = '58px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.fillText(text, W / 2, 54);
      } else {
        sprite.scale.set(1.6, 0.8, 1);
        sprite.position.y = 2.3;
        ctx.font = 'bold 30px sans-serif';
        const w = Math.min(W - 12, ctx.measureText(text).width + 32);
        bubble(w, 56);
        ctx.fillStyle = '#2d3436';
        ctx.fillText(text, W / 2, 35, W - 36);
      }
      texture.needsUpdate = true;
    },
    dispose: () => {
      texture.dispose();
      sprite.material.dispose();
    },
  };
}

let walkerIds = 0;
export type WalkerProfession = 'customer' | 'cashier' | 'stocker';

/** Người đi bộ do máy điều khiển (khách, nhân viên): đi theo đường, làm lần lượt các bước trong plan. */
export class Walker {
  mesh = new THREE.Group();
  private parts: CharacterParts;
  private gait = 0;
  private bobPhase = Math.random() * Math.PI * 2;
  path: THREE.Vector3[] = [];
  /** Các bước còn lại sau khi tới đích hiện tại. */
  plan: (() => void)[] = [];
  pause = 0;
  /** Tốc độ di chuyển hiện tại (m/giây) — tăng lên khi ngồi trên xe. */
  speed = WALK_SPEED;
  /** Đang ngồi trên xe: ngồi tư thế ngồi thật, không vung chân như đi bộ. */
  riding = false;
  private emoji = emojiSprite();
  private emojiTimer = 0;
  /** Emoji hiện mãi (vd. biểu tượng nghề nhân viên) khi không nói gì. */
  badge: string | null = null;
  /** Số định danh và màu áo, để gửi cho máy bạn khi chơi 2 người. */
  readonly id = ++walkerIds;
  readonly color: number;
  readonly hatColor?: number;

  constructor(
    bodyColor: THREE.ColorRepresentation,
    hatColor?: number,
    profession: WalkerProfession = 'customer',
    archetype?: import('../render/characterModel').CharacterArchetype,
    look?: Partial<import('../render/characterModel').CharacterMeshOptions>,
  ) {
    this.color = new THREE.Color(bodyColor).getHex();
    this.hatColor = hatColor;

    this.parts = buildChibiCharacter({
      profession,
      bodyColor,
      hatColor,
      archetype,
      hasGlasses: profession === 'cashier' ? true : undefined,
      ...look,
    });

    this.mesh.add(this.parts.root, this.emoji.sprite);
  }

  get position() { return this.mesh.position; }

  say(text: string, seconds = 2.5) {
    this.emoji.set(text);
    this.emojiTimer = seconds;
  }

  setBadge(text: string | null) {
    this.badge = text;
    if (this.emojiTimer <= 0) this.emoji.set(text);
  }

  get idle() {
    return this.path.length === 0 && this.plan.length === 0 && this.pause <= 0;
  }

  /** Nhân vật rời khỏi sân khấu vĩnh viễn: giải phóng geometry/material để không rò rỉ bộ nhớ GPU. */
  dispose() {
    const freeMat = (m: THREE.Material) => {
      (m as unknown as { map?: THREE.Texture }).map?.dispose();
      m.dispose();
    };
    this.mesh.traverse((o) => {
      if (!(o instanceof THREE.Mesh || o instanceof THREE.Sprite)) return;
      o.geometry?.dispose();
      const mat = o.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach(freeMat);
      else freeMat(mat);
    });
    this.emoji.dispose();
  }

  step(dt: number) {
    if (this.move(dt) && this.plan.length) {
      const next = this.plan.shift()!;
      next();
    }
  }

  /** Đi theo đường; trả về true khi tới nơi (và hết thời gian dừng). */
  move(dt: number): boolean {
    if (this.emojiTimer > 0 && (this.emojiTimer -= dt) <= 0) this.emoji.set(this.badge);
    if (this.pause > 0) {
      this.pause -= dt;
      this.animate(dt, false);
      return false;
    }
    let step = this.speed * dt;
    while (this.path.length && step > 0) {
      const next = this.path[0];
      const d = _stepDir.set(next.x - this.position.x, 0, next.z - this.position.z);
      const len = d.length();
      if (len <= step) {
        this.position.set(next.x, 0, next.z);
        this.path.shift();
        step -= len;
      } else {
        this.position.addScaledVector(d.normalize(), step);
        const targetRot = Math.atan2(d.x, d.z);
        this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, targetRot, Math.min(1, dt * 14));
        step = 0;
      }
    }
    this.animate(dt, step < this.speed * dt || this.path.length > 0);
    return this.path.length === 0;
  }

  /**
   * Hệ thống chuyển động (Kinematic Animation) đa tầng:
   * - Đung đưa đùi + gập đầu gối cẳng chân nhịp nhàng
   * - Đánh tay đối xứng tự nhiên, cẳng tay gập nhẹ
   * - Đầu và thân hơi nhấp nhô (bobbing), hơi lắc hông (hip sway) và hơi nghiêng khi bước đi
   * - Nhịp thở êm ái khi đứng yên (breathing idle)
   */
  private animate(dt: number, moving: boolean) {
    const { torso, headGroup, leftLeg, rightLeg, leftShin, rightShin, leftArm, rightArm, leftForearm, rightForearm } = this.parts;
    const ease = Math.min(1, dt * 10);

    // Ngồi trên xe: đùi ngang trước, gối co xuống, hai tay vươn ra tay lái,
    // thân hơi chúi về trước và rung nhẹ theo máy — không phải dáng đi bộ
    if (this.riding) {
      this.bobPhase += dt * 24;
      const vibe = Math.sin(this.bobPhase) * 0.02;
      leftLeg.rotation.x += (-1.3 + vibe - leftLeg.rotation.x) * ease;
      rightLeg.rotation.x += (-1.25 - vibe - rightLeg.rotation.x) * ease;
      leftLeg.rotation.z = 0.09;
      rightLeg.rotation.z = -0.09;
      leftShin.rotation.x += (1.15 - leftShin.rotation.x) * ease;
      rightShin.rotation.x += (1.1 - rightShin.rotation.x) * ease;
      leftArm.rotation.x += (-0.7 + vibe - leftArm.rotation.x) * ease;
      rightArm.rotation.x += (-0.7 - vibe - rightArm.rotation.x) * ease;
      leftArm.rotation.z = 0.12;
      rightArm.rotation.z = -0.12;
      leftForearm.rotation.x += (0.35 - leftForearm.rotation.x) * ease;
      rightForearm.rotation.x += (0.35 - rightForearm.rotation.x) * ease;
      torso.rotation.x += (0.14 - torso.rotation.x) * ease;
      torso.position.y = Math.abs(Math.sin(this.bobPhase * 2)) * 0.012;
      torso.rotation.y = 0;
      torso.rotation.z = 0;
      headGroup.rotation.y = 0;
      headGroup.rotation.z = 0;
      return;
    }
    torso.rotation.x += (0 - torso.rotation.x) * ease;

    this.bobPhase += dt * (moving ? 9.5 : 2.5);
    const swingTarget = moving ? Math.sin(this.bobPhase) * 0.58 : 0;
    this.gait += (swingTarget - this.gait) * Math.min(1, dt * 14);

    // Chân & Đầu gối
    leftLeg.rotation.x = this.gait;
    rightLeg.rotation.x = -this.gait;
    leftLeg.rotation.z = moving ? 0.04 : 0;
    rightLeg.rotation.z = moving ? -0.04 : 0;

    // Gập gối tự nhiên khi nhấc chân về phía sau
    leftShin.rotation.x = moving ? Math.max(0, -this.gait * 0.9) : 0;
    rightShin.rotation.x = moving ? Math.max(0, this.gait * 0.9) : 0;

    // Tay & Cẳng tay
    leftArm.rotation.x = -this.gait * 0.75;
    rightArm.rotation.x = this.gait * 0.75;
    leftArm.rotation.z = moving ? -0.12 : -0.08;
    rightArm.rotation.z = moving ? 0.12 : 0.08;

    // Cẳng tay hơi co lại năng động
    leftForearm.rotation.x = moving ? 0.25 + Math.max(0, this.gait * 0.35) : 0.15;
    rightForearm.rotation.x = moving ? 0.25 + Math.max(0, -this.gait * 0.35) : 0.15;

    // Thân nhấp nhô & lắc hông nhịp nhàng
    if (moving) {
      torso.position.y = Math.abs(Math.sin(this.bobPhase * 2)) * 0.045;
      torso.rotation.y = Math.sin(this.bobPhase) * 0.08;
      torso.rotation.z = Math.sin(this.bobPhase) * 0.035;
      headGroup.rotation.y = -Math.sin(this.bobPhase) * 0.04;
      headGroup.rotation.z = -Math.sin(this.bobPhase) * 0.02;
    } else {
      // Idle thở nhẹ nhàng
      torso.position.y = Math.sin(this.bobPhase) * 0.012;
      torso.rotation.y = 0;
      torso.rotation.z = 0;
      headGroup.rotation.y = Math.sin(this.bobPhase * 0.5) * 0.03;
      headGroup.rotation.z = 0;
    }
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
