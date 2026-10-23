import { SCALE_TARGETS } from './scale-spec';

export type CharacterModelKind =
  | 'character_female_a'
  | 'character_female_b'
  | 'character_female_c'
  | 'character_female_d'
  | 'character_female_e'
  | 'character_female_f'
  | 'character_male_a'
  | 'character_male_b'
  | 'character_male_c'
  | 'character_male_d'
  | 'character_male_e'
  | 'character_male_f';

export const CHARACTER_MODELS: readonly CharacterModelKind[] = [
  'character_female_a',
  'character_female_b',
  'character_female_c',
  'character_female_d',
  'character_female_e',
  'character_female_f',
  'character_male_a',
  'character_male_b',
  'character_male_c',
  'character_male_d',
  'character_male_e',
  'character_male_f',
] as const;

export const CHARACTER_PRESENTATION: Readonly<Record<CharacterModelKind, 'feminine' | 'masculine'>> = {
  character_female_a: 'feminine',
  character_female_b: 'feminine',
  character_female_c: 'feminine',
  character_female_d: 'feminine',
  character_female_e: 'feminine',
  character_female_f: 'feminine',
  character_male_a: 'masculine',
  character_male_b: 'masculine',
  character_male_c: 'masculine',
  character_male_d: 'masculine',
  character_male_e: 'masculine',
  character_male_f: 'masculine',
};

const FEMININE_CHARACTER_MODELS = CHARACTER_MODELS.filter((kind) => CHARACTER_PRESENTATION[kind] === 'feminine');
const MASCULINE_CHARACTER_MODELS = CHARACTER_MODELS.filter((kind) => CHARACTER_PRESENTATION[kind] === 'masculine');

export interface CharacterModelSpec {
  kind: CharacterModelKind;
  filename: string;
  url: string;
  rawHeight: number;
  scale: number;
  targetHeight: number;
}

/** Chiều cao chuẩn nhân vật 3D: đọc từ scale-spec (0.80 * D = 1.28) */
export const TARGET_CHARACTER_HEIGHT = SCALE_TARGETS.adultPlayer;

