import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  fefoSelect,
  enforceDailyCap,
  dailyCapFor,
  dailySupplyExecution,
  applyInternalTransfer,
  type SupplyStockLot,
  type SupplyContract,
  type ScoreboardLine,
} from './supply-execution';

/**
 * Thực thi hợp đồng mỗi sáng (open-world-coop-contracts 6c — task 2.2, THUẦN /
 * PROVISIONAL): FEFO, shortfall, cap 50% tồn trung bình, sổ internal_transfer
 * không đổi quỹ. KHÔNG nối save/schema/server (chờ máy thật).
 * Chạy độc lập bằng `tsx src/supply-execution.test.ts`; `runSupplyExecutionTests()`
 * có thể nối vào test-runner.ts sau (Lead làm).
 */

function lot(lotId: string, productId: string, qty: number, expiryDay: number): SupplyStockLot {
  return { lotId, productId, qty, expiryDay };
}

function contract(over: Partial<SupplyContract> & { id: string }): SupplyContract {
  return {
    fromBuildingId: 'b-from',
    toBuildingId: 'b-to',
    productId: 'egg',
    quantityPerDay: 10,
    internalPrice: 2000,
    startDay: 1,
    status: 'active',
    ...over,
  };
}

export function runSupplyExecutionTests(): void {
  describe('FEFO fefoSelect', () => {
    it('ưu tiên lô hết hạn sớm nhất (expiryDay tăng dần)', () => {
      const lots = [
        lot('l1', 'egg', 5, 30),
        lot('l2', 'egg', 5, 10),
        lot('l3', 'egg', 5, 20),
      ];
      const res = fefoSelect(lots, 'egg', 12);
      // Lô sớm nhất trước: l2 (10) → 5, l3 (20) → 5, l1 (30) → 2.
      assert.deepEqual(
        res.lines.map((l) => [l.lotId, l.qty]),
        [
          ['l2', 5],
          ['l3', 5],
          ['l1', 2],
        ],
      );
      assert.equal(res.shortfall, 0);
    });

    it('shortfall khi thiếu: giao phần có, báo thiếu phần còn lại', () => {
      const lots = [lot('l1', 'egg', 3, 10), lot('l2', 'egg', 3, 20)];
      const res = fefoSelect(lots, 'egg', 10);
      assert.deepEqual(
        res.lines.map((l) => [l.lotId, l.qty]),
        [
          ['l1', 3],
          ['l2', 3],
        ],
      );
      assert.equal(res.shortfall, 4);
    });

    it('các lô khác sản phẩm/không bị lấy; mảng gốc không đổi (immutable)', () => {
      const lots = [lot('l1', 'egg', 5, 10), lot('lx', 'rice', 99, 5)];
      const before = JSON.parse(JSON.stringify(lots));
      const res = fefoSelect(lots, 'egg', 100);
      assert.deepEqual(res.lines.map((l) => l.lotId), ['l1']);
      assert.equal(res.shortfall, 95);
      assert.deepEqual(JSON.parse(JSON.stringify(lots)), before, 'không đổi mảng gốc');
    });

    it('qty 0/nhỏ hơn 0 → không giao gì, shortfall = qty yêu cầu', () => {
      const res = fefoSelect([lot('l1', 'egg', 5, 10)], 'egg', 0);
      assert.deepEqual(res.lines, []);
      assert.equal(res.shortfall, 0);
    });
  });

  describe('cap 50% tồn trung bình (enforceDailyCap / dailyCapFor)', () => {
    it('cap = floor(avg × 0.5)', () => {
      assert.equal(dailyCapFor(20), 10);
      assert.equal(dailyCapFor(21), 10); // floor(10.5) = 10
      assert.equal(dailyCapFor(0), 0);
    });

    it('clamp về cap khi quantityPerDay > cap, kèm note', () => {
      const c = contract({ id: 'c1', quantityPerDay: 30 });
      const res = enforceDailyCap(c, 20); // cap 10
      assert.equal(res.capped, true);
      assert.equal(res.cap, 10);
      assert.equal(res.allowed, 10);
      assert.ok(res.note && res.note.includes('10'), `có note nói rõ giao tối đa cap (got ${res.note})`);
    });

    it('quantityPerDay ≤ cap → giữ nguyên, không cap', () => {
      const c = contract({ id: 'c1', quantityPerDay: 5 });
      const res = enforceDailyCap(c, 20); // cap 10
      assert.equal(res.capped, false);
      assert.equal(res.allowed, 5);
      assert.equal(res.note, undefined);
    });
  });

  describe('dailySupplyExecution', () => {
    it('nhiều hợp đồng active → nhiều delivery + giảm stock đúng theo FEFO', () => {
      const contracts: SupplyContract[] = [
        contract({ id: 'a', productId: 'egg', quantityPerDay: 4, fromBuildingId: 'warehouse', toBuildingId: 'shop-a' }),
        contract({ id: 'b', productId: 'egg', quantityPerDay: 6, fromBuildingId: 'warehouse', toBuildingId: 'shop-b' }),
      ];
      const stock: Record<string, SupplyStockLot[]> = {
        egg: [lot('e1', 'egg', 5, 10), lot('e2', 'egg', 5, 20)],
      };
      const res = dailySupplyExecution(contracts, stock, 3);
      assert.equal(res.deliveries.length, 2);
      // a lấy 4 (e1 hết ngày 10 còn 5 → 4), b lấy 6 (e1 còn 1 → 1 + e2 → 5).
      const deliveredA = res.deliveries.find((d) => d.id.startsWith('a'))!.totalQty;
      const deliveredB = res.deliveries.find((d) => d.id.startsWith('b'))!.totalQty;
      assert.equal(deliveredA, 4);
      assert.equal(deliveredB, 6);
      // Kho còn lại: e1 = 5-4-1 = 0 (bỏ), e2 = 5-5 = 0 (bỏ) → productId biến mất.
      assert.equal(res.remainingStock.egg, undefined);
      // Mảng đầu vào không đổi.
      assert.equal(stock.egg.length, 2);
      assert.equal(stock.egg[0].qty, 5);
      // Báo thiếu: không thiếu.
      for (const r of res.shortfallReports) assert.equal(r.shortfall, 0);
    });

    it('shortfall report khi thiếu: giao phần có và báo đúng', () => {
      const contracts: SupplyContract[] = [
        contract({ id: 'c', productId: 'egg', quantityPerDay: 10 }),
      ];
      const stock: Record<string, SupplyStockLot[]> = { egg: [lot('e1', 'egg', 6, 10)] };
      const res = dailySupplyExecution(contracts, stock, 3);
      assert.equal(res.deliveries.length, 1);
      assert.equal(res.deliveries[0].totalQty, 6);
      assert.equal(res.shortfallReports[0].requested, 10);
      assert.equal(res.shortfallReports[0].delivered, 6);
      assert.equal(res.shortfallReports[0].shortfall, 4);
      assert.equal(res.remainingStock.egg, undefined, 'kho hết');
    });

    it('contract chưa tới startDay / quá endDay / không active → không giao', () => {
      const contracts: SupplyContract[] = [
        contract({ id: 'future', startDay: 10 }),
        contract({ id: 'past', startDay: 1, endDay: 2 }),
        contract({ id: 'proposed', status: 'proposed' }),
      ];
      const stock: Record<string, SupplyStockLot[]> = { egg: [lot('e1', 'egg', 50, 10)] };
      const res = dailySupplyExecution(contracts, stock, 3);
      assert.equal(res.deliveries.length, 0);
      assert.equal(res.remainingStock.egg[0].qty, 50, 'kho không đổi');
    });

    it('áp cap 50% tồn trung bình khi truyền avgThreeDayStock', () => {
      const contracts: SupplyContract[] = [
        contract({ id: 'c', productId: 'egg', quantityPerDay: 30 }),
      ];
      const stock: Record<string, SupplyStockLot[]> = { egg: [lot('e1', 'egg', 100, 10)] };
      const res = dailySupplyExecution(contracts, stock, 3, { egg: 20 }); // cap 10
      assert.equal(res.deliveries[0].totalQty, 10);
      assert.equal(res.shortfallReports[0].requested, 10, 'requested bị clamp về cap');
      assert.equal(res.shortfallReports[0].capped, true);
      assert.equal(res.remainingStock.egg[0].qty, 90);
    });

    it('Hai tòa cùng người phụ trách vẫn ký được (không chặn từ==to khác người) — nhiều delivery cùng nguồn', () => {
      const contracts: SupplyContract[] = [
        contract({ id: 'x', productId: 'egg', quantityPerDay: 2, fromBuildingId: 'w', toBuildingId: 't1' }),
        contract({ id: 'y', productId: 'egg', quantityPerDay: 2, fromBuildingId: 'w', toBuildingId: 't2' }),
      ];
      const stock: Record<string, SupplyStockLot[]> = { egg: [lot('e1', 'egg', 9, 10)] };
      const res = dailySupplyExecution(contracts, stock, 3);
      assert.equal(res.deliveries.length, 2);
      assert.equal(res.remainingStock.egg[0].qty, 5);
    });
  });

  describe('applyInternalTransfer (sổ thành tích, KHÔNG đổi quỹ)', () => {
    it('cộng internalPrice×qty vào doanh thu tòa giao, trừ vào giá vốn tòa nhận', () => {
      const outgoing: ScoreboardLine = { buildingId: 'w', revenue: 1000, costOfGoods: 400, profit: 600 };
      const incoming: ScoreboardLine = { buildingId: 'shop', revenue: 5000, costOfGoods: 2000, profit: 3000 };
      const { outgoing: o, incoming: i } = applyInternalTransfer(outgoing, incoming, 2000, 5); // amount = 10000
      assert.equal(o.revenue, 1000 + 10000);
      assert.equal(o.profit, 600 + 10000);
      assert.equal(i.costOfGoods, 2000 + 10000);
      assert.equal(i.profit, 3000 - 10000);
      // Đầu vào không đổi.
      assert.equal(outgoing.revenue, 1000);
      assert.equal(incoming.costOfGoods, 2000);
    });

    it('amount chỉ là bản ghi — quỹ chung không nằm trong kết quả (không trả tiền)', () => {
      const outgoing: ScoreboardLine = { buildingId: 'w', revenue: 0, costOfGoods: 0, profit: 0 };
      const incoming: ScoreboardLine = { buildingId: 'shop', revenue: 0, costOfGoods: 0, profit: 0 };
      const { outgoing: o, incoming: i } = applyInternalTransfer(outgoing, incoming, 1000, 3);
      assert.equal(o.revenue, 3000);
      assert.equal(i.costOfGoods, 3000);
      // Kết quả chỉ có dòng thành tích (không có trường money/quỹ) — đảm bảo không nhân đôi giao dịch.
      const keys = Object.keys(o);
      assert.deepEqual(keys.sort(), ['buildingId', 'costOfGoods', 'profit', 'revenue']);
    });
  });

  console.log('  ✓ supply-execution: FEFO + shortfall + cap 50% + internal_transfer không đổi quỹ');
}

// Chạy độc lập khi gọi trực tiếp bằng tsx (không cần nối vào test-runner.ts).
const isDirect = typeof process !== 'undefined' && process.argv?.[1]?.includes('supply-execution');
if (isDirect) {
  runSupplyExecutionTests();
}
