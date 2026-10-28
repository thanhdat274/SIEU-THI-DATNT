import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type GameState } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import {
  PRESTIGE_MIN_LEVEL, PRESTIGE_MIN_REVENUE, PRESTIGE_BONUS, PRESTIGE_MAX_LEVEL,
  prestigeEligible, nextBonus, revenueFactor, prestigeRestart,
} from '../core/prestige';
import { productById } from '../data/products';
import { newQuanNuoc } from '../data/quanNuoc';
import { useSession } from '../net/session';

/**
 * Bộ test GĐ-PRESTIGE/NG+ — "Tái sinh": khi đủ cấp 60 + doanh thu trọn đời 100 triệu, người chơi
 * bắt đầu ván mới giữ BỘ SƯU TẬP (thành tựu, danh hiệu, kỹ năng, trang phục, cốt truyện, nhà, xe,
 * thú cưng, slime tổng...) nhưng reset tiền/cấp/ngày/kho/tiệm, đổi lấy thưởng doanh thu cộng dồn.
 *
 * Hợp đồng Dev export từ src/core/prestige.ts + store action `doPrestige`; chạy node thuần, không
 * phụ thuộc three/React. Nếu Dev chưa hoàn tất export, một số test sẽ fail khi chạy — Leader chạy lại sau.
 */

/** Dựng một ván "giàu" đủ điều kiện tái sinh với đầy đủ bộ sưu tập để kiểm giữ/reset. */
const richState = (): GameState => {
  const s = newGameData() as GameState;
  // Ván đã chơi lâu: cấp, tiền, ngày cao + doanh thu trọn đời lớn
  s.level = 60;
  s.money = 999_999_999;
  s.day = 90;
  s.totals = { ...s.totals, revenue: 250_000_000, customers: 9000, itemsSold: 12000, spent: 500_000_000 };
  // — Bộ sưu tập / tiến hóa sẽ được GIỮ —
  s.biz.achievements = ['ach_mo_cua', 'ach_tram_trieu'];
  s.biz.chapters = ['chap_binh_1'];
  s.biz.chapterPending = 'chap_binh_2';
  s.biz.story = { binh: 3, lan: 1 };
  s.biz.home = ['bed', 'tv', 'fridge'];
  s.biz.vehicle = 'moto';
  s.biz.pets = { cat: { fedDay: 30 }, dog: { fedDay: 40 } };
  s.biz.breakfastDay = 21;
  s.biz.tutorialOff = true;
  s.biz.rival = { name: 'Đối thủ X', strength: 55, openedDay: 60 };
  s.biz.rivalsBeaten = 7;
  s.titles = ['thuong_gia_tai_ba'];
  s.skills = ['negotiator', 'big_basket'];
  s.costume = 'ao_dai';
  s.giftStreak = 4; s.giftLastDay = 77; s.giftGraceDay = 10; s.wheelLastDay = 70; s.wheelBoost = 3;
  s.biz.prestige = { level: 2, bonus: 0.24 };
  // — Phần sẽ bị RESET —
  s.furniture = [...s.furniture, s.furniture[0], s.furniture[1], s.furniture[0]];
  s.storage = { mi: 500, nuoc: 400, banh: 300, cafe: 200 };
  s.garden = { ...s.garden, land: 3, wood: 99 };
  s.biz.quanNuoc = { open: true, staff: 2, price: 'cao' };
  s.regulars = { binh: {} as GameState['regulars'][string] };
  return s;
};

describe('Hằng số prestige + mặc định ván mới', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('các hằng số hợp đồng khớp', () => {
    expect(PRESTIGE_MIN_LEVEL).toBe(60);
    expect(PRESTIGE_MIN_REVENUE).toBe(100_000_000);
    expect(PRESTIGE_MAX_LEVEL).toBe(6);
    expect(PRESTIGE_BONUS).toBe(0.08);
  });

  it('newGameData đặt biz.prestige mặc định {level:0, bonus:0}', () => {
    expect(newGameData().biz.prestige).toEqual({ level: 0, bonus: 0, goalsClaimed: [] });
  });

  it('revenueFactor: 0→1 (save cũ vô hại), 0.08→1.08', () => {
    expect(revenueFactor(0)).toBe(1);
    expect(revenueFactor(PRESTIGE_BONUS)).toBeCloseTo(1.08);
    expect(revenueFactor(0.48)).toBeCloseTo(1.48);
  });

  it('bản lưu cũ thiếu biz.prestige: applySnapshot bù mặc định, không vỡ', () => {
    const save = snapshot();
    delete (save.biz as unknown as Record<string, unknown>).prestige;
    applySnapshot(save);
    const s = useGame.getState();
    expect(s.biz.prestige).toEqual({ level: 0, bonus: 0, goalsClaimed: [] });
  });
});

