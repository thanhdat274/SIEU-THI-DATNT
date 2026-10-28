# 🏪 Tạp Hóa 3D

Game quản lý **cửa hàng tạp hóa 3D**: chạy một tiệm tạp hóa, phục vụ khách vãng lai và khách quen, thuê nhân viên, mở rộng chi nhánh, ký hợp đồng, lập nghiệp đoàn (co-op)… Được xây dựng bằng **React + Three.js** và chạy trên web (mobile-first, có PWA).

> 📚 Tài liệu tham khảo: [`NGHIEN-CUU-TAP-HOA-2026-10-24.md`](NGHIEN-CUU-TAP-HOA-2026-10-24.md) là bản đồ hiện trạng chuẩn nhất của game. Các file `ANALYSIS_AND_FEATURES.md`, `PHAN-TICH-VA-DE-XUAT.md`, `PHAN-TICH-THAM-KHAO-HAPPYTOWN.md` là tài liệu lịch sử (số liệu đã cũ).

## ✨ Tính năng chính

- **Thế giới 3D** bằng Three.js: shop 3D, khách đi lại, cây trồng, quán nước, chi nhánh.
- **Kinh tế sâu**: đơn hàng, hợp đồng cung ứng, huy động vốn, đối tác chi nhánh, chuỗi sản xuất (trồng → nấu → quán nước), lễ hội theo mùa, tiện lợi 24/7.
- **Nhân viên & nghề nghiệp**: tuyển dụng, xếp ca, huấn luyện, 10 vai nhân viên, 35 nghề khách vãng lai, 33 archetype.
- **Meta-progression dài hạn**: hồ sơ tiệm, huy hiệu thâm niên, huy hiệu hợp đồng, nền móng vững chắc.
- **Online / co-op**: hẻm online qua WebSocket, lập nghiệp đoàn, chống gian lận kinh tế (co-op guard).
- **Lưu trữ**: IndexedDB (Dexie) cục bộ + cloud MongoDB + đăng nhập Firebase.
- **Kiểm thử**: hơn 1000 unit test với vitest.

## 🚀 Bắt đầu

Yêu cầu: Node.js (18+), npm hoặc yarn.

```bash
# cài phụ thuộc
npm install

# chạy chế độ phát triển
npm run dev            # mở http://localhost:5173

# chạy test
npm test

# build trang game tĩnh (ra thư mục dist/)
npm run build
```

## 🗂 Cấu trúc thư mục

```
src/
  main.tsx        # điểm khởi động
  world/          # thế giới & render 3D (Three.js)
  render/         # vẽ / hiệu ứng
  core/           # logic kinh tế cốt lõi (ngày, đơn hàng, chuỗi...)
  data/           # dữ liệu thuần (hàng hóa, nghề, helper đọc...)
  shop/           # logic cửa hàng / quầy
  agents/         # hành vi khách & nhân viên
  ui/             # giao diện (HUD, các panel)
  net/            # mạng: WebSocket
  __tests__/      # unit tests (vitest)
server/
  index.ts        # server lưu cloud + hẻm online (WebSocket)
  room.ts         # quản lý phòng hẻm online
dev/              # công cụ phát triển
scripts/          # script phụ trợ
```

## 🌐 Triển khai

Xem đầy đủ tại [`DEPLOY.md`](DEPLOY.md). Tóm tắt:

- Game gồm 2 phần: **trang game tĩnh** (`dist/`) và **server WebSocket lâu dài** (`server/index.ts`).
- ⚠️ **Vercel không chạy được server** (chỉ serverless, không giữ WebSocket). Trang game để được trên Vercel, còn server phải đặt ở Render / Railway / Fly.io (chọn vùng Singapore cho gần Việt Nam).
- Hoặc tự host cả hai trên máy tính: `npx tsx server/index.ts` rồi dùng Cloudflare Tunnel để chia sẻ với bạn bè.
- Biến môi trường: client dùng `VITE_SERVER_URL`, server dùng các biến trong `server/.env` (`MONGO_URI`, `FIREBASE_…`, `CORS_ORIGIN`). Không bao giờ bật `DEV_AUTH_BYPASS` trên server thật.

## 🧪 Kiểm thử

```bash
npm test          # chạy toàn bộ unit test
```

Bộ test bao phủ logic kinh tế, chuỗi sản xuất, hợp đồng, co-op, cân bằng, chống gian lận… Mỗi tính năng lớn đều có test riêng (ví dụ `hiepLuc.test.ts`, `festivalPrep.test.ts`, `dossier.test.ts`...).

## 📈 Nhật ký phát triển

Xem [`PROGRESS.md`](PROGRESS.md) — ghi chép từng đợt (GĐ) cập nhật tính năng theo thời gian.
