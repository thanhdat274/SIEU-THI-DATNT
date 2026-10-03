import type { TaxAuditRecord, TaxState } from '@game/shared';
import { Mulberry32Rng, daySeed } from '../staff';
import type { TaxPolicy } from './annual-revenue';

/**
 * Kiểm tra thuế bất ngờ, chuyển thể từ game tham khảo tap-hoa-dau-hem (`core/tax.ts` `runAudit`):
 * định kỳ có một lượt gieo; trúng thì chị cán bộ thuế ghé. Sổ sách sạch được khen (danh tiếng, bằng khen);
 * có khai bớt thì truy thu phần giấu cộng tiền phạt và mất danh tiếng. Đây là cơ chế game, không phải quy định pháp lý.
 */
const MAX_AUDIT_HISTORY = 10;

export function emptyTaxState(): TaxState {
  return { underDeclare: false, hiddenTax: 0, debt: 0, audits: [], cleanAudits: 0 };
}

const money = (value: unknown) => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0);

/** Dựng lại từ dữ liệu lưu: ép kiểu an toàn, bỏ bản ghi lạ. */
export function normalizeTaxState(raw: unknown): TaxState {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<TaxState>;
  const audits = (Array.isArray(src.audits) ? src.audits : [])
    .filter((a): a is TaxAuditRecord => !!a && Number.isSafeInteger(a.day) && Number.isFinite(a.total) && Array.isArray(a.findings) && typeof a.clean === 'boolean')
    .map(a => ({ day: a.day, total: money(a.total), findings: a.findings.filter(f => typeof f === 'string').slice(0, 5), clean: a.clean }))
    .slice(-MAX_AUDIT_HISTORY);
  return {
    underDeclare: src.underDeclare === true,
    hiddenTax: money(src.hiddenTax),
    debt: money(src.debt),
    audits,
    cleanAudits: money(src.cleanAudits),
  };
}

/** Chia thuế phải nộp hôm nay thành phần nộp thật và phần khai bớt (giấu). */
export function splitDeclared(due: number, underDeclare: boolean, policy: TaxPolicy): { pay: number; hidden: number } {
  if (due <= 0 || !underDeclare) return { pay: Math.max(0, due), hidden: 0 };
  const hidden = Math.round(due * policy.audit.underDeclarePct);
  return { pay: due - hidden, hidden };
}

/** Xác suất bị kiểm tra ở một lượt gieo. */
export function auditChance(state: TaxState, policy: TaxPolicy): number {
  return Math.min(1, policy.audit.chance + (state.underDeclare ? policy.audit.underDeclareExtraChance : 0));
}

/**
 * Hôm nay có bị kiểm tra không: đúng ngày gieo, doanh thu năm đã đủ lớn để bị để ý, và trúng xác suất.
 * Xác định theo ngày nên nạp lại hay server phát lại cho cùng kết quả.
 */
export function shouldAudit(day: number, annualRevenue: number, state: TaxState, policy: TaxPolicy): boolean {
  const a = policy.audit;
  if (day < 1 || day % a.intervalDays !== 0) return false;
  if (annualRevenue < policy.threshold * a.minRevenueRatio) return false;
  return new Mulberry32Rng(daySeed(day, 0x7a3)).next() < auditChance(state, policy);
}

export interface AuditOutcome {
  record: TaxAuditRecord;
  /** Thuế truy thu (phần đã giấu) và tiền phạt. */
  backTax: number;
  fine: number;
  reputationDelta: number;
  /** Có cấp bằng khen không (sổ sạch). */
  commend: boolean;
}

export function resolveAudit(day: number, state: TaxState, policy: TaxPolicy, formatMoney: (n: number) => string): AuditOutcome {
  const a = policy.audit;
  const backTax = state.hiddenTax;
  if (backTax > 0) {
    const fine = Math.round(backTax * a.evasionFineMul);
    const findings = [`Khai thiếu thuế: truy thu ${formatMoney(backTax)}, phạt ${formatMoney(fine)}`];
    return { record: { day, total: backTax + fine, findings, clean: false }, backTax, fine, reputationDelta: -a.evasionReputation, commend: false };
  }
  return { record: { day, total: 0, findings: ['Sổ sách minh bạch, không vi phạm'], clean: true }, backTax: 0, fine: 0, reputationDelta: a.cleanReputation, commend: true };
}

/** Ghi kết quả vào trạng thái thuế: xóa phần đã truy thu, thêm lịch sử (tối đa 10 lần). */
export function applyAuditToState(state: TaxState, outcome: AuditOutcome): void {
  state.hiddenTax = 0;
  state.audits = [...state.audits, outcome.record].slice(-MAX_AUDIT_HISTORY);
  if (outcome.record.clean) state.cleanAudits += 1;
}
