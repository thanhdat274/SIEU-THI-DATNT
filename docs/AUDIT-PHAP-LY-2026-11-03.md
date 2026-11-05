# Báo cáo rà soát pháp lý — Tạp Hoá 3D (2026-11-03)

> Rà soát theo checklist của [vn-law-check](https://github.com/mhfed/vn-law-check) (01-personal-data-protection) + tra cứu NĐ 147/2024 về trò chơi điện tử. **Không phải tư vấn pháp lý.** Mục 🔴 cần người làm luật xem lại trước khi công khai. Phạm vi: code đang sửa dở (consent, xoá tài khoản, chính sách) trên nhánh `phat-trien-game-tu-do`.

## Phân loại (triage)

Web game, **mức 2 – thu thập nhẹ**: đăng nhập Google (email/tên/avatar/uid), lưu cloud MongoDB, co-op qua WebSocket. Không bán hàng, không thanh toán, không tracking (không thấy Analytics/Pixel/Sentry), không AI. → Áp dụng checklist **01 (BVDLCN)**; **02/04/05/07 ⚪**; thêm mục **G — trò chơi điện tử (NĐ 147/2024)** ngoài phạm vi vn-law-check.

## Kết quả

| # | Mức | Phát hiện | Vị trí | Căn cứ | Đề xuất |
|---|---|---|---|---|---|
| 1 | 🔴 | Điều khoản ghi "tiếp tục chơi sau khi thay đổi nghĩa là bạn đồng ý" — coi im lặng là đồng ý | `src/ui/PrivacyPolicy.tsx` (Terms, mục "Thay đổi") | Điều 9 khoản 4 điểm d Luật 91/2025 | Đổi thành: thay đổi chính sách → tăng `PRIVACY_VERSION` → hỏi đồng ý lại khi đăng nhập |
| 2 | 🔴 | Một checkbox gộp "Chính sách bảo mật **&** Điều khoản sử dụng" | `src/ui/LoginScreen.tsx` (label `login-consent`) | Checklist B: không gộp đồng ý xử lý dữ liệu vào đồng ý điều khoản dịch vụ (NĐ 356/2025, số điều CHƯA XÁC MINH); Điều 9 Luật 91/2025 (theo từng mục đích) | Tách 2 checkbox: (a) đồng ý xử lý dữ liệu cho `account_cloud`; (b) chấp nhận Điều khoản. Ghi riêng scope |
| 3 | 🔴 | Chính sách nói "**không lưu email/tên/avatar trên máy chủ game**" — sai: server lưu `name` vào `alleys.members[]`, và `name` **rơi về email** khi Google không có tên; tên còn phát qua WebSocket | `server/index.ts:57`, `:263`, `:296`; `docs/CHINH-SACH-BAO-MAT.md` §2.1 | Điều 4 (quyền được biết) Luật 91/2025; minh bạch mục A | Bỏ fallback `d.email` (dùng 'Chủ tiệm'), và sửa §2.1: máy chủ lưu uid + tên hiển thị khi vào hẻm |
| 4 | 🔴 | Chuyển dữ liệu xuyên biên giới (MongoDB nước ngoài, Firebase/Google) **chưa có hồ sơ đánh giá tác động** | toàn hệ thống | Khoản 2 Điều 20 Luật 91/2025 (lập trong 60 ngày từ lần chuyển đầu); Điều 18 NĐ 356/2025 (Mẫu 09, gửi Bộ Công an). **Khoản 3 Điều 38 KHÔNG miễn nghĩa vụ này** cho hộ KD/DN siêu nhỏ | Xác định vùng Mongo thật; xem khoản 6 Điều 20 có miễn không; nếu không, lập hồ sơ. Ghi tên nhà cung cấp + quốc gia vào chính sách |
| 5 | 🔴 | Chưa có kênh liên hệ thật (đang là placeholder) | `docs/CHINH-SACH-BAO-MAT.md` §8; panel trong app không có | Mục A checklist; Điều 5 NĐ 356/2025 (phản hồi 2 ngày làm việc) | Điền email hỗ trợ và hiện trong panel |
| 6 | 🟡 | Chưa có cơ chế độ tuổi / người đại diện cho trẻ em | `LoginScreen.tsx` | Điều 24 Luật 91/2025 (trẻ từ đủ 7 tuổi) | Thêm xác nhận "Tôi từ 16 tuổi trở lên hoặc có đồng ý của cha mẹ" (mốc tuổi cần luật sư xác nhận) |
| 7 | 🟡 | Rút đồng ý chỉ có cách xoá tài khoản; không có "rút đồng ý" riêng | `Hud.tsx` | Điều 10 khoản 2 Luật 91/2025 | Ghi rõ trong chính sách rằng rút đồng ý = xoá dữ liệu cloud, hoặc thêm lựa chọn ngừng đồng bộ cloud |
| 8 | 🟡 | Xoá tài khoản xoá luôn bằng chứng đồng ý; chưa có nhật ký yêu cầu xoá | `server/index.ts` `DELETE /api/save` | Mục B (lưu kiểm chứng được) | Cân nhắc giữ bản ghi tối thiểu (uid băm + thời điểm xoá) làm bằng chứng đã thực hiện quyền |
| 9 | 🟡 | Xoá tài khoản bị ẩn khi đang online (`!online && account`) mà không có hướng dẫn | `Hud.tsx` menu | Mục A (dễ thực hiện quyền) | Hiện mục nhưng nhắc "rời hẻm trước", hoặc tự rời phòng như kế hoạch |
| 10 | 🟡 | Thời hạn trong §5 ghi "~10–15 ngày", "~20–30 ngày" không đúng cấu trúc Điều 5 NĐ 356 | `docs/CHINH-SACH-BAO-MAT.md` §5 | Điều 5 NĐ 356/2025 | Ghi: phản hồi 2 ngày làm việc; xem/sửa 10 ngày; xoá 20 ngày; rút đồng ý 15 ngày; gia hạn 1 lần |
| 11 | 🟡 | Log server ghi uid kèm mọi request, chưa nêu thời hạn lưu log | `server/index.ts:144` | Mục A (thời gian lưu trữ) | Nêu thời hạn lưu log trong chính sách (vd. 30 ngày) và cấu hình xoay vòng |
| 12 | 🟢 | Checkbox không tick sẵn; nút Google khoá tới khi tick; chơi khách không cần đồng ý | `LoginScreen.tsx` | Điều 9 Luật 91/2025 | — |
| 13 | 🟢 | Lưu bằng chứng đồng ý (uid, scope, version, thời điểm, UA) | `server/index.ts` `POST /api/consent` | Mục B | — |
| 14 | 🟢 | Có xoá tài khoản trong app (cloud + hẻm + Firebase) | `Hud.tsx`, `account.ts`, `firebase.ts` | Điều 4 Luật 91/2025 (quyền xoá) | — |
| 15 | 🟢 | Không tracking/quảng cáo bên thứ ba, không mua bán dữ liệu | — | Điều 7, 28 Luật 91/2025 | — |
| 16 | 🟢 | Docs đã dẫn NĐ 356/2025, không còn dẫn NĐ 13/2023 như văn bản hiệu lực | `docs/` | — | — |
| 17 | ⚪/⚠ | DPIA (Điều 21) & nhân sự BVDLCN (khoản 2 Điều 33) | — | Khoản 2–3 Điều 38 Luật 91/2025 | Có thể được miễn/hoãn nếu là hộ KD/DN siêu nhỏ/nhỏ/khởi nghiệp; **cá nhân chưa đăng ký kinh doanh chưa rõ** — hỏi luật sư |

### G. Trò chơi điện tử (NĐ 147/2024/NĐ-CP, hiệu lực 25/12/2024)

| Mức | Phát hiện | Đề xuất |
|---|---|---|
| 🔴 | Có hẻm co-op tương tác nhiều người qua máy chủ → có khả năng là **game G1** (cần Quyết định phê duyệt nội dung); chỉ tổ chức/doanh nghiệp được cấp phép | Trước khi phát hành công khai tại VN: hỏi luật sư về phân loại; phương án tạm: chỉ phát hành bản offline/G4 hoặc giới hạn thử nghiệm kín |
| 🟡 | Giới hạn giờ chơi người dưới 18 tuổi (60 phút/game/ngày, 180 phút tổng) là điều kiện cấp phép | Ghi vào backlog nếu đi đường cấp phép |
| 🟢 | Tiền/hàng ảo không đổi ra tiền thật (Điều khoản đã ghi) | — |

## Đã xử lý (cùng ngày)

- #1: bỏ "tiếp tục dùng = đồng ý" ở panel và `DIEU-KHOAN-SU-DUNG.md`; thay bằng hỏi lại khi đổi phiên bản.
- #2: tách 2 ô tick (`account_cloud`, `terms`), ghi bằng chứng riêng từng scope; nút Google mở khi đủ cả hai (`allConsentsGiven`).
- #3: server không còn lấy email làm tên; chính sách §2.1 và panel nêu đúng việc lưu tên hiển thị ở hẻm.
- #5: thêm `SUPPORT_CONTACT` (email của chủ dự án) hiện trong panel và docs.
- Còn mở: #4 (hồ sơ chuyển dữ liệu xuyên biên giới), G1, các mục 🟡.

## Giới hạn & khuyến nghị

- Rà soát bằng đọc code + checklist; không kiểm tra hạ tầng thật (vùng MongoDB, cấu hình Firebase, server production).
- Nhiều mục của NĐ 356/2025 trong vn-law-check còn "CHƯA XÁC MINH" số điều; NĐ xử phạt 330/2026 chưa đối chiếu.
- Xác minh văn bản còn hiệu lực tại thuvienphapluat.vn / vbpl.moj.gov.vn; tham vấn luật sư cho các mục 🔴, đặc biệt #4 và G1.
