import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GĐ678 — test HÀNH VI của service worker (public/sw.js): nạp mã nguồn SW vào một sandbox
 * (self/caches/fetch giả) rồi gọi đúng handler `fetch` như trình duyệt làm, kiểm tra:
 *  - /assets/* (hash): cache-first — có bản cache thì trả bản cache.
 *  - File không-hash (glb): network-first — online luôn lấy bản MỚI (fix stale model cũ),
 *    offline mới fallback cache.
 *  - /api: không dính cache, không respondWith.
 * swStrategy.test.ts khoá chiến lược bằng soi mã; test này chạy THẬT logic fetch.
 */

const src = readFileSync(join(__dirname, '..', '..', 'public', 'sw.js'), 'utf8');

type Store = Map<string, Response>;

function loadSW(store: Store) {
  const listeners: Record<string, (ev: unknown) => void> = {};
  const selfObj = {
    addEventListener: (name: string, fn: (ev: unknown) => void) => { listeners[name] = fn; },
    location: { origin: 'http://game.test' },
  };
  const cachesObj = {
    match: async (req: Request) => {
      const hit = store.get(req.url);
      return hit ? hit.clone() : undefined;
    },
    open: async () => ({
      put: async (req: Request, res: Response) => { store.set(req.url, res.clone()); },
    }),
    keys: async () => ['static-tap-hoa-3d-v2', `runtime-tap-hoa-3d-v2`],
    delete: async () => true,
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('self', 'caches', src) as (s: unknown, c: unknown) => void;
  factory(selfObj, cachesObj);
  return listeners['fetch'] as (ev: unknown) => void;
}

function fakeEvent(request: Request) {
  let responded: Promise<Response> | undefined;
  return {
    request,
    respondWith: (p: Promise<Response>) => { responded = p; },
    get result() { return responded; },
  };
}

describe('service worker: hành vi fetch (GĐ678)', () => {
  let store: Store;
  let handler: (ev: unknown) => void;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('NEW')));
    handler = loadSW(store);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('/assets/* (hash): cache-first — có bản cache thì dùng bản cache dù mạng có bản mới', async () => {
    store.set('http://game.test/assets/index-abc.js', new Response('OLD'));
    const ev = fakeEvent(new Request('http://game.test/assets/index-abc.js'));
    handler(ev);
    const res = await ev.result!;
    expect(await res.text()).toBe('OLD');
  });

  it('/assets/* chưa có cache: lấy từ mạng và lưu vào cache', async () => {
    const ev = fakeEvent(new Request('http://game.test/assets/index-def.js'));
    handler(ev);
    const res = await ev.result!;
    expect(await res.text()).toBe('NEW');
    expect(store.has('http://game.test/assets/index-def.js')).toBe(true);
  });

  it('GLB không-hash (fix GĐ678): online luôn lấy bản MỚI, không dùng bản cache cũ', async () => {
    store.set('http://game.test/models/kit/kit.glb', new Response('OLD'));
    const ev = fakeEvent(new Request('http://game.test/models/kit/kit.glb'));
    handler(ev);
    const res = await ev.result!;
    expect(await res.text()).toBe('NEW');
  });

  it('GLB khi mất mạng: fallback về bản đã cache (offline vẫn chơi được)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    store.set('http://game.test/models/kit/kit.glb', new Response('OLD'));
    const ev = fakeEvent(new Request('http://game.test/models/kit/kit.glb'));
    handler(ev);
    const res = await ev.result!;
    expect(await res.text()).toBe('OLD');
  });

  it('/api không dính SW: không respondWith (đi thẳng mạng)', () => {
    const ev = fakeEvent(new Request('http://game.test/api/health'));
    handler(ev);
    expect(ev.result).toBeUndefined();
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });
});
