# SPEC CHIỀU RỘNG — 4 hướng mở rộng cho Tạp Hóa Đầu Ngõ

> Viết ngày 10/11/2026, đối chiếu code tới GĐ2226. Bản thiết kế để duyệt, CHƯA có dòng code nào.
> Đi cùng `docs/SPEC-CHIEU-SAU.md` (4 hệ chiều sâu, đánh số 1–4). File này đánh số tiếp 5–8.
> Mọi con số cân bằng là đề xuất ban đầu, phải qua `simEconomy` trước khi chốt.
> Mỗi hệ chia thành các lát (L1, L2…), mỗi lát = một GĐ = một commit.

Mục lục: [0. Ràng buộc](#0-ràng-buộc-bổ-sung-rút-từ-code) · [5. Chuyến đi tỉnh](#5-chuyến-đi-tỉnh-lấy-hàng) · [6. Online không đồng bộ](#6-online-không-đồng-bộ) · [7. Trò khéo tay dịp lễ](#7-trò-khéo-tay-dịp-lễ) · [8. Biến cố dài](#8-biến-cố-dài) · [9. Thứ tự làm](#9-thứ-tự-làm-và-phụ-thuộc) · [10. Việc cần chốt](#10-việc-cần-bạn-chốt-trước-khi-code)

---

## 0. Ràng buộc bổ sung (rút từ code)

Tám ràng buộc R1–R8 ở §0 của `SPEC-CHIEU-SAU.md` vẫn áp dụng nguyên (golden cấp 30, `MERGE_DEEP`, `GUARDED`, tất định theo seed, dự báo luôn đúng, món có thật, có số phản hồi, chạy cả hai chế độ). Bốn hệ chiều rộng chạm thêm vào những chỗ sau:

| # | Ràng buộc | Căn cứ | Hệ quả |
|---|---|---|---|
| R9 | Ở hẻm online **đồng hồ là chung**, một người không được tua giờ | `worldActions.travel` trong `src/main.tsx:207` đặt thời gian đi lại = 0 khi `inAlley()` | Chuyến đi tỉnh **không tua giờ**. Người đi vắng mặt thật trong lúc đồng hồ vẫn chạy. |
| R10 | Tiệm chỉ bán được khi có người đứng quầy | `customers.playerAtCounter` (`main.tsx`), cờ `autoOpen` ("thu ngân tự mở cửa khi vào ca") | "Tiệm ở nhà phải có người trông" đã có sẵn cơ chế: không có thu ngân thì buổi đó mất khách. |
| R11 | Server **tin hoàn toàn** bản lưu client gửi | `invalidSaveReason` (`server/room.ts:215`) chỉ kiểm kiểu dữ liệu của `day/money/level` | Không thể có xếp hạng "ai giàu nhất" đáng tin. Mọi phần thưởng online phải **có trần và thiên về hình thức**, để gian lận không được gì. |
| R12 | Server đã có sẵn hạ tầng | Express + MongoDB (`cloud_saves`, `alleys`, `consents`), xác thực Firebase, giới hạn tần suất theo uid (`takeToken`, 30 yêu cầu/phút) | Tính năng online mới = thêm collection + vài route REST. Không cần WebSocket. |
| R13 | Dữ liệu cá nhân phải có bằng chứng đồng ý và xoá được | `ConsentRecord`, `DELETE /api/save` (xoá cloud + rời hẻm + xoá đồng ý), `docs/CHINH-SACH-BAO-MAT.md` | Mọi dữ liệu công khai mới cần **scope đồng ý riêng**, phải vào luồng xoá tài khoản, và phải cập nhật chính sách. |
| R14 | Lịch trong game chạy theo **ngày game**, mỗi người một khác | `dayOfYear(day)`, `festivalOn(day)` | Sự kiện toàn server phải neo theo **lịch thật**, không theo lễ trong game. |
| R15 | Chưa có khung mini-game; tương tác chạm chỉ có ở 3 chỗ | `onPointerDown` chỉ thấy trong `ArrangePanel`, `Joystick`, `QuestPanel` | Hệ 7 phải dựng một khung nhỏ dùng chung, nạp lười để không nặng gói đầu. |
| R16 | Hiệu ứng ngày được gộp ở một hàm thuần theo seed | `dayEffects(seed, day, level)` (`calendar.ts:203`) trả `traffic`, `hot`, `cost(id)`, `pull`, `tolerance(id)` | Biến cố dài có trạng thái (lựa chọn của người chơi) nên không nhét vào `dayEffects` được; cần một lớp `crisisEffects` nhân thêm ở đúng các chỗ đang gọi `dayEffects`. |

---

## 5. Chuyến đi tỉnh lấy hàng

### 5.1 Ý tưởng một câu
Thay vì chờ mối lái giao đặc sản sáng mai với giá chuẩn, chủ tiệm tự chạy xe về tận nguồn: rẻ hơn hẳn, mặc cả được, nhưng mất nửa ngày vắng tiệm và có chuyện dọc đường.

### 5.2 Hiện trạng trong code
- Mối `dacsan` ("Mối lái đặc sản vùng", `suppliers.ts:60`) mở ở cấp 42, bán 13 sản phẩm `rg_*` chia 4 miền (`regionSpecialty.ts`), `discount: 0`, giao sáng mai. Đây là kênh "tiện nhưng đắt".
- Xe hiện có (`VEHICLES` trong `data/biz.ts:79`): xe đạp, xe máy; chỉ tăng tốc đi bộ ngoài đường (`speed`) và giảm thời gian đi lại (`travel`). Chưa có khái niệm sức chở.
- Đi lại giữa nhà/tiệm/trại (`worldActions.travel`): dịch chuyển tức thì + cộng 10–15 phút game.
- Quan hệ mối quen (`supplierRel.ts`): 5 bậc theo tổng tiền đã mua, hoàn tiền cuối tháng.
- Vai giao hàng (`courier`, mở cấp 4) đang chở đơn điện thoại và đơn tiệc.
- Sức chứa tính bằng thùng: `casesFor(id, qty)`, `storageCapacity`.
- Lựa chọn kiểu sự kiện đã có sẵn kiểu dữ liệu: `EventChoice` (`money`, `minutes`, `xp`, `friendship`, `needStock`).

### 5.3 Mô hình thời gian: vắng mặt thật, không tua giờ

Đây là quyết định thiết kế quan trọng nhất của hệ (do R9):

1. Người chơi bấm **Lên đường** (từ 06:00, trước 12:00). Nhân vật rời bản đồ; `location = 'Đang đi tỉnh'`.
2. Đồng hồ **vẫn chạy bình thường**. Tiệm do nhân viên lo: có thu ngân và `autoOpen` thì mở cửa bán; không có thì đóng cửa tới khi chủ về (R10). Người chơi vẫn mở được các bảng để xem tiệm từ xa nhưng không thao tác tại chỗ được (không tính tiền, không bày kệ, không nấu).
3. Trong lúc đó người chơi **chơi chính chuyến đi**: 3–4 nhịp hiện ra theo mốc thời gian (chuyện dọc đường → chọn hàng → mặc cả → chuyện đường về).
4. Tới giờ về, nhân vật xuất hiện lại ở tiệm, hàng vào kho.

Ở tốc độ 1×, một giờ game là 30 giây thật, nên chuyến gần (3 giờ) dài khoảng 90 giây, chuyến xa (8 giờ) khoảng 4 phút. Người chơi được tăng tốc như thường.

Cách này chạy **y hệt nhau ở chơi đơn và hẻm online**: trong hẻm, một người đi tỉnh trong khi người khác trông tiệm là tình huống tự nhiên.

### 5.4 Xe chở hàng (tách khỏi xe đi lại)

Xe đạp/xe máy là xe cá nhân (`biz.vehicle`), giữ nguyên. Thêm trường riêng `biz.hauler?: HaulerId` cho xe chở hàng, vì ba gác không thay xe máy để đi từ nhà ra tiệm.

| Phương tiện | Sức chở (thùng) | Tốc độ chuyến | Xăng/giờ | Mở | Giá |
|---|---|---|---|---|---|
| Đi xe khách (không có xe) | 4 | 1,3× thời gian | vé 60k/chuyến | 42 | — |
| Xe máy (đã có) | 8 | 1,0× | 15k | 42 | — |
| Xe ba gác | 30 | 1,15× | 30k | 44 | 18tr |
| Xe tải nhỏ | 80 | 1,0× | 55k | 55 | 65tr |
| Thùng đá giữ lạnh (phụ kiện) | — | — | — | 46 | 4tr |

Không có thùng đá thì hàng tươi/thịt cá mất hạn dùng theo số giờ trên đường (ghi vào `Lot.life` lúc nhập kho, dùng `putStock` có tham số lô như đơn điện thoại đang làm).

### 5.5 Tuyến đường

```ts
export interface RouteDef {
  id: string; name: string; icon: string; unlock: number;
  region?: RegionName;                 // nối với REGION_PRODUCTS
  hours: number;                       // giờ game khứ hồi với xe máy
  /** Hàng bán tại nguồn và mức rẻ hơn giá nhập chuẩn. */
  goods: { productId: string; discount: number; weeklyCap: number }[];
  /** Nhóm hàng thường (tươi, khô…) bán rẻ theo ngành. */
  categoryDeals?: { category: Category; discount: number; weeklyCap: number }[];
  events: string[];                    // id các chuyện dọc đường có thể gặp
}
```

| Tuyến | Mở | Khứ hồi | Bán gì | Rẻ hơn |
|---|---|---|---|---|
| Chợ huyện | 42 | 3 giờ | hàng tươi, thịt cá, rau (theo ngành) | 20–25% so với Đại lý |
| Miệt vườn miền Nam | 44 | 5 giờ | 5 đặc sản Nam (`rg_kho_tom`, `rg_lap_xuong`, `rg_banh_pia`, `rg_banh_phong`, `rg_hat_dieu`) + trái cây | 30% so với mối lái |
| Làng nghề miền Bắc | 46 | 5 giờ | `rg_tra_shan`, `rg_com_lang`, `rg_banh_com` | 30% |
| Chợ miền Trung | 50 | 6 giờ | `rg_me_xung`, `rg_nem_chua`, `rg_keo_cu_do` | 32% |
| Tây Nguyên | 54 | 8 giờ | `rg_kho_bo`, `rg_mac_khen` (biên dày nhất) | 35% |

- **Không thêm sản phẩm mới** ở đợt đầu: mọi tuyến bán đúng hàng đã có. Mối lái `dacsan` giữ nguyên, nên ai không muốn đi vẫn chơi như cũ.
- `weeklyCap`: mỗi tuần nguồn chỉ có chừng đó hàng (cổng chống farm, R7). Hết thì tuần sau.
- Nối với hệ 1 (Phơi · Muối · Ủ): Chợ huyện là nơi mua **nguyên liệu thô số lượng lớn** (tôm, cá, măng tươi) để phơi.

### 5.6 Bốn nhịp của một chuyến

**Nhịp 1 — Chuyện đường đi** (lúc 20% quãng đường). Một `EventChoice` rút tất định từ `hash(weatherSeed, day, routeId, 1)`, lọc theo thời tiết và lịch hôm đó:

| Chuyện | Điều kiện | Lựa chọn |
|---|---|---|
| Thủng lốp | bất kỳ | vá ven đường (−40k, +30 phút) / dắt bộ tới tiệm quen (+70 phút) |
| Mưa lớn | `weather = rain` | trú mưa (+45 phút) / chạy tiếp (hàng khô có rủi ro ướt lúc về) |
| Kẹt xe ngày lễ | `festivalOn(day)` | chờ (+60 phút) / đi đường vòng (+25 phút, thêm xăng) |
| Người quen xin quá giang | có khách quen đã thân | chở (+15 phút, +2 thân thiết, lan theo hệ 2) / từ chối |
| Trạm kiểm tra | xe chở > 90% sức | dừng kiểm (+20 phút) |

Ngày **giông bão** thì không cho xuất phát (thẻ báo rõ lý do, dự báo biết trước 2 ngày).

**Nhịp 2 — Chọn hàng tại nguồn** (lúc 45%). Bảng giống `OrderPanel` nhưng có hai thanh giới hạn: **tiền mang theo** (chốt lúc xuất phát) và **sức chở**. Hiện luôn giá mối lái bên cạnh để thấy đang lời bao nhiêu.

**Nhịp 3 — Mặc cả** (ngay sau nhịp 2). Ba lượt trả giá cho cả xe hàng:
- Người bán có **giá sàn ẩn** = mức rẻ của tuyến + thêm 0–12% tuỳ: bậc mối quen tại nguồn, số thùng mua (mua nhiều dễ ép), kỹ năng `negotiator`, và một phần tất định theo `hash(seed, day, routeId, 3)`.
- Mỗi lượt người chơi kéo thanh trả giá. Trả trên sàn: người bán gật. Trả dưới sàn: người bán lắc, mất một lượt, và **kiên nhẫn giảm** (hiện bằng nét mặt). Hết ba lượt mà chưa chốt thì mua giá niêm yết của tuyến.
- Ép quá tay ba lần liền (đều dưới sàn hơn 8%): người bán phật ý, lần sau sàn cao hơn 3% trong 2 tuần.
- Nút "Thôi, giá đó được rồi" để bỏ qua (không phạt), đúng nguyên tắc dùng được khi chưa đọc hướng dẫn.

**Nhịp 4 — Chuyện đường về** (lúc 80%). Như nhịp 1, thêm loại chuyện gắn với hàng đang chở: mưa mà không phủ bạt, người đi đường hỏi mua lại vài thùng giá hời (bán ngay tại chỗ, bớt hàng mang về).

### 5.7 Mối ruột tại nguồn
Dùng lại `supplierRel` với khoá `route:${id}` trong `biz.supplierRel`. Bậc mối quen tại nguồn cho: sàn mặc cả thấp hơn 1% mỗi bậc, `weeklyCap` +10% mỗi bậc, và từ bậc 3 **được ghi nợ một chuyến** (trả trong 7 ngày). Không tính vào hoàn tiền cuối tháng của các mối thường.

### 5.8 Sai người đi thay
Có nhân viên `courier` và có xe chở hàng thì giao được cho họ đi: người chơi lập sẵn danh sách hàng và trần tiền.
- Không có nhịp mặc cả: lấy giá niêm yết của tuyến (tức mất 0–12% so với tự đi).
- Chuyện dọc đường tự chọn phương án mặc định (thường là phương án chậm, an toàn).
- Người giao hàng vắng cả buổi, nên **đơn điện thoại hôm đó không ai chở**.
- Kỹ năng người giao hàng từ 4 sao: được 1 lượt mặc cả tự động (lấy nửa mức tối đa).

Đây là giá trị cuối game mới cho vai giao hàng; thêm thẻ `tripPayoff` so "tự đi / sai người / mua mối lái" bằng số tiền thật.

### 5.9 Kinh tế mục tiêu

| Chỉ số (cấp 45–55, một chuyến ba gác đầy) | Mục tiêu |
|---|---|
| Lợi thêm so với mua đúng số hàng đó ở mối lái | 250k–450k |
| So với lãi một ngày | 8–15% |
| Trần cứng | không quá 25% lãi ngày, dù mặc cả tối đa |
| Chi phí cơ hội nếu tiệm đóng cửa buổi sáng | lớn hơn lợi của chuyến → **bắt buộc phải có người trông tiệm mới đáng đi** |

Giới hạn: tối đa **1 chuyến/ngày** cho cả tiệm, cộng `weeklyCap` của từng tuyến.

### 5.10 State, co-op, UI

```ts
export interface TripState {
  routeId: string; day: number; departAt: number; returnAt: number;
  by: 'self' | number;            // 'self' hoặc id nhân viên
  traveler?: number;              // hẻm online: id người đang đi
  cash: number; hauler: HaulerId | 'moto' | 'bus';
  cart: Record<string, number>; beat: 0|1|2|3|4;
  haggle?: { round: number; best: number; anger: number };
  delayMin: number; flags: string[];
}
```

- State: `biz.trip?`, `biz.hauler?`, `biz.coolBox?`, `biz.routeStock?: Record<string, { week: number; left: Record<string, number> }>`, `biz.routeGrudge?`. Đều trong `biz` (R2).
- Action: `buyHauler(id)`, `startTrip(routeId, by, cash)`, `tripChoose(index)`, `tripSetCart(items)`, `tripHaggle(offer)`, `tripAcceptPrice()` → `GUARDED` khoá chung `'trip'`. Về tới nơi xử lý trong `tick` khi `minutes ≥ returnAt` (một phép so sánh, cùng kiểu với cảnh báo `STOCK_WARN_AT`), hoặc trong `endDay` nếu ngủ trước khi xe về.
- Hẻm online: một chuyến tại một thời điểm; người đi là `traveler`, máy của họ hiện giao diện chuyến đi, máy khác thấy dòng "🚚 A đang đi Tây Nguyên, 14:20 về". Thao tác `trip*` chỉ nhận từ đúng `traveler`.
- UI: mục "🚚 Đi tỉnh" trong `OrderPanel` (cạnh danh sách mối); màn chuyến đi là một lớp phủ nhẹ: dải đường có xe chạy theo tiến độ, thẻ nhịp hiện ở giữa, góc dưới là ô xem nhanh tiệm (số khách đang chờ, doanh thu từ lúc đi). `todayAgenda` thêm `tripAgenda()` ("xe về lúc 11:40"). Sổ đầu ngày: thẻ gợi ý tuyến nào đang có hàng và hôm nay trời có đi được không.
- 3D (làm sau): xe ba gác/xe tải đậu trước tiệm, cảnh xe rời hẻm và về tới.

### 5.11 Lát cắt

| Lát | Nội dung | Xong khi |
|---|---|---|
| L1 | `routes.ts` (kiểu + tuyến Chợ huyện + Miệt vườn), hàm thuần tính giờ/giá/sức chở, test | Golden không đổi |
| L2 | `startTrip` + vắng mặt + xe về nhập kho (chưa có nhịp nào), `GUARDED`, lớp phủ tối giản | Đi và về trọn vòng ở cả hai chế độ |
| L3 | Nhịp 2 (chọn hàng) + `weeklyCap` + mục trong `OrderPanel` | — |
| L4 | Nhịp 3 (mặc cả) | Test: cùng seed, cùng chuỗi trả giá → cùng kết quả |
| L5 | Nhịp 1 và 4 (chuyện dọc đường, 8 chuyện) | — |
| L6 | Xe ba gác, xe tải, thùng đá, hao hạn dùng | — |
| L7 | Ba tuyến còn lại + mối ruột tại nguồn | — |
| L8 | Sai người đi + `tripPayoff` | — |
| L9 | Mô hình xe và cảnh 3D | — |

### 5.12 Rủi ro
- **Bốn phút "ngồi xem"** ở chuyến xa. Giảm bằng bốn nhịp rải đều, ô xem tiệm, và cho tăng tốc. Nếu playtest vẫn thấy dài, rút giờ các tuyến chứ không tua giờ.
- **Người chưa thuê thu ngân** đi là mất buổi bán. Nút Lên đường phải cảnh báo bằng số: "Không ai đứng quầy: ước mất ~X đồng doanh thu sáng nay".
- **Trùng vai với mối lái.** Mối lái là mặc định tiện lợi; chuyến đi là lựa chọn nâng cao. Giữ nguyên giá mối lái để hai kênh không ăn nhau.

---

## 6. Online không đồng bộ

### 6.1 Ý tưởng một câu
Người chơi đơn vẫn thấy mình ở giữa một cộng đồng: ghé xem tiệm bạn, gửi lẵng hoa, đổi hàng dư ở chợ phiên chung, thi đua tuần trong nhóm nhỏ, và cùng cả server góp vào một hội chợ.

### 6.2 Hiện trạng và giới hạn
- Server (`server/index.ts`, 559 dòng): lưu cloud mỗi tài khoản một bản (`cloud_saves`), hẻm online 2–4 người qua WebSocket (`alleys`), bằng chứng đồng ý (`consents`). Mỗi bản cloud đã lưu kèm tóm tắt `day`, `level`, `money`.
- Server không hiểu nội dung bản lưu và không kiểm tra gian lận (R11).
- Tên hiển thị lấy từ tên Google, cố ý không dùng email (`verify`, dòng 57).
- Chưa có người chơi thật để đo; chưa có telemetry.

### 6.3 Lập trường về gian lận (đọc trước khi duyệt)
Vì bản lưu do client quyết định, ai muốn sửa tiền trong máy mình đều làm được, và server không phân biệt nổi. Spec này **không cố chống**, mà thiết kế để gian lận vô nghĩa:

1. Không xếp hạng theo tiền, doanh thu hay cấp. Chỉ dùng chỉ số **có trần tự nhiên** (phần trăm, số việc hoàn thành trong tuần).
2. Phần thưởng online là **hình thức** (khung biển hiệu, danh hiệu tuần, vật trang trí) hoặc **tiền nhỏ có trần theo cấp**, không bao giờ là lợi thế lâu dài.
3. Mọi thứ nhận từ người khác đều có **trần mỗi ngày** ở phía người nhận.
4. Server chặn các giá trị vô lý theo cấp (ví dụ một ngày bán nhiều hơn 3 lần số khách tối đa của cấp đó) và âm thầm loại khỏi tổng chung.

Vì đã quyết định làm bảng xếp hạng toàn server (mục d), thêm ba lớp **chống gian lận mức nhẹ**. Chúng không chặn được người cố tình, nhưng chặn được phần lớn trường hợp sửa bừa:

5. **Kiểm tốc độ tiến**: server giữ lịch sử `day`/`level` của mỗi danh thiếp. Cấp tăng nhanh hơn mức tối đa có thể (tính từ `xpToNext` và số ngày game đã trôi) hoặc `day` đi lùi thì gắn cờ.
6. **Ẩn mềm**: tài khoản bị gắn cờ vẫn thấy mình trên bảng như thường, nhưng người khác không thấy. Không thông báo, không tranh cãi.
7. **Báo cáo + xét tay**: nút báo cáo trên mỗi dòng bảng xếp hạng; top 10 mỗi dải được xét tay trước khi lên bảng vàng.

### 6.4 Năm tính năng

**a) Danh thiếp tiệm.** Hồ sơ công khai rút từ bản lưu:

