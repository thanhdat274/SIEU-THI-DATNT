# Phân tích tham khảo: Midnight Bistro → áp dụng cho Tạp Hóa 3D

Ngày nghiên cứu: 06/11/2026  
Nguồn: chơi thử bản web `midnightbistro.net/play.html` (chế độ khách, không tài khoản) + đọc dữ liệu cấu hình trong bundle JS công khai (`play-*.js`, `freshNavigation-*.js`). Mọi con số dưới đây lấy từ file cấu hình của game, không phải ước lượng, trừ chỗ ghi "(suy luận)".

> Nguyên tắc dùng tài liệu này: **học cơ chế và đường cong cân bằng, không chép tên, hình, chữ, món đồ hay câu thoại của họ.** Midnight Bistro chỉ là tham khảo, giống SIEU-THI-DATNT/HappyTown trước đây; code vẫn viết vào GAME theo fantasy tạp hóa → siêu thị của mình.

---

## 1. Tóm tắt 30 giây

Midnight Bistro là game quản lý nhà hàng isometric (Phaser, chạy trên web/điện thoại). Vòng chơi:

```
Mua đồ (bếp, bàn, ghế, máy, toilet, trang trí) → đặt lên lưới
→ Khách tới (tần suất phụ thuộc SAO + ĐIỂM TRANG TRÍ) → gọi món → bồi bàn mang phiếu → đầu bếp nấu → bưng ra → khách trả tiền + tip
→ khách ăn xong đi vệ sinh / chơi máy (trả phí mỗi lượt)
→ tiền + XP → lên cấp → mở tính năng → học món mới, nâng sao món, mở rộng mặt bằng → khách đông hơn
```

Điểm giống với hướng của bạn: **mọi đồ vật đều là "máy in tiền" có chức năng riêng** (bếp = nấu, ghế = chỗ ngồi, toilet = phí, máy game = phí, trang trí = kéo khách), và quán **lớn dần từ 7×7 lên 39×39**. Đây chính là mô hình "từ tạp hóa nhỏ mở rộng thành siêu thị có khu ăn uống" của bạn.

---

## 2. Các hệ thống và số liệu chính

### 2.1 Thông số nền

| Thông số | Giá trị |
|---|---|
| Tiền khởi đầu | 8.000 xu |
| Lưới ban đầu | 7×7 ô |
| Tick logic | 10 Hz (100 ms) |
| Kiên nhẫn khách | 75 giây |
| 1 "ngày" game | 8 × 5 phút = **40 phút thật** (dùng để trả lương) |
| Tự lưu | 6 s cục bộ, 20 s lên cloud |
| Món mặc định (luôn bán) | Súp, Bánh mì, Nước lọc; phải bán tối thiểu một số món |

### 2.2 Đồ vật = chức năng (cửa hàng "Vật tư thương mại")

| Nhóm | Vai trò | Giá ví dụ | Ghi chú cơ chế |
|---|---|---|---|
| **Bếp** (11 loại) | Nơi đầu bếp đứng nấu; xoay bếp để chọn chỗ đứng | 280 → 4.500 | Giá: Charcoal 280, Gas 420, Clay firewood 550, Induction 330, Cooking stove 590, Hotpot 1.500, Mint vintage 1.000, Wok 880, Teppanyaki 3.500, Kebab 4.200, Pizza brick 4.500. **Mỗi bếp xoay được**, chọn hướng đứng đầu bếp. Khác nhau chủ yếu là **ngoại hình/chủ đề**, không khác biệt cơ chế nấu |
| **Bàn** (20) | Neo chỗ ngồi | 20 → 4.000 | Ghế phải đặt **sát bàn** mới tính. Giá: Nhựa 20, Ăn 150, Cafe Paris 180, Diner 200, Loft 250, Glass 280, Retro 310, Oak Nordic 440, Tree stump 520, Marble 780, Tulip 1.100, Mosaic 1.500, Wine barrel 2.200, Cyber hologram 2.400, Mahogany 4.000. Đồ Halloween 250k (+1 decor) |
| **Ghế** (16) | Mỗi ghế = 1 khách | 10 → 3.600 | Thiếu ghế → khách đứng xếp hàng ở cửa rồi bỏ đi. Giá: Nhựa thấp 10, Tre 70, Gỗ 50, Paris Bistro 90, Sunbed 180, Rattan 260, Armchair 330, Oak Nordic 340, Bentwood 340, Tub chair 780, Cognac leather 980, Gothic 960, Royal Velvet 880, Golden throne 2.400, Gold 24K 3.600. Đồ Halloween 250k (+1 decor) |
| **Máy chơi game** (8) | Khách ghé dùng, **trả phí mỗi lượt** | 1.500–3.600, phí 15–40/lượt | Gắp thú (15), máy bán nước (20), máy bán snack (20), máy đánh giày (20), kẹo bông (25), gắp thú bông (24), photobooth (30), ghế massage (40). **Hoàn vốn ≈ 90–100 lượt** (giá ÷ phí/lượt) |
| **Toilet** (5) | Khách ăn xong hay đi vệ sinh, trả phí | 500 (1/lượt) → 60.000 (50/lượt) | Xoổm 500/1₫, Sứ tiêu chuẩn 1.500/2₫, Gỗ cổ điển 4.500/8₫, Thông minh 12.000/20₫, Hoàng Gia 60.000/50₫. **Hoàn vốn 500–1200 lượt** → toilet là tiện ích, không phải máy kiếm lời |
| **Trang trí** (~260 món: cây, tranh, đèn, treo tường, kiến trúc, ngoài trời) | Cộng **điểm trang trí 🩷** | 30 → 1.900.000 | Điểm trang trí tăng tần suất khách |
| **Sàn, sơn tường, ốp chân tường, cửa** | Trang trí theo ô/mảng tường | — | Cửa phụ: mỗi 10 cấp được thêm 1 cửa |

Bán lại đồ cho cửa hàng chỉ được **~10% giá mua** (bếp 280 bán 28). Muốn thu hồi vốn tốt hơn phải bán trên **Chợ Nội Thất** giữa người chơi (có thuế).

Đường cong giá ↔ điểm trang trí (mẫu rút từ dữ liệu): 30 xu → 1 điểm; 340 → 6; 720 → 9; 2.400 → 4; 9.000 → 13; 120.000 → 10; 1.000.000 → 50; tượng lớn 1.900.000 → 200. Tức là **đồ rẻ hiệu quả trên mỗi xu, đồ siêu đắt là đồ "khoe"** (vanity) cho người chơi lâu năm.

### 2.3 Khách đến: công thức tần suất

```
rating   = trung bình hài lòng của 100 khách gần nhất × 5   (0–5 sao)
khách/phút = BASE + PER_STAR × rating + (decorScore / 200) × (rating / 5)
khoảng cách giữa 2 khách = 60 / (khách/phút) giây, có nhiễu ngẫu nhiên ±
```

Ý nghĩa thiết kế quan trọng: **trang trí chỉ phát huy khi sao cao** (nhân với rating/5). Quán đẹp mà phục vụ tệ thì trang trí gần như vô dụng → ép người chơi cân bằng giữa "đẹp" và "chạy tốt".

Khách bỏ về (hài lòng = 0) khi: chờ chỗ ngồi quá lâu, món không có trong thực đơn, chờ món quá lâu, toilet đầy. Mỗi khách bỏ về kéo trung bình 100 khách xuống.

Trạng thái khách: Xuất hiện → Xếp hàng → Đi tới ghế → Ngồi → Gọi món → Chờ món → Ăn → Trả tiền → (Đi toilet / Chơi máy) → Về.

### 2.4 Nhân viên

Hai vai: **Đầu bếp** (nấu tại bếp) và **Bồi bàn** (ghi món, mang phiếu vào bếp, bưng món). Mặc định có 1 đầu bếp + 1 bồi bàn **không bao giờ nghỉ**, thiếu tiền thì được miễn lương (lưới an toàn cho người mới).

Tuyển dụng: đăng tin (có giới hạn lượt, hồi dần) → sau vài giây có danh sách ứng viên ngẫu nhiên → chọn thuê hoặc bỏ qua. Phí thuê 1.000–10.000.

| Bậc | Tỉ lệ ra | Tốc độ | Hệ số lương | Tỉ lệ có tật xấu | Bồi thường khi đuổi |
|---|---|---|---|---|---|
| Tập sự | 60% | 0,9–1,0 | ×0,7 | 0% | 5.000 |
| Lành nghề | 30% | 1,0–1,1 | ×1,0 | 0% | 10.000 |
| Bậc thầy | 7% | 1,1–1,2 | ×1,6 | 40% | 20.000 |
| Huyền thoại | 3% | 1,2–1,3 | ×2,5 | 30% | 40.000 |

Lương/ngày = gốc (đầu bếp 30, bồi bàn 20) × hệ số bậc × 8. Hợp đồng hết hạn → nhân viên đòi tăng lương (0/10/20/30/50% với xác suất 25/40/25/5/5%); không trả lương thì họ bỏ việc.

Sở trường (trait) — mỗi người tối đa 1 tốt + 1 xấu:

| Tốt | Xấu |
|---|---|
| Tay nhanh: nấu nhanh 10% | Cầu toàn: nấu lâu 20% |
| Duyên dáng: tip ×1,15 | Cẩu thả: 8% tốn gấp đôi nguyên liệu |
| Ngoại giao: khách kiên nhẫn +5% | Hay quên: 5% quên ghi món |
| Nhanh chân: đi nhanh 10% | Vụng về: 5% làm đổ món, bếp nấu lại |
| | Lười: nghỉ 2 giây sau mỗi việc |

**Thuê bạn bè** (người chơi thật): nhanh hơn 15–20%, lương = 80% lương Huyền thoại, không hợp đồng, có thể đào tạo chọn sở trường tốt.

### 2.5 Món ăn, học món, nâng sao

- **183 món** từ ~30 quốc gia (27 món Việt). Giá bán 1–80 (trung vị 26), thời gian nấu 2–25 s (trung vị 12), học món tốn 0–6.500 xu (trung vị 1.900) + nguyên liệu học.
- Hai loại nguyên liệu tách bạch:
  - **Nguyên liệu học món** (hiếm, có từ lên cấp, điểm danh, giỏ quà nhà hàng xóm, đổi chác) — trừ một lần khi học.
  - **Nguyên liệu nấu** (thường, mua gói bằng xu) — trừ mỗi lần nấu. Thiếu thì đầu bếp chờ tối đa 5 s rồi **hủy đơn**. Có nút "Mua đầy đến mức X mỗi loại".
- **Sao món theo số lần bán**:

| Sao | Cần bán | Giá bán tăng |
|---|---|---|
| 0★ | 0 | +0% |
| 1★ | 50 | +10% |
| 2★ | 250 | +20% |
| 3★ | 2.500 | +60% |
| 4★ | 10.000 | +110% |
| 5★ | 20.000 | +220% |

  Lên sao = đủ lượt bán **và** trả nguyên liệu nâng sao. Mỗi mức sao đổi **đồ đựng** hiển thị trên bàn: đĩa giấy → lá → gỗ → gốm sứ → bạc → vàng (đồ uống: cốc giấy → … → cốc vàng). Đây là phần thưởng nhìn thấy được rất rẻ để làm.
