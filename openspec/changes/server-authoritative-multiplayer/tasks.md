# Tasks: Server làm nguồn sự thật duy nhất

Quy ước: chỉ đánh `[x]` khi code và kiểm chứng đã chạy thật; ghi kết quả (lệnh, ngày) vào `tổng hợp.md`. Build/test PASS không thay cho browser QA hai client. Không bắt đầu mục 2 trở đi khi câu hỏi mở ở `design.md` chưa được chủ dự án trả lời.

## 1. Khảo sát và đo (chuẩn bị giai đoạn 1)

- [ ] 1.1 Chủ dự án trả lời 4 câu hỏi mở ở `design.md`; ghi quyết định vào đó.
- [ ] 1.2 Spike đo: chạy `WorldRuntime` thật với N hẻm (1/10/50), ghi CPU tick, RAM/hẻm, kích thước snapshot (thô/nén), độ trễ lệnh→snapshot; chốt D2 (snapshot đầy đủ hay tách kênh) và giới hạn D10.
- [ ] 1.3 Kiểm kê chỗ `App.tsx` gọi `simulationRef.current` ở chế độ online và `commitBusinessChange` (≥20 chỗ); lập bảng "đọc / ghi / tự động" cho từng chỗ.
- [ ] 1.4 Lập bảng đối chiếu lệnh: client gửi gì ↔ `WorldRuntime` hiểu gì ↔ cần sửa gì (nguồn: I-01 `THONG-KE.md`, `bootstrap.ts`, `world-runtime.ts`).

## 2. Server chạy sim đủ và phát snapshot (giai đoạn 1)

- [ ] 2.1 Hợp nhất nơi giữ `WorldRuntime` (D4): một registry dùng chung cho gateway và `commitCommand`; hàng đợi lệnh tuần tự theo world; test hai lệnh đồng thời cùng revision chỉ một thắng và không dựng runtime thứ hai.
- [ ] 2.2 Chạy đủ hành vi tự động trong sim server (tự nhập hàng, quầy, lương, thuế, nhân viên); test headless: qua ngày trên server ghi báo cáo/sổ cái đúng, không cần client.
- [ ] 2.3 Mở rộng snapshot đủ cho UI (tiền, kho, đơn, fixture, khách, nhân viên, quầy, báo cáo ngày) theo quyết định 1.2; test round-trip và kích thước.
- [ ] 2.4 Dựng `GameStateSource`/`GameIntentSink` (D7) với bản local (sim trực tiếp) và bản online (snapshot + lệnh); chưa đổi hành vi người dùng.
- [ ] 2.5 Client online chỉ vẽ từ snapshot, không gọi `GameSimulation.update`; cờ `AUTHORITATIVE_MODE` bật thử với một hẻm; browser QA mất kết nối/nối lại.

## 3. Chuyển lệnh sang ý định (giai đoạn 2)

- [ ] 3.1 Nhóm tiền/kho/nhập hàng (`order_supplier`, `restock`, `unstock`, `set_price`, `buy_stall`, `dispose_stock`, `open_case`, `set_restock_options`, `set_auto_buy_stalls`, nhập nhanh quầy): client gửi ý định, không gửi save; test từ chối payload sai, quyền sai, stale revision.
- [ ] 3.2 Nhóm cần handler hoặc sửa payload (`order`→`order_supplier`, `stow`, `stow_all`, `planogram_assignment`, `planogram_restock`, `auto_restock`, `store_status`); test từng lệnh trên runtime đang chạy.
- [ ] 3.3 Nhóm trạng thái sống (`checkout` có `checkoutId`, `advance_day`/`change_speed` qua time-vote); test khách đang đứng quầy, hai người thanh toán một khách, không bán trùng.
- [ ] 3.4 Xóa `auto_buy_sync` và `onAutoPurchase` đường online; test tự nhập sáng/giữa ngày/quầy chạy ở server.
- [ ] 3.5 Cập nhật `THONG-KE.md` (I-01, bảng S22) theo kết quả thực.

## 4. Bỏ commit nguyên save và nghiệm thu (giai đoạn 3)

- [ ] 4.1 Gỡ `updatedBusiness.save` khỏi request commit online, xóa `checkSaveInvariants` và nhánh `else` ở `bootstrap.ts`; tăng `MULTIPLAYER_PROTOCOL_VERSION`; test client cũ bị từ chối với thông báo cập nhật và payload save giả bị từ chối ở cổng.
- [ ] 4.2 Bảng xếp hạng đọc doanh thu do server tính; cập nhật `THONG-KE.md` I-02.
- [ ] 4.3 Kiểm hai client thật (hai tài khoản): cùng tiền/kho/giờ/khách; kick, reconnect, restart server; RTT 150 ms, drop ACK, DB outage.
- [ ] 4.4 Hồi quy offline: `yarn typecheck`, `yarn test`, `yarn build`, smoke local; đo lại CPU/RAM/băng thông và ghi vào `tổng hợp.md`.
- [ ] 4.5 Tắt cờ `AUTHORITATIVE_MODE`, xóa đường cũ; đồng bộ `TASKS.md`, `ROADMAP.md`, `docs/multiplayer`, `tổng hợp.md`.
