# Tasks

Trạng thái 07/10/2026: phần THUẦN AN TOÀN của 1.1/1.2 (DistrictDef registry + luật khu), 1.5 (cụm theo khoảng cách D2b), 2.1/1.4/2.4 (CityGoalDef + mô phỏng) ĐÃ CÓ CODE (module + test), CÓ NỐI trong test-runner + game-data index, typecheck workspace PASS; phần đụng data-file có sẵn/lệnh/server/UI/schema/minimap (gán `parcel.districtId` lên Parcel, sửa `modifiers.ts` source:'district'+when.districtId, lệnh `claim_city_goal`/lên cấp/thưởng + `cityTier` theo cấp + điều kiện cấp thành phố cho reclaim_wave, đồ công cộng/decor, biển kỷ niệm/nhật ký mốc, minimap IndexedDB, test/build/browser) CHỜ MÁY THẬT. Phụ thuộc `open-world-land-reclamation`, sau `open-world-building-types`.

**Ghi chú phần thuần vòng 6 đã làm (3 subagent, 07/10/2026):**
- 1.1/1.2 THUẦN: `game-data/world/districts.ts` — `DistrictId` (5 khu W0..W4 theo D1) + `DistrictDef` (kind, npcMix, peakHours, preferredCategories, preferredMultiplier 1.2–1.4, visualTheme) + `DISTRICTS` registry + `districtForWave` (wave→khu) + `districtPreferredMultiplier` (1 nếu không ưa chuộng) + `districtPeakMultiplier` (đúng khung, nhiều khung chồng lấy max) + `applyDistrictModifiers` (preferred×peak, kẹp trần `DISTRICT_MULTIPLIER_CAP`=1.82). Test `runDistrictsTests`. CHƯA sửa `Parcel`/`modifiers.ts`.
- 1.5 THUẦN (D2b): `game-core/proximity-cluster.ts` — `BLBuildingKind`/`ClusterBuilding`, `PROXIMITY_RADIUS`=16 (Manhattan cửa→cửa), `PROXIMITY_CLUSTER_CAP`=1.3, `PROXIMITY_CLUSTER_PAIR_BONUS`=0.10/cặp (PROVISIONAL — chọn để W0 mặc định = hệ số cụm cũ), `CLUSTER_COMPAT` (grocery↔food, cafe↔office, cafe↔branch, parking↔mọi), `proximityBonusPair`/`withinRadius`/`clusterMultiplierFor` (đơn điệu, cap 1.3) + `legacyFoodClusterMultiplier` (đối chiếu W0 = 1.10). Test `runProximityClusterTests`. CHƯA thay `foodClusterMultiplier` thật trong customers.ts.
- 2.1/1.4/2.4 THUẦN: `game-data/world/city-goals.ts` — `CityGoalKind` (6 loại) + `CityGoalDef` + `CITY_GOALS_CATALOG` cấp 1–10 + `CITY_LEVEL_WAVE_REQUIREMENT` (W1:2,W2:4,W3:6,W4:8) + `cityTierFromCityLevel` = min(5, floor(level/2)) + `cityProgress` (metrics→done). Test `runCityGoalsTests`. `game-core/city-goals-sim.ts` — `simulateGoalProgression` (60–90 ngày: lên cấp khi allGoalsDone, cộng reward, cityTier theo D3, mở đợt theo điều kiện cấp) + helper ẩm thực khu (tích hệ số không vượt cap). Test `runCityGoalsSimTests`.
- Wire: game-data index thêm export `districts`+`districts.test`+`city-goals`+`city-goals.test`; test-runner nối 4 test (`runDistrictsTests`/`runProximityClusterTests`/`runCityGoalsTests`/`runCityGoalsSimTests`). `yarn typecheck` toàn workspace PASS (9.33s); `git diff --check` sạch. Runtime chờ máy thật (`spawn EPERM`; subagent verify bằng node CJS — assert PASS, KHÔNG qua suite chuẩn).
- LƯU Ý nối thật: `ModifierSource` của shared hiện CHƯA có 'district' (LEAD cần thêm khi nối); `preferredMultiplier`/`peakHours`/`CLUSTER_COMPAT`/`PROXIMITY_CLUSTER_PAIR_BONUS`/catalog cấp 1–10 là PROVISIONAL chờ playtest; `cityTier` của Bước 4 cần bỏ công thức tự động → theo cấp (D3) khi nối thật.
- CHỜ MÁY THẬT (chưa làm — ngoài phạm vi sandbox): 1.1 gán `parcel.districtId` (provisional W0..W4, lô góc lấy khu đường giáp mặt) + `ModifierSource 'district'` + `when.districtId` trong modifiers.ts; 1.2 thêm source/when + validation dữ liệu (nhóm hàng + giờ cao điểm); 1.3 NPC nền theo `npcMix` + giao diện chủ đề khu; 1.4 mô phỏng cà phê/ăn vặt hai khu + kiểm tích hệ số; 1.5 thay `foodClusterMultiplier` thật trong customers.ts; 2.2 lệnh `claim_city_goal` + lên cấp + thưởng + `cityTier` theo cấp + điều kiện cấp thành phố cho `reclaim_wave`; 2.3 đồ công cộng làm thưởng + đặt vị trí định sẵn + sức hút qua `decor.ts`; 2.4 mô phỏng tiến độ 60–90 ngày nối thật; 3.1 biển kỷ niệm + nhật ký mốc; 3.2 minimap IndexedDB (max 10, xem trong bảng Thành phố, không bắt buộc nghiệm thu); 4.1 schema kế tiếp + migration (cityProgress {level, claimedCityGoalIds, milestones[]}, cấp suy từ cityTier cũ); 4.2 typecheck/test/build/Browser QA/co-op (máy thật); 4.3 docs tổng hợp.

