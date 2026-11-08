import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GĐ1831 — khoá cấu trúc "ConfirmHost ở gốc ứng dụng" (review đợt 2 R14 + đợt 4 R7):
 * `<ConfirmHost/>` từng chỉ gắn trong HUD nên hộp xác nhận gọi từ màn đăng nhập
 * (nút "Rời hẻm" ở AlleyPanel) câm lặng — promise chờ tới khi vào game mới bật giữa
 * màn chơi. Dời về boot.tsx (gốc ứng dụng) để hộp hiện ở mọi màn hình.
 */

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('ConfirmHost gắn ở gốc ứng dụng (GĐ1831)', () => {
  it('boot.tsx gắn <ConfirmHost /> cạnh <App /> (hiện được cả ở màn đăng nhập)', () => {
    const boot = read('src/boot.tsx');
    expect(boot).toContain("<><App /><ConfirmHost /></>");
  });

  it('Hud.tsx không còn gắn ConfirmHost riêng (một host duy nhất, tránh hai hộp cùng listen)', () => {
    expect(read('src/ui/Hud.tsx')).not.toMatch(/<ConfirmHost\s*\/>/);
  });
});
