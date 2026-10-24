> **⚠️ TÀI LIỆU LỊCH SỬ (10/2026) — số liệu trong file đã cũ, không dùng để đối chiếu hiện trạng.**
> Đến 24/10/2026, code đã đi xa hơn nhiều mục trong file này (35 nghề, 33 archetype, 10 vai nhân viên, thanh toán đa phương thức, đơn điện thoại, hợp đồng, co-op...).
> Bản đồ hiện trạng chuẩn nhất: `NGHIEN-CUU-TAP-HOA-2026-10-24.md` và mã nguồn trong `src/`.

# PHÂN TÍCH GAME TẠP HÓA 3D & ĐỀ XUẤT THAM KHẢO TỪ SIÊU THỊ TẠP HÓA ĐẦU HẰM

## 1. Game hiện tại (C:\Users\Admin\Desktop\GAME — "Tạp Hóa 3D") có gì

**Nền tảng:** Web 3D, Three.js + TypeScript, React 19 + Zustand, Vite. Giao diện tiếng Việt, chạy desktop/mobile, có đăng nhập Firebase + lưu cloud + co-op.

### 1.1. Vòng chơi cốt lõi (core loop, kiểu Stardew Valley)
- Nhân vật chính có nhà riêng, đi bộ ra tiệm tạp hóa, bán hàng ban ngày, tối về ngủ (chu kỳ ngày/đêm).
- Bắt đầu là tiệm tạp hóa nhỏ → kiếm tiền, lên cấp, mở rộng, mua kệ → thành siêu thị.
- Progression **100 cấp**: mỗi cấp mở khóa thứ gì đó (món mới, đồ nội thất, nhân viên, tầng tiệm).
- Tầm nhìn sau này: các loại shop khác (đồ ăn, nước uống, cắt tóc...) và xây dựng tự do kiểu CS2.

### 1.2. Đã có (đáng kể)
| Nhóm | Chi tiết |
|---|---|
| Nhân vật chính | 1 player 3D chibi, đi WASD/joystick/click |
| Nhân viên | Thu ngân, xếp hàng, lao công, giao hàng, bảo vệ, quản lý — mỗi vai có mở khóa theo cấp, ca làm, sao kỹ năng, lương |
| Khách vãng lai theo nghề | 9 nghề: công nhân xây dựng, y tá, shipper, đầu bếp, mẹ bỉm sữa, bảo vệ, giáo viên, người bán chợ, dân chạy bộ — mỗi nghề có giờ ghé, món mua ưa thích, độ trung thành, nhạy giá, kiên nhẫn |
| Khách quen | Có hệ thống khách ruột nguyên mẫu (bà Năm, chú Ba, Bé Na...) |
| Hình dáng nhân vật | 18 archetype 3D chibi đa dạng (học sinh, người già, dân văn phòng, coder, thợ...) với đồ nghề/đạo cụ riêng |
| Sản phẩm | 6 ngành hàng (khô, uống, mát, đông lạnh, gia dụng, tươi), catalog ~140 món mở khóa theo cấp |
| Kinh tế | Nhà cung cấp, giá nhập/bán, giảm giá, độ tươi, đơn tiệc, doanh thu, lãi/lỗ |
| Vận hành | Kệ hàng/planogram, kho, bày hàng, châm hàng, độ bẩn tiệm, thời tiết, ngày/lịch |
| Tiến độ | XP, cấp, nhiệm vụ ngày + cốt truyện, danh hiệu, kỹ năng |
| Mạng | Đăng nhập, lưu cloud, co-op chơi cùng |

### 1.3. Cần thêm (theo phân tích)
1. **Đa dạng ngành nghề nhân vật** (yêu cầu chính của người dùng) — rẽ nhánh thực hiện ngay bên dưới.
2. Đa dạng loại cửa hàng (quán nước, quán ăn vặt, tiệm cắt tóc...) theo tầm nhìn dài hạn.
3. Khách sỉ / khách ghé mua số lượng lớn, hợp đồng cung cấp.
4. Sự kiện thời vụ (lễ, mùa, thị trường biến động) làm thay đổi nhu cầu.
5. Đồ nội thất & trang trí đa dạng hơn (đèn đường, cây cảnh, biển hiệu).

