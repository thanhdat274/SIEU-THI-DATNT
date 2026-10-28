import { describe, expect, it } from 'vitest';
import { productSensitivity, sensitivityLevel } from '../data/pricing';

/** Mức nhạy giá theo món: chỉ thị "nên cẩn / tăng được" khi định giá — thuần đọc lookup. */

describe('sensitivityLevel — phân loại độ nhạy giá', () => {
  it('ngưỡng: ≥1.8 hot (nhạy), ≤1.2 soft (bền), giữa mid', () => {
    expect(sensitivityLevel(1.8)).toBe('hot');
    expect(sensitivityLevel(3.0)).toBe('hot');
    expect(sensitivityLevel(1.2)).toBe('soft');
    expect(sensitivityLevel(0.8)).toBe('soft');
    expect(sensitivityLevel(1.5)).toBe('mid');
    expect(sensitivityLevel(1.3)).toBe('mid');
  });

  it('món mẫu theo đúng bảng: nuoc rất nhạy, diem/gao bền', () => {
    expect(sensitivityLevel(productSensitivity('nuoc'))).toBe('hot');   // 2.6
    expect(sensitivityLevel(productSensitivity('diem'))).toBe('soft');  // 0.8
    expect(sensitivityLevel(productSensitivity('gao'))).toBe('soft');   // 1.1
  });

  it('ngành hàng mặc định: dry 1.6 mid, household 1.0 soft', () => {
    expect(sensitivityLevel(1.6)).toBe('mid');   // dry
    expect(sensitivityLevel(1.0)).toBe('soft');  // household
  });
});
