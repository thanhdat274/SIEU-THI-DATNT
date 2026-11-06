# Kế hoạch triển khai: Khu ăn tại chỗ trong siêu thị (đối chiếu Midnight Bistro)

> **File bàn giao cho phiên triển khai.** Người triển khai cần đọc kèm 3 tài liệu:
> 1. `PHAN-TICH-THAM-KHAO-MIDNIGHT-BISTRO.md` (mục 3 _Áp dụng_, mục 5.4, mục 6.9)
> 2. `PHU-LUC-DU-LIEU-MIDNIGHT-BISTRO.md` (mục D và F — bảng số cân chỉnh)
> 3. File này (lỗ hổng cụ thể + chuỗi GĐ).
>
> **Nguyên tắc chung (bất biến):** chỉ áp dụng *cơ chế & số liệu cân bằng*, KHÔNG chép tên/hình/câu thoại của Midnight Bistro. Viết nội dung, món, chữ theo fantasy tạp hóa → siêu thị của mình (món Việt, đồ đạc Việt). Mỗi GĐ là 1 commit nhỏ, tiếp nối GĐ số hiện tại (GĐ1488).

---

## A. Bảng đối chiếu: cơ chế Midnight Bistro ↔ code của mình ↔ lỗ hổng

| # | Cơ chế Midnight Bistro (nguồn) | Code hiện tại của mình | Hiện trạng | Lỗ hổng cần làm |
|---|---|---|---|---|
| 1 | Bàn + ghế, ghế sát bàn mới tính chỗ (2.2, 6.1) | `src/data/furniture.ts` (`FurnitureType`, `FURNITURE`) + `src/shop/buildMode.ts` | Có kệ/tủ/trạm nấu, **chưa có bàn ăn/ghế** | Thêm `dining_table` + `chair`; quy tắc ghế kề bàn = 1 chỗ |
| 2 | "Khách đói" ngồi ăn món đã nấu (2.1, 6.1) | `src/agents/customerEntity.ts` (State: walkBy/toShop/shopping/toQueue/queued/leaving) | Khách mua món rồi ra về, **chưa ai ngồi ăn** | Thêm state `toSeat`/`dining` cho khách ăn món nấu tươi |
| 3 | Kiên nhẫn 75 s + hài lòng (37 s=100%, 38–75 s=60%, quá=0)(6.1/5.2) | Không có bộ đếm hài lòng theo thời gian | — | Thêm `patience`+`satisfaction` cho khách dine-in |
| 4 | Tip = % giá × hài lòng (5.2, E2) | Chưa có tip khi bán món | — | Tip món ăn tại chỗ: 10% giá, hài lòng đủ → full, thiếu → ×0,5 |
| 5 | Máy thu phí mỗi lượt, không cần nhân viên (2.2, 6.3) | `src/data/services.ts` (topup/bills/lottery/parking/parcel) có mô hình "quầy dịch vụ thu phí" | Đã có quầy dịch vụ, **chưa có máy tự phục vụ đặt được** | Thêm furniture `machine` (bán nước, cân sức khỏe, gắp thú) theo model services.ts |
| 6 | Nhà vệ sinh 2 giai đoạn (6.4) | Chưa có toilet | — | Thêm furniture `toilet`; giai đoạn nhẹ (không phạt) → nghiêm ngặt |
| 7 | Điểm trang trí × sao (2.3, A3) | Chậu cây `plant` = "+5% khách (tối đa +25%)" trong furniture.ts | Trần cứng 25% | Bỏ trần, thay bằng decorScore kết hợp yếu tố phục vụ |
| 8 | Trang trí 3 tầng + nút Dùng thử (D6, 5.1) | 2 món decor (cây, vách) | Rất ít đồ trang trí | Thêm đồ trang trí nhiều bậc; bối cảnh "Dùng thử" |
| 9 | Sao món theo lượt bán + đổi đồ đựng (2.5, B1) | `src/data/recipes.ts` có `reputationGain`/món nhưng **không có bộ đếm lượt bán, không có sao/món, không có đồ đựng** | — | Thêm served-counter/món + bậc sao đổi đồ đựng |
| 10 | Doanh thu vắng mặt: hiệu suất 55%, trần 30+cấp×5 phút, có điều kiện (6.5) | Có hệ `bizWeeks`/ngày, chưa có offline revenue đúng nghĩa | — | Thêm offline doanh thu có điều kiện |
| 11 | Nhà phê bình ẩm thực (6.7, C1) | Chưa có | — | Sự kiện gọi món bất kỳ → thưởng / khóa sao |

