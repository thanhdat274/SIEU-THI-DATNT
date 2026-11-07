# PROGRESS GĐ1448–1462 (archive)

- GĐ1448: Bún giò thủ (u49, bếp nồi: 2 bún + 1 giò thủ bà Tám + 1 hành phi → 10 tô, bán 15k) — lối ra thứ 3 cho giò thủ; test recipeDepth.
- GĐ1449: Cá basa hấp chanh muối (u44, nồi hấp: 2 basa + 1 chanh muối hàng xóm → 6 phần, bán 32k) — lối ra bếp đầu tiên cho chanh muối; test recipeDepth.
- GĐ1450: Cá viên chiên sốt me (u43, chảo chiên: 3 cá viên + 1 me dầm bà Tám → 14 ly, bán 11k) — lối ra bếp cho me dầm (trước chỉ có quán nước); test recipeDepth.
- GĐ1451: Bánh mì chả lụa bà Tám (u39, bếp nướng: 6 bánh mì + 1 chả lụa bà Tám → 12 ổ, bán 15k) — lối ra thứ 2 cho chả lụa bà Tám; test recipeDepth.
- GĐ1452: Cá basa kho dưa muối (u33, bếp nồi: 1 basa + 2 dưa muối hàng xóm → 5 phần, bán 20k) — lối ra thứ 2 cho dưa muối. Thử u31 làm lệch simGolden cấp 30 → dời 33. longSessionLeak chập chờn khi chạy cả bộ (chạy riêng qua).
- GĐ1453: Bánh bao lạp xưởng (u45, nồi hấp: 3 bột mì + 1 lạp xưởng bà Tám → 12 cái, bán 16k) — lối ra thứ 2 cho lạp xưởng; test recipeDepth.
- GĐ1454: Thịt kho cà pháo (u33, bếp nồi: 1 thịt heo + 2 cà pháo muối → 4 phần, bán 18k) — lối ra thứ 2 cho cà pháo; test recipeDepth.
- 🧭 GĐ1455 (Leader): DỪNG thêm món dưới cấp 50 — economySimL50 daily_smile ở mốc 22/28 (sát ngưỡng ≥22); thử Bánh đa nướng (u41) và Bánh cuốn trứng (u42) đều tụt 21 → hoàn tác. Danh mục <50 đã bão hòa với bot bày xoay vòng; chiều sâu tiếp theo đi hướng 2/3 ở cấp ≥50 hoặc làm sâu món có sẵn, không thêm SKU.
- GĐ1456: Cánh gà chiên chanh muối (u52, chảo chiên: 2 cánh gà + 1 chanh muối → 8 phần, bán 22k) — lối ra bếp thứ 2 cho chanh muối, đặt ≥51 theo GĐ1455; test recipeDepth.
- GĐ1457: Bánh bao chà bông (u53, nồi hấp: 3 bột mì + 1 chà bông nhà làm → 12 cái, bán 18k) — lối ra thứ 3 cho chà bông; test recipeDepth.
- GĐ1458: Bánh tráng cuốn giò thủ (u54, bếp nướng: 1 bánh tráng phơi sương + 1 giò thủ bà Tám → 12 cuốn, bán 13k) — nối 2 hàng xóm; bỏ rau khỏi công thức để không cướp lối ra tốt nhất của rau trại (farmKitchenValue).
- GĐ1459: Cá basa chiên sốt me (u55, chảo chiên: 2 basa + 1 me dầm bà Tám → 7 phần, bán 24k) — lối ra bếp thứ 2 cho me dầm; test recipeDepth.
- GĐ1460: Cơm cháy chà bông (u56, chảo chiên: 1 túi gạo + 1 chà bông → 16 miếng, bán 15k) — món khô để lâu; test recipeDepth.
- GĐ1461: Xôi lạp xưởng trứng (u57, quây xôi: 1 nếp + 1 lạp xưởng bà Tám + 2 trứng → 16 gói, bán 12k) — lối ra thứ 3 cho lạp xưởng; test recipeDepth.
- GĐ1462: Bánh đa trộn giò thủ (u58, bếp nồi: 2 bánh đa + 1 giò thủ + 1 hành phi → 10 tô, bán 17k) — lối ra thứ 2 cho bánh đa; test recipeDepth.
- ✅ **File tham khảo ĐÃ KHAI THÁC HẾT (rà GĐ1256/1259):** mọi mục "đáng bê" từ `PHAN-TICH-THAM-KHAO-XOM-NONG-TRAI.md` đều đã có: pipeline asset kit Blender→GLB+manifest (GĐ172–176) · juice quầy GĐ173 + juice trại GĐ1255 · tách chunk vendor/wgpu GĐ174/1196 (chunk to nhất còn lại là three.webgpu — thư viện khởi động, không tách được thêm) · guard WebGL GĐ175 · font subset woff2 tự host + Baloo 2 GĐ1259. Còn treo chỉ "Top góp ý" (chờ ra public) và sprite atlas (emoji là lựa chọn chủ đích). `PHAN-TICH-THAM-KHAO-HAPPYTOWN.md` là tài liệu lịch sử — P0/P1/P2 đều đã khép từ trước. Hai file này giữ lại làm đối chiếu, không cần rà lại.
