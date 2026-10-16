# Design

Change này là **state-documentation** cho năng lực chuỗi cung ứng đã có sẵn. Mô tả kiến trúc THỰC TẾ đang chạy để làm nền cho tài liệu/QA.

## 1. Nhiều nhà cung cấp (game-core `suppliers.ts` + data)

- Danh sách nhà cung cấp (`dai_ly_dau_hem` + các nhà cung cấp khác), mỗi nhà: danh mục (priceIndex theo category), cấp độ, tồn kho nhà cung cấp.
- `orderFromSupplier(productId, qty)` (simulation): validate số dương, đủ tiền, sức chứa kho/đơn; trừ tiền, ghi sổ nhập (`purchase`), tạo đơn chờ `pendingOrders` với `supplierId`, `unitCost`, ngày giao = `day + delayDays`.
- `orderSupplierCart(...)`: giỏ nhiều dòng; mỗi dòng validate cấp/tối thiểu/tiền/kho/tồn/dòng trùng.
- Load save: đơn cũ thiếu `supplierId` → migrate về `dai_ly_dau_hem`, `delivered=false` giữ cho đến giao.

## 2. Hàng hết hạn / shelf-life (game-core `delivery.ts`, branch-ops, data)

- `StockLot { productId, quantity, expiresOnDay?, unitCost, provenance }`.
- Ngày hết hạn: `expiryDay(order.productId, day)` theo `product.expirationRules?.daysToSpoil` (+ `freshExtraDays` nếu hàng tươi); gộp lô cùng sản phẩm/kênh nhiệt khi nhận giao.
- Hư hỏng: `SPOILAGE_RULES`; quá hạn trên kệ → dọn/xử lý, `expiredOnShelfReputationLoss` tác động uy tín.
- Trần lô theo hạn dùng (kho thường/kho mát); xử lý hết hạn ở các kênh chế biến.

## 3. Nhập sỉ theo lô (bulk/batch)

- Đặt theo case: `caseSize`/`caseCount` ở màn nhà cung cấp.
- Nhận đơn: `receiveDeliveredOrders` khi tới ngày → cộng vào lô kho (FIFO), tràn kho mát chuyển `holdingArea`; giao một lần, gộp ô.
- `pendingOrders` khôi phục trọn vẹn khi tải save.

## 4. UI (apps/web)

- `SupplierModal`: chọn nhà cung cấp, đặt theo giỏ nhiều dòng, case size, xem giá/cấp/ngày giao; wire qua `App.tsx` (lệnh co-op `order_from_supplier`, `order_supplier_cart`...).
- Server lệnh co-op dùng chung method → 2 phía nhất quán.

## 5. Kiểm chứng (change này)

- Chạy `suppliers.test.ts`, `delivery.test.ts` (+`receiveDeliveredOrders`), `supplier-cart.test.ts` qua harness tsc→node; ghi PASS. Không sửa logic.

## 6. Rủi ro / giới hạn

- Hiện trạng đã chạy; nếu playtest thấy giá/hạn dùng/sức chứa chưa cân bằng → mở change riêng chỉnh hằng số.
- Browser QA (SupplierModal, giao hàng/kho chờ, viewport hẹp) **chờ máy thật**.