describe('prestigeEligible — ranh giới', () => {
  it('level: 59 chưa đủ, 60 đủ (100M, prestige 0)', () => {
    expect(prestigeEligible(59, PRESTIGE_MIN_REVENUE, 0)).toBe(false);
    expect(prestigeEligible(60, PRESTIGE_MIN_REVENUE, 0)).toBe(true);
  });

  it('doanh thu: 99.999.999 chưa đủ, 100.000.000 đủ (level 60)', () => {
    expect(prestigeEligible(60, PRESTIGE_MIN_REVENUE - 1, 0)).toBe(false);
    expect(prestigeEligible(60, PRESTIGE_MIN_REVENUE, 0)).toBe(true);
  });

  it('prestige level: 5 đủ, 6 đã tối đa nên false', () => {
    expect(prestigeEligible(60, PRESTIGE_MIN_REVENUE, 5)).toBe(true);
    expect(prestigeEligible(60, PRESTIGE_MIN_REVENUE, 6)).toBe(false);
  });
});

describe('nextBonus', () => {
  it('0→0.08, 1→0.16, 5→0.48 (=(level+1)×0.08), quét 0..5', () => {
    expect(nextBonus(0)).toBe(0.08);
    expect(nextBonus(1)).toBe(0.16);
    expect(nextBonus(5)).toBe(0.48);
    for (let lv = 0; lv <= 5; lv++) {
      expect(nextBonus(lv)).toBeCloseTo((lv + 1) * PRESTIGE_BONUS);
    }
  });
});

describe('doPrestige — chưa đủ điều kiện thì no-op', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('cấp thấp (40) dù doanh thu cao vẫn không đổi state', () => {
    useGame.setState({ level: 40, totals: { ...useGame.getState().totals, revenue: 500_000_000 } });
    const before = { money: useGame.getState().money, level: useGame.getState().level, prestige: useGame.getState().biz.prestige };
    const r = useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.money).toBe(before.money);
    expect(s.level).toBe(before.level);
    expect(s.biz.prestige).toEqual(before.prestige);
    void r;
  });

  it('đủ cấp 60 nhưng doanh thu chưa tới 100M thì no-op', () => {
    useGame.setState({ level: 60, totals: { ...useGame.getState().totals, revenue: PRESTIGE_MIN_REVENUE - 1 } });
    const before = { money: useGame.getState().money, prestige: useGame.getState().biz.prestige };
    useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.money).toBe(before.money);
    expect(s.biz.prestige).toEqual(before.prestige);
  });

  it('đã đạt prestige tối đa (6) thì no-op', () => {
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      totals: { ...s0.totals, revenue: 500_000_000 },
      biz: { ...s0.biz, prestige: { level: PRESTIGE_MAX_LEVEL, bonus: 0.48 } },
    });
    const before = { money: useGame.getState().money, level: useGame.getState().level };
    useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.money).toBe(before.money);
    expect(s.level).toBe(before.level);
    expect(s.biz.prestige.level).toBe(PRESTIGE_MAX_LEVEL);
  });
});

describe('prestigeRestart (hàm thuần) — giữ bộ sưu tập', () => {
  it('giữ thành tựu, danh hiệu, kỹ năng, trang phục, cốt truyện, nhà/xe/thú cưng, slime tổng', () => {
    const rich = richState();
    const r = prestigeRestart(rich);
    expect(r.biz.achievements).toEqual(rich.biz.achievements);
    expect(r.biz.chapters).toEqual(rich.biz.chapters);
    expect(r.biz.chapterPending).toEqual(rich.biz.chapterPending);
    expect(r.biz.story).toEqual(rich.biz.story);
    expect(r.biz.home).toEqual(rich.biz.home);
    expect(r.biz.vehicle).toBe(rich.biz.vehicle);
    expect(r.biz.pets).toEqual(rich.biz.pets);
    expect(r.biz.breakfastDay).toBe(rich.biz.breakfastDay);
    expect(r.biz.tutorialOff).toBe(true);
    expect(r.biz.rival).toEqual(rich.biz.rival);
    expect(r.biz.rivalsBeaten).toBe(7);
    expect(r.titles).toEqual(rich.titles);
    expect(r.skills).toEqual(rich.skills);
    expect(r.costume).toBe(rich.costume);
    expect(r.giftStreak).toBe(4);
    expect(r.giftLastDay).toBe(77);
    expect(r.giftGraceDay).toBe(10);
    expect(r.wheelLastDay).toBe(70);
    expect(r.wheelBoost).toBe(3);
    expect(r.totals).toEqual(rich.totals);
  });

  it('reset ván: money 300000, level 1, day 1, kho/tiệm/sân/vườn/quán nước/khách quen về mặc định', () => {
    const fresh = newGameData();
    const r = prestigeRestart(richState());
    expect(r.money).toBe(300000);
    expect(r.level).toBe(1);
    expect(r.day).toBe(1);
    expect(r.furniture.length).toBe(fresh.furniture.length); // kệ mặc định, không còn đồ đạc phát triển
    expect(r.storage).toEqual(fresh.storage);
    expect(r.garden).toEqual(fresh.garden);
    expect(r.branch).toBeNull();
    expect(r.biz.quanNuoc).toEqual(newQuanNuoc());
    expect(r.biz.quanNuoc.open).toBe(false);
    expect(r.regulars).toEqual({});
    expect(r.questLog).toEqual(fresh.questLog);
  });
});

