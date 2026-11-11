import { describe, expect, it, beforeEach } from 'vitest';
import { REGULARS } from '../data/regularsList';
import { newGameData, useGame } from '../core/store';
import {
  REGULAR_TIES, TIE_WEIGHT, tieKey, tieIsHostile, alleyBond, rippleFriendship,
  FORGIVE_HO_HANG_GAIN, TIES_UNLOCK, type RegularTie,
} from '../data/regularTies';

/**
 * GĐ Hệ2-L1 (SPEC-CHIEU-SAU §2.3/2.8) — DỮ LIỆU QUAN HỆ + `alleyBond` (chỉ đọc).
 *  - 22 cạnh giữa 28 khách quen, mọi id có thật, không cạnh trùng.
 *  - Mỗi người 1–4 cạnh; đồ thị KHÔNG ai cô lập.
 *  - `alleyBond(regulars, tiesMended)` → 0–100% theo min(thân thiết) quy về đủ 40 = 1.
 * L1 chưa đổi gì trong ván → golden 30 an toàn.
 */

const allIds = new Set(REGULARS.map((r) => r.id));

/** Đếm số cạnh mỗi regular có trong bảng. */
function perPerson(): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of REGULARS) m.set(r.id, 0);
  for (const t of REGULAR_TIES) {
    m.set(t.a, (m.get(t.a) ?? 0) + 1);
    m.set(t.b, (m.get(t.b) ?? 0) + 1);
  }
  return m;
}

