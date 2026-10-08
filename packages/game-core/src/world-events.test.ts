import assert from 'node:assert/strict';
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
