# Tasks: civic-local-fees

- [x] 1.1 Hằng số `OWNED_TILE_FEE` (+ `upkeepPerDay` đã khai báo ở change 1); validate. Làm tròn phí 100 ₫.
- [x] 1.2 `LedgerEntryType` + trường tùy chọn trong `DailyRecord`; cập nhật `netProfit`; test sổ cái.
- [x] 1.3 Trừ phí/duy trì đầu ngày ngay sau tiền thuê lô (sau `initDailyRecord`); test thứ tự + idempotent + hash.
- [x] 1.4 Thiếu tiền → nợ riêng `civicDebt`/`civicDebtDays` (không cộng 2 lần, tối đa +1 ngày/lô/ngày, trả đủ thì −1), trả bằng `pay_rent_debt`; không đóng cửa tòa vì nợ phí; test.
- [x] 1.5 Báo cáo theo tòa, tổng kết ngày, AnalyticsModal, tab Xóm phố có dòng phí. CHƯA QA trình duyệt lượt sửa cuối.
- [x] 1.6 `yarn typecheck` EXIT 0; `yarn --cwd packages/game-core test` EXIT 0 (112 pass, golden cập nhật có chứng minh); `yarn --cwd apps/web test` EXIT 0 (16/10/2026).
- [~] 1.7 Co-op: phí chỉ trừ ở server — QA 2 client 17/10/2026 (Bước C): hai thẻ Browser pane cùng localhost, thẻ B ép id khách `b` bằng shim `Storage.getItem` ở thẻ đó (giao diện thật cả hai; hẻm "QA BuocC" gieo save qua DB: cấp 25, 20tr, sổ gần đủ). ĐÃ KIỂM CHỨNG: sang ngày hai máy cùng trừ phí xóm 10.000 + duy trì 35.000 (tiền 13.215.300 → 13.170.300), khớp DB. CHƯA: nợ phí riêng từng người (không có người nào thiếu tiền trong lần QA).
- [x] 1.8 Sweep cân bằng: chốt bộ E, hoàn vốn 20 ngày (cấp 15) / 50 ngày (cấp 25), phí ≤ 2,8% doanh thu.

- [x] BƯỚC C (17/10/2026): QA 2 giao diện thật (2 tab, khách dev b/a) — kết quả của change này xem `tổng hợp.md` mục BƯỚC C (C3).
