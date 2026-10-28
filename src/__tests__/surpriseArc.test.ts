import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arcAgenda, todayAgenda,
} from '../data/todayAgenda';
import {
  SURPRISE_ARCS, arcForEvent, arcGoodCount, arcReward, arcSceneAt, arcScenePending, findSurprise,
  sceneFor, surpriseArcById,
} from '../data/surpriseArcs';
import { SURPRISES, type BizState } from '../data/biz';
import { chooseSurprise, maybeSurprise } from '../core/biz';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { clearSimSeed, setSimSeed } from '../core/rand';

/**
 * GĐ164 — "Sự kiện bất ngờ" thành chuyện kể: mini-arc 2–3 ngày (surpriseArcs.ts).
 *
 * 4 def một-phát (mua_roi · bong_da_kinh · mua_dai · livestream) chuyển thành 4 arc
 * 2–3 ngày: mỗi ngày 1 cảnh, cảnh phát tất định 10h–11h30 và giữ tới 20h, cảnh cuối
 * trả thưởng base + perLevel × cấp + perGood × lựa chọn ấm. Core: maybeSurprise mở
 * arc khi pool trúng id-có-arc (pool = def một-phát + arc chưa kể → kể xong không lặp),
 * không quay pool ngày arc còn dở; quá hạn khép nhẹ không phạt (ethos GĐ55).
 */

const ARCA = 'arc_mua_roi';
const ARCB = 'arc_bong_kinh';
const ARCC = 'arc_mua_dai';
const ARCD = 'arc_clip_hot';

const reset = () => {
  useGame.setState({ ...newGameData() });
  useGame.setState({ notify: vi.fn() });
};

const bizPatch = (b: Partial<BizState>) =>
  useGame.setState({ biz: { ...useGame.getState().biz, ...b } });

const notifyTexts = () =>
  (useGame.getState().notify as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));

/** State arc nhanh cho test core. */
const arcState = (arcId: string, over: Partial<NonNullable<BizState['surpriseArc']>> = {}) => ({
  arcId, step: 0, choices: [] as number[], startedDay: 4, expiresDay: 5, ...over,
});

afterEach(() => clearSimSeed());

// ───────────────────── Dữ liệu: 4 arc thay 4 def một-phát ─────────────────────

