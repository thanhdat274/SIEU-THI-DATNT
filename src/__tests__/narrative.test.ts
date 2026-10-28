import { describe, it, expect } from 'vitest';
import { CHAPTERS, type ChapterContext } from '../data/chapters';
import { STORIES } from '../data/biz';
import { REGULARS, regularById } from '../data/regulars';

/** Id 6 chương gốc (ch1–ch6) phải được giữ nguyên. */
const IDS_GOC = ['ch1_ve_que', 'ch2_khach_quen', 'ch3_nguoi_phu', 'ch4_sieu_thi', 'ch5_thang_doi_thu', 'ch6_mo_rong'];
/** 6 khách quen có chuyện riêng từ trước. */
const KHACH_QUEN_CU = ['ba_nam', 'chu_ba', 'be_na', 'chi_lan', 'anh_tuan', 'bac_tam'];
/** 4 khách quen thêm chuyện ở GĐ9. */
const KHACH_QUEN_MOI = ['co_mai_bar', 'chu_tu_ho', 'co_xuan_cho', 'suc_khanh_long'];

/** Điều kiện `when` chỉ được đọc field của ChapterContext — TS kiểm tra lúc biên dịch (tsc --noEmit). */

describe('Cốt truyện chương (chapters.ts)', () => {
  it('có 13 chương, id duy nhất, 6 chương gốc giữ nguyên, các chương mới nối tiếp', () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(13);
    expect(ids.slice(0, 6)).toEqual(IDS_GOC);
    ids.slice(6).forEach((id, i) => expect(id.startsWith(`ch${7 + i}`)).toBe(true));
  });

  it('mỗi chương 3–5 câu, câu không rỗng, thưởng dương', () => {
    for (const ch of CHAPTERS) {
      expect(ch.lines.length).toBeGreaterThanOrEqual(3);
      expect(ch.lines.length).toBeLessThanOrEqual(5);
      for (const l of ch.lines) {
        expect(l.text.trim().length).toBeGreaterThan(0);
        expect(l.speaker.trim().length).toBeGreaterThan(0);
      }
      expect(ch.reward).toBeDefined();
      if (ch.reward?.money !== undefined) expect(ch.reward.money).toBeGreaterThan(0);
      if (ch.reward?.xp !== undefined) expect(ch.reward.xp).toBeGreaterThan(0);
    }
  });

  it('thưởng tiền 6 chương mốc cấp tăng dần; trùm cuối rival (ch13) thưởng khép truyện riêng', () => {
    // ch7–ch12 là chuỗi theo cấp nên tiền tăng dần; ch13 là thưởng MỘT LẦN khép truyện rival
    // (GĐ170) — tiền 5M đối xứng cấp ~45+ (tầm khi hạ được rival thứ 12) nên KHÔNG so tăng dần
    // với ch12 (20M, cấp 75), XP 3.000 = 7,5× thưởng hạ rival thường (400).
    const moneys = CHAPTERS.slice(6, 12).map((c) => c.reward?.money ?? 0);
    for (let i = 1; i < moneys.length; i++) expect(moneys[i]).toBeGreaterThan(moneys[i - 1]);
    expect(CHAPTERS[12].id).toBe('ch13_sieu_thi_sao_mai');
    expect(CHAPTERS[12].reward?.money).toBe(5_000_000);
    expect(CHAPTERS[12].reward?.xp).toBe(3_000);
  });

  /**
   * Hành trình đơn điệu: mọi chỉ số chỉ tăng dần như người chơi lên cấp đều.
   * Mỗi dòng là một mốc — chương nào vừa đủ điều kiện được ghi ở cột cuối.
   */
  const hanhTrinh: ChapterContext[] = [
    { day: 1,   level: 1,   customers: 10,   staffCount: 0,  shopTier: 0, hasRival: false, rivalsBeaten: 0 }, // ch1
    { day: 4,   level: 4,   customers: 40,   staffCount: 0,  shopTier: 0, hasRival: false, rivalsBeaten: 0 }, // ch2, ch3
    { day: 8,   level: 8,   customers: 80,   staffCount: 1,  shopTier: 1, hasRival: false, rivalsBeaten: 0 }, // ch4 (mở rival)
    { day: 12,  level: 9,   customers: 100,  staffCount: 1,  shopTier: 1, hasRival: true,  rivalsBeaten: 0 },
    { day: 16,  level: 10,  customers: 120,  staffCount: 2,  shopTier: 1, hasRival: false, rivalsBeaten: 1 }, // ch5
    { day: 22,  level: 13,  customers: 150,  staffCount: 2,  shopTier: 2, hasRival: false, rivalsBeaten: 1 }, // ch6
    { day: 30,  level: 15,  customers: 200,  staffCount: 3,  shopTier: 2, hasRival: true,  rivalsBeaten: 1 }, // ch7
    { day: 40,  level: 20,  customers: 260,  staffCount: 4,  shopTier: 3, hasRival: false, rivalsBeaten: 2 }, // ch8
    { day: 55,  level: 30,  customers: 350,  staffCount: 6,  shopTier: 3, hasRival: true,  rivalsBeaten: 2 }, // ch9
    { day: 70,  level: 45,  customers: 500,  staffCount: 9,  shopTier: 4, hasRival: true,  rivalsBeaten: 3 }, // ch10
    { day: 90,  level: 55,  customers: 650,  staffCount: 11, shopTier: 5, hasRival: false, rivalsBeaten: 3 }, // ch11
    { day: 110, level: 65,  customers: 800,  staffCount: 13, shopTier: 5, hasRival: true,  rivalsBeaten: 4 },
    { day: 130, level: 75,  customers: 950,  staffCount: 15, shopTier: 6, hasRival: true,  rivalsBeaten: 5 }, // ch12
    { day: 160, level: 100, customers: 1200, staffCount: 20, shopTier: 6, hasRival: false, rivalsBeaten: 6 },
    // GĐ170: ch13 (trùm rival) cần rivalsBeaten 12 — thực tế mỗi rival cần nghỉ 20 ngày + cơ hội
    // 25%/ngày nên truyện rival khép rất muộn, xa sau ch12 (hành trình dữ liệu chỉ cần đơn điệu).
    { day: 210, level: 100, customers: 1400, staffCount: 22, shopTier: 6, hasRival: true,  rivalsBeaten: 9 },
    { day: 280, level: 100, customers: 1600, staffCount: 24, shopTier: 6, hasRival: false, rivalsBeaten: 12 }, // ch13
  ];

  it('thứ tự mảng = thứ tự mốc đạt được: chương sau không mở trước chương trước', () => {
    let last = -1;
    for (const ch of CHAPTERS) {
      const at = hanhTrinh.findIndex((c) => ch.when(c));
      expect(at).toBeGreaterThanOrEqual(0); // mọi chương đều tới được trên hành trình
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
  });

  it('ngưỡng level đạt mốc tăng dần, chương cuối chỉ mở ở cuối game', () => {
    const levels = CHAPTERS.map((ch) => hanhTrinh.find((c) => ch.when(c))!.level);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    expect(levels[6]).toBeGreaterThanOrEqual(15); // ch7
    expect(levels[8]).toBeGreaterThanOrEqual(29); // ch9 (trùng mốc mở quán nước)
    expect(levels[10]).toBeGreaterThanOrEqual(55); // ch11 (trùng mốc ca đêm)
    expect(levels[11]).toBeGreaterThanOrEqual(75); // ch12
    expect(CHAPTERS[11].when(hanhTrinh[0])).toBe(false);
    // GĐ170 — ch13: chỉ mở ở cuối game (rivalsBeaten 12), ván mới chưa có gì phát cả
    expect(CHAPTERS[12].when(hanhTrinh[0])).toBe(false);
    expect(CHAPTERS[12].when(hanhTrinh[hanhTrinh.length - 2])).toBe(false); // rivalsBeaten 9
    expect(CHAPTERS[12].when(hanhTrinh[hanhTrinh.length - 1])).toBe(true); // rivalsBeaten 12
  });
});