- **Cờ vinh danh**: học đủ món của 1 quốc gia → nhận cờ đặt trong quán; tất cả món của nước đó lên 5★ → cờ 5★. Mỗi cờ cộng % tốc độ bồi bàn / tốc độ khách. Đây là "bộ sưu tập" kéo người chơi học hết món.

### 2.6 Cấp độ và mở khóa

XP cần cho cấp 1→11: `10, 20, 40, 60, 100, 160, 260, 420, 680, 900`, sau đó `100 × 1,126^(cấp−1)`. Thưởng lên cấp gồm nguyên liệu học món (tủ đầy thì quy ra xu).

| Cấp | Mở khóa |
|---|---|
| 2 | Bistro Bên Cạnh (sang nhà hàng xóm nhặt giỏ quà) |
| 3 | Tủ Trao Đổi nguyên liệu |
| 4 | Chợ Nội Thất (mua bán đồ giữa người chơi) |
| 5 | Doanh thu khi vắng mặt |
| 6 | Thanh tra an toàn vệ sinh |
| 7 | Nhà Phê Bình Ẩm Thực |
| 8 | Vệ sinh nghiêm ngặt |
| 10, 20, 30… | Thêm 1 cửa phụ |

Chú ý thứ tự: **mở phần thưởng trước (2–5), mở rủi ro sau (6–8)**, khi người chơi đã có vốn.

### 2.7 Mở rộng mặt bằng

| Kích thước | Giá |
|---|---|
| 7×7 → 9×9 | 2.000 |
| 11×11 | 2.500 |
| 13×13 | 4.500 |
| 15×15 | 8.500 |
| 17×17 | 19.000 |
| 19×19 | 40.000 |
| 21×21 | 70.000 |
| 23×23 | 150.000 |
| Sau 23×23: mua **từng ô lẻ** kề diện tích đang có | 35.000 × 1,03^(số ô đã mua / 10), tối đa 39×39 |

Hai pha: pha đầu mở theo hình vuông (rẻ, nhanh, cảm giác lớn lên rõ), pha sau mở từng ô để người chơi **tự tạo hình mặt bằng** — rất hợp ý tưởng siêu thị nhiều khu của bạn.

Kho chứa đồ cũng mở rộng theo bậc: 5.000 / 8.000 / 10.000 / 15.000 / 25.000 / 50.000 / 120.000 / 240.000 / 570.000.

### 2.8 Sự kiện rủi ro có hài hước

- **Thanh tra đột xuất** (từ cấp 6): hiện biên bản vi phạm vô lý buồn cười (vd. bếp trưởng cười 44° thay vì 45°, có con vịt cao su trong súp). Hai lựa chọn: **Nộp phạt** (chắc chắn) hoặc **Hối lộ** (rẻ hơn nhưng có xác suất bị bắt → thêm biên bản). Vắng mặt lâu thì gộp nhiều lần thanh tra. Khoảng thời gian giữa các lần thanh tra cỡ 35–60 phút (suy luận từ hằng số).
- **Nhà Phê Bình Ẩm Thực** (từ cấp 7): đến kèm đoàn quay phim, gọi **một món bất kỳ trong toàn bộ danh sách món của game**. Có món và phục vụ kịp → thưởng tiền lớn. Không có món / không phục vụ → **sao bị giữ ở mức thấp trong vài phút**. Dưới một cấp nhất định thì chỉ nhắc, không phạt. Đây là động lực rất mạnh để học thêm món.

### 2.9 Thu nhập khi vắng mặt

Khi quay lại, game giả lập chạy tiếp với tốc độ 0,6 so với khi online, có trần giờ tăng theo cấp. Không có thu nhập nếu thiếu: ghế, bếp, đầu bếp, bồi bàn hoặc gần đây không có khách. Bảng thu tiền ghi "Bạn vắng mặt X giờ, ≈ N khách đã ghé".

### 2.10 Xã hội và giữ chân người chơi

- **Điểm danh hằng ngày** theo chuỗi; bỏ 1 ngày là về ngày 1.
- **Bistro Bên Cạnh**: nhà hàng hàng xóm (của người chơi khác) đổi mỗi phút, bấm giỏ quà nhận nguyên liệu + xu (mỗi quán vài giờ/lần).
- **Tủ Trao Đổi** 5 ô: treo nguyên liệu thừa để đổi lấy nguyên liệu cần.
- **Chợ Nội Thất**: đăng bán đồ trong kho, có thuế, nút điền nhanh "% giá gốc".
- **Bảng xếp hạng Nhà Hàng Đẹp Nhất** ngày/tuần do người chơi bình chọn (😍 Đẹp / 🙂 Bình thường) khi ghé thăm; top được nhận thưởng.
- **Dùng thử đồ 20 giây** trước khi mua ("Try it").
- **Tạm dừng game để sửa nhà** (pause khi trang trí).

### 2.11 Hướng dẫn tân thủ (11 việc)

1. Mua bếp, đặt, xoay 1 lần chọn chỗ đứng đầu bếp
2. Mua bàn + 4 ghế, đặt ghế sát bàn
3. Bấm ▶ Chơi mở cửa
4. Mua toilet
5. Mua máy chơi game
6. Nhận điểm danh
7. Sang nhà hàng xóm nhặt giỏ quà
8. Học 1 món mới
9. Thuê thêm 1 bồi bàn
10. Mua đồ trang trí (giá dao + thùng rác)
11. Mở rộng quán

Mỗi bước có ô sáng chỉ chỗ đặt, khóa các nút khác đến khi làm xong. Mỗi bước dạy đúng **một loại đồ vật = một chức năng**.

---

## 3. Áp dụng cho Tạp Hóa 3D

Game của bạn đã có rất nhiều hệ thống (nấu ăn theo trạm trong `src/data/recipes.ts`, đồ nội thất trong `src/data/furniture.ts`, tiệm xôi, quán nước, chi nhánh, hợp đồng…). Vì vậy dưới đây không đề xuất làm lại, chỉ lấy **những cơ chế Midnight Bistro làm tốt mà game mình còn thiếu hoặc còn yếu**, xếp theo ưu tiên.

### Ưu tiên A — đúng trọng tâm "đồ vật kiếm tiền, mở quán ăn trong siêu thị"

**A1. Khu ăn tại chỗ (dine-in) trong siêu thị**  
Hiện các trạm nấu bán thành phẩm lên kệ/quầy. Thêm một khu "Ăn tại chỗ" khi siêu thị đủ lớn:
- Đồ mới: **bàn ăn**, **ghế** (ghế phải sát bàn mới tính chỗ ngồi), dùng lại các trạm nấu sẵn có (`food_grill`, `hot_kettle`, `steamer`, `rice_station`…).
- Khách "đói" là một loại mục đích ghé tiệm mới: mua món nấu → tìm ghế → ăn → trả tiền. Hết ghế thì đứng chờ, quá kiên nhẫn thì bỏ về và kéo sao xuống.
- Khớp với ý định đã lưu cho tiệm xôi (dine-in, giới hạn 6+ chỗ).

**A2. Đồ vật thu phí mỗi lượt (máy + toilet)**  
Rẻ để làm, tăng mạnh cảm giác "mỗi món đồ đều kiếm tiền":
- Máy bán nước tự động, máy gắp thú, máy chụp ảnh, ghế massage, máy cân sức khỏe (đặc trưng tiệm Việt), máy đổi tiền lẻ… Giá mua ≈ 90–100 lượt phí thì hoàn vốn.
- **Nhà vệ sinh** cho khu ăn uống: nhiều bậc giá (ngồi xổm → sứ → thông minh), phí tăng theo bậc. Thiếu thì khách ăn xong khó chịu.

**A3. Điểm trang trí nhân với sao**  
Hiện chậu cây cho "+5% khách, tối đa +25%". Đổi thành công thức kiểu Midnight Bistro:  
`khách/phút = cơ_bản + hệ_số × sao + (điểm_trang_trí / K) × (sao / 5)`  
→ bỏ trần cứng 25%, trang trí vẫn có giá trị lâu dài, nhưng chỉ phát huy khi phục vụ tốt. Thêm đồ trang trí "khoe" rất đắt cho người chơi lâu năm.

**A4. Mở rộng 2 pha**  
Pha 1 mở hình vuông giá tăng nhanh (×1,25 → ×2,1 mỗi mốc như bảng 2.7); pha 2 sau mốc lớn mở **từng ô kề nhau**, giá ×1,03 mỗi 10 ô. Pha 2 cho phép người chơi tự vẽ hình siêu thị (khu tạp hóa, khu ăn uống, khu kho) — đúng hướng mở rộng bản đồ đã ghi trong ý tưởng.

### Ưu tiên B — chiều sâu món ăn

**B1. Sao món theo lượt bán + đổi đồ đựng**  
Mỗi công thức có bộ đếm lượt bán; mốc 50/250/2.500/10.000/20.000 (nên rút ngắn cho game mình vì tốc độ bán khác) tăng giá +10/20/60/110/220%. Mỗi mức sao đổi đồ đựng: túi nilon → hộp giấy → lá chuối → tô sành → tô sứ → tô men lam. Rất Việt, rất rẻ để làm (chỉ đổi mesh/texture).

**B2. Tách nguyên liệu "học món" và "nấu món"**  
Học công thức tốn nguyên liệu hiếm một lần (từ lên cấp, quà, đổi chác); nấu tốn hàng thường mua từ nhà cung cấp. Thiếu hàng thường → đơn chờ 5 s rồi hủy. Tạo vòng lặp đổi chác giữa các tiệm (khớp ý tưởng chuỗi cung ứng nhiều loại tiệm).

**B3. Bộ sưu tập theo vùng miền (thay cho cờ quốc gia)**  
Học đủ món một vùng (Bắc / Trung / Nam / Tây Nguyên…) → nhận **bảng hiệu vinh danh** đặt trong tiệm, cộng % tốc độ nhân viên/khách. Tất cả món vùng đó 5★ → bảng hiệu vàng.

### Ưu tiên C — sự kiện và nhân viên

**C1. Nhà phê bình ẩm thực**: ghé ngẫu nhiên, gọi một món bất kỳ trong toàn bộ danh sách; phục vụ được → thưởng lớn + tăng khách; không có món → sao bị khóa vài phút. Dưới cấp X chỉ nhắc nhở. Đẩy người chơi học thêm món.

**C2. Thanh tra vui nhộn**: game đã có giấy phép/vệ sinh (`licenseHealth.ts`, `cleanOps.ts`). Có thể thêm lựa chọn **Nộp phạt** / **"Bồi dưỡng"** có rủi ro bị lộ, cùng biên bản vô lý viết bằng giọng Việt hài (tự viết mới, không dịch lại câu của họ).

**C3. Bậc nhân viên + sở trường tốt/xấu**: bảng 4 bậc (tỉ lệ 60/30/7/3) và cặp sở trường 1 tốt + 1 xấu là cách rất rẻ để mỗi lần tuyển có cảm giác "quay gacha". Nhân viên mặc định (người nhà) không bao giờ nghỉ, thiếu tiền thì miễn lương — lưới an toàn cho người chơi mới.