```ts
interface ShopCard {
  _id: string;              // uid
  code: string;             // mã bạn bè 6 ký tự, sinh như newAlleyCode
  shopName: string; ownerName: string;
  level: number; shopTier: number; day: number;
  titles: string[];         // tối đa 3 danh hiệu tự chọn khoe
  stance?: string; brandName?: string; alleyBond?: number;   // từ các hệ chiều sâu, nếu có
  topDishes: { id: string; stars: number }[];                // 3 món nhiều sao nhất
  layout: { type: string; x: number; z: number; rot: number }[];  // để vẽ sơ đồ tiệm
  style: unknown; updatedAt: string;
}
```

- Client tự dựng danh thiếp và gửi `PUT /api/card` mỗi khi sang ngày mới (không gửi cả bản lưu cho người khác đọc).
- **Mặc định TẮT.** Bật cần đồng ý scope mới `public_card` (R13).
- Kết bạn bằng mã (`POST /api/friends/:code`), tối đa 30 bạn. Không có tìm kiếm công khai, không có danh sách người lạ ở đợt đầu.

**b) Ghé tiệm bạn.** `GET /api/card/:code` trả danh thiếp; client vẽ **sơ đồ tiệm nhìn từ trên** bằng đúng bộ vẽ của `ArrangePanel` (`arrangeGeometry.ts`) ở chế độ chỉ đọc. Dựng lại 3D đầy đủ để dành cho sau. Khi ghé được làm hai việc:
- **Gửi lẵng hoa**: mỗi ngày thật 1 lẵng cho mỗi bạn, tối đa 3 lẵng/ngày. Người nhận lần vào game kế tiếp thấy thư; mỗi lẵng cho +5 điểm trang trí trong 3 ngày game. Người nhận tính tối đa 5 lẵng cùng lúc.
- **Để lại lời khen** chọn từ danh sách câu có sẵn (không cho gõ tự do, khỏi phải kiểm duyệt).

