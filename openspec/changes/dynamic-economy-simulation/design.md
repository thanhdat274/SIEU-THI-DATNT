# Design

## Context

Phân tích từ mã hiện tại (đọc-only, 30/09/2026). Lý do và phạm vi: xem `proposal.md`.

### Đã có (tái dùng nguyên trạng)

| Khối | Vị trí | Hiện trạng |
|---|---|---|
| Đồng hồ | `game-core/clock.ts` | ngày/giờ/phút, `onDayChanged`, `onTimeChanged` mỗi phút game; chưa có thứ trong tuần |
| Mùa | `game-data/seasons.ts` | 4 sự kiện/chu kỳ 120 ngày, `demandMultiplier`, `preferredCategories`, `stallMultiplier`; không có dữ liệu theo sản phẩm, nhà cung cấp, khuyến mãi |
| Khách | `game-core/customers.ts` | `maybeSpawnCustomer(…, demandMultiplier, preferredCategories)`: chu kỳ 12s ÷ hệ số, chọn kệ xoay vòng (một nửa nghiêng nhóm mùa); tối đa 2 khách cùng lúc |
| Sản phẩm | `game-data/products.ts` | 56 món; `demandProfile.basePopularity`, `expirationRules.daysToSpoil`, `storageType` ambient/cold, `unlockLevel`; giá bán/nhập cố định |
| Kho/lô | `game-core/stock.ts`, `simulation.ts` | lô FEFO có `unitCost`, `expiresOnDay`; hàng hết hạn bị loại khi sang ngày và ghi sổ hàng hỏng; kho mát có sức chứa |
| Nhà cung cấp | `game-data/suppliers.ts`, `simulation.ts` | 3 mối với `discountRate`, `minOrderValue`, `delayDays`; giỏ kiểm tra nguyên tử; giá/tồn không đổi theo thời gian |
| Gợi ý nhập | `game-core/suggestions.ts` | vận tốc bán 3/7 ngày, cắt theo ngân sách/kho mát/mối; chưa biết mùa/thời tiết |
| Quầy ăn | `game-core/stalls.ts` | nhu cầu/ngày nhân mùa và uy tín; tiêu nguyên liệu kho |
| Sổ/báo cáo | `DailyRecord`, `LedgerEntry` | doanh thu, cogs, hỏng, `productSales` mỗi ngày |
| Co-op | `world-runtime.ts`, `GameCommand` | server authoritative, lệnh có ID, revision, receipt |
| RNG xác định | `game-core/staff.ts` | `Mulberry32Rng`, `daySeed` |

### Cần mở rộng

- `seasons.ts` → định nghĩa dữ liệu đầy đủ (mục 1 bên dưới); giữ `getSeasonForDay` cho quầy/HUD.
- `customers.ts` → chọn kệ theo trọng số nhu cầu và nhận hệ số lưu lượng tổng; vẫn dùng đường cũ khi không có bảng nhu cầu.
- `SupplierConfig` → thêm trường tùy chọn (`restockDays`, `priceVolatility`, `categoryStock`, `bulkTiers`).
- `stock.ts`/`simulation.expireStock` → tốc độ hỏng theo điều kiện bảo quản.
- `suggestions.ts` → đọc nhu cầu dự kiến khi có.
- `Product` → thẻ (tag) suy ra từ bảng `product-tags.ts` (không sửa 56 món).

### Chưa có (tạo mới)

Thời tiết; thứ/giờ theo khung; sự kiện thị trường; bộ chỉnh dữ liệu; động cơ nhu cầu có phân rã; giá tham chiếu trôi dần; thị trường nhà cung cấp (giá/tồn theo ngày, ngừng cung, ưu đãi); hỏng theo điều kiện; bảng lập kế hoạch tồn kho; giải thích nguyên nhân trên giao diện; sản phẩm còn thiếu trong catalog (kem, ô/áo mưa, đồ uống nóng, thịt/rau tươi).

### Ràng buộc quan sát được

