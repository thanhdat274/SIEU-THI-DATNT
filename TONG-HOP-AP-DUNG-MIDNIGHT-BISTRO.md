# TỔNG HỢP MIDNIGHT BISTRO → ÁP DỤNG CHO TẠP HÓA ĐẦU NGÕ

> Ngày: 07/11/2026 (đợt nghiên cứu 7 — chơi thật ở Level 5→6, quét lại toàn bộ Shop 300 món, sổ Quests)
> Nguồn số liệu: đo trực tiếp từ live UI `midnightbistro.net/play.html` (save "Nghien Cuu Tap Hoa", Level 6) + các đợt 1–6 đã ghi trong `PHAN-TICH-THAM-KHAO-MIDNIGHT-BISTRO.md`.
> **Nguyên tắc:** chỉ học cơ chế + đường cong cân bằng. KHÔNG chép tên món, hình, câu chữ của họ — tất cả "Việt hoá" theo fantasy tạp hóa → siêu thị.

---

## A. Bức tranh vòng chơi (1 đoạn)

Mua đồ chức năng (bếp/bàn/ghế/máy/toilet) + đồ trang trí → đặt lên lưới isometric → khách tới đều theo **sao hài lòng × điểm trang trí** → gọi món (thực đơn 183 món, tối thiểu 12) → bồi bàn chạy phiếu, bếp nấu, bưng ra → trả tiền + tip → đi toilet/máy chơi (trả phí mỗi lượt) → tiền + XP lên cấp → mở món mới, đồ mới, mở rộng 7×7 → 39×39. Gắn thêm: **cờ vinh danh theo quốc gia** (học đủ món 1 nước = buff tốc độ + decor) khiến người chơi có mục tiêu "thu thập" dài hạn trên chính thực đơn.

---

## B. 12 hệ thống với số liệu chốt (kiểm chứng đợt 7)

### B1. Đồ vật = máy in tiền (300 món, quét đủ)
| Nhóm | Số lượng | Dải giá | Luật cân bằng |
|---|---|---|---|
| Bếp (stove) | 11 | 280–4.500 | chỉ khác ngoại hình; chọn vị trí đứng đầu bếp |
| Bàn | 20 | 20–4.000 | rẻ → mở sớm; ghế phải kề bàn |
| Ghế | 16 | 10–3.600 | mỗi ghế = 1 khách |
| Máy thu phí | 8 | 1.500–3.600 | **giá ≈ phí/lượt × 90** (hoàn vốn ~90 lượt) |
| Toilet | 5 | 500–60.000 | hoàn vốn CHẬM 500–1200 lượt = tiện ích, không phải nguồn lời |
| Trang trí | ~230 | 30–2.200.000 | cộng điểm 🩷 kéo khách (B5) |
| Đặc biệt (landmark) | 10 | 600k–2.2tr | +50 đến +200 điểm, "khoe" cuối game |

### B2. Khách & rating
`khách/phút = BASE + PER_STAR×rating + decorScore/200 × rating/5`; kiên nhẫn 75s; rating = TB hài lòng 100 khách gần nhất × 5. **Đo thật đợt 7:** ở Lv5–6, 2 bàn/6 ghế, rating 3.5, decor 55 → quán luôn đầy (10–14 người), tiền 18.3k → 24.5k trong ~4 phút chơi thật. Chỗ ngồi là nút thắt đầu tiên — đúng thứ tự "ghế trước, máy sau".

### B3. Món ăn — 183 món, 62 quốc gia
- Học món bằng xu (500–6.500) + nguyên liệu học; nâng sao = đủ lượt bán **và** đủ nguyên liệu hiếm; đồ đựng tự lên đời theo sao (giấy → lá → gỗ → sứ → bạc → vàng).
- **Bán tối thiểu 12 món** (không phải 3) — ép mở rộng thực đơn ngay.
- Món mặc định (nước/súp/bánh mì) luôn bán, giá xu rất thấp (1–8).
- Bộ lọc thực đơn **theo quốc gia** — 62 nước, Việt Nam nhiều nhất: **27 món**.

