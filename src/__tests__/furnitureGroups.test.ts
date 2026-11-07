import { describe, expect, it } from 'vitest';
import { FURNITURE, furnitureDef } from '../data/furniture';
import { furnitureGroup } from '../data/furnitureGroups';

/** GĐ1516 — bảng Xây dựng lọc theo nhóm: mọi món thuộc đúng 1 nhóm, không nhóm nào rỗng. */
describe('furnitureGroups (GĐ1516)', () => {
  it('phân nhóm mẫu đúng', () => {
    expect(furnitureGroup(furnitureDef('shelf'))).toBe('sell');
    expect(furnitureGroup(furnitureDef('binh_bat_trang'))).toBe('decor');
    expect(furnitureGroup(furnitureDef('chair'))).toBe('other');
  });
  it('mỗi nhóm có món; tổng đúng bằng danh mục', () => {
    const by = { sell: 0, decor: 0, other: 0 };
    for (const f of FURNITURE) by[furnitureGroup(f)]++;
    expect(by.sell).toBeGreaterThan(0);
    expect(by.decor).toBeGreaterThan(0);
    expect(by.other).toBeGreaterThan(0);
    expect(by.sell + by.decor + by.other).toBe(FURNITURE.length);
  });
});
