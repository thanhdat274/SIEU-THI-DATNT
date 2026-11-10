import { describe, expect, it } from 'vitest';
import { emptyGioGrid, GIO_GRID, GIO_GIFT_POOL, gioCanPlace, gioPlace, pickGioGifts, scoreGioQua, type GioGift, type GioPlacement } from '../data/gioQua';
import { miniSeed } from '../ui/minigames/seeded';

/** Hệ 7-L2 — trò Xếp giỏ quà (SPEC §7.5): hình khối + sinh đề + tính điểm thuần. */

const poolGift = (id: string) => GIO_GIFT_POOL.find((g) => g.id === id)!;

describe('pickGioGifts', () => {
  it('rút đúng 6 món, không trùng, tất định theo seed', () => {
    const seed = miniSeed(5, 32, 'gio_qua');
    const a = pickGioGifts(seed);
    const b = pickGioGifts(seed);
    expect(a.length).toBe(6);
    expect(new Set(a.map((g) => g.id)).size).toBe(6);
    expect(a.map((g) => g.id)).toEqual(b.map((g) => g.id));
    expect(pickGioGifts(miniSeed(6, 32, 'gio_qua')).map((g) => g.id)).not.toEqual(a.map((g) => g.id));
  });
});

describe('gioCanPlace / gioPlace', () => {
  it('chặn tràn biên và chồng ô', () => {
    const grid = emptyGioGrid();
    const big = poolGift('hop_banh_dai'); // w:2, h:1
    expect(gioCanPlace(grid, big, 0, 3)).toBe(false); // col 3 + 2 > 4
    expect(gioCanPlace(grid, big, 0, 2)).toBe(true);
  });

  it('đặt vào giỏ không đè ô đã có', () => {
    const tall = poolGift('hu_mut_tron'); // w1 h1
    let g = emptyGioGrid();
    g = gioPlace(g, tall, 0, 0);
    expect(g[0][0]).toBe('hu_mut_tron');
    expect(gioCanPlace(g, tall, 0, 0)).toBe(false); // đã có
    expect(gioCanPlace(g, tall, 0, 1)).toBe(true);
  });
});

describe('scoreGioQua', () => {
  it('món cao ở sau (dòng nhỏ) được nhiều điểm trật tự hơn ở trước', () => {
    const tall = poolGift('hu_mut_tron'); // tall 3
    const low = poolGift('goi_keo');      // tall 1
    const back: GioPlacement[] = [
      { gift: tall, row: 0, col: 0 },
      { gift: low, row: 3, col: 0 },
    ];
    const front: GioPlacement[] = [
      { gift: tall, row: 3, col: 0 },
      { gift: low, row: 0, col: 0 },
    ];
    expect(scoreGioQua(back)).toBeGreaterThan(scoreGioQua(front));
  });

  it('điểm nằm trong 0–100 và lấp đầy tăng điểm', () => {
    const empty = scoreGioQua([]);
    expect(empty).toBe(0);
    const full = Array.from({ length: 16 }).flatMap((_, k) => ({
      gift: { id: `x${k}`, name: '', icon: '', w: 1, h: 1, tall: 1 }, row: Math.floor(k / GIO_GRID), col: k % GIO_GRID,
    }));
    expect(scoreGioQua(full)).toBeGreaterThan(empty);
    expect(scoreGioQua(full)).toBeLessThanOrEqual(100);
  });
});