### B4. 🆕 Cờ Vinh Danh Ẩm Thực (5-Star Culinary Honors) — hệ MỚI đợt 7
- Học **đủ mọi món của 1 quốc gia** → nhận cờ nước đó: **+10 điểm decor** và **buff +0.5% tốc độ**.
- Cờ chia 2 loại buff: **tốc độ bồi bàn** (16 nước: Ý, Việt, Thái, Hy Lạp, Tây Ban Nha, Nhật, Đức, Cuba, Đài Loan, Thụy Sĩ, Mexico, Anh, Hàn, Thụy Điển, Indonesia, Malaysia) và **tốc độ khách di chuyển** (15 nước: Pháp, Thổ, Mỹ, Puerto Rico, Ấn, Nga, TQ, Brazil, Philippines, Iceland, Mông Cổ, Greenland, Campuchia, Peru, Nam Phi).
- Đưa **tất cả món của nước đó lên 5★** → cờ nâng cấp: **+20 điểm decor** và **thêm +1% tốc độ**.
- Tổng mục tiêu: 0/62 cờ. **Cờ bị tước nếu nước đó thêm món mới** chưa học → giữ chân dài hạn.
- Vai trò thiết kế: biến "mở rộng thực đơn" từ nghĩa vụ thành **bộ sưu tập có lợi ích chạy được** (buff = chơi nhanh hơn), gắn danh tính văn hoá từng nước.

### B5. Trang trí nhiều lớp (đo đủ 300 món đợt 7)
- **Sơn/át nền theo ô: 40 màu × 280 xu/ô = +1 điểm** — rẻ nhất, đổi skin cả quán.
- Nền đặc biệt: Terrazzo 330, Encaustic 390, Gold Leaf 840 (+3).
- **Vách ngăn chia khu (zone divider) 9 loại: 150–1.300 xu, đều +3** ( Wooden Slat 150, Frosted Glass 300, Clear Glass 330, Shoji 380, Zen Bamboo 750, Stained Glass 890, Moroccan 1.300, Aquarium Wall 960, Rose Trellis 650) — rào khu ăn uống không chặn lối.
- **Đồ dùng bếp = decor**: dao nam châm+thớt 540 (+6), treo chảo đồng 680 (+6), kệ gia vị 340 (+9), lò vi sóng 800 (+5), tủ lạnh 780 (+5), máy rửa bát 1.500 (+5), bồn rửa 2k (+3) → 20k (+8) → 75k mạ vàng (+15).
- Thang điểm: 30–400 xu → 1–6 điểm (mục tiêu ngắn); 600–3.000 → 8–15; landmark 0,6–2,2 triệu → 50–200.

### B6. Sự kiện theo ngày thật
Đồ Halloween 2026 (ghế dơi + bàn bí ngô) giá 250.000, +1 điểm — **event theo lịch thực**, giá "khoe", điểm/xu rất thấp. Game mình có lễ Tết/Trung thu — cùng cơ chế.

### B7. Mở rộng — 3 thanh song song + từng ô (số chốt đợt 7)
| Thanh | Mốc | Cấp | Giá khởi điểm |
|---|---|---|---|
| Diện tích | 9×9 → 11×11 → … 23×23 | 1/8 | 2.500 |
| Kho đồ nội thất | 5 → 11 chỗ | 0/9 | 5.000 |
| Tủ nguyên liệu nấu +100 | tới 10.100 | 0/200 | 290.000 |
Sau 23×23: mua **từng ô lẻ tới 39×39**, ô mới phải tiếp giáp đất cũ (mô hình CS2).

### B8. Nhân viên: bồi bàn nhặt phiếu → bếp → bưng ra; thiếu nguyên liệu bếp chờ 5s rồi hủy đơn. Tuyển bằng đăng tin 1.000/lượt. (Bảng chi tiết: PHAN-TICH mục 6.6.)

### B9. Kinh tế ngoại vi (đo thật đợt 7)
- **Earnings While Away:** vắng 55 phút (quán 2 bàn, 3.5★) → 999 xu + "199 guests dropped by". Tỷ lệ ~18 xu/phút vắng = ~5% tốc độ chơi thật — đủ ngọt để quay lại, không phá cân bằng.
- Sau reload hiện toast chào mừng + thu tiền vắng nhà ngay — **quán vẫn "sống" khi offline**.
- **Mở/đóng cửa bằng khánh treo trên cửa** — biển đỏ CLOSED trên cửa khi đóng; mở cửa khách mới vào (kiểm chứng: sau reload quán đóng, bấm khánh mới có khách).
- Điểm danh 50 ngày: `floor(1500×N / 1000)×1000`, N=1→1.000… N=50→75.000; bỏ 1 ngày về N=1.
- Bán lại đồ cho shop ~10% giá; Chợ Nội Thất (Cấp 4+) để bán giá tốt hơn.

