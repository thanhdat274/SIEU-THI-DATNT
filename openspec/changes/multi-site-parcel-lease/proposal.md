# Proposal: Nhiều cơ sở trên lô đất thuê (task 7.2 của `reference-gameplay-expansion`)

## Vì sao

Task 7.1 (`reference-gameplay-expansion/tasks.md`) đã chốt ngày 17/10/2026 cách mở rộng sang nhiều cơ sở:

1. Cơ sở mới = **thuê lô đất trống trên bản đồ chung** (không có bản đồ riêng).
2. **Kho riêng mỗi cơ sở + kho tổng nối được.**
3. Co-op: **mọi người trong phòng đều quản lý được**.
4. **Kệ/tủ gắn với lô đất.**

Khi viết 7.2, chủ dự án chốt thêm (17/10/2026):

5. **Không khóa** thao tác nguy hiểm (bán/phá tòa, trả lô, rút kho tổng) khi chủ phòng rời phòng; chỉ ghi nhật ký ai làm gì.
6. `managerAccountId` của `open-world-coop-contracts` giữ làm **nhãn**; `nonManagerActions` mặc định **cho phép tất cả**.
7. Kho tổng **luôn nối**; kho riêng chỉ là **kho đệm tại chỗ** của cơ sở (không có chế độ ngắt kết nối).
8. Trả lô thuê: **phải dọn trước** — dời kệ/tủ và chuyển hết hàng kho đệm về kho tổng, nếu không lệnh bị từ chối.

Change này gom các quyết định trên thành luật, ghép vào các change đã có, không làm lại phần của chúng.

## Mục tiêu

- Lệnh `open_site`: chọn một lô đang thuê (hoặc sở hữu) còn trống, chọn loại tòa, tạo **cơ sở** (`siteId`) gắn với lô đó.
- Mỗi cơ sở có **kho đệm** (`siteBuffer`) sức chứa theo loại tòa; kệ của cơ sở châm từ kho đệm của chính nó.
- Kho tổng (kho của tiệm chính) luôn nối với mọi cơ sở; hàng kho tổng → kho đệm đi qua `internal_delivery` (do `open-world-building-types` D6 định nghĩa). Kho đệm → kho tổng cũng qua `internal_delivery` (chiều ngược).
- Kệ/tủ có `parcelId`: chỉ đặt trong lô đó, không kéo qua lô khác; dời kệ sang lô khác = dời tòa (Bước 3 `open-world-building-relocation`).
- Co-op: mọi thành viên ra mọi lệnh của cơ sở (mở, chuyển kho, đặt kệ, trả lô, bán/phá khi có); mỗi lệnh ghi `actorAccountId` vào nhật ký cơ sở.

## Ngoài phạm vi

- Bán/phá tòa và bán lô đã mua (vẫn ngoài phạm vi theo `open-world-building-types` và `open-world-land-lease`). Change này chỉ quy định **quyền** cho các lệnh đó khi chúng có, không tạo lệnh.
- Bản đồ riêng cho chi nhánh, chạy nền theo ngày (phần cũ của `branch-chain`, đã bỏ theo `open-world-building-types`).
- Định nghĩa lại `internal_delivery`, thời gian chuyến, xe ba gác (phiên khác đang làm trong `open-world-building-types` D6).
- Khóa/vai trò theo chủ phòng, bỏ phiếu đồng ý.
- Cân bằng cuối (sức chứa kho đệm, số cơ sở tối đa là số tạm).

## Phụ thuộc

- `open-world-land-lease`: `lease_parcel`, `end_lease`, `ParcelTenure`, nợ thuê/`closedForRent` (lệnh core 2.1/2.2 và schema 10 chưa nối thật).
- `open-world-building-types`: `BuildingInstance { instanceId, typeId }`, `open_building`, sổ cái theo tòa (D5), `internal_delivery` (D6).
- `open-world-building-relocation`: dời tòa/kệ.
- `open-world-coop-contracts`: `managerAccountId`, `nonManagerActions`, sổ `internal_transfer`.

## Tiêu chí hoàn tất

- Thuê lô W1, `open_site` quán nước: tạo cơ sở gắn lô, kho đệm rỗng, idempotent qua server replay.
- Chuyển 20 chai nước kho tổng → kho đệm: hàng ở trạng thái đang chuyển rồi vào kho đệm; bảo toàn số lượng và giá vốn theo lô (FEFO); không âm kho.
- Kệ của cơ sở chỉ châm được từ kho đệm của nó; đặt kệ ra ngoài lô bị từ chối.
- `end_lease` trên lô còn kệ hoặc kho đệm còn hàng bị từ chối với lý do rõ; dọn xong thì thành công.
- Co-op 2 người, chủ phòng rời phòng: người còn lại vẫn trả lô/rút hàng được; nhật ký ghi đúng người.
- Save cũ (chưa có cơ sở) nạp không đổi hành vi; 4 tòa hiện có coi như cơ sở trên lô tiệm chính, kho đệm = kho tổng.
- `yarn typecheck`, `yarn test`, `yarn build` PASS bằng kết quả thực; Browser QA ghi riêng.
