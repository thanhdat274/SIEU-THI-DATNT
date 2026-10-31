# Cẩm nang kiểm thử và QA

> Đọc file này khi đến bước 4–5 của quy trình (test, QA), hoặc khi đóng vai Kỹ sư đồng bộ co-op. Mục tiêu và luật cứng nằm ở `promt_game.md`; file này chỉ là hướng dẫn thao tác. Mục đích kiểm thử: giữ game ổn định, chơi đơn và hẻm online ra cùng kết quả, người chơi thấy dễ dùng và vui.

## Đội kiểm thử: 2 Tester + 2 QA chạy song song

Bốn người chia theo chế độ chơi: **Tester chơi đơn**, **Tester co-op**, **QA chơi đơn**, **QA co-op**. Hai nhánh (đơn / co-op) làm song song sau khi Developer xong. Giai đoạn chỉ qua khi **cả hai nhánh đều đạt**; nhánh nào trả việc thì quay lại bước 3.

Phân công để không giẫm chân nhau:

- **File test:** Tester co-op giữ `coopClient.test.ts`, `coopserver.test.ts`, `coopGuard.test.ts`, `serverGuard.test.ts`; Tester chơi đơn giữ mọi file test còn lại. Không ai sửa file test của người kia — cần thì báo qua Leader.
- **Chạy test:** chỉ Tester chơi đơn chạy cả bộ `npm run test`. Tester co-op chỉ chạy: `npx vitest run src/__tests__/coop src/__tests__/serverGuard`.
- **Trình duyệt:** QA chơi đơn dùng một tab `http://localhost:5173/` (không `?dev=`); QA co-op dùng 2 tab `?dev=a` / `?dev=b`. Không dùng tab của nhau.
- **Lỗi tìm được:** ghi rõ chế độ (đơn / máy chạy / máy khách). Lỗi chỉ có ở co-op giao Tester co-op viết test tái hiện; lỗi ở cả hai thì Tester chơi đơn viết.

## Quy tắc test chung

Viết và chạy test cho từng tính năng mới, kiểm tra hồi quy. Với tài sản 3D: file tải được, dung lượng trong ngân sách, fallback hoạt động, không lỗi console.

- **Thêm hay sửa gì cũng phải có test** (không có test thì giai đoạn chưa xong):
  - Tính năng mới: hành vi chính + trường hợp biên (0 tiền, kho trống, ngày đầu, cấp thấp/cao, save cũ thiếu trường mới).
  - Sửa/đổi hành vi cũ: cập nhật test cũ cho đúng hành vi mới (không xoá test cho xanh) và thêm case cho phần đổi.
  - Sửa lỗi: viết test TÁI HIỆN lỗi trước (đỏ), sửa xong test xanh.
  - Đổi cấu trúc save: thêm bước `MIGRATIONS` + test nạp bản lưu cũ (xem `saveStore.test.ts`).
  - Logic mới đọc ngẫu nhiên phải dùng `simRng()` (không `Math.random`).
  - Kiểm tra test thật sự bắt lỗi: tạm làm hỏng code vừa viết, test phải đỏ; khôi phục lại.
- Bắt buộc kiểm thử trực tiếp trên game đang chạy tại http://localhost:5173/. Server và frontend đã bật sẵn.
- Tuyệt đối không tự khởi động server/frontend/dev server (`npm run dev`, `npm start`...). Trang không truy cập được thì ghi PROGRESS.md mục "Cần duyệt" và làm việc khác.
- Sau khi sửa code hoặc tài sản, reload trang để kiểm bản mới nhất.

## Tester chơi đơn

