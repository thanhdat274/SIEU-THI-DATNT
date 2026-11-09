import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { DIRT_PER_VISIT } from '../data/staff';

/**
 * GĐ1839 (review đợt 4 R3) — reset khi khách còn trong tiệm: khung render sau reset khách cũ
 * rời cửa vẫn addDirt → ngày 1 mở màn sàn bẩn 72% (15 khách × 4,8), người mới bị dạy "lau nhà"
 * thứ mình không gây. Chốt: resetGame gọi freezeDirt (khoá cấu trúc; hành vi resetGame trọn vẹn
 * đã có test trong saveStore.test.ts) + freezeDirt bỏ qua một số lần bẩn rồi trả lại bình thường.
 */

const g = () => useGame.getState();
const ROOT = join(__dirname, '..', '..');

describe('reset không để lại sàn bẩn (GĐ1839)', () => {
  it('resetGame gọi freezeDirt', () => {
    expect(readFileSync(join(ROOT, 'src/core/save.ts'), 'utf8')).toContain('freezeDirt()');
  });

  it('freezeDirt xong: các lần addDirt kế tiếp bị bỏ qua (dirt giữ nguyên), hết lượt thì bẩn lại bình thường', () => {
    useGame.setState({ ...newGameData(), dirt: 72 });
    g().freezeDirt();
    for (let i = 0; i < 20; i++) g().addDirt(DIRT_PER_VISIT); // khách cũ lần lượt ra cửa
    expect(g().dirt).toBe(72);
    for (let i = 0; i < 200; i++) g().addDirt(DIRT_PER_VISIT); // cạn 200 lượt bỏ qua
    const before = g().dirt;
    g().addDirt(DIRT_PER_VISIT);
    expect(g().dirt).toBe(Math.min(100, before + DIRT_PER_VISIT)); // DIRT_MAX = 100
  });
});
