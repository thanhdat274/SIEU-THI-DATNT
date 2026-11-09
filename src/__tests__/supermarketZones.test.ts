import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { DEPARTMENTS, DEPT_ECON_FROM_TIER, KHU_PRICE_MUL, departmentDecorBonus, departmentPriceMul, departmentWalled } from '../data/departments';
import type { Furniture } from '../core/gameTypes';

/** GĐ1943 — siêu thị phase 2, tranche 1: khu siêu thị nối vào kinh tế + sơn theo khu. */
const f = (uid: number, type: Furniture['type'], x: number, z: number): Furniture => ({ uid, type, x, z, rot: 0, tiers: [] });
const coldZone = [f(1, 'fridge', 0, 0), f(2, 'freezer', 1, 0)];
const g = () => useGame.getState();

describe('departmentDecorBonus', () => {
  it('= 0 dưới bậc Siêu thị tạp hóa (giữ sim mốc 30)', () => {
    for (let t = 0; t < DEPT_ECON_FROM_TIER; t++) expect(departmentDecorBonus(coldZone, t)).toBe(0);
  });
  it('> 0 từ bậc Siêu thị tạp hóa khi khu kích hoạt', () => {
    expect(departmentDecorBonus(coldZone, DEPT_ECON_FROM_TIER)).toBe(3); // base 2 + 1 phụ trợ
    expect(departmentDecorBonus([], DEPT_ECON_FROM_TIER)).toBe(0);
  });
  it('vách ngăn quanh khu +2', () => {
    const walled = [...coldZone, f(3, 'wall', 2, 1)];
    expect(departmentWalled(DEPARTMENTS[0], walled)).toBe(true);
    expect(departmentDecorBonus(walled, DEPT_ECON_FROM_TIER)).toBe(5);
    expect(departmentWalled(DEPARTMENTS[0], [...coldZone, f(3, 'wall', 9, 9)])).toBe(false);
  });
  it('đồ hỏng/dùng thử không kích hoạt khu', () => {
    expect(departmentDecorBonus([{ ...coldZone[0], broken: true }], DEPT_ECON_FROM_TIER)).toBe(0);
    expect(departmentDecorBonus([{ ...coldZone[0], trial: true }], DEPT_ECON_FROM_TIER)).toBe(0);
  });
});

describe('departmentPriceMul', () => {
  it('áp cho nhóm hàng của khu đã kích hoạt, từ bậc 4', () => {
    expect(departmentPriceMul('cold', coldZone, DEPT_ECON_FROM_TIER)).toBe(KHU_PRICE_MUL);
    expect(departmentPriceMul('cold', coldZone, DEPT_ECON_FROM_TIER - 1)).toBe(1);
    expect(departmentPriceMul('household', coldZone, DEPT_ECON_FROM_TIER)).toBe(1);
  });
});

describe('zonePaint', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), shopTier: DEPT_ECON_FROM_TIER, money: 1_000_000, furniture: coldZone }));
  it('mặc định rỗng, sơn khu active thì ghi + trừ tiền, persist qua bản lưu', () => {
    expect(g().zonePaint).toEqual({});
    g().paintZone('mat_dong', 'floor', 0x9aa0a6);
    expect(g().zonePaint.mat_dong.floor).toBe(0x9aa0a6);
    expect(g().money).toBeLessThan(1_000_000);
    const snap = snapshot();
    useGame.setState({ zonePaint: {} });
    applySnapshot(snap);
    expect(g().zonePaint.mat_dong.floor).toBe(0x9aa0a6);
  });
  it('khu chưa hoạt động thì từ chối', () => {
    g().paintZone('thit_ca', 'floor', 0x9aa0a6);
    expect(g().zonePaint).toEqual({});
  });
  it('bản lưu cũ thiếu zonePaint đọc như rỗng', () => {
    const snap = snapshot() as Record<string, unknown>;
    delete snap.zonePaint;
    applySnapshot(snap);
    expect(g().zonePaint).toEqual({});
  });
});
