import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
  console.log(`  ✓ Passed: ${message}`);
}

const fresh = () => new GameSimulation(structuredClone(DEFAULT_INITIAL_SAVE), generateStarterTileMap(), new InputManager());

/** Chạy cùng một chuỗi lệnh nhập hàng và trả về ID đơn + ID sổ cái theo thứ tự. */
function runScript(sim: GameSimulation): { orders: string[]; ledger: string[] } {
  sim.orderSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 3 }, { productId: 'xa_xi_chuong_duong', quantity: 2 }]);
  sim.orderFromSupplier('mi_hao_hao', 4);
  const save = sim.exportSaveData();
  return { orders: (save.pendingOrders ?? []).map((o) => o.id), ledger: (save.ledger ?? []).map((e) => e.id) };
}

export function runDeterministicIdTests(): void {
  console.log('\n--- ID đơn nhập và sổ cái xác định (I-04) ---');

  const a = runScript(fresh());
  const b = runScript(fresh());
  assert(a.orders.length >= 3, 'Có ít nhất 3 đơn nhập để so sánh');
  assert(JSON.stringify(a) === JSON.stringify(b), 'Hai mô phỏng cùng lệnh sinh đúng cùng ID (không phụ thuộc giờ thật/ngẫu nhiên)');
  assert(a.orders.every((id) => /^ord-\d+$/.test(id)) && a.ledger.every((id) => /^led-\d+$/.test(id)), 'ID có dạng ord-N / led-N');
  assert(new Set(a.orders).size === a.orders.length && new Set(a.ledger).size === a.ledger.length, 'ID không trùng nhau');

  // Bộ đếm đi theo save: nạp lại rồi đặt tiếp không trùng ID cũ.
  const sim = fresh();
  const first = runScript(sim);
  const reloaded = new GameSimulation(structuredClone(sim.exportSaveData()), generateStarterTileMap(), new InputManager());
  reloaded.orderFromSupplier('mi_hao_hao', 1);
  const after = reloaded.exportSaveData();
  const allOrders = (after.pendingOrders ?? []).map((o) => o.id);
  const allLedger = (after.ledger ?? []).map((e) => e.id);
  assert(allOrders.length === first.orders.length + 1 && new Set(allOrders).size === allOrders.length, 'Sau khi nạp lại save, ID đơn mới không trùng ID cũ');
  assert(new Set(allLedger).size === allLedger.length && allLedger.length === first.ledger.length + 1, 'Sau khi nạp lại save, ID sổ cái mới không trùng ID cũ');
  assert((after.orderSequence ?? 0) > (sim.exportSaveData().orderSequence ?? 0), 'Bộ đếm đơn nhập tăng sau khi đặt thêm');

  // Save cũ (ID theo giờ thật, chưa có bộ đếm) vẫn nạp được và ID mới không đụng ID cũ.
  const legacy = structuredClone(sim.exportSaveData());
  delete legacy.orderSequence;
  delete legacy.ledgerSequence;
  legacy.pendingOrders = (legacy.pendingOrders ?? []).map((o, i) => ({ ...o, id: `1759300000000-abc${i}` }));
  legacy.ledger = (legacy.ledger ?? []).map((e, i) => ({ ...e, id: `led-1759300000000-xyz${i}` }));
  const legacySim = new GameSimulation(legacy, generateStarterTileMap(), new InputManager());
  legacySim.orderFromSupplier('mi_hao_hao', 1);
  const legacyAfter = legacySim.exportSaveData();
  const legacyIds = (legacyAfter.pendingOrders ?? []).map((o) => o.id);
  assert(new Set(legacyIds).size === legacyIds.length && legacyIds.some((id) => id === 'ord-1'), 'Save cũ: đơn mới là ord-1 và không trùng ID cũ');

  // Bộ đếm lớn hơn ID đang có (đơn đã giao bị xóa khỏi danh sách) vẫn không bị dùng lại.
  const gap = structuredClone(sim.exportSaveData());
  gap.orderSequence = 50;
  gap.pendingOrders = [];
  const gapSim = new GameSimulation(gap, generateStarterTileMap(), new InputManager());
  gapSim.orderFromSupplier('mi_hao_hao', 1);
  assert((gapSim.exportSaveData().pendingOrders ?? [])[0]?.id === 'ord-51', 'Bộ đếm đã lưu được tiếp tục (ord-51), không quay lại số thấp');
  runDeterministicIdScanTests();
}

export function runDeterministicIdScanTests(): void {
  // Save không có bộ đếm nhưng đã có ID ord-N/led-N: bộ đếm phải suy ra từ ID lớn nhất đang có.
  const base = structuredClone(DEFAULT_INITIAL_SAVE) as ReturnType<GameSimulation['exportSaveData']>;
  const seeded = new GameSimulation(base, generateStarterTileMap(), new InputManager());
  seeded.orderFromSupplier('mi_hao_hao', 1);
  const save = structuredClone(seeded.exportSaveData());
  delete save.orderSequence;
  delete save.ledgerSequence;
  save.pendingOrders = (save.pendingOrders ?? []).map((o) => ({ ...o, id: 'ord-7' }));
  save.ledger = (save.ledger ?? []).map((e) => ({ ...e, id: 'led-12' }));
  const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
  sim.orderFromSupplier('mi_hao_hao', 1);
  const after = sim.exportSaveData();
  assert((after.pendingOrders ?? []).some((o) => o.id === 'ord-8'), 'Không có bộ đếm lưu: đơn mới là ord-8 (sau ord-7)');
  assert((after.ledger ?? []).some((e) => e.id === 'led-13'), 'Không có bộ đếm lưu: sổ cái mới là led-13 (sau led-12)');
}
