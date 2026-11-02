import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Cả file dựng store co-op nặng: khi chạy chung 316 file, giới hạn 5 s mặc định thi thoảng vỡ (khác test mỗi lượt).
vi.setConfig({ testTimeout: 60_000 });

/**
 * Phía trình duyệt của hẻm online (net/coop.ts) — phần quyết định chơi online có ra KẾT QUẢ GIỐNG chơi
 * đơn hay không. Trước đây không có test nào (chỉ có test phân loại thao tác + test server).
 * Mỗi test nạp lại module (một máy = một vai: máy chạy hoặc máy khách), giả WebSocket, đưa vào đúng các
 * tin nhắn server gửi rồi kiểm tra cái người chơi gặp.
 */

vi.mock('../net/firebase', () => ({ idToken: async () => 'tok' }));

const g = globalThis as unknown as Record<string, unknown>;
g.window = { addEventListener: () => {} };
// Nhân vật của người khác trong hẻm (Walker) vẽ nhãn tên bằng canvas 2D: canvas giả như các test world 3D
const stub2d = (): unknown => new Proxy({}, {
  get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 0 })
    : prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern' ? () => ({ addColorStop: () => {} })
    : () => {}),
  set: () => true,
});
g.document = {
  addEventListener: () => {}, visibilityState: 'visible', body: { classList: { toggle: () => {} } },
  createElement: (tag: string) => (tag === 'canvas'
    ? { width: 0, height: 0, style: {}, getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {} }
    : {}),
  createElementNS: () => ({}), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
};
g.location = { search: '', href: 'http://localhost/', reload: () => {} };

type Sent = Record<string, unknown> & { type: string };
let sent: Sent[] = [];
class FakeWS {
  static OPEN = 1;
  static last: FakeWS;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor() { FakeWS.last = this; }
  send(s: string) { sent.push(JSON.parse(s)); }
  close() {}
}
g.WebSocket = FakeWS;

type Store = typeof import('../core/store');
type Coop = typeof import('../net/coop');
type Ask = typeof import('../core/counterAsk');
let store: Store;
let coop: Coop;
let ask: Ask;
const recv = (msg: object) => FakeWS.last.onmessage!({ data: JSON.stringify(msg) });
const ofType = (t: string) => sent.filter((m) => m.type === t);
const acts = () => ofType('act') as unknown as { name: string; args: unknown[]; seq?: number }[];

const PEERS = [{ id: 1, name: 'An' }, { id: 2, name: 'Bình' }, { id: 3, name: 'Chi' }];

/** Vào hẻm với vai `role`. Máy khách nhận gói state đầu tiên `first` (mặc định: ván mới ngày 5). */
async function join(role: 'runner' | 'player', first?: Record<string, unknown>) {
  vi.resetModules();
  sent = [];
  store = await import('../core/store');
  ask = await import('../core/counterAsk');
  coop = await import('../net/coop');
  store.useGame.setState(store.newGameData());
  coop.initCoop({ scene: { add() {}, remove() {} } as never, player: { mesh: { position: { x: 0, z: 0 }, rotation: { y: 0 } } as never }, actors: () => [], resetSim: () => {} });
  const entered = coop.enterAlley('ABC');
  recv({ type: 'welcome', selfId: role === 'runner' ? 1 : 2, room: 0, role, alley: { id: 'ABC', name: 'Hẻm' }, peers: PEERS, data: null });
  if (role === 'player') recv({ type: 'state', game: first ?? { ...stateOf(store.newGameData()), day: 5 }, actors: [] });
  await entered;
  sent = [];
}
/** Chỉ phần dữ liệu (bỏ hàm) — như máy chạy gửi. */
const stateOf = (s: object) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function'));

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => vi.useRealTimers());

