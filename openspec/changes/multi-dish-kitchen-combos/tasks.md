# Tasks

> Trạng thái: A (1.1–1.4), B (2.1–2.5), C (3.1–3.2), D (4.1–4.3) **đã làm + kiểm chứng thật**; **4.4 chờ máy thật/Browser QA**. Điểm lệch so với proposal được ghi chú trực tiếp ở từng task.

## A. Mở rộng công thức — bếp đa món (2 cửa hàng)

- [x] 1.1 `game-data/recipes.ts`: thêm **3 món xôi mới** vào `PRODUCED_PRODUCTS` + `Recipe` ở `stationShopId:'quay_xoi'` (dùng `nep_chin` + nguyên liệu bổ sung đã có). Món thực tế (khác id đề xuất, chọn món có nguyên liệu sẵn để không chạm catalog count): `xoi_thap_cam_tp` (Xôi thập cẩm, bán 22.000), `xoi_trung_cha_tp` (Xôi chà bông trứng, 18.000), `xoi_bap_tp` (Xôi bắp, 13.000); đều `category:'bread'`, cấp 36.
- [x] 1.2 `game-data/recipes.ts`: thêm **3 thức uống mới** vào `PRODUCED_PRODUCTS` + `Recipe` tại `drink_counter`/`blender`: `tra_sua_tp` (Trà sữa, 15.000, drink_counter lvl25), `sinh_to_xoai_tp` (Sinh tố xoài, 18.000, blender lvl26), `ca_phe_sua_da_tp` (Cà phê sữa đá, 14.000, drink_counter lvl26). Chỉ dùng nguyên liệu ĐÃ CÓ trong catalog ⇒ **không thêm nguyên liệu nền, không chạm** `catalog.test.ts` (291+…).
- [x] 1.3 Set tự nhận kệ: `XOI_DISH_IDS`/`DRINK_SHOP_PRODUCT_IDS` sinh từ `RECIPES` ⇒ món mới + combo tự vào set; xác nhận bằng `combos.test.ts` ("món xôi/đồ uống mới nằm trong set kệ"). Không sửa set tay.
- [x] 1.4 Test core + hồi quy: **PASS qua harness tsc→node** `verify-multi-dish-kitchen.mjs` (kể cả hồi quy `data-integrity.test.ts` gồm production/spoilage/seasons + `combo-production.test.ts` chứng minh `startProduction` chạy đúng).

## B. Combo — suất/bữa gộp (greenfield)

- [x] 2.1 `game-data/combos.ts` (mới): `interface Combo { id; name; shopStationShopId; memberProductIds (≥2, thành phẩm của shop); discountFraction; unlockLevel; basePopularity; description }` + `COMBOS` (Suất Xôi Đôi `combo_xoi_doi`, Combo Hai Ly `combo_nuoc_doi`; discount 0.1; cấp 36/26) + helper `comboProductId`/`comboSellingPrice`/`comboCost` + `validateCombos()` (member là thành phẩm đúng trạm, recipe lắp ráp đúng trạm, giá khớp) + export qua game-data index.
- [x] 2.2 Combo là thành phẩm + `Recipe` lắp ráp: chọn **biểu diễn tĩnh** — thêm các recipe combo trực tiếp vào `RECIPES` (`recipe_combo_xoi_doi`, `recipe_combo_nuoc_doi`) và thành phẩm combo vào `PRODUCED_PRODUCTS` (`combo_*_tp`, `category:'bread'`/`soft_drinks`, không intermediate), vì `PRODUCT_MAP`/`PRODUCED_PRODUCTS` là dữ liệu tĩnh. Không dùng generator runtime `comboRecipe()` trong proposal (sẽ làm mất tính tĩnh của catalog). input = member qty 1, output 1, duration ngắn, unlockLevel theo combo; `baseSellingPrice = Σ base(member) × (1−discount)` (38.700/26.100) khớp `validateCombos`.
- [x] 2.3 `game-core/combo-sales.ts` trong proposal — **gập vào `game-data/combos.ts`** (ghi chú trung thực): vì combo đi qua pipeline `Recipe`/`ProductionJob`/`consumeIngredients`(FEFO)/`addProductionOutput`(COGS=Σ unitCost) có sẵn, **không cần mã bán/lắp ráp riêng ở game-core**; `comboSellingPrice`/`comboCost`/member-check nằm ở `combos.ts`. Không tạo file tách ở game-core.
- [x] 2.4 Test: `combos.test.ts` (data: validate sạch, giá/vốn khớp, set kệ, recipe combo trong RECIPE_MAP) + `combo-production.test.ts` (core: `startProduction` combo tiêu member FEFO 1 & 1, ra 1 combo, COGS=Σ unitCost, thiếu member chặn không tiêu một phần, save additive không field mới). **PASS qua harness.**
- [x] 2.5 `simulation.startProduction` chạy đúng cho recipe combo (trạm là trạm shop: quay_xoi/drink_counter) — chứng minh bằng `combo-production.test.ts` + hồi quy list recipe.

## C. UI mobile-first

- [x] 3.1 `KitchenStationModal.tsx` thêm khối **"Combo suất tiết kiệm"**: liệt kê combo theo shop — tên, món thành viên (số kho cần có), giá combo vs tổng bán lẻ (gạch ngang), nút **Làm combo** (`start_production` sẵn có). Dùng cấu trúc `summary-row` + flex-wrap sẵn có ⇒ không tràn ngang ≤568 px; nút đạt `--touch`.
- [x] 3.2 Combo là sản phẩm bình thường (kệ/giỏ/planogram hỗ trợ sẵn `Product`, không logic riêng). Wire `App.tsx`: truyền `combos={COMBOS.filter(c => c.shopStationShopId === fixture.shopId)}` (không cần state/lazy-modal mới, dùng modal trạm sẵn có).

## D. Cân bằng & tài liệu

- [x] 4.1 `.qa/combo-balance.mjs` (harness tsc→node): so combo vs bán lẻ, 30 ngày theo tỉ lệ bundle. **PASS** — Suất Xôi Đôi lãi gộp 14.000₫, Combo Hai Ly 15.600₫ tại discount 10%; bundle 0→30→60% tăng doanh thu 10.06M→11.04M và lãi gộp 5.10M→5.24M, biên ≥47%. Không cần chỉnh discount/giá (đã hợp 8–15%); hằng số PROVISIONAL, playtest sau.
- [x] 4.2 `yarn typecheck` PASS (toàn workspace); eslint các file thay đổi 0 errors, 0 warnings; hồi quy rộng: `data-integrity.test.ts` + `combo-production.test.ts` trong `verify-multi-dish-kitchen.mjs` PASS.
- [x] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md` (mục GĐ4 — mục 5) + đánh dấu tiến độ tasks này. Done cùng đợt code.
- [ ] 4.4 **Chờ máy thật:** Browser QA — màn "Combo suất tiết kiệm" trong KitchenStationModal, kệ tòa (tiệm xôi/quán nước) tự nhận món mới + combo và bán được, viewport 568–740 px, co-op (nếu mở lệnh co-op mới — hiện tái dùng `start_production` nên không có lệnh mới).
