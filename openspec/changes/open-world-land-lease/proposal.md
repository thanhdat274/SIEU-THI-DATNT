# Proposal: Thuê đất và giá đất thay đổi theo thành phố (Bước 6b thế giới mở)

## Vì sao

Sau Bước 4, lô ở đợt mới phải mua đứt. Người chơi muốn thử mở quán ở một góc đường mới mà chưa đủ tiền mua sẽ bị kẹt. Thuê đất cho phép **thử trước, mua sau**. Giá đất tăng theo độ phát triển của thành phố biến việc **mua sớm thành một quyết định đầu tư**, gắn thêm ý nghĩa cho khai hoang.

## Mục tiêu

- Lô chưa sở hữu có thể **thuê theo ngày**: trả tiền thuê mỗi sáng, được đặt tòa như lô sở hữu.
- **Chuyển sang mua**: mua lô đang thuê được khấu trừ một phần tiền thuê đã trả.
- **Hết tiền thuê**: thiếu tiền thì cộng nợ; nợ tới ngày thứ 3 thì tòa trên lô thuê đóng cửa tới khi trả; không tự phá tòa, không mất nội thất.
- **Giá đất động**: giá mua và giá thuê của lô nhân hệ số theo `cityTier` (Bước 4) và số tòa đang mở trong bán kính.
- Trả lại lô thuê: tòa trên đó phải dời đi trước (Bước 3).

## Ngoài phạm vi

- Cho NPC hoặc người chơi khác thuê lại đất của mình (cần hợp đồng, Bước 6c).
- Bán lô đã mua; đầu cơ đất; thị trường đất ngẫu nhiên.
- Cân bằng cuối.

## Phụ thuộc

`open-world-land-reclamation` (lô, `buy_parcel`, `cityTier`, hệ số vị trí). Có thể làm song song với `open-world-building-types`.

## Tiêu chí hoàn tất

- Thuê lô góc W1, đặt quán nước, chạy 5 ngày trả tiền thuê đúng mỗi sáng (sổ cái loại `rent`), rồi mua với khấu trừ đúng.
- Thiếu tiền thuê 3 ngày liên tiếp: tòa đóng cửa từ sáng ngày thứ 3, trả nợ thì mở lại, nội thất và hàng còn nguyên.
- Giá lô tăng đơn điệu khi `cityTier` tăng và khi có thêm tòa gần đó (test).
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA ghi riêng.
