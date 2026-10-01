# Tasks

Trạng thái 01/10/2026: nhóm 1–3 và 4.1–4.2 đã có code và test; 5.1 đã chạy (typecheck/test/build PASS); 5.2 đã kiểm một phần trên desktop (sáng, trưa tháng 6 và 12, chiều, đêm, mưa; mobile giả lập mới kiểm một phần, xem task); 4.3 đã đo trên desktop (xem task); còn mobile/máy yếu và 5.3 đóng nghiệm thu. Chưa chạy build/browser.

## 1. Mốc mọc/lặn theo mùa

- [x] 1.1 Thay `getSeasonalSunTimes` bằng bảng 12 mốc nội suy tuần hoàn (`lighting-phase.ts`); giữ API. (Đã làm: bảng 12 mốc, `getDayOfYear` + `SEASON_YEAR_DAYS`.)
- [x] 1.2 Test: xác định theo `day`, nối năm mượt (≤3 phút), độ dài ngày 11–13 h, mọc sớm nhất ≠ lặn muộn nhất.
- [x] 1.3 Chạy lại `lighting-phase.test.ts` với mốc ngày 1 mới; chỉnh ngưỡng chỉ khi lý do chính đáng và ghi lại. (Test cũ qua nguyên vẹn, không đổi ngưỡng.)

## 2. Vị trí mặt trời

- [x] 2.1 Thêm `getSolarPosition` và `sunAzimuth`/`sunElevation`/`shadowDir` vào `LightingState`; suy `shadowLean`/`shadowLength` từ chúng. (Lệch đặc tả: `shadowLean`/`shadowLength` GIỮ nguyên từ keyframe để không đổi diện mạo bóng nội thất/actor đã chỉnh; các trường mới chỉ thêm vào. Có thể suy ra sau khi chốt cảm quan.)
- [x] 2.2 Test: độ cao = 0 lúc mọc/lặn, đỉnh lúc 12:00, đông–tây sáng/chiều, lệch bắc tháng 6 và lệch nam tháng 12, 24h nối 0h.

## 3. Cây là dữ liệu bản đồ

- [x] 3.1 Thêm `TREE_PROPS` (`game-data/src/map.ts`); `map.ts` (va chạm ô 3,11) và `viewport.ts` (sprite ô 2,9) cùng đọc từ đó, giữ vị trí cũ. (Đã làm: `TREE_PROPS` + `TREE_SPRITE_OFFSET`; bóng elip cố định trong `viewport.ts` vẫn chờ nhóm 4.)
- [x] 3.2 Test dữ liệu: cây không trùng cửa, ô đỗ, cột đèn. (Thêm vào `runOutdoorPropTests` trong `integration.test.ts`.)

## 4. Bóng cây trong renderer

- [x] 4.1 Thay elip cố định trong `viewport.ts` bằng bóng mỗi cây theo `shadowDir`/độ cao, kẹp độ dài, mờ theo mưa (+ mây nếu có dữ liệu). (Đã làm: hàm thuần `computeTreeShadow` trong `game-core/src/tree-shadow.ts`, độ dài tối đa 3,5 ô, mờ theo nắng và mưa; chưa có dữ liệu mây nên chưa mờ theo mây.)
- [x] 4.2 Cache theo ngưỡng 1° và mưa; không `clear()/draw` mỗi frame khi không đổi. (Đã làm: `treeShadowNeedsRedraw`, ngưỡng 1° và 0,05 cho nắng/mưa; test đơn vị PASS, chưa đo thực tế trong game.)
- [x] 4.3 Đo/ghi hiệu năng với số cây hiện tại; chưa tăng số cây nếu chưa đo. (Đo hiệu năng (01/10/2026, Browser pane trong ứng dụng desktop, một cây, bản dev, kết hợp `setDebugTime`): (1) fps không phân biệt được: mọi tình huống (ban đêm không bóng, trưa bóng tĩnh, vẽ lại bóng mỗi frame, thời gian thật) đều đúng 26,7 ms/frame ≈ 37,5 fps, p95 27 ms, max ≤ 40 ms (một lần 93 ms ở cửa sổ đầu tiên sau chuyển cảnh), nghĩa là pane bị giới hạn khung hình nên không đo được chi phí bóng bằng fps; (2) đo phần thời gian luồng chính còn rảnh bằng số vòng MessageChannel mỗi giây, 3 vòng lặp: ban đêm 156.876–163.586, trưa tĩnh 159.708–163.372, ép vẽ lại bóng mỗi frame 152.309–164.653; chênh lệch nằm trong nhiễu (~±3%), không thấy chi phí CPU luồng chính đáng kể kể cả trường hợp xấu nhất (vẽ lại mỗi frame). Giới hạn: không đo GPU/thời gian render của Pixi, chỉ một cây, một máy, bản dev (chưa minify), chưa đo trên điện thoại hay máy yếu.)

