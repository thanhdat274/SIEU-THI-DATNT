# Yêu cầu nghiên cứu: hoàn thiện vòng chơi tiệm tạp hóa

## Mục tiêu

Hãy nghiên cứu kỹ game hiện tại trong `C:\Users\Admin\Desktop\GAME`, đối chiếu các tính năng đang thực sự chạy trong mã nguồn với thiết kế và tài liệu, rồi đề xuất một lộ trình tính năng giúp trải nghiệm kinh doanh **một tiệm tạp hóa** trở nên rõ ràng, vui, có chiều sâu và dễ cân bằng. Giai đoạn này chỉ tập trung vào tiệm tạp hóa: nhập hàng, quản lý tồn kho, trưng bày, phục vụ khách, thu ngân/giao hàng, doanh thu–chi phí, danh tiếng và phát triển tiệm. Chưa nghiên cứu hay đề xuất triển khai mở chi nhánh, chuỗi cửa hàng hoặc chuyển sang ngành cửa hàng khác; có thể ghi lại đó là hướng tương lai ngoài phạm vi.

## Bối cảnh ban đầu cần kiểm chứng

Đây là game web 3D dùng React, TypeScript, Three.js, Zustand, Vite và có các phần lưu game/Firebase/co-op. Mã nguồn hiện khai báo 35 hồ sơ nghề khách (`src/data/professions.ts`), 24 khách quen (`src/data/regulars.ts`), nhiều nghề dùng chung một archetype hoặc tạo hình (`src/render/characterModel.ts`), catalog hàng hóa, nhà cung cấp, cấp độ, nhiệm vụ, hợp đồng cung ứng, sự kiện, nhân viên, nội thất và các panel vận hành. Đây chỉ là điểm xuất phát để kiểm tra: phải xác nhận lại số lượng, đường đi từ dữ liệu đến gameplay/UI, cách lưu và trạng thái kiểm chứng; không coi tài liệu, comment, roadmap, tên module hay tính năng được khai báo là bằng chứng rằng tính năng hoạt động hoàn chỉnh. Một số ghi chú phân tích trước đây có số liệu cũ hoặc mâu thuẫn, vì vậy hãy ưu tiên đọc mã đang chạy và chỉ ra sự khác biệt.

## Nguồn tham khảo

1. Game hiện tại: đọc cấu trúc dự án, các luồng UI, dữ liệu, logic mô phỏng, lưu game và các tài liệu liên quan. Lần theo ít nhất các luồng nhập hàng → nhận/cất hàng → châm hàng/bày kệ → khách chọn hàng → thanh toán hoặc bỏ đi → sổ sách/tổng kết ngày → nhiệm vụ và tiến triển. Đối chiếu các hệ thống khách quen, nghề khách, nhân viên, đơn điện thoại/giao hàng, hợp đồng, đánh giá, danh tiếng, sự kiện và mức giá.
2. Game tham khảo gần thể loại: `C:\Users\Admin\Desktop\SIEU-THI-DATNT`. Chỉ đọc để rút ra mẫu thiết kế có thể giúp vòng chơi tạp hóa hiện tại (ví dụ khách có nhu cầu/tiểu sử, đơn hàng, tồn kho, mục tiêu, phản hồi hoặc hướng dẫn vận hành). Không mặc định các hệ thống trong tài liệu của dự án kia đã triển khai, được QA hay cân bằng; xác định bằng chứng trong code/test/UI nếu cần nêu trạng thái. Không sửa dự án tham khảo.
3. HappyTown: `https://myhappy.town/intro/`. Truy cập trang và các trang chính thức liên quan nếu khả thi, ghi ngày tra cứu và liên kết nguồn. Tóm tắt chỉ những cơ chế có căn cứ từ nguồn truy cập được, rồi phân biệt rõ điều gì chuyển dụng được cho trải nghiệm chủ tiệm (ví dụ cư dân dễ nhớ, mục tiêu có ngữ cảnh, cảm giác cộng đồng) và điều gì không hợp phạm vi. Nếu trang không truy cập được, ghi rõ giới hạn và không suy diễn nội dung từ tên game hay kết quả tìm kiếm không xác thực; tiếp tục nghiên cứu bằng hai nguồn dự án còn lại.

