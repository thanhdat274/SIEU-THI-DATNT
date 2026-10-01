import { getFixtureDimensions, type Direction, type GameAvatar, type GameInputIntent, type GameTileMap, type StoreFixture, type Vector2D } from '@game/shared';
import { CollisionSystem } from './collision';

const PLAYER_SPEED = 130;
const MAX_INPUT_DELTA_SECONDS = 0.1;
const MAX_INPUT_AGE_MS = 250;

/** Applies client movement intents using server receive time and authoritative map collision. */
export class WorldAvatarController {
  private readonly avatars = new Map<string, GameAvatar>();
  private readonly sequences = new Map<string, number>();
  private readonly receivedAt = new Map<string, number>();
  private readonly collision: CollisionSystem;

  constructor(avatars: readonly GameAvatar[], map: GameTileMap, fixtures: readonly StoreFixture[]) {
    for (const avatar of avatars) {
      if (this.avatars.has(avatar.accountId)) throw new Error('Duplicate avatar account');
      this.avatars.set(avatar.accountId, { ...avatar, position: { ...avatar.position } });
      this.sequences.set(avatar.accountId, -1);
    }
    this.collision = new CollisionSystem(map, [...fixtures]);
  }

  /** Adds an avatar for a member who joined after this controller was created. */
  addAvatar(avatar: GameAvatar): void {
    if (this.avatars.has(avatar.accountId)) return;
    this.avatars.set(avatar.accountId, { ...avatar, position: { ...avatar.position } });
    this.sequences.set(avatar.accountId, -1);
  }

  applyInput(intent: GameInputIntent, serverReceivedAtMs: number): GameAvatar | null {
    const current = this.avatars.get(intent.accountId);
    if (!current || !Number.isSafeInteger(intent.sequence) || intent.sequence < 0 ||
        intent.sequence <= (this.sequences.get(intent.accountId) ?? -1) ||
        !Number.isFinite(serverReceivedAtMs) || !Number.isFinite(intent.direction.x) ||
        !Number.isFinite(intent.direction.y)) return null;
    const magnitude = Math.hypot(intent.direction.x, intent.direction.y);
    if (magnitude > 1.001) return null;
    const previousAt = this.receivedAt.get(intent.accountId);
    if (previousAt !== undefined && (serverReceivedAtMs <= previousAt || serverReceivedAtMs - previousAt > MAX_INPUT_AGE_MS)) return null;
    const deltaSeconds = previousAt === undefined ? 1 / 60 :
      Math.min((serverReceivedAtMs - previousAt) / 1000, MAX_INPUT_DELTA_SECONDS);
    const nextPosition = magnitude < 0.001 ? current.position : this.collision.resolveMovement(
      current.position,
      { x: intent.direction.x * PLAYER_SPEED, y: intent.direction.y * PLAYER_SPEED },
      deltaSeconds,
    );
    const next: GameAvatar = {
      ...current,
      position: nextPosition,
      direction: directionFromIntent(intent.direction, current.direction),
      updatedAt: new Date(serverReceivedAtMs).toISOString(),
    };
    this.avatars.set(intent.accountId, next);
    this.sequences.set(intent.accountId, intent.sequence);
    this.receivedAt.set(intent.accountId, serverReceivedAtMs);
    return { ...next, position: { ...next.position } };
  }

  getAvatar(accountId: string): GameAvatar | null {
    const avatar = this.avatars.get(accountId);
    return avatar ? { ...avatar, position: { ...avatar.position } } : null;
  }

  isWithinInteractionRange(accountId: string, fixture: StoreFixture, maxDistance = 56): boolean {
    const avatar = this.avatars.get(accountId);
    if (!avatar || !Number.isFinite(maxDistance) || maxDistance < 0) return false;
    const left = fixture.tileX * 32;
    const top = fixture.tileY * 32;
    const dimensions = getFixtureDimensions(fixture);
    const right = left + dimensions.widthTiles * 32;
    const bottom = top + dimensions.heightTiles * 32;
    const dx = Math.max(left - avatar.position.x, 0, avatar.position.x - right);
    const dy = Math.max(top - avatar.position.y, 0, avatar.position.y - bottom);
    return dx * dx + dy * dy <= maxDistance * maxDistance;
  }

  updateMap(map: GameTileMap, fixtures: readonly StoreFixture[]): void {
    this.collision.updateTileMap(map);
    this.collision.updateFixtures([...fixtures]);
  }
}

function directionFromIntent(vector: Vector2D, fallback: Direction): Direction {
  if (Math.abs(vector.x) < 0.1 && Math.abs(vector.y) < 0.1) return fallback;
  return Math.abs(vector.x) > Math.abs(vector.y)
    ? vector.x > 0 ? 'right' : 'left'
    : vector.y > 0 ? 'down' : 'up';
}
