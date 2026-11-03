import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickProfession, PROFESSIONS, PROFESSION_SHARE } from '../data/professions';

/**
 * Bộ test GĐ1040 — `data/professions.pickProfession` nhánh RƠI CUỐI (dòng 294–295 TRƯỚC
 * ĐÂY 0%: `return PROFESSIONS[length-1]` khi roll không hết tổng trọng số — rng cao quá 1 thì
 * luôn rơi vào đây; `simRng()` trả Math.random khi chưa seed nên mock được) + cổng boosted
 * (dòng 287 `PROFESSION_SHARE * (boosted.length ? 1.3 : 1)`).
 *
 * Hợp đồng:
 * - call1 = rng cổng: > PROFESSION_SHARE (0.55) → null; boosted thì ngưỡng ×1.3 = 0.715.
 * - call2 = rng bốc: roll = rng×tổng trọng (nghề đang giờ 4, ngoài giờ 0.5, boosted ×3); trừ theo
 *   thứ tự PROFESSIONS, ≤0 thì chọn; hết mà vẫn dư → nghề CUỐI (shift3_worker).
 */

const LAST_ID = PROFESSIONS[PROFESSIONS.length - 1].id; // 'shift3_worker'
const NOON = 12 * 60;

afterEach(() => vi.restoreAllMocks());

describe('pickProfession — khách vãng lai theo nghề', () => {
  it('roll KHÔNG hết tổng trọng số → rơi về nghề CUỐI (fallback 294)', () => {
    // call1=0 qua cổng 0.55; call2=1.5 → roll = 1.5×tổng > tổng, trừ hết vẫn dư → shift3_worker
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(1.5);
    expect(pickProfession(NOON)?.id).toBe(LAST_ID);
  });

  it('fallback vẫn đúng khi có boosted (trọng số ×3 không đổi kết cục vì roll>tổng)', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValueOnce(1.5);
    expect(pickProfession(NOON, ['reporter'])?.id).toBe(LAST_ID);
  });

  it('cổng chưa boosted chặn rng 0.6 (0.6 > 0.55) → null; boosted qua ngưỡng 0.715 → chọn nghề', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.6); // call1 0.6 > 0.55 → null (call2 không dùng)
    expect(pickProfession(NOON)).toBeNull();
  });

  it('cổng boosted mở rộng: rng 0.6 lọt qua ×1.3 → không null', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.6).mockReturnValueOnce(0.01); // call1 0.6 ≤ 0.715, call2 0.01
    const p = pickProfession(NOON, ['reporter']);
    expect(PROFESSIONS.includes(p as never)).toBe(true);
  });

  it('cổng cao chặn hẳn (rng 0.9 > 0.715 kể cả boost) → null', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9); // call1 0.9 > 0.715 → null
    expect(pickProfession(NOON, ['reporter'])).toBeNull();
  });

  it('kết quả không-null luôn là nghề trong bảng, PROFESSION_SHARE hợp lệ (0 < share < 1)', () => {
    const p = pickProfession(NOON);
    expect(p === null || PROFESSIONS.some((x) => x.id === p.id)).toBe(true);
    expect(PROFESSION_SHARE).toBeGreaterThan(0);
    expect(PROFESSION_SHARE).toBeLessThan(1);
  });
});
