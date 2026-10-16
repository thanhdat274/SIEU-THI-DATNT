# Spec Delta

## Purpose

Biến tiệm xôi và quán nước thành **bếp đa món**: thực đơn nhiều món tự-nấu/pha-chế (mở rộng qua `Recipe`), và định nghĩa **combo** — suất/bữa gộp các thành phẩm thành một đơn vị bán được, tiêu các thành phần theo FEFO, có cân bằng riêng. Deterministic và chơi lẻ = chơi chung.

## ADDED Requirements

### Requirement: Multi-dish menu expansion

Tiệm xôi và quán nước SHALL có thực đơn nhiều món hơn hiện tại: mỗi cửa hàng thêm ≥3 món tự-nấu/pha-chế mới, mỗi món là một `Recipe` (`stationShopId` thuộc trạm của cửa hàng đó, `inputs` lấy nguyên liệu có sẵn, đầu ra là `PRODUCED_PRODUCTS` mới với giá vốn ≈ nguyên liệu/suất và giá bán > giá vốn), và món mới tự nhận kệ qua set thành phẩm của cửa hàng (`XOI_DISH_IDS`, `SNACK_SHOP_PRODUCT_IDS`, `CAFE_SHOP_PRODUCT_IDS`) — không cần sửa set bằng tay.

#### Scenario: New xoi dish unlocks and sells
- **WHEN** người chơi mở công thức xôi mới (đủ cấp) và nấu tại `quay_xoi`
- **THEN** món xôi mới xuất hiện như thành phẩm, kệ tiệm xôi tự nhận, và món bán được như các món xôi cũ

#### Scenario: New drink unlocks and sells
- **WHEN** người chơi mở công thức thức uống mới và pha tại `drink_counter`/`blender`/`sugarcane_press`
- **THEN** thức uống mới xuất hiện như thành phẩm, tự nhận kệ phù hợp, và bán được

#### Scenario: Expansion is additive
- **WHEN** tải một save cũ không có các món/nguyên liệu mới
- **THEN** save vẫn tải và chơi bình thường; món mới là tùy chọn khi đủ cấp, không bump `schemaVersion`

### Requirement: Combo as a purchasable unit

Hệ thống SHALL định nghĩa `Combo` (id, name, ≥2 `memberProductIds` là các thành phẩm, `discountFraction` < 1, `unlockLevel`, `basePopularity`, mô tả). Một combo SHALL bán được như một đơn vị (xuất hiện trong giỏ/thanh toán/kệ) nhưng không trở thành một SKU riêng trong kho.

#### Scenario: Combo needs all members
- **WHEN** khách chọn/mua một combo
- **THEN** hệ thống tiêu mỗi món thành phần trong kho thành phẩm theo FEFO, một đơn vị mỗi món, và doanh thu bằng tổng giá bán thành phần × (1 − discount); nếu thiếu bất kỳ thành phần nào thì combo không thể hoàn tất

#### Scenario: Member shortfall blocks the combo
- **WHEN** kho không đủ toàn bộ các món thành phần của combo
- **THEN** combo không bán được cho khách (khách không lấy combo khi thiếu thành phần, hoặc checkout từ chối), các thành phần hiện có không bị tiêu một phần

### Requirement: Combo COGS and ledger

Sổ cái SHALL ghi doanh thu combo là tiền bán; giá vốn combo SHALL bằng tổng giá vốn (unitCost lô) của các thành phần đã tiêu — xử lý như doanh thu/COGS của hàng tự sản xuất, không tạo tiền từ hư không.

#### Scenario: Combo sale contributes profit properly
- **WHEN** một combo được bán
- **THEN** doanh thu và COGS phản ánh đúng các thành phần đã tiêu, lãi gộp = doanh thu combo − COGS, không trừ trùng khoản mua ai

### Requirement: Combo balance

Mỗi combo định nghĩa SHALL được kiểm cân bằng: discount trung bình (8–15% PROVISIONAL) sao cho bán combo có lãi gộp ròng > bán lẻ từng món trong cùng ngày, không làm thâm hụt tồn lạm phát.

#### Scenario: Combo better than retail per sale
- **WHEN** so sánh một lượt bán combo với bán lẻ từng thành phần
- **THEN** combo mang về doanh thu gộp thấp hơn tổng bán lẻ (đúng bản chất chiết khấu) nhưng lãi gộp theo đúng phần trăm discount hợp lý và không âm

### Requirement: UI mobile-first for kitchen and combos

Giao diện SHALL mobile-first: người chơi xem được món/trạm của từng bếp đa món (có sẵn `KitchenStationModal`), và xem/lật danh sách combo kèm điều kiện đủ thành phần; các màn này dùng lưới container/density hiện có, không tràn ngang ở viewport hẹp 568–740 px.

#### Scenario: Combo list on narrow viewport
- **WHEN** mở màn danh sách combo ở viewport 568×320
- **THEN** không tràn ngang trang, các thể combo xếp gọn trong container, mọi nút đạt `--touch` kích thước tối thiểu

### Requirement: Save compatibility

Save cũ (không có combo/không có món mới) SHALL tải và chơi bình thường; mọi state combo (nếu lưu) là field tùy chọn; không bump `schemaVersion`.

#### Scenario: Old save unchanged
- **WHEN** tải save schema 10 được tạo trước change này
- **THEN** trò chơi tiếp tục chạy, món mới chưa bị ép mở, combo chỉ xuất hiện khi người chơi bày bán