describe('GĐ164 — dữ liệu arc: thay thế def cũ, kết nối cảnh chặt chẽ', () => {
  it('đủ 4 arc, unlock/days khớp def cũ đã xoá (mua_roi 1 · bong_da_kinh 4 · mua_dai 6 · livestream 10)', () => {
    expect(SURPRISE_ARCS.map((a) => a.id)).toEqual([ARCA, ARCB, ARCC, ARCD]);
    expect(SURPRISE_ARCS.map((a) => a.unlock)).toEqual([1, 4, 6, 10]);
    expect(SURPRISE_ARCS.map((a) => a.days)).toEqual([2, 2, 3, 3]);
  });

  it('4 def một-phát cũ đã XÓA khỏi SURPRISES (kể xong arc không lặp — arc đứng trong told)', () => {
    for (const old of ['mua_roi', 'bong_da_kinh', 'mua_dai', 'livestream']) {
      expect(SURPRISES.some((e) => e.id === old), `${old} phải đã xoá`).toBe(false);
      expect(arcForEvent(old)?.id, `arc thay ${old}`).toBeTruthy();
    }
    // Pool chọnarc = def một-phát + arc chưa kể → tổng mật độ giữ nguyên 30 mẫu
    expect(SURPRISES.length + SURPRISE_ARCS.length).toBe(30);
  });

  it('mỗi scene: options 2–3, nextByChoice đủ dài, index hợp lệ; mỗi nhánh cuối có reward hoặc khép', () => {
    for (const arc of SURPRISE_ARCS) {
      expect(arc.scenes.length).toBeGreaterThanOrEqual(2);
      for (const sc of arc.scenes) {
        // Spec GĐ164 cho phép cảnh 1 lựa chọn (arc B "kinh-2a" — phụ huynh tạ lỗi, nhận cho qua)
        expect(sc.options.length).toBeGreaterThanOrEqual(1);
        expect(sc.options.length).toBeLessThanOrEqual(3);
        if (sc.nextByChoice) {
          expect(sc.nextByChoice.length).toBe(sc.options.length);
          for (const n of sc.nextByChoice) {
            expect(n === -1 || (n >= 0 && n < arc.scenes.length), `${arc.id}/${sc.id} → ${n}`).toBe(true);
          }
        } else {
          // Không có next: phải là cảnh cuối có thưởng (hoặc cảnh kết nhánh) — không ngắc ngứ
          expect(sc.reward || sc.nextByChoice === undefined).toBeTruthy();
        }
        for (const o of sc.options) {
          expect(o.label).toBeTruthy();
          expect(o.result).toBeTruthy();
          if (o.money !== undefined) expect(Math.abs(o.money)).toBeLessThanOrEqual(150000);
        }
      }
      // Cảnh đầu không có reward (chưa kể xong mà trả thưởng thì arc vô nghĩa)
      expect(arc.scenes[0].reward).toBeUndefined();
    }
  });

  it('needStock chỉ dùng ở arc A (gạo) và sản phẩm tồn tại; friendship id đều là khách quen thật', () => {
    for (const arc of SURPRISE_ARCS) {
      for (const sc of arc.scenes) {
        for (const o of sc.options) {
          if (o.needStock) expect(o.needStock.productId).toBe('gao');
          if (o.friendship) expect(['bac_tam', 'be_na']).toContain(o.friendship.id);
        }
      }
    }
  });

  it('band kinh tế: tổng tiền ròng mọi đường đi của arc nằm trong khoảng an toàn, không mỏ tiền', () => {
    for (const arc of SURPRISE_ARCS) {
      const nets: number[] = [];
      // Đi mọi nhánh: cộng tiền tức thời + reward (theo goodCount trên đúng đường) khi tới cảnh cuối
      const dfs = (idx: number, path: number[], money: number) => {
        const sc = arc.scenes[idx];
        if (!sc) return;
        for (let o = 0; o < sc.options.length; o++) {
          const m = money + (sc.options[o].money ?? 0)
            + (sc.reward ? arcReward(sc, arcGoodCount(arc, { choices: [...path, o] }), arc.unlock).money : 0);
          const nxt = sc.nextByChoice ? sc.nextByChoice[o] : undefined;
          if (nxt === undefined || nxt < 0) nets.push(m);
          else dfs(nxt, [...path, o], m);
        }
      };
      dfs(0, [], 0);
      expect(nets.length).toBeGreaterThanOrEqual(2);
      for (const n of nets) {
        expect(n, `${arc.id} net ${n}`).toBeGreaterThanOrEqual(-120000);
        expect(n, `${arc.id} net ${n}`).toBeLessThanOrEqual(100000);
      }
    }
  });
});

// ───────────────────── Helper thuần: sceneFor · arcReward · arcGoodCount ─────────────────────

