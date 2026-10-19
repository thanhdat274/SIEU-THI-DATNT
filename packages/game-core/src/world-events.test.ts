import assert from 'node:assert/strict';
import type { InventoryItem } from '@game/shared';
import { ALL_PARCELS, DEFAULT_INITIAL_SAVE, DEFAULT_PLACEMENTS, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { createMarketState } from './market';
import { GameSimulation } from './simulation';
import { W4_FAIR_PERIOD_DAYS, mergeDayEvents } from './world-events';
import {
  worldEventsForDay,
  worldEventsBetween,
  W4_FAIR_TRAFFIC_FACTOR,
} from './world-events';
import {
  W4_FAIR_DURATION_DAYS,
  POWER_OUTAGE_SPOILAGE_FACTOR,
} from './world-events-constants';

/**
 * Sự kiện thành phố / sự cố ngẫu nhiên — phần lõi THUẦN (tính năng đề xuất #2).
 * Ràng buộc: cùng (seed, ngày) → cùng kết quả (chơi lẻ = chơi chung). Export `runWorldEventsTests`.
 */
export function runWorldEventsTests(): void {
  runWorldEventsIntegrationTests();

  // ---- Deterministic: cùng seed+ngày → cùng output (yêu cầu co-op 2 phía thấy cùng sự kiện) ----
  {
    const a = worldEventsForDay('world-seed-1', 20);
    assert.deepEqual(a, worldEventsForDay('world-seed-1', 20), 'cùng seed+ngày → cùng sự kiện');
  }

  // ---- Hội chợ W4: đúng 3 ngày liên tiếp, +50% khách, rồi tắt ----
  {
    // Tìm một ngày mở đầu của một kỳ hội chợ (định rõ để kiểm biên).
    // Dùng worldEventsBetween để tìm dãy container.
    const fine = () => worldEventsBetween('fair-seed-A', 1, 60).filter((d) => d.events.some((e) => e.kind === 'w4_fair'));
    const days = fine().map((d) => d.day);
    assert.ok(days.length > 0, 'hội chợ xuất hiện trong cửa sổ 60 ngày');
    // Kiểm: mỗi dãy liên tiếp có độ dài đúng W4_FAIR_DURATION_DAYS và hệ số 1.5.
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] + 1) run += 1;
      else {
        assert.equal(run, W4_FAIR_DURATION_DAYS, 'mỗi kỳ hội chợ kéo đúng 3 ngày liên tiếp');
        run = 1;
      }
    }
    assert.equal(run, W4_FAIR_DURATION_DAYS, 'kỳ cuối cùng cũng dài đúng 3 ngày');
    // Từng ngày trong kỳ: active, traffic=1.5; bên ngoài kỳ: không.
    const firstFairDay = days[0];
    const inside = worldEventsForDay('fair-seed-A', firstFairDay);
    const fair = inside.events.find((e) => e.kind === 'w4_fair');
    assert.ok(fair, 'ngày trong kỳ có sự kiện hội chợ');
    assert.equal(inside.trafficFactor, W4_FAIR_TRAFFIC_FACTOR, 'hội chợ nhân khách +50%');
    const before = worldEventsForDay('fair-seed-A', firstFairDay - 1);
    assert.ok(!before.events.some((e) => e.kind === 'w4_fair'), 'ngày trước kỳ không có hội chợ');
    const after = worldEventsForDay('fair-seed-A', firstFairDay + W4_FAIR_DURATION_DAYS);
    assert.ok(!after.events.some((e) => e.kind === 'w4_fair'), 'ngày sau kỳ không có hội chợ');
    assert.equal(after.trafficFactor, 1, 'hết hội chợ → traffic trở về 1');
  }

  // ---- Mất điện: tủ lạnh hỏng nhanh hơn (spoilageFactor > 1) ----
  {
    // Tìm một ngày có mất điện.
    let outageDay = -1;
    for (let day = 2; day <= 300; day++) {
      const r = worldEventsForDay('outage-seed-B', day);
      if (r.events.some((e) => e.kind === 'power_outage')) { outageDay = day; break; }
    }
    assert.ok(outageDay >= 0, 'có ngày mất điện trong 300 ngày');
    const r = worldEventsForDay('outage-seed-B', outageDay);
    assert.ok(r.events.some((e) => e.kind === 'power_outage'), 'ngày tìm được có sự kiện mất điện');
    assert.equal(r.spoilageFactor, POWER_OUTAGE_SPOILAGE_FACTOR, 'mất điện tăng tốc hư hỏng hàng lạnh');
    // Ngày không mất điện → spoilage 1.
    const quiet = worldEventsForDay('outage-seed-B', outageDay - 1);
    if (!quiet.events.some((e) => e.kind === 'power_outage')) {
      assert.equal(quiet.spoilageFactor, 1, 'không mất điện → spoilage bình thường');
    }
  }

  // ---- Chống dồn: không có 2 lần mất điện liên tiếp gần nhau hơn min-gap ----
  {
    const outages: number[] = [];
    for (let day = 1; day <= 400; day++) {
      if (worldEventsForDay('outage-seed-C', day).events.some((e) => e.kind === 'power_outage')) outages.push(day);
    }
    for (let i = 1; i < outages.length; i++) {
      assert.ok(outages[i] - outages[i - 1] > 1, 'mất điện không dồn hai ngày sát nhau');
    }
  }

  // ---- Sanity: trong ngày "bình thường" (không sự kiện) → events rỗng, hệ số 1 ----
  {
    // Tìm ngày không có sự kiện nào.
    let quietDay = -1;
    for (let day = 1; day <= 200; day++) {
      const r = worldEventsForDay('quiet-seed-D', day);
      if (r.events.length === 0) { quietDay = day; break; }
    }
    assert.ok(quietDay >= 0, 'tìm được ngày không có sự kiện');
    assert.equal(worldEventsForDay('quiet-seed-D', quietDay).trafficFactor, 1, 'ngày thường traffic 1');
  }

  // ---- Tinh chỉnh options hoạt động (test API, không phụ thuộc giá trị mặc định) ----
  {
    const noFair = worldEventsForDay('opt-seed', 5, { fairPeriodDays: 1000, fairDurationDays: 1 });
    assert.ok(!noFair.events.some((e) => e.kind === 'w4_fair'), 'tắt hội chợ bằng period lớn → không có');
  }

  // ---- Deterministic chéo: 2 phía tính riêng ra cùng kết quả cho dãy ngày ----
  {
    const sideA = worldEventsBetween('coop-seed-E', 1, 30);
    const sideB = worldEventsBetween('coop-seed-E', 1, 30);
    assert.deepEqual(sideA, sideB, 'hai phía liệt kê cùng danh sách sự kiện');
  }
}

