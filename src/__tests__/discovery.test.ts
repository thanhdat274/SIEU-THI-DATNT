import { beforeEach, describe, expect, it } from 'vitest';
import {
  DISCOVERY_MILESTONES, DISCOVERY_REWARDS, discoveryReward, discoveryRows, discoverStatusOf,
  milestonesClaimed, nextMilestone, ownedBy, recordSold, soldCount, totalProducts,
  type DiscoveryStatus, type DiscoveryRow,
} from '../data/discovery';
import { newGameData, useGame } from '../core/store';
import { newBiz } from '../data/biz';
import { PRODUCTS, productById } from '../data/products';

/**
 * Bộ test GĐ36 — Sổ tay Tiệm (Discovery Collection): hàm thuần liệt kê món theo trạng thái
 * (khóa theo cấp / chưa bán / đã bán), mốc thưởng nhỏ, quét dải + phòng thủ. Cuối file có vài
 * test tích hợp qua store`recordDiscovery` để chốt mạch thưởng mốc trao đúng một lần.
 */

const noFurniture: { tiers: { productId: string | null; count: number }[] }[] = [];

/** 10 món đầu tiên trong mẫu hàng (đủ chạm mốc 10). */
const firstIds = (n: number) => PRODUCTS.slice(0, n).map((p) => p.id);

describe('tổng quan số món hàng', () => {
  it('tổng món trong album > 0 và khớp chính xác PRODUCTS', () => {
    expect(totalProducts()).toBe(PRODUCTS.length);
    expect(totalProducts()).toBeGreaterThan(0);
  });

  it('mọi id trong PRODUCTS là hợp lệ cho recordSold (không id chết làm phình sổ)', () => {
    const ever = recordSold({}, PRODUCTS.map((p) => p.id));
    expect(Object.keys(ever).length).toBe(PRODUCTS.length);
  });
});

describe('recordSold — cộng dồn "món đã bán"', () => {
  it('tăng số món đã bán cho từng món, trả object MỚI', () => {
    const ever0 = { mi: 2 };
    const next = recordSold(ever0, ['mi', 'nuoc', 'banh']);
    expect(next).not.toBe(ever0); // không đổi tại chỗ
    expect(next.mi).toBe(3);
    expect(next.nuoc).toBe(1);
    expect(next.banh).toBe(1);
    expect(ever0.mi).toBe(2); // bản gốc không bị vấy
  });

  it('gọi nhiều lần cộng dồn (n lần 1 món → n)', () => {
    const ever = recordSold(recordSold({}, ['mi']), ['mi', 'mi']);
    expect(ever.mi).toBe(3);
  });

  it('id không phải món thật thì bỏ qua', () => {
    const ever = recordSold({}, ['mi', 'khong_ton_tai', 'lai_khong_co']);
    expect(Object.keys(ever)).toEqual(['mi']);
  });

  it('không có món nào hợp lệ → trả về đúng tham chiếu cũ (mốc no-op ở store dựa vào đây)', () => {
    const ever = { mi: 1 };
    expect(recordSold(ever, ['khong_ton_tai'])).toBe(ever);
    expect(recordSold(ever, [])).toBe(ever);
  });
});

describe('soldCount — số MÓN đã bán (khác nhau)', () => {
  it('rỗng → 0', () => {
    expect(soldCount({})).toBe(0);
  });

  it('đếm số món khác nhau, không phải tổng số đơn vị', () => {
    expect(soldCount({ mi: 5, nuoc: 2 })).toBe(2);
  });

  it('giá trị về 0 (hoặc âm) không tính làm đã bán', () => {
    expect(soldCount({ mi: 1, nuoc: 0, banh: -3 })).toBe(1);
  });
});

describe('discoverStatusOf — phân loại trạng thái', () => {
  it('đã bán (soldQty>0) thắng mọi case kể cả khi quá cấp (phòng thủ)', () => {
    expect(discoverStatusOf(1, 99, 5)).toBe('sold');
    expect(discoverStatusOf(3, 100, 1)).toBe('sold');
  });

  it('quá cấp mở khóa (unlock > level) → locked', () => {
    expect(discoverStatusOf(0, 20, 10)).toBe('locked');
  });

  it('chưa bán và đủ cấp → unbought', () => {
    expect(discoverStatusOf(0, 5, 10)).toBe('unbought');
    expect(discoverStatusOf(0, 10, 10)).toBe('unbought'); // sát biên đủ cấp
  });
});

