import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { ACHIEVEMENTS } from '../data/biz';
import { rentOf } from '../data/shopTiers';
import {
  newTiemXoi, tiemXoiCapacity, tiemXoiDinePlan, tiemXoiDay, tiemXoiIds,
  TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_UNLOCK, TIEM_XOI_WAGE,
} from '../data/tiemXoi';

/** GĐ411 — Tiệm xôi qua store: mua/tuyển, endDay nấu bù kho chung, save cũ tự bù mặc định. */

const g = () => useGame.getState();
let msgs: string[] = [];

beforeEach(() => {
  msgs = [];
  useGame.setState({ ...newGameData(), level: TIEM_XOI_UNLOCK, money: 100_000_000, notify: (m: string) => { msgs.push(m); } });
});
afterEach(() => vi.restoreAllMocks());

describe('mua / tuyển / cho nghỉ', () => {
  it('chưa đủ cấp hoặc thiếu tiền: không mở', () => {
    useGame.setState({ level: TIEM_XOI_UNLOCK - 1 });
    expect(g().buyTiemXoi()).toBe(false);
    useGame.setState({ level: TIEM_XOI_UNLOCK, money: TIEM_XOI_PRICE - 1 });
    expect(g().buyTiemXoi()).toBe(false);
    expect(g().biz.tiemXoi.open).toBe(false);
  });

  it('mở tiệm trừ đúng giá; tuyển tới tối đa; cho nghỉ giảm thợ', () => {
    expect(g().buyTiemXoi()).toBe(true);
    expect(g().money).toBe(100_000_000 - TIEM_XOI_PRICE);
    expect(g().buyTiemXoi()).toBe(false);
    for (let i = 0; i < TIEM_XOI_MAX_STAFF; i++) expect(g().hireTiemXoi()).toBe(true);
    expect(g().hireTiemXoi()).toBe(false);
    expect(g().money).toBe(100_000_000 - TIEM_XOI_PRICE - TIEM_XOI_MAX_STAFF * TIEM_XOI_HIRE_FEE);
    expect(g().fireTiemXoi()).toBe(true);
    expect(g().biz.tiemXoi.staff).toBe(TIEM_XOI_MAX_STAFF - 1);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });
});

describe('endDay — nấu bù kho', () => {
  it('kho trống: xôi vào kho đúng sức nấu, trừ vốn + lương, có tin ≤ 90 ký tự', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const s = g();
    useGame.setState({
      minutes: 20 * 60, storage: {},
      biz: { ...s.biz, achievements: ACHIEVEMENTS.map((a) => a.id), tiemXoi: { open: true, staff: 1 } },
    });
    const t = tiemXoiDay({ open: true, staff: 1 }, TIEM_XOI_UNLOCK, {}, () => {})!;
    expect(g().sleep()).toBe(true);
    const after = g();
    const xoi = tiemXoiIds(TIEM_XOI_UNLOCK).reduce((n, id) => n + (after.storage[id] ?? 0), 0);
    // GĐ484: khách ăn tại chỗ lấy bớt xôi vừa nấu và trả tiền giá lẻ
    const dine = tiemXoiDinePlan({ open: true, staff: 1 }, TIEM_XOI_UNLOCK, t.made);
    expect(xoi).toBe(tiemXoiCapacity(1) - dine.portions);
    expect(after.money).toBe(100_000_000 - t.cost - TIEM_XOI_WAGE - rentOf(0) + dine.revenue);
    expect(after.biz.tiemXoiLast).toMatchObject({ day: 1, total: t.total, cost: t.cost, wages: TIEM_XOI_WAGE });
    const line = msgs.find((m) => m.includes('🍚 Tiệm xôi'))!;
    expect(line).toBeDefined();
    expect(line.split(' · ').find((p) => p.includes('🍚'))!.length).toBeLessThanOrEqual(90);
  });

  it('tiệm chưa mở: không nấu', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGame.setState({ minutes: 20 * 60, storage: {} });
    expect(g().sleep()).toBe(true);
    expect(g().biz.tiemXoiLast).toBeUndefined();
    expect(tiemXoiIds(TIEM_XOI_UNLOCK).some((id) => (g().storage[id] ?? 0) > 0)).toBe(false);
  });
});

describe('save', () => {
  it('bản lưu cũ thiếu biz.tiemXoi: bù mặc định đóng cửa', () => {
    const save = snapshot();
    delete (save.biz as unknown as Record<string, unknown>).tiemXoi;
    applySnapshot(save);
    expect(g().biz.tiemXoi).toEqual(newTiemXoi());
  });

  it('snapshot giữ trạng thái tiệm xôi (co-op gửi cùng biz)', () => {
    useGame.setState({ biz: { ...g().biz, tiemXoi: { open: true, staff: 2 } } });
    const save = snapshot();
    useGame.setState({ ...newGameData() });
    applySnapshot(save);
    expect(g().biz.tiemXoi).toEqual({ open: true, staff: 2 });
  });
});
