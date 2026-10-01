# Design: Lộ trình cấp độ rõ ràng đến cấp 35

## Dữ liệu XP

`packages/game-data/src/progression.ts` là nguồn dữ liệu XP tích lũy ở đầu mỗi cấp (index 0 tương ứng cấp 1):

`[0, 80, 200, 360, 560, 800, 1080, 1400, 1780, 2200, 2900, 3630, 4390, 5180, 6000, 6850, 7730, 8640, 9580, 10550, 11400, 12350, 13400, 14550, 15800, 17150, 18600, 20150, 21800, 23550, 25500, 27600, 29900, 32400, 35200]`.

XP cần cho một cấp là hiệu giữa hai ngưỡng tích lũy. Cấp 35 là cap và không cần XP kế tiếp. Khi load save cũ, giữ nguyên level hợp lệ và tỷ lệ `experience / experienceToNextLevel`, quy đổi sang khoảng XP mới; level ngoài giới hạn được clamp 1..35. Không đổi cấu trúc save.

## Các hệ số phát triển

- Slot nhân viên giữ mốc đang có ở cấp 2/3, rồi tăng đơn điệu qua các mốc 10–35; dữ liệu dùng chung cho tuyển dụng và thông tin mở khóa. Một số mốc cao lấy ý tưởng từ tham khảo nhưng được nắn để không thu hồi slot đã có.
- Hệ số lưu lượng theo level theo các milestone cấu hình, sau đó giới hạn lưu lượng mô phỏng ở 6× để bản đồ và vòng spawn không tạo lượng khách vô hạn.
- Tăng sức chứa khách đồng thời từ 2 lên 3 ở cấp 10, khớp ba ô hàng chờ hiện có.
- XP bán hàng nhân 0.7 từ cấp 20 và 0.55 từ cấp 30. XP nhiệm vụ chưa nhân hệ số này.

## UI và giải thích

`LevelRoadmapModal` liệt kê cấp 2–35, XP cần thêm tính từ save hiện tại, tổng XP tích lũy, mặt hàng/nhà cung cấp/quầy/đất/slot nhân viên, tăng lưu lượng, tăng sức chứa và cap. `QuestModal` tập trung vào mốc kế; khi đã cap thì nói rõ người chơi đã đạt tối đa. Toast mỗi lần lên cấp tóm tắt mở khóa và chỉ đường đến lộ trình.

## Rủi ro và kiểm chứng

- Đổi đường cong XP làm thời gian lên cấp của các save thay đổi; migration theo tỷ lệ giảm sốc nhưng chưa được playtest.
- Traffic multiplier bị cap trong core; modal ghi rõ giới hạn để tránh hứa lượng khách thực tế vượt cap.
- Slot nhân viên cao cấp có thể ảnh hưởng payroll/performance; cần theo dõi ngân sách, tốc độ phục vụ và số actor sau playtest.
- Code được chỉnh trong change này chưa được chạy typecheck/test/build/browser; không coi các task kiểm chứng là hoàn tất.
