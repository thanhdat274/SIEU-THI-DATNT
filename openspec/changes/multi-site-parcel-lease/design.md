# Design: Nhiều cơ sở trên lô đất thuê

## D1. Cơ sở (`Site`)

```ts
interface Site {
  siteId: string;              // = instanceId của BuildingInstance (building-types)
  parcelId: string;            // lô gắn cơ sở, duy nhất: một lô tối đa một cơ sở
  openedDay: number;
  openedBy: string;            // accountId
}
```

- `siteId` dùng lại `instanceId` — không thêm định danh thứ hai. Cơ sở = tòa + lô + kho đệm.
- `open_site { parcelId, typeId, opId }` hợp lệ khi lô có `ParcelTenure` (owned hoặc leased), lô chưa có cơ sở, lô không `closedForRent`, đủ cấp/tiền theo `BuildingTypeDef`. Bên trong gọi `open_building` của building-types rồi gắn `parcelId`; trừ tiền một lần, idempotent theo `opId`.
- Save cũ: 4 tòa `main/xoi/drink/snack` thành cơ sở trên lô tiệm chính, **không có kho đệm riêng** — dùng thẳng kho tổng như hiện nay (giữ hành vi "tòa trong 30 ô" của building-types D6).

## D2. Kho đệm (`siteBuffer`) và kho tổng

- Kho tổng = kho hiện có của tiệm chính (giống `branch-chain`/building-types: một kho chung). Luôn nối với mọi cơ sở; không có trạng thái ngắt.
- Mỗi cơ sở ngoài lô tiệm chính có `siteBuffer: InventoryLot[]` (cùng cấu trúc lô hàng, có hạn dùng, giá vốn), sức chứa `bufferCapacity` theo `BuildingTypeDef` (số tạm, ví dụ quán nước 60 đơn vị).
- Kệ/tủ của cơ sở **chỉ châm từ kho đệm của chính cơ sở**. Không châm chéo giữa cơ sở.
- Chuyển hàng:
  - Kho tổng → kho đệm: tạo `internal_delivery` (D6 building-types). Khi chuyến tới nơi, lô hàng vào kho đệm. Bị từ chối nếu kho tổng thiếu hoặc kho đệm không đủ chỗ (tính cả hàng đang chuyển tới).
  - Kho đệm → kho tổng: cũng là `internal_delivery`, chiều ngược. Đây là thao tác "rút kho" duy nhất; không có lệnh xóa hàng.
- FEFO và giá vốn theo lô giữ nguyên khi chuyển (giống spec `central-warehouse` của branch-chain).
- Sổ: mỗi chuyến ghi `internal_transfer` (sổ do coop-contracts định nghĩa), không phát sinh doanh thu/chi phí; hàng hết hạn trong kho đệm ghi hao hụt theo `siteId`.

## D3. Kệ/tủ gắn lô

- `FixturePlacement.parcelId` bắt buộc với cơ sở ngoài lô tiệm chính; mọi ô của nội thất phải nằm trong lô.
- Kéo/dời kệ chỉ trong lô. Muốn chuyển kệ sang lô khác: cất về kho đồ rồi đặt lại (luật hiện có), hoặc dời cả tòa (`open-world-building-relocation`).

## D4. Trả lô và lô bị đóng do nợ

- `end_lease` bị từ chối nếu lô còn: cơ sở đang mở có nội thất, hàng trong `siteBuffer`, hoặc chuyến `internal_delivery` đang chạy tới/từ cơ sở. Lỗi trả về danh sách việc cần dọn.
- Thứ tự dọn: chuyển kho đệm về kho tổng → cất kệ → đóng cơ sở (`close_site`, chỉ gỡ tòa khỏi lô, không hoàn tiền) → `end_lease`.
- Lô `closedForRent` (land-lease): cơ sở đóng cửa, không có khách, kệ và kho đệm giữ nguyên, **vẫn chuyển kho về kho tổng được** (để người chơi cứu hàng sắp hết hạn). Không cho chuyển hàng **vào**.

## D5. Quyền co-op

- Mọi thành viên trong phòng ra được mọi lệnh cơ sở: `open_site`, `close_site`, chuyển kho hai chiều, đặt/dời kệ, `end_lease`, và các lệnh bán/phá khi change sau thêm.
- **Không khóa khi chủ phòng vắng**. Không có vai trò, không bỏ phiếu.
- `managerAccountId` (coop-contracts) chỉ là nhãn hiển thị trên biển cơ sở; `world.settings.nonManagerActions` mặc định = tất cả. Change này không đổi cơ chế đó, chỉ đặt mặc định.
- Mọi lệnh cơ sở ghi `SiteLogEntry { day, minute, actorAccountId, action, detail }`, giữ 200 dòng gần nhất mỗi cơ sở; hiện trong bảng cơ sở.
- Server kiểm tính hợp lệ (D1–D4), không kiểm vai trò.

## D6. Phần trùng với change khác

| Chủ đề | Change sở hữu | Change này làm gì |
|---|---|---|
| Loại tòa, `BuildingInstance`, `open_building` | `open-world-building-types` | Gọi lại; `siteId = instanceId` |
| `internal_delivery` (chuyến, thời gian, trạng thái đang chuyển) | `open-world-building-types` D6 — **phiên khác đang làm** | Chỉ dùng như hộp đen: tạo chuyến, nhận sự kiện tới nơi. Thêm chiều ngược kho đệm → kho tổng; nếu D6 chưa hỗ trợ chiều ngược thì phải thống nhất với phiên đó, không tự viết lại |
| Kho tổng, FEFO, giá vốn khi chuyển | `branch-chain` (`central-warehouse`), đã gộp vào building-types | Dùng lại luật; thêm kho đệm làm đích thay cho "kệ chi nhánh" |
| Bản đồ riêng chi nhánh, chạy nền theo ngày | `branch-chain` (đã bỏ) | Không dùng |
| Sổ cái theo tòa | building-types D5 | Dùng `buildingInstanceId` = `siteId` |
| Sổ `internal_transfer`, `managerAccountId`, `nonManagerActions` | `open-world-coop-contracts` | Đặt mặc định mở hết; ghi nhật ký riêng |
| Thuê lô, nợ thuê, `end_lease` | `open-world-land-lease` | Thêm điều kiện dọn trước cho `end_lease` |

## D7. Schema

- Thêm `sites: Site[]`, `siteBuffers: Record<siteId, InventoryLot[]>`, `siteLogs` vào save, cùng đợt schema kế tiếp sau schema 10 của land-lease. Trường tùy chọn: save thiếu thì coi như rỗng — không cần migration dữ liệu.

## Câu hỏi còn mở

- Sức chứa kho đệm và số cơ sở tối đa theo cấp (số tạm, chốt bằng mô phỏng).
- Nhân viên có tự tạo chuyến bổ sung kho đệm khi xuống ngưỡng không — phụ thuộc thiết kế nhân viên của `internal_delivery` (phiên khác).
