import assert from 'node:assert/strict';
import { INITIAL_FIXTURES, MAP_WIDTH, generateStarterTileMap } from '@game/data';
import { CollisionSystem } from './collision';

/** Người chơi (hộp 14x8) phải đi dọc vỉa hè (hàng 11-12) từ mép tây sang mép đông mà không phải xuống lòng đường. */
export function runSidewalkPassableTests(): void {
  const map = generateStarterTileMap();
  const collision = new CollisionSystem(map, INITIAL_FIXTURES);
  const free = (tx: number, ty: number) => !collision.isColliding({ x: tx * 32 + 9, y: ty * 32 + 12, width: 14, height: 8 });
  const rows = [11, 12];
  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[1, 12]];
  seen.add('1,12');
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!rows.includes(ny) || nx < 0 || nx >= MAP_WIDTH || seen.has(`${nx},${ny}`) || !free(nx, ny)) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  // Từ x=1 phải tới được ô vỉa hè cuối cùng còn đi được ở phía đông (không bị cột đèn/cây bịt kín giữa chừng).
  const lastFreeX = Math.max(...rows.flatMap((ty) => Array.from({ length: MAP_WIDTH }, (_, tx) => tx).filter((tx) => free(tx, ty))));
  assert(seen.has(`${lastFreeX},11`) || seen.has(`${lastFreeX},12`), `Vỉa hè bị bịt kín: không đi dọc tới x=${lastFreeX}`);
  console.log('✔ Vỉa hè đi thông từ tây sang đông');
}
