# Triển khai và vận hành

> Viết 03/10/2026 từ mã nguồn (I-17). **Chưa kiểm chứng bằng một lần deploy thật.** Chỉ liệt kê tên biến, không ghi giá trị bí mật.

## Thành phần

| Thành phần | Công nghệ | Lệnh |
|---|---|---|
| Web (tĩnh) | React + Vite + PWA (`apps/web/public/sw.js`, `manifest.webmanifest`) | `yarn --cwd apps/web build` → `apps/web/dist/` |
| Server | NestJS (Express + WebSocket `/ws`), chạy bằng `tsx` | `yarn --cwd apps/server start` |
| CSDL | MongoDB đơn (local hoặc Atlas), **không cần** replica set/transaction | — |
| Đăng nhập | Firebase Auth (Google) | — |

Node >= 22, Yarn 1 (`yarn install --frozen-lockfile`).

`yarn build` ở root chạy `tsc` cho server rồi `vite build` cho web. Lệnh chạy server hiện tại là `tsx src/bootstrap.ts` (chưa có bước chạy từ `dist/`).

## Biến môi trường

### Server (`apps/server/.env`, mẫu ở `.env.example`; biến trong shell ưu tiên hơn file)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `MONGO_URI` (hoặc `MONGODB_URI`) | Có | Chuỗi kết nối MongoDB. Thiếu thì API trả 503. |
| `MONGODB_DATABASE` | Không | Tên DB. Mặc định lấy từ đường dẫn URI, rồi `sieu_thi_datnt_dev`. **Production nên đặt tên riêng.** |
| `FIREBASE_PROJECT_ID` | Có | Project Firebase dùng để xác minh token. |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Có (hoặc dùng Application Default Credentials) | Lấy từ service account. Phải đặt cả hai. Trong `.env` đặt trong dấu nháy, giữ nguyên `\n`. |
| `HOST` | Không | Mặc định `127.0.0.1` (chỉ máy chủ nghe). Sau reverse proxy giữ nguyên; muốn mở ra ngoài đặt `0.0.0.0`. |
| `PORT` | Không | Mặc định `3001`. |
| `WEB_ORIGIN` | Có ở production | Origin được CORS cho phép (mặc định `http://localhost:5173`). Phải khớp domain web. |
| `GOOGLE_AUTH_BYPASS` | **Không bao giờ đặt ở production** | `true` bỏ qua xác minh Firebase và cấp tài khoản khách. Chỉ để thử cục bộ. Khi bật, server đọc header `X-Dev-Client-Id` để cấp tài khoản khách **ổn định** `guest_<id>` (phục vụ test 2 người trên localhost); không gửi header thì rơi về khách random mỗi request. |

### Web (build time, `apps/web/.env.local` hoặc biến CI)

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (ba biến `API_KEY`, `PROJECT_ID`, `APP_ID` là bắt buộc để bật đăng nhập), và `VITE_API_URL` (URL server; mặc định `http://127.0.0.1:3001`, **phải đặt khi build cho production**). Các biến `VITE_*` nằm trong bundle công khai nên không đặt bí mật vào đó.

`VITE_ICE_SERVERS` (không bắt buộc): JSON mảng `RTCIceServer` dùng cho voice chat WebRTC. Mặc định chỉ có STUN công cộng. **Để voice hoạt động ổn định giữa hai máy thật (qua NAT/firewall) bắt buộc thêm TURN relay.** Ví dụ:

```json
[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com:3478","username":"user","credential":"pass"}]
```

Sai định dạng hoặc rỗng thì rơi về STUN mặc định. `credential`/`username` của TURN nằm trong bundle công khai; nếu không muốn lộ tài khoản, hãy dùng cặp tạm thời (short-lived) hoặc chấp nhận rủi ro cho TURN tự host với phạm vi hẹp.

## Voice chat (mic giữa hai người chơi chung hẻm)