describe('máy khách: thao tác được máy chạy làm thay', () => {
  it('bấm thao tác: KHÔNG chạy tại chỗ (không lệch số), gửi đúng tên + tham số cho máy chạy', async () => {
    await join('player');
    const before = store.useGame.getState().money;
    store.useGame.getState().setPrice('mi', 9000);
    expect(store.useGame.getState().money).toBe(before);
    expect(store.useGame.getState().prices.mi).toBeUndefined(); // chưa đổi tới khi máy chạy gửi state
    expect(acts()).toEqual([expect.objectContaining({ name: 'setPrice', args: ['mi', 9000] })]);
  });

  it('bấm lặp lúc kết quả chưa về: gửi 1 lần (chống mua 2 lần); riêng lau nhà (giữ phím) gửi đủ', async () => {
    await join('player');
    const s = store.useGame.getState();
    s.buy('mi', 10);
    s.buy('mi', 10);
    s.addDirt(-5);
    s.addDirt(-5);
    s.addDirt(-5);
    expect(acts().filter((a) => a.name === 'buy')).toHaveLength(1);
    expect(acts().filter((a) => a.name === 'addDirt')).toHaveLength(3);
  });

  it('kết quả về rồi thì bấm lại được (không kẹt sau lần đầu)', async () => {
    await join('player');
    store.useGame.getState().buy('mi', 10);
    recv({ type: 'result', seq: acts()[0].seq, ok: true, messages: [] });
    store.useGame.getState().buy('mi', 10);
    expect(acts().filter((a) => a.name === 'buy')).toHaveLength(2);
  });

  it('lời nhắn của thao tác (vd. thất bại) hiện trên máy người bấm; thất bại không lời thì báo chung', async () => {
    await join('player');
    store.useGame.getState().buy('mi', 10);
    recv({ type: 'result', seq: acts()[0].seq, ok: false, messages: ['❌ Không đủ tiền'] });
    expect(store.useGame.getState().message).toBe('❌ Không đủ tiền');
    store.useGame.getState().buy('mi', 20);
    recv({ type: 'result', seq: acts()[1].seq, ok: false, messages: [] });
    expect(store.useGame.getState().message).toContain('không thực hiện được');
  });

  it('lastActionResult: UI chờ được kết quả THẬT (xoá giỏ hàng chỉ khi đặt được)', async () => {
    await join('player');
    expect(store.useGame.getState().placeOrder('cho', { mi: 10 })).toBe(true); // giá trị tạm
    const r1 = coop.lastActionResult();
    recv({ type: 'result', seq: acts()[0].seq, ok: false, messages: ['Thiếu tiền'] });
    await expect(r1).resolves.toBe(false);
    store.useGame.getState().placeOrder('cho', { mi: 20 });
    const r2 = coop.lastActionResult();
    recv({ type: 'result', seq: acts()[1].seq, ok: true, messages: [] });
    await expect(r2).resolves.toBe(true);
  });

  it('lastActionResult: mất gói (quá 4 giây không có kết quả) → false, không treo mãi', async () => {
    vi.useFakeTimers();
    await join('player');
    store.useGame.getState().placeOrder('cho', { mi: 10 });
    const r = coop.lastActionResult();
    vi.advanceTimersByTime(4100);
    await expect(r).resolves.toBe(false);
  });

  it('chơi đơn (không ở hẻm): lastActionResult luôn true ngay', async () => {
    vi.resetModules();
    coop = await import('../net/coop');
    await expect(coop.lastActionResult()).resolves.toBe(true);
  });
});

describe('máy khách: chỉnh trực tiếp trạng thái (PATCH)', () => {
  it('bật/tắt tuỳ chọn chung (autoSwap) → gửi PATCH đúng trường đó', async () => {
    await join('player');
    const next = !store.useGame.getState().autoSwap;
    store.useGame.setState({ autoSwap: next });
    expect(acts()).toEqual([expect.objectContaining({ name: '__patch', args: [{ autoSwap: next }] })]);
  });

  it('trạng thái riêng từng máy (panel, buildMode) và trường máy chạy tự tính (atBranch, location) KHÔNG gửi', async () => {
    await join('player');
    store.useGame.setState({ panel: { type: 'shop' } as never, buildMode: true });
    store.useGame.setState({ atBranch: true, location: 'Tạp hóa' });
    expect(acts().filter((a) => a.name === '__patch')).toEqual([]);
  });

  it('nhận gói state từ máy chạy: KHÔNG gửi ngược lại thành PATCH (không vòng lặp giành nhau)', async () => {
    await join('player');
    recv({ type: 'state', game: { money: 123_456, atBranch: true, day: 9 }, actors: [] });
    expect(store.useGame.getState().money).toBe(123_456);
    expect(store.useGame.getState().atBranch).toBe(true);
    expect(acts()).toEqual([]);
  });
});

