# Triển khai Tạp Hóa 3D

Game gồm 2 phần:
- **Trang game** (`npm run build` ra thư mục `dist/`): file tĩnh, đặt ở đâu cũng được.
- **Server** (`server/index.ts`): lưu cloud + hẻm online qua **WebSocket**, phải chạy liên tục.

> ⚠️ **Vercel không chạy được server**: Vercel chỉ có hàm serverless, không giữ kết nối WebSocket.
> Trang game để trên Vercel được, còn server phải đặt ở chỗ khác.

## Cách 1: Trang game trên Vercel, server trên Render / Railway / Fly.io

1. Đưa server lên một dịch vụ chạy Node lâu dài (Render, Railway, Fly.io…). **Chọn vùng Singapore**
   cho gần Việt Nam (độ trễ khoảng 30–50 ms).
   - Lệnh chạy: `npx tsx server/index.ts`
   - Biến môi trường: các biến trong `server/.env` (MONGO_URI, FIREBASE_…), thêm
     `CORS_ORIGIN=https://ten-game.vercel.app`. **Không** đặt `DEV_AUTH_BYPASS`.
2. Trên Vercel, thêm biến `VITE_SERVER_URL=https://ten-server.onrender.com` rồi build lại.
3. Firebase Console → Authentication → Authorized domains: thêm tên miền Vercel.

Lưu ý: gói miễn phí của Render tự ngủ khi không ai dùng, lần vào đầu phải chờ khoảng 30–60 giây.

## Cách 2: Tự host trên máy tính của bạn (cả trang game lẫn server)

1. `npm run build` → server tự phục vụ luôn trang game, một cổng (3002) là đủ.
2. `npx tsx server/index.ts` (đừng chạy `npm run dev`, đó là chế độ phát triển).
3. Cho người ngoài mạng vào bằng **Cloudflare Tunnel** (miễn phí, hỗ trợ WebSocket, không cần mở port modem):
   `cloudflared tunnel --url http://localhost:3002` → nhận địa chỉ `https://….trycloudflare.com` gửi bạn bè.
4. Firebase Console → Authorized domains: thêm tên miền của tunnel.

Máy tắt, ngủ hoặc mất mạng thì không ai chơi được. Hợp để chơi với bạn bè, không hợp để mở công khai.

## Thử hẻm online không cần Google (chỉ máy dev)

`server/.env` có `DEV_AUTH_BYPASS=true`, rồi mở `http://localhost:5173/?dev=a` và `?dev=b` ở hai tab.
Không bao giờ bật biến này trên server thật.
