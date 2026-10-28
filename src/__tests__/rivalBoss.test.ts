import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type DayStats, type GameState } from '../core/store';
import { bizEndOfDay, checkChapters, closeChapter } from '../core/biz';
import { applySnapshot, snapshot } from '../core/save';
import { prestigeRestart } from '../core/prestige';
import { CHAPTERS, chapterById, nextChapter, STORY_RIVAL_NAME, type ChapterContext } from '../data/chapters';
import {
  newBiz, RIVAL_BEAT_REWARD, RIVAL_BEAT_XP, RIVAL_BOSS_GEN, RIVAL_COOLDOWN, RIVAL_SHOPS, RIVAL_START,
  rivalTier, type Rival,
} from '../data/biz';

/**
 * GĐ170 — Rival thành một câu chuyện CÓ KẾT (audit tiến trình 29/10, phát hiện d + e):
 *  A. Chương trùm cuối 'Siêu Thị Sao Mai' (ch13) khép truyện rival ở rival thứ 12 (mục cuối
 *     catalog, blurb "hậu phương công ty lớn"), thưởng thắng lớn MỘT LẦN theo cơ chế chương.
 *  B. Tái sinh không giữ rival + rivalsBeaten ("thuế boss cũ"); rival đời mới quay lại từ cấp 8
 *     nhờ cổng prestige.level > 0; chương rival đã xem không phát lại.
 *  C. Gen 13+ (sau trùm): tin khai trương khác nhãn "Hàng mới về, hẻm lại đông", tên lặp vòng
 *     gắn hậu tố "cơ sở"; bậc quy mô (rivalTier) giữ nguyên trần gen 10.
 */

const BOSS_ID = 'ch13_sieu_thi_sao_mai';
const OTHER_CHAPTERS = CHAPTERS.filter((c) => c.id !== BOSS_ID).map((c) => c.id);

/** Ngữ cảnh chương: mọi chỉ số phụ đã thỏa, thay rivalsBeaten để bấm mốc truyện rival. */
const ctx = (rivalsBeaten: number, level = 60): ChapterContext => ({
  day: 300, level, customers: 9999, staffCount: 9, shopTier: 4, hasRival: false, rivalsBeaten,
});

describe('ch13_sieu_thi_sao_mai — dữ liệu chương trùm cuối (GĐ170-A)', () => {
  it('trùm cuối gắn đúng catalog: rival thứ 12 = "Siêu Thị Sao Mai" (mục cuối, hậu phương công ty)', () => {
    expect(RIVAL_BOSS_GEN).toBe(12);
    expect(RIVAL_SHOPS).toHaveLength(RIVAL_BOSS_GEN);
    expect(RIVAL_SHOPS[RIVAL_BOSS_GEN - 1].name).toBe('Siêu Thị Sao Mai');
    expect(RIVAL_SHOPS[RIVAL_BOSS_GEN - 1].blurb).toContain('công ty');
    // chương tồn tại, id + tiêu đề đúng, khi() bám mốc rivalsBeaten như ch5/ch8
    const boss = chapterById(BOSS_ID)!;
    expect(boss).toBeDefined();
    expect(boss.title).toContain('Siêu Thị Sao Mai');
    expect(boss.effect).toBeUndefined(); // chương khép truyện, không mở hệ gì mới
  });

  it('when(): rivalsBeaten 11 → chưa mở, 12 → mở (ranh giới đúng mốc hạ rival thứ 12)', () => {
    const boss = chapterById(BOSS_ID)!;
    expect(boss.when(ctx(11))).toBe(false);
    expect(boss.when(ctx(12))).toBe(true);
  });

  it('nextChapter: chưa đủ mốc không phát; đủ mốc phát boss; đã xem không lặp', () => {
    expect(nextChapter(OTHER_CHAPTERS, ctx(11))).toBeUndefined();
    expect(nextChapter(OTHER_CHAPTERS, ctx(12))?.id).toBe(BOSS_ID);
    expect(nextChapter([...OTHER_CHAPTERS, BOSS_ID], ctx(12))).toBeUndefined();
  });

  it('ràng buộc GĐ170: thưởng hạ rival thường, cooldown 20 ngày, rivalTier trần gen 10 giữ nguyên', () => {
    expect(RIVAL_BEAT_REWARD).toBe(800_000);
    expect(RIVAL_BEAT_XP).toBe(400);
    expect(RIVAL_COOLDOWN).toBe(20);
    expect(rivalTier(10)).toEqual(rivalTier(15)); // trần 'trung tâm thương mại'
  });
});

