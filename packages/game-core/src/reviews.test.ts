import assert from 'node:assert/strict';
import type { CustomerReview, CustomerState } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, REVIEW_BY_REASON, REVIEW_BY_STARS, REVIEW_DETAILS, REVIEW_HISTORY_CAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { appendReview, composeReview, sanitizeReviews, summarizeReviews, type ReviewContext } from './reviews';

const base: ReviewContext = { day: 4, hour: 10, minute: 30, stars: 5, sequence: 1, waitSeconds: 4, averagePriceRatio: 1, rainIntensity: 0, isWeekend: false, guardHelped: false };
const positiveDetails = REVIEW_DETAILS.filter(d => d.tone === 'positive').map(d => d.text.replace('{product}', 'X'));
const negativeDetails = REVIEW_DETAILS.filter(d => d.tone === 'negative').map(d => d.text);

export function runReviewTests(): void {
  console.log('\n--- Đánh giá bằng chữ của khách ---');

  // Xác định, đủ trường, không còn chỗ trống {…}.
  const a = composeReview({ ...base, productId: 'nuoc_suoi', productName: 'Nước suối' });
  assert.deepEqual(a, composeReview({ ...base, productId: 'nuoc_suoi', productName: 'Nước suối' }), 'Cùng ngữ cảnh cho cùng lời đánh giá');
  assert.equal(a.id, 'rev-4-1');
  assert.ok(a.text.length > 10 && !/[{}]/.test(a.text) && a.author.length > 0 && a.stars === 5);
  assert.equal(composeReview({ ...base, regularId: 'regular-chuba', regularName: 'Chú Ba Xe Ôm' }).author, 'Chú Ba Xe Ôm', 'Khách quen dùng tên riêng');

  // Câu chính khớp lý do: nhắc tên món / số giây chờ, không còn ký tự thay thế.
  const reasons = ['out_of_stock', 'price', 'wait', 'store_closed', 'unreachable'] as const;
  for (const reason of reasons) {
    for (let sequence = 1; sequence <= 40; sequence++) {
      const r = composeReview({ ...base, stars: 2, sequence, reason, productId: 'nuoc_suoi', productName: 'Nước suối', waitSeconds: 35 });
      assert.ok(!/[{}]/.test(r.text), `Lý do ${reason} không để lại {…}: ${r.text}`);
      assert.equal(r.reason, reason);
      assert.ok(REVIEW_BY_REASON[reason].some(t => r.text.startsWith(t.replace('{product}', 'Nước suối').replace('{wait}', '35'))), `Câu chính đúng lý do ${reason}`);
    }
  }
  assert.ok(Array.from({ length: 40 }, (_, i) => composeReview({ ...base, stars: 2, sequence: i + 1, reason: 'out_of_stock', productName: 'Mì Hảo Hảo' })).some(r => r.text.includes('Mì Hảo Hảo')), 'Nhắc tên món hết hàng');
  assert.ok(composeReview({ ...base, stars: 2, sequence: 1, reason: 'out_of_stock' }).text.length > 0, 'Thiếu tên món vẫn có câu hợp lý');

  // Giọng văn khớp số sao: 5 sao không có câu chê, 1 đến 2 sao hoặc bỏ về không có câu khen.
  for (let sequence = 1; sequence <= 80; sequence++) {
    const context: Partial<ReviewContext> = { rainIntensity: 0.6, guardHelped: true, isWeekend: true, regularId: 'x', regularName: 'Bà Năm', averagePriceRatio: sequence % 2 ? 0.9 : 1.2 };
    const good = composeReview({ ...base, ...context, sequence, stars: 5, productName: 'Kẹo' });
    assert.ok(!negativeDetails.some(t => good.text.includes(t)), `5 sao không có câu chê: ${good.text}`);
    assert.ok(REVIEW_BY_STARS[5].some(t => good.text.startsWith(t)));
    const bad = composeReview({ ...base, ...context, sequence, stars: 1, reason: 'wait' });
    assert.ok(!positiveDetails.some(t => bad.text.includes(t)), `Bỏ về không có câu khen: ${bad.text}`);
  }
  assert.ok(composeReview({ ...base, sequence: 1, stars: 5, regularId: 'r', regularName: 'Bà Năm' }).stars === 5);

  // Đa dạng: nhiều câu khác nhau trong cùng một mức sao.
  for (const stars of [5, 4, 3, 2, 1]) {
    const texts = new Set(Array.from({ length: 60 }, (_, i) => composeReview({ ...base, stars, sequence: i + 1 }).text));
    assert.ok(texts.size >= 3, `${stars} sao có ít nhất 3 lời khác nhau (có ${texts.size})`);
  }

  // Ngữ cảnh: mưa, bảo vệ, giá.
  const ctxTexts = (ctx: Partial<ReviewContext>) => Array.from({ length: 80 }, (_, i) => composeReview({ ...base, ...ctx, sequence: i + 1 }).text);
  assert.ok(ctxTexts({ rainIntensity: 0.7 }).some(t => t.includes('mưa')), 'Trời mưa có lúc được nhắc tới');
  assert.ok(!ctxTexts({ rainIntensity: 0 }).some(t => t.includes('mưa')), 'Trời khô không nhắc mưa');
  assert.ok(ctxTexts({ guardHelped: true }).some(t => t.includes('bảo vệ')), 'Có bảo vệ trông xe thì có lúc được nhắc');
  assert.ok(!ctxTexts({ guardHelped: false }).some(t => t.includes('bảo vệ')), 'Không bảo vệ thì không nhắc');
  assert.ok(ctxTexts({ stars: 3, averagePriceRatio: 1.2 }).every(t => !t.includes('Giá mềm')), 'Giá cao không khen giá mềm');

  // Giữ lại tối đa REVIEW_HISTORY_CAP, bỏ mục hỏng khi tải.
  let list: CustomerReview[] = [];
  for (let i = 1; i <= REVIEW_HISTORY_CAP + 15; i++) list = appendReview(list, composeReview({ ...base, sequence: i }));
  assert.equal(list.length, REVIEW_HISTORY_CAP);
  assert.equal(list[list.length - 1].id, `rev-4-${REVIEW_HISTORY_CAP + 15}`, 'Giữ lời mới nhất');
  const dirty = [...list.slice(0, 3), null, { id: 1 }, { ...list[0], stars: 9 }, { ...list[0], text: '' }, { ...list[0], text: 'x'.repeat(401) }, 'rác'];
  assert.equal(sanitizeReviews(dirty).length, 3, 'Bỏ mục hỏng');
  assert.deepEqual(sanitizeReviews(undefined), []);

  // Tóm tắt.
  const summary = summarizeReviews([
    composeReview({ ...base, sequence: 1, stars: 5 }), composeReview({ ...base, sequence: 2, stars: 5 }),
    composeReview({ ...base, sequence: 3, stars: 2, reason: 'price' }), composeReview({ ...base, sequence: 4, stars: 1, reason: 'price' }), composeReview({ ...base, sequence: 5, stars: 2, reason: 'wait' }),
  ]);
  assert.deepEqual(summary.byStars, [1, 2, 0, 0, 2]);
  assert.equal(summary.count, 5);
  assert.ok(Math.abs(summary.average - 3) < 1e-9);
  assert.deepEqual(summary.topReason, { reason: 'price', count: 2 });
  assert.equal(summarizeReviews([]).count, 0);

  // Tích hợp: thanh toán sinh lời đánh giá cùng số sao với điểm; bỏ về có lý do; lưu/tải giữ nguyên.
  const waiting: CustomerState = {
    id: 'rev-cust', position: { x: 9 * 32, y: 8 * 32 }, stage: 'checkout', targetFixtureId: 'shelf_wooden_noodles', checkoutId: 'rev-cust',
    patience: 60, checkoutWait: 60,
    basket: [{ productId: 'mi_hao_hao', quantity: 1, unitPrice: 4500, lots: [{ quantity: 1, expiresOnDay: 10, unitCost: 3000, provenance: 'known' }] }],
  };
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.customers = [waiting];
  const seen: CustomerReview[] = [];
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), { onCustomerRated: e => { if (e.review) seen.push(e.review); } });
  assert.deepEqual(sim.getReviews(), [], 'Ván mới chưa có đánh giá');
  assert.equal(sim.completeCustomerCheckout('rev-cust'), true);
  const reviews = sim.getReviews();
  assert.equal(reviews.length, 1, 'Thanh toán xong có một lời đánh giá');
  assert.equal(reviews[0].stars, sim.getPlayerData().ratings![sim.getPlayerData().ratings!.length - 1], 'Số sao của lời đánh giá bằng điểm đã ghi');
  assert.ok(reviews[0].text.length > 0 && !reviews[0].reason);
  assert.deepEqual(seen, reviews, 'Callback nhận đúng lời đánh giá');
  assert.equal(sim.getReviewSummary().count, 1);

  const walkout: CustomerState = { ...waiting, id: 'rev-walk', checkoutId: 'rev-walk', basket: [], reservedProductId: 'nuoc_suoi', patience: 0 };
  (sim as unknown as { recordCustomerRating: (c: CustomerState, r?: string) => void }).recordCustomerRating(walkout, 'out_of_stock');
  const afterWalkout = sim.getReviews();
  assert.equal(afterWalkout.length, 2);
  assert.equal(afterWalkout[1].reason, 'out_of_stock');
  assert.equal(afterWalkout[1].productId, 'nuoc_suoi');
  assert.ok(afterWalkout[1].stars <= 2, 'Bỏ về vì hết hàng thì từ 2 sao trở xuống');
  assert.ok(!/[{}]/.test(afterWalkout[1].text) && afterWalkout[1].text.length > 0, 'Câu chữ hợp lệ, không còn chỗ trống');

  const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
  assert.deepEqual(reloaded.getReviews(), afterWalkout, 'Lưu rồi tải giữ nguyên các lời đánh giá');
  const legacy = structuredClone(DEFAULT_INITIAL_SAVE);
  delete (legacy as { reviews?: unknown }).reviews;
  assert.deepEqual(new GameSimulation(legacy, generateStarterTileMap(), new InputManager()).getReviews(), [], 'Save cũ không có đánh giá vẫn tải được');
  console.log('  ✓ Passed: Lời đánh giá bằng chữ theo sao, lý do, ngữ cảnh; giữ tối đa và lưu/tải');
}
