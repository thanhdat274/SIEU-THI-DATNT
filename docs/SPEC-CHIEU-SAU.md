# SPEC CHIỀU SÂU — 4 hệ mới cho Tạp Hóa Đầu Ngõ

> Viết ngày 10/11/2026, đối chiếu code tới GĐ2226. Đây là bản thiết kế để duyệt, CHƯA có dòng code nào.
> Mọi con số cân bằng là đề xuất ban đầu, phải qua `simEconomy` trước khi chốt.
> Mỗi hệ chia thành các lát (L1, L2…), mỗi lát = một GĐ = một commit. Số GĐ thật để phiên làm tự xin (nhiều phiên chung worktree).

Mục lục: [0. Ràng buộc chung](#0-ràng-buộc-chung-rút-từ-code) · [1. Phơi · Muối · Ủ](#1-phơi--muối--ủ) · [2. Tình làng nghĩa xóm](#2-tình-làng-nghĩa-xóm-quan-hệ-khách-quen) · [3. Định vị tiệm](#3-định-vị-tiệm) · [4. Nhãn hàng riêng](#4-nhãn-hàng-riêng) · [5. Thứ tự làm](#5-thứ-tự-làm-và-phụ-thuộc) · [6. Việc cần bạn chốt](#6-việc-cần-bạn-chốt-trước-khi-code)

---

## 0. Ràng buộc chung (rút từ code)

Bốn hệ đều phải theo các luật dưới đây; mỗi mục ghi chỗ trong code làm căn cứ.

| # | Ràng buộc | Căn cứ | Hệ quả cho spec |
|---|---|---|---|
| R1 | Golden sim chỉ chạy **cấp 30, 3 ngày, seed 169**, sai số ±5% | `src/__tests__/simGolden.test.ts` | Mọi cơ chế mới mở ở cấp **≥ 32**. Bước qua đêm mới **không được gọi `simRng()`** khi người chơi chưa dùng hệ đó; ngẫu nhiên thì băm riêng theo `weatherSeed + day + kênh` (mẫu `hash01` ở `weather.ts`, `roll` ở `orders.ts`). |
| R2 | Thêm trường vào `biz`, `garden` không cần tăng `SAVE_VERSION` | `MERGE_DEEP` trong `src/core/save.ts:96` | State mới đặt trong `garden.*` hoặc `biz.*`, có giá trị mặc định ở `newBiz()` / `newGarden`. Trường top-level mới phải thêm vào `snapshot()`. |
| R3 | Co-op: máy chạy tính, máy khách gửi thao tác; thao tác sửa một chỗ phải có khoá | `src/net/coopGuard.ts` (`GUARDED`), test `coopGuard.test.ts` phủ kín | Mỗi action mới của store phải vào `GUARDED` (hoặc là thuần cục bộ), nếu không test đỏ. Mọi kết quả qua đêm tính trong `endDay` (chỉ máy chạy chạy). |
| R4 | Tất định: hai máy cùng seed ra cùng kết quả | `visitsToday`, `offerForDay`, `birthdayDoy` đều băm từ seed/id | Lịch sự kiện mới (ngày giỗ, đơn đại lý) suy ra từ `id` + `weatherSeed` + `day`, không lưu, không random runtime. |
| R5 | Dự báo thời tiết **luôn đúng** 2 ngày tới, có khung giờ mưa trong ngày | `forecastFrom`, `rainSpell`, `describeDay` ở `src/data/weather.ts` | Hệ phơi không phải "đánh bạc với thời tiết" mà là **bài toán sắp xếp**: biết trước mưa lúc mấy giờ, vấn đề là có kịp cất không. |
| R6 | Món phải có thật, đúng tên, đúng cách làm | `CLAUDE.md`, `monThat.test.ts` | Hệ 1 ưu tiên **dùng lại sản phẩm đã có** (`hx_*` trong `homemade.ts`), không đặt tên mới trừ khi tên đó người Việt gọi thật. |
| R7 | Mọi quyết định có số phản hồi; thưởng phụ có cổng | PROGRESS "Nguyên tắc thiết kế" | Mỗi hệ có thẻ Sổ đầu ngày + dòng `todayAgenda` + helper `*Payoff` cho quyết định chính; mọi nguồn thưởng có trần theo ngày/năm. |
| R8 | Chạy được cả chơi đơn và hẻm online | GAME_OVERVIEW §1 | Riêng phần gắn NG+ (ấn định vị) chỉ chơi đơn vì `doPrestige` vốn chỉ chơi đơn. |

Bề mặt UI chung cho cả bốn hệ:
- **Sổ đầu ngày** (`ui/panels/MorningPanel.tsx` + các `Morning*Cards.tsx`): mỗi hệ đúng **một** thẻ, chỉ hiện khi có việc.
- **Việc hôm nay** (`data/todayAgenda.ts`, kiểu `AgendaItem`): mỗi hệ một hàm `*Agenda()` thuần.
- **Phía trước** (`data/unlockMap.ts`, `SYSTEM_UNLOCKS`): thêm mốc mở khoá. Hiện bản đồ dừng ở cấp 75; bốn hệ này kéo dài tới 150.
- **Mồi "Mới mở"** (`biz.unlockActs`, `data/unlockActs.ts`): banner một lần khi tới cấp.

---

## 1. Phơi · Muối · Ủ

### 1.1 Ý tưởng một câu
Người chơi tự làm tại trại những món khô, món muối, món ủ mà hiện chỉ mua được của nhà hàng xóm; mẻ kéo nhiều ngày, phơi thì phải canh mưa, muối thì phải vớt đúng độ, ủ thì càng lâu càng quý.

### 1.2 Vì sao khớp với game hiện tại
- `src/data/homemade.ts` đã có sẵn **103 sản phẩm** kiểu này (`HOMEMADE_PRODUCTS` + `NEIGHBOR2_PRODUCTS`): dưa muối, cà pháo, mắm tép, tương bần, bánh tráng phơi sương, nước mắm nhà ủ, tôm khô, măng khô, khô cá sặc, mực một nắng, củ kiệu, tỏi đen, tôm chua… Hiện chúng **chỉ nhập được ở hàng xóm** (`NEIGHBOR_ONLY_IDS`).
- Khoảng 100 công thức trong `recipes.ts` đang dùng các món này làm nguyên liệu (104 dòng nguyên liệu `hx_*`) (thịt kho tương Bần, cá kho tộ, bánh tráng nướng, cháo tôm khô…). Tự làm được thì cả chuỗi bếp rẻ đi, không cần thêm công thức nào.
- Không cần sản phẩm mới ở lát đầu, nên không đụng `monThat.test.ts`.
- Thời tiết đã tất định và có khung giờ mưa (R5); trại đã có khái niệm công trình 1–3 sao (`FARM_BUILDINGS`), phụ trại làm việc mỗi tối (`farmhandChores`), nhãn "nhà trồng" +20% giá (`HOMEGROWN_PREMIUM`, `garden.homegrown`).

### 1.3 Ba loại trạm (đặt ở trại)

Đặt ở **trại**, không đặt trong tiệm: phơi cần trời, và trại đã có sẵn khung công trình + phụ trại. Ba công trình mới thêm vào `FarmBuildingId`:

| Công trình | id | Mở | Giá 1★ | Sức chứa 1★/2★/3★ | Nâng sao |
|---|---|---|---|---|---|
| Sân phơi | `gian_phoi` | cấp 34 | 5tr | 2 / 4 / 6 nong | tiền + gỗ + đá như công trình khác |
| Dãy vại muối | `vai_muoi` | cấp 38 | 6tr | 2 / 4 / 6 vại | như trên |
| Nhà chum | `chum_u` | cấp 46 | 12tr | 1 / 2 / 4 chum | như trên |

Sức chứa có trần cứng chính là cổng chống farm (R7).

### 1.4 Dữ liệu

File mới `src/data/preserve.ts` (thuần, không import store):

```ts
export type PreserveKind = 'phoi' | 'muoi' | 'u';

export interface PreserveDef {
  id: string;               // 'ps_tom_kho'
  kind: PreserveKind;
  outputId: string;         // id sản phẩm ĐÃ CÓ, vd 'hx_tom_kho'
  outputQty: number;
  inputs: { productId: string; quantity: number }[];
  unlock: number;           // = max(cấp mở trạm, cấp mở sản phẩm)
  /** phoi: số "nắng" cần đủ. muoi/u: số ngày tới lúc dùng được. */
  need: number;
  /** muoi: [ngàyĐầu, ngàyCuối] của cửa sổ ngon, tính từ ngày bắt đầu. */
  window?: [number, number];
  /** u: mốc ủ lâu — vẫn ra đúng outputId, chỉ ra NHIỀU hơn (đã chốt: không thêm sản phẩm mới). */
  aged?: { day: number; outputQty: number };
  /** phoi: chỉ tính ngày nắng đẹp (mực MỘT NẮNG), hay cộng cả sương (bánh tráng phơi sương). */
  sunOnly?: boolean; fogBonus?: boolean;
  /** Cổng "học nghề": đã bán đủ số món này (soldEver) mới biết làm. */
  learnAfterSold: number;
  note: string;             // vùng miền + cách làm thật + thứ gì là thay thế (luật CLAUDE.md)
}

export interface PreserveJob {
  id: number;
  defId: string;
  startDay: number;
  /** phoi: số nắng đã gom (thập phân). muoi/u: không dùng, tính từ startDay. */
  sun: number;
  /** phoi: đang cất trong nhà. */
  covered: boolean;
  /** phoi: số lần dính mưa. */
  wet: number;
  /** Nguyên liệu toàn hàng nhà trồng/nhà nuôi → thành phẩm chắc chắn mang nhãn. */
  allHomegrown: boolean;
}
```

State: thêm `garden.preserveJobs: PreserveJob[]` (mặc định `[]`) và `garden.rackLog: { day: number; out: [number, number][] }` (các khoảng phút giàn đang phơi ngoài trời hôm nay). Cả hai nằm trong `garden` nên save cũ tự bù (R2).

### 1.5 Luật từng loại

**Phơi (`phoi`).** Mỗi đêm `endDay` cộng "nắng" cho mẻ theo thời tiết ngày vừa qua và việc giàn có ở ngoài không:

| Thời tiết ngày đó | Giàn ở ngoài cả ngày | Cất kịp trước cơn mưa, phơi lại sau | Cất cả ngày |
|---|---|---|---|
| Nắng đẹp | +1,0 | — | 0 |
| Sương mù | +0,7 (mẻ `fogBonus`: +1,2) | — | 0 |
| Nhiều mây | +0,6 | — | 0 |
| Mưa | **dính mưa**: +0, `wet+1` | +0,4 | 0 |
| Giông bão | **mất cả mẻ** | +0,1 | 0 (an toàn) |

- "Dính mưa" = có khoảng nào trong `rackLog.out` giao với `rainSpell(seed, day, weather)`. Tính bằng hàm thuần, không cần đụng `tick`.
- Mẻ `sunOnly` (mực một nắng) chỉ nhận điểm ở ngày Nắng đẹp và xong đúng khi đủ 1,0.
- Đủ `need` thì chuyển sang "chờ thu"; để quá 2 ngày không thu thì xuống một bậc chất lượng (khô quá, bạc màu).
- Thao tác của người chơi: **Cất giàn / Mang ra phơi** (một nút cho cả sân, ghi vào `rackLog`), **Thu mẻ**.
- Nâng cấp **Bạt kéo** (mua một lần, 3tr, cấp 40): mưa thường không còn làm ướt, nhưng mọi ngày chỉ nhận 80% nắng. Bão vẫn phải cất.

**Muối (`muoi`).** Không phụ thuộc thời tiết, phụ thuộc **thời điểm vớt**:

| Vớt vào lúc | Kết quả |
|---|---|
| Trước `window[0]` | Chưa vớt được ("còn hăng, chưa chua") |
| Đúng ngày `window[0]` hoặc `window[0]+1` | **Ngon** |
| Phần còn lại của cửa sổ | Đạt |
| Sau `window[1]` tối đa 2 ngày | Kém ("khú") |
| Sau đó nữa | Hỏng, đổ bỏ |

Trời nắng nóng làm chua nhanh: mỗi ngày Nắng đẹp tính là 1,25 ngày (hàm thuần `pickleAge(job, weatherLog)`; cần lưu thêm `heat: number` cộng dồn trong job thay vì nhật ký thời tiết).

**Ủ (`u`).** Đủ `need` ngày là rút được hàng thường. Giữ tiếp tới `aged.day` thì rút ra **cùng sản phẩm đó nhưng nhiều hơn** (đề xuất ×1,6 sản lượng, cả lô mang nhãn nhà làm +20%), đổi lại chum bị chiếm lâu gấp đôi. Không có sản phẩm "thượng hạng" riêng. Chum không hỏng theo thời gian; rủi ro duy nhất là **chi phí cơ hội**.

**Ba bậc chất lượng** (không đổi cấu trúc `Lot`, không thêm trường chất lượng vào lô):

| Bậc | Điều kiện | Hiệu ứng |
|---|---|---|
| Ngon | Phơi: `wet = 0` và thu đúng hạn. Muối: vớt đầu cửa sổ. Ủ: luôn Ngon nếu rút đúng mốc. | Toàn bộ sản lượng được cộng vào `garden.homegrown[outputId]` → bán **+20%** theo cơ chế nhà trồng đang có (`sales.ts:63`). |
| Đạt | Mặc định | Sản lượng đủ, không nhãn (trừ khi `allHomegrown`). |
| Kém | Phơi: `wet ≥ 1` hoặc thu trễ. Muối: khú. | Sản lượng ×0,6. |

### 1.6 Danh mục đợt đầu (toàn sản phẩm đã có)

Cột "Mở" = cấp mở của mẻ. Nguyên liệu ghi bằng chữ; id thật phải grep lúc làm (đã thấy có: `rau`, `ca`, `thit`, `nep`, `x_muoi`, `x_duong`, `x_chuoi`, `x_gung`, `x_xoai`, `trung_vit`). Thiếu nguyên liệu thô nào thì theo luật 4 của CLAUDE.md: thay bằng thứ gần nhất và ghi rõ, hoặc bỏ món đó.

| Loại | Thành phẩm (id đã có) | Cần | Mở |
|---|---|---|---|
| Phơi | Bánh tráng phơi sương `hx_banh_trang` | 2 nắng, `fogBonus` | 34 |
| Phơi | Tôm khô nhà phơi `hx_tom_kho` | 3 nắng | 52 |
| Phơi | Măng khô nhà phơi `hx_mang_kho` | 4 nắng | 53 |
| Phơi | Nấm mèo khô nhà phơi `hx_nam_meo` | 3 nắng | 54 |
| Phơi | Khô cá sặc nhà phơi `hx_kho_ca_sac` | 3 nắng | 64 |
| Phơi | Mực một nắng nhà phơi `hx_muc_mot_nang` | 1 nắng, `sunOnly` | 98 |
| Muối | Dưa muối nhà làm `hx_dua_muoi` | cửa sổ ngày 2–4 | 38 |
| Muối | Cà pháo muối `hx_ca_phao` | cửa sổ 3–5 | 38 |
| Muối | Chanh muối nhà làm `hx_chanh_muoi` | cửa sổ 7–12 | 40 |
| Muối | Củ kiệu muối nhà làm `hx_cu_kieu` | cửa sổ 5–8 | 68 |
| Muối | Dưa hành muối nhà làm `hx_dua_hanh` | cửa sổ 3–5 | 102 |
| Muối | Dưa cải chua nhà làm `hx_dua_cai` | cửa sổ 2–4 | 105 |
| Ủ | Mắm tép `hx_mam_tep` | 10 ngày | 46 |
| Ủ | Tương bần `hx_tuong_ban` | 14 ngày | 46 |
| Ủ | Nước mắm cá cơm nhà ủ `hx_nuoc_mam` | 14 ngày; ủ 28 ngày ra ×1,6 sản lượng | 46 |
| Ủ | Tỏi đen nhà ủ `hx_toi_den` | 21 ngày | 58 |
| Ủ | Tôm chua Huế nhà ủ `hx_tom_chua` | 7 ngày | 67 |
| Ủ | Tương hột nhà ủ `hx_tuong_hot` | 14 ngày | 78 |

Không đưa vào: các món tên gắn "bà Tám" (đó là hàng của bà, mình không tự làm được), và dải ô mai `hx_o_mai_*` cấp 113–140 (để dành cho đợt 2 nếu hệ chạy tốt).

Thời gian thật của nước mắm, tương là nhiều tháng; game nén lại, phần `note` của mỗi mẻ phải ghi rõ "thật 6–12 tháng, game nén còn 14 ngày".

### 1.7 Kinh tế

- **Luật giá vốn:** tổng tiền nguyên liệu một mẻ = **55–65% giá NHẬP ở hàng xóm** của số thành phẩm ra. Tức tự làm rẻ hơn mua khoảng 35–45%, đổi lại phải chờ ngày, chiếm chỗ và chịu rủi ro. Test `preserveMargin.test.ts` khoá khoảng này cho mọi mẻ (mẫu "test giá thật" đang dùng cho món).
- **Đánh đổi có thật:** tự làm thì doanh số mua ở hàng xóm giảm → bậc mối quen (`biz.supplierRel`, `supplierRelMonth`) và khoản hoàn cuối tháng tụt. Thẻ payoff phải hiện cả hai vế.
- **Thông thạo:** dùng lại `cookMastery[defId]`; mốc 20/50/100 mẻ cho **+5/+10/+15% sản lượng** (không giảm thời gian, vì thời gian là cốt lõi của hệ).
- **XP:** thu mẻ +4 XP × số ngày của mẻ, trần 40.
- **Cổng học nghề:** `soldEver[outputId] ≥ learnAfterSold` (đề xuất 30). Ý nghĩa: bán quen món của hàng xóm rồi mới được chỉ nghề. Nối luôn với hệ 2: người chỉ nghề là một khách quen, đủ thân thì bỏ qua cổng này.

### 1.8 Nối với hệ cũ

| Hệ | Nối thế nào |
|---|---|
| Thời tiết | `rainSpell` quyết định dính mưa; dự báo 2 ngày hiện ngay trên thẻ sân phơi. |
| Phụ trại | `farmhandChores` thêm việc: tối nào mai có mưa/bão thì cất giàn, sáng tạnh mang ra; thu mẻ chín. Bổ sung vào `farmhandPayoff`. Có phụ trại thì người chơi khỏi chạy ra trại, đây là giá trị mới của vai này. |
| Bếp | Không sửa `recipes.ts`. Nguyên liệu `hx_*` tự làm rẻ hơn nên `kitchenValue` tự tăng. |
| Lịch lễ | Thẻ nhắc đếm lùi: "còn 6 ngày tới Tết, củ kiệu cần 5–8 ngày: muối HÔM NAY". Tính từ `FESTIVALS` + `window`. |
| Đơn tiệc / hợp đồng | Hàng muối/ủ là hàng khô, để được lâu, hợp làm hàng giao định kỳ (nền cho hệ 4). |
| Nhà lưới (`nha_luoi`) | Đã che bão cho vườn (`farmStormSafe`); mở rộng: nhà lưới 3★ che luôn sân phơi khỏi **bão** (vẫn ướt nếu mưa). |

### 1.9 Thao tác store và co-op

Action mới (slice `garden.ts`), tất cả vào `GUARDED`:

| Action | Khoá |
|---|---|
| `startPreserve(defId)` | `preserve:start` |
| `collectPreserve(jobId)` | `preserve:${jobId}` |
| `setRackCovered(on)` | `preserve:rack` |
| `buyRackTarp()` | `preserve:tarp` |

Bước qua đêm: hàm thuần `preserveNight(jobs, rackLog, { day, weather, seed, hasFarmhand, tarp, stormSafe })` gọi trong `endDay` ngay sau `gardenNight`, trả `{ jobs, news }`. **Không rút `simRng`** (R1): mọi kết quả suy ra từ thời tiết đã tất định.

### 1.10 Giao diện

- `GardenPanel` thêm tab **"🏺 Phơi · Muối · Ủ"**: mỗi nong/vại/chum một ô có thanh tiến độ, số ngày còn lại, bậc chất lượng dự kiến, nút hành động. Đầu tab là dải dự báo 2 ngày kèm giờ mưa (`describeDay`).
- Sổ đầu ngày: một thẻ gộp, chỉ hiện khi có việc: mẻ chín chờ thu, mẻ dưa vào cửa sổ ngon hôm nay, hôm nay có mưa mà giàn đang phơi (kèm giờ mưa).
- `todayAgenda`: `rackRainAgenda()` hiện trước cơn mưa 90 phút game: "☔ 14:00 mưa — sân còn 3 nong đang phơi". Cùng mẫu với `goldenHourAgenda`.
- 3D: nong tre tròn trên giàn, vại sành, chum có nắp ở góc trại; nong đổi màu theo tiến độ. Làm sau, không chặn L1.

### 1.11 Lát cắt

| Lát | Nội dung | Xong khi |
|---|---|---|
| L1 | `preserve.ts` (kiểu + 3 mẻ phơi) + `preserveNight` + test thuần | Test bảng thời tiết × trạng thái giàn xanh; golden không đổi |
| L2 | Công trình `gian_phoi`, action, `GUARDED`, tab trong `GardenPanel` | Phơi được một mẻ trọn vòng ở chơi đơn và co-op |
| L3 | Thẻ Sổ đầu ngày + `rackRainAgenda` + mốc `unlockMap` + mồi "Mới mở" | Người chưa đọc hướng dẫn vẫn biết phải cất giàn |
| L4 | Phụ trại tự cất/thu + cập nhật `farmhandPayoff` | Thẻ payoff hiện đúng số tiền cứu được |
| L5 | Vại muối + 6 mẻ muối + cửa sổ ngon | — |
| L6 | Nhà chum + 6 mẻ ủ + mốc ủ lâu | — |
| L7 | Bạt kéo, nhắc đếm lùi lễ, `preservePayoff` (tự làm vs mua hàng xóm, tính cả phần mối quen mất) | — |
| L8 | Mô hình 3D | — |

### 1.12 Rủi ro
- **Thêm một thứ phải nhớ.** Giảm bằng thẻ gộp ở Sổ đầu ngày và phụ trại tự lo.
- **Chạy ra trại giữa giờ bán.** Đó là chủ ý (đánh đổi thời gian), nhưng nếu playtest thấy bực thì cho bấm cất giàn từ xa khi đã có phụ trại đang trong ca.
- **Lệch cân bằng bếp** do nguyên liệu rẻ đi: kiểm bằng `simEconomy` ở cấp 60 trước/sau, cho phép lãi bếp tăng tối đa 10%.

---

## 2. Tình làng nghĩa xóm (quan hệ khách quen)

### 2.1 Ý tưởng một câu
28 khách quen có họ hàng, bạn bè, người khắc khẩu; chuyện vui buồn của một nhà kéo theo cả cụm, và tiệm mình là nơi lo cỗ.

### 2.2 Hiện trạng trong code
- 28 người ở `regularsList.ts`, mỗi người có thân thiết, perk, 3 chương truyện riêng (`STORIES`), sinh nhật băm từ id (`birthdayDoy`).
- Đợt nhờ vả nhiều ngày (`regularArc.ts`) mới có **3 arc** cho 3 người đầu.
- Đơn tiệc (`orders.ts`): 43 đơn, nhưng `GameState.order` chỉ có **một ô**; đã có sẵn các đơn "đám giỗ", "đám hỏi", "đầy tháng", "tân gia" nhưng người đặt là nhân vật vô danh ("Nhà bác Năm giữa hẻm"), không dính tới ai.
- Mini-arc có lựa chọn (`surpriseArcs.ts`): `EventChoice` đã hỗ trợ `friendship: { id, delta }` và `needStock`. Một ô `biz.surpriseArc`.
- Đối thủ lôi kéo từng người riêng lẻ (`rivalNightAI`, `POACH_FRIENDSHIP = 25`).
- Giữa hai khách quen **không có quan hệ nào** trong dữ liệu.

### 2.3 Dữ liệu quan hệ

File mới `src/data/regularTies.ts`:

```ts
export type TieKind = 'ho_hang' | 'ban_be' | 'lang_gieng' | 'dong_nghe' | 'khac_khau';
export interface RegularTie { a: string; b: string; kind: TieKind; note: string }
export const TIE_WEIGHT: Record<TieKind, number> =
  { ho_hang: 0.5, ban_be: 0.3, lang_gieng: 0.25, dong_nghe: 0.2, khac_khau: -0.3 };
```

Đề xuất 22 cạnh, suy từ vai và các đơn/hợp đồng đang có (đây là **nội dung cần bạn duyệt**, xem §6):

| A | B | Loại | Căn cứ / chuyện |
|---|---|---|---|
| Bà Năm bán xôi | Bác Tám tổ trưởng | láng giềng | đơn `mung_tho` đã có: Bà Năm đặt cỗ mừng thọ Bác Tám |
| Bà Năm | Bé Na | họ hàng (bà–cháu) | cùng là khách đầu game |
| Bác Tám | Cô Nga tổ chức hội | bạn bè | cùng lo việc phường |
| Bác Tám | Bác Đôi ngày hội | bạn bè | hội xóm và hội làng |
| Bác Đôi | Sư cụ Khánh Long | bạn bè | lễ hội làng gắn với chùa |
| Chú Ba xe ôm | Bác Ba xe ôm | **khắc khẩu** | hai người giành cuốc đầu hẻm |
| Chú Ba xe ôm | Bác Hùng thợ máy | bạn bè | xe hư là ghé |
| Bác Hùng | Chú Thợ điện | đồng nghề | thợ trong xóm |
| Chú Tư công nhân | Chú Cường chủ xưởng | láng giềng | lò gạch và xưởng gỗ |
| Chú Cường | Anh Minh quán nhậu | bạn bè | thợ xưởng nhậu ở quán |
| Anh Minh | Chú Sáu chài lưới | đồng nghề | mối cá của quán |
| Bà Ba bán thịt | Cô Xuân chợ rau | bạn bè | cùng chợ |
| Bà Ba | Chú Sáu | **khắc khẩu** | thịt với cá giành khách chợ |
| Cô Mai pha chế | Chú Thắng cắt tóc | láng giềng | quán vỉa hè cạnh tiệm tóc |
| Cô Thảo tiệm bánh | Cô Nga | bạn bè | "quen hội" |
| Cô Mùa bán hoa | Cô Thảo | bạn bè | hoa và bánh cưới |
| Chị Lan văn phòng | Anh Giao ngân hàng | họ hàng (chị–em) | — |
| Anh Tuấn lập trình | Dũng phòng gym | bạn bè | — |
| Bác Hải bác sĩ | Sư cụ | bạn bè | khám miễn phí ở sân chùa |
| Chị Bé live sale | Chị Vy livestream | **khắc khẩu** | giành người xem |
| Chị Bé | Chị Hạnh đóng hàng | đồng nghề | — |
| Anh Tuấn | Chị Vy | họ hàng (anh–em) | — |

Test `regularTies.test.ts`: mọi id tồn tại, không cạnh trùng, mỗi người có 1–4 cạnh, đồ thị không ai bị cô lập.

### 2.4 Cơ chế 1 — Tiếng lành, tiếng dữ lan theo cạnh

Chỉ các **sự kiện lớn** mới lan, mua bán thường ngày không lan (giữ nguyên nhịp thân thiết hiện có và golden):

| Sự kiện gốc (đã có trong code) | Điểm gốc | Lan sang người có cạnh |
|---|---|---|
| Giao đơn riêng đúng hẹn (`STORY_ORDER_FRIEND_GAIN`) | +8 | `round(8 × weight)` |
| Lỡ hẹn đơn riêng (`STORY_ORDER_FRIEND_LOSS`) | −5 | `round(−5 × weight)` |
| Xoá nợ (`forgiveDebt`) | — | họ hàng +2 ("nhớ ơn") |
| Quỵt nợ bị ghi sổ (`WRITE_OFF_FRIEND_LOSS`) | âm | họ hàng −1 (ngại) |
| Đòi lại khách bị lôi kéo (`rescuePoachedRegular`) | +3 | bạn bè +1 |
| Lo xong một việc nhà (cơ chế 2) | theo bậc cỗ | cả cụm khách mời |

- Cạnh `khac_khau` có trọng số âm: lo chu đáo cho A thì B hơi dỗi.
- **Trần:** mỗi người nhận lan tối đa **±3 điểm/ngày**; xoá nợ chỉ lan **1 lần/30 ngày** cho mỗi con nợ (chống cho vay nhỏ rồi xoá liên tục).
- Cài bằng một hàm thuần `rippleFriendship(sourceId, delta, kind)` trả danh sách `{ id, delta }`; slice `regulars.ts` áp qua `adjustFriendship` sẵn có. Cổng cấp **≥ 32**.

### 2.5 Cơ chế 2 — Việc nhà trong hẻm

Mỗi khách quen đã thân có các việc lớn trong đời; tiệm được nhờ lo cỗ.

```ts
export type LifeEventKind = 'gio' | 'cuoi' | 'day_thang' | 'tan_gia' | 'mung_tho';
export interface LifeEventDef {
  id: string; kind: LifeEventKind; host: string;      // regularId
  minFriendship: number;                              // gio: 25; việc lớn: 40
  noticeDays: number;                                 // báo trước 5–7 ngày
  /** Ba mức cỗ: gọn / đủ / linh đình. Người chơi CHỌN mức khi nhận lời. */
  menus: [Record<string, number>, Record<string, number>, Record<string, number>];
  bonus: [number, number, number]; friendship: [number, number, number];
}
export interface LifeEventState { defId: string; eventDay: number; tier: 0|1|2; accepted: boolean }
```

- **Đám giỗ: lặp hằng năm**, ngày cố định băm từ id như sinh nhật (`gioDoy(def)`, salt khác `birthdayDoy`), không lưu (R4). Người chơi nhớ được "tháng Ba là giỗ nhà Bà Năm" qua từng năm. Lịch (`CalendarPanel`) đánh dấu các ngày giỗ đã biết.
- **Cưới, đầy tháng, tân gia, mừng thọ: một lần mỗi ván** cho mỗi người có def, kích khi thân thiết qua ngưỡng.
- **Ô riêng** `biz.lifeEvent?: LifeEventState`, không dùng chung ô `order`, để không tranh chỗ với đơn tiệc thường. Tối đa một việc nhà tại một thời điểm; hai việc trùng ngày thì việc sau lùi 3 ngày.
- **Chọn mức cỗ** là quyết định có đánh đổi (cùng tinh thần `placeBet`): mức cao thưởng lớn và lan thân thiết mạnh, nhưng lỡ hẹn thì phạt cũng theo mức. Thẻ nhận lời phải hiện: cần nấu những gì, đã có trạm chưa (`orderFulfillable` dùng lại nguyên), tổng giờ nấu ước tính, hàng muối/ủ nào phải bắt đầu **từ hôm nay** mới kịp.
- **Thực đơn** lấy từ món đã có và hàng hệ 1: giỗ miền Bắc cần dưa hành, miền Nam cần củ kiệu, thịt kho trứng, canh, xôi… Đây là nơi hệ 1 có cầu thật.
- **Giao** dùng lại `takeStock` như `deliverOrder`. Giao xong: thưởng tiền, host cộng thân thiết, **mọi người có cạnh với host** (trừ khắc khẩu) nhận phần lan → đúng nghĩa "cả họ biết tiệm mình lo cỗ ngon".
- **Lỡ hẹn:** host −, cụm họ hàng −, một review 1★. Từ chối ngay từ đầu thì không mất gì.
- **Trần thưởng:** mỗi người tối đa 1 giỗ/năm và 1 việc lớn mỗi loại/ván, nên không farm được (R7).

### 2.6 Cơ chế 3 — Người khắc khẩu

Dùng lại nguyên khung mini-arc. Thêm vào `SurpriseArcDef` một trường tuỳ chọn `needRegulars?: string[]`; `maybeSurprise` (`core/bizStory.ts:27`) lọc arc mà cả hai người đã từng ghé. Mỗi cạnh `khac_khau` là một arc 3 cảnh:

1. Hai người chạm mặt ở quầy, lời qua tiếng lại. Chọn: bênh A / bênh B / mời cả hai ly trà (`needStock`, lựa chọn `good`).
2. Hôm sau người bị phật ý không ghé; người kia kể chuyện. Chọn: nhắn lời / mặc kệ / mang quà sang (`needStock`).
3. Cảnh hoà giải (nếu đi đường `good`): hai người ngồi chung bàn ở quán nước. Thưởng theo `ArcReward`; cạnh `khac_khau` chuyển thành `ban_be`.

Cạnh đã hoà giải lưu ở `biz.tiesMended?: string[]` (id cạnh `a|b`). Ba cạnh khắc khẩu trong bảng trên cho ba arc.

### 2.7 Cơ chế 4 — Lôi kéo theo cụm

Sửa `rivalNightAI` (`src/data/rivals.ts:302`), cổng cấp ≥ 32 để không lệch golden (R1):
- Một người vừa bị kéo thì **họ hàng/bạn bè** của họ có thân thiết < `POACH_FRIENDSHIP` thành "lung lay": 3 đêm kế xác suất bị kéo ×2. `atRiskOfPoach` trả thêm cờ này để cảnh báo trên HUD không hứa hão.
- Đòi lại được một người (`rescuePoachedRegular`) thì cả cụm miễn bị kéo 7 ngày.
- Người có thân thiết ≥ 40 ("mối ruột", `EMOTIONAL_FRIENDSHIP`) là **mỏ neo**: mỗi mỏ neo giảm 25% xác suất lung lay của người có cạnh với họ.

Ý nghĩa cho người chơi: chăm sâu vài người then chốt giữ được cả cụm, thay vì phải chăm đều 28 người.

### 2.8 Chỉ số "Tình làng"

Hàm thuần `alleyBond(regulars, tiesMended)`: với mỗi cạnh không khắc khẩu, lấy `min(thân thiết A, thân thiết B)` quy về 0–1 (đủ 40 là 1), cộng lại, chia tổng số cạnh → 0–100%. Dùng để:
- Hiện ở `RegularsPanel` dưới dạng sơ đồ cụm (mỗi người một chấm, cạnh đậm dần theo `min`).
- Mốc 25/50/75/100% thưởng một lần mỗi ván (tiền + danh hiệu; mốc 100% tặng một món decor "Cổng chào hẻm văn hoá").
- Không nhân vào lượng khách hay giá bán (giữ nguyên tắc c: meta chỉ ghi nhận).

### 2.9 State, co-op, UI

- State mới (đều trong `biz`, R2): `lifeEvent?`, `lifeEventsDone?: string[]`, `tiesMended?: string[]`, `rippleDay?: Record<string, { day: number; sum: number }>`, `forgiveRipple?: Record<string, number>`.
- Action mới: `acceptLifeEvent(tier)`, `declineLifeEvent()`, `deliverLifeEvent()` → `GUARDED` khoá chung `'lifeEvent'`.
- Sinh sự kiện trong `endDay` (cạnh `offerForDay`), bằng hàm thuần `lifeEventFor(seed, day, level, regulars, done, stations)`.
- UI: thẻ "🏮 Việc nhà trong hẻm" ở Sổ đầu ngày (đếm lùi + còn thiếu gì); `lifeEventAgenda()` trong `todayAgenda`; `RegularsPanel` thêm tab "Quan hệ"; `CalendarPanel` đánh dấu ngày giỗ.
- 3D (làm sau): ngày có đám, dựng rạp bạt trước nhà host trong hẻm, khách quen trong cụm tụ lại (dùng `agents/residents.ts`).

### 2.10 Lát cắt

| Lát | Nội dung |
|---|---|
| L1 | `regularTies.ts` + test + tab "Quan hệ" chỉ đọc + `alleyBond` (chưa đổi gì trong ván) |
| L2 | Lan thân thiết cho 3 sự kiện gốc (đơn riêng đúng/lỡ hẹn, xoá nợ) + trần |
| L3 | Đám giỗ hằng năm cho 6 người mở sớm nhất + ô `lifeEvent` + 3 mức cỗ + thẻ/agenda |
| L4 | Cưới, đầy tháng, tân gia, mừng thọ (mỗi loại 2–3 def) |
| L5 | `needRegulars` + 3 arc khắc khẩu + `tiesMended` |
| L6 | Lôi kéo theo cụm + mỏ neo + cảnh báo HUD |
| L7 | Mốc Tình làng + danh hiệu + decor; mở giỗ cho đủ 28 người |
| L8 | Rạp đám trong 3D |

### 2.11 Rủi ro
- **Lạm phát thân thiết:** perk mở sớm hơn dự tính. Trần ±3/ngày và chỉ lan từ sự kiện lớn; đo bằng test mô phỏng 60 ngày, tổng thân thiết không vượt +15% so với trước.
- **Nội dung nhiều:** 28 ngày giỗ dùng chung 4–5 mẫu thực đơn theo vùng, không viết riêng từng người.
- **Chữ:** thoại arc phải nạp lười như `surpriseArcsData.ts` để gói đầu không nặng thêm.

---

## 3. Định vị tiệm

### 3.1 Ý tưởng một câu
Từ cấp 60, chủ tiệm treo biển theo một trong ba hướng; mỗi hướng thưởng cho cách bán đúng hướng và phạt cách bán trái hướng, nên không còn chuyện "cái gì cũng tối đa".

### 3.2 Đây là hệ duy nhất CỐ Ý đổi công thức kinh tế
Nguyên tắc (c) trong PROGRESS nói meta không đổi kinh tế. Hệ này là cơ chế lõi mới chứ không phải meta, và GAME_OVERVIEW §6 đã ghi "hướng cũ cần dừng để mở cơ chế mới". **Đã được duyệt ngày 10/11/2026** (xem §6); vẫn làm L1–L2 (chỉ đo) trước để có số liệu rồi mới bật hiệu ứng. Cổng cấp 60 nên golden cấp 30 không đổi (R1).

### 3.3 Các đòn bẩy có sẵn trong code

| Đòn bẩy | Ở đâu | Hệ định vị chạm vào bằng cách |
|---|---|---|
| Lượng khách ghé | chuỗi nhân `visit = (0.5 + decorBoost + rep) × traffic × priceAppeal × …` ở `agents/customers.ts:180` | thêm một thừa số `stanceTraffic(s)` |
| Khách chịu giá | `keepChance(id, price, sensitivity)` ở `data/pricing.ts:63`; chỗ gọi `customers.ts:512` nhân `c.sensitivity × rivalPress × tolerance` | thêm thừa số `stanceSensitivity(s, productId)` |
| Kiên nhẫn xếp hàng | `ProfessionDef.patience`, `RegularDef.patienceMinutes` | thừa số `stancePatience(s)` |
| Khách đêm | nâng cấp `night` ("Mở ca đêm 24h", `upgrades.ts:33`), `nightTrafficAt`, `NIGHT_PRICE_MUL = 1.15` | thừa số đêm |
| Đối thủ | `RIVAL_UNDERCUT` theo tính cách, `rivalTrafficFactor` | giảm/tăng sức ép theo hướng |
| Giá so thị trường | `referenceSell`, `priceRatio` | đo độ khớp hướng Bình dân |
| Hàng đặc sản | `NEIGHBOR_ONLY_IDS`, sản phẩm `rg_*` có `region`, `COOKED_PRODUCT_IDS`, `garden.homegrown` | đo độ khớp hướng Đặc sản |
| Dịch vụ, máy | `biz.services` (5 dịch vụ), các `FurnitureType` máy tự phục vụ | đo độ khớp hướng Tiện lợi |

### 3.4 Ba hướng

Mỗi hướng có: **điều kiện khớp** (đo mỗi đêm, hiện rõ từng tiêu chí), **lợi**, **giá phải trả**. Hiệu ứng tăng tuyến tính theo bậc 1→5; số dưới đây là ở **bậc 5**.

**🏷️ Bình dân — "rẻ nhất hẻm"**

| | |
|---|---|
| Khớp khi | ≥ 70% ô kệ đang bày có giá ≤ 97% giá gợi ý thị trường, **và** không món nào > 110% |
| Lợi | Khách ghé +20%. Trần "rẻ kéo khách" (`lowPriceDemandCap`) từ 1,15 lên 1,25. Đối thủ kiểu phá giá (`cutter`) mất 40% sức ép. |
| Giá phải trả | Biên mỏng do chính điều kiện. Khách đã quen rẻ: món nào bán trên giá gợi ý bị chê nặng hơn 50% (`sensitivity ×1,5` cho phần vượt). Sao món (`dishPriceMul`) chỉ còn hưởng một nửa. |
| Hợp với | Tiệm nhiều quầy thu ngân, kho lớn, nhập sỉ (Kho sỉ Đại Phát, chợ đầu mối), combo. |

**🏺 Đặc sản — "ngon có tiếng"**

| | |
|---|---|
| Khớp khi | ≥ 40% ô kệ là hàng đặc sản (nhà làm, nhà trồng, món nấu, đặc sản vùng), **và** điểm danh tiếng mặt chất lượng ≥ 4,0 |
| Lợi | Với hàng đặc sản: khách chịu giá hơn 30% (`sensitivity ×0,7`). Giỏ có hàng đặc sản mua thêm 1 món. Nhà phê bình ghé thường hơn. Hàng mang nhãn nhà trồng/nhà làm bán +30% thay vì +20%. |
| Giá phải trả | Khách ghé −15%. Hàng công nghiệp bán như cũ nhưng không được lợi gì. Khách soi kỹ: tỉ lệ chê hàng cận hạn (`nearExpiryRefuseChance`) gấp đôi; mỗi review về chất lượng tính hai lần vào danh tiếng. |
| Hợp với | Trại, bếp, hệ 1 (phơi/muối/ủ), mối lái đặc sản vùng, bảng hiệu 4 miền. |

**🌙 Tiện lợi — "lúc nào cũng mở"**

| | |
|---|---|
| Khớp khi | Tiệm chính mở ≥ 18 giờ/ngày (cần nâng cấp `night`), ≥ 4 dịch vụ quầy đang bật, ≥ 3 máy tự phục vụ, **và** tỉ lệ khách bỏ về vì chờ ≤ 5% |
| Lợi | Khách đêm +50%. Lời dịch vụ quầy +25%. Thu máy tự phục vụ +25%. Đường cao điểm sáng phẳng bớt: khung vắng (`slowBands`) được +15% khách. |
| Giá phải trả | Khách vội: kiên nhẫn xếp hàng −20%. Giỏ nhỏ hơn 1 món. Lương ca đêm, điện, rủi ro trộm đêm đều là chi phí thật đang có. Khách quen kiểu "ngồi lâu" không được lợi gì. |
| Hợp với | Nhiều nhân viên chia ca, bảo vệ, camera, POS, quầy phụ, chi nhánh 24/7 (dùng chung kinh nghiệm vận hành đêm). |

### 3.5 Bậc và nhịp tiến

```ts
export type StanceId = 'binh_dan' | 'dac_san' | 'tien_loi';
export interface StanceState {
  id: StanceId; since: number;
  fitDays: number;      // tổng số ngày khớp kể từ khi treo biển
  missStreak: number;   // số ngày lệch liên tiếp
  switchUntil?: number; // đang "làm lại biển", chưa có hiệu ứng
}
```

- Bậc theo tổng ngày khớp: **3 / 10 / 21 / 35 / 50** ngày → bậc 1…5. Không mua được bằng tiền.
- Lệch hướng 3 ngày liền thì tụt 1 bậc (trừ `fitDays` về ngưỡng bậc dưới). Một hai ngày lỡ tay không sao.
- Lần treo biển đầu miễn phí. **Đổi hướng:** trả tiền làm biển (đề xuất 5tr × bậc tiệm), 14 ngày không có hiệu ứng nào, bậc về 0.
- Không treo biển cũng là một lựa chọn hợp lệ: không lợi, không phạt (đúng như game hiện tại).

Mỗi đêm `endDay` gọi hàm thuần `stanceFit(s): { fit: boolean; checks: { label; have; need; ok }[] }`; thẻ ở Sổ đầu ngày hiện từng dòng, ví dụ "Giá ≤ 97% thị trường: 62% ô kệ (cần 70%) ✗ — 9 món đang đắt, xem Bảng giá".

### 3.6 Đối thủ phản ứng

Chỉnh `rivalNightAI`, chỉ khi người chơi có biển (nên cấp < 60 không đổi):
- Rival `cutter` gặp Bình dân: đua giá không lại, chuyển sang chiến thuật khuyến mãi ngắn ngày (đã có `saleUntil`).
- Rival `quality` gặp Đặc sản: tranh nhà phê bình; mỗi lần mình bị review chất lượng xấu, rival +2 sức mạnh.
- Rival `aggressive` gặp Tiện lợi: tăng xác suất giựt **nhân viên ca đêm** (đã có `STAFF_POACH_CHANCE`).
- Gặp đúng "khắc tinh" (vd `cutter` đấu với Đặc sản) thì hai bên ít giẫm chân nhau: sức ép rival −25%.

### 3.7 NG+ — "ấn" giữ qua các vòng (chỉ chơi đơn)

Đạt bậc 5 của một hướng thì nhận một **ấn**, lưu ở `biz.prestige.seals?: StanceId[]`. Phải sửa `prestigeRestart` (`src/core/prestige.ts:93`) để mang `seals` sang vòng mới (hiện nó tạo lại `prestige: { level, bonus, goalsClaimed: [] }`).

| Ấn | Lợi vĩnh viễn nhỏ, có hiệu lực dù vòng sau treo biển gì |
|---|---|
| Ấn Bình dân | Nhập hàng mọi mối rẻ thêm 2% |
| Ấn Đặc sản | Mọi mẻ nấu/phơi/muối/ủ ra thêm 1 đơn vị |
| Ấn Tiện lợi | Kiên nhẫn xếp hàng của mọi khách +10% |
| Đủ ba ấn | Danh hiệu mới + được treo **hai biển cùng lúc** (hiệu ứng mỗi biển còn 60%) |

Thêm 3 mục vào `NG_GOALS` ("vòng này đạt bậc 3 một hướng chưa có ấn"). Nhờ vậy sáu lần tái sinh có lý do chơi khác nhau, thay vì chỉ là +8% doanh thu.

### 3.8 Cân bằng và kiểm chứng

- Mở rộng `src/dev/simEconomy.ts`: thêm tuỳ chọn `stance` và ba **chính sách bot** (bot Bình dân tự hạ giá về 95%; bot Đặc sản ưu tiên bày hàng đặc sản; bot Tiện lợi bật ca đêm + dịch vụ).
- Test mới `stanceBalance.test.ts`: chạy cấp 65, 10 ngày, cùng seed, bốn kịch bản (không biển + ba hướng ở bậc 3). Yêu cầu:
  - mỗi hướng lãi **hơn** không biển từ 5% đến 20%;
  - chênh lệch giữa ba hướng **≤ 15%**;
  - bot chơi **sai hướng** (treo Bình dân nhưng bán đắt) lãi **kém** không biển.
- Thêm một mốc `GOLDEN[65]` riêng cho từng hướng sau khi chốt số, để các GĐ sau không vô tình làm lệch.
- Test này nặng; gắn nhãn chậm và chỉ chạy khi đụng các file `stance*`, `pricing.ts`, `customers.ts`.

### 3.9 State, co-op, UI

- State: `biz.stance?: StanceState`, `biz.prestige.seals?`.
- Action: `chooseStance(id)`, `dropStance()` → `GUARDED` khoá `'stance'`.
- Co-op: biển là của cả tiệm; đổi biển cần **cả hẻm đồng ý** (dùng lại cơ chế bỏ phiếu như `installSleepVote`) vì ảnh hưởng mọi người. Ấn không áp dụng trong hẻm online.
- UI: mục "🪧 Biển hiệu" trong `BusinessPanel`: ba thẻ hướng, mỗi thẻ có "bạn đang khớp X/Y tiêu chí" **trước khi** chọn; thanh bậc; lịch sử 14 ngày khớp/lệch. 3D: tấm biển phụ dưới bảng hiệu tiệm đổi theo hướng.
- Mốc `unlockMap` cấp 60, đặt cạnh mốc Tái sinh.

### 3.10 Lát cắt

| Lát | Nội dung | Đổi kinh tế? |
|---|---|---|
| L1 | `stance.ts`: ba hàm `stanceFit` thuần + thẻ "Tiệm bạn đang nghiêng về hướng nào" (chỉ đo) | Không |
| L2 | Bot chính sách + `stanceBalance.test.ts` chạy với hiệu ứng = 0 (dựng khung đo) | Không |
| L3 | Treo biển + bậc + hiệu ứng hướng **Bình dân** | Có |
| L4 | Hướng **Đặc sản** | Có |
| L5 | Hướng **Tiện lợi** | Có |
| L6 | Đổi biển, tụt bậc, bỏ phiếu co-op | — |
| L7 | Đối thủ phản ứng | Có |
| L8 | Ấn NG+ + sửa `prestigeRestart` + `NG_GOALS` | Có (chơi đơn) |

L1 và L2 làm được ngay, không rủi ro, và cho số liệu thật để chỉnh các con số ở §3.4 trước khi bật hiệu ứng.

### 3.11 Rủi ro
- **Một hướng trội hẳn** → mọi người chọn giống nhau. Phòng bằng test cân bằng ở §3.8 và nguyên tắc "lợi lớn nhất của mỗi hướng nằm ở nhóm hàng khác nhau".
- **Phạt gây bực.** Mọi khoản phạt đều do chính người chơi làm trái hướng mình chọn, và thẻ Sổ đầu ngày báo trước. Không treo biển thì không bao giờ bị phạt.
- **Đụng `customers.ts`**, file 1.229 dòng và nhạy với golden. Mọi thừa số mới phải trả đúng `1` khi `biz.stance` trống.

---

## 4. Nhãn hàng riêng

### 4.1 Ý tưởng một câu
Từ cấp 100, những món nhà làm đã thành thạo được dán nhãn mang tên tiệm, sản xuất theo lô ở xưởng, rồi bỏ mối cho đại lý và tiệm nhượng quyền; việc cuối game là giữ uy tín một thương hiệu.

### 4.2 Hiện trạng trong code
- Cấp 100–200 chỉ có công thức mới và danh hiệu.
- `SUPPLY_CONTRACTS` (`data/contracts.ts`) **đã là chiều "mình giao hàng cho người ta"** (quán nhậu, xưởng gỗ, bếp ăn công nhân…), có đủ chu kỳ, chuỗi đúng hẹn, cam kết trữ hàng, ROI. Hợp đồng cao nhất mở ở cấp 55. Hệ này nối tiếp đúng khung đó.
- Tiệm xôi (`tiemXoi.ts`, `tiemXoiDay`) là mẫu "cơ sở phụ sản xuất số lượng lớn mỗi đêm đổ vào kho chung".
- `garden.homegrown` là mẫu "đếm số đơn vị trong kho được hưởng giá cao", không cần thêm mã sản phẩm.
- Bản đồ chỉ có 2 khu (`zones.ts`); Ngõ 3 chưa duyệt. Nên đại lý và nhượng quyền là các điểm **ngoài bản đồ**, quản lý bằng bảng, không cần dựng 3D.

### 4.3 Điều kiện và dòng sản phẩm

Chỉ **hàng khô để lâu** mới dán nhãn được (thật ngoài đời cũng vậy): sản phẩm ra từ hệ 1 (nước mắm, tương, mắm, khô, dưa muối đóng hũ) và đồ khô nhà làm khác. Món nấu tươi hạn 3 ngày không bỏ mối được.

Một sản phẩm vào nhãn khi:
- đã **thông thạo** (`cookMastery[defId] ≥ 100` mẻ), và
- đã bán ≥ 500 đơn vị (`soldEver`).

Số **dòng** (slot) mở theo cấp: 1 dòng ở cấp **100**, thêm ở **115 / 130 / 145 / 160 / 180** (tối đa 6). Đây là lấp dải 100–200 bằng mốc cơ chế chứ không phải bằng món.

### 4.4 Dữ liệu

```ts
export interface BrandLine { productId: string; since: number; made: number; sold: number }
export interface BrandState {
  name: string;                         // người chơi đặt, ≤ 24 ký tự như shopName
  lines: BrandLine[];
  /** Số đơn vị đang có trong kho mang nhãn (mẫu garden.homegrown). */
  stock: Record<string, number>;
  rep: number;                          // uy tín 0–100
  repLog: { day: number; delta: number; why: string }[];   // cửa sổ lăn 14 ngày
  workshop: { open: boolean; staff: number; tier: 0|1|2 } | null;
  deals: Record<string, ContractState>; // dùng lại kiểu ContractState
  franchises: FranchiseState[];
}
```

Đặt ở `biz.brand?` (R2).

### 4.5 Vòng chơi

**a) Sản xuất — Xưởng đóng gói** (cơ sở phụ kiểu tiệm xôi; mua mặt bằng 60tr ở cấp 100)
- Mỗi đêm xưởng lấy thành phẩm **chưa nhãn** trong kho, đóng thành hàng **có nhãn** (chuyển số đếm sang `brand.stock`), tốn phí bao bì 8% giá bán gợi ý/đơn vị + lương thợ.
- Công suất/đêm theo số thợ và bậc xưởng: 20 / 45 / 80 đơn vị cho mỗi thợ ở bậc 0 / 1 / 2, tối đa 3 thợ.
- Chỉ lô đạt bậc **Ngon hoặc Đạt** (hệ 1) mới đóng được. Lô Kém mà cố đóng (có nút, cho phép) thì trừ uy tín khi hàng tới tay khách.
- Hàm thuần `brandWorkshopDay(state, storage, …)` cùng mẫu `tiemXoiDay`.

