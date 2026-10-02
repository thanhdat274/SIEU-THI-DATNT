import { CURRENT_SAVE_SCHEMA_VERSION, type SaveGameData } from '@game/shared';

/** Thay `@game/data` khi chạy test web bằng tsx (gói thật không import được dưới ESM của tsx). Chỉ cung cấp save khởi đầu tối thiểu. */
export const DEFAULT_INITIAL_SAVE = {
  id: 'stub-default', schemaVersion: CURRENT_SAVE_SCHEMA_VERSION, revision: 1, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  player: { name: 'Chủ tiệm', level: 1, experience: 0, experienceToNextLevel: 100, money: 50_000, reputation: 0, position: { x: 1, y: 1 }, direction: 'down' },
  worldTime: { day: 1, hour: 8, minute: 0, isStoreOpen: false, timeScale: 60 },
  storeLayout: { widthTiles: 10, heightTiles: 10, fixtures: [], storedFixtures: [], unlockedPlotIds: [] },
  inventory: [],
  statistics: { totalRevenue: 0, totalCustomersServed: 0, totalDaysPassed: 0 },
} as unknown as SaveGameData;
