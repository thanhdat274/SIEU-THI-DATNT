import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { riskTrendSummary, leakTone, riskLiveToday, emptyRiskToday, RISK_TREND_DAYS, type RiskDay } from '../data/risk';
import { staffDayEnd, SKIM_RANGE, type StaffDayCtx } from '../data/staffTraits';
import type { Staff } from '../data/staff';

/** GĐ58 "Tiền bay đi đâu": sổ rủi ro/trộm — thuần quan sát, KHÔNG đổi kinh tế/odds/save (field optional). */

beforeEach(() => useGame.setState(newGameData()));

const rd = (day: number, leak: number, blocked = 0, events = 0): RiskDay => ({ day, leak, blocked, events });

describe('recordTheft / recordCounterfeit (kinh tế không đổi + sổ ghi đúng)', () => {
  it('trộm không bắt: ghi vào leak + events, KHÔNG đổi tiền (vốn mất như trước)', () => {
    const m0 = useGame.getState().money;
    const rev0 = useGame.getState().stats.revenue;
    useGame.getState().recordTheft(15000, false);
    const { riskToday, money, stats } = useGame.getState();
    expect(riskToday).toEqual({ leak: 15000, blocked: 0, events: 1 });
    expect(money).toBe(m0); // không phạt
    expect(stats.revenue).toBe(rev0); // kinh tế không đổi
  });

  it('trộm bị bắt: phạt value×2 cộng tiền, ghi vào blocked + events (kinh tế là phạt như trước)', () => {
    const m0 = useGame.getState().money;
    const rev0 = useGame.getState().stats.revenue;
    useGame.getState().recordTheft(20000, true);
    const { riskToday, money, stats } = useGame.getState();
    expect(riskToday).toEqual({ leak: 0, blocked: 40000, events: 1 }); // fine ×2
    expect(money).toBe(m0 + 40000);
    expect(stats.revenue).toBe(rev0 + 40000); // phạt vẫn tính như trước, chỉ thêm sổ
  });

  it('tiền giả không phát hiện: leak += note + fakeCash++ giữ nguyên, money −note', () => {
    const m0 = useGame.getState().money;
    useGame.getState().recordCounterfeit(100000, false);
    const { riskToday, money, fakeCash } = useGame.getState();
    expect(riskToday).toEqual({ leak: 100000, blocked: 0, events: 1 });
    expect(money).toBe(m0 - 100000);
    expect(fakeCash).toBe(100000); // fakeCash vẫn ++ như trước (leak ≡ fakeCash)
  });

  it('tiền giả phát hiện: blocked += note, money/fakeCash KHÔNG đổi', () => {
    const m0 = useGame.getState().money;
    useGame.getState().recordCounterfeit(50000, true);
    const { riskToday, money, fakeCash } = useGame.getState();
    expect(riskToday).toEqual({ leak: 0, blocked: 50000, events: 1 });
    expect(money).toBe(m0); // không mất
    expect(fakeCash).toBe(0); // không tính vào két
  });
});

