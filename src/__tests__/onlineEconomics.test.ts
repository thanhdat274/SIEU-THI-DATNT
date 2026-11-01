import { describe, expect, it } from 'vitest';
import {
  APP_COMMISSION, declineRating, deliveryStars, grabFee, grabTravel, orderAssessment, orderCost, orderNet,
  orderRateTone, onlineValue, ownTravel, ratingImpact, type OnlineOrder, type OnlineState,
} from '../data/online';
import { productById } from '../data/products';

/** GĐ59 "Đơn có đáng lấy": kinh tế từng đơn online + rủi ro điểm — thuần đọc, không đổi kinh tế/odds/save. */

// Giá bán của tiệm cho từng món (đơn được đặt với những món này).
const priceOf = (id: string) => ({ bia: 20000, nuoc: 10000, ngot: 15000, snack: 5000 }[id] ?? 10000);

// Một đơn app mẫu (2 bia + 1 nước, 3 km).
const order: OnlineOrder = { id: 1, customer: 'Chị Mai Q.7', items: { bia: 2, nuoc: 1 }, km: 3, placedAt: 600, dueAt: 700, status: 'new' };

const emptyOnline = (): OnlineState => ({ open: true, orders: [order], nextAt: 0, ratingSum: 0, ratingCount: 0, done: 0, late: 0, nextId: 2, revenueToday: 0, grabFeesToday: 0 });

describe('orderNet — gross×0.88 − Σ(q×buy) (khớp chính xác tiền nhận khi giao)', () => {
  it('sample đa món: gross sau hoa hồng đúng, net = gross − giá vốn', () => {
    const value = 20000 * 2 + 10000 * 1; // 50000
    const gross = Math.round(value * (1 - APP_COMMISSION)); // 44000
    const cost = 2 * productById('bia').buy + 1 * productById('nuoc').buy;
    expect(onlineValue(order, priceOf)).toBe(value);
    expect(gross).toBe(44000);
    expect(orderNet(order, priceOf)).toBe(gross - cost);
    expect(orderAssessment(order, priceOf, 3, 600).gross).toBe(gross);
    expect(orderCost(order)).toBe(cost);
  });
});

describe('margin — lời / lỗ / edge', () => {
  it('giá bán thấp hơn giá vốn → net âm, margin < 0 (LỖ)', () => {
    const cheap = { ...order, items: { bia: 5 } };
    const lp = () => 500; // bán rẻ hơn giá nhập hẳn
    const gross = Math.round(5 * 500 * (1 - APP_COMMISSION)); // 2200
    const cost = 5 * productById('bia').buy;
    const a = orderAssessment(cheap, lp, 3, 600);
    expect(orderNet(cheap, lp)).toBe(gross - cost);
    expect(a.net).toBeLessThan(0);
    expect(a.margin).toBeLessThan(0);
  });

  it('giá bán cao → net dương, margin > 0', () => {
    const prof = { ...order, items: { nuoc: 2 } };
    const hp = () => 50000;
    const gross = Math.round(2 * 50000 * (1 - APP_COMMISSION)); // 88000
    expect(orderNet(prof, hp)).toBe(gross - 2 * productById('nuoc').buy);
    expect(orderAssessment(prof, hp, 3, 600).margin).toBeGreaterThan(0);
  });

  it('edge: gross = cost → net = 0, margin = 0 (không lời không lỗ)', () => {
    const b = productById('nuoc').buy;
    const edge = { ...order, items: { nuoc: 1 } };
    const ep = () => b / 0.88; // gross = Math.round((b/0.88)*0.88) = b = cost
    const a = orderAssessment(edge, ep, 3, 600);
    expect(a.net).toBe(0);
    expect(a.margin).toBe(0);
  });

  it('gross = 0 → margin 0 (an toàn chia 0)', () => {
    const z = orderAssessment(order, () => 0, 3, 600);
    expect(z.gross).toBe(0);
    expect(z.cost).toBeGreaterThan(0); // vẫn có giá vốn
    expect(z.margin).toBe(0);
  });
});

