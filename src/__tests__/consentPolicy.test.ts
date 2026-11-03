import { describe, expect, it } from 'vitest';
import {
  allConsentsGiven, CONSENT_SCOPES, isConsentScope, isValidConsentVersion, PRIVACY_VERSION,
} from '../net/consentPolicy';

describe('consentPolicy', () => {
  it('phiên bản Chính sách hiện hành không rỗng và hợp lệ', () => {
    expect(isValidConsentVersion(PRIVACY_VERSION)).toBe(true);
    expect(PRIVACY_VERSION.length).toBeGreaterThan(0);
  });

  it('nhận đúng scope hợp lệ và bác các chuỗi khác', () => {
    for (const scope of CONSENT_SCOPES) expect(isConsentScope(scope)).toBe(true);
    expect(isConsentScope('account_cloud')).toBe(true);
    expect(isConsentScope('')).toBe(false);
    expect(isConsentScope('email_marketing')).toBe(false);
    expect(isConsentScope('ACCOUNT_CLOUD')).toBe(false);
    // @ts-expect-error — kiểu sai (không nằm trong CONSENT_SCOPES)
    expect(isConsentScope(undefined)).toBe(false);
  });

  it('đồng ý dữ liệu và điều khoản là hai ô riêng, thiếu ô nào cũng chưa đủ', () => {
    expect(CONSENT_SCOPES).toContain('account_cloud');
    expect(CONSENT_SCOPES).toContain('terms');
    expect(allConsentsGiven({})).toBe(false);
    expect(allConsentsGiven({ account_cloud: true })).toBe(false);
    expect(allConsentsGiven({ terms: true })).toBe(false);
    expect(allConsentsGiven({ account_cloud: true, terms: true })).toBe(true);
  });

  it('phiên bản hợp lệ: không rỗng và dưới độ dài cho phép; bác bản rỗng/quá dài', () => {
    expect(isValidConsentVersion('v1')).toBe(true);
    expect(isValidConsentVersion('2026-11-03')).toBe(true);
    expect(isValidConsentVersion('')).toBe(false);
    expect(isValidConsentVersion('x'.repeat(41))).toBe(false);
    expect(isValidConsentVersion('x'.repeat(40))).toBe(true);
  });
});