- Catalog có đúng 56 món và `catalog.test.ts` khẳng định điều đó; thêm sản phẩm phải cập nhật test, `catalog-manifest.ts` và icon pixel (`productPixels`).
- `maxConcurrentCustomers = 2` và 3 ô hàng đợi giới hạn khả năng tăng lưu lượng.
- Save không có `market` phải tải được; bản co-op gửi toàn bộ `save` qua lệnh nên trạng thái thị trường phải nằm trong save và xác định theo hạt giống.
- Đặt hàng nhà cung cấp đã có đường commit co-op (`handleSupplierCartOrder`); giá/tồn mới phải kiểm tra phía server runtime, không chỉ client.

## Goals / Non-Goals

**Goals:**
- Một nguồn sự thật cho bộ chỉnh (mùa/thời tiết/giờ/sự kiện) dùng chung bởi nhu cầu, lưu lượng, giá sỉ, tồn nhà cung cấp và hỏng.
- Xác định, tái lập được, phân rã được; tính theo khoảng thời gian, không mỗi khung hình.
- Mỗi đợt phát hành tự chơi được; tắt toàn bộ hệ thống (không bảng thị trường) = hành vi hiện tại.
- Thêm mùa/thời tiết/sự kiện/sản phẩm/nhà cung cấp chỉ bằng dữ liệu.

**Non-Goals:**
- Kinh tế giữa người chơi với nhau, sàn giao dịch, đầu cơ dài hạn.
- Mô phỏng từng khách có ví/tâm lý riêng (không đổi sang agent đầy đủ).
- Thay engine, đổi renderer, thêm dependency.
- Tự động hóa quyết định (tự nhập/tự đặt giá).
- Đơn tiệc, ngày hội thưởng, khách quen (thuộc `stardew-inspired-management-loop`).

## Decisions

### D1. Bộ chỉnh dữ liệu (modifier rules) làm lõi
Một kiểu duy nhất: `ModifierRule { id, label, source: season|weather|time|event, when?, target: {categories?, tags?, productIds?}, effects: {demand?, traffic?, wholesalePrice?, supplierStock?, spoilage?, priceSensitivity?}, range }`. Mỗi hệ đọc trường `effects` của nó. Hệ số cùng kênh được nhân rồi kẹp theo dải kênh (ví dụ nhu cầu [0.2, 3.0]); phân rã giữ từng hệ số để giải thích (D9).
- *Vì sao*: thêm hành vi mới chỉ thêm dữ liệu; yêu cầu "không hard-code theo món".
- *Thay thế bị loại*: bảng riêng cho mỗi hệ (mùa→nhu cầu, thời tiết→nhu cầu…): trùng lặp, dễ lệch, khó giải thích.

### D2. Thẻ sản phẩm thay vì sửa từng món
`game-data/product-tags.ts` ánh xạ `category`/`productId` → thẻ (`cold_drink`, `hot_drink`, `hot_food`, `frozen`, `breakfast`, `snack`, `rain_gear`, `fresh`, `household`…). Bộ chỉnh nhắm vào thẻ. Sản phẩm mới chỉ cần gắn thẻ.
- *Vì sao*: 56 món (và sắp nhiều hơn) đã dùng `category`; thẻ cho phép một món thuộc nhiều nhóm.

### D3. Thời tiết xác định: chuỗi Markov theo mùa, hạt giống theo thế giới
`weatherFor(seed, day)` lấy thời tiết hôm trước làm điều kiện, ma trận chuyển theo mùa nằm trong dữ liệu; tính tiến từ ngày đã lưu (`market.weather = {day, today, forecast[2]}`), nên dự báo = tính trước 2 ngày bằng cùng hạt giống. Sự kiện đặc biệt (nắng nóng kéo dài, mưa to, bão) là ghi đè có thời hạn và đi qua D4.
- Hạt giống: `worldId` (co-op) hoặc `save.id` (đơn); dùng `Mulberry32Rng`/`daySeed` hiện có.
- *Thay thế bị loại*: `Math.random` (không tái lập, khác nhau giữa client/server).

### D4. Sự kiện thị trường là bộ chỉnh có thời hạn + kích hoạt
`market-events.ts`: `{id, kind, durationDays, trigger: {season?, weather?, chance, minGapDays}, warnDaysBefore?, rules: ModifierRule[], notice}`. Kích hoạt được quyết định theo ngày bởi RNG xác định; trạng thái đang chạy lưu trong `market.events`. Kịch bản nhiều hệ (nắng nóng → khách↑ → đồ mát↑ → tồn NCC↓ → giá sỉ↑) thực hiện chỉ bằng vài quy tắc dữ liệu cùng tham chiếu sự kiện, không có code riêng.

