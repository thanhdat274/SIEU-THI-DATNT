# Proposal: Khai hoang theo đợt, đất có giá trị theo vị trí, thành phố lớn dần (Bước 4 thế giới mở)

## Vì sao

Sau Bước 3, người chơi đặt/dời tòa được nhưng chỉ trong bốn lô của vùng 36×22 ban đầu, nên "thế giới mở" vẫn chật. Chủ dự án muốn: **khai hoang mở thêm đất, kinh doanh nhiều thứ hơn, và khung cảnh xung quanh lớn dần từ hẻm nhỏ thành khu phố rồi thành phố đông đúc**. Đã chốt: biên thế giới 120×80 ô, **đường cố định theo từng đợt khai hoang** (người chơi không vẽ đường).

## Mục tiêu

- **Đợt khai hoang** là dữ liệu: vùng ô, đường/vỉa hè/đèn/cây/chỗ đỗ của đợt, các lô mới, điều kiện mở (cấp + tiền), thời gian thi công.
- Mở đợt: lệnh `reclaim_wave`, công trường 2 ngày game (rào, máy xúc, công nhân NPC), xong thì vùng chơi mở rộng, nhà trang trí trong vùng được thay bằng lô đất và hạ tầng của đợt.
- **Lô mới phải mua** (`buy_parcel`) rồi mới đặt tòa; giá = giá gốc × hệ số vị trí.
- **Giá trị vị trí**: lô góc ngã tư, mặt đường chính, mặt đường phụ có hệ số giá và hệ số khách khác nhau; nhịp sinh khách của tòa nhân theo hệ số vị trí của lô.
- **Ngân sách mở rộng** tăng khi khai hoang (thêm đất thì thêm chỗ xây).
- **Thành phố lớn dần**: số NPC nền, xe, độ đông của khu phố tăng theo cấp thành phố (số đợt đã mở + số tòa); dãy nhà trang trí tăng tầng theo cấp thành phố.
- Renderer và đường đi chịu được vùng chơi lớn: chia khối, chỉ vẽ phần nhìn thấy, đo FPS.

## Ngoài phạm vi

- Sở hữu đất theo từng người chơi, khóa lô khi cùng quy hoạch (Bước 5).
- Thuê đất, giá đất động theo thời gian, hợp đồng giữa người chơi, district, mục tiêu thành phố có nhiệm vụ (Bước 6+).
- Loại tòa mới (siêu thị lớn, nhà hàng, bãi xe...): mô hình hỗ trợ nhưng nội dung để change riêng.
- Tòa quay mặt lên phía bắc (mặt tiền nhìn từ sau): đợt nào cũng chọn lô nằm phía bắc một con đường.

## Phụ thuộc

`open-world-building-relocation` xong. Xung đột với `branch-chain` (chi nhánh là bản đồ riêng) đã được chủ dự án quyết 05/10/2026: chi nhánh là tòa trên cùng thành phố (`design.md` D9).

## Tiêu chí hoàn tất

- Mở đợt 1 từ save cấp đủ: công trường 2 ngày, sau đó đi bộ qua ngã tư sang vùng mới, mua lô góc, đặt quán nước; khách đến đúng cửa; lưu/nạp; co-op.
- Hệ số vị trí đổi doanh thu theo hướng đúng (mô phỏng: cùng tòa ở lô góc > mặt đường chính > đường phụ), số liệu provisional ghi rõ.
- FPS trên máy dev ở zoom xa nhất với hai đợt mở không thấp hơn 80% so với hiện tại (đo và ghi lại).
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA ghi riêng.