describe('staffDayEnd — caught ghi blocked, không đổi leak path', () => {
  const cashier = (trait: 'sticky' | 'steady'): Staff => ({ id: 1, name: 'Minh', role: 'cashier', skill: 3, wage: 100000, shift: 'morning', trait });
  const ctx = (rng: () => number, storage = {}): StaffDayCtx => ({ revenue: 1_000_000, storage, hasCamera: false, hasManager: false, rng });

  it('người tắt mắt thu ngân BỊ BẮT: ghi blockedCash số sẽ-lấy, KHÔNG ghi vào leek (cashLoss=0)', () => {
    const crew = staffDayEnd([cashier('sticky')], ctx(() => 0)); // rng 0 → chắc bị bắt (0 < chance)
    expect(crew.caught).toContain('Minh');
    const skim = Math.round(1_000_000 * SKIM_RANGE[0] / 1000) * 1000; // rng 0 → đầu SKIM_RANGE
    expect(crew.blockedCash).toBe(skim); // thay vì vứt → ghi là "chặn/thu lại"
    expect(crew.cashLoss).toBe(0); // không lọt thật
    expect(crew.blockedGoods).toEqual({});
    expect(crew.goodsTaken).toEqual({});
  });

  it('người tắt mắt KHÔNG BỊ BẮT: leak path giữ nguyên (cashLoss), blocked = 0', () => {
    const crew = staffDayEnd([cashier('sticky')], ctx(() => 0.5)); // rng 0.5 → không bị bắt (0.5 ≥ chance)
    expect(crew.caught.length).toBe(0);
    const cash = Math.round(1_000_000 * (SKIM_RANGE[0] + 0.5 * (SKIM_RANGE[1] - SKIM_RANGE[0])) / 1000) * 1000;
    expect(crew.cashLoss).toBe(cash);
    expect(crew.goodsTaken).toEqual({});
    expect(crew.blockedCash).toBe(0);
    expect(crew.blockedGoods).toEqual({});
  });

  it('người tắt mắt lấy HÀNG bị bắt: ghi blockedGoods số món sẽ-lấy, goodsTaken (leak) rỗng', () => {
    const stocker: Staff = { id: 2, name: 'Lan', role: 'stocker', skill: 3, wage: 90000, shift: 'morning', trait: 'sticky' };
    const crew = staffDayEnd([stocker], ctx(() => 0, { bia: 10, nuoc: 10 }));
    expect(crew.caught).toContain('Lan');
    expect(crew.blockedGoods.bia).toBeGreaterThan(0); // số món đáng lẽ lấy → ghi "chặn"
    expect(crew.goodsTaken.bia ?? 0).toBe(0); // không lọt thật
    expect(crew.blockedCash).toBe(0);
  });

  it('người lương thiện: không bắt, không lọt, không blocked', () => {
    const crew = staffDayEnd([cashier('steady')], ctx(() => 0));
    expect(crew.caught.length).toBe(0);
    expect(crew.cashLoss).toBe(0);
    expect(crew.blockedCash).toBe(0);
    expect(crew.blockedGoods).toEqual({});
  });
});

describe('riskTrendSummary (nửa gần vs nửa trước, dir ≥3%, week, rỗng→0)', () => {
  it('rỗng → toàn 0 / flat', () => {
    const s = riskTrendSummary([]);
    expect(s).toMatchObject({ leakLast: 0, leakEarly: 0, leakDelta: 0, leakPct: 0, leakDir: 'flat', weekLeak: 0, weekBlocked: 0, events: 0, days: 0 });
  });

  it('tăng rõ (>3%): dir up, leakLast > leakEarly, weekLeak = 7 ngày gần', () => {
    const rv = [...Array(14)].map((_, i) => rd(i + 1, i < 7 ? 100 : 150, 50, 1)); // trước 100 ×7, sau 150 ×7
    const s = riskTrendSummary(rv);
    expect(s.days).toBe(14);
    expect(s.leakEarly).toBe(700);
    expect(s.leakLast).toBe(1050);
    expect(s.leakDelta).toBe(350);
    expect(s.leakPct).toBe(50);
    expect(s.leakDir).toBe('up');
    expect(s.weekLeak).toBe(1050); // 7 ngày gần nhất
    expect(s.weekBlocked).toBe(350);
  });

  it('dao động nhỏ (≤3%) → flat, không báo lên/xuống', () => {
    // 14 ngày: 7 đầu = 100, 7 sau = 101 → chênh ~1% < 3% → flat
    const rv = [...Array(14)].map((_, i) => rd(i + 1, i < 7 ? 100 : 101, 0, 0));
    const s = riskTrendSummary(rv);
    expect(s.leakDir).toBe('flat');
    expect(s.leakDelta).toBe(7); // 707 − 700
  });

  it('lọt vài ngày: nửa gần = 7 ngày cuối, nửa trước = 7 ngày trước đó (không nhầm cả chuỗi)', () => {
    // 14 ngày: 7 đầu = 10, 7 sau = 5 → giảm; leakEarly/leakLast tính đúng theo từng nửa 7 ngày
    const rv = [...Array(14)].map((_, i) => rd(i + 1, i < 7 ? 10 : 5, 0, 1));
    const s = riskTrendSummary(rv);
    expect(s.days).toBe(14);
    expect(s.leakEarly).toBe(70); // 7 × 10
    expect(s.leakLast).toBe(35); // 7 × 5
    expect(s.weekLeak).toBe(35); // = nửa gần (7 ngày cuối)
    expect(s.leakDir).toBe('down');
  });

  it('helper thuần: cùng đầu vào cho kết quả giống hệt', () => {
    const rv = [...Array(10)].map((_, i) => rd(i + 1, 50 + i * 10));
    expect(riskTrendSummary(rv)).toEqual(riskTrendSummary(rv));
  });
});