describe('máy chạy: làm thao tác của người khác', () => {
  it('thao tác của máy khách chạy thật trên máy chạy; lời nhắn gửi riêng cho người bấm, không hiện ở máy chạy', async () => {
    await join('runner');
    store.useGame.setState({ minutes: 9 * 60, message: null });
    recv({ type: 'act', from: 2, seq: 7, name: 'sleep', args: [] }); // 9h sáng: chưa ngủ được
    const res = ofType('result')[0];
    expect(res).toMatchObject({ to: 2, seq: 7, ok: false });
    expect(res.messages).toEqual([expect.stringContaining('Chưa buồn ngủ')]);
    expect(store.useGame.getState().message).toBeNull();
    expect(ofType('state').length).toBeGreaterThan(0); // gửi trạng thái mới trước kết quả
  });

  it('thao tác thành công: số liệu đổi trên máy chạy (nguồn chân lý chung)', async () => {
    await join('runner');
    recv({ type: 'act', from: 2, seq: 1, name: 'setPrice', args: ['mi', 9000] });
    expect(store.useGame.getState().prices.mi).toBe(9000);
    expect(ofType('result')[0]).toMatchObject({ ok: true });
  });

  it('sân chơi: một thành viên góp thì cả hẻm thấy tiến độ; lượt góp chung vẫn chỉ một lần mỗi ngày', async () => {
    await join('runner');
    store.useGame.setState({ money: 1_000_000, message: null });
    const before = store.useGame.getState().money;
    recv({ type: 'act', from: 2, seq: 1, name: 'contributeLandmark', args: [] });
    const afterFirst = store.useGame.getState();
    expect(afterFirst.biz.landmark).toEqual({ contributions: 1, lastContributeDay: afterFirst.day });
    expect(afterFirst.money).toBeLessThan(before);
    expect(ofType('result').find((r) => r.to === 2)).toMatchObject({ ok: true });

    const afterCost = afterFirst.money;
    recv({ type: 'act', from: 3, seq: 2, name: 'contributeLandmark', args: [] });
    expect(store.useGame.getState().biz.landmark.contributions).toBe(1);
    expect(store.useGame.getState().money).toBe(afterCost);
    expect(ofType('result').find((r) => r.to === 3)).toMatchObject({ ok: false, messages: [expect.stringContaining('Hôm nay đã góp')] });
  });

  it('chợ phiên ở hẻm online: thành viên gửi sellMarketSurplus qua máy chạy, kho và tiền đồng bộ, người thứ hai cùng ngày bị chặn', async () => {
    await join('runner');
    const recs = (idQty: number) => {
      const out = [];
      for (let i = 1; i <= 14; i++) out.push({ day: i, qty: idQty, revenue: 5000, cost: 3000, spoiled: 0, lost: 0 });
      return out;
    };
    store.useGame.setState({
      day: 7, marketClearedDay: 0,
      storage: { mi: 20 }, storageLots: {},
      furniture: [],
      demand: { mi: 1 },
      analytics: { items: { mi: recs(1) }, flags: {} },
      money: 100_000,
    });
    const beforeStorage = store.useGame.getState().storage.mi;
    const beforeMoney = store.useGame.getState().money;

    recv({ type: 'act', from: 2, seq: 1, name: 'sellMarketSurplus', args: [] });
    const afterFirst = store.useGame.getState();
    expect(afterFirst.marketClearedDay).toBe(7);
    expect(afterFirst.storage.mi).toBe(beforeStorage - 15);
    expect(afterFirst.money).toBeGreaterThan(beforeMoney);
    expect(ofType('result').find((r) => r.to === 2)).toMatchObject({ ok: true });

    const moneyAfterFirst = afterFirst.money;
    recv({ type: 'act', from: 3, seq: 2, name: 'sellMarketSurplus', args: [] });
    expect(store.useGame.getState().marketClearedDay).toBe(7);
    expect(store.useGame.getState().storage.mi).toBe(beforeStorage - 15);
    expect(store.useGame.getState().money).toBe(moneyAfterFirst);
    const res3 = ofType('result').find((r) => r.to === 3 && r.seq === 2);
    expect(res3).toBeTruthy();
    expect(res3!.ok).toBe(false);
  });

  it('2 người sửa CÙNG một chỗ trong 3 giây: người sau bị chặn kèm tên người trước; cùng người thì được', async () => {
    await join('runner');
    recv({ type: 'act', from: 2, seq: 1, name: 'setPrice', args: ['mi', 9000] });
    recv({ type: 'act', from: 3, seq: 1, name: 'setPrice', args: ['mi', 1000] });
    expect(store.useGame.getState().prices.mi).toBe(9000);
    const denied = ofType('result').find((r) => r.to === 3)!;
    expect(denied.ok).toBe(false);
    expect(denied.messages).toEqual([expect.stringContaining('Bình')]);
    recv({ type: 'act', from: 2, seq: 2, name: 'setPrice', args: ['mi', 9500] });
    expect(store.useGame.getState().prices.mi).toBe(9500);
  });

  it('khác chỗ thì 2 người sửa cùng lúc vẫn được', async () => {
    await join('runner');
    recv({ type: 'act', from: 2, seq: 1, name: 'setPrice', args: ['mi', 9000] });
    recv({ type: 'act', from: 3, seq: 1, name: 'setPrice', args: ['banh_mi', 15000] });
    expect(store.useGame.getState().prices).toMatchObject({ mi: 9000, banh_mi: 15000 });
  });

  it('PATCH từ máy khách: chỉ nhận trường dữ liệu chung; bỏ hàm, giao diện, trường máy chạy tự tính, trường lạ', async () => {
    await join('runner');
    const sleep = store.useGame.getState().sleep;
    const next = !store.useGame.getState().autoSwap;
    recv({ type: 'act', from: 2, name: '__patch', args: [{ autoSwap: next, sleep: 'hack', panel: { type: 'x' }, atBranch: true, khongCo: 1 }] });
    const s = store.useGame.getState() as unknown as Record<string, unknown>;
    expect(s.autoSwap).toBe(next);
    expect(s.sleep).toBe(sleep);
    expect(s.panel).toBeNull();
    expect(s.atBranch).toBe(false);
    expect('khongCo' in s).toBe(false);
  });

  it('thao tác lạ / thao tác chỉ chạy tại chỗ gửi lên: từ chối, không chạy', async () => {
    await join('runner');
    const m0 = store.useGame.getState().minutes;
    recv({ type: 'act', from: 2, seq: 1, name: 'tick', args: [999] });
    recv({ type: 'act', from: 2, seq: 2, name: 'khongCo', args: [] });
    expect(store.useGame.getState().minutes).toBe(m0);
    expect(ofType('result').map((r) => r.ok)).toEqual([false, false]);
  });

  it('gói state gửi tới máy chạy: bỏ qua (máy chạy là nguồn chân lý)', async () => {
    await join('runner');
    store.useGame.setState({ money: 500 });
    recv({ type: 'state', game: { money: 1 }, actors: [] });
    expect(store.useGame.getState().money).toBe(500);
  });
});

