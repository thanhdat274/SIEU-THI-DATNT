import { describe, expect, it } from 'vitest';
import { festivalPrepAction, festivalRestockPlan } from '../data/festivalRestock';
import { PREP_MIN_QTY, prepItems } from '../data/festivalPrep';
import { caseSize, formatMoney } from '../data/products';
import { festivalOn } from '../data/calendar';

// GĐ247: phiếu trữ lễ một chạm cho Nhập hàng. calendar: Tết = ngày game 28..39 (doy 27..38);
// ngày 26 → Tết sau 2 ngày; ngày 100 không gần lễ nào.

const allSell = () => true;

describe('festivalRestockPlan — phiếu trữ lễ một chạm', () => {
  it('Tết sau 2 ngày + kho trống → phiếu đủ món hot mở khóa, quy thùng đúng, có bonus', () => {
    const plan = festivalRestockPlan({ day: 26, level: 20, storage: {}, sells: allSell, caseSizeOf: caseSize });
    expect(plan).not.toBeNull();
    expect(plan!.festival.id).toBe('tet');
    expect(plan!.inDays).toBe(2);
    expect(plan!.lines.map((l) => l.id)).toEqual(prepItems(plan!.festival, 20));
    for (const l of plan!.lines) {
      expect(l.units).toBe(PREP_MIN_QTY);
      expect(l.cases).toBe(Math.ceil(PREP_MIN_QTY / caseSize(l.id)));
      expect(l.cases).toBeGreaterThan(0);
    }
    expect(plan!.bonus).toBeGreaterThan(0);
    expect(plan!.skipped).toEqual([]);
  });

  it('kho đã đủ PREP_MIN_QTY cho mọi món cần trữ → null (không phiếu)', () => {
    const tet = festivalOn(30)!; // đang trong Tết → dùng đúng festival đó để điền đủ
    const full: Record<string, number> = {};
    for (const id of prepItems(tet, 20)) full[id] = PREP_MIN_QTY;
    expect(festivalRestockPlan({ day: 26, level: 20, storage: full, sells: allSell, caseSizeOf: caseSize })).toBeNull();
  });

  it('món mối không bán → vào skipped; tất cả đều không bán → null', () => {
    const want = prepItems(festivalOn(30)!, 20);
    const plan = festivalRestockPlan({ day: 26, level: 20, storage: {}, sells: (id) => id !== want[0], caseSizeOf: caseSize });
    expect(plan!.skipped).toEqual([want[0]]);
    expect(plan!.lines.map((l) => l.id)).not.toContain(want[0]);
    expect(festivalRestockPlan({ day: 26, level: 20, storage: {}, sells: () => false, caseSizeOf: caseSize })).toBeNull();
  });

  it('trữ một phần (dưới PREP_MIN_QTY) → phiếu chỉ tính phần thiếu', () => {
    const first = festivalRestockPlan({ day: 26, level: 20, storage: {}, sells: allSell, caseSizeOf: caseSize })!.lines[0].id;
    const plan = festivalRestockPlan({ day: 26, level: 20, storage: { [first]: 3 }, sells: allSell, caseSizeOf: caseSize });
    const line = plan!.lines.find((l) => l.id === first)!;
    expect(line.units).toBe(PREP_MIN_QTY - 3);
    expect(line.cases).toBe(Math.ceil((PREP_MIN_QTY - 3) / caseSize(first)));
  });

  it('ngày không gần lễ nào → null', () => {
    expect(festivalRestockPlan({ day: 100, level: 20, storage: {}, sells: allSell, caseSizeOf: caseSize })).toBeNull();
  });
});

describe('festivalPrepAction — trữ lễ thành việc sáng (GĐ249)', () => {
  it('phiếu có món thiếu → việc sáng, ngày gần lễ (≤1) là nguy cấp', () => {
    // Ngày 27 → Tết ngày 28 (còn 1 ngày) → danger
    const planUrgent = festivalRestockPlan({ day: 27, level: 20, storage: {}, sells: allSell, caseSizeOf: caseSize })!;
    const act = festivalPrepAction(planUrgent, formatMoney)!;
    expect(act.panel).toBe('order');
    expect(act.danger).toBe(true);
    expect(act.priority).toBe(1);
    expect(act.text).toContain('Tết');
    expect(act.text).toContain('còn 1 ngày');
    expect(act.text).toContain(formatMoney(planUrgent.bonus));
  });

  it('còn ≥2 ngày → việc thường (priority 2, không danger)', () => {
    const plan = festivalRestockPlan({ day: 26, level: 20, storage: {}, sells: allSell, caseSizeOf: caseSize })!;
    const act = festivalPrepAction(plan, formatMoney)!;
    expect(act.danger).toBe(false);
    expect(act.priority).toBe(2);
  });

  it('không có phiếu (không gần lễ) → null', () => {
    expect(festivalPrepAction(null, formatMoney)).toBeNull();
  });
});
