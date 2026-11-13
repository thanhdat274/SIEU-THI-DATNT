# Nghiên cứu Coffee Sữa Ơi (coffee-sua-ne.vercel.app) — bài học cho Tạp Hóa 3D

> Ngày khảo sát: 13-11-2026. Chơi thật qua trình duyệt: màn đăng nhập, đủ 5 tab Cài đặt,
> Nhiệm vụ, Quản lý quán, Tiệm trò chơi, Dạo phố, Thành tựu, HUD trong game.
> Kết luận tổng: game này cùng "họ" thiết kế với Tạp Hóa 3D (theme kem, panel sáng, cấu trúc
> Cài đặt 5 tab gần như 1:1). Phần lớn thứ ta nghĩ là "thiếu" thực ra **đã có** — danh sách
> dưới chỉ liệt kê những gì Coffee Sữa Ơi có mà Tạp Hóa 3D **chưa có thật**.

## 1. Cài đặt — các mục đáng lấy (ưu tiên nhanh thắng)

Coffee Sữa Ơi có 5 tab: Hình ảnh · Đồ họa · Âm thanh · Chơi · Trợ năng. So chi tiết với
`src/ui/SettingsPanel.tsx` hiện tại:

| Mục của Coffee Sữa Ơi | Tạp Hóa 3D | Góp ý |
|---|---|---|
| **Chống nóng máy** (60 FPS khi cắm sạc/đang di chuyển, 30 FPS khi đứng xem — giảm nóng điện thoại) | ❌ Chưa có | Đáng lấy nhất trong tab Hình ảnh. Bản chất là một "thiết lập sẵn động": dùng FPS thật + sự kiện pointer để hạ render scale. Khớp với cơ chế Tự giữ khung hình mượt sẵn có |
| **Ngôn ngữ (Việt/Anh)** — đổi xong save & reload | ❌ Chưa có | Việc lớn (i18n toàn bộ chuỗi). Nếu làm, chốt sớm: chuỗi nằm rải rác trong UI/data, cần lớp `t()` trước. Đẩy xuống sau, đừng làm giữa chừng |
| Âm thanh **6 kênh**: Tổng · Nhạc nền · Môi trường · Máy móc (máy pha, máy xay) · Nhân vật (ly, tiền, bước chân) · Giao diện | Có 4 kênh: Tổng/sfx/nhạc/amb | Tách kênh "Giao diện" (click, mở panel) và "Máy móc" khỏi sfx — người chơi hay tắt tiếng UI nhưng giữ tiếng tiệm. Cần tag lại sfx theo nhóm ở `core/audio` |
| **Tạm dừng khi mở menu** | ❌ Chưa có | Switch đơn giản: khi panel mở → pause mô phỏng real-time. Hữu ích cho mobile vừa chơi vừa xem panel |
| **Hiện đường đi nhân viên** | ❌ Chưa có | Toggle debug vẽ đường đi của staff — học hỏi được từ nó: giúp người chơi hiểu vì sao nhân viên chậm |
| Trợ năng: **Icon tương phản cao** | ❌ Chưa có | Đã có Cỡ chữ/Giảm chuyển động/Tương phản cao/Lọc màu/Tắt chớp sáng — chỉ còn mục này: viền đậm + nền đặc cho icon nhỏ |
| Trợ năng: **Chuyển nhấn giữ thành nhấn một lần** | ❌ Chưa có | Cho người khó giữ ngón (motor): mọi thao tác giữ-để-kéo đổi thành bấm một lần. Có thể gắn với joystick/nút dock mobile trước |
| Footer: "Cài đặt được lưu riêng, áp dụng cho mọi save. Đổi đồ họa hay tiền tệ **không ảnh hưởng mô phỏng**" | ✅ Đã có ý tương tự | Không cần làm |

