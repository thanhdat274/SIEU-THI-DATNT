import { describe, expect, it } from 'vitest';
import { REGULARS } from '../data/regularsList';
import {
  REGULAR_TIES, TIE_WEIGHT, tieKey, tieIsHostile, alleyBond, type RegularTie,
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
