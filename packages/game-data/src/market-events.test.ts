import assert from 'node:assert/strict';
import { validateMarketData } from './modifiers';
import { MARKET_EVENTS, MARKET_EVENT_MAP, MARKET_EVENT_RULES } from './market-events';

/**
 * Sự kiện thành phố / khủng hoảng — kiểm chứng dữ liệu catalog THUẦN (tính năng đề xuất #2, PHẦN THUẦN).
 *
 * KHÁM PHÁ KIẾN TRÚC: hệ "sự kiện thị trường/thành phố" xác định theo hạt giống ĐÃ TỒN TẠI sẵn
 * (`market-events.ts` + `game-core/market.ts.scheduleEvents`: roll `Mulberry32Rng(daySeed(day, hashSeed(seed:id)))`
 * → cùng seed, cả chơi lẻ lẫn chơi chung đều ra đúng lịch sự kiện giống nhau). Vì vậy KHÔNG xây hệ mới
 * song song; phần đóng góp của vòng này là THÊM template additive (`night_market`, `health_inspection`)
 * vào đúng catalog có sẵn để nó hòa vào cùng cơ chế modifier deterministic chung 2 phía.
 *
 * Chạy độc lập `tsx src/market-events.test.ts`; export `runMarketEventDataTests` để nối test-runner.
 */
export function runMarketEventDataTests(): void {
  // 1) Catalog tổng thế vẫn hợp lệ (validate bao gồm cả cỗ luật sinh từ MARKET_EVENT_RULES).
  assert.deepEqual(validateMarketData(), [], 'toàn hệ sự kiện/mùa/thời tiết/khung giờ hợp lệ (không lỗi)');

  // 2) Template additive mới phải có mặt.
  for (const id of ['night_market', 'health_inspection'] as const) {
    assert.ok(MARKET_EVENT_MAP[id], `có template '${id}'`);
    assert.ok(MARKET_EVENTS.some((def) => def.id === id), `'${id}' nằm trong catalog`);
  }

  // 3) Cỗ luật (rules) của template mới được sinh đúng: source 'event' + nối đúng `when.event` + id duy nhất.
  const ruleIds = new Set<string>();
  const rule = MARKET_EVENT_RULES.find((r) => r.when.event?.[0] === 'night_market');
  assert.ok(rule, 'có rule cho night_market');
  assert.equal(rule.source, 'event');
  assert.ok(MARKET_EVENT_RULES.every((r) => !ruleIds.has(r.id) && (ruleIds.add(r.id), true)), 'mọi rule có id duy nhất');

  // 4) Hệ số mới nằm trong dải cho phép của kênh (traffic [0.25, 2.5] sau kẹp, đơn lẻ [0.1, 4]).
  for (const def of MARKET_EVENTS.filter((e) => e.id === 'night_market' || e.id === 'health_inspection')) {
    for (const eff of def.effects) {
      for (const [channel, factor] of Object.entries(eff.effects)) {
        if (channel === 'traffic') assert.ok(factor >= 0.1 && factor <= 4, `'${def.id}' traffic hợp lệ`);
      }
    }
  }
}