export const CHARACTER_CATALOG: Record<CharacterModelKind, CharacterModelSpec> = {
  character_female_a: {
    kind: 'character_female_a',
    filename: 'character-female-a.glb',
    url: '/assets/models/mini-characters/character-female-a.glb',
    rawHeight: 0.7755,
    scale: TARGET_CHARACTER_HEIGHT / 0.7755,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_female_b: {
    kind: 'character_female_b',
    filename: 'character-female-b.glb',
    url: '/assets/models/mini-characters/character-female-b.glb',
    rawHeight: 0.7234,
    scale: TARGET_CHARACTER_HEIGHT / 0.7234,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_female_c: {
    kind: 'character_female_c',
    filename: 'character-female-c.glb',
    url: '/assets/models/mini-characters/character-female-c.glb',
    rawHeight: 0.7755,
    scale: TARGET_CHARACTER_HEIGHT / 0.7755,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_female_d: {
    kind: 'character_female_d',
    filename: 'character-female-d.glb',
    url: '/assets/models/mini-characters/character-female-d.glb',
    rawHeight: 0.7755,
    scale: TARGET_CHARACTER_HEIGHT / 0.7755,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_female_e: {
    kind: 'character_female_e',
    filename: 'character-female-e.glb',
    url: '/assets/models/mini-characters/character-female-e.glb',
    rawHeight: 0.7165,
    scale: TARGET_CHARACTER_HEIGHT / 0.7165,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_female_f: {
    kind: 'character_female_f',
    filename: 'character-female-f.glb',
    url: '/assets/models/mini-characters/character-female-f.glb',
    rawHeight: 0.6713,
    scale: TARGET_CHARACTER_HEIGHT / 0.6713,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_male_a: {
    kind: 'character_male_a',
    filename: 'character-male-a.glb',
    url: '/assets/models/mini-characters/character-male-a.glb',
    rawHeight: 0.6713,
    scale: TARGET_CHARACTER_HEIGHT / 0.6713,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_male_b: {
    kind: 'character_male_b',
    filename: 'character-male-b.glb',
    url: '/assets/models/mini-characters/character-male-b.glb',
    rawHeight: 0.6613,
    scale: TARGET_CHARACTER_HEIGHT / 0.6613,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_male_c: {
    kind: 'character_male_c',
    filename: 'character-male-c.glb',
    url: '/assets/models/mini-characters/character-male-c.glb',
    rawHeight: 0.7928,
    scale: TARGET_CHARACTER_HEIGHT / 0.7928,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_male_d: {
    kind: 'character_male_d',
    filename: 'character-male-d.glb',
    url: '/assets/models/mini-characters/character-male-d.glb',
    rawHeight: 0.7218,
    scale: TARGET_CHARACTER_HEIGHT / 0.7218,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_male_e: {
    kind: 'character_male_e',
    filename: 'character-male-e.glb',
    url: '/assets/models/mini-characters/character-male-e.glb',
    rawHeight: 0.6760,
    scale: TARGET_CHARACTER_HEIGHT / 0.6760,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
  character_male_f: {
    kind: 'character_male_f',
    filename: 'character-male-f.glb',
    url: '/assets/models/mini-characters/character-male-f.glb',
    rawHeight: 0.6713,
    scale: TARGET_CHARACTER_HEIGHT / 0.6713,
    targetHeight: TARGET_CHARACTER_HEIGHT,
  },
};

/**
 * 1. Phân bổ Model ổn định theo ID (Deterministic assignment):
 * - Người chơi (Player): Luôn là character_female_a (Cô Năm)
 * - Bạn co-op (Partner): Luôn là character_male_a
 * - Nhân viên giao hàng (Logistics worker): Luôn là character_male_c
 * - Khách hàng, nhân viên, NPC: Băm ổn định theo id/lookSeed
 */
export function characterModelForPlayer(): CharacterModelKind {
  return 'character_female_a';
}

export function characterModelForPartner(): CharacterModelKind {
  return 'character_male_a';
}

export function characterModelForDelivery(): CharacterModelKind {
  return 'character_male_c';
}

export function characterModelForId(id: string, seed?: number): CharacterModelKind {
  let idHash = 0;
  for (let i = 0; i < id.length; i++) {
    idHash = (Math.imul(idHash, 31) + id.charCodeAt(i)) >>> 0;
  }
  // Keep family selection independent from lookSeed: customer IDs and lookSeed
  // are both sequence-derived, so mixing them into the same parity cancels out.
  // The identity bit alternates sequential IDs; seed diversifies the six models.
  const models = (idHash & 1) === 0 ? FEMININE_CHARACTER_MODELS : MASCULINE_CHARACTER_MODELS;
  const seedHash = (seed ?? 0) >>> 0;
  const variant = ((idHash >>> 1) + seedHash) % models.length;
  return models[variant];
}

/**
 * 2. Tính góc quay mục tiêu (Yaw) theo hướng di chuyển thật (dx, dz):
 * Babylon hệ tay phải:
 * - Trục X: Đông (+X) / Tây (-X)
 * - Trục Z: Nam (+Z) / Bắc (-Z)
 * Model gốc nhìn về phía +Z (Nam) ứng với rotation.y = 0.
 * Khi di chuyển vector (dx, dz): góc yaw mục tiêu = atan2(dx, dz).
 */
export function targetYawFromMovement(dx: number, dz: number, fallbackYaw = 0): number {
  const distSq = dx * dx + dz * dz;
  if (distSq < 0.0001) return fallbackYaw;
  return Math.atan2(dx, dz);
}

/**
 * Nội suy góc quay mượt mà (smooth turn interpolation):
 * Quay theo cung ngắn nhất quanh vòng tròn [-PI, PI].
 */
export function stepYawTowards(currentYaw: number, targetYaw: number, elapsed: number, turnSpeed = 12): number {
  let diff = (targetYaw - currentYaw) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;

  const maxStep = turnSpeed * elapsed;
  if (Math.abs(diff) <= maxStep) {
    return targetYaw;
  }
  return currentYaw + Math.sign(diff) * maxStep;
}

/**
 * Kiểm tra xem NPC/người này có đội nón lá hay không.
 */
export function shouldHaveNonLa(id: string, accessory?: string, lookSeed?: number): boolean {
  if (accessory === 'cart' || accessory === 'non_la' || accessory === 'street_vendor') {
    return true;
  }
  let hash = lookSeed ?? 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 37 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 5 === 0;
}
