# ADR 001 — Nền runtime co-op

Ngày: 30/09/2026. Phạm vi task 1.1; chưa phải multiplayer hoặc login Google hoàn chỉnh.

## Quyết định

Cập nhật 01/10/2026: Node >=22 (kiểm tra bằng 24.21.0), NestJS 12.1.2, Firebase Admin 14.5.0, MongoDB driver 7.7.0, dotenv 18. (Quyết định gốc 30/09: Node 20.19, Nest 11.2.6, Admin 13.10.0, driver 6.21.0, dotenv 16.6.1.) Pin dependency bằng package.json/yarn.lock. Nest 12 là ESM-only; server giữ CommonJS (tsx) và dùng require(esm) của Node 22+, tsconfig `module: node20`. Protocol version 1; core command/snapshot và avatar contracts đã có, nhưng server transport chưa kết nối.

Theo chỉ đạo chủ dự án: chưa dùng Docker, kết nối cluster MongoDB chung nhưng database game riêng sieu_thi_datnt_dev. MONGO_URI đọc từ apps/server/.env; biến shell ưu tiên. Multi-collection transaction cần replica set: https://www.mongodb.com/docs/manual/core/transactions/ . Không fallback bỏ transaction nếu topology không hỗ trợ.

Giữ Firebase Auth cho Google theo thiết kế; server xác minh Firebase ID token. Token Google trực tiếp của QUANLYCHITIEU không thay thế Firebase token. Đã có Firebase guard cho HTTP routes, Google popup UI phía web, nhưng OAuth session thật chưa kiểm chứng.

## Reference đã đọc

- QUANLYCHITIEU/BE/src/config/db.js: cache promise/pool, timeout, retry sau lỗi và MONGO_URI; áp dụng ý tưởng trong database.ts, không copy backfill hoặc dữ liệu.
- QUANLYCHITIEU/BE/src/controllers/authController.js: verify token ở server, không tin profile client.
- GAME/tap-hoa-dau-hem/src/services/auth.ts và firebase.ts: GoogleAuthProvider, popup/redirect, giữ local khi auth lỗi. Reference này dùng Firestore để save, không phải MongoDB.

## Chạy local không Docker

1. yarn install tại root.
2. Copy apps/server/.env.example thành apps/server/.env; điền URI cluster và database game riêng. Không đưa secrets vào Git.
3. yarn dev:server: HTTP trên 127.0.0.1:3001; /health là liveness, /ready ping MongoDB và trả 503 nếu cấu hình/kết nối lỗi. CORS lấy WEB_ORIGIN. Không trả URI hoặc token.
4. yarn verify:runtime: mở HTTP port ngẫu nhiên, check health và token thiếu/sai, rồi commit hai collection/rollback trên database dev; hiện lệnh fail transaction đúng nếu cluster standalone.
5. yarn --cwd apps/server test:worlds: tạo database tạm có tên random trong cùng cluster, test quyền/invite/race, rồi drop riêng database tạm.

Firebase CLI/emulator chưa cài. Lần thử Firebase Tools 14.27.0 gặp dependency universal-analytics yêu cầu Node >=22; đã bỏ CLI thay vì ignore-engines hoặc đổi Node máy người dùng. Integration Firebase Emulator chưa chạy; HTTP guard có test token thiếu/sai.

## Bằng chứng

yarn typecheck, core test runner PASS. Server HTTP health và token thiếu/sai trên /api/v1/me, /api/v1/worlds trả đúng PASS. Mongo kết nối được bằng cấu hình user cấp trong apps/server/.env, database riêng `sieu_thi_datnt_dev`; world repository integration PASS trên database tạm: ACL, create/list, invite 24h một lần, revoke, join cạnh tranh/capacity=2, leave/kick/reset. Transaction probe FAIL với MongoServerError code 20 do topology standalone; không bỏ yêu cầu atomic cross-collection. Web production build bị esbuild `Access is denied` khi resolve vite.config.ts từ đường dẫn C:\Users\Admin dưới runtime hiện tại, nên build sau thay đổi này chưa xác minh. Chưa verify OAuth thật, emulator, WebSocket hoặc kick session live. Task 1.1 và 3.1/3.2 vẫn mở một phần.

## Data contract — tasks 1.2/1.3

`packages/shared/src/index.ts` định nghĩa account, world membership, avatar, business, command và snapshot với protocol version 1; runtime type guards kiểm schemaVersion, role, ngày giờ, revision, tiền/XP không âm, command payload, avatar phải là thành viên và snapshot business IDs phải khớp world IDs. `packages/game-data/src/online-world.ts` tạo seed online từ save mặc định với ID/revision riêng, không nhận hay sửa save local. Test tại `packages/shared/src/multiplayer.test.ts` được gọi từ runner core; đã chạy `yarn typecheck` và `yarn test`, cả hai PASS. Đây là model/seed, chưa persistence MongoDB hoặc endpoint create world.

