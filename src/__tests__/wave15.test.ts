import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import type { Staff } from '../data/staff';
import { expToNext, gainExp, REVEAL_AFTER_DAYS, shownTrait, staffDayEnd, workSpeed } from '../data/staffTraits';
import { apologize, APOLOGY_MUL, CRISIS_MUL, newSocial, promote, socialDayEnd, socialTraffic } from '../data/social';
import { appRating, deliveryStars, grabFee, makeOnlineOrder, newOnline, orderGap, ownTravel } from '../data/online';
import { LICENSE_GRACE, licenseStatus, missingLicenses, requiredLicenses } from '../data/licenses';
import { inspectionResult } from '../data/biz';
import type { Review } from '../data/reviews';

const worker = (over: Partial<Staff> = {}): Staff => ({ id: 1, name: 'An', role: 'stocker', skill: 2, wage: 20000, shift: 'morning', ...over });
/** rng lặp lại một dãy số cố định. */
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('nhân viên có tính cách và tay nghề', () => {
  it('đủ kinh nghiệm thì lên sao và tăng lương; 5★ thì dừng', () => {
    const { staff, leveled } = gainExp(worker(), expToNext(2));
    expect(leveled).toBe(true);
    expect(staff.skill).toBe(3);
    expect(staff.wage).toBeGreaterThan(20000);
    expect(gainExp(worker({ skill: 5 }), 100).staff.skill).toBe(5);
  });
  it('người chăm chỉ làm nhanh hơn, người lười chậm hơn', () => {
    expect(workSpeed(worker({ trait: 'diligent' }))).toBeGreaterThan(workSpeed(worker()));
    expect(workSpeed(worker({ trait: 'lazy' }))).toBeLessThan(workSpeed(worker()));
  });
  it('tính lộ ra sau vài ngày; người tắt mắt trông như bình thường cho tới khi bị bắt', () => {
    expect(shownTrait(worker({ trait: 'friendly' }))).toBeNull();
    expect(shownTrait(worker({ trait: 'friendly', daysWorked: REVEAL_AFTER_DAYS }))).toBe('friendly');
    expect(shownTrait(worker({ trait: 'sticky', daysWorked: 10 }))).toBe('steady');
    expect(shownTrait(worker({ trait: 'sticky', daysWorked: 1, caught: true }))).toBe('sticky');
  });
  it('thu ngân tắt mắt ăn bớt tiền két nếu không bị bắt; bị bắt thì không mất gì', () => {
    const thief = worker({ role: 'cashier', trait: 'sticky' });
    const missed = staffDayEnd([thief], { revenue: 1000000, storage: {}, hasCamera: false, hasManager: false, rng: seq(0.5, 0.99) });
    expect(missed.cashLoss).toBeGreaterThan(0);
    expect(missed.staff[0].caught).toBeUndefined();
    const caught = staffDayEnd([thief], { revenue: 1000000, storage: {}, hasCamera: true, hasManager: true, rng: seq(0.5, 0.01) });
    expect(caught.cashLoss).toBe(0);
    expect(caught.staff[0].caught).toBe(true);
  });
  it('xếp hàng tắt mắt lấy hàng trong kho, không lấy quá số đang có', () => {
    const r = staffDayEnd([worker({ trait: 'sticky' })], { revenue: 0, storage: { mi: 2 }, hasCamera: false, hasManager: false, rng: seq(0.99, 0, 0.99) });
    expect(r.goodsTaken.mi).toBeLessThanOrEqual(2);
    expect(r.goodsTaken.mi).toBeGreaterThan(0);
  });
  it('đào tạo tốn tiền, mỗi ngày một buổi', () => {
    useGame.setState({ ...newGameData(), staff: [worker()], money: 1000000 });
    useGame.getState().trainStaff(1);
    const after = useGame.getState();
    expect(after.money).toBe(1000000 - 2 * 60000);
    expect(after.staff[0].exp).toBeGreaterThan(0);
    useGame.getState().trainStaff(1);
    expect(useGame.getState().money).toBe(after.money);
  });
});

describe('mạng xã hội', () => {
  const review = (stars: number, id = 1): Review => ({ id, day: 5, minute: 600, stars, author: 'Chị Lan', text: 'Tiệm ok.' });
  it('bài chê lan truyền thành khủng hoảng, vắng khách; xin lỗi thì dịu lại', () => {
    // rng: đăng bài (0) → lan truyền (0) → các số còn lại
    const { social, news } = socialDayEnd(newSocial(), [review(1)], 5, seq(0, 0, 0.5));
    expect(social.buzz?.kind).toBe('crisis');
    expect(news.length).toBe(1);
    expect(socialTraffic(social, 6)).toBe(CRISIS_MUL);
    const calm = apologize(social, 6)!;
    expect(socialTraffic(calm, 6)).toBe(APOLOGY_MUL);
    expect(apologize(calm, 6)).toBeNull();
  });
  it('bài khen thường thêm người theo dõi; lời 3–4★ không lên mạng', () => {
    const { social } = socialDayEnd(newSocial(), [review(5), review(4, 2)], 5, seq(0, 0.99, 0.5));
    expect(social.posts).toHaveLength(1);
    expect(social.followers).toBeGreaterThan(0);
    expect(social.buzz).toBeNull();
  });
  it('quảng bá cần đủ người theo dõi, mỗi ngày một lần, kéo thêm khách', () => {
    expect(promote(newSocial(), 3, 'Tiệm')).toBeNull();
    const s = promote({ ...newSocial(), followers: 500 }, 3, 'Tiệm')!;
    expect(socialTraffic(s, 3)).toBeGreaterThan(1);
    expect(promote(s, 3, 'Tiệm')).toBeNull();
  });
});

