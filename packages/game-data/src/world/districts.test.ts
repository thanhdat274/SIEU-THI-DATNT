/**
 * Test thuần khu của thế giới mở (OpenSpec `open-world-districts-city-goals`, task 1.1 + 1.2 — THUẦN + PROVISIONAL).
 * Phạm vi: game-data. Chạy được độc lập (`tsx src/world/districts.test.ts`) hoặc qua `run*` đăng ký trong test-runner
 * (Lead nối sau).
 *
 * Phạm vi kiểm (ghi rõ):
 *   - Registry đủ 5 khu theo D1; mỗi khu hợp lệ: `peakHours` nằm trong 0..24 và `from < to`, hệ số peak trong dải,
 *     `preferredMultiplier` trong dải 1.2–1.4, một số khu phải có `preferredCategories` không rỗng.
 *   - `districtForWave` đúng 5 mapping W0..W4.
 *   - `districtPreferredMultiplier`: 1 cho category lạ, 1.2–1.4 cho category ưa chuộng.
 *   - `districtPeakMultiplier`: đúng hệ số trong khung giờ, ngoài khung = 1; nhiều khung chồng lấy max.
 *   - `applyDistrictModifiers`: tích không vượt `DISTRICT_MULTIPLIER_CAP`.
 *
 * GHÉP CHÚ: phần THUẦN — không gán `parcel.districtId`, không sửa `modifiers.ts`/NPC nền/renderer (chờ máy thật).
 */
import assert from 'node:assert/strict';
import {
  DISTRICTS,
  DISTRICT_MULTIPLIER_CAP,
  applyDistrictModifiers,
  districtForWave,
  districtPeakMultiplier,
  districtPreferredMultiplier,
} from './districts';
import type { DistrictId } from './districts';

