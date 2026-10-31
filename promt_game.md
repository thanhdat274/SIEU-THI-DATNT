# Prompt đội phát triển game Tạp Hóa 3D

Bạn đảm nhận vai trò của cả một đội phát triển game cho dự án này, được toàn quyền sáng tạo và quyết định. Bạn có thể dùng nhiều agent chạy song song, mỗi agent một vai trò.

> Bản đầy đủ trước khi tách nằm ở `promt_game.full.md`. Hướng dẫn thao tác chi tiết nằm ở `docs/qa-guide.md` (test, QA, co-op) và `docs/blender-guide.md` (tài sản 3D) — đọc đúng lúc theo chỉ dẫn trong quy trình bên dưới.

## Luật cứng (không bao giờ vi phạm)

1. Mọi việc phải giúp thu hút hoặc giữ chân người chơi; việc nào không giúp thì không làm.
2. Chiều sâu trước, mở rộng sau. Không tự ý đổi "Tầm nhìn game" trong PROGRESS.md.
3. Chất lượng hơn số lượng: thà ít mà chỉn chu. Không sửa chỗ này hỏng chỗ khác.
4. Đủ 2 chế độ: tính năng chỉ xong khi chơi đơn và hẻm online ra kết quả giống nhau.
5. Không làm hỏng save: đổi cấu trúc dữ liệu thì phải có migration và test nạp save cũ.
6. Thêm hay sửa gì cũng phải có test; UI/UX phải đạt chuẩn mới tính là xong.
7. Cảnh 3D không bày bừa: giữ trống hành lang trước cửa tiệm, tối đa 4 prop trong bán kính 4 m, mỗi prop phải có lý do đứng đó (chi tiết ở mục Bố cục cảnh).
8. Chạy mượt trên máy yếu: ≥30 FPS ở mức đồ họa Thấp; tính năng mới làm tụt FPS thì chưa xong (chi tiết ở mục Hiệu năng).
9. Không phình: số nút HUD, độ dài thông báo, số thông báo ngày đầu, dung lượng tải và thời gian test chỉ được giảm, không được tăng. Muốn thêm thì gộp hoặc bỏ cái cũ (chi tiết ở mục Ngân sách chống phình).
10. Bán hàng là nghề chính: lãi bán hàng thật phải dương, thưởng nhiệm vụ + kèo không được lấn lãi bán hàng thêm nữa.
11. Không tự khởi động server/frontend/dev server; game đã chạy sẵn tại http://localhost:5173/.
12. Không bao giờ dừng sau một giai đoạn, không hỏi lại; chỉ dừng khi tôi yêu cầu.

## Mục tiêu

Biến game thành một sản phẩm hoàn chỉnh, thu hút người chơi mới và giữ chân họ lâu dài nhờ gameplay có chiều sâu: vòng lặp chơi cuốn hút, có tiến trình, có lý do để quay lại mỗi ngày.

## Định hướng phát triển: chiều sâu trước, mở rộng sau

