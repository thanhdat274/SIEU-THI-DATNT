# Design

## D1 — Vị trí: dùng khe x=21..26, không nới bản đồ

Khe giữa cánh đông tiệm chính (tối đa x=21) và quán nước (x=26..35) rộng 4 ô sàn. Ý tưởng ban đầu là nới bản đồ sang đông (x=36..42), nhưng làm vậy phải đụng đường, giao thông và khu phố nền. Khe sẵn có đủ cho tòa "bé" 4×6, và cơ chế mở rộng bắc làm phần nâng cấp. Tường x=21 thuộc `main` và x=26 thuộc `drink` vì `buildingAt` xét theo thứ tự `BUILDINGS`, giống tường x=6 của tiệm xôi. Hàng rào y=10 nhường mặt tiền (`isFenceTile`).

## D2 — Khớp với các điểm chạm của tòa phụ

`buildings.ts`, `land.ts`, `map.ts`, `store-layout.ts`, `shelter.ts`, `simulation.ts` (mái hiên, tự bày kệ), `customers.ts` (dòng khách đã chung theo `BUILDINGS`), `viewport.ts` (tường, biển, mặt tiền), `shop-lighting.ts`, `StoreLayoutModal`, `StorePlanogramModal`/`App.tsx`, `StaffBuilding` (chỉ mở rộng kiểu).

## D3 — Liên kết

Gọi thêm dùng cơ chế sẵn có (`DINING_ADD_ON_RULES`), món gọi thêm lấy thẳng từ kho. Cụm ẩm thực đếm tòa phụ đang mở từ `tileMap.buildings`, nhân vào nhịp của các dòng khách tòa phụ (tiệm chính giữ nhịp cũ); bảng `[1, 1, 1.1, 1.2]`.

## D4 — Rủi ro đã thấy

Sprite trạm 1×1 rộng 2 ô nên các trạm cạnh nhau chồng lên nhau (giống tiệm xôi hiện tại). Test cũ có giả định khe x=22..25 trống (`shelter.test`, `buildings.test`) đã sửa theo hình học mới.
