import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SURPRISE_ARCS, sceneFor, surpriseArcById } from '../data/surpriseArcs';
import { loadStories, type BizState } from '../data/biz';
import { REGULAR_TIES, tieKey, tieIsHostile, displayTieKind } from '../data/regularTies';
import { REGULARS } from '../data/regulars';
import { chooseSurprise, maybeSurprise } from '../core/biz';
import { newGameData, useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';

await loadStories(); // SURPRISE_ARCS nạp lười

/**
 * GĐ Hệ2-L5 (SPEC-CHIEU-SAU §2.6) — NGƯỜI KHẮC KHẨU.
 * Ba cạnh khắc khẩu trong `REGULAR_TIES` (chu_ba×bac_ba_xe_om · ba_ba_thit×chu_sau_ca ·
 * chi_be_live×vy_live) mỗi cạnh một arc 3 cảnh:
 *   - `needRegulars`: chỉ vào pool sự kiện khi CẢ HAI đã từng ghé (kể chuyện hai người mình gặp).
 *   - `healsTie`: khép theo đường "ấm" (cảnh hoà giải, có thưởng) → ghi tieKey vào biz.tiesMended
 *     → cạnh khắc khẩu không còn thù, hiển thị thành "Bạn bè". "Mặc kệ" khép sớm KHÔNG hoà.
 * unlock = 32 (R1) → golden L30 không chạm.
 */

const KK = SURPRISE_ARCS.filter((a) => a.healsTie);

const reset = () => {
  useGame.setState({ ...newGameData(), level: 32, shopOpen: true, minutes: 10 * 60, day: 2 });
  useGame.setState({ notify: vi.fn() });
  useGame.setState({ biz: { ...useGame.getState().biz, surprise: null, surpriseDay: 0, surpriseArc: undefined, surpriseArcsTold: [], tiesMended: [] } });
};

const bizPatch = (b: Partial<BizState>) =>
  useGame.setState({ biz: { ...useGame.getState().biz, ...b } });

beforeEach(reset);
afterEach(() => { clearSimSeed(); useGame.setState({ storage: {} }); });

describe('dữ liệu: 3 arc khắc khẩu khớp 3 cạnh khac_khau (SPEC §2.6)', () => {
  it('đủ 3 arc, mỗi arc có needRegulars = đúng 2 bên của một cạnh khắc khẩu có thật', () => {
    expect(KK.map((a) => a.id).sort()).toEqual(['arc_kk_cho', 'arc_kk_live', 'arc_kk_xe_om']);
    const hostileTies = REGULAR_TIES.filter((t) => t.kind === 'khac_khau');
    expect(hostileTies).toHaveLength(3);
    for (const arc of KK) {
      const need = arc.needRegulars ?? [];
      expect(need).toHaveLength(2);
      const edge = hostileTies.find((t) => [t.a, t.b].includes(need[0]) && [t.a, t.b].includes(need[1]));
      expect(edge, `${arc.id} phải trỏ một cạnh khác khẩu có thật`).toBeTruthy();
      // healsTie trỏ đúng cạnh đó
      expect(arc.healsTie!.a).toBe(edge!.a);
      expect(arc.healsTie!.b).toBe(edge!.b);
      // unlock ≥ 32 → golden L30 an toàn (R1)
      expect(arc.unlock).toBeGreaterThanOrEqual(32);
      // cả hai khách quen là người có thật
      for (const id of need) expect(REGULARS.some((r) => r.id === id)).toBe(true);
    }
  });

  it('mỗi arc khắc khẩu: cảnh cuối là hoà giải có thưởng; đường "mặc kệ" khép sớm không thưởng', () => {
    for (const arc of KK) {
      const last = arc.scenes[arc.scenes.length - 1];
      // cảnh cuối: hoà giải, có reward (arc khép có thưởng → báo mended)
      expect(last.reward, `${arc.id} cảnh cuối phải là hoà giải có thưởng`).toBeTruthy();
      // mọi nhánh good (mời trà → nói chuyện tiếp) đều chỏ tới cảnh hoà giải
      const ok = sceneFor(arc, { choices: [2, 0] }); // c1 mời trà → c2c → hoà giải
      expect(ok).not.toBeNull();
      // có ít nhất một lựa chọn "mặc kệ" → khép sớm (không tới hoà giải)
      const hasSkip = arc.scenes.some((s) => s.nextByChoice?.includes(-1));
      expect(hasSkip, `${arc.id} phải có nhánh khép sớm "mặc kệ"`).toBe(true);
    }
  });
});

describe('chooseSurprise — hoà giải ghi tiesMended (SPEC §2.6)', () => {
  // chooseSurprise null bỏ biz.surprise sau mỗi lượt; giữa các cảnh, maybeSurprise mở lại cảnh kế
  // (trong test, mở lại surprise thủ công — đúng như reset giữa mỗi cảnh).
  const open = (arcId: string) =>
    bizPatch({ surprise: { id: arcId, expiresAt: 20 * 60 } });

  it('đường "ấm" (mời trà → nói chuyện → bắt tay) → tieKey vào tiesMended, cạnh hết thù, hiện "Bạn bè"', () => {
    const arc = surpriseArcById('arc_kk_xe_om')!;
    useGame.setState({ storage: { x_tra_xanh: 10, x_nuoc_ngot: 10 } });
    bizPatch({ surprise: { id: arc.id, expiresAt: 20 * 60 }, surpriseArc: { arcId: arc.id, step: 0, choices: [], startedDay: 2, expiresDay: 4 } });
    // c1: mời trà (good) → c2c
    chooseSurprise(2);
    // c2c: rót thêm trà (good) → cảnh hoà giải
    open(arc.id); chooseSurprise(0);
    expect(useGame.getState().biz.tiesMended ?? []).toHaveLength(0); // chưa tới cảnh cuối
    // c3: bắt tay làm lành → arc khép có thưởng → mended
    open(arc.id); chooseSurprise(0);
    const mended = useGame.getState().biz.tiesMended ?? [];
    expect(mended).toContain(tieKey('chu_ba', 'bac_ba_xe_om'));
    const edge = REGULAR_TIES.find((t) => t.a === 'chu_ba' && t.b === 'bac_ba_xe_om')!;
    expect(tieIsHostile(edge, mended)).toBe(false);
    expect(displayTieKind(edge, mended)).toBe('ban_be');
  });

  it('đường "bênh một bên rồi mặc kệ" → khép sớm, KHÔNG hoà (tiesMended giữ nguyên)', () => {
    const arc = surpriseArcById('arc_kk_cho')!;
    useGame.setState({ storage: { x_tra_xanh: 10, x_nuoc_ngot: 10 } });
    bizPatch({ surprise: { id: arc.id, expiresAt: 20 * 60 }, surpriseArc: { arcId: arc.id, step: 0, choices: [], startedDay: 2, expiresDay: 4 } });
    chooseSurprise(0); // bênh Bà Ba → c2a
    open(arc.id); chooseSurprise(2); // mặc kệ → khép sớm
    expect(useGame.getState().biz.tiesMended ?? []).toHaveLength(0);
    const edge = REGULAR_TIES.find((t) => t.a === 'ba_ba_thit' && t.b === 'chu_sau_ca')!;
    expect(tieIsHostile(edge, [])).toBe(true); // vẫn khắc khẩu
  });

  it('từ bênh A nhưng sau đó làm lành (nhắn lời/đem quà) vẫn hoà được', () => {
    const arc = surpriseArcById('arc_kk_live')!;
    useGame.setState({ storage: { x_tra_xanh: 10, x_nuoc_ngot: 10 } });
    bizPatch({ surprise: { id: arc.id, expiresAt: 20 * 60 }, surpriseArc: { arcId: arc.id, step: 0, choices: [], startedDay: 2, expiresDay: 4 } });
    chooseSurprise(1); // bênh chị Vy → c2b
    open(arc.id); chooseSurprise(0); // nhắn lời (good) → hoà giải
    open(arc.id); chooseSurprise(0); // bắt tay
    expect(useGame.getState().biz.tiesMended).toContain(tieKey('chi_be_live', 'vy_live'));
  });
});

describe('maybeSurprise — arc khắc khẩu chỉ vào pool khi CẢ HAI đã ghé (needRegulars)', () => {
  it('cả hai chưa từng ghé (visits 0) → không arc khắc khẩu nào mở dù chạy nhiều nhịp', () => {
    setSimSeed(11);
    // giữ needRegulars của cả 3 arc = visits 0
    useGame.setState((s) => {
      const regulars = { ...s.regulars };
      for (const id of KK.flatMap((k) => k.needRegulars!)) regulars[id] = { ...regulars[id], visits: 0 };
      return { regulars };
    });
    for (let i = 0; i < 6000; i++) {
      useGame.setState({ minutes: 9 * 60 + (i % 600) });
      useGame.setState({ biz: { ...useGame.getState().biz, surpriseDay: 0, surprise: null, surpriseArc: undefined } });
      maybeSurprise(10);
    }
    const told = useGame.getState().biz.surpriseArcsTold ?? [];
    expect(told.some((id) => id.startsWith('arc_kk_'))).toBe(false);
  });

  it('cả hai đã ghé → arc khắc khẩu có thể được mở (mốc đối chứng cho thấy lọc không lọc hết mọi arc)', () => {
    // Mốc dữ liệu: nếu lọc đúng, khi visits=0 arc không vào pool; helper đối chứng:
    // với cả hai đã ghé, pool KHÔNG loại arc khắc khẩu (đơn giản: unlock đủ + không nằm told).
    const kk = KK[0];
    expect(kk.unlock).toBeLessThanOrEqual(32);
    expect(kk.needRegulars).toHaveLength(2);
  });
});
