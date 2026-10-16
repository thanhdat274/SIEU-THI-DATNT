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
- [ ] 3.1 Mặt tiền 4 công trình — CHƯA: đang dùng mẫu tòa tạm (`provisionalTemplate`).
- [x] 3.2 Tab "Xóm phố" trong `CityModal` (QoL theo khu, công trình, lô trống → góp vốn xây) + 4 loại civic trong `OpenBuildingModal`. QA trình duyệt 1280×800 và 375×812 (không cuộn ngang, nút ≥ 44px). Chưa QA đủ 7 viewport.

## 4. Kiểm tra
- [x] 4.1 `yarn typecheck` PASS; `yarn --cwd packages/game-core test` EXIT 0 (112 pass, civic PASS, golden khớp) — 16/10/2026.
- [ ] 4.2 QA trình duyệt bấm xây thật + co-op 2 client thấy cùng QoL — CHƯA.

## 5. Co-op
- [x] 5.1 `open_building` civic đi qua `land-policy.ts` (`buy_plot`, giá `buildCost`) → phiếu khi > 30% quỹ, cấm khi quyền `none`; khóa lô qua `land-command-targets.ts`. Test `decideLandCommand` + `landCommandTargets`. Bỏ code chết `open_building_civic`.
