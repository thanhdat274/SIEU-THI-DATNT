import { describe, expect, it } from 'vitest';
import { comboSuggest, COMBO_UNLOCK, COMBOS, unlockedCombos } from '../data/combos';

/** Gợi ý combo nên bật khi còn slot — ưu tiên combo gồm món bán chạy + món chưa combo nào phủ. */

describe('comboSuggest — gợi ý combo khi còn slot', () => {
  it('chưa đủ dữ liệu bán (<2 món có sales) → không gợi ý (tránh nhiễu)', () => {
    expect(comboSuggest(8, { mi: 5 }, [])).toEqual([]);
    expect(comboSuggest(8, {}, [])).toEqual([]);
  });

  it('còn slot, món bán chạy rõ → combo trúng top-seller được ưu tiên đầu danh sách', () => {
    const s = comboSuggest(8, { mi: 5, nuoc: 4 }, []);
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].id).toBe('mi_nuoc');
    expect(s[0].reason).toContain('Mì gói');
    expect(s[0].reason).toContain('bán chạy');
  });

  it('combo đang chạy bị loại khỏi gợi ý', () => {
    const s = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8, ngot: 7 }, ['mi_nuoc']);
    expect(s.length).toBeGreaterThan(0);
    expect(s[0].id).toBe('banh_ngot'); // combo trúng 2 món bán chạy còn lại
    expect(s.map((x) => x.id)).not.toContain('mi_nuoc');
  });

  it('không gợi ý lại combo đang chạy (đã dùng slot)', () => {
    const s = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8, ngot: 7 }, ['mi_nuoc', 'banh_ngot']);
    expect(s.map((x) => x.id)).not.toContain('mi_nuoc');
    expect(s.map((x) => x.id)).not.toContain('banh_ngot');
  });

  it('tối đa n gợi ý (mặc định 2, tùy chỉnh 1)', () => {
    const def = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8, ngot: 7, sua: 6, giavi: 5 }, []);
    expect(def.length).toBeLessThanOrEqual(2);
    const one = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8, ngot: 7 }, [], 1);
    expect(one.length).toBeLessThanOrEqual(1);
  });

  it('chỉ gợi ý combo đã mở khóa (món nhà làm chưa bếp bị loại ở cấp thấp)', () => {
    const s = comboSuggest(6, { mi: 10, nuoc: 9, banh: 8, ngot: 7 }, []);
    const cookIds = COMBOS.filter((c) => c.cook).map((c) => c.id);
    for (const sg of s) expect(cookIds).not.toContain(sg.id);
    // mọi gợi ý phải nằm trong danh sách combo mở ở cấp đó
    const open = new Set(unlockedCombos(6).map((c) => c.id));
    for (const sg of s) expect(open.has(sg.id)).toBe(true);
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const a = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8 }, ['banh_ngot']);
    const b = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8 }, ['banh_ngot']);
    expect(a).toEqual(b);
  });

  it('COMBO_UNLOCK thấp hơn cấp test cho đúng ngữ cảnh gợi ý (guard)', () => {
    expect(COMBO_UNLOCK).toBeLessThanOrEqual(8);
  });
});

describe('comboSuggest \\u2014 gợi ý ĐỔI combo khi đã chạy đủ slot (GĐ1244)', () => {
  it('replaceId là combo đang chạy → combo đó KHÔNG xuất hiện trong gợi ý đổi', () => {
    const s = comboSuggest(8, { mi: 10, nuoc: 9 }, ['mi_nuoc'], 2, { replaceId: 'mi_nuoc' });
    expect(s.length).toBeGreaterThan(0);
    expect(s.map((x) => x.id)).not.toContain('mi_nuoc');
  });

  it('combo bị thay coi như giải phóng món: cặp dùng lại món bán chạy của nó được gợi ý', () => {
    // mi_nuoc đang chạy (phủ mi+nuoc) bị thay → món mi (bán chạy) tự do lại → mi_trung (mi+trung) lên đầu.
    // Cấp 25: trứng (11) & tăng lực (18) đều < 20 nên không bị tính bonus "món mới" — mi_trung & tangluc_mi
    // cùng điểm (18) → mi_trung đứng trước theo thứ tự COMBOS (= ổn định khi sort cùng điểm).
    const s = comboSuggest(25, { mi: 10, nuoc: 9 }, ['mi_nuoc'], 3, { replaceId: 'mi_nuoc' });
    expect(s[0].id).toBe('mi_trung');
  });

  it('replaceId không nằm trong active → bỏ qua (running không đổi, món vẫn bị phủ)', () => {
    // 'mi_nuoc' không phải combo đang chạy → không có slot được giải phóng; đang chạy là banh_ngot
    const s = comboSuggest(8, { mi: 10, nuoc: 9, banh: 8, ngot: 7 }, ['banh_ngot'], 2, { replaceId: 'mi_nuoc' });
    expect(s.map((x) => x.id)).not.toContain('banh_ngot');
    // vì có slot thật (active < max) ta không ép: chỉ kiểm không loại nhầm combo đang chạy
  });

  it('đủ dữ liệu bán rồi mới gợi ý đổi (cùng guard như gợi ý thường)', () => {
    expect(comboSuggest(8, { mi: 5 }, ['mi_nuoc'], 1, { replaceId: 'mi_nuoc' })).toEqual([]);
  });
});