describe('GĐ164 — helper thuần', () => {
  it('sceneFor đúng nhánh theo choices (tra nextByChoice của cảnh trước)', () => {
    const a = surpriseArcById(ARCA)!;
    expect(sceneFor(a, { choices: [] })!.id).toBe('mua-1');
    expect(sceneFor(a, { choices: [0] })!.id).toBe('mua-2a'); // trà → bác Tư đặt gạo
    expect(sceneFor(a, { choices: [1] })!.id).toBe('mua-2b'); // chào cho có → mưa lại mua luôn
    expect(sceneFor(a, { choices: [0, 0] })).toBeNull(); // cảnh cuối đã chốt → hết arc
    const b = surpriseArcById(ARCB)!;
    expect(sceneFor(b, { choices: [2] })!.id).toBe('kinh-2c'); // bắt đền → xóm dèm
    const c = surpriseArcById(ARCC)!;
    expect(sceneFor(c, { choices: [0] })!.id).toBe('dai-2a');
    expect(sceneFor(c, { choices: [0, 0] })!.id).toBe('dai-3'); // ngày 3 chung
    expect(sceneFor(c, { choices: [2, 1] })!.id).toBe('dai-3');
    const d = surpriseArcById(ARCD)!;
    expect(sceneFor(d, { choices: [1] })).toBeNull(); // "Ngại lên hình" → arc khép sớm
    expect(sceneFor(d, { choices: [0, 1] })!.id).toBe('clip-3');
  });

  it('arcReward đúng công thức base + perLevel × cấp + perGood × good', () => {
    const a = surpriseArcById(ARCA)!;
    const sc = a.scenes[1]; // mua-2a: 25k + 1.5k×lv + 5k/good, rating 5, xp 15
    expect(arcReward(sc, 1, 4)).toEqual({ money: 25000 + 1500 * 4 + 5000 * 1, rating: 5, xp: 15 });
    expect(arcReward(sc, 0, 1).money).toBe(25000 + 1500);
    expect(arcReward(a.scenes[2], 3, 9).money).toBe(0); // cảnh không reward → 0
  });

  it('arcGoodCount đếm lựa chọn "ấm" trên đúng đường đã đi', () => {
    const a = surpriseArcById(ARCA)!;
    expect(arcGoodCount(a, { choices: [0] })).toBe(1); // rót trà = good
    expect(arcGoodCount(a, { choices: [1] })).toBe(0);
    const c = surpriseArcById(ARCC)!;
    expect(arcGoodCount(c, { choices: [0] })).toBe(1); // lội nước
    expect(arcGoodCount(c, { choices: [2] })).toBe(0); // đóng cửa
  });

  it('findSurprise ưu tiên arc TRƯỚC rồi mới tới SURPRISES; resolve đúng cảnh theo choices', () => {
    const arcView = findSurprise(ARCA, [0]);
    expect(arcView?.kind).toBe('arc');
    if (arcView?.kind === 'arc') {
      expect(arcView.scene.id).toBe('mua-2a');
      expect(arcView.choices.length).toBe(2);
      expect(arcView.title).toBe('Mưa rào trước hiên');
    }
    expect(findSurprise(ARCA, [])?.kind).toBe('arc'); // cảnh đầu
    expect(findSurprise(ARCA, [0, 0])).toBeNull(); // kể xong
    const one = findSurprise('hoi_duong');
    expect(one?.kind).toBe('one');
    expect(findSurprise('khong_ton_tai')).toBeNull();
  });

  it('arcSceneAt tất định theo seed + ngày, nằm trong 10h–11h30', () => {
    expect(arcSceneAt(42, 10)).toBe(arcSceneAt(42, 10));
    expect(arcSceneAt(42, 10)).not.toBe(arcSceneAt(43, 10));
    for (let d = 1; d <= 40; d++) {
      const t = arcSceneAt(42, d);
      expect(t).toBeGreaterThanOrEqual(10 * 60);
      expect(t).toBeLessThanOrEqual(11 * 60 + 30);
    }
  });

  it('arcScenePending: chỉ khi arc còn dở, trong hạn và cảnh hôm nay chưa chốt', () => {
    const st = arcState(ARCA, { startedDay: 4, expiresDay: 5 });
    expect(arcScenePending(st, 4)).toBe(true); // ngày 1 arc
    expect(arcScenePending({ ...st, choices: [0] }, 5)).toBe(true); // ngày 2 còn cảnh
    expect(arcScenePending({ ...st, choices: [0, 1] }, 5)).toBe(false); // hôm nay đã chốt
    expect(arcScenePending({ ...st, done: true }, 4)).toBe(false);
    expect(arcScenePending(st, 6)).toBe(false); // quá hạn
    expect(arcScenePending(st, 3)).toBe(false); // chưa mở
  });
});

// ───────────────────── arcAgenda — chip "📖 … còn dở" trên dải GĐ162 ─────────────────────

