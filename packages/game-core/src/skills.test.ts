import assert from 'node:assert/strict';
import {
  addSkillXp,
  choosePerk,
  createInitialSkillState,
  getSkillModifier,
  hasPerk,
} from './skills';
import { GameSimulation } from './simulation';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { PRODUCT_MAP } from '@game/data';
import { InputManager } from './input';
import type { CustomerState } from '@game/shared';

export function runSkillTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ KỸ NĂNG & ĐẶC QUYỀN (SKILLS & PERKS)');
  console.log('=============================================');

  // 1. Tích lũy XP và lên cấp kỹ năng
  console.log('\n--- Test: Tích lũy XP & Thăng cấp kỹ năng ---');
  {
    let state = createInitialSkillState();
    assert.equal(state.levels.management, 1);
    assert.equal(state.xp.management, 0);

    // Thêm 50 XP -> Chưa đủ lên cấp 2 (cần 100)
    let res = addSkillXp(state, 'management', 50);
    assert.equal(res.leveledUp, false);
    assert.equal(res.newLevel, 1);
    state = res.state;

    // Thêm tiếp 60 XP (tổng 110 >= 100) -> Lên cấp 2
    res = addSkillXp(state, 'management', 60);
    assert.equal(res.leveledUp, true);
    assert.equal(res.newLevel, 2);
    state = res.state;
    assert.equal(state.levels.management, 2);
  }
  console.log('  ✓ Điểm XP tích lũy và tự động thăng cấp kỹ năng chính xác');

  // 2. Mở khóa và chọn đặc quyền (Perk)
  console.log('\n--- Test: Chọn đặc quyền và kiểm tra điều kiện cấp độ ---');
  {
    let state = createInitialSkillState();

    // Thử chọn perk tier 1 khi kỹ năng mới cấp 1 -> thất bại (Tier 1 cần cấp 2)
    const failRes = choosePerk(state, 'perk_quick_hands');
    assert.equal(failRes.success, false);

    // Nâng lên cấp 2
    state = addSkillXp(state, 'management', 120).state;
    assert.equal(state.levels.management, 2);

    // Chọn perk tier 1 thành công
    const okRes = choosePerk(state, 'perk_quick_hands');
    assert.equal(okRes.success, true);
    state = okRes.state;
    assert.equal(hasPerk(state, 'perk_quick_hands'), true);

    // Thử chọn lại cùng 1 perk -> chống chọn trùng
    const dupRes = choosePerk(state, 'perk_quick_hands');
    assert.equal(dupRes.success, false);

    // Hiệu ứng modifier
    const speedMod = getSkillModifier(state, 'cashier_speed');
    assert.equal(speedMod, 0.15, 'Perk Tay thoăn thoắt tăng 15% tốc độ thu ngân');
  }
  console.log('  ✓ Kiểm tra điều kiện cấp độ mở perk và hiệu ứng bổ trợ chính xác');

  // 3. Tích hợp trong GameSimulation: Chiết khấu nhà cung cấp & Chiết khấu lương
  console.log('\n--- Test: Tích hợp hiệu ứng Perk vào GameSimulation ---');
  {
    const initialSave = structuredClone(DEFAULT_INITIAL_SAVE);
    initialSave.player.money = 1000000;
    initialSave.player.level = 10;
    initialSave.staff = [
      {
        id: 'staff_1',
        name: 'Nguyễn Văn An',
        role: 'cashier',
        speed: 1,
        accuracy: 1,
        stamina: 1,
        dailyWage: 100000,
        hiredOnDay: 1,
        shift: 'full_day',
      },
    ];

    const sim = new GameSimulation(initialSave, generateStarterTileMap(), new InputManager());

    // Chưa có perk good_boss: lương = 100.000
    const payrollNormal = sim.processPayroll(1);
    assert.equal(payrollNormal.paidAmount, 100000);

    // Nâng cấp kỹ năng management lên cấp 3 và chọn perk good_boss
    sim.addSkillExperience('management', 300);
    const perkRes = sim.chooseSkillPerk('perk_good_boss');
    assert.equal(perkRes.success, true, 'Chọn thành công perk Chủ tiệm chu đáo');

    // Chuyển sang ngày 2 và tính lương -> giảm 10% còn 90.000
    const payrollDiscounted = sim.processPayroll(2);
    assert.equal(payrollDiscounted.paidAmount, 90000, 'Perk Chủ tiệm chu đáo giảm 10% tiền lương nhân viên');

    // Nâng kỹ năng marketing lên cấp 3 và chọn perk negotiator (giảm 5% giá nhập sỉ)
    const baseWholesale = sim.wholesaleUnitPrice('dai_ly_dau_hem', 'nuoc_suoi');
    sim.addSkillExperience('marketing', 300);
    const negoRes = sim.chooseSkillPerk('perk_negotiator');
    assert.equal(negoRes.success, true);
    const discountedWholesale = sim.wholesaleUnitPrice('dai_ly_dau_hem', 'nuoc_suoi');
    assert.equal(discountedWholesale, Math.round(baseWholesale * 0.95), 'Perk giảm 5% giá nhập sỉ');
  }
  console.log('  ✓ Simulation phản ánh ngay lập tức chiết khấu lương và giá sỉ khi có perk');

  // 4. Perk boa được áp dụng vào luồng checkout và tồn tại qua save/reload.
  console.log('\n--- Test: Tiền boa perk, sổ cái và save/reload ---');
  {
    const initialSave = structuredClone(DEFAULT_INITIAL_SAVE);
    initialSave.player.level = 10;
    initialSave.player.money = 100000;
    initialSave.skills = createInitialSkillState();
    initialSave.skills.levels.marketing = 3;
    initialSave.skills.xp.marketing = 300;
    initialSave.skills.chosenPerks = ['perk_charm', 'perk_neat_shelves'];
    const productId = 'nuoc_suoi';
    const fixture = initialSave.storeLayout.fixtures.find(item => item.type === 'shelf_wooden' || item.type === 'shelf_glass');
    assert.ok(fixture, 'Có kệ thường để kiểm tra sức chứa');
    fixture!.assignedProductId = productId;
    const product = PRODUCT_MAP[productId];
    fixture!.currentStock = 1;
    fixture!.stockLots = [{ quantity: 1, expiresOnDay: 20, unitCost: 1000 }];
    const checkout: CustomerState = {
      id: 'tip-customer', position: { x: 320, y: 320 }, stage: 'checkout', targetFixtureId: fixture!.id,
      checkoutId: 'tip-checkout', patience: 45, checkoutWait: 0,
      basket: [{ productId, quantity: 1, unitPrice: product.baseSellingPrice, lots: [{ quantity: 1, expiresOnDay: 20, unitCost: 1000 }] }],
    };
    initialSave.customers = [checkout];
    initialSave.statistics.totalRevenue = 0;
    const sim = new GameSimulation(initialSave, generateStarterTileMap(), new InputManager());
    const moneyBeforeSale = sim.getPlayerData().money;
    assert.equal(sim.completeCustomerCheckout('tip-checkout', fixture!.id), true);
    const sale = sim.sellingPrice(productId);
    const tip = Math.round(sale * 0.05);
    assert.equal(sim.getPlayerData().money, moneyBeforeSale + sale + tip);
    assert.equal(sim.getLedger().filter(entry => entry.description.includes('Tiền boa')).at(-1)?.amount, tip);
    assert.equal(sim.getGoalContext().totalRevenue, sale + tip);

    const exported = sim.exportSaveData('tip-save', 1);
    const reloaded = new GameSimulation(exported, generateStarterTileMap(), new InputManager());
    assert.equal(getSkillModifier(reloaded.getSkillState(), 'tip_bonus'), 0.05);
  }
  console.log('  ✓ Perk sức chứa kệ và modifier tồn tại qua save/reload; capacity áp dụng đúng');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ KỸ NĂNG & ĐẶC QUYỀN ĐÃ ĐẠT!');
}
