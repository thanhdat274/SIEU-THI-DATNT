import { GameTileMap, TILE_SIZE, Vector2D } from '@game/shared';
import { CollisionSystem } from './collision';

export interface GridPoint { x: number; y: number }

/** A* over the same collision geometry used by the player. */
export function findPath(map: GameTileMap, collision: CollisionSystem, start: GridPoint, goal: GridPoint): GridPoint[] {
  const key = (point: GridPoint) => `${point.x},${point.y}`;
  const distance = (point: GridPoint) => Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y);
  const passable = (point: GridPoint) => {
    const localY=point.y-(map.originTileY??0);
    if (point.x < 0 || localY < 0 || point.x >= map.width || localY >= map.height) return false;
    const center = tileCenter(point);
    return !collision.isColliding({ x: center.x - 10, y: center.y - 4, width: 20, height: 14 });
  };
  if (!passable(start) || !passable(goal)) return [];

  const open: GridPoint[] = [start];
  const cameFrom = new Map<string, GridPoint>();
  const costs = new Map<string, number>([[key(start), 0]]);
  const visited = new Set<string>();
  while (open.length) {
    open.sort((a, b) => (costs.get(key(a))! + distance(a)) - (costs.get(key(b))! + distance(b)));
    const current = open.shift()!;
    const currentKey = key(current);
    if (currentKey === key(goal)) {
      const path = [current];
      while (cameFrom.has(key(path[0]))) path.unshift(cameFrom.get(key(path[0]))!);
      return path;
    }
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    for (const next of [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ]) {
      const nextKey = key(next);
      if (!passable(next) || visited.has(nextKey)) continue;
      const cost = costs.get(currentKey)! + 1;
      if (cost < (costs.get(nextKey) ?? Infinity)) {
        costs.set(nextKey, cost);
        cameFrom.set(nextKey, current);
        if (!open.some((point) => key(point) === nextKey)) open.push(next);
      }
    }
  }
  return [];
}

export function tileCenter(point: GridPoint): Vector2D {
  return { x: (point.x + 0.5) * TILE_SIZE, y: (point.y + 0.5) * TILE_SIZE };
}
