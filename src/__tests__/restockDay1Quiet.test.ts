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
  it('fairBadgeOf (hudBadges) gọi showRestockExtras', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../ui/hudBadges.ts', import.meta.url), 'utf8');
    const line = src.split('\n').find((l) => l.includes('const fairBadgeOf'))!;
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

  it('GĐ1042: cả 1 món cũng quá max → rơi fallback "head +N mục" (dòng 56)', async () => {
    const { fitList } = await import('../data/onboarding');
    // head ngắn + món dài, max=3 → kể cả n=1 vẫn vượt → `HEAD1 mục`
    expect(fitList('HEAD', ['món rất dài'], 3)).toBe('HEAD1 mục');
  });

  it('GĐ1042: nhiều món đều quá max → đếm đủ số món trong fallback', async () => {
    const { fitList } = await import('../data/onboarding');
    expect(fitList('H', ['aaa', 'bbb'], 2)).toBe('H2 mục');
  });

  it('GĐ1042: danh sách rỗng → vòng lặp không chạy, fallback "head 0 mục"', async () => {
    const { fitList } = await import('../data/onboarding');
    expect(fitList('Kho trống: ', [])).toBe('Kho trống: 0 mục');
  });
});

describe('fitJoin tin sáng (GĐ565)', () => {
  it('≤90, giữ tin đầu, gộp +N tin', async () => {
    const { fitJoin } = await import('../data/onboarding');
    expect(fitJoin(['a', 'b'])).toBe('a · b');
    const w = 'Hôm nay: ⛅ Nhiều mây. Mát trời, khách như thường lệ.';
    const m = fitJoin([w, '📜 Từ nay tiệm phải có Giấy phép kinh doanh — hạn chót ngày 8, xin ở bảng Giấy phép']);
    expect([...m].length).toBeLessThanOrEqual(90);
    expect(m.startsWith(w)).toBe(true);
    expect(m).toMatch(/\+1 tin$/);
    expect([...fitJoin(['x'.repeat(200), 'y'])].length).toBeLessThanOrEqual(90);
  });
});
