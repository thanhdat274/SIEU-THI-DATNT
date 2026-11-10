import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { BRAND_UNLOCK, BRAND_WORKSHOP_MAX_STAFF, brandDealNight, brandFranchiseNight, brandRivalOffer, brandRivalValue, brandWorkshopDay, type BrandState } from '../data/brand';
import { productById } from '../data/products';

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

describe('Hệ4-L3 — xưởng đóng gói: mua/thuê/cho nghỉ, cổng tiền & cấp', () => {
  it('cấp < 100 không mua được xưởng; thiếu tiền thì từ chối giữ tiền', () => {
    setUp(60, brand());
    useGame.getState().buyBrandWorkshop();
    expect(useGame.getState().biz.brand!.workshop).toBeNull();
    setUp(100, brand());
    const before = useGame.getState().money;
    useGame.getState().buyBrandWorkshop(); // còn dư ít hơn 60tr => từ chối
    const st = useGame.getState();
    expect(st.money).toBe(before); // không bị trừ tiền
    expect(st.biz.brand!.workshop).toBeNull();
  });

  it('mua xưởng trừ 60tr, mở được; thuê/cho nghỉ thợ trong giới hạn 3', () => {
    setUp(100, brand());
    useGame.setState({ money: 100_000_000 } as never);
    useGame.getState().buyBrandWorkshop();
    let st = useGame.getState();
    expect(st.money).toBe(100_000_000 - 60_000_000);
    expect(st.biz.brand!.workshop?.open).toBe(true);
    expect(st.biz.brand!.workshop?.staff).toBe(0);
    for (let i = 0; i < 5; i++) useGame.getState().hireBrandWorker();
    expect(useGame.getState().biz.brand!.workshop!.staff).toBe(BRAND_WORKSHOP_MAX_STAFF); // 3, không quá
    useGame.getState().fireBrandWorker();
    expect(useGame.getState().biz.brand!.workshop!.staff).toBe(2);
  });

  it('chưa lập nhãn thì không mua xưởng', () => {
    setUp(100); // không có brand
    useGame.setState({ money: 100_000_000 } as never);
    useGame.getState().buyBrandWorkshop();
    expect(useGame.getState().biz.brand).toBeUndefined();
  });
});

describe('Hệ4-L3 — brandWorkshopDay: đóng hàng chưa nhãn thành hàng nhãn, đúng công suất + phí/lương', () => {
  const wsBrand = (staff: number, stock = {}): BrandState => brand({
    workshop: { open: true, staff, tier: 0 },
    lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 0, sold: 0 }],
    stock,
  });

  it('không xưởng/thợ → không đóng gì, trung tính', () => {
    const r0 = brandWorkshopDay(brand(), { hx_nuoc_mam: 10 }, {}, 100);
    expect(r0.packed).toBe(0);
    expect(r0.storage.hx_nuoc_mam).toBe(10);
  });

  it('đóng đúng công suất (2 thợ × 20 = 40), chuyển storage→stock, trừ phí bao bì + lương', () => {
    const sell = productById('hx_nuoc_mam').sell;
    const r = brandWorkshopDay(wsBrand(2), { hx_nuoc_mam: 100 }, {}, 120);
    expect(r.packed).toBe(40);
    expect(r.storage.hx_nuoc_mam).toBe(60);
    expect(r.brand.stock.hx_nuoc_mam).toBe(40);
    expect(r.brand.lines[0].made).toBe(40);
    expect(r.fee).toBe(Math.round(Math.round(40 * sell * 0.08) / 100) * 100);
    expect(r.wage).toBe(2 * 150000);
    expect(r.brand.lastPackDay).toBe(120);
  });

  it('lấy hàng nhà trồng đóng nhãn → bỏ dấu nhà trồng (bán nhãn lấy premium cao hơn)', () => {
    const r = brandWorkshopDay(wsBrand(1), { hx_nuoc_mam: 10 }, { hx_nuoc_mam: 10 }, 120);
    expect(r.packed).toBe(10);
    expect(r.homegrown.hx_nuoc_mam).toBeUndefined();
    expect(r.brand.stock.hx_nuoc_mam).toBe(10);
  });

  it('hết nguyên liệu → packed 0, lastPackDay không đổi (bắt đầu tính nhãn nguội)', () => {
    const r = brandWorkshopDay(wsBrand(1, { hx_nuoc_mam: 3 }), {}, {}, 120);
    expect(r.packed).toBe(0);
    expect(r.brand.lastPackDay).toBe(0);
  });

  it('công suất chỉ đóng tối đa có sẵn; nhiều dòng chia đúng công suất', () => {
    const b = brand({
      workshop: { open: true, staff: 3, tier: 0 }, // 60/đêm
      lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 0, sold: 0 }, { productId: 'hx_mam_tep', since: 100, made: 0, sold: 0 }],
    });
    const r = brandWorkshopDay(b, { hx_nuoc_mam: 40, hx_mam_tep: 40 }, {}, 130);
    expect(r.packed).toBe(60);
    expect(r.brand.stock.hx_nuoc_mam).toBe(40);
    expect(r.brand.stock.hx_mam_tep).toBe(20);
  });
});