### Ưu tiên D — giữ chân

- **Dùng thử đồ 20 s** trước khi mua (giảm hối hận khi mua đồ đắt).
- **Doanh thu khi vắng mặt** có lý do rõ ràng khi bằng 0 ("thiếu ghế / thiếu bếp / thiếu người").
- **Thứ tự mở khóa**: phần thưởng trước, rủi ro sau (thanh tra/phê bình chỉ bật sau khi người chơi có vốn).
- **Hướng dẫn "1 bước = 1 loại đồ = 1 chức năng"** với ô sáng chỉ chỗ đặt.

### Không nên lấy

- Bảng xếp hạng nhà đẹp, chợ người chơi, thuê bạn bè: cần backend nhiều người chơi; để sau khi có lượng người chơi thật.
- 183 món quốc tế: game mình nên giữ trọng tâm món Việt/đồ tạp hóa.
- Tên, hình, câu thoại, giao diện của Midnight Bistro.

---

## 4. Đề xuất thứ tự làm

| GĐ | Nội dung | Phụ thuộc |
|---|---|---|
| 1 | Bàn + ghế ăn tại chỗ, khách "đói", hàng chờ chỗ ngồi | trạm nấu sẵn có |
| 2 | Nhà vệ sinh thu phí (3 bậc) | GĐ1 |
| 3 | 3–4 máy thu phí mỗi lượt | — |
| 4 | Công thức điểm trang trí × sao, bỏ trần 25% | — |
| 5 | Sao món theo lượt bán + đổi đồ đựng | recipes.ts |
| 6 | Mở rộng pha 2 (mua từng ô) | layout hiện có |
| 7 | Nhà phê bình ẩm thực | GĐ5 |
| 8 | Bảng hiệu vinh danh vùng miền | GĐ5 |

---

## Phụ lục: số liệu thô tham khảo

- Món mặc định: Nước lọc (giá 1, nấu 2 s), Súp (7, 5 s), Bánh mì (8, 6 s). Món đắt nhất: súp yến (80, 20 s, học 6.500).
- Tỉ lệ xu/giây nấu trung vị ≈ 2,2; món đắt thường nấu lâu hơn nên tốc độ kiếm tiền giữa các món không chênh quá nhiều, khác biệt chủ yếu đến từ **sao món**.
- Nhân viên mặc định tên riêng, có tiểu sử ngắn (người anh làm bếp, người bạn thân bưng bê) — tạo gắn bó cảm xúc rất rẻ.

---

## 5. Bổ sung lần 2 (chơi thực + đọc runtime bundle, 06/11/2026)

> Phần này ghi lại những gì **xác minh được khi chơi thật** (giao diện, luồng hướng dẫn) và những **cơ chế đọc trực tiếp từ bundle runtime** (`play-*.js`) mà lần 1 chưa chép. Vẫn giữ nguyên tắc: học cơ chế, không chép tên/hình/chữ của họ.
> Lưu ý trung thực: lần này bộ mô hình dùng để chơi **không nhận được ảnh**, nên không hoàn tất được phần đặt đồ lên lưới và quan sát khách ăn trên canvas (cần thị giác); những đầu đó đã được che phủ bằng dữ liệu cấu hình ở mục 2 và phụ lục.

### 5.1 Xác minh được khi chơi thực (UI / luồng)

- **Thẻ món trong shop** gồm đúng các trường: tên, nhãn loại (`Stove`, `Dining Table`, `Diner Seating`, `Restroom`, `Machine`), điểm trang trí `🩷 +N` (chỉ đồ trang trí), phí/lượt `+💰N per use` (máy & toilet), giá, mô tả, nút **Try it**, nút **Buy & Place**. Có ô lọc phân loại (All / Chairs / Tables / Stoves / Machines / Restroom) và dòng "Showing N items".
- **4 Tab shop**: Commercial Supplies (bếp, bàn, ghế, máy, toilet) / Decor (cây, đèn, tranh) / Special (đồ đặc biệt đắt tiền) / Expansion (mở rộng đất).
- **Nút "Try it"**: Cho phép dùng thử 20 giây trước khi mua - đặt xem trước vị trí, xoay, nhìn thử. Rất hữu ích để tránh mua nhầm đồ đắt.
- **Guide Blocker**: Lớp chặn (`guide-blocker`) ngăn mọi action khi đang làm nhiệm vụ hướng dẫn. Game **bắt buộc** phải làm đúng thứ tự, không cho skip. Mỗi bước hướng dẫn dạy **1 loại đồ = 1 chức năng**.
- **Bán lại đồ = 10% giá mua** (xác nhận bằng chơi: bếp than 280 → nút "Sell 28"). Ngoài bán cho cửa hàng còn có tùy chọn **Store** (cất kho để sau dùng lại — không mất giá) và **Select many** (chọn cả đống để dời/bán gộp).
- **Bảng "Item Actions"** mở ra khi bấm 1 đồ đã đặt: `Move / Rotate / Store / Select many / Sell`. **Nhiệm vụ 1 dạy đúng cơ chế xoay bếp để chọn chỗ đầu bếp đứng** — xác nhận bếp có "chỗ đứng tay nghề" chứ không chỉ là vật trang trí.
- **Hướng dẫn tân thủ = chuỗi 11 nhiệm vụ**, mỗi bước **1 loại đồ = 1 chức năng**. Cơ chế khóa: một lớp `guide-blocker` phủ lên toàn game, chỉ cho bấm đúng bước đang dạy (mua bếp → xoay bếp → mua bàn → đặt ghế…), thanh status dẫn chữ cụ thể ("Drag the table to the glowing tile"). Đây là mẫu on-boarding "không thể làm sai" áp dụng tốt cho mở khóa khu ăn uống của mình.
- **HUD trên cùng** hiện: tiền, Level + thanh XP %, nút **Quests**, **Day** (đếm ngày), Rating ⭐ (tooltip: *trung bình hài lòng của 100 khách gần nhất*), điểm trang trí 🩷 (tooltip: *càng cao càng hút khách*), số khách đang ở 👥, nút tạm dừng/Resume, Inbox, Settings.
- **Toolbar** gọn ở dưới: `Friends / Kitchen / Staff / Storage / Shop`. Đáng chú ý: vào game không có tab "Nội thất" tách biệt — **nội thất mua qua Shop**, nhà bếp và nhân viên quản lý riêng.

### 5.2 Cơ chế đọc từ runtime bundle (mới, chưa ghi lần 1)

- **Công thức tip (rất dễ áp dụng vào khu ăn tại chỗ của bạn):**
  ```
  tip%   = ngẫu nhiên, mặc định 10% giá món
  tip    = giá_món × tip%  ;  nếu khách hài lòng < 1 (chưa đủ trọn) → tip × 0,5
  khách hài lòng ≤ 0 → không có tip, khách bỏ đi
  Duyên dáng (trait) → tip × 1,15
  ```
  Ý nghĩa: **tip là "màn trả thưởng" cho phục vụ đúng cam kết** — khách chờ lâu/sai bàn mất nửa tip. Muốn khách "khen" thì vừa đẹp vừa nhanh.
- **Khách có `satisfaction` khởi đầu = 1** và một **`patience` (75 giây)** đếm ngược; khi patience chạm 0 → hài lòng về 0 → bỏ đi. Trait **Ngoại giao** tăng patience của khách (`chefPatienceBoosted`). → Có thể tạo gốc "kiên nhẫn" cho khách đói ở khu ăn uống: chờ chỗ/đợi món quá lâu → hài lòng tụt → tip ít.
- **Ghế phải gắn với bàn**: runtime có `tableBinding` + `occupiedChairIds` + `getSeatFacing` — ghế đặt kề bàn mới được nhận khách, và **hướng xoay của ghế** quyết định khách ngồi nhìn về đâu. Xác nhận cơ chế "ghế sát bàn" ở mục 2.2.
- **Doanh thu vắng mặt** là một object `offlineRevenue` riêng: chỉ tính khi đủ cờ mở khóa `offline_revenue` (cấp 5), và **mỗi lần khách trả tiền khi online đều được ghi nhận để mô phỏng lại** khi quay lại. → Gợi ý cho game của bạn: thu vắng mặt cần "lộ trình" rõ, không tính bừa.
- **Thanh tra (sự kiện "thanh tra an toàn vệ sinh")** hiện thực bằng **nhóm agent `inspectors` đi vào từ cửa theo từng lát** (`staggerMs`, mỗi người có `appearances`/bong bóng nói). Khớp mô tả "thanh tra đột xuất có hài hước": một nhóm người vào, xuất hiện biên bản vô lý.

### 5.3 Đồ đựng (vessel) — khóa cấu hình đã đối chiếu

- Mỗi món khai **`vesselKind`**: mặc định là *đĩa* (161 món), một số món đồ uống là *cốc* (22 món). Đồ đựng theo sao là **`vessel.tier_<sao>`** (đĩa) / **`vessel.cup_<sao>`** (cốc), ứng với bậc 0→5: giấy → lá → gỗ → gốm → bạc → vàng.
- UI đếm ngược tới lần đổi đồ đựng ("còn N lượt → sang bậc kế"), dùng chữ `vessel_goal`. → Nối thẳng vào gợi ý **B1** ở mục 3: mỗi món của bạn cũng nên có cờ "loại đồ đựng" (đĩa/cốc/bát) và bậc đồ đựng theo lượt bán.

### 5.4 Áp dụng thêm cho Tạp Hóa 3D (dựa trên phần bổ sung này)

1. **Tip = % giá × hài lòng** cho toàn bộ món nấu bán tại chỗ/quầy: món khách mua chờ lâu thì tip ít → tạo khác biệt giữa "bán được" và "phục vụ tốt", thúc người chơi sắp xếp trạm nấu gần quầy.
2. **Đồ đựng là tầng tiến trình riêng biệt của từng món** (không phải của cả quán): bát sành → sứ Bát Tràng → men lam → khay đồng → khay sơn mài; món đồ uống dùng cốc riêng (cốc giấy → cốc gốm → cốc sứ → cốc thủy tinh). Chỉ đổi texture, rất rẻ.
3. **"Select many" khi dọn/xếp lại quán**: chọn cả cụm bàn ghế để dời — giảm đau khi thay đổi bố cục siêu thị lớn.
4. **On-boarding kiểu "1 bước = 1 loại đồ" có lớp chặn không cho làm sai**: giữ nguyên như mục 3 (D), dùng cho mở khóa khu ăn uống của bạn.

---

## 6. Bổ sung lần 3 — "Sổ tay chức năng" của game + kiểm chứng số liệu (06/11/2026)

> Lần này tôi khai thác **bài Hướng dẫn (Help) ngay trong game** — bộ 18 chủ đề mà chính game viết để giải thích từng chức năng. Đây là nguồn **chính xác và đầy đủ nhất** để học cơ chế, đặc biệt các chức năng chưa ghi kỹ ở lần 1: khách/đánh giá sao, máy móc, nhà vệ sinh, vắng mặt, tuyển nhân viên, thanh tra, nhà phê bình, chợ, hàng xóm, tủ trao đổi. Dưới đây ghi **cơ chế và con số** (không chép tên/mô tả sáng tạo của họ; tên sở trường chỉ là bản dịch thuật ngữ).

