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
  amount?: number;                     // cash — KHÔNG ghi tay, dẫn xuất (xem D7)
}
export interface CivicBundleDef {
  id: string;                          // 'bundle_clinic'
  buildingTypeId: BuildingTypeId;      // công trình được mở
  revealedByCityLevel: number;
  slots: BundleSlotDef[];              // 3–4 ô, đúng 1 ô cash
}
```
`validateCivicBundles()`: id duy nhất; mọi `acceptedProductIds` tồn tại trong catalog; mỗi sổ đúng 1 ô `cash`; **mọi** ô goods có ≥ 2 loại thay thế (chốt 16/10/2026); ô cash phải = công thức 80% (`civicBundleCashAmount`); quỹ ≥ 0; **tổng góp dự kiến (hàng + quỹ) ≤ giá xây**.

Ví dụ trang trạm y tế: dầu gió/bông băng ×10, sữa hộp ×20, cháo hoặc xôi ×15, quỹ dẫn xuất (xem D7).
> Giai đoạn 1 đã bỏ trường `buildCostDiscount` khỏi data + type (không còn dùng — thay bằng `civicOpenCost` trừ giá trị góp ở D4).

## D3. Lệnh `donate_to_bundle`
`{ bundleId, slotId, productId?, quantity?, amount? }`
- Từ chối nếu trang chưa hiện, đã xong, ô đã đủ, sản phẩm không thuộc `acceptedProductIds`, kho không đủ, hoặc lô hàng còn hạn < `BUNDLE_MIN_SHELF_DAYS` (= 1, đã chốt).
- Góp vượt số còn thiếu → chỉ nhận phần thiếu.
- Trừ kho theo FIFO (cùng hàm trừ kho khi bán); ô cash trừ quỹ chung.
- Ghi `LedgerEntry` loại `civic_donation` với giá vốn của hàng (để báo cáo lãi lỗ thấy chi phí thật), `bundleId`, `slotId`.
- Ghi `contributions[]` theo `playerId` (chỉ để hiển thị/thành tích, không ví riêng).
- Server-authoritative, tất định; replay cho cùng kết quả.

## D4. Hoàn thành
Khi mọi ô đủ trong cùng lệnh: đánh dấu `completedDay`, mở `buildingTypeId` cho `open_building` — **tòa đầu trả `max(0, giá xây − giá trị đã góp THẬT)`** (`civicOpenCost` + `bundleDonatedValue`), **tòa thứ 2+ trả giá gốc**, không âm. Mỗi contribution lưu `value` (tiền = số tiền, hàng = giá vốn FIFO); bản ghi cũ thiếu `value` → ô tiền lấy `qty`, ô hàng ước giá nhập rẻ nhất. **Không** chặn mở civic khi chưa xong sổ (giữ luật cũ). Đẩy thông báo khánh thành + mốc vào nhật ký thành phố (`city-journal.ts`) — **Giai đoạn 5 chưa làm** (`notifyBuildingOpenedViaBundle` vẫn stub rỗng).
`land-policy.ts` (phiếu mở tòa co-op) dùng chung `civicOpenCost` với giá CÒN PHẢI TRẢ (bối cảnh `bundleStates` + đếm tòa cùng loại; server bootstrap truyền từ save) — ban đầu vẫn báo giá gốc (fix xong ở Gđ 2: đã kiểm chứng).
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
- **Đã chốt (16/10/2026): tổng góp DỰ KIẾN của mỗi trang ≈ 80% giá xây** (validate chặn [75%,85%] và tổng ≤ giá xây). Ô quỹ dẫn xuất: `civicBundleCashAmount = max(0, round50k(0,8 × giá xây − giá trị hàng dự kiến))`; hàng dự kiến = Σ quantity × giá nhập món rẻ nhất trong `acceptedProductIds`. Giá xây lấy từ `CIVIC_DEFS` (không sửa).
- **Bảng 4 trang (16/10/2026, chạy thật):**
  - bundle_park: giá xây 2.500.000 / hàng 268.000 / quỹ 1.750.000 / tổng 2.018.000 = 80,7%
  - bundle_clinic: 4.000.000 / 170.000 / 3.050.000 / 3.220.000 = 80,5%
  - bundle_ward_police: 1.800.000 / 217.500 / 1.200.000 / 1.417.500 = 78,8%
  - bundle_primary_school: 3.000.000 / 260.000 / 2.150.000 / 2.410.000 = 80,3%
- `simulateGoalProgression` 60–90 ngày: cấp 10 không chậm hơn quá 20% so với trước — **chưa chạy** (Gđ 7).
- Sweep kiểm tra không trang nào cần hàng chỉ có ở một mùa mà không có thay thế — **chưa chạy**.

## D8. Co-op (bổ sung 16/10/2026)
- **Quyền góp hàng**: mọi thành viên được góp hàng (kho chung, giá trị nhỏ) — không cần phiếu.
- **Ô Quỹ xây dựng**: số tiền góp một lần > 30% quỹ → phiếu chi lớn `land-vote.ts`; member có `memberLandPermissions = 'none'` không góp tiền được.
- **Góp cùng lúc**: server xử lý theo thứ tự; lệnh sau chỉ được nhận phần còn thiếu, ô đủ rồi thì từ chối "Ô này vừa được góp đủ".
- **Kho bị tranh**: trừ kho nguyên tử ở server cùng lượt với bán/châm hàng; không đủ hàng tại thời điểm xử lý → từ chối, không trừ một phần ngầm.
- **Ghi công**: `contributions[].playerId` lấy từ phiên server. Thành tích "người góp nhiều nhất" theo người, tiền vẫn là quỹ chung.
- **Nhận thưởng mục tiêu**: dùng `claim_city_goal` có sẵn (ai nhận cũng được, chỉ nhận một lần).
- **Khánh thành**: phát thông báo cho cả hai; người offline thấy trong nhật ký thành phố.