## 1. Khu vực

- [ ] 1.1 `DistrictDef`, gán `parcel.districtId` cho W0–W4 (provisional); test mọi lô có khu.
- [ ] 1.2 `modifiers.ts`: `source: 'district'`, `when.districtId`; luật nhóm hàng và giờ cao điểm; kiểm hợp lệ dữ liệu.
- [ ] 1.3 NPC nền theo `npcMix` của khu; giao diện chủ đề khu (biển tên khu, màu vỉa hè/đèn nhẹ).
- [ ] 1.4 Mô phỏng cà phê/ăn vặt ở hai khu; kiểm tích hệ số không vượt trần.
- [ ] 1.5 Cụm theo khoảng cách (D2b): bảng cặp bổ trợ, bán kính 16 ô, trần; thay `foodClusterMultiplier`; test bằng giá trị cũ ở W0 và cụm > rải rác.

## 2. Cấp và mục tiêu thành phố

- [ ] 2.1 `CityGoalDef` + dữ liệu cấp 1–10 (provisional); tính tiến độ từ save.
- [ ] 2.2 Lệnh `claim_city_goal`, lên cấp, thưởng; `cityTier` theo cấp; điều kiện cấp thành phố cho `reclaim_wave`.
- [ ] 2.3 Đồ công cộng làm thưởng, đặt ở vị trí định sẵn, sức hút qua hệ trang trí `decor.ts`.
- [ ] 2.4 Mô phỏng tiến độ 60–90 ngày; chỉnh mục tiêu.

## 3. Ký ức thành phố

- [ ] 3.1 Biển kỷ niệm; nhật ký mốc (dùng nhật ký Bước 5).
- [ ] 3.2 Ảnh minimap nhỏ lưu IndexedDB (tối đa 10), xem trong bảng Thành phố.

## 4. Save, kiểm chứng, tài liệu

- [ ] 4.1 Schema kế tiếp + migration (cấp thành phố suy từ `cityTier` cũ); server phát lại lệnh mới; test.
- [ ] 4.2 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); Browser QA, co-op.
- [ ] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
