# Design: Server làm nguồn sự thật duy nhất

## Hiện trạng đã kiểm tra (04/10/2026, đọc mã)

- `apps/server/src/world.gateway.ts`: vòng tick chung 250 ms (4 Hz) gọi `WorldRuntime.tick` cho mọi runtime đang mở; snapshot phát mỗi 500 ms (`world:snapshot`), `world:update` sau mỗi commit. `WorldRuntime` đã giữ một `GameSimulation` headless (`runner.advance`), pause khi không còn session, checkpoint định kỳ.
- `WorldRuntime.executeCommand` (`world-runtime.ts` ~190-250) đã áp dụng được nhiều lệnh (`restock`, `unstock`, `set_price`, `order_supplier`, `buy_stall`, `set_auto_buy_stalls`, bố cục, nhân viên, chi nhánh, `set_tax_declaration`...) trên simulation của server.
- `apps/server/src/bootstrap.ts` `commitCommand`: nhận `updatedBusiness.save` do client gửi. `serverReplayedCommands` (~38 loại) được replay trên save DB rồi **ghi đè** save client bằng bản chuẩn; lệnh còn lại đi nhánh `else` kiểm `sameLayout` + `checkSaveInvariants` rồi lưu save client (`ALLOWED_COMMAND_TYPES` chặn loại lạ). Mỗi lần replay dựng `new WorldRuntime(world, business)` từ save DB, tách biệt với runtime đang chạy trong gateway.
- `apps/web/src/App.tsx`: client online dựng `GameSimulation` từ `onlineWorld.businesses[0].save`, chạy sim đầy đủ ở Pixi ticker, và gọi `commitBusinessChange` (`exportSaveData` + `commitOnlineCommand`) ở hơn 20 chỗ. `handleSaveGame` ở online chỉ toast, không lưu Dexie.
- Lệnh client gửi mà `WorldRuntime` không hiểu hoặc lệch payload: `order` (runtime là `order_supplier`), `checkout` thiếu `checkoutId`, `store_status`, `stow*`, `planogram_*`, `auto_restock`, `advance_day`, `change_speed` (I-01 phân tích bổ sung, đọc mã chưa chạy).
- Tự nhập hàng (`processAutoBuy`), quầy ăn uống (`processStalls`), tự nhập quầy (04/10/2026) đều nằm trong `GameSimulation`; vì vậy chúng tự chạy ở bất cứ nơi nào chạy sim đầy đủ.

## Quyết định thiết kế

### D1. Một simulation chạy nghiệp vụ: ở server

Mỗi hẻm có đúng một `GameSimulation` chạy `update` (trong `WorldRuntime` của server). Client online **không** tạo simulation chạy nghiệp vụ; nó giữ một *read model* chỉ-đọc dựng từ snapshot, đủ để UI/renderer hiện tại đọc (`getInventory`, `getFixtures`, `getStalls`, `getPendingOrders`...). Lý do: loại bỏ nguồn lệch trạng thái và cho phép hành vi tự động chạy một lần ở server.

Phương án đã loại: (B) giữ client-sim + kiểm bất biến (đang dùng; không chống gian lận, hai nguồn sự thật); (C) client chạy sim song song để dự đoán rồi server hòa giải (quá phức tạp cho bản đầu).

### D2. Snapshot đủ cho UI, tách kênh nếu đo thấy cần

Giai đoạn 1 giữ `world:snapshot` 500 ms nhưng mở rộng nội dung: tiền, kho, đơn chờ, fixture/stock, khách, nhân viên, quầy, báo cáo ngày. Nếu snapshot đầy đủ vượt ngưỡng đo được (mục tiêu < 20 KB mỗi lần sau nén), tách kênh: `state` đổi chậm (tiền/kho/sổ) gửi khi đổi + định kỳ, `entities` đổi nhanh (nhân vật/khách/nhân viên) gửi 10 Hz. Chốt sau spike 1.2, không phỏng đoán.

### D3. Mọi thay đổi bằng lệnh ý định; bỏ `updatedBusiness.save` ở online

Lệnh theo hợp đồng sẵn có: `commandId`, `expectedRevision`, `payload` (union `GameCommand`). Server: xác thực account/membership → serialize theo world → `WorldRuntime.executeCommand` → ghi receipt + trạng thái nguyên tử (một `updateOne`, giữ như `shared-alley-multiplayer`) → ACK + `world:update`. Request không còn mang save. `checkSaveInvariants` và nhánh `else` bị xóa ở giai đoạn 3.

Lệnh phụ thuộc trạng thái tạm (`checkout` cần khách đang đứng quầy, `store_status`, `advance_day`) hết vấn đề "save tĩnh" nhờ chạy trên simulation đang sống, thay vì dựng `WorldRuntime` mới từ save DB mỗi lần commit.

### D4. Một registry runtime, hàng đợi lệnh tuần tự theo world