## Câu hỏi cần trả lời

- Vòng chơi tạp hóa hiện tại diễn ra cụ thể thế nào từ đầu ngày đến cuối ngày? Ở bước nào người chơi ra quyết định có ý nghĩa, bước nào lặp lại/thụ động, bước nào thiếu phản hồi hoặc hướng dẫn?
- Tính năng nào có code, nối với UI và lưu được; tính năng nào mới chỉ là data/placeholder/kế hoạch; phần nào có test; phần nào chưa được kiểm chứng trong runtime/playtest? Nêu đường dẫn file và bằng chứng ngắn cho kết luận quan trọng.
- Nền kinh tế có giúp người chơi hiểu giá nhập, giá bán, lợi nhuận, lương, hao hụt/hết hàng và tiền quay vòng không? Có quyết định nào quá tự động, quá rủi ro hoặc không minh bạch? Đề xuất cách hiển thị và cân bằng mà không tạo quá nhiều bảng biểu.
- Khách theo nghề và khách quen hiện tạo khác biệt thực tế gì trong giờ ghé, giỏ hàng, giá, kiên nhẫn, quay lại và câu chuyện? Phân biệt **đa dạng nghề trong dữ liệu** với **đa dạng tạo hình nhìn thấy được**. Kiểm tra nghề nào dùng chung archetype, phụ kiện/đạo cụ có giúp nhận diện không, nhân vật quen có ổn định giữa các lần ghé/save không, và hiệu năng/khả năng đọc hình trong góc camera thực tế.
- Có nên tạo thêm model/archetype nghề mới ngay không? Chỉ đề xuất nghề hoặc tạo hình mới khi giải thích được nhu cầu mua hàng riêng, khung giờ/hành vi hợp lý, đóng góp cho vòng chơi và giá trị hình ảnh đủ khác. Ưu tiên so sánh phương án: thêm archetype 3D, thêm biến thể ngoại hình/phụ kiện cho archetype hiện có, hoặc làm nhân vật khách quen có diện mạo riêng. Nêu danh sách nhỏ theo thứ tự ưu tiên, không chạy theo số lượng.
- Khách quen, hợp đồng cung ứng, đơn điện thoại/giao hàng và nhiệm vụ có thể nối thành một vòng chuẩn bị–phục vụ–nhận phản hồi ra sao mà vẫn dễ hiểu? Có thể học cách kể chuyện qua cư dân ở HappyTown, nhưng biến nó thành lý do người chơi nhập/trữ hàng, giao đúng hẹn, giữ món khách cần hoặc chăm sóc mối quen; không bê nguyên hoạt động ngoài lề.
- Tính năng hiện có nào nên tận dụng hoặc sửa trước khi thêm tính năng mới? Có chồng lặp giữa nhiệm vụ, hợp đồng, đơn giao và sự kiện không? Tác động của mỗi đề xuất tới save cũ, co-op, cân bằng, UI, content và bảo trì là gì?
- Đề xuất chỉ báo/feedback giúp người chơi biết vì sao khách mua, bỏ đi, chê giá, gặp kệ trống hoặc quay lại; đồng thời gợi ý việc cần làm nhưng không tự chơi thay người chơi.

## Cách làm và tiêu chuẩn bằng chứng

