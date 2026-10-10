# Test voice chat 2 người trên localhost (mic chơi chung)

Hướng dẫn này giúp bạn **nghiệm thu thật chế độ mic (voice chat)** giữa hai người chơi
trong cùng một hẻm online, ngay trên máy local — mà **không cần đăng nhập Google/Firebase**.

## Tóm tắt hiện trạng tính năng voice

Phần **code voice đã hoàn chỉnh trong repo** (không thiếu tính năng):

- `apps/web/src/hooks/useVoiceChat.ts` — voice P2P WebRTC (chỉ audio), bật/tắt mic, tắt tiếng bạn, chỉ báo đang nói, báo lỗi rõ lý do, xử lý ICE/TURN.
- `apps/web/src/components/VoicePanel.tsx` — bảng điều khiển mic (hiện khi đang ở hẻm chung).
- `apps/server/src/world.gateway.ts` — chuyển tiếp tín hiệu offer/answer/candidate qua WebSocket (`voice:signal`/`voice:peer`); server không lưu âm thanh.

Cái **thiếu để "nói được với nhau"** là môi trường chạy thật, không phải code:

| Yếu tố | Yêu cầu | Trạng thái |
|---|---|---|
| 2 client vào cùng hẻm | 2 tài khoản ổn định khác nhau | ✅ Nay có **khách dev ổn định** (bản vá này) |
| Mic hoạt động | HTTPS **hoặc localhost** | ✅ localhost được miễn, không cần HTTPS |
| Nối được P2P | STUN hoặc TURN | ⚠️ **Cùng máy/mạng LAN: STUN thường đủ**; qua NAT đối xứng/mạng di động cần **TURN** |

## Cơ chế "khách dev ổn định" (mới)

- Server chạy với `GOOGLE_AUTH_BYPASS=true` thì thay vì tài khoản random mỗi request,
  nó đọc header `X-Dev-Client-Id` và gán tài khoản **ổn định `guest_<id>`**.
- Trên web (chỉ khi `yarn dev` = Vite dev mode), màn Login hiện thêm thẻ
  **"Hẻm Chơi Cùng (Khách dev)"** với bộ chọn khách **A/B/C**. Mỗi trình duyệt chọn một khách
  khác nhau là thành **hai tài khoản khác nhau**, có thể vào chung một hẻm.
- **An toàn:** chỉ hoạt động khi `GOOGLE_AUTH_BYPASS=true` (server) **và** `import.meta.env.DEV`
  (client). Build production không bật. `GOOGLE_AUTH_BYPASS` không bao giờ đặt ở production
  (đã ghi rõ trong `docs/deploy.md` và `.env.example`).

Các file thay đổi: `apps/server/src/auth.guard.ts`, `apps/web/src/services/dev-guest.ts`,
`apps/web/src/services/api.ts`, `apps/web/src/hooks/useWorldSocket.ts`, `apps/web/src/App.tsx`,
`apps/web/src/components/LoginScreen.tsx` (+ CSS), `apps/server/.env.example`.

## Bước 1 — Chạy server (chế độ bypass, cần MongoDB)

Server vẫn cần **MongoDB** (không cần Firebase khi bypass). Mở terminal:

```bash
# (đã có MongoDB chạy local, ví dụ mongod trên cổng 27017)
copy apps/server/.env.example apps/server/.env
# sửa apps/server/.env: đặt MONGO_URI=mongodb://127.0.0.1:27017
#                          GOOGLE_AUTH_BYPASS=true
yarn --cwd apps/server dev         # hoặc: GOOGLE_AUTH_BYPASS=true yarn dev:server từ root
```

Server nghe tại `http://127.0.0.1:3001` (WS ở `/ws`). Có `goto` đúng: vào hẻm sẽ thấy log `[WS] ... joined world`.

> PowerShell `$env:GOOGLE_AUTH_BYPASS="true"` cũng được nếu bạn thích biến shell hơn `.env`.

## Bước 2 — Chạy web (Vite dev)

```bash
yarn --cwd apps/web dev
```

Mở `http://localhost:5173`. **Không cần** `VITE_FIREBASE_*` — khách dev không dùng Google.

## Bước 3 — Mở 2 client và vào cùng hẻm

Bạn cần **2 cửa sổ/trình duyệt với localStorage riêng**, để chúng là 2 khách khác nhau:

- **Client 1:** mở `http://localhost:5173` (bình thường).
- **Client 2:** mở cửa sổ **Ẩn danh/InPrivate** (hoặc trình duyệt/profile khác) với cùng URL
  — vì hai thẻ cùng trình duyệt dùng chung localStorage, bạn phải dùng cửa sổ riêng.

Trên mỗi cửa sổ:

1. Cuộn xuống thẻ **"Hẻm Chơi Cùng (Khách dev)"**.
2. Chọn khách: **Client 1 → Khách A**, **Client 2 → Khách B**.
3. Bấm **"Vào Hẻm Chơi Cùng (khách A)"** (tương ứng).
4. Trong hộp Hẻm Chơi Cùng:
   - **Client 1:** tạo hẻm mới (đặt tên) → được mã mời → copy.
   - **Client 2:** dán mã mời vào ô "Tham gia bằng mã" → tham gia.

Giờ cả hai cùng vào một hẻm → **bảng mic (VoicePanel) xuất hiện**.

## Bước 4 — Thử voice

- **Client 1:** bấm 🎤 bật mic, nói. Trạng thái chuyển `Chờ… → Đang kết nối → Voice đã kết nối`,
  và khi nói thì ô mic sáng `.is-speaking`.
- **Client 2:** nghe. Nếu bị chặn autoplay, bấm **"Bấm để nghe"**.
- Nếu 2 máy khác nhau cùng LAN: cả hai bật mic, nói chuyện qua lại.

> **Lưu ý mic dùng chung:** trên **cùng một máy**, Windows thường chỉ cho một ứng dụng chiếm mic
> tại một thời điểm. Muốn **cả hai cùng nói** thì dùng 2 máy khác nhau (hoặc máy + điện thoại)
> trên cùng mạng. Trên một máy, bạn chỉ kiểm chứng được: kết nối WebRTC thành công + một bên mic.

## Chẩn đoán khi chưa nối được

- **"Không kết nối được voice: chưa cấu hình TURN relay..."** → đúng với cặp nối qua NAT đối xứng/
  mạng di động. Trên cùng LAN/localhost thường không gặp. Muốn chạy qua mạng ngoài, cần TURN
  (xem `docs/deploy.md` mục Voice chat).
- **"Trình duyệt/webview không hỗ trợ WebRTC"** → mở bằng trình duyệt hiện đại (Chrome/Firefox/Edge),
  không mở trong webview hẹp của app khác.
- **Mic không hỏi quyền** → chắc chắn đang mở qua `http://localhost` (hoặc HTTPS); không phải qua IP trần (http://192.168.x.x bị chặn mic).
- **Hai thẻ cùng một localStorage cùng id** → họ là cùng một "khách"; dùng cửa sổ Ẩn danh hoặc clone profile để chọn khách khác.

## Sau khi nghiệm thu voice thành công

- Voice dùng STUN (P2P trực tiếp) là đủ cho mạng LAN; để **nói chuyện được qua mạng thật
  (2 máy khác mạng / di động)** bắt buộc thêm **TURN** và triển khai **HTTPS** — xem
  `docs/deploy.md → Voice chat`. Code sẵn sàng nhận `VITE_ICE_SERVERS` khi build, không cần sửa code.
