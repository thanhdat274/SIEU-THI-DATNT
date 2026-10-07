# UX-RULES — Tiệm Tạp Hóa Đầu Hẻm

> Người duy trì: **UI/UX Lead**. Quy chuẩn trải nghiệm người chơi (game UX) áp dụng mọi feature.

## 1. Clarity

Người chơi phải trả lời được, không cần đoán:
- What is this? / What can I do? / What happens if I click? / What should I do next?

Kiểm tra: label, icon, tooltip, feedback, instructions. Nhãn nút rõ nghĩa, dùng ngôn ngữ người chơi Việt.

## 2. Discoverability

Tính năng phải được **phát hiện**, không đòi người chơi "đoán". Action chính hiển nhiên (sticky footer khi cần).

## 3. Interaction flow

Flow tự nhiên: Open → Understand → Interact → Confirm → Feedback → Continue gameplay. Không bước thừa.
Modal không chồng modal không cần thiết; không yêu cầu tap chính xác control bé.

## 4. Cognitive load

Tránh: quá nhiều button, quá nhiều thông tin/notification, modal chồng modal, menu phức tạp, buộc nhớ nhiều.
Khi nghi ngờ → giảm, ưu tiên thông tin P0.

## 5. Feedback

Mọi interaction quan trọng có feedback phù hợp (visual/audio/animation/notification/state change).
Toast tối đa 3 mục thấy được; toast đánh giá khách chỉ 1 cái/lúc và tự tắt nhanh (đã triển khai).

## 6. Error prevention & recovery

- Ngăn thao tác sai; confirm hành động nguy hiểm; undo khi phù hợp.
- Error message rõ, không làm mất dữ liệu ngoài ý muốn.
- Save chỉ báo thành công sau persistence thật; reset xác nhận inline và hủy được.

## 7. UX không phá gameplay

UI không được làm gián đoạn/chặn gameplay, không che player/NPC/object tương tác, không tạo overlay quá mức.
Ưu tiên: Gameplay > Player visibility > Interaction clarity > Game UX > Responsive > Decoration.

## 8. Không chấp thuận

- Button mơ hồ (vd "Chăm các kệ" khi thực chất là "Bày hàng lên kệ" — phải đổi tên cho rõ). 
- Yêu cầu sửa chung chung kiểu "làm đẹp hơn"; phải mô tả vấn đề + giải pháp + acceptance.
