import { describe, expect, it } from 'vitest';
import { earlyUnlockTeaser, ONBOARD_DAYS, SYSTEM_UNLOCKS, roadmapAhead } from '../data/unlockMap';
import { FEATURES } from '../data/levels';

/**
 * GĐ132 — Mồi "🧭 Sắp mở khóa" cho người chơi MỚI (tuần đầu): đưa 1–2 hệ lớn sắp mở + XP còn
 * thiếu vào Sổ đầu ngày. THUẦN đọc — không đổi save/kinh tế; ẩn ngoài tuần đầu / khi hết hệ.
 */

describe('earlyUnlockTeaser — mồi mở khóa tuần đầu', () => {
  it('trong tuần đầu → 1–2 hệ lớn sắp mở, xếp theo cấp tăng dần, kèm xpAway', () => {
    const t = earlyUnlockTeaser({ level: 1, xp: 0, day: 1 })!;
    expect(t.length).toBeGreaterThanOrEqual(1);
    expect(t.length).toBeLessThanOrEqual(2);
    // cấp tăng dần và gần nhất trước
    expect(t[0].atLevel).toBeLessThanOrEqual(t[1]?.atLevel ?? Infinity);
    expect(t[0].atLevel).toBe(FEATURES.prices); // level 1 → hệ gần nhất là Bảng giá (cấp 3)
    expect(t[0].xpAway).toBeGreaterThan(0);
  });

  it('ngày > ONBOARD_DAYS → null (ẩn thẻ khi đã qua tuần đầu)', () => {
    expect(earlyUnlockTeaser({ level: 1, xp: 0, day: ONBOARD_DAYS + 1 })).toBeNull();
    expect(earlyUnlockTeaser({ level: 1, xp: 0, day: 99 })).toBeNull();
  });

  it('cấp rất cao (đã mở hết hệ sắp tới) → null ngay cả trong tuần đầu', () => {
    expect(earlyUnlockTeaser({ level: 80, xp: 0, day: 2 })).toBeNull();
    // tương đương roadmapAhead rỗng
    expect(roadmapAhead({ level: 80, xp: 0 })).toEqual([]);
  });

  it('cấp 0/1 luôn lấy đúng cấp mở thực từ SYSTEM_UNLOCKS (không đổi hằng số)', () => {
    const t = earlyUnlockTeaser({ level: 1, xp: 0, day: 3 })!;
    const sorted = [...SYSTEM_UNLOCKS].sort((a, b) => a.atLevel - b.atLevel);
    expect(t[0].atLevel).toBe(sorted[0].atLevel);
    expect(t[0].name).toBe(sorted[0].name);
  });

  it('không sửa SYSTEM_UNLOCKS (đầu ra là bản sao RoadmapItem, không đột biến nguồn)', () => {
    const before = SYSTEM_UNLOCKS.map((s) => s.atLevel);
    earlyUnlockTeaser({ level: 1, xp: 0, day: 1 });
    expect(SYSTEM_UNLOCKS.map((s) => s.atLevel)).toEqual(before);
  });
});
