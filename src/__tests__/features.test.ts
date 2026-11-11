import { describe, expect, it } from 'vitest';
import { FEATURE_LEVEL, FEATURE_TRACES, type FeatureId, featureLevel, hasFeature } from '../data/features';

// SPEC-TOI-UU §T3-L2: hasFeature phải ≡ `level >= mốc` khi chưa có dấu vết — khoá "chưa dời gì, golden giữ byte".
describe('hasFeature (T3-L2)', () => {
  const ids = Object.keys(FEATURE_LEVEL) as FeatureId[];
  it.each(ids)('%s: đúng ở mốc, sai ngay dưới mốc', (id) => {
    const at = featureLevel(id);
    expect(hasFeature({ level: at }, id)).toBe(true);
    expect(hasFeature({ level: at - 1 }, id)).toBe(false);
    expect(hasFeature({ level: at + 50 }, id)).toBe(true);
  });
  it('chưa khai báo dấu vết nào ở L2', () => {
    expect(Object.keys(FEATURE_TRACES)).toEqual([]);
  });
  it('mốc giữ nguyên hiện trạng (đổi mốc phải sửa test này — có chủ ý)', () => {
    expect(FEATURE_LEVEL).toMatchObject({
      wholesale: 6, loyalty: 5, dineIn: 33, credit: 4, haggle: 2, change: 2, criticHard: 45, rival: 8,
      poachCluster: 32, farmOrder: 16, social: 8, stance: 60, mastery: 31, lifeEvent: 32, cook: 21, quanNuoc: 29,
    });
  });
});