describe('câu hỏi ở quầy (mặc cả/ghi sổ/tiền lẻ) dùng chung cả hẻm', () => {
  const askOf = (resolve: (c: number) => void) => ({
    icon: '🗣️', who: 'Khách', text: 'bớt 2.000đ đi', options: ['🤝 Bớt', 'Giá đúng rồi'], fallback: 1, expiresAt: 9999, resolve,
  });

  it('máy chạy: câu hỏi đang treo đi kèm gói state (vào giữa chừng / rớt gói vẫn thấy)', async () => {
    await join('runner');
    ask.askAtCounter(askOf(() => {}));
    recv({ type: 'act', from: 2, seq: 1, name: 'setPrice', args: ['mi', 1] }); // kích gửi state
    const st = ofType('state').at(-1)!;
    expect(st.ask).toMatchObject({ who: 'Khách', options: ['🤝 Bớt', 'Giá đúng rồi'], fallback: 1 });
    expect(typeof (st.ask as { id: number }).id).toBe('number');
    expect('resolve' in (st.ask as object)).toBe(false);
  });

  it('máy khách trả lời → máy chạy chốt ĐÚNG phương án đó cho khách; câu trả lời sai mã/sai phương án bị bỏ', async () => {
    await join('runner');
    const chosen: number[] = [];
    ask.askAtCounter(askOf((c) => chosen.push(c)));
    const id = ask.sharedAsk()!.id;
    recv({ type: 'act', from: 2, name: coop.ANSWER_ASK, args: [id + 1, 0] }); // câu cũ/khác
    recv({ type: 'act', from: 2, name: coop.ANSWER_ASK, args: [id, 5] }); // phương án không tồn tại
    expect(chosen).toEqual([]);
    expect(ask.askPending()).toBe(true);
    recv({ type: 'act', from: 2, name: coop.ANSWER_ASK, args: [id, 0] });
    expect(chosen).toEqual([0]);
    expect(ask.askPending()).toBe(false);
    recv({ type: 'act', from: 3, name: coop.ANSWER_ASK, args: [id, 1] }); // người thứ hai bấm muộn
    expect(chosen).toEqual([0]);
  });

  it('máy khách: thấy câu hỏi trên HUD, đếm giây theo máy chạy; bấm thì gửi đúng mã + phương án', async () => {
    await join('player');
    recv({ type: 'state', game: {}, actors: [], ask: { icon: '📒', who: 'Cô Ba', text: 'xin ghi sổ', options: ['Cho', 'Không'], fallback: 0, expiresAt: 9999, id: 42, elapsed: 12 } });
    expect(ask.useCounterAsk.getState().ask).toMatchObject({ who: 'Cô Ba', options: ['Cho', 'Không'] });
    expect(ask.askWallElapsed()).toBe(12);
    ask.answerAsk(1);
    expect(acts()).toEqual([expect.objectContaining({ name: coop.ANSWER_ASK, args: [42, 1] })]);
    expect(ask.askPending()).toBe(false);
  });

  it('máy khách đã trả lời: gói state kế tiếp còn mang câu đó (máy chạy chưa xử lý) — KHÔNG hiện lại', async () => {
    await join('player');
    const shared = { icon: '📒', who: 'Cô Ba', text: 'x', options: ['A', 'B'], fallback: 0, expiresAt: 9999, id: 7, elapsed: 3 };
    recv({ type: 'state', game: {}, actors: [], ask: shared });
    ask.answerAsk(0);
    recv({ type: 'state', game: {}, actors: [], ask: { ...shared, elapsed: 3.2 } });
    expect(ask.askPending()).toBe(false);
    recv({ type: 'state', game: {}, actors: [], ask: { ...shared, id: 8 } }); // câu MỚI thì hiện
    expect(ask.askPending()).toBe(true);
  });

  it('máy chạy hết câu hỏi (tự chốt/người khác trả lời) → máy khách tự ẩn', async () => {
    await join('player');
    recv({ type: 'state', game: {}, actors: [], ask: { icon: '🪙', who: 'K', text: 'x', options: ['A', 'B'], fallback: 0, expiresAt: 9999, id: 1, elapsed: 0 } });
    expect(ask.askPending()).toBe(true);
    recv({ type: 'state', game: {}, actors: [], ask: null });
    expect(ask.askPending()).toBe(false);
    expect(ask.askWallElapsed()).toBe(0);
  });
});