describe('bán online', () => {
  it('đơn app có hàng, quãng đường và hạn giao', () => {
    const o = makeOnlineOrder(1, 20, 600, seq(0.3, 0.6, 0.2, 0.9));
    expect(Object.keys(o.items).length).toBeGreaterThan(0);
    expect(o.km).toBeGreaterThanOrEqual(1);
    expect(o.dueAt).toBeGreaterThan(600);
  });
  it('giao kịp được 5★, trễ thì sao thấp; điểm thấp thì ít đơn', () => {
    const o = makeOnlineOrder(1, 20, 600, seq(0.5));
    expect(deliveryStars(o, o.dueAt)).toBe(5);
    expect(deliveryStars(o, o.dueAt + 10)).toBe(3);
    expect(deliveryStars(o, o.dueAt + 60)).toBe(1);
    expect(orderGap(3.5, 20)).toBeGreaterThan(orderGap(4.8, 20));
    expect(appRating(newOnline())).toBe(5);
  });
  it('người giao giỏi chở nhanh hơn; Grab tính phí theo km', () => {
    expect(ownTravel(5, 5)).toBeLessThan(ownTravel(5, 1));
    expect(grabFee(6)).toBeGreaterThan(grabFee(2));
  });
  it('nhận đơn gọi Grab: trừ kho và phí, hàng tới nơi thì nhận tiền', () => {
    useGame.setState({ ...newGameData(), level: 20, money: 500000, storage: { mi: 10 }, shopOpen: true, minutes: 600 });
    useGame.setState({ online: { ...newOnline(), open: true, nextAt: 99999, orders: [{ id: 1, customer: 'A', items: { mi: 3 }, km: 2, placedAt: 600, dueAt: 700, status: 'new' }] } });
    expect(useGame.getState().acceptOnline(1, 'own')).toBe(false); // chưa có người giao
    expect(useGame.getState().acceptOnline(1, 'grab')).toBe(true);
    const s = useGame.getState();
    expect(s.storage.mi).toBe(7);
    expect(s.money).toBe(500000 - grabFee(2));
    useGame.setState({ minutes: s.online.orders[0].arriveAt! });
    useGame.getState().tick(0);
    const done = useGame.getState();
    expect(done.online.orders).toHaveLength(0);
    expect(done.online.done).toBe(1);
    expect(done.money).toBeGreaterThan(s.money);
  });
});

describe('giấy phép và thanh tra', () => {
  it('bắt buộc theo cấp và theo hàng đang bày', () => {
    expect(requiredLicenses({ level: 5, hasCookStation: true, shelved: ['bia'] })).toEqual([]);
    expect(requiredLicenses({ level: 20, hasCookStation: false, shelved: ['mi'] })).toEqual(['business']);
    expect(requiredLicenses({ level: 20, hasCookStation: true, shelved: ['bia'] })).toEqual(['business', 'food', 'alcohol']);
  });
  it('trạng thái giấy phép theo ngày hết hạn', () => {
    expect(licenseStatus({}, 'business', 10)).toBe('none');
    expect(licenseStatus({ business: 30 }, 'business', 10)).toBe('valid');
    expect(licenseStatus({ business: 12 }, 'business', 10)).toBe('expiring');
    expect(licenseStatus({ business: 9 }, 'business', 10)).toBe('expired');
    expect(missingLicenses({ business: 30 }, ['business', 'food'], 10)).toEqual(['food']);
  });
  it('tủ lạnh hỏng còn hàng: trượt tiêu chí quản lý hàng hoá', () => {
    const r = inspectionResult({ dirt: 0, nearExpiryOnShelves: 0, priceIndex: 1, rating: 5, coldBroken: 1 });
    expect(r.score).toBe(3);
  });
  it('lần đầu thiếu giấy phép chỉ bị nhắc (ân hạn), quá hạn chót thì thanh tra phạt', () => {
    const five = { id: 1, day: 14, minute: 1, stars: 5, author: 'A', text: 't' };
    useGame.setState({ ...newGameData(), day: 13, level: 12, minutes: 19 * 60, reviews: [five] });
    useGame.getState().sleep();
    const noticed = useGame.getState().inspection.noticed?.business;
    expect(noticed).toBe(14);
    // Tới đợt thanh tra quá ân hạn mà vẫn chưa có giấy phép kinh doanh
    const day = 28;
    expect(day).toBeGreaterThanOrEqual(noticed! + LICENSE_GRACE);
    useGame.setState({ day, minutes: 19 * 60, dirt: 0, prices: {}, reviews: [{ ...five, day }] });
    useGame.getState().sleep();
    expect(useGame.getState().inspection.strikes).toBe(1);
  });
  it('đang bị đình chỉ thì không mở cửa được', () => {
    useGame.setState({ ...newGameData(), day: 7, inspection: { strikes: 0, suspendedDay: 7 } });
    useGame.getState().toggleShop();
    expect(useGame.getState().shopOpen).toBe(false);
  });
});
