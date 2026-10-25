> **⚠️ TÀI LIỆU LỊCH SỬ (10/2026) — số liệu trong file đã cũ, không dùng để đối chiếu hiện trạng.**
> Đến 24/10/2026, code đã đi xa hơn nhiều mục trong file này (35 nghề, 33 archetype, 10 vai nhân viên, thanh toán đa phương thức, đơn điện thoại, hợp đồng, co-op...).
> Bản đồ hiện trạng chuẩn nhất: `NGHIEN-CUU-TAP-HOA-2026-10-24.md` và mã nguồn trong `src/`.

# Phân tích game hiện tại và tham khảo HappyTown

Ngày rà soát: 23/10/2026

## Tóm tắt

Game hiện tại là game quản lý tiệm tạp hóa 3D: người chơi nhập hàng, bày kệ, phục vụ khách, quản lý nhân viên và phát triển tiệm. HappyTown là game mô phỏng đời sống 3D rộng hơn, kết hợp nông trại, nghề, chợ, câu cá, đua xe, nhà cửa và mini-game. Nên học cách biến cư dân thành các gương mặt có tên, việc cần nhờ và lý do để quay lại; không nên bê nguyên các hoạt động không phục vụ fantasy chủ tiệm.

## Hiện trạng đã xác nhận trong source

| Hệ thống | Hiện trạng |
|---|---|
| Vòng chơi cửa hàng | Khách đi mua, giỏ hàng, thu ngân/người chơi, xếp hàng, doanh thu và tổng kết ngày. |
| Khách theo nghề | 17 nghề trong `src/data/professions.ts`; nghề có khung giờ, món thích, số món, nhạy giá và kiên nhẫn. |
| Ngoại hình | 26 archetype trong `src/render/characterModel.ts` (gồm player), đồng phục/phụ kiện nghề; costumes cho phép đổi diện mạo. |
| Khách quen | 20 nhân vật trong `src/data/regulars.ts`; bio, giờ ghé, sở thích, lời thoại và perk thiện cảm. |
| Perk khách quen | Đã có boa thêm, mua thêm món, ghé thường hơn, rủ bạn bè, mua số lượng lớn và tăng lưu lượng theo ngày khách ghé. |
| Tiến triển | Cấp độ, nhiệm vụ ngày/cốt truyện, danh hiệu, nâng cấp tiệm/kho, tuyển nhân viên. |
| Thương mại | Đơn hợp đồng cung ứng có trong `src/data/contracts.ts`; sản phẩm, nhà cung cấp, giá, độ tươi và kho đã có. |
| Sự kiện | Có sự kiện ngắn như nắng nóng, mưa, khai trương, ngày may mắn, bão, sửa đường, mất điện và đối thủ giảm giá. |
| Mạng/lưu | Có save, cloud/Firebase và co-op trong source; mức độ QA hiện hành cần xem tài liệu dự án riêng. |

### Khoảng trống cần ưu tiên

1. **Ngoại hình khách quen chưa đủ riêng:** nhiều nhân vật chia sẻ một archetype (ví dụ nhiều cô dùng `office_lady`, người lớn tuổi dùng `elder_man`/`elder_woman`). Tăng số nghề không tự giải quyết được việc khó nhận diện từng khách.
2. **Danh tính và nhu cầu mua chưa thành câu chuyện chơi:** đã có bio, giờ ghé và perk, nhưng nên làm rõ chuỗi “khách cần hàng → chuẩn bị tồn kho/đơn → hoàn thành đúng giờ → phản hồi/uy tín/khách quay lại”.
3. **Đơn hợp đồng chưa gắn nhất quán với khách quen:** hợp đồng có người gửi và chu kỳ giao; có thể nối NPC quen với hợp đồng để người chơi hiểu mình đang giúp ai và vì sao cần nhập món đó.
4. **Sự kiện còn thiên về traffic chung:** có thể thêm ngày hội theo mùa/quận và nhóm món được ưa chuộng; giữ số biến động ít để người chơi đọc được tác động.
5. **Độ rõ ràng vận hành:** ưu tiên báo cáo “vì sao khách bỏ đi / món nào hết / giá nào khiến khách không mua” và gợi ý hành động trước khi mở các hệ thống mới.

## HappyTown có gì đáng tham khảo