### D5. Động cơ nhu cầu tính theo khoảng, lưu đệm
`buildDemandTable(state, products)` trả `{ perProduct: {demand, factors[]}, traffic: {value, factors[]} }`, gọi khi: sang giờ game, đổi thời tiết/sự kiện/giá, hoặc tồn thay đổi vượt ngưỡng (đánh dấu bẩn, dồn lại theo giờ). `maybeSpawnCustomer` nhận bảng đã đệm: chọn kệ theo trọng số `demand × có hàng`, dùng RNG xác định từ `customerSequence`. Độ phức tạp mỗi khách O(số kệ).
- Công thức: `nhu cầu = cơ bản(basePopularity) × mùa × thời tiết × giờ × sự kiện × giá`, trong đó `giá = keepChance(giá bán/giá tham chiếu, độ nhạy)`; lưu lượng = `mùa × thời tiết × thứ × giờ × uy tín × khuyến mãi × sẵn hàng`, kẹp [0.25, 2.5] (`maxConcurrentCustomers` cấu hình theo lưu lượng, trần 3 do hàng đợi 3 ô).
- *Thay thế bị loại*: mô phỏng ngẫu nhiên từng khách có ví (đắt, khó kiểm thử).

### D6. Giá: tham chiếu trôi dần, người chơi tự đặt trong dải
Giá tham chiếu bán lẻ mỗi nhóm: `ref_{d+1} = ref_d + clamp(target_d − ref_d, ±maxStep)`, `target` từ chi phí nhập trung bình, khan hiếm (tồn/nhu cầu), sự kiện. Giá người chơi đặt thuộc `shop-pricing` (F1 của change kia) với dải quanh giá tham chiếu; `keepChance(ratio, sensitivity)` dùng chung. Cùng công thức cho giá sỉ của nhà cung cấp (`maxStep` riêng, `priceVolatility` của mối).
- Phải có F1 trước; nếu F1 chưa ship thì đợt 3 dùng giá gợi ý cố định và chỉ chạy phần tham chiếu/giá sỉ.

### D7. Thị trường nhà cung cấp theo ngày, nguyên tử, server kiểm tra
`supplier-market.ts`: mỗi ngày mỗi mối có `SupplierDayState {priceIndex[category], stockLeft[product], unavailable[], nextDelivery}` tính từ ngày hôm trước + bộ chỉnh; lưu `market.suppliers`. Đặt hàng kiểm tra tồn/ngừng cung/lịch theo giỏ nguyên tử và trừ tồn; lệnh co-op lấy cùng hàm nên server quyết. Giá chốt vào đơn (đã có `unitCost` theo lô).
- Khi không có `market.suppliers` → vô hạn như cũ.

### D8. Hỏng theo điều kiện bảo quản
Mỗi lô giữ `expiresOnDay`; thêm "tiêu hao hạn" theo ngày: `decay = base × conditionFactor(storage, weather, power)`; khi tích lũy vượt 1 thì trừ ngày còn lại (làm tròn xuống, lưu phần dư trên lô hoặc theo nhóm). Mất điện/nóng nhân hệ số cho hàng lạnh. Hàng quá hạn trên kệ: khách lấy → hủy giao dịch món đó, trừ hài lòng; loại vào ngày sau như hiện nay. Tiêu hủy thủ công là lệnh ghi sổ một lần (idempotent theo ID).
- *Giữ* mô hình `expiresOnDay` hiện có để không phá save/test; phần dư là trường tùy chọn trên lô.

### D9. Giải thích được
Mọi bảng (nhu cầu, lưu lượng, giá sỉ, tồn NCC) trả kèm `factors: {ruleId, label, factor}[]`. Giao diện chỉ hiển thị; không tính lại. Thông báo gộp theo loại và giới hạn tần suất (một lần/giờ game/loại), tái dùng hàng đợi toast hiện có.