describe('đổi vai (máy chạy rời/ẩn tab)', () => {
  it('được giao quyền chạy: hàm thật trở lại (thao tác chạy tại chỗ), thao tác đang chờ báo false, câu hỏi cũ bỏ', async () => {
    await join('player');
    store.useGame.getState().placeOrder('cho', { mi: 10 });
    const pendingResult = coop.lastActionResult();
    recv({ type: 'state', game: {}, actors: [], ask: { icon: '🪙', who: 'K', text: 'x', options: ['A', 'B'], fallback: 0, expiresAt: 9999, id: 1, elapsed: 0 } });
    sent = [];
    recv({ type: 'promote' });
    await expect(pendingResult).resolves.toBe(false);
    expect(ask.askPending()).toBe(false);
    store.useGame.getState().setPrice('mi', 7777);
    expect(store.useGame.getState().prices.mi).toBe(7777); // chạy thật, không gửi đi
    expect(acts().filter((a) => a.name === 'setPrice')).toEqual([]);
  });

  it('checkpoint giữa ngày lưu đúng day/tiền/giờ; vào lại hẻm nạp lại đúng tiến trình đó (không mất vì rớt kết nối)', async () => {
    await join('runner');
    // chơi giữa ngày: đồng hồ, tiền và ngày đổi từ lúc tạo hẻm
    store.useGame.setState({ day: 2, minutes: 11 * 60 + 30, money: 432_100 });
    sent = [];
    coop.checkpoint(); // như hẹn giờ 30s hoặc tab bị ẩn (GĐ665: tái hiện vòng ngày co-op bị reset trong QA trình duyệt)
    const cps = ofType('checkpoint') as unknown as { data: Record<string, unknown> }[];
    expect(cps).toHaveLength(1);
    expect(cps[0].data).toMatchObject({ day: 2, minutes: 11 * 60 + 30, money: 432_100 });
    // máy khách KHÔNG tự checkpoint (chỉ máy chạy ghi tiến trình hẻm)
    await join('player');
    store.useGame.setState({ minutes: 12 * 60 + 30, money: 999_999 });
    sent = [];
    coop.checkpoint();
    expect(ofType('checkpoint')).toEqual([]);
    // tab rớt kết nối rồi vào lại hẻm: server trả welcome kèm đúng checkpoint đã ghi
    vi.resetModules();
    sent = [];
    store = await import('../core/store');
    coop = await import('../net/coop');
    store.useGame.setState(store.newGameData());
    coop.initCoop({ scene: { add() {}, remove() {} } as never, player: { mesh: { position: { x: 0, z: 0 }, rotation: { y: 0 } } as never }, actors: () => [], resetSim: () => {} });
    const entered = coop.enterAlley('ABC');
    recv({ type: 'welcome', selfId: 1, room: 0, role: 'runner', alley: { id: 'ABC', name: 'Hẻm' }, peers: PEERS, data: cps[0].data });
    await entered;
    expect(store.useGame.getState().day).toBe(2);
    expect(store.useGame.getState().minutes).toBe(11 * 60 + 30);
    expect(store.useGame.getState().money).toBe(432_100);
  }, 60_000); // nạp lại cả store (resetModules) — chậm khi cả bộ test chạy song song

  it('thôi chạy (bị hạ xuống máy khách): thao tác lại được gửi cho máy chạy mới', async () => {
    await join('runner');
    recv({ type: 'demote' });
    sent = [];
    store.useGame.getState().setPrice('mi', 5000);
    expect(store.useGame.getState().prices.mi).toBeUndefined();
    expect(acts()).toEqual([expect.objectContaining({ name: 'setPrice' })]);
  });
});

describe('vòng quay may mắn: máy khách biết giải trúng', () => {
  it('máy chạy ghi giải vừa trúng vào trạng thái chung (máy khách nhận qua state để chỉ kim đúng ô)', async () => {
    vi.resetModules();
    store = await import('../core/store');
    store.useGame.setState({ ...store.newGameData(), day: 3, wheelLastDay: 0 });
    const prize = store.useGame.getState().spinWheel()!;
    expect(store.useGame.getState().wheelLastPrize).toEqual({ icon: prize.icon, label: prize.label });
    expect(store.useGame.getState().wheelLastDay).toBe(3);
  });

  it('máy khách bấm quay: nhận giá trị tạm `true` (UI phải chờ state, không đọc như giải)', async () => {
    await join('player');
    expect(store.useGame.getState().spinWheel()).toBe(true);
  });
});

