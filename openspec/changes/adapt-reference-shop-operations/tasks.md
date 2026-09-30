# Tasks

Tiến độ code chức năng: Nhóm 1–7 đã triển khai; 8.1–8.4, 9.1–9.4 và 10.1–10.3 đã có code. Batch cuối chạy `yarn typecheck`, `yarn test` (có regression `operations.test.ts`) và `yarn build` đều PASS. Browser smoke hire→shift/payroll, worker/auto-buy UI, vòng 3 ngày, thiết bị thật và multiplayer replay còn thiếu; 8.4, 9.4 và Nhóm 11 chưa nghiệm thu. Không xem build/test PASS là bằng chứng cho browser/device acceptance.

## 1. A — Bảo vệ save và chuẩn hóa chuyển hàng

- [x] 1.1 Tách lỗi đọc DB/parse khỏi save chưa tồn tại trong apps/web/src/db.ts và UI recovery; test DB lỗi không ghi default, retry đọc lại dữ liệu cũ.
- [x] 1.2 Thêm runtime validation/backup/migration helper cho shared save và test schema 2, dữ liệu hỏng, version tương lai; giữ revision tuần tự và kiểm tra backup đọc được.
- [x] 1.3 Chuẩn hóa result command transfer có actualQuantity/reason và sửa App.tsx handleAutoRestock; regression kệ 24/product 10/stock 5/request 19 phải chuyển và toast 5.
- [x] 1.4 Định nghĩa command/actor/result có ID và kiểm tra chống replay ở core; test hai tác nhân cùng chuyển món cuối không âm tồn hoặc nhân hàng; đối chiếu contract change multiplayer.
- [x] 1.5 Cập nhật tổng hợp/TASKS/ROADMAP cho nền đã làm và còn thiếu; chạy yarn typecheck/yarn test, ghi kết quả thực cùng version migration đã chọn.

## 2. A — Giỏ khách và thu ngân hợp lệ

- [x] 2.1 Tách module customers/transactions từ simulation.ts, thêm customers/basket/queue; test hai khách lấy món cuối, giá giỏ giữ nguyên và đường đi đến kệ/quầy.
- [x] 2.2 Chuyển pickup lô sang basket và checkout một đường cho người chơi/AI; test không khách không bán, thanh toán replay chỉ tăng tiền/XP/khách một lần.
- [x] 2.3 Xử lý bỏ về/đóng cửa/hết hạn khi mang giỏ; test phương trình tổng kho+kệ+giỏ+holding+bán+hỏng luôn đối chiếu được.
- [x] 2.4 Migrate customer schema 2 không có basket và save/reload queue giữa lượt; test không suy ra hàng đã sở hữu và không bán lại lượt đã commit.
- [x] 2.5 Nối CashierModal/store/renderer nhiều khách với giới hạn số lượng và feedback; browser smoke lấy→queue→thu tiền→reload, cập nhật docs và chạy typecheck/test/build.

## 3. B — Catalog chọn lọc

- [x] 3.1 Đối chiếu 335 dòng catalog-source.csv với 36 món đích, tạo manifest alias/category/support/disposition; kiểm chứng mỗi dòng có quyết định và không trùng nghĩa trong danh mục mới.
- [x] 3.2 Chốt 20 món từ shortlist hoặc thay món trùng/không hợp, viết products.ts với đầy đủ metadata; test catalog tổng 56, 36 legacy không đổi, ID duy nhất và unlock/cost/capacity hợp lệ.
- [x] 3.3 Thêm sprite/fallback và tìm kiếm/lọc đại lý/kho nếu danh sách dài; kiểm tra 20 món hiển thị ở desktop 1366×768 và mobile 844×390, không mất thao tác đặt.
- [x] 3.4 Cập nhật mô tả catalog/nguồn mapping/balance trong tổng hợp và TASKS/ROADMAP; chạy typecheck/test/build, ghi món nào chưa có texture riêng.

## 4. B — Mối nhập và hàng chờ

- [x] 4.1 Thêm supplier configs vào game-data, chốt bảng giá/chiết khấu/minOrder/ETA và giữ legacy supplier; test đơn cũ giữ đơn giá và sáng ngày sau giao đúng như trước.
- [x] 4.2 Thêm cart validate/commit nguyên tử ở core và preview tổng trong SupplierModal; test dòng khóa/số lượng lỗi/thiếu tiền/kho lạnh làm cả giỏ bị từ chối không trừ một phần.
- [x] 4.3 Thêm delivery state/holding/stow theo lô và cold capacity; test giao đúng một lần, phần dư, cất sau giữ hạn gốc, hàng chờ quá hạn không bán được.
- [x] 4.4 Migrate pendingOrders supplier thiếu ID, nối WarehouseModal/WarehouseDock nhận/cất hàng; browser smoke đặt nhiều món→đến ETA→holding→cất→reload.
- [x] 4.5 Cập nhật docs save/nghiệp vụ/mối sỉ và tiến độ; chạy typecheck/test/build, ghi rõ dry capacity mặc định vẫn không giới hạn.

## 5. B — Sơ đồ bày kệ