- Test logic game, kinh tế, tiến trình, lưu/tải, nhân viên, mô phỏng.
- `npm run test` chạy toàn bộ mỗi giai đoạn (~4–5 phút). Test mô phỏng (autoplay) tất định theo seed và có số mốc cân bằng — đỏ vì lệch mốc thì xem lệch là CÓ CHỦ Ý (đổi kinh tế đã duyệt → cập nhật mốc, ghi lý do vào PROGRESS.md) hay là lỗi.
- Mỗi 10 giai đoạn chạy `npm run test:coverage` (~1 phút) để tìm LOGIC chưa có test (ưu tiên `core/`, `data/`, `agents/`, save). `ui/`, `world/`/`render/` coverage thấp là bình thường.
- Toàn bộ test vượt ~7 phút (mục tiêu ≤ 5 phút): đo file chậm nhất (`npx vitest run --reporter=json`) và tối ưu trước khi làm tiếp.
- Test ngân sách chống phình (`featureBudget`, phần bán hàng/ngày đầu trong `economySim`, `longSessionLeak`) đỏ thì trả về Developer sửa thiết kế — KHÔNG nâng trần. Giai đoạn thêm thư viện/tài sản/nhiều code: chạy thêm `npm run check:bundle`.

## Tester co-op và 5 câu soát co-op

Bảo đảm **chơi đơn và hẻm online (2–4 người) ra KẾT QUẢ GIỐNG NHAU.** "Máy chạy" (người vào đầu) chạy mô phỏng; "máy khách" không chạy gì, mọi thao tác trong store gửi cho máy chạy làm thay (xem `src/net/coop.ts`). Soát mỗi tính năng mới theo 5 câu (Kỹ sư đồng bộ co-op cũng dùng 5 câu này khi duyệt code ở bước 3):

1. Thao tác mới đã phân loại trong `coopGuard.test.ts` chưa (GUARDED nếu sửa đúng một chỗ, LOCAL_ONLY kèm lý do)? Test tự đỏ nếu quên.
2. UI có dùng GIÁ TRỊ TRẢ VỀ của thao tác không? Máy khách luôn nhận `true` tạm. Lời báo kết quả phải nằm TRONG thao tác (`notify`), không để UI tự báo theo giá trị trả về; cần biết thành công thật thì chờ `lastActionResult()`; cần dữ liệu (vd. giải vòng quay) thì ghi vào state chung.
3. Có `useGame.setState({...})` trực tiếp trong UI/`main.tsx` không? Trên máy khách nó thành PATCH gửi lên máy chạy: chỉ dùng cho tuỳ chọn người chơi bấm; KHÔNG ghi đè object lớn (`biz`, `stats`...) — làm thành thao tác trong store; trường máy chạy tự tính mỗi khung hình phải nằm trong `NO_PATCH`.
4. Có dữ liệu NGOÀI `useGame` (store/biến module riêng như `useCounterAsk`) mà UI máy khách cần thấy không? Nếu có phải gửi kèm gói state.
5. Có logic dựa vào vị trí/hành động của "người chơi" không? Ở hẻm phải tính cả thành viên khác (như `partnerAt` ở quầy, chi nhánh).

Test co-op: `coopClient.test.ts` (trình duyệt: máy khách/máy chạy/đổi vai/câu hỏi quầy), `coopserver.test.ts` (server). Tính năng đụng đồng bộ thì thêm case, kiểm bằng cài lỗi như quy tắc chung.

## QA chơi đơn

Chơi như người thật trên http://localhost:5173/: đánh giá trải nghiệm, UI, độ mượt, cân bằng, độ vui; tìm lỗi logic/hiển thị; kiểm console. Có quyền trả việc cho Developer hoặc 3D Artist. Xem nhiều kích thước màn hình (giả lập thiết bị), đánh giá người chơi mới có tự hiểu không, đánh giá tài sản 3D (đẹp, đúng phong cách, tỉ lệ, không giật).

