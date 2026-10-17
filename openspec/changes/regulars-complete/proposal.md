# Proposal

## Why

Mục 3 GĐ4 của chủ dự án yêu cầu "Khách quen: thiện cảm, sổ nợ, mua chịu, lưu theo khách". Rà soát hiện trạng cho thấy **tính năng này đã có sẵn và chạy thật** trong repo (từ các giai đoạn trước):
- **Thiện cảm (friendship):** `game-core/regulars.ts` — 6 khách quen đại diện hẻm, điểm thân thiết (trần +2/ngày), khám phá món ưa thích, mở khóa perk (visit thường xuyên, boa thêm), thưởng boa theo perk; `RegularsModal` hiển thị.
- **Sổ nợ / mua chịu (credit):** `simulation.ts` — `customerCredits` (open/overdue/paid/defaulted), `getCustomerCreditTerms` (hạn mức theo thân thiết ≥40, ngừng khi nợ xấu), `repayCustomerCredit`, `updateCustomerCreditStatuses` (overdue → defaulted + `bad_debt` sổ cái), checkout `onCredit`; `CashierModal` có nút "Thu nợ"; lệnh co-op `repay_customer_credit`.
- **Lưu theo khách:** `SaveGameData.regulars` + `customerCredits` được lưu/tải; không đổi schemaVersion.
- **Test:** `regulars.test.ts` + `wave-a.test.ts` (tín dụng/mua chịu — Wave A) đều có sẵn.

Change này (state-documentation / hoàn thiện tài liệu, không viết lại code) nhằm: (1) chốt OpenSpec cho năng lực đã tồn tại, (2) gom bằng chứng verify **thật**, (3) đồng bộ `tổng hợp.md`/`TASKS.md`/`ROADMAP.md` đúng quy trình từng mục.

## What Changes

- **Change OpenSpec `regulars-complete`** mô tả hiện trạng khách quen (loại change "đã có, chốt hiện trạng" — không triển khai code mới ngoài verify/đồng bộ tài liệu).
- **Bằng chứng verify thật:** chạy `regulars` + `wave-a` qua harness tsc→node, kèm hồi quy rộng; ghi kết quả.
- **Đồng bộ tài liệu:** cập nhật `tổng hợp.md` (Mục 3), `TASKS.md`, `ROADMAP.md`.
- **Chờ máy thật:** Browser QA mắt cho màn khách quen/sổ nợ (RegularsModal, CashierModal "Thu nợ", toast overdue/defaulted, viewport hẹp).

## Capabilities

### New Capabilities

- `regulars-credit`: khách quen — thiện cảm theo khách, sổ nợ/mua chịu theo khách, thu hồi nợ, nợ xấu; state-documentation của năng lực đã có.

## Non-goals

- Không viết lại/đổi logic khách quen hay credit đang chạy (đã test); không đổi cân bằng hằng số trừ khi playtest yêu cầu.
- Không thêm tính năng khách quen MỚI ngoài hiện trạng (chủ dự án chọn "công nhận đã có" — nếu muốn thêm, mở change riêng).

## Impact

`openspec/changes/regulars-complete/` (mới), `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`; không sửa code game. Chạy `regulars` + `wave-a` qua harness làm bằng chứng.
