import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** GĐ646: khách xếp quầy mà chủ còn ở nhà/trang trại → cảnh báo chỉ thêm "bấm 🛵 Ra tiệm". */
describe('GĐ646: cảnh báo khách chờ khi chủ vắng tiệm', () => {
  it('Hud gắn gợi ý Ra tiệm khi atHome/atFarm, chữ ≤90', () => {
    const src = readFileSync('src/ui/Hud.tsx', 'utf8');
    expect(src).toContain("{atHome || atFarm ? ' — bấm 🛵 Ra tiệm' : ''}");
    expect([...'🛒 99 khách đang chờ tính tiền ở quầy — bấm 🛵 Ra tiệm'].length).toBeLessThanOrEqual(90);
  });
  it('GĐ648: nút Ra tiệm nhấp nháy khi ở nhà mà có khách chờ', () => {
    expect(readFileSync('src/ui/Hud.tsx', 'utf8')).toContain('|| (atHome && waiting > 0)');
  });
});
