# Nguồn quy cách đóng gói để nhập hàng

Cập nhật: 04/10/2026. Đối chiếu trang bán lẻ trực tuyến Việt Nam và trang nhà sản xuất. Mỗi mã trong game đại diện **một đơn vị bán lẻ**; `caseSize` chỉ được khai báo khi nguồn nêu số đơn vị trong thùng phù hợp với đơn vị đó. Khi chưa khớp được dung tích/bao bì cụ thể, game cho nhập lẻ để không ép người chơi mua kiện dựa trên phỏng đoán.

## Đợt thêm 200 SKU ngày 04/10/2026

Đã thêm 200 sản phẩm mới vào `products-expansion.ts`: gia vị/thực phẩm khô, nước uống/sữa, snack/kẹo, đồ giặt rửa/giấy/chăm sóc cá nhân, thực phẩm tươi/đông lạnh, đồ gia dụng/văn phòng phẩm và hàng mùa vụ. Tất cả đều **không khai báo `caseSize`**, nên nhập lẻ. Tên có dung tích/khối lượng thể hiện đơn vị bán lẻ thiết kế trong game; chưa có đối chiếu nhà sản xuất/nhà cung cấp để kết luận bao nhiêu đơn vị/thùng hoặc vỉ. Không suy rộng quy cách từ SKU có thương hiệu khác.

Giá, mức phổ biến, cấp mở khóa và hạn dùng là dữ liệu thiết kế ban đầu, chưa được playtest cân bằng. Mã sản phẩm dùng sprite dự phòng `item_<id>`; chưa tạo tranh riêng cho 200 SKU.

## Quy cách đã đối chiếu và đang áp dụng

| Mã game | Số đơn vị/thùng | Cơ sở đối chiếu |
|---|---:|---|
| `mi_hao_hao` | 30 gói | [Co.op Online – Hảo Hảo gói 75g, thùng 30](https://cooponline.vn/mi-hao-hao-tom-chua-cay-30goi-x-75g--s250100239) |
| `mi_omachi` | 30 gói | [Co.op Online – Omachi thùng 30 gói](https://cooponline.vn/products/mi-omachi-suon-ham-ngu-qua-thung-30-goi-x-80g/) |
| `mi_ba_mien` | 30 gói (mã mì gói Reeva/3 Miền) | [Co.op Online – Reeva 3 Miền thùng 30 gói](https://cooponline.vn/products/mi-reeva-3-mien-tom-chua-cay-thung-30-goi-x-65g/) |
| `mi_ly_modern_bo_ham` | 24 ly | [Co.op Online – mì ly Modern thùng 24](https://cooponline.vn/modern-brand.modern) |
| `xa_xi_chuong_duong` | 24 chai/lon | [Bách Hóa Xanh – Chương Dương thùng 24](https://www.bachhoaxanh.com/nuoc-ngot/xa-xi-chuong-duong-thung-24-lon-cao-330ml//); nguồn hiện xác nhận lon, không xác nhận đúng chai thủy tinh mô tả trong game |
| `sua_ong_tho` | 24 hộp giấy | [Co.op Online – Ông Thọ đỏ 24 × 380g](https://cooponline.vn/sua-dac-ong-tho-hop-giay-do-24-x-380g--s250515049); [Vinamilk e-shop](https://t02-eshop-vn.apps.vinamilk.tech/brands/%C3%B4ng%20th%E1%BB%8D) còn liệt kê lon thiếc quy cách 48, nên mã game được hiểu là hộp giấy theo tên/mô tả hiện tại |
| `sua_lua_mach` | 48 hộp 180ml | [Co.op Online – Milo thùng 48 × 180ml](https://cooponline.vn/products/thuc-pham-bo-sung-sua-lua-mach-milo-48x180ml/) |
| `coca_cola_lon`, `pepsi_lon`, `7up_lon`, `sprite_lon`, `mirinda_cam`, `sting_dau` | 24 lon | [Co.op Online – nhóm nước ngọt lon](https://cooponline.vn/c/nuoc-ngot); ví dụ Coca-Cola 24 lon và Pepsi 24 |
| `nuoc_suoi`, `nuoc_khoang`, `nuoc_tinh_khiet` | 24 chai | [Co.op Online – Aquafina theo dung tích](https://cooponline.vn/aquafina-brand.aquafina): chai 500ml/355ml thùng 24, nhưng 1.5L thùng 12 và 5L thùng 4; mã game chỉ ghi chai nhỏ |
| `mi_miliket_*` | 30 gói | [Co.op Online – danh mục Miliket](https://cooponline.vn/miliket-brand.miliket) có các thùng 30 gói |
| `mi_reeva_*`, `mi_3_mien_*` | 30 gói | [Co.op Online – danh mục mì 3 Miền/Reeva](https://cooponline.vn/3-mien-brand.3-mien) có các thùng 30 gói |
| `redbull_thai` | 24 lon | [Co.op Online – Red Bull Thái lon 250ml](https://cooponline.vn/products/nuoc-tang-luc-red-bull-nk-lon-250ml/) |
| `bia_333_lon`, `bia_saigon_special`, `bia_tiger_lon`, `bia_heineken_lon` | 24 lon | [333 24 lon](https://cooponline.vn/products/bia-333-thung-24-lon-330ml/), [Sài Gòn Special 24 lon](https://cooponline.vn/products/bia-sai-gon-special-thung-24-lon-330ml/), [Tiger 24 lon](https://cooponline.vn/products/bia-tiger-lon-cao-thung-24-x-330ml/), [Heineken 24 lon](https://cooponline.vn/products/bia-heineken-lon-cao-thung-24-330ml/) |

## Mã chưa gán kiện

Các món còn lại trong danh mục vẫn cho nhập đơn vị lẻ. Nguồn tìm được thường mô tả một SKU cụ thể (cỡ/khối lượng/bao bì), nhưng dữ liệu game chỉ có tên chung hoặc không khớp đơn vị bán lẻ. Ví dụ: Big Babol trên Co.op hiện là hũ 27g; ChocoPie bán hộp 12 bánh nhưng tên game không nói rõ mỗi đơn vị là bánh hay hộp; Xá Xị trong game là chai thủy tinh trong khi nguồn thùng dễ kiểm tra là lon. Gán số thùng trong những trường hợp này sẽ tạo ra “con số chính xác giả”.

Hạn chế: kiểm tra trực tuyến không chứng minh mọi đại lý/nhà sản xuất chỉ có một quy cách. Số lượng có thể thay đổi theo phiên bản, dung tích, bao bì và kênh bán. Muốn kiện chính xác đến nhà cung cấp trong game, cần thêm thuộc tính SKU/khối lượng cho sản phẩm hoặc dùng quy cách riêng theo từng nhà cung cấp.