/** Phần nối (17/10/2026): chống chồng mất điện, chu kỳ hội chợ, spoilage khi mất điện thành phố. */
function runWorldEventsIntegrationTests(): void {
  // ---- Chống chồng: mất điện ở cả hai nguồn → chỉ áp một lần ----
  {
    const both = { day: 5, events: [
      { kind: 'w4_fair' as const, label: 'Hội chợ', trafficFactor: 1.5, spoilageFactor: 1 },
      { kind: 'power_outage' as const, label: 'Mất điện', trafficFactor: 1, spoilageFactor: 2 },
    ], trafficFactor: 1.5, spoilageFactor: 2 };
    const merged = mergeDayEvents(both, true);
    assert.deepEqual(merged.events.map(e => e.kind), ['w4_fair'], 'thị trường đã mất điện → bỏ mất điện thành phố');
    assert.equal(merged.spoilageFactor, 1, 'hư hỏng không nhân thêm lần hai');
    assert.equal(merged.trafficFactor, 1.5, 'hội chợ giữ nguyên');
    assert.deepEqual(mergeDayEvents(both, false), both, 'thị trường không mất điện → giữ nguyên');
  }

  // ---- Hội chợ: mỗi kỳ đúng 3 ngày liên tiếp, các kỳ cách nhau đúng chu kỳ cố định ----
  {
    const fairDays = Array.from({ length: 100 }, (_, i) => i + 1).filter(d => worldEventsForDay('fair-cycle', d).events.some(e => e.kind === 'w4_fair'));
    const starts = fairDays.filter(d => !fairDays.includes(d - 1));
    assert.ok(starts.length >= 10);
    for (const start of starts) {
      if (start === 1) continue; // kỳ cắt ở biên cửa sổ
      assert.deepEqual([0, 1, 2, 3].map(k => fairDays.includes(start + k)), [true, true, true, false], `kỳ bắt đầu ngày ${start} dài đúng 3 ngày`);
    }
    for (let i = 2; i < starts.length; i++) assert.equal(starts[i] - starts[i - 1], W4_FAIR_PERIOD_DAYS, 'lặp theo chu kỳ cố định');
  }

  // ---- Spoilage: ngày mất điện thành phố, hàng lạnh hao nhanh hơn; trùng mất điện thị trường chỉ áp một lần ----
  {
    const SEED = 'city-outage-seed';
    const outageDays = Array.from({ length: 400 }, (_, i) => i + 2).filter(d => worldEventsForDay(SEED, d).events.some(e => e.kind === 'power_outage'));
    const outageDay = outageDays[0];
    const calmDay = Array.from({ length: 400 }, (_, i) => i + 2).find(d => worldEventsForDay(SEED, d).events.length === 0)!;
    assert.ok(outageDay && calmDay, 'tìm được ngày mất điện và ngày yên');
    const meat = (day: number): InventoryItem[] => [{ productId: 'thit_heo_tuoi', quantity: 2, lots: [{ quantity: 2, expiresOnDay: day + 10, unitCost: 38000, provenance: 'known' }] }];
    const lost = (day: number, marketOutage: boolean) => {
      const market = { ...createMarketState(SEED, day), events: marketOutage ? [{ id: 'power_outage', startDay: day, endDay: day }] : [] };
      const sim = new GameSimulation({ ...structuredClone(DEFAULT_INITIAL_SAVE), inventory: meat(day), worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day }, market }, generateStarterTileMap(), new InputManager());
      const events = sim.getWorldEvents(day);
      sim.getClock().advanceToNextDay();
      return { lostDays: day + 10 - sim.getInventory().find(i => i.productId === 'thit_heo_tuoi')!.lots![0].expiresOnDay, events };
    };
    const calm = lost(calmDay, false);
    const city = lost(outageDay, false);
    assert.ok(city.lostDays >= 1, `mất điện thành phố: trừ thêm ít nhất 1 ngày hạn (được ${city.lostDays})`);
    assert.ok(city.lostDays > calm.lostDays, `mất điện thành phố: hao ${city.lostDays} > ${calm.lostDays}`);
    const marketOnly = lost(calmDay, true);
    const bothSources = lost(outageDay, true);
    assert.ok(!bothSources.events.events.some(e => e.kind === 'power_outage'), 'gộp: không còn mất điện thành phố khi thị trường đã mất điện');
    assert.equal(bothSources.lostDays, marketOnly.lostDays, 'trùng hai nguồn: hao bằng đúng một lần mất điện');
  }

  // ---- Hội chợ áp theo TÒA ở khu W4: tòa trên lô W4 +50% ngày hội chợ; tòa W0 và ngày thường không đổi ----
  {
    const SEED = 'fair-building-seed';
    const isFair = (d: number) => worldEventsForDay(SEED, d).events.some(e => e.kind === 'w4_fair');
    const fairDay = Array.from({ length: 30 }, (_, i) => i + 2).find(isFair)!;
    const plainDay = Array.from({ length: 30 }, (_, i) => i + 2).find(d => worldEventsForDay(SEED, d).events.length === 0)!;
    const w4Parcel = ALL_PARCELS.find(p => p.districtId === 'am_thuc_nam')!;
    assert.ok(fairDay && plainDay && w4Parcel);
    const simOn = (day: number) => {
      const sim = new GameSimulation({ ...structuredClone(DEFAULT_INITIAL_SAVE), worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day }, market: createMarketState(SEED, day) }, generateStarterTileMap(), new InputManager());
      // Chỉ cần vị trí đặt để tra khu; dời `xoi` sang lô W4 (tiệm chính cố định ở W0, không dời được).
      (sim as unknown as { buildingPlacements: unknown }).buildingPlacements = DEFAULT_PLACEMENTS.map(p => p.buildingId === 'xoi' ? { ...p, parcelId: w4Parcel.id } : { ...p });
      return sim;
    };
    const stream = (sim: GameSimulation) => (sim as unknown as { buildingStreamTrafficMultiplier(): (id: string) => number }).buildingStreamTrafficMultiplier();
    const parcel = (sim: GameSimulation) => (sim as unknown as { buildingParcelTrafficMultiplier(): (id: string) => number }).buildingParcelTrafficMultiplier();
    const fair = simOn(fairDay);
    assert.equal(fair.getBuildingWorldEventFactor('xoi'), 1.5, 'tòa trên lô W4 ngày hội chợ: +50%');
    assert.equal(stream(fair)('xoi'), parcel(fair)('xoi') * 1.5, 'dòng khách tòa W4 nhân 1,5');
    assert.equal(fair.getBuildingWorldEventFactor('main'), 1, 'tiệm chính ở W0: không đổi');
    assert.equal(stream(fair)('main'), 1);
    assert.equal(fair.getBuildingWorldEventFactor('drink'), 1, 'tòa khác ở W0: không đổi');
    const plain = simOn(plainDay);
    assert.equal(plain.getBuildingWorldEventFactor('xoi'), 1, 'ngày thường: tòa W4 không đổi');
    const hud = fair.getMarketSummary().events.find(e => e.id === 'city:w4_fair')!;
    assert.ok(hud && !hud.label.includes('không áp'), 'có tòa ở W4 → không ghi "không áp"');
    assert.ok(hud.daysLeft >= 1 && hud.daysLeft <= 3, 'daysLeft thật trong kỳ 3 ngày');
    const firstFairDay = isFair(fairDay - 1) ? fairDay - 1 : fairDay;
    const start = simOn(isFair(firstFairDay - 1) ? firstFairDay - 1 : firstFairDay);
    assert.equal(start.getMarketSummary().events.find(e => e.id === 'city:w4_fair')!.daysLeft, 3, 'ngày đầu kỳ: còn 3 ngày');
    const noW4 = new GameSimulation({ ...structuredClone(DEFAULT_INITIAL_SAVE), worldTime: { ...DEFAULT_INITIAL_SAVE.worldTime, day: fairDay }, market: createMarketState(SEED, fairDay) }, generateStarterTileMap(), new InputManager());
    assert.ok(noW4.getMarketSummary().events.find(e => e.id === 'city:w4_fair')!.label.includes('không áp cho tiệm của bạn'), 'không có tòa W4 → ghi rõ');
    assert.ok(noW4.getMorningBrief().cityEvents!.some(l => l.includes('không áp cho tiệm của bạn')), 'bản tin ghi rõ');
  }
}