---

## B. Chuỗi GĐ đề xuất (GĐ1489 → GĐ1497)

> Mỗi GĐ: một commit. Số liệu lấy từ Phụ lục F để cân chỉnh; con số của Midnight chỉ là mốc khởi đầu, có thể rút ngắn do tốc độ game của mình khác.

### GĐ1489 — Nội thất mới: Bàn ăn + Ghế (nền tảng dine-in)
- **Mục tiêu**: có thể mua & đặt bàn ăn và ghế trong tiệm.
- **Việc cần làm**:
  1. `src/data/furniture.ts`: thêm `dining_table`, `chair` vào `FurnitureType` và mảng `FURNITURE` (quy ước: bàn 4 chỗ, giá rẻ theo bậc tiệm: bàn nhựa → gỗ → mây → sắt; ghế nhựa → gỗ → tre). Thêm `seatSlots` (mỗi bàn bao nhiêu ghế kề được) vào `FurnitureDef`.
  2. `src/shop/furnitureView.ts` + `src/world/kitProps.ts`: dựng mesh 3D bàn/ghế (đơn giản, tái dùng hình hộp/thân trụ như quán nước).
  3. `buildMode.ts`: kiểu mới tự chạy qua `footprint`/`fullCheck` có sẵn — chỉ cần không bị chặn ở `fullCheck`.
- **Điều kiện chấp nhận**: mua/đặt/xoáy/dời bàn & ghế như mọi đồ khác; ghế đặt kề bàn (ô liền kề) được tính là "chỗ ngồi của bàn đó"; bấm vào bàn hiện số chỗ trống.
- **Tham chiếu**: PHÂN TÍCH 2.2; PHỤ LỤC F1 (bảng đồ đựng chỉ dùng ở GĐ1495).

