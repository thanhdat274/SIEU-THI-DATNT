# Proposal: Co-op cùng quy hoạch trên một thành phố (Bước 5 thế giới mở)

## Vì sao

Chủ dự án chốt (05/10/2026): **chơi chung một thành phố**, và chơi một mình hay chơi chung dùng cùng một mô hình. Sau Bước 2–4, có nhiều lệnh tốn tiền lớn và không đảo ngược được (mở rộng, mua lô, dời tòa, khai hoang). Bước 2–4 chỉ dựa `expectedRevision` nên hai người cùng mở chế độ quy hoạch sẽ "giành ô": người bấm sau bị từ chối mà không biết vì sao, hoặc một người tiêu khoản lớn của quỹ chung mà người kia không đồng ý.

## Mục tiêu

- **Giữ chỗ quy hoạch**: khi một người đang quy hoạch, các ô/lô họ chọn hiển thị cho người kia (bóng mờ + tên), và lệnh của người kia đụng vào chúng bị từ chối rõ lý do. Giữ chỗ tạm thời, không lưu save, tự hết hạn.
- **Quyền theo vai trò** (`owner`/`member` có sẵn): bảng quyền cho từng lệnh đất; chủ hẻm có thể bật/tắt quyền của thành viên.
- **Đồng ý cho khoản chi lớn**: lệnh vượt ngưỡng (ví dụ dời tòa, khai hoang) khi người kia đang online cần người kia đồng ý, dùng lại cơ chế phiếu của `time-vote`.
- **Ghi nhận ai xây**: vị trí đặt, ô mở rộng, lô, đợt ghi `builtBy` và vào nhật ký thành phố.
- Thông báo xung đột thân thiện (toast có tên người kia) thay cho lỗi revision chung.

## Ngoài phạm vi

- Mỗi người một doanh nghiệp/quỹ riêng trong cùng thành phố, đất riêng không chuyển nhượng, hợp đồng thuê/bán giữa hai người (phụ thuộc quyết định D9 của `open-world-land-reclamation` về `branch-chain`).
- Hơn hai người một thành phố.
- Chỉnh sửa nội thất đồng thời ở mức từng ô (layout_batch giữ nguyên cơ chế cũ).

## Phụ thuộc

`open-world-land-reclamation` xong. Hạ tầng co-op hiện có (`shared-alley-multiplayer`) còn mục chưa kiểm chứng trong `tổng hợp.md` (chưa chạy `test:coop`/`test:gateway`/`test:worlds` cần Mongo replica set, chưa thử hai trình duyệt thật): **phải kiểm chứng các mục đó trước** khi apply change này.

## Tiêu chí hoàn tất

- Hai trình duyệt thật: A đang quy hoạch 6 ô, B thấy bóng mờ có tên A; B chọn trùng thì bị chặn với thông báo; A hủy hoặc hết hạn thì B chọn được.
- Thành viên không có quyền khai hoang nhận thông báo rõ; chủ bật quyền thì làm được.
- Dời tòa khi người kia online tạo phiếu; người kia từ chối thì không trừ tiền; người kia offline thì chạy ngay.
- `test:coop`, `test:gateway`, `test:worlds`, `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực.
