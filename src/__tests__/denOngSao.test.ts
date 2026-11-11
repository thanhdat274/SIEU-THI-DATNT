import { describe, expect, it } from 'vitest';
import {
  DEN_SECTIONS, STAR_EDGES, STAR_TIP_ORDER, connectEdges, scoreDenOngSao, scoreDenPaste,
  scoreStarConnect, starCorrectEdges,
} from '../data/denOngSao';
import { FESTIVAL_MINIS } from '../data/festivalMini';

/** Hệ 7-L5 — trò Phất đèn ông sao (SPEC-CHIEU-RONG §7.5): ngôi sao một nét + dán 5 cánh + tâm. */

describe('STAR_TIP_ORDER (ngôi sao một nét)', () => {
  it('có 5 tip và thứ tự [0,2,4,1,3]', () => {
    expect(STAR_TIP_ORDER).toEqual([0, 2, 4, 1, 3]);
    expect(new Set(STAR_TIP_ORDER).size).toBe(5);
  });

  it('STAR_EDGES có đúng 5 cạnh tạo thành ngôi sao một nét khép kín', () => {
    expect(STAR_EDGES.size).toBe(5);
    const edges = connectEdges(STAR_TIP_ORDER);
    expect(edges).toHaveLength(5);
    for (const e of edges) expect(STAR_EDGES.has(e)).toBe(true);
  });
});

describe('connectEdges / starCorrectEdges', () => {
  it('nối theo đúng thứ tự một nét → 5 cạnh khớp', () => {
    expect(starCorrectEdges(STAR_TIP_ORDER)).toBe(5);
  });
  it('nối theo vòng tròn (0,1,2,3,4) → 0 cạnh khớp', () => {
    expect(starCorrectEdges([0, 1, 2, 3, 4])).toBe(0);
  });
  it('nối một phần (3 tip) → đếm đúng số cạnh đã khớp, chưa khép vòng', () => {
    // 0→2 (đúng) →4 (đúng): 2 cạnh khớp
    expect(starCorrectEdges([0, 2, 4])).toBe(2);
    // 0→1 (sai) →2 (sai): 0
    expect(starCorrectEdges([0, 1, 2])).toBe(0);
  });
});

describe('scoreStarConnect (60)', () => {
  it('đúng một nét → 60; theo vòng tròn → thấp', () => {
    expect(scoreStarConnect(STAR_TIP_ORDER)).toBe(60);
    expect(scoreStarConnect([0, 1, 2, 3, 4])).toBeLessThan(60);
  });
  it('một phần quy về tỉ lệ cạnh', () => {
    expect(scoreStarConnect([0, 2])).toBeGreaterThan(0); // 1 cạnh khớp → 12
    expect(scoreStarConnect([])).toBe(0);
    expect(scoreStarConnect([0])).toBe(0);
  });
});

describe('scoreDenPaste (40)', () => {
  it('dán kín 6 vùng → 40; một nửa → 20; trống → 0', () => {
    expect(scoreDenPaste(DEN_SECTIONS)).toBe(40);
    expect(scoreDenPaste(3)).toBe(20);
    expect(scoreDenPaste(0)).toBe(0);
    expect(scoreDenPaste(99)).toBe(40); // clamp
  });
});

describe('scoreDenOngSao (tổng 100)', () => {
  it('nối đúng + dán kín → 100', () => {
    expect(scoreDenOngSao(STAR_TIP_ORDER, DEN_SECTIONS)).toBe(100);
  });
  it('kẹp 0–100', () => {
    expect(scoreDenOngSao([], 0)).toBe(0);
  });
});

describe('Đèn ông sao trong khung Hệ 7', () => {
  it('def den_ong_sao gắn Trung thu, thưởng điểm trang trí (flair)', () => {
    const def = FESTIVAL_MINIS.find((m) => m.id === 'den_ong_sao');
    expect(def).toBeDefined();
    expect(def?.festivals).toEqual(['trung_thu']);
    expect(def?.target).toEqual({ kind: 'decor', furniture: 'den_ong_sao' });
    expect(def?.reward(100, 'fast')).toMatchObject({ flair: 6 });
  });
});
