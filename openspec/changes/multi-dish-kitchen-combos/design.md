# Design

## Ngữ cảnh đã xác minh (đọc mã thật)

- **Binding là trạm, không phải tòa**: `Recipe.stationShopId` = `shopId` của trạm (FIXTURE_SHOP id: `thung_ngam`/`xung_hap`/`quay_xoi`; `drink_counter`/`blender`/`sugarcane_press`). Thực thi tại `simulation.startProduction` (simulation.ts L1250–1270). `allowedStationIds` chỉ kiểm trong test, không có cổng runtime.
- **"Món của shop" là các set sinh tự động từ RECIPES**: `XOI_DISH_IDS` (recipes.ts L103), `DRINK_SHOP_PRODUCT_IDS` (store-types.ts L62). Gating kệ ở `autoFillCandidates`/`autoFillShelf` (simulation.ts L5333–5415): kệ xôi tự nhận món xôi, kệ nước tự nhận `DRINK_SHOP_PRODUCT_IDS`.
- **Combo là greenfield hoàn toàn** (data/UI/pricing/demand đều chưa có).
- **Mỗi trạm chạy 1 mẻ một lúc**; đa món song song = nhiều trạm (mua thêm trạm qua FIXTURE_SHOP).

## 1. Bếp đa món — mở rộng công thức (A)

Thêm món mới thuần **additive**, tận dụng pipeline có sẵn (`Recipe` + `PRODUCED_PRODUCTS` + `startProduction` + `addProductionOutput` + `autoFillShelf`):

- **Tiệm xôi** (`quay_xoi`, cấp 36): thêm 3 món — ví dụ `xoi_gac_tp` (xôi gấc), `xoi_la_cam_tp` (xôi lá cẩm), `xoi_lac_tp` (xôi lạc rang). Mỗi món: 1 dòng `PRODUCED_PRODUCTS` (giá vốn ≈ nguyên liệu/suất, bán > vốn, `unlockLevel` ≥36, `category:'bread'`, sprite mượn pixel-art theo category), 1 `Recipe` ở `stationShopId:'quay_xoi'` dùng `nep_chin` + nguyên liệu bổ sung.
- **Quán nước** (`drink_counter`/`blender`/`sugarcane_press`, cấp 25+): thêm 3 thức uống — ví dụ `tra_sua_tp` (trà sữa, `drink_counter`), `nuoc_ep_dua_tp` (nước ép dứa, `blender`), `ca_phe_sua_da_tp` (cà phê sữa đá, `drink_counter`). Tương tự 1 dòng Product + 1 Recipe.
- **Tự nhận kệ**: vì `XOI_DISH_IDS`/`DRINK_SHOP_PRODUCT_IDS` sinh từ `RECIPES`, thêm recipe đúng `stationShopId` → kệ tòa tự nhận món mới, không sửa set tay.
- Nguyên liệu mới (nếu chưa có, ví dụ `gac`, `la_cam`, `sua_tuoi`, `dua`, `ca_phe_bot` nhớ là có) thêm vào catalog/product nền nếu thiếu, cấp phù hợp.

## 2. Combo — suất/bữa gộp (B, greenfield)

**Cách biểu diễn (Approach C — an toàn về kiến trúc):** combo là một **thành phẩm "suất/bữa"** có `Recipe` mà **nguyên liệu = các món thành phẩm của shop**. Tức combo được *lắp ráp* từ các món đã nấu ở chính shop, dùng đúng `consumeIngredients`/`addProductionOutput` FEFO có sẵn → ra đơn vị combo lên kệ, bán như món thường.

