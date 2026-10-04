import { GameTileMap, TILE_SIZE, Vector2D } from '@game/shared';
import { CollisionSystem } from './collision';

export interface GridPoint { x: number; y: number }

/** A* over the same collision geometry used by the player. */
export function findPath(map: GameTileMap, collision: CollisionSystem, start: GridPoint, goal: GridPoint): GridPoint[] {
  return findPathToAny(map, collision, start, [goal]);
}

interface OpenNode { index: number; f: number; h: number; order: number }

/**
 * A* tới đích gần nhất trong `goals`: một lần tìm thay cho mỗi đích một lần A* riêng (khách/nhân viên đi tới kệ có tới ~12 ô đích).
 * Đường trả về bắt đầu bằng `start` và có độ dài ngắn nhất trong các đích tới được; không đích nào tới được thì trả [].
 * Hàng đợi ưu tiên dạng heap + khóa số + mỗi ô chỉ hỏi va chạm một lần, thay cho sắp xếp cả danh sách mở ở mỗi bước.
 */
export function findPathToAny(map: GameTileMap, collision: CollisionSystem, start: GridPoint, goals: readonly GridPoint[]): GridPoint[] {
  const { width, height } = map;
  const originY = map.originTileY ?? 0;
  const indexOf = (x: number, y: number) => (y - originY) * width + x;
  // 0 = chưa xét, 1 = đi được, 2 = bị chặn.
  const passCache = new Uint8Array(width * height);
  const passable = (x: number, y: number): boolean => {
    const localY = y - originY;
    if (x < 0 || localY < 0 || x >= width || localY >= height) return false;
    const i = localY * width + x;
    if (passCache[i] === 0) {
      const center = tileCenter({ x, y });
      passCache[i] = collision.isColliding({ x: center.x - 10, y: center.y - 4, width: 20, height: 14 }) ? 2 : 1;
    }
    return passCache[i] === 1;
  };
  if (!passable(start.x, start.y)) return [];
  const targets = goals.filter((goal) => passable(goal.x, goal.y));
  if (!targets.length) return [];
  const goalSet = new Set(targets.map((goal) => indexOf(goal.x, goal.y)));
  const heuristic = (x: number, y: number) => {
    let best = Infinity;
    for (const goal of targets) best = Math.min(best, Math.abs(x - goal.x) + Math.abs(y - goal.y));
    return best;
  };

  const cost = new Int32Array(width * height).fill(-1);
  const cameFrom = new Int32Array(width * height).fill(-1);
  const closed = new Uint8Array(width * height);
  const heap: OpenNode[] = [];
  let order = 0;
  // Cùng f thì ưu tiên ô gần đích hơn rồi tới ô vào trước: kết quả xác định, không phụ thuộc thứ tự ngẫu nhiên.
  const before = (a: OpenNode, b: OpenNode) => a.f !== b.f ? a.f < b.f : a.h !== b.h ? a.h < b.h : a.order < b.order;
  const push = (node: OpenNode) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      i = parent;
    }
  };
  const pop = (): OpenNode => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1, right = left + 1;
        let best = i;
        if (left < heap.length && before(heap[left], heap[best])) best = left;
        if (right < heap.length && before(heap[right], heap[best])) best = right;
        if (best === i) break;
        [heap[i], heap[best]] = [heap[best], heap[i]];
        i = best;
      }
    }
    return top;
  };

  const startIndex = indexOf(start.x, start.y);
  cost[startIndex] = 0;
  const startH = heuristic(start.x, start.y);
  push({ index: startIndex, f: startH, h: startH, order: order++ });
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  while (heap.length) {
    const current = pop();
    if (closed[current.index]) continue;
    closed[current.index] = 1;
    if (goalSet.has(current.index)) {
      const path: GridPoint[] = [];
      for (let i = current.index; i !== -1; i = cameFrom[i]) path.push({ x: i % width, y: Math.floor(i / width) + originY });
      return path.reverse();
    }
    const cx = current.index % width;
    const cy = Math.floor(current.index / width) + originY;
    const nextCost = cost[current.index] + 1;
    for (const [dx, dy] of steps) {
      const nx = cx + dx, ny = cy + dy;
      if (!passable(nx, ny)) continue;
      const next = indexOf(nx, ny);
      if (closed[next] || (cost[next] !== -1 && cost[next] <= nextCost)) continue;
      cost[next] = nextCost;
      cameFrom[next] = current.index;
      const h = heuristic(nx, ny);
      push({ index: next, f: nextCost + h, h, order: order++ });
    }
  }
  return [];
}

export function tileCenter(point: GridPoint): Vector2D {
  return { x: (point.x + 0.5) * TILE_SIZE, y: (point.y + 0.5) * TILE_SIZE };
}