describe('ch13 qua store — xếp chương + thưởng đúng một lần (GĐ170-A)', () => {
  beforeEach(() => {
    // Cấp 60: xpToNext(60) ≈ 5.8k nên +3.000 XP của chương không gây lên cấp — đọc được delta xp
    useGame.setState({
      ...newGameData(), day: 100, level: 60, xp: 0,
      biz: { ...newBiz(), chapters: OTHER_CHAPTERS, rivalsBeaten: RIVAL_BOSS_GEN },
    });
  });

  it('checkChapters xếp boss; closeChapter trao thưởng 5M + 3.000 XP, ghi đã xem', () => {
    checkChapters();
    expect(useGame.getState().biz.chapterPending).toBe(BOSS_ID);
    const moneyBefore = useGame.getState().money;
    closeChapter();
    const s = useGame.getState();
    expect(s.biz.chapters).toContain(BOSS_ID);
    expect(s.biz.chapterPending).toBeNull();
    expect(s.money).toBe(moneyBefore + 5_000_000);
    expect(s.xp).toBe(3000);
  });

  it('thưởng đúng MỘT LẦN: chương đã xem không được xếp lại ở ngày sau', () => {
    checkChapters();
    closeChapter();
    useGame.setState({ day: useGame.getState().day + 1 });
    checkChapters();
    expect(useGame.getState().biz.chapterPending).toBeNull();
  });

  it('chưa hạ đủ rival thứ 12 → boss không phát (các chương khác không bị kéo vào theo)', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, rivalsBeaten: RIVAL_BOSS_GEN - 1 } });
    checkChapters();
    expect(useGame.getState().biz.chapterPending).toBeNull();
  });
});

describe('rival đời mới sau trùm cuối (gen 13+) — tin khác nhãn + tên "cơ sở" (GĐ170-C)', () => {
  const rand = Math.random;
  beforeEach(() => {
    Math.random = () => 0.01; // luôn qua cổng rival đời mới 25% (rivalGen.test cùng mẫu)
    useGame.setState({ ...newGameData(), day: 300, level: 30, money: 5_000_000, biz: { ...newBiz() } });
  });
  afterEach(() => { Math.random = rand; });

  const lowStats = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });
  /** Sang ngày mới với rival vắng + hết thời gian nghỉ → rival đời mới khai trương. */
  const spawnNew = () => {
    const s = useGame.getState();
    const out = bizEndOfDay({ ...s, biz: { ...s.biz, rival: null, rivalNextDay: 0 } }, lowStats());
    useGame.setState({ biz: out.biz, day: s.day + 1 });
    return out;
  };

  it('rivalsBeaten 12: tên gắn "(cơ sở 2)", tin "Hàng mới về, hẻm lại đông", không còn kêu gọi tổng tấn công', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, rivalsBeaten: RIVAL_BOSS_GEN } });
    const out = spawnNew();
    const shop = RIVAL_SHOPS[RIVAL_BOSS_GEN % RIVAL_SHOPS.length]; // lặp vòng về mục đầu catalog
    expect(out.biz.rival?.name).toBe(`${shop.name} (cơ sở 2)`);
    expect(out.biz.rival?.blurb).toBe(shop.blurb);
    expect(out.biz.rival?.strength).toBe(95); // trần sức mạnh giữ nguyên
    const newsLine = out.news.find((n) => n.includes('Hàng mới về, hẻm lại đông'));
    expect(newsLine).toBeDefined();
    expect(newsLine).toContain('(cơ sở 2)');
    expect(newsLine).not.toContain('(bậc');
    expect(newsLine).not.toContain('để họ đóng cửa');
  });

  it('rivalsBeaten 13: vòng catalog tiếp tục đúng thứ tự, cùng hậu tố cơ sở của vòng lặp', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, rivalsBeaten: RIVAL_BOSS_GEN + 1 } });
    const out = spawnNew();
    const shop = RIVAL_SHOPS[(RIVAL_BOSS_GEN + 1) % RIVAL_SHOPS.length];
    expect(out.biz.rival?.name).toBe(`${shop.name} (cơ sở 2)`);
  });

  it('trước trùm (rivalsBeaten 1): giữ nguyên tin "khai trương" kèm bậc — chỉ nhãn sau trùm mới đổi', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, rivalsBeaten: 1 } });
    const out = spawnNew();
    const shop = RIVAL_SHOPS[1 % RIVAL_SHOPS.length];
    expect(out.biz.rival?.name).toBe(shop.name); // chưa vòng lặp → không có hậu tố
    const newsLine = out.news.find((n) => n.includes('khai trương'));
    expect(newsLine).toContain(`(bậc ${rivalTier(2).label})`);
    expect(newsLine).not.toContain('Hàng mới về, hẻm lại đông');
  });
});

