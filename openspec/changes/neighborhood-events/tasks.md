# Tasks

Trạng thái 16/10/2026 (apply Giai đoạn 4, mục 1): nhóm 1–4 có code; `yarn typecheck` PASS; test chạy thật qua harness tsc→node PASS (`party-orders-seasonal`, `party-orders`, `holiday-balance-sim`); UI có màn "Sự kiện xóm phố". `yarn test`/`build` chuẩn vẫn có thể EPERM trong sandbox như các giai đoạn trước — kiểm thật qua harness.

## 1. Dữ liệu và logic đơn theo mùa

- [x] 1.1 `PartyOrderDef` thêm `seasons?: string[]` (`shared`).
- [x] 1.2 Gắn nhãn mùa + thêm 2 đơn mới (Sắm Tết, Đêm rằm phá cỗ) trong `game-data/partyOrders.ts`; thêm `validatePartyOrders()` kiểm món/mở khóa/mùa.
- [x] 1.3 `partyOrdersForSeason(defs, day)` thuần trả `{ seasonal, general }`; tích hợp `refreshAvailablePartyOrders` (ưu tiên đơn đúng mùa, giữ "mỗi ngày 1 đơn mới").
- [x] 1.4 Test: `party-orders-seasonal.test.ts` — validate data, phân nhóm seasonal/general, ưu tiên mùa, ngoài mùa không sinh đơn mùa, `upcomingNearbySeasons`/`seasonYearOf`/`daysLeftInSeason`, `getNeighborhoodEvents`, thông báo lễ hội không lặp. Nối vào `test-runner.ts`.

## 2. Thông báo sự kiện

- [x] 2.1 Trong `simulation.ts` `notifySeasonalEvents(day, orderIdsBefore)`: toast ngày đầu lễ hội (chống lặp qua `notifiedFestivalKeys` theo năm), toast đơn tiệc mùa mới, toast có thưởng ngày hội (mỗi ngày 1 lần); gọi trong handler new-day sau `questsManager.advanceToDay`.
- [x] 2.2 Test thông báo: ngày đầu Tết có toast, cùng năm không lặp (bài 7 `party-orders-seasonal.test.ts`).

## 3. Màn "Sự kiện xóm phố"

- [x] 3.1 `NeighborhoodEventsModal.tsx` (mobile-first): lễ hội đang/sắp tới, đơn tiệc mùa (Nhận/Từ chối/Giao/Nhập hỏa tốc), mục tiêu ngày hội + thưởng, cảnh báo sắp hết hạn.
- [x] 3.2 Nút mở từ HUD: badge mùa trở thành nút `onOpenSeasonEvents`; wire trong `App.tsx` (state `isSeasonEventsOpen`, `hudHandlers.onOpenSeasonEvents`, render modal); đăng ký lazy-modal.
- [x] 3.3 CSS cho badge nút (`hud-season-badge-btn`) vào `index.css`.

## 4. Cân bằng + bằng chứng

- [x] 4.1 Chạy `holiday-balance-sim` qua harness: doanh thu 7 lễ (mức 10) = 1.034.000–1.185.000 ₫, khách 131–149 (biến động trong ~±8%). Bằng chứng trong `.qa/holiday-collect.mjs`.
- [x] 4.2 Đối chiếu phần thưởng: mục tiêu ngày hội 60–90k ₫ (~7–8% doanh thu ngày), đơn tiệc 110–450k ₫ cho đơn nhiều món — tương xứng, không cần chỉnh hằng số PROVISIONAL. Số liệu ghi vào `tổng hợp.md`.
- [x] 4.3 Nối `runPartyOrdersSeasonalTests` vào `test-runner.ts` (+ suite holiday-balance chạy được qua harness).

## 5. Kiểm chứng và tài liệu

- [x] 5.1 `yarn typecheck` toàn workspace PASS (4–7s); harness `tsc`→`node` chạy 3 suite PASS (`party-orders-seasonal`, `party-orders`, `holiday-balance-sim`); hồi quy thêm goals/seasons PASS (`verify-seasonal-regression.mjs`). `yarn test`/`build` chuẩn: ghi nhận EPERM sandbox như các giai đoạn trước nếu xảy ra.
  - **Sự cố & khắc phục (16/10/2026):** lệnh PS `Set-Content -NoNewline` vô ý làm `simulation.ts` thành 1 dòng (mất toàn bộ xuống dòng) — đã phục hồi bằng `git checkout` về HEAD (baseline sạch, HEAD vốn chứa `setActiveTitle`/`getSeasonWindow` không có) rồi áp lại 6 edit của change; xác minh lại typecheck + harness 5 suite PASS, `git diff --stat` simulation.ts chỉ 76 dòng (không còn full-file), `git diff --check` sạch (chỉ warning LF/CRLF của git, không lỗi whitespace).
- [x] 5.2 Cập nhật `tổng hợp.md` (mục Sự kiện xóm phố), `TASKS.md`, `ROADMAP.md`.
- [ ] 5.3 Browser QA (cần máy thật): mở màn Sự kiện xóm phố, đơn mùa, toast lễ hội, cảnh báo hết hạn, viewport hẹp 568–740 px. **CHỜ MÁY THẬT.**
