import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { BRAND_UNLOCK, type BrandState } from '../data/brand';

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

const brand = (over: Partial<BrandState> = {}): BrandState => ({
  name: 'Nhà Năm', lines: [], stock: {}, rep: 0, maxRep: 0, repLog: [],
  workshop: null, lastPackDay: 0, deals: {}, franchises: [], franchiseDue: {},
  ...over,
});

/** Đặt tiệm cấp ≥ cổng + nhãn + đếm mẻ/bán cho dòng h_x. */
function setUp(level: number, b?: BrandState) {
  const s = useGame.getState();
  useGame.setState({
    level,
    soldEver: { hx_nuoc_mam: 600 },
    garden: { ...s.garden, preserveMade: { hx_nuoc_mam: 120 } },
    biz: { ...s.biz, brand: b },
  } as never);
  return useGame.getState();
}

describe('Hệ4-L2 — lập nhãn: cổng cấp, tên mặc định, tạo một lần', () => {
  it('cấp < 100 không lập được nhãn', () => {
    setUp(60);
    useGame.getState().foundBrand('');
    expect(useGame.getState().biz.brand).toBeUndefined();
    expect(BRAND_UNLOCK).toBe(100);
  });

  it('lập nhãn thành công, tên rỗng → tên mặc định, dòng trống', () => {
    setUp(100);
    useGame.getState().foundBrand('');
    const b = useGame.getState().biz.brand;
    expect(b).toBeTruthy();
    expect(b!.name.length).toBeGreaterThan(0);
    expect(b!.lines).toEqual([]);
    expect(b!.stock).toEqual({});
    expect(b!.rep).toBe(0);
  });

  it('không lập hai lần', () => {
    setUp(100, brand({ name: 'A' }));
    useGame.getState().foundBrand('B');
    expect(useGame.getState().biz.brand!.name).toBe('A');
  });
});

describe('Hệ4-L2 — dòng hàng: đủ điều kiện, đủ slot, thêm/bỏ', () => {
  it('cần đủ 100 mẻ VÀ bán 500 — thiếu thì không thêm', () => {
    setUp(110, brand());
    // chưa đủ
    useGame.setState({
      garden: { ...useGame.getState().garden, preserveMade: { hx_nuoc_mam: 99 } },
      soldEver: { hx_nuoc_mam: 600 },
    } as never);
    useGame.getState().addBrandLine('hx_nuoc_mam');
    expect(useGame.getState().biz.brand!.lines).toHaveLength(0);
    // đủ
    useGame.setState({ garden: { ...useGame.getState().garden, preserveMade: { hx_nuoc_mam: 100 } } } as never);
    useGame.getState().addBrandLine('hx_nuoc_mam');
    expect(useGame.getState().biz.brand!.lines).toHaveLength(1);
    expect(useGame.getState().biz.brand!.lines[0].productId).toBe('hx_nuoc_mam');
  });

  it('đủ slot theo cấp: cấp 100 chỉ mở 1 dòng', () => {
    const s = setUp(100, brand());
    // chỉ có 1 dòng -> món thứ 2 không thêm được ở cấp 100
    useGame.setState({ soldEver: { hx_nuoc_mam: 600, hx_tuong_ban: 600 }, garden: { ...s.garden, preserveMade: { hx_nuoc_mam: 120, hx_tuong_ban: 120 } } } as never);
    useGame.getState().addBrandLine('hx_nuoc_mam');
    useGame.getState().addBrandLine('hx_tuong_ban');
    const lines = useGame.getState().biz.brand!.lines;
    expect(lines).toHaveLength(1); // cấp 100 chỉ 1 slot
  });

  it('bỏ dòng cũng xoá hàng nhãn của dòng đó trong kho', () => {
    setUp(110, brand({ lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 50, sold: 0 }], stock: { hx_nuoc_mam: 7 } }));
    useGame.getState().dropBrandLine('hx_nuoc_mam');
    const b = useGame.getState().biz.brand!;
    expect(b.lines).toHaveLength(0);
    expect(b.stock.hx_nuoc_mam).toBeUndefined();
  });
});

describe('Hệ4-L2 — bán lẻ hàng nhãn: premium theo bậc uy tín, không cộng dồn với nhà trồng, trừ kho', () => {
  it('uy tín thấp (premium 5% < nhà trồng 20%) → trả premium = nhà trồng 20% (lấy cao hơn)', () => {
    const s = setUp(110, brand({ lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 50, sold: 0 }], stock: { hx_nuoc_mam: 5 } }));
    const before = s.money;
    useGame.getState().checkout([{ id: 'hx_nuoc_mam', price: 47000 }]);
    const st = useGame.getState();
    expect(st.biz.brand!.stock.hx_nuoc_mam).toBe(4); // trừ 1 kho nhãn
    expect(st.money - before).toBe(47000 + Math.round(47000 * 0.2)); // 20% premium
  });

  it('uy tín cao (premium 25% > nhà trồng 20%) → trả premium 25%', () => {
    setUp(110, brand({ rep: 90, maxRep: 90, lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 50, sold: 0 }], stock: { hx_nuoc_mam: 5 } }));
    const before = useGame.getState().money;
    useGame.getState().checkout([{ id: 'hx_nuoc_mam', price: 47000 }]);
    const st = useGame.getState();
    expect(st.money - before).toBe(47000 + Math.round(Math.round(47000 * 0.25) / 100) * 100); // 25% premium (tròn trăm)
  });

  it('hàng nhãn hết thì bán như hàng thường (không premium)', () => {
    setUp(110, brand({ rep: 90, maxRep: 90, lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 50, sold: 0 }], stock: {} }));
    const before = useGame.getState().money;
    useGame.getState().checkout([{ id: 'hx_nuoc_mam', price: 47000 }]);
    expect(useGame.getState().money - before).toBe(47000);
  });
});