**c) Chợ phiên liên hẻm.** Nối tiếp chợ phiên bán hàng dư đang có (`chophien.ts`), thêm cấp thứ tư "Chợ liên hẻm" mở ở cấp 48:
- Người bán đăng **lô** lên chợ: tối đa 3 lô/tuần thật, mỗi lô 1 mặt hàng, tối đa 24 đơn vị, giá trong khoảng **60–95% giá bán gợi ý** (server kiểm). Hàng bị trừ khỏi kho ngay lúc đăng (ký gửi).
- Chỉ đăng được **hàng khô không theo mùa** (`category: dry`, không thuộc `SEASONAL_GOODS`): gồm đồ khô thường, hàng nhà làm, đặc sản vùng, hàng mang nhãn riêng (hệ 4). Danh sách mã hàng hợp lệ xuất ra `server/marketWhitelist.json` bằng một script build, để server kiểm mà không phải import mã game.
- Người mua thấy các lô của **bạn bè trước**, rồi tới lô ngẫu nhiên cùng dải cấp (±15). Mua thì trừ tiền trong ván mình, hàng về kho sáng hôm sau (theo mẫu `deliveries`).
- Người bán nhận tiền qua thư khi vào game. Lô không ai mua sau 7 ngày thật thì hàng trả về.
- Trần phía người mua: 2 lô/ngày thật.
- Ý nghĩa: người mạnh trại/bếp có đầu ra; người chưa mở mối lái hoặc chưa có nhà chum mua được hàng hiếm sớm. Đặc biệt hợp với hệ 1 và hệ 4.

**d) Thi đua tuần.** Mỗi tuần **thật** (thứ Hai–Chủ nhật) server xếp người chơi đã bật danh thiếp vào các **tổ 20 người** cùng dải cấp. Điểm tuần tính từ những thứ có trần:

| Thành phần | Điểm tối đa | Nguồn trong game |
|---|---|---|
| Thử thách tuần hoàn thành | 30 | `weeklyChallenge` / `closeWeek` (mỗi tuần game xong được 10, tối đa 3 lần/tuần thật) |
| Ngày "sạch" (không ai bỏ về vì chờ/hết hàng) | 30 | `biz.cleanStreak`, mỗi ngày 2 điểm |
| Tỉ lệ khách hài lòng trung bình | 20 | `stats.customers`, `stats.unhappy` |
| Việc nhà trong hẻm lo xong (hệ 2) | 10 | `biz.lifeEventsDone` |
| Góp vào hội chợ (mục e) | 10 | — |

Thưởng cuối tuần: hạng 1–3 nhận **khung biển hiệu tuần** (hình thức, giữ 1 tuần); nửa trên của tổ nhận một rương nhỏ (tiền = 20k × cấp, trần 2tr); ai có điểm > 0 nhận danh hiệu tham gia. Không có rớt hạng, không có phạt.

