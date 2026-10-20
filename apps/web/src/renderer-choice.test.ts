import assert from 'node:assert/strict';
import { chooseRenderer, detectWebGL, initializeWithFallback, parseRendererPref, readStoredRenderer, resolveRendererPreference, saveRendererPreference } from './renderer-choice';

// Mặc định (không tham số, chưa lưu) là 3D.
assert.equal(resolveRendererPreference('', null), '3d');
assert.equal(resolveRendererPreference('?qa', null), '3d');
// ?r=2d hoặc localStorage 2d dùng Pixi; URL thắng localStorage.
assert.equal(resolveRendererPreference('?r=2d', null), 'pixi');
assert.equal(resolveRendererPreference('', '2d'), 'pixi');
assert.equal(resolveRendererPreference('', 'pixi'), 'pixi');
assert.equal(resolveRendererPreference('?r=3d', '2d'), '3d');
assert.equal(resolveRendererPreference('?r=2d', '3d'), 'pixi');
// Giá trị lạ không có ý kiến.
assert.equal(parseRendererPref('xyz'), null);
assert.equal(resolveRendererPreference('?r=xyz', '2d'), 'pixi');
assert.equal(resolveRendererPreference('?r=xyz', 'abc'), '3d');

// Không có WebGL: 3D quay về 2D, 2D giữ nguyên.
assert.equal(chooseRenderer('3d', false), 'pixi');
assert.equal(chooseRenderer('3d', true), '3d');
assert.equal(chooseRenderer('pixi', false), 'pixi');
assert.equal(detectWebGL(() => ({ getContext: () => null })), false);
assert.equal(detectWebGL(() => ({ getContext: (id: string) => (id === 'webgl' ? {} : null) })), true);
assert.equal(detectWebGL(() => { throw new Error('no canvas'); }), false);

// Lưu / đọc lựa chọn, kể cả khi storage ném lỗi.
{
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  saveRendererPreference(storage, 'pixi');
  assert.equal(data.get('renderer'), '2d');
  assert.equal(resolveRendererPreference('', readStoredRenderer(storage)), 'pixi');
  saveRendererPreference(storage, '3d');
  assert.equal(data.get('renderer'), '3d');
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(readStoredRenderer(broken), null);
  saveRendererPreference(broken, '3d');
  assert.equal(readStoredRenderer(null), null);
}

// Dự phòng khi khởi tạo 3D lỗi.
await (async () => {
  const log: string[] = [];
  const make = (kind: string, failInit: boolean) => ({
    kind,
    async initialize() { log.push(`init:${kind}`); if (failInit) throw new Error('babylon boom'); },
    destroy() { log.push(`destroy:${kind}`); },
  });
  const warnings: string[] = [];
  const created: string[] = [];
  const result = await initializeWithFallback('3d', async (k) => make(k, k === '3d'), (_v, k) => created.push(k), (m) => warnings.push(m));
  assert.equal(result.kind, 'pixi');
  assert.deepEqual(log, ['init:3d', 'destroy:3d', 'init:pixi']);
  assert.deepEqual(created, ['3d', 'pixi']);
  assert.equal(warnings.length, 1);

  const ok = await initializeWithFallback('3d', async (k) => make(k, false), undefined, (m) => warnings.push(m));
  assert.equal(ok.kind, '3d');
  assert.equal(warnings.length, 1);

  // 2D lỗi thì không có gì để quay về: ném lỗi ra.
  await assert.rejects(initializeWithFallback('pixi', async (k) => make(k, true)), /babylon boom/);

  // Hủy bản 3D lỗi mà destroy cũng ném lỗi thì vẫn dựng được 2D.
  const flaky = await initializeWithFallback('3d', async (k) => (k === '3d' ? { async initialize() { throw new Error('x'); }, destroy() { throw new Error('y'); } } : make(k, false)), undefined, () => {});
  assert.equal(flaky.kind, 'pixi');
})();

console.log('PASS renderer-choice: mặc định 3D, ?r=2d, localStorage, không WebGL, dự phòng khi 3D lỗi');
