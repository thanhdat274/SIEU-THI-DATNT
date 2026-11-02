import { describe, expect, it } from 'vitest';
import { REGULARS, BIRTHDAY_BONUS, birthdayDoy, birthdaysToday, isBirthday, regularCheckout, visitsToday, emptyProgress } from '../data/regulars';
import { YEAR_DAYS } from '../data/calendar';

/** GĐ759 — sinh nhật khách quen: ngày cố định theo id, khách đã quen ghé chắc, mua xong +3 thân thiết. */
const def = REGULARS[0]!;
const LEVEL = 99;
const bdayDay = (d = def) => { for (let day = 1; day <= YEAR_DAYS; day++) if (isBirthday(d, day)) return day; throw new Error('không có'); };
const known = (extra = {}) => ({ ...emptyProgress(), visits: 3, friendship: 5, lastVisitDay: 1, ...extra });
const fav = { id: def.favorites[0]!, price: 10_000 };

describe('birthdayDoy / isBirthday', () => {
  it('cố định, nằm trong năm, đúng 1 ngày/năm cho mỗi khách', () => {
    for (const d of REGULARS) {
      expect(birthdayDoy(d)).toBe(birthdayDoy(d));
      expect(birthdayDoy(d)).toBeGreaterThanOrEqual(0);
      expect(birthdayDoy(d)).toBeLessThan(YEAR_DAYS);
      let n = 0; for (let day = 1; day <= YEAR_DAYS; day++) if (isBirthday(d, day)) n++;
      expect(n).toBe(1);
    }
  });
  it('không dồn hết vào một ngày (≥ 70% số khách có ngày khác nhau)', () => {
    expect(new Set(REGULARS.map(birthdayDoy)).size).toBeGreaterThanOrEqual(Math.floor(REGULARS.length * 0.7));
  });
});

describe('visitsToday — sinh nhật', () => {
  it('khách đã quen ghé chắc chắn ngày sinh nhật, mọi hạt giống', () => {
    const day = bdayDay() + 2 * YEAR_DAYS; // năm thứ 3 vẫn đúng
    for (let seed = 1; seed <= 60; seed++) expect(visitsToday(def, day, seed, LEVEL, known({ lastVisitDay: day - 1 }))).toBe(true);
  });
  it('đã ghé hôm nay rồi thì không ghé lần hai', () => {
    const day = bdayDay();
    expect(visitsToday(def, day, 7, LEVEL, known({ lastVisitDay: day }))).toBe(false);
  });
  it('chưa từng mua (visits 0) thì sinh nhật không ép ghé: vẫn theo xác suất thường', () => {
    const day = bdayDay();
    const hits = Array.from({ length: 200 }, (_, s) => visitsToday(def, day, s + 1, LEVEL, emptyProgress())).filter(Boolean).length;
    expect(hits).toBeLessThan(200);
  });
  it('chưa mở khoá (cấp thấp) thì không ghé dù sinh nhật', () => {
    expect(visitsToday(def, bdayDay(), 7, 0, known())).toBe(false);
  });
});

describe('regularCheckout — quà sinh nhật', () => {
  it('ngày sinh nhật: điểm thường + BIRTHDAY_BONUS; ngày thường không', () => {
    const day = bdayDay();
    const normal = regularCheckout(def, known(), [fav], day + 1);
    const bday = regularCheckout(def, known(), [fav], day);
    expect(bday.points).toBe(normal.points + BIRTHDAY_BONUS);
    expect(bday.progress.friendship).toBe(5 + normal.points + BIRTHDAY_BONUS);
  });
  it('đã tính điểm hôm nay rồi thì không nhận thêm thưởng sinh nhật', () => {
    const day = bdayDay();
    expect(regularCheckout(def, known({ lastFriendshipDay: day }), [fav], day).points).toBe(0);
  });
});

describe('birthdaysToday', () => {
  it('chỉ giữ khách có sinh nhật hôm nay', () => {
    const day = bdayDay();
    const others = REGULARS.filter((d) => !isBirthday(d, day));
    expect(birthdaysToday([def, ...others], day).map((d) => d.id)).toContain(def.id);
    expect(birthdaysToday(others, day)).toEqual([]);
  });
});