**b) Bán lẻ tại tiệm**
- Hàng có nhãn bán cao hơn hàng thường theo bậc uy tín (bảng §4.6). Áp tại đúng chỗ đang áp nhãn nhà trồng trong `checkout` (`sales.ts`), và **không cộng dồn** với +20% nhà trồng: lấy mức cao hơn.

**c) Bỏ mối cho đại lý** (mở ở cấp 110)

Thêm `BRAND_DEALERS` cùng dạng `SupplyContract`, nhưng `items` là "N đơn vị của một dòng do người chơi chọn":

| Đại lý | Mở | Cần uy tín | Chu kỳ | Lượng/kỳ | Giá so bán lẻ |
|---|---|---|---|---|---|
| Sạp chợ huyện | 110 | 20 | 5 ngày | 40 | 82% |
| Cửa hàng đặc sản phố cổ | 125 | 40 | 7 ngày | 60 | 90% |
| Chuỗi quán cơm tỉnh | 140 | 55 | 4 ngày | 80 | 85% |
| Siêu thị thành phố | 155 | 70 | 7 ngày | 150 | 88% |
| Đại lý xuất đi tỉnh xa | 170 | 85 | 10 ngày | 300 | 92% |

Dùng lại nguyên: `ContractState`, chuỗi đúng hẹn (`CONTRACT_STREAK_EVERY`), cam kết trữ hàng (`committed`, `locked`), thẻ `contractAcceptRoi`. Điểm khác: giao **trễ hoặc thiếu** thì trừ uy tín, và ba kỳ hỏng liên tiếp đại lý cắt hợp đồng, 30 ngày sau mới ký lại được.

