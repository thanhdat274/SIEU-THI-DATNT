import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import type { SaveGameData } from '@game/shared';
import { InputManager } from '../input';
import { GameSimulation } from '../simulation';
import { Mulberry32Rng, daySeed } from '../staff';
import { ACTIVE_TAX_POLICY, annualTaxFor } from './annual-revenue';
import { auditChance, emptyTaxState, normalizeTaxState, shouldAudit, splitDeclared } from './audit';

const policy = ACTIVE_TAX_POLICY;
const roll = (day: number) => new Mulberry32Rng(daySeed(day, 0x7a3)).next();
const BIG_REVENUE = 1_200_000_000; // vượt ngưỡng 1 tỷ, thuế năm 18 triệu
const DUE = annualTaxFor(BIG_REVENUE, policy).total;

/** Ngày gieo (chia hết cho 30) trong năm 1 mà chắc chắn trúng/trượt kiểm tra, tìm xác định từ cùng hàm gieo. */
const auditDays = Array.from({ length: 12 }, (_, i) => (i + 1) * policy.audit.intervalDays);
const hitDay = auditDays.find(d => roll(d) < policy.audit.chance)!;
const missDay = auditDays.find(d => roll(d) >= policy.audit.chance + policy.audit.underDeclareExtraChance)!;

function simOnDay(day: number, opts: { underDeclare: boolean; money?: number; reputation?: number }): GameSimulation {
  const save = structuredClone(DEFAULT_INITIAL_SAVE) as SaveGameData;
  save.worldTime.day = day;
  save.player.money = opts.money ?? 2_000_000_000;
  save.player.reputation = opts.reputation ?? 50;
  save.dailyRecords = { 1: { day: 1, revenue: BIG_REVENUE, cogs: 0, grossProfit: BIG_REVENUE, netProfit: BIG_REVENUE, spoilageCost: 0, wagesPaid: 0, customersServed: 0, transactionsCount: 0, itemsSold: 0, spoilageCount: 0, productSales: {} } as never };
  save.tax = { ...emptyTaxState(), underDeclare: opts.underDeclare };
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
}