Rà soát theo luồng gameplay thực tế, không chỉ liệt kê tên hệ thống. Tìm điểm bắt đầu của hành động ở UI, lần theo handler/store/logic simulation, data model và save/load; ghi nhận test hiện có nếu có. Với nhận định ảnh hưởng quyết định sản phẩm, dẫn file cụ thể và tách rõ **đã xác nhận trong code**, **được tài liệu mô tả**, **đã có test**, **đã kiểm tra bằng chơi/build**, và **chưa xác minh**. Không chạy hoặc sửa game/dự án tham khảo trừ khi có yêu cầu riêng; yêu cầu này là nghiên cứu và đề xuất. Không tuyên bố build, test hay playtest đã chạy nếu chưa chạy. Khi nguồn mâu thuẫn, nêu mâu thuẫn và ưu tiên hiện trạng code có thể kiểm chứng.

Đánh giá mỗi ý tưởng theo: giá trị cho core loop tạp hóa; mức dễ hiểu; độ mới so với chức năng đang có; công sức code/content/đồ họa/UI; ảnh hưởng save/co-op/hiệu năng; rủi ro làm kinh tế mất cân bằng; cách đo hiệu quả sau khi làm. Nêu giả định, phụ thuộc và chi phí cơ hội. Tránh thêm hệ thống chỉ vì game tham khảo có; tránh biến nghiên cứu thành danh sách thật dài các tính năng xa phạm vi.

## Định dạng đầu ra mong muốn

1. **Tóm tắt điều hành**: game đã có gì, vấn đề quan trọng nhất của trải nghiệm tạp hóa, kết luận có nên thêm tạo hình nghề mới ngay không.
2. **Bản đồ hiện trạng**: bảng theo luồng (đã có/thiếu/chưa xác minh, nơi trong source, mức bằng chứng, vấn đề người chơi gặp).
3. **Đánh giá nhân vật**: số nghề, archetype thật sự khác nhau, mức trùng ngoại hình, những nghề/khách quen đáng ưu tiên tạo biến thể; đưa ra ví dụ cụ thể và lý do gameplay.
4. **Bài học tham khảo**: bảng riêng HappyTown và `SIEU-THI-DATNT`, có nguồn/bằng chứng, ý tưởng có thể chuyển dụng, cách điều chỉnh cho tiệm tạp hóa, phần nên để ngoài phạm vi.
5. **Danh sách đề xuất xếp hạng**: P0 (làm rõ/sửa/tận dụng nền có sẵn), P1 (tăng chiều sâu trực tiếp cho tiệm), P2 (chỉ làm sau khi đo/playtest). Mỗi mục ghi vấn đề, thiết kế đề xuất, ví dụ luồng người chơi, UI/feedback, dữ liệu và module dự kiến, phụ thuộc, rủi ro/balance, tiêu chí chấp nhận và cách kiểm chứng.
6. **Phương án nhân vật**: so sánh không thêm model / thêm biến thể / thêm archetype, đề xuất tối đa 3–5 nghề/diện mạo có giá trị cao nhất nếu có căn cứ, gồm nghề, hình dáng/đạo cụ, giờ ghé, nhóm hàng ưa thích, hành vi đặc trưng và lý do không trùng với nghề cũ.
7. **Lộ trình tập trung một tiệm**: thứ tự lát cắt nhỏ, phụ thuộc giữa chúng, việc cần đo trước/sau và ranh giới rõ ràng rằng chi nhánh/loại cửa hàng khác chưa triển khai ở giai đoạn này.
8. **Rủi ro và câu hỏi còn mở**: chỉ hỏi những điều mà mã nguồn hoặc nguồn công khai không giải quyết được.

Kết luận cần trả lời thẳng: với trạng thái code hiện tại, nên ưu tiên tính năng nào trước để tiệm tạp hóa vui và dễ hiểu hơn; nên bổ sung tạo hình nhân vật nào (nếu có), hay nên tăng chiều sâu cho nhân vật/hệ thống đã tồn tại trước. Mọi đề xuất phải gắn với nhu cầu người chơi và vòng chơi của tiệm tạp hóa, không mở rộng sang quản lý chuỗi hay ngành cửa hàng khác.
