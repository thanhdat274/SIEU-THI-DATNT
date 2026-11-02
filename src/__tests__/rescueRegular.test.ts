import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { atRiskOfPoach, newBiz, RESCUE_FEE, RESCUE_FRIENDSHIP } from '../data/biz';
import {
  birthdayEve, isBirthday, regularById, regularsExpectedToday, REGULARS,
} from '../data/regulars';
import { YEAR_DAYS } from '../data/calendar';
import { reputationOf } from '../data/reputation';

/**
 * GĐ793 — đòi lại khách quen bị đối thủ lôi kéo.
 * Trước đây khách bị lôi kéo chỉ biến mất khỏi tiệm (customers.ts loại khỏi danh sách ghé) và người chơi
 * không biết mất ai, không làm gì được. Nay: thấy tên + ngày bị kéo, tự đòi về bằng 1 món họ thích + tiền quà.
 */

const RIVAL = { name: 'Tạp hóa Thử', strength: 60, openedDay: 9 };
const named = (id: string) => regularById(id)!.name;

beforeEach(() => {
  useGame.setState({
    ...newGameData(),
    day: 10, level: 10, money: 500_000,
    storage: { sua: 3, nuoc: 2 }, storageLots: {},
    biz: { ...newBiz(), rival: { ...RIVAL, poached: { ba_nam: 8 } } },
  });
});

describe('rescuePoachedRegular — đòi khách quen bị lôi kéo', () => {
  it('đòi được: trừ tiền quà + 1 món trong kho, xoá khỏi danh sách bị kéo, +thân thiết, ghi ngày đã đòi', () => {
    const ok = useGame.getState().rescuePoachedRegular('ba_nam');
    const s = useGame.getState();
    expect(ok).toBe(true);
    expect(s.biz.rival?.poached).toEqual({});
    expect(s.money).toBe(500_000 - RESCUE_FEE);
    expect(s.storage.sua).toBe(2);
    expect(s.storageLots.sua?.reduce((n, l) => n + l.qty, 0)).toBe(2);
    expect(s.regulars.ba_nam.friendship).toBe(RESCUE_FRIENDSHIP);
    expect(s.biz.rescueDay).toBe(10);
    expect(s.stats.spent).toBe(RESCUE_FEE);
    expect(s.message).toContain(named('ba_nam'));
  });

  it('mỗi ngày chỉ đòi được một người; sang ngày mới thì đòi tiếp', () => {
    useGame.setState({ biz: { ...newBiz(), rival: { ...RIVAL, poached: { ba_nam: 8, chu_ba: 8 } } } });
    expect(useGame.getState().rescuePoachedRegular('ba_nam')).toBe(true);
    expect(useGame.getState().rescuePoachedRegular('chu_ba')).toBe(false);
    // lần hai bị chặn trước khi trừ gì: tiền/kho/poached giữ nguyên
    expect(useGame.getState().biz.rival?.poached).toEqual({ chu_ba: 8 });
    expect(useGame.getState().money).toBe(500_000 - RESCUE_FEE);
    expect(useGame.getState().message).toContain('mai');
    useGame.setState({ day: 11 });
    expect(useGame.getState().rescuePoachedRegular('chu_ba')).toBe(true);
    expect(useGame.getState().biz.rival?.poached).toEqual({});
  });

  it('thiếu món họ thích trong kho thì không đòi: báo đúng tên món, không trừ tiền', () => {
    useGame.setState({ storage: {} });
    expect(useGame.getState().rescuePoachedRegular('ba_nam')).toBe(false);
    const s = useGame.getState();
    expect(s.biz.rival?.poached).toEqual({ ba_nam: 8 });
    expect(s.money).toBe(500_000);
    expect(s.message).toContain('trong kho');
  });

  it('không đủ tiền quà thì không đòi: giữ nguyên hàng trong kho', () => {
    useGame.setState({ money: RESCUE_FEE - 1 });
    expect(useGame.getState().rescuePoachedRegular('ba_nam')).toBe(false);
    const s = useGame.getState();
    expect(s.storage.sua).toBe(3);
    expect(s.biz.rival?.poached).toEqual({ ba_nam: 8 });
    expect(s.message).toContain('quà');
  });

  it('khách không bị lôi kéo / chưa có đối thủ / id lạ: không làm gì', () => {
    expect(useGame.getState().rescuePoachedRegular('chu_ba')).toBe(false);
    expect(useGame.getState().money).toBe(500_000);
    expect(useGame.getState().rescuePoachedRegular('khong_co')).toBe(false);
    useGame.setState({ biz: { ...newBiz() } }); // rival null
    expect(useGame.getState().rescuePoachedRegular('ba_nam')).toBe(false);
    expect(useGame.getState().money).toBe(500_000);
  });

  it('save cũ thiếu rescueDay vẫn chạy (trường tuỳ chọn, không cần migration)', () => {
    const biz = { ...newBiz(), rival: { ...RIVAL, poached: { ba_nam: 8 } } };
    delete biz.rescueDay;
    useGame.setState({ biz });
    expect(useGame.getState().biz.rescueDay).toBeUndefined();
    expect(useGame.getState().rescuePoachedRegular('ba_nam')).toBe(true);
    expect(useGame.getState().biz.rescueDay).toBe(10);
  });
});