**Ba bảng xếp hạng cá nhân** (đã duyệt 10/11/2026: làm bảng xếp hạng giữa nhiều người chơi). Cùng một điểm tuần, xem theo ba phạm vi:

| Bảng | Ai trong bảng | Hiện gì | Thưởng |
|---|---|---|---|
| Tổ thi đua | 20 người cùng dải cấp, server xếp mỗi tuần | đủ 20 hạng | như trên |
| Bạn bè | những người đã kết bạn bằng mã | đủ danh sách | không thưởng, chỉ để so |
| Toàn server theo dải cấp | mọi người đã bật danh thiếp, chia 5 dải: 1–29, 30–59, 60–99, 100–149, 150–200 | top 100 + vị trí và phần trăm của mình ("bạn đứng trong 12% đầu") | top 10 mỗi dải: khung biển hiệu riêng + tên lên bảng vàng ở màn đăng nhập tuần sau |

- Điểm tối đa là 100 và nhiều người có thể cùng chạm trần. Phân hạng khi bằng điểm: ai đạt mức điểm đó **sớm hơn** trong tuần (giờ server) đứng trên.
- Thêm **bảng mùa**: cộng điểm 13 tuần liên tiếp (một quý thật), bảng riêng, thưởng một vật trang trí của mùa cho 25% đầu mỗi dải. Lý do: bảng tuần thưởng cho người chăm tuần đó, bảng mùa thưởng cho người đều tay.
- Mỗi dòng trên bảng chỉ hiện: tên tiệm, tên chủ (tên Google đã rút gọn), cấp, điểm. Bấm vào thì mở danh thiếp (ghé tiệm).

**f) Bảng hẻm (xếp hạng co-op).** Hẻm online xếp hạng **theo đội**, bảng riêng, không trộn với cá nhân (bốn người cùng làm một tiệm thì không so công bằng với một người).

- Điểm hẻm dùng **cùng 5 thành phần** của điểm tuần, tính trên tiệm chung. Máy chạy gửi kèm điểm mỗi lần ghi tiến trình (`checkpoint`); server vốn chỉ nhận `checkpoint` từ đúng máy chạy (`server/index.ts`, nhánh `case 'checkpoint'`).
- Thêm một thành phần mà **server tự đo được, không cần tin client**: điểm **chung sức** (tối đa 20) = số ngày thật trong tuần có từ 2 thành viên cùng online ít nhất 20 phút. Server biết ai đang ở trong phòng (`room.peers`), nên phần này không sửa được từ máy người chơi. Tổng điểm hẻm tối đa 120.
- Hai bảng: **Bảng hẻm toàn server** theo dải cấp của tiệm chung (top 50 + vị trí hẻm mình), và **hẻm của bạn bè**.
- Thưởng chia cho **từng thành viên đã online ít nhất 60 phút trong tuần đó** (server đo), gửi qua thư vào bản lưu cá nhân của họ: khung biển hiệu hẻm (hình thức) + rương nhỏ như bảng cá nhân. Thành viên không chơi tuần đó không nhận.
- Hẻm cũng có danh thiếp riêng (`alley_cards`, khoá là mã hẻm): tên hẻm, danh sách thành viên, cấp, sơ đồ tiệm chung. **Cần cả chủ hẻm bật và từng thành viên đồng ý hiện tên mình**; ai không đồng ý thì hiện là "Thành viên ẩn danh".
- Một người vẫn có điểm cá nhân riêng từ ván chơi đơn của mình; chơi hẻm không cộng vào bảng cá nhân và ngược lại.

**e) Hội chợ toàn server.** Sự kiện theo **lịch thật** (R14), server cấu hình:

```ts
interface GlobalFair {
  _id: string; name: string; from: string; to: string;     // ngày thật
  metric: 'festival_goods' | 'cooked' | 'homemade' | 'region';
  target: number; milestones: number[];                     // 25/50/75/100%
  total: number;
}
```

- Mỗi lần sang ngày game, client gửi số món thuộc `metric` đã bán hôm đó (`POST /api/fair/contribute`). Server chặn trần theo cấp rồi cộng vào `total`.
- Mỗi mốc đạt được mở một phần quà cho **mọi người đã góp ít nhất 20 món**: mốc 25/50/75% là tiền nhỏ theo cấp; mốc 100% là một vật trang trí riêng của kỳ đó.
- Đề xuất 4–6 kỳ mỗi năm thật, trùng dịp thật: Tết Nguyên Đán, 30/4, Trung thu, 20/11, Giáng sinh.
- Thanh tiến độ chung hiện ở màn đăng nhập (đã có lớp nhắc quay lại `returnReminder.ts`) và trong bảng Cộng đồng.

### 6.5 Phía server

| Collection mới | Khoá | Ghi chú |
|---|---|---|
| `shop_cards` | uid | chỉ tồn tại khi đã đồng ý `public_card` |
| `friends` | `uidA:uidB` | hai chiều; xoá một phía là xoá cả cặp |
| `inbox` | tự sinh | `{ to, kind, from, payload, createdAt, claimedAt? }`; TTL 30 ngày |
| `market_lots` | tự sinh | `{ seller, productId, qty, unit, band, createdAt, buyer? }`; TTL 7 ngày |
| `week_scores` | `tuần:uid` | `{ group, band, score, parts, reachedAt, flagged? }`; chỉ mục theo `(tuần, band, score, reachedAt)` cho bảng toàn server |
| `season_scores` | `mùa:uid` | tổng 13 tuần |
| `alley_cards` | mã hẻm | danh thiếp hẻm; tên từng thành viên chỉ hiện khi người đó đồng ý |
| `alley_week_scores` | `tuần:mãHẻm` | `{ band, score, parts, together, minutesByUid }` |
| `card_history` | uid | lịch sử `day`/`level` để kiểm tốc độ tiến |
| `reports` | tự sinh | báo cáo tên tiệm / dòng bảng xếp hạng |
| `fairs`, `fair_contrib` | id kỳ; `kỳ:uid` | — |

| Route mới | Việc |
|---|---|
| `PUT /api/card`, `DELETE /api/card` | bật/cập nhật/tắt danh thiếp |
| `GET /api/card/:code` | xem danh thiếp bạn |
| `POST /api/friends/:code`, `DELETE /api/friends/:uid`, `GET /api/friends` | bạn bè |
| `GET /api/inbox`, `POST /api/inbox/claim` | thư: lẵng hoa, tiền bán lô, quà hội chợ |
| `POST /api/gift/:uid` | gửi lẵng hoa / lời khen |
| `GET /api/market`, `POST /api/market`, `POST /api/market/:id/buy` | chợ liên hẻm |
| `POST /api/week/score`, `GET /api/week` | thi đua tuần (tổ của mình) |
| `GET /api/board?scope=friends\|server&band=…&period=week\|season` | bảng xếp hạng cá nhân: top + vị trí của mình |
| `GET /api/board/alleys?scope=friends\|server&band=…` | bảng hẻm |
| `PUT /api/alleys/:id/card`, `POST /api/alleys/:id/card/consent` | danh thiếp hẻm; từng thành viên đồng ý hiện tên |
| `POST /api/report` | báo cáo |
| `GET /api/fair`, `POST /api/fair/contribute` | hội chợ |

Tất cả đi qua middleware xác thực và giới hạn tần suất đang có. Tách route mới sang file `server/social.ts` + logic thuần sang `server/socialRules.ts` (có test, theo mẫu `room.ts`), để `index.ts` không phình.

**Bắt buộc về pháp lý (R13):**
- Scope đồng ý mới `public_card`, ghi vào `consents` như scope hiện có.
- `DELETE /api/save` phải xoá thêm: danh thiếp, quan hệ bạn bè, thư, lô đang treo (hàng coi như mất), điểm tuần, phần góp hội chợ.
- Cập nhật `docs/CHINH-SACH-BAO-MAT.md` và `docs/DIEU-KHOAN-SU-DUNG.md`: thêm mục dữ liệu công khai, tên tiệm hiển thị cho người khác, cách tắt.
- **Tên tiệm là chữ người dùng tự gõ và sẽ hiện cho người khác**: cần bộ lọc từ cấm phía server lúc `PUT /api/card`, và nút báo cáo ở danh thiếp. Tên bị báo cáo nhiều thì hiện thành "Tiệm tạp hóa" cho tới khi đổi.