describe('ownedBy — món đang sở hữu (kho hoặc kệ)', () => {
  it('kho >0 là đang sở hữu; kho 0 thì không', () => {
    const owned = ownedBy({ mi: 4, nuoc: 0, banh: -1 }, noFurniture);
    expect(owned.has('mi')).toBe(true);
    expect(owned.has('nuoc')).toBe(false);
    expect(owned.has('banh')).toBe(false);
  });

  it('hàng bày trên kệ (count>0) cũng là đang sở hữu; ô rỗng hay productId null thì không', () => {
    const furniture = [{ tiers: [
      { productId: 'gao', count: 3 }, { productId: 'kem', count: 0 }, { productId: null, count: 5 }, { productId: 'sua', count: 2 },
    ] }];
    const owned = ownedBy({}, furniture);
    expect(owned.has('gao')).toBe(true);
    expect(owned.has('kem')).toBe(false);   // count 0
    expect(owned.has('sua')).toBe(true);
  });
});

describe('discoveryRows — album theo trạng thái', () => {
  it('trả về đúng số món hàng của tiệm, mỗi món có status hợp lệ', () => {
    const rows = discoveryRows(10, {}, noFurniture, {});
    expect(rows.length).toBe(PRODUCTS.length);
    const statuses: DiscoveryStatus[] = ['sold', 'unbought', 'locked'];
    for (const r of rows) {
      expect(statuses).toContain(r.status);
      expect(r.name).toBe(productById(r.id).name);
      expect(r.soldQty).toBe(0);
    }
  });

  it('phân loại đúng: món bán được → sold; món quá cấp → locked; còn lại unbought', () => {
    // cấp 10: 'mi','nuoc','banh' cấp 1 (đủ), 'ngot' cấp 2 (đủ), 'diem' cấp 4 (đủ), 'sua' cấp 5...
    const rows = discoveryRows(2, {}, noFurniture, { mi: 3, banh: 1 });
    const byId = (id: string) => rows.find((r) => r.id === id)!;
    expect(byId('mi').status).toBe('sold');
    expect(byId('banh').status).toBe('sold');
    expect(byId('nuoc').status).toBe('unbought');   // đủ cấp (1) chưa bán
    expect(byId('diem').status).toBe('locked');       // mở cấp 4 > 2
  });

  it('owned phản ánh kho và kệ (món đang có nhưng chưa bán vẫn unbought)', () => {
    const furniture = [{ tiers: [{ productId: 'nuoc', count: 4 }] }];
    const rows = discoveryRows(5, { mi: 10 }, furniture, {});
    const nuoc = rows.find((r) => r.id === 'nuoc')!;
    const mi = rows.find((r) => r.id === 'mi')!;
    expect(nuoc.owned).toBe(true);
    expect(mi.owned).toBe(true);
    expect(nuoc.status).toBe('unbought');
    expect(mi.status).toBe('unbought');
    // món không có ở đâu → owned false
    const gao = rows.find((r) => r.id === 'gao')!;
    expect(gao.owned).toBe(false);
  });

  it('soldQty lấy từ soldEver; xếp theo ngành rồi cấp mở khóa', () => {
    const rows = discoveryRows(10, {}, noFurniture, { mi: 7 });
    const mi = rows.find((r) => r.id === 'mi')!;
    expect(mi.soldQty).toBe(7);
    expect(mi.status).toBe('sold');
    // kiểm tra sort: cùng ngành thì unlock không giảm
    const dry = rows.filter((r) => r.category === 'dry');
    for (let i = 1; i < dry.length; i++) expect(dry[i].unlock).toBeGreaterThanOrEqual(dry[i - 1].unlock);
  });
});

describe('DISCOVERY_MILESTONES & mốc thưởng', () => {
  it('4 ngưỡng tăng dần (10/25/50/100) và đều có thưởng dương', () => {
    expect(DISCOVERY_MILESTONES).toEqual([10, 25, 50, 100]);
    for (const m of DISCOVERY_MILESTONES) {
      const r = DISCOVERY_REWARDS[m];
      expect(r).toBeTruthy();
      expect(r.money).toBeGreaterThan(0);
      expect(r.xp).toBeGreaterThan(0);
    }
  });

  it('discoveryReward: mốc lạ → {0,0} (phòng thủ)', () => {
    expect(discoveryReward(999)).toEqual({ money: 0, xp: 0 });
    expect(discoveryReward(10)).toBe(DISCOVERY_REWARDS[10]);
  });
});

describe('milestonesClaimed — các mốc vừa đạt chưa nhận', () => {
  it('chưa đủ mốc → rỗng', () => {
    expect(milestonesClaimed(0, [])).toEqual([]);
    expect(milestonesClaimed(9, [])).toEqual([]);
  });

  it('đạt đúng / vượt một hay nhiều mốc', () => {
    expect(milestonesClaimed(10, [])).toEqual([10]);
    expect(milestonesClaimed(30, [])).toEqual([10, 25]);
    expect(milestonesClaimed(120, [])).toEqual([10, 25, 50, 100]);
  });

  it('mốc đã nhận rồi thì không trả lại', () => {
    expect(milestonesClaimed(30, [10, 25])).toEqual([]);
    expect(milestonesClaimed(60, [10, 25, 50])).toEqual([]);
  });
});