describe('đi ngủ ở hẻm: cả hẻm cùng nằm giường mới sang ngày', () => {
  const night = () => store.useGame.setState({ minutes: 20 * 60, message: null });

  it('một người ngủ: KHÔNG sang ngày, báo còn chờ ai; đủ cả 3 người thì sang ngày đúng 1 lần', async () => {
    await join('runner');
    night();
    const day = store.useGame.getState().day;
    expect(store.useGame.getState().sleep()).toBe(true); // máy chạy (An) lên giường
    expect(store.useGame.getState().day).toBe(day);
    expect(store.useGame.getState().message).toMatch(/1\/3.*Bình, Chi/);
    recv({ type: 'act', from: 2, seq: 1, name: 'sleep', args: [] });
    expect(store.useGame.getState().day).toBe(day);
    expect(ofType('notify').map((m) => m.text)).toContainEqual(expect.stringContaining('Bình đã đi ngủ (2/3)'));
    recv({ type: 'act', from: 3, seq: 1, name: 'sleep', args: [] });
    expect(store.useGame.getState().day).toBe(day + 1);
    recv({ type: 'act', from: 3, seq: 2, name: 'sleep', args: [] }); // gói lặp sau khi đã sang ngày
    expect(store.useGame.getState().day).toBe(day + 1);
  });

  it('nằm rồi đứng dậy (rút phiếu): người cuối ngủ cũng KHÔNG sang ngày', async () => {
    await join('runner');
    night();
    const day = store.useGame.getState().day;
    recv({ type: 'act', from: 2, seq: 1, name: 'sleep', args: [] });
    recv({ type: 'act', from: 2, name: coop.CANCEL_SLEEP, args: [] });
    store.useGame.getState().sleep();
    recv({ type: 'act', from: 3, seq: 1, name: 'sleep', args: [] });
    expect(store.useGame.getState().day).toBe(day);
  });

  it('người chưa ngủ rời hẻm: những người còn lại đã ngủ hết thì sang ngày luôn', async () => {
    await join('runner');
    night();
    const day = store.useGame.getState().day;
    store.useGame.getState().sleep();
    recv({ type: 'act', from: 2, seq: 1, name: 'sleep', args: [] });
    recv({ type: 'peers', peers: PEERS.slice(0, 2), left: 'Chi' });
    expect(store.useGame.getState().day).toBe(day + 1);
  });

  it('thức khuya tới giờ ngất: có người đã nằm giường thì sang ngày KHÔNG mất tiền; không ai ngủ thì vẫn bị phạt', async () => {
    await join('runner');
    night();
    const day = store.useGame.getState().day;
    store.useGame.setState({ money: 1_000_000 });
    recv({ type: 'act', from: 2, seq: 1, name: 'sleep', args: [] });
    store.useGame.setState({ minutes: 26 * 60 });
    store.useGame.getState().tick(0.01);
    expect(store.useGame.getState().day).toBe(day + 1);
    expect(store.useGame.getState().money).toBeGreaterThan(950_000); // chỉ trừ chi phí cuối ngày thường, không phạt 10%
    store.useGame.setState({ minutes: 26 * 60, money: 1_000_000 });
    store.useGame.getState().tick(0.01);
    expect(store.useGame.getState().day).toBe(day + 2);
    expect(store.useGame.getState().money).toBeLessThan(920_000);
  });

  it('phiếu hôm qua không tính sang hôm nay', async () => {
    await join('runner');
    night();
    const day = store.useGame.getState().day;
    recv({ type: 'act', from: 2, seq: 1, name: 'sleep', args: [] });
    store.useGame.setState({ day: day + 1 }); // vd. thức khuya ngất → sang ngày không qua bỏ phiếu
    night();
    store.useGame.getState().sleep();
    recv({ type: 'act', from: 3, seq: 1, name: 'sleep', args: [] });
    expect(store.useGame.getState().day).toBe(day + 1); // Bình chưa ngủ lại hôm nay
  });

  it('trước 18h vẫn báo "chưa buồn ngủ", không ghi phiếu', async () => {
    await join('runner');
    store.useGame.setState({ minutes: 9 * 60 });
    expect(store.useGame.getState().sleep()).toBe(false);
  });

  it('máy khách đứng dậy: gửi rút phiếu cho máy chạy', async () => {
    await join('player');
    coop.cancelSleep();
    expect(acts()).toEqual([expect.objectContaining({ name: coop.CANCEL_SLEEP })]);
  });
});

describe('bảng tổng kết ngày ở hẻm', () => {
  it('máy khách: hẻm sang ngày → mở bảng tổng kết của ngày vừa qua (như chơi đơn)', async () => {
    await join('player');
    const stats = { ...store.useGame.getState().stats, revenue: 123_000 };
    recv({ type: 'state', game: { ...stateOf(store.newGameData()), day: 6, lastSummary: { day: 5, stats } }, actors: [] });
    expect(store.useGame.getState().panel).toEqual({ type: 'summary', day: 5, stats });
    expect(ofType('act')).toHaveLength(0); // mở bảng là việc riêng máy này, không gửi PATCH
  });

  it('máy khách mới vào hẻm (nhảy nhiều ngày) hoặc gói state lặp cùng ngày: KHÔNG bật bảng cũ', async () => {
    await join('player');
    const stats = store.useGame.getState().stats;
    recv({ type: 'state', game: { ...stateOf(store.newGameData()), day: 5, lastSummary: { day: 4, stats } }, actors: [] });
    expect(store.useGame.getState().panel).toBeNull();
    recv({ type: 'state', game: { ...stateOf(store.newGameData()), day: 9, lastSummary: { day: 8, stats } }, actors: [] });
    expect(store.useGame.getState().panel).toBeNull();
  });

  it('sang ngày ghi lastSummary vào trạng thái chung (gửi kèm state cho máy khách)', async () => {
    await join('runner');
    store.useGame.setState({ minutes: 20 * 60 });
    const day = store.useGame.getState().day;
    store.useGame.getState().sleep();
    recv({ type: 'act', from: 2, seq: 1, name: 'sleep', args: [] });
    recv({ type: 'act', from: 3, seq: 1, name: 'sleep', args: [] });
    expect(store.useGame.getState().lastSummary?.day).toBe(day);
    const st = ofType('state').at(-1)!.game as Record<string, { day: number }>;
    expect(st.lastSummary.day).toBe(day);
  });
});