### 6.6 Phía client
- File mới `src/net/socialApi.ts` (theo mẫu `alleyApi.ts`), nạp lười.
- Bảng mới `{ type: 'community' }`: 4 tab — Bạn bè · Chợ liên hẻm · Thi đua · Hội chợ.
- Store thêm đúng 3 action áp kết quả từ thư vào ván, mỗi cái tự có trần ngày: `claimInbox(items)`, `postMarketLot(productId, qty, unit)` (trừ kho trước, gọi server sau; server từ chối thì hoàn kho), `buyMarketLot(lot)`.
- State: `biz.social2?: { flowers: { until: number }[]; lotsWeek: { week: string; n: number }; buysDay: { date: string; n: number }; claimed: string[] }`.
- **Không mạng, chưa đăng nhập, hoặc đang ở chế độ thử (`SANDBOX`)**: bảng Cộng đồng hiện lời mời đăng nhập, mọi thứ khác của game không đổi.
- **Trong hẻm online**: hẻm có danh thiếp và bảng xếp hạng riêng (mục f). Chợ liên hẻm và lẵng hoa đợt đầu vẫn chỉ dành cho bản lưu cá nhân (tiệm chung có nhiều người cùng sửa kho, dễ tranh chấp).
- Bảng Cộng đồng thêm tab **Xếp hạng** với bộ chọn: Cá nhân / Hẻm · Tổ / Bạn bè / Toàn server · Tuần / Mùa.

### 6.7 Lát cắt

| Lát | Nội dung | Cần server? |
|---|---|---|
| L1 | Telemetry ẩn danh tối thiểu (phễu theo cấp, số ngày chơi) + scope đồng ý | Có |
| L2 | Danh thiếp + scope `public_card` + mở rộng luồng xoá tài khoản + cập nhật chính sách | Có |
| L3 | Bạn bè bằng mã + ghé tiệm (sơ đồ nhìn từ trên) | Có |
| L4 | Thư + lẵng hoa + lời khen có sẵn | Có |
| L5 | Hội chợ toàn server (một kỳ thử) + thanh ở màn đăng nhập | Có |
| L6 | Thi đua tuần theo tổ | Có |
| L6b | Bảng bạn bè + bảng toàn server theo dải cấp + kiểm tốc độ tiến + ẩn mềm | Có |
| L6c | Bảng hẻm: điểm kèm `checkpoint`, điểm chung sức do server đo, danh thiếp hẻm, thưởng theo thời gian online | Có |
| L6d | Bảng mùa (13 tuần) + bảng vàng ở màn đăng nhập | Có |
| L7 | Chợ liên hẻm (đăng, mua, nhận tiền, trả hàng) + whitelist | Có |
| L8 | Lọc tên, báo cáo, công cụ quản trị tối thiểu | Có |
| L9 | Ghé tiệm bằng 3D thật | Không |

L1 đứng đầu có chủ ý: chưa biết có bao nhiêu người chơi và họ dừng ở cấp nào thì không nên xây chợ.

### 6.8 Rủi ro
- **Ít người chơi thì mọi thứ trống.** Tổ thi đua không đủ 20 người thì lấp bằng "tiệm mẫu" do server sinh với điểm vừa phải; chợ vắng thì có lô của "thương lái" hệ thống. Phải ghi rõ đó là tiệm mẫu.
- **Chi phí vận hành và kiểm duyệt** là việc lâu dài, khác hẳn tính năng chơi đơn. Đây là hệ duy nhất trong tám hệ tạo ra **nghĩa vụ sau khi phát hành**.
- **Pháp lý.** Dữ liệu công khai của người dùng; cần rà lại theo bản audit `docs/AUDIT-PHAP-LY-2026-11-03.md` trước khi bật.
- **Lệch đồng hồ.** Tuần và hội chợ tính theo giờ server, không theo máy người chơi.

---

## 7. Trò khéo tay dịp lễ

### 7.1 Ý tưởng một câu
Mỗi dịp lễ có một trò 30–60 giây làm bằng tay (gói bánh chưng, xếp giỏ quà, bày mâm ngũ quả, phất đèn ông sao); làm khéo thì mẻ hàng lễ hôm đó ra nhiều hơn một chút, không làm thì thợ làm hộ và không mất gì.

### 7.2 Hiện trạng trong code
- 18 dịp trong `FESTIVALS` (`calendar.ts`), 6 dịp có hàng riêng (`goods`).
- Bàn gói quà (`gift_wrap`) có các công thức chỉ làm được đúng dịp (trường `festival` của `Recipe`): giỏ quà Tết, 8/3, 20/11, Trung thu, Valentine, Giáng sinh, và **Bánh chưng tự gói** (`recipe_banh_chung_tu`, 30 phút ra 10 cái).
- Đồ trang trí chỉ mua được đúng dịp: `mam_ngu_qua` (Tết), `den_ong_sao` (Trung thu).
- Mục tiêu chung của hẻm mỗi dịp (`community.ts`): bán đủ hàng lễ, đủ món nhà làm, đủ điểm trang trí.
- Chưa có trò tương tác nào (R15). Thứ gần nhất là câu hỏi ở quầy có đếm giờ (`core/counterAsk.ts`).

### 7.3 Nguyên tắc
1. **Gắn vào việc đã có**, không tạo tiền tệ hay sản phẩm mới: trò chơi là cách làm khéo hơn một mẻ hàng lễ mà người chơi đằng nào cũng làm.
2. **Luôn bỏ qua được** bằng nút "Để thợ làm": nhận đúng kết quả cơ bản như hiện nay. Không ai bị thiệt vì không chơi.
3. **Có trần** (R7): mỗi trò chỉ tính thưởng **1 lần mỗi ngày lễ**; chơi lại cho vui thì không thưởng thêm.
4. **Hai mức**: "Nhanh tay" (có đếm giờ, thưởng tối đa) và "Thong thả" (không đếm giờ, thưởng tối đa 2/3). Người chơi chậm tay hoặc dùng điện thoại nhỏ không bị loại.
5. **Tất định**: đề bài sinh từ `hash(weatherSeed, day, miniId)`, nên hai máy trong hẻm thấy cùng đề.

### 7.4 Khung chung

```
src/ui/minigames/
  MiniHost.tsx        lớp phủ, đếm giờ, nút bỏ qua, màn kết quả  (nạp lười)
  useMiniInput.ts     chạm/kéo/thả thống nhất chuột + cảm ứng
  seeded.ts           sinh đề từ seed
  GioQua.tsx, BanhChung.tsx, NguQua.tsx, DenOngSao.tsx
src/data/festivalMini.ts   định nghĩa thuần + bảng thưởng (test được)
```

```ts
export interface FestivalMiniDef {
  id: string; name: string; icon: string;
  festivals: string[];                    // id trong FESTIVALS
  unlock: number;                         // ≥ 32
  /** Gắn với mẻ nấu nào hoặc món trang trí nào. */
  target: { kind: 'recipe'; recipeId: string } | { kind: 'decor'; furniture: FurnitureType };
  seconds: number;                        // 30–60
  reward: (score: number, mode: 'fast' | 'calm') => MiniReward;
}
export type MiniReward = { bonusQty?: number; flair?: number; xp: number };
```

- Vẽ bằng DOM/CSS và canvas 2D, không dùng Three.js, để chạy mượt trên máy yếu và không đụng vòng vẽ 3D.
- Chơi đơn: thế giới **tạm dừng** trong lúc chơi (như lúc mở thoại chương). Hẻm online: đồng hồ chung không dừng, nên chỉ mở được khi mình không phải người duy nhất đứng quầy lúc tiệm đang mở.
- Điểm 0–100 do client tính; action trên máy chạy **kẹp lại 0–100** rồi tra bảng thưởng. Ai sửa điểm cũng chỉ được tối đa mức trần vốn nhỏ.

### 7.5 Bốn trò đợt đầu

**① Xếp giỏ quà** — dùng cho **6 dịp** (Tết, Valentine, 8/3, Trung thu, 20/11, Giáng sinh), gắn với các công thức giỏ quà ở bàn gói. Làm trò này trước vì một lần làm dùng cho sáu dịp.
- Màn hình: một cái giỏ nhìn từ trên (lưới 4×4) và 6–8 món quà hình khối khác nhau (hộp bánh dài, hũ mứt tròn, gói trà vuông…). Kéo thả xếp sao cho **vừa khít, không chồng**, món cao ở sau, món thấp ở trước.
- Điểm: số ô lấp đầy + thưởng "đẹp mắt" nếu đúng luật cao–thấp + thời gian còn lại.
- Thưởng: mẻ giỏ quà hôm đó ra thêm **0–1 giỏ** (mẻ thường ra 2, theo `outputQty` của các công thức giỏ quà).

**② Gói bánh chưng** — Tết, gắn với `recipe_banh_chung_tu`.
- Màn hình: khuôn vuông giữa màn; các nguyên liệu ở dưới. Làm đúng trình tự thật: lót lá dong → nếp → đậu xanh → thịt → đậu xanh → nếp → gấp lá → buộc lạt (kéo hai sợi theo hình chữ thập).
- Mỗi bước là một cử chỉ ngắn; sai thứ tự thì cái bánh đó bị "méo". Gói 4 cái trong 45 giây.
- Điểm: số bánh vuông vức.
- Thưởng: mẻ ra thêm **0–3 cái** (mẻ thường 10).

