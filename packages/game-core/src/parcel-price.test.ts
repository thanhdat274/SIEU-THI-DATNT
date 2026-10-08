import assert from 'node:assert/strict';
import {
  NEARBY_BONUS, PRICE_CAP, TIER_FACTOR, amplificationFactor, parcelPrice, priceTrend,
} from './parcel-price';

const base = 1000;
const tileCount = 4;
const lvm = 1.5;

const price = (over: Partial<Parameters<typeof parcelPrice>[0]> = {}) => parcelPrice({
  basePrice: base, tileCount, landValueMultiplier: lvm, cityTier: 0, nearbyOpenBuildings: 0,
  ...over,
});

export function runParcelPriceTests(): void {
  // --- 1. base / ô / landValueMultiplier nhân đúng (tier 0, không lân cận ⇒ amp = 1) ---
  assert.equal(parcelPrice({ basePrice: 100, tileCount: 1, landValueMultiplier: 1, cityTier: 0 }), 100, 'base × 1 ô × lvm 1 = base');
  assert.equal(parcelPrice({ basePrice: 100, tileCount: 4, landValueMultiplier: 1, cityTier: 0 }), 400, '× 4 ô');
  assert.equal(parcelPrice({ basePrice: 100, tileCount: 4, landValueMultiplier: 1.5, cityTier: 0 }), 600, '× lvm 1.5');
  assert.equal(
    parcelPrice({ basePrice: 2000, tileCount: 5, landValueMultiplier: 2, cityTier: 0 }),
    2000 * 5 * 2,
    'base × ô × lvm độc lập, tier 0 không khuếch đại',
  );

  // --- 2. cityTier cao hơn ⇒ giá ≥ (đơn điệu) tại cùng tham số khác ---
  {
    const p0 = price({ cityTier: 0 });
    const p3 = price({ cityTier: 3 });
    const p5 = price({ cityTier: 5 });
    assert.ok(p0 > 0, 'tier 0 vẫn có giá > 0 (amp = 1)');
    assert.ok(p3 >= p0, 'tier 3 ≥ tier 0');
    assert.ok(p5 >= p3, 'tier 5 ≥ tier 3');
    assert.equal(amplificationFactor(3), TIER_FACTOR[3], 'amp tier 3 = TIER_FACTOR[3] khi không lân cận');
    // Toàn dải đơn điệu theo cấp.
    for (let t = 1; t < TIER_FACTOR.length; t++) {
      assert.ok(price({ cityTier: t }) >= price({ cityTier: t - 1 }), `tier ${t} ≥ tier ${t - 1}`);
    }
  }

  // --- 3. nhiều tòa gần ⇒ giá tăng đúng hệ số NEARBY_BONUS ---
  {
    const p0 = price({ cityTier: 0, nearbyOpenBuildings: 0 });
    const p1 = price({ cityTier: 0, nearbyOpenBuildings: 1 });
    const p3 = price({ cityTier: 0, nearbyOpenBuildings: 3 });
    assert.ok(p1 > p0, 'có 1 tòa lân cận đắt hơn');
    assert.ok(p3 > p1, '3 tòa lân cận đắt hơn 1 tòa');
    // Chênh mỗi tòa đúng bằng base × NEARBY_BONUS khi tier 0 chưa vượt trần.
    const baseValue = base * tileCount * lvm;
    assert.ok(Math.abs((p1 - p0) - baseValue * NEARBY_BONUS) < 1e-9, 'tăng thêm đúng base × NEARBY_BONUS');
    assert.ok(Math.abs((p3 - p0) - baseValue * NEARBY_BONUS * 3) < 1e-9, 'tổng tăng đúng base × NEARBY_BONUS × số tòa');
  }

  // --- 4. trần PRICE_CAP chặn hệ số khuếch đại, KHÔNG vượt PRICE_CAP × base ---
  {
    const baseValue = base * tileCount * lvm;
    // Dùng số tòa rất lớn: raw amp = 2 × (1 + 0.05×n) >> 2.5.
    const reallyBig = price({ cityTier: 5, nearbyOpenBuildings: 100000 });
    assert.equal(amplificationFactor(5, 100000), PRICE_CAP, 'amp kẹp đúng PRICE_CAP');
    assert.equal(reallyBig, baseValue * PRICE_CAP, 'giá không vượt PRICE_CAP × (base×ô×lvm)');
    // Đơn điệu vẫn giữ khi chạm trần: tăng lân cận nữa không giảm.
    assert.equal(price({ cityTier: 5, nearbyOpenBuildings: 10 }), reallyBig, 'khi chạm trần, thêm tòa không đổi giá');
    assert.ok(reallyBig <= baseValue * PRICE_CAP + 1e-9, 'không vượt PRICE_CAP × base');
    // Mức tiệm cận mà đúng bài yêu cầu: tier_max × (1 + NEARBY_BONUS×maxPeople) ≥ PRICE_CAP ⇒ kẹp.
    const maxPeople = 16;
    const rawAtMax = TIER_FACTOR[5] * (1 + NEARBY_BONUS * maxPeople);
    assert.ok(rawAtMax > PRICE_CAP, 'kịch bản tối đa vượt trần nên kẹp về PRICE_CAP');
  }

  // --- 5. cityTier ngoài dải bị kẹp an toàn (không index lỗi) ---
  assert.equal(parcelPrice({ basePrice: base, tileCount, landValueMultiplier: lvm, cityTier: -1 }), price({ cityTier: 0 }), 'tier âm = tier 0');
  assert.equal(parcelPrice({ basePrice: base, tileCount, landValueMultiplier: lvm, cityTier: 99 }), price({ cityTier: 5 }), 'tier quá lớn = tier 5');

  // --- 6. priceTrend đúng ---
  assert.equal(priceTrend(100, 120), 'up', 'tăng → up');
  assert.equal(priceTrend(120, 100), 'down', 'giảm → down');
  assert.equal(priceTrend(100, 100), 'flat', 'bằng → flat');
  assert.equal(priceTrend(undefined, 100), 'up', 'chưa có mốc trước coi là 0 → up');
  assert.equal(priceTrend(100, undefined), 'down', 'chưa có mốc sau coi là 0 → down');
  assert.equal(priceTrend(100, 100 + 1e-12), 'flat', 'sai số rất nhỏ vẫn flat');
}
