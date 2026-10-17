# Tasks: civic-buildings-qol

## 1. Dữ liệu
- [x] 1.1 `game-data/world/civic.ts` + `CIVIC_DEFS` + `validateCivicDefs()`; export qua index. `CIVIC_DEFS` là nguồn duy nhất (service/qolPoints/radius/buildCost/upkeepPerDay); bỏ `minCityLevel`, cấp mở khóa dùng `unlockLevel` (cấp người chơi).
- [x] 1.2 4 `BuildingTypeId` + `BuildingTypeDef` (không quầy thu ngân, không bán hàng, `maxInstances` 2); footprint đặt hợp lệ trên lô thật (test bằng `validatePlacement`).

## 2. Core
- [x] 2.1 `game-core/civic-qol.ts`: `computeCivicQol` thuần + test (trong [0,100], giảm theo khoảng cách, chống trùng, trần, tất định). Tâm khu đo trên hàng vỉa hè mặt tiền (sửa 16/10/2026).
- [x] 2.2 `open_building` nhận loại civic (giá `buildCost`); chặn khi thiếu cấp / thiếu tiền; test qua `GameSimulation` + hash trạng thái tất định. (Server dùng cùng `GameSimulation`; chưa chạy test replay qua `WorldRuntime`.)
- [x] 2.3 Nối `ward_police` vào `security.ts` qua tham số; `getCivicPoliceInfo` dùng `resolvePlacements`; test xác suất có trần + đồn trong/ngoài bán kính.
- [x] 2.4 Golden: save không công trình → "Golden thế giới … khớp golden" PASS.

## 3. Hình + UI
- [~] 3.1 Mặt tiền 4 công trình (`civic_park`, `civic_clinic`, `civic_ward_police`, `civic_primary_school` + 4 bản `_night`) và 48 khung NPC nghiêng ngang look 6–9: đóng gói vào atlas riêng `apps/web/public/assets/sprites/civic/` (`civic.png` + `civic.json`), đăng ký vào `index.json`. Renderer `viewport.ts` ưu tiên sprite atlas trên `wallLayer` (zIndex = top×32 + 50), tự động chuyển texture ngày/đêm theo `streetLightStrength(light) > 0.5`, bỏ qua biển hiệu code thương mại. Fallback nếu thiếu atlas. Test `civic-atlas.test.ts` PASS 56/56 khung + khớp `doorTiles`. QA D2 17/10/2026 (đã nhìn trong game): trạm y tế/đồn/công viên cửa đúng tâm, ngày/đêm đổi 18:10–18:20 và 6:40–6:50 không nhấp nháy, rào thi công đúng cửa. Sửa lỗi QA D2 (17/10/2026): khóa NPC gộp theo thứ tự `index.json` + residents bỏ khung nghiêng (test `sprite-atlas-order`); hai civic không chung cột (test `civic-placement-overlap`); bảng/rào thi công căn giữa sprite (đo trong game 4 loại); test pixel `civic-door-pixels` PASS với civic.png mới (trường có cổng 96%). CÒN: QA hai client; lòng cổng trường là gạch sáng (không cánh cửa) — chờ chủ dự án duyệt; lỗi lệch `spriteVariant`→look cư dân đã sửa (test `npc-look`); NPC 375×812/667×375 chưa kiểm.
- [x] 3.2 Tab "Xóm phố" trong `CityModal` (QoL theo khu, công trình, lô trống → góp vốn xây) + 4 loại civic trong `OpenBuildingModal`. QA trình duyệt 1280×800 và 375×812 (không cuộn ngang, nút ≥ 44px). Chưa QA đủ 7 viewport.

## 4. Kiểm tra
- [x] 4.1 `yarn typecheck` PASS; `yarn --cwd packages/game-core test` EXIT 0 (112 pass, civic PASS, golden khớp) — 16/10/2026.
- [~] 4.2 QA trình duyệt bấm xây thật + co-op 2 client thấy cùng QoL — QA 2 client 17/10/2026 (Bước C): hai thẻ Browser pane cùng localhost, thẻ B ép id khách `b` bằng shim `Storage.getItem` ở thẻ đó (giao diện thật cả hai; hẻm "QA BuocC" gieo save qua DB: cấp 25, 20tr, sổ gần đủ). ĐÃ KIỂM CHỨNG: A bấm xây công viên/trạm y tế thật, cả hai thấy cùng công trình, cùng QoL (24,42 → 27,89), hash trạng thái dân sự giống hệt. Phát hiện: công viên ở lô `lot-west` ngoài bán kính → +0 QoL (bản tin ghi đúng "nằm ngoài bán kính"). CHƯA: mặt tiền riêng (3.1), QA đa viewport.

## 5. Co-op
- [x] 5.1 `open_building` civic đi qua `land-policy.ts` (`buy_plot`, giá `buildCost`) → phiếu khi > 30% quỹ, cấm khi quyền `none`; khóa lô qua `land-command-targets.ts`. Test `decideLandCommand` + `landCommandTargets`. Bỏ code chết `open_building_civic`.

- [x] BƯỚC C (17/10/2026): QA 2 giao diện thật (2 tab, khách dev b/a) — kết quả của change này xem `tổng hợp.md` mục BƯỚC C (C3).
