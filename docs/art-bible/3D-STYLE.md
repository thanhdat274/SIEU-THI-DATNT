# Phong cách 3D — "pastel đồ chơi"

Ngày chốt: 21/10/2026 (Giai đoạn 4, bước 4.1). Thay `docs/ART-BIBLE.md` (của thời pixel 2D) cho mọi thứ vẽ trong renderer 3D.
Nguồn chân lý trong code: bảng màu `packages/game-data/src/style-palette.ts`, quy tắc và kiểm tra `packages/game-renderer-3d/src/style-spec.ts`, tỉ lệ `packages/game-renderer-3d/src/scale-spec.ts`.
Ảnh bảng màu: [3d-palette.svg](3d-palette.svg) (sinh từ chính bảng màu).

## 1. Hướng

Cảm giác khi nhìn: **thị trấn đồ chơi ấm áp** (tinh thần Cafeland), dễ đọc ở khoảng cách camera xa, chi tiết đủ để thấy "có người sống và buôn bán" khi zoom gần. Không cố giống thật, không pixel, không phô trương.

## 2. Năm nguyên tắc

1. **Khối đơn giản, chi tiết bằng phụ kiện.** Hình chính là khối hộp/trụ sạch; sự phong phú đến từ phào, khung, bậu, biển, đồ trưng, không từ đa giác nhỏ.
2. **Màu phẳng, không texture.** Chỉ biển hiệu (chữ) và atlas nhân vật có ảnh. Vật liệu dựng bằng code đều không bóng (specular đen).
3. **Bảng màu hạn chế, dùng theo token.** Một màu mới là một quyết định, không phải một dòng hex.
4. **Pastel vừa phải.** Sáng, ấm, bão hòa vừa; có điểm nhấn (đỏ cà chua, vàng nắng, xanh lá) nhưng không chói.
5. **Bóng mềm, không viền.** Phân khối bằng ánh sáng và bóng đổ của cảnh (`sky-3d`), không vẽ viền đen.

## 3. Bảng màu

| Nhóm | Token → hex | Dùng cho |
|---|---|---|
| Trung tính ấm | `white #fbf6ea`, `cream #f6ead2`, `butter #f4dc9a`, `sand #e6cfa3`, `stone #cbc5b6`, `slate #5f6b77`, `charcoal #3a4048` | Tường, sàn, mặt quầy, chữ trên nền tối, thiết bị tối |
| Gỗ | `oak #c99d6a`, `walnut #94704c`, `bark #74543b`, `cocoa #5e4632` | Kệ, quầy, bàn, khung, bậu |
| Kim loại và kính | `steel #b3bec5`, `steelDark #7f8c95`, `ice #dfeaf0`, `sky #a9d6ec` | Khung kim loại, thân tủ lạnh, kính |
| Màu nhấn | `tomato #e47467`, `terracotta #d9795f`, `peach #f3c5a9`, `mint #a9dcbc`, `leaf #72b07e`, `forest #3f7a54`, `sun #f2c168` | Mái hiên, mái, biển, cây, nhấn theo loại tòa |

Quy tắc đã có test (`style-spec.test.ts`):
- **Pastel (HSV):** bão hòa ≤ 0,62; màu có sắc (bão hòa > 0,2) không được tối hơn giá trị 0,35. Đỏ thuần, xanh rất tối bị từ chối.
- **Bảng gọn:** 20 đến 28 token, không hai token trùng màu.
- **Chữ biển:** tương phản WCAG ≥ 4,5 giữa nền và chữ. Tạp hóa hiện đạt 4,72:1 (mái hiên 2,78:1, mái/tường 2,57:1).
- **Mái hiên:** hai màu sọc tách nhau (tương phản ≥ 1,5); mái tách khỏi tường (≥ 1,3).

### Tòa tạp hóa (khuôn mẫu)

| Vai trò | Token |
|---|---|
| Tường | `cream` |
| Mái | `terracotta` |
| Mái hiên (hai sọc) | `tomato` + `white` |
| Biển (nền / chữ) | `forest` / `white` |
| Kệ gỗ (khung / vách tối / lưng) | `walnut` / `cocoa` / `bark` |
| Kệ kính (khung / kính) | `steel`, `steelDark` / `ice` |
| Tủ lạnh (thân / kính / nắp) | `ice` / `sky` / `steelDark` |
| Quầy (thân / mặt / máy tính tiền) | `walnut` / `sand` / `charcoal` |

## 4. Vật liệu