- **Bắt buộc HTTPS** để trình duyệt cho phép dùng mic (`getUserMedia`). localhost được miễn; deploy phải qua HTTPS.
- **Bắt buộc cấu hình TURN** để phần lớn cặp người chơi thật nối được: chỉ STUN (P2P trực tiếp) sẽ fail với nhiều cặp sau NAT đối xứng/mạng di động → hiện "không kết nối được voice".
- Cách triển khai TURN: chạy [coturn](https://github.com/coturn/coturn) (hoặc TURN dịch vụ như Cloudflare Calls / Metered / Twilio TURN), mở cổng UDP/TCP (3478 + dải relay) gửi tới Internet, rồi set `VITE_ICE_SERVERS` ở bước build web như trên.
- Âm thanh đi **trực tiếp P2P giữa hai trình duyệt**, server chỉ chuyển tiếp tín hiệu offer/answer/candidate qua WS — không lưu âm thanh. Server không cần config đặc biệt cho voice ngoài việc WS đã bật ở `/ws` (xem mục Mạng).
- **Nghiệm thu 2 người trên localhost (không cần Firebase):** chạy server với `GOOGLE_AUTH_BYPASS=true` + web bằng `yarn --cwd apps/web dev`, rồi mở 2 cửa sổ trình duyệt (một cái Ẩn danh) và dùng thẻ **"Hẻm Chơi Cùng (Khách dev)"** — chọn Khách A / Khách B. Hướng dẫn từng bước: **`docs/voice-test-2client.md`**.

## Kiểm tra sau khi chạy

- `GET /health` → `{ status: 'ok' }` (tiến trình sống).
- `GET /ready` → ping MongoDB (`database: 'connected'`); dùng làm readiness probe.
- `yarn verify:runtime` (ở root) kiểm tra cấu hình runtime.
- Khi khởi động server tự chạy `migrateWorldSaves` (`world-migrations.ts`) trên collection `game_worlds` và in `[migrate] nâng cấp N/M phòng` nếu có thay đổi. **Sao lưu trước khi nâng phiên bản có đổi schema.**

## Dữ liệu và sao lưu

- Collection: `game_worlds` (phòng co-op, save, biên nhận lệnh, nhật ký hoạt động), `cloud_saves` (một bản save đám mây mỗi tài khoản).
- Sao lưu bằng `mongodump --uri=$MONGO_URI` (hoặc snapshot của Atlas). Chưa có lịch sao lưu tự động trong repo; việc này thuộc hạ tầng.
- Save cục bộ nằm ở IndexedDB trình duyệt người chơi (3 ô); không qua server.

## Mạng

- WebSocket ở đường dẫn `/ws`. Reverse proxy phải chuyển tiếp header `Upgrade`/`Connection` và đặt timeout không ngắn hơn heartbeat (15 s).
- Giới hạn tần suất (HTTP, commit lệnh, WS) và thân JSON 2 MB nằm trong ứng dụng (`rate-limit.ts`). Bộ giới hạn theo bộ nhớ tiến trình, nên **chạy một instance** (hoặc chấp nhận giới hạn theo từng instance). Chưa cấu hình `trust proxy`, nên IP thấy được có thể là IP của proxy.
- Session co-op nằm trong bộ nhớ một tiến trình (gateway), chưa hỗ trợ nhiều instance.

## Giám sát

Chưa có logging/monitoring có cấu trúc: server ghi `console`. Lỗi kết nối Mongo được che chuỗi URI trước khi in. Nên gom log của tiến trình và cảnh báo trên `/ready`.

## CI

`.github/workflows/ci.yml`: job "Typecheck, lint, test, build" (`yarn test:all`) và job "Server tests (MongoDB)" (service `mongo:7`, `MONGO_URI=mongodb://localhost:27017/ci_tests`). Không có bước deploy tự động.

## Còn thiếu

Dockerfile/manifest hạ tầng, chạy server từ `dist/`, `trust proxy`, nhiều instance (bộ giới hạn và session dùng chung), logging/metrics, lịch sao lưu, đo S38/S39 trên môi trường thật.