- **Phạm vi mỗi giai đoạn:**
  - Luôn làm: chơi kỹ TÍNH NĂNG MỚI (cả biên: hết tiền, kho trống, ngày đầu, save cũ) + LUỒNG CỐ ĐỊNH ngắn: vào game → mở cửa → bán vài khách → ngủ → xem tổng kết; 0 lỗi console.
  - Màn hình: tính năng mới xem ở điện thoại (390px) + máy tính. Chỉ quét ĐỦ (320/390/768/máy tính) và mọi panel khi giai đoạn đụng giao diện chung (HUD, thành phần dùng chung, CSS chung).
  - **Không chỉ mở panel rồi đóng:** với mọi panel/modal của tính năng mới, BẤM QUA TỪNG tab, menu con, nút trong đó (cả trạng thái rỗng, danh sách dài, chữ dài, số tiền lớn) ở mỗi kích thước. Theo checklist "Đồng nhất giao diện" bên dưới.

## Checklist đồng nhất giao diện (QA chơi đơn)

Lỗi giao diện hay gặp nhất không phải "vỡ" mà là "lệch nhau": mỗi panel một kích thước, mỗi thông báo một độ rộng. Đánh giá như người chơi nhìn cả màn hình cùng lúc, không chỉ từng ô riêng lẻ.

- **Modal/panel cùng loại cùng khung:** mở lần lượt các panel liên quan (và chuyển tab bên trong): chiều rộng, chiều cao, vị trí, header, nút đóng ✕, padding phải giống nhau theo bộ kích thước chung của hệ thống thiết kế (vd. nhỏ / vừa / lớn). Chuyển tab không được làm modal co giãn, nhảy vị trí hay đổi chỗ nút ✕. Nội dung dài thì cuộn BÊN TRONG thân modal, header/nút chính đứng yên.
- **Banner/thẻ thông báo xếp chồng:** các banner hiện cùng lúc (khách chờ, đối thủ, hàng sắp hết hạn...) phải cùng chiều rộng, cùng căn trái, cùng cỡ chữ, cùng kiểu nút hành động, cùng vị trí nút. Không để banner co theo độ dài chữ thành bậc thang lệch nhau.
- **Nội dung trong banner:** ≤ 2 dòng, không lặp mục (vd. cùng một món hiện hai lần), danh sách dài thì rút gọn "+N món" và để chi tiết trong panel. Bật đủ các banner cùng lúc ở 320/390px: không che nút HUD, không đẩy cảnh 3D mất quá ~1/3 màn hình.
- **Thao tác bên trong:** nút cùng cấp cùng cỡ và kiểu; vùng bấm ≥ 44px trên cảm ứng; ô nhập, danh sách, bảng thẳng cột; trạng thái rỗng có chữ hướng dẫn; bấm xong có phản hồi và modal không bị nhảy.
- **So sánh chéo:** mỗi giai đoạn đụng UI, chụp tính năng mới đặt cạnh ít nhất 1 panel cũ cùng loại. Lệch kích thước/kiểu so với hệ thống thiết kế là lỗi, trả về Developer — dù tính năng "chạy đúng".
- QA toàn diện mỗi 10 GĐ: đi qua MỌI modal và MỌI tab con ở 4 kích thước, ghi danh sách chỗ lệch vào backlog (ghi rõ panel, kích thước màn hình, lệch gì).
  - Giai đoạn thêm prop hoặc sự kiện cảnh: chụp mặt tiền cửa tiệm ở ít nhất 3 góc, kể cả ngày bật nhiều sự kiện nhất, đánh giá như art director (xem mục bố cục trong `promt_game.md`).
  - Giai đoạn thêm cảnh, NPC, hiệu ứng hay đụng vòng render: mở `http://localhost:5173/?gfx=low`, bật CPU throttle 4× (DevTools → Performance), chơi luồng cố định, đọc `game.perf()` — FPS phải ≥30. Xong thì trả lại `?gfx=auto`.
  - **Đổi tuỳ chọn lúc đang chơi (đồ họa, âm thanh, tốc độ, ngôn ngữ...):** bấm đổi qua lại MỌI mức ít nhất 2 vòng trong lúc cảnh đang chạy (ban ngày, đông khách), mỗi lần đọc `game.perf()` và để ý đứng hình. Không khung nào khựng > 200 ms, FPS sau khi đổi về đúng mức đó. Tiện đo: gọi `game.renderer.render(game.scene, game.controller.camera)` ngay sau khi đổi và bấm giờ — vài giây là đang biên dịch lại shader (vd. đổi `castShadow`, thêm/bớt đèn), trả về Developer. Tab nền bị trình duyệt hạ còn ~1 FPS: đo kiểu này thay vì đếm requestAnimationFrame.
  - QA TOÀN DIỆN mỗi 10 giai đoạn: chơi lại cả vòng ngày ở nhiều cấp, mọi panel, mọi kích thước, đánh giá người chơi mới — ghi kết quả vào PROGRESS.md. Gồm một lượt **save trắng** (xoá dữ liệu trang trong tab QA riêng): bấm giờ tới khi bán được món đầu tiên (mục tiêu ≤ 5 phút), đếm thông báo/panel tự bật trong ngày đầu, ghi chỗ nào người mới khựng.
  - Không chơi lại toàn bộ giai đoạn cũ; nghi giai đoạn cũ bị ảnh hưởng thì chỉ kiểm riêng phần đó.

