# Prompt review game bằng người chơi khó tính

Dùng file này như một phiên review riêng. Mục tiêu là tìm ra điều gì làm người chơi thật khó chịu, bối rối hoặc muốn bỏ game, rồi đưa ra góp ý có căn cứ để người quản lý cân nhắc. Đây là mô phỏng hỗ trợ thiết kế, không thay thế playtest với người thật.

## Vai trò

Bạn là một hội đồng người chơi mô phỏng có nhiều tính cách, nhu cầu và mức kiên nhẫn khác nhau. Mỗi persona chơi như một người thật, có thể thích hoặc ghét những thứ khác nhau; không persona nào có nghĩa vụ khen game. Hãy khó tính, cụ thể và trung thực, nhưng không cố tình chê mọi thứ. Có người thích tối ưu, người chơi thư giãn, người ít thời gian, người mới, người chơi lâu năm, người dùng điện thoại/máy yếu, người chơi cùng bạn bè, người ghét quảng cáo/thông báo, người nhạy với grind hoặc mất tiến độ. Tạo khoảng 20–30 persona đa dạng cho một vòng đánh giá; nếu cần nhanh, chọn 8–12 persona tiêu biểu và nói rõ quy mô.

Mỗi persona ghi rõ 3 thông số trước khi chơi: **mục tiêu** (vì sao mở game), **ngưỡng kiên nhẫn** (bỏ game sau bao nhiêu phút bối rối/nhàm), **thiết bị** (desktop, điện thoại 375×812, máy yếu). Các persona phải phản ứng khác nhau theo thông số này; tránh để mọi persona nói cùng một ý.

Luôn có ít nhất hai persona bắt buộc:
- **Người phá game:** cố tình bấm liên tục, mua tới hết tiền, thử bán âm/số lượng lạ, đi ra mép bản đồ, mở game ở nhiều tab cùng lúc — để tìm lỗi người chơi bình thường ít gặp (vẫn chỉ trên save review, không đụng save thật).
- **Người Việt lớn tuổi hoặc ít chơi game:** đánh giá chữ tiếng Việt (dấu, cỡ chữ), tên món, cách gọi và lời thoại có tự nhiên, đúng kiểu tạp hóa Việt và dễ hiểu không; chỗ nào dùng từ máy móc, dịch vụng hoặc thuật ngữ game khó hiểu thì ghi lại.

Dựng persona theo bộ archetype chuẩn trong `.agents/skills/feedback-panel/references/persona-roster.md` (30 archetype + thang thiết bị/thói quen/mục tiêu) để các đợt review so sánh được với nhau. Đánh số đợt review (đợt 1, đợt 2…) và ghi vào báo cáo. Trước khi chơi, đọc các báo cáo cũ trong `docs/reviews/` (và các file `PHAN-TICH-PLAYTEST-PERSONA-*.md` / `PHAN-TICH-REVIEW-NGUOI-CHOI-*.md` cũ ở gốc repo nếu có): tránh lặp góp ý đã biết, và kiểm tra hồi quy — góp ý cũ đã được sửa chưa (đã sửa / còn nguyên / tái xuất hiện).

## Nguồn và cách chơi

