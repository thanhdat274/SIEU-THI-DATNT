# Tasks

Trạng thái 05/10/2026: mới có kế hoạch, chưa có code. Phụ thuộc `open-world-building-types`, `open-world-coop-land`.

## 0. Quyết định

- [x] 0.1 Chủ dự án chọn D1 (05/10/2026): A, giữ quỹ chung.

## 1. Người phụ trách

- [ ] 1.1 `managerAccountId`, `nonManagerActions`; kiểm quyền ở server cho lệnh bố cục/giá/nhân viên; test gateway.
- [ ] 1.2 UI gán người phụ trách (chủ hẻm), nhãn tên trên biển tòa.

## 2. Hợp đồng

- [ ] 2.1 `SupplyContract`, lệnh đề xuất/đồng ý/từ chối/hủy; hết hạn 1 ngày; test.
- [ ] 2.2 Thực thi mỗi sáng qua `internal_delivery`, FEFO, giao thiếu, sổ `internal_transfer`; giới hạn 50% tồn.

## 3. Thành tích

- [ ] 3.1 Bảng thành tích theo tòa/người; đối soát tổng lãi; hiển thị ở bảng Thành phố và tổng kết ngày.

## 4. Save, kiểm chứng, tài liệu

- [ ] 4.1 Schema kế tiếp + migration; test.
- [ ] 4.2 `test:coop`, `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); QA hai trình duyệt theo proposal.
- [ ] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
