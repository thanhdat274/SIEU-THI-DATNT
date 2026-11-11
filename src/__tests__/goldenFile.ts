import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

/**
 * Mốc cân bằng nằm trong golden.json (SPEC-TOI-UU §T4) để chép lại bằng MỘT lệnh:
 *   npm run golden:update -- "<lý do đổi kinh tế>"
 * Lệnh đó chạy simGolden + simBands với GOLDEN_UPDATE=1 (test GHI mốc mới thay vì so), rồi ghi
 * bảng "cũ → mới → lệch %" kèm lý do vào docs/GOLDEN-LOG.md. Không sửa tay file JSON.
 */
export interface Snap { money: number; level: number; xp: number; profit: number[]; quest: number[] }
export interface GoldenFile { golden30: Snap; bands: Record<string, Snap> }

const FILE = fileURLToPath(new URL('./golden.json', import.meta.url));
export const UPDATING = process.env.GOLDEN_UPDATE === '1';

export const readGolden = (): GoldenFile => JSON.parse(readFileSync(FILE, 'utf8')) as GoldenFile;
export const writeGolden = (edit: (g: GoldenFile) => void): void => {
  const g = readGolden();
  edit(g);
  writeFileSync(FILE, `${JSON.stringify(g, null, 2)}\n`);
};

/** |thực tế − mốc| ≤ max(|mốc| × tol, sàn) — sàn để số gần 0 không đỏ vì vài nghìn đồng. */
export const near = (actual: number, golden: number, tol: number, floor: number, what: string) => {
  const band = Math.max(Math.abs(golden) * tol, floor);
  expect(Math.abs(actual - golden), `${what}: thực tế ${actual} so mốc ${golden} (±${Math.round(band)})`).toBeLessThanOrEqual(band);
};

/** Canvas/document giả để world 3D chạy headless (pattern economySim.test.ts). */
export function installHeadless(): void {
  const stub2d = (): unknown => new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop: () => {} });
      return () => {};
    },
    set: () => true,
  });
  globalThis.document = {
    createElement: (tag: string) => (tag === 'canvas'
      ? { width: 0, height: 0, style: {}, getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {} }
      : {}) as unknown as HTMLElement,
    createElementNS: () => ({} as Element),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  } as unknown as Document;
  (globalThis as { window?: unknown }).window = {
    addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: (f: FrameRequestCallback) => f(0), devicePixelRatio: 1,
  };
}