### 6.1 Khách đến & đánh giá sao (con số chính xác)

- **Khách/phút tăng theo sao quán: 7 (0★) → 17 (5★)**, chưa kể trang trí.
- **Trang trí cộng khách**: ở 5★ quán, cứ `K` điểm trang trí thì +1 khách/phút (hệ số K đọc từ cấu hình — khớp công thức "decorScore/200 × rating/5" ở mục 2.3).
- **Hàng chờ ghế**: không giới hạn số người; khách chờ thì **đi lang thang với 40% tốc độ** bình thường; **chờ quá 10 giây không có ghế → bỏ về giận dữ (hài lòng 0)**.
- **Điểm hài lòng theo thời gian có món** (mỗi khách kiên nhẫn 75 s từ lúc ngồi):
  - Món lên trong 37 s đầu → 100%.
  - Món lên từ giây 38→75 → 60%.
  - Quá 75 s / chờ ghế >10 s / bị dời-bán ghế → 0% (bỏ về).
- **XP**: khách trả tiền → **5★ = 2 XP, dưới = 1 XP**. Trò chơi máy KHÔNG cho XP, không tính lượt bán sao.
- → Áp dụng cho "khách đói" ở khu ăn uống của bạn: cứ 1 khách = 1 slot hài lòng 75 s, món nhanh +37 s được 100%, chậm bị tụt; nhiều ghế mà ít người phục vụ thì khách chờ → bỏ về kéo sao.

### 6.2 Cấp độ, mở khóa, thưởng

- **XP từ khách trả tiền**; lên cấp thưởng **1.000 × cấp mới** xu + 1 nguyên liệu.
- **Mở khóa trọng yếu**: Cấp 2 → hàng xóm kế bên; Cấp 3 → tủ trao đổi + giỏ quà; Cấp 4 → chợ nội thất; Cấp 5 → doanh thu vắng mặt; Cấp 6 → thanh tra; Cấp 7 → nhà phê bình; Cấp 8 → vệ sinh nghiêm ngặt; **Cấp 10 trở đi, cứ mỗi 10 cấp +1 cửa phụ (tối đa 10 cửa ở cấp 100)**.
- Trình tự nhấn mạnh: **thưởng/thu nhập mở trước (2–5), rủi ro mở sau (6–8)** — giữ nguyên khuyến nghị mục 3.

### 6.3 Máy móc — vai trò "đồ vật thu phí" (chi tiết)

- **Khách mới vào có 15% ghé chơi một máy đang trống**; mỗi máy chỉ 1 khách/lúc.
- Thời gian một lượt: máy massage 12 s; các máy khác 6 s.
- Chơi máy **không tốn nguyên liệu, không cần đầu bếp/bồi bàn**; khách chơi xong **vẫn vào ăn tiếp** → quán thu cả phí máy lẫn tiền món. Lúc chơi máy khách **chưa giữ ghế và không bị trừ kiên nhẫn** → giúp quán đông bớt áp lực chỗ ngồi.
- Nếu bán/cất/dời máy đang có người chơi → khách bỏ dở, không trả phí.
- → Đây là "đồ vật thu phí mỗi lượt" hợp lý nhất cho khu ăn uống siêu thị: **máy cân, máy bán nước, máy gắp thú** vừa cho tiền vừa "giữ khách lại quán" mà không ngốn nhân viên.

### 6.4 Nhà vệ sinh

- **Sau khi ăn xong, ~20% khách có nhu cầu đi vệ sinh**; khách trả tiền món và nhường ghế trước, rồi mới tìm bồn cầu.
- Mỗi bồn 1 khách/lúc, ngồi **4 s** rồi trả phí (loại có thu phí).
- **Giai đoạn nhẹ (cấp 1–7)**: chưa có bồn/bồn bận → khách hiện bong bóng rồi về bình thường, **không bị trừ sao**.
- **Giai đoạn nghiêm ngặt (cấp 8+)**: không có bồn hoặc chờ >5 s → khách nổi giận, hài lòng 0, trừ sao.
- → Đúng mô hình "rủi ro mở sau": cho phép để khu ăn uống chưa có nhà vệ sinh lúc đầu, sau đó ép phải có (khi đã đông khách).

### 6.5 Doanh thu vắng mặt (500 đầy đủ)

- **Hiệu suất 55%** so với khi online; thời gian tính tối đa = **30 phút + cấp × 5 phút** (cấp 10 → 80 phút; vắng lâu hơn phần thừa không tính).
- **Vắng <5 phút không tính**; vắng **<15 phút tiền tự cộng** (không hiện bảng); vắng ≥15 phút hiện bảng tổng kết "≈ N khách đã ghé".
- **Điều kiện tối thiểu**: ≥1 ghế, ≥1 bếp, ≥1 đầu bếp, ≥1 bồi bàn. **Chỉ nhận tiền — không cộng XP, không tính lượt bán món.**
- → Khớp gợi ý A mục 3: thu vắng mặt cần điều kiện và công thức rõ, và nên "vô hại" với lộ trình sao/XP.

### 6.6 Tuyển dụng nhân viên (bảng chính xác — bổ sung cho mục 2.4)

- **Đăng tin**: tối đa **5 lượt**; cứ **20 phút hồi 1 lượt** khi đang thiếu; dùng hết 5 lượt khóa **2 giờ**. Phí đăng tin và số ứng viên tăng dần:

  | Lần đăng | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | Phí (xu) | 1.000 | 2.000 | 4.000 | 16.000 | 32.000 |
  | Số ứng viên | 2 | 2 | 3 | 4 | 5 |
  | Thời gian chờ | 20 s | 15 s | 10 s | 5 s | 1 s |

- Mỗi ứng viên có **hạng + 1 sở trường**; **Bậc thầy/Huyền thoại có thể kèm 1 tật xấu, đổi lại giảm 20% lương**. Phí thuê 1.000–10.000/người; bỏ qua thì mất phí đăng tin.
- **Lương/ngày** (đầu bếp / bồi bàn; 1 ngày = 8 giờ game = 40 phút thật): Tập sự 112/168, Lành nghề 160/240, Bậc thầy 256/384, Huyền thoại 400/600. Bồi thường khi sa thải: 5k/10k/20k/40k.
- **Ba loại nhân viên**: Mặc định (vĩnh viễn, không sa thải được, thiếu tiền miễn lương, ×1.00); Tuyển (hợp đồng **30 ngày game**, hết hạn có **1 giờ game** để gia hạn theo mức họ đòi hoặc cho nghỉ miễn phí; rủi ro tăng lương 0/10/20/30/50%); Bạn bè (×1.15–1.20, lương 320/480, chọn sở trường miễn phí, không gia hạn/tăng lương).
- Lương trừ cuối ngày: mặc định trước, rồi theo thâm niên; ai không được trả → bỏ việc ngay.
- **Sở trường**: *tốt* — nấu nhanh +10%, đi nhanh +10%, tip +15%, khách kiên nhẫn +5%; *xấu* — nấu chậm −20%, 8% tốn x2 nguyên liệu, 5% quên ghi món (phải hỏi lại), 5% làm đổ món (bếp nấu lại), nghỉ 2 s sau mỗi việc. Đầu bếp và bồi bàn có bộ sở trường riêng.
- → Áp dụng "quay gacha nhân viên" mục C3: có đủ bảng hạng, thể hiện rõ rủi ro (tật xấu đổi giảm lương — cách **xuất sắc** để tuyển ra kẻ có tay nghề cao nhưng hay vụng về).

### 6.7 Sự kiện rủi ro — số liệu chính xác

- **Thanh tra** (cấp 6): ghé **mỗi 35–60 phút**; mỗi biên bản phạt **7–20% số tiền kiếm từ lần phạt trước**, tổng phạt ≤ **60%** số đã kiếm.
  - *Nộp phạt*: trả đúng, nhận XP = 0,05–0,5% tiền đã nộp.
  - *Hối lộ*: trả 10–30% tiền phạt; **thành công 40%** (chỉ mất tiền hối lộ), **thất bại 60%** (mất tiền hối lộ + phạt 1,5×). Phải xử lý biên bản đang có mới có biên bản mới.
- **Nhà phê bình** (cấp 7): mỗi **5 giờ chơi** tối đa ghé 1 lần, sau ít nhất 3 giờ liên tiếp không bị phạt (giờ chơi cộng dồn, rời game thì dừng).
  - Từ cấp 10: gọi **một món bất kỳ trong toàn game**; bán được món đó (trong 20 s ăn) → **thưởng 123.000 xu**; không bán / không phục vụ kịp → **sao bị giữ 2★ trong 30 phút** (dưới cấp 10 chưa phạt).
  - Đoàn phim đi nối đuôi, khách trong vòng 4 ô đứng dậy ra về; đang phạt thoát game → lần sau vào tiếp.
- → Giữ nguyên gợi ý C1/C2, giờ có con số chuẩn để cân chỉnh: phạt theo "phần trăm thu nhập gần đây" là cơ chế **không bao giờ giết người chơi nghèo**.

### 6.8 Xã hội & giữ chân — bổ sung

- **Điểm danh**: ngày 1 = 1.000 xu, mỗi ngày **+~1.500 xu, làm tròn lên hàng nghìn** (ngày 50 = 75.000), kèm 1 nguyên liệu; bỏ 1 ngày → về ngày 1.
- **Hàng xóm kế bên** (cấp 2): mỗi phút đổi 1 quán ngẫu nhiên; giỏ quà **4 giờ/lần** (1 nguyên liệu + 100–1.500 xu); bình chọn 😍/🙂 mỗi quán **1 lần/ngày (GMT+0)**; Top ngày 5 quán/7 ngày, Top tuần 10 quán → thưởng ngày 200.000, tuần 1.000.000.
- **Tủ trao đổi** (cấp 3): tối đa 5 đề nghị (1–99 mỗi bên); khách ghé đổi; mỗi quán → sau khi đổi phải chờ 3 giờ mới đổi lại ở quán đó.
- **Chợ nội thất** (cấp 4): cần tài khoản để mua/bán; **thuế 16,5%**; nút điền nhanh **30/50/70/85% giá gốc**; sạp 15 ô, mỗi món treo **900 giờ**; món bán được báo bong bóng trên quầy.
- **Bạn bè**: mã `ABC-1234`, tối đa 20 bạn; gửi thư cách 30 s; chặn tối đa 50 người.
- → Phần lớn hệ này của bạn đã ghi "để sau" (mục 3 — không nên lấy). Nhưng **điểm danh +1.500/ngày** và **giỏ quà 4 giờ/lần** là cơ chế giữ chân rẻ, không cần backend ↔ người chơi thật (có thể biến thành "giỏ quà từ khách quen NPC").

### 6.9 Tổng kết "học được" từ sổ tay chức năng (ưu tiên áp dụng cho Tạp Hóa 3D)