describe('Sổ đầu ngày / mồi ngày mai không hứa khách đang bị lôi kéo', () => {
  it('regularsExpectedToday loại đúng khách đang bị kéo khỏi danh sách dự kiến ghé', () => {
    const all = REGULARS.map((r) => r.id);
    // lọc hết → không còn ai dự kiến ghé (dù thời tiết/ngày nào)
    for (const day of [10, 11, 20]) {
      expect(regularsExpectedToday(day, 1234, 40, {}, reputationOf([]), all)).toEqual([]);
    }
    // không truyền poached (chỗ cũ) thì vẫn chạy như trước, không lỗi
    expect(() => regularsExpectedToday(10, 1234, 40, {}, reputationOf([]))).not.toThrow();
  });

  it('birthdayEve bỏ qua khách đang bị lôi kéo (mai không ghé thì đừng nhắc nhập đồ)', () => {
    const def = REGULARS[0];
    const progress = { [def.id]: { friendship: 5, visits: 3, perks: [], discovered: [] } };
    // tìm một ngày mà MAI là sinh nhật của khách này
    const day = [...Array(YEAR_DAYS).keys()].map((i) => i + 1).find((d) => isBirthday(def, d + 1))!;
    const eve = birthdayEve(day, 40, progress, () => false);
    expect(eve.map((e) => e.def.id)).toContain(def.id);
    expect(birthdayEve(day, 40, progress, () => false, [def.id])).toEqual([]);
  });
});

describe('GĐ794 — atRiskOfPoach: cảnh báo trước khi mất khách', () => {
  const rival = (strength: number, poached: Record<string, number> = {}) => ({ ...RIVAL, strength, poached });
  it('chỉ khách thân thiết < mốc, chưa bị kéo, khi rival đủ mạnh', () => {
    expect(atRiskOfPoach(rival(60), { a: 5, b: 80, c: 24, d: 25 }).sort()).toEqual(['a', 'c']);
    expect(atRiskOfPoach(rival(60, { a: 3 }), { a: 5, c: 10 })).toEqual(['c']);
  });
  it('rival yếu (<35), không có rival hoặc đã kéo đủ 3 người thì không cảnh báo', () => {
    expect(atRiskOfPoach(rival(34), { a: 5 })).toEqual([]);
    expect(atRiskOfPoach(undefined, { a: 5 })).toEqual([]);
    expect(atRiskOfPoach(rival(90, { x: 1, y: 1, z: 1 }), { a: 5 })).toEqual([]);
  });
});