**d) Bỏ mối cho đối thủ** (tuỳ chọn, mở cùng cấp 110)

Chỉ có một rival tại một thời điểm (`biz.rival`). Rival đang sống sẽ thỉnh thoảng hỏi mua hàng nhãn của mình giá **95%** (cao hơn mọi đại lý). Đổi lại mỗi kỳ giao rival +1 sức mạnh và hàng của mình nằm trên kệ họ. Đây là lựa chọn "tiền nhanh nhưng nuôi đối thủ"; thẻ phải ghi rõ cả hai vế.

**e) Nhượng quyền** (mở ở cấp 150, thêm suất ở 170 và 190; tối đa 3 điểm)

```ts
export interface FranchiseState { id: string; openedDay: number; health: number; missedWeeks: number }
```

- Mở một điểm: phí setup 80tr, cần uy tín ≥ 60.
- Mỗi tuần điểm đó cần **N đơn vị hàng nhãn** (N theo quy mô điểm), xe tự chở từ kho chung như `branchHaul`.
- Mỗi đêm điểm trả **phí nhượng quyền** = 6% doanh thu mô phỏng của điểm (hàm thuần `franchiseIncome(health, rep, day)`, cùng mẫu `sapRongIncome`, không mô phỏng khách).
- Thiếu hàng một tuần: `health` giảm, phí giảm, uy tín −3. Thiếu 3 tuần liền: điểm đóng, mất phí setup.
- Mỗi điểm đang khoẻ cộng uy tín +0,2/ngày ("tiếng lan xa").

