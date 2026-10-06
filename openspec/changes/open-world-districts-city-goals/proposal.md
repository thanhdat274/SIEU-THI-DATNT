# Proposal: Khu vực có bản sắc và mục tiêu thành phố (Bước 6d thế giới mở)

## Vì sao

Sau Bước 4, thành phố có nhiều đợt đất nhưng mọi chỗ "giống nhau" ngoài hệ số mặt tiền; `cityTier` tăng tự động theo số đợt/tòa, không có mục tiêu để người chơi hướng tới. Chủ dự án muốn cảm giác **"từ bãi đất thành thành phố mình xây"** và chơi lâu không nhàm. Bản sắc khu vực làm việc chọn chỗ đặt tòa có chiều sâu; mục tiêu thành phố cho người chơi lý do để mở loại hình mới, khai hoang tiếp.

## Mục tiêu

- **Khu vực (district)**: mỗi đợt/nhóm lô thuộc một khu (dân cư, thương mại, văn phòng, ăn uống, ven công viên). Khu quyết định thành phần khách (nhóm NPC), giờ cao điểm và nhóm hàng được ưa chuộng, qua hệ `modifiers.ts` có sẵn.
- **Hàng xóm kéo khách**: tòa bổ trợ nhau (tạp hóa ↔ quán ăn, cà phê ↔ văn phòng, bãi giữ xe ↔ mọi tòa) đặt gần nhau thì cùng đông khách hơn, thay cho hệ số cụm ẩm thực hiện chỉ đếm số tòa.
- **Cấp thành phố** (riêng với cấp người chơi): tăng khi hoàn thành **mục tiêu thành phố** (khách/ngày, số loại hình, số đợt, hoàn thiện hạ tầng như bãi xe/ngã tư, doanh thu tuần). Cấp thành phố thay công thức `cityTier` tự động của Bước 4 và là điều kiện bổ sung để mở đợt khai hoang sau.
- **Ký ức thành phố**: biển kỷ niệm ở tiệm đầu tiên, nhật ký thành phố (Bước 5) có mốc lớn kèm ngày game, ảnh chụp nhanh bản đồ thu nhỏ ở mỗi cấp thành phố.
- Phần thưởng mục tiêu: tiền, danh tiếng, vật trang trí công cộng (đài phun nước, ghế đá) đặt ở khu tương ứng.

## Ngoài phạm vi

- Người chơi tự vẽ ranh giới khu (khu gắn cố định với đợt, đúng quyết định đường cố định theo đợt).
- Chính sách thành phố (thuế khu, quy hoạch công), bầu cử, sự kiện thành phố lớn.
- Loại tòa mới gắn khu (dùng registry `open-world-building-types`).

## Phụ thuộc

`open-world-land-reclamation` (đợt, `cityTier`, bảng Thành phố); nên sau `open-world-building-types` (mục tiêu đếm loại hình).

## Tiêu chí hoàn tất

- Cùng một quán cà phê đặt ở khu văn phòng đông khách buổi sáng hơn đặt ở khu dân cư (mô phỏng), quán ăn vặt ở khu dân cư đông buổi chiều tối hơn.
- Hoàn thành đủ mục tiêu cấp thành phố 2 thì cấp tăng, trần NPC/xe và tầng nhà tăng, đợt W2 mở khóa thêm điều kiện cấp thành phố.
- Biển kỷ niệm và nhật ký mốc hiển thị đúng sau lưu/nạp và trong co-op.
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA ghi riêng.
