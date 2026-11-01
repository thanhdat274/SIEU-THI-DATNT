import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type DayStats } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import {
  newBiz, newRival, RIVAL_SHOPS, rivalTier, type Rival, type RivalPersonality,
} from '../data/biz';
import { STORY_RIVAL_NAME } from '../data/chapters';

/** Bộ test "rival đời mới": catalog 12 cửa hàng, bậc quy mô theo thế hệ, tính cách không lặp liên tiếp. */

describe('RIVAL_SHOPS — catalog 12 cửa hàng đối thủ', () => {
  it('đúng 12 mục, không trùng tên, mọi blurb có nội dung và không quá 120 ký tự', () => {
    expect(RIVAL_SHOPS).toHaveLength(12);
    expect(new Set(RIVAL_SHOPS.map((s) => s.name)).size).toBe(12);
    for (const s of RIVAL_SHOPS) {
      expect(s.name.trim().length, s.name).toBeGreaterThan(0);
      expect(s.blurb.length, s.name).toBeGreaterThan(0);
      expect(s.blurb.length, s.name).toBeLessThanOrEqual(120);
    }
  });
  it('4 tên đời cũ giữ nguyên 4 vị trí đầu; rival cốt truyện không lọt catalog', () => {
    expect(RIVAL_SHOPS.slice(0, 4).map((s) => s.name)).toEqual([
      'Tạp hóa Phát Đạt', 'Mini mart Hưng Thịnh', 'Tiệm Cô Ba Mới', 'Cửa hàng 24h Ánh Dương',
    ]);
    expect(RIVAL_SHOPS.some((s) => s.name === STORY_RIVAL_NAME)).toBe(false);
  });
});

describe('rivalTier — bậc quy mô theo thế hệ', () => {
  it('biên gen 1/2/3/5/6/9/10/15 đúng bậc', () => {
    const expectTier = (gen: number, label: string, icon: string) =>
      expect(rivalTier(gen), `gen ${gen}`).toEqual({ label, icon });
    expectTier(1, 'cửa hàng', '🏪');
    expectTier(2, 'cửa hàng', '🏪');
    expectTier(3, 'mini mart', '🏬');
    expectTier(5, 'mini mart', '🏬');
    expectTier(6, 'chuỗi cửa hàng', '🏢');
    expectTier(9, 'chuỗi cửa hàng', '🏢');
    expectTier(10, 'trung tâm thương mại', '🏛️');
    expectTier(15, 'trung tâm thương mại', '🏛️');
  });
});

describe('newRival — tránh lặp tính cách', () => {
  it('truyền avoid thì personality không bao giờ bằng avoid (50 lần, rng thật)', () => {
    for (let i = 0; i < 50; i++) {
      expect(newRival('X', 60, 1, Math.random, 'cutter').personality, 'avoid cutter').not.toBe('cutter');
      expect(newRival('X', 60, 1, Math.random, 'quality').personality, 'avoid quality').not.toBe('quality');
      expect(newRival('X', 60, 1, Math.random, 'aggressive').personality, 'avoid aggressive').not.toBe('aggressive');
    }
  });
  it('không truyền avoid giữ hành vi cũ: rút ngẫu nhiên trong đủ 3 tính cách, không gắn blurb', () => {
    const seen = new Set<RivalPersonality>();
    for (let i = 0; i < 50; i++) {
      const r = newRival('X', 60, 1);
      expect(['cutter', 'quality', 'aggressive']).toContain(r.personality);
      expect(r.blurb).toBeUndefined(); // đường rival cốt truyện gọi newRival không blurb
      seen.add(r.personality!);
    }
    expect(seen.size).toBe(3);
  });
  it('rng vẫn quyết định lựa chọn trong pool còn lại sau khi loại avoid', () => {
    // rng 0 → phần tử đầu pool: tránh cutter thì đầu pool là quality; đủ 3 tính cách thì như cũ là cutter
    expect(newRival('X', 60, 1, () => 0, 'cutter').personality).toBe('quality');
    expect(newRival('X', 60, 1, () => 0).personality).toBe('cutter');
    // rng 0.99 → phần tử cuối pool: tránh quality thì pool còn cutter/aggressive → aggressive
    expect(newRival('X', 60, 1, () => 0.99, 'quality').personality).toBe('aggressive');
  });
});

