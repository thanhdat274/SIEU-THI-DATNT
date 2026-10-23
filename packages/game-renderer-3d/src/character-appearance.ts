import {
  characterModelForId,
  characterModelForPartner,
  characterModelForPlayer,
  type CharacterModelKind,
} from './character-models';

export const CHARACTER_ARCHETYPES = [
  'player', 'partner', 'customer', 'staff_cashier', 'staff_refill', 'staff_security',
  'staff_drink', 'staff_drink_security', 'courier', 'street_vendor', 'student',
  'university_student', 'elder', 'parent', 'office_worker', 'child', 'shopper',
  'jogger', 'resident', 'pedestrian',
] as const;

export type CharacterArchetype = (typeof CHARACTER_ARCHETYPES)[number];

export interface CharacterAppearanceInput {
  identity: string;
  seed?: number;
  archetype: CharacterArchetype;
}

export interface CharacterAppearanceSpec {
  modelKind: CharacterModelKind;
  archetype: CharacterArchetype;
  outfitId: string;
  accessoryIds: readonly string[];
}

export function neighborhoodArchetype(type: string): CharacterArchetype {
  if (type === 'vendor') return 'street_vendor';
  if (type === 'walker') return 'pedestrian';
  return isCharacterArchetype(type) ? type : 'resident';
}

export function staffArchetype(role: string): CharacterArchetype {
  switch (role) {
    case 'cashier': return 'staff_cashier';
    case 'refill': return 'staff_refill';
    case 'security': return 'staff_security';
    case 'drink_staff': return 'staff_drink';
    case 'drink_security': return 'staff_drink_security';
    default: return 'resident';
  }
}

export function pedestrianArchetype(activity?: string): CharacterArchetype {
  switch (activity) {
    case 'student': return 'student';
    case 'jog': return 'jogger';
    default: return 'pedestrian';
  }
}

function isCharacterArchetype(value: string): value is CharacterArchetype {
  return (CHARACTER_ARCHETYPES as readonly string[]).includes(value);
}

const ROLE_STYLE: Readonly<Record<CharacterArchetype, { outfitId: string; accessoryIds: readonly string[] }>> = {
  player: { outfitId: 'player-casual', accessoryIds: [] },
  partner: { outfitId: 'partner-casual', accessoryIds: [] },
  customer: { outfitId: 'casual', accessoryIds: [] },
  staff_cashier: { outfitId: 'staff-cashier', accessoryIds: [] },
  staff_refill: { outfitId: 'staff-refill', accessoryIds: [] },
  staff_security: { outfitId: 'staff-security', accessoryIds: [] },
  staff_drink: { outfitId: 'staff-drink', accessoryIds: [] },
  staff_drink_security: { outfitId: 'staff-drink-security', accessoryIds: [] },
  courier: { outfitId: 'courier', accessoryIds: ['delivery-box'] },
  street_vendor: { outfitId: 'street-vendor', accessoryIds: ['street-vendor-cart'] },
  student: { outfitId: 'student', accessoryIds: ['backpack'] },
  university_student: { outfitId: 'university-student', accessoryIds: ['backpack'] },
  elder: { outfitId: 'elder', accessoryIds: ['walking-stick'] },
  parent: { outfitId: 'parent', accessoryIds: ['shoulder-bag'] },
  office_worker: { outfitId: 'office-worker', accessoryIds: ['briefcase'] },
  child: { outfitId: 'child', accessoryIds: [] },
  shopper: { outfitId: 'shopper', accessoryIds: ['shopping-bag'] },
  jogger: { outfitId: 'jogger', accessoryIds: ['sports-band'] },
  resident: { outfitId: 'resident-casual', accessoryIds: [] },
  pedestrian: { outfitId: 'pedestrian-casual', accessoryIds: [] },
};

/** Resolve identity and known role to a stable base model and wardrobe key. */
export function resolveCharacterAppearance(input: CharacterAppearanceInput): CharacterAppearanceSpec {
  let modelKind: CharacterModelKind;
  switch (input.archetype) {
    case 'player': modelKind = characterModelForPlayer(); break;
    case 'partner': modelKind = characterModelForPartner(); break;
    default: modelKind = characterModelForId(input.identity, input.seed);
  }
  const style = ROLE_STYLE[input.archetype];
  return {
    modelKind,
    archetype: input.archetype,
    outfitId: style.outfitId,
    accessoryIds: style.accessoryIds,
  };
}