**③ Bày mâm ngũ quả** — Tết, gắn với món trang trí `mam_ngu_qua`.
- Màn hình: mâm tròn và các loại quả. Hai kiểu đề theo seed: mâm miền Bắc (chuối, bưởi, đào, hồng, quýt) hoặc mâm miền Nam (mãng cầu, dừa, đu đủ, xoài, sung — "cầu dừa đủ xài"). Phải chọn **đúng 5 loại của kiểu đó** trong số 8 loại bày ra, rồi xếp cân: quả to làm đế, quả nhỏ chèn quanh.
- Thưởng: mâm đang bày trong tiệm được **+2 đến +6 điểm trang trí** cho tới hết dịp Tết (`biz.festivalFlair`). Cần đã mua mâm.
- Trò này còn dạy một chút văn hoá, hợp tinh thần "đậm chất Việt" của game.

**④ Phất đèn ông sao** — Trung thu, gắn với `den_ong_sao`.
- Màn hình: khung tre 5 cánh. Hai bước: nối các nan theo đúng thứ tự để thành ngôi sao một nét (kéo từ đỉnh này sang đỉnh kia), rồi dán giấy màu vào 5 cánh + tâm (chạm đúng vùng).
- Thưởng: như ③, +2 đến +6 điểm trang trí hết dịp Trung thu.

### 7.6 Mở rộng sau (không thuộc đợt đầu)
| Dịp | Trò | Gắn với |
|---|---|---|
| Hội thi làm bánh (3–4/12) | Đánh trứng, rót khuôn theo nhịp | các món bánh trong `hot` của dịp |
| Mùa hè | Pha nước theo đơn (ghi nhớ thứ tự) | quán nước |
| Giải bóng đá phường | Xếp két bia lên xe đẩy | đơn tiệc dịp đó |
| Việc nhà trong hẻm (hệ 2) | Dùng lại ② cho đám giỗ, ① cho đám cưới | `lifeEvent` |

### 7.7 State, co-op, UI
- State: `biz.miniPlayed?: Record<string, number>` (id trò → ngày game đã tính thưởng), `biz.festivalFlair?: { furniture: string; bonus: number; until: number }[]`.
- Action: `scoreFestivalMini(id, score, mode)` → `GUARDED` khoá `mini:${id}`. Thưởng số lượng được cộng vào **mẻ kế tiếp** của công thức đó trong ngày (lưu `biz.miniBonus?: Record<recipeId, number>`, `startCook` đọc và xoá).
- Điểm trang trí thưởng cộng vào `decorScoreOf` qua một hàm thuần `festivalFlairBonus(biz, day)`, đặt cạnh `vietSetDecorBonus` trong chuỗi ở `customers.ts:175`.
- Cửa vào: nút "🎋 Làm khéo tay" trên thẻ công thức lễ trong `CookPanel`, và trên thẻ dịp lễ ở Sổ đầu ngày (`FestivalCards.tsx`). `CalendarPanel` đánh dấu dịp nào có trò.
- Kết quả hiện ngay bằng số: "Gói được 4/4 cái vuông vức → mẻ hôm nay +3 bánh (≈ +45.000đ)".

### 7.8 Lát cắt

| Lát | Nội dung |
|---|---|
| L1 | `festivalMini.ts` (định nghĩa + bảng thưởng thuần) + `MiniHost` + `useMiniInput` + một trò giả để thử khung trên điện thoại |
| L2 | ① Xếp giỏ quà + `scoreFestivalMini` + `miniBonus` trong `startCook` |
| L3 | ② Gói bánh chưng |
| L4 | `festivalFlair` + ③ Bày mâm ngũ quả |
| L5 | ④ Phất đèn ông sao |
| L6 | Âm thanh, rung nhẹ, hình minh hoạ; mức "Thong thả"; thử trên máy yếu |

### 7.9 Rủi ro
- **Chất lượng cảm giác tay** quyết định tất cả; trò vụng thì thành việc vặt. L1 phải thử trên điện thoại thật trước khi làm tiếp.
- **Kích thước gói**: nạp lười toàn bộ `minigames/`, đặt ngân sách dưới 60 KB nén cho cả bốn trò.
- **Lặp lại hằng năm**: sau 2–3 mùa sẽ nhàm. Đề sinh theo seed giúp một phần; phần còn lại là chấp nhận rằng đây là gia vị, nên thưởng phải nhỏ.

---

## 8. Biến cố dài

### 8.1 Ý tưởng một câu
Mỗi năm game có một hai đợt biến cố kéo 2–4 tuần (đào đường, bão giá, mùa lũ, dịch tả heo): được báo trước vài ngày để chuẩn bị, có lựa chọn ảnh hưởng tới xóm giềng, và người lo xa gần như không thiệt.

### 8.2 Hiện trạng trong code
- Sự kiện ngẫu nhiên trong ngày (`events.ts`): 8 loại, dài 1–2 ngày, chỉ đổi lượng khách (`traffic`), khoảng 15% số ngày.
- Sự kiện thị trường (`calendar.ts`, `marketEventNear`): mỗi khối 5 ngày có thể có một đợt 3 ngày: khan hàng (+35% giá nhập một món), được mùa (−25%), nổi trên mạng (cầu ×2), sửa đường (khách ×0,8).
- Sự kiện bất ngờ thành chuyện 2–3 ngày (`surpriseArcs.ts`): một ô, có lựa chọn, có thưởng cuối.
- Mùa dài đã có dưới dạng "lễ": Mùa hè (1/6–15/8), Mùa mưa (cả tháng 10).
- Trại: bão phá luống (`gardenNight`), nhà lưới che bão. Chưa có dịch bệnh vật nuôi.
- Chưa có thứ gì kéo dài hơn một tuần mà **buộc người chơi đổi cách vận hành**.

### 8.3 Khung chung

```ts
export interface CrisisDef {
  id: string; name: string; icon: string; unlock: number;      // ≥ 36
  season?: SeasonKey[];                  // mùa được phép xảy ra
  phases: CrisisPhase[];                 // báo trước → cao điểm → dịu dần
  preps: CrisisPrep[];                   // việc chuẩn bị, làm trong giai đoạn báo trước
  scenes: { atDay: number; scene: Scene }[];   // dùng lại kiểu Scene/EventChoice của surpriseArcs
  aftermath?: CrisisBoon;                // lợi lâu dài nhỏ sau khi qua
}
export interface CrisisPhase {
  days: number; label: string;
  traffic?: number;                                  // nhân khách ghé
  cost?: Partial<Record<Category, number>>;          // nhân giá nhập theo ngành
  costIds?: Record<string, number>;                  // nhân giá nhập theo món
  demand?: { up: string[]; down: string[]; downMul?: number };
  channel?: { online?: number; phone?: number };     // nhân số đơn kênh xa
  sensitivity?: number;                              // khách nhạy giá hơn
  dirt?: number; spoil?: number; farm?: 'flood' | 'drought' | 'swine';
}
export interface CrisisPrep { id: string; label: string; cost: number; needStock?: Record<string, number>; effect: string }
export interface CrisisState {
  defId: string; startDay: number;
  preps: string[]; choices: Record<number, number>;   // atDay → lựa chọn
  kind: number;                                       // số lựa chọn "ấm"
}
```

**Lịch (tất định, R4):** mỗi năm game rút bằng `hash(weatherSeed, năm)`: 60% có 1 đợt, 25% có 2 đợt, 15% năm yên ả. Ngày bắt đầu nằm trong mùa cho phép, và **không bao giờ** đè lên 10 ngày trước Tết tới hết Tết, cũng không rơi vào 30 ngày đầu của ván hay của một vòng tái sinh. Hai đợt cách nhau ít nhất 60 ngày. Không rút `simRng` (R1).

**Ba giai đoạn:**
1. **Báo trước 3–5 ngày.** Tin sáng + thẻ ở Sổ đầu ngày nêu rõ: chuyện gì, bao lâu, ảnh hưởng gì bằng số, và danh sách việc chuẩn bị kèm giá. Chưa có hiệu ứng xấu nào.
2. **Cao điểm 7–18 ngày.** Hiệu ứng đầy đủ. Mỗi tuần một cảnh có lựa chọn.
3. **Dịu dần 4–7 ngày.** Hiệu ứng còn một nửa rồi hết. Cuối đợt có bảng tổng kết: thiệt bao nhiêu, cứu được bao nhiêu nhờ chuẩn bị, xóm nhớ mình thế nào.

**Áp hiệu ứng (R16):** hàm thuần `crisisEffects(biz.crisis, day)` trả các hệ số; nhân vào đúng những chỗ đang dùng `dayEffects`:
- lượng khách: `rush` ở `customers.ts:169`;
- giá nhập: `setCostModifier` (`suppliers.ts:84`), nơi store đang ghép hệ số lễ/khan hàng/kỹ năng;
- cầu theo món: danh sách `hot` và trọng số chọn món của khách;
- độ nhạy giá: thừa số `tolerance` ở `customers.ts:512`;
- đơn online/điện thoại: tần suất sinh đơn trong `slices/online.ts` và `phoneOrders`;
- bẩn sàn, hỏng hàng, trại: `addDirt`, `spoilOvernight`, `gardenNight`.

Mọi hệ số bằng `1` khi `biz.crisis` trống.

**Luật cân bằng chung** (test `crisisBalance.test.ts` khoá cho từng đợt, chạy `simEconomy` cấp 45 qua trọn đợt):