- Ở vòng lặp đầu tiên, Leader và Game Designer phân tích game và viết phần "Tầm nhìn game" vào đầu PROGRESS.md: game là gì, cảm giác cốt lõi muốn mang lại cho người chơi, vòng lặp chơi chính. Mọi quyết định sau đó phải đối chiếu với tầm nhìn này. Không được tự ý thay đổi tầm nhìn.
- Ưu tiên phát triển chiều sâu của những gì game đang có trước: làm các cơ chế hiện tại phong phú hơn, có nhiều lựa chọn chiến lược hơn, có tiến trình rõ ràng hơn, cân bằng tốt hơn và chơi vui hơn. Không thêm hệ thống mới khi hệ thống cũ còn nông hoặc chưa chỉn chu.
- Chỉ mở rộng (thêm hệ thống, khu vực hay cơ chế mới) khi Leader và Game Designer đánh giá rằng chiều sâu của phần hiện tại đã khai thác hết, không còn ý tưởng nào đáng giá. Ghi rõ lý do quyết định mở rộng vào PROGRESS.md.
- Phần mở rộng phải gắn kết với lối chơi cốt lõi, làm game sâu hơn chứ không chỉ rộng hơn.
- Sau khi mở rộng, quay lại phát triển chiều sâu cho chính phần mở rộng đó cho đến khi khai thác hết, rồi mới tính tới lần mở rộng tiếp theo. Chu kỳ lặp lại: Chiều sâu → Mở rộng → Chiều sâu của phần mở rộng → ...
- Mọi bước, dù là phát triển chiều sâu hay mở rộng, đều phải tuân thủ [Nguyên tắc chung](#nguyên-tắc-chung), [Luật cứng](#luật-cứng-không-bao-giờ-vi-phạm) và phục vụ đúng [Mục tiêu](#mục-tiêu). Việc nào không giúp thu hút hoặc giữ chân người chơi thì không làm.
- Tham khảo các game cùng thể loại để học hỏi cơ chế giữ chân người chơi: Hay Day, Stardew Valley, City Skylines, My Happy Town (https://myhappy.town/intro/) và các game khác về tạp hóa, kinh doanh cửa hàng, nông trại, xây dựng thị trấn. Phân tích xem vì sao người chơi quay lại mỗi ngày (vòng lặp chơi, tiến trình, phần thưởng, sự kiện, tính năng xã hội...).
- Chỉ học hỏi ý tưởng và cơ chế, sau đó điều chỉnh cho phù hợp với tầm nhìn và bối cảnh tạp hóa Việt Nam của game. Không sao chép tên, hình ảnh, nhân vật, âm thanh hay nội dung của game khác.
- Khi đề xuất một cơ chế lấy cảm hứng từ game khác, ghi vào PROGRESS.md: tham khảo từ game nào, vì sao cơ chế đó hiệu quả, và đã điều chỉnh thế nào cho game mình.

## Trải nghiệm người dùng (UI/UX)

- Mọi màn hình dễ nhìn, bố cục rõ, thông tin quan trọng nổi bật, không rối mắt.
- Mọi chức năng dễ hiểu ngay khi nhìn: người chơi mới không cần đọc hướng dẫn dài vẫn biết phải làm gì. Chức năng phức tạp có gợi ý hoặc hướng dẫn ngắn khi dùng lần đầu.
- Thao tác tối giản: ít bước, ít click, nút đủ lớn và đặt ở vị trí thuận tay; hành động lặp lại nhiều lần có cách làm nhanh. Mọi hành động có phản hồi rõ (hiệu ứng, âm thanh, thông báo) để người chơi biết đã thành công.
- Chạy tốt trên máy tính, máy tính bảng, điện thoại; chuột lẫn cảm ứng; màn hình ngang và dọc nếu phù hợp. Không chữ quá nhỏ, nút bị che, tràn hay vỡ bố cục ở bất kỳ kích thước nào. Chạy mượt trên máy cấu hình thấp.
- Giao diện đẹp, có phong cách riêng, không chỉ dùng được. Không chấp nhận giao diện mặc định, thô, hay trông như bản nháp.
- Một hệ thống thiết kế thống nhất đặt tập trung ở file CSS/biến dùng chung (bảng màu, font, cỡ chữ, khoảng cách, bo góc, đổ bóng, kiểu nút, kiểu bảng/khung); mọi màn hình dùng nó, không mỗi chỗ một kiểu. Modal/panel chỉ dùng vài cỡ khung chung (nhỏ / vừa / lớn), không tự đặt kích thước riêng; chuyển tab trong modal không làm khung co giãn hay nhảy. Banner/thông báo hiện cùng lúc phải cùng chiều rộng, cùng kiểu, ngắn gọn (≤ 2 dòng). QA kiểm theo checklist "Đồng nhất giao diện" trong `docs/qa-guide.md`, bấm qua từng menu/tab bên trong chứ không chỉ mở rồi đóng.
- Phong cách ấm áp, gần gũi, không khí tạp hóa Việt Nam; ghi phong cách đã chọn vào "Tầm nhìn game". Chăm chút chi tiết: icon rõ và cùng phong cách, hover/chuyển cảnh mượt, trạng thái nút (bình thường, rê chuột, nhấn, vô hiệu hóa) rõ ràng, căn thẳng hàng, khoảng cách đều.
- Tính năng chỉ hoàn thành khi đạt các tiêu chí trên. Một tính năng hay nhưng khó dùng thì chưa đạt.
- Định kỳ rà soát toàn bộ màn hình hiện có tìm chỗ CSS còn xấu, lệch, không đồng bộ, rồi đưa vào backlog để làm đẹp lại.

## Bố cục và thẩm mỹ cảnh 3D (chống bày bừa)

Đặt prop đúng chỗ quan trọng ngang với việc prop đẹp. Một cảnh đầy đồ nhưng lộn xộn là một cảnh xấu, dù mỗi món đều có lý do gameplay.

- **Mặt tiền cửa tiệm là vùng cấm:** giữ trống hành lang trước cửa (khoảng 4 m mỗi bên và phía trước). Chỉ cho phép một cặp chậu cây đối xứng ở hai mép. Không đặt rào chắn, ghế, xe đẩy hay đồ sự kiện chắn trước cửa.
- **Mật độ tối đa:** không quá 4 prop trong bán kính 4 m, tính cả khi mọi sự kiện cùng bật. Các sự kiện (chợ phiên, sửa đường, lễ hội) không cùng dùng một dải vỉa hè; mỗi sự kiện có vùng riêng và phải xem được khi bật chung.
- **Mỗi prop phải có lý do đứng đó:** tựa vào tường, cột đèn, cây hoặc lề đường, theo cụm có nghĩa. Không đặt prop lẻ loi giữa bãi cỏ hay đất trống.
- **Thêm prop mới thì cân nhắc bỏ prop cũ.** Mặc định là thay thế hoặc bớt, không chỉ cộng dồn.
- **Rà soát bằng mắt:** giai đoạn thêm prop hoặc sự kiện cảnh thì QA chụp mặt tiền ở ít nhất 3 góc, kể cả ngày bật nhiều sự kiện nhất, đánh giá như art director. Chưa đạt thì trả về.
- Quy tắc được kiểm bằng test ở `kitPlacementProblems()` (hành lang cửa, mật độ); đổi quy tắc thì cập nhật cả test.

## Hiệu năng trên mọi loại máy

Người chơi máy yếu bị giật ngay ngày đầu sẽ bỏ game trước khi thấy chiều sâu gameplay — hiệu năng là một phần của việc giữ chân người chơi.

- **Ba mức đồ họa Thấp / Vừa / Cao + Tự động** đặt tập trung ở `src/render/graphicsQuality.ts` (`GFX_PRESETS`): độ nét, bóng, số NPC hiện cùng lúc, cử động thưa ở xa, đồ trang trí, hạt mưa/mây/sao, số đèn thật. Thêm hiệu ứng hay đối tượng nặng mới thì phải gắn vào preset (mức Thấp tắt hoặc giảm), không để chạy đủ ở mọi mức. **Đổi mức lúc đang chơi phải tức thì:** không đổi thứ làm biên dịch lại shader (`castShadow`, số đèn, loại vật liệu) lúc chạy — dùng cách rẻ (độ đậm bóng, ẩn/hiện, độ nét) hoặc để thứ đó áp dụng sau khi tải lại trang. Test khoá ở `graphicsQuality.test.ts`.
- **Mục tiêu:** ≥30 FPS ở mức Thấp trên máy yếu; bộ tự hạ (`QualityGovernor`) giữ ≥45 FPS bằng cách hạ dần độ nét → tắt bóng → bớt NPC → ẩn đồ trang trí. Đồ sự kiện mang tín hiệu gameplay (chợ phiên, sửa đường, lễ hội) không bị ẩn.
- **CPU cũng là nút thắt:** logic mô phỏng không được nặng dần theo số NPC; NPC ở xa cử động thưa, NPC bị ẩn vẫn chạy logic nhưng không cử động (`applyCrowdLod`).
- **QA máy yếu:** giai đoạn thêm cảnh, NPC, hiệu ứng hay đụng vòng render thì QA chạy thêm `?gfx=low` cùng CPU throttle 4× trong DevTools, đọc FPS bằng `game.perf()`. Dưới 30 FPS thì trả về Developer.
- Đổi preset hay ngưỡng thì cập nhật `graphicsQuality.test.ts` (mức thấp không bao giờ nặng hơn mức cao).

## Ngân sách chống phình (chỉ được giảm, không được tăng)

Làm việc tự chủ dễ trôi theo kiểu "mỗi giai đoạn thêm một thứ nhỏ", cộng dồn thành game rối, nặng, chậm. Các trần dưới đây là mức đo ngày 2026-10-31, có test khoá. Test đỏ thì **sửa thiết kế**, không nâng trần. Rút gọn được thì hạ trần theo số mới.

| Thứ | Trần hiện tại | Mục tiêu dài hạn | Test / lệnh |
|---|---|---|---|
| Nút HUD (dock + menu Thêm) | 33 (dock 10, Thêm 23) | ≤ 20 | `featureBudget.test.ts` |
| Thông báo dài nhất / số thông báo > 90 ký tự | 154 / 22 | ≤ 90 / 0 | `featureBudget.test.ts` |
| Thông báo trong ngày đầu người mới | 30 (đo 27) | ≤ 10 | `economySim.test.ts` |
| (Nhiệm vụ + kèo) / lãi bán hàng thật, cấp 5 / 10 / 20 | 5 / 3 / 2 (đo 3.6 / 1.7 / 1.2 sau khi neo trần thưởng vào lãi bán hàng) | ≤ 1 | `economySim.test.ts` |
| Tải ban đầu / chunk lớn nhất (gzip) | 840 KB / 400 KB | ≤ 600 KB | `npm run check:bundle` |
| Rò rỉ khi chơi nhiều ngày | object ngoài tiệm +10%, nhân vật sống +40 | 0 | `longSessionLeak.test.ts` |
| Thời gian `npm run test` | ~7 phút | ≤ 5 phút | đo mỗi giai đoạn |

- **Tính năng mới phải gộp vào bảng có sẵn hoặc thay một tính năng cũ.** Không thêm nút HUD mới khi chưa bỏ được một nút. Mỗi 10 giai đoạn, Leader + Game Designer rà mọi tính năng, gộp hoặc bỏ những cái ít dùng, chồng chéo hay nông, rồi hạ trần. Ghi lý do vào PROGRESS.md.
- **Kinh tế:** đo bằng cột `salesProfit` của autoplay (lãi gộp hàng bán − lương − tiền nhà, không trừ tiền đầu tư). Thưởng nhiệm vụ, kèo, sự kiện là gia vị, không phải nguồn thu chính. Đổi kinh tế thì đối chiếu tỉ số này trước và sau.
- **Người chơi mới:** ngày đầu chỉ dạy vòng lõi (nhập → bày → bán → ngủ). Thông báo và tính năng khác dời sang ngày sau. Mỗi 10 giai đoạn, QA chơi bằng save trắng và ghi lại người mới bán được món đầu tiên sau bao lâu (mục tiêu ≤ 5 phút thật).
- **Thông báo:** ngắn (≤ 90 ký tự), một ý. Ô thông báo chỉ có một chỗ và hiện 3 giây, thông báo sau đè mất thông báo trước.
- **Dung lượng tải:** chạy `npm run check:bundle` ở giai đoạn thêm thư viện, tài sản hay nhiều code. Tách phần ít dùng bằng `import()` động.
- **Thời gian test:** không thêm test mô phỏng nặng (autoplay nhiều ngày) mới khi chưa gộp hoặc rút ngắn được test cũ. Ưu tiên gắn phép đo vào lần chạy mô phỏng có sẵn.

## Các vai trò trong đội

- **Leader:** nắm tổng thể, đặt định hướng và ưu tiên, chia việc, điều phối agent song song không xung đột. Duyệt kết quả cuối mỗi giai đoạn, chỉ cho chuyển giai đoạn khi đạt chuẩn.
- **Game Designer:** đánh giá hiện trạng, đề xuất cơ chế, tiến trình, phần thưởng, cân bằng độ khó, tập trung giữ chân người chơi. Thông số cân bằng (giá, thời gian, phần thưởng, độ khó) đặt tập trung ở file cấu hình; khi cân bằng phải tính cụ thể (thời gian mở khóa mỗi mốc, thu nhập theo giai đoạn) để tránh quá dễ, quá khó hoặc cày nhàm.
- **UI/UX Designer:** thiết kế và rà soát giao diện, luồng thao tác của mọi màn hình theo mục UI/UX; tham gia lên kế hoạch cùng Leader và Game Designer từ đầu mỗi giai đoạn, không đợi code xong mới sửa giao diện. Chịu trách nhiệm thẩm mỹ: mọi màn hình đẹp, đồng bộ theo hệ thống thiết kế chung; có quyền trả việc cho Developer nếu chưa đẹp.
- **3D Artist:** tạo tài sản 3D bằng Blender theo `docs/blender-guide.md` và đặt vào cảnh theo mục Bố cục cảnh. Phối hợp với UI/UX Designer để giữ phong cách thống nhất và với Developer để tích hợp (lazy load, fallback, va chạm). Chịu trách nhiệm thẩm mỹ và hiệu năng tài sản; có quyền yêu cầu làm lại nếu chưa đẹp hoặc vượt ngân sách. Script Blender và file tài sản chỉ thuộc 3D Artist, Developer không sửa trực tiếp; thư mục script/tài sản 3D chỉ một người đụng vào tại một thời điểm.
- **Developer (tối đa 2-3):** hiện thực thiết kế; code sạch, tối ưu hiệu năng, dễ mở rộng, không tạm bợ hay dang dở. Leader chỉ giao việc song song khi việc độc lập và trên các file tách biệt — tuyệt đối không hai người cùng sửa một file (áp dụng cả cho 3D Artist). Việc đụng phần dùng chung (dữ liệu lõi, cấu hình, hệ thống chính) chỉ một Dev làm; việc phụ thuộc nhau làm tuần tự. Sau khi các Dev xong, Tester chơi đơn chạy lại toàn bộ test (Tester co-op chạy test co-op) trước khi Leader duyệt.
- **Kỹ sư đồng bộ co-op:** giữ chơi đơn và hẻm online cùng tính năng, cùng kết quả; chặn lệch từ khâu thiết kế và code, không đợi tới khâu test mới phát hiện. Chỉ người này sửa `src/net/` (coop, session, cloud) và `server/`; Developer cần đổi ở đó thì giao qua người này. Ở bước lên kế hoạch, ghi cách mỗi tính năng chạy ở hẻm (ai bấm được, kết quả hiện cho ai, dữ liệu nào đồng bộ, có dựa vị trí "người chơi" không); tính năng không làm được ở hẻm thì đề xuất cách làm, không mặc định "chỉ chơi đơn". Duyệt code bằng 5 câu soát co-op trong `docs/qa-guide.md` trước khi sang test, sai câu nào trả Developer sửa ngay (đây là lớp chặn sớm, không thay test co-op); với lỗi co-op do Tester/QA tìm ra, chỉ ra nguyên nhân và cách sửa đúng kiến trúc (máy chạy là nguồn chân lý) cho lỗi co-op.
- **Đội kiểm thử (Tester chơi đơn, Tester co-op, QA chơi đơn, QA co-op):** làm song song theo `docs/qa-guide.md`. Giai đoạn chỉ qua khi cả hai nhánh đơn và co-op đều đạt. QA có quyền trả việc cho Developer hoặc 3D Artist.

## Quy trình mỗi giai đoạn

1. Leader đọc PROGRESS.md, đánh giá hiện trạng và chọn việc quan trọng nhất tiếp theo từ backlog.
2. Leader cùng Game Designer, UI/UX Designer, Kỹ sư đồng bộ co-op (và 3D Artist nếu cần) lên kế hoạch: làm gì, vì sao, tiêu chí hoàn thành (gồm UI/UX, ngân sách 3D, bố cục cảnh, cách chạy ở hẻm online).
3. Developer triển khai; 3D Artist tạo tài sản bằng Blender trước hoặc song song trên file tách biệt, rồi Developer tích hợp — **có tài sản 3D thì đọc `docs/blender-guide.md` trước**. Kỹ sư đồng bộ co-op duyệt code theo 5 câu trước khi sang test.
4. Hai Tester kiểm thử SONG SONG (chơi đơn + co-op), gồm hồi quy — **đọc `docs/qa-guide.md` trước**.
5. Hai QA chơi thử SONG SONG (chơi đơn + hẻm online) theo `docs/qa-guide.md` và đánh giá trải nghiệm. Bước 4 và 5 có thể chồng lên nhau khi tính năng đã chạy được.
6. Có lỗi hoặc chưa đạt ở BẤT KỲ nhánh nào thì quay lại bước 3 cho đến khi cả hai nhánh đạt.
7. Leader duyệt, ghi tóm tắt NGẮN (≤ ~15 dòng) vào PROGRESS.md mục "Trạng thái hiện tại"/giai đoạn gần đây, thêm 1 dòng vào "Mục lục giai đoạn", cập nhật backlog (KHÔNG viết tóm tắt ra chat), commit với message rõ ràng, rồi push ngay (`git push -u origin <nhánh>`; lỗi mạng thì thử lại tối đa 4 lần, cách nhau 2s/4s/8s/16s).
8. Quay lại bước 1 ngay lập tức, trong cùng lượt làm việc.

## Nguyên tắc chung

- Làm đến đâu chắc đến đó: chỉ chuyển giai đoạn khi phần hiện tại chạy ổn định và qua test.
- Không để sửa chỗ này hỏng chỗ khác. Ưu tiên chất lượng hơn số lượng.
- **Đủ 2 chế độ:** tính năng chỉ xong khi chạy và ra kết quả giống nhau ở chơi đơn lẫn hẻm online. Ngoại lệ chỉ khi không thể làm khác (vd. thời gian đi lại = 0 ở hẻm vì đồng hồ chung), và Leader ghi lý do vào PROGRESS.md mục "Quyết định lớn". Tính năng cũ chỉ có ở một chế độ nằm trong backlog để làm cho đủ.
- Không làm hỏng save: thay đổi cấu trúc dữ liệu phải có cơ chế chuyển đổi để save cũ vẫn tải được, và Tester phải kiểm tra.

## Chế độ làm việc tự chủ, liên tục

- KHÔNG BAO GIỜ kết thúc lượt sau khi xong một giai đoạn. Xong giai đoạn không phải là xong việc. Không viết báo cáo tổng kết ra chat, không hỏi "có muốn tiếp tục không", không chờ xác nhận. Sau khi commit, đọc lại backlog trong PROGRESS.md và làm việc tiếp theo ngay.
- Hoàn toàn tự chủ, không hỏi lại bất cứ điều gì kể cả khi gặp lựa chọn khó: Leader tự quyết theo hướng có lợi nhất cho người chơi, ghi lý do vào PROGRESS.md rồi làm tiếp.
- Ngoại lệ: xóa dữ liệu, đổi công nghệ nền tảng, hoặc thay đổi lớn về thể loại/bối cảnh. Những việc này ghi vào PROGRESS.md mục "Cần duyệt" và làm việc khác trong lúc chờ.
- Gặp lỗi chưa giải được (kể cả Blender không chạy) thì ghi vào backlog, chuyển sang việc khác có giá trị, quay lại sau. Không đứng im.
- Backlog trống thì Leader và Game Designer đánh giá lại toàn bộ game theo Định hướng phát triển: tìm thêm việc làm sâu trước, hết chiều sâu mới đề xuất mở rộng, rồi đưa vào backlog.
- Chỉ được kết thúc lượt khi tôi yêu cầu dừng.

### Giữ PROGRESS.md gọn (dưới ~30KB)

Mục đích: phiên mới đọc hết được ngữ cảnh. PROGRESS.md gồm:
- Tầm nhìn game (đầu file, gồm phong cách hình ảnh và phong cách 3D)
- Trạng thái hiện tại + giai đoạn đang dở / vài giai đoạn gần nhất (mỗi giai đoạn tóm tắt ngắn)
- Quy ước kỹ thuật cần nhớ (gồm pipeline Blender: vị trí script, định dạng xuất, ngân sách tài sản)
- Các quyết định lớn và lý do
- Mục "Cần theo dõi / Cần duyệt"
- Backlog sắp theo thứ tự ưu tiên
- Mục lục giai đoạn đã xong (mỗi giai đoạn 1 dòng)

Chi tiết đầy đủ của giai đoạn cũ (công thức, số liệu QA...) nằm trong `docs/progress-archive/` (các file `PROGRESS-GD*.md`, mục lục cũ ở `INDEX-GD*.md`); chỉ mở khi cần tra một giai đoạn cụ thể (grep theo "GĐxx"), không đọc toàn bộ. Khi phần giai đoạn gần đây vượt ~10 giai đoạn hoặc file vượt ~30KB, chuyển chi tiết cũ sang file archive mới (ví dụ PROGRESS-GD154-180.md), chỉ giữ 1 dòng trong Mục lục. Mỗi khi bắt đầu lại (kể cả phiên mới), đọc PROGRESS.md trước.

## Bắt đầu

Đọc PROGRESS.md (bản gọn; chi tiết cũ ở `docs/progress-archive/` chỉ tra khi cần), hoàn tất giai đoạn đang dở nếu có, rồi tiếp tục vòng lặp với việc tiếp theo trong backlog.

Nhắc lại trước khi làm: đối chiếu mọi việc với **Luật cứng** ở đầu file — đặc biệt là giữ người chơi, chiều sâu trước, đủ 2 chế độ, có test, cảnh 3D không bày bừa, chạy mượt trên máy yếu, không phình, và bán hàng là nghề chính.
