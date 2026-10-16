# Design: civic-city-goals (Mục tiêu thành phố + Sổ góp xóm)

## D1. Mục tiêu thành phố
- Điều kiện mới tính từ save (công trình, `civic.populationByDistrict`, QoL dẫn xuất) — giữ nguyên tắc "mục tiêu tính từ dữ liệu sẵn có".
- `CITY_GOALS_CATALOG` cấp 4–10, mỗi cấp tối đa 1 mục tiêu xóm phố để không chặn người chơi chỉ thích kinh doanh.
- Thưởng của mục tiêu xóm phố = *hiện* trang sổ góp (`revealBundleId`), không mở công trình trực tiếp.
- Save đã qua cấp: không hồi tố; trang sổ của các cấp đã qua hiện ngay khi tải.

## D2. Dữ liệu sổ
`game-data/world/civic-bundles.ts`:
```ts
export interface BundleSlotDef {
  id: string;
  label: string;                       // "Thuốc men cơ bản"
  kind: 'goods' | 'cash';
  acceptedProductIds?: string[];       // goods: nhận 1 trong các loại (chốt 1)
  quantity?: number;                   // goods
  amount?: number;                     // cash
}
export interface CivicBundleDef {
  id: string;                          // 'bundle_clinic'
  buildingTypeId: BuildingTypeId;      // công trình được mở
  revealedByCityLevel: number;
  slots: BundleSlotDef[];              // 3–4 ô, đúng 1 ô cash
  buildCostDiscount: number;           // 0–1, giảm phí xây khi hoàn thành
}
```
`validateCivicBundles()`: id duy nhất; mọi `acceptedProductIds` tồn tại trong catalog; mỗi sổ đúng 1 ô `cash`; **mọi** ô goods có ≥ 2 loại thay thế (chốt 16/10/2026).

Ví dụ trang trạm y tế: dầu gió/bông băng ×10, sữa hộp ×20, cháo hoặc xôi ×15, quỹ 2.000.000đ.

## D3. Lệnh `donate_to_bundle`
`{ bundleId, slotId, productId?, quantity?, amount? }`
- Từ chối nếu trang chưa hiện, đã xong, ô đã đủ, sản phẩm không thuộc `acceptedProductIds`, kho không đủ, hoặc lô hàng còn hạn < `BUNDLE_MIN_SHELF_DAYS` (= 1, đã chốt).
- Góp vượt số còn thiếu → chỉ nhận phần thiếu.
- Trừ kho theo FIFO (cùng hàm trừ kho khi bán); ô cash trừ quỹ chung.
- Ghi `LedgerEntry` loại `civic_donation` với giá vốn của hàng (để báo cáo lãi lỗ thấy chi phí thật), `bundleId`, `slotId`.
- Ghi `contributions[]` theo `playerId` (chỉ để hiển thị/thành tích, không ví riêng).
- Server-authoritative, tất định; replay cho cùng kết quả.

## D4. Hoàn thành
Khi mọi ô đủ trong cùng lệnh: đánh dấu `completedDay`, mở `buildingTypeId` cho `open_building` với phí × (1 − `buildCostDiscount`), đẩy thông báo khánh thành + mốc vào nhật ký thành phố (`city-journal.ts`).
Công trình loại `civic` từ change 1 đổi điều kiện mở: từ `minCityLevel` sang "sổ tương ứng đã hoàn thành". Change 1 vẫn dùng `minCityLevel` cho tới khi change này vào.

## D5. Save
```ts
civic?: {
  populationByDistrict: ...;           // change 2
  bundles?: Record<string, {
    slots: Record<string, number>;     // số đã góp (hàng: đơn vị, cash: đồng)
    contributions: { playerId: string; slotId: string; qty: number; day: number }[];
    completedDay?: number;
  }>;
}
```
Tùy chọn ⇒ save cũ hợp lệ; số schema theo thứ tự merge. Trang "đã hiện" dẫn xuất từ cấp thành phố, không lưu.

## D6. UI
Tab "Sổ góp xóm": lưới thẻ trang (khóa / đang góp / xong). Mở trang → các ô với icon hàng, thanh tiến độ, "đang có trong kho: N". Chạm ô → bảng chọn loại + số lượng (nút +/−, "góp tối đa"). Hiển thị ai đã góp. Vùng chạm ≥ 44px, QA 7 viewport.

## D7. Cân bằng
- Giá trị hàng + tiền mỗi trang ≈ 1–2 ngày lãi trung bình ở cấp hiện trang (đo bằng `economy-qa-sweep.ts`).
- `simulateGoalProgression` 60–90 ngày: cấp 10 không chậm hơn quá 20% so với trước.
- Sweep kiểm tra không trang nào cần hàng chỉ có ở một mùa mà không có thay thế.

## D8. Co-op (bổ sung 16/10/2026)
- **Quyền góp hàng**: mọi thành viên được góp hàng (kho chung, giá trị nhỏ) — không cần phiếu.
- **Ô Quỹ xây dựng**: số tiền góp một lần > 30% quỹ → phiếu chi lớn `land-vote.ts`; member có `memberLandPermissions = 'none'` không góp tiền được.
- **Góp cùng lúc**: server xử lý theo thứ tự; lệnh sau chỉ được nhận phần còn thiếu, ô đủ rồi thì từ chối "Ô này vừa được góp đủ".
- **Kho bị tranh**: trừ kho nguyên tử ở server cùng lượt với bán/châm hàng; không đủ hàng tại thời điểm xử lý → từ chối, không trừ một phần ngầm.
- **Ghi công**: `contributions[].playerId` lấy từ phiên server. Thành tích "người góp nhiều nhất" theo người, tiền vẫn là quỹ chung.
- **Nhận thưởng mục tiêu**: dùng `claim_city_goal` có sẵn (ai nhận cũng được, chỉ nhận một lần).
- **Khánh thành**: phát thông báo cho cả hai; người offline thấy trong nhật ký thành phố.