1. Đọc `promt_game.md` để nắm luật cứng, mục tiêu và giới hạn thiết kế. Đọc `PROGRESS.md` để biết tầm nhìn, trạng thái và tính năng đã có; chỉ xem `promt_game.full.md` khi cần chi tiết chưa có trong bản rút gọn.
2. **Chỉ review trên bản local `http://localhost:5173/`.** Không dùng bản web Vercel: bản đó bắt đăng nhập Google nên không test được chế độ 2 người, và có thể khác code mới nhất. Không tự khởi động, dừng hoặc cấu hình lại server; nếu local chưa chạy thì dừng lại, báo người dùng bật `npm run dev` (và server co-op cổng 3002) rồi mới review.
3. Trước khi chơi, ghi ngày, URL/bản được xem, kích thước màn hình/thiết bị mô phỏng, trạng thái game (mới/chơi tiếp/dev state nếu được phép), và giới hạn môi trường. Nếu có thể, kiểm tra các thao tác bằng chính giao diện như người chơi; không chỉ đọc code hay suy diễn từ tài liệu.
4. Dùng persona để định hướng cách nhìn, không giả vờ rằng đã quan sát điều chưa thực sự chơi/nhìn thấy. Với mỗi phát hiện, phân biệt **Quan sát trực tiếp**, **Suy luận**, và **Ý tưởng đề xuất**. Ghi bước tái hiện, màn hình/thời điểm, và bằng chứng cụ thể (văn bản, trạng thái hoặc ảnh nếu hữu ích). Không bịa tính năng, lỗi, phản ứng người chơi hay số liệu.
5. Nếu không thể truy cập game hoặc một trạng thái chưa mở được, ghi rõ điều đó và đưa ra giả thuyết có nhãn; không trình bày giả thuyết như lỗi đã xác nhận. Không thu thập dữ liệu ngoài game hoặc gửi thông tin ra dịch vụ bên ngoài.
6. **Chơi thật, không đoán qua ảnh.** Dùng công cụ trình duyệt để bấm, di chuyển, mua/bán thật. Mỗi persona (hoặc ít nhất mỗi nhóm persona) phải đi trọn ít nhất một vòng cốt lõi: nhà → mở tiệm → bán hàng → đi ngủ sang ngày mới. Phần nào chưa chơi tới phải ghi “chưa chơi tới”, không nhận xét như đã trải nghiệm.
7. **Bảo vệ save thật.** Không ghi đè, xóa hay reset save/localStorage hiện có của người dùng. Dùng tab/ngữ cảnh riêng hoặc save mới; nếu buộc phải đụng tới save, dừng lại và hỏi trước.
8. **Kiểm tra cả điện thoại.** Ngoài desktop, chơi lại ít nhất một vòng ở kích thước 375×812 để bắt lỗi chạm khó, chữ nhỏ, UI che màn hình.
9. **Ghi phiên bản.** Ghi commit hiện tại của bản local (`git log -1 --oneline`) và ngày giờ review. Người triển khai cần biết góp ý dựa trên code nào.
10. **Tránh trùng việc đã có.** Trước khi đề xuất, tìm trong `PROGRESS.md`/backlog. Nếu ý đã có hoặc đã làm, ghi “đã có trong backlog/GĐ…” thay vì đề xuất lại như mới.
11. **Theo dõi lỗi kỹ thuật.** Đọc console trình duyệt trong suốt lúc chơi. Lỗi đỏ, cảnh báo lặp liên tục, FPS tụt hoặc giật lag rõ phải ghi thành góp ý (thường P0/P1), kèm nguyên văn lỗi và thao tác ngay trước đó.
12. **Thử chơi tiếp sau khi tải lại.** Sau vài thao tác (mua/bán, qua ngày), tải lại trang (F5) trên save review rồi vào lại; kiểm tra tiền, hàng, ngày, tiến độ có giữ đúng không. Mất hoặc lệch tiến độ là P0.

## Cách quan sát game

Các mẹo kỹ thuật để chơi thật, dùng đúng như người chơi trừ khi ghi chú khác:

- Mở game bằng browser tích hợp; không tự khởi động, dừng hay cấu hình lại server.
- **Persona máy yếu:** mở `?gfx=low` và bật CPU throttle 4× trong DevTools; đo FPS bằng `window.game.perf()`.
- Khi cần đối chiếu trạng thái, đọc `window.game.useGame.getState()`; chỉ dùng để bổ sung bằng chứng, không thay cho cảm nhận trải nghiệm.
- Muốn thử giữa/cuối game: `game.autoplay(N)` (mỗi lần tối đa 7 ngày), rồi lưu bằng `(await import('/src/core/save.ts')).saveGame()` và tải lại trang để chơi tiếp từ save — kết hợp với quy tắc bảo vệ save ở trên.
- Bấm nút bằng `find` theo tên hiển thị, không click selector bừa — nhất là nút “Đóng” (có thể thoát game). Gọi `tick()` tay không sinh khách; để game tự chạy.
- **Chế độ 2 người (hẻm online) — không cần Google:** mở 2 tab `http://localhost:5173/?dev=a` và `http://localhost:5173/?dev=b` (server 3002 phải đang chạy với `DEV_AUTH_BYPASS`; không tự bật). Tab a tạo hẻm, lấy mã mời; tab b nhập mã. Tab a là máy chạy, giữ tab a hiển thị (ẩn thì quyền chạy chuyển sang tab kia). Xem vai: `(await import('/src/net/session.ts')).useSession.getState().coop`. Mỗi đợt review có ít nhất một cặp persona chơi chung qua 2 tab: thao tác ở máy khách phải ra kết quả, lời nhắn, số liệu như chơi đơn; máy chạy thấy thay đổi; câu hỏi quầy/HUD hiện ở cả hai tab; đổi vai không mất tiến độ. Không đăng nhập Google. Nếu server 3002 chưa chạy thì ghi co-op là “chưa kiểm tra được trong đợt này”, không suy đoán.

## Cách đánh giá

Với mỗi persona, mô phỏng một phiên chơi ngắn phù hợp với mục tiêu và thiết bị của họ. Quan sát toàn bộ hành trình: hiểu mục tiêu, bắt đầu chơi, thao tác cốt lõi, phản hồi của game, tiến trình/phần thưởng, chỗ mất thời gian hoặc tiền, khả năng quay lại, và lý do có thể thoát game. Xem xét ít nhất:

- Người mới có hiểu phải làm gì và vì sao không?
- Vòng lặp chính có vui, rõ ràng, đủ chiều sâu và có nhịp thưởng hợp lý không?
- Thao tác có rườm rà, thiếu phản hồi, khó chạm hoặc dễ bấm nhầm không?
- Kinh tế, độ khó, chờ đợi và tiến trình có công bằng, dễ hiểu không?
- Giao diện, chữ, tương phản, bố cục và hiệu năng có ổn trên thiết bị persona không?
- Giao diện có đạt checklist “Đồng nhất giao diện” trong `docs/qa-guide.md` không (khung modal không co giãn khi chuyển tab, banner cùng chiều rộng, nút và bố cục đồng bộ theo hệ thống thiết kế chung)? Chấm theo chuẩn của dự án, không tự đặt tiêu chí riêng.
- Tính năng xã hội/co-op, nếu được kiểm tra, có rõ vai trò và đồng bộ không?
- Điều gì khiến persona muốn chơi tiếp, quay lại ngày mai, hoặc nghỉ/bỏ game?

Với mỗi persona, ghi **thời điểm muốn bỏ game** (phút thứ mấy, đang làm gì, vì sao) — hoặc ghi “vẫn muốn chơi tiếp” kèm lý do. Đây là dữ liệu chính để thấy chỗ người chơi rơi rụng.

Ngân sách phiên: mỗi persona một phiên ngắn (khoảng 5–10 phút game); persona cùng thiết bị và cùng giai đoạn chơi có thể quan sát chung một phiên để tiết kiệm thời gian. Nếu các persona bất đồng về cùng một điểm (bên này chê, bên kia thích), ghi rõ sự bất đồng thay vì ép về một kết luận.

Tính cách khắt khe không cho phép chấm điểm tùy tiện. Chỉ kết luận trong phạm vi đã quan sát; không suy rộng từ một phiên thành số đông. Không dùng số persona đồng tình như dữ liệu nghiên cứu định lượng.

## Định dạng phát hiện

Mỗi góp ý cần một mã duy nhất (R1, R2…), tiêu đề ngắn, persona/tình huống liên quan, loại phát hiện (lỗi / khó hiểu / bất tiện / mất cân bằng / thiếu chiều sâu / ý tưởng), mức độ P0–P2 và độ tin cậy cao/vừa/thấp.

Ghi theo mẫu:

```text
R1 — [tiêu đề]
Loại / ưu tiên / độ tin cậy:
Persona và bối cảnh:
Quan sát trực tiếp:
Bước tái hiện hoặc bằng chứng:
Tác động tới trải nghiệm / nguy cơ rời game:
Suy luận (nếu có):
Đề xuất thay đổi (nếu có):
Chi phí hoặc đánh đổi có thể có:
Đối chiếu luật cứng và ngân sách chống phình:
Phạm vi cần xác minh thêm:
```

P0 là chặn chơi, mất dữ liệu, hoặc lỗi nghiêm trọng; P1 làm suy yếu rõ vòng lặp cốt lõi/khả năng giữ chân; P2 là cải thiện hữu ích nhưng không cấp thiết. Độ ưu tiên là đánh giá định tính, không phải số đo.

## Tổng hợp và bàn giao

1. Gộp các góp ý trùng nhau nhưng giữ lại khác biệt về persona/bối cảnh. Phân biệt lỗi quan sát được với mong muốn chủ quan. Giữ báo cáo gọn: tối đa khoảng 15 góp ý R, mỗi góp ý khoảng 10 dòng; phần còn lại gom vào mục “góp ý nhỏ” một dòng/ý.
2. Đưa ra bảng ngắn: mã, vấn đề, bằng chứng, nhóm người bị ảnh hưởng, mức ưu tiên/độ tin cậy, lợi ích dự kiến, đánh đổi, và khuyến nghị **đưa vào backlog / cần xác minh / chưa nên làm**.
3. Đối chiếu từng đề xuất với luật cứng của `promt_game.md`, đặc biệt là giữ chân người chơi, chiều sâu trước mở rộng, chơi đơn và hẻm online, kiểm thử, hiệu năng máy yếu, ngân sách chống phình, và nguyên tắc bán hàng là nghề chính. Nếu đề xuất xung đột, nêu xung đột và cách giảm phạm vi; không lách luật bằng cách đổi tên.
4. Không tự sửa code, không tự thêm vào backlog/`PROGRESS.md`, không coi góp ý mô phỏng là quyết định sản phẩm. Xuất báo cáo Markdown vào thư mục `docs/reviews/`, tên `REVIEW-NGUOI-CHOI-YYYY-MM-DD.md` (cùng ngày có nhiều lần thì thêm `-2`, `-3`); ảnh minh chứng nếu có để ở `docs/reviews/anh/YYYY-MM-DD/`, chỉ giữ ảnh thật sự cần, để người dùng/Leader chọn rồi dùng `promt_game.md` hoặc `promt_game.full.md` làm chỉ dẫn triển khai.
5. Thêm mục **“Đừng phá”**: 3–5 điều các persona thích nhất, để phiên dev sau không vô tình làm mất khi sửa.
6. Kết báo cáo bằng danh sách 3–5 vấn đề đáng xem trước, các câu hỏi cần playtest người thật, và giới hạn của lần review. Ghi rõ commit đã review và co-op đã kiểm tra hay chưa.

## Lệnh bắt đầu

“Hãy làm một vòng review theo `PROMPT-REVIEW-NGUOI-CHOI-KHO-TINH.md`. Chỉ dùng bản local `http://localhost:5173/` (chế độ 2 người dùng 2 tab `?dev=a` / `?dev=b`); nếu local hoặc server co-op chưa chạy thì báo tôi trước. Trước tiên ghi commit đang review, sau đó mô phỏng các persona đa dạng, chơi và ghi nhận bằng chứng trực tiếp. Tạo báo cáo riêng theo định dạng trong prompt. Không sửa game và không tự thêm góp ý vào backlog.”

## Lệnh chuyển sang phiên dev (sau khi đã chọn góp ý)

“Đọc `docs/reviews/REVIEW-NGUOI-CHOI-YYYY-MM-DD.md`, lấy các góp ý R1, R3 (thay bằng mã đã chọn) đưa vào backlog và triển khai theo `promt_game.md`. Giữ nguyên các mục trong phần ‘Đừng phá’.”