### 4.6 Uy tín nhãn

| Sự kiện | Uy tín |
|---|---|
| Giao đại lý đúng hẹn, đủ hàng | +2 |
| Review 4–5★ có món mang nhãn trong giỏ | +0,2 (trần +2/ngày) |
| Mỗi điểm nhượng quyền khoẻ | +0,2/ngày |
| Giao trễ | −4 |
| Giao thiếu / bỏ kỳ | −8 |
| Bán hàng nhãn cận hạn (≤ 1 ngày) | −0,5 mỗi món |
| Đóng lô Kém | −1 mỗi 10 đơn vị |
| Không sản xuất gì trong 14 ngày | −1/ngày ("nhãn nguội") |

| Bậc | Uy tín | Bán lẻ hàng nhãn | Mở khoá |
|---|---|---|---|
| Nhãn mới | 0–19 | +5% | — |
| Có tiếng trong xóm | 20–39 | +10% | đại lý đầu |
| Có tiếng trong huyện | 40–59 | +15% | — |
| Đặc sản tỉnh | 60–79 | +20% | nhượng quyền |
| Thương hiệu quốc dân | 80–100 | +25% | đại lý tỉnh xa, danh hiệu |

`repLog` 14 ngày để thẻ uy tín luôn trả lời được "vì sao tụt" (R7).