describe('prestige tăng sau restart', () => {
  it('prestige level+1 và bonus=nextBonus(cấp cũ)', () => {
    const r = prestigeRestart(richState()); // cũ level 2
    expect(r.biz.prestige.level).toBe(3);
    expect(r.biz.prestige.bonus).toBeCloseTo(nextBonus(2)); // 0.24
  });

  it('từ ván mới mặc định (level 0) → level 1, bonus 0.08', () => {
    const r = prestigeRestart(newGameData() as GameState);
    expect(r.biz.prestige).toEqual({ level: 1, bonus: 0.08, goalsClaimed: [] });
    expect(r.biz.prestige.bonus).toBeCloseTo(nextBonus(0));
  });
});

describe('doPrestige qua store — đủ điều kiện', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('level 60 + doanh thu 100M: tái sinh → level 1, money 300000, prestige 1/0.08, báo ★', () => {
    const msgs: string[] = [];
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      totals: { ...s0.totals, revenue: PRESTIGE_MIN_REVENUE },
      notify: (m: string) => { msgs.push(m); },
    });
    expect(useGame.getState().biz.prestige).toEqual({ level: 0, bonus: 0, goalsClaimed: [] });
    useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.level).toBe(1);
    expect(s.money).toBe(300000);
    expect(s.biz.prestige).toEqual({ level: 1, bonus: 0.08, goalsClaimed: [] });
    expect(msgs.some((m) => m.includes('Tái sinh') || m.includes('🌟'))).toBe(true);
  });
});

describe('doPrestige khi đang online — no-op', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData() });
    useSession.setState({ coop: null });
  });

  it('đang ở hẻm online (coop): không tái sinh dù đủ điều kiện', () => {
    useSession.setState({ coop: { role: 'player', alley: 'ABC', name: 'Tôi', selfId: 1, room: 0, peers: [] } });
    const msgs: string[] = [];
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      totals: { ...s0.totals, revenue: 500_000_000 },
      notify: (m: string) => { msgs.push(m); },
    });
    const before = { money: useGame.getState().money, level: useGame.getState().level, prestige: useGame.getState().biz.prestige };
    useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.money).toBe(before.money);
    expect(s.level).toBe(before.level);
    expect(s.biz.prestige).toEqual(before.prestige);
    expect(msgs.some((m) => m.includes('hẻm online'))).toBe(true);
  });
});

describe('priceOf áp dụng prestige bonus', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('bonus 0.48 → giá món ≈ giá gốc × 1.48; bonus 0 → giá gốc', () => {
    const base = productById('mi').sell; // mì gói bán 5.000đ
    const s0 = useGame.getState();
    useGame.setState({ biz: { ...s0.biz, prestige: { level: 5, bonus: 0.48 } } });
    const boosted = useGame.getState().priceOf('mi');
    expect(boosted).toBeGreaterThan(base);
    expect(Math.round(boosted)).toBe(Math.round(base * revenueFactor(0.48)));
    // Bonus 0 (ván mới): giá không đổi — save cũ vô hại
    useGame.setState({ biz: { ...useGame.getState().biz, prestige: { level: 0, bonus: 0 } } });
    expect(useGame.getState().priceOf('mi')).toBe(base);
  });
});

describe('save round-trip prestige', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('snapshot() → applySnapshot(snapshot) giữ prestige + bộ sưu tập', () => {
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      totals: { ...s0.totals, revenue: 500_000_000 },
      biz: { ...s0.biz, achievements: ['ach_a', 'ach_b'], prestige: { level: 3, bonus: 0.32 } },
    });
    const snap = snapshot();
    applySnapshot(snap);
    const s = useGame.getState();
    // goalsClaimed (GĐ140) là trường mới tự bù [] qua merge — save cũ thiếu vẫn nạp được
    expect(s.biz.prestige).toEqual({ level: 3, bonus: 0.32, goalsClaimed: [] });
    expect(s.biz.achievements).toEqual(['ach_a', 'ach_b']);
  });
});
