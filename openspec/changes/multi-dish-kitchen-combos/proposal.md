# Proposal

## Why

Hai "bếp" của người chơi hiện là những dây sản xuất mảnh, chưa phải "bếp đa món" đúng nghĩa:

- **Tiệm xôi** (`xoi_shop`, cấp 36): chuỗi ngâm nếp → hấp nếp → múc ra đúng **4 món xôi** (`xoi_dau_xanh_tp`, `xoi_man_tp`, `xoi_trung_tp`, `xoi_dua_tp`) tại trạm `quay_xoi`. Nhiều món nhưng ít lựa chọn.
- **Quán nước** (cấp 46): đúng **3 thức uống nấu/ph chế** (`nuoc_mia`, `sinh_to_trai_cay`, `ca_phe_sua_pha`) tại `drink_counter`/`blender`/`sugarcane_press`.

Không có khái niệm **combo** (suất / bữa gộp món) nào: grep toàn repo chỉ thấy dùng từ "combo" không liên quan (danh hiệu "Combo tăng ca", sản phẩm "Combo rau củ hữu cơ", plot-combo của world-golden). Cơ chế gần nhất là `dining.ts` — khách mua xôi rồi *gọi thêm* trà đá/sữa đậu nành từ kho, nhưng đó là phụ thu thêm, không phải một đơn vị combo mua được.

Mục này nâng cả hai cửa hàng thành **bếp đa món** đúng nghĩa:
1. **Công thức** — mở rộng thực đơn: thêm món mới cho tiệm xôi và quán nước (món tự-nấu/pha chế theo đúng pipeline `Recipe` có sẵn: `stationShopId`, inputs FEFO, `outputQuantity`, `durationSeconds`, `unlockLevel`).
2. **Combo** — khái niệm "suất/bữa gộp" được định nghĩa lại (dữ liệu), bán như một đơn vị (kê kệ/giỏ/thanh toán), yêu cầu có đủ các món thành phần trong kho thành phẩm, giá combo = chiết khấu trung bình của thành phần → vừa tăng doanh thu vừa khuyến khích chạy nhiều công thức (chính là ý "bếp đa món").

## What Changes

### A. Bếp đa món — mở rộng công thức (2 cửa hàng)

- **Thực đơn tiệm xôi** (thêm 3–4 món xôi mới, cùng `quay_xoi`): ví dụ xôi gấc, xôi lá cẩm, xôi lạc, xôi khúc/ruốc — mỗi món 1 `Recipe` mới dùng `nep_chin` + nguyên liệu tương ứng, thêm 1 dòng `PRODUCED_PRODUCTS` (giá vốn ≈ nguyên liệu/suất, bán > vốn), tự nhận kệ qua `XOI_DISH_IDS` (set dựng từ `stationShopId === 'quay_xoi'` nên tự mở rộng, không cần sửa set).
- **Thực đơn quán nước** (thêm 3–4 thức uống): ví dụ trà sữa, nước ép dứa, cà phê sữa đá, trà tắc — mỗi món 1 `Recipe` mới tại `drink_counter`/`blender`/`sugarcane_press`, thêm dòng `PRODUCED_PRODUCTS`, tự nhận kệ qua `CAFE_SHOP_PRODUCT_IDS`/`SNACK_SHOP_PRODUCT_IDS` nếu cần.
- Tự nhận kệ và bán theo đúng luồng thành phẩm hiện có (`autoFillShelf`, `demandProfile.basePopularity`); **không** đổi cơ chế `Recipe`/`ProductionJob`/bản đồ hay schema.

### B. Combo (mới — data + bán + cân bằng)

- **`Product`-like "combo"**: thêm kiểu dữ liệu `Combo` (id, name, 2+ `memberProductIds` món thành phần, `discountFraction`, `unlockLevel`, `basePopularity`, sprite) trong `game-data`. Combo là **một đơn vị bán được** (kê kệ / giỏ khách / thanh toán) nhưng **không phải sản phẩm nguyên liệu**: khi khách chọn/mua combo, hệ thống **tiêu các món thành phần trong kho thành phẩm** theo FEFO (mượn `consumeIngredients`/`takeLots`).
- **Bán combo**: khách mua combo như một dòng giỏ; doanh thu = giá combo (tổng giá bán thành phần × (1 - discount)); sổ cái ghi như bán thành phẩm; COGS = giá vốn tích lũy của các thành phần đã tiêu (GAAP tương đương hàng tự sản xuất).
- **UI mobile-first**: kệ mới/metadata để khách mua; trong `KitchenStationModal`/`StoreLayoutModal`/`Planogram`/`WarehouseModal` hiển thị combo dưới dạng thẻ gộp; một màn nhỏ danh sách combo (hoặc tab trong `KitchenStationModal`) cho người chơi xem điều kiện cần có (đủ thành phần / hạn dùng) và bật-tắt bày bán.
- **Cân bằng**: `combo-balance-sim` (harness) ước doanh thu/lãi trần theo 30 ngày, chọn discount 8–15% và set combo sao cho mỗi combo tăng doanh thu ròng > 0 so với bán lẻ từng món, không lạm phát tồn.

### Tương thích save

Cả hai phần đều **cộng dồn (additive)**:
- Thêm sản phẩm/công thức/combo mới: không đổi schema — `productionJobs`, `PRODUCT_MAP`, `RECIPE_MAP` đều nạp từ dữ liệu tĩnh mid-run; `SaveGameData.comboSales?` (nếu cần theo dõi để balance/analytics) là field tùy chọn, không bump `schemaVersion` (giữ 10).
- Save cũ không có combo: tải bình thường, chỉ đơn giản combo chưa được bày/bán.

## Capabilities

### New Capabilities

- `multi-dish-kitchen`: tiệm xôi và quán nước là bếp đa món — thực đơn nhiều món (work `Recipe`) và combo (suất gộp) là đơn vị bán được, tiêu thành phần theo FEFO, có cân bằng riêng.

### Modified Capabilities

- (Không đổi spec capability có sẵn; mở rộng qua delta `multi-dish-kitchen`.)

## Non-goals

- Không đổi hình học/bản đồ/xuất nhập trong `land.ts`/`buildings.ts` cho hai cửa hàng (không thêm trạm nấu mới ở giai đoạn này; dùng trạm có sẵn).
- Không thay đổi cơ chế `Recipe`/`ProductionJob`/`start_production` đang chạy; combo **không** sinh sản phẩm vật lý riêng (không thành một SKU thật trong kho), chỉ gộp các thành phần có sẵn.
- Không đụng server/co-op ngoài lệnh `start_production` đã có (combo là logic thuần deterministic như các module cân bằng khác; quyết định co-op nào cần server replay ghi vào apply).
- Không tự động sinh/vẽ sprite mới (mượn sprite silhouette/pixel-art có sẵn theo category; sprite riêng để sau).

## Impact

`packages/game-data/src/recipes.ts` (+món mới), `recipes.ts` hoặc `combos.ts` (mới — `Combo` data + validate), `products.ts`/`products-expansion.ts` (nếu cần món nền), index; `packages/shared` (type `Combo` tùy chọn + field save tùy chọn, không bump schema), `packages/game-core` (`combo-sales.ts` thuần mới — mua combo tiêu thành phần FEFO + cân bằng sim), `simulation.ts` (nhận combo trong check-out nếu đã có luồng mua), `apps/web` (UI combo mobile-first — màn/tab + kệ), test (`combos.test.ts`, `multi-dish-kitchen.test.ts`, hồi quy xoi/drink), `.qa/` verifier, `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