## 2. Game tham khảo (C:\Users\Admin\Desktop\SIEU-THI-DATNT — "Siêu Thị Tạp Hóa Đầu Hằm") — những gì đáng học

Đây là game quản lý tạp hóa 2.5D pixel art rất sâu (monorepo: game-core, game-data, game-renderer-3d, shared, apps/web, apps/server), nhiều hệ thống mà game hiện tại chưa có:

| Hệ thống | Mô tả | Đánh giá ứng dụng cho game hiện tại |
|---|---|---|
| **Khách quen có tiểu sử + perk theo điểm thân thiết** | Bà Năm/Chú Ba/Bé Na có bio, món khoái, và perk mở theo ngưỡng điểm (tip, mua thêm, ghé thường xuyên) | ⭐ Rất nên học — game hiện tại có khách quen nhưng còn sơ sài; gắn perk theo điểm thân thiết tạo chiều sâu |
| **Nhiều loại công trình** | Quán nước, quán ăn vặt, quán ăn đường phố, bãi đỗ xe, sản xuất công thức (bếp), đa cơ sở trên lô đất thuê | ⭐ Khớp tầm nhìn dài hạn của game hiện tại (mở thêm loại shop) |
| **Kinh tế nông sâu** | Giá nhập theo thị trường biến động, thuế, kiểm tra, sổ cái GAAP, tín dụng/khách quen nợ, chợ đầu mối | Đáng học dần; game hiện tại đơn giản hơn là ổn cho giai đoạn này |
| **Bộ nhân vật theo vai trò/activity** | Staff theo role; cư dân theo type/accessory; người đi đường theo activity; customer hiện chưa có nghề | ⭐ Customer gán nghề đang là thứ game hiện tại LÀM TRƯỚC — khẳng định hướng đúng |
| **Mùa + sự kiện thị trường** | 4 mùa, sự kiện thị trường thay đổi cung/cầu, ngày hội | Đáng thêm sau khi đủ content |
| **Prestige / sao sau cấp cao** | Tái sinh sau cấp 35 mở thêm độ dài | Đáng học khi người chơi lên cao |

> **Kết luận tham khảo quan trọng nhất:** game tham khảo đang cân nhắc gán *nghề cho customer* — và game hiện tại **đã làm điều đó** với 9 nghề. Tiếp tục mở rộng số nghề + làm khách quen trở nên "có cá tính" (bio + perk theo điểm) là hướng tối ưu, khai thác cả hai nền tảng.

## 3. Điều đã LÀM trong lượt này: mở rộng ngành nghề nhân vật

Đã thêm nhiều archetype nhân vật chibi 3D + nghề khách vãng lai mới (xem `src/render/characterModel.ts` và `src/data/professions.ts`).

---

## 4. Hệ thống khách quen có tiểu sử + perk theo điểm thân thiết

> Lưu ý quan trọng: hệ thống này **đã được triển khai sẵn** trong game (được port từ SIEU-THI-DATNT trước đó — cùng 6 khách ruột: Bà Năm, Chú Ba, Bé Na, Bác Tám, Chị Lan, Anh Tuấn). Nó có đầy đủ: RegularDef (bio, món khoái, giờ ghé, độ nhạy giá, hội thoại), RegularProgress (điểm thân thiết, số lần ghé, món đã phát hiện, perk đã mở), regularCheckout / regularWalkout, và UI RegularsPanel hiển thị tiến độ + thanh đến mốc perk + món khoái ẩn (''???'' cho đến khi khách mua được) + perk đã mở.

### Việc đã làm trong lượt này: mở rộng danh sách khách quen 6 → 12

Thêm 6 khách ruột mới với hình dáng 3D (archetype — trong đó nhiều người dùng archetype nghề mới đã thêm ở mục 3) và các mốc perk riêng:

| Khách mới | Nghề/Archetype 3D | Giờ ghé | Món khoái | Mốc mở khóa |
|---|---|---|---|---|
| Chú Thắng cắt tóc | barber | 8h–14h | cà phê, bánh, nước | cấp 5 |
| Bác Hùng thợ máy | mechanic | 11h–15h | nước tăng lực, mì, snack | cấp 6 |
| Cô Mai pha chế | barista | 6h–9h | sữa, cà phê, trà | cấp 5 |
| Bác Hải bác sĩ | doctor | 12h–18h | sữa, trái cây, khẩu trang | cấp 8 |
| Anh Giao ngân hàng | banker | 12h–14h | cà phê, bánh, sữa | cấp 9 |
| Chú Tư công nhân | construction_worker | 17h–20h | bia, nước tăng lực | cấp 10 |

Mỗi khách mới đều có bio, hội thoại (greeting/satisfied/walkout), độ nhạy giá, kiên nhẫn và ba perk theo mốc (ghé thường hơn / mua thêm món / boa thêm) — khớp cơ chế có sẵn.

**File sửa:** `src/data/regulars.ts` (thêm 6 RegularDef), `src/agents/customers.ts` (map archetype cho khách mới).

---

## 5. Mở rộng: thêm khách quen + Perk phong phú hơn

**1) Nhiều khách quen hơn nữa — mỗi cấp cao một khách ruột mới.**

Nâng tổng khách ruột từ 12 lên **20 người**, thêm các khách mở khóa dần ở cấp 12–28, mỗi người đều có bio, giờ ghé, món khoái, hội thoại và archetype 3D:

| Khách mới (cấp mở) | Archetype | Perk nổi bật |
|---|---|---|
| Cô Mùa bán hoa (12) | office_lady | bulk_buy |
| Chú Thợ điện (14) | electrician | bulk_buy, refer_friend |
| Bà Ba bán thịt (16) | elder_woman | refer_friend |
| Anh Minh quán nhậu (18) | worker_driver | refer_friend |
| Cô Nga hội phụ nữ (20) | office_lady | festival |
| Cô Thảo tiệm bánh (22) | office_lady | bulk_buy |
| Chú Cường chủ xưởng (24) | gentleman | bulk_buy + refer_friend |
| Bác Đôi lễ hội làng (28) | elder_man | festival |

**2) Perk phong phú hơn — thêm 3 loại hiệu ứng mới.**

Mở rộng `PerkEffect` từ 3 lên **6 loại**:
- `refer_friend` (giới thiệu bạn bè): khi khách quen mua xong, rủ thêm N khách lẻ vào tiệm (cộng dồn `friendsBurst`, được xử lý theo từng suất sinh khách).
- `bulk_buy` (mua số lượng lớn theo lô): mỗi món khoái được nhân bản thêm N đơn vị — khách quen mua buôn.
- `festival` (ngày hội riêng khách quen): hôm khách này ghé, cả khu đông khách hơn (nhân traffic 1.2–1.35, reset mỗi ngày).
- 3 loại cũ (bonus_tip, extra_item, frequent_visit) giữ nguyên.

**File sửa:**
- `src/data/regulars.ts` — mở rộng `PerkEffect`, thêm helper `referFriends`/`bulkExtra`/`festivalVisit`, thêm 14 khách quen (tổng 20), định nghĩa perk mới.
- `src/agents/customers.ts` — map archetype 20 khách quen; tiêu thụ perk: `bulk_buy` trong `regularWants`, `refer_friend` (kích `friendsBurst` khi thanh toán) và `festival` (tăng traffic) trong `update`.

---

## 6. UI: thêm icon nhận diện từng loại perk trong RegularsPanel

Chỉ sửa trực quan file `src/ui/Panels.tsx` (không đụng gameplay/save):
- Thêm map `PERK_ICONS: Record<PerkEffect, string>`: 💲 boa thêm, 🛒 thêm món, 🔁 ghé thường hơn, 👥 rủ bạn bè, 📦 mua lô, 🎉 ngày hội.
- Dòng perk chưa mở (mốc tiếp theo): thêm icon trước "`{số mốc}: {mô tả}`".
- Dòng perk đã mở: mỗi perk giờ có icon riêng trước mô tả (thay vì chỉ dấu ✔ + toàn chữ).
- `tsc --noEmit` pass.