### 4.7 Quyết định mà hệ này tạo ra
- **Chia hàng:** cùng một chum nước mắm, bán lẻ lời cao nhất, đại lý đều tay, nhượng quyền là nghĩa vụ. Thiếu hàng thì bỏ ai?
- **Nhanh hay bền:** đóng cả lô Kém để kịp kỳ giao (mất uy tín) hay chịu trễ (cũng mất uy tín, mức khác)?
- **Mở rộng tới đâu:** thêm một đại lý là thêm một nghĩa vụ; sức sản xuất (số chum, sức xưởng) là trần thật.
- **Nuôi đối thủ** hay không.
- **Hướng định vị nào** hợp: Đặc sản cộng hưởng mạnh với nhãn riêng; Bình dân thì nhãn riêng thành "hàng nhà giá mềm" (chạy khối lượng).

### 4.8 Kinh tế mục tiêu
Đo bằng `simEconomy` ở cấp 100, 130, 160 (thêm bot biết đóng nhãn và giao kỳ):

| Mốc | Lãi ròng từ nhãn riêng so với tổng lãi ngày |
|---|---|
| 1 dòng, chỉ bán lẻ (cấp 100) | 8–12% |
| 3 dòng + 2 đại lý (cấp 130) | 20–25% |
| 6 dòng + 5 đại lý + 3 nhượng quyền (cấp 180+) | 35–45% |

