import assert from 'node:assert/strict';
import { INITIAL_FIXTURES, NEIGHBORHOOD_LOTS, NEIGHBORHOOD_PROPS, NEIGHBORHOOD_WALK_BOUNDS, PARK, SCHOOL, STREET_TREE_Y_TILES, NEIGHBORHOOD_SOUTH_TREE_X, generateStarterTileMap, hitsNeighborhood, lotHeightPx } from '@game/data';
import { CollisionSystem } from './collision';

const T = 32;

/** Người chơi đi tự do trong cả khu phố; khách/nhân viên (`isColliding`) vẫn bị giữ trong bản đồ ô. */
export function runNeighborhoodWalkTests(): void {
  console.log('\n--- Người chơi đi khắp khu phố ---');
  const collision = new CollisionSystem(generateStarterTileMap(), INITIAL_FIXTURES);
  const feet = (x: number, y: number) => ({ x: x - 7, y: y - 8, width: 14, height: 8 });
  const free = (x: number, y: number) => !collision.isCollidingPlayer(feet(x, y));

  // Phân biệt hai loại va chạm: viền bản đồ ô chặn khách nhưng không chặn người chơi.
  assert.ok(collision.isColliding({ x: -10, y: 10, width: 20, height: 20 }), 'Khách vẫn không ra ngoài bản đồ ô');
  assert.ok(free(-40, 12.5 * T), 'Người chơi đứng được ngoài rìa tây của bản đồ ô (vỉa hè)');
  assert.ok(free(0.5 * T, 12.5 * T), 'Ô viền không có tường thì người chơi bước qua được');
  assert.ok(collision.isCollidingPlayer({ x: 6 * T + 5, y: 3 * T + 5, width: 20, height: 20 }), 'Tường tiệm vẫn chặn người chơi');
  assert.ok(!collision.isCollidingPlayer({ x: 9 * T + 5, y: 8 * T + 5, width: 14, height: 10 }), 'Sàn tiệm vẫn đi lại bình thường');

  // Vật cản khu phố.
  const lot = NEIGHBORHOOD_LOTS.find((l) => l.kind === 'house')!;
  assert.ok(!free((lot.x + lot.w / 2) * T, lot.frontY * T - 40), 'Không đi xuyên nhà dân');
  {
    // Đợt khai hoang gỡ nhà trang trí (land-reclamation 1.3): nhà phố s2 trong vùng W4 hết chặn, nhà ngoài vùng vẫn chặn.
    const inW4 = NEIGHBORHOOD_LOTS.find((l) => l.frontY === 24 && l.x >= 42 && l.x + l.w - 1 <= 76)!;
    const px = (inW4.x + inW4.w / 2) * T, py = inW4.frontY * T - 40;
    assert.ok(!free(px, py), 'Trước khi mở W4 nhà phố còn chặn');
    collision.setOpenedWaves(['w0', 'w4']);
    assert.ok(free(px, py), 'Mở W4 → nhà phố trong vùng không còn chặn');
    assert.ok(!free((lot.x + lot.w / 2) * T, lot.frontY * T - 40), 'Nhà dân ngoài vùng đợt vẫn chặn');
    collision.setOpenedWaves(['w0']);
    assert.ok(!free(px, py), 'Về lại chỉ W0 → nhà chặn lại');
  }
  assert.ok(lotHeightPx(lot) > 60, 'Chiều cao nhà tính từ số tầng');
  assert.ok(!free(SCHOOL.building.x * T + 100, SCHOOL.building.frontY * T - 40), 'Không đi xuyên tòa nhà trường');
  assert.ok(!free(((PARK.pond.x0 + PARK.pond.x1) / 2) * T, ((PARK.pond.y0 + PARK.pond.y1) / 2) * T), 'Không đi xuống ao');
  const treeX = NEIGHBORHOOD_SOUTH_TREE_X[0];
  assert.ok(!free(treeX * T, STREET_TREE_Y_TILES * T - 2), 'Không đi xuyên gốc cây vỉa hè');
  assert.ok(hitsNeighborhood({ x: NEIGHBORHOOD_WALK_BOUNDS.x0 - 50, y: 12 * T, width: 14, height: 8 }), 'Ra ngoài rìa khu phố bị chặn');

  // Đồ vật rải trong khu phố đều chặn người chơi (cùng danh sách renderer vẽ).
  const solids = NEIGHBORHOOD_PROPS.filter((p) => p.solid);
  for (const kind of ['nb_bench', 'nb_bush_', 'nb_bin', 'nb_hedge', 'nb_flowerbed_', 'nb_playground', 'nb_pavilion', 'nb_bus_stop', 'nb_tree_round_', 'vehicle_motorbike_parked_', 'vehicle_car_v']) {
    assert.ok(solids.some((p) => p.key.startsWith(kind)), `Có đồ vật ${kind} chặn người chơi`);
  }
  assert.ok(solids.some((p) => p.key === ''), 'Cột chòi nghỉ có va chạm');
  for (const p of solids) {
    const s = p.solid!;
    assert.ok(!free(s.x + s.width / 2, s.y + s.height), `Đồ vật ${p.key || 'cột chòi'} tại (${Math.round(p.x)}, ${Math.round(p.y)}) chặn người chơi`);
  }

  // Đi bộ thực: từ cửa tiệm tới các điểm chính (BFS trên lưới 16 px bằng đúng hộp va chạm người chơi).
  const step = 16;
  const key = (x: number, y: number) => `${x},${y}`;
  const start = { x: 9.5 * T, y: 12.5 * T };
  const seen = new Set<string>([key(start.x, start.y)]);
  const queue = [start];
  while (queue.length) {
    const p = queue.pop()!;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = p.x + dx, ny = p.y + dy;
      if (seen.has(key(nx, ny)) || !free(nx, ny)) continue;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny });
    }
  }
  const reach = (x: number, y: number, name: string) => {
    const gx = Math.round((x - start.x) / step) * step + start.x, gy = Math.round((y - start.y) / step) * step + start.y;
    assert.ok([[0, 0], [step, 0], [-step, 0], [0, step], [0, -step]].some(([dx, dy]) => seen.has(key(gx + dx, gy + dy))), `Đi tới được ${name}`);
  };
  reach((PARK.gateSouth.x + 0.5) * T, (PARK.gateSouth.y - 2) * T, 'trong công viên (qua cổng nam)');
  reach(((SCHOOL.gate.x + SCHOOL.gate.w / 2)) * T, (SCHOOL.gate.y - 2) * T, 'sân trường (qua cổng trường)');
  reach(47 * T, 4 * T, 'bãi xe chung cư');
  reach(-5.5 * T, -10 * T, 'dọc đường dọc phía tây');
  reach(39.5 * T, 38 * T, 'đường dọc phía đông, xa về phía nam');
  reach(60 * T, 40 * T, 'vỉa hè phía nam, xa về phía đông');
  console.log('  ✓ Passed: Người chơi đi khắp khu phố, vật cản/biên hoạt động, khách vẫn bị giữ trong bản đồ ô');
}