Điểm trình bày đáng chép: mỗi Row đều có **hint 1 dòng rõ lợi ích** ("Tắt nếu máy nóng và
muốn mượt tối đa", "Cao: đèn trang trí phát sáng buổi tối") — Tạp Hóa 3D đã làm tốt tương
tự, giữ chuẩn này cho mọi mục mới.

## 2. Màn đăng nhập / menu chính

Đã có gần hết (Giới thiệu, Cài đặt, Hướng dẫn, Có gì mới, Xếp hạng, Góp ý, Quy định, mã
chuyển máy). Còn thiếu:

1. **Cảnh báo thời gian chơi (đồng hồ chống nghiện)** — thẻ "Thời gian bảo vệ sức khỏe" luôn
   hiện ở menu, đếm phút chơi liên tục. Tạp Hóa 3D mới chỉ nhắc 180 phút trong Hướng dẫn.
   Theo Quy định dùng cũng nên có: đếm phiên + toast cảnh báo theo mốc (120/180 phút).
2. **Xác nhận bắt đầu "Chơi mới" có chọn phong cách khởi đầu** —Coffee Sữa Ơi cho chọn
   "Bàn ghế gỗ / nhựa" (đổi hẳn hình 3D quầy đầu game) + lời mở đầu 3 chương (bỏ qua được).
   Tạp Hóa 3D có thể làm nhẹ hơn: chọn màu sơn mặt tiền/bộ bàn ghế đầu ngõ khi tạo ván mới,
   gắn vào save. Câu chuyện mở đầu không bắt buộc nhưng **checklist ngày đầu** ("chọn món →
   nhập hàng → xem nhân viên → mở cửa") hiện ngay panel Sổ đầu ngày rất đáng học — mình đã
   có MorningPanel, chỉ cần dải hướng dẫn 4 bước cho ngày 1.
3. **Sao lưu ra file .txt** (bên cạnh mã chữ) + **tự động đồng bộ cloud** có trạng thái bật/tắt
   rõ ràng ("Đang tắt tự động đồng bộ. Bạn chơi trên máy có thể mất khi xóa ứng dụng").
   Tạp Hóa 3D đã có mã TH3D1 + cloud khi đăng nhập Google — chỉ thiếu: trạng thái đồng bộ
   hiển thị rõ + nút tải file backup về máy.

## 3. Trong game (HUD & panel)

1. **Nút Thư gọn (ẩn UI)** — ẩn toàn bộ HUD để xem/phù cảnh. Rẻ: một state ẩn dock + top bar.
2. **Undo/Redo** cho thao tác dựng đặt kệ — Coffee Sữa Ơi có 2 nút mũi tên. Tạp Hóa 3D có
   Sơ đồ kệ; undo trong arrange sẽ tốn công, cân nhắc làm undo 1 tầng (trở lại vị trí trước).
3. **Nhiệm vụ "chọn tối đa 2 cho hôm nay"** — người chơi tự chọn 2 quest trong danh sách,
   mỗi quest có thanh tiến độ + thưởng tiền/XP/danh tiếng. Cơ chế "chọn" khiến quest thành
   kế hoạch cá nhân thay vì danh sách việc cứng. Tạp Hóa 3D có Nhiệm vụ — có thể thêm lớp
   "khóa 2 việc ưu tiên hôm nay" lên hệ quest sẵn có.
4. **Tiệm trò chơi có mốc thưởng theo lượt chơi** (ván 3/7/15/30/50 → tiền, tối đa 5 lần/ngày,
   quà lưu theo quán) — cách biến minigame thành thói quen hàng ngày. Tạp Hóa 3D có
   minigame riêng; nếu chưa có mốc thưởng/ngày thì đây là mẫu chép được.
5. **Dạo phố dạng lưới thẻ + chạm trên bản đồ 3D** — các điểm (Vé số, Chùa, Casino, Ngân
   hàng, Vay nóng) là thẻ icon màu sặc sỡ, và **chạm được ngay trên map**. Tạp Hóa 3D
   (StrollPanel) đang dạng list hàng ngang — có thể chuyển sang lưới thẻ 2 cột cho giống
   chuẩn thẻ của mình + về lâu dài gắn hotspot trên map.

## 4. Meta: Xếp hạng & Thành tựu

**Bảng xếp hạng tuần** của Coffee Sữa Ơi mạnh hơn:
- Bục podium top 3 với avatar + **danh hiệu** ("Bậc thầy pha chế", "Ông chủ có tiếng").
- 2 lớp tab: Thời gian (Tuần này/Tuần trước/Mọi thời đại) × Chỉ số (Doanh thu/Giờ chơi/Khách phục vụ).
- Dòng "Tuần 09/11–15/11 · chốt 23:59 Chủ nhật (giờ VN) · Còn 2 ngày 0 giờ" — đếm ngược chốt tuần.
- Thẻ "Quán của bạn" ghim trên đầu: avatar, danh hiệu, nút Đổi avatar.

Tạp Hóa 3D có bảng tuần (khách + co-op) — nên lấy: **đếm ngược chốt tuần + 3 chỉ số**.
Podium/danh hiệu/avatar đẹp nhưng cần server lưu thêm — xếp sau.

**Thành tựu**: 3 thẻ tổng trên đầu (x/57 bậc · XP đã nhận · tiền thưởng đã nhận), mỗi thành
tựu có **nhiều bậc** với thưởng tăng dần (+60 XP +100.000đ/bậc) — cột mốc rõ, reward hai loại.
Tạp Hóa 3D có AchievementsPanel — thiếu thì thêm thẻ tổng + bậc thưởng.

## 5. Thứ tự gợi ý (theo giá trị/công sức)

1. ⚡ Nhanh, đáng làm ngay: **Chống nóng máy** · **Tạm dừng khi mở menu** · **Thư gọn** ·
   đồng hồ thời gian chơi ở menu · đếm ngược chốt tuần ở bảng xếp hạng.
2. 🔨 Vừa: tách kênh âm thanh Giao diện/Máy móc · Icon tương phản cao · nhấn giữ→nhấn một
   lần · lưới thẻ Dạo phố · mốc thưởng minigame · bậc thưởng Thành tựu.
3. 🏗️ Lớn, cần thiết kế riêng: chọn phong cách khởi đầu khi tạo ván · chọn-2-nhiệm-vụ/ngày ·
   trạng thái đồng bộ cloud + backup file · i18n Việt/Anh (cuối cùng — tốn nhất, chốt
   kiến trúc chuỗi trước khi nhảy vào).

## Ảnh chụp tham khảo

Đã lưu tại `%TEMP%/cs1-landing.png` … `cs21-food.png` (phiên làm việc 13-11-2026):
cs2-settings (Hình ảnh) · cs3-gfx · cs4-audio · cs5-play · cs6-a11y · cs7-backup ·
cs8-rank · cs9-news · cs11-newgame · cs14-hud · cs15-quests · cs16-manage · cs18-games ·
cs19-street · cs20-achv.
