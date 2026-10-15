import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap, LAND_LEASE_CONSTANTS, resolveParcel, parcelPrice } from '@game/data';
import { GameSimulation } from './simulation';
import { InputManager } from './input';

export function runLandLeaseCoreTests(): void {
  console.log('\n--- Kiểm thử logic thuê đất & mua lại (open-world-land-lease 2.1/2.2) ---');

  const createTestSim = () => {
    const s = structuredClone(DEFAULT_INITIAL_SAVE);
    s.player.level = 60;
    s.player.money = 50_000_000;
    s.worldTime.day = 1;
    s.worldTime.isStoreOpen = false;
    const sim = new GameSimulation(s, generateStarterTileMap(), new InputManager(), {});
    // Mở W1
    sim.reclaimWave('w1');
    (sim as unknown as { finishReclaimedWaves(day: number): void }).finishReclaimedWaves(3);
    return sim;
  };

  // 1. Thuê lô đất W1
  {
    const sim = createTestSim();
    assert.equal(sim.leaseParcel('lot-center').reason, 'w0_owned', 'Lô W0 không cho thuê');
    assert.equal(sim.leaseParcel('khong-ton-tai').reason, 'unknown_parcel', 'Lô lạ bị từ chối');

    const parcel = resolveParcel('w1-corner')!;
    const basePrice = parcelPrice(parcel);
    const expectedRent = Math.floor(basePrice * LAND_LEASE_CONSTANTS.leaseDailyRate * 30);

    const initialMoney = sim.getPlayerData().money;
    const res = sim.leaseParcel('w1-corner');
    assert.ok(res.success, 'Thuê lô W1 thành công');
    assert.equal(res.rent, expectedRent, 'Trừ đúng tiền thuê 30 ngày');
    assert.equal(sim.getPlayerData().money, initialMoney - expectedRent, 'Số dư ví trừ đúng tiền');

    const tenure = (sim as unknown as { parcelTenure: Record<string, { kind: string; paidTotal?: number }> }).parcelTenure['w1-corner'];
    assert.equal(tenure?.kind, 'leased', 'Tenure là leased');
    assert.equal(tenure?.paidTotal, expectedRent, 'Ghi nhận paidTotal');

    // Không cho thuê lại lô đã thuê
    assert.equal(sim.leaseParcel('w1-corner').reason, 'leased', 'Không cho thuê lại');
  }

  // 2. Thu tiền thuê hàng ngày & nợ khi hết tiền (collectDailyRent)
  {
    const sim = createTestSim();
    sim.leaseParcel('w1-corner');
    const parcel = resolveParcel('w1-corner')!;
    const dailyRent = Math.ceil(parcelPrice(parcel) * LAND_LEASE_CONSTANTS.leaseDailyRate);

    // Ngày 2: Thu tiền thuê bình thường
    const mBefore = sim.getPlayerData().money;
    sim.collectDailyRent(2);
    assert.equal(sim.getPlayerData().money, mBefore - dailyRent, 'Thu tiền thuê ngày 2 thành công');

    // Idempotent: gọi lại ngày 2 không thu lần hai
    sim.collectDailyRent(2);
    assert.equal(sim.getPlayerData().money, mBefore - dailyRent, 'Idempotent: không thu lần 2 trong ngày');

    // Mở cơ sở chi nhánh lên lô thuê
    const openRes = sim.openBuilding('grocery_branch', 'w1-corner', 42, 3);
    assert.ok(openRes.success, 'Mở chi nhánh trên lô thuê thành công');
    const branchId = openRes.instanceId!;

    // Ép người chơi hết tiền
    (sim as unknown as { playerData: { money: number } }).playerData.money = 0;

    // Ngày 3, 4: nợ 2 ngày
    sim.collectDailyRent(3);
    sim.collectDailyRent(4);
    let tenure = (sim as unknown as { parcelTenure: Record<string, { kind: string; debtDays?: number }> }).parcelTenure['w1-corner'];
    assert.equal(tenure?.debtDays, 2, 'Ghi nhận nợ 2 ngày');
    let placement = sim.getBuildingPlacements()?.find(p => p.buildingId === branchId);
    assert.equal(placement?.closedForRent, undefined, 'Chưa đủ 3 ngày nên chưa đóng cửa');

    // Ngày 5: nợ ngày thứ 3 -> đóng cửa tòa vì nợ thuê
    sim.collectDailyRent(5);
    tenure = (sim as unknown as { parcelTenure: Record<string, { kind: string; debtDays?: number }> }).parcelTenure['w1-corner'];
    assert.equal(tenure?.debtDays, 3, 'Ghi nhận nợ 3 ngày');
    placement = sim.getBuildingPlacements()?.find(p => p.buildingId === branchId);
    assert.equal(placement?.closedForRent, true, 'Tòa nhà bị closedForRent do nợ 3 ngày');

    // 3. Trả nợ thuê đất (payRentDebt)
    (sim as unknown as { playerData: { money: number } }).playerData.money = dailyRent * 10;
    const debtRes = sim.payRentDebt('w1-corner');
    assert.ok(debtRes.success, 'Trả nợ thuê thành công');
    assert.equal(debtRes.amount, dailyRent * 3, 'Trả đủ 3 ngày nợ');
    tenure = (sim as unknown as { parcelTenure: Record<string, { kind: string; debtDays?: number }> }).parcelTenure['w1-corner'];
    assert.equal(tenure?.debtDays, 0, 'Nợ đã xóa về 0');
    placement = sim.getBuildingPlacements()?.find(p => p.buildingId === branchId);
    assert.equal(placement?.closedForRent, false, 'Tòa nhà được mở cửa trở lại');

    // 4. Hủy thuê đất khi có tòa -> bị từ chối
    const endFail = sim.endLease('w1-corner');
    assert.equal(endFail.reason, 'building_present', 'Không thể hủy thuê khi đang có tòa nhà');

    // 5. Mua đứt lô đất có khấu trừ tiền thuê
    const totalPaid = (tenure as unknown as { paidTotal: number }).paidTotal;
    const baseP = parcelPrice(parcel);
    const expectedCredit = Math.min(totalPaid * LAND_LEASE_CONSTANTS.leaseCreditRate, Math.floor(baseP * 0.5));
    const expectedBuyPrice = Math.max(0, baseP - expectedCredit);

    (sim as unknown as { playerData: { money: number } }).playerData.money = baseP * 2;
    const buyRes = sim.buyParcel('w1-corner');
    assert.ok(buyRes.success, 'Mua đứt lô đất thành công');
    assert.equal(buyRes.price, expectedBuyPrice, 'Giá mua đã được khấu trừ đúng');
    assert.equal(buyRes.credit, expectedCredit, 'Báo đúng số tiền được khấu trừ');

    const tenureAfter = (sim as unknown as { parcelTenure: Record<string, { kind: string }> }).parcelTenure['w1-corner'];
    assert.equal(tenureAfter?.kind, 'owned', 'Sau khi mua, tenure trở thành owned');
  }

  // 6. Hủy thuê đất khi không có tòa nhà
  {
    const sim = createTestSim();
    sim.leaseParcel('w1-corner');
    const endRes = sim.endLease('w1-corner');
    assert.ok(endRes.success, 'Hủy thuê thành công khi đất trống');
    const tenure = (sim as unknown as { parcelTenure: Record<string, unknown> }).parcelTenure['w1-corner'];
    assert.equal(tenure, undefined, 'Bản ghi thuê bị xóa sạch');
  }

  console.log('  ✓ Toàn bộ luồng thuê, thu tiền đầu ngày, nợ 3 ngày đóng tòa, trả nợ mở lại, mua khấu trừ và hủy thuê PASS!');
}

if (process.argv[1]?.includes('land-lease-core.test')) {
  runLandLeaseCoreTests();
}
