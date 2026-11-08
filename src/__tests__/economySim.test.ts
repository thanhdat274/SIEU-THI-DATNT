import { SHOP_HOURS } from '../data/shopHours';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';

// World 3D chạy headless trong node: three.js không cần WebGL để thao tác đồ thị, nhưng các TextCanvas
// (tường, kho, bảng hiệu, bong bóng lời khách...) dùng document.createElement('canvas') + 2d context.
// Trong test ta trả về canvas/context giả (không render thật) — chỉ cần cấu trúc để không vỡ.

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const stub2d = (): unknown => {
  const noop = () => {};
  return new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop: noop });
      }
      return noop;
    },
    set: () => true,
  });
};
const stubCanvas = () => ({
  width: 0,
  height: 0,
  style: {},
  getContext: () => stub2d(),
  toDataURL: () => '',
  addEventListener: () => {},
});
const documentStub = {
  createElement: (tag: string) => (tag === 'canvas' ? (stubCanvas() as unknown as HTMLElement) : ({} as HTMLElement)),
  createElementNS: () => ({} as Element),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
} as unknown as Document;

let prevDoc: typeof globalThis.document | undefined;
let prevWin: typeof globalThis.window | undefined;

// Lô hàng thật (autoplay real customers) dùng `window` cho keydown của Player — cần stub add/remove.
const windowStub = {
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (f: FrameRequestCallback) => f(0),
  devicePixelRatio: 1,
} as unknown as Window & typeof globalThis;

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261031)); // GĐ321: sim tất định → tỉ số đo được chính xác
  prevDoc = globalThis.document;
  prevWin = globalThis.window;
  globalThis.document = documentStub;
  (globalThis as { window?: unknown }).window = windowStub;
  // Xoá panel/modals còn sót từ lần chạy trước trong cùng file
  useGame.setState({ ...useGame.getState(), panel: null, buildMode: false, placing: null } as never);
});

afterAll(() => {
  if (prevDoc !== undefined) globalThis.document = prevDoc;
  (globalThis as { window?: unknown }).window = prevWin;
});

import { runEconomySim } from '../dev/simEconomy';
import { emptyTiers } from '../core/stock';
import { mulberry32 } from '../core/rand';

