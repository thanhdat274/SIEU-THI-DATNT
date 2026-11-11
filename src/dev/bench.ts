import { useGame } from '../core/store';
import { furnitureDef } from '../data/furniture';
import { unlockedProducts } from '../data/products';
import { emptyTiers } from '../core/stock';
import { seedLevel } from './simEconomy';
import { setPerf, usePerf, type PerfSnapshot } from '../core/perf';
import type { Furniture } from '../core/store';
import type { CameraController } from '../render/cameraController';
import type { Weather } from '../data/weather';

/**
 * SPEC-TOI-UU §T2-L2 — `game.bench(n)`: 4 cảnh cố định để đo FPS lặp lại được giữa các máy/phiên bản.
 * Chỉ nạp khi gọi (import động từ main.tsx) nên không tốn dung lượng tải ban đầu.
 * Mỗi cảnh: dựng store sạch → xếp kệ/đặt camera → đọc 30 mẫu `usePerf` (1 mẫu/giây) → lấy trung vị.
 * GHI CHÚ: đây là công cụ ĐO; không đổi công thức kinh tế. Kết quả ghi vào docs/PERF.md.
 */

export interface BenchScene {
  id: 'B1' | 'B2' | 'B3' | 'B4';
  name: string;
  level: number;
  shelves: number;
  minutes: number;
  weather: Weather;
  extras?: 'decor' | 'alley';
  yaw: number;
  distance: number;
}

export const BENCH_SCENES: BenchScene[] = [
  { id: 'B1', name: 'Tiệm cấp 10, 6 kệ, 9:00', level: 10, shelves: 6, minutes: 9 * 60, weather: 'sunny', yaw: Math.PI / 4, distance: 22 },
  { id: 'B2', name: 'Mini mart cấp 30, kệ đầy, giờ cao điểm', level: 30, shelves: 12, minutes: 17 * 60, weather: 'cloudy', yaw: Math.PI / 4, distance: 26 },
  { id: 'B3', name: 'Đại siêu thị cấp 75, kệ đầy + trang trí', level: 75, shelves: 12, minutes: 17 * 60, weather: 'sunny', extras: 'decor', yaw: Math.PI / 5, distance: 34 },
  { id: 'B4', name: 'Hẻm ban đêm mưa, camera ngoài nhìn vào tiệm', level: 30, shelves: 12, minutes: 21 * 60, weather: 'rain', extras: 'alley', yaw: Math.PI / 2, distance: 40 },
];

export interface BenchRow {
  scene: BenchScene['id'];
  name: string;
  samples: number;
  fps: number;
  p95Ms: number;
  drawCalls: number;
  triangles: number;
  npc: number;
  jsMemory: number;
  hudRedraws: number;
  gfx: string;
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Kệ đầy mặt hàng hợp ngành, mỗi tầng một món (cùng cách `restock` của autoplay nhưng không cần vốn thật). */
function fillShelves(count: number) {
  const st = () => useGame.getState();
  const level = st().level;
  const unlocked = unlockedProducts(level);
  let k = 0;
  const furniture: Furniture[] = st().furniture.slice(0, count);
  useGame.setState({ money: 2_000_000_000 });
  for (const f of furniture) {
    const def = furnitureDef(f.type);
    const ok = unlocked.filter((p) => def.categories.includes(p.category));
    if (!ok.length) continue;
    f.tiers.forEach((_, i) => {
      const id = ok[k++ % ok.length].id;
      st().buy(id, Math.min(def.capacity * 2, 50));
      st().stockTier(f.uid, i, id);
    });
  }
}

/** Cây cảnh rải quanh để tải thêm mesh trang trí (B3). */
function addDecor() {
  const cur = useGame.getState().furniture;
  const base = cur.reduce((n, f) => Math.max(n, f.uid), 0);
  const plants: Furniture[] = Array.from({ length: 10 }, (_, i) => ({
    uid: base + i + 1,
    type: 'plant',
    x: -4 + (i % 5) * 2,
    z: 2 + Math.floor(i / 5) * 1.5,
    rot: 0,
    tiers: emptyTiers('plant'),
  }));
  useGame.setState({ furniture: [...cur, ...plants] });
}

export async function runBench(controller: CameraController, seconds = 30, only?: BenchScene['id'][]): Promise<BenchRow[]> {
  const wasOn = usePerf.getState().on;
  setPerf(true);
  const rows: BenchRow[] = [];
  for (const sc of BENCH_SCENES) {
    if (only && !only.includes(sc.id)) continue;
    seedLevel(sc.level);
    // seedLevel dựng sẵn ceil số kệ theo cấp; cắt/giữ theo cảnh.
    const cur = useGame.getState().furniture.slice(0, sc.shelves);
    useGame.setState({ furniture: cur, minutes: sc.minutes, weather: sc.weather, shopOpen: true, speed: 1 });
    fillShelves(sc.shelves);
    if (sc.extras === 'decor') addDecor();
    controller.follow = null;
    controller.yaw = sc.yaw;
    controller.distance = sc.distance;
    await wait(1500); // cho 3D dựng xong + bộ nhớ đệm khung ổn định
    const snaps: PerfSnapshot[] = [];
    for (let i = 0; i < seconds; i++) {
      await wait(1000);
      const s = usePerf.getState().snap;
      if (s) snaps.push(s);
    }
    rows.push({
      scene: sc.id,
      name: sc.name,
      samples: snaps.length,
      fps: Math.round(median(snaps.map((s) => s.fps))),
      p95Ms: +median(snaps.map((s) => s.frameMs.p95)).toFixed(1),
      drawCalls: median(snaps.map((s) => s.drawCalls)),
      triangles: median(snaps.map((s) => s.triangles)),
      npc: median(snaps.map((s) => s.npc)),
      jsMemory: +median(snaps.map((s) => s.jsMemory)).toFixed(0),
      hudRedraws: median(snaps.map((s) => s.hudRedraws)),
      gfx: snaps[snaps.length - 1]?.gfx ?? '?',
    });
  }
  setPerf(wasOn);
  // eslint-disable-next-line no-console
  console.log(`[bench] ${JSON.stringify(rows)}`);
  return rows;
}
