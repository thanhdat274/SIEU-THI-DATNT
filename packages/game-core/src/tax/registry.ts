export type BusinessEntityType = 'unregistered' | 'household' | 'private_enterprise' | 'single_member_llc' | 'multi_member_llc' | 'joint_stock';
export type BusinessActivity = 'retail_goods' | 'food_preparation' | 'beverage_service' | 'other';
export interface TaxRule {
  ruleId: string;
  taxType: 'VAT' | 'PIT' | 'CIT' | 'INVOICE';
  legalDocument: string;
  article: string;
  clause: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  applicableEntityTypes: BusinessEntityType[];
  applicableBusinessActivities: BusinessActivity[];
  conditions: string[];
  threshold: number | null;
  rate: { numerator: number; denominator: number } | null;
  calculationMethod: string;
  sourceUrl: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  lastVerifiedAt: string | null;
}
export interface TaxRuleSnapshot { version: string; rules: TaxRule[] }

function checkDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Ngày pháp lý không hợp lệ.');
  }
}

/** Immutable, JSON-serializable versions. No implicit latest-version fallback. */
export class TaxRuleRegistry {
  private readonly snapshots = new Map<string, TaxRuleSnapshot>();

  register(snapshot: TaxRuleSnapshot): void {
    if (!snapshot.version.trim() || this.snapshots.has(snapshot.version)) throw new Error('Phiên bản quy tắc trống hoặc đã tồn tại.');
    const ids = new Set<string>();
    for (const rule of snapshot.rules) {
      if (!rule.ruleId.trim() || ids.has(rule.ruleId)) throw new Error('Mã quy tắc trống hoặc trùng.');
      ids.add(rule.ruleId);
      checkDate(rule.effectiveFrom);
      if (rule.effectiveTo !== null) {
        checkDate(rule.effectiveTo);
        if (rule.effectiveTo <= rule.effectiveFrom) throw new Error('Khoảng hiệu lực không hợp lệ.');
      }
      if (rule.threshold !== null && (!Number.isSafeInteger(rule.threshold) || rule.threshold < 0)) throw new Error('Ngưỡng phải là số đồng nguyên an toàn.');
      if (rule.rate && (!Number.isSafeInteger(rule.rate.numerator) || rule.rate.numerator < 0 || !Number.isSafeInteger(rule.rate.denominator) || rule.rate.denominator <= 0)) throw new Error('Tỷ lệ không hợp lệ.');
      if (rule.verificationStatus === 'VERIFIED') {
        if (!rule.legalDocument || !rule.article || !rule.clause || !rule.lastVerifiedAt || !rule.conditions.length || !rule.calculationMethod) throw new Error('Thiếu căn cứ xác minh quy tắc.');
        checkDate(rule.lastVerifiedAt);
        if (new URL(rule.sourceUrl).protocol !== 'https:') throw new Error('Nguồn pháp lý phải dùng HTTPS.');
      }
    }
    this.snapshots.set(snapshot.version, structuredClone(snapshot));
  }

  snapshot(version: string): TaxRuleSnapshot {
    const snapshot = this.snapshots.get(version);
    if (!snapshot) throw new Error('Không tìm thấy phiên bản thuế đã lưu; cần phục hồi dữ liệu pháp lý.');
    return structuredClone(snapshot);
  }

  resolve(version: string, date: string, entity: BusinessEntityType, activity: BusinessActivity): TaxRule[] {
    checkDate(date);
    return this.snapshot(version).rules.filter(rule =>
      rule.verificationStatus === 'VERIFIED' && rule.effectiveFrom <= date &&
      (rule.effectiveTo === null || date < rule.effectiveTo) &&
      rule.applicableEntityTypes.includes(entity) && rule.applicableBusinessActivities.includes(activity));
  }
}