### GĐ1490 — Khách "ăn tại chỗ": state dine-in
- **Mục tiêu**: khách mua món nấu tươi (category `fresh` từ trạm nấu) có xác suất **ngồi lại ăn** thay vì ra về.
- **Việc cần làm**:
  1. `src/agents/customerEntity.ts`: thêm state `toSeat` / `dining`. Khi khách mua món `fresh` nấu tươi (# đúng trọng tâm), tìm bàn có ghế trống (dùng quy ước ghế kề bàn ở GĐ1489) → đi tới, ngồi, `consumingTimer` rồi trả tiền + tip, ra về.
  2. **Hết ghế**: khách đứng chờ (queue) — quá 10 s không có ghế → bỏ về buồn (satisfaction 0).
  3. `quanNuocStand.ts` làm template cho animation ngồi (patrons/tableGroups, 2 người/bàn).
- **Điều kiện chấp nhận**: có bàn+ghế thì nhìn thấy khách ngồi ăn món tươi rồi mới về; thiếu ghế thì thấy khách chờ rồi bỏ đi.
- **Tham chiếu**: PHÂN TÍCH 2.1 (trạng thái khách), 6.1.

### GĐ1491 — Kiên nhẫn + điểm hài lòng + tip cho khách ăn tại chỗ
- **Mục tiêu**: khách có `patience`(n) và `satisfaction`; tip phản ánh chất lượng phục vụ.
- **Việc cần làm**:
  1. Thêm vào `customerEntity`: `patience = 75` (giây game), `satisfaction = 1` khởi đầu; món tới trong 37 s → giữ 1; 38–75 s → 0,6; quá 75 s / chờ ghế >10 s → 0 (bỏ về).
  2. Tip: `tip = giá_món × 10% × (satisfaction ≥ 1 ? 1 : 0,5)`; satisfaction ≤ 0 → không tip. (Mid: hiệu ứng)
  3. Ghi tip vào thu nhập ngày; hiển thị dòng "+tip" khi trả tiền.
- **Điều kiện chấp nhận**: khách chờ lâu trả tip ít hơn; khách bỏ về không tip và kéo chỉ số hài lòng chung của tiệm xuống.
- **Tham chiếu**: PHÂN TÍCH 5.2, 6.1; PHỤ LỤC E2, F4.

### GĐ1492 — Máy tự phục vụ thu phí mỗi lượt
- **Mục tiêu**: 3 máy thu phí đặt được làm đồ nội thất, không cần nhân viên (nguồn thu "đồ vật kiếm tiền").
- **Việc cần làm**:
  1. `furniture.ts`: thêm `machine` với `perUseFee` và 3 loại khác nhau về giá/phí: **máy bán nước tự động**, **máy cân sức khỏe** (đặc trưng tiệm), **máy gắp thú**.
  2. Tái dùng model thu phí của `services.ts` (khách đi tới, trả `fee`, lãi mỗi lượt) nhưng là **đồ đặt được** trên lưới thay vì quầy cố định.
  3. Xác suất: ~15% khách mới ghé máy trống; mỗi máy 1 khách/lúc; 6 s/lượt; khách chơi xong vẫn vào ăn.
- **Điều kiện chấp nhận**: đặt máy → khách ghé chơi và trả phí; máy có người thì người khác không chen; có thể bán/cất máy.
- **Tham chiếu**: PHÂN TÍCH 2.2, 6.3; PHỤ LỤC A (máy) + F4.

### GĐ1493 — Nhà vệ sinh (2 giai đoạn)
- **Mục tiêu**: toilet thu phí, giới hạn "rủi ro mở sau" như Midnight.
- **Việc cần làm**:
  1. `furniture.ts`: thêm `toilet` (3 bậc giá/phí: ngồi xổm rẻ → sứ → thông minh đắt).
  2. Sau khi ăn xong ~20% khách có nhu cầu; 4 s/lượt rồi trả phí và về.
  3. **2 giai đoạn** theo mốc mở rộng siêu thị (anchor: `shopTier` trong `src/core/slices/build.ts` / `shopTiers.ts`): giai đoạn nhẹ → chưa có bồn thì khách về bình thường (không phạt); giai đoạn nghiêm ngặt → khách chờ >5 s không có bồn thì nổi giận (satisfaction 0).
- **Điều kiện chấp nhận**: khách ăn xong đi vệ sinh trả phí; khi siêu thị đủ lớn mới bị ép phải có bồn.
- **Tham chiếu**: PHÂN TÍCH 6.4; PHỤ LỤC A (toilet).

### GĐ1494 — Điểm trang trí × sao (bỏ trần 25%) + trang trí 3 tầng
- **Mục tiêu**: decor không có trần cứng; thêm đa dạng đồ trang trí Việt.
- **Việc cần làm**:
  1. Thay công thức chậu cây: bỏ "tối đa +25%", chuyển sang `decorScore` cho từng đồ và cộng khách có điều kiện phụ thuộc chỉ số phục vụ (khớp công thức `khách/phút = cơ_bản + hệ_số×rating + (decorScore/K)×(rating/5)`).
  2. Thêm đồ trang trí theo 3 tầng giá: rẻ (cây, đèn lồng, tranh Đông Hồ), chức năng (quạt, tủ mát trang trí), khoe rất đắt (mô hình chùa Một Cột, trống đồng) cho người chơi cuối game.
  3. Mỗi đồ có điểm 🩷 hiển thị như Midnight (đổi thành "₫ điểm trang trí" theo style mình).
- **Điều kiện chấp nhận**: đặt nhiều đồ trang trí thì khách tăng rõ; đồ rẻ hiệu quả trên từng xu, đồ đắt để "khoe".
- **Tham chiếu**: PHÂN TÍCH 2.3, A3, D6; PHỤ LỤC A.

### GĐ1495 — Sao món theo lượt bán + đổi đồ đựng
- **Mục tiêu**: mỗi công thức có tiến trình sao, món lên sao thì giá tăng + đồ đựng đổi.
- **Việc cần làm**:
  1. `recipes.ts` + `save.ts`: thêm `servedCount`/món (bộ đếm lượt bán), persist vào save.
  2. Mốc sao rút ngắn cho phù hợp tốc độ game (Mid: 50/250/2500; mình nên nhỏ hơn, vd 20/100/800) — mỗi mức +% giá bán (tối đa +220%).
  3. **Đồ đựng kiểu Việt**, đổi texture theo bậc: túi nilon/giấy → lá chuối → bát sành → bát sứ Bát Tràng → men lam. Món đồ uống dùng cốc riêng (cốc giấy → cốc gốm → cốc sứ → ly thủy tinh).
  4. Thẻ món ghi "còn N lần → đổi sang X" để tạo mục tiêu ngắn (nối với Sổ nấu 🍳 hiện có).
- **Điều kiện chấp nhận**: món bán nhiều lên sao, giá tăng, hình đồ đựng đổi; dữ liệu giữ qua lưu tải lại.
- **Tham chiếu**: PHÂN TÍCH 2.5, B1, 5.3; PHỤ LỤC F1.

### GĐ1496 — Doanh thu vắng mặt (có điều kiện)
- **Mục tiêu**: từ khi siêu thị đủ lớn, tắt game/quay lại vẫn có thu nhập nhưng công bằng.
- **Việc cần làm**:
  1. Thêm offline revenue: hiệu suất **55%** tốc độ kiếm tiền gần đây; thời gian tính tối đa = `30 + cấp×5` phút (đổi cho khớp cấp của mình).
  2. **Điều kiện** để có thu: ≥ 1 bàn+ghế, ≥ 1 trạm nấu, ≥ 1 người nấu; thiếu thì hiện lý do "thiếu ghế/bếp/người".
  3. Chỉ cộng tiền — không cộng XP, không tính lượt bán/sao (tránh farm). Vắng <5 phút không tính.
- **Điều kiện chấp nhận**: quay lại thấy bảng "vắng X, ≈ N khách" và nút thu tiền; điều kiện thiếu được hiện rõ khi bằng 0.
- **Tham chiếu**: PHÂN TÍCH 2.9, 6.5; PHỤ LỤC F5.

### GĐ1497 — Nhà phê bình ẩm thực (sự kiện gọi món bất kỳ)
- **Mục tiêu**: đòn bẩy đẩy người chơi học/nấu thêm nhiều món.
- **Việc cần làm**:
  1. Sự kiện ngẫu nhiên: vị khách "sành ăn" ghé khu ăn uống, gọi **một món bất kỳ trong danh sách món của game**.
  2. Phục vụ được (trong thời gian cho phép) → thưởng lớn + khách đông hơn ngắn hạn.
  3. Không có món / không phục vụ kịp → chỉ số hài lòng tiệm bị khoá thấp vài phút (dưới cấp X thì chỉ nhắc, không phạt — "rủi ro mở sau").
- **Điều kiện chấp nhận**: sự kiện kích hoạt đúng cách; có món ăn và nấu kịp thì +thưởng, thiếu thì bị nhắc/phạt theo cấp.
- **Tham chiếu**: PHÂN TÍCH 2.8, 6.7, C1; PHỤ LỤC F6.

---

## C. Anchor code đã xác minh (để phiên triển khai khỏi mò lại)

> Các vị trí này đã đọc trực tiếp trong code hiện tại (06/11/2026) — dùng làm điểm bắt đầu, **giảm công dò**.

- **Nội thất & đặt đồ**: `src/data/furniture.ts` (`FurnitureType` + `FURNITURE[]`; `isCookStation`, `footprint`, `frontDir`). Thêm kiểu mới vào đây + mesh 3D ở `src/shop/furnitureView.ts` (dựng từ hộp/thân trụ như `src/world/kitProps.ts`). `src/shop/buildMode.ts` tự lo rotate/footprint/fullCheck cho kiểu mới (nếu cần cấm đặt chồng/đặt kề thì sửa `fullCheck` — `src/shop/groceryShop.ts` hàm `fullCheck`).
- **State khách**: `src/agents/customerEntity.ts` — `type State = 'walkBy'|'toShop'|'shopping'|'toQueue'|'queued'|'leaving'` (dòng ~109). Thêm `'toSeat'|'dining'` + `patience`, `satisfaction` cho khách ăn tại chỗ. **Vòng đời khách thật** nằm ở `src/agents/customers.ts` (spawn/shopping/toQueue) — chỗ chèn state dine-in.
- **Mua món & giỏ hàng**: `CartItem` từ `src/core/store.ts`; khách quyết định mua gì ở `customers.ts` (~dòng 268–342: `stockedAttention`, món `homemade`/`sunnyCool`). Món nấu tươi (category `fresh` từ trạm nấu) là đối tượng cho "khách đói".
- **Trang trí → lượt khách (trần 25%)**: `src/agents/customers.ts` dòng ~143–148:
  `visit = (0.5 + Math.min(plants*0.05, 0.25) + repVisitBonus(...)) * traffic * priceAppeal * dirtVisitFactor`.
  → GĐ1494 thay `Math.min(plants*0.05, 0.25)` bằng decorScore có điều kiện theo chỉ số phục vụ.
- **Chỗ ngồi template**: `src/world/quanNuocStand.ts` — mảng `tableGroups` + `patrons`, hiện 2 người/bàn theo `patronCount`. Dùng làm mẫu animation ngồi; nhưng khu dine-in cần **chỗ ngồi định vị trong lưới tiệm** (qua furniture `dining_table`/`chair`), không phải stand ngoài trời.
- **Thu phí mỗi lượt (máy)**: `src/data/services.ts` — `ServiceId` + `ServiceDef` (`price`, `unlock`, `draw`, `fee()`); quầy dịch vụ `topup/bills/lottery/parking/parcel`. → GĐ1492 tái dùng model này nhưng chuyển thành furniture `machine` đặt được.
- **Công thức & tiến trình món**: `src/data/recipes.ts` — `Recipe` có `durationMin`, `unlock`, `reputationGain`, `outputQty`; thành phẩm tự thêm vào `PRODUCTS`. → GĐ1495 thêm `servedCount`/món + persist (xem cấu trúc `src/core/save.ts`; `src/core/store.ts` cho state).
- **Tiến trình cấp / mở khóa / shopTier**: `src/data/shopTiers.ts`, `src/data/chapters.ts`, `src/data/unlockMap.ts`, `src/data/levels.ts`. Dùng `shopTier` làm mốc "siêu thị đủ lớn" cho GĐ1493/1496 (rủi ro/vắng mặt mở sau).

---

## D. Không nên làm trong đợt này (cần backend / lượng người chơi thật)
- Bảng xếp hạng nhà đẹp bình chọn thật, chợ người chơi, thuê bạn bè, tủ trao đổi trực tuyến. (PHÂN TÍCH 3 — "Không nên lấy")
- 183 món quốc tế: giữ trọng tâm món Việt/đồ tạp hóa.

## E. Ghi chú cho phiên triển khai
- Nếu một GĐ quá lớn, tách thành 2 commit nhỏ (vd GĐ1490: (a) thêm state đi tới ghế, (b) animation ngồi + trả tiền).
- Trước mỗi GĐ: chạy `vitest` để không vỡ test cũ; viết test nhỏ cho quy tắc mới (vd ghế-kề-bàn, tip, sao món) như các file `src/__tests__/*.test.ts` hiện có.
- Giữ nguyên số GĐ liên tục; mỗi commit message dạng `GĐNNNN: <nội dung>`.

---

## F. Spec code GĐ1489–1491 (đã đọc file thật — dùng làm bản vẽ)

> Đây là lộ trình **cùng dòng** cho 3 GĐ nền tảng, đã kiểm chứng trong code hiện tại. Các phần khác (1492–1497) làm tương tự, dựa vào Section C.

### F1. GĐ1489 — Bàn ăn + Ghế (thêm kiểu nội thất)

- **`src/data/furniture.ts`**:
  - Thêm vào `FurnitureType`: `'dining_table' | 'chair'`.
  - Thêm 2 mục vào `FURNITURE[]`:
    - `dining_table`: `{ type:'dining_table', name:'Bàn ăn', price: 120000, unlock: 44, size:[1.2,0.7], tiers:0, slots:0, capacity:0, categories:[], desc:'Chỗ khách ăn món nấu tươi tại chỗ (cần ghế kề bàn)' }` — giá/cấp tuỳ chỉnh theo `shopTiers`.
    - `chair`: `{ type:'chair', name:'Ghế', price: 40000, unlock: 44, size:[0.5,0.5], tiers:0, slots:0, capacity:0, categories:[], desc:'Đặt sát bàn ăn mới tính 1 chỗ' }`.
  - (Tuỳ chọn) thêm trường `seatSlots?: number` vào `FurnitureDef` để bàn khai "chỗ ngồi tối đa = số ghế kề".
- **`src/shop/furnitureView.ts` / `src/world/kitProps.ts`**: dựng mesh 3D đơn giản (mặt bàn = hội đồng + 4 chân; ghế = gối + chân) — tái dùng hình hộp như `createDeliveryMarker`/patrons đã có.
- **`src/shop/buildMode.ts` + `groceryShop.ts`**: `footprint()`/`frontDir()`/`fullCheck()` đã generic — kiểu mới chạy được ngay; chỉ thêm quy tắc *ghế phải kề bàn* nếu muốn (gợi ý: để mềm — khách tự ghép, không cấm đặt).
- **Helper chỗ ngồi** (đặt ở `groceryShop.ts` hoặc `data/furniture.ts` mới): `freeSeat()` duyệt `s.furniture` tìm `chair` chưa bị chiếm có một `dining_table` cách **1 ô (cardinal)**; trả về `{ tableUid, chairUid, spot: Vector3 }` (spot từ `shop.spotFor(chair)`).
- **Test**: `src/__tests__/dineSeat.test.ts` — ghế kề bàn = 1 chỗ; ghế cách bàn >1 ô = không tính; bàn không ghế = 0 chỗ; ghế đang bị khách chiếm = không cấp.

### F2. GĐ1490 — Khách "ăn tại chỗ" (state dine-in)

- **`src/data/furniture.ts`**: không đổi (đã có trạm nấu → sản phẩm `fresh`).
- **`src/agents/customerEntity.ts`**: mở rộng `State` thêm `'toSeat' | 'dining'`; thêm field `tip?: number`, `seat?: {tableUid:number; chairUid:number}`.
- **`src/agents/customers.ts` — điểm chèn duy nhất**:
  - Trong `updateCheckout`, ngay trước `this.leave(first, happy, true)` (≈ dòng 637): gọi `this.maybeDineIn(first)`.
  - `maybeDineIn(c)`:
    1. Điều kiện ăn tại chỗ: `c.state === 'queued'` (đã trả tiền xong), `c.basket.some(it => COOKED_PRODUCT_IDS.has(it.id))` (món nấu tươi), và `s.level >= DINE_UNLOCK`, và `simRng()() < DINE_CHANCE` (vd 0.3).
    2. Nếu không thoả → `this.leave(c, happy, true)` như cũ.
    3. Nếu thoả → gọi `this.freeSeat()` (helper F1.4). **Không có ghế** → `c.say('😤')`, `noteMiss('wait')`, `this.leave(c, false, true)` (bỏ về buồn). **Có ghế** → đánh dấu ghế chiếm, build `c.plan`:
       - `c.state='toSeat'; this.walk(c, seat.spot)` → `() => { c.pause = EAT_SECONDS; c.state='dining'; }` → `() => { this.releaseSeat(c); if (c.tip) tipIncome(c.tip); this.leave(c, happy, true); }`.
    4. `leave()` (≈ dòng 821) **đã chuẩn** để khách ra cửa sau khi ăn — chỉ cần gọi lại đúng lúc hết plan.
- **Tiền tip (gọn, tái dùng pattern `earnService` ở `core/biz.ts`)**: thêm `st.checkoutTip(amount)` (hoặc fold vào dayStats) ghi vào thu nhập `fresh`; bong bóng `+tip` nổi lên qua `coinFx.spawn(seat, tip)`.
- **Ghi chú chi tiết đã đọc**: mua hàng xong là khách đã có món trong `basket`, `st.checkout(...)` (dòng 613) đã thu tiền món → dine-in **chỉ thêm tip**, không thu lại tiền món. `c.pause` + `walk()` + `c.plan` (queue closure) là đủ để dàn cảnh ngồi-ăn mà không chạm cách pathfinding (`pathTo` → `grid.findPath`/`approach`).
- **Test**: `src/__tests__/dineDecision.test.ts` — khách có món `fresh` + có ghế + trúng chance → đi ăn rồi mới leave; không ghế → bỏ về buồn; không món tươi → leave ngay.

### F3. GĐ1491 — Kiên nhẫn + hài lòng + tip cho khách ăn tại chỗ

- **`src/agents/customerEntity.ts`**: thêm `satisfaction = 1` và `diningWait` (giây chờ ghế). 
- **`customers.ts`**:
  - Khi khách chờ ghế: đếm `diningWait`; nếu vượt mốc (vd 10 s) chưa có ghế → bỏ về buồn (đã có ở F2.3).
  - `satisfaction` → tip: `tip = 10% × Σ giá món tươi` khi hài lòng đủ; nếu `waitedMinutes > patience` (dữ liệu sẵn có) → tip ×0,5; bỏ về → không tip.
  - Tái dùng dữ liệu sẵn có: `c.waitedMinutes`, `c.patience`, `reviewStars` (đã có) — không cần thêm hệ đếm song song cho khách quầy.
- **`core/biz.ts` / dayStats**: đăng ký tip theo ngày (để tổng kết "tiền tip hôm nay").
- **Test**: `src/__tests__/tip.test.ts` — tip = 10% giá món; chờ nửa patience → tip nửa; bỏ về → 0.

> Các GĐ sau (1492–1497) áp đúng Section C (anchor) + Section B (mục tiêu/điều kiện); dòng code cụ thể tương tự 3 GĐ trên (thêm vô `customers.ts`/`furniture.ts` + test). Nếu muốn, tôi sẽ viết spec dòng cho thêm GĐ1492 (máy thu phí — tái dùng `services.ts`) và GĐ1495 (sao món — chạm `recipes.ts`/`save.ts`).

---

## G. Cập nhật sau lần 6 — chơi trọn tutorial CÓ XEM ẢNH (06/11/2026)

> Đi hết 11/11 nhiệm vụ + tour HUD, Level 1→5, 7×7→9×9 trong ~45 phút. Chi tiết số liệu ở PHỤ LỤC mục I; UX ở PHÂN TÍCH mục 8. Dưới đây là những chỉnh sửa/bổ sung rót thẳng vào spec GĐ1489–1497.

### G1. GĐ1489 — thêm 3 chi tiết UX xác minh được bằng mắt

1. **Preview xanh/đỏ theo ô khi kê đồ**: item dính theo con trỏ, ô hiện hình thoi xanh (hợp lệ) / đỏ (cấm) ngay dưới item — chỉ cần đổi material overlay theo `fullCheck`, đã có sẵn hàm check.
2. **Ghế tự xoay hướng vào bàn** khi đặt kề: bỏ qua cần UI xoay cho ghế; xoay chỉ còn cần cho bếp (chọn chỗ đứng đầu bếp) — khớp nhiệm vụ 1 của họ.
3. **Đồ treo tường**: chỉ cần đánh dấu `wall: true` trong FurnitureDef; khi đặt, item bám tường phía sau ô sàn được trỏ — không cần chế độ UI riêng.
4. **Chống bế tắc**: khi vào build mode tự đưa camera về vùng trống gần tâm; cho pan cả khi đang giữ đồ (Midnight khóa pan khi đặt → người chơi dính bug không đặt được khi ô sáng ngoài màn hình — tránh lặp lại).

### G2. GĐ1490/1491 — icon trạng thái + toast chẩn đoán (rẻ, hiệu quả cao)

- Icon/bong bóng trên đầu khách: 🪑 tìm ghế, 💧 cần toilet, 🍔 chờ món — tái dùng hệ bong bóng `c.say()` hiện có; người chơi "đọc" quán trong 1 giây.
- Sau lần đầu khách bỏ về vì hết ghế, hiện **toast 1 dòng dạy sửa nút thắt** ("Khách đang chờ chỗ ngồi — mua thêm bàn và ghế!") — Midnight làm đúng vậy (toast tiếng Anh đã chụp lại); rẻ hơn hẳn bảng thống kê.
- Xác nhận thực tế: rating tụt 5.0→1.0 trong <1 phút khi thiếu chỗ → nếu mình có "sao tiệm" trung bình N khách gần nhất thì đừng làm trượt dốc nhanh đến thế; đề xuất làm mượt (trung bình trượt, giới hạn −0,5 sao/phút).

### G3. GĐ1492 — số máy thu phí chốt theo luật hoàn vốn ~100 lượt

- Mẫu đo được: Mystery Gift Claw Machine 1.500 xu / +15 lượt = 100 lượt hoàn vốn. Bộ 3 máy mình đề xuất chốt: máy bán nước 1.200/+12, máy cân 1.000/+10, máy gắp thú 1.800/+18 (đều = ~100 lượt).
- 15% khách mới ghé máy trống, 6 s/lượt, 1 khách/máy, chơi xong vẫn vào mua — giữ nguyên như spec.

### G4. GĐ1493 — toilet: xác nhận bong bóng 💧 + xếp hàng ngoài

- Khách thiếu toilet đứng cụm giữ 💧 rồi bỏ về (giai đoạn nhẹ, không trừ sao) — thấy thực tế cả đám 💧 khi chưa có bồn; sau khi đặt bồn, khách đi dùng ngay. Spec 2 giai đoạn giữ nguyên; thêm chi tiết: **khách trả tiền món + nhường ghế TRƯỚC rồi mới đi toilet** (ghế không bị giữ lúc đi vệ sinh).

### G5. Điểm danh (nếu làm "khách quen NPC"): công thức chốt

`thưởng(ngày N) = floor(1500 × N / 1000) × 1000` — bảng 50 ngày đầy đủ ở PHỤ LỤC I1. Chuỗi 50 ngày tổng 1.900.000; đứt chuỗi về ngày 1.

### G6. On-boarding cho khu ăn uống — mô hình 2 lớp học từ tutorial (xác minh bằng mắt)

1. **Lớp 1 — nhiệm vụ có nút Go + guide-blocker**: mỗi bước 1 loại đồ; các bước "mềm" (chia khu bằng vách) có nút **Continue** để bỏ qua — phân biệt "bắt buộc học" vs "khuyến khích học".
2. **Lớp 2 — tour HUD** sau khi xong: dim + ring khoanh từng element top-bar (tiền → sao → decor → khách → pause), bấm đúng element mới đi tiếp. Dùng chung cơ chế blocker, chi phí thấp.
3. Bắt buộc mua trong tutorial: máy chơi game (bước 5) và **2 món decor đồ dùng bếp** (bước 10: giá dao 540 + thùng rác 30) — ngay từ đầu đã dạy "đồ dùng bếp = decor cộng điểm" (khớp GĐ1494 tầng 1).

### G7. Thứ tự ưu tiên giữ nguyên, thêm 1 mục mới

Giữ chuỗi GĐ1489 → 1497 như section B/F. Bổ sung đề xuất **GĐ1498 (nhẹ)**: tour HUD khoanh vùng + toast chẩn đoán nút thắt (G2, G6.2) — làm sau khi 1490 chạy được, vì cần dữ liệu "khách bỏ về vì hết ghế" để kích hoạt toast.
