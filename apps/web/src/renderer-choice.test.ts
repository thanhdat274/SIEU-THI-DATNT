import assert from 'node:assert/strict';
import { chooseRenderer, clearStoredRenderer, detectWebGL, initializeWithFallback, parseRendererPref, readStoredRenderer, resolveRendererPreference } from './renderer-choice';

// Mặc định (không tham số) là 3D.
assert.equal(resolveRendererPreference('', null), '3d');
assert.equal(resolveRendererPreference('?qa', null), '3d');

// ?r=2d dùng Pixi; ?r=3d dùng 3D.
assert.equal(resolveRendererPreference('?r=2d', null), 'pixi');
assert.equal(resolveRendererPreference('?r=3d', null), '3d');

// localStorage '2d' bị bỏ qua hoàn toàn: vẫn ra 3D (trừ khi có ?r=2d trên URL).
assert.equal(resolveRendererPreference('', '2d'), '3d');
assert.equal(resolveRendererPreference('', 'pixi'), '3d');
assert.equal(resolveRendererPreference('?r=3d', '2d'), '3d');
assert.equal(resolveRendererPreference('?r=2d', '3d'), 'pixi');
assert.equal(resolveRendererPreference('?r=2d', '2d'), 'pixi');

// Giá trị lạ không có ý kiến → mặc định 3D.
assert.equal(parseRendererPref('xyz'), null);
assert.equal(resolveRendererPreference('?r=xyz', '2d'), '3d');
assert.equal(resolveRendererPreference('?r=xyz', 'abc'), '3d');

// Không có WebGL: 3D quay về 2D, 2D giữ nguyên.
assert.equal(chooseRenderer('3d', false), 'pixi');
assert.equal(chooseRenderer('3d', true), '3d');
assert.equal(chooseRenderer('pixi', false), 'pixi');
assert.equal(detectWebGL(() => ({ getContext: () => null })), false);
assert.equal(detectWebGL(() => ({ getContext: (id: string) => (id === 'webgl' ? {} : null) })), true);
assert.equal(detectWebGL(() => { throw new Error('no canvas'); }), false);

// Xóa khóa lưu trữ khi khởi động (clearStoredRenderer)
{
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  };
  storage.setItem('renderer', '2d');
  assert.equal(storage.getItem('renderer'), '2d');
  clearStoredRenderer(storage);
  assert.equal(storage.getItem('renderer'), null, 'clearStoredRenderer xóa khóa renderer');
  assert.equal(resolveRendererPreference('', readStoredRenderer(storage)), '3d');

  const broken = { removeItem: () => { throw new Error('blocked'); } };
  clearStoredRenderer(broken); // Không throw khi lỗi
  clearStoredRenderer(null);
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
