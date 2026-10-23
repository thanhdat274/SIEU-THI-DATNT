# Tasks

Change này là state-documentation — không sửa code game; gom bằng chứng verify + đồng bộ tài liệu.

## Chốt hiện trạng + bằng chứng

- [x] 1.1 Rà soát hiện trạng: `regulars.ts` (thiện cảm/perk/boa), `simulation.ts` (customerCredits, getCustomerCreditTerms, repayCustomerCredit, updateCustomerCreditStatuses, onCredit checkout, bad_debt), lưu theo khách (`SaveGameData.regulars` + `customerCredits`), UI (`RegularsModal`, `CashierModal` "Thu nợ", wire App.tsx + lệnh `repay_customer_credit`).
- [x] 1.2 **Bằng chứng verify thật:** chạy harness tsc→node → `wave-a (khách quen tín dụng)` PASS + `regulars` PASS. (Kết quả ghi trong `tổng hợp.md`.)
- [x] 1.3 Soạn OpenSpec `regulars-complete` (proposal/design/spec delta `regulars-credit`/tasks) mô tả hiện trạng.

## Đồng bộ tài liệu

- [x] 2.1 Cập nhật `tổng hợp.md` (đầu file — Mục 3), `TASKS.md`, `ROADMAP.md`.
- [x] 2.2 `yarn typecheck` vẫn PASS (không đổi code game; xác nhận tree khỏe).

## Chờ máy thật

- [ ] 3.1 **Browser QA:** RegularsModal, CashierModal "Thu nợ", toast overdue/defaulted/thu nợ, viewport hẹp 568–740 px.
- [ ] 3.2 Playtest cân bằng (hạn mức 40⋆-ngưỡng, tần suất 30%/ngày, nợ xấu sau due+7) nếu chủ dự án muốn chỉnh hằng số.