describe('Hệ4-L5 — bỏ mối đại lý (SPEC §4.5c): ký / cam kết / giao kỳ / uy tín theo §4.6', () => {
  /** Nhãn có 1 dòng nước mắm + kho nhãn đủ. */
  const dealBrand = (over: Partial<BrandState> = {}): BrandState => ({
    name: 'Nhà Năm',
    workshop: null, lastPackDay: 0,
    lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 200, sold: 0 }],
    stock: { hx_nuoc_mam: 200 },
    rep: 0, maxRep: 0, repLog: [],
    deals: {}, franchises: [], franchiseDue: {},
    ...over,
  });

  const signAt = (level: number, b: BrandState, day = 100) => {
    const s = useGame.getState();
    useGame.setState({
      level,
      day,
      soldEver: { hx_nuoc_mam: 600 },
      biz: { ...s.biz, brand: b },
    } as never);
  };

  it('cổng ký: cấp/quy tín/dòng — thiếu điều kiện thì không ký', () => {
    // cấp 100 < 110 → không ký
    signAt(100, dealBrand());
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam');
    expect(Object.keys(useGame.getState().biz.brand!.deals)).toHaveLength(0);
    // đủ cấp nhưng uy tín 0 < 20 → không ký
    signAt(115, dealBrand());
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam');
    expect(Object.keys(useGame.getState().biz.brand!.deals)).toHaveLength(0);
    // đủ uy tín → ký được
    useGame.setState({ day: 100, biz: { ...useGame.getState().biz, brand: dealBrand({ rep: 25, maxRep: 25 }) } } as never);
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam');
    expect(useGame.getState().biz.brand!.deals.sap_cho_huyen).toBeTruthy();
    expect(useGame.getState().biz.brand!.deals.sap_cho_huyen.dueDay).toBe(100 + 5); // periodDays 5
  });

  it('cửa hàng đặc sản cần uy tín 40 — chưa đủ thì bị chặn', () => {
    signAt(130, dealBrand({ rep: 25, maxRep: 25 }));
    useGame.getState().acceptBrandDeal('cua_hang_dac_san', 'hx_nuoc_mam');
    expect(Object.keys(useGame.getState().biz.brand!.deals)).toHaveLength(0);
  });

  it('giao đúng hẹn đủ hàng: +tiền, trừ kho nhãn, +2 uy tín, chuỗi +1', () => {
    signAt(125, dealBrand({ rep: 45, maxRep: 45 }));
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam'); // due 125? day=100 -> due 105
    const deal = useGame.getState().biz.brand!.deals.sap_cho_huyen;
    // đưa due về hôm nay để giao đúng hẹn
    useGame.setState({ day: deal.dueDay, biz: { ...useGame.getState().biz, brand: { ...useGame.getState().biz.brand!, deals: { sap_cho_huyen: { ...deal, overdue: false } } } } } as never);
    const before = useGame.getState().money;
    const ok = useGame.getState().deliverBrandDeal('sap_cho_huyen');
    const st = useGame.getState();
    const b = st.biz.brand!;
    expect(ok).toBe(true);
    // 40 đv × giá bán lẻ × 0.82
    expect(st.money - before).toBe(brandDealValueForSap());
    expect(b.stock.hx_nuoc_mam).toBe(200 - 40);
    expect(b.rep).toBe(47); // 45 + 2
    expect(b.lines[0].sold).toBe(40);
    expect(b.deals.sap_cho_huyen.streak).toBe(1);
  });

  it('giao trễ (overdue): −4 uy tín, chuỗi về 0', () => {
    signAt(125, dealBrand({ rep: 45, maxRep: 45 }));
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam');
    const deal = useGame.getState().biz.brand!.deals.sap_cho_huyen;
    useGame.setState({ day: deal.dueDay, biz: { ...useGame.getState().biz, brand: { ...useGame.getState().biz.brand!, deals: { sap_cho_huyen: { ...deal, overdue: true } } } } } as never);
    useGame.getState().deliverBrandDeal('sap_cho_huyen');
    const b = useGame.getState().biz.brand!;
    expect(b.rep).toBe(41); // 45 - 4
    expect(b.deals.sap_cho_huyen.streak).toBe(0);
    expect(b.deals.sap_cho_huyen.missed).toBe(1);
  });

  it('kho nhãn thiếu → không giao được, giữ nguyên', () => {
    signAt(125, dealBrand({ rep: 45, maxRep: 45, stock: { hx_nuoc_mam: 5 } }));
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam');
    const before = useGame.getState().money;
    const ok = useGame.getState().deliverBrandDeal('sap_cho_huyen');
    expect(ok).toBe(false);
    expect(useGame.getState().money).toBe(before);
  });

  it('brandDealNight: kỳ đi qua chưa giao → −8, đủ 3 kỳ hỏng liên tiếp → cắt + reopenDays', () => {
    signAt(125, dealBrand({ rep: 50, maxRep: 50 }));
    useGame.getState().acceptBrandDeal('sap_cho_huyen', 'hx_nuoc_mam'); // due day+5
    // giả lập 3 lần bỏ kỳ liên tiếp
    let b = useGame.getState().biz.brand!;
    for (let i = 0; i < 3; i++) {
      const d = b.deals.sap_cho_huyen;
      // qua hạn 1 ngày
      b = { ...b, deals: { sap_cho_huyen: { ...d, pending: true, dueDay: 100 + (i + 1) * 5 } } };
      useGame.setState({ day: 100 + (i + 1) * 5 + 1, biz: { ...useGame.getState().biz, brand: b } } as never);
      const r = brandDealNight(useGame.getState().biz.brand!, 100 + (i + 1) * 5 + 1);
      b = r.brand;
    }
    expect(b.rep).toBe(50 - 3 * 8);
    expect(b.deals.sap_cho_huyen).toBeUndefined(); // bị cắt
    expect(b.reopenDays!.sap_cho_huyen).toBeGreaterThan(0); // 30 ngày sau mới ký lại
  });
});

