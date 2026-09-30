# Firebase hem-buon

Web dùng apps/web/.env.local và firebase SDK 12.19.0 qua services/firebase.ts, không chèn script CDN vào index.html. AccountBar có login Google popup/logout; game vẫn lưu local, chưa đồng bộ cloud.

Backend đọc `apps/server/.env` bằng ba biến server-only: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` và `FIREBASE_PRIVATE_KEY`. Lấy `client_email`/`private_key` từ JSON service account; trong `.env` giữ private key trong dấu nháy với `\n` dạng literal, runtime sẽ đổi thành xuống dòng thật. Không gửi các biến này hay JSON cho trình duyệt. Vercel không có file đường dẫn Windows: tạo ba Environment Variables cùng tên cho Production (và Preview nếu cần), rồi redeploy. `GOOGLE_APPLICATION_CREDENTIALS` còn là fallback local tạm thời khi chưa có hai biến mới; không dùng cho deployment.

Trong Firebase Console → Authentication → Sign-in method bật Google và chọn email hỗ trợ. Trong Settings → Authorized domains thêm localhost và tên miền triển khai thực. https://firebase.google.com/docs/auth/web/google-signin

Các endpoint có auth gồm GET /api/v1/me, GET/POST /api/v1/worlds, GET /api/v1/worlds/:worldId, POST /api/v1/worlds/:worldId/invites, DELETE invite/member/membership, POST /api/v1/worlds/join và POST /api/v1/worlds/:worldId/reset. Tất cả nhận Authorization: Bearer <Firebase ID token>; backend verify signature/audience/expiry/revoked bằng Admin SDK trước khi đọc world. https://firebase.google.com/docs/auth/admin/verify-id-tokens

WorldRepository hiện lưu world, business và invite trong một Mongo document; invite giữ hash, hết hạn sau 24h, chỉ dùng một lần; chỉ owner mời/revoke/kick/reset, member có thể rời; tối đa hai membership. Đây là persistence của world/membership, chưa phải transaction command/economy/receipt/activity. Kick chưa đẩy session/socket do chưa có realtime transport.

Đăng nhập frontend độc lập với kết nối backend trong bước nền này; chưa kiểm chứng OAuth thật hoặc mạng/browser mobile. Không tuyên bố cloud save khi chỉ login thành công.

Kiểm tra 30/09/2026: HTTP health và thiếu/sai token trên /api/v1/me, /api/v1/worlds trả 401 PASS. Mongo world repository test PASS trên database tạm riêng (ACL, invite, race capacity, leave/kick/reset). Google OAuth thật và emulator chưa verify. Không còn dùng Mongo transaction; chạy được trên Mongo standalone. Web build chưa xác minh đợt này do esbuild Access denied khi resolve config.