- [x] 5.1 Thêm planogram theo fixture ID trong shared/save/core; test save/reload, kệ bị xoá/khóa và product thiếu được bỏ qua có lý do.
- [x] 5.2 Thêm lưu/áp dụng sơ đồ ở ShelfModal và thao tác châm nhiều kệ; test không thay món còn hàng, giữ FEFO, sum actualQuantity bằng lượng giảm kho.
- [x] 5.3 Nối planogram vào job target sau này qua API core; xác minh thao tác tay vẫn hoạt động khi không có nhân viên, cập nhật tổng hợp và chạy typecheck/test.

## 6. C — Giá vốn và báo cáo ngày

- [x] 6.1 Thêm unitCost/provenance vào lô, giữ qua delivery/stock/basket/holding; test hai lô vốn khác nhau FEFO và migration lô cũ giữ số lượng/hạn với estimated cost.
- [x] 6.2 Thêm ledger mua/bán/hỏng, day record và ID chốt ngày; test mua 10×3000 bán 2×5000 có doanh thu 10000/COGS 6000/lãi 4000, không trừ mua 30000 lần hai vào lợi nhuận.
- [x] 6.3 Thêm báo cáo ngày và tách số khách/giao dịch/món; browser kiểm tra một khách nhiều món tăng khách một, reload không chốt ngày hai lần.
- [x] 6.4 Cập nhật tổng hợp/tiến độ và giới hạn estimated legacy profit; chạy typecheck/test/build đối chiếu ledger với thay đổi tiền/tồn.

## 7. C — Gợi ý nhập

- [x] 7.1 Thêm lịch sử bán 3/7 ngày và nhu cầu fallback, tính usable stock/incoming theo ETA và hạn; test có đơn chờ đủ target không gợi ý mua trùng, fresh không nhập vượt thời gian dùng.
- [x] 7.2 Cắt giỏ theo ngân sách/sức chứa/mối/đơn tối thiểu và trả lý do; test kho lạnh gần đầy, budget thấp, món locked và lịch sử rỗng.
- [x] 7.3 Nối gợi ý có thể sửa/xác nhận vào SupplierModal, không tự trừ tiền; browser smoke sửa giỏ rồi đặt, cập nhật docs và chạy typecheck/test/build.

## 8. D — Tuyển dụng, ca và lương

- [x] 8.1 Thêm balance/seed candidates cashier/refill và bảng slot/cấp/ca/phí/lương; test seed ổn định, vai trò, khung 06–22, khóa cấp/slot/tiền.
- [x] 8.2 Thêm staff/schedule/wageDebt/payroll IDs vào save; save cũ hydrate rỗng, không sinh nhân viên miễn phí; test round-trip dữ liệu nhân viên và nợ lương.
- [x] 8.3 Thêm payroll theo ca qua ledger với day ID; test lương 30000 khi có 10000 tạo nợ 20000, tiền không âm và reload/replay không trả lần hai.
- [x] 8.4 Thêm StaffModal tuyển/phân vai/xếp ca/xem nợ, giao việc châm kệ và trạng thái; kiểm thử/browser acceptance hoãn đến lượt cuối.

## 9. D — Nhân viên làm việc thật

- [x] 9.1 Thêm claim/release/revalidate cho player và staff; test tranh target, target invalid, hết ca nhả claim và reload không giữ claim runtime.
- [x] 9.2 Thêm worker navigation/carry location, châm FEFO từ kho theo planogram; test không đường không chuyển hàng, hết ca trả hàng đang mang, reload tiếp tục không mất/nhân lô.
- [x] 9.3 Nối cashier worker với queue/checkout chung và bàn giao; kiểm thử player+cashier cùng phục vụ khách chỉ một commit và cuối ca hoàn tất khách đang nhận, không nhận khách mới (hoãn test).
- [ ] 9.4 Render worker/trạng thái bận/chặn và cap actor; browser smoke hoãn đến lượt kiểm thử cuối.

## 10. E — Tự nhập có kiểm soát

- [x] 10.1 Thêm rules product/threshold/qty/supplier/priority/budget và default tắt; validation/ưu tiên chờ test lượt cuối.
- [x] 10.2 Chạy rules mỗi sáng một lần qua cart command với dấu ngày; reload/thiếu ngân sách/space/minOrder chờ test lượt cuối.
- [x] 10.3 Thêm UI bật/tắt/rules/report phân biệt châm hàng với mua hàng; browser smoke và typecheck/test/build chờ lượt cuối.

## 11. E — Nghiệm thu tích hợp

- [ ] 11.1 (30/09/2026: đã có `integration.test.ts` headless 3 ngày đặt→giao→bày→khách→bán→lương→auto-buy→save/reload, Δtiền khớp sổ cái; còn thiếu worker, hàng hỏng và bản chạy browser; chưa tạo docs/operations/VERIFICATION.md) Chạy vòng 3 ngày: đặt→giao→bày→khách→worker→bán→hỏng→lương→gợi ý→auto-buy→save/reload; đối chiếu tài sản và ledger, ghi bằng chứng trong docs/operations/VERIFICATION.md.
- [ ] 11.2 Kiểm tra viewport desktop/mobile, modal focus/input và thiết bị thật; ghi cấu hình/số actor/p95/memory, so với mục tiêu desktop ≤20ms/mobile ≤33ms và ghi chưa đạt nếu không đạt.
- [ ] 11.3 Rà contract với shared-alley-multiplayer bằng replay/2 actor local, ghi phần còn phải chạy server riêng; cập nhật tổng hợp/TASKS/ROADMAP đúng nghiệm thu thực và giữ checkbox chưa xong khi thiếu bằng chứng.
