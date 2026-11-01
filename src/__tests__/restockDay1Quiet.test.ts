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

describe('thông báo lên cấp ≤90 ký tự (GĐ562)', () => {
  it('bỏ mô tả, gộp +N, không vượt 90', async () => {
    const { levelUpToast } = await import('../data/onboarding');
    const g = ['Xà phòng', 'Bim bim que', 'Mở rộng tiệm: Tiệm nới rộng', 'Kệ hàng chớp nhoáng: khách xếp hàng mua kẹp thêm món nhỏ cạnh quầy thu ngân'];
    const m = levelUpToast(6, g);
    expect(m.length).toBeLessThanOrEqual(90);
    expect(m).toContain('Mở rộng tiệm');
    expect(m).not.toContain('cạnh quầy');
    expect(levelUpToast(7, [])).toBe('⭐ Lên cấp 7!');
    const many = Array.from({ length: 20 }, (_, i) => `Món số ${i}`);
    expect(levelUpToast(9, many).length).toBeLessThanOrEqual(90);
    expect(levelUpToast(9, many)).toMatch(/\+\d+$/);
  });
});

describe('fitList (GĐ563)', () => {
  it('giữ ≤90, gộp +N, giữ nguyên khi vừa', async () => {
    const { fitList } = await import('../data/onboarding');
    expect(fitList('🔄 Thay ô hết hàng: ', ['A → B'])).toBe('🔄 Thay ô hết hàng: A → B');
    const many = Array.from({ length: 12 }, (_, i) => `Món dài số ${i} → Món thay ${i}`);
    const m = fitList('🔄 Thay ô hết hàng: ', many);
    expect([...m].length).toBeLessThanOrEqual(90);
    expect(m).toMatch(/\+\d+$/);
  });
});
