# Design: Neighborhood Builder Expansion (change tổng)

Chi tiết kỹ thuật nằm ở design của từng change con. File này chỉ giữ nguyên tắc chung mà mọi change `civic-*` phải theo.

## Nguyên tắc chung

1. **Vai người chơi = chủ tiệm.** Không có ngân sách thành phố riêng, không có lệnh thu thuế người khác. Mọi tiền đi ra/vào đều là tiền quỹ chung của người chơi (co-op giữ quỹ chung — quyết định 6c).
2. **Đi qua mô hình đất có sẵn.** Công trình công cộng là một loại tòa trong `BUILDING_TYPE_DEFS`, đặt trên lô qua placement/parcel; không thêm tọa độ tòa tuyệt đối mới.
3. **Dẫn xuất trước, lưu sau.** QoL tính lại từ placement + ngày; chỉ lưu thứ không tính lại được (dân số hiện tại, lịch sử phí). Không lưu từng cư dân.
4. **Tất định cho co-op.** Mọi số liệu dùng seed + ngày + trạng thái save; không `Math.random`, không phụ thuộc thời gian thực hay khung hình. Server replay ra cùng kết quả.
5. **Kinh tế có trần và có sweep.** Mọi hệ số mới vào `demand.ts` nhân chung với hệ số khu/cụm phải nằm dưới trần tổng; mỗi change đụng kinh tế phải chạy script quét kinh tế (kiểu `economy-qa-sweep.ts`) và ghi kết quả vào `tổng hợp.md`.
6. **Additive.** Save cũ tải được; save không có dữ liệu civic chạy y như trước (golden test không đổi khi chưa có công trình nào).
7. **UI mobile-first.** Giao diện mới theo chuẩn Mobile Game UI (audit P0/P1/P2, QA 7 viewport); không PASS khi chưa test trình duyệt.
8. **Hình ảnh.** Mặt tiền công trình ưu tiên asset Kenney/LimeZu theo pipeline asset; code-drawn chỉ là tạm.

## Sửa lỗi dữ kiện của plan cũ
- A* nằm ở `game-core/src/pathfinding.ts` (`findPath`, `findPathToAny`), không phải `customers.ts`.
- `LedgerEntryType` hiện có `'tax'` và `'rent'`; không có `tax_paid`/`tax_penalty`/`tax_back_paid`.
- `districts.ts` nằm ở `game-data/src/world/`, khu có `DistrictKind` = residential/commercial/office/food (không có industrial).
- Ngân sách hiệu năng phải là **tổng mỗi lần cập nhật** (vd ≤ 2 ms/giờ game cho toàn bộ civic), không phải "3 ms/citizen" (500 × 3 ms = 1,5 s).
- Không có hệ tử vong/IQ/kỹ năng cư dân; không dùng các hiệu ứng `citizenIQBonus`, `healthBonus` kiểu đó.
- `world-events.ts` hiện chỉ có `w4_fair` và `power_outage`; chưa có ngập/dịch bệnh.

## Bổ sung sau khi đối chiếu bản phân tích thứ hai (16/10/2026)
9. **Không phình `simulation.ts`** (~328 KB). Mỗi change `civic-*` là module thuần riêng (`civic-*.ts`), `simulation.ts` chỉ gọi một hàm/ngày.
10. **QoL khác danh tiếng.** Danh tiếng (`review-reputation.ts`, truyền miệng) là của *từng tiệm*; QoL là của *khu*. Không cộng QoL vào danh tiếng, không phạt danh tiếng khi QoL thấp (tránh phạt hai lần).
11. **Không thay khách bằng cư dân.** `customers.ts` + khách quen giữ nguyên; cư dân chỉ điều chỉnh tần suất (change 2) và lớp hình (change 5).
12. **Không thêm loại khu `industrial`.** Sản xuất đi qua chuỗi cung ứng/bếp hiện có; nếu cần xưởng thì là loại tòa, không phải loại khu.

## Ý tưởng để dành (chưa thành change, xét sau khi 5 change con xong)
- **Trạm xe buýt thật** (`nb_bus_stop` đang là trang trí): công trình công cộng tăng khách từ đợt khai hoang xa — "giao thông công cộng" dạng hệ số, không mô phỏng tuyến.
- **Ngập hẻm khi mưa to**: nối `weather.ts` + change `road-cross-section-drainage`; công trình thoát nước giảm ngập — thay cho mạng tiện ích kiểu Cities: Skylines.
- **Mất điện** (`power_outage` đã có): trạm biến áp phường giảm xác suất/thời gian mất điện.
- **Xưởng nhỏ** (làm bánh, đá viên…): loại tòa sản xuất cấp hàng cho tiệm qua `supply-execution.ts`.
- **Lễ hội phường**: dùng `seasons.ts`/`party-orders.ts`, QoL cao thì lễ hội đông hơn.

## Nguyên tắc co-op chung cho mọi change `civic-*` (bổ sung 16/10/2026)
13. **Chỉ server đổi trạng thái.** Lệnh mới đi qua `commands.ts` + server replay; client không tự trừ tiền/kho. Số liệu theo ngày (QoL, dân số, phí) tính ở bước đầu ngày của server rồi gửi snapshot; client chỉ hiển thị, không tính lại ra số khác.
14. **Quyền và phiếu dùng hệ có sẵn.** Lệnh tốn tiền đi qua bảng quyền `land-permissions.ts` và phiếu chi lớn `land-vote.ts` (`LARGE_SPEND_RATIO` = 30% quỹ); lệnh đụng lô đi qua khóa giữ chỗ quy hoạch (`land-command-targets.ts`).
15. **Người làm lấy từ phiên server**, không lấy `playerId` trong payload client.
16. **Hai lệnh cùng lúc**: server xếp hàng theo thứ tự nhận; lệnh sau thấy trạng thái mới (vd ô sổ đã đủ → từ chối/nhận phần thiếu), có thông báo tiếng Việt.
17. **Thông báo phát cho cả hai** (khánh thành, phí, nợ); người offline thấy lại trong nhật ký/tổng kết ngày.
18. **Chơi đơn đi cùng đường** với co-op (cùng lệnh, cùng hàm), chỉ khác là không cần phiếu.
19. **Kiểm thử co-op bắt buộc**: test replay server + QA 2 client thật cho mỗi change có lệnh mới.