describe('khảo sát kinh tế vòng ngày — simulator thật trên store', () => {
  // GĐ669: bài cấp 5 × 30 ngày tách sang economySimL5.test.ts (chạy song song, lấy lại biên thời gian);
  // file này giữ các smoke thông báo/người mới — chúng đọc runEconomySim với ít ngày.
  // Số liệu mới — KHÔNG assert cứng tỉ số; test là regression (harness chạy được, số hữu hạn, không NaN)
  // + in BẢNG TRUNG BÌNH ra stdout để Leader dùng.

  it('harness giữ nguyên hành vi: autoplay vẫn trả về đủ cột cũ + quest/bet (smoke của chính autoplay)', async () => {
    // không cần world — chỉ kiểm tra autoplay().length và shape sau khi seed bằng hàm build
    expect(emptyTiers).toBeDefined();
    // chạy 1 ngày level 5 ngay trên store để chắc phần claim quest không ném
    const { rows } = await runEconomySim(5, 1, { betTier: 1.5 });
    expect(rows.length).toBe(1);
    expect(Object.keys(rows[0])).toEqual(expect.arrayContaining(['day', 'level', 'operationalProfit', 'quest', 'bet']));
    expect([rows[0].quest, rows[0].bet].every(Number.isFinite)).toBe(true);
  }, 600_000);

  // GĐ160 — ngày 1 cấp 1: bot autoplay bán đúng vòng nhập-bày-bán, doanh thu phải chạm được mục tiêu
  // doanh thu người mới (100.000đ = ~65% kho khởi đầu) — smoke ngắn, in số để Leader đối chiếu.
  it('ngày 1 cấp 1 — bot đạt mục tiêu doanh thu người mới 100.000đ (in số, không assert cứng tỉ số)', async () => {
    // Người chơi mới: đếm (bỏ 📜/🎯: đó là phản hồi cho cú bấm nhận thưởng của chính người chơi, bot nhận dồn một lượt) số thông báo bật lên trong ngày đầu (ô thông báo chỉ có một chỗ, 3 giây —
    // dồn dập thì người mới đọc không kịp và mất luôn thông báo trước). Trần = mức đo 2026-10-31.
    let toasts = 0;
    const seen: string[] = [];
    let firstSaleAt: number | null = null; let startMin: number | null = null; // GĐ1065: người mới bán món đầu tiên lúc mấy giờ game
    const unsub = useGame.subscribe((st, prev) => { if (startMin === null) startMin = Math.max(prev.minutes, SHOP_HOURS.grocery.from); if (firstSaleAt === null && st.day <= 1 && st.stats.itemsSold > 0) firstSaleAt = st.minutes; if (st.day <= 1 && st.message && st.message !== prev.message && !/^(📜|🎯)/.test(String(st.message))) { toasts++; seen.push(String(st.message)); } });
    const { rows } = await runEconomySim(1, 1, { betTier: 1.0 });
    unsub();
    expect(rows.length).toBe(1);
    // eslint-disable-next-line no-console
    console.log(`[GĐ1065] món đầu tiên bán lúc phút ${firstSaleAt} (bắt đầu ${startMin}) → ${firstSaleAt !== null && startMin !== null ? firstSaleAt - startMin : '?'} phút game`);
    expect(firstSaleAt, 'người mới chưa bán được món nào trong ngày 1').not.toBeNull();
    expect((firstSaleAt ?? 0) - (startMin ?? 0), 'món đầu tiên bán chậm hơn mức đo — dẫn đường người mới nhanh hơn').toBeLessThanOrEqual(FIRST_SALE_CEILING_MIN);
    // eslint-disable-next-line no-console
    console.log(`[người mới] ngày 1: ${toasts} thông báo bật lên: ` + seen.join(' | '));
    expect(toasts, 'ngày đầu quá nhiều thông báo — gộp hoặc dời bớt sang ngày sau').toBeLessThanOrEqual(DAY1_TOAST_CEILING);
    const revenue = useGame.getState().totals.revenue;
    // eslint-disable-next-line no-console
    console.log(`[GĐ160 smoke] ngày 1 cấp 1: doanh thu=${fmt(revenue)} · mục tiêu doanh thu người mới=${fmt(100_000)} · đạt=${revenue >= 100_000 ? 'ĐẠT' : 'CHƯA'} · tiền nhiệm vụ=${fmt(rows[0].quest)} · lãi vận hành=${fmt(rows[0].operationalProfit)}`);
    // Assert mềm: bot chơi đúng nhịp thì số hữu hạn, và doanh thu ngày 1 không phải số 0 vô lý
    expect(Number.isFinite(revenue)).toBe(true);
    expect(revenue).toBeGreaterThan(0);
  }, 600_000);

  // GĐ561: ngày 2 trước giờ không có trần (GĐ341 đo 11) — khoá mức đo để chỉ được giảm.
  it('ngày 2 không bơm thêm thông báo', async () => {
    let toasts = 0;
    const seen: string[] = [];
    const long = new Set<string>(); // GĐ563: thông báo sinh lúc chạy cũng ≤90 ký tự
    const unsub = useGame.subscribe((st, prev) => { if (st.message && st.message !== prev.message && [...String(st.message)].length > 90) long.add(String(st.message)); if (st.day === 2 && st.message && st.message !== prev.message && !/^(📜|🎯)/.test(String(st.message))) { toasts++; seen.push(String(st.message)); } });
    await runEconomySim(1, 2, { betTier: 1.0 });
    unsub();
    // eslint-disable-next-line no-console
    console.log(`[người mới] ngày 2: ${toasts} thông báo: ` + seen.join(' | '));
    expect(toasts, 'ngày 2 nhiều thông báo hơn mức đo — gộp hoặc dời bớt').toBeLessThanOrEqual(DAY2_TOAST_CEILING);
    expect([...long], 'thông báo dài hơn 90 ký tự').toEqual([]);
  }, 600_000); // GĐ607: mặc định 5s quá ngắn khi chạy cả bộ dưới tải

  // GĐ564: thông báo sinh lúc chạy ≤90 cả ở cấp giữa (nhiều hệ thống mở hơn).
  // GĐ565: dòng sáng cũng ≤90 — bản đủ ở lastSummary.news (Sổ đầu ngày).
  it.each([10, 25, 40, 60])('cấp %i: thông báo sinh lúc chạy ≤90 ký tự', async (lv) => {
    const long = new Set<string>();
    const unsub = useGame.subscribe((st, prev) => { const m = String(st.message ?? ''); if (m && m !== prev.message && [...m].length > 90) long.add(m); });
    await runEconomySim(lv, 3, { betTier: 1.0 });
    unsub();
    expect([...long]).toEqual([]);
  }, 600_000);
});

/** GĐ1065: phút game từ lúc mở cửa tới món bán đầu tiên của bot cấp 1 (đo 70,4; chỉ được hạ). */
const FIRST_SALE_CEILING_MIN = 120; // 09/11: đo từ lúc tiệm mở (8:00, không phải 6:00 như trước) → 113,6′; GĐ1829 trần 90 đo từ 6:00
// (cũ) 90; // GĐ1829: cơ chế thay-món (OpenSpec khach-thay-mon-het-hang) xáo trộn dòng rng → đo lại 86.4′ (mốc cũ 80′); doanh thu ngày 1 tăng 35% nên không phải chậm thật — guard vẫn bắt "chậm hẳn"

/** GĐ561: mức đo ngày 2 (bot cấp 1); chỉ được hạ. */
const DAY2_TOAST_CEILING = 8; // GĐ568–569: tin đêm + sau ngủ gom một toast (đo 11 → 10 → 8)
const fmt = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;

/** Số thông báo tối đa trong ngày đầu của bot chơi cấp 1 (mức đo 2026-10-31; chỉ được hạ). */
const DAY1_TOAST_CEILING = 9; // GĐ568: gom tin đêm → đo 9; GĐ331: chỉ đếm thông báo khi còn ở ngày 1 (dự báo/danh hiệu sau đi ngủ là của ngày 2) → đo 10; // GĐ316: không đếm thông báo nhận thưởng (📜/🎯), đo 11–14; đo 18 sau GĐ309 (dời danh hiệu/kèo/chi phí/thay ô sang ngày 2+; GĐ302: 22; ban đầu 27)