describe('GĐ164 — arcAgenda: chip chỉ khi cảnh hôm nay chưa chốt', () => {
  it('arc dở + cảnh hôm nay chưa chốt → 1 chip mốc 10h, until 20h, panel morning', () => {
    const items = arcAgenda({ day: 5, arc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [] }) });
    expect(items).toEqual([{
      key: `arc-${ARCA}`,
      atMinutes: 10 * 60,
      untilMinutes: 20 * 60,
      icon: '📖',
      label: 'Mưa rào trước hiên còn dở',
      panel: 'morning',
    }]);
  });

  it('cảnh hôm nay đã chốt / arc done / quá hạn / arc lạ → không chip', () => {
    expect(arcAgenda({ day: 5, arc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [0, 1], step: 2 }) })).toEqual([]);
    expect(arcAgenda({ day: 4, arc: arcState(ARCA, { done: true }) })).toEqual([]);
    expect(arcAgenda({ day: 6, arc: arcState(ARCA) })).toEqual([]);
    expect(arcAgenda({ day: 5, arc: arcState('arc_la', { startedDay: 5, expiresDay: 9 }) })).toEqual([]);
  });

  it('nguồn thứ 8 lọt qua todayAgenda (ghép chung, vẫn lọc theo giờ)', () => {
    const all = todayAgenda({
      minutes: 9 * 60, day: 5, seed: 1, level: 1, regulars: {},
      surpriseArc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [] }),
    });
    expect(all.some((i) => i.key === `arc-${ARCA}`)).toBe(true);
  });
});

// ───────────────────── Core: maybeSurprise mở/phát cảnh arc ─────────────────────

describe('GĐ164 — core: pool trúng arc → mở arc (setSimSeed, quy ước GĐ27/28)', () => {
  beforeEach(reset);

  it('roll trúng id-arc → mở arc (state surpriseArc) thay vì def một-phát; ghi told', () => {
    useGame.setState({ level: 1, day: 3, minutes: 9 * 60 + 30, shopOpen: true, weatherSeed: 42 });
    let openedSeed = -1;
    for (let seed = 1; seed <= 500; seed++) {
      setSimSeed(seed);
      bizPatch({ surprise: null, surpriseDay: 0, surpriseArc: undefined, surpriseArcsTold: [] });
      maybeSurprise(600);
      const s = useGame.getState();
      if (s.biz.surprise?.id.startsWith('arc_')) { openedSeed = seed; break; }
    }
    expect(openedSeed).toBeGreaterThan(0);
    const s = useGame.getState();
    const def = surpriseArcById(s.biz.surprise!.id)!;
    expect(s.biz.surpriseArc).toEqual({
      arcId: def.id, step: 0, choices: [], startedDay: 3, expiresDay: 3 + def.days - 1,
    });
    expect(s.biz.surpriseArcsTold).toEqual([def.id]);
    expect(s.biz.surpriseDay).toBe(3);
    expect(notifyTexts().some((t) => t.includes(`📖 ${def.icon} ${def.title}`))).toBe(true);
  });

  it('arc đang dở: KHÔNG quay pool trước giờ cảnh; đúng giờ tất định phát cảnh giữ tới 20h; 1 cảnh/ngày', () => {
    useGame.setState({ level: 1, day: 5, minutes: 9 * 60, shopOpen: true, weatherSeed: 42 });
    bizPatch({ surpriseArc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [0], step: 1 }) });
    maybeSurprise(660); // trước giờ cảnh (≤11h30) — cả khung 11h cũng không quay pool
    expect(useGame.getState().biz.surprise).toBeNull();
    useGame.setState({ minutes: arcSceneAt(42, 5) });
    maybeSurprise(1);
    let s = useGame.getState();
    expect(s.biz.surprise).toEqual({ id: ARCA, expiresAt: 20 * 60 });
    expect(s.biz.surpriseDay).toBe(5);
    // Cảnh arc KHÔNG tự mất sau 45 phút (khác def một-phát) — chỉ sạch lúc quá 20h
    useGame.setState({ minutes: 19 * 60 });
    maybeSurprise(10);
    expect(useGame.getState().biz.surprise).toEqual({ id: ARCA, expiresAt: 20 * 60 });
    useGame.setState({ minutes: 20 * 60 + 1 });
    maybeSurprise(10);
    expect(useGame.getState().biz.surprise).toBeNull();
    // Cảnh hôm nay đã phát thì ngày đó không phát lần hai (tái dùng surpriseDay)
    s = useGame.getState();
    expect(s.biz.surpriseArc!.choices).toEqual([0]);
  });

  it('lỡ cảnh hôm nay → ngày sau lại phát đúng cảnh chờ, trong expiresDay', () => {
    useGame.setState({ level: 1, day: 5, minutes: arcSceneAt(42, 5), shopOpen: true, weatherSeed: 42 });
    // Ngày 4 cảnh đầu chưa kịp phát (choices rỗng) → ngày 5 vẫn phát cảnh 'mua-1'
    bizPatch({ surpriseArc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [] }) });
    maybeSurprise(1);
    const s = useGame.getState();
    expect(s.biz.surprise?.id).toBe(ARCA);
    const view = findSurprise(s.biz.surprise!.id, s.biz.surpriseArc!.choices);
    expect(view?.kind).toBe('arc');
    if (view?.kind === 'arc') expect(view.scene.id).toBe('mua-1');
  });

  it('arc quá hạn (day > expiresDay) → khép nhẹ, không phạt, kể cả khi tiệm chưa mở cửa', () => {
    useGame.setState({ level: 1, day: 6, minutes: 8 * 60, shopOpen: false, weatherSeed: 42 });
    bizPatch({ surpriseArc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [0], step: 1 }) });
    maybeSurprise(1);
    const s = useGame.getState();
    expect(s.biz.surpriseArc!.done).toBe(true);
    expect(notifyTexts().some((t) => t.includes('để dở') && t.includes('không sao'))).toBe(true);
  });

  it('arc đang dở → không mở arc thứ hai; pool loại arc đã kể trong told (không lặp)', () => {
    useGame.setState({ level: 1, day: 5, minutes: 9 * 60, shopOpen: true, weatherSeed: 42 });
    bizPatch({ surpriseArc: arcState(ARCA, { startedDay: 4, expiresDay: 5, choices: [0], step: 1 }) });
    maybeSurprise(660);
    expect(useGame.getState().biz.surpriseArc!.arcId).toBe(ARCA);
    expect(useGame.getState().biz.surprise).toBeNull();
    // told ghi sẵn arc A → vài trăm seed lăn lại, không bao giờ trúng arc A nữa
    useGame.setState({ day: 20, minutes: 10 * 60 });
    for (let seed = 1; seed <= 300; seed++) {
      setSimSeed(seed);
      bizPatch({ surprise: null, surpriseDay: 0, surpriseArc: undefined, surpriseArcsTold: [ARCA] });
      maybeSurprise(660);
      const id = useGame.getState().biz.surprise?.id;
      if (id) expect(id, `seed ${seed} trúng arc đã kể`).not.toBe(ARCA);
    }
  });
});