## 5. Kiểm chứng và tài liệu

- [x] 5.1 `yarn typecheck`, `yarn test`, `yarn build`; ghi kết quả thực. (01/10/2026: `yarn typecheck` PASS, `yarn test` PASS 7/7 suite, 0 fail, `yarn build` PASS; vẫn còn cảnh báo chunk >500 kB từ trước.)
- [ ] 5.2 Browser QA: bóng đổi hướng trong ngày, đổi theo mùa, biến mất khi mưa/đêm; desktop và mobile (cần môi trường cho phép dev server). CHƯA ĐẠT, mới kiểm một phần 01/10/2026 bằng Browser pane trên desktop ở dev server sẵn có (cổng 3000): bóng ngả tây buổi sáng (07:52, 08:57), nằm ở chân cây sau khi sửa điểm gốc, không lỗi console. Sau đó thêm công cụ dev nhảy giờ/ngày chỉ về hiển thị (`?debugTime=ngày:giờ[:phút[:mưa]]` hoặc `setDebugTime(...)`/`clearDebugTime()` trong console, chỉ ở dev; `packages/game-renderer/src/debug-time.ts`, `apps/web/src/main.tsx`) và xem được: trưa giữa tháng 6 (ngày 34, bóng ngắn ngả nam), 16:30 (bóng ngả đông), 22:00 (không bóng), trưa có mưa 0,9 (bóng gần mất, có vệt mưa), không lỗi console. So sánh trưa tháng 6 và tháng 12 (01/10/2026, ảnh chụp toàn khung 800x600 ở độ phóng mặc định vì Browser pane chưa hỗ trợ cắt/zoom vùng, kèm số từ `computeTreeShadow`): tháng 6 mặt trời cao 75,2° ở phương vị 0° (bắc), tâm bóng lệch 0,32 ô về nam, bán trục dọc 1,42 ô; tháng 12 cao 55,2° ở phương vị 180° (nam), tâm bóng lệch 0,83 ô về bắc, bán trục 1,93 ô. Trên màn hình bóng tháng 6 nằm phía dưới gốc cây, bóng tháng 12 dài hơn và vươn lên phía trên, khớp số. Lưu ý: elip kéo dài cả phía sau gốc (cộng bán kính tán) nên cả hai mùa đều có phần bóng ở hai phía của gốc, phần phía bắc bị tán cây che bớt nên chênh lệch nhìn thấy nhỏ hơn số liệu; chưa cân chỉnh hình bóng theo mắt. Kiểm tra mobile (01/10/2026, Browser pane giả lập, không phải điện thoại thật): ở khung dọc 375x812 game hiện màn chặn "Xoay ngang để ghé tiệm" nên chỉ kiểm khung ngang 812x375. Ở đó cảnh, ánh sáng và `setDebugTime` hoạt động (22:00 tối, bóng không còn), không lỗi console. Với camera mặc định (đã ở mức thu nhỏ tối thiểu) cây nằm góc dưới trái, chân cây sát mép thanh dưới cùng nên phần bóng phía nam (trưa tháng 6) bị thanh UI che gần hết; bóng đổ sang đông lúc 15:30 chỉ thấy mờ, không rõ ở độ phân giải ảnh. Không chồng lên joystick ảo (cách khoảng 60 px). Chưa xác nhận được tháng 12 và buổi chiều rõ ràng ở khung này, và không đi được tới chỗ khác để nhìn cây vì phím di chuyển không có tác dụng trong lượt kiểm (chưa rõ do cửa hàng đóng hay do focus). Kết luận: không thấy lỗi bố cục do bóng gây ra, nhưng chưa nghiệm thu trực quan trên mobile; cần thử trên máy thật hoặc đi bộ người chơi ra gần cây. Hiệu năng xem task 4.3.
- [ ] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`; không đánh dấu nghiệm thu nếu chưa có browser QA.