| Kiểu người chơi | Lãi cả đợt so với cùng quãng không có biến cố |
|---|---|
| Không làm gì, không chuẩn bị | thấp hơn **15–20%**, không tệ hơn |
| Chuẩn bị đủ, chọn hợp lý | **−5% đến +5%** |
| Chuẩn bị đủ và tận dụng kênh được lợi | có thể **+5 đến +10%** |

Không đợt nào được đẩy người chơi vào phá sản: `wageRelief` và vay vốn đã có; thêm quy tắc "trong biến cố, tiệm đang âm tiền thì miễn tiền nhà 3 ngày" (chủ nhà thông cảm, mỗi đợt một lần).

**Tuỳ chọn "Năm yên ả"** trong cài đặt: tắt hẳn biến cố dài. Đổi lại không nhận huy hiệu vượt khó. Dành cho người chỉ muốn chơi nhẹ nhàng.

### 8.4 Bốn biến cố đợt đầu

**① Hẻm bị đào đường làm cống** (18 ngày; mùa khô; cấp 36). Làm trước tiên vì chỉ gồm các hệ số và kênh đã có.

| Giai đoạn | Hiệu ứng |
|---|---|
| Báo trước 4 ngày | phường dán thông báo |
| Cao điểm 10 ngày | khách đi bộ ×0,65; đơn online ×1,4; đơn điện thoại ×1,5; bẩn sàn ×2; hàng từ Chợ đầu mối và Kho sỉ có 30% khả năng trễ một ngày (tất định theo ngày) |
| Dịu dần 4 ngày | khách ×0,85 |
| Sau đó | đường mới: khách ghé ×1,03 vĩnh viễn (cùng kiểu `landmarkCustomerFactor`) |

Chuẩn bị: thuê thêm người giao hàng; treo băng rôn "Vẫn mở cửa — giao tận nhà" (dùng lại hệ Quảng cáo GĐ2219, giảm mức mất khách còn ×0,78); góp tiền với hàng xóm làm lối đi tạm bằng ván (1,5tr; còn ×0,85 và +thân thiết cụm láng giềng).
Cảnh tuần 1: thợ xin gửi nhờ xe cút kít và bán chịu nước → cho (thợ thành khách mua đều cả đợt, +khách) / từ chối.
Cảnh tuần 2: ống nước vỡ ngập trước cửa → tự bỏ tiền thuê bơm cho cả dãy (tốn tiền, +thân thiết lan theo cụm) / chờ phường.

**② Bão giá** (24 ngày; bất kỳ mùa; cấp 40).

| Giai đoạn | Hiệu ứng |
|---|---|
| Báo trước 5 ngày | tin: xăng tăng, mối báo sắp tăng giá |
| Cao điểm 14 ngày | giá nhập mọi ngành tăng dần +3% mỗi 3 ngày tới **+14%**; khách nhạy giá ×1,2; nhân viên có lương dưới mức trung bình vai sẽ xin tăng |
| Dịu dần 5 ngày | giá nhập lùi về +5% rồi về 0 |

Chuẩn bị: **mua trữ trước khi giá lên** (đây là lúc kho lớn và quản lý kho có giá trị; thẻ tính sẵn "trữ X thùng hàng khô tiết kiệm ~Y đồng"); ký giá cố định 3 tuần với một mối (trả phí 2%, chỉ từ bậc Mối thân trở lên).
Cảnh tuần 1: **treo biển "Bình ổn giá"**, cam kết 14 ngày không bán món nào trên giá gợi ý cũ → biên mỏng đi rõ, nhưng danh tiếng mặt giá +, toàn bộ khách quen +thân thiết, và khách ghé ×1,1 (người ta kéo sang tiệm mình). Phá cam kết giữa chừng thì mất gấp đôi.
Cảnh tuần 2: người bán rong hỏi mua lại hàng trữ giá cao → bán (lời nhanh) / giữ cho khách xóm.
Lưu ý: hợp đồng cung cấp (`SUPPLY_CONTRACTS`) tính theo giá bán gợi ý nên **không tự tăng**; thẻ cảnh báo hợp đồng nào đang lỗ, và cho xin giãn một kỳ không mất chuỗi.

**③ Mùa lũ** (16 ngày; chỉ tháng 9–10, trùng "Mùa mưa"; cấp 44).

| Giai đoạn | Hiệu ứng |
|---|---|
| Báo trước 3 ngày | tin áp thấp |
| Cao điểm 8 ngày | thời tiết ép về mưa/giông (đổi bảng chuyển trạng thái của `nextWeather` trong đợt, vẫn tất định); khách ×0,75; cầu tăng: mì gói, nến, áo mưa, nước đóng chai, gạo; hàng khô **để ở tầng kệ thấp nhất** hỏng nhanh ×2; trại ngập (luống chưa có nhà lưới mất tiến độ); sân phơi của hệ 1 gần như không dùng được |
| Dịu dần 5 ngày | khách ×0,9; sau lũ 3 ngày cầu tăng với đồ lau dọn, xà phòng |

Chuẩn bị: bao cát và kê cao hàng (hết hỏng tầng thấp); trữ mì/nước/nến; thu hoạch sớm; cất hết giàn phơi.
Cảnh ngày 3: nhà cuối hẻm ngập, bà con sang hỏi mua chịu mì và nước → cho ghi sổ không tính lãi (dùng sổ nợ có sẵn) / bán thường / **phát miễn phí** (`needStock`, lựa chọn ấm, lan thân thiết cả cụm, một bài khen lan trên mạng xã hội của tiệm).
Cảnh ngày 6: có người gợi ý tăng giá nến và mì lên gấp đôi → từ chối / tăng (lời lớn 2 ngày, sau đó danh tiếng mặt giá tụt mạnh và một bài chê lan truyền). Đây là bài kiểm tra "trục lợi" có hậu quả thật.

**④ Dịch tả heo** (20 ngày; bất kỳ mùa; cấp 48, chỉ khi người chơi đã có chuồng heo hoặc quầy thịt cá).

| Giai đoạn | Hiệu ứng |
|---|---|
| Báo trước 4 ngày | tin dịch ở huyện bên |
| Cao điểm 11 ngày | giá nhập thịt heo +50%; khách né thịt heo (cầu ×0,5) và các món nấu có thịt heo (×0,7); cầu chuyển sang gà, cá, trứng, đậu (×1,4); chuồng heo của mình mỗi đêm có nguy cơ mất đàn nếu chưa phòng dịch |
| Dịu dần 5 ngày | giá thịt heo lùi còn +20%; cầu hồi dần |

Chuẩn bị: tiêm phòng + rắc vôi chuồng (tốn tiền, nguy cơ mất đàn về 0); **xuất chuồng sớm** qua `sellFattened` trước khi dịch tới (được giá thường nhưng heo chưa đủ cân); đổi thực đơn bếp sang gà/cá; trữ trứng.
Cảnh tuần 1: heo nhà có con bỏ ăn → báo thú y (mất con đó, được hỗ trợ một phần, +danh tiếng chất lượng) / lặng lẽ bán chạy (được tiền, nhưng 40% khả năng tất định bị thanh tra phát hiện: phạt nặng theo `INSPECTION_FINE` và mất giấy an toàn thực phẩm một thời gian).
Cảnh tuần 2: Bà Ba bán thịt (khách quen) ế hàng, sang nhờ → mua giúp ít thịt bò/gà của bà để bán hộ (+thân thiết, lan cụm chợ) / thôi.
Id các mặt hàng thịt heo cụ thể phải grep trong `data/meat.ts` lúc làm.

### 8.5 Nối với các hệ khác
| Hệ | Nối thế nào |
|---|---|
| Hệ 2 (Tình làng) | Các lựa chọn "ấm" lan thân thiết theo cụm; giúp xóm trong biến cố là cách nhanh nhất để nâng chỉ số Tình làng. |
| Hệ 1 (Phơi · Muối · Ủ) | Mùa lũ khoá sân phơi; hàng muối/ủ để lâu là thứ bán được khi kênh nhập bị trễ. |
| Hệ 3 (Định vị) | Bình dân lợi lớn khi treo "Bình ổn giá"; Tiện lợi lợi khi đào đường (đơn giao tăng). |
| Hệ 5 (Đi tỉnh) | Đào đường và mùa lũ làm chuyến đi chậm hoặc không đi được; bão giá làm xăng đắt. |
| Mạng xã hội, thanh tra, sổ nợ, quảng cáo, hợp đồng | Đều được dùng làm hậu quả hoặc công cụ, không thêm hệ mới. |