// ───────────────────── Core: chooseSurprise nhánh arc ─────────────────────

describe('GĐ164 — core: chốt cảnh arc', () => {
  beforeEach(reset);

  const activeArc = (arcId: string, choices: number[], day = 5) => {
    const def = surpriseArcById(arcId)!;
    bizPatch({
      surprise: { id: arcId, expiresAt: 20 * 60 },
      surpriseDay: day,
      surpriseArc: arcState(arcId, { startedDay: day - choices.length, expiresDay: day + def.days - 1 - choices.length, choices, step: choices.length }),
    });
  };

  it('cảnh cuối: tiền reward đúng công thức, rating 5 + xp vào sổ, done, surprise sạch', () => {
    useGame.setState({ level: 4, weatherSeed: 42, storage: { ...useGame.getState().storage, gao: 2 } });
    activeArc(ARCA, [0]);
    const s0 = useGame.getState();
    const money0 = s0.money;
    const xp0 = s0.xp;
    const reviews0 = s0.reviews.length;
    chooseSurprise(0); // 🌾 Giữ bao gạo chờ bác (needStock đủ)
    const s = useGame.getState();
    expect(s.biz.surprise).toBeNull();
    expect(s.biz.surpriseArc!.done).toBe(true);
    expect(s.biz.surpriseArc!.choices).toEqual([0, 0]);
    expect(s.biz.surpriseArc!.step).toBe(2);
    expect(s.money).toBe(money0 + 25000 + 1500 * 4 + 5000 * 1); // good = 1 (trà hôm qua)
    expect(s.xp).toBe(xp0 + 15);
    expect(s.reviews.length).toBe(reviews0 + 1);
    expect(s.reviews.at(-1)!.stars).toBe(5);
    expect(notifyTexts().some((t) => t.includes('khép lại') && t.includes('+36.000'))).toBe(true);
  });

  it('lựa chọn needStock khi kho hết → chặn lại, không áp hiệu ứng, không đóng cảnh', () => {
    useGame.setState({ level: 4, weatherSeed: 42, storage: {} });
    activeArc(ARCA, [0]);
    const s0 = useGame.getState();
    chooseSurprise(0); // kho không có gạo
    const s = useGame.getState();
    expect(notifyTexts().some((t) => t.includes('Kho hết Gạo') && t.includes('rồi'))).toBe(true);
    expect(s.money).toBe(s0.money);
    expect(s.biz.surprise).toEqual({ id: ARCA, expiresAt: 20 * 60 });
    expect(s.biz.surpriseArc!.choices).toEqual([0]);
    // Nhập đủ hàng thì chốt được
    useGame.setState({ storage: { gao: 1 } });
    chooseSurprise(0);
    expect(useGame.getState().biz.surpriseArc!.done).toBe(true);
  });

  it('nhánh ngày 2 không phải cảnh cuối: ghi choices + step, arc vẫn dở, không thưởng', () => {
    useGame.setState({ level: 6, weatherSeed: 42, minutes: 10 * 60 });
    activeArc(ARCC, []); // ngày 1
    const minutes0 = useGame.getState().minutes;
    chooseSurprise(0); // 🛶 lội nước (30 phút, good, xp 20)
    const s = useGame.getState();
    expect(s.biz.surpriseArc!.done).toBeUndefined();
    expect(s.biz.surpriseArc!.choices).toEqual([0]);
    expect(s.biz.surpriseArc!.step).toBe(1);
    expect(s.minutes).toBe(minutes0 + 30); // hiệu ứng tức thời của lựa chọn
    expect(notifyTexts().some((t) => t.includes('khép lại'))).toBe(false);
  });

  it('friendship delta áp đúng cơ chế GĐ13 (Bé Na +2 ở cảnh cuối arc C)', () => {
    useGame.setState({
      level: 6,
      weatherSeed: 42,
      regulars: { be_na: { friendship: 3, visits: 0, perks: [], discovered: [] } },
    });
    activeArc(ARCC, [0, 0], 6); // tới cảnh dai-3
    const s0 = useGame.getState();
    chooseSurprise(1); // 🧒 Gọi Bé Na xách nước phụ (−10k, be_na +2)
    const s = useGame.getState();
    expect(s.regulars.be_na.friendship).toBe(5);
    // good = 1 (lội nước ngày 1) → reward 35k + 2k×6 + 5k×1 = 52k; tổng −10k + 52k
    expect(s.money).toBe(s0.money - 10000 + 35000 + 2000 * 6 + 5000 * 1);
    expect(s.biz.surpriseArc!.done).toBe(true);
    expect(notifyTexts().some((t) => t.includes('💛 +2'))).toBe(true);
  });

  it('arc D "Ngại lên hình" → khép sớm NGAY, không ngày 2, không thưởng', () => {
    useGame.setState({ level: 10, weatherSeed: 42 });
    activeArc(ARCD, [], 5);
    const s0 = useGame.getState();
    chooseSurprise(1); // 😅 Ngại lên hình
    const s = useGame.getState();
    expect(s.biz.surpriseArc!.done).toBe(true);
    expect(s.biz.surpriseArc!.choices).toEqual([1]);
    expect(s.money).toBe(s0.money); // không thưởng
    expect(notifyTexts().some((t) => t.includes('khép lại'))).toBe(false);
    // Ngày sau: arc đã done → không phát cảnh nữa (seed cố định để bước pool tất định)
    useGame.setState({ day: 6, minutes: 8 * 60, shopOpen: true });
    bizPatch({ surprise: null, surpriseDay: 0 });
    maybeSurprise(1);
    useGame.setState({ minutes: 10 * 60 });
    bizPatch({ surprise: null, surpriseDay: 0 });
    setSimSeed(20261028);
    maybeSurprise(1);
    expect(useGame.getState().biz.surprise).toBeNull();
    expect(useGame.getState().biz.surpriseArc!.choices).toEqual([1]);
  });
});

