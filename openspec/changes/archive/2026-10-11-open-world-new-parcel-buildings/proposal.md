# Proposal: Đặt tòa lên lô của đợt khai hoang mới

## Vì sao

`open-world-land-reclamation` đã cho mở đợt W1–W4 và mua lô, nhưng QA desktop 11/10/2026 phát hiện **chưa đặt được tòa nào lên lô mới**:

- `placementOptions` (`game-core/store-layout.ts`) chỉ duyệt `LAND_PARCELS` (4 lô W0); `PARCEL_MAP` không chứa lô W1–W4 nên `validatePlacement` trả `unknown_parcel`.
- `validatePlacement` ép hàng mặt tiền của tòa bằng hàng y=10 của W0 (`front_row`), còn lô W1/W3 mặt đường chính nằm ở y 8..12 và lô W2/W4 mặt đường nam ở y 20..24.
- **Lô quá nhỏ cho mọi mẫu tòa hiện có**: tòa phụ rộng 6–10 và cao 8 hàng (xôi 7×8, quán nước 10×8, ăn vặt 6×8), trong khi lô W1 là 6×5, W2 8×5, W3 7×5, W4 8×5 (riêng `w4-corner` 6×5).

Vì vậy chuỗi "mở đợt → mua lô → đặt tòa → khách tới" (mục đích của Bước 4 thế giới mở) chưa thông. Chủ dự án chốt (11/10/2026) **tách thành change riêng** thay vì nhồi vào `open-world-land-reclamation`.

## Mục tiêu

- Đặt, mở tòa phụ (xôi, quán nước, ăn vặt) và dời tòa lên lô W1–W4 đã mua, local và co-op cùng kết quả.
- Lô đợt mới có hình học đủ chứa mẫu tòa (chốt kích thước ở design), mặt tiền theo đường của đợt (chính/nam).
- Tile map, va chạm, đường đi khách, renderer và minimap/biển lô vẽ đúng tòa trên lô mới.
- Khách tới tòa đặt trên lô mới theo hệ số vị trí (D5 của land-reclamation) — đã có sẵn ở `buildingParcelTrafficMultiplier`, cần kiểm thật.
- Giữ nguyên hành vi W0: golden/test cũ không đổi.

## Ngoài phạm vi

- Dời tiệm chính; loại tòa mới; thêm tòa cùng loại (nhiều quán nước).
- Cân bằng giá/khách (provisional như land-reclamation); tòa lớn ghép nhiều lô.
- Thuê đất/giá đất động (`open-world-land-lease`), co-op khóa lô (`open-world-coop-land`).

## Phụ thuộc

`open-world-land-reclamation` (khai hoang, mua lô, bảng Thành phố — đã có code); `open-world-building-relocation` (đã có code).

## Tiêu chí hoàn tất

Trong trình duyệt: mở W1, mua `w1-corner`, mở quán nước ở đó (UI "Mở đất"), thấy tòa trên bản đồ, khách tới và có doanh thu; lưu/nạp giữ nguyên; `yarn typecheck`, `yarn test`, `yarn build` PASS; co-op/server replay `buy_plot` kèm `placement` trên lô mới.
