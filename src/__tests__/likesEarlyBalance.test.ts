import { describe, expect, it } from 'vitest';
import { PROFESSIONS } from '../data/professions';
import { RECIPES } from '../data/recipes';

// GĐ1765 — món nấu được nghề "thích" phải mở > cấp 30 (trừ các món cũ đã có trong mốc cân
// bằng). Thêm like món cấp thấp làm lệch simGolden cấp 30 (GĐ1764: bạc xỉu cấp 26).
const LEGACY = new Set([
  'banh_trang_tron', 'ca_phe_sua_da', 'che_dau_xanh', 'com_hop_ga', 'kem_trai_cay', 'mi_trung_nong',
  'nuoc_mia', 'sinh_to_trai_cay', 'tra_dao_cam_sa', 'tra_gung_nong', 'tra_sua', 'xuc_xich_nuong',
]);
const unlockOf = Object.fromEntries(RECIPES.map((r) => [r.outputId, r.unlock]));

describe('like món nấu không chạm cân bằng đầu game (GĐ1765)', () => {
  it('mọi like món nấu cấp ≤30 nằm trong danh sách cũ', () => {
    const bad: string[] = [];
    for (const p of PROFESSIONS) for (const id of p.likes)
      if (unlockOf[id] !== undefined && unlockOf[id] <= 30 && !LEGACY.has(id)) bad.push(`${p.id}:${id}`);
    expect(bad).toEqual([]);
  });
});

// GĐ1773 — sau đợt GĐ1760–1771, mọi nghề (trừ đầu bếp: chỉ mua nguyên liệu) có ≥1 món nấu
// trong likes → bếp có cầu rõ từ mọi nhóm khách.
import { COOKED_PRODUCT_IDS } from '../data/recipes';
describe('mọi nghề có cầu món nấu (GĐ1773)', () => {
  it('trừ chef, nghề nào cũng thích ≥1 món nấu', () => {
    const none = PROFESSIONS.filter((p) => p.id !== 'chef' && !p.likes.some((i) => COOKED_PRODUCT_IDS.has(i))).map((p) => p.id);
    expect(none).toEqual([]);
  });
});
