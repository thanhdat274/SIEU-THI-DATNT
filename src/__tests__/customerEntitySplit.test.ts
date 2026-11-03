import { describe, it, expect } from 'vitest';
import * as ent from '../agents/customerEntity';

describe('GĐ988 — agents/customerEntity tách khỏi agents/customers', () => {
  it('impatienceEmoji theo ngưỡng', () => {
    expect(ent.impatienceEmoji(0)).toBeNull();
    expect(ent.impatienceEmoji(ent.IMPATIENT_AT)).toBe('😕');
    expect(ent.impatienceEmoji(ent.FRANTIC_AT)).toBe('😤');
  });
  it('xuất lớp Customer và hằng số', () => {
    expect(typeof ent.Customer).toBe('function');
    expect(ent.PATIENCE_MINUTES).toBe(45);
    expect(ent.SIDEWALK_Z).toBe(2.2);
  });
});
