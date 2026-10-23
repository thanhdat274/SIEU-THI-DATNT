# Tasks

Change này là state-documentation — không sửa code game; gom bằng chứng verify + đồng bộ tài liệu.

## Chốt hiện trạng + bằng chứng

- [x] 1.1 Rà soát hiện trạng: `suppliers.ts` (nhiều nhà cung cấp, cấp độ, giá theo danh mục, migrate đơn cũ), `delivery.ts` (đặt→giao, hạn dùng/lô, sổ nhập, kho chờ/holdingArea), `supplier-cart` (giỏ nhiều dòng, case size, validate), `SPOILAGE_RULES`/shelf-life, UI `SupplierModal` + wire App.tsx + lệnh co-op.
- [x] 1.2 **Bằng chứng verify thật:** harness tsc→node → `suppliers` PASS, `delivery`+`receiveDeliveredOrders` PASS, `supplier-cart` PASS. (Kết quả ghi trong `tổng hợp.md`.)
- [x] 1.3 Soạn OpenSpec `supply-chain-complete` (proposal/design/spec delta `supply-chain`/tasks) mô tả hiện trạng.

## Đồng bộ tài liệu

- [x] 2.1 Cập nhật `tổng hợp.md` (đầu file — Mục 4), `TASKS.md`, `ROADMAP.md`.
- [x] 2.2 `yarn typecheck` vẫn PASS (không đổi code game; xác nhận tree khỏe).

## Chờ máy thật

- [ ] 3.1 **Browser QA:** SupplierModal, đặt giỏ nhiều dòng, giao hàng/kho chờ, viewport hẹp 568–740 px.
- [ ] 3.2 Playtest cân bằng (giá/cấp nhà cung cấp, hạn dùng, sức chứa kho) nếu chủ dự án muốn chỉnh hằng số.