Vượt 50% là hệ này nuốt game bán lẻ; phải hạ.

### 4.9 Tái sinh
`prestigeRestart` reset toàn bộ ván. Giữ lại qua NG+: **tên nhãn** và **bậc uy tín cao nhất từng đạt** (để hiện ở hồ sơ tiệm, không có hiệu ứng). Vòng mới phải dựng lại dòng hàng. Vì nhãn riêng mở ở cấp 100 mà tái sinh mở ở 60, cần thêm vào `prestigePreview` một dòng "bỏ lại: nhãn X, uy tín Y, Z đại lý".

### 4.10 State, co-op, UI
- Action: `foundBrand(name)`, `addBrandLine(productId)`, `dropBrandLine(productId)`, `buyBrandWorkshop()`, `hireBrandWorker()`, `fireBrandWorker()`, `acceptBrandDeal(id, productId)`, `deliverBrandDeal(id)`, `commitBrandDeal(id)`, `openFranchise(id)`, `closeFranchise(id)` → `GUARDED`, khoá chung `'brand'` cho nhóm xưởng, `brandDeal:${id}` cho từng hợp đồng.
- Panel mới `{ type: 'brand' }` (thêm vào union `Panel`): 4 tab — Dòng hàng · Xưởng · Bỏ mối · Nhượng quyền; đầu panel là thanh uy tín + 3 dòng `repLog` gần nhất.
- Sổ đầu ngày: thẻ "🏷️ Nhãn [tên]": kỳ giao sắp tới, hàng nhãn trong kho so với nghĩa vụ 7 ngày tới (`brandRunway()` thuần), cảnh báo điểm nhượng quyền thiếu hàng.
- `contractAgenda` mở rộng để gồm cả `brand.deals`.
- Mốc `unlockMap`: 100 (nhãn + xưởng), 110 (đại lý), 150 (nhượng quyền).
- Danh hiệu mới ở các mốc uy tín 40/60/80 và "3 điểm nhượng quyền cùng khoẻ 30 ngày".

