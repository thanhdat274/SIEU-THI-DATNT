# Proposal: Đặt và dời tòa vào lô tự chọn (Bước 3 thế giới mở)

## Vì sao

Sau Bước 2, tiệm chính mở rộng tự do nhưng tiệm xôi, quán nước, quán ăn vặt vẫn đứng cố định ở lô định sẵn, kể cả khi chưa mua (vỏ nhà cửa cuốn chiếm lô). Chủ dự án muốn **khi mở thêm cửa hàng thì chọn được vị trí trên các mảnh đất xung quanh, và dời được sau này**. Đây cũng là nền cho Bước 4 (thêm lô khi khai hoang).

## Mục tiêu

- Tòa chưa mua **không còn chiếm lô**: lô trống hiện biển "Đất trống – rao bán".
- Mua tòa = chọn lô trống trong chế độ quy hoạch, xem trước tòa đặt ở đó; vị trí cũ được gợi ý mặc định.
- Luật đặt: tòa nằm trọn trong lô, mặt tiền (hàng cửa) giáp vỉa hè, không đè tòa khác, không chặn lối đi vỉa hè/cửa tòa bên cạnh.
- **Dời tòa (tái quy hoạch)**: chọn lô trống khác, trả phí, tòa đóng cửa thi công đến sáng hôm sau (1 ngày game); nội thất, hàng trên kệ, quầy thu ngân dời theo; nhân viên được gán lại đường đi.
- Mở rộng được **sang lô trống kề bên** (đúng ý "hướng nào cũng được, miễn chưa bị cửa hàng khác chiếm"); lô đó thuộc về tòa đã mở rộng sang.
- Mở rộng theo ô (Bước 2) áp dụng cho cả ba tòa phụ; mảnh `*-north-*` chuyển thành `floorTiles` như `east-wing`.
- Lô đất có thể ghép: hai lô kề nhau cùng trống có thể dùng cho một tòa lớn (chuẩn bị cho tòa lớn ở Bước 4+).
- Local và co-op cho cùng kết quả; server kiểm tra mọi lệnh.

## Ngoài phạm vi

- Dời tiệm chính (giữ cố định vì gắn kho, chỗ xuất hiện, cốt truyện); có thể mở ở bước sau.
- Lô mới ngoài vùng đợt 0 (Bước 4); giá đất theo mặt tiền (Bước 4); khóa lô khi hai người cùng quy hoạch (Bước 5).
- Phá bỏ/bán tòa, nhiều tòa cùng loại, loại tòa mới.
- Hoạt cảnh công trường chi tiết (chỉ rào chắn + biển "Đang thi công"; xe/công nhân để Bước 4).

## Phụ thuộc

`open-world-main-expansion` xong.

## Tiêu chí hoàn tất

- Ván mới: mua quán ăn vặt ở lô phía tây (lô cũ của tiệm xôi; quán nước rộng 10 ô không vừa lô 7 ô này) chạy đầy đủ: khách vào đúng cửa, quầy thu ngân, nhân viên, lưu/nạp, co-op.
- Dời tòa đang có hàng: hàng trên kệ, gán kệ (planogram), quầy, bàn ăn giữ nguyên tương đối; tiền trừ đúng; tòa đóng đến sáng hôm sau; không mất/nhân đôi nội thất.
- Save cũ (schema 5) nạp ra đúng vị trí cũ; tòa chưa mua không còn vỏ nhà.
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA ghi riêng.
