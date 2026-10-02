# Proposal: Tiệm xôi riêng trên cùng dải đất

## Vì sao

Chuỗi xôi (ngâm nếp → hấp → múc xôi) và khách ngồi bàn gọi thêm đồ uống đã có ở mức dữ liệu/simulation (xem `tổng hợp.md`, mục 02/10/2026), nhưng các trạm xôi (`thung_ngam`, `xung_hap`, `quay_xoi`) đang phải đặt lẫn trong sàn tiệm tạp hóa chính. Game tham khảo `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem` có "Tiệm xôi" là một chi nhánh (`branches.json`: cấp 29, 700.000 ₫, bố cục nhỏ gồm quầy thu ngân, thùng ngâm, xửng hấp, quầy xôi, một bàn), nhưng nó là một `StoreSnapshot` hoán đổi: người chơi chuyển màn qua lại giữa các cửa hàng.

Chủ dự án chốt hướng khác: **tiệm xôi là một con tiệm riêng, nằm gần tiệm chính trên cùng một dải đất/bản đồ, không chuyển màn.** Người chơi đi bộ từ tiệm này sang tiệm kia, khách đi bộ trên vỉa hè thấy cả hai cửa tiệm.

## Mục tiêu

- Có tòa nhà thứ hai trên bản đồ hiện tại (không đổi `MAP_WIDTH`/`MAP_HEIGHT`, không dịch tọa độ save cũ), có tường, cửa, biển hiệu, đèn riêng; mở bằng điều kiện cấp + tiền.
- Chuyển các trạm xôi và bàn ăn xôi vào tiệm xôi; tiệm chính không còn đặt được trạm xôi.
- Khách chọn tiệm khi ghé: món xôi chỉ bán ở tiệm xôi, khách vào đúng cửa, xếp hàng ở quầy thu ngân của tiệm đó, ngồi bàn của tiệm đó.
- Nhân viên và người chơi đi được giữa hai tiệm và kho chung; checkout ở quầy tiệm xôi theo cùng luật với tiệm chính.
- Một chủ, một tiền, một sổ cái, một kho, một bản save, cùng chạy được ở chế độ chơi một mình và co-op (server replay).

## Ngoài phạm vi

- Chi nhánh khác của game gốc (chợ, cổng trường, khu công nghiệp), chuyển màn giữa các cửa hàng, nhiều `StoreSnapshot`, `internalSupply.ts` (luân chuyển hàng giữa các tiệm).
- Đổi kích thước bản đồ, thêm kho thứ hai, sổ cái/thuế tách theo từng tiệm.
- Vẽ lại hình ảnh: tái dùng texture tường/cửa/nội thất hiện có, chỉ thêm biển "TIỆM XÔI".
- Cân bằng kinh tế xôi (giá, độ phổ biến, thời gian ngâm) và mini-game hấp của game gốc.
- Mua/bán tiệm xôi nhiều lần, nhiều tòa nhà ngoài hai tòa này (mô hình dữ liệu tổng quát nhưng chỉ có hai tòa).

## Cách tiếp cận

Tổng quát hóa "một tiệm" thành danh sách tòa nhà (`BUILDINGS`) trong `game-data`: mỗi tòa có biên, cửa, ô vào cửa và ngưỡng mở. Vị trí đề xuất cho tiệm xôi là dải trống phía tây tiệm chính (x=0..6 dùng chung tường x=6 với tiệm chính, nội thất x=1..5, y=4..9, cửa hướng ra vỉa hè phía nam), vì không phải đổi kích thước bản đồ và thẳng hàng vạch qua đường hiện có. Tòa nhà của một fixture được **suy ra từ tọa độ**, không lưu thêm trường nên không đổi schema fixture. Chỉ lưu tập tòa đã mở (`ownedBuildingIds`, trường tùy chọn) để không phải nâng schema save. Các phần gắn cứng một cửa (`ENTRANCE_TILE`, `STORE_BOUNDS`, hàng đợi quầy, lối thoát của khách) được tham số hóa theo tòa nhà. Triển khai theo lát cắt: dữ liệu và bản đồ → khách và hàng đợi → trạm, bàn, nhân viên → editor bố cục → renderer → co-op/server.

## Tiêu chí hoàn tất

- Mua tiệm xôi (đủ cấp, đủ tiền) trừ tiền đúng một lần, mở cửa, đặt bố cục mặc định; save cũ nạp bình thường và không có tiệm xôi.
- Khách vào đúng tòa nhà cần mua, không xuyên tường, không xếp hàng nhầm quầy; đúng cả khi lưu/nạp giữa chừng.
- Trạm xôi không đặt được ở tiệm chính; save đã lỡ có trạm xôi ở tiệm chính được đưa vào kho nội thất, không mất đồ.
- Local và co-op cho cùng kết quả (lệnh mua tiệm có idempotency/revision, nằm trong danh sách server replay).
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực tế; browser QA desktop và mobile ghi riêng, không suy ra từ unit test.
