import { describe, it, expect } from 'vitest';
import { PRODUCTS, CATEGORIES } from '../data/products';
import { EN_PRODUCTS, EN_CATEGORIES } from '../i18n/en/data/products';
import { localizeNames, localizeRecord } from '../i18n/dataLang';

describe('i18n bước 5 — tên hàng tiếng Anh', () => {
  it('mọi id trong bảng Anh là hàng có thật', () => {
    const ids = new Set(PRODUCTS.map((p) => p.id));
    expect(Object.keys(EN_PRODUCTS).filter((k) => !ids.has(k))).toEqual([]);
  });

  it('đủ tên Anh cho mọi ngành hàng và 131 hàng gốc', () => {
    expect(Object.keys(CATEGORIES).filter((k) => !EN_CATEGORIES[k])).toEqual([]);
    expect(PRODUCTS.slice(0, 131).filter((p) => !EN_PRODUCTS[p.id]).map((p) => p.id)).toEqual([]);
  });

  it('tiếng Việt (mặc định, golden) giữ nguyên tên', () => {
    expect(PRODUCTS.find((p) => p.id === 'mi')!.name).toBe('Mì gói');
  });

  it('tiếng Anh đổi tên theo id, thiếu bản dịch thì giữ tên gốc', () => {
    const rows = [{ id: 'mi', name: 'Mì gói' }, { id: 'khong_co', name: 'Món lạ' }];
    localizeNames(rows, EN_PRODUCTS, 'en');
    expect(rows.map((r) => r.name)).toEqual(['Instant noodles', 'Món lạ']);
    const rec = { dry: 'Đồ khô' };
    localizeRecord(rec, EN_CATEGORIES, 'en');
    expect(rec.dry).toBe('Dry goods');
  });
});
