import { describe, it, expect } from 'vitest';
import { finePaidXp } from '../data/inspection';

describe('GĐ1546 — nộp phạt đàng hoàng có XP', () => {
  it('nộp đủ ở cấp ≥35: 0,2% tiền phạt; vệ sinh gấp hoặc cấp thấp: 0', () => {
    expect(finePaidXp(0, 100_000, 35)).toBe(200);
    expect(finePaidXp(1, 100_000, 40)).toBe(0);
    expect(finePaidXp(0, 100_000, 34)).toBe(0);
  });
});

import { praiseXp } from '../data/inspection';
describe('GĐ1581 XP khi đoàn khen', () => {
  it('cấp 35 trở lên 50 XP', () => {
    expect(praiseXp(35)).toBe(50);
    expect(praiseXp(34)).toBe(0);
  });
});

import { dirtInspectionNote } from '../data/inspection';
describe('GĐ1583 HUD nhắc đoàn kiểm tra', () => {
  it('cấp 18 + sàn ≥30', () => {
    expect(dirtInspectionNote(18, 30)).toContain('biên bản');
    expect(dirtInspectionNote(17, 80)).toBe('');
    expect(dirtInspectionNote(40, 29)).toBe('');
  });
});