// ───────────────────── Save round-trip (tiền lệ GĐ113) ─────────────────────

describe('GĐ164 — save round-trip', () => {
  beforeEach(reset);

  it('save cũ thiếu surpriseArc/surpriseArcsTold nạp an toàn (biz trong MERGE_DEEP)', () => {
    applySnapshot({ ...snapshot(), biz: { loyalty: { on: true, stamps: 5 } } } as Parameters<typeof applySnapshot>[0]);
    const s = useGame.getState();
    expect(s.biz.surpriseArc).toBeUndefined();
    expect(s.biz.surpriseArcsTold).toBeUndefined();
    expect(s.biz.loyalty.on).toBe(true);
  });

  it('lưu/nạp giữa chừng giữ nguyên step/choices/startedDay/expiresDay và told', () => {
    bizPatch({
      surpriseArc: { arcId: ARCC, step: 1, choices: [2], startedDay: 3, expiresDay: 5 },
      surpriseArcsTold: [ARCA],
    });
    const snap = snapshot();
    applySnapshot(snap);
    const s = useGame.getState();
    expect(s.biz.surpriseArc).toEqual({ arcId: ARCC, step: 1, choices: [2], startedDay: 3, expiresDay: 5 });
    expect(s.biz.surpriseArcsTold).toEqual([ARCA]);
  });
});

