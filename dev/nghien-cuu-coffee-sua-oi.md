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

## 6. Kế hoạch phần còn lại (lập 14-11-2026)

Đã xong nhóm ⚡ và 🔨 (trừ "nhấn giữ → nhấn một lần": bỏ vì game không có thao tác giữ nào ngoài joystick).
Còn lại 5 mục lớn. **i18n Việt/Anh làm trước tiên** vì mọi mục sau đều thêm chuỗi UI mới —
làm trước thì chuỗi mới viết thẳng qua `t()`, không phải dịch lại.

### 6.1 Tiếng Anh (i18n) — quy mô thực tế

Đo trong code: ~122 file `src/ui/*.tsx` (~1.000 chuỗi có dấu + chữ trong JSX), ~278 file
`src/data` (~5.500 chuỗi: tên món, hàng, khách, sự kiện, nhiệm vụ…), 81 file dùng
`toLocaleString`/`vi-VN`. Đã có sẵn `Settings.currency: 'vnd'|'usd'` + `sanitize()` ở
`src/core/settings.ts` → chỗ đặt `lang` có sẵn khuôn.

**Kiến trúc chốt (không thư viện ngoài):**
- `src/core/i18n.ts`: `t(key, vars?)`, `tn(count, key)` (số nhiều tiếng Anh), `getLang()`;
  từ điển `src/i18n/vi.ts` (nguồn gốc, là kiểu chuẩn) + `src/i18n/en.ts` (`satisfies` kiểu vi →
  `tsc` báo thiếu khóa).
- `Settings.lang: 'vi'|'en'` (mặc định `vi`; lần đầu đoán theo `navigator.language`). Đổi →
  lưu + reload (như Coffee Sữa Ơi), tránh phải làm React re-render toàn cây.
- **Dữ liệu game không dịch bằng khóa rải rác**: giữ `name` tiếng Việt làm id hiển thị gốc,
  thêm bảng `src/i18n/en/data/*.ts` map `id → tên Anh`; helper `nameOf(item)` dùng ở UI.
  Mô phỏng/golden/save **không đổi** (chỉ lớp hiển thị) → `simGolden`, `monThat` không đụng.
- Món Việt giữ tên gốc + chú thích Anh: "Bánh căn — mini rice pancakes" (đúng tinh thần
  CLAUDE.md "tên chợ thật"; người chơi Anh vẫn học tên món). Tiền/ngày qua `formatMoney`/
  `formatDate` chung theo `lang` (gom 81 chỗ `toLocaleString`).

**Các bước (mỗi bước 1 commit, game luôn chạy được):**
1. Khung: `i18n.ts`, `Settings.lang`, mục "Ngôn ngữ" trong tab Chơi, test `en` đủ khóa của `vi`.
2. Gom định dạng số/tiền/ngày về helper chung (81 file) — thay đổi cơ học, test chặn.
3. Màn đăng nhập + menu chính + Cài đặt + HUD/dock (cái người chơi thấy đầu tiên).
4. Các panel theo nhóm: Quản lý quán, Nhiệm vụ, Thành tựu, Dạo phố, Minigame, Sổ đầu ngày…
5. Dữ liệu: món/hàng → khách/sự kiện → hội thoại/cốt truyện (nhiều chữ nhất, làm cuối).
6. Lưới an toàn: test quét `src/ui` chặn chuỗi có dấu tiếng Việt nằm ngoài `t()` (danh sách
   ngoại lệ thu nhỏ dần) + thêm luật vào CLAUDE.md: "chuỗi UI mới phải qua `t()`, tên món mới
   thêm dòng Anh".
7. Server (`server/socialRules.ts`, thông báo lỗi co-op/xếp hạng) trả mã lỗi, client dịch.

Rủi ro: nhiều phiên song song cùng sửa UI → bước 3–4 chia theo file nhỏ, commit đúng đường dẫn;
chữ Anh dài hơn ~30% → kiểm lại nút/ dock ở 375px sau mỗi nhóm.

### 6.2 Các mục lớn khác (sau i18n, theo thứ tự)

| # | Mục | Cách làm gọn | Cổng golden |
|---|---|---|---|
| 1 | Trạng thái đồng bộ cloud + tải file backup `.txt` | Thẻ trạng thái (Đang bật/tắt, lần đồng bộ cuối) ở Sao lưu; nút tải = mã TH3D1 ghi ra Blob | Không ảnh hưởng mô phỏng |
| 2 | Chọn 2 nhiệm vụ ưu tiên/ngày | Lớp "ghim" trên hệ quest sẵn có, thưởng thêm khi xong việc đã ghim; `registerTodo` để nhắc | Cơ chế mới → cổng cấp > 30 hoặc golden:update có chủ ý |
| 3 | Chọn phong cách khởi đầu khi tạo ván | Màu mặt tiền + bộ bàn ghế lưu vào save, chỉ thẩm mỹ | Không ảnh hưởng kinh tế |
| 4 | Podium xếp hạng + danh hiệu/avatar | Cần thêm trường server; danh hiệu suy từ chỉ số sẵn có | Không ảnh hưởng mô phỏng |
