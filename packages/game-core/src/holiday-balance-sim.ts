/**
 * Mô phỏng kinh tế 5 lễ hội mới: so sánh lưu lượng khách, doanh thu và sức mua
 * các nhóm hàng ưu tiên so với ngày thường bằng GameSimulation headless.
 */
import {
  DEFAULT_INITIAL_SAVE,
  generateStarterTileMap,
  getDayOfYear,
  getSeasonForDay,
  SEASON_EVENTS,
  type SeasonId,
} from '@game/data';
import { isSalesFixture, type SaveGameData } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

export interface HolidaySimMetric {
  holidayId: SeasonId | 'baseline';
  holidayName: string;
  demandMultiplier: number;
  customers: number;
  revenue: number;
  preferredCategoryUnits: number;
}

export function findDayForHoliday(holidayId: SeasonId): number {
  const event = SEASON_EVENTS.find((e) => e.id === holidayId);
  if (!event) throw new Error(`Unknown holiday: ${holidayId}`);
  for (let d = 1; d <= 240; d++) {
    if (getDayOfYear(d) === event.startDayOfYear) return d;
  }
  return 1;
}

export function simulateDay(targetDay: number, level = 10): { customers: number; revenue: number; itemsSold: number } {
  const save: SaveGameData = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = level;
  save.player.money = 2_000_000;
  save.worldTime.day = targetDay;
  save.worldTime.hour = 6;
  save.worldTime.minute = 0;
  save.worldTime.isStoreOpen = true;

  // Thu ngân đầy đủ để không bị tắc nghẽn quầy
  save.staff = [
    {
      id: 'cashier-sim',
      name: 'Thu ngân Sim',
      role: 'cashier',
      speed: 8,
      accuracy: 8,
      stamina: 8,
      dailyWage: 40_000,
      hiredOnDay: 1,
      shift: 'full_day',
    },
    {
      id: 'refill-sim',
      name: 'Châm hàng Sim',
      role: 'refill',
      speed: 8,
      accuracy: 8,
      stamina: 8,
      dailyWage: 35_000,
      hiredOnDay: 1,
      shift: 'full_day',
    },
  ];

  const map = generateStarterTileMap();
  const sim = new GameSimulation(save, map, new InputManager(), {});

  // Đảm bảo các kệ đều có hàng đầy đủ
  for (const fixture of sim.getFixtures().filter(isSalesFixture)) {
    if (!fixture.assignedProductId) {
      fixture.assignedProductId = 'keo_deo';
    }
    fixture.currentStock = 20;
    fixture.stockLots = [{ quantity: 20, unitCost: 3000, expiresOnDay: 9999, provenance: 'known' }];
  }

  let guard = 0;
  const startDay = targetDay;
  while (sim.getTime().day <= startDay && guard++ < 150_000) {
    const t = sim.getTime();
    if (!t.isStoreOpen && t.hour >= 6 && t.hour < 21) {
      sim.getClock().toggleStoreStatus();
    }
    sim.update(0.25);
    // Luôn giữ kệ có hàng để đo lực cầu thuần túy
    for (const fixture of sim.getFixtures().filter(isSalesFixture)) {
      if (fixture.currentStock < 10) {
        fixture.currentStock = 20;
        fixture.stockLots = [{ quantity: 20, unitCost: 3000, expiresOnDay: 9999, provenance: 'known' }];
      }
    }
  }

  const dailyRecord = sim.getDailyRecords()[targetDay];
  const stats = sim.getStatistics();
  return {
    customers: dailyRecord?.customersServed ?? stats.totalCustomersServed,
    revenue: dailyRecord?.revenue ?? stats.totalRevenue ?? 0,
    itemsSold: dailyRecord?.itemsSold ?? 0,
  };
}

export const NEW_HOLIDAY_IDS: readonly SeasonId[] = [
  'quoc_te_phu_nu',
  'nghi_le_30_4',
  'quoc_khanh',
  'phu_nu_vn',
  'giang_sinh',
];