### 8.6 State, co-op, UI
- State: `biz.crisis?: CrisisState`, `biz.crisesSeen?: string[]`, `biz.crisisBadges?: string[]`, `biz.roadBoon?: boolean`, `biz.calmYears?: boolean` (tuỳ chọn Năm yên ả).
- Action: `crisisPrep(id)`, `crisisChoose(atDay, index)`, `setCalmYears(on)` → `GUARDED` khoá `'crisis'`.
- Mở/đóng đợt trong `endDay` bằng hàm thuần `crisisFor(seed, day, level, seen, calm)`.
- UI: một chip trên HUD suốt đợt ("🚧 Đào đường · ngày 6/18"); một thẻ ở Sổ đầu ngày (hiệu ứng hôm nay bằng số + việc chuẩn bị còn làm được); cảnh lựa chọn dùng lại `SurpriseAlert.tsx`; `CalendarPanel` tô dải ngày của đợt; bảng tổng kết cuối đợt; huy hiệu vào hồ sơ tiệm.
- 3D: rào chắn công trình đã có (GĐ184, `isRoadworks`), kéo dài cho cả đợt và thêm rãnh đào, máy xúc; mặt nước ngập mỏng trong hẻm cho mùa lũ; biển "Bình ổn giá" trước tiệm.
- Chữ của cảnh nạp lười cùng `surpriseArcsData.ts`.

### 8.7 Lát cắt

| Lát | Nội dung |
|---|---|
| L1 | `crisis.ts`: kiểu + `crisisFor` (lịch) + `crisisEffects` + test lịch (không đè Tết, cách nhau ≥ 60 ngày, tất định) |
| L2 | Nối `crisisEffects` vào lượng khách và giá nhập (hệ số = 1 khi trống) + chip HUD + thẻ Sổ đầu ngày |
| L3 | ① Đào đường đầy đủ: 3 giai đoạn, 3 việc chuẩn bị, 2 cảnh, lợi đường mới |
| L4 | Bot sim biết chuẩn bị + `crisisBalance.test.ts` + bảng tổng kết + huy hiệu |
| L5 | ② Bão giá + biển Bình ổn giá + xử lý hợp đồng |
| L6 | ③ Mùa lũ + ép thời tiết + hỏng tầng kệ thấp |
| L7 | ④ Dịch tả heo + nguy cơ mất đàn + nhánh thanh tra |
| L8 | Tuỳ chọn Năm yên ả, miễn tiền nhà, trang trí 3D |

### 8.8 Rủi ro
- **Cảm giác bị phạt vô cớ.** Chống bằng: báo trước, mọi thiệt hại hiện bằng số, luôn có việc chuẩn bị vừa túi tiền, luật cân bằng ở §8.3, và tuỳ chọn tắt.
- **Chạm nhiều chỗ nhạy** (`customers.ts`, `suppliers.ts`, `weather.ts`). Mỗi chỗ chỉ thêm một phép nhân, và có test "khi không có biến cố thì kết quả y hệt trước".
- **Ép thời tiết trong mùa lũ** đụng `nextWeather`, thứ mà dự báo, trại và hệ 1 đều dựa vào. Phải đổi ở đúng một nơi (bảng chuyển trạng thái nhận thêm tham số biến cố) để dự báo vẫn luôn đúng.
- **Chồng với sự kiện ngắn.** Trong cao điểm biến cố, tắt sự kiện ngẫu nhiên loại xấu (`kind: 'bad'`) để không chồng hai cái xấu lên nhau.

---

## 9. Thứ tự làm và phụ thuộc

```
Hệ 8 L1–L4 (khung biến cố + đào đường) ──► Hệ 8 L5–L7
Hệ 7 L1–L2 (khung trò + xếp giỏ quà) ────► Hệ 7 L3–L5
Hệ 5 L1–L5 (chuyến đi, 2 tuyến) ─────────► Hệ 5 L6–L8
Hệ 6 L1 (telemetry) ─► chờ số liệu thật ─► Hệ 6 L2–L8
```

| Ưu tiên | Hệ | Vì sao |
|---|---|---|
| 1 | Hệ 8 — Biến cố dài (L1–L4) | Đổi nhịp chơi dài hạn mà gần như không cần hình mới; dùng lại hệ số và khung cảnh có sẵn; có giá trị ngay cho người chơi đơn. |
| 2 | Hệ 7 — Trò khéo tay (L1–L2) | Nhỏ, độc lập hoàn toàn, tạo điểm nhấn dịp lễ. Nên kịp trước một dịp lễ thật để thử. |
| 3 | Hệ 5 — Chuyến đi tỉnh | Cơ chế mới lớn nhất về cảm giác; cần playtest độ dài chuyến. Lợi nhiều hơn khi đã có hệ 1 (mua nguyên liệu thô). |
| 4 | Hệ 6 — Online không đồng bộ | Làm L1 (telemetry) sớm, phần còn lại để sau cùng: cần người chơi thật, cần rà pháp lý, và tạo nghĩa vụ vận hành lâu dài. |

So với bốn hệ chiều sâu: hệ 8 và hệ 7 không phụ thuộc gì, làm song song với đợt A của `SPEC-CHIEU-SAU.md` được. Hệ 5 nên sau hệ 1. Hệ 6 nên sau hệ 4 (nhãn riêng là thứ đáng khoe và đáng bán nhất ở chợ liên hẻm).

File dễ đụng nhau giữa các phiên: `core/slices/endDay.ts`, `core/slices/clock.ts` (hệ 5), `agents/customers.ts` (hệ 7 và 8), `data/suppliers.ts` (hệ 5 và 8), `net/coopGuard.ts`, `data/todayAgenda.ts`, `ui/panels/MorningPanel.tsx`, `server/index.ts` (hệ 6). Mỗi lát chỉ thêm một dòng gọi hàm vào các file này.

---

## 10. Việc cần bạn chốt trước khi code

1. **Hệ 5 — mô hình thời gian.** Spec chọn "vắng mặt thật, đồng hồ vẫn chạy" (§5.3) để giống nhau ở chơi đơn và hẻm online. Phương án khác: đi trong đêm, sáng hôm sau dậy trễ (đơn giản hơn nhưng mất hẳn phần "chơi chuyến đi" và không hợp hẻm online). Chọn cái nào?
2. **Hệ 5 — xe chở hàng tách riêng** khỏi xe cá nhân (`biz.hauler`), và **không thêm sản phẩm mới** cho các tuyến. Đồng ý?
3. **Hệ 6 — chấp nhận không chống gian lận**, đổi lại mọi phần thưởng online đều nhỏ và thiên về hình thức (§6.3). Đồng ý với lập trường này không?
4. ~~Hệ 6 — dữ liệu công khai~~ — **ĐÃ CHỐT 10/11/2026: đồng ý.** Làm danh thiếp công khai, bảng xếp hạng giữa nhiều người chơi (tổ, bạn bè, toàn server) và bảng hẻm cho co-op. Kéo theo các việc bắt buộc ở §6.5 (chính sách, scope đồng ý, lọc tên, báo cáo, xét tay top 10).
5. **Hệ 6 — sự kiện theo lịch thật** (Tết thật, Trung thu thật) trong khi lễ trong game chạy theo ngày game. Hai lịch song song có làm người chơi rối không; hay đặt tên khác hẳn ("Hội chợ toàn quốc") để tách bạch?
6. **Hệ 7 — tạm dừng thế giới** khi chơi trò ở chế độ chơi đơn. Đồng ý, hay muốn đồng hồ vẫn chạy cho căng?
7. **Hệ 8 — mức độ nặng** (không chuẩn bị thì mất 15–20% lãi cả đợt) và **có tuỳ chọn tắt** "Năm yên ả". Nặng quá, nhẹ quá, hay vừa?
8. **Hệ 8 — nhánh "lặng lẽ bán chạy heo bệnh"** trong dịch tả heo là lựa chọn xấu có hậu quả. Giữ nhánh này, hay bỏ vì không hợp không khí ấm áp của game?

---

## Phụ lục — những gì đã đọc để viết spec này

Ngoài các file đã liệt kê ở phụ lục `SPEC-CHIEU-SAU.md`: `server/index.ts` (REST và phần WebSocket), các hàm kiểm tra trong `server/room.ts`; `src/net/alleyApi.ts`, `cloud.ts` (đầu file); `src/main.tsx` (`worldActions.travel`); `src/data/suppliers.ts`, `regionSpecialty.ts`, `supplierRel.ts`, `fairmerchant.ts`, `chophien.ts`, `events.ts`, `community.ts`, `seasonEvent.ts`, `roadwork.ts`, `festivalPrep.ts`, `surpriseArcsData.ts` (đầu file); `src/core/bizStory.ts` (`maybeSurprise`, `chooseSurprise`), `core/counterAsk.ts` (đầu file); `src/agents/branchVisit.ts`.

Chưa đọc kỹ (cần xem lại lúc làm từng lát): `core/slices/online.ts` và `data/phoneOrders.ts` (chỗ sinh đơn, cho hệ 8), `data/meat.ts` (id thịt heo), `data/advertising.ts` (băng rôn), `ui/ArrangePanel.tsx` + `arrangeGeometry.ts` (vẽ sơ đồ chỉ đọc cho hệ 6), `ui/SurpriseAlert.tsx`, `data/returnReminder.ts`, `dev/simEconomy.ts`, và cách `net/coop.ts` xử lý `location` (đang nằm trong `NO_PATCH`: máy khách không gửi ngược về máy chạy, nên "ai đang đi tỉnh" phải lưu ở `trip.traveler` chứ không dựa vào `location`).