### B10. Onboarding 2 lớp
11 nhiệm vụ (mỗi bước dạy 1 loại đồ: bàn+ghế → vách ngăn (có nút bỏ qua) → decor = đồ dùng bếp → mở rộng) + **tour HUD khoanh vùng** dạy đọc thanh tiền/sao/decor. Khi đang đặt đồ: ô xanh/đỏ theo lưới, đồ treo tường bám tường tự động, ghế tự xoay vào bàn.

### B11. UX đặt đồ (kiểm chứng mắt, đợt 6)
Xem PHAN-TICH mục 8.1 — điểm mới đợt 7: quà điểm danh + nhiệm vụ hiển thị ngay trên HUD đầu màn đăng nhập ("Vốn nhỏ 16.000đ — vào tiệm nhận ngay").

### B12. Cái họ làm mà mình KHÔNG nên copy
Paywall tủ nguyên liệu 290.000×200 cấp (bồn tiêu tiền), Côn trùng/Tổ yến làm nguyên liệu (lệch fantasy), tên/asset/chữ của họ.

---

## C. Bản đồ áp dụng vào Tạp Hóa Đầu Ngõ (thứ tự đề xuất)

| # | Hệ | State trong repo | Việc còn lại (nếu làm) |
|---|---|---|---|
| 1 | Bàn + ghế ăn tại chỗ, khách đói xếp hàng | ✅ GĐ1490–1492 | — |
| 2 | Nhà vệ sinh 3 bậc thu phí chậm | ✅ GĐ1494 | — |
| 3 | Máy thu phí mỗi lượt (giá = thu/lượt × 90) | ✅ GĐ1493 | thêm máy khi mở khu ăn của siêu thị |
| 4 | Điểm trang trí × sao, bỏ trần | ✅ GĐ1495 | — |
| 5 | Sao món + đồ đựng 4 bậc kiểu Việt | ✅ GĐ1496 + GĐ1526 | — |
| 6 | **Trang trí nhiều lớp**: sơn nền/tường theo ô + vách ngăn chia khu | ✅ GĐ1943 (khu siêu thị +🩷/+2% giá, vách quanh khu +2🩷, sơn nền/vách theo khu) | — |
| 7 | **Đồ dùng bếp = decor khu bếp** | ✅ đã có đồ bếp | — |
| 8 | **Cờ vinh danh đặc sản vùng miền** (bản Việt hoá của B4) | ✅ regionFlags | — |
| 9 | Thực đơn tối thiểu theo cấp quán | ✅ GĐ1536 (tip theo độ đủ thực đơn) | — |
| 10 | Mở rộng từng ô tiếp giáp | ✅ GĐ1944 (ô sau bậc Đại siêu thị) | — |
| 11 | Thu nhập khi vắng mặt | ✅ GĐ1497 + GĐ1531 (≈5%) | — |
| 12 | Sự kiện theo lịch (Tết/Trung thu) | ✅ GĐ1513 | — |

**Công thức mượn được ngay (1 dòng code):** điểm danh `floor(1500×N/1000)×1000`; máy thu phí `giá = thu/lượt × 90`; decor khách/phút `decorScore/200 × rating/5`; buff cờ `+0.5%/nước, +1% khi 5★`.

## D. Bài học lớn nhất đợt 7

1. **Cờ vinh danh quốc gia** là mảnh ghép còn thiếu cho ý tưởng "đặc sản Bắc–Trung–Nam" của mình: nó biến thực đơn thành bộ sưu tập có buff chạy được — làm cho khu ăn uống của siêu thị có "mục tiêu dài hạn" mà không cần thêm hệ mới.
2. **Trang trí nhiều lớp (sơn/vách/nền theo ô)** là chi phí code thấp – hiệu ứng cá nhân hoá cao nhất trong game; khớp luôn nhu cầu "khu tạp hóa nền gạch, khu ăn uống nền lát" của siêu thị.
3. **Quán có trạng thái mở/đóng rõ ràng** (khánh + biển CLOSED) — game mình đã có shopOpen; học cách biểu tượng hoá trên cửa 3D cho trực quan.
4. Chỗ ngồi là nút thắt tự nhiên: chỉ 2 bàn mà 12 khách → game tự tạo cầu "mua thêm bàn ghế" không cần tutorial.

---

## E. Bổ sung đợt 8 (07/11/2026 — đọc trọn sổ hướng dẫn 17 mục, Level 10)

Đọc được **sổ hướng dẫn trong game** — nơi game tự công bố công thức (tin cậy cao nhất). Chi tiết: PHAN-TICH mục 10, PHU-LUC mục K, KE-HOACH mục I. Điểm đáng lấy thêm:

1. **Nhà phê bình có spec đầy đủ** (cho GĐ1497): đi cùng 4 người hộ tống, khách trong 4 ô phải nhường chỗ, gọi món NGẪU NHIÊN từ mọi món game ở cấp cao, thưởng đột biến 123.000 xu, phạt = kẹp 2★ có đếm ngược 30 phút và thoát game không thoát phạt.
2. **🆕 Sự kiện thanh tra** (Lv6+): mỗi 35–60 phút, phạt một phần doanh thu gần nhất; nộp phạt chắc (+XP) hoặc hối lộ rẻ nhưng có thể bị bắt (mất cả). Với mình: "đoàn kiểm tra hàng hóa" — văn liệu đời thường, tránh chữ "hối lộ" nếu ngại.
3. **Bảng tier nhân viên có trait XẤU** (Sloppy hao nguyên liệu 8%, Clumsy rơi món 5%, Lazy nghỉ 2s…): tier đắt vẫn có rủi ro — tránh "tier cao = thuần tốt". Hợp đồng 30 ngày + cửa sổ gia hạn 5 phút + nhân viên mặc định miễn lương khi cháy túi (lưới an toàn).
4. **Công thức chính thức**: khách 7/phút ở 0★ → 17 ở 5★; decor ở 5★ mỗi 20 điểm +1 khách/phút (⚠️ khác 10× với công thức bundle cũ — cần QA); kiên nhẫn 2 mốc 37s/75s = 100%/60%/0%; đồ đựng 50/250/2.500/10.000/20.000 lượt 6 bậc; nâng sao KHÔNG cần xu; trần thu nhập vắng mặt 30+cấp×5 phút; thưởng lên cấp = 1.000×cấp + 1 nguyên liệu.
5. **Máy chơi game không cộng XP, khách đang chơi đóng băng kiên nhẫn + không giữ ghế** — máy = "bể chứa khách" chống nghẽn; toilet từ Lv8 trở thành BẮT BUỘC (chờ >5s = khách giận).
6. **Xã hội**: bầu 😍/🙂 khi ghé thăm → bảng Quán đẹp auto (top ngày 200k→30k, top tuần tới 1tr) — khớp hẻm online của mình; patch notes gửi qua hòm thư trong game.

---

## F. Bổ sung đợt 9 (07/11/2026 — mua mở rộng thật + Settings, Level 13→14)

1. **Mở rộng 11×11 đo thật**: KHÔNG hộp xác nhận — bấm là tường tự giãn, đồ giữ nguyên; thang giá ×1.8/mốc (2.000 → 2.500 → 4.500). Mình giữ confirm nhưng copy "tường tự giãn + đồ bất động" + thang ×1.8.
2. **Settings có 8 Theme màu HUD** (Summer Dream → Gothic Romance) + 12 ngôn ngữ + chọn nhạc + Restart ngay trong game → mình: theme HUD mở theo tiến trình/sự kiện (Tết, Trung thu) chỉ bằng CSS variables.
3. **Thanh tra lần 2 (Level 13): phạt 10.000 vs hối lộ 1.600** → phạt ∝ doanh thu gần nhất (≈ 5–15 phút doanh thu); hối lộ ≈ 10–16%, có thể bị bắt (mất cả hai) — chốt tỷ lệ cho sự kiện "kiểm tra hàng hóa" của mình.
4. **Thước kinh tế**: Level 5→14 = 18k→113k xu sau ~4–5 giờ; mỗi bàn mới phải tăng doanh thu nhìn thấy trong 1–2 phút.

---

## G. Bổ sung đợt 10 (07/11/2026 — 3 UI kinh tế vi mô, Level 17)

1. **🥕 "Mua đủ N mỗi loại" trên cảnh báo thiếu hàng** — 1 nút hết rủi ro bếp dừng; áp dụng NGAY cho kho tạp hóa (mục K1 KE-HOACH).
2. **Chợ đồ cũ người chơi thật**: tự định giá + hiển thị % so giá shop + hạn giờ rao; quan sát: landmark bị bán tháo ~10% giá → người mới sắm đồ cuối game rẻ, người cũ thu hồi vốn. Cần backend — để lâu dài.
3. **Tủ Trao Đổi**: 5 slot offer nguyên liệu + History + cooldown 3h/quán — ⏸ GĐ1609: hẻm online là một tiệm chung (kho dùng chung) nên trao đổi trong hẻm vô nghĩa; giữa các hẻm cần kho lưu mới trên server.
4. **Thanh tra 3/3 lần hối lộ thành công** (10→16→18% mức phạt) — mình giữ rủi ro bị bắt cho lựa chọn có nghĩa.