- Mọi vật liệu dựng bằng code: màu khuếch tán từ token, **specular đen**, không texture.
- Kính: trong suốt cố định (kệ kính dùng 0,5 cho lưng và 0,32 cho vách), không phản chiếu.
- Tự phát sáng: chỉ cho thứ thật sự phát sáng (kính tủ mát, cửa sổ ban đêm, đèn), hệ số `EMISSIVE_SCALE = 0,6`.
- Biển hiệu: chữ vẽ lên canvas (phông VT323 / Be Vietnam Pro), luôn đủ tương phản.

## 5. Tỉ lệ

Mốc chuẩn **D = 1,6** đơn vị thế giới (chiều cao cửa tiệm). Người lớn 0,8·D, xe máy dài 0,95·D, sedan dài 2·D, đèn đường 1,7·D, kệ gondola cao 0,75·D, quầy cao 0,45·D, tủ lạnh cao 0,9·D… Chi tiết đầy đủ ở `scale-spec.ts`; mọi asset mới phải khai báo kích thước ở đó, không hard-code.

## 6. Ngân sách chi tiết

Một tòa ≤ **60 mục vẽ** (một mesh hoặc một nhóm thin instances). Vượt thì gộp mesh/dùng instances trước khi thêm chi tiết. Hằng số: `DETAIL_BUDGET` trong `style-spec.ts`. Kiểm số mục vẽ là một phần việc của các bước 4.3, 4.4, 4.6.

## 7. Quy tắc trong code

```ts
import { PALETTE } from '@game/data';              // hoặc từ './style-spec'
box.material.diffuseColor = Color3.FromHexString(PALETTE.walnut);   // đúng
box.material.diffuseColor = Color3.FromHexString('#8a5a38');        // sai: hex rời
```

- Màu theo **vai trò** (ví dụ `GROCERY_FIXTURE_COLORS.shelfWood`) trỏ về token; đổi diện mạo = đổi một chỗ.
- Cần màu mới: thêm token vào `style-palette.ts` kèm lý do trong tài liệu này; test pastel và test "không hex lạ" tự chạy.
- Không thêm màu chỉ để "trông khác"; ưu tiên dùng lại token gần nhất.

## 8. Phạm vi đã áp dụng (cập nhật khi mở rộng)

| Đã chuyển sang token | Chưa chuyển (còn hex rời, sẽ chuyển khi từng loại được làm sâu) |
|---|---|
| `BUILDING_VISUALS.grocery_main` (tường, mái, mái hiên, biển) | Các tòa khác trong `BUILDING_VISUALS` (xôi, nước, ăn vặt, chi nhánh, cà phê, quán cơm, civic) |
| Kệ gỗ, kệ kính, tủ lạnh, quầy dựng bằng khối (`fixture-shapes`) | Bàn, bếp, đồ trang trí, kệ kho và pallet (`fixture-shapes`) |
| | Xe (`box-car`, `car-models`, `motorbike-factory`), nhân vật, ô che mưa, đồ ngoài phố, bản đồ (`GROUND_COLORS`), lớp phủ giao diện (`overlay-3d`), cửa sổ phát sáng đêm |

Lúc chốt còn 112 dòng có hex rời trong `packages/game-renderer-3d/src` (không tính test và `style-spec`), nằm ở các mục bên phải. Chúng chuyển dần theo từng giai đoạn, không đổi hàng loạt.

## 9. Bộ kit và studio chụp (bước 4.2)

Bộ kit `packages/game-renderer-3d/src/kit/` là các mảnh chi tiết dựng từ khối, dùng lại cho mọi tòa: **khung cửa, cánh cửa kính, cửa sổ (có bậu), phào chân tường, phào trần, trụ góc**. Kích thước chuẩn ở `SCALE_TARGETS.kit` (`scale-spec.ts`), màu theo vai trò ở `KIT_COLORS` (`style-spec.ts`). Mỗi mảnh ≤ 12 khối.

Quy ước hệ cục bộ của mảnh: x ngang (căn giữa), y lên từ 0 ở đáy mảnh, **+z là mặt trước** (hướng ra phố), mặt phẳng tường ở z = 0. `bounds` luôn tính từ chính danh sách khối.

**Studio** (`studio-3d.ts`) chụp một danh sách khối bất kỳ ra PNG nền trong suốt ở ba góc: `iso` (như camera game), `top` (x sang phải, z xuống dưới), `front` (nhìn thẳng vào mặt trước). Studio dùng **hệ tay phải như cảnh game**; hệ tay trái sẽ làm ảnh bị lật gương theo x. Ảnh tham chiếu: [3d-kit-4.2.jpg](3d-kit-4.2.jpg).

## 10. Registry dựng tòa và vỏ ngoài tạp hóa (bước 4.3)

