import assert from 'node:assert';
import {
  PROXIMITY_CLUSTER_CAP,
  PROXIMITY_CLUSTER_PAIR_BONUS,
  PROXIMITY_RADIUS,
  clusterMultiplierFor,
  legacyFoodClusterMultiplier,
  proximityBonusPair,
  withinRadius,
  type ClusterBuilding,
} from './proximity-cluster';

/**
 * Cụm theo khoảng cách (OpenSpec `open-world-districts-city-goals` D2b, task 1.5) — phần THUẦN / PROVISIONAL.
 * Chạy độc lập bằng `tsx src/proximity-cluster.test.ts`; `runProximityClusterTests()` có thể nối vào `test-runner.ts`.
 */

const b = (id: string, kind: ClusterBuilding['kind'], x: number, y: number): ClusterBuilding => ({ id, kind, x, y });

/** Bố trí mặc định W0: 2 tòa tạp hóa đặt gần nhau (cửa tới cửa), ví dụ food & grocery trong bán kính. */
const w0TwoGroceryNear: ClusterBuilding[] = [b('g', 'grocery', 0, 0), b('f', 'food', 3, 0)];

export function runProximityClusterTests(): void {
  // --- (c) không bổ trợ / tự với mình ⇒ 0 ---
  assert.equal(proximityBonusPair(b('a', 'office', 0, 0), b('b', 'office', 0, 0)), 0, '2 văn phòng không bổ trợ nhau');
  assert.equal(proximityBonusPair(b('a', 'grocery', 0, 0), b('b', 'grocery', 10, 10)), 0, 'tạp hóa ↔ tạp hóa không bổ trợ');
  assert.equal(proximityBonusPair(b('a', 'grocery', 0, 0), b('a', 'grocery', 0, 0)), 0, 'tự với chính mình = 0');
  assert.equal(proximityBonusPair(b('a', 'grocery', 0, 0), b('b', 'food', 10, 10)), PROXIMITY_CLUSTER_PAIR_BONUS, 'grocery ↔ food bổ trợ (không phụ thuộc thứ tự)');
  assert.equal(proximityBonusPair(b('a', 'food', 0, 0), b('b', 'grocery', 10, 10)), PROXIMITY_CLUSTER_PAIR_BONUS, 'food ↔ grocery bổ trợ (đối xứng)');
  assert.equal(proximityBonusPair(b('a', 'parking', 0, 0), b('b', 'office', 3, 0)), PROXIMITY_CLUSTER_PAIR_BONUS, 'bãi giữ xe ↔ văn phòng bổ trợ');
  assert.equal(proximityBonusPair(b('a', 'parking', 0, 0), b('b', 'parking', 3, 0)), PROXIMITY_CLUSTER_PAIR_BONUS, 'bãi giữ xe ↔ bãi giữ xe khác bổ trợ (mọi tòa)');
  assert.equal(proximityBonusPair(b('a', 'cafe', 0, 0), b('b', 'branch', 2, 2)), PROXIMITY_CLUSTER_PAIR_BONUS, 'cà phê ↔ chi nhánh bổ trợ');

  // --- withinRadius: Manhattan ≤ PROXIMITY_RADIUS ---
  assert.ok(withinRadius(b('a', 'grocery', 0, 0), b('b', 'food', 16, 0)), 'đúng 16 ô dọc vẫn trong bán kính');
  assert.ok(withinRadius(b('a', 'grocery', 0, 0), b('b', 'food', 8, 8)), 'manhattan 16 trong bán kính');
  assert.ok(!withinRadius(b('a', 'grocery', 0, 0), b('b', 'food', 0, 17)), '17 ô ngoài bán kính');
  assert.ok(!withinRadius(b('a', 'grocery', 0, 0), b('b', 'food', 9, 9)), 'manhattan 18 ngoài bán kính');

  // --- (a) ĐƠN ĐIỆU: thêm tòa bổ trợ gần không bao giờ giảm hệ số ---
  {
    const base: ClusterBuilding[] = [b('t', 'grocery', 0, 0)];
    const before = clusterMultiplierFor(base[0], base);
    // Thêm tòa food trong bán kính → hệ số không giảm (tăng hoặc giữ).
    const withFood = clusterMultiplierFor(base[0], [...base, b('f', 'food', 2, 0)]);
    assert.ok(withFood >= before, 'thêm tòa food gần không giảm hệ số');
    // Thêm tòa food ngoài bán kính / không bổ trợ → không đổi.
    assert.equal(clusterMultiplierFor(base[0], [...base, b('f', 'food', 0, 40)]), before, 'food ngoài bán kính không tăng');
    assert.equal(clusterMultiplierFor(base[0], [...base, b('o', 'office', 1, 0)]), before, 'tòa không bổ trợ (office↔grocery) không tăng');
    // Thêm nhiều tòa food gần → tăng dần, vẫn đơn điệu.
    const m1 = clusterMultiplierFor(base[0], [...base, b('f1', 'food', 1, 0)]);
    const m2 = clusterMultiplierFor(base[0], [...base, b('f1', 'food', 1, 0), b('f2', 'food', 2, 0)]);
    assert.ok(m2 >= m1, 'thêm tòa bổ trợ thứ hai không giảm');
  }

  // --- (b) TRẦN ×1,3 chặn ---
  {
    // Đủ nhiều tòa food quanh target grocery để vượt trần: 4 cặp → 1 + 4×0.10 = 1.40 > 1.3.
    const heavy: ClusterBuilding[] = [
      b('t', 'grocery', 0, 0),
      b('f1', 'food', 1, 0),
      b('f2', 'food', 0, 1),
      b('f3', 'food', -1, 0),
      b('f4', 'food', 0, -1),
    ];
    const val = clusterMultiplierFor(heavy[0], heavy);
    assert.equal(val, PROXIMITY_CLUSTER_CAP, 'trần ×1,3 chặn hệ số');
    assert.ok(val <= PROXIMITY_CLUSTER_CAP + 1e-9, 'không vượt trần');
    // Khi chạm trần, thêm tòa bổ trợ nữa không giảm (đơn điệu ở trần).
    const more = clusterMultiplierFor(heavy[0], [...heavy, b('f5', 'food', 2, 0)]);
    assert.equal(more, val, 'khi chạm trần, thêm tòa không đổi');
  }

  // --- (c) ngoài bán kính / không bổ trợ không cộng (không tăng vượt 1) ---
  {
    const alone = clusterMultiplierFor(b('t', 'grocery', 0, 0), [b('t', 'grocery', 0, 0)]);
    assert.equal(alone, 1, 'một mình, không tòa bổ trợ trong bán kính → hệ số 1');
    // Tòa bổ trợ nhưng ngoài bán kính → vẫn 1.
    const far = clusterMultiplierFor(b('t', 'grocery', 0, 0), [b('t', 'grocery', 0, 0), b('f', 'food', 0, 40)]);
    assert.equal(far, 1, 'tòa bổ trợ ngoài bán kính không cộng');
    // Tòa không bổ trợ dù gần → 1.
    const notCompat = clusterMultiplierFor(b('t', 'grocery', 0, 0), [b('t', 'grocery', 0, 0), b('o', 'office', 1, 0)]);
    assert.equal(notCompat, 1, 'tòa không bổ trợ gần không cộng');
  }

  // --- (d) W0 mặc định ≈ giá trị cụm cũ (kinh tế save cũ không đổi) ---
  {
    const target = w0TwoGroceryNear[0]; // tạp hóa tại W0
    const cluster = clusterMultiplierFor(target, w0TwoGroceryNear);
    const legacy = legacyFoodClusterMultiplier(1); // 1 tòa mở theo nghĩa cũ
    const diff = Math.abs(cluster - legacy);
    // PROVISIONAL: clúster = 1 + 0.10 = 1.10; legacy(1) = 1.10 → chênh 0.
    assert.ok(diff < 1e-6, `W0 mặc định khớp giá trị cũ: cluster=${cluster} legacy=${legacy} diff=${diff}`);
    assert.equal(cluster, legacy, 'chính xác: 2 tạp hóa gần nhau (1 cặp) = legacy(1 mở)');
  }

  // --- (e) CỤM (2 tòa gần) > RẢI RÁC (2 tòa xa) — khuyến khích đặt cụm ---
  {
    // 2 tòa bổ trợ ở trạ thái "2 tòa mở", cùng 1 cặp: gần vs xa.
    const nearTarget = b('t', 'grocery', 0, 0);
    const clustered = clusterMultiplierFor(nearTarget, [nearTarget, b('f', 'food', 2, 0)]);
    const scattered = clusterMultiplierFor(nearTarget, [nearTarget, b('f', 'food', 0, 40)]);
    assert.ok(clustered > scattered, 'tòa bổ trợ gần (cụm) hệ số cao hơn rải rác');
    assert.ok(clustered > 1, 'cụm gần thực sự tăng hệ số trên 1');
  }
}
