import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { STANCE_SWITCH_BASE_COST, STANCE_UNLOCK, type StanceId } from '../data/stance';

// Hệ 3 L6 (SPEC §3.4/§3.9) — ĐỔI BIỂN MẤT TIỀN + CỔNG CẤP.
// Lần treo biển đầu MIỄN PHÍ. Đổi hướng trả 5tr × bậc hiện tại, làm biển lại 14 ngày (switchUntil), bậc về 0.
// Không đủ tiền → từ chối, giữ biển + tiền. Gỡ biển miễn phí.
// (Bỏ phiếu co-op cho đổi biển nằm trong coop.ts installStanceVote — chỉ chạy khi ở hẻm online, khó test
// headless vì coop.ts import three.js; được phủ bằng typecheck + wiring trong coop.ts.)

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const stub2d = (): unknown => new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'measureText') return () => ({ width: 0 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop: () => {} });
    return () => {};
  },
  set: () => true,
});

beforeEach(() => {
  globalThis.document = {
    createElement: (tag: string) => (tag === 'canvas'
      ? { width: 0, height: 0, style: {}, getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {} }
      : {}) as unknown as HTMLElement,
    createElementNS: () => ({} as Element),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  } as unknown as Document;
  (globalThis as { window?: unknown }).window = {
    addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: (f: FrameRequestCallback) => f(0), devicePixelRatio: 1,
  };
});

/** Đặt tiệm cấp ≥ cổng, túi tiền, biển hiện tại (nếu có) rồi trả state đã đặt. */
function setUp(level: number, money: number, stance?: { id: StanceId; since: number; fitDays: number; missStreak: number }) {
  const s = useGame.getState();
  useGame.setState({ level, money, biz: { ...s.biz, stance } } as never);
  return useGame.getState();
}

describe('Hệ3-L6 — đổi biển mất tiền (5tr × bậc), treo đầu miễn phí, cổng cấp', () => {
  it('treo biển ĐẦU TIÊN miễn phí (không mất tiền) ở cấp ≥ 60', () => {
    const pre = setUp(60, 1_000_000_000);
    useGame.getState().chooseStance('binh_dan');
    const st = useGame.getState();
    expect(st.biz.stance?.id).toBe('binh_dan');
    expect(st.biz.stance?.switchUntil).toBeUndefined(); // treo mới — không làm lại biển
    expect(st.money).toBe(pre.money); // không mất tiền
  });

  it('cấp < cổng (60) không treo được, không mất tiền', () => {
    const pre = setUp(30, 1_000_000_000);
    useGame.getState().chooseStance('binh_dan');
    const st = useGame.getState();
    expect(st.biz.stance).toBeUndefined();
    expect(st.money).toBe(pre.money);
  });

  it('đổi hướng: trả 5tr × bậc hiện tại + làm biển lại 14 ngày (switchUntil), bậc về 0', () => {
    const s = setUp(60, 100_000_000, { id: 'binh_dan', since: 1, fitDays: 21, missStreak: 0 }); // bậc 3
    useGame.getState().chooseStance('dac_san');
    const st = useGame.getState();
    expect(st.money).toBe(100_000_000 - STANCE_SWITCH_BASE_COST * 3);
    expect(st.biz.stance?.id).toBe('dac_san');
    expect(st.biz.stance?.fitDays).toBe(0);
    expect(st.biz.stance?.switchUntil).toBe(s.day + 14);
  });

  it('bậc 0 (chưa có bậc) đổi hướng MIỄN PHÍ (5tr × 0)', () => {
    setUp(60, 100_000_000, { id: 'binh_dan', since: 1, fitDays: 0, missStreak: 0 }); // bậc 0
    useGame.getState().chooseStance('tien_loi');
    const st = useGame.getState();
    expect(st.money).toBe(100_000_000);
    expect(st.biz.stance?.id).toBe('tien_loi');
  });

  it('không đủ tiền đổi → từ chối, giữ biển + tiền', () => {
    setUp(60, 1_000_000, { id: 'binh_dan', since: 1, fitDays: 35, missStreak: 0 }); // bậc 4 → cần 20tr
    useGame.getState().chooseStance('tien_loi');
    const st = useGame.getState();
    expect(st.money).toBe(1_000_000);
    expect(st.biz.stance?.id).toBe('binh_dan'); // không đổi
  });

  it('treo đúng hướng đang treo → không mất tiền', () => {
    setUp(60, 100_000_000, { id: 'binh_dan', since: 1, fitDays: 21, missStreak: 0 });
    useGame.getState().chooseStance('binh_dan');
    const st = useGame.getState();
    expect(st.money).toBe(100_000_000);
    expect(st.biz.stance?.id).toBe('binh_dan');
  });

  it('gỡ biển miễn phí; không treo thì gỡ không làm gì', () => {
    setUp(60, 100_000_000, { id: 'dac_san', since: 1, fitDays: 21, missStreak: 0 });
    useGame.getState().dropStance();
    expect(useGame.getState().biz.stance).toBeUndefined();
    expect(useGame.getState().money).toBe(100_000_000);

    // chưa treo → gỡ không đổi gì, nhất quán
    useGame.getState().dropStance();
    expect(useGame.getState().biz.stance).toBeUndefined();
  });

  it('hằng số đổi biển đúng SPEC §3.4: 5tr × bậc', () => {
    expect(STANCE_SWITCH_BASE_COST).toBe(5_000_000);
    expect(STANCE_UNLOCK).toBe(60);
  });

  it('đủ 3 ấn → treo biển PHỤ thứ hai MIỄN PHÍ; chưa đủ 3 ấn thì vẫn đổi biển chính mất tiền (Hệ3-L8)', () => {
    setUp(60, 100_000_000, { id: 'binh_dan', since: 1, fitDays: 21, missStreak: 0 }); // bậc 3
    useGame.setState({
      biz: { ...useGame.getState().biz, prestige: { level: 3, bonus: 0.24, goalsClaimed: [], seals: ['binh_dan', 'dac_san', 'tien_loi'] } },
    } as never);
    useGame.getState().chooseStance('tien_loi');
    const st = useGame.getState();
    expect(st.biz.stance?.id).toBe('binh_dan'); // biển chính không bị đổi thành thêm biển phụ
    expect(st.biz.stance2?.id).toBe('tien_loi'); // biển phụ treo thêm
    expect(st.money).toBe(100_000_000); // miễn phí
  });
});
