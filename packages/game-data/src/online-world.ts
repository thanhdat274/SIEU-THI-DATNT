import type { BusinessState, GameAccount, GameAvatar, GameWorld, WorldMembership } from '@game/shared';
import { MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';
import { DEFAULT_INITIAL_SAVE } from './map';

export function createInitialOnlineWorld(
  owner: Pick<GameAccount, 'id' | 'displayName' | 'photoUrl'>,
  worldId: string,
  now = new Date().toISOString(),
): { world: GameWorld; business: BusinessState; owner: GameAccount } {
  if (!owner.id.trim() || !owner.displayName.trim() || !worldId.trim() || Number.isNaN(Date.parse(now))) {
    throw new Error('Invalid online world seed input');
  }
  const businessId = `${worldId}:business:1`;
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.id = `${worldId}:save:1`;
  save.revision = 0;
  save.createdAt = now;
  save.updatedAt = now;
  const account: GameAccount = { ...owner, createdAt: now };
  const membership: WorldMembership = { accountId: owner.id, role: 'owner', joinedAt: now, lastSeenRevision: 0 };
  const avatar: GameAvatar = {
    accountId: owner.id,
    position: { ...save.player.position },
    direction: save.player.direction,
    updatedAt: now,
  };
  const business: BusinessState = { id: businessId, ownerAccountIds: [owner.id], save };
  const world: GameWorld = {
    id: worldId,
    name: 'Hẻm mới',
    schemaVersion: 1,
    protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    worldTime: structuredClone(save.worldTime),
    memberships: [membership],
    businessIds: [businessId],
    avatars: [avatar],
  };
  return { world, business, owner: account };
}
