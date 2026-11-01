import { describe, expect, it } from 'vitest';
import { showRestockExtras } from '../data/onboarding';

describe('Nhập hàng ngày 1 gọn cho người mới (GĐ551)', () => {
  it('ẩn chợ phiên + cần nhập gấp ở ngày 1, hiện từ ngày 2', () => {
    expect(showRestockExtras(1)).toBe(false);
    expect(showRestockExtras(2)).toBe(true);
    expect(showRestockExtras(31)).toBe(true);
  });
});

describe('badge Phiên chợ trên HUD theo cùng luật (GĐ560)', () => {
  it('fairBadge trong Hud gọi showRestockExtras', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../ui/Hud.tsx', import.meta.url), 'utf8');
    const line = src.split('\n').find((l) => l.includes('const fairBadge'))!;
    expect(line).toContain('showRestockExtras(s.day)');
  });
});
