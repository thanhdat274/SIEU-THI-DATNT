# Proposal

## Why

Vỉa hè trước tiệm mới có hai quầy (cà phê vợt, bánh mì nướng muối ớt), cả hai đều tiêu hao nguyên liệu lấy từ kho. Game tham khảo có quầy **Vé số** ở góc vỉa hè: không cần nguyên liệu, bán tới "hết" thì nghỉ. Đây là món nhỏ, dễ nhận ra và rẻ nhất trong danh sách bổ sung (xem phân tích 05/10/2026 trong `tổng hợp.md`), nên làm trước các quầy ăn vặt, cơm tấm, nhà thuốc, cắt tóc/nail.

## What Changes

- Thêm quầy `ve_so` (cấp 6, giá mở 250.000 ₫) vào `STALLS`, **không có nguyên liệu kho**: vốn là tiền mặt mỗi vé (`cashCostPerServing`), lãi là hoa hồng đại lý.
- `StallDefinition` có thêm trường tùy chọn `sellUntilHour`: quầy bán dần từ 08:00 tới giờ đó rồi dừng (mặc định 22:00 như cũ, nên hai quầy cũ không đổi). Vé số bán tới 17:00.
- `sellStalls` tính số khung giờ theo từng quầy thay vì cố định 14.
- Hệ số mùa riêng cho `ve_so` (Tết cao hơn).
- Quầy hết vé (qua giờ bán hoặc bán đủ nhu cầu) hiện biển **HẾT** trên sprite: lõi phát `onStallStatusChanged`, renderer vẽ/ẩn biển.
- `StallModal` ẩn phần nguyên liệu và nút nhập nguyên liệu khi quầy không có nguyên liệu, ghi "vé" thay cho "suất" và giờ bán.
- Sprite `stall_ve_so` và `stall_sold_out_sign`.

## Capabilities

### New Capabilities

- `ve-so-stall`: quầy vé số vỉa hè không nguyên liệu, có giờ ngừng bán và biển HẾT.

### Modified Capabilities

- Không có spec chính sửa (hệ quầy chưa có spec riêng).

## Non-goals

- Không có quay thưởng, trúng giải hay bất kỳ cơ chế cờ bạc nào: chỉ bán vé lấy hoa hồng.
- Không đổi doanh thu hay nguyên liệu của hai quầy cũ.
- Không cân bằng kinh tế kỹ: số liệu là đề xuất, chưa playtest.
