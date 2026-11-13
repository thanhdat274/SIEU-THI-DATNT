import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GĐ708 — khoá cấu trúc "nạp lười thế giới 3D" (GĐ704): tải ban đầu chỉ là vỏ UI
 * (boot.tsx + màn đăng nhập), three.js + dựng cảnh nằm trong main.tsx nạp động sau login.
 * Trân 597 KB đã chạm trần một lần (GĐ515) — ai vô tình kéo three/render vào vỏ sẽ phình lại
 * tải ban đầu; test này bắt ở mức cấu trúc trước khi tới lượt scripts/check-bundle.mjs.
 */

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Duyệt đệ quy .ts/.tsx trong một thư mục, bỏ __tests__ và dev/. */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${e}`;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) { if (e !== '__tests__' && e !== 'dev') walk(rel, out); }
    else if (/\.(ts|tsx)$/.test(e)) out.push(rel);
  }
  return out;
}

describe('khoá cấu trúc nạp lười thế giới 3D (GĐ704/GĐ708)', () => {
  it('index.html trỏ entry vào boot.tsx (vỏ UI), không phải main.tsx', () => {
    expect(read('index.html')).toContain('src="/src/boot.tsx"');
    expect(read('index.html')).not.toContain('/src/main.tsx');
  });

  it('boot.tsx nạp thế giới bằng import("./main") động, không import three/render trực tiếp', () => {
    const boot = read('src/boot.tsx');
    expect(boot).toContain("import('./main')");
    expect(boot).not.toMatch(/from 'three'/);
    // vỏ chỉ là UI: mọi import tĩnh phải nằm trong danh sách cho phép (three/render chỉ vào qua main)
    for (const m of boot.matchAll(/from '([^']+)'/g)) {
      expect(['react', 'react-dom/client', './core/applySettings', './core/currency', './core/save', './core/tabLock', './core/store', './net/firebase', './net/session', './ui/ConfirmDialog', './ui/Hud', './ui/LoginScreen', './ui/PerfOverlay', './ui/TabLockScreen'])
        .toContain(m[1]);
    }
  });

  it('main.tsx (thế giới) không gắn React root — UI chỉ do boot.tsx dựng', () => {
    expect(read('src/main.tsx')).not.toContain('createRoot');
    expect(read('src/main.tsx')).not.toContain('LoginScreen');
  });

  it('toàn bộ src/ui vẫn ba-free (màn đăng nhập nhẹ là lý do tách boot)', () => {
    for (const f of walk('src/ui')) {
      expect(read(f).replace(/\/\/.*$/gm, '').replace(/import\s+type[^\n]*;/g, '')).not.toMatch(/from 'three'/);
    }
  });
});
