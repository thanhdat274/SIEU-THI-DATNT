import { describe, expect, it } from 'vitest';
import { productById } from '../data/products';
import { productPixels, type Px } from '../data/productPixels';

/** Dựng trực tiếp Product để ép nhánh không khớp luật → fallback theo ngành. */
const raw = (id: string, name: string, category: 'dry' | 'drink' | 'cold' | 'frozen' | 'household' | 'fresh' | 'meat', color = 0x123456): Px[] =>
  productPixels({ id, name, category, buy: 1000, sell: 2000, color, unlock: 1 });

const isValidPx = (px: Px) =>
  Array.isArray(px) && px.length === 5
  && typeof px[0] === 'number' && typeof px[1] === 'number' && typeof px[2] === 'number' && typeof px[3] === 'number'
  && typeof px[4] === 'string' && /^#[0-9a-f]{6}$/.test(px[4]);

describe('productPixels — ô pixel 16x16 cho icon/đồ bày kệ 3D (dữ liệu hình ảnh thuần)', () => {
  it('trả về các ô Px hợp lệ (5-tuple, màu #rrggbb) cho món thật', () => {
    for (const id of ['gao', 'mi', 'nuoc', 'banh', 'kem', 'rau']) {
      const px = productPixels(productById(id));
      expect(px.length).toBeGreaterThan(0);
      for (const rect of px) expect(isValidPx(rect)).toBe(true);
    }
  });

  it('luôn là một bộ kết quả xác định (cache shapeOf: gọi lại cùng id ra cùng ô)', () => {
    const a = productPixels(productById('gao'));
    const b = productPixels(productById('gao'));
    expect(b).toEqual(a);
  });

  it('bóng (shade) được tô tối màu món đi 0.7 đúng mã hex', () => {
    // gao màu 0xfaf3e0 → ×0.7: 250/243/224 → 175/170/157 → '#afaa9d'
    const px = productPixels(productById('gao'));
    expect(px).toContainEqual([5, 2, 6, 2, '#afaa9d']); // ô bóng của hình "sack"
  });

  it('khớp quy tắc theo tên (chữ thường) — gạo → hình bao tải (sack)', () => {
    const px = productPixels(productById('gao'));
    // sack: viền mực [4,1,8,2,INK] ở đỉnh
    expect(px[0]).toEqual([4, 1, 8, 2, '#3a3a50']);
  });

  it('các món khác tên → hình khác nhau', () => {
    expect(productPixels(productById('gao'))).not.toEqual(productPixels(productById('mi')));
  });

  it('fallback theo ngành khi KHÔNG khớp luật nào: household → hộp (box)', () => {
    const px = raw('xyz', 'Vật phẩm lạ', 'household');
    // box: viền mực [2,3,12,12,INK]
    expect(px[0]).toEqual([2, 3, 12, 12, '#3a3a50']);
  });

  it('fallback theo ngành khi KHÔNG khớp luật nào: fresh → trái cây (fruit)', () => {
    const px = raw('xyz2', 'Vật phẩm lạ', 'fresh');
    // fruit: cành [7,0,2,3,'#6d4c41'] ở đầu
    expect(px[0]).toEqual([7, 0, 2, 3, '#6d4c41']);
  });

  it('fallback theo ngành khi KHÔNG khớp luật nào: drink → chai (bottle)', () => {
    const px = raw('xyz3', 'Vật phẩm lạ', 'drink');
    // bottle: nắp [6,0,4,3,INK] ở đầu
    expect(px[0]).toEqual([6, 0, 4, 3, '#3a3a50']);
  });

  it('màu món đi vào ô chính (c) đúng mã hex của product.color', () => {
    // gao 0xfaf3e0 → '#faf3e0' — ô thân bao tải [4,5,8,10,c]
    const px = productPixels(productById('gao'));
    expect(px).toContainEqual([4, 5, 8, 10, '#faf3e0']);
  });
});