describe('rival qua tái sinh (GĐ170-B — bug e "thuế boss cũ")', () => {
  /** Ván đã chơi sâu: đang cầm trùm cuối, đã hạ 12 rival, đã xem đủ 13 chương. */
  const richState = (): GameState => {
    const s = newGameData() as GameState;
    s.level = 60;
    s.totals = { ...s.totals, revenue: 250_000_000 };
    s.biz.rival = { name: 'Siêu Thị Sao Mai', strength: 95, openedDay: 250, personality: 'quality', blurb: 'Hậu phương công ty lớn.' };
    s.biz.rivalsBeaten = RIVAL_BOSS_GEN;
    s.biz.chapters = CHAPTERS.map((c) => c.id);
    s.biz.prestige = { level: 1, bonus: 0.08, goalsClaimed: [] };
    return s;
  };

  it('prestigeRestart: rival → null, rivalsBeaten → 0, chương đã xem giữ nguyên', () => {
    const rich = richState();
    const r = prestigeRestart(rich);
    expect(r.biz.rival).toBeNull();
    expect(r.biz.rivalsBeaten).toBe(0);
    expect(r.biz.chapters).toEqual(rich.biz.chapters);
    expect(r.biz.prestige.level).toBe(2);
  });

  it('chương rival đã xem không phát lại trong vòng mới dù điều kiện when() đủ (danh sách đã xem giữ)', () => {
    // Vòng 2 khi đã leo lại cấp 20: 3 chương đầu của ván cũ đương nhiên đã xem + các chương rival đã xem
    const seen = ['ch1_ve_que', 'ch2_khach_quen', 'ch3_nguoi_phu', 'ch4_sieu_thi', 'ch5_thang_doi_thu', 'ch8_doi_thu_ke_tiep', BOSS_ID];
    // Ngữ cảnh vòng 2 khi đã lên lại cấp 8: ch4 ĐỦ điều kiện when() — nhưng đã xem nên không phát
    const round2: ChapterContext = { day: 10, level: 20, customers: 100, staffCount: 1, shopTier: 1, hasRival: false, rivalsBeaten: 0 };
    expect(chapterById('ch4_sieu_thi')!.when(round2)).toBe(true);
    expect(chapterById(BOSS_ID)!.when(round2)).toBe(false); // rivalsBeaten về 0
    expect(nextChapter(seen, round2)).toBeUndefined();
  });

  it('save round-trip: rival null + rivalsBeaten 0 + chapters đã xem giữ nguyên qua snapshot/applySnapshot', () => {
    useGame.setState(prestigeRestart(richState()));
    applySnapshot(snapshot());
    const s = useGame.getState();
    expect(s.biz.rival).toBeNull();
    expect(s.biz.rivalsBeaten).toBe(0);
    expect(s.biz.chapters).toEqual(CHAPTERS.map((c) => c.id));
  });

  describe('cổng rival đời mới sau tái sinh (bizEndOfDay)', () => {
    const rand = Math.random;
    beforeEach(() => {
      Math.random = () => 0.01;
      useGame.setState({ ...newGameData(), day: 9, level: 10, money: 300000, biz: { ...newBiz(), prestige: { level: 1, bonus: 0.08, goalsClaimed: [] } } });
    });
    afterEach(() => { Math.random = rand; });

    const lowStats = (): DayStats => ({ revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 0, unhappy: 0, xp: 0 });
    const endNight = () => {
      const s = useGame.getState();
      const out = bizEndOfDay({ ...s, biz: { ...s.biz, rivalNextDay: 0 } }, lowStats());
      useGame.setState({ biz: out.biz, day: s.day + 1 });
      return out;
    };

    it('tái sinh xong (prestige 1, rivalsBeaten 0): rival đời mới quay lại bình thường từ cấp 8, thế hệ 1', () => {
      const out = endNight();
      expect(out.biz.rival?.name).toBe(RIVAL_SHOPS[0].name); // thế hệ 1 của vòng mới, không hậu tố
      expect(out.biz.rival?.strength).toBe(RIVAL_START); // 60 — không phải rival thế hệ N sức mạnh 95
      expect(rivalTier(1).label).toBe('cửa hàng');
      expect(out.news.some((n) => n.includes('khai trương'))).toBe(true);
    });

    it('ván mới (prestige 0, rivalsBeaten 0): không có rival đời mới tự phát — ch4 mới là lối vào cốt truyện', () => {
      useGame.setState({ biz: { ...useGame.getState().biz, prestige: { level: 0, bonus: 0, goalsClaimed: [] } } });
      const out = endNight();
      expect(out.biz.rival).toBeNull();
      expect(out.biz.rivalsBeaten).toBe(0);
    });
  });
});

describe('kết nối truyện — rival cốt truyện và thế hệ đếm đúng (hộp che GĐ170)', () => {
  it('rival cốt truyện (ch4) không trùng catalog và là thế hệ đầu của truyện', () => {
    expect(RIVAL_SHOPS.some((s) => s.name === STORY_RIVAL_NAME)).toBe(false);
    expect(chapterById('ch4_sieu_thi')!.effect).toBe('openRival');
  });

  it('kiểu Rival với blurb/tính cách vẫn khớp state rival sau spawn (không vỡ save cũ thiếu field)', () => {
    const old: Rival = { name: 'Rival save cũ', strength: 50, openedDay: 5 }; // không blurb/personality
    expect(old.blurb).toBeUndefined();
    expect(newBiz().rival).toBeNull();
  });
});