Task 2.1: `GameSimulation` nhận `GameInputSource` interface thay concrete browser manager; `FixedStepSimulationRunner` sở hữu accumulator/giới hạn step và renderer chỉ gọi runner. Headless test dùng input giả và simulation thật trong Node (không window/document); yarn typecheck/test/build PASS. Đường local UI giữ InputManager/commands/callback cũ; chưa thêm online input/session adapter.

Task 2.2: `WorldAvatarController` giữ map avatar/sequence theo account, nhận thời gian nhận ở server, từ chối account lạ, sequence lặp, vector không hữu hạn/quá chuẩn hóa và input quá cũ; giới hạn delta và áp CollisionSystem trước khi lưu. Có kiểm tra range tương tác với fixture. Test avatar độc lập, cap tốc độ, sequence lặp, spoof account/vector và stale input; yarn typecheck/test/build PASS. Chưa có WebSocket nên controller hiện chưa được gọi bởi session thật.

Task 2.3: NPC mới có checkoutId/reservedProductId và ID sequence lưu trong save; món cuối không thể bị cất khỏi kệ khi đã giữ. `completeCustomerCheckout` chỉ xử lý đúng khách ở trạng thái checkout và kệ/mặt hàng khớp; receipt IDs được lưu qua reload, retry trả thành công mà không cộng tiền lần hai. Luồng NPC tự thanh toán chuyển qua cùng API; legacy customer được gán ID khi hydrate. Test sai checkout ID, giữ hàng, checkout, duplicate/reload; yarn typecheck/test/build PASS. Đây vẫn là logic core; chưa có server serialization hoặc transport đồng thời thật.

Task 2.4: `GameCommandCoordinator` tuần tự hóa submit theo world, kiểm protocol/payload ở runtime, member, world/business scope, expectedRevision và receipt theo actor/commandId; ID/payload trùng trả receipt, cùng ID payload khác bị chặn. Hai command cạnh tranh cùng revision cho đúng một kết quả accepted. `yarn typecheck`, `yarn test`, `yarn build` PASS. Đây chỉ là coordinator trong process, receipts chưa bền qua server restart và chưa có DB transaction; task 3.3 vẫn cần transaction topology phù hợp.

Tasks 3.1/3.2/3.3/3.4/3.5/3.6 có các phần code nền trong HTTP, Mongo repository và core runtime, chưa đủ bằng chứng hoàn tất end-to-end. Patch 30/09/2026 đổi WS authentication: client POST `/api/v1/ws-ticket` với Firebase ID token trong Authorization header; server cấp ticket UUID TTL 30s lưu collection `websocket_tickets`; client gửi ticket trong `Sec-WebSocket-Protocol`, và gateway consume một lần. Firebase token không còn nằm trong URL. Gateway giới hạn origin theo `WEB_ORIGIN`, heartbeat client 10s / server timeout 15s, tick 250ms, broadcast full snapshot mỗi 500ms, checkpoint 5s, và `kickMemberSession()` đóng socket. `useWorldSocket` nhận snapshot/join/update.

Giới hạn hiện tại: ticket cần DB sẵn sàng và chưa có cleanup TTL index (ticket chỉ bị bỏ qua sau expiresAt); ticket route/gateway chưa có automated integration test; avatar input và time vote chưa được nhận qua WS; gateway hiện không restore runtime đầy đủ từ checkpoint sau restart; checkpoint callback async chưa serialize với command; repository command hiện dùng conditional document update cùng một document, chưa có chứng cứ multi-document transaction. Core timeout/vote tests không thay thế server integration/two-browser. Mongo transaction probe trước đó trả code 20 trên standalone.

Kết quả 30/09/2026 sau tiếp tục triển khai: `yarn typecheck`, `yarn test`, `yarn build` PASS; bundle chính 736.6 kB cảnh báo. Gateway integration hai session và Mongo transaction repository tests PASS trên replica set đơn nút tạm port 27018; instance/data tạm đã dọn, không thay đổi service Mongo local (vẫn standalone). Browser smoke local vào game PASS; OAuth và full UI two-account flow chưa test. `yarn verify:runtime` trước đó PASS health/auth + transaction trên replica set tạm.


## Bằng chứng cập nhật 30/09/2026

	est:gateway PASS ticket TTL/one-use/origin, two-session snapshots/movement spoof protection, shared time vote, session replacement. 	est:worlds PASS ACL/invite/revision/idempotency/transaction/checkpoint guard/ticket plus runtime rehydrate. yarn typecheck, yarn test, yarn build PASS. Local UI smoke loaded existing save. Còn: persistent local replica set config, Firebase-positive route/OAuth, process crash/restart, RTT/drop-ACK/DB outage, full browser flow desktop/mobile, real device.

## Cập nhật 30/09/2026: bỏ transaction
Game chỉ có một hẻm = một document (world + business + receipts + activities), không có giao dịch giữa các người chơi. Một `updateOne` có filter `world.revision` + receipt chưa tồn tại là nguyên tử, nên **không cần replica set/transaction**; một MongoDB đơn là đủ. Các đoạn trên yêu cầu replica set/transaction không còn hiệu lực.
