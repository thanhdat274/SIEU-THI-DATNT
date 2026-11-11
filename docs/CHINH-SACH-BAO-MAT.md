# Chính sách Bảo mật — Tạp Hoá 3D

> **Trạng thái: BẢN NHÁP tham khảo.** Tài liệu này được soạn dựa trên hành vi thực tế của mã nguồn (xem mục "Dữ liệu nào được thu thập & lưu ở đâu"). Đây là bước rà soát ban đầu, **không thay thế ý kiến pháp lý** chuyên nghiệp. Trước khi triển khai công khai, cần rà lại hiệu lực văn bản tại thuvienphapluat.vn / vbpl.vn và điều chỉnh theo tình hình thực tế.

_Cập nhật lần cuối: 2026-11-03 · Áp dụng từ 01/01/2026 (Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP)._

---

## 1. Khái quát

Tạp Hoá 3D ("**Ứng dụng**", "**chúng tôi**") là game quản lý cửa hàng tạp hóa chạy trên trình duyệt (web, có thể cài làm PWA). Ứng dụng có hai chế độ:

- **Chơi không đăng nhập (khách):** tiến trình chỉ lưu cục bộ trong trình duyệt của bạn.
- **Chơi có tài khoản (đăng nhập Google):** tiến trình được đồng bộ lên máy chủ đám mây (cloud), dùng được trên nhiều thiết bị, và có thể chơi hẻm online (co-op) với người khác.

Chính sách này mô tả những dữ liệu cá nhân chúng tôi xử lý, tại sao, lưu ở đâu, và quyền của bạn.

## 2. Dữ liệu nào được thu thập & lưu ở đâu

### 2.1. Đăng nhập Google (bắt buộc khi dùng tài khoản)

Khi bạn chọn "Đăng nhập bằng Google", Ứng dụng dùng Google để xác thực và nhận, qua Google:

- **Địa chỉ email**
- **Tên** (display name)
- **Ảnh đại diện (avatar)** nếu bạn có
- **Mã định danh tài khoản (uid)** do Firebase cấp

Mục đích: xác thực danh tính, nhận diện tài khoản người chơi, đồng bộ tiến trình.

**Lưu ở đâu:**
- Tài khoản và thông tin hồ sơ được quản lý bởi **Google / Firebase Authentication** (bên thứ ba) — dữ liệu nằm ở trung tâm dữ liệu của Google.
- Trên máy chủ của chúng tôi (cloud lưu game — xem 2.2), bản lưu chỉ gắn với **`uid`**. Máy chủ **không lưu email hay avatar**.
- Khi bạn tạo/vào **hẻm online**, máy chủ lưu **tên hiển thị Google** của bạn (hoặc "Chủ tiệm" nếu tài khoản không có tên) trong danh sách thành viên hẻm, và gửi tên đó cho những người cùng hẻm. Tên bị gỡ khỏi hẻm khi bạn rời hẻm hoặc xóa tài khoản.

### 2.2. Tiến trình trò chơi (save)

- **Cục bộ (IndexedDB/Dexie):** bản lưu trò chơi được ghi ngay trong trình duyệt của bạn, kể cả khi chơi khách.
- **Đám mây (cloud MongoDB):** khi đăng nhập, bản lưu được đồng bộ lên máy chủ đám mây của chúng tôi. Máy chủ cloud có thể đặt **ở nước ngoài** (ví dụ Singapore) — việc này thuộc diện **chuyển dữ liệu xuyên biên giới**.

Nội dung bản lưu là **dữ liệu trò chơi** (tiến trình, hàng hóa, cửa hàng...), không bao gồm ảnh/số điện thoại/xác nhận danh tính.

### 2.3. Chơi online (hẻm / co-op)

Khi vào hẻm online, Ứng dụng gửi qua WebSocket tên hiển thị, mã hẻm và trạng thái trò chơi để những người trong hẻm cùng chơi.

### 2.4. Nhật ký kỹ thuật (logs)