`bootstrap.ts` và `world.gateway.ts` hiện giữ hai nơi tạo `WorldRuntime` riêng. Hợp nhất thành một registry `Map<worldId, runtime>` dùng chung; lệnh từ REST và WS cùng vào hàng đợi theo world. Runtime chưa mở (không ai kết nối) → mở từ DB (checkpoint mới nhất), áp dụng lệnh, flush, rồi có thể evict (gateway đã có logic evict idle sau flush). Đây là phần khó nhất của giai đoạn 1.

### D5. Hành vi tự động chạy ở server, không đồng bộ ngược

`processAutoBuy`, `autoBuyStallIngredients`, `topUpStallShortfalls`, quầy ăn uống, lương, thuế chạy trong sim server. Lệnh `auto_buy_sync` bị xóa. Callback `onAutoPurchase` ở server chỉ kích hoạt checkpoint và `world:update`. Client chỉ nhận kết quả qua snapshot/báo cáo.

### D6. Client online: vẽ từ snapshot, nội suy, không prediction

Renderer vẽ nhân vật/khách/nhân viên từ snapshot, nội suy giữa hai snapshot (đã có cho `partner`). Input di chuyển gửi 10 Hz như hiện nay. Thao tác UI (bày hàng, đặt giá, nhập hàng) gửi ý định rồi **chờ ACK/snapshot**, không cập nhật lạc quan trong bản đầu; nếu đo thấy trễ khó chịu thì ghi nhận làm bước sau. Mất kết nối: khóa mọi thao tác, giữ hiện trạng cuối, nối lại lấy snapshot đầy đủ.

### D7. Offline giữ nguyên; hai chế độ cùng một lõi

`GameSimulation` vẫn là lõi chung. Local = sim chạy ở client + Dexie. Online = sim chạy ở server; client dùng adapter chỉ-đọc (D1). Ranh giới là giao diện `GameStateSource` (đọc trạng thái) + `GameIntentSink` (gửi ý định) mà UI dùng chung; local cài bằng sim trực tiếp, online bằng snapshot + HTTP/WS. Tránh `if (online)` rải rác trong `App.tsx`.

### D8. Chuyển lệnh theo thứ tự rủi ro

1. Lệnh đã có handler trong `WorldRuntime` và payload khớp (tiền/kho/nhập hàng: `order_supplier`, `restock`, `unstock`, `set_price`, `buy_stall`, `dispose_stock`, `open_case`, `set_restock_options`, `set_auto_buy_stalls`).
2. Lệnh cần thêm handler hoặc sửa payload: `order`→`order_supplier`, `stow*`, `planogram_*`, `auto_restock`, `store_status`.
3. Lệnh gắn trạng thái sống: `checkout` (thêm `checkoutId`), `advance_day`, `change_speed` (qua time-vote đã có).
`auto_buy_sync` xóa vì không còn đồng bộ ngược.

### D9. Di trú và tương thích

Save online hiện có (do client ghi) vẫn là trạng thái khởi tạo cho runtime server; không cần migration schema. Tăng `MULTIPLAYER_PROTOCOL_VERSION`; client cũ gửi commit có save bị từ chối kèm thông báo cập nhật. Cờ cấu hình `AUTHORITATIVE_MODE` (env) cho phép chạy song song hai đường trong giai đoạn 1–2 để so sánh, bị xóa ở giai đoạn 3.

### D10. Quan sát và giới hạn tài nguyên

Đo CPU tick/hẻm, RAM/hẻm, kích thước snapshot, độ trễ lệnh→snapshot, số hẻm đồng thời. Giới hạn số hẻm active mỗi process (cấu hình), evict runtime idle sau khi flush (đã có). Tần số tick (hiện 250 ms) chốt theo đo, không phỏng đoán.

## Rủi ro và đánh đổi

- [Tải server] → đo ở 1.2 trước khi cam kết; có giới hạn hẻm/process.
- [Trễ thao tác UI] → bản đầu chấp nhận RTT; kênh `entities` 10 Hz cho chuyển động; prediction là câu hỏi mở.
- [Viết lại `App.tsx`] → đi qua `GameStateSource`/`GameIntentSink`, chuyển từng nhóm lệnh, giữ cờ `AUTHORITATIVE_MODE`.
- [Hai runtime cho cùng world] → D4 hợp nhất registry; test hai lệnh đồng thời.
- [Mất trạng thái sống khi evict] → chỉ evict sau flush thành công (đã có).

## Câu hỏi mở (cần chủ dự án trả lời trước giai đoạn 2)

1. Có chấp nhận độ trễ thao tác UI bằng RTT (không lạc quan) ở bản đầu không, hay cần dự đoán cho thao tác bày hàng/đi lại?
2. Số hẻm đồng thời mục tiêu và ngân sách hosting (quyết định giới hạn D10 và việc tách process).
3. Giữ cờ chạy song song hai đường (D9) bao lâu và khi nào tắt đường commit save?
4. Chế độ "chơi một mình online" có cần chạy sim server khi người chơi offline không (hiện: pause khi không có session)?