export function runDistrictsTests(): void {
  console.log('\n--- Khu của thế giới mở theo đợt (D1/D2, task 1.1+1.2: registry + luật hệ số) ---');

  // --- Registry đủ 5 khu theo D1 ---
  const expectedDistrictIds: readonly DistrictId[] = [
    'hem_dan_cu', 'thuong_mai_nga_tu', 'dan_cu_nam', 'van_phong_logistics', 'am_thuc_nam',
  ];
  const registryIds = Object.keys(DISTRICTS) as DistrictId[];
  assert.deepEqual([...registryIds].sort(), [...expectedDistrictIds].sort(), 'registry có đúng 5 khu theo D1');

  // --- Mỗi khu hợp lệ ---
  for (const id of expectedDistrictIds) {
    const d = DISTRICTS[id];
    assert.ok(d, `khu ${id} tồn tại`);
    assert.equal(d.id, id, `district.id khớp khóa registry ${id}`);
    assert.ok(d.name.trim().length > 0, `khu ${id} có name`);
    assert.ok(d.kind.length > 0, `khu ${id} có kind`);
    assert.ok(Array.isArray(d.npcMix) && d.npcMix.length > 0, `khu ${id} có npcMix không rỗng`);

    // peakHours: khung hợp lệ 0..24, from < to, hệ số trong dải
    assert.ok(Array.isArray(d.peakHours) && d.peakHours.length > 0, `khu ${id} có ≥1 khung giờ cao điểm`);
    for (const peak of d.peakHours) {
      assert.ok(Number.isFinite(peak.fromHour) && Number.isFinite(peak.toHour), `khu ${id}: giờ khung phải là số`);
      assert.ok(peak.fromHour >= 0 && peak.fromHour < 24, `khu ${id}: fromHour ${peak.fromHour} trong 0..<24`);
      assert.ok(peak.toHour > 0 && peak.toHour <= 24, `khu ${id}: toHour ${peak.toHour} trong >0..24`);
      assert.ok(peak.fromHour < peak.toHour, `khu ${id}: fromHour < toHour`);
      assert.ok(peak.multiplier >= 1.05 && peak.multiplier <= 1.4, `khu ${id}: hệ số khung ${peak.multiplier} trong dải 1.05..1.4`);
    }

    // preferredMultiplier trong dải 1.2–1.4
    assert.ok(d.preferredMultiplier >= 1.2 && d.preferredMultiplier <= 1.4,
      `khu ${id}: preferredMultiplier ${d.preferredMultiplier} trong dải 1.2–1.4`);
    assert.ok(typeof d.visualTheme === 'string' && d.visualTheme.length > 0, `khu ${id} có visualTheme`);
  }

  // preferredCategories không rỗng cho một số khu (ở đây: tất cả 5 đều có nhóm ưa chuộng PROVISIONAL).
  for (const id of expectedDistrictIds) {
    assert.ok(DISTRICTS[id].preferredCategories.length > 0, `khu ${id} có preferredCategories không rỗng (PROVISIONAL)`);
  }

  // --- districtForWave: 5 mapping đúng D1 ---
  const expectedWaves: ReadonlyArray<readonly [string, DistrictId]> = [
    ['w0', 'hem_dan_cu'],
    ['w1', 'thuong_mai_nga_tu'],
    ['w2', 'dan_cu_nam'],
    ['w3', 'van_phong_logistics'],
    ['w4', 'am_thuc_nam'],
  ];
  for (const [wave, district] of expectedWaves) {
    assert.equal(districtForWave(wave as 'w0' | 'w1' | 'w2' | 'w3' | 'w4'), district, `districtForWave(${wave}) = ${district}`);
  }

  // --- districtPreferredMultiplier ---
  // Category lạ (không ưa chuộng) → 1.
  assert.equal(districtPreferredMultiplier('hem_dan_cu', 'alcohol'), 1, 'category lạ (không ưa chuộng) → 1');
  assert.equal(districtPreferredMultiplier('dan_cu_nam', 'toys_stationery'), 1, 'category lạ cho khu W2 → 1');
  assert.equal(districtPreferredMultiplier('am_thuc_nam', 'soft_drinks'), 1, 'category lạ cho khu W4 → 1');
  // Category ưa chuộng → 1.2–1.4 (đúng preferredMultiplier của khu).
  for (const id of expectedDistrictIds) {
    for (const cat of DISTRICTS[id].preferredCategories) {
      const m = districtPreferredMultiplier(id, cat);
      assert.ok(m >= 1.2 && m <= 1.4, `khu ${id}, category ${cat} → ${m} trong dải 1.2–1.4`);
      assert.equal(m, DISTRICTS[id].preferredMultiplier, `khu ${id}, category ${cat} → đúng preferredMultiplier của khu`);
    }
  }
  // Khu không tồn tại → 1 (hành vi an toàn).
  assert.equal(districtPreferredMultiplier('__unknown__' as DistrictId, 'snacks'), 1, 'khu không tồn tại → 1');

  // --- districtPeakMultiplier ---
  // Ngoài khung giờ → 1.
  assert.equal(districtPeakMultiplier('hem_dan_cu', 12), 1, 'W0 lúc 12h (ngoài khung) → 1');
  assert.equal(districtPeakMultiplier('am_thuc_nam', 8), 1, 'W4 lúc 8h (ngoài khung) → 1');
  // Trong khung → đúng hệ số khung.
  assert.equal(districtPeakMultiplier('van_phong_logistics', 7), 1.4, 'W3 lúc 7h (giờ vào văn phòng) → 1.4');
  assert.equal(districtPeakMultiplier('am_thuc_nam', 19), 1.4, 'W4 lúc 19h (giờ ăn tối) → 1.4');
  assert.equal(districtPeakMultiplier('thuong_mai_nga_tu', 12), 1.2, 'W1 lúc 12h (giờ trưa) → 1.2');
  // Khu không tồn tại → 1.
  assert.equal(districtPeakMultiplier('__unknown__' as DistrictId, 8), 1, 'khu không tồn tại → 1');

  // --- applyDistrictModifiers: tích không vượt cap ---
  for (const id of expectedDistrictIds) {
    // Quét từng giờ 0..23, mọi category ưa chuộng và lạ.
    for (const cat of [...DISTRICTS[id].preferredCategories, 'alcohol']) {
      for (let hour = 0; hour < 24; hour++) {
        const combined = applyDistrictModifiers(id, cat, hour);
        assert.ok(combined >= 1, `khu ${id}, cat ${cat}, h${hour}: hệ số >= 1`);
        assert.ok(combined <= DISTRICT_MULTIPLIER_CAP,
          `khu ${id}, cat ${cat}, h${hour}: ${combined} không vượt cap ${DISTRICT_MULTIPLIER_CAP}`);
      }
    }
  }
  // Chính xác một trường hợp đỉnh (factor ưa chuộng MAX × khung MAX = cap).
  // W3: cat ưa chuộng (mult 1.4) × khung 6.5–8.5 (1.4) = 1.96 > cap → kẹp về cap 1.82.
  assert.equal(applyDistrictModifiers('van_phong_logistics', 'instant_noodles', 7), DISTRICT_MULTIPLIER_CAP,
    'W3 đỉnh (1.4×1.4) bị kẹp về cap 1.82');
  assert.equal(applyDistrictModifiers('van_phong_logistics', 'alcohol', 7), 1.4,
    'W3 giờ cao điểm nhưng category lạ → chỉ nhân khung 1.4 (không vượt cap)');
  assert.equal(applyDistrictModifiers('hem_dan_cu', 'toys_stationery', 12), 1,
    'W0 ngoài khung + category lạ → 1');

  console.log('  ✓ registry 5 khu + mapping wave + luật hệ số (cầu ưa chuộng, khung giờ, cap) đạt');
}

declare const process: any;
// Chạy độc lập: `tsx src/world/districts.test.ts`.
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('districts.test')) {
  runDistrictsTests();
  console.log('\n🎉 KHU CỦA THẾ GIỚI MỞ (registry + luật hệ số) ĐẠT!\n');
}