1. **Công thức khách & điểm hài lòng theo mốc thời gian** (37 s/75 s → 100%/60%/0%) — dùng cho khách "đói" ở khu ăn uống.
2. **Máy thu phí = "neo khách" không ngốn nhân viên**, khách chơi xong vẫn ăn; 15% khách mới ghé máy.
3. **Nhà vệ sinh hai giai đoạn**: nhẹ (không phạt) → nghiêm ngặt (cấp 8+), phù hợp "rủi ro mở sau".
4. **Vắng mặt 55% hiệu suất**, công thức `30 + cấp×5` phút, chỉ tiền không XP.
5. **Tuyển nhân viên = gacha có hạng + sở trường + tật xấu (giảm 20% lương)**, bảng phí đăng tin tăng dần tạo "đánh bạc" chiến lược.
6. **Rủi ro phạt theo % thu nhập gần đây** (7–20%, trần 60%) + 2 lựa chọn nộp/hối lộ — công bằng với người nghèo.
7. **Điểm danh tăng dần +1.500/ngày**, giỏ quà 4 giờ — giữ chân nhẹ không cần mạng xã hội.

### 6.10 Bổ sung lần 4 — kinh tế nội thất & máy thu phí (đo trực tiếp từ Shop, 300 món)

> Số liệu chi tiết ở **PHU-LUC-DU-LIEU mục G**. Tóm tắt 5 điểm học được:

1. **Luật máy thu phí hoàn vốn ~90 lượt**: giá ≈ thu/lượt × 90 (mọi máy đều ~90-100 lượt) — dùng làm công thức cân bằng máy phục vụ trong game mình (`services.ts` mẫu thu/lượt).
2. **Toilet hoàn vốn CHẬM (~500–1200 lượt)** → là tiện ích hài lòng, không phải để lời; đừng thiết kế nhà vệ sinh sinh lời cao.
3. **Bàn/ghế rẻ + mở sớm (20–150)**, bếp/máy đắt hơn (280–4.500) — thứ tự xây dựng: chỗ ngồi trước, máy thu phí sau.
4. **Ghép bàn–ghế theo kề-cạnh (4 ghế/bàn)** — nhiệm vụ 2/11 chính là "mua 1 bàn + 4 ghế, đặt ghế kề bàn"; xác nhận chính xác thiết kế `freeSeat()` ở spec GĐ1491 (F1).
5. **Decor không theo ROI**: món uy tín đắt (1,9tr = 120–200 điểm) là landmark cuối game, còn đồ giá thấp–điểm thấp để leo decor sớm.

---

## 7. Bổ sung lần 5 — chơi thực sâu (đồ trang trí nội thất / món nấu / đồ dùng), 06/11/2026

> Lần này chơi lại ở chế độ tân thủ và mở trực tiếp **Shop→Decor (230 món)**, **Shop→Special (10 món)**, **Kitchen→Menu / Recipe Pantry / Cooking Ingredient Cabinet** để đo thật từ live UI. Số liệu thô đầy đủ ở **PHU-LUC-DU-LIEU mục H**; dưới đây là những **điểm vận dụng được ngay cho khu ăn uống trong siêu thị của bạn**, theo đúng trọng tâm bạn nhấn.

### 7.1 Đồ trang trí nội thất — "trang trí nhiều lớp" là thứ rẻ để làm mà hiệu quả to

Game gốc chia đồ trang trí thành **7 loại** (Restaurant / Architecture / Wall Decor / Lighting / Plants / Art / Other), mỗi món có **cờ vị trí đặt**: `thường` (đứng sàn 1×1), `Walkable` (đi qua được — thảm/cờ), `Wall Mounted` (treo tường), `Flooring` (gạch nền), `Wainscot` (ốp chân tường), `Wall Paint` (sơn tường), `Door` (cửa), `Zone Divider` (vách ngăn khu) — hầu hết `Per tile` (tính theo từng ô).

> **Điểm học được quan trọng nhất**: đừng chỉ cho người chơi "kê đồ vật". Cho họ **sơn tường / lát nền / ốp chân / đổi cửa theo từng ô giá rẻ (280 xu/ô)** để "đổi skin" cả quán. Đây là cách tạo cảm giác tự do trang trí mà **mỗi món chỉ là một texture, giá cố định 280/ô**, tốn cực ít công nhưng làm quán "cá nhân hoá" rất mạnh. Khớp với ý tưởng siêu thị nhiều khu (khu tạp hóa - nền gạch, khu ăn uống - nền lát, khu chợ - nền đá) của bạn.

- Ngưỡng điểm trang trí tăng dần: đồ rẻ (30–400 xu) cho 1–6 điểm để có **mục tiêu ngắn** dễ đạt; đồ tầm trung (600–3.000) cho 8–15 điểm; **landmark** (0,6–2,2 triệu) cho 50–200 điểm để tiêu tiền cuối game. Không làm đồ trang trí theo "giá/điểm hợp lý" mãi được — phải có vài món **khoe** đắt để người chơi lâu năm có mục tiêu.

### 7.2 Đồ dùng (utensils) — bán dụng cụ bếp làm đồ TRANG TRÍ khu bếp

> Trả lời đúng câu bạn hỏi về "các loại đồ dùng": trong game này, **dao, thớt, chảo, nồi, kệ gia vị, tủ lạnh, lò vi sóng, máy rửa bát, bồn rửa = đồ trang trí cộng điểm decor** (không có chức năng nấu), để dựng khung cảnh bếp chân thực. Ví dụ: giá dao nam châm + thớt (540, +6), giá treo chảo đồng (680, +6), kệ gia vị lọ thủy tinh (340, +9), tủ lạnh inverter (780, +5), lò vi sóng (800, +5), bồn rửa sứ (2.000, +3) → bồn rửa mạ vàng (75.000, +15).

> **Áp dụng**: bên cạnh các **trạm nấu chức năng** bạn đã có (`food_grill`, `hot_kettle`, `steamer`, `rice_station`…), bán thêm "đồ dùng bếp" làm **đồ trang trí** đặt kèm — giá rẻ–trung, +điểm decor, đặt cạnh trạm để khu bếp "thật" hơn. Không cần viết logic chức năng mới, chỉ là mesh/texture + điểm decor. Nên có một nhóm **bồn rửa** nhiều bậc (sứ 2.000 → đá 20.000 → mạ vàng 75.000) làm "tiện nghi" cho khu vệ sinh khu ăn uống.

### 7.3 Món nấu — ép bề rộng thực đơn và gắn "nguyên liệu nâng sao" riêng

- **Bắt buộc bán tối thiểu 12 món** (`Selling 3 dishes (min 12)`), không phải 3 món mặc định — game dùng để ép người chơi học/mở rộng thực đơn ngay từ đầu. → Khu ăn uống của bạn nên có **ngưỡng thực đơn tối thiểu tăng theo cấp quán** (tạp hóa 3 → siêu thị 12), đã ghi ở mục 2.5 nhưng giờ có số chốt chính thức.
- **Nguyên liệu nâng sao = nguyên liệu học món (khan hiếm)**, không phải nguyên liệu nấu. Ví dụ Nước lọc nâng 1★ cần 1 Đá viên (loại hiếm trong Pantry). → Hiệu 2 chiều: hàng quý trong "rương công thức" của bạn vừa để học món vừa để nâng sao, tạo khan hiếm và thúc đổi chác.
- **Thẻ món** nên hiển thị 4 chỉ số: sao + % tròn, thưởng giá +N%, **đồ đựng hiện tại + "còn N lượt → đổi bậc kế"**, và **nguyên liệu nâng sao có tick/x**. Đây là cảm giác "mục tiêu gần được đếm ngược" rất dễ làm và rất gây nghiện.
- Bộ lọc thực đơn **theo quốc gia / vùng** → khớp ý tưởng "đặc sản Bắc–Trung–Nam–Tây Nguyên" của bạn (mục B3).

### 7.4 Hai kho nguyên liệu tách bạch — chốt số liệu đo thật

| | Tủ nấu | Rương/Pantry học món |
|---|---|---|
| Dùng | trừ mỗi lần nấu | trừ khi học món & nâng sao |
| Sức chứa | 10.000 | 200 ô |
| Kiếm | mua gói xu: +10/+50/+100/+500(−10%)/+1000(−20%) | lên cấp, điểm danh, giỏ quà hàng xóm, tủ trao đổi |
| Bán lại | ~50% giá | 1.000 xu/cái |

- Gói mua có **khuyến mãi theo số lượng** (−10% / −20%) → khuyến khích mua chốt lớn, tựa "nhập hàng sỉ" — đúng tinh thần nhập hàng của tạp hóa/siêu thị của bạn.
- Mỗi nguyên liệu có nút **View dishes** (xem món nào dùng) và **Sell all** (~50%) — rất tiện để quản lý kho.

### 7.5 Viết lại thứ tự làm (cập nhật mục 4 với phần mới)

| GĐ | Nội dung | Nguồn |
|---|---|---|
| 1 | Bàn + ghế ăn tại chỗ, khách "đói", hàng chờ chỗ ngồi | mục 2.2 |
| 2 | Nhà vệ sinh thu phí (3 bậc) | mục 2.2 |
| 3 | 3–4 máy thu phí mỗi lượt (giá = thu/lượt × 90) | mục 2.2, mục 6.10 |
| 4 | **Trang trí nhiều lớp**: sơn/át nền/ốp chân/cửa theo ô giá 280 + đồ trang trí 3 tầng | **mới 7.1** |
| 5 | **Đồ dùng bếp làm decor khu bếp** (dao, chảo, kệ gia vị, bồn rửa…) | **mới 7.2** |
| 6 | Công thức điểm trang trí × sao, bỏ trần 25% | mục 6.1 |
| 7 | Sao món theo lượt bán + đổi đồ đựng + **nguyên liệu nâng sao khan hiếm** | mục 2.5, 3, **7.3** |
| 8 | Mở rộng pha 2 (mua từng ô) | mục 2.7 |
| 9 | Nhà phê bình ẩm thực | mục 2.8 |
| 10 | Bảng hiệu vinh danh vùng miền | mục 3 |

> Số liệu thô đầy đủ cho các mục mới (65 nguyên liệu học, 230 món Decor, nhóm đồ dùng bếp, 10 món Special) nằm ở **PHU-LUC-DU-LIEU mục H1–H7**.

---

## 8. Bổ sung lần 6 — chơi trọn vẹn tutorial CÓ XEM ẢNH (06/11/2026)

> Khác các lần trước: lần này **xem được ảnh chụp màn hình khi chơi**, nên lần đầu kiểm chứng bằng mắt toàn bộ phần trước đó bị bỏ ngỏ — đặt đồ lên lưới, ghế ghép bàn, khách chờ/ngồi/ăn, máy thu phí, toilet, tour HUD. Save khách cũ còn nguyên nên chơi tiếp từ nhiệm vụ 2/11 đến hết 11/11, lên Level 5, quán 7×7 → 9×9 trong ~45 phút chơi thật. Số liệu thô ở **PHU-LUC mục I**.

### 8.1 UX đặt đồ lên lưới — kiểm chứng bằng mắt (quan trọng nhất cho GĐ1489)

Chuỗi khi mua "Buy & Place":