describe('dữ liệu quan hệ (SPEC §2.3)', () => {
  it('kiểu cạnh đủ 5 loại + trọng số đúng dấu (khắc khẩu âm)', () => {
    for (const k of ['ho_hang', 'ban_be', 'lang_gieng', 'dong_nghe', 'khac_khau'] as const) {
      expect(TIE_WEIGHT[k]).toBeTypeOf('number');
    }
    expect(TIE_WEIGHT.ho_hang).toBeGreaterThan(TIE_WEIGHT.ban_be);
    expect(TIE_WEIGHT.ban_be).toBeGreaterThan(TIE_WEIGHT.lang_gieng);
    expect(TIE_WEIGHT.lang_gieng).toBeGreaterThan(TIE_WEIGHT.dong_nghe);
    expect(TIE_WEIGHT.khac_khau).toBeLessThan(0);
  });

  it('mọi id ở cả hai đầu cạnh đều là khách quen có thật', () => {
    for (const t of REGULAR_TIES) {
      expect(allIds.has(t.a), `không có regular ${t.a}`).toBe(true);
      expect(allIds.has(t.b), `không có regular ${t.b}`).toBe(true);
    }
  });

  it('không cạnh trùng (khóa chuẩn hoá a|b là duy nhất)', () => {
    const keys = REGULAR_TIES.map((t) => tieKey(t.a, t.b));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('đúng 3 cạnh khắc khẩu (một cho mỗi arc §2.6)', () => {
    expect(REGULAR_TIES.filter((t) => t.kind === 'khac_khau')).toHaveLength(3);
  });

  it('mỗi người có 1–4 cạnh (không ai ôm quá nhiều, không ai cô lập)', () => {
    const m = perPerson();
    for (const r of REGULARS) {
      const n = m.get(r.id) ?? 0;
      expect(n, `${r.id} có ${n} cạnh`).toBeGreaterThanOrEqual(1);
      expect(n, `${r.id} có ${n} cạnh`).toBeLessThanOrEqual(4);
    }
    expect(m.size).toBe(REGULARS.length); // đủ cả 28 người
  });

  it('đồ thị không có ai bị cô lập (mọi khách quen chạm ít nhất 1 cạnh)', () => {
    const touched = new Set<string>();
    for (const t of REGULAR_TIES) { touched.add(t.a); touched.add(t.b); }
    for (const r of REGULARS) expect(touched.has(r.id), `${r.id} bị cô lập`).toBe(true);
  });
});

describe('alleyBond — chỉ số "Tình làng" (SPEC §2.8)', () => {
  const fr = (map: Record<string, number>): Record<string, { friendship: number }> =>
    Object.fromEntries(Object.entries(map).map(([id, friendship]) => [id, { friendship }]));

  const tie = (a: string, b: string): RegularTie => REGULAR_TIES.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a))!;

  it('cả hẻm thân đủ 40 → 100%', () => {
    const friends = Object.fromEntries(REGULARS.map((r) => [r.id, 40]));
    expect(alleyBond(fr(friends))).toBe(100);
  });

  it('chưa có ai thân → 0%', () => {
    const friends = Object.fromEntries(REGULARS.map((r) => [r.id, 0]));
    expect(alleyBond(fr(friends))).toBe(0);
  });

  it('một cặp thân 40 trong khi cả hẻm 0 → đúng phần cạnh thân đó', () => {
    const friends: Record<string, number> = Object.fromEntries(REGULARS.map((r) => [r.id, 0]));
    friends.ba_nam = 40; friends.bac_tam = 40;
    const friendlyCount = REGULAR_TIES.filter((t) => t.kind !== 'khac_khau').length;
    expect(alleyBond(fr(friends))).toBe(Math.round((1 / friendlyCount) * 100));
  });

  it('cạnh khắc khẩu không tính vào chỉ số (trừ đã hoà giải)', () => {
    const friends: Record<string, number> = Object.fromEntries(REGULARS.map((r) => [r.id, 40]));
    const hostile = REGULAR_TIES.find((t) => t.kind === 'khac_khau')!;
    // cả hẻm 40 → vẫn 100% vì cạnh khắc khẩu không vào mẫu
    expect(alleyBond(fr(friends))).toBe(100);
    // sau khi hoà giải cạnh đó (mended), nó được tính như cạnh thân → vẫn 100 (cả hai đều 40)
    expect(alleyBond(fr(friends), [tieKey(hostile.a, hostile.b)])).toBe(100);
  });

  it('min của hai đầu điều khiển chỉ số: 20 & 40 → nửa cạnh (đủ 40 mới là 1)', () => {
    const friends: Record<string, number> = Object.fromEntries(REGULARS.map((r) => [r.id, 0]));
    friends.ba_nam = 20;
    friends.bac_tam = 40;
    const tieN = tie('ba_nam', 'bac_tam');
    const friendlyCount = REGULAR_TIES.filter((t) => !tieIsHostile(t)).length;
    // ba_nam–bac_tam là cạnh thân (láng giềng) → đóng góp min(20,40)/40 = 0.5
    expect(tieIsHostile(tieN)).toBe(false);
    expect(alleyBond(fr(friends))).toBe(Math.round((0.5 / friendlyCount) * 100));
  });

  it('alleyBond thuần: không đổi trạng thái truyền vào', () => {
    const friends = fr(Object.fromEntries(REGULARS.map((r) => [r.id, 30])));
    const snapshot = JSON.stringify(friends);
    alleyBond(friends, []);
    expect(JSON.stringify(friends)).toBe(snapshot);
  });
});

describe('rippleFriendship — lan theo cạnh (SPEC §2.4)', () => {
  const by = (r: { id: string; delta: number }[]) => Object.fromEntries(r.map((x) => [x.id, x.delta]));

  it('đơn riêng đúng hẹn +8 lan theo trọng số toàn bộ cạnh (kể cả khắc khẩu âm)', () => {
    const r = by(rippleFriendship('ba_nam', 8));
    // ba_nam: bac_tam (lang_gieng 0.25) + be_na (ho_hang 0.5)
    expect(r['bac_tam']).toBe(Math.round(8 * TIE_WEIGHT.lang_gieng)); // 2
    expect(r['be_na']).toBe(Math.round(8 * TIE_WEIGHT.ho_hang));      // 4
  });

  it('cạnh khắc khẩu: lo chu đáo A thì B dỗi (delta âm)', () => {
    const r = by(rippleFriendship('chu_ba', 8));
    // chu_ba: bac_ba_xe_om (khac_khau −0.3) + bac_hung_me (ban_be 0.3)
    expect(r['bac_ba_xe_om']).toBe(Math.round(8 * TIE_WEIGHT.khac_khau)); // −2
    expect(r['bac_hung_me']).toBe(Math.round(8 * TIE_WEIGHT.ban_be));     // 2
  });

  it('xoá nợ: only ho_hang + flat (không nhân trọng số), người loại khác không nhận', () => {
    const r = by(rippleFriendship('ba_nam', FORGIVE_HO_HANG_GAIN, { only: 'ho_hang', weighted: false }));
    expect(r['be_na']).toBe(2);       // ho_hang +2
    expect(r['bac_tam']).toBeUndefined(); // lang_gieng không nhận
  });

  it('ripple thuần: không thay đổi dữ liệu cạnh', () => {
    const snap = JSON.stringify(REGULAR_TIES);
    rippleFriendship('ba_nam', 8);
    expect(JSON.stringify(REGULAR_TIES)).toBe(snap);
  });
});