// ───────────────────── Sim nhiều ngày (smoke): đi trọn arc A qua 2 ngày ─────────────────────

describe('GĐ164 — smoke nhiều ngày: arc A kể trọn, tổng thu nằm band, không mỏ tiền', () => {
  beforeEach(reset);

  it('ngày 1 mở arc → ngày 2 phát cảnh đúng giờ → chốt: ròng −8k + 36k = +28k ở cấp 4', () => {
    useGame.setState({ level: 4, day: 4, minutes: 9 * 60, shopOpen: true, weatherSeed: 42 });
    // Tìm seed để pool mở arc A ngày 4
    let opened = false;
    for (let seed = 1; seed <= 600 && !opened; seed++) {
      setSimSeed(seed);
      bizPatch({ surprise: null, surpriseDay: 0, surpriseArc: undefined, surpriseArcsTold: [] });
      maybeSurprise(600);
      opened = useGame.getState().biz.surprise?.id === ARCA;
    }
    expect(opened).toBe(true);
    const s0 = useGame.getState().money;
    chooseSurprise(0); // 🍵 Rót trà (−8k, xp 10, good)
    expect(useGame.getState().money).toBe(s0 - 8000);
    expect(useGame.getState().biz.surpriseArc!.choices).toEqual([0]);
    // Qua đêm sang ngày 5 (không qua endDay — arc sống trong biz, ngày được set trực tiếp)
    bizPatch({ surprise: null });
    useGame.setState({ day: 5, minutes: 9 * 60 });
    maybeSurprise(660);
    expect(useGame.getState().biz.surprise).toBeNull(); // chưa tới giờ cảnh
    useGame.setState({ minutes: arcSceneAt(42, 5) });
    maybeSurprise(1);
    expect(useGame.getState().biz.surprise?.id).toBe(ARCA);
    useGame.setState({ storage: { ...useGame.getState().storage, gao: 2 } });
    chooseSurprise(1); // 📞 Hứa mai mối giao tới (xp 5) → cảnh cuối trả thưởng
    const s = useGame.getState();
    expect(s.biz.surpriseArc!.done).toBe(true);
    // reward: 25k + 1.5k×4 + 5k×1 (good: trà) = 36k → ròng +28k ≈ 1.4× def cũ (20k) + rating 5 + xp dồi
    expect(s.money).toBe(s0 - 8000 + 36000);
    // Kể xong không lặp: arc A nằm trong told
    expect(s.biz.surpriseArcsTold).toContain(ARCA);
  });
});
