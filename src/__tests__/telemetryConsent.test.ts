import { describe, expect, it, beforeEach } from 'vitest';
import {
  TELEMETRY_SCOPE, telemetryOptedIn, setTelemetryOptIn, telemetryAsked, markTelemetryAsked, telemetrySample,
} from '../data/telemetryConsent';

/**
 * SPEC-TOI-UU §T1 (L2) — đồng ý "Số liệu ẩn danh" (scope telemetry_anon): mặc định tắt, lưu cục bộ.
 * KHÔNG đụng uid/account — mọi hàm đều không nhận uid, không gọi recordConsent.
 */
describe('telemetryConsent (T1-L2)', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    // Chèn shim localStorage trong trường hợp test env không có (giống dùng máy thật).
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
      key: () => null,
      length: 0,
    } as unknown as Storage;
  });

  it('mặc định TẮT', () => {
    expect(telemetryOptedIn()).toBe(false);
  });

  it('bật/tắt lưu lại được (cục bộ, không đụng uid)', () => {
    setTelemetryOptIn(true);
    expect(telemetryOptedIn()).toBe(true);
    setTelemetryOptIn(false);
    expect(telemetryOptedIn()).toBe(false);
  });

  it('hỏi đúng một lần: đã hỏi thì không hỏi lại', () => {
    expect(telemetryAsked()).toBe(false);
    markTelemetryAsked();
    expect(telemetryAsked()).toBe(true);
  });

  it('bản ghi mẫu đúng lược đồ, ẩn danh (không uid/tên/vị trí)', () => {
    const sample = telemetrySample();
    expect(sample).toContain('"install"');
    expect(sample).toContain('"day"');
    expect(sample).toContain('"customers"');
    // Không được lọt nhận dạng cá nhân (device "phone" là hạng máy, không phải số điện thoại)
    expect(sample).not.toMatch(/"uid"|"email"|"name"|"phone_number"|"lat"|"lng"/i);
  });

  it('scope đúng tên telemetry_anon', () => {
    expect(TELEMETRY_SCOPE).toBe('telemetry_anon');
  });
});