describe('leakTone (ngưỡng 0/1/3/5% doanh thu)', () => {
  const REV = 1_000_000;
  it('0% → ok; 1% (biên, không quá 1%) → ok', () => {
    expect(leakTone(0, REV)).toBe('ok');
    expect(leakTone(10_000, REV)).toBe('ok'); // đúng 1%
  });
  it('3% → warn (không quá 3%)', () => {
    expect(leakTone(30_000, REV)).toBe('warn'); // đúng 3%
    expect(leakTone(20_000, REV)).toBe('warn'); // 2%
  });
  it('>3% (5%) → bad', () => {
    expect(leakTone(50_000, REV)).toBe('bad');
  });
  it('không doanh thu → ok (không đánh giá)', () => {
    expect(leakTone(1000, 0)).toBe('ok');
  });
  it('riskLiveToday gom đúng 3 con số (kể cả thiếu field)', () => {
    expect(riskLiveToday({ leak: 5, blocked: 3, events: 2 })).toEqual({ leak: 5, blocked: 3, events: 2 });
    expect(riskLiveToday(emptyRiskToday())).toEqual({ leak: 0, blocked: 0, events: 0 });
  });
});

describe('endDay — gộp riskToday → riskTrend (append+slice), reset riskToday', () => {
  it('sleep() gộp riskToday trong ngày vào riskTrend, reset riskToday về rỗng', () => {
    const day0 = useGame.getState().day;
    useGame.setState({ day: day0, minutes: 19 * 60, riskToday: { leak: 120000, blocked: 60000, events: 3 } });
    expect(useGame.getState().sleep()).toBe(true);
    const s = useGame.getState();
    expect(s.riskToday).toEqual(emptyRiskToday()); // reset
    const last = s.riskTrend[s.riskTrend.length - 1];
    expect(last).toEqual({ day: day0 + 1, leak: 120000, blocked: 60000, events: 3 }); // fair copy đã fold
    expect(s.day).toBe(day0 + 1);
  });

  it('cửa sổ lăn: giữ tối đa RISK_TREND_DAYS (slice −14) và vẫn thêm ngày mới', () => {
    const day0 = useGame.getState().day;
    const prime: RiskDay[] = [...Array(RISK_TREND_DAYS + 1)].map((_, i) => rd(day0 - RISK_TREND_DAYS + i, 100, 0, 1));
    useGame.setState({ day: day0, minutes: 19 * 60, riskToday: { leak: 5000, blocked: 0, events: 1 }, riskTrend: prime });
    useGame.getState().sleep();
    const s = useGame.getState();
    expect(s.riskTrend.length).toBe(RISK_TREND_DAYS); // 15 → 14
    expect(s.riskTrend[s.riskTrend.length - 1].leak).toBe(5000); // ngày mới đã gộp vào
    expect(s.riskTrend[0].day).toBe(day0 - RISK_TREND_DAYS + 2); // bỏ ngày cũ nhất
  });
});

describe('save-safe (field optional, MERGE_DEEP backfill, round-trip)', () => {
  it('applySnapshot thiếu riskToday/riskTrend → tự bù mặc định (van cũ lên)', () => {
    const raw = { ...newGameData() };
    delete (raw as Record<string, unknown>).riskToday;
    delete (raw as Record<string, unknown>).riskTrend;
    applySnapshot(raw);
    expect(useGame.getState().riskToday).toEqual(emptyRiskToday());
    expect(useGame.getState().riskTrend).toEqual([]);
  });

  it('round-trip snapshot → applySnapshot giữ nguyên riskToday/riskTrend', () => {
    useGame.setState({ riskToday: { leak: 5, blocked: 3, events: 2 }, riskTrend: [{ day: 9, leak: 5, blocked: 3, events: 2 }] });
    const snap = snapshot();
    applySnapshot(snap);
    expect(useGame.getState().riskToday).toEqual({ leak: 5, blocked: 3, events: 2 });
    expect(useGame.getState().riskTrend).toEqual([{ day: 9, leak: 5, blocked: 3, events: 2 }]);
  });

  it('RISK_TREND_DAYS = 14 đúng mặc định', () => {
    expect(RISK_TREND_DAYS).toBe(14);
  });
});