/** Giá một kỳ đại lý Sạp chợ huyện (40 đv × bán lẻ × 0.82) — đọc từ brand.ts. */
function brandDealValueForSap() {
  // 40 đơn vị nước mắm bán lẻ × 0.82
  return Math.round(productById('hx_nuoc_mam').sell * 40 * 0.82);
}

describe('Hệ4-L6 — bỏ mối cho đối thủ (SPEC §4.5d): lời chào tất định + giành tiền vs nuôi rival', () => {
  const rivalBrand = (over: Partial<BrandState> = {}): BrandState => ({
    name: 'Nhà Năm',
    workshop: null, lastPackDay: 0,
    lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 200, sold: 0 }],
    stock: { hx_nuoc_mam: 100 },
    rep: 50, maxRep: 50, repLog: [],
    deals: {}, franchises: [], franchiseDue: {},
    ...over,
  });
  const setRivalCtx = (level: number, b: BrandState, rival: { strength: number } | null, day: number) => {
    const s = useGame.getState();
    useGame.setState({ level, day, soldEver: { hx_nuoc_mam: 600 }, biz: { ...s.biz, brand: b, rival } } as never);
  };

  it('no rival / not offer day → no offer; offer day with stock → offer picks line with most stock', () => {
    // day % 8 === 3 mới có chào
    setRivalCtx(120, rivalBrand(), { strength: 40 }, 11); // 11%8=3
    const b = useGame.getState().biz.brand!;
    const off = brandRivalOffer(b, { strength: 40 }, 11);
    expect(off).toEqual({ productId: 'hx_nuoc_mam', units: 30, day: 11 }); // min(30,100)
    // không đúng pha ngày
    expect(brandRivalOffer(b, { strength: 40 }, 12)).toBeNull();
    // rival đã đóng cửa
    expect(brandRivalOffer(b, null, 11)).toBeNull();
    // hết hàng thì không chào
    expect(brandRivalOffer(rivalBrand({ stock: {} }), { strength: 40 }, 11)).toBeNull();
  });

  it('acceptRivalSupply: +tiền 95%, rival +1 sức mạnh, trừ kho, đếm rivalSold', () => {
    setRivalCtx(120, rivalBrand(), { strength: 40 }, 11);
    const b0 = useGame.getState().biz.brand!;
    useGame.setState({ day: 11, biz: { ...useGame.getState().biz, brand: { ...b0, rivalOffer: { productId: 'hx_nuoc_mam', units: 30, day: 11 } } } } as never);
    const before = useGame.getState().money;
    useGame.getState().acceptRivalSupply();
    const st = useGame.getState();
    expect(st.money - before).toBe(brandRivalValue({ productId: 'hx_nuoc_mam', units: 30 }));
    expect(st.biz.rival!.strength).toBe(41); // +1
    expect(st.biz.brand!.stock.hx_nuoc_mam).toBe(100 - 30);
    expect(st.biz.brand!.rivalSold).toBe(30);
    expect(st.biz.brand!.rivalOffer).toBeUndefined();
  });

  it('lời chào hết hạn (quá 3 ngày) thì từ chối, không trừ hàng', () => {
    setRivalCtx(120, rivalBrand(), { strength: 40 }, 15); // offer hôm 11, giờ 15 → quá 3 ngày
    const b0 = useGame.getState().biz.brand!;
    useGame.setState({ day: 15, biz: { ...useGame.getState().biz, brand: { ...b0, rivalOffer: { productId: 'hx_nuoc_mam', units: 30, day: 11 } } } } as never);
    const before = useGame.getState().money;
    useGame.getState().acceptRivalSupply();
    expect(useGame.getState().money).toBe(before);
    expect(useGame.getState().biz.brand!.stock.hx_nuoc_mam).toBe(100);
    expect(useGame.getState().biz.brand!.rivalOffer).toBeUndefined();
  });
});

