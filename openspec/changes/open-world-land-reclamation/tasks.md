# Tasks

Trạng thái 05/10/2026: mới có kế hoạch, chưa có code. Phụ thuộc `open-world-building-relocation` xong. D9 (`branch-chain`) đã chốt 05/10/2026.

## 0. Quyết định

- [x] 0.1 Chủ dự án chốt D9 (05/10/2026): chi nhánh = tòa trên cùng thành phố; đã ghi vào design này và `branch-chain/design.md`, `branch-chain/tasks.md`.
- [ ] 0.2 Chụp ảnh khu phố hiện tại ở các vùng W1–W4, chốt rect từng đợt và lô bằng ảnh.

## 1. Dữ liệu

- [ ] 1.1 `world/waves.ts`: `RECLAMATION_WAVES` (vùng, hạ tầng, lô, điều kiện, thi công); test không chồng, nằm trong biên, lô quay về đường. **(07/10/2026, CÓ CODE nhưng CHƯA đủ để đóng:** đã thêm `ReclamationWave`/`RECLAMATION_WAVES` (w0..w4, vùng/điều kiện cấp+tiền/thời gian thi công, `constructionDays`, `parcels` để trống) + `validateReclamationWaves()` (trong biên 120×80, không chồng, lô trong vùng) — test trong `world-model.test.ts`; **CÒN THIẾU: hạ tầng theo đợt (vỉa hè/đèn/cây/chỗ đỗ) và lô từng đợt với rect/góc ngã tư chính xác — khóa bởi task 0.2 (cần ảnh chụp browser), chưa điền `parcels`.**)
- [x] 1.2 `parcel.frontage`, `landValueMultiplier`, `trafficMultiplier`, `PARCEL_BASE_PRICE`, `WAVE_EXPANSION_BONUS` (provisional). **(07/10/2026, CÓ CODE + verify typecheck/build:** `LandParcel.frontage {corner}`, `FRONTAGE_VALUE`/`FRONTAGE_TRAFFIC` (D5: 1.6/1.0/1.0/0.6 giá, 1.25/1.0/0.9/0.75 khách), `ROAD_CATEGORY`, `PARCEL_BASE_PRICE=12.000`, `WAVE_EXPANSION_BONUS` (w1..w4 = 24), helper `parcelLandValueMultiplier`/`parcelTrafficMultiplier`/`parcelPrice`/`roadCategoryOf`/`frontagePosition`. Bản đồ ban đầu (W0) ra hệ số 1 nên golden trước không đổi. Test trong `world-model.test.ts`. Chưa nối vào `buy_parcel`/nhịp sinh khách — thuộc task 2.x.)**
- [ ] 1.3 `neighborhood.ts`: bỏ nhà trang trí trong vùng đợt đã mở; `cityTier` và hệ số NPC/xe/tầng nhà.

## 2. Core

- [ ] 2.1 Vùng chơi = hợp đợt đã mở; ô ngoài đợt trong hộp bao bị chặn; dựng bản đồ với `originTileX` âm/dương.
- [ ] 2.2 `reclaimWave`, thi công 2 ngày, mở đầu ngày; `buyParcel`; `validatePlacement` đòi lô đã sở hữu.
- [ ] 2.3 Khách: điểm sinh gần tòa đích; nhịp sinh nhân hệ số vị trí; cập nhật `*-balance-sim.ts` so ba vị trí.
- [ ] 2.4 Ngân sách mở rộng cộng thưởng theo đợt.

## 3. Save và server

- [x] 3.1 Schema 7 + migration 6→7 ở `shared`, `apps/web`, server; test. **(07/10/2026, CÓ CODE + verify typecheck + chạy hàm thuần:** `shared/index.ts` `CURRENT_SAVE_SCHEMA_VERSION=7`, type `WorldOpenState`/`ownedParcelIds`, `isWorldOpenState`, `defaultWorldOpenState`/`ownedParcelIdsDefault` (4 lô W0), migration `migrateToW7` cho v1–5→7 và v6→7; `game-core/simulation.ts` giờ khởi tạo + xuất/nạp đầy đủ `world`/`storeLayout.ownedParcelIds` và `schemaVersion: CURRENT` (cho nên save round-trip v7 không còn bị re-migrate mỗi lần); `game-data/map.ts` `DEFAULT_INITIAL_SAVE` nâng v7 + gieo `world`/`ownedParcelIds`; `apps/web/db.ts` và `apps/server/world-migrations.ts` tự chạy migration qua `CURRENT_SAVE_SCHEMA_VERSION`. Verify: `yarn typecheck` PASS; chạy node trực tiếp hàm `validateSaveGameData` (v6→7 hợp lệ, v7→supported giữ nguyên state, v8→unsupported_future) PASS; cập nhật test `persistence.test.ts`/`footprint.test.ts`/`test-runner.ts`. **Lưu ý:** KHÔNG chạy được toàn suite `yarn test` trong sandbox này (spawn EPERM) nên chưa tuyên bố PASS test — chỉ typecheck + hàm thuần.)**
- [ ] 3.2 Server: `reclaim_wave`, `buy_parcel` vào lệnh phát lại; `coop-commands.test.ts`.

## 4. Renderer và giao diện

- [ ] 4.1 Chia khối 16×16 + culling + cache khối tĩnh; đo FPS trước/sau.
- [ ] 4.2 Công trường: rào, máy xúc, công nhân NPC; nhà trang trí mờ dần.
- [ ] 4.3 Chế độ quy hoạch hiển thị đợt (khóa/đang thi công/mở), lô (giá, hệ số vị trí), mua lô; bảng "Thành phố" (tier, đợt).
- [ ] 4.4 Minimap/camera: giới hạn camera theo vùng chơi + lề khu phố.

## 5. Kiểm chứng và tài liệu

- [ ] 5.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (ghi kết quả thật).
- [ ] 5.2 Browser QA: mở W1, qua ngã tư, mua lô góc, đặt quán nước, khách tới; lưu/nạp; FPS; mobile; co-op. Ghi riêng từng mục.
- [ ] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
