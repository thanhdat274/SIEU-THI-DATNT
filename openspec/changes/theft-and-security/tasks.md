# Tasks

Trạng thái 01/10/2026: nhóm 1–3 đã có code và test tự động. Trong lượt rà soát tiếp nối, sửa lỗi qua ngày hoàn giỏ trên khách thật; `tsc -b` và toàn bộ `test-runner.ts` PASS (suite an ninh + 7 TAP test). Production build server và web PASS khi chạy trực tiếp bằng Node 24; browser QA và cân bằng vẫn mở.

## 1. Dữ liệu và logic

- [x] 1.1 Kiểu `SecurityIncident`/`PoliceCase`/`SecurityState`, `CustomerState.thief`, loại sổ cái `theft`/`theft_cash`/`recovery`, `DailyRecord.theftCost/theftRecovered`, `SaveGameData.security`, lệnh `security_action` (`shared`).
- [x] 1.2 `SECURITY_RULES` (`game-data/src/security.ts`).
- [x] 1.3 Hàm thuần `rollShoplifter`, `shopliftDetectChance`, `shopliftCaught`, `planBurglary`, `openPoliceCase`, `appendIncident`, `sanitizeSecurity` (`game-core/src/security.ts`).

## 2. Mô phỏng

- [x] 2.1 Đánh dấu kẻ trộm khi sinh khách; `completeCustomerCheckout` chuyển kẻ trộm sang `resolveShoplifter`; `CustomerManager.finishShoplifter` thao tác trên khách thật.
- [x] 2.2 Trộm đột nhập và hồ sơ công an trong lệnh sang ngày mới; `buyCamera`, `setCallPolice`, `getSecurityState`; lưu/tải.
- [x] 2.3 Sổ cái và lãi ròng (9 chỗ `netProfit`); cập nhật công thức đối chiếu tiền với sổ cái ở `scenarios.test.ts`, `integration.test.ts`.
- [x] 2.4 Lệnh `security_action` trong danh sách lệnh được phép của server.
- [x] 2.5 Test `security.test.ts`: tỷ lệ kẻ trộm, mở khóa, loại trừ khách quen, phát hiện kết hợp, tần suất trộm đêm và hiệu ứng camera, bảo vệ đuổi được, loại mất mát, hồ sơ công an, dọn dữ liệu và giới hạn, trộm lẻ thoát, bắt quả tang (hàng trả lại, phạt, sổ cái), trộm tiền, trộm hàng, bảo vệ đuổi, tắt báo công an, công an trả hoặc đóng hồ sơ, camera, lưu/tải, save cũ, cấp thấp không có sự cố. Sửa trong lúc làm: lỗi `getCustomers()` trả bản sao nên kẻ trộm không rời quầy (thêm `finishShoplifter`), và công thức đối chiếu tiền với sổ cái cần phân biệt loại mới.
- [x] 2.6 Sửa lỗi cũ khi sang ngày: `abandonAllBaskets` thao tác trên khách nội bộ, hoàn giỏ và route họ rời quầy; test hồi quy xác nhận khách thật rời tiệm, giỏ được xóa và hàng chỉ hoàn một lần.

## 3. Giao diện

- [x] 3.1 `SecurityModal`, nút "An ninh" trên HUD từ cấp 5, toast sự cố, nối lệnh `security_action`.

## 4. Kiểm chứng và còn lại

- [x] 4.1 `tsc -b`, toàn bộ `test-runner.ts` và 7 TAP test PASS; server `tsc -p tsconfig.build.json` và web Vite production build PASS (01/10/2026, Node 24.19.0 gọi trực tiếp). Vite giữ cảnh báo chunk lớn và import động/tĩnh `api.ts`.
- [ ] 4.2 Browser QA: mở màn An ninh, mua camera, thấy sự cố, toast. Chưa làm được vì cần cấp 5 và game thử đang ở cấp thấp, chưa có công cụ dev ép cấp hoặc ép sự cố.
- [ ] 4.3 Cân bằng: tần suất, mức mất, giá camera, phạt, tỷ lệ bắt của công an; xem người chơi có hiểu vì sao bị mất hàng.
- [ ] 4.4 Quyết định sau: người chơi tự bắt trộm, dấu hiệu nhìn thấy trên khách trộm, bảo vệ ca đêm, chi phí camera trong mô-đun thuế, server phát lại `security_action`.
- [x] 4.5 Lỗi có sẵn khi đổi ngày: đã sửa trong cùng lượt vì ảnh hưởng trực tiếp tới hoàn giỏ; `abandonAllBaskets` cập nhật khách thật.
- [ ] 4.6 Cập nhật `TASKS.md`/`ROADMAP.md` khi chốt nghiệm thu.