export function runTaxAuditTests(): void {
  console.log('\n--- Test: Kiểm tra thuế bất ngờ ---');
  assert.ok(hitDay !== undefined && missDay !== undefined, 'Có ngày gieo trúng và ngày gieo trượt để kiểm thử');

  // Dữ liệu và chuẩn hóa
  assert.deepEqual(normalizeTaxState(undefined), emptyTaxState());
  assert.deepEqual(normalizeTaxState({ underDeclare: 'yes', hiddenTax: -5, debt: 1.5, audits: [{ day: 'x' }, { day: 30, total: 10, findings: ['a'], clean: false }], cleanAudits: 2 }), { underDeclare: false, hiddenTax: 0, debt: 0, audits: [{ day: 30, total: 10, findings: ['a'], clean: false }], cleanAudits: 2 });
  assert.equal(normalizeTaxState({ audits: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, total: 0, findings: [], clean: true })) }).audits.length, 10, 'Chỉ giữ 10 lần gần nhất');

  // Khai bớt chia thuế thành phần nộp và phần giấu, tổng không đổi
  assert.deepEqual(splitDeclared(1000, false, policy), { pay: 1000, hidden: 0 });
  const split = splitDeclared(1001, true, policy);
  assert.equal(split.pay + split.hidden, 1001);
  assert.equal(split.hidden, Math.round(1001 * policy.audit.underDeclarePct));
  assert.deepEqual(splitDeclared(0, true, policy), { pay: 0, hidden: 0 }, 'Không có thuế thì không có gì để giấu');

  // Xác suất: khai bớt làm tăng
  assert.ok(auditChance({ ...emptyTaxState(), underDeclare: true }, policy) > auditChance(emptyTaxState(), policy));

  // Điều kiện kiểm tra: đúng ngày gieo, đủ doanh thu, xác định
  assert.equal(shouldAudit(hitDay, BIG_REVENUE, emptyTaxState(), policy), true);
  assert.equal(shouldAudit(hitDay + 1, BIG_REVENUE, emptyTaxState(), policy), false, 'Không phải ngày gieo');
  assert.equal(shouldAudit(hitDay, policy.threshold * policy.audit.minRevenueRatio - 1, emptyTaxState(), policy), false, 'Doanh thu chưa đủ lớn để bị để ý');
  assert.equal(shouldAudit(missDay, BIG_REVENUE, { ...emptyTaxState(), underDeclare: true }, policy), false, 'Gieo trượt cả khi khai bớt');
  assert.equal(shouldAudit(hitDay, BIG_REVENUE, emptyTaxState(), policy), shouldAudit(hitDay, BIG_REVENUE, emptyTaxState(), policy), 'Xác định');
  // Thống kê trên nhiều ngày gieo
  let hits = 0, hitsEvade = 0, n = 0;
  for (let day = 30; day <= 30 * 4000; day += 30) { n++; if (shouldAudit(day, BIG_REVENUE, emptyTaxState(), policy)) hits++; if (shouldAudit(day, BIG_REVENUE, { ...emptyTaxState(), underDeclare: true }, policy)) hitsEvade++; }
  assert.ok(Math.abs(hits / n - policy.audit.chance) < 0.02, `Tỷ lệ kiểm tra ≈ ${policy.audit.chance} (thực tế ${(hits / n).toFixed(3)})`);
  assert.ok(Math.abs(hitsEvade / n - (policy.audit.chance + policy.audit.underDeclareExtraChance)) < 0.02, 'Khai bớt tăng tỷ lệ kiểm tra');

  // Qua GameSimulation: sổ sạch được khen
  {
    const sim = simOnDay(hitDay, { underDeclare: false });
    const before = sim.getPlayerData();
    sim.closeDailyRecord(hitDay);
    const after = sim.getPlayerData();
    assert.equal(before.money - after.money, DUE, 'Chỉ nộp thuế năm, không bị phạt');
    assert.equal(after.reputation, 50 + policy.audit.cleanReputation, 'Sổ sạch được cộng danh tiếng');
    assert.ok(sim.getDecorOwned().includes('bang_khen_thue'), 'Được tặng bằng khen nộp thuế');
    const tax = sim.getTaxState();
    assert.equal(tax.audits.length, 1);
    assert.equal(tax.audits[0].clean, true);
    assert.equal(tax.cleanAudits, 1);
    // Lưu/nạp giữ nguyên
    const reloaded = new GameSimulation(sim.exportSaveData('x', 1), generateStarterTileMap(), new InputManager(), {});
    assert.deepEqual(reloaded.getTaxState(), tax);
  }

  // Khai bớt rồi bị kiểm tra: truy thu phần giấu + phạt, mất danh tiếng
  {
    const sim = simOnDay(hitDay, { underDeclare: true });
    const before = sim.getPlayerData();
    sim.closeDailyRecord(hitDay);
    const after = sim.getPlayerData();
    const { pay, hidden } = splitDeclared(DUE, true, policy);
    const fine = Math.round(hidden * policy.audit.evasionFineMul);
    assert.equal(before.money - after.money, pay + hidden + fine, 'Tổng trả = phần đã nộp + truy thu + phạt');
    assert.equal(after.reputation, 50 - policy.audit.evasionReputation);
    const tax = sim.getTaxState();
    assert.equal(tax.hiddenTax, 0, 'Phần giấu đã được truy thu');
    assert.equal(tax.audits[0].clean, false);
    assert.equal(tax.audits[0].total, hidden + fine);
    assert.ok(!sim.getDecorOwned().includes('bang_khen_thue'), 'Không được khen khi bị phạt');
    const rec = sim.getDailyRecords()[hitDay];
    assert.equal(rec.taxPaid, pay);
    assert.equal(rec.taxHidden, hidden);
    assert.equal(rec.taxBackPaid, hidden);
    assert.equal(rec.taxPenalty, fine);
  }

  // Khai bớt nhưng không bị kiểm tra: phần giấu nằm lại, không bị dồn sang ngày sau như chưa nộp
  {
    const sim = simOnDay(missDay, { underDeclare: true });
    sim.closeDailyRecord(missDay);
    const { pay, hidden } = splitDeclared(DUE, true, policy);
    assert.equal(sim.getTaxState().hiddenTax, hidden);
    assert.equal(sim.getTaxState().audits.length, 0);
    assert.equal(sim.getDailyRecords()[missDay].taxPaid, pay);
  }

  // Không đủ tiền khi bị truy thu: ghi nợ, thu dần ở ngày sau
  {
    const sim = simOnDay(hitDay, { underDeclare: true, money: 1_000_000 });
    sim.closeDailyRecord(hitDay);
    assert.ok(sim.getTaxState().debt > 0, 'Thiếu tiền thì ghi nợ truy thu');
    assert.ok(sim.getPlayerData().money >= -DUE, 'Tiền không bị trừ quá mức do truy thu');
  }

  // Không bị kiểm tra khi doanh thu chưa đủ lớn
  {
    const sim = simOnDay(hitDay, { underDeclare: false });
    const save = sim.exportSaveData('x', 1);
    save.dailyRecords = {};
    sim.importSaveData(save);
    sim.closeDailyRecord(hitDay);
    assert.equal(sim.getTaxState().audits.length, 0, 'Doanh thu thấp thì cơ quan thuế không ghé');
  }

  // Lệnh bật/tắt khai bớt
  {
    const sim = simOnDay(1, { underDeclare: false });
    assert.equal(sim.setTaxUnderDeclare(true).success, true);
    assert.equal(sim.getTaxState().underDeclare, true);
    assert.equal(sim.exportSaveData('x', 1).tax?.underDeclare, true);
    sim.setTaxUnderDeclare(false);
    assert.equal(sim.getTaxState().underDeclare, false);
  }
  console.log('  ✓ Passed: Kiểm tra thuế bất ngờ (xác suất, khen, truy thu và phạt, nợ, lưu/nạp, lệnh)');
}