- **Registry** (`building-registry.ts`): `EXTERIOR_BUILDERS[typeId]` là builder vỏ ngoài của một loại tòa. `map-builder` có **một điểm móc**: loại tòa có builder thì dùng, không có thì chạy đường dựng chung cũ (tiệm xôi, quán nước... chưa đổi). Thêm loại tòa mới = thêm một file builder và một dòng ở registry.
- **`KitBatch`** (`kit/batch.ts`): gom khối của nhiều mảnh theo (vai trò, màu, độ đục) thành thin instances; số mục vẽ tăng theo số loại vật liệu, không theo số chi tiết. Vật liệu riêng từng tòa.
- **Vai trò khối** quyết định phản ứng với bóc mái và đêm: `facade` (mờ về 0,25 khi vào trong), `roof` (ẩn cùng mái), `glass` (kính trong suốt cố định, **không** nằm trong danh sách mờ vì sẽ bị ghi đè độ đục), `glow` (ô sáng, chỉ hiện ban đêm), `plain` (luôn hiện).
- **Hợp đồng với bóc mái/chọn tòa/đèn đêm:** mọi mesh có `metadata.buildingId`; vật liệu mái và mặt tiền riêng từng tòa; ô sáng đăng ký vào danh sách phát sáng đêm. Có test tích hợp trên `buildCityMap`.
- **Tạp hóa v1:** tường mặt tiền hai tông có lanh tô, khung cửa + cánh cửa kính (cửa đôi khi cửa dài 2 ô), cửa sổ có bậu cách một ô, phào chân tường + phào trần, hai trụ góc, mái hiên sọc có diềm, biển hiệu có khung và hai đèn rọi, lan can/điều hòa/bồn nước trên mái, thùng rau củ, biển quảng cáo và chậu cây trước tiệm.
- **Số mục vẽ (đo trong game, tòa tạp hóa không tính kho):** 6 mesh (25 instance) → **28 mesh (165 instance)**, ngân sách 60. Ảnh: [ngày](3d-grocery-exterior-4.3-day.jpg), [đêm](3d-grocery-exterior-4.3-night.jpg).
- **Chưa làm:** biển MỞ/ĐÓNG theo trạng thái tiệm (cần cập nhật động), cánh cửa mở khi có khách.

## 11. Vỏ trong tạp hóa (bước 4.4)

- **Dựng lười:** `InteriorManager` (`interior-manager.ts`) hỏi hàm thuần `decideInterior` mỗi khung hình: **dựng** khi camera cách tâm phòng ≤ 20 ô hoặc mái đã bóc; **hiện** chỉ khi mái đang mờ (độ đục < 0,999); **giải phóng** (mesh và vật liệu) khi mái đậy và camera xa hơn 36 ô. Hai bán kính khác nhau để không dựng/hủy liên tục. Dựng lỗi chỉ cảnh báo một lần, không thử lại.
- **Vị trí theo ô thật:** builder nhận danh sách ô sàn, hàm hỏi ô tường và ô cửa từ bản đồ (không dùng hộp bao tòa vì nó gồm cả vùng mở rộng chưa lát sàn). `wallFaces` gộp mặt tường nhìn vào phòng thành đoạn liên tiếp.
- **Tạp hóa v1:** sàn lát hai tông xen kẽ (khe vữa lộ nền), dải chân tường bạc hà (`interiorWainscot`) kèm phào chân trắng, áp phích (3 biến thể) trên tường sau và tường phải, bảng giá trên tường trái, xà ngang tựa vào hai tường với đèn thả cao hơn đầu người (1,28) và dưới trần, bóng đèn chỉ sáng ban đêm, thảm cửa ở ngưỡng cửa. Không đặt đồ trang trí trên tường phía cửa (có cửa và quầy thu ngân).
- **Số mục vẽ (đo trong game):** **14 mesh**, chỉ khi camera gần; **0 mesh** khi camera xa 60 ô; ở 25 ô (giữa hai bán kính) giữ nguyên trạng thái trước đó. Ảnh: [sáng](3d-grocery-interior-4.4-day.jpg), [đêm](3d-grocery-interior-4.4-night.jpg).
- **Chưa làm:** chữ trên bảng giá, áp phích có hình thật, đèn trần không dây (xà chỉ nối được khi hai đầu có tường).

## 12. Checklist cho một asset mới

- [ ] Kích thước khai báo ở `scale-spec.ts`, hộp bao có test nằm trong chân diện/mặt tiền.
- [ ] Mọi màu là token (hoặc vai trò trỏ về token), vật liệu không bóng.
- [ ] Nếu là tòa/nội thất: gắn `metadata.buildingId`, tham gia bóc mái (`roof-fade`) và đèn đêm khi cần.
- [ ] Chụp ảnh bằng studio (ba góc) và ngày/đêm/mưa trong game; so cạnh các asset đã khóa.
- [ ] Số mục vẽ trong ngân sách (đo bằng số mesh có `metadata.buildingId` của tòa).