describe('applyRipple — trần ±3/ngày + cổng cấp (GĐ Hệ2-L2)', () => {
  const g = () => useGame.getState();
  const fr = (friendship: number) =>
    Object.fromEntries(REGULARS.map((r) => [r.id, { friendship, visits: 0, perks: [], discovered: [] }]));

  beforeEach(() => {
    const d = newGameData();
    useGame.setState({ ...d, level: TIES_UNLOCK, day: 40, regulars: fr(0), notify: () => {} });
  });

  it('cấp < TIES_UNLOCK: không lan (golden L30 an toàn)', () => {
    useGame.setState({ level: 30 });
    g().applyRipple('ba_nam', 8);
    expect(g().regulars['be_na']?.friendship).toBe(0);
    expect(g().regulars['bac_tam']?.friendship).toBe(0);
  });

  it('lan đúng người có cạnh theo trọng số; người không cạnh không đổi', () => {
    g().applyRipple('ba_nam', 4); // nhỏ để không chạm trần, kiểm tra trọng số tinh
    expect(g().regulars['be_na']?.friendship).toBe(Math.round(4 * TIE_WEIGHT.ho_hang)); // 2
    expect(g().regulars['bac_tam']?.friendship).toBe(Math.round(4 * TIE_WEIGHT.lang_gieng)); // 1
    expect(g().regulars['chu_ba']?.friendship).toBe(0); // không cạnh với ba_nam
  });

  it('trần ±3/ngày cho mỗi người nhận: lan thứ 2 cùng ngày bị chặn phần vượt', () => {
    g().applyRipple('ba_nam', 8); // be_na muốn +4 → cắt còn +3
    g().applyRipple('ba_nam', 8); // +4 nữa, sum đã 3 → +0
    expect(g().regulars['be_na']?.friendship).toBe(3);
  });

  it('sang ngày mới: trần reset (rippleDay theo day)', () => {
    g().applyRipple('ba_nam', 8); // be_na +4 → +3
    useGame.setState({ day: 41 });
    g().applyRipple('ba_nam', 8); // cap reset → +3 nữa
    expect(g().regulars['be_na']?.friendship).toBe(6);
  });

  it('xoá nợ: họ hàng +2, 30 ngày sau mới lan lần nữa cho con nợ đó', () => {
    useGame.setState({ day: 40, debts: { ba_nam: { amount: 100, since: 30 } } });
    g().forgiveDebt('ba_nam');
    expect(g().regulars['be_na']?.friendship).toBe(2); // họ hàng +2 ("nhớ ơn")
    // cho nợ lại rồi xoá trong vòng 30 ngày (day 50): không lan thêm (1 lần/30 ngày)
    useGame.setState({ day: 50, debts: { ba_nam: { amount: 50, since: 45 } } });
    g().forgiveDebt('ba_nam');
    expect(g().regulars['be_na']?.friendship).toBe(2);
    // ngày 70 (≥30 sau lần 40): lan lại
    useGame.setState({ day: 70, debts: { ba_nam: { amount: 50, since: 60 } } });
    g().forgiveDebt('ba_nam');
    expect(g().regulars['be_na']?.friendship).toBe(4);
  });
});