describe('nextMilestone — mốc kế tiếp để mồi người chơi', () => {
  it('trả mốc chưa đạt đầu tiên; null khi nhận hết', () => {
    expect(nextMilestone(0, [])).toBe(10);
    expect(nextMilestone(12, [])).toBe(25);
    expect(nextMilestone(120, [10, 25, 50, 100])).toBeNull();
  });

  it('mốc dưới count nhưng chưa claimed thì không phải "kế tiếp" (đã vượt qua)', () => {
    expect(nextMilestone(60, [])).toBe(100); // 10/25/50 đã đạt, mốc kế là 100
  });
});

describe('quét dải — tăng dần count và cấp', () => {
  it('toàn dải count 0..120: milestonesClaimed tăng đơn điệu, nextMilestone giảm một mốc duy nhất', () => {
    let claimed: number[] = [];
    let prev = 0;
    for (let c = 0; c <= 120; c++) {
      const newly = milestonesClaimed(c, claimed);
      for (const m of newly) claimed = [...claimed, m].sort((a, b) => a - b);
      // mốc đạt phải ≤ count, và mốc chưa đạt phải > count
      for (const m of claimed) expect(m).toBeLessThanOrEqual(c);
      const next = nextMilestone(c, claimed);
      if (next !== null) expect(next).toBeGreaterThan(c);
      // số mốc đã nhận tăng đơn điệu theo count
      expect(claimed.length).toBeGreaterThanOrEqual(prev);
      expect(claimed.length).toBeLessThanOrEqual(DISCOVERY_MILESTONES.length);
      prev = claimed.length;
    }
  });

  it("toàn dải cấp: món aomua (cấp 1) không bao giờ locked, món cao cấp locked tới khi đủ cấp", () => {
    const all = PRODUCTS;
    for (let lv = 1; lv <= 100; lv++) {
      const rows = discoveryRows(lv, {}, noFurniture, {});
      for (const r of rows) {
        if (r.unlock <= lv) expect(r.status, r.id).not.toBe('locked');
      }
      // mọi món đủ cấp đều unbought khi chưa bán
      expect(rows.filter((r) => r.status === 'locked').length).toBe(all.filter((p) => p.unlock > lv).length);
    }
  });
});

describe('tích hợp qua store — recordDiscovery trao mốc đúng một lần', () => {
  beforeEach(() => {
    useGame.setState({ soldEver: {}, biz: { ...newBiz(), discoveryClaimed: [] }, money: 100000 });
  });

  it('bán đủ 10 món → mốc 10 trao thưởng + ghi claimed', () => {
    const ids = firstIds(10);
    useGame.getState().recordDiscovery(ids);
    const s = useGame.getState();
    expect(soldCount(s.soldEver)).toBe(10);
    expect(s.biz.discoveryClaimed).toEqual([10]);
    expect(s.money).toBe(100000 + DISCOVERY_REWARDS[10].money);
    // XP đã cộng (không NaN)
    expect(Number.isFinite(useGame.getState().xp)).toBe(true);
  });

  it('gọi lại cùng bộ món không trao lại mốc (count không đổi)', () => {
    const ids = firstIds(10);
    useGame.getState().recordDiscovery(ids);
    useGame.getState().recordDiscovery(ids);
    const s = useGame.getState();
    expect(s.biz.discoveryClaimed).toEqual([10]);
    expect(s.money).toBe(100000 + DISCOVERY_REWARDS[10].money);
  });

  it('bán 30 món khác nhau trong một lần → trao cả mốc 10 và 25', () => {
    useGame.getState().recordDiscovery(firstIds(30));
    const s = useGame.getState();
    expect(s.biz.discoveryClaimed).toEqual([10, 25]);
    expect(s.money).toBe(100000 + DISCOVERY_REWARDS[10].money + DISCOVERY_REWARDS[25].money);
  });

  it('id không hợp lệ → no-op (soldEver/claimed/money không đổi)', () => {
    useGame.getState().recordDiscovery(['khong_ton_tai']);
    const s = useGame.getState();
    expect(s.soldEver).toEqual({});
    expect(s.biz.discoveryClaimed).toEqual([]);
    expect(s.money).toBe(100000);
  });

  it('cứ mỗi món mới thì recordDiscovery thêm đúng 1 lượt bán nhưng mốc chỉ cháy một lần', () => {
    // mốc 10, 25 đều là "số MÓN đã bán", không phải tổng đơn vị
    useGame.getState().recordDiscovery(firstIds(10));
    useGame.getState().recordDiscovery(firstIds(25)); // chứa 10 món cũ + 15 món mới
    const s = useGame.getState();
    expect(s.biz.discoveryClaimed).toEqual([10, 25]);
  });
});