### D10. Lập kế hoạch tồn kho chỉ đọc
`forecast.ts` thuần: nhận trạng thái + bảng nhu cầu + dự báo thời tiết → `ProductPlan[]` (tồn, nhu cầu dự kiến, bán gần đây từ `productSales`, xu hướng, tác động thời tiết, khuyến nghị nhập, cờ). Không có tác dụng phụ; `suggestions.ts` gọi chung để số liệu thống nhất.

### D11. Tương thích và co-op
Mọi trường mới nằm dưới `SaveGameData.market?`; thiếu = khởi tạo từ hạt giống. Bộ chỉnh/thị trường tính tại runtime server trong thế giới co-op (không nhận từ client); client chỉ hiển thị. Lệnh mới tái dùng `GameCommand` (đặt hàng đã có; thêm `dispose_stock`).

### Hòa giải với `stardew-inspired-management-loop`
- F1 `shop-pricing`: phụ thuộc, không làm lại; đợt 3 ở đây sau F1.
- F5 `town-events`: phần "thời tiết theo ngày + hệ số nhu cầu" bị thay bởi đợt 1–2 ở đây (một `weather.ts` duy nhất); F5 còn giữ đơn tiệc và ngày hội thưởng, dùng `ModifierRule` ở đây cho hiệu ứng nhu cầu.
- F3 `day-rhythm`: bản tin sáng đọc dự báo/sự kiện từ `market`.
- Hành động kèm theo: khi bắt đầu đợt 1, sửa `stardew-inspired-management-loop/tasks.md` đánh dấu F5-thời tiết là "thực hiện trong dynamic-economy-simulation".

## Risks / Trade-offs

- [Phức tạp/cân bằng: nhiều hệ nhân nhau có thể cho nhu cầu cực đoan] → kẹp dải mỗi kênh, bộ kiểm tra dữ liệu khẳng định tích tối đa/tối thiểu hợp lý, test kịch bản nhiệt/mưa/khan hàng, playtest trước khi ghi đã cân bằng.
- [Vòng xoáy: khan hàng → giá↑ → hết vốn] → biên độ đổi giá/ngày, giá nền không dưới/trên ngưỡng, nhà cung cấp luôn có ít nhất một mối không ngừng cung.
- [Lệch client/server] → mọi tính toán thị trường xác định từ hạt giống và chạy ở runtime server; test so khớp hai lần chạy cùng seed.
- [Catalog thiếu món để kịch bản có nghĩa (kem, ô, đồ nóng)] → đợt 2 thêm bộ sản phẩm tối thiểu kèm icon/test; nếu hoãn, bộ chỉnh vẫn áp dụng cho món hiện có (nước ngọt, nước suối, mì, sữa).
- [Hiệu năng] → bảng nhu cầu theo giờ + đánh dấu bẩn; đo trên 56+ món × nhiều khách bằng test thời gian thô.
- [Người chơi khó hiểu] → D9 phân rã; kiểm thử giao diện bằng kịch bản "vì sao hôm nay đông".
- [Trùng việc với change khác] → mục Hòa giải, một `weather.ts`, cập nhật tasks của change kia.
- [Mở rộng save/co-op làm vỡ tải cũ] → trường tùy chọn + test tải save cũ + migration rỗng.

## Migration Plan

1. Thêm kiểu và dữ liệu, `market` tùy chọn; save cũ tải như trước (không bảng thị trường = đường cũ).
2. Mỗi đợt sau có cờ cấu hình bật/tắt (mặc định bật cho save mới, tự bật cho save cũ khi tải tại ngày mới).
3. Thị trường khởi tạo từ hạt giống tại lần sang ngày đầu sau khi bật; giá/tồn không đổi giữa chừng ngày.
4. Hoàn tác: bỏ `market` khỏi save (bỏ qua) đưa hành vi về cũ; không xóa dữ liệu lịch sử.

## Open Questions

- Mức cân bằng cụ thể (dải kẹp, `maxStep`, ngưỡng khan hiếm) — để chốt bằng playtest, không đổi phạm vi hay thiết kế.
- Tên/ngôn ngữ thông báo cuối cùng cho từng sự kiện — viết khi làm giao diện.
