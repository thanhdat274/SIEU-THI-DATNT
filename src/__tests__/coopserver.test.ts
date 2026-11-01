import { describe, it, expect, beforeEach } from 'vitest';
import {
  newAlleyCode, CODE_CHARS, handOffPlan, tryLock, releaseLocksFor, canJoin, isValidCheckpoint, MAX_MEMBERS,
} from '../../server/room';
import { newGameData, useGame } from '../core/store';
import { SAVE_VERSION, snapshot, applySnapshot } from '../core/save';
import { cleanActionArgs } from '../net/actionArgs';
import { newOnline, appRating, orderGap, makeOnlineOrder } from '../data/online';

const peer = (id: number, name: string, visible = true) => ({ id, name, visible });
const room = (peers: ReturnType<typeof peer>[], runner: number | null, locks: [string, number][] = []) => ({
  peers, runner, locks: new Map(locks),
});

describe('hẻm online — handoff (chuyển quyền máy chạy)', () => {
  it('máy chạy còn mở tab thì giữ nguyên', () => {
    const p = [peer(1, 'A', true), peer(2, 'B', true)];
    const plan = handOffPlan(room(p, 1).peers, 1, 'hidden', 'A');
    expect(plan).toEqual({ promote: null, demote: null, notify: null });
  });

  it('máy chạy ẩn tab thì chuyển cho người đang mở tab', () => {
    const p = [peer(1, 'A', false), peer(2, 'B', true), peer(3, 'C', true)];
    const plan = handOffPlan(room(p, 1).peers, 1, 'hidden', 'A');
    expect(plan.promote).toBe(2);
    expect(plan.demote).toBe(1);
    expect(plan.notify).toContain('A vừa ẩn tab');
    expect(plan.notify).toContain('B đang chạy tiệm');
  });

  it('máy chạy rời hẻm thì tiếp quản cho người khác (thông báo theo nguyên nhân left)', () => {
    const p = [peer(1, 'A', false), peer(2, 'B', true)];
    const plan = handOffPlan(room(p, 1).peers, 1, 'left', 'A');
    expect(plan.promote).toBe(2);
    expect(plan.notify).toContain('A đã rời hẻm');
  });

  it('ai cũng ẩn tab thì giữ nguyên máy chạy', () => {
    const p = [peer(1, 'A', false), peer(2, 'B', false)];
    expect(handOffPlan(room(p, 1).peers, 1, 'hidden', 'A').promote).toBeNull();
  });

  it('chưa có máy chạy thì bầu người đầu tiên làm máy chạy', () => {
    const p = [peer(1, 'A', true), peer(2, 'B', true)];
    const plan = handOffPlan(p, null, 'left', 'X');
    expect(plan.promote).toBe(1);
    expect(plan.demote).toBeNull();
  });

  it('máy chạy ẩn tab và không ai khác mở tab thì giữ nguyên (không bầu peer ẩn)', () => {
    const p = [peer(1, 'A', false), peer(2, 'B', false)];
    expect(handOffPlan(p, 1, 'hidden', 'A').promote).toBeNull();
  });

  it('không bầu người chưa ready (chưa có trạng thái tiệm) làm máy chạy', () => {
    // B vừa vào, chưa nhận trạng thái đầu tiên từ A
    const p = [peer(1, 'A', false), { ...peer(2, 'B', true), ready: false }];
    expect(handOffPlan(p, 1, 'left', 'A').promote).toBeNull();
  });

  it('bỏ qua người chưa ready, bầu người ready kế tiếp', () => {
    const p = [{ ...peer(1, 'A', false), ready: false }, { ...peer(2, 'B', true), ready: false }, peer(3, 'C', true)];
    const plan = handOffPlan(p, null, 'left', 'X');
    expect(plan.promote).toBe(3);
  });

  it('không chỉ định ready mặc định coi là ready (tương thích ngược)', () => {
    const p = [peer(1, 'A', false), peer(2, 'B', true)];
    expect(handOffPlan(p, 1, 'left', 'A').promote).toBe(2);
  });
});

describe('hẻm online — khoá công việc (lock)', () => {
  it('người đầu tiên giữ khoá thành công', () => {
    const locks = new Map<string, number>();
    expect(tryLock(locks, 'build', 1, true)).toEqual({ granted: true });
    expect(locks.get('build')).toBe(1);
  });

  it('người khác xin khoá đang có người giữ thì bị từ chối kèm người đang giữ', () => {
    const locks = new Map<string, number>([['build', 1]]);
    expect(tryLock(locks, 'build', 2, true)).toEqual({ granted: false, deniedBy: 1 });
    expect(locks.get('build')).toBe(1);
  });

  it('người đang giữ xin lại khoá của mình vẫn được', () => {
    const locks = new Map<string, number>([['build', 1]]);
    expect(tryLock(locks, 'build', 1, true).granted).toBe(true);
  });

  it('chỉ người đang giữ mới nhả được khoá', () => {
    const locks = new Map<string, number>([['build', 1]]);
    tryLock(locks, 'build', 2, false); // người khác nhả: vô hiệu
    expect(locks.has('build')).toBe(true);
    expect(tryLock(locks, 'build', 1, false).granted).toBe(true);
    expect(locks.has('build')).toBe(false);
  });
});