describe('chỉnh nhiều giá một lúc (setPrices) không đè giá người khác vừa đổi', () => {
  it('món người khác vừa đổi (giá khác giá mình thấy) giữ nguyên; món còn lại đổi; null = về giá gợi ý', async () => {
    await join('runner');
    store.useGame.setState({ prices: { mi: 5000, nuoc: 8000 } });
    recv({ type: 'act', from: 3, seq: 1, name: 'setPrice', args: ['mi', 6000] }); // Chi đổi mì trước
    // Bình bấm "chỉnh tất cả" từ bảng giá cũ (mì 5000)
    recv({ type: 'act', from: 2, seq: 1, name: 'setPrices', args: [{ mi: { from: 5000, to: 4500 }, nuoc: { from: 8000, to: null }, keo: { to: 2000 } }] });
    expect(store.useGame.getState().prices).toEqual({ mi: 6000, keo: 2000 });
  });

  it('chơi đơn: trả về số món đã đổi', async () => {
    await join('runner');
    store.useGame.setState({ prices: { mi: 5000 } });
    expect(store.useGame.getState().setPrices({ mi: { from: 5000, to: 5500 }, keo: { from: 1, to: 2 } })).toBe(1);
  });
});

describe('chính sách vận hành co-op parity: tái sinh & chào mừng quay lại', () => {
  it('tái sinh NG+ (doPrestige) bị chặn có chủ đích khi đang ở hẻm online', async () => {
    await join('runner');
    const s0 = store.useGame.getState();
    store.useGame.setState({
      level: 60,
      totals: { ...s0.totals, revenue: 500_000_000 },
      message: null,
    });
    const beforeLevel = store.useGame.getState().level;
    const beforePrestige = store.useGame.getState().biz.prestige;
    store.useGame.getState().doPrestige();
    expect(store.useGame.getState().level).toBe(beforeLevel);
    expect(store.useGame.getState().biz.prestige).toEqual(beforePrestige);
    expect(store.useGame.getState().message).toMatch(/Tái sinh chỉ dùng ở chế độ chơi đơn/);
  });

  it('danh hiệu chung (checkTitles) sau sang ngày được máy chạy soát và cập nhật danh sách', async () => {
    await join('runner');
    store.useGame.setState({ titles: [] });
    store.useGame.getState().checkTitles();
    expect(store.useGame.getState().titles).toContain('tap_su');
  });
});

// ───── GĐ793: đòi khách quen bị rival lôi kéo (rescuePoachedRegular) ─────

describe('GĐ793 — đòi khách quen bị đối thủ lôi kéo ở hẻm online', () => {
  const RIVAL = { name: 'Tạp hóa Thử', strength: 60, openedDay: 9 };
  /**
   * Trạng thái chung đủ điều kiện đòi: ngày 10, 500.000đ, kho có 3 sữa (món Bà Năm thích),
   * Bà Năm đang bị kéo từ ngày 8. `extra` để thêm khách thứ hai đang bị kéo (ca hai người bấm).
   */
  const cooped = (extraPoached: Record<string, number> = {}) => {
    const base = store.newGameData();
    return {
      ...base, day: 10, level: 10, money: 500_000,
      storage: { sua: 3, nuoc: 2 }, storageLots: {},
      biz: { ...base.biz, rival: { ...RIVAL, poached: { ba_nam: 8, ...extraPoached } } },
    };
  };

  it('máy khách bấm: gửi đúng act (tên + id) cho máy chạy; KHÔNG tự trừ tiền/kho hay xoá poach tại chỗ', async () => {
    await join('player');
    recv({ type: 'state', game: cooped(), actors: [] });
    store.useGame.getState().rescuePoachedRegular('ba_nam');
    expect(acts()).toEqual([expect.objectContaining({ name: 'rescuePoachedRegular', args: ['ba_nam'] })]);
    const s = store.useGame.getState();
    expect(s.money).toBe(500_000);
    expect(s.storage.sua).toBe(3);
    expect(s.biz.rival?.poached).toEqual({ ba_nam: 8 });
    expect(s.biz.rescueDay).toBeUndefined(); // cả ngày đã đòi cũng do máy chạy ghi
  });

  it('máy chạy nhận act của bạn: chạy thật, poach sạch trong state chung; gói state mới cho cả hẻm thấy y như máy chạy', async () => {
    await join('runner');
    store.useGame.setState(cooped());
    recv({ type: 'act', from: 2, seq: 1, name: 'rescuePoachedRegular', args: ['ba_nam'] });
    const s = store.useGame.getState();
    expect(s.biz.rival?.poached).toEqual({});
    expect(s.money).toBe(480_000); // 500.000 − 20.000 tiền quà
    expect(s.storage.sua).toBe(2);
    expect(s.biz.rescueDay).toBe(10);
    expect(ofType('result').find((r) => r.to === 2)).toMatchObject({ ok: true, messages: [expect.stringContaining('Bà Năm')] });
    // Gói state máy chạy gửi đi phải mang poach rỗng — người khác nhận là thấy thẻ biến mất ngay
    const shared = ofType('state').at(-1)!.game as Record<string, unknown>;
    expect((shared.biz as { rival: { poached: Record<string, number> } }).rival.poached).toEqual({});
    await join('player');
    recv({ type: 'state', game: shared, actors: [] });
    const guest = store.useGame.getState();
    expect(guest.biz.rival?.poached).toEqual({});
    expect(guest.money).toBe(480_000);
    expect(guest.storage.sua).toBe(2);
    expect(guest.regulars.ba_nam.friendship).toBe(3); // +3 thân thiết, như chơi đơn
  });

  it('hai người bấm trong 3 giây (GUARDED rival:poach): người sau bị chặn, chỉ trừ tiền/kho MỘT lần', async () => {
    await join('runner');
    // Còn Chu Bá đang bị kéo: nếu thiếu khoá thì người thứ hai sẽ đòi được ngay và trừ tiền lần hai
    store.useGame.setState(cooped({ chu_ba: 8 }));
    recv({ type: 'act', from: 2, seq: 1, name: 'rescuePoachedRegular', args: ['ba_nam'] });
    expect(store.useGame.getState().money).toBe(480_000);
    expect(store.useGame.getState().biz.rival?.poached).toEqual({ chu_ba: 8 });

    // Người thứ hai bấm cùng nút của Bà Năm: bị chặn kèm tên người vừa đòi
    recv({ type: 'act', from: 3, seq: 2, name: 'rescuePoachedRegular', args: ['ba_nam'] });
    expect(store.useGame.getState().money).toBe(480_000);
    const deniedSame = ofType('result').find((r) => r.to === 3 && r.seq === 2)!;
    expect(deniedSame.ok).toBe(false);
    expect(deniedSame.messages).toEqual([expect.stringContaining('Bình')]);

    // Người thứ hai đòi Chu Bá (vẫn còn bị kéo) trong 3 giây đó: khoá chung 'rival:poach' cũng chặn
    recv({ type: 'act', from: 3, seq: 3, name: 'rescuePoachedRegular', args: ['chu_ba'] });
    const afterSecond = store.useGame.getState();
    expect(afterSecond.money).toBe(480_000);
    expect(afterSecond.storage.sua).toBe(2); // không tặng thêm món nào
    expect(afterSecond.biz.rival?.poached).toEqual({ chu_ba: 8 }); // vẫn còn, chưa bị đòi
    expect(afterSecond.biz.rescueDay).toBe(10);
    expect(ofType('result').find((r) => r.to === 3 && r.seq === 3)).toMatchObject({ ok: false });
  });
});

