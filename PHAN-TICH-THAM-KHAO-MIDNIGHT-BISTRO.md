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
| **Bếp** (11 loại) | Nơi đầu bếp đứng nấu; xoay bếp để chọn chỗ đứng | 280 → 4.500 | Bếp khác nhau chủ yếu là **ngoại hình/chủ đề** (bếp than, bếp wok, lò pizza, lẩu, teppanyaki…). Không có bếp thì không có thu nhập vắng mặt |
| **Bàn** (20) | Neo chỗ ngồi | 20 → 4.000 | Ghế phải đặt **sát bàn** mới tính |
| **Ghế** (16) | Mỗi ghế = 1 khách | 10 → 3.600 | Thiếu ghế → khách đứng xếp hàng ở cửa rồi bỏ đi |
| **Máy chơi game** (8) | Khách ghé dùng, **trả phí mỗi lượt** | 1.500–3.600, phí 15–40/lượt | Gắp thú, máy bán nước, photobooth, ghế massage, máy đánh giày, kẹo bông… Hoàn vốn ≈ 90–100 lượt |
| **Toilet** (5) | Khách ăn xong hay đi vệ sinh, trả phí | 500 (1/lượt) → 60.000 (50/lượt) | Thiếu toilet → khách tức giận (`toilet_angry`) |
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