1. Đồ **dính theo con trỏ chuột** ngay sau khi mua, tiền đã trừ.
2. **Ô sáng màu cam** dẫn tới vị trí hợp lệ gần nhất khi đang làm nhiệm vụ (không phải lúc nào cũng hiện — chỉ trong tutorial).
3. Ô đang trỏ hiện **hình thoi xanh lá = hợp lệ / đỏ = cấm** (đè lên tile, đúng theo ô lưới isometric).
4. Thanh dưới đáy: `Placing: <tên đồ> | ❌ Cancel | 🔄 Rotate` — đặt xong thanh biến mất.
5. **Click để thả** (không cần kéo). Kéo-thả vẫn được nhưng dễ lỗi: nếu pointerdown không bắt trúng item, drag biến thành **pan camera**.
6. **Đồ treo tường** (giá dao nam châm): preview hiện trên ô SÀN xanh nhưng khi thả, item **tự bám lên tường ngay phía trên ô đó** → công cụ đặt wall-mounted không cần chế độ riêng, chỉ cần "ô sàn trước tường".
7. **Ghế tự xoay hướng vào bàn** khi đặt kề — không phải xoay tay từng ghế (4 ghế quanh bàn nằm 2 trên 2 dưới, tất cả nhìn vào mặt bàn).
8. Hạn chế học được: **khi đang đặt đồ, pan camera bị khóa** — nếu ô đặt ngoài màn hình (rơi ra khi camera trôi), người chơi bế tắc, phải Cancel rồi vào lại. Bài học cho game mình: khi vào chế độ đặt, **tự động đưa camera về vùng đặt hợp lệ** và cho pan bằng cạnh màn hình.

→ Đối chiếu spec GĐ1489 (KE-HOACH mục F1): cơ chế "ghế kề bàn" đúng như suy luận; thêm 2 thứ đáng copy: (a) **preview xanh/đỏ theo ô** khi kê đồ, (b) **tự xoay ghế theo bàn** để giảm một thao tác nhàm.

### 8.2 Tutorial 11 nhiệm vụ — bản đầy đủ đã đi hết + tour HUD phía sau

Đi hết 11/11 nhiệm vụ với save thật. Bổ sung so với mục 2.11:

- **Nhiệm vụ 4 (đã bỏ sót ở lần 1): "Use partitions from the Shop to arrange your restaurant your way"** — dạy **vách ngăn/zone divider** ngay từ đầu, nhưng **có nút Continue để bỏ qua** (không bắt buộc như các nhiệm vụ mua đồ). Nghĩa là game coi "chia khu" là kỹ năng muốn dạy nhưng không ép.
- **Nhiệm vụ 10: mua 2 đồ "đồ dùng bếp làm decor"**: *Magnetic Knife Strip & Board* (540, +6 🩷, treo tường) và *Plastic Trash Can* (30) — đúng chủ đề mục 7.2: tutorial chủ động dạy người mới rằng **đồ dùng bếp = decor cộng điểm**.
- **Nhiệm vụ 11: "Expand your restaurant and create freely"** → mở tab Expansion dạy 3 thanh nâng cấp song song (8.5), mua xong 9×9 là **xong tutorial**.
- **Sau 11 nhiệm vụ còn một lớp "tour HUD" riêng** (`tour-root tour-intro`): dim toàn màn hình + **vòng sáng (guide-ring) khoanh từng element HUD** (đồng xu → rating → decor → khách → pause…) + tooltip "Tap to continue", yêu cầu bấm ĐÚNG element được khoanh mới đi tiếp. Cùng hệ `guide-blocker` chia vùng: chỉ ô vuông được khoanh là bấm được, phần còn lại chặn.
- Xác nhận `guide-blocker` chặn mọi click ngoài bước hiện tại (thử bấm Shop khi chưa xong bước → bị chặn), kể cả đóng modal Staff phải bấm đúng nút × mà tour chỉ.

→ Bài học on-boarding cho khu ăn uống của mình: 2 lớp — (1) chuỗi nhiệm vụ "1 bước = 1 loại đồ" có nút Go; (2) **tour khoanh vùng HUD** sau khi xong, dạy đọc đồng hồ tiền/sao/decor. Chi phí làm thấp (chỉ là overlay + ring theo element).

### 8.3 Sửa công thức điểm danh hằng ngày (đã có bảng thật)

Bảng Daily Login Reward 50 ngày hiện nguyên trên UI. Công thức chính xác:

```
thưởng(ngày N) = làm tròn XUỐNG hàng nghìn của (1.500 × N)
N=1 → 1.000 ; N=2 → 3.000 ; N=5 → 7.000 ; N=10 → 15.000 ; N=50 → 75.000
Goal tổng chuỗi 50 ngày = 1.900.000 ; bỏ 1 ngày → về ngày 1
```

→ Sửa lại mục 6.8 ("+~1.500/ngày làm tròn lên"): đúng là **1.500×ngày, làm tròn XUỐNG nghìn**. Nếu game mình làm "điểm danh khách quen NPC" thì copy nguyên công thức này (1 dòng code).

### 8.4 Tuyển dụng — đo được ứng viên thật (đối chiếu bảng 6.6)

Đăng tin bồi bàn (1.000, chờ ~20 s, ra 2 ứng viên):

| Ứng viên đo được | Hạng | Lương/ngày | Tốc độ | Sở trường | Phí thuê |
|---|---|---|---|---|---|
| A | **Skilled** (Lành nghề) | 160 | 109% | Swift — đi nhanh +10% | 1.000 |
| B | **Master** (Bậc thầy) | 256 | 113% | Diplomat — khách kiên nhẫn +5% | 6.900 |

→ Khớp tuyệt đối bảng lương mục F2 (160/256). Điểm mới: **phí thuê của Master gấp ~7 lần Skilled** — phí thuê không cố định 1.000–10.000 mà theo hạng + sở trường tốt. UI hiện "5/5 posts left", sau khi dùng 1 lượt: "4/5 posts left — Regains 1 post in 19m", lần đăng tiếp theo giá **2.000** (nhân đôi đúng bảng). Nút "Skip" để bỏ ứng viên (mất phí đăng tin).

### 8.5 Mở rộng — xác minh số liệu mục 2.7 + E1 trên UI thật

Tab Expansion hiện đúng **3 thanh nâng cấp song song**, mỗi thanh có thanh tiến "Level 0/N" riêng:

| Thanh | Hiện tại | Mua tiếp | Giá |
|---|---|---|---|
| Diện tích | 7×7 tiles | Area 9×9 (Level 0/8) | 2.000 |
| Kho đồ | 0/5 slots | +6 slots (up to 11, Level 0/9) | 5.000 |
| Tủ nguyên liệu nấu | 762/10.000 | +100 (up to 10.100, Level 0/200) | 290.000 |

Mua 9×9 xong là tường tự giãn, đồ cũ giữ nguyên vị trí. Tốc độ chung cả phiên: **Level 1 → 5 trong ~45 phút** chơi từ đầu (thưởng lên cấp cấp 2 = +2.000 thấy rõ trên đồng xu), tức đường cong đầu game rất nhanh để giữ người mới.

### 8.6 Quan sát khách khi quán quá tải — xác minh cơ chế hài lòng bằng mắt

Ngay sau khi mở cửa với 2 bàn/8 ghế nhưng 1 đầu bếp + 1 bồi bàn:

- **Rating tụt từ 5.0 → 1.0 trong chưa đầy 1 phút** — xác nhận "trung bình 100 khách gần nhất" bị kéo xuống cực nhanh bởi khách bỏ về; sau khi thuê thêm bồi bàn + toilet, rating hồi dần (3.6–3.7).
- Khách chờ ghế có **icon chiếc ghế trên đầu**; toast hệ thống chủ động dạy: *"Customers are waiting for seats (look for the seat-search icon above their heads). Buy more tables and chairs so they can sit!"* → game **tự dạy người chơi sửa nút thắt** đúng lúc.
- Khách cần toilet hiện **bong bóng 💧**; khi chưa có toilet cả đám đứng giữ 💧 rồi về; sau khi đặt bồn thì đi dùng. Xác nhận cơ chế 2 giai đoạn mục 6.4 (giai đoạn nhẹ không trừ sao, nhưng mất khách).
- Khách đang ngồi có **bong bóng món** trên đầu; món lên **hiện đĩa trên bàn**; ăn xong khách đứng dậy, nhường ghế cho người chờ — vòng đời khớp mục 2.3, lần này thấy bằng mắt.
- Tham quan quán người chơi khác (nhiệm vụ 7): **View Only + nút Return Home**, giỏ quà 4 giờ/lượt (tooltip chính xác), và **quán của họ chạy live khi mình đứng xem** (rating của họ 5.0 → 2.5 ngay trước mắt vì cũng bị quá tải).

### 8.7 Bổ sung cho danh sách "áp dụng" của Tạp Hóa 3D

1. **Preview xanh/đỏ theo ô + item dính con trỏ** khi kê nội thất (GĐ1489) — cảm giác "đặt chắc tay" quan trọng hơn kéo-thả.
2. **Tự xoay ghế theo bàn** khi đặt kề — bớt 1 thao tác, khỏi cần UI xoay cho ghế.
3. **Đồ treo tường = chọn ô sàn trước tường, item tự bám lên tường** — không cần chế độ wall-mount riêng trong UI.
4. **Chống bế tắc khi đặt đồ**: tự đưa camera về vùng đặt được; cho pan khi đang đặt.
5. **Toast chủ động chẩn đoán nút thắt** ("khách đang chờ ghế — mua thêm bàn") sau khi khách đầu tiên bỏ về — rẻ hơn bảng thống kê, hiệu quả hơn hẳn với người mới.
6. **Icon trạng thái trên đầu khách**: 💧 cần vệ sinh, 🪑 tìm ghế, 🍔 đang chờ món — người chơi "đọc" quán trong 1 giây.
7. **Tour HUD khoanh vùng sau tutorial** — dạy đọc bảng giá trị top-bar bằng 8–10 lần bấm có ring sáng.
8. Điểm danh copy nguyên công thức **1.500×ngày, làm tròn xuống nghìn**.


---

## 9. Bổ sung lần 7 — chơi tiếp Level 5→6, quét đủ Shop 300 món + sổ Quests (07/11/2026)

> Đợt này save cũ còn nguyên ("Nghien Cuu Tap Hoa", Level 5 74%), chơi thật ~15 phút lên Level 6, dùng DOM của game trích xuất chính xác toàn bộ cửa hàng. Bản tổng hợp áp dụng: `TONG-HOP-AP-DUNG-MIDNIGHT-BISTRO.md`. Số liệu thô Shop ở **PHU-LUC mục J**.

### 9.1 🆕 Cờ Vinh Danh Ẩm Thực theo quốc gia (Quests → 5-Star Culinary Honors) — hệ chưa ghi lần nào

- Học **đủ mọi món của 1 quốc gia** → cờ nước đó: **+10 điểm decor** + **buff +0.5% tốc độ**. Đưa mọi món nước đó lên **5★** → **+20 decor** + **thêm +1% tốc độ**. Tổng 62 cờ (đếm "Claimed 0/62").
- Buff chia 2 loại và **mỗi nước cố định 1 loại**:
  - **Tốc độ bồi bàn** (16 nước): Ý, Việt Nam (27 món — nhiều nhất), Thái, Hy Lạp, Tây Ban Nha, Nhật, Đức, Cuba, Đài Loan, Thụy Sĩ, Mexico, Anh, Hàn, Thụy Điển, Indonesia, Malaysia.
  - **Tốc độ khách di chuyển** (15 nước): Pháp (13 món), Thổ, Mỹ (9), Puerto Rico, Ấn (5), Nga, TQ (9), Brazil, Philippines, Iceland, Mông Cổ, Greenland, Campuchia, Peru, Nam Phi.
