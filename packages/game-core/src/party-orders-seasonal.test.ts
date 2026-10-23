import assert from 'node:assert/strict';
import {
  createInitialPartyOrderState,
  partyOrdersForSeason,
  refreshAvailablePartyOrders,
} from './party-orders';
import { upcomingNearbySeasons, seasonYearOf, daysLeftInSeason } from './neighborhood-events';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import {
  DEFAULT_INITIAL_SAVE,
  PARTY_ORDERS,
  generateStarterTileMap,
  SEASON_EVENTS,
  validatePartyOrders,
  getDayOfYear,
} from '@game/data';

/** Ngày game đầu tiên của một lễ hội (giống Helper trong holiday-balance-sim). */
function findDayForHoliday(id: string): number {
  const event = SEASON_EVENTS.find((e) => e.id === id)!;
  for (let d = 1; d <= 600; d++) {
    if (getDayOfYear(d) === event.startDayOfYear) return d;
  }
  return 1;
}

export function runPartyOrdersSeasonalTests(): void {
  console.log('\n=============================================');
  console.log('🧪 KIỂM THỬ ĐƠN TIỆC THEO MÙA (SEASONAL PARTY ORDERS)');
  console.log('=============================================');

  // 1. Dữ liệu hợp lệ: món có thật, mở khóa kịp cấp, nhãn mùa hợp lệ
  console.log('\n--- Test: validatePartyOrders không báo lỗi ---');
  {
    const errors = validatePartyOrders();
    assert.equal(errors.length, 0, `Data đơn tiệc hợp lệ (errors: ${errors.join('; ')})`);
  }
  console.log('  ✓ Mọi đơn tiệc đều có món thật, mở khóa đúng cấp và mùa hợp lệ');

  // 2. partyOrdersForSeason phân nhóm đúng
  console.log('\n--- Test: partyOrdersForSeason phân nhóm seasonal/general ---');
  {
    const tetDay = findDayForHoliday('tet');
    const { seasonal, general } = partyOrdersForSeason(PARTY_ORDERS, tetDay);
    assert.ok(seasonal.length >= 1, 'Tết có ít nhất 1 đơn đúng mùa');
    assert.ok(seasonal.every((o) => o.seasons?.includes('tet')), 'Đơn mùa Tết đều khai seasons tet');
    assert.ok(general.some((o) => !o.seasons || o.seasons.length === 0), 'Có đơn chung không khai mùa');

    // Ngày không lễ: không có đơn mùa
    const offSeasonDay = findDayForHoliday('tet') + 30; // ngoài các ngày lễ
    const { seasonal: offSeason } = partyOrdersForSeason(PARTY_ORDERS, offSeasonDay);
    assert.equal(offSeason.length, 0, 'Ngày không lễ không có đơn mùa nào');
  }
  console.log('  ✓ Phân nhóm seasonal/general đúng, ngày không lễ không có đơn mùa');

  // 3. refreshAvailablePartyOrders ưu tiên đơn đúng mùa
  console.log('\n--- Test: sinh đơn ưu tiên mùa đang diễn ra ---');
  {
    // Tết: đơn mùa Tết đứng đầu tập hợp ưu tiên
    const tetDay = findDayForHoliday('tet');
    let state = createInitialPartyOrderState();
    state = refreshAvailablePartyOrders(state, tetDay, 5);
    const added = state.available.filter((o) => o.availableDay === tetDay);
    assert.ok(added.length >= 1, 'Sinh đơn mới trong ngày đầu Tết');
    const firstDef = PARTY_ORDERS.find((o) => o.id === added[0].orderId);
    assert.ok(firstDef, 'Đơn mới có định nghĩa');
    assert.ok(firstDef.seasons?.includes('tet'), 'Đơn mới đầu tiên trong Tết là đơn mùa Tết');

    // Ngày không lễ: đơn mới là đơn chung
    const offSeasonDay = findDayForHoliday('trung_thu') + 20;
    state = createInitialPartyOrderState();
    state = refreshAvailablePartyOrders(state, offSeasonDay, 5);
    const offAdded = state.available.filter((o) => o.availableDay === offSeasonDay);
    const offDef = PARTY_ORDERS.find((o) => o.id === offAdded[0]?.orderId);
    assert.ok(offDef && !offDef.seasons?.length, 'Ngày không lễ sinh đơn chung');
  }
  console.log('  ✓ Trong mùa ưu tiên đơn đúng mùa; ngoài mùa dùng đơn chung');

  // 4. Đơn mùa không bị sinh lại khi hết mùa; đơn đang chờ quá hạn theo luật cũ
  console.log('\n--- Test: đơn mùa không sinh lại ngoài mùa & hết hạn đúng luật ---');
  {
    const tetDay = findDayForHoliday('tet');
    // Chạy nhiều ngày trọn mùa Tết → đơn mùa Tết xuất hiện trong mùa
    let state = createInitialPartyOrderState();
    for (let d = tetDay; d < tetDay + 8; d++) {
      state = refreshAvailablePartyOrders(state, d, 5);
    }
    const tetSeasonalSeen = state.available.some((o) => PARTY_ORDERS.find((p) => p.id === o.orderId)?.seasons?.includes('tet'));
    assert.ok(tetSeasonalSeen, 'Trong mùa Tết có đơn mùa Tết xuất hiện');

    // Đủ hết quá hạn (đơn pending hết hạn sau availableDay+2), rồi chạy ngoài mùa
    const afterSeason = tetDay + 30;
    state = refreshAvailablePartyOrders(state, afterSeason, 5);
    for (const o of state.available) {
      if (o.status === 'pending') {
        // Đơn put thêm trong ngày ngoài mùa phải là đơn chung, không phải đơn mùa Tết
        const def = PARTY_ORDERS.find((p) => p.id === o.orderId);
        assert.ok(def && !def.seasons?.includes('tet'), 'Đơn pending ngoài mùa không phải đơn mùa Tết');
      }
    }
  }
  console.log('  ✓ Ngoài mùa không sinh đơn mùa; đơn cũ hết hạn theo luật cũ');

  // 5. upcomingNearbySeasons & season helpers
  console.log('\n--- Test: upcomingNearbySeasons liệt kê lễ hội ---');
  {
    const tetDay = findDayForHoliday('tet');
    const events = upcomingNearbySeasons(tetDay);
    assert.ok(events.length >= 1, 'Có lễ hội trong tầm nhìn');
    assert.equal(events[0].daysUntil, 0, 'Lễ hội đang diễn ra có daysUntil 0');
    assert.equal(daysLeftInSeason(tetDay) >= 1, true, 'Còn ít nhất 1 ngày lễ hội');
    assert.equal(typeof seasonYearOf(tetDay), 'number', 'seasonYearOf trả số');
    assert.equal(seasonYearOf(tetDay + 120), seasonYearOf(tetDay) + 1, 'Sau đúng 1 năm mùa thì tăng 1 năm');
  }
  console.log('  ✓ upcomingNearbySeasons và season helpers đúng');

  // 6. GameSimulation.getNeighborhoodEvents phản ánh mùa và đơn mùa
  console.log('\n--- Test: getNeighborhoodEvents với mùa Tết ---');
  {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime.day = findDayForHoliday('tet');
    save.player.level = 5;
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const events = sim.getNeighborhoodEvents();
    assert.ok(events.current, 'Có lễ hội đang diễn ra');
    assert.equal(events.current!.eventId, 'tet');
    assert.ok(events.current!.daysLeft >= 1);
    assert.ok(Array.isArray(events.upcoming));
    assert.ok(events.upcoming.length >= 0);
    assert.ok(Array.isArray(events.seasonalOrders));
    assert.ok(events.current!.preferredCategories.length > 0, 'Có nhóm hàng ưu tiên');
  }
  console.log('  ✓ getNeighborhoodEvents trả lễ hội đang diễn ra, đơn mùa và nhóm hàng ưu tiên');

  // 7. Thông báo lễ hội: toast ngày đầu Tết, không lặp trong cùng năm
  console.log('\n--- Test: thông báo lễ hội ngày đầu và không lặp ---');
  {
    const tetDay = findDayForHoliday('tet');
    const toasts: string[] = [];
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime.day = tetDay - 1;
    save.player.level = 5;
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), {
      onToast: (msg) => toasts.push(msg),
    });
    // Chuyển sang đầu Tết qua advanceToNextDay → callback clock chạy notifySeasonalEvents
    sim.getClock().setTime({ ...sim.getClock().getTime(), day: tetDay - 1, hour: 23, minute: 0, isStoreOpen: false });
    sim.getClock().advanceToNextDay();
    const festivalToasts = toasts.filter((t) => t.includes('Tết') || t.includes('🎉'));
    assert.ok(festivalToasts.length >= 1, `Có thông báo lễ hội Tết (${toasts.join(' | ')})`);

    // Lặp lại advanceToNextDay cùng đầu Tết: không thêm toast lễ hội lần hai
    const before = toasts.length;
    sim.getClock().advanceToNextDay();
    const afterSecond = toasts.slice(before);
    assert.ok(!afterSecond.some((t) => t.includes('🎉')), 'Không nhắc lặp lễ hội trong cùng năm');
  }
  console.log('  ✓ Thông báo lễ hội chạy ngày đầu và không lặp trong phiên');

  console.log('\n🎉 TOÀN BỘ KIỂM THỬ ĐƠN TIỆC THEO MÙA ĐẠT!');
}