describe('tái sinh rival qua bizEndOfDay — đời mới có blurb, bậc, tính cách khác lượt trước', () => {
  const rand = Math.random;
  beforeEach(() => {
    Math.random = () => 0.01; // luôn qua cổng tái sinh 25%, không rơi vào xả hàng/trả đũa gây nhiễu
    useGame.setState({ ...newGameData(), day: 10, level: 30, money: 5000000, biz: { ...newBiz() } });
  });
  afterEach(() => { Math.random = rand; });

  const lowStats = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });

  /** Bóp sức mạnh rival hiện còn về 1 để đợt phản công quảng cáo kết liễu được trong đêm. */
  const weaken = () => {
    const s = useGame.getState();
    if (!s.biz.rival) return;
    useGame.setState({ biz: { ...s.biz, rival: { ...s.biz.rival, strength: 1 } } });
  };
  /** Kết liễu rival bằng đợt phản công quảng cáo, commit biz và sang ngày mới. */
  const beatCurrent = () => {
    const s = useGame.getState();
    const out = bizEndOfDay({ ...s, biz: { ...s.biz, counter: { tactic: 'ad', day: s.day } } }, lowStats());
    useGame.setState({ biz: out.biz, day: s.day + 1 });
    return out;
  };
  /** Tua rivalNextDay về quá khứ rồi sang ngày mới để rival đời mới khai trương. */
  const nextGeneration = () => {
    const s = useGame.getState();
    const out = bizEndOfDay({ ...s, biz: { ...s.biz, rivalNextDay: 0 } }, lowStats());
    useGame.setState({ biz: out.biz, day: s.day + 1 });
    return out;
  };

  it('rival đóng cửa: đời mới lấy đúng mục catalog, có blurb, tính cách khác rival vừa đóng cửa', () => {
    const old: Rival = { name: 'Rival đời cũ', strength: 1, openedDay: 9, personality: 'quality', blurb: 'Chuyện cũ.' };
    useGame.setState({ biz: { ...useGame.getState().biz, rival: old } });
    const killOut = beatCurrent();
    expect(killOut.biz.rival).toBeNull();
    expect(killOut.biz.rivalsBeaten).toBe(1);
    expect(killOut.biz.lastRivalPers).toBe('quality');
    const birthOut = nextGeneration();
    const shop = RIVAL_SHOPS[1 % RIVAL_SHOPS.length];
    expect(birthOut.biz.rival?.name).toBe(shop.name);
    expect(birthOut.biz.rival?.blurb).toBe(shop.blurb);
    expect(birthOut.biz.rival?.personality).not.toBe('quality');
    const newsLine = birthOut.news.find((n) => n.includes('khai trương'));
    expect(newsLine).toContain(shop.name);
    expect(newsLine).toContain(`(bậc ${rivalTier(2).label})`);
    expect(newsLine).toContain(`"${shop.blurb}"`);
  });

  it('6 thế hệ liền: tên theo catalog đúng thứ tự gen, không hai thế hệ liên tiếp cùng tính cách', () => {
    useGame.setState({
      biz: { ...useGame.getState().biz, rival: { name: 'Rival đời cũ', strength: 1, openedDay: 9, personality: 'quality' } },
    });
    let prevPers: RivalPersonality = 'quality';
    for (let gen = 1; gen <= 6; gen++) {
      if (gen > 1) weaken(); // rival đời mới sinh ra mạnh, bóp về 1 để lượt sau kết liễu được
      const killOut = beatCurrent();
      expect(killOut.biz.rival, `thế hệ ${gen} phải đóng cửa`).toBeNull();
      const birthOut = nextGeneration();
      const shop = RIVAL_SHOPS[gen % RIVAL_SHOPS.length];
      expect(birthOut.biz.rival?.name, `thế hệ ${gen}`).toBe(shop.name);
      expect(birthOut.biz.rival?.blurb, `thế hệ ${gen}`).toBe(shop.blurb);
      const pers = birthOut.biz.rival?.personality;
      expect(pers, `thế hệ ${gen} phải có tính cách`).toBeDefined();
      expect(pers, `thế hệ ${gen} không lặp thế hệ ${gen - 1}`).not.toBe(prevPers);
      prevPers = pers!;
    }
    expect(useGame.getState().biz.rivalsBeaten).toBe(6);
  });
});