Máy chủ ghi nhật ký mỗi yêu cầu API kèm mã định danh người dùng (uid), đường dẫn, thời điểm và mã trạng thái — nhằm vận hành, bảo mật, chống lạm dụng và khắc phục sự cố.

### 2.5. Dữ liệu KHÔNG thu thập

- Ứng dụng **không** bán dữ liệu cá nhân.
- Ứng dụng **không** cài các công cụ theo dõi quảng cáo / nhà phân tích bên ngoài (không Google Analytics, không Pixel...).
- Ứng dụng **không** thu thập dữ liệu nhạy cảm (sức khỏe, tôn giáo, tình dục, dữ liệu sinh trắc học...).

### 2.6. Số liệu ẩn danh (telemetry — TUỲ CHỌN, mặc định tắt)

- Người chơi có thể chọn đồng ý gửi **số liệu ẩn danh** để giúp cân bằng game (scope `telemetry_anon`). Lựa chọn này **mặc định tắt** và không bắt buộc: không đồng ý thì không mất chức năng nào.
- Mỗi ngày game gửi **một bản tóm tắt** gồm: cấp, số khách, số khách bực/khách bỏ về, giây thật đã chơi, dải tiền, hệ đã dùng, độ phân giải đồ họa, loại thiết bị, và một id ngẫu nhiên sinh trên máy (`install`).
- Bản tóm tắt này **không** chứa tên, email, số điện thoại, mã tài khoản (uid), vị trí, hay bất kỳ nhận dạng cá nhân nào. `install` là định danh giả danh, tách rời hoàn toàn khỏi tài khoản (không bao giờ ghép với uid).
- Người chơi xem đúng nội dung gửi đi qua mục "Xem gửi những gì", bật/tắt hoặc xuất bản nhật ký chơi thử (30 bản gần nhất) bất cứ lúc nào trong menu „⋯".
- Người chưa đăng nhập: lựa chọn lưu trên máy (`localStorage`). Người đã đăng nhập: lựa chọn được ghi thêm vào bản đồng ý. Bản ghi đã gửi được tự động xoá sau 180 ngày.

### 2.7. Cộng đồng (danh thiếp, bạn bè, chợ, thi đua, hội chợ — TUỲ CHỌN, mặc định tắt)

- Đăng nhập Google KHÔNG tự mở tính năng cộng đồng. Để khoe tiệm cho người khác, người chơi **chủ động bật scope `public_card`** (một ô đồng ý riêng, mặc định tắt). Khi bật, tên tiệm, tên chủ (tên Google đã rút gọn), cấp tiệm, và sơ đồ tiệm trở thành **dữ liệu công khai** — người khác xem được qua mã bạn bè và xuất hiện trên bảng xếp hạng.
- Bạn bè kết bằng mã 6 ký tự (tối đa 30). Thư/`inbox` lưu trên máy chủ tối đa 30 ngày.
- Chợ liên hẻm: lô hàng đăng bán để công khai tới 7 ngày thật; tên người bán là tên tiệm công khai (đã bật scope). Giá bán và trần theo luật game.
- Thi đua tuần / hội chợ: chỉ dùng điểm có trần và chỉ số tổng hợp từ bản lưu; **không** hiển thị tiền, doanh thu hay cấp làm tiêu chí xếp hạng.
- Gửi **lẵng hoa / lời khen**: tên người gửi (tên tiệm công khai) sẽ hiện cho người nhận.
- Tên do người dùng tự gõ được **lọc từ cấm phía máy chủ** và có nút báo cáo; tên bị báo cáo nhiều sẽ tự đổi thành "Tiệm tạp hóa".
- Tắt scope `public_card` hoặc xoá tài khoản: **danh thiếp, bạn bè, thư, điểm tuần/mùa và phần góp hội chợ bị xoá khỏi máy chủ** ngay.
- Mọi tính năng ở mục này đều có **trần mỗi ngày** phía người nhận; không mạng / chưa đăng nhập thì bảng Cộng đồng chỉ hiện lời mời đăng nhập và không ảnh hưởng tới chơi đơn.

