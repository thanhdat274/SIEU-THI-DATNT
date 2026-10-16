# Proposal

## Why

Mục 4 GĐ4 yêu cầu "Chuỗi cung ứng: nhiều nhà cung cấp, hàng hết hạn, nhập sỉ theo lô". Rà soát hiện trạng cho thấy **tính năng đã có sẵn và chạy thật** (từ các giai đoạn trước):
- **Nhiều nhà cung cấp:** hệ `suppliers` (`dai_ly_dau_hem` + các nhà cung cấp khác), cấp độ nhà cung cấp, giá theo danh mục; đơn cũ thiếu `supplierId` tự migrate về `dai_ly_dau_hem`. UI `SupplierModal`.
- **Hàng hết hạn / shelf-life:** `StockLot.expiresOnDay`/`expiryDay`, `SPOILAGE_RULES`, quy tắc hạn dùng trong `delivery.ts`, hư hỏng/hết hạn trên kệ, hạn dùng tươi (`freshExtraDays`).
- **Nhập sỉ theo lô (bulk/batch):** `orderSupplierCart` (giỏ nhiều dòng), `pendingOrders`, `receiveDeliveredOrders`, `caseSize`/`caseCount`, `StockLot.provenance`, sức chứa kho mát/khu chờ (`holdingArea`).

Change này (state-documentation, không viết lại code) nhằm: (1) chốt OpenSpec cho năng lực đã tồn tại, (2) gom bằng chứng verify **thật**, (3) đồng bộ tài liệu đúng quy trình từng mục.

## What Changes

- **Change OpenSpec `supply-chain-complete`** mô tả hiện trạng chuỗi cung ứng (nhiều nhà cung cấp / hết hạn / nhập sỉ theo lô).
- **Bằng chứng verify thật:** chạy `suppliers`, `delivery`+`receiveDeliveredOrders`, `supplier-cart` qua harness tsc→node; ghi PASS.
- **Đồng bộ tài liệu:** cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
- **Chờ máy thật:** Browser QA màn nhà cung cấp/giao hàng/kho chờ (SupplierModal), viewport hẹp.

## Capabilities

### New Capabilities

- `supply-chain`: chuỗi cung ứng — nhiều nhà cung cấp, hết hạn/shelf-life, nhập sỉ theo lô; state-documentation của năng lực đã có.

## Non-goals

- Không viết lại/đổi logic chuỗi cung ứng đang chạy (đã test); không đổi cân bằng hằng số trừ khi playtest yêu cầu.
- Không thêm tính năng cung ứng MỚI ngoài hiện trạng (chủ dự án chọn "công nhận đã có" — nếu muốn thêm, mở change riêng).

## Impact

`openspec/changes/supply-chain-complete/` (mới), `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`; không sửa code game. Chạy `suppliers` + `delivery` + `supplier-cart` qua harness làm bằng chứng.
