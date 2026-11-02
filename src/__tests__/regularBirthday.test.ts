import { describe, expect, it } from 'vitest';
import { REGULARS, BIRTHDAY_BONUS, birthdayLabel, birthdayDoy, birthdaysToday, birthdayHint, isBirthday, regularCheckout, visitsToday, emptyProgress } from '../data/regulars';
import { YEAR_DAYS, dateOfDoy, dayOfYear } from '../data/calendar';
import { newGameData, useGame } from '../core/store';

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

describe('regularVisit — lời báo sinh nhật qua store', () => {
  const msgs: string[] = [];
  const setup = (day: number) => {
    msgs.length = 0;
    useGame.setState({ ...newGameData(), level: 40, day, notify: (m: string) => { msgs.push(m); },
      regulars: { [def.id]: { ...known({ lastVisitDay: day - 1 }), perks: def.perks.map((p) => p.title) } } });
  };
  it('sinh nhật: thay câu thường bằng câu 🎂 (+3 thân thiết), ≤ 90 ký tự, đúng 1 thông báo', () => {
    setup(bdayDay());
    useGame.getState().regularVisit(def.id, [fav], true);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain('🎂');
    expect(msgs[0]).toContain(`+${BIRTHDAY_BONUS}`);
    expect(msgs[0]!.length).toBeLessThanOrEqual(90);
    expect(useGame.getState().regulars[def.id]!.friendship).toBe(5 + 2 + BIRTHDAY_BONUS);
  });
  it('ngày thường: vẫn câu hài lòng 😊, không 🎂', () => {
    setup(bdayDay() + 1);
    useGame.getState().regularVisit(def.id, [fav], true);
    expect(msgs[0]).toContain('😊');
    expect(msgs[0]).not.toContain('🎂');
  });
});

describe('birthdayLabel — cùng lịch với Sổ đầu ngày', () => {
  it('nhãn ngày/tháng khớp đúng ngày mà isBirthday báo (mọi khách)', () => {
    for (const d of REGULARS) {
      const day = bdayDay(d);
      const cal = dateOfDoy(dayOfYear(day));
      expect(birthdayLabel(d), d.id).toBe(`${cal.day}/${cal.month}`);
    }
  });

  it('birthdayHint (GĐ773): có món thích → +5 ưu tiên 3; hết hàng → nêu tên món cần nhập, ưu tiên 2; khớp điểm thật', () => {
    const have = birthdayHint(def, (id) => id === def.favorites[0]);
    expect(have.priority).toBe(3);
    expect(have.text).toContain(`+${BIRTHDAY_BONUS + 2}`);
    const miss = birthdayHint(def, () => false);
    expect(miss.priority).toBe(2);
    expect(miss.text).toContain('hết hàng');
    expect(miss.text.length).toBeLessThanOrEqual(90);
    // +5 phải đúng với điểm thanh toán thật: món thích (2) + sinh nhật (3)
    const day = bdayDay();
    const r = regularCheckout(def, known({ lastFriendshipDay: 0 }), [fav], day);
    expect(r.points).toBe(BIRTHDAY_BONUS + 2);
  });
});
