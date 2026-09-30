import type { TaxRuleSnapshot } from './registry';

/** Research candidates only: must not be used to assess or debit player taxes. */
export const TAX_RESEARCH_2026: TaxRuleSnapshot = {
  version: 'vn-2026-09-30-research-1',
  rules: ['VAT', 'PIT'].map(taxType => ({
    ruleId: `household-${taxType.toLowerCase()}-threshold-2026`,
    taxType: taxType as 'VAT' | 'PIT',
    legalDocument: '141/2026/NĐ-CP sửa đổi 68/2026/NĐ-CP',
    article: taxType === 'VAT' ? 'Điều 3 NĐ 68; Điều 1 NĐ 141' : 'Điều 4 NĐ 68; Điều 1 NĐ 141',
    clause: 'Chờ đối chiếu bản ký và toàn bộ sửa đổi đến 30/09/2026',
    effectiveFrom: '2026-01-01', effectiveTo: null,
    applicableEntityTypes: ['household'],
    applicableBusinessActivities: ['retail_goods', 'food_preparation', 'beverage_service', 'other'],
    conditions: ['Tổng doanh thu năm cần xác định đầy đủ cho mọi hoạt động và địa điểm.'],
    threshold: 1_000_000_000, rate: null,
    calculationMethod: 'Chỉ lưu ngưỡng tham khảo; chưa triển khai công thức tính thuế.',
    sourceUrl: 'https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-141-2026-nd-cp-nang-nguong-doanh-thu-khong-phai-chiu-thue-len-1-ty-dong-119260504154326455.htm',
    verificationStatus: 'UNVERIFIED', lastVerifiedAt: null,
  })),
};
