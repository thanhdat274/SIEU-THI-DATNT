import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { dismissTutorial } from '../core/biz';
import { guideActiveOn } from '../data/onboarding';

/** GĐ1061 — core/biz.dismissTutorial (dòng 115–116): nút "gạt hướng dẫn" của lớp dẫn đường ngày đầu —
 *  ghi `biz.tutorialOff = true` (save-safe, lưu vào sổ) để hướng dẫn 5 bước không hiện lại ở các
 *  phiên sau (guideActiveOn bỏ qua người đã gạt). Đây là lệnh cuối còn trống của core/biz.ts. */

describe('GĐ1061 — dismissTutorial gạt hướng dẫn ngày đầu', () => {
  beforeEach(() => useGame.setState(newGameData()));
  it('gạt → tutorialOff true, và hướng dẫn ngày đầu (ngày 1 chưa bán) không hiện lại', () => {
    const s = useGame.getState();
    expect(s.biz.tutorialOff).toBe(false);
    expect(guideActiveOn(1, false, [], 0)).toBe(true); // ban đầu còn hiện
    dismissTutorial();
    expect(useGame.getState().biz.tutorialOff).toBe(true);
    expect(guideActiveOn(1, true, [], 0)).toBe(false); // đã gạt → tắt
  });
});