- **`game-data/combos.ts` (mới):** `interface Combo { id; name; shopStationShopId; memberProductIds: string[] (≥2, là thành phẩm của shop); discountFraction (8–15% PROVISIONAL); unlockLevel; basePopularity; spriteId; description }` + `COMBOS` + `validateCombos()` (member phải là thành phẩm PRODUCED của đúng shop, id unique).
- **Sinh Recipe từ Combo:** hàm `comboRecipe(combo)` trả `Recipe` với `stationShopId = combo.shopStationShopId`, `inputs = memberProductIds (quantity:1 each)`, `outputProductId = combo.id`, `outputQuantity = 1`, `durationSeconds` (lắp ráp nhanh, vd 15–20s), `unlockLevel = combo.unlockLevel`. Thêm các recipe combo vào `RECIPES` (data time) để đi qua đúng pipeline.
- **Giá combo:** `comboSellingPrice(combo)` = `Σ baseSellingPrice(member) × (1 − discountFraction)`; `comboInputCost` do `consumeIngredients` tính từ unitCost lô thành phần → COGS chính xác, GAAP lành mạnh (không tiền từ hư không).
- **Đầu ra** là sản phẩm `PRODUCED_PRODUCTS` (intermediate:false) → nằm trong set autoFill của shop (vì stationShopId đúng) → khách mua như món thường, checkout/ledger không đổi.

**Vì sao không tạo SKU "combo" riêng mua-food không qua sản xuất:** engine hiện tại là khách lấy từ kệ (shelf stock) + boost giá vốn theo lô. Lắp ráp qua Recipe tái sử dụng trọn pipeline (FEFO, job, kệ, checkout, sổ cái, save), deterministic, save cũ vô hại — rủi ro thấp nhất và đúng "bếp đa món" (nấu nhiều món rồi gộp). Ghi rõ như một quyết định thiết kế trong proposal/spec.

**UI mobile-first:**
- Tab "Combo" trong `KitchenStationModal` (bên cạnh các trạm) hoặc `ComboModal` riêng (nút HUD khu bếp): liệt kê combo theo shop, mỗi thẻ gộp hiện tên, món thành viên (với số lượng cần có), giá combo vs tổng giá lẻ (tiết kiệm %), unlockLevel; lưới container/density hiện có.
- `StoreLayoutModal`/`WarehouseModal`/`Planogram`: combo là sản phẩm bình thường, không cần logic riêng; chỉ cần màn danh sách combo để bật/tắt + xem điều kiện.

## 3. Tương thích save

Cả A và B đều additive:
- Thêm `PRODUCED_PRODUCTS`/`RECIPES`/`COMBOS`: dữ liệu tĩnh, không bump save.
- `productionJobs`, `PRODUCT_MAP`, `RECIPE_MAP` nạp từ tham chiếu cấu hình; không thêm trường save bắt buộc.
- Nếu cần theo dõi doanh số/thành tích combo: `SaveGameData.comboSales?` (optional array) — không bump `schemaVersion` (giữ 10). Nếu không cần analytics riêng, bỏ luôn field.

## 4. Cân bằng (balance)

`.qa/combo-balance.mjs` (harness tsc→node): 30 ngày, kệ đầy, từng combo vs bán lẻ từng món:
- AS-IS (món cũ) → lãi gộp/ngày p50.
- VỚI combo: doanh thu trần, lãi gộp, % thay đổi so với chỉ bán lẻ.
- Tiêu chí: mỗi combo tăng doanh thu ròng > 0 và duy trì lãi gộp không âm ở discount 8–15%; chỉnh `discountFraction`/giá nếu cần. PROVISIONAL, playtest sau.

## 5. Kiểm chứng & tài liệu

- Harness tsc→node: `combos.test.ts` (data + validate + recipe sinh + giá), `combo-sales.test.ts` (mua combo tiêu member FEFO, COGS, thiếu member chặn), hồi quy `production`, `xoi`, `drink-customers`/`xoi-customers`.
- `yarn typecheck` PASS; eslint 0 errors (warnings pre-existing).
- Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md` trong cùng đợt.
- **Chờ máy thật:** Browser QA — màn combo, kệ tòa tự nhận món mới/combo, viewport 568–740 px, co-op nếu có lệnh mới.

## 6. Rủi ro / giới hạn

- **Đa món song song** cần nhiều trạm (mỗi trạm 1 mẻ) — nêu rõ trong UI; ngoài phạm vi đổi mô hình job.
- Nếu playtest thấy combo thừa thãi/hút mất doanh thu bán lẻ, chỉnh discount (hằng số PROVISIONAL, change riêng).
- `yarn test`/`build` chuẩn có thể EPERM sandbox → kiểm qua harness tsc→node như mọi giai đoạn.
- Co-op: `start_production` đã được server replay; nếu combo chỉ là recipe thì đi đúng lệnh có sẵn, không cần lệnh mới.
