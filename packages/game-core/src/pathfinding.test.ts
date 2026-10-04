import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { CollisionSystem } from './collision';
import { InputManager } from './input';
import { findPath, findPathToAny, tileCenter, type GridPoint } from './pathfinding';
import { GameSimulation } from './simulation';

export function runPathfindingTests(): void {
  console.log('\n--- Tìm đường A* (heap) và nhiều đích một lần ---');
  const map = generateStarterTileMap();
  const sim = new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), map, new InputManager());
  const collision = new CollisionSystem(map, sim.getFixtures());
  const originY = map.originTileY ?? 0;
  const passable = (p: GridPoint) => {
    const c = tileCenter(p);
    return p.x >= 0 && p.x < map.width && p.y >= originY && p.y < originY + map.height
      && !collision.isColliding({ x: c.x - 10, y: c.y - 4, width: 20, height: 14 });
  };
  const validPath = (path: GridPoint[], start: GridPoint) => path.length > 0 && path[0].x === start.x && path[0].y === start.y
    && path.every(passable) && path.every((p, i) => i === 0 || Math.abs(p.x - path[i - 1].x) + Math.abs(p.y - path[i - 1].y) === 1);

  // BFS tham chiếu (chi phí đều): độ dài ngắn nhất thật để so với A*.
  const bfsLength = (start: GridPoint, goal: GridPoint): number => {
    if (!passable(start) || !passable(goal)) return -1;
    const seen = new Set([`${start.x},${start.y}`]);
    let frontier = [start];
    for (let depth = 1; frontier.length; depth++) {
      if (frontier.some((p) => p.x === goal.x && p.y === goal.y)) return depth;
      const next: GridPoint[] = [];
      for (const p of frontier) for (const q of [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }]) {
        const k = `${q.x},${q.y}`;
        if (!seen.has(k) && passable(q)) { seen.add(k); next.push(q); }
      }
      frontier = next;
    }
    return -1;
  };

  const tiles: GridPoint[] = [];
  for (let y = originY; y < originY + map.height; y++) for (let x = 0; x < map.width; x++) if (passable({ x, y })) tiles.push({ x, y });
  assert.ok(tiles.length > 100, 'Bản đồ khởi đầu có đủ ô đi được để thử');
  let checked = 0;
  for (let i = 0; i < tiles.length; i += 37) {
    const start = tiles[i], goal = tiles[(i * 7 + 11) % tiles.length];
    const path = findPath(map, collision, start, goal);
    const expected = bfsLength(start, goal);
    if (expected < 0) { assert.deepEqual(path, [], 'Không tới được thì trả mảng rỗng'); continue; }
    assert.ok(validPath(path, start), `Đường ${start.x},${start.y}→${goal.x},${goal.y} liền mạch, chỉ qua ô đi được`);
    assert.equal(path.length, expected, `Đường ${start.x},${start.y}→${goal.x},${goal.y} ngắn nhất`);
    assert.deepEqual(path[path.length - 1], goal, 'Kết thúc đúng ô đích');
    checked++;
  }
  assert.ok(checked > 10, 'Đã so đủ nhiều cặp điểm');

  // Nhiều đích: bằng đường ngắn nhất trong các lần A* riêng lẻ, bỏ qua đích bị chặn.
  const start = tiles[5];
  const goals = [tiles[40], tiles[120], { x: -3, y: 0 }, tiles[tiles.length - 3]];
  const best = Math.min(...goals.map((goal) => findPath(map, collision, start, goal).length).filter((n) => n > 0));
  const multi = findPathToAny(map, collision, start, goals);
  assert.ok(validPath(multi, start), 'Đường nhiều đích liền mạch');
  assert.equal(multi.length, best, 'Nhiều đích chọn đích gần nhất (cùng độ dài với cách cũ)');
  assert.ok(goals.some((goal) => goal.x === multi[multi.length - 1].x && goal.y === multi[multi.length - 1].y), 'Kết thúc ở một trong các đích');
  assert.deepEqual(findPathToAny(map, collision, start, [{ x: -3, y: 0 }]), [], 'Mọi đích ngoài bản đồ: rỗng');
  assert.deepEqual(findPathToAny(map, collision, start, []), [], 'Không có đích: rỗng');
  assert.deepEqual(findPathToAny(map, collision, start, [start]), [start], 'Đứng sẵn ở đích: chỉ có ô xuất phát');
  console.log(`  ✓ ${checked} cặp điểm khớp BFS, nhiều đích = đường ngắn nhất`);
}