Trang [giới thiệu HappyTown](https://myhappy.town/intro/) và [hồ sơ nhân vật/cư dân](https://myhappy.town/intro/nhan-vat/) mô tả 6 anh hùng có ưu thế nhỏ, 67 cư dân được nhóm theo khu vực, mỗi người có tên/nghề/việc, đơn hàng và giao hàng; game còn có các khu vực, thú cưng, nội thất, đội phụ việc và nhiều hoạt động giải trí.

| Ý tưởng | Áp dụng cho tiệm tạp hóa | Ưu tiên |
|---|---|---|
| NPC có tên/nghề/địa điểm/việc cần nhờ | Nối khách quen với yêu cầu hàng hoặc hợp đồng có lời thoại và phần thưởng riêng. | Cao |
| Ưu thế nhỏ gắn với lựa chọn nhân vật | Nếu thêm lựa chọn chủ tiệm, perk nên nhẹ và đổi được, không tạo nhân vật “đúng meta”. | Thấp, làm sau |
| Khu vực mở dần | Dùng làm mục tiêu dài hạn: khu dân cư mới mở nhóm khách/đơn hàng mới, vẫn xoay quanh tiệm và giao hàng. | Trung bình |
| Đơn giao đúng hạn có thưởng | Tận dụng role nhân viên giao hàng, tạo lựa chọn tự giao hoặc thuê shipper. | Cao |
| Hoạt động phụ đa dạng (câu cá/kart/cờ) | Không nên thêm lúc này; khác fantasy kinh doanh và kéo loãng core loop. | Không ưu tiên |
| Nhiều thú cưng/nội thất/vật phẩm trang trí | Có thể mở rộng trang trí tiệm/nhà thành phần thưởng cosmetic khi vòng chơi cốt lõi ổn. | Thấp |

**Bài học chính:** HappyTown tạo cảm giác thế giới sống nhờ NPC theo địa điểm và mục đích, không chỉ bằng số lượng mô hình. Game hiện tại đã có hệ nghề, khách quen và contract, nên bước kế tiếp nên nối chúng lại thay vì tăng số nghề cho đủ lớn.

## So với SIEU-THI-DATNT trong workspace

`SIEU-THI-DATNT` là game tạp hóa 2.5D/pixel, gần thể loại hơn HappyTown. Tài liệu dự án đó ghi nhận các hướng như thiện cảm/perk khách quen, đơn tiệc, mục tiêu dài hạn/tuần, kỹ năng, mùa/ngày hội, quầy phụ, tín dụng/mua chịu và nhiều hệ thống quản lý sâu. Một số phần trong tài liệu của game kia còn ghi chưa QA hoặc còn provisional; xem đó là ý tưởng/đối chiếu, không mặc định mọi thứ đã được nghiệm thu.

Game hiện tại đã có khách quen/perk, hợp đồng, nhiệm vụ và sự kiện ngắn. Có thể học cấu trúc hệ thống, nhưng nên thử từng phần nhỏ:

- **Đáng học:** đơn tiệc/đơn lớn theo dịp, mục tiêu tuần, ngày hội có nhóm hàng, bảng giải thích đánh giá khách.
- **Chỉ làm sau khi cân bằng:** tín dụng/mua chịu, biến động giá phức tạp, thuế/kiểm tra và nhiều loại cửa hàng.
- **Tránh làm song song:** thêm quá nhiều currency, minigame, công trình hoặc chuỗi chi nhánh trước khi khách hàng và nhập hàng tạo thành vòng chơi dễ hiểu.

## Lộ trình đề xuất

### P0 — làm nhân vật dễ nhớ, chưa cần thêm archetype hàng loạt

- Gán appearance riêng và ổn định cho 20 khách quen: tóc, màu da/áo, phụ kiện cầm tay, túi/đạo cụ nghề.
- Hạn chế khách trùng diện mạo đồng thời trong một khung nhìn; giữ kết quả ổn định giữa ngày/save.
- Tận dụng 17 nghề hiện có cho silhouette/đạo cụ nhận ra ngay (ống nghe, thùng giao hàng, tạp dề, cặp, mũ bảo hộ...).
- Nếu cần thêm nghề sau đó, ưu tiên nghề làm phát sinh nhu cầu sản phẩm khác biệt hoặc hợp đồng cụ thể, chẳng hạn thú y, thợ điện lạnh, tài xế xe tải, nhân viên văn phòng ca đêm, chủ quán ăn; mỗi nghề phải có lý do gameplay, không chỉ thêm nhãn.

### P1 — “khách quen có việc cần nhờ”

- Mỗi ngày chọn một vài yêu cầu ngắn từ khách quen, dùng sản phẩm catalog hiện có.
- Cho người chơi một đến ba ngày chuẩn bị; phần thưởng là tiền/XP/thiện cảm/uy tín, có giới hạn số đơn để tránh quá tải.
- Hiển thị rõ số lượng, hạn, lợi nhuận dự kiến và nguồn hàng trước khi nhận.
- Hợp đồng dài hơn giữ vai trò kế hoạch tồn kho; đơn ngắn là câu chuyện cá nhân. Tránh hai hệ thống trùng UI.

### P2 — tính mùa và khu vực vào nhu cầu

- Sự kiện 1–3 ngày làm tăng nhu cầu một nhóm hàng, đi cùng thông báo/bản tin trước một ngày.
- Mở nhóm khách/khu phố mới theo cấp hoặc nâng cấp cửa hàng, không vội xây cả thành phố tự do.

### P3 — kiểm chứng rồi mở nhánh lớn

- Playtest vòng nhập hàng → bày kệ → bán → lời/lỗ → mở rộng.
- Khi vòng chính ổn mới cân nhắc quầy phụ (cà phê/bánh mì), nhiều cơ sở, cửa hàng ngành khác hoặc mua chịu.

## Phạm vi rà soát và giới hạn

- Repo chính được rà source data, agent, UI, store, render và tài liệu. Đây là kiểm kê tĩnh; lượt này không chạy game hoặc build.
- HappyTown được đối chiếu từ trang giới thiệu và trang nhân vật công khai, nội dung có thể đổi theo bản game.
- Tài liệu/roadmap của `SIEU-THI-DATNT` được xem như nguồn thiết kế và tự khai báo trạng thái; không chạy code của dự án đó trong lượt này.
- Đề xuất này không khẳng định tính năng đã code đều đã được kiểm thử hoặc cân bằng trong runtime.
