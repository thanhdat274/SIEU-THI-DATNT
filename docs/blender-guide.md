# Cẩm nang tài sản 3D (Blender)

> Đọc file này trước khi tạo hoặc sửa bất kỳ tài sản 3D nào. Mục tiêu và luật cứng nằm ở `promt_game.md`; file này chỉ là hướng dẫn thao tác. Tài sản 3D chỉ làm khi phục vụ lối chơi, tiến trình hoặc cảm xúc người chơi, không tạo hàng loạt để trang trí.

## Công cụ và pipeline

- Môi trường đã bật plugin Blender (mục "游戏/3D" trong Zcode: "Use the official Blender CLI to install or locate Blender"). Mọi tài sản 3D mới (prop cửa hàng, hàng hóa, đồ đạc, nhân vật, cảnh quan, vật trang trí) phải được tạo bằng Blender qua plugin này, không dựng tạm bằng hình hộp/khối nguyên thủy trong code khi Blender làm được tốt hơn.
- Trước khi làm, dùng plugin để xác định/cài Blender và kiểm tra phiên bản. Tận dụng pipeline có sẵn (GĐ172-176: script dựng GLB, nén draco, atlas bake tùy chọn, lazy loader, không chặn lưới điều hướng). Đọc lại các GĐ này trong PROGRESS.md/archive trước khi tạo pipeline mới, không làm trùng lặp.
- Quy trình chuẩn: script Python bpy tái lập được (chạy headless, ví dụ `blender -b -P script.py`) → xuất GLB → nén draco → đưa vào thư mục tài sản → tải lười trong code. Script nguồn đặt trong thư mục công cụ của dự án, commit cùng tài sản; không commit file .blend nặng nếu không cần.

## Phong cách và màu sắc

- Khớp phong cách hình ảnh đã chọn: ấm áp, gần gũi, tạp hóa Việt Nam (sạp, kệ gỗ, thùng nhựa, bao bì, đèn lồng, xe máy, mái tôn, biển hiệu). Dùng bảng màu chung của hệ thống thiết kế, low-poly/stylized nhất quán.
- Mọi tài sản phải có màu đầy đủ, không để mesh xám mặc định. Ưu tiên: (1) texture vẽ tay + atlas UV cho prop chính; (2) vertex color (COLOR_0) cho low-poly flat shading, file nhỏ; (3) Principled BSDF với baseColor khi cần độ mượt cao. Khi export GLB, mở lại trong Blender kiểm tra mesh đã có màu.
- Nếu dùng vertex color, export từ three.js với `MeshStandardMaterial(vertexColors: true, roughness: 0.95, metalness: 0)`. Khi Blender headless render preview, dùng node VertexColor → Emission (không phải Base Color) để bake; ShaderNodeAttribute thường trả về đen ở headless.
- Preview PNG (`dev/kit-previews/`) có thể hiện xám do WORKBENCH không đọc vertex color — lỗi hiển thị, không phải mất màu. Luôn xác nhận màu trong game tại http://localhost:5173/. Với Blender GUI, dùng shading "Material Preview" hoặc "Rendered" và Principled BSDF có baseColor khớp vertex color.

## Chất lượng và ngân sách

- Tỉ lệ đúng thực tế (ghế nhựa ~44 cm cao, bàn ~75 cm). Chi tiết phù hợp vai trò: ghế có tựa lưng + bo cạnh; thùng gỗ có nẹp góc + đai sắt; bồn nước có khung nghiêng + nắp vòm + vòi rút. Tránh hình học quá đơn giản (cylinder 6 cạnh) — tăng segment, dùng Torus cho viền, Sphere cho vòm, RoundedBox cho cạnh mềm.
- Triangle mỗi prop: nhỏ ≤500, trung bình ≤1500, lớn ≤2500.
- Ngân sách hiệu năng đặt tập trung ở file cấu hình: tam giác theo loại, kích thước texture, số draw call; ưu tiên dùng chung vật liệu/atlas và instancing. Đo và ghi dung lượng từng tài sản và tổng (trước/sau nén).
- Pivot và tỉ lệ đúng, tên rõ ràng, không làm hỏng điều hướng/va chạm, có fallback nếu tải lỗi để game không vỡ.

## Đặt vào cảnh

Tuân thủ mục "Bố cục và thẩm mỹ cảnh 3D" trong `promt_game.md` (hành lang cửa tiệm, mật độ, prop phải có lý do đứng đó). Chạy test `kitPlacementProblems()` sau khi đổi vị trí.

## Khi nào coi là xong

Nhìn đẹp trong game đang chạy tại http://localhost:5173/ (QA xem nhiều góc và kích thước màn hình), đúng ngân sách, không lỗi console, không làm chậm lần tải đầu, và đã ghi vào PROGRESS.md (tài sản nào, script nào, dung lượng bao nhiêu). Chạy Blender CLI headless được phép (không phải khởi động server).
