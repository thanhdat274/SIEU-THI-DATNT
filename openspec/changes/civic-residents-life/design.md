# Design: civic-residents-life

- Số NPC hiển thị = `min(pop / RESIDENTS_PER_NPC, NPC_CAP)` trong vùng camera (dùng culling sẵn có); trần trên di động thấp hơn desktop.
- Lịch: bảng dữ liệu theo khung giờ → đích là loại công trình; khu không có công trình thì đi dạo vỉa hè như hiện tại.
- Tất định theo `(seed, day, districtId, index)`; hai client co-op thấy giống nhau mà không cần đồng bộ mạng vì không ảnh hưởng gameplay.
- Bậc nhà: `floorTier = bậc(pop / capacity)`; asset theo pipeline Kenney/LimeZu.
- Ngân sách: cập nhật NPC nền ≤ 2 ms/khung ở 375×812 (đo bằng `performance.test.ts` + QA trình duyệt).

## Co-op (bổ sung 16/10/2026)
- Cư dân sinh từ **seed thế giới chung** + ngày + giờ server, nên hai client vẽ giống nhau mà không cần gửi qua mạng.
- Chấp nhận lệch vài khung hình giữa hai máy (chỉ là hình); không có lệnh, không lưu.
