import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GĐ678 — chiến lược cache của service worker (public/sw.js).
 *
 * Vì sao khoá: trước GĐ678 MỌI file tĩnh đều cache-first, kể cả /models/kit/*.glb và /decoders
 * (tên file KHÔNG hash) → sau khi cập nhật tài sản 3D (cùng tên file), người chơi đã ghé vẫn
 * thấy model cũ mãi — tài sản mới không bao giờ tới tay. Luôn đúng:
 *  1. /assets/* (hash do Vite sinh) → cache-first.
 *  2. File tĩnh không-hash (glb/wasm/icons/manifest) → network-first, offline fallback cache.
 *  3. /api, /ws → không cache.
 * sw.js chạy trong worker nên không import được vào test — khoá bằng soi mã nguồn.
 */

const sw = readFileSync(join(__dirname, '..', '..', 'public', 'sw.js'), 'utf8');

describe('service worker: chiến lược cache (GĐ678)', () => {
  it('/assets/* (hash) là cache-first; glb KHÔNG nằm trong nhánh cache-first đó', () => {
    const assetsBranch = sw.slice(sw.indexOf("url.pathname.startsWith('/assets/')"), sw.indexOf('// File tĩnh KHÔNG hash'));
    expect(assetsBranch).toContain('caches.match(request)');
    expect(assetsBranch).toContain('cached || fetched');
    // DÒNG ĐIỀU KIỆN của nhánh /assets không được nuốt glb (glb không-hash phải đi network-first)
    const condLine = sw.split('\n').find((l) => l.includes("startsWith('/assets/')"));
    expect(condLine).toBeTruthy();
    expect(condLine, 'glb (không hash) lọt vào cache-first → người chơi cũ mãi thấy model cũ').not.toMatch(/glb/);
  });

  it('file tĩnh không-hash (glb/wasm/manifest) là network-first với fallback cache', () => {
    const netFirstBranch = sw.slice(sw.indexOf('// File tĩnh KHÔNG hash'), sw.indexOf('// Mọi thứ khác'));
    expect(netFirstBranch).toMatch(/glb|wasm/);
    expect(netFirstBranch.indexOf('fetch(request)')).toBeGreaterThan(-1);
    expect(netFirstBranch).toContain('caches.match(request)');
    // fetch đứng TRƯỚC caches.match trong nhánh network-first
    expect(netFirstBranch.indexOf('fetch(request)')).toBeLessThan(netFirstBranch.lastIndexOf('caches.match(request)'));
  });

  it('API thời gian thực không cache; HTML network-first', () => {
    expect(sw).toContain("['/api', '/ws']");
    const navBranch = sw.slice(sw.indexOf("request.mode === 'navigate'"), sw.indexOf("url.pathname.startsWith('/assets/')"));
    expect(navBranch).toContain('fetch(request)');
  });

  it('VERSION được nâng so với chiến lược cũ (activate dọn cache runtime-v1)', () => {
    expect(sw).toMatch(/VERSION = 'tap-hoa-3d-v2'/);
    expect(sw).toContain('`runtime-${VERSION}`');
  });
});
