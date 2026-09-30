import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { AutoBuyRule } from '@game/shared';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

const create = (save = structuredClone(DEFAULT_INITIAL_SAVE)) => new GameSimulation(save, generateStarterTileMap(), new InputManager());

/** Vòng 3 ngày headless: đặt → giao → bày → khách → bán → lương → tự nhập → lưu/tải; đối chiếu tiền với sổ cái. */
export function runIntegrationTests(): void {
  console.log('\n--- Test 11.1: Vòng vận hành 3 ngày (headless) ---');
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 3;
  save.player.money = 500_000;
  const sim = create(save);
  const startMoney = sim.getPlayerData().money;

  const rules: AutoBuyRule[] = [{ id: 'r1', productId: 'mi_hao_hao', threshold: 5, quantity: 10, supplierId: 'dai_ly_dau_hem', priority: 1, maxBudget: 60_000 }];
  assert.equal(sim.setAutoBuyConfig(true, rules).success, true);
  assert.equal(sim.orderFromSupplier('mi_hao_hao', 20), true, 'Đặt hàng ngày 1');
  assert.equal(sim.orderFromSupplier('xa_xi_chuong_duong', 10), true);
  const candidate = sim.getStaffCandidates().find(c => c.role === 'cashier')!;
  const hired = sim.hireStaff(candidate.id);
  assert.equal(hired.success, true, hired.reason ?? 'hire');

  const startDay = sim.getTime().day;
  const step = 1 / 20;
  let guard = 0;
  while (sim.getTime().day < startDay + 3 && guard++ < 3_000_000) {
    const t = sim.getTime();
    if (t.day === startDay && t.hour >= 8 && !t.isStoreOpen && t.day === sim.getTime().day) {
      // Sau khi hàng giao (sáng ngày 2) mới có gì để bày; ngày 1 chỉ đóng cửa chờ hàng.
    }
    if (t.day > startDay) {
      if (!t.isStoreOpen && t.hour >= 8 && t.hour < 20) sim.getClock().toggleStoreStatus();
      const hold = sim.getHoldingArea();
      if (hold.length) sim.stowAllHolding();
      for (const shelf of sim.getFixtures().filter(f => f.type.startsWith('shelf') && !f.currentStock)) {
        const item = sim.getInventory().find(i => i.quantity > 0 && !i.productId.includes('sua'));
        if (item) sim.transferToShelf(shelf.id, item.productId, 5);
      }
    }
    sim.update(step);
  }
  assert.ok(guard < 3_000_000, 'Vòng 3 ngày phải kết thúc');

  const ledger = sim.getLedger();
  const net = ledger.reduce((sum, e) => sum + (e.type === 'sale' ? e.amount : e.type === 'spoilage' ? 0 : -e.amount), 0);
  const drift = (sim.getPlayerData().money - startMoney) - net;
  assert.equal(drift, 0, 'Δtiền phải khớp sổ cái');
  console.log(`    đối chiếu: Δtiền=${sim.getPlayerData().money - startMoney}, sổ cái=${net}, lệch=${drift}`);
  assert.ok(sim.getPlayerData().money >= 0, 'Tiền không âm');
  assert.ok(ledger.some(e => e.type === 'purchase'), 'Có dòng mua');
  assert.equal(new Set(ledger.map(e => e.id)).size, ledger.length, 'ID sổ cái duy nhất');
  const autoReports = Object.keys(sim.getAutoBuyConfig().reports).length;
  assert.ok(autoReports >= 2, 'Auto-buy chạy mỗi sáng một lần');

  const saved = sim.exportSaveData();
  const reloaded = create(structuredClone(saved));
  assert.equal(reloaded.getPlayerData().money, sim.getPlayerData().money, 'Reload giữ tiền');
  assert.equal(reloaded.getLedger().length, ledger.length, 'Reload giữ sổ cái');
  assert.deepEqual(reloaded.getInventory(), sim.getInventory(), 'Reload giữ tồn kho');
  console.log(`  ✓ Passed: 3 ngày — ${ledger.length} dòng sổ, tiền ${startMoney}→${sim.getPlayerData().money}, khách ${sim.getStatistics().totalCustomersServed}`);
}
