import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { UNLOCK_ACTS, pendingUnlockAct } from '../data/unlockActs';
import type { BizState } from '../data/biz';

/** GĐ64 "Thử ngay": mồi mở khóa hệ mới sau ngày 1 — thuần đọc + 1 field optional save-safe, không đụng kinh tế. */

beforeEach(() => useGame.setState(newGameData()));

describe('UNLOCK_ACTS dữ liệu hợp lệ', () => {
  it('id không trùng, cấp tăng dần, panel trả object hợp lệ', () => {
    const ids = UNLOCK_ACTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    // cấp không giảm (tăng dần)
    for (let i = 1; i < UNLOCK_ACTS.length; i++) {
      expect(UNLOCK_ACTS[i].level).toBeGreaterThanOrEqual(UNLOCK_ACTS[i - 1].level);
    }
    for (const a of UNLOCK_ACTS) {
      expect(a.icon).toBeTruthy();
      expect(a.hint).toBeTruthy();
      expect(a.panel()).toHaveProperty('type');
    }
  });

  it('các mốc hệ chính khớp cấp mở khóa', () => {
    const by = Object.fromEntries(UNLOCK_ACTS.map((a) => [a.id, a.level]));
    expect(by.prices).toBe(3);
    expect(by.staff).toBe(4);
    expect(by.combos).toBe(6);
    expect(by.garden).toBe(8);
    expect(by.online).toBe(10);
    expect(by.branch).toBe(10);
    expect(by.cook).toBe(21);
    expect(by.quannuoc).toBe(29);
  });
});

describe('pendingUnlockAct (mồi tuần tự thấp→cao, một lần mỗi act)', () => {
  it('cấp thấp chưa mở hệ nào → null', () => {
    expect(pendingUnlockAct(newGameData().biz, 1)).toBeNull();
    expect(pendingUnlockAct(newGameData().biz, 2)).toBeNull();
  });

  it('cấp 3 → prices; cấp 4 → staff; cấp 6 → combos (act thấp nhất chưa xem)', () => {
    expect(pendingUnlockAct(newGameData().biz, 3)?.id).toBe('prices');
    expect(pendingUnlockAct(newGameData().biz, 4)?.id).toBe('prices'); // vẫn prices cho tới khi xem
    expect(pendingUnlockAct({ unlockActs: ['prices'] }, 6)?.id).toBe('staff');
    expect(pendingUnlockAct({ unlockActs: ['prices', 'staff'] }, 6)?.id).toBe('combos');
  });

  it('đã làm hết act đạt được → null (cấp 6, chỉ làm prices/staff → combos; làm nốt → null)', () => {
    const done = ['prices', 'staff', 'combos'];
    expect(pendingUnlockAct({ unlockActs: done }, 6)).toBeNull();
  });

  it('cấp 29 → quannuoc cuối cùng; biz undefined → cấp 29 vẫn ra prices (mặc định [])', () => {
    expect(pendingUnlockAct({ unlockActs: ['prices', 'staff', 'combos', 'garden', 'online', 'branch', 'cook'] }, 29)?.id).toBe('quannuoc');
    expect(pendingUnlockAct(undefined, 29)?.id).toBe('prices'); // thiếu unlockActs → coi [] → prices đầu tiên
  });
});

describe('save-safe (field optional như rivalTrend)', () => {
  it('newBiz mặc định unlockActs = []', () => {
    expect(newGameData().biz.unlockActs).toEqual([]);
  });

  it('applySnapshot thiếu unlockActs → tự bù [] (save cũ) + round-trip giữ', () => {
    const raw = { ...newGameData() } as Record<string, unknown>;
    delete raw.biz;
    applySnapshot(raw as never);
    expect(useGame.getState().biz.unlockActs).toEqual([]);

    const b = useGame.getState().biz as BizState;
    useGame.setState({ biz: { ...b, unlockActs: ['prices', 'staff'] } });
    const snap = snapshot();
    applySnapshot(snap);
    expect(useGame.getState().biz.unlockActs).toEqual(['prices', 'staff']);
  });
});
