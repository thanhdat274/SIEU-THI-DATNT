import * as THREE from 'three';
import { buildChibiCharacter, type CharacterParts } from '../render/characterModel';

const WALK_SPEED = 1.6; // m/giây (thời gian game)

/** Bảng emoji nhỏ trên đầu nhân vật. */
function emojiSprite(): { sprite: THREE.Sprite; set: (text: string | null) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(0.65, 0.65, 1);
  sprite.position.y = 2.15;
  sprite.visible = false;
  return {
    sprite,
    set: (text) => {
      sprite.visible = !!text;
      if (!text) return;
      ctx.clearRect(0, 0, 64, 64);
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 36);
      texture.needsUpdate = true;
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
    let step = WALK_SPEED * dt;
    while (this.path.length && step > 0) {
      const next = this.path[0];
      const d = next.clone().sub(this.position).setY(0);
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
    this.animate(dt, step < WALK_SPEED * dt || this.path.length > 0);
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
    this.bobPhase += dt * (moving ? 9.5 : 2.5);
    const swingTarget = moving ? Math.sin(this.bobPhase) * 0.58 : 0;
    this.gait += (swingTarget - this.gait) * Math.min(1, dt * 14);

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