## 3. Mục đích xử lý

1. Cung cấp và đồng bộ tiến trình trò chơi (tài khoản + cloud).
2. Vận hành, bảo mật, chống gian lận và lạm dụng dịch vụ.
3. Hỗ trợ kỹ thuật và khắc phục sự cố.

## 4. Căn cứ pháp lý & sự đồng ý

- Với dữ liệu tài khoản/cloud: xử lý dựa trên **sự đồng ý** của bạn. Chúng tôi xin đồng ý xử lý dữ liệu bằng một ô đánh dấu **riêng**, tách khỏi ô chấp nhận Điều khoản sử dụng, trước khi bạn đăng nhập; bạn không bắt buộc phải đồng ý để chơi (vẫn chơi được ở chế độ khách, chỉ lưu trong máy).
- Bạn có thể rút lại đồng ý bất cứ lúc nào (xem mục 6 — Xóa dữ liệu).
- Chúng tôi **lưu bằng chứng đồng ý** (thời điểm, phiên bản chính sách) để kiểm chứng khi cần.

## 5. Quyền của bạn (chủ thể dữ liệu)

Bạn có quyền, theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15:

- **Biết** các hoạt động xử lý dữ liệu của mình.
- **Xem / sửa / cập nhật** dữ liệu cá nhân (email/tên do Google quản lý — bạn đổi qua Google; dữ liệu game xem bằng bản lưu).
- **Hạn chế / phản đối** một phần việc xử lý.
- **Yêu cầu xóa** dữ liệu (xem mục 6).
- **Khiếu nại** về hoạt động xử lý.

Thời hạn phản hồi yêu cầu (tham khảo NĐ 356/2025): trả lời trong khoảng **2 ngày**; xử lý **xem/sửa** trong ~**10–15 ngày**; **xóa** trong ~**20–30 ngày** sau khi xác minh yêu cầu.

## 6. Xóa dữ liệu / tài khoản

Bạn có thể xóa tài khoản và dữ liệu cloud bất cứ lúc nào ngay trong game (menu tài khoản → "Xóa tài khoản & dữ liệu"). Thao tác này:

- Xóa bản lưu cloud trên máy chủ (MongoDB).
- Rời/xóa các hẻm online bạn tham gia.
- Xóa tài khoản Google/Firebase liên kết (bạn sẽ cần đăng nhập lại nếu muốn dùng tài khoản mới).
- **Giữ nguyên** bản lưu cục bộ trong trình duyệt của thiết bị (bản lưu máy không gắn với tài khoản, bạn vẫn có thể chơi chế độ khách).

Bạn cũng có thể tự xóa dữ liệu Google của mình tại https://myaccount.google.com/. Để xóa dữ liệu khác hoặc nhờ hỗ trợ, liên hệ theo mục 8.

## 7. Bảo mật & lưu trữ

- Truy cập cloud yêu cầu token xác thực Firebase (Bearer); máy chủ có hạn chế tần suất (rate-limit) theo người dùng.
- Bản lưu cloud được giữ **miễn là tài khoản còn tồn tại** và bạn chưa yêu cầu xóa.
- Chúng tôi cố gắng bảo vệ dữ liệu hợp lý, nhưng **không giao dịch nào trên Internet là an toàn tuyệt đối**.

## 8. Liên hệ

Mọi thắc mắc, yêu cầu về dữ liệu cá nhân, vui lòng liên hệ trước khi cần:

- Kênh hỗ trợ của dự án: Email: nguyenthanhdat27042002@gmail.com

Chúng tôi cam kết phản hồi và xử lý yêu cầu của bạn trong thời hạn nêu tại mục 5.

---

_Đây là bản nháp tuân thủ tối thiểu. Khi đưa dự án ra công khai chính thức, hãy xin tư vấn pháp lý và rà lại toàn bộ văn bản hiệu lực._