// ───── GĐ702: vào hẻm — đường lỗi & danh sách hẻm (REST) ─────

describe('vào hẻm: đường lỗi + REST (GĐ702)', () => {
  it('server trả lỗi khi vào hẻm: từ chối với đúng thông báo và đóng kết nối', async () => {
    vi.resetModules();
    store = await import('../core/store');
    coop = await import('../net/coop');
    store.useGame.setState(store.newGameData());
    coop.initCoop({ scene: { add() {}, remove() {} } as never, player: { mesh: { position: { x: 0, z: 0 }, rotation: { y: 0 } } as never }, actors: () => [], resetSim: () => {} });
    const entered = coop.enterAlley('ABC');
    recv({ type: 'error', error: 'Hẻm đã đủ 4 người' });
    await expect(entered).rejects.toThrow('Hẻm đã đủ 4 người');
  });

  it('rớt kết nối TRƯỚC khi vào được: từ chối "Mất kết nối khi vào hẻm."', async () => {
    vi.resetModules();
    store = await import('../core/store');
    coop = await import('../net/coop');
    store.useGame.setState(store.newGameData());
    coop.initCoop({ scene: { add() {}, remove() {} } as never, player: { mesh: { position: { x: 0, z: 0 }, rotation: { y: 0 } } as never }, actors: () => [], resetSim: () => {} });
    const entered = coop.enterAlley('ABC');
    FakeWS.last.onclose!();
    await expect(entered).rejects.toThrow('Mất kết nối khi vào hẻm.');
  });

  it('rớt kết nối SAU khi vào được (máy chạy): thoát session + báo người chơi, hẹn reload', async () => {
    vi.useFakeTimers();
    await join('runner');
    const session = await import('../net/session');
    const notes: string[] = [];
    store.useGame.setState({ notify: (m: string) => notes.push(m) });
    expect(session.useSession.getState().coop).not.toBeNull();
    FakeWS.last.onclose!();
    expect(session.useSession.getState().coop).toBeNull();
    expect(notes.join(' ')).toContain('Mất kết nối hẻm online');
    vi.advanceTimersByTime(2500); // reload đã được lên lịch (stub noop) — không treo
  });

  it('danh sách hẻm (REST): gọi GET có token, trả dữ liệu; lỗi server thì ném đúng thông báo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'a1', name: 'Hẻm 1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Sai mã hẻm' }), { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const list = await coop.listAlleys();
    expect(list[0].name).toBe('Hẻm 1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
    await expect(coop.joinAlley('ab')).rejects.toThrow('Sai mã hẻm');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/AB/join'); // mã được in hoa + mã hoá
    vi.unstubAllGlobals();
  });

  it('mất mạng khi gọi REST: ném lỗi gợi ý chạy server (không treo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(coop.listAlleys()).rejects.toThrow('Không kết nối được server');
    vi.unstubAllGlobals();
  });
});