- **Cờ bị tước khi nước đó ra món mới** chưa học → mục tiêu dài hạn có "tuổi đời", chống done-and-forgotten.
- Thanh tổng hợp trên đầu sổ: "Waiter speed +0% (0/16 countries contributing)" — buff cộng dồn theo số nước.

**Ý nghĩa với Tạp Hóa:** đây là mảnh ghép cho ý tưởng "bảng hiệu vinh danh vùng miền" (mục 3/10 của mình) — Việt hoá thành **đặc sản Bắc/Trung/Nam/Tây Nguyên + vài miền nhỏ**: đủ món 1 vùng = +10 decor + buff bồi bàn (hoặc khách về nhanh hơn), đặc sản 5★ = +20. Nhờ thế khu ăn trong siêu thị có "bộ sưu tập" dài hạn mà không cần hệ mới.

### 9.2 Quét đủ Shop 300 món ở Level 6 — chỉ có 4 món khóa cấp

- Toàn bộ 300 món (60 Commercial + 230 Decor + 10 Special) đều mở tự do theo tiền, **trừ 4 chiếc cửa khóa "Level 10"**: Grand French Double Doors / Arched Bronze & Cast Glass / Artisan Statement (60.000, +10) và Gilded Temple Gate (120.000, +10) — khớp luật "mỗi 10 cấp thêm 1 cửa", và cho thấy **khóa cấp dùng rất tiết kiệm, chỉ cho item biểu tượng**.
- Ghi nhận đợt này: đồ **Halloween 2026** (ghế dơi, bàn bí ngô — 250.000, +1 điểm) = event theo **ngày thật**; nút **Dùng thử (Try it)** trên mọi thẻ kể cả item không đủ tiền (hiện "Need Money").
- Số liệu đầy đủ: PHU-LUC mục J1–J3.

### 9.3 Kinh tế đo thật ở Level 5–6 (2 bàn/6 ghế, rating 3.5, decor 55)

- Quán chơi thật: 10–14 khách liên tục, tiền **18.349 → 24.547 trong ~4 phút** (~1.500/phút) — chỗ ngồi là nút thắt, game tự toast dạy "mua thêm bàn ghế".
- **Earnings While Away**: vắng 55 phút → **999 xu + "~199 guests dropped by"** ≈ 18 xu/phút ≈ **1–5% tốc độ chơi thật** — đủ ngọt để quay lại, không phá cân bằng (đối chiếu mục 6.5 của mình: đưa về cùng bậc độ lớn).
- Sau mỗi lần reload: toast "Welcome, owner …" + hộp thu tiền vắng nhà hiện ngay; **quán mặc định ĐÓNG CỬA** (biển đỏ trên cửa) — phải bấm **khánh treo trên cửa** mới mở bán. Trạng thái mở/đóng được biểu tượng hoá ngay trên cửa 3D.
- Nút bấm lên cấp vẫn hoạt động mượt khi để máy tự chạy: 94% → 100% chỉ nhờ khách tự vào trong ~40 giây.

### 9.4 Cập nhật thứ tự làm (nối tiếp mục 7.5)

| GĐ | Nội dung | Nguồn |
|---|---|---|
| 11 | **Cờ vinh danh đặc sản vùng miền** (+10 decor +0.5% buff, 5★ +20 +1%, tước khi thêm món mới) | 9.1 |
| 12 | **Trang trí nhiều lớp** — sơn nền/tường theo ô giá 1 mức + 4–6 loại vách ngăn +3 | 9.2, 7.1 |
| 13 | Đồ dùng bếp làm decor khu bếp (giá dao, kệ gia vị, bồn rửa 3 bậc) | 7.2 |
| 14 | Event theo lịch thật (Tết/Trung thu) — 1–2 món "khoe" giá cao điểm thấp | 9.2 |
| 15 | Biểu tượng mở/đóng cửa trên cửa 3D (khánh + biển) | 9.3 |

---

## 10. Bổ sung lần 8 — đọc trọn Sổ hướng dẫn 17 mục + Staff Roster + bảng xếp hạng thật (07/11/2026, Level 10)

> Save đã lên Level 10 (người chơi tự chơi thêm), Day 3, 62k xu. Đợt này dump được **toàn bộ sổ hướng dẫn trong game (17 mục)** — nơi game tự công bố công thức chính xác nhất. Trước giờ các con số của mình chủ yếu suy từ bundle + đo; lần này là **lời game tuyên bố**.

### 10.1 Các công thức game TỰ CÔNG BỐ (đối chiếu với dữ liệu cũ)

| Hệ | Công thức chính thức (từ Game guide) | Đối chiếu |
|---|---|---|
| XP | Khách 5★ cho **2 XP**, khách khác **1 XP** | mới |
| Thưởng lên cấp | **1.000 × cấp mới + 1 nguyên liệu** (Lv5 → 5.000) | khớp mục 8.5 |
| Thu nhập vắng mặt | Mở ở **Lv5**; tối đa tính **30 + cấp×5 phút** (Lv5=55, Lv10=80); vắng <5 phút không tính; <15 phút tự cộng kèm thông báo; "người online kiếm nhiều hơn để công bằng" | chốt công thức trần — trước chỉ đo 999/55 phút |
| Kiên nhẫn khách | Ngồi 75s: món trong **37s đầu = 100%**, giây **38–75 = 60%**, quá 75s / chờ ghế >10s / bị đuổi khi di chuyển bàn = 0% | chính xác hoá mục 2.3 (trước chỉ có 75s tổng) |
| Tần suất khách | **7 khách/phút ở 0★ → 17 ở 5★**; thêm decor: ở 5★ **mỗi 20 điểm decor +1 khách/phút** | ⚠️ công thức decor của bundle (mục 2.3: decor/200×sao/5) khác 10× so với guide (decor/20 ở 5★) — cần QA lại trên game mình, có thể guide làm tròn cho người chơi |
| Nâng sao món | Đủ lượt bán **+ nguyên liệu học × số sao mới**, KHÔNG cần xu; mỗi ngôi +giá, tổng tới **+220%** | mới — bổ sung mục 2.5 (trước nghĩ cần cả xu) |
| Đồ đựng theo sao | 0★ giấy → 1★ lá (50 lượt) → 2★ gỗ (250) → 3★ sứ (2.500) → 4★ bạc (10.000) → 5★ vàng (20.000) | chốt ngưỡng chính thức — khớp hướng 4 bậc GĐ1496 song song |
| Điểm danh | Ngày 1 = 1.000, mỗi ngày +~1.500 (guide viết "làm tròn lên nghìn" nhưng bảng đo được ở 8.3 là **làm tròn XUỐNG**) + **1 nguyên liệu/ngày** | guide mâu thuẫn dữ liệu đo — tin bảng đo |

### 10.2 Nhân viên — bảng tier CHÍNH THỨC + trait + hợp đồng (bổ sung 6.6/8.4)

| Tier | Tỷ lệ ra | Tốc độ | Lương/ngày (bồi/bếp) | Phí sa thải |
|---|---|---|---|---|
| Apprentice | 60% | ×0.90–1.00 | 112 / 168 | 5.000 |
| Skilled | 30% | ×1.00–1.10 | 160 / 240 | 10.000 |
| Master | 7% | ×1.10–1.20 | 256 / 384 | 20.000 |
| Legend | 3% | ×1.20–1.30 | 400 / 600 | 40.000 |

- **3 loại nhân viên**: Mặc định (Tata/Sasa — ở mãi, không sa thải được, **miễn lương khi cháy túi**), Tuyển (hợp đồng **30 ngày game**; hết hạn có **1 giờ game = 5 phút thật** để gia hạn theo giá họ đòi, không gia hạn thì tự động gia hạn theo giá mới), **Bạn bè** (không hợp đồng, sa thải miễn phí, tốc độ ×1.15–1.20, lương 320/480, giữ tên quán của bạn, không đòi tăng lương; hủy kết bạn = nghỉ việc ngay).
- **Trả lương cuối ngày: mặc định trả trước, rồi theo thâm niên; ai không được trả nghỉ việc NGAY** — áp lực dòng tiền thật sự.
- Đăng tin lương cao hơn → ứng viên về nhanh hơn + nhiều hơn. Master/Legend có thể có **1 nhược điểm để đổi lương −20%**.
- **Trait** (mỗi người 1 cái, có tốt có XẤU): Bếp — Quick Hands (+10%), Perfectionist (−20%), Sloppy (8% tốn gấp đôi nguyên liệu), Charming (tip +15%), Diplomat (khách chờ +5%); Bồi — Swift (+10%), Forgetful (5% hỏi lại đơn), Clumsy (5% đánh rơi món nấu lại), Lazy (nghỉ 2s sau mỗi việc), Charming, Diplomat. → **trait xấu là thiết kế hay**: tier cao đắt nhưng có thể lởm, tạo lựa chọn.

### 10.3 🆕 Thanh tra an toàn thực phẩm (Food safety audit, Lv6+) — cơ chế HỐI LỒ

- Thanh tra ghé **mỗi 35–60 phút**; phạt = một phần **số xu kiếm được kể từ lần phạt trước** (có trần). Phải xử lý báo cáo trước khi có báo cáo mới.
- 2 lựa chọn: **Nộp phạt** (chắc chắn + được chút XP) hoặc **Hối lộ** (rẻ hơn nhưng **đu được hoặc bị bắt** — bị bắt thì mất tiền hối lộ VÀ bị phạt như thường). Đo thật: vụ phạt 2.000 vs hối lộ 200, hối lộ thành công với câu "Thanh tra gật gù…".
- Báo cáo kèm lý do hài hước ("món bò thơm quá khiến người đi đường tông vào cột đèn").
- → **Nghiệm được cho game mình**: sự kiện "kiểm tra hàng hóa/hộp kinh doanh" cho siêu thị — nộp phạt chắc vs "xử lý nhanh" rẻ nhưng có rủi ro — cờ bạc nhẹ, văn liệu đời thường. ĐỪNG copy chuyện hối lộ nguyên văn nếu ngại nhạy cảm; chuyển thành "chi phí xử lý nhanh" vs "chờ xác minh".

### 10.4 🆕 Nhà phê bình ẩm thực — cơ chế ĐẦY ĐỦ (đi vào GĐ1497 của mình)