describe('Chuyện khách quen (STORIES)', () => {
  it('mọi key là khách quen có thật, mỗi người 3 chương ở mốc 10/30/60', () => {
    const ids = new Set(REGULARS.map((r) => r.id));
    for (const [rid, chapters] of Object.entries(STORIES)) {
      expect(ids.has(rid)).toBe(true);
      expect(chapters.length).toBe(3);
      expect(chapters.map((c) => c.at)).toEqual([10, 30, 60]);
    }
  });

  it('nội dung không rỗng, thưởng dương', () => {
    for (const chapters of Object.values(STORIES)) {
      for (const ch of chapters) {
        expect(ch.title.trim().length).toBeGreaterThan(0);
        expect(ch.text.trim().length).toBeGreaterThan(0);
        if (ch.reward?.money !== undefined) expect(ch.reward.money).toBeGreaterThan(0);
        if (ch.reward?.xp !== undefined) expect(ch.reward.xp).toBeGreaterThan(0);
      }
    }
  });

  it('bốn khách quen mới có chuyện riêng, không đụng 6 người cũ, thưởng cuối 80k–150k', () => {
    expect(Object.keys(STORIES).length).toBeGreaterThanOrEqual(10);
    for (const id of KHACH_QUEN_MOI) {
      expect(KHACH_QUEN_CU).not.toContain(id);
      expect(regularById(id)).toBeDefined();
      const chapters = STORIES[id];
      expect(chapters).toBeDefined();
      const cuoi = chapters[chapters.length - 1];
      expect(cuoi.reward?.money).toBeGreaterThanOrEqual(80000);
      expect(cuoi.reward?.money).toBeLessThanOrEqual(150000);
    }
  });
});
