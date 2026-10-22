# Đặc tả: Đa dạng ngoại hình và nghề nghiệp nhân vật 3D

Ngày: 22/10/2026  
Trạng thái: Được người dùng duyệt hướng kết hợp và chọn chiến lược B (Risk First / Spike First); TASK-001 đã xác minh nguồn role, đang triển khai registry và prototype người bán hàng rong  
Phạm vi: nhân vật 3D/NPC trong `packages/game-renderer-3d` và gallery DEV.

## Mục tiêu

Tăng độ đa dạng dễ đọc của con người trong game: phân bố ngoại hình nam/nữ không lệch ngẫu nhiên, người chơi/co-op/NPC nhìn không như lặp một bộ mẫu, và nghề/vai trò có dấu hiệu 3D riêng. Giữ nền phong cách low-poly hoạt hình không pixel, hình khối mềm, màu và tỉ lệ đồng bộ. Bắt đầu bằng 12 model Kenney hiện có; chỉ tạo/thêm GLB khi một vai trò không thể phân biệt đủ bằng model nền, trang phục hoặc phụ kiện.

## Hiện trạng đã khảo sát

- `CHARACTER_CATALOG` có 12 GLB: sáu asset có presentation nữ và sáu có presentation nam; đây là thư viện gallery hiện tại, không phải toàn bộ số nghề hoặc loại NPC trong thế giới.
- `characterModelForPlayer()` luôn chọn `character_female_a`, `characterModelForPartner()` chọn `character_male_a`, giao nhận chọn `character_male_c`. Khách, nhân viên, người đi bộ và cư dân gọi `characterModelForId(id, seed)`, dùng hash modulo danh sách 12, nên tính ổn định theo ID có nhưng không có hợp đồng cân bằng hoặc gắn trang phục theo nghề.
- `NeighborhoodLife` có `type` và `accessory` cho cư dân (`student`, `elder`, `office_worker`, `vendor`, v.v.); người đi đường có `activity`; staff có `role`; customer hiện không có nghề, chỉ có `stage`, `regularId`, `thief` và building context. `Characters3D` trước đây chỉ dùng accessory cư dân để chọn nón lá, cùng ô mưa/thùng giao nhận; chưa có wardrobe/job archetype tổng quát.
- Renderer đã đổi texture sampling nhân vật sang bilinear ở lát cắt trước. Game-core có các role nhân viên như thu ngân, tiếp hàng, bảo vệ, nhân viên quán nước; không sửa các quy tắc mô phỏng/save trong đặc tả này.

## Thiết kế đã duyệt

Hướng kết hợp theo từng bước nhỏ:

1. **Cân bằng nền model:** catalog ghi rõ presentation/nhóm ngoại hình; chọn mẫu tất định theo ID/seed và đảm bảo nhóm ID có quy luật không dồn vào cùng vài mẫu. Player/co-op vẫn là nhân vật cố định, có thể đổi lựa chọn ngoại hình ở bước sau khi có UI; lát cắt này không thêm màn hình tùy chỉnh.
2. **Nhận diện nghề:** thêm registry thuần `role/archetype -> outfit/accessory/color tokens`. Renderer tra vai trò sẵn có từ snapshot nhân vật; không suy nghề từ tên model hoặc chuỗi ID. Dùng phụ kiện/model phần rời được cache và tái sử dụng, không tạo mesh/material mỗi frame.
3. **Mở rộng thư viện có căn cứ:** gallery hiển thị đủ 12 base model, chia nhóm ngoại hình và biến thể nghề; chỉ bổ sung model mới hoặc trang phục mới sau khi thấy role còn trùng lẫn trong cảnh thật.
4. **Thẩm định theo lát cắt:** kiểm gallery và runtime cùng model/tỉ lệ 1,28m; xác nhận vai trò hiển thị đúng, không ảnh hưởng hoạt ảnh/mưa/che mái, so FPS và draw calls khi có nhiều NPC. Cập nhật tài liệu hiện trạng bằng kết quả thực đã chạy.

Nhóm nghề đầu tiên: player/co-op, khách, thu ngân/tiếp hàng/bảo vệ/nhân viên quán, giao nhận, người bán hàng rong, học sinh, trẻ em, người lớn tuổi, nhân viên văn phòng, cư dân/người đi bộ. TASK-001 xác nhận nguồn: `StaffMember.role`; `NeighborNpcView.type/accessory`; `StreetPedestrianState.activity`; logistics active worker; khách là archetype chung. Chỉ tạo diện mạo cho các nhóm có dữ liệu role thật; customer không được gán nghề giả.

## Hợp đồng renderer đề xuất

```text
CharacterAppearanceSpec {
  modelKind: CharacterModelKind;  // model nền, giữ ổn định theo ID/seed
  presentation: 'feminine' | 'masculine' | 'neutral';
  archetype: CharacterArchetype;  // role đã chuẩn hóa, không phải chuỗi tùy ý
  outfitId: string;               // khóa wardrobe ổn định
  accessoryIds: readonly string[];
}

resolveCharacterAppearance(input: CharacterAppearanceInput): CharacterAppearanceSpec
  - pure/deterministic: cùng ID, role, seed -> cùng kết quả
  - fallback: role chưa ánh xạ -> outfit casual trung tính + model nền
  - no per-frame allocation: kết quả cache/resolve khi instance tạo hoặc đổi role
```

Tên type/interface là hợp đồng thiết kế, được phép đổi để khớp quy ước code trước khi triển khai. Presentation là phân nhóm tạo hình tài sản, không dùng để suy ra giới tính/đặc tính gameplay.

## Giới hạn/phần ngoài phạm vi

- Không đổi xác suất spawn NPC, nghề, dân số, lịch, hội thoại, phục vụ, doanh thu, save hoặc mạng.
- Không thay toàn bộ 12 GLB ngay trong một đợt; không thêm asset lấy từ nguồn ngoài nếu chưa kiểm giấy phép và phong cách.
- Không hứa mọi nghề có mesh riêng: giai đoạn đầu dùng outfit/accessory 3D có kiểm soát; role cần silhouette khác rõ sẽ thành gói model mới riêng.
- Không thay xe, công trình, nội thất, HUD hoặc phong cách toàn scene.

## Tiêu chí nghiệm thu cuối hướng

- Gallery thể hiện rõ 12 model nền (6/6 theo presentation đã gán), có tên role/archetype cho các ví dụ nghề và tỉ lệ đúng 1,28m.
- Với cùng input resolver cho kết quả giống nhau qua lần chạy; danh sách ID tuần tự không lặp một mẫu cùng presentation liên tiếp quá mức được xác định ở task test.
- Các role được hỗ trợ có wardrobe/accessory distinct, thống nhất token màu và kích thước; role chưa hỗ trợ dùng fallback casual ổn định.
- Phụ kiện được cache/tái sử dụng; không tăng tạo mesh/material ở hot path; hiệu năng được đo so baseline cùng cảnh.
- Browser QA kiểm player, nhân viên, giao nhận và NPC khu phố ở cảnh thường; cập nhật `tổng hợp.md`, `3D-STYLE.md` và plan.

## Kết quả risk spike

Renderer nhận đủ `role/type/accessory/activity` cho staff, cư dân và người đi bộ; customer không có nghề riêng. TASK-001 không cần đổi game-core. Registry đã được thêm và điểm dựng role prototype đầu tiên là `vendor` -> xe đẩy hàng 3D; các role khác hiện có metadata mapping nhưng chưa có outfit mesh riêng.
