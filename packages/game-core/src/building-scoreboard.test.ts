import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { CURRENT_SAVE_SCHEMA_VERSION, validateSaveGameData, type LedgerEntry, type SaveGameData } from '@game/shared';
import { GameSimulation } from './simulation';
import { InputManager } from './input';
import { buildingScores, ledgerProfit, managerScores, UNMANAGED } from './building-scoreboard';

export function runBuildingScoreboardTests(): void {
  console.log('\n--- Bảng thành tích theo tòa/người (coop-contracts 3.1) ---');
  let n = 0;
  const e = (x: Omit<LedgerEntry, 'id' | 'timestamp' | 'description'>): LedgerEntry => ({ id: `l${n++}`, timestamp: '', description: '', ...x });
  const ledger: LedgerEntry[] = [];
  // 5 ngày có hợp đồng main → snack-1 (giá nội bộ 3k × 10).
  for (let day = 1; day <= 5; day++) {
    ledger.push(e({ day, type: 'sale', amount: 200_000, cogs: 120_000 }));
    ledger.push(e({ day, type: 'sale', amount: 80_000, cogs: 40_000, buildingInstanceId: 'snack-1' }));
    ledger.push(e({ day, type: 'wage', amount: 30_000 }));
    ledger.push(e({ day, type: 'rent', amount: 10_000, buildingInstanceId: 'snack-1' }));
    ledger.push(e({ day, type: 'purchase', amount: 500_000 }));
    ledger.push(e({ day, type: 'internal_transfer', amount: 30_000, quantity: 10, buildingInstanceId: 'main', toBuildingInstanceId: 'snack-1' }));
  }
  const managers = { main: 'acc-A', 'snack-1': 'acc-B' };
  const byBuilding = buildingScores(ledger, managers);
  const main = byBuilding.find(s => s.buildingId === 'main')!;
  const snack = byBuilding.find(s => s.buildingId === 'snack-1')!;
  assert.equal(main.revenue, 5 * (200_000 + 30_000), 'giá nội bộ cộng vào doanh thu tòa giao');
  assert.equal(snack.cogs, 5 * (40_000 + 30_000), 'giá nội bộ cộng vào giá vốn tòa nhận');
  const people = managerScores(byBuilding);
  assert.equal(people.reduce((sum, p) => sum + p.profit, 0), ledgerProfit(ledger), 'tổng lãi theo người = lãi sổ cái doanh nghiệp');
  assert.deepEqual(people.map(p => p.managerAccountId).sort(), ['acc-A', 'acc-B']);
  // Chơi một mình: không gán → một nhóm chung, vẫn khớp.
  const solo = managerScores(buildingScores(ledger));
  assert.equal(solo.length, 1); assert.equal(solo[0].managerAccountId, UNMANAGED);
  assert.equal(solo[0].profit, ledgerProfit(ledger));
  // Theo ngày.
  assert.equal(buildingScores(ledger, managers, 3).find(s => s.buildingId === 'main')!.revenue, 230_000, 'lọc theo ngày');
  console.log('  ✓ đối soát tổng lãi theo người khớp sổ cái');

  // Simulation thật: hợp đồng chạy mỗi sáng → lô FEFO đang chuyển + sổ internal_transfer; schema 12 lưu/nạp giữ nguyên.
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  save.worldTime.isStoreOpen = false;
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
  sim.addSupplyContract({ id: 'c1', fromBuildingId: 'main', toBuildingId: 'main', productId: 'mi_hao_hao', quantityPerDay: 5, internalPrice: 3_000, startDay: 1, status: 'active' });
  for (let i = 0; i < 5; i++) sim.getClock().advanceToNextDay();
  const transfers = sim.getLedger().filter(x => x.type === 'internal_transfer');
  assert.ok(transfers.length > 0 && transfers.every(x => x.amount === 3_000 * (x.quantity ?? 0)), 'sổ internal_transfer = giá nội bộ × số lượng');
  assert.equal(managerScores(buildingScores(sim.getLedger())).reduce((a, p) => a + p.profit, 0), ledgerProfit(sim.getLedger()), 'đối soát trên sổ cái simulation 5 ngày');
  const exported = sim.exportSaveData();
  assert.equal(exported.schemaVersion, CURRENT_SAVE_SCHEMA_VERSION);
  assert.equal(exported.supplyContracts?.length, 1, 'hợp đồng vào save');
  const reloaded = new GameSimulation(exported, generateStarterTileMap(), new InputManager(), {});
  assert.deepEqual(reloaded.getSupplyContracts(), sim.getSupplyContracts(), 'hợp đồng giữ qua lưu/nạp');
  assert.deepEqual(reloaded.getInternalDeliveries(), sim.getInternalDeliveries(), 'chuyến đang chuyển giữ qua lưu/nạp');
  // Migration 11 → 12.
  const v11 = { ...structuredClone(exported), schemaVersion: 11 } as SaveGameData;
  delete v11.supplyContracts; delete v11.internalDeliveries;
  const migrated = validateSaveGameData(v11);
  assert.ok(migrated.valid && migrated.data?.schemaVersion === CURRENT_SAVE_SCHEMA_VERSION, 'save schema 11 nâng lên 12');
  console.log('  ✓ hợp đồng thật: internal_transfer, đối soát, schema 12 lưu/nạp + migration 11→12');
}
