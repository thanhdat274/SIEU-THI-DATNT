import assert from 'node:assert/strict';
import {
  claimGoal,
  claimWeeklyQuest,
  createInitialGoalState,
  getGoalProgress,
  getWeeklyQuestProgress,
  type SimulationGoalContext,
} from './goals';
import { GOAL_MAP, LONG_TERM_GOALS, WEEKLY_QUESTS, getSeasonWindow, SEASON_YEAR_DAYS, ALL_PRODUCTS as PRODUCTS } from '@game/data';
import { claimFestivalGoal, getFestivalGoalProgress } from './goals';
import { GameSimulation } from './simulation';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';

export function runGoalTests(): void {
  console.log('\n=============================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ MỤC TIÊU & NHIỆM VỤ TUẦN');
  console.log('=============================================');

  // 1. Tiến độ và nhận thưởng mục tiêu dài hạn
  console.log('\n--- Test: Tiến độ & Nhận thưởng mục tiêu dài hạn ---');
  {
    let state = createInitialGoalState();
    const ctx: SimulationGoalContext = {
      totalRevenue: 150000,
      totalCustomersServed: 25,
      salesFixturesCount: 4,
      stallsCount: 1,
      reputation: 25,
      completedPartyOrdersCount: 2,
      weekRevenue: 50000,
      weekCustomersServed: 10,
      weekItemsSold: 20,
      weekPartyOrdersCount: 1,
      currentWeek: 1,
    };

    // Goal 1: goal_sales_100k (cần 100k, ctx có 150k -> completed)
    const goal1 = GOAL_MAP['goal_sales_100k'];
    assert.ok(goal1);
    const prog1 = getGoalProgress(goal1, ctx, state);
    assert.equal(prog1.completed, true);
    assert.equal(prog1.claimed, false);

    // Claim goal 1
    const claimRes = claimGoal(state, 'goal_sales_100k', ctx);
    assert.equal(claimRes.success, true);
    assert.ok(claimRes.reward);
    assert.equal(claimRes.reward.money, 30000);
    state = claimRes.state;

    // Chống nhận thưởng lần hai (idempotent / one-time only)
    const dupRes = claimGoal(state, 'goal_sales_100k', ctx);
    assert.equal(dupRes.success, false, 'Không được nhận thưởng lần hai');

    // Goal chưa hoàn thành: goal_sales_10m (cần 10tr, ctx có 150k -> not completed)
    const goalUnfinished = GOAL_MAP['goal_sales_10m'];
    const progUnfinished = getGoalProgress(goalUnfinished, ctx, state);
    assert.equal(progUnfinished.completed, false);
    const failClaim = claimGoal(state, 'goal_sales_10m', ctx);
    assert.equal(failClaim.success, false, 'Chưa đạt chỉ tiêu thì không thể nhận thưởng');
  }
  console.log('  ✓ Tính toán tiến độ chính xác và nhận thưởng mục tiêu 1 lần duy nhất');

  // 2. Nhiệm vụ tuần
  console.log('\n--- Test: Tiến độ & Nhận thưởng nhiệm vụ tuần ---');
  {
    let state = createInitialGoalState();
    const ctxWeek1: SimulationGoalContext = {
      totalRevenue: 500000,
      totalCustomersServed: 50,
      salesFixturesCount: 2,
      stallsCount: 0,
      reputation: 15,
      completedPartyOrdersCount: 1,
      weekRevenue: 350000, // Cần 300k -> Đạt
      weekCustomersServed: 30, // Cần 25 -> Đạt
      weekItemsSold: 50,
      weekPartyOrdersCount: 1, // Cần 1 -> Đạt
      currentWeek: 1,
    };

    const quest = WEEKLY_QUESTS[0]; // week_revenue_300k
    const prog = getWeeklyQuestProgress(quest, ctxWeek1, state);
    assert.equal(prog.completed, true);
    assert.equal(prog.claimed, false);

    // Claim tuần 1
    const claimRes = claimWeeklyQuest(state, quest.id, ctxWeek1);
    assert.equal(claimRes.success, true);
    state = claimRes.state;

    // Nhận lặp trong tuần 1 -> từ chối
    const dupRes = claimWeeklyQuest(state, quest.id, ctxWeek1);
    assert.equal(dupRes.success, false);

    // Sang tuần 2: có thể nhận tiếp cho tuần mới
    const ctxWeek2: SimulationGoalContext = {
      ...ctxWeek1,
      currentWeek: 2,
      weekRevenue: 320000,
    };
    const week2Prog = getWeeklyQuestProgress(quest, ctxWeek2, state);
    assert.equal(week2Prog.completed, true);
    assert.equal(week2Prog.claimed, false, 'Tuần mới được làm mới trạng thái nhận thưởng');

    const claimWeek2 = claimWeeklyQuest(state, quest.id, ctxWeek2);
    assert.equal(claimWeek2.success, true);
  }
  console.log('  ✓ Nhiệm vụ tuần kiểm soát theo tuần và cho phép nhận lại ở tuần sau');

  // 3. Tích hợp GameSimulation
  console.log('\n--- Test: Tích hợp Goals & Weekly Quests trong Simulation ---');
  {
    const initialSave = structuredClone(DEFAULT_INITIAL_SAVE);
    initialSave.statistics.totalRevenue = 200000;
    initialSave.statistics.totalCustomersServed = 15;
    const sim = new GameSimulation(initialSave, generateStarterTileMap(), new InputManager());

    const goalList = sim.getGoalProgressList();
    assert.ok(goalList.length > 0);
    const finishedGoal = goalList.find((g) => g.completed && !g.claimed);
    assert.ok(finishedGoal, 'Có mục tiêu đã đạt sẵn trong simulation');

    const moneyBefore = sim.getPlayerData().money;
    const claimRes = sim.claimGoal(finishedGoal.goalId);
    assert.equal(claimRes.success, true);
    assert.ok(sim.getPlayerData().money > moneyBefore, 'Tiền người chơi tăng khi nhận thưởng mục tiêu');

    // Thử nhận lại
    assert.equal(sim.claimGoal(finishedGoal.goalId).success, false);
  }
  console.log('  ✓ Simulation cập nhật thưởng mục tiêu mượt mà');

  // 4. Mục tiêu ngày hội: tiến độ theo khoảng ngày, nhận một lần, hết hạn, năm sau nhận lại
  console.log('\n--- Test: Mục tiêu ngày hội ---');
  {
    // Tìm ngày đầu tiên của mùa Tết (có mục tiêu kẹo) trong năm đầu.
    let tetDay = 1;
    while (getSeasonWindow(tetDay)?.event.id !== 'tet') tetDay++;
    const win = getSeasonWindow(tetDay)!;
    assert.equal(win.firstDay, tetDay, 'Ngày đầu của khoảng ngày hội');
    const candy = PRODUCTS.find((p) => p.category === 'candy')!;
    const noodle = PRODUCTS.find((p) => p.category === 'instant_noodles')!;
    const sales: Record<number, Record<string, number>> = {
      [tetDay]: { [candy.id]: 12, [noodle.id]: 99 }, // mì không tính vào mục tiêu kẹo
    };
    const stalls: Record<number, Record<string, number>> = {};
    const salesOn = (d: number) => ({ productSales: sales[d], stallServings: stalls[d] });
    const candyGoal = (day: number, st = createInitialGoalState()) => getFestivalGoalProgress(day, st, salesOn).find((g) => g.goalId === 'fest_tet_candy')!;
    let state = createInitialGoalState();

    assert.equal(getFestivalGoalProgress(tetDay, state, salesOn).length, 2, 'Tết có mục tiêu kẹo và mục tiêu quầy cà phê');
    assert.equal(candyGoal(tetDay).currentValue, 12, 'Chỉ tính đúng nhóm hàng');
    assert.equal(claimFestivalGoal(state, 'fest_tet_candy', tetDay, salesOn).success, false, 'Chưa đủ doanh số');

    sales[tetDay + 1] = { [candy.id]: 8 };
    const day2 = tetDay + 1;
    assert.equal(candyGoal(day2).currentValue, 20);
    const claim = claimFestivalGoal(state, 'fest_tet_candy', day2, salesOn);
    assert.equal(claim.success, true);
    state = claim.state;
    assert.equal(claimFestivalGoal(state, 'fest_tet_candy', day2, salesOn).success, false, 'Không nhận lặp');
    assert.equal(candyGoal(day2, state).claimed, true);

    // Mục tiêu quầy ăn uống: đếm suất của đúng quầy, không đếm sản phẩm kệ hay quầy khác.
    const cafeGoal = (day: number) => getFestivalGoalProgress(day, createInitialGoalState(), salesOn).find((g) => g.goalId === 'fest_tet_cafe')!;
    stalls[tetDay] = { cafe_vot: 18, banh_mi_muoi_ot: 99 };
    assert.equal(cafeGoal(tetDay).currentValue, 18, 'Chỉ tính suất của quầy cà phê vợt');
    assert.equal(claimFestivalGoal(createInitialGoalState(), 'fest_tet_cafe', tetDay, salesOn).success, false, 'Chưa đủ suất');
    stalls[day2] = { cafe_vot: 12 };
    assert.equal(cafeGoal(day2).currentValue, 30);
    const cafeClaim = claimFestivalGoal(createInitialGoalState(), 'fest_tet_cafe', day2, salesOn);
    assert.equal(cafeClaim.success, true);
    assert.equal(claimFestivalGoal(cafeClaim.state, 'fest_tet_cafe', day2, salesOn).success, false);
    assert.equal(candyGoal(day2).claimed, false, 'Nhận mục tiêu quầy không làm mất mục tiêu kẹo');

    // Doanh số trước khi ngày hội bắt đầu không được tính; ngoài ngày hội không có mục tiêu/không nhận được.
    const before = tetDay - 1;
    sales[before] = { [candy.id]: 500 };
    assert.equal(candyGoal(tetDay).currentValue, 12);
    // Ngày ân hạn (liền sau ngày cuối) vẫn nhận được, tiến độ không đếm thêm ngày ngoài ngày hội; sau đó thì hết hạn.
    const graceDay = win.lastDay + 1;
    sales[win.lastDay] = { [candy.id]: 25 };
    sales[graceDay] = { [candy.id]: 1000 };
    const grace = candyGoal(graceDay);
    assert.equal(grace.currentValue, 20 + 25, 'Ngày ân hạn chỉ đếm doanh số đến hết ngày cuối ngày hội');
    assert.equal(grace.claimUntilDay, graceDay);
    assert.equal(claimFestivalGoal(createInitialGoalState(), 'fest_tet_candy', graceDay, salesOn).success, true, 'Ngày ân hạn nhận được');
    const afterTet = win.lastDay + 2;
    assert.equal(getFestivalGoalProgress(afterTet, state, salesOn).length, 0);
    assert.equal(claimFestivalGoal(createInitialGoalState(), 'fest_tet_candy', afterTet, salesOn).success, false, 'Quá ngày ân hạn thì không nhận được');
    delete sales[win.lastDay]; delete sales[graceDay];

    // Năm sau: cùng mục tiêu nhận lại được.
    const nextYear = tetDay + SEASON_YEAR_DAYS;
    sales[nextYear] = { [candy.id]: 25 };
    assert.equal(candyGoal(nextYear, state).claimed, false);
    assert.equal(claimFestivalGoal(state, 'fest_tet_candy', nextYear, salesOn).success, true);
  }
  console.log('  ✓ Mục tiêu ngày hội: tiến độ đúng nhóm/khoảng ngày, nhận một lần, hết hạn, nhận lại năm sau');

  // 5. Tích hợp GameSimulation: nhận thưởng cộng tiền/uy tín, lưu rồi tải lại vẫn giữ trạng thái đã nhận
  console.log('\n--- Test: Ngày hội trong Simulation (save/load) ---');
  {
    let tetDay = 1;
    while (getSeasonWindow(tetDay)?.event.id !== 'tet') tetDay++;
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    const candy = PRODUCTS.find((p) => p.category === 'candy')!;
    save.worldTime = { ...save.worldTime, day: tetDay };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    assert.equal(sim.getFestivalGoalProgressList().length, 2);
    assert.equal(sim.claimFestivalGoal('fest_tet_candy').success, false, 'Chưa đủ doanh số');

    sim.recordProductSale(candy.id, 20);
    const money0 = sim.getPlayerData().money;
    assert.equal(sim.claimFestivalGoal('fest_tet_candy').success, true);
    assert.equal(sim.getPlayerData().money, money0 + 80000);
    assert.equal(sim.claimFestivalGoal('fest_tet_candy').success, false, 'Retry không cộng thưởng lần hai');
    assert.equal(sim.getPlayerData().money, money0 + 80000);

    const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
    assert.equal(reloaded.getFestivalGoalProgressList().find((g) => g.goalId === 'fest_tet_candy')!.claimed, true, 'Trạng thái đã nhận được lưu');
    assert.equal(reloaded.claimFestivalGoal('fest_tet_candy').success, false);
  }
  console.log('  ✓ Simulation: thưởng ngày hội một lần, giữ nguyên qua save/load');

  // 6. Quầy ăn uống bán thật -> tiến độ ngày hội đếm đúng số suất, giữ qua save/load
  console.log('\n--- Test: Ngày hội đếm suất quầy ăn uống ---');
  {
    let tetDay = 1;
    while (getSeasonWindow(tetDay)?.event.id !== 'tet') tetDay++;
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime = { ...save.worldTime, day: tetDay };
    save.stalls = { owned: ['cafe_vot'], processedDayIds: [] };
    save.inventory = [
      { productId: 'sua_ong_tho', quantity: 20, lots: [{ quantity: 20, expiresOnDay: 999, unitCost: 17000, provenance: 'known' }] },
      { productId: 'duong_cat', quantity: 20, lots: [{ quantity: 20, expiresOnDay: 999, unitCost: 11000, provenance: 'known' }] },
    ];
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const cafe = () => sim.getFestivalGoalProgressList().find((g) => g.goalId === 'fest_tet_cafe')!;
    assert.equal(cafe().currentValue, 0);
    sim.getClock().advanceToNextDay(); // quầy xử lý ngày tetDay lúc qua ngày
    const served = sim.getDailyRecords()[tetDay]?.stallServings?.cafe_vot ?? 0;
    assert.ok(served > 0, 'Quầy đã bán suất cà phê');
    assert.equal(cafe().currentValue, served, 'Tiến độ ngày hội bằng đúng số suất quầy đã bán');
    const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
    assert.equal(reloaded.getFestivalGoalProgressList().find((g) => g.goalId === 'fest_tet_cafe')!.currentValue, served, 'Qua save/load vẫn đúng');
    assert.equal(sim.claimFestivalGoal('fest_tet_cafe').success, served >= 30, 'Chỉ nhận được khi đủ suất');
  }

  // 7. Suất quầy của đúng ngày cuối ngày hội vẫn được tính và nhận được trong ngày ân hạn
  console.log('\n--- Test: Ngày cuối ngày hội & độ trễ chốt quầy ---');
  {
    let tetDay = 1;
    while (getSeasonWindow(tetDay)?.event.id !== 'tet') tetDay++;
    const lastDay = getSeasonWindow(tetDay)!.lastDay;
    const save: any = structuredClone(DEFAULT_INITIAL_SAVE);
    save.worldTime = { ...save.worldTime, day: lastDay };
    save.stalls = { owned: ['cafe_vot'], processedDayIds: [] };
    save.inventory = [
      { productId: 'sua_ong_tho', quantity: 20, lots: [{ quantity: 20, expiresOnDay: 999, unitCost: 17000, provenance: 'known' }] },
      { productId: 'duong_cat', quantity: 20, lots: [{ quantity: 20, expiresOnDay: 999, unitCost: 11000, provenance: 'known' }] },
    ];
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    sim.getClock().advanceToNextDay(); // sang ngày ân hạn: quầy chốt suất của ngày cuối
    assert.equal(getSeasonWindow(sim.getTime().day), null, 'Đã hết ngày hội');
    const served = sim.getDailyRecords()[lastDay]?.stallServings?.cafe_vot ?? 0;
    assert.ok(served > 0, 'Quầy đã chốt suất của ngày cuối');
    const cafe = sim.getFestivalGoalProgressList().find((g) => g.goalId === 'fest_tet_cafe');
    assert.ok(cafe, 'Mục tiêu vẫn hiện trong ngày ân hạn');
    assert.equal(cafe!.currentValue, served, 'Suất ngày cuối được tính');
    sim.getClock().advanceToNextDay();
    assert.equal(sim.getFestivalGoalProgressList().length, 0, 'Hết ngày ân hạn thì không còn mục tiêu');
  }
  console.log('  ✓ Ngày ân hạn: suất quầy ngày cuối được tính và còn nhận được, sau đó hết hạn');
  console.log('  ✓ Ngày hội tính suất quầy ăn uống từ DailyRecord.stallServings');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ MỤC TIÊU & NHIỆM VỤ TUẦN ĐÃ ĐẠT!');
}