## QA co-op

- **Khi nào:** giai đoạn có thao tác mới, panel mới đọc dữ liệu chung, hoặc đụng `src/net/` / server. Giai đoạn thuần hình ảnh/3D hay chỉ đọc dữ liệu riêng máy thì chỉ chạy luồng cố định ngắn. QA toàn diện mỗi 10 GĐ luôn gồm một vòng ngày ở hẻm 2 tab.
- **Mở hẻm (không cần Google):** tab 1 `http://localhost:5173/?dev=a`, tab 2 `?dev=b` (server 3002 chạy sẵn với `DEV_AUTH_BYPASS` — log có "DEV_AUTH_BYPASS đang bật"; không tự bật server). Tab a tạo hẻm, lấy mã mời; tab b nhập mã. Tab a là máy chạy; giữ tab a hiển thị (ẩn thì quyền chạy chuyển sang tab kia). Xem vai: `(await import('/src/net/session.ts')).useSession.getState().coop`.
- **Kiểm gì:** bấm tính năng mới ở tab máy khách — kết quả, lời nhắn, số liệu như chơi đơn; tab máy chạy thấy thay đổi; câu hỏi quầy/HUD hiện ở cả hai tab; đổi vai không mất thao tác hay số liệu.
- **Môi trường:** code đổi thì Vite reload và tab rời hẻm — vào lại, không tính lỗi. Không vào được hẻm thì ghi "Cần theo dõi" và làm tiếp.

## QA nhanh (cả 2 QA)

- Dựng thẳng trạng thái bằng console: `game.useGame.setState({ minutes: 20 * 60, money: 50_000_000, level: 30, staff: [...] })` thay vì chơi/chờ. `game.autoplay(n)` / `game.playtest` khi cần vài ngày dữ liệu. Ở hẻm chỉ dựng trạng thái trên tab máy chạy.
- Thế giới TỰ DỪNG khi HUD có câu hỏi/khách hỏi ở quầy (ghi sổ, mặc cả — GĐ102) hoặc panel tổng kết mở: đây là thiết kế. Đồng hồ đứng thì nhìn HUD và **bấm trả lời/đóng như người chơi thật** — vừa gỡ dừng vừa QA chính câu hỏi đó (nút dễ bấm, chữ rõ, có phản hồi). Chỉ khi bấm không được mới gỡ bằng `game.useGame.setState({ panel: null })` — và ghi đó là lỗi UI.
- Đọc kết quả bằng chữ (DOM, `game.useGame.getState()`), chỉ chụp ảnh khi cần xem hình/bố cục.
- Logic và số liệu đã có test tự động lo — QA trình duyệt chỉ xem phần người chơi THẤY và CẢM, không mô phỏng nhiều ngày để kiểm số.
- Giới hạn ~10–15 phút QA mỗi giai đoạn thường. Kẹt vì môi trường quá ~5 phút thì ghi PROGRESS.md "Cần theo dõi" và làm tiếp.
