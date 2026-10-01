import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, isFenceTile, STREET_LAMP_TILES, STREET_PARKING_SPOTS, STORE_BOUNDS, TREE_PROPS, TREE_SPRITE_OFFSET } from '@game/data';
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
  const net = ledger.reduce((sum, e) => sum + (e.type === 'sale' || e.type === 'recovery' ? e.amount : e.type === 'spoilage' || e.type === 'theft' ? 0 : -e.amount), 0);
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

export function runOutdoorPropTests(): void {
  const map = generateStarterTileMap();
  const origin = map.originTileY ?? 0;
  const collide = map.collisionLayer;
  const solidAt = (x: number, worldY: number) => !!collide[(worldY - origin) * map.width + x];
  assert.equal(solidAt(2, 10), true, 'Hàng rào chặn đường đi');
  assert.equal(isFenceTile(9, 10, map.width), false, 'Mặt tiền tiệm không có rào');
  assert.equal(solidAt(9, 11), false, 'Vỉa hè trước cửa vẫn đi được');
  for (const lamp of STREET_LAMP_TILES) assert.equal(solidAt(lamp.x, lamp.y), true, 'Cột đèn là vật cản');
  // Cây là dữ liệu bản đồ: va chạm khớp dữ liệu, vị trí sprite cũ giữ nguyên, không chặn cửa/ô đỗ/cột đèn.
  assert.equal(TREE_PROPS.length >= 1 && new Set(TREE_PROPS.map(t => t.id)).size === TREE_PROPS.length, true, 'Cây có id duy nhất');
  const tree0 = TREE_PROPS[0];
  assert.deepEqual([tree0.tileX + TREE_SPRITE_OFFSET.tilesX, tree0.tileY + TREE_SPRITE_OFFSET.tilesY, TREE_SPRITE_OFFSET.pixelsY], [2, 9, -4], 'Sprite cây vẫn ở vị trí cũ');
  for (const tree of TREE_PROPS) {
    assert.equal(solidAt(tree.tileX, tree.tileY), true, 'Gốc cây có va chạm');
    assert.ok(tree.height > 0 && tree.crownRadius > 0, 'Cây có kích thước dương');
    assert.ok(tree.tileX > 0 && tree.tileX < map.width - 1, 'Cây trong bản đồ');
    assert.ok(!(tree.tileX >= STORE_BOUNDS.left && tree.tileX <= STORE_BOUNDS.right && tree.tileY >= STORE_BOUNDS.top && tree.tileY <= STORE_BOUNDS.bottom), 'Cây không nằm trong tiệm');
    assert.ok(!(tree.tileY === 10 && (tree.tileX === 9 || tree.tileX === 10)), 'Cây không chặn cửa tiệm');
    assert.ok(!STREET_LAMP_TILES.some(l => l.x === tree.tileX && l.y === tree.tileY), 'Cây không trùng cột đèn');
    assert.ok(!STREET_PARKING_SPOTS.some(p => Math.floor(p.x / 32) === tree.tileX && Math.floor(p.y / 32) === tree.tileY), 'Cây không trùng ô đỗ xe');
  }
  console.log('  ✓ Passed: Hàng rào và cột đèn có va chạm');
}