- Mở ở **Lv7**; tối đa **mỗi 5 giờ chơi**, và phải **3 giờ liền không bị phạt**; thời gian chơi cộng dồn qua các phiên.
- Đi cùng **4 người hộ tống** (quay phim, chụp ảnh, trợ lý, dẫn chương trình) — đi thành hàng, đứng quanh bàn critic; **khách ngồi trong bán kính 4 ô phải đứng dậy nhường** (không mất tiền, không mất sao); khi critic đang ngồi, không ai được ngồi trong 5 ô.
- Ngồi 5s rồi gọi món: **Lv10+ gọi NGẪU NHIÊN từ mọi món trong game** (183 món!), dưới Lv10 chỉ 50% rơi vào menu mình.
- Bán được món: ăn 20s, trả tiền, **+123.000 xu**. Không bán món họ gọi: bỏ về; **Lv10+ sao bị kẹp 2★ trong 30 phút**; phục vụ trễ cũng vậy. Hình phạt **không thoát được** — thoát game thì hình phạt tiếp tục ở phiên sau.
- → GĐ1497 (nhà phê bình) của mình nên lấy: dàn hộ tống + bán kính nhường chỗ + hình phạt "kẹp sao có đếm ngược" + phần thưởng lớn đột biến. Con số 123.000 = ~80 phút doanh thu Level 5–6 của mình — hiệu ứng "trúng số" đáng nhớ.

### 10.5 🆕 Các hệ xã hội — số chốt từ guide + đo bảng xếp hạng thật

- **Next Door Bistro** (Lv2): bảng hiệu bên trái **đổi quán ngẫu nhiên mỗi phút**, cờ = quốc gia chủ quán; vào thăm lấy giỏ quà (mỗi quán 4 giờ/lần, 1 nguyên liệu + 100–1.500 xu), dùng Tủ Trao Đổi của họ; ra về **bầu 😍/🙂 (mỗi quán 1 lần/ngày)**.
- **Bảng "Quán đẹp nhất" (Prettiest Restaurants)** ở công viên bên phải: **top 5 mỗi ngày (200k/150k/100k/50k/30k) + top 10 tuần (tới 1.000.000)**, giữ lịch 7 ngày, **bấm nhận thưởng ngay trên bảng**; đo thật: toàn top toàn quán VN/ID/MY/PH — cộng đồng SEA rất hoạt động,票 đếm được (😍 6 🙂 0).
- **Tủ Trao Đổi** (Lv3): tối đa 5 offer, 1–99 nguyên liệu mỗi bên, **mỗi quán 3 giờ/lượt trao**, khi ghé thăm có 1 offer ngẫu nhiên của game ở slot 0.
- **Chợ Nội Thất/Flea Market** (Lv4): đồ phải vào kho rồi mới rao bán; có người mua thì nổi bong bóng xu trên sạp → vào "My Stall" nhận.
- **Hòm thư = kênh patch notes**: game gửi cập nhật tính năng thành thư có nhãn NEW + nút Read all/Clear read; thư hệ thống có huy hiệu Admin. → cách truyền thông nhẹ nhàng mình có thể copy (GĐ toast đã có, thư là tầng tiếp theo khi có backend).

### 10.6 Chi tiết lẻ đáng ghi (mới)

- **Máy chơi game KHÔNG cộng XP, không tính sao**; khách đang chơi **không giữ ghế và đóng băng kiên nhẫn** — thiết kế chống nghẽn thông minh: máy = "bể chứa khách khi quán quá tải".
- **Lv8+ "Vệ sinh nghiêm ngặt"**: chưa có toilet hoặc chờ >5s → khách nổi giận 🚽❌ mất điểm hài lòng; dưới Lv8 chỉ về bình thường. Độ khó của toilet TĂNG THEO CẤP — toilet từ "thiện chí" thành "bắt buộc".
- **Nút 🥕 mua gấp nguyên liệu**: "Buy up to N each" — mua một phát mọi nguyên liệu sắp cạn của các món đang bán — chống sập bếp 1 nút.
- **Bán switch từng món** (on/off), giữ tối thiểu 12 món bật, 3 món đầu khóa bật — kiểm soát xác suất khách gọi.
- Nguyên liệu trong tủ học bán được 1.000/cái; tủ đầy → chấm đỏ trên nút 🍳.
- Đồ trong kho: Storage 0/5 chỗ, có search + sort; "kho đầy thì không mua được đồ ở chợ".

---

## 11. Bổ sung lần 9 — mua mở rộng thật + Settings + thanh tra lần 2 (07/11/2026, Level 13→14)

> Người chơi đã tự chơi lên Level 13, Day 5, ~101k xu (mốc kinh tế quý để đối chiếu). Đợt này đi sâu hành vi mua + tuỳ biến.

### 11.1 Mua mở rộng 11×11 — luồng mua đất đo thật

- **KHÔNG có hộp xác nhận** — bấm "Buy Expansion" là trừ tiền + tường tự giãn ngay, đồ cũ giữ nguyên vị trí, camera tự chỉnh. Đơn giản hoá tối đa: mở rộng là phần thưởng, không phải quyết định rủi ro.
- Thang giá đo được: **2.000 (7×7→9×9) → 2.500 (9×9→11×11) → 4.500 (11×11→13×13)** — tăng ~×1.8 mỗi mốc, hiển thị kèm thanh tiến độ "Level 2/8". Sau 23×23 chuyển sang mua từng ô lẻ tới 39×39.
- **Cảnh báo nhỏ**: không confirm nghĩa là bấm nhầm cũng mất tiền — với game mình (đơn giá cao hơn nhiều) nên GIỮ hộp xác nhận, nhưng học cái "mua xong tường tự giãn + đồ không xê dịch".

### 11.2 Settings — cá nhân hoá giao diện

- **12 ngôn ngữ** (ID, MS, VI, EN, IT, FR, DE, RU, ES, ZH, JA, KO) — game nhắm cộng đồng SEA trước (bảng xếp hạng toàn quán VN/ID/MY/PH).
- **🎨 8 Theme màu giao diện**: Summer Dream, Warm Rustic Palette, Pastel Paradise Dreams, Cool Waters, Gothic Romance, Vibrant Summer, Ocean Breeze, Warm Autumn Glow — đổi cả HUD lẫn màu panel. → Cực rẻ để làm (chỉ là bộ CSS variables) mà người chơi "mua" cảm giác sở hữu. Game mình có `style` trong save — nên cho mở theme HUD theo tiến trình.
- Chọn bài nhạc nền (2 bài), Sound/Music riêng, Login/Cloud Sync, **Restart from scratch** (xoá ván ngay trong game — có hộp xác nhận riêng), Feedback + Discord.

### 11.3 Thanh tra lần 2 (Level 13) — xác nhận phạt theo doanh thu

- Lần này phạt **10.000** vs hối lộ **1.600** (lần trước ở Level 6: 2.000/200) → **phạt tăng theo số xu kiếm được từ lần phạt trước** (đúng như guide), hối lộ ≈ 10–16% mức phạt (không cố định).
- Câu thoại hài khác mỗi lần ("món bò thơm quá khiến người đi đường tông cột đèn", "góc nghiêng 45 độ — vui mỉm cười nhiều hơn", "tiền vào cặp kiệm, thanh tra chúc quán đông").
- Ở Level 13 phạt 10.000 = ~10 phút doanh thu → đủ đau để nhớ, không đủ để chết. **Tỷ lệ này tốt cho game mình**: phạt sự kiện ≈ 5–15 phút doanh thu hiện tại.

### 11.4 Nhịp kinh tế người chơi thật (thước đối chiếu cho mình)

Level 5→14, Day 1→5, 18k→113k xu sau ~4–5 giờ chơi rải rác (gồm cả idle). Tăng tiền ~×6 mỗi 10 cấp ở giai đoạn đầu; opening bậc thang: mỗi cấp thưởng 1.000×cấp chiếm tỷ trọng lớn trong thu nhập đầu game (Lv14 = 14.000 xu một phát).

---

## 12. Bổ sung lần 10 — UI kinh tế vi mô: 🥕 mua gấp, Tủ Trao Đổi, Chợ đồ cũ (07/11/2026, Level 17)

> Người chơi tự chơi tới Level 17, Day 7, 162k xu. Đợt này chụp đủ 3 UI kinh tế chưa mở lần nào + thanh tra lần 3.

### 12.1 🥕 "Nguyên liệu sắp cạn" — UI mua gấp 1 nút (chống sập bếp)

- Modal "Cooking ingredients running low!" liệt kê từng nguyên liệu đang cạn của món đang bán (Tomato/Bread loaf/Pork — In stock: 0).
- **Nút đầu modal: "Buy up to 3253 each"** — một phát mua MỌI nguyên liệu sắp cạn lên tới N (N tính từ tiền + chỗ trống tủ; loại hết chỗ/hết tiền thì bỏ qua).
- Mỗi loại 4 gói: **+50, +100, +500 (−10%), +1000 (−20%)** — thang khuyến mãi như mục 7.4; đơn giá từng loại khác nhau (Tomato 1, Bread 1, Pork 2 xu/đơn vị).
- → Game mình đã có nhập hàng + giao hàng; học được **nút "Nhập đủ N mỗi loại" trên chính cảnh báo thiếu hàng** — biến cảnh báo thành hành động 1 chạm (chớp mắt là hết rủi ro bếp dừng).

### 12.2 Tủ Trao Đổi (Swap Box) — UI thật

5 slot, mỗi slot: **Offer** (chọn nguyên liệu từ tủ + stepper 1–99) ↔ **Want** (chọn loại mong muốn + số lượng) + nút Post offer; có tab **History**. Khi người khác trade xong: bấm Collect nhận (cần chỗ tủ). Đúng guide 10.5. Với mình: nếu mở hẻm online, "tủ trao đổi nguyên liệu quý giữa người chơi" là hệ nhẹ (chỉ là 5 bản ghi offer) mà tạo chợ chéo thật.

### 12.3 Chợ đồ cũ (Flea Market) — kinh tế người chơi THẬT đo được

Browse/My Stall + search/filter/sort/Refresh. Tin rao thật của người chơi:
- **Giá tự định so với giá shop, hiển thị %**: có người bán ĐẮT hơn (▲60% Wooden Chair 80 xu), có người rẻ hơn (▼30–37%), và **đồ landmark bị bán tháo ▼89–90%** (Trojan Horse 1.000.000 → 100.000; Dong Son Drum 1.900.000 → 200.000) — đúng bằng mức "bán lại cho shop 10%", tức chợ này là nơi đồ cũ tìm chủ mới giá bằng phế liệu + chút dịch vụ.
- Mỗi tin có **hạn giờ còn lại** ("897h left") — khan hiếm thời gian, không phải khan hiếm số lượng.
- Mua bán cần tài khoản; browse tự do. → Với mình (khi có backend): chợ đồ cũ giữa người chơi + hiển thị % so giá shop là cách để cộng đồng tự tạo "thị trường đồ cũ" mà không cần hệ đấu giá.

### 12.4 Thanh tra lần 3 (Level 17): phạt 11.000 / hối lộ 2.000 — hối lộ 3/3 lần thành công

Tỷ lệ hối lộ/phạt: 10% → 16% → 18% (không cố định, tăng chậm hơn phạt). 3 lần đều thành công — có thể tỉ lệ thành công cao (hoặc luôn thành công, rủi ro chỉ là lore). Phạt tăng theo doanh thu từ lần trước (2.000 → 10.000 → 11.000).

### 12.5 Nhịp tiến độ người chơi thật (cập nhật)

Level 14→17, Day 5→7 trong ~2 giờ tự chơi; 113k → 162k xu. Người chơi thật chỉ mua mở rộng + máy + nguyên liệu, chưa đụng landmark — đúng "giữa game là giai đoạn tăng diện tích + máy thu phí".