describe('orderAssessment — 2 nhánh courier + sao theo hẹn + nâng tay nghề lật quyết định', () => {
  it('ownTravelT = ownTravel(km, skill), grabTravelT = grabTravel(km), grabNet = net − grabFee', () => {
    const a = orderAssessment(order, priceOf, 3, 600);
    expect(a.ownTravelT).toBe(ownTravel(order.km, 3));
    expect(a.grabTravelT).toBe(grabTravel(order.km));
    expect(a.grabStars).toBe(5);
    expect(a.grabNet).toBe(a.net - grabFee(order.km));
  });

  it('ownStars theo deliveryStars(minutes + ownTravelT): kịp (5★) / ≤30′ trễ (3★) / >30′ trễ (1★)', () => {
    // km=3, skill=3 → ownTravel(3,3) = 20 → arrive = minutes + 20
    const skill = 3;
    const t = ownTravel(order.km, skill);
    expect(t).toBe(20);
    const onTime = { ...order, dueAt: 700 }; // arrive 600+20=620 ≤ 700 → 5
    expect(orderAssessment(onTime, priceOf, skill, 600).ownStars).toBe(5);
    const late30 = { ...order, dueAt: 610 }; // 620 > 610, 620 ≤ 610+30 → 3
    expect(orderAssessment(late30, priceOf, skill, 600).ownStars).toBe(3);
    const lateOver = { ...order, dueAt: 585 }; // 620 > 615 → 1
    expect(orderAssessment(lateOver, priceOf, skill, 600).ownStars).toBe(1);
    // khớp trực tiếp deliveryStars
    expect(orderAssessment(onTime, priceOf, skill, 600).ownStars).toBe(deliveryStars(onTime, 600 + t));
  });

  it('nâng tay nghề courier 1→5: tự giao lật 3★ → 5★ (quyết định có giá trị)', () => {
    const far = { ...order, km: 8, dueAt: 630 }; // km cao = nhạy với tay nghề; hẹn sát để thấy rõ lật 3★→5★
    expect(ownTravel(8, 1)).toBeGreaterThan(ownTravel(8, 5)); // người giỏi chạy nhanh hơn
    const a1 = orderAssessment(far, priceOf, 1, 585);
    const a5 = orderAssessment(far, priceOf, 5, 585);
    expect(a1.ownStars).toBe(3); // 585 + ownTravel(8,1)=65 → 650 > 630 & ≤ 660 → 3
    expect(a5.ownStars).toBe(5); // 585 + ownTravel(8,5)=35 → 620 ≤ 630 → 5
    expect(a1.urgent).toBe(true); // tự giao bằng tay nghề thấp sẽ trễ hẹn
    expect(a5.urgent).toBe(false);
  });

  it('không người giao (courierSkill null) → ownTravelT 0, grabNet/urgent vẫn tính', () => {
    const a = orderAssessment(order, priceOf, null, 600);
    expect(a.ownTravelT).toBe(0);
    expect(a.grabTravelT).toBe(grabTravel(order.km));
    expect(a.grabNet).toBe(a.net - grabFee(order.km));
    expect(a.urgent).toBe(false);
  });
});

describe('ratingImpact / declineRating — payoff điểm của từng lựa chọn', () => {
  it('ratingImpact(stars) round-trip đúng số + khớp orderRateTone', () => {
    const mid: OnlineState = { ...emptyOnline(), ratingSum: 45, ratingCount: 10 };
    const r5 = ratingImpact(5, mid);
    expect(r5.nextRating).toBeCloseTo((45 + 5) / 11); // 4.545
    expect(r5.tone).toBe(orderRateTone(r5.nextRating));
    expect(r5.tone).toBe('đơn dày (rất đông khách app)');
    const r3 = ratingImpact(3, mid);
    expect(r3.nextRating).toBeCloseTo((45 + 3) / 11); // 4.36
    expect(r3.tone).toBe('đơn khá đều');
  });

  it('declineRating dùng nhánh 4.5 (như declineOnline), giá trị khớp', () => {
    const mid: OnlineState = { ...emptyOnline(), ratingSum: 45, ratingCount: 10 };
    const d = declineRating(mid);
    const expect45 = (45 + 4.5) / 11; // 4.5
    expect(d.nextRating).toBeCloseTo(expect45);
    expect(d.nextRating).toBeCloseTo(4.5);
    expect(d.tone).toBe(orderRateTone(d.nextRating));
  });

  it('rỗng ratingCount → như gian hàng mới (điểm nền 5★ / decline 4.5)', () => {
    const fresh: OnlineState = { ...emptyOnline(), ratingSum: 0, ratingCount: 0 };
    expect(ratingImpact(5, fresh).nextRating).toBe(5); // đơn đầu tới 5★ đúng hẹn
    expect(ratingImpact(3, fresh).nextRating).toBe(3);
    expect(ratingImpact(5, fresh).tone).toBe(orderRateTone(5));
    expect(declineRating(fresh).nextRating).toBe(4.5); // từ chối đơn đầu cũng đánh tụt nhẹ
  });

  it('declineRating <> ratingImpact(5) — từ chối tụt điểm rõ rệt', () => {
    const mid: OnlineState = { ...emptyOnline(), ratingSum: 45, ratingCount: 10 };
    expect(declineRating(mid).nextRating).toBeLessThan(ratingImpact(5, mid).nextRating);
  });
});

describe('helper thuần & không đổi kinh tế/random', () => {
  it('lặp lại cùng đầu vào cho kết quả giống hệt (không Math.random)', () => {
    const a = orderAssessment(order, priceOf, 3, 600);
    expect(orderAssessment(order, priceOf, 3, 600)).toEqual(a);
    expect(orderNet(order, priceOf)).toBe(orderNet(order, priceOf));
    const mid: OnlineState = { ...emptyOnline(), ratingSum: 40, ratingCount: 9 };
    expect(ratingImpact(5, mid)).toEqual(ratingImpact(5, mid));
    expect(declineRating(mid)).toEqual(declineRating(mid));
  });

  it('không đụng state/save: chỉ hàm thuần đọc (coopGuard không cần đổi)', () => {
    const a = orderAssessment(order, priceOf, 3, 600);
    // không có side-effect: đối tượng order/state không bị đổi
    expect(order.dueAt).toBe(700);
    expect(a.ownStars).toBe(5);
    expect(Object.keys(a).sort()).toEqual(['cost', 'grabNet', 'grabStars', 'grabTravelT', 'gross', 'margin', 'net', 'ownStars', 'ownTravelT', 'urgent'].sort());
  });
});
