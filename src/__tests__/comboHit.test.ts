import { beforeEach, describe, expect, it } from 'vitest';
import { comboById, comboDiscount } from '../data/combos';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';

const mi = { id: 'mi', price: 5000 };
const nuoc = { id: 'nuoc', price: 6000 };
const banh = { id: 'banh', price: 8000 };
const ngot = { id: 'ngot', price: 9000 };

describe('comboDiscount.byCombo (GĐ44) — đếm lần kích hoạt từng combo', () => {
  it('chưa có món đủ cặp → byCombo rỗng, discount/count 0', () => {
    const r = comboDiscount(['mi_nuoc'], [mi]);
    expect(r.byCombo).toEqual({});
    expect(r.count).toBe(0);
    expect(r.discount).toBe(0);
  });

  it('đủ cặp → byCombo đếm đúng combo đó, discount/count như cũ', () => {
    const r = comboDiscount(['mi_nuoc'], [mi, nuoc]);
    expect(r.byCombo).toEqual({ mi_nuoc: 1 });
    expect(r.count).toBe(1);
    expect(r.discount).toBeGreaterThan(0);
  });

  it('nhiều cặp cùng combo → đếm đủ số lần ghép', () => {
    const r = comboDiscount(['mi_nuoc'], [mi, nuoc, mi, nuoc]);
    expect(r.byCombo).toEqual({ mi_nuoc: 2 });
    expect(r.count).toBe(2);
  });

  it('nhiều combo khác nhau cùng kích hoạt → đếm từng cái', () => {
    const r = comboDiscount(['mi_nuoc', 'banh_ngot'], [mi, nuoc, banh, ngot]);
    expect(r.byCombo).toEqual({ mi_nuoc: 1, banh_ngot: 1 });
    expect(r.count).toBe(2);
  });

  it('GĐ124: byDiscount trả về tiền giảm RIÊNG từng combo, tổng khớp discount', () => {
    const r = comboDiscount(['mi_nuoc', 'banh_ngot'], [mi, nuoc, banh, ngot]);
    expect(r.byDiscount).toEqual({ mi_nuoc: r.discount > 0 ? expect.any(Number) : 0, banh_ngot: r.discount > 0 ? expect.any(Number) : 0 });
    const sum = Object.values(r.byDiscount).reduce((n, v) => n + v, 0);
    expect(sum).toBe(r.discount);
    expect(r.byDiscount.mi_nuoc).toBeGreaterThan(0);
    expect(r.byDiscount.banh_ngot).toBeGreaterThan(0);
  });

  it('mã combo hợp lệ (comboById trả về thật)', () => {
    expect(comboById('mi_nuoc')!.items).toEqual(['mi', 'nuoc']);
  });
});

describe('noteComboHits (GĐ44) — cộng dồn counter qua store', () => {
  beforeEach(() => {
    useGame.setState({ comboHitCount: {} });
  });

  it('cộng dồn đúng theo từng combo', () => {
    useGame.getState().noteComboHits({ mi_nuoc: 2 });
    useGame.getState().noteComboHits({ mi_nuoc: 1, banh_ngot: 3 });
    expect(useGame.getState().comboHitCount).toEqual({ mi_nuoc: 3, banh_ngot: 3 });
  });

  it('byCombo rỗng / toàn 0 → không đụng state', () => {
    useGame.getState().noteComboHits({});
    expect(useGame.getState().comboHitCount).toEqual({});
  });

  it('persist: snapshot giữ comboHitCount, round-trip nguyên vẹn', () => {
    useGame.getState().noteComboHits({ mi_nuoc: 5, sua_banhmi: 2 });
    const save = snapshot();
    applySnapshot(save);
    expect(useGame.getState().comboHitCount).toEqual({ mi_nuoc: 5, sua_banhmi: 2 });
  });

  it('save cũ thiếu comboHitCount → applySnapshot tự bù {} (MERGE_DEEP, không crash)', () => {
    const fresh = newGameData();
    const old = JSON.parse(JSON.stringify(snapshot()));
    delete old.comboHitCount;
    applySnapshot(old);
    const s = useGame.getState();
    expect(s.comboHitCount).toEqual({});
    // field default vẫn cùng type như newGameData
    expect(typeof fresh.comboHitCount).toBe('object');
  });
});
