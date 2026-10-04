import assert from 'node:assert/strict';
import {
  createInitialPartyOrderState,
  fulfillPartyOrder,
  refreshAvailablePartyOrders,
  respondPartyOrder,
} from './party-orders';
import { InventoryItem } from '@game/shared';
import { GameSimulation } from './simulation';
import { DEFAULT_INITIAL_SAVE, PARTY_ORDERS, PARTY_ORDER_MAP, PRODUCT_MAP, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';

export function runPartyOrderTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ ĐƠN TIỆC (PARTY ORDERS)');
  console.log('=============================================');

  // 1. Sinh đơn tiệc theo ngày và cấp độ
  console.log('\n--- Test: Làm mới đơn tiệc theo ngày & cấp độ ---');
  {
    let state = createInitialPartyOrderState();
    assert.equal(state.available.length, 0);

    // Cấp 1, ngày 1: có thể sinh đơn tiệc cho cấp 1 (ví dụ thôi nôi hoặc sinh nhật)
    state = refreshAvailablePartyOrders(state, 1, 1);
    assert.ok(state.available.length >= 1, 'Sinh ít nhất 1 đơn tiệc');
    const firstOrder = state.available[0];
    assert.equal(firstOrder.status, 'pending');
    assert.equal(firstOrder.availableDay, 1);
    assert.ok(firstOrder.deadlineDay > 1);

    // Gọi lại trong cùng ngày 1: không sinh lặp
    const countBefore = state.available.length;
    state = refreshAvailablePartyOrders(state, 1, 1);
    assert.equal(state.available.length, countBefore, 'Không sinh lặp đơn trong cùng ngày');
  }
  console.log('  ✓ Sinh đơn tiệc đúng cấp độ và không sinh trùng trong ngày');

  // 2. Chấp nhận & Từ chối đơn tiệc
  console.log('\n--- Test: Chấp nhận & Từ chối đơn tiệc ---');
  {
    let state = createInitialPartyOrderState();
    state = refreshAvailablePartyOrders(state, 1, 1);
    const orderId = state.available[0].orderId;

    // Chấp nhận đơn
    const acceptRes = respondPartyOrder(state, orderId, true, 1);
    assert.equal(acceptRes.success, true);
    assert.equal(acceptRes.state.available[0].status, 'accepted');
    assert.equal(acceptRes.state.available[0].acceptedDay, 1);

    // Thử chấp nhận lại đơn đã accepted -> từ chối
    const dupRes = respondPartyOrder(acceptRes.state, orderId, true, 1);
    assert.equal(dupRes.success, false);

    // Từ chối đơn khác
    let state2 = createInitialPartyOrderState();
    state2 = refreshAvailablePartyOrders(state2, 1, 1);
    const orderId2 = state2.available[0].orderId;
    const declineRes = respondPartyOrder(state2, orderId2, false, 1);
    assert.equal(declineRes.success, true);
    assert.equal(declineRes.state.available[0].status, 'declined');
  }
  console.log('  ✓ Chấp nhận và từ chối đơn an toàn, chống nhận đè trạng thái');

  // 3. Hoàn tất đơn tiệc: FEFO, bỏ qua lô hết hạn, tính COGS, idempotent
  console.log('\n--- Test: Xuất kho FEFO & Kiểm tra COGS đơn tiệc ---');
  {
    let state = createInitialPartyOrderState();
    state = refreshAvailablePartyOrders(state, 1, 1);
    // Giả lập đơn party_thoi_noi: cần 4 sua_ong_tho và 6 xa_xi_chuong_duong
    const orderId = 'party_thoi_noi';
    state.available = [
      {
        orderId,
        status: 'accepted',
        availableDay: 1,
        acceptedDay: 1,
        deadlineDay: 3,
      },
    ];

    // Kho có sua_ong_tho: lô 1 hết hạn (expiresOnDay = 1), lô 2 (expiresOnDay = 5, giá 15.000, qty 3), lô 3 (expiresOnDay = 10, giá 16.000, qty 5)
    // Kho có xa_xi_chuong_duong: 10 chai (expiresOnDay = 20, giá 5.000)
    const inventory: InventoryItem[] = [
      {
        productId: 'sua_ong_tho',
        quantity: 10,
        lots: [
          { quantity: 2, expiresOnDay: 1, unitCost: 10000 }, // Quá hạn vào ngày 2
          { quantity: 3, expiresOnDay: 5, unitCost: 15000 }, // Còn hạn
          { quantity: 5, expiresOnDay: 10, unitCost: 16000 }, // Còn hạn
        ],
      },
      {
        productId: 'xa_xi_chuong_duong',
        quantity: 10,
        lots: [{ quantity: 10, expiresOnDay: 20, unitCost: 5000 }],
      },
    ];

    const currentDay = 2; // Ngày 2: lô 1 (expiresOnDay 1) đã hết hạn
    const res = fulfillPartyOrder({
      state,
      orderId,
      day: currentDay,
      inventory,
    });

    assert.equal(res.success, true, 'Hoàn thành đơn tiệc thành công');
    assert.ok(res.inventory, 'Trả về danh sách kho sau khi trừ');

    // Kiểm tra lô sữa đặc:
    // Cần 4 hộp:
    // Bỏ qua lô 1 hết hạn (2 hộp)
    // Trừ 3 hộp từ lô 2 (giá 15.000) -> cogs = 3 * 15000 = 45.000
    // Trừ 1 hộp từ lô 3 (giá 16.000) -> cogs = 1 * 16000 = 16.000
    // Cần 6 chai xá xị: 6 * 5000 = 30.000
    // Tổng COGS dự kiến = 45.000 + 16.000 + 30.000 = 91.000
    assert.equal(res.cogs, 91000, 'COGS tính đúng theo nguyên tắc FEFO và bỏ qua lô hỏng');

    const updatedMilk = res.inventory.find((i) => i.productId === 'sua_ong_tho')!;
    assert.equal(updatedMilk.lots?.length, 2, 'Còn lại lô hết hạn (2 hộp) và phần dư lô 3 (4 hộp)');
    assert.equal(updatedMilk.quantity, 6, 'Kho sữa đặc còn 6 hộp (4 dùng được + 2 hỏng)');

    // Idempotent: Gọi lại cùng đơn đã hoàn tất
    const replayRes = fulfillPartyOrder({
      state,
      orderId,
      day: currentDay,
      inventory: res.inventory,
    });
    assert.equal(replayRes.success, true, 'Replay đơn trả về thành công an toàn');
    assert.equal(replayRes.alreadyCompleted, true, 'Cờ alreadyCompleted được bật');
    assert.equal(replayRes.cogs, 0, 'Replay không tính COGS lần hai');
  }
  console.log('  ✓ Xuất kho FEFO, tính COGS chính xác và đảm bảo tính idempotent');

  // 4. Tích hợp trong GameSimulation
  console.log('\n--- Test: Tích hợp Đơn tiệc vào GameSimulation ---');
  {
    const initialSave = structuredClone(DEFAULT_INITIAL_SAVE);
    initialSave.player.money = 50000;
    initialSave.player.level = 2;
    // Chuẩn bị kho đủ hàng cho đơn
    initialSave.inventory = [
      {
        productId: 'sua_ong_tho',
        quantity: 5,
        lots: [{ quantity: 5, expiresOnDay: 20, unitCost: 15000 }],
      },
      {
        productId: 'xa_xi_chuong_duong',
        quantity: 10,
        lots: [{ quantity: 10, expiresOnDay: 20, unitCost: 5000 }],
      },
    ];

    const sim = new GameSimulation(initialSave, generateStarterTileMap(), new InputManager());
    const partyState = sim.getPartyOrderState();
    assert.ok(partyState.available.length >= 1, 'Simulation có sẵn đơn tiệc');

    const targetOrder = partyState.available[0];
    const accept = sim.respondPartyOrder(targetOrder.orderId, true);
    assert.equal(accept.success, true);

    const moneyBefore = sim.getPlayerData().money;
    const fulfill = sim.fulfillPartyOrder(targetOrder.orderId);
    assert.equal(fulfill.success, true);
    assert.ok(sim.getPlayerData().money > moneyBefore, 'Nhận tiền thưởng từ đơn tiệc');
    const completedOrder = sim.getPartyOrderState().available.find(order => order.orderId === targetOrder.orderId);
    assert.equal(completedOrder?.completedDay, sim.getTime().day, 'Ngày hoàn tất được lưu để tính nhiệm vụ tuần');

    // Ledger ghi nhận
    const ledger = sim.getLedger();
    const partyEntry = ledger.find((e) => e.description.includes('Giao đơn tiệc'));
    assert.ok(partyEntry, 'Sổ cái ghi nhận dòng doanh thu đơn tiệc');
    assert.equal(partyEntry.type, 'sale');
  }
  console.log('  ✓ GameSimulation tích hợp mượt mà với sổ cái và cộng thưởng');
  console.log('\n--- Test: Món của đơn tiệc phải có trong catalog và mở khóa kịp cấp mở đơn ---');
  for (const def of PARTY_ORDERS) {
    for (const item of def.items) {
      const product = PRODUCT_MAP[item.productId];
      assert.ok(product, `${def.id}: sản phẩm ${item.productId} phải tồn tại trong catalog`);
      assert.ok(product.unlockLevel <= def.minPlayerLevel, `${def.id}: ${item.productId} mở khóa cấp ${product.unlockLevel} > cấp mở đơn ${def.minPlayerLevel}`);
    }
  }
  console.log('  ✓ Mọi món đơn tiệc đều có thật và đã mở khóa khi đơn xuất hiện');


  console.log('\n--- Test: Nhập hỏa tốc rồi giao đơn tiệc ---');
  {
    const makeSim = (money: number) => {
      const save = structuredClone(DEFAULT_INITIAL_SAVE);
      save.player.money = money;
      save.player.level = 2;
      save.inventory = [];
      return new GameSimulation(save, generateStarterTileMap(), new InputManager());
    };

    const sim = makeSim(5_000_000);
    const order = sim.getPartyOrderState().available[0];
    assert.equal(order.status, 'pending');
    const quote = sim.getPartyOrderRushQuote(order.orderId);
    assert.ok(quote.totalCost > 0 && quote.lines.length > 0, 'Kho trống nên có báo giá hỏa tốc');
    const reward = PARTY_ORDER_MAP[order.orderId].reward.money;
    const before = sim.getPlayerData().money;
    const res = sim.rushFulfillPartyOrder(order.orderId);
    assert.equal(res.success, true, res.reason ?? '');
    assert.equal(sim.getPlayerData().money, before - quote.totalCost + reward, 'Trừ tiền nhập hỏa tốc và cộng thưởng đơn');
    assert.ok(sim.getPartyOrderState().completedOrderIds.includes(order.orderId), 'Đơn được nhận và giao trong một lệnh');
    assert.ok(sim.getLedger().some((e) => e.type === 'purchase' && e.description.includes('hỏa tốc')), 'Sổ cái ghi dòng nhập hỏa tốc');
    assert.equal(sim.rushFulfillPartyOrder(order.orderId).success, false, 'Đơn đã giao thì không nhập hỏa tốc lần hai');

    const poor = makeSim(10);
    const poorOrder = poor.getPartyOrderState().available[0];
    const poorRes = poor.rushFulfillPartyOrder(poorOrder.orderId);
    assert.equal(poorRes.success, false, 'Thiếu tiền thì từ chối');
    assert.equal(poor.getPartyOrderState().available[0].status, 'pending', 'Từ chối không làm đơn bị nhận ngầm');
    assert.equal(poor.getPlayerData().money, 10, 'Không trừ tiền khi từ chối');
    assert.equal(poor.getInventory().length, 0, 'Không để lại hàng khi từ chối');

    const late = makeSim(5_000_000);
    const lateOrder = late.getPartyOrderState().available[0];
    (late as any).clock.setTime({ ...(late as any).clock.getTime(), hour: 22, minute: 0 });
    assert.equal(late.getPartyOrderRushQuote(lateOrder.orderId).totalCost, -1, 'Sau 22:00 không có báo giá hỏa tốc');
    const lateRes = late.rushFulfillPartyOrder(lateOrder.orderId);
    assert.equal(lateRes.success, false, 'Sau 22:00 từ chối nhập hỏa tốc');
    assert.ok(lateRes.reason?.includes('nghỉ'), 'Lý do nói đại lý đã nghỉ');
    assert.equal(late.getPlayerData().money, 5_000_000, 'Không trừ tiền khi đại lý nghỉ');
  }
  console.log('  ✓ Nhập hỏa tốc nguyên tử: đủ tiền thì nhận+giao, thiếu tiền thì không đổi gì');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐƠN TIỆC ĐÃ ĐẠT!');
}
