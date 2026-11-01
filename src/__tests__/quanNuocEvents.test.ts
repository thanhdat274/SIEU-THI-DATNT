import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quanNuocDay, QUAN_EVENT, type QuanNuocState } from '../data/quanNuoc';
import { newGameData, useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';

/**
 * GĐ703 — sự kiện một ngày ở quán nước (data/quanNuoc.ts):
 *  ⚙️ máy pha hỏng: số ly món pha bị chặn xuống nửa (pha chậm), phần khách còn lại chuyển sang nước chai.
 *  🛺 xe nước mọc đối diện: khách vắng hơn 20% hôm đó.
 * endDay truyền simRng()() nên game thật có sự kiện; không truyền rng giữ hành vi cũ (test cũ không vỡ).
 */

const g = () => useGame.getState();

const quan = (menu: string[], staff = 1): QuanNuocState =>
  ({ open: true, staff, price: 'vua', menu });

/** kho đủ trà + đá cho ~200 ly trà đá, nước chai dự phòng */
const storage = { tra: 20, x_nuoc_da: 40, nuoc: 80 };
const taken: Record<string, number> = {};
const take = (id: string, qty: number) => { taken[id] = (taken[id] ?? 0) + qty; };

describe('sự kiện quán nước — máy pha hỏng (GĐ703)', () => {
  it('r1 trúng + có thực đơn: món pha bị chặn nửa số ly, phần còn lại bán nước chai', () => {
    expect(QUAN_EVENT.brewer).toBe(0.06);
    const out = quanNuocDay(quan(['tra_da']), 30, storage, take, undefined, undefined, () => 0.01);
    expect(out?.event).toBe('brewer');
    // khách 52 (45 × 1.15 nhân viên) → wanted 78; máy hỏng chỉ pha ceil(78/2) = 39 ly trà đá
    expect(out?.brewed.tra_da).toBe(39);
    expect(out?.served).toBe(78); // nước chai bù phần còn lại từ kho nuoc
    expect(taken.tra).toBeGreaterThan(0);
  });

  it('thực đơn trống thì máy pha không thể hỏng: r1 trúng nhưng bỏ qua, r2 cao → không sự kiện', () => {
    let i = 0;
    const out = quanNuocDay(quan([]), 30, storage, take, undefined, undefined, () => [0.01, 0.5][i++ % 2]);
    expect(out?.event).toBeUndefined();
    expect(out?.customers).toBe(52); // không bị trừ khách
  });
});

describe('sự kiện quán nước — xe nước đối diện (GĐ703)', () => {
  it('r2 trúng: khách −20% hôm đó, ghi sự kiện cart', () => {
    expect(QUAN_EVENT.cart).toBe(0.05);
    const out = quanNuocDay(quan(['tra_da']), 30, storage, take, undefined, undefined, () => 0.01);
    expect(out?.event).toBe('brewer'); // r1 trúng trước → không rơi vào cart
    // r1 cao (0.5) r2 thấp (0.02) → đúng cart
    let i = 0;
    const cart = quanNuocDay(quan(['tra_da']), 30, storage, take, undefined, undefined, () => [0.5, 0.02][i++ % 2]);
    expect(cart?.event).toBe('cart');
    expect(cart?.customers).toBe(41); // round(51,75 × 0.8)
    expect(cart?.wanted).toBe(62);
  });

  it('hai lần gieo đều cao: ngày bình thường, không sự kiện', () => {
    const out = quanNuocDay(quan(['tra_da']), 30, storage, take, undefined, undefined, () => 0.5);
    expect(out?.event).toBeUndefined();
    expect(out?.customers).toBe(52);
  });

  it('không truyền rng giữ hành vi cũ (test cũ + projection không vỡ)', () => {
    const out = quanNuocDay(quan(['tra_da']), 30, storage, take);
    expect(out?.event).toBeUndefined();
    expect(out?.customers).toBe(52);
  });
});

describe('endDay gắn sự kiện quán nước vào tin sáng mai (GĐ703)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGame.setState({
      ...newGameData(),
      level: 30,
      money: 50_000_000,
      minutes: 20 * 60,
      notify: () => {},
      storage: { tra: 200, x_nuoc_da: 300, nuoc: 300 },
      biz: { ...newGameData().biz, quanNuoc: { open: true, staff: 1, price: 'vua', menu: ['tra_da'] } },
    });
  });
  afterEach(() => { vi.restoreAllMocks(); clearSimSeed(); });

  it('quét seed: có ngày báo ⚙️/🛺 và quanNuocLast.event khớp tin', () => {
    let hit = 0;
    for (let seed = 1; seed <= 400; seed++) {
      setSimSeed(seed);
      g().sleep();
      const st = g();
      const ev = st.biz.quanNuocLast?.event;
      const news = (st.lastSummary?.news ?? []).join(' ') ?? '';
      if (ev === 'brewer') { expect(news).toContain('máy pha hỏng'); hit++; }
      else if (ev === 'cart') { expect(news).toContain('xe nước'); hit++; }
      if (hit >= 3) break;
    }
    expect(hit).toBeGreaterThanOrEqual(3); // p(sự kiện) ≈ 11%/ngày → 400 ngày không thể còn 0
  });

  it('ngày không sự kiện: quanNuocLast.event undefined, tin thường', () => {
    let ok = false;
    for (let seed = 1; seed <= 60 && !ok; seed++) {
      setSimSeed(seed);
      useGame.setState({ ...newGameData(), level: 30, money: 50_000_000, minutes: 20 * 60, notify: () => {}, storage: { tra: 200, x_nuoc_da: 300, nuoc: 300 }, biz: { ...newGameData().biz, quanNuoc: { open: true, staff: 1, price: 'vua', menu: ['tra_da'] } } });
      g().sleep();
      const st = g();
      if (st.biz.quanNuocLast && st.biz.quanNuocLast.event === undefined && !(st.lastSummary?.news ?? []).join(' ').includes('máy pha hỏng') && !(st.lastSummary?.news ?? []).join(' ').includes('xe nước')) ok = true;
    }
    expect(ok).toBe(true);
  });
});