### 4.11 Lát cắt

| Lát | Nội dung |
|---|---|
| L1 | `brand.ts`: kiểu + điều kiện vào nhãn + bậc uy tín (thuần) + test |
| L2 | Lập nhãn, 1 dòng, đếm `brand.stock`, giá bán lẻ theo bậc, panel tab Dòng hàng |
| L3 | Xưởng đóng gói (mua, thợ, chạy đêm) |
| L4 | Uy tín đầy đủ + `repLog` + thẻ Sổ đầu ngày |
| L5 | 2 đại lý đầu, dùng lại khung hợp đồng |
| L6 | 3 đại lý còn lại + bỏ mối cho đối thủ |
| L7 | Mở dần 6 dòng + bot sim + test kinh tế mục tiêu |
| L8 | Nhượng quyền |
| L9 | Danh hiệu, `prestigePreview`, hồ sơ tiệm |

### 4.12 Rủi ro
- **Phụ thuộc hệ 1.** Không có phơi/muối/ủ thì gần như không có hàng khô nhà làm để dán nhãn. Hệ 4 chỉ bắt đầu sau khi hệ 1 xong tới L6.
- **Ít người tới cấp 100.** Chưa có số liệu người chơi thật (GAME_OVERVIEW §7). Nên có telemetry phễu theo cấp trước khi đầu tư L5 trở đi.
- **Quá nhiều nghĩa vụ định kỳ** cộng với hợp đồng, đơn trại, việc nhà (hệ 2). Thẻ `brandRunway` và việc gộp vào `contractAgenda` là bắt buộc, không phải tuỳ chọn.