describe('hẻm online — releaseLocksFor & canJoin', () => {
  it('nhả đúng khoá của peer rời đi, không đụng khoá người khác', () => {
    const locks = new Map<string, number>([['build', 1], ['farm', 2], ['price', 1]]);
    const released = releaseLocksFor(locks, 1);
    expect(released.sort()).toEqual(['build', 'price']);
    expect(locks.has('farm')).toBe(true);
    expect(locks.size).toBe(1);
  });

  it('canJoin: chưa có mặt + chưa đủ người thì cho vào', () => {
    const members = [{ uid: 'a' }, { uid: 'b' }];
    expect(canJoin(members, 'c')).toBe(true);
    expect(canJoin(members, 'a')).toBe(false); // đã là thành viên
    expect(canJoin([{ uid: '1' }, { uid: '2' }, { uid: '3' }, { uid: '4' }], '5')).toBe(false); // đủ 4
  });

  it('isValidCheckpoint: cần day và money là số', () => {
    expect(isValidCheckpoint({ day: 12, money: 34000 })).toBe(true);
    expect(isValidCheckpoint({ day: 12 })).toBe(false);
    expect(isValidCheckpoint({ day: 'x', money: 0 })).toBe(false);
    expect(isValidCheckpoint(null)).toBe(false);
  });

  it('mã hẻm dùng đúng bảng chữ an toàn (không 0/O/1/I/L), dài 6, ổn định theo rng', () => {
    const code = newAlleyCode(() => 0);
    expect(code.length).toBe(6);
    for (const ch of code) expect(CODE_CHARS).toContain(ch);
    expect(newAlleyCode(() => 0.5)).not.toContain('0');
    // hai lần cùng rng cho cùng kết quả
    expect(newAlleyCode(() => 0.25)).toBe(newAlleyCode(() => 0.25));
    expect(MAX_MEMBERS).toBe(4);
  });
});

describe('checkpoint hẻm — snapshot → applySnapshot (vòng tròn)', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), day: 33, level: 12, money: 250000, shopName: 'Hẻm Test' }));

  it('snapshot rồi áp lại giữ nguyên các trường cốt lõi', () => {
    const snap = snapshot();
    expect(snap.day).toBe(33);
    expect(snap.level).toBe(12);
    expect(snap.money).toBe(250000);
    expect(snap.saveVersion).toBe(SAVE_VERSION);

    applySnapshot(snap);
    const s = useGame.getState();
    expect(s.day).toBe(33);
    expect(s.level).toBe(12);
    expect(s.money).toBe(250000);
    expect(s.shopName).toBe('Hẻm Test');
  });

  it('bản lưu hẻm cũ chỉ có garden.coop được nâng lên garden.pens.chicken', () => {
    const snap = snapshot();
    // mô phỏng bản lưu đợt trước khi có hệ chuồng theo loài
    applySnapshot({
      ...snap,
      saveVersion: 1, // bản lưu cũ ở thời trước khi nâng version
      garden: { ...(snap.garden as unknown as Record<string, unknown>), coop: { chickens: 3, fedDay: 5, eggs: 2, feedKg: 0.5 }, pens: undefined },
    } as unknown as Parameters<typeof applySnapshot>[0]);
    const g = useGame.getState().garden as unknown as { pens?: { chicken?: { count: number } } };
    expect(g.pens?.chicken?.count).toBe(3);
  });
});

describe('bán hàng online — dữ liệu máy chạy dùng để mô phỏng', () => {
  it('appRating mặc định 5★ khi chưa ai chấm', () => {
    expect(appRating(newOnline())).toBe(5);
  });

  it('orderGap tỉ lệ ngược với điểm app (điểm tốt → đơn dày)', () => {
    // điểm cao (gần 5) → khoảng cách đơn ngắn hơn điểm thấp (1)
    const high = orderGap(5, 20);
    const low = orderGap(1, 20);
    expect(high).toBeLessThan(low);
    expect(high).toBeGreaterThan(0);
  });

  it('makeOnlineOrder có rng ổn định và sinh đơn đúng định dạng', () => {
    const o = makeOnlineOrder(7, 20, 9 * 60, () => 0.5);
    expect(o.id).toBe(7);
    expect(o.status).toBe('new');
    expect(o.km).toBeGreaterThan(0);
    expect(Object.keys(o.items).length).toBeGreaterThan(0);
    expect(o.dueAt).toBeGreaterThan(o.placedAt);
    // cùng rng thì cùng đơn
    const o2 = makeOnlineOrder(7, 20, 9 * 60, () => 0.5);
    expect(o2.customer).toBe(o.customer);
  });
});

describe('hẻm online — tham số thao tác của người không chạy', () => {
  it('bỏ sự kiện click lọt vào tham số (onClick={toggleShop}) để gửi được sang máy chạy', () => {
    const click: Record<string, unknown> = { preventDefault: () => {}, nativeEvent: {} };
    click.target = click; // vòng tham chiếu như phần tử DOM thật
    const args = cleanActionArgs([click]);
    expect(args).toEqual([]);
    expect(() => JSON.stringify(args)).not.toThrow();
  });
  it('giữ nguyên tham số thật, kể cả khi đi kèm sự kiện', () => {
    const click = { preventDefault: () => {} };
    expect(cleanActionArgs([3, 'bap', click, { a: 1 }, null])).toEqual([3, 'bap', { a: 1 }, null]);
    expect(cleanActionArgs([])).toEqual([]);
  });
});