describe('Hệ4-L8 — nhượng quyền (SPEC §4.5e): mở điểm / tuần nhập hàng / đóng', () => {
  const fBrand = (over: Partial<BrandState> = {}): BrandState => ({
    name: 'Nhà Năm',
    workshop: null, lastPackDay: 0,
    lines: [{ productId: 'hx_nuoc_mam', since: 100, made: 500, sold: 0 }],
    stock: { hx_nuoc_mam: 500 },
    rep: 70, maxRep: 70, repLog: [],
    deals: {}, franchises: [], franchiseDue: {},
    ...over,
  });
  const fc = (level: number, b: BrandState, day = 200, money = 200_000_000) => {
    const s = useGame.getState();
    useGame.setState({ level, day, money, soldEver: { hx_nuoc_mam: 600 }, biz: { ...s.biz, brand: b } } as never);
  };

  it('cổng mở: cấp 150 / uy tín 60 / 80tr setup / không quá 3 điểm', () => {
    fc(140, fBrand()); // cấp chưa đủ
    useGame.getState().openFranchise('pho_co');
    expect(useGame.getState().biz.brand!.franchises).toHaveLength(0);
    fc(160, fBrand({ rep: 50, maxRep: 50 })); // uy tín < 60
    useGame.getState().openFranchise('pho_co');
    expect(useGame.getState().biz.brand!.franchises).toHaveLength(0);
    fc(160, fBrand(), 200, 50_000_000); // thiếu tiền
    useGame.getState().openFranchise('pho_co');
    expect(useGame.getState().biz.brand!.franchises).toHaveLength(0);
    fc(160, fBrand()); // đủ → mở được
    const before = useGame.getState().money;
    useGame.getState().openFranchise('pho_co');
    const st = useGame.getState();
    expect(st.money).toBe(before - 80_000_000);
    expect(st.biz.brand!.franchises).toHaveLength(1);
    expect(st.biz.brand!.franchiseDue.pho_co).toBe(200 + 7);
  });

  it('brandFranchiseNight: mỗi đêm điểm khỏe +0,2 uy tín + phí; tuần đủ hàng → khoẻ lên, thiếu → health giảm + −3 uy tín', () => {
    const b0 = fBrand({ rep: 70, maxRep: 70, franchises: [{ id: 'pho_co', openedDay: 200, health: 60, missedWeeks: 0 }], franchiseDue: { pho_co: 201 } });
    const r = brandFranchiseNight(b0, 200);
    // ngày 200 chưa tới tuần 201 → chỉ +0,2 uy tín + phí
    expect(r.brand.rep).toBeCloseTo(70 + 0.2);
    expect(r.income).toBeGreaterThan(0);
    expect(r.brand.franchises[0].health).toBe(60);
    // tới tuần 201, kho đủ 500 ≥ 40 → xe chở đủ, khoẻ lên
    const r2 = brandFranchiseNight(r.brand, 201);
    expect(r2.brand.franchises[0].health).toBe(70);
    expect(r2.brand.stock.hx_nuoc_mam).toBe(500 - 40);
    expect(r2.brand.franchiseDue.pho_co).toBe(201 + 7);
  });

  it('3 tuần thiếu hàng liên tiếp → điểm đóng, mất suất', () => {
    let b: BrandState = fBrand({ rep: 70, maxRep: 70, stock: { hx_nuoc_mam: 5 }, franchises: [{ id: 'pho_co', openedDay: 200, health: 60, missedWeeks: 0 }], franchiseDue: { pho_co: 201 } });
    let day = 201;
    for (let i = 0; i < 3; i++) {
      const r = brandFranchiseNight(b, day);
      b = r.brand;
      day += 7;
    }
    // 3 tuần hỏng → điểm đóng (mai không còn)
    expect(b.franchises.some((f) => f.id === 'pho_co')).toBe(false);
    expect(b.rep).toBeLessThan(70); // bị trừ uy tín mỗi tuần thiếu
  });
});