---

## 5. Thứ tự làm và phụ thuộc

```
Hệ 1 L1–L4 (sân phơi) ──► Hệ 1 L5–L7 (vại, chum) ──────────────► Hệ 4 (nhãn riêng)
        │                          │                                  ▲
        │                          ▼                                  │
        └──────────────► Hệ 2 L3–L4 (cỗ giỗ cần dưa hành, củ kiệu)    │
Hệ 2 L1–L2 (quan hệ, lan thân thiết) — độc lập, làm song song được    │
Hệ 3 L1–L2 (chỉ đo) — độc lập, làm song song được ──► Hệ 3 L3–L8 ─────┘ (cộng hưởng, không chặn)
```

Đề xuất chia đợt:

| Đợt | Gồm | Vì sao |
|---|---|---|
| A | Hệ 1 L1–L4 · Hệ 2 L1–L2 · Hệ 3 L1–L2 | Không đổi kinh tế cũ, golden an toàn, ba mảng không đụng file của nhau nên ba phiên chạy song song được |
| B | Hệ 1 L5–L7 · Hệ 2 L3–L5 | Hệ 1 tạo cung, hệ 2 tạo cầu |
| C | Hệ 3 L3–L8 | Đợt đổi kinh tế; làm riêng để dễ đo |
| D | Hệ 4 L1–L9 | Cần hệ 1 xong; nên có telemetry trước |
| E | Phần 3D của hệ 1, 2, 3 | Không chặn gameplay |

File dễ đụng nhau giữa các phiên (theo quy ước nhiều phiên chung worktree): `core/slices/endDay.ts` (cả 4 hệ đều thêm bước qua đêm), `core/gameTypes.ts`, `net/coopGuard.ts`, `data/todayAgenda.ts`, `data/unlockMap.ts`, `ui/panels/MorningPanel.tsx`. Mỗi lát chỉ nên thêm **một dòng gọi hàm** vào các file này, logic nằm trong file riêng của hệ.

Sau mỗi lát: cập nhật PROGRESS.md; sau mỗi đợt: cập nhật GAME_OVERVIEW.md (§3 bảng mở khoá, §4, §8).

---

## 6. Việc cần bạn chốt trước khi code

1. **Trạm phơi/muối/ủ đặt ở trại** (spec đang chọn) hay đặt trong tiệm như trạm nấu? Ở trại thì hợp lý về thời tiết và dùng được phụ trại, nhưng người chưa mở trại (cấp 8) không dùng được — chấp nhận được vì hệ mở ở cấp 34.
2. **Bảng 22 quan hệ ở §2.3** là mình tự đề xuất từ vai và các đơn đang có. Bạn sửa/duyệt từng cạnh, nhất là 3 cặp khắc khẩu và các cặp họ hàng.
3. ~~Hệ 3 đổi công thức kinh tế~~ — **ĐÃ CHỐT 10/11/2026: đồng ý.** Hệ định vị được phép đổi lượng khách và độ chịu giá từ cấp 60, chỉ khi người chơi treo biển.
4. ~~Sản phẩm mới "Nước mắm nhĩ"~~ — **ĐÃ CHỐT 10/11/2026: KHÔNG thêm.** Hệ 1 hoàn toàn không có sản phẩm mới; mốc ủ lâu chỉ tăng sản lượng của chính sản phẩm đó.
5. **Tên bốn hệ** hiện trong game: "Phơi · Muối · Ủ", "Tình làng nghĩa xóm", "Biển hiệu", "Nhãn riêng". Đổi tuỳ bạn.
6. **Các con số** ở §1.3, §1.5, §3.4, §4.5, §4.6 đều là điểm xuất phát để sim, không phải số chốt.

---

## Phụ lục — những gì đã đọc để viết spec này

`GAME_OVERVIEW.md`, `PROGRESS.md` (đầu file), `CLAUDE.md`; `src/core/gameTypes.ts`, `save.ts`, `prestige.ts`, `slices/endDay.ts`, `slices/orders.ts` (startCook), `slices/clock.ts` (tick mẻ nấu), `slices/sales.ts` (priceOf); `src/data/recipes.ts` (đầu file), `weather.ts`, `freshness.ts`, `homemade.ts`, `furniture.ts`, `calendar.ts`, `regulars.ts`, `regularArc.ts`, `regularTrust.ts`, `regularChurn.ts`, `orders.ts`, `surpriseArcs.ts`, `biz.ts`, `rivals.ts` (nửa đầu), `contracts.ts`, `pricing.ts`, `segmentPricing.ts`, `dishStars.ts`, `cookMastery.ts`, `shopHours.ts`, `zones.ts`, `unlockMap.ts`, danh sách cây trồng và công trình trại trong `garden.ts`; `src/net/coop.ts` (phần guard), `coopGuard.ts`; `src/agents/customers.ts` (chuỗi lượng khách); `src/__tests__/simGolden.test.ts`.

Chưa đọc kỹ (cần xem lại lúc làm từng lát): `core/biz.ts` (`bizEndOfDay`), `core/bizStory.ts`, nửa sau `rivals.ts` (`rivalNightAI`), `dev/simEconomy.ts`, `data/tiemXoi.ts`, `data/services.ts`, `data/ngGoals.ts`, các panel UI, và id chính xác của nguyên liệu thô cho các mẻ ở §1.6.
