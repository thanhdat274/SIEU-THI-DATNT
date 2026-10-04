# Proposal: Server làm nguồn sự thật duy nhất cho tiệm online

## Vì sao

`THONG-KE.md` mục **I-01** (High) ghi: ở chế độ online, **mỗi client chạy một `GameSimulation` đầy đủ** (bán hàng, tiền, kho, đồng hồ, khách, nhân viên, tự nhập hàng) rồi gửi **cả save** lên qua `commitCommand`; server chỉ phát lại một phần lệnh (38 loại) và kiểm bất biến rộng bằng `save-invariants.ts` ("hướng B": ví dụ tiền được phép tăng tới 20.000 ₫/phút game). Hệ quả đã thấy:

- Server không phải nguồn sự thật: client sửa save hoặc giả doanh thu trong ngưỡng vẫn được ghi; bảng xếp hạng (I-02) dùng doanh thu do client báo.
- Trạng thái nằm ở ba nơi (client sim, `WorldRuntime` trong `WorldGateway`, save trong DB) và lệch nhau; replay lệnh trên save DB cũ làm mất doanh thu/kho client vừa tạo.
- Các hành vi tự động (tự nhập hàng sáng/giữa ngày, tự nhập quầy) chỉ chạy ở client; đợt 04/10/2026 phải thêm lệnh `auto_buy_sync` đi qua kiểm bất biến vì server không thể phát lại chúng.
- Hai client cùng chạy sim nên khách, giờ, thời tiết có thể lệch; đồng bộ dựa vào `commit` toàn save (tới 2 MB).

Chủ dự án chọn **hướng A** (04/10/2026): server là nguồn sự thật duy nhất; client online chỉ gửi ý định và vẽ snapshot.

## Mục tiêu

- Server chạy `GameSimulation` thật cho từng hẻm đang mở (đồng hồ, khách, tiền, kho, nhân viên, tự nhập hàng, quầy ăn uống, thuế) và phát snapshot; client online **không chạy** nghiệp vụ.
- Mọi thay đổi tiền/kho/tiến độ đi qua **lệnh ý định** do server kiểm tra và áp dụng; bỏ đường commit nguyên save của client và `checkSaveInvariants`.
- Chuyển lần lượt các lệnh còn tin save client sang server: `checkout`, `store_status`, `stow*`, `planogram_*`, `auto_restock`, `advance_day`, `change_speed`, `auto_buy_sync`.
- Chơi offline/local **giữ nguyên** simulation cục bộ và save Dexie.
- Giảm dữ liệu gửi lên: ý định vài trăm byte thay cho save hàng trăm KB mỗi thao tác.

## Ngoài phạm vi

- Dự đoán phía client (prediction/rollback) và lag compensation đầy đủ; bản đầu chỉ nội suy theo snapshot.
- Mở rộng nhiều process/worker, sharding world; vẫn một runtime active cho mỗi world trên một process.
- Đổi nhà cung cấp hạ tầng (NestJS, MongoDB, Firebase Auth giữ nguyên).
- Chuyển save offline lên online, chống gian lận ở chế độ offline, thay đổi gameplay hoặc cân bằng.
- Chi nhánh (`branch-chain`) và tiệm xôi chỉ giữ hành vi hiện có, không thêm tính năng mới.

## Capabilities

### New Capabilities

- `authoritative-simulation`: server chạy simulation đầy đủ cho từng hẻm, là nơi duy nhất đổi tiền/kho/giờ; checkpoint và pause/resume giữ nguyên.
- `intent-commands`: client gửi ý định có `commandId`/`expectedRevision`; server kiểm quyền và điều kiện, áp dụng, trả receipt; không nhận save từ client.
- `online-client-rendering`: client online vẽ từ snapshot (nội suy), không chạy `GameSimulation.update`, khóa thao tác khi mất kết nối.

### Modified Capabilities

- `shared-alley-multiplayer` (`authoritative-coop`, `world-persistence`): thay yêu cầu "client commit save + server kiểm bất biến" bằng "server áp dụng lệnh". Chưa có main spec hiện hành; delta tham chiếu change `shared-alley-multiplayer`.

## Impact

- `packages/game-core/src/world-runtime.ts`, `simulation.ts`: server-side headless đầy đủ; tách phần cần UI/Pixi.
- `packages/shared/src/index.ts`: bộ lệnh ý định (kế thừa `GameCommand`), snapshot có tiền/kho/khách, receipt; bỏ `updatedBusiness.save` khỏi request commit online.
- `apps/server`: `bootstrap.ts` (commit → áp dụng lệnh), `world.gateway.ts` (WS nhận lệnh, snapshot), `save-invariants.ts` (xóa ở giai đoạn 3), `world.repository.ts` (checkpoint).
- `apps/web/src/App.tsx`, `services/api.ts`, `packages/game-renderer`: nhánh online chỉ vẽ snapshot và gửi ý định; local giữ nguyên.
- Tài liệu: `THONG-KE.md` I-01/I-02, `tổng hợp.md`, `docs/multiplayer`, `TASKS.md`, `ROADMAP.md`.

## Rủi ro chính

- CPU/RAM server tăng theo số hẻm đang mở (mỗi hẻm một sim 4 Hz cùng khách/nhân viên); cần đo trước khi cam kết giới hạn.
- Độ trễ mạng làm thao tác (bày hàng, thanh toán) kém mượt nếu không có dự đoán phía client.
- Khối lượng chuyển lệnh lớn; `checkout`, `auto_restock`, `advance_day` gắn với trạng thái tạm (khách đang đứng quầy, nhân viên đang đi) và chưa có đường replay.
- Viết lại luồng online trong `App.tsx` (hiện dùng `exportSaveData` + `commitBusinessChange` ở hơn 20 chỗ).

## Tiêu chí hoàn tất

- Không còn đường nào ở online cho client ghi save/tiền/kho; `checkSaveInvariants` bị xóa; test chứng minh payload save giả bị từ chối ngay từ cổng.
- Hai client thật (hai tài khoản) thấy cùng tiền/kho/giờ/khách trong sai số snapshot; mất mạng rồi nối lại khôi phục đúng revision.
- Tự nhập hàng sáng, giữa ngày và tự nhập quầy chạy ở server, ghi báo cáo và sổ cái, không cần `auto_buy_sync`.
- Offline giữ nguyên: `yarn test` và regression local PASS; kết quả đo CPU/RAM/băng thông ghi vào `tổng hợp.md`.
- `yarn typecheck`, `yarn test`, test co-op/gateway PASS bằng kết quả thực tế; browser QA hai client ghi riêng.
