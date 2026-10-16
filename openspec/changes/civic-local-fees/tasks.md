# Tasks: civic-local-fees

- [ ] 1.1 Hằng số `OWNED_TILE_FEE` (+ `upkeepPerDay` đã khai báo ở change 1); validate.
- [ ] 1.2 `LedgerEntryType` + trường tùy chọn trong `DailyRecord`; cập nhật `netProfit`; test sổ cái.
- [ ] 1.3 Trừ phí/duy trì đầu ngày, cùng chỗ trừ tiền thuê lô; test thứ tự + replay server.
- [ ] 1.4 Thiếu tiền → nợ theo luồng thuê lô; test.
- [ ] 1.5 Báo cáo theo tòa, tổng kết ngày, AnalyticsModal có dòng phí xóm (QA 7 viewport).
- [ ] 1.6 `yarn typecheck`, `yarn test`; ghi kết quả vào `tổng hợp.md`.

- [ ] 1.7 Co-op: phí chỉ trừ ở server; thông báo nợ cho cả hai; QA 2 client.
