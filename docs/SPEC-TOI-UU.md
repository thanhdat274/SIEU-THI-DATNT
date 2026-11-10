# SPEC TỐI ƯU — 6 hạng mục nền cho Tạp Hóa Đầu Ngõ

> Viết ngày 10/11/2026, đối chiếu code tới GĐ2228. Bản thiết kế để duyệt, CHƯA có dòng code nào.
> Đi cùng `docs/SPEC-CHIEU-SAU.md` (hệ 1–4) và `docs/SPEC-CHIEU-RONG.md` (hệ 5–8). File này đánh mã T1–T6.
> Khác hai spec kia: đây là việc **nền**, không thêm nội dung chơi. Mỗi mục bắt đầu bằng **số đo thật hôm nay** (mình đã chạy lệnh trên repo để lấy), rồi mới tới đề xuất.

Mục lục: [T1. Số liệu người chơi thật](#t1-số-liệu-người-chơi-thật) · [T2. Hiệu năng trên điện thoại](#t2-hiệu-năng-trên-điện-thoại) · [T3. Nhịp mở khoá](#t3-nhịp-mở-khoá) · [T4. Gỡ golden khỏi nội dung](#t4-gỡ-golden-khỏi-nội-dung) · [T5. Test và co-op](#t5-test-và-co-op) · [T6. Quá tải giao diện](#t6-quá-tải-giao-diện) · [Thứ tự làm](#thứ-tự-làm) · [Việc cần chốt](#việc-cần-bạn-chốt)

## Những điều đọc code làm mình phải sửa lại nhận định ban đầu

| Mình đã nói | Thực tế trong code | Hệ quả |
|---|---|---|
| "Cấp 29–30 dồn bốn hệ lớn: quán nước, chi nhánh, mini mart, quản lý kho" | Chi nhánh 24/7 mở ở **cấp 10** (`CONVENIENCE.unlock`, `data/branches.ts:16`), không phải 30. `GAME_OVERVIEW.md` §3 ghi sai. | Cụm dồn vẫn có thật nhưng thành phần khác, và nó trải ở **cấp 29–36** chứ không riêng 29–30 (xem T3). |
| "600 mặt hàng trên kệ, cần instancing" | Đã làm từ GĐ886: `shop/shelfInstancer.ts` gộp hàng của **mọi kệ** theo từng món, 1 `InstancedMesh` cho mỗi phần vật liệu của mỗi món. | Không cần làm lại. Việc còn thiếu là **đo**, không phải instancing. |
| "Lazy-load dữ liệu công thức" | Công thức nằm trong đường tải đầu vì `products.ts` import `COOKED_PRODUCTS` từ `recipes.ts`. Chunk chứa nó bị đặt tên nhầm là `surpriseArcs-*.js` (87 KB nén). | Tách được, nhưng phải tách file trước (xem T2). |
| "Kiểm tra host gửi cả state hay chỉ phần thay đổi" | Đã kiểm: gửi **cả state**, 5 lần mỗi giây (xem T5). | Đây là mục tối ưu rõ nhất về mạng. |
| "Thêm một lối vào 'việc cần làm tiếp'" | Đã có ba thứ gần giống: Sổ đầu ngày, dải "Kế hoạch hôm nay" (`TodayAgendaStrip`), chip giờ vắng (`IdleChip`). | Việc cần làm là **gộp** ba thứ, không phải thêm thứ tư (xem T6). |

Ngoài ra: trong lúc mình viết các spec, một phiên khác đã bắt đầu code hệ 1 theo spec (commit GĐ2227, GĐ2228; `src/data/preserve.ts` đã tồn tại và đang có thay đổi chưa commit ở `todayAgenda.ts`, `MorningPanel.tsx`, `unlockMap.ts`…). Spec này không đụng các file đó.

---

## T1. Số liệu người chơi thật

### Số đo hôm nay
- Trong `src/` **không có** dòng telemetry nào (grep `telemetry`, `gtag`, `analytics.track`: 0 kết quả). `data/analytics.ts` là sổ phân tích trong game, không gửi đi đâu.
- Có sẵn: nhật ký hiệu năng **cục bộ** 7 ngày (`recordPerf` / `readPerfLog` trong `render/graphicsQuality.ts`, lưu `localStorage`).
- Có sẵn: hạ tầng đồng ý (`consents` trên server, `src/net/consent.ts`), xác thực Firebase, giới hạn tần suất.
- Mọi route `/api/*` hiện **bắt buộc đăng nhập** (`server/index.ts:111`). Người chơi không đăng nhập thì server không biết gì về họ.

### Câu hỏi cần trả lời được (thiết kế đi ngược từ đây)
1. Trong 100 người cài, bao nhiêu người qua ngày 1, ngày 3, ngày 7? Rời ở **cấp nào**?
2. Mất bao nhiêu **phút chơi thật** để tới cấp 10, 30, 60, 100?
3. Bảng nào **không ai mở**? Hệ nào mở khoá rồi mà không ai dùng?
4. FPS thật trên máy người chơi là bao nhiêu, ở mức đồ hoạ nào, loại máy gì?
5. Người chơi rời game **ngay sau chuyện gì**: ngất, âm tiền, bị thanh tra phạt, lên cấp có quá nhiều thứ mới?

### Thiết kế: gửi **tóm tắt theo ngày game**, không gửi dòng sự kiện

Một bản ghi nhỏ cho mỗi ngày game đã chốt, gom tại `endDay`, gửi theo lô khi có mạng:

```ts
interface DayReport {
  v: 1;
  install: string;        // id ngẫu nhiên sinh trên máy, KHÔNG phải uid, không gắn tài khoản
  build: string;          // phiên bản game
  day: number; level: number; prestige: number;
  mode: 'solo' | 'alley';
  realSec: number;        // giây thật đã chơi trong ngày game này
  sessions: number;       // số lần mở game trong ngày game này
  moneyBand: 0|1|2|3|4;   // dải tiền (âm / <1tr / <10tr / <100tr / hơn), không gửi số thật
  customers: number; unhappy: number; walkouts: number;
  fainted: boolean; shortfall: boolean; inspectFail: boolean;
  panels: Record<string, number>;   // số lần mở từng bảng trong ngày
  used: string[];                   // hệ có thao tác trong ngày: 'cook','garden','online','branch',…
  unlockedToday: number;            // số mục mới mở khi lên cấp trong ngày
  fps: number; gfx: 'low'|'medium'|'high'; device: 'phone'|'tablet'|'desktop';
}
```

- **Không có**: tên, email, uid, tên tiệm, toạ độ, nội dung gõ, số tiền thật.
- `panels` đếm bằng cách bọc `openPanel` (một chỗ duy nhất, `core/slices/clock.ts:154`).
- `used` suy từ `DayStats` đã có (`onlineDone`, `farmHarvest`, `cookOrders`, `combos`, `services`…, đúng các trường `seasonEvent.ts` đang đọc).
- `realSec` đếm bằng đồng hồ thật chỉ khi tab đang hiện.
- Kích thước mỗi bản ghi khoảng 400–600 byte. Gửi tối đa 1 lần/5 phút, lô tối đa 20 bản ghi.

### Đồng ý và pháp lý
- **Mặc định tắt.** Hỏi một lần sau ngày game thứ 2 (không hỏi lúc mới vào), câu hỏi một dòng kèm nút "Xem gửi những gì" hiện đúng bản ghi mẫu ở trên.
- Scope đồng ý mới `telemetry_anon`. Người chưa đăng nhập: lưu lựa chọn trong `localStorage`; người đã đăng nhập: ghi thêm vào `consents`.
- Route mới `POST /t` **không cần đăng nhập**, giới hạn tần suất theo `install` + IP, chỉ nhận đúng lược đồ trên (thừa trường thì bỏ cả bản ghi).
- Bản ghi tự xoá sau 180 ngày (TTL của MongoDB). Tắt telemetry thì gửi `DELETE /t/:install` xoá hết.
- Cập nhật `docs/CHINH-SACH-BAO-MAT.md`: mục "Số liệu ẩn danh".

### Dùng được ngay cả khi chưa có server
`game.report()` trong console và nút "Xuất nhật ký chơi thử" trong ⋯ Thêm: tải về một file JSON gồm 30 `DayReport` gần nhất lưu cục bộ. Người chơi thử gửi file qua tin nhắn là có số liệu, không cần chờ lượng người dùng.

### Đọc số liệu
Script `scripts/telemetry-report.mjs` đọc MongoDB (hoặc một thư mục file JSON xuất tay) và in ra `docs/telemetry/BAO-CAO-<ngày>.md` với năm bảng ứng với năm câu hỏi ở trên. Không dựng dashboard.

### Lát cắt
| Lát | Nội dung |
|---|---|
| L1 | Kiểu `DayReport` + gom tại `endDay` + lưu 30 bản cục bộ + `game.report()` + nút xuất file |
| L2 | Hỏi đồng ý + scope + màn "Xem gửi những gì" + cập nhật chính sách |
| L3 | `POST /t`, `DELETE /t/:install`, TTL, kiểm lược đồ, test |
| L4 | `scripts/telemetry-report.mjs` + báo cáo đầu tiên |

### Rủi ro
- Ít người đồng ý thì mẫu lệch về người chơi nhiệt tình. Chấp nhận; vẫn hơn không có gì.
- `install` là định danh giả danh; phải ghi rõ trong chính sách, không được ghép với uid ở bất kỳ đâu.

---

## T2. Hiệu năng trên điện thoại

### Số đo hôm nay (bản build trong `dist/`, ngày 10/11)

| Chunk | Thô | Nén gzip | Ghi chú |
|---|---|---|---|
| `vendor-wgpu` | 688 KB | **190 KB** | three WebGPU + TSL |
| `store` | 303 KB | 109 KB | store + phần lớn `data/*` |
| `surpriseArcs` (tên nhầm) | 344 KB | 87 KB | thực chất chứa `PRODUCTS` + toàn bộ 468 công thức |
| `vendor-three` | 268 KB | 70 KB | |
| `vendor-react` | 211 KB | 65 KB | |
| `main` | 164 KB | 58 KB | dựng thế giới 3D |
| `index` | 127 KB | 45 KB | |
| `vendor-firebase` | 158 KB | 45 KB | nạp lười |
| `vendor-data` | 106 KB | 34 KB | zustand + dexie |

- Tổng JS: **3,1 MB** thô, 92 file. Mô hình 3D: 14 MB trong `dist/models` (nạp lười theo GLB).
- Ngân sách đang khoá (`scripts/check-bundle.mjs`): tải đầu ≤ 597 KB nén, chunk lớn nhất ≤ 255 KB nén.
- Renderer **luôn là `WebGPURenderer`** (`render/scene.ts:45`), trên Windows ép backend WebGL2. Nên `vendor-wgpu` 190 KB là bắt buộc, không bỏ được bằng cách dò `navigator.gpu`.
- Đã có: bộ tự hạ chất lượng nhiều tầng (`QualityGovernor`: sàn 30 FPS, hạ khi dưới 45, lên khi trên 57), nhận diện máy yếu qua tên GPU, nhật ký FPS cục bộ 7 ngày.
- **Chưa có**: chỗ nào đọc `renderer.info` (grep `renderer.info`, `drawCalls`: 0 kết quả). Game không biết mình đang vẽ bao nhiêu draw call, bao nhiêu tam giác.
- Ghi chú trong code (`shelfInstancer.ts:12`): trước GĐ886 ở cấp 44 đo được khoảng 812 draw call. Sau GĐ886 chưa có số đo lại.
- Hai điểm nghi vấn tìm thấy khi đọc code (cần đo để xác nhận, chưa phải kết luận):
  1. `core/slices/clock.ts:115` gọi `set({ cookJobs: next })` **mỗi khung hình** khi có mẻ đang nấu. Trong `src/ui` có **67 chỗ** dùng `useGame()` không kèm selector (đăng ký cả store), gồm cả `TodayAgendaStrip` và `IdleChip` trên HUD. Tức là cứ có mẻ nấu là các component đó vẽ lại 60 lần/giây. Đồng hồ đã được xử lý riêng để tránh đúng chuyện này (ghi thẳng `get().minutes`, dòng 72), nhưng `cookJobs` thì chưa.
  2. Số khách mỗi ngày là `20 + 4 × cấp` (`customersPerDay`): cấp 100 là 420 lượt, cấp 200 là 820. Chưa có số đo số nhân vật cùng lúc ở cấp cao.

### Việc 1 — Bảng đo trong game (`?perf=1`)
Một lớp phủ nhỏ, chỉ bật bằng tham số URL hoặc `game.perf(true)`:

| Chỉ số | Lấy từ |
|---|---|
| FPS, thời gian khung p50 / p95 / tệ nhất | vòng `update` ở `main.tsx` |
| Draw call, tam giác, số geometry, số texture | `renderer.info` |
| Số nhân vật đang sống, số `InstancedMesh` | `CustomerManager`, `shelfInstancer` (đã có bộ đếm cho test) |
| Bộ nhớ JS | `performance.memory` nếu có |
| Số lần React vẽ lại HUD mỗi giây | bộ đếm trong `Hud` chỉ bật ở chế độ này |
| Mức đồ hoạ + bậc độ nét đang chạy | `QualityGovernor.step` |

Nút "Ghi 30 giây" xuất một dòng JSON để dán vào bảng kết quả.

### Việc 2 — Bốn cảnh chuẩn
`game.bench(n)` dựng một cảnh tất định (dùng lại `seedLevel` của `dev/simEconomy.ts` + seed cố định) rồi chạy 30 giây:

| Cảnh | Nội dung | Vì sao |
|---|---|---|
| B1 | Tiệm cấp 10, 6 kệ, 9h sáng | máy yếu phải mượt ở đây |
| B2 | Mini mart cấp 30 đầy kệ, giờ cao điểm, có bếp và khu ăn | điểm người chơi hay tới |
| B3 | Đại siêu thị cấp 75, đầy kệ + decor, giờ cao điểm | tải nặng nhất của tiệm |
| B4 | Hẻm ban đêm trời mưa, đứng ngoài đường nhìn về tiệm | đèn, mưa, bóng |

### Việc 3 — Đo trên máy thật, ghi vào `docs/PERF.md`
Trình duyệt headless không có GPU thật nên **không thay được máy thật**. Cần ba hạng máy:

| Hạng | Ví dụ | Mục tiêu |
|---|---|---|
| Yếu | Android 2019–2020, RAM 3–4 GB, GPU Mali-G52 / Adreno 610 | B1, B2 ≥ 30 FPS ở mức Thấp; B3 ≥ 24 |
| Trung | Android 2022, RAM 6–8 GB | B1–B3 ≥ 45 ở mức Vừa |
| iPhone | iPhone 11 trở lên, Safari | B1–B3 ≥ 45 |

`docs/PERF.md` lưu bảng kết quả theo từng lần đo (ngày, commit, máy, cảnh, các chỉ số). Đo lại mỗi khi thêm hệ có hình mới.

### Việc 4 — Ngân sách hiệu năng (thêm vào bên cạnh ngân sách bundle)

| Chỉ số | Ngân sách đề xuất | Hiện tại |
|---|---|---|
| Tải đầu (nén) | hạ từ 597 xuống **520 KB** sau khi tách công thức | chưa đo lại sau GĐ2228 |
| Draw call ở B3, mức Thấp | ≤ 350 | chưa đo |
| Tam giác ở B3 | ≤ 400 nghìn | chưa đo |
| Thời gian khung p95 ở B2, máy yếu | ≤ 33 ms | chưa đo |
| HUD vẽ lại khi không có gì đổi | ≤ 2 lần/giây | nghi là 60 khi đang nấu |
| Từ bấm "Vào tiệm" tới điều khiển được, máy trung, mạng 4G | ≤ 6 giây | chưa đo |

Số ngân sách sẽ sửa lại theo kết quả đo lần đầu; nguyên tắc như `check-bundle`: chỉ hạ, không nâng.

### Việc 5 — Các tối ưu ứng viên (chỉ làm cái nào số đo xác nhận)

| # | Ứng viên | Căn cứ | Cách làm | Rủi ro |
|---|---|---|---|---|
| a | Bỏ `set({cookJobs})` mỗi khung | `clock.ts:115` | Ghi thẳng vào `remaining` như cách đang làm với `minutes`, chỉ `set` khi có mẻ xong; thanh tiến độ đọc qua `useClock`. Không đổi định dạng save. | Thấp; có test nấu sẵn |
| b | Thu hẹp `useGame()` trên HUD | 67 chỗ đăng ký cả store | Bắt đầu từ các component luôn hiện (`TodayAgendaStrip`, `IdleChip`, chip HUD): đổi sang selector hoặc `useShallow`. Các bảng chỉ mở khi cần thì để sau. | Thấp, làm từng component |
| c | Tách công thức khỏi tải đầu | chunk 87 KB nén | Tách `recipes.ts` thành `cookedProducts.ts` (dòng sản phẩm, cần sớm cho `PRODUCTS`) và `recipeDefs.ts` (nguyên liệu, thời gian; nạp cùng `main`). Mẫu nạp lười đã có: `loadStories` (`data/biz.ts:58`). | Trung bình: 34 file đang import `recipes`; `STATION_BY_OUTPUT`, `COOKED_PRODUCT_IDS` phải ở phần nạp sớm |
| d | Giới hạn nhân vật cùng lúc theo cấp | `customersPerDay` tăng tuyến tính tới 820 | Đo trước. Nếu cần: khách ngoài tầm nhìn chạy "ngầm" (tính tiền không dựng thân), như chi nhánh đang làm (`BranchVisit` chỉ dựng người khi chủ ở gần). | Cao: đụng `customers.ts`, có thể lệch golden |
| e | Gộp draw call đồ nội thất tĩnh | chưa đo | Chỉ làm nếu B3 vượt ngân sách draw call | Trung bình |
| f | Đặt đúng tên chunk dữ liệu | chunk tên `surpriseArcs` chứa `PRODUCTS` | Thêm quy tắc `manualChunks` cho `src/data/` để chunk có tên ổn định, dễ theo dõi ngân sách | Thấp |

### Lát cắt
| Lát | Nội dung |
|---|---|
| L1 | Lớp phủ `?perf=1` + `renderer.info` + bộ đếm vẽ lại HUD |
| L2 | `game.bench()` 4 cảnh + `docs/PERF.md` + đo lần đầu trên máy đang có |
| L3 | Ứng viên a + b, đo lại |
| L4 | Ứng viên c + f, hạ ngân sách tải đầu |
| L5 | Đo ba hạng máy thật; quyết định d, e theo số |

### Rủi ro
- Không có máy yếu để đo thì cả mục này dừng ở phỏng đoán. Cần ít nhất một điện thoại Android cũ (xem phần việc cần chốt).

---

## T3. Nhịp mở khoá

### Số đo hôm nay
Đếm mọi `unlock:` trong sản phẩm, nội thất, công thức, hàng nhà làm, đặc sản vùng:

| Dải cấp | Số mục mở khoá | Trung bình mỗi cấp |
|---|---|---|
| 1–10 | 65 | 6,5 |
| 11–20 | 117 | 11,7 |
| 21–30 | 196 | 19,6 |
| **31–40** | **265** | **26,5** |
| 41–60 | 337 | 16,9 |
| 61–80 | 151 | 7,5 |
| 81–100 | 78 | 3,9 |
| 101–150 | 158 | 3,2 |
| 151–200 | 351 | 7,0 |

Trong dải 26–32 phân bố răng cưa: cấp 26: **34** · 27: 3 · 28: **38** · 29: 1 · 30: **35** · 31: 3 · 32: 13.

**Hệ lớn** (cơ chế mới, không tính món) theo cấp, lấy từ các hằng `*_UNLOCK` và bảng vai/bậc tiệm:

| Cấp | Mở |
|---|---|
| 2–8 | thối tiền, mặc cả (2) · điện thoại, bảng giá (3) · nhân viên, ghi nợ (4) · vay, tích điểm (5) · combo, sỉ, nới tiệm (6) · hụi (7) · trại, đối thủ, mạng xã hội (8) |
| 10 | bán online · **chi nhánh 24/7** |
| 13–18 | tạp hoá lớn (13) · chuồng (14) · bảo vệ (15) · đơn trại (16) · thanh tra, pha chế, phụ trại (18) |
| 21–25 | bếp (21) · quản lý (22) · đầu bếp (25) |
| **29–36** | quán nước (29) · Mini mart, quản lý kho, khu ăn tại chỗ, nhà phê bình (30) · thông thạo món, luật thực đơn (31) · thịt cá, chợ phường (32) · vòng quay hiếm (33) · rương, nhà bà Tám, **sân phơi mới** (34) · chăm sóc khách (35) · quầy xôi (36) |
| 40–58 | tiệm xôi, chợ đầu mối (40) · mối lái vùng (42) · siêu thị (45) · ca đêm (55) · siêu thị khang trang (58) |
| 60–75 | tái sinh (60) · nâng sao món (66) · Đại siêu thị (75) |
| **76–200** | **không có hệ nào**; chỉ có danh hiệu mỗi 10 cấp từ 110 |

Ba vấn đề đọc được từ số:
1. **Cụm 29–36**: khoảng 12 cơ chế trong 8 cấp, đúng lúc số món mở mỗi cấp cũng đạt đỉnh (26,5/cấp). Người chơi nhận nhiều thứ mới nhất đúng lúc ít thời gian tiêu hoá nhất.
2. **Răng cưa** 26/28/30: ba cấp nhận 107 mục, bốn cấp xen kẽ nhận 20.
3. **Khoảng trống 76–200**: 125 cấp không có cơ chế mới. Đây là hơn nửa thang cấp.

Chưa biết: người chơi thật mất bao lâu cho mỗi cấp. Mốc duy nhất: golden cấp 30 cho thấy bot lên một cấp trong 3 ngày game và dư 2.244 XP. Câu này cần T1 trả lời trước khi chốt con số.

Số chép sai giữa các file cũng thấy luôn: `INSPECTION_UNLOCK` được khai báo **hai lần** với hai giá trị (12 ở `bizAchievements.ts:107`, 18 ở `inspection.ts:14`).

### Nguyên tắc đề xuất
1. Mỗi cấp tối đa **1 hệ lớn**; giữa hai hệ lớn cách nhau ít nhất 2 cấp trong dải 1–60.
2. Không cấp nào mở quá **20 mục** (món + đồ). Cấp có hệ lớn thì tối đa 8 mục.
3. Từ cấp 60 trở đi, không quá **12 cấp** liên tiếp mà không có mốc cơ chế hoặc mốc truyện.
4. Người chơi **đã có** thứ gì thì giữ nguyên dù mốc dời đi (xem phần tương thích).

### Đề xuất dời (giai đoạn 1: giãn cụm 29–36)

| Thứ | Hiện tại | Đề xuất | Lý do |
|---|---|---|---|
| Quán nước | 29 | 29 | giữ |
| Mini mart + quản lý kho | 30 | 30 | giữ làm mốc chính của cấp 30 |
| Khu ăn tại chỗ (bàn, ghế, nhà vệ sinh) | 30 | **33** | cần bếp đã quen; tách khỏi Mini mart |
| Máy bán nước, gắp thú | 30 | **31**, **35** | đồ phụ, rải ra |
| Nhà phê bình | 30 | **37** | chỉ có nghĩa khi khu ăn đã chạy vài cấp |
| Thông thạo món, luật thực đơn | 31 | 31 | giữ |
| Thịt cá + quầy + người bán | 32 | 32 | giữ |
| Chợ phường | 32 | **34** | |
| Vòng quay hiếm | 33 | **38** | phần thưởng, không cần chen vào đây |
| Rương | 34 | **39** | như trên |
| Nhà bà Tám | 34 | **36** | |
| Sân phơi (hệ 1) | 34 | **35** hoặc giữ 34 | tuỳ phiên đang làm hệ 1 |
| Chăm sóc khách | 35 | **38** | |
| Quầy xôi | 36 | **40** | gộp với Tiệm xôi cùng cấp cho liền mạch |

Kết quả: dải 29–40 có mỗi cấp nhiều nhất một hệ.

Răng cưa món: chuyển bớt món từ cấp 26, 28, 30 sang 27, 29, 31 sao cho mỗi cấp 12–18 mục. Việc này làm bằng script (xếp lại theo thứ tự hiện có, giữ nguyên thứ tự tương đối), không sửa tay từng món.

### Đề xuất lấp (giai đoạn 2: dải 60–200)
Không bịa hệ mới; xếp các hệ đã có trong hai spec kia lên thang cấp:

| Cấp | Mốc | Nguồn |
|---|---|---|
| 60 | Biển hiệu (định vị tiệm) | hệ 3 |
| 66 | Nâng sao món | đã có |
| 68 | Củ kiệu, tôm chua (đợt muối/ủ thứ hai) | hệ 1 |
| 75 | Đại siêu thị, chương 12 | đã có |
| **80** | *trống — đề xuất: Tuyến đi tỉnh thứ sáu hoặc xe tải lớn* | hệ 5 mở rộng |
| **90** | *trống — đề xuất: đợt ô mai/mứt của hệ 1 (sản phẩm cấp 108–140 đã có sẵn, kéo mốc làm xuống)* | hệ 1 đợt 2 |
| 100 | Nhãn riêng + xưởng đóng gói | hệ 4 |
| 110 | Đại lý đầu tiên | hệ 4 |
| 115 / 130 / 145 / 160 / 180 | Thêm dòng nhãn | hệ 4 |
| 125 / 140 / 155 / 170 | Đại lý kế tiếp | hệ 4 |
| 150 / 170 / 190 | Nhượng quyền | hệ 4 |

Sau khi xếp, khoảng trống dài nhất còn lại là 76–99 (hai ô in nghiêng ở trên là gợi ý, cần bạn quyết).

### Tương thích bản lưu và golden
- **Bản lưu:** dời mốc lên cao không được lấy lại thứ người chơi đang có. Quy tắc: một hệ coi là đã mở nếu `level ≥ mốc mới` **hoặc** bản lưu đã có dấu vết dùng hệ đó (có nội thất loại đó, có nhân viên vai đó, đã có `biz.unlockActs` chứa id tương ứng). Viết thành một hàm `hasFeature(s, id)` dùng chung thay cho các phép so `level >= X_UNLOCK` rải rác.
- **Golden:** dời bất cứ thứ gì ở cấp ≤ 30 sẽ làm lệch `simGolden` (bot ở cấp 30 đang dùng khu ăn tại chỗ, máy bán nước…). Đây là thay đổi kinh tế **có chủ ý**, theo đúng quy trình ghi ở đầu `simGolden.test.ts`: chạy lại, chép mốc mới, ghi lý do. Nếu T4 làm trước thì việc này nhẹ hơn nhiều.

### Công cụ giữ nhịp
- `scripts/unlock-curve.mjs`: in bảng mật độ như trên + danh sách hệ theo cấp ra `docs/UNLOCK-CURVE.md`. Chạy mỗi khi thêm nội dung.
- Test `unlockPacing.test.ts` khoá các nguyên tắc 1–3 (ban đầu đặt ngưỡng bằng hiện trạng để không đỏ, rồi siết dần).
- Gộp khai báo `INSPECTION_UNLOCK` về một chỗ.
- Màn lên cấp: khi một cấp mở hơn 6 mục, gom thành nhóm ("12 món mới · 2 đồ nội thất · 1 hệ mới") thay vì liệt kê hết (`unlocksAt` trong `data/levels.ts`).

### Lát cắt
| Lát | Nội dung | Đổi golden? |
|---|---|---|
| L1 | `unlock-curve.mjs` + `docs/UNLOCK-CURVE.md` + test khoá hiện trạng + gộp `INSPECTION_UNLOCK` | Không |
| L2 | `hasFeature()` thay các phép so cấp rải rác (chưa dời gì) | Không |
| L3 | Dời các mốc **trên 30** theo bảng (vòng quay, rương, chăm sóc khách, nhà phê bình, quầy xôi…) | Không |
| L4 | Dời các mốc **ở cấp 30** (khu ăn, máy) + rải răng cưa 26/28/30 + chép lại golden | **Có** |
| L5 | Gom nhóm ở màn lên cấp | Không |
| L6 | Xếp mốc 60–200 khi các hệ 1, 3, 4, 5 được làm | Không |

### Rủi ro
- Dời mốc mà chưa có số liệu người chơi là đoán. L1–L3 an toàn; L4 nên chờ T1 có báo cáo đầu tiên.
- Hàng trăm test món đang khẳng định `unlock > 30` hoặc so cấp cụ thể; script dời món phải cập nhật theo (xem T5 về việc gộp các test này).

---

## T4. Gỡ golden khỏi nội dung

### Số đo hôm nay
- Chỉ có **một** mốc golden: cấp 30, 3 ngày, seed 169, sai số ±5% trên tiền, XP, lãi từng ngày, thưởng nhiệm vụ (`src/__tests__/simGolden.test.ts`).
- Sim chạy trên **store thật và dữ liệu thật** (`dev/simEconomy.ts`: `seedLevel` rồi cho bot `autoplay` chơi). Không có lớp dữ liệu riêng cho sim.
- Vì vậy thêm một món mở ở cấp ≤ 30 là đổi bể hàng mà bot nhập và khách chọn, làm dịch cả chuỗi số ngẫu nhiên. Quy ước "chỉ thêm sau cấp 30" sinh ra từ đây.
- Quy ước đó hiện được chép vào **69 file test** dưới dạng `expect(r.unlock).toBeGreaterThan(30)`, và vào hàng trăm dòng chú thích "mở N > golden 30 → sim không đổi".
- Trong `src/` có **62 chỗ** viết thẳng phép so `….unlock <= level` (không qua hàm chung).
- Trường hợp "cám heo không khoá cao được vì sim cấp 5 phụ thuộc" là vấn đề khác: **bot** viết cứng tên món.

### Hai vấn đề tách bạch
| | Vấn đề | Triệu chứng |
|---|---|---|
| A | Golden dính vào **danh mục nội dung** | Không thêm được món cấp thấp; cấp 1–30 đóng băng nội dung vĩnh viễn |
| B | Bot dính vào **món cụ thể** | Không đổi được mốc của một món có sẵn (cám heo) |

### Giải pháp cho A: "kỷ nguyên nội dung"

Không sao chép dữ liệu (3.000 dòng công thức, 270 file dữ liệu import chéo nhau; tiêm một bộ dữ liệu khác vào là không khả thi). Thay vào đó **đánh dấu và lọc**:

1. Mỗi dòng nội dung có thêm trường tuỳ chọn `since?: number` (số kỷ nguyên). Không ghi = kỷ nguyên 0 = toàn bộ nội dung hiện có.
2. Một biến mức module `contentEpoch` (mặc định `Infinity` = thấy hết), đặt bằng `setContentEpoch(n)`. Mẫu "biến mức module do nơi khác đặt" đã dùng sẵn trong code: `setMarketIndex` (`pricing.ts:16`), `setCostModifier` (`suppliers.ts:84`).
3. Một hàm chung `available(id, level)` = `unlock ≤ level` **và** `since ≤ contentEpoch`. Thay 62 chỗ so cấp rải rác bằng hàm này; `unlockedProducts`, bể công thức, bể đơn tiệc… đi qua nó.
4. `simGolden` gọi `setContentEpoch(0)` trước khi chạy: sim chỉ thấy nội dung của kỷ nguyên 0, **bất kể sau này thêm gì ở cấp nào**.
5. Nội dung mới ghi `since: 1`. Người chơi thật luôn thấy hết.

Sau đó quy ước "chỉ thêm sau cấp 30" được bỏ đối với **nội dung**. Nó vẫn đúng với **cơ chế** (code mới chạy ở cấp ≤ 30 vẫn đổi sim); phần đó xử lý bằng trụ thứ hai bên dưới.

Giới hạn cần nói rõ: các danh sách viết tay tham chiếu món (ví dụ `likes` của nghề, `hot` của lễ, `favorites` của khách quen) cũng phải lọc qua `available`. Phần lớn đã lọc theo cấp ở chỗ dùng, nên đổi sang `available` là đủ; test `contentEpoch.test.ts` sẽ thêm một món giả `since: 1` ở cấp 1 vào mọi danh sách rồi khẳng định golden không đổi một đồng.

### Giải pháp cho B: bot đọc năng lực, không đọc tên
Trong `dev/autoplay.ts` và các test sim cấp thấp, thay "mua `cam_heo`" bằng "mua thức ăn cho loài X" (tra từ `garden.ts`). Khi đó dời mốc một món không làm bot kẹt. Phạm vi cần đọc `autoplay.ts` mới ước được; mình chưa đọc file này.

### Trụ thứ hai: golden thành nhiều lớp, chép lại rẻ

| Lớp | Kiểm gì | Chạy khi nào | Sai số |
|---|---|---|---|
| Tất định | cùng seed chạy hai lần ra số giống hệt | mọi lần test | 0 |
| Golden kỷ nguyên 0, cấp 30 | như hiện nay, nhưng trên nội dung đóng băng | mọi lần test | ±5% |
| Dải cân bằng | cấp 10 / 30 / 50 / 65 / 100, 5 ngày, nội dung **đầy đủ**: lãi/ngày nằm trong dải kỳ vọng rộng | khi đụng file kinh tế, và hằng đêm | ±15% |

- Lệnh `npm run golden:update`: chạy lại, in bảng "cũ → mới → lệch %", ghi mốc mới vào file, và **bắt buộc** một dòng lý do (ghi vào `docs/GOLDEN-LOG.md`). Việc chép mốc hiện làm tay.
- "Báo cáo lệch do nội dung": thêm nội dung xong chạy dải cân bằng; lệch dưới 2% thì tự chấp nhận.

### Lợi ích kéo theo
- Hệ 1 (sân phơi) và các hệ khác không còn phải né cấp ≤ 30 về mặt **sản phẩm**.
- Giới hạn: T4 giúp **thêm** nội dung tự do, nhưng **dời** mốc của nội dung cũ (T3 giai đoạn 1, rải răng cưa món ở 26/28/30) vẫn đổi sim vì các món đó thuộc kỷ nguyên 0. Việc đó vẫn cần chép lại golden; nhờ `golden:update` thì còn một lệnh.

### Lát cắt
| Lát | Nội dung |
|---|---|
| L1 | Hàm `available(id, level)` + thay 62 chỗ so cấp (chưa có `since`, hành vi y hệt; golden phải không đổi) |
| L2 | Trường `since` + `setContentEpoch` + `simGolden` chạy ở kỷ nguyên 0 + `contentEpoch.test.ts` |
| L3 | `npm run golden:update` + `docs/GOLDEN-LOG.md` |
| L4 | Dải cân bằng 5 mốc cấp |
| L5 | Bot đọc năng lực (sau khi đọc `autoplay.ts`) |
| L6 | Gỡ các khẳng định `> 30` khỏi test món và sửa `CLAUDE.md` / bộ nhớ dự án về quy ước mới |

### Rủi ro
- L1 chạm 62 chỗ trong nhiều file dữ liệu đang được các phiên khác sửa. Nên làm một lần, nhanh, lúc ít phiên chạy.
- Nếu sót một danh sách không lọc qua `available`, golden sẽ lệch khi có nội dung mới; test ở L2 là lưới an toàn.

---

## T5. Test và co-op

### Số đo hôm nay — test

| Chỉ số | Giá trị |
|---|---|
| File test | **941**, tất cả nằm phẳng trong `src/__tests__/` |
| File dưới 2 KB | **349** (hầu hết là test một món, cùng một khuôn) |
| File import `core/store` (kéo theo gần hết game) | 210 |
| File chạy mô phỏng (`simEconomy`) | 11 |
| File có `vi.mock` hoặc import `three` | 46 |
| File tự đặt `timeout` (mô phỏng dài) | 9, lâu nhất 600 giây |
| Cấu hình | `vitest.config.ts`: môi trường node, `pool: 'threads'`, một nhóm duy nhất |
| Lệnh | chỉ có `npm test` = chạy tất cả; chú thích GĐ883 ghi khoảng 2 phút và từng thoát mã 1 do quá tải |
| CI | **không có** (`.github/` không tồn tại), dù repo có remote GitHub |
| Trình duyệt tự động | không có Playwright/Puppeteer trong `package.json` |

Một test món điển hình (`banhCan.test.ts`, 20 dòng) kiểm bốn điều: đúng trạm, mở sau cấp 30, lãi hơn bán nguyên liệu, `outputId` duy nhất. 349 file lặp lại đúng bốn điều đó cho từng món.

### Số đo hôm nay — co-op
Đọc `src/net/coop.ts`:
- Máy chạy gửi trạng thái mỗi **0,2 giây** (`sendTimer = 0.2`, dòng 614) khi hẻm có từ 2 người.
- Mỗi lần gửi là **toàn bộ state**: `sharedState()` (dòng 564) lấy mọi trường không phải hàm, chỉ trừ 7 trường giao diện (`LOCAL_STATE`). Gồm cả `furniture`, `storage`, `storageLots`, `history`, `analytics` (sổ 30 ngày theo từng món), `reviews`, `biz`, `garden`…
- Kèm vị trí mọi nhân vật (`actors`).
- Ván mới tinh thì state là **5,2 KB** JSON (mình đo bằng `newGameData()`). Ván cuối game chưa đo được vì không có bản lưu mẫu; các trường lớn dần theo thời gian chơi (`analytics`, `history`, `storageLots`, `furniture` với hàng trăm ô kệ), nên có thể tới hàng trăm KB. Server giới hạn 2 MB mỗi tin (`maxPayload`).
- Phía nhận: mỗi 0,2 giây thay cả state, kéo theo React vẽ lại.
- Chiều ngược lại (máy khách → máy chạy) **đã** chỉ gửi phần thay đổi: `initCoop` so `s[key] !== prev[key]` rồi gửi `PATCH` (dòng 122–129). Tức kỹ thuật cần dùng đã có sẵn trong file, chỉ chưa áp cho chiều chính.

### Việc 1 — Chia nhóm test

```
vitest.config.ts → test.projects:
  unit   src/**/__tests__/unit/**      hàm thuần trong data/*, không import store   (mục tiêu < 20 giây)
  store  src/**/__tests__/store/**     slice, bước qua đêm, co-op guard             (mục tiêu < 60 giây)
  sim    src/**/__tests__/sim/**       simEconomy, playtest, golden, rò bộ nhớ      (vài phút)
```

| Lệnh | Chạy gì | Dùng khi |
|---|---|---|
| `npm test` | `unit` + `store`, chỉ file liên quan tới thay đổi (`vitest related` theo `git diff`) | trước mỗi commit |
| `npm run test:fast` | toàn bộ `unit` | đang sửa dữ liệu |
| `npm run test:sim` | toàn bộ `sim` | đụng `core/`, `agents/`, file kinh tế |
| `npm run test:all` | tất cả | trước khi gộp nhánh, và CI |

- File `sim-paths.json` liệt kê các đường dẫn "đụng vào thì phải chạy `test:sim`"; `npm test` in nhắc nếu thay đổi chạm danh sách này.
- Biến `VITEST_MAX_THREADS` để phiên nào cũng tự giới hạn số luồng khi nhiều phiên chạy chung máy (nguyên nhân "nhạy tải máy" ghi ở GAME_OVERVIEW §7).
- Bước đầu tiên là **đo**: `vitest run --reporter=json` rồi `scripts/test-times.mjs` in 30 file chậm nhất. Chưa có số này thì mọi mục tiêu thời gian ở trên là ước lượng.

### Việc 2 — Gộp test món
Thay 349 file bằng **một** file chạy theo bảng `MON_THAT` đã có trong `monThat.test.ts`:

```ts
describe.each(MON_THAT)('$name', (mon) => {
  it('đúng trạm')            // đã có trong monThat
  it('mẻ lãi hơn bán thẳng nguyên liệu')
  it('mở sau mọi nguyên liệu')
  it('outputId duy nhất')
});
```

- Món nào có khẳng định riêng (số tiền cụ thể, chuỗi cung ứng đặc biệt) thì giữ một `it` riêng trong file `monRieng.test.ts`.
- Script chuyển đổi đọc từng file cũ, xác nhận nó chỉ chứa bốn khẳng định khuôn rồi mới xoá; file nào lệch khuôn thì để nguyên và liệt kê ra.
- Lợi: bớt khoảng 350 lần khởi động worker và nạp `recipes.ts`; thêm món mới chỉ cần thêm dòng vào bảng (đúng luật 6 của `CLAUDE.md`), không tạo file.
- Việc này nên đi cùng T4-L6 (gỡ khẳng định `> 30`).

### Việc 3 — CI
`.github/workflows/test.yml`: mỗi lần đẩy chạy `tsc` + `unit` + `store` + `check:bundle`; hằng đêm chạy `test:all`. Không tự gộp, không tự triển khai.

### Việc 4 — Co-op gửi phần thay đổi

Store dùng cập nhật bất biến, nên "trường nào đổi" = "tham chiếu nào đổi", so rất rẻ:

```ts
let lastSent: Partial<GameState> = {};
function stateDelta(): Partial<GameState> {
  const s = useGame.getState(); const out: Record<string, unknown> = {};
  for (const k of SHARED_KEYS) if (s[k] !== lastSent[k]) { out[k] = s[k]; lastSent[k] = s[k]; }
  out.minutes = s.minutes;          // ghi thẳng mỗi khung nên luôn gửi (vài byte)
  return out;
}
```

Giao thức:

| Tin | Khi nào | Nội dung |
|---|---|---|
| `state` kèm `full: true, seq` | người mới vào; mỗi 10 giây; khi được yêu cầu | toàn bộ, như hiện nay |
| `state` kèm `seq, base` | mỗi 0,2 giây | chỉ các trường đổi so với `base` |
| `resync` (máy khách gửi) | thấy `base` không khớp `seq` mình đang giữ | xin bản đầy đủ |

- Các trường lớn mà hiếm đổi (`analytics`, `history`, `reviews`, `venueTrend`, `riskTrend`) tự nhiên chỉ đi một lần mỗi ngày game.
- Lưu ý chỗ ghi thẳng không qua `set`: `minutes` (đã xử lý ở trên) và, nếu làm T2-a, `cookJobs[].remaining`. Mọi trường ghi thẳng phải nằm trong danh sách "luôn gửi", có test khoá danh sách này.
- Máy khách: gộp phần thay đổi bằng `setState(patch)`; các component có selector sẽ không vẽ lại nếu trường của nó không đổi.
- Kỳ vọng: băng thông giảm trên 90% ở ván cuối game. Con số thật phải đo (việc 5).
- Thêm số phiên bản giao thức trong tin `enter`; hai máy khác phiên bản thì báo "cần tải lại trang" thay vì chạy lệch.

### Việc 5 — QA hai máy tự động
Thêm Playwright làm devDependency, thư mục `e2e/`:
- Chạy `vite preview` + server với `DEV_AUTH_BYPASS=true` (đã có sẵn, cho phép tài khoản thử `?dev=a`, `?dev=b`; `server/index.ts:44`) + MongoDB tạm (`mongodb-memory-server`).
- Hai ngữ cảnh trình duyệt A và B vào cùng một hẻm.
- Hook dev mới `game.stateHash()`: băm state dùng chung, để so hai máy.

| # | Kịch bản | Khẳng định |
|---|---|---|
| 1 | A tạo hẻm, B vào | B nhận state; `stateHash` hai bên bằng nhau sau 5 giây |
| 2 | B bày một ô kệ | A thấy ô kệ đổi; băm bằng nhau |
| 3 | A và B cùng sửa một ô trong 1 giây | một người bị chặn với thông báo "vừa sửa chỗ này" (`GUARDED`) |
| 4 | A (máy chạy) đóng tab | B được lên làm máy chạy, đồng hồ chạy tiếp, không mất tiền/hàng |
| 5 | Cả hai đi ngủ | sang ngày đúng một lần (bỏ phiếu ngủ) |
| 6 | Khách hỏi ở quầy, B trả lời | A thấy kết quả; câu hỏi không hiện lại |
| 7 | A vào chế độ xây, B bấm xây | B bị từ chối khoá |
| 8 | Chạy 60 giây ở tốc độ 8× có khách | băm hai bên bằng nhau ở mỗi mốc 10 giây |
| 9 | B rớt mạng 5 giây rồi nối lại | B xin `resync`, băm bằng lại |
| 10 | Đo băng thông 60 giây, trước và sau việc 4 | ghi số vào `docs/PERF.md` |

Kịch bản 8 và 9 là lưới an toàn cho việc 4. Bộ này chạy hằng đêm và khi đụng `src/net/` hoặc `server/`.

### Lát cắt
| Lát | Nội dung |
|---|---|
| L1 | `scripts/test-times.mjs` + đo thời gian từng file + ghi kết quả |
| L2 | Chia 3 nhóm (di chuyển file theo thư mục) + các lệnh `test:*` + `VITEST_MAX_THREADS` |
| L3 | Gộp test món theo bảng |
| L4 | CI trên GitHub |
| L5 | Playwright + kịch bản 1–7 + `game.stateHash()` |
| L6 | Đo băng thông hiện tại (kịch bản 10, phần "trước") trên một bản lưu cuối game |
| L7 | Gửi phần thay đổi + `resync` + phiên bản giao thức + kịch bản 8, 9, 10 |

### Rủi ro
- L2 và L3 di chuyển/xoá hàng trăm file trong thư mục mà mọi phiên đều đang thêm file vào. Phải báo trước cho các phiên khác và làm trong một lần ngắn.
- Gửi phần thay đổi mà sót một trường ghi thẳng thì hai máy lệch âm thầm. Vì vậy L5 (có `stateHash`) phải xong **trước** L7.

---

## T6. Quá tải giao diện

### Số đo hôm nay
- Kiểu `Panel` có **35** loại bảng (`core/gameTypes.ts:121`); `ui/Panels.tsx` đăng ký nạp lười từng bảng.
- 16 bảng đã được gom vào **3 nút gộp** có thanh tab (`ui/hubs.ts`): Sổ sách (6 tab), Danh tiếng (4), Mở rộng (6).
- Sổ đầu ngày gồm `MorningPanel.tsx` và **9 file thẻ** (`Morning*Cards.tsx`, `MorningNotes`, `MorningSubtitle`, `TodayActionsCard`…); một phiên khác vừa thêm `MorningPreserveCards.tsx`.
- Có **ba** cơ chế "việc tiếp theo là gì", mỗi cái một nguồn dữ liệu và một kiểu riêng:

| Cơ chế | File | Hiện khi nào | Kiểu dữ liệu |
|---|---|---|---|
| Việc sáng | `data/dayPlan.ts`, `TodayActionsCard` | chỉ trong Sổ đầu ngày | `DayAction { icon, text, panel, danger, priority }` |
| Kế hoạch hôm nay | `data/todayAgenda.ts`, `TodayAgendaStrip` | cả ngày, chỉ việc **có giờ hẹn** | `AgendaItem` |
| Chip giờ vắng | `data/idle.ts`, `IdleChip` | chỉ giờ vắng, và chỉ khi dải trên trống | `idleTip` |

- Ngoài ra còn các cảnh báo riêng lẻ trên HUD: hết hạn, đối thủ, chi nhánh, lễ, điện thoại, người bán rong, sự kiện bất ngờ, mồi "Mới mở" (mỗi cái một component nạp lười trong `Hud.tsx`), có bộ giới hạn `alertCap.ts`.
- Tám hệ trong hai spec kia, nếu làm theo cách hiện nay, sẽ thêm **ít nhất 8 thẻ** vào Sổ đầu ngày và 8 hàm vào `todayAgenda`.
- Mỗi hệ mới hiện phải **sửa trực tiếp** `MorningPanel.tsx`, `todayAgenda.ts`, `HudAgenda.tsx`. Đây cũng là ba file đang có thay đổi chưa commit của phiên khác: chúng là điểm nghẽn khi nhiều phiên cùng làm.
- Chưa biết bảng nào ít được mở (cần T1).

### Chẩn đoán
Vấn đề không phải thiếu chỗ hiện việc, mà là **ba chỗ không biết về nhau** và **không có thang ưu tiên chung**. Việc gấp không có giờ hẹn (kệ trống giữa trưa, mẻ dưa tới ngày vớt) chỉ hiện buổi sáng rồi biến mất.

### Đề xuất 1 — Một sổ việc, nhiều nguồn

```ts
export interface TodoItem {
  id: string;                      // ổn định, để đánh dấu "đã xem"
  source: string;                  // 'preserve' | 'contract' | 'regular' | 'crisis' | …
  icon: string; text: string;
  urgency: 'now' | 'today' | 'idle';
  at?: number; until?: number;     // phút trong ngày, nếu có giờ
  value?: number;                  // ước tiền được/mất, để xếp trong cùng mức gấp
  go: { panel: Panel['type']; focus?: string } | { act: 'mop' | 'travel' };
}
export type TodoSource = (s: GameState, minutes: number) => TodoItem[];
export const TODO_SOURCES: Record<string, TodoSource> = {};   // mỗi hệ tự đăng ký
export function todos(s: GameState, minutes: number): TodoItem[]  // gộp + xếp + cắt
```

- `urgency` thay cho ba thang ưu tiên hiện có: **now** (đang mất tiền hoặc sắp lỡ trong 60 phút), **today** (phải xong trước khi ngủ), **idle** (nên làm khi rảnh).
- Trong cùng mức: việc có `until` sớm hơn đứng trước; rồi tới `value` lớn hơn.
- **Mỗi hệ tự đăng ký nguồn trong file của mình** (`TODO_SOURCES.preserve = …` trong `preserve.ts`). Thêm hệ mới không còn phải sửa `MorningPanel.tsx` hay `todayAgenda.ts`. Lợi ích phụ lớn: bớt đụng file giữa các phiên.
- Ba cơ chế cũ trở thành ba **cách nhìn** của cùng một danh sách:
  - Dải HUD: 1 việc `now` (hoặc việc `today` có giờ gần nhất) + huy hiệu "+N".
  - Chip giờ vắng: việc `idle` đầu tiên, chỉ hiện giờ vắng như cũ.
  - Sổ đầu ngày: mục "Việc hôm nay" lấy `today` + `now`.
- Chuyển dần: giữ `todayAgenda()` và `dayPlan` làm hai nguồn đầu tiên bọc lại nguyên trạng, rồi tách từng phần ra nguồn riêng. Không có "ngày chuyển đổi lớn".

### Đề xuất 2 — Bảng "Sổ việc" (bấm vào dải HUD)
Một tấm trượt từ dưới lên (vừa tầm ngón cái trên điện thoại), ba nhóm: **Gấp · Hôm nay · Khi rảnh**, mỗi nhóm tối đa 5 dòng, còn lại gập "+N". Mỗi dòng bấm là tới đúng bảng **và đúng chỗ** trong bảng.

Để "đúng chỗ" được, thêm trường tuỳ chọn `focus?: string` vào các biến thể của `Panel` (hiện mới có `shelf` mang `uid` và `order` mang `autofill`). Bảng nhận `focus` thì cuộn tới và nháy phần đó.

### Đề xuất 3 — Ngân sách cho Sổ đầu ngày
- Tối đa **6 thẻ** hiện cùng lúc; thẻ thứ 7 trở đi gập vào "Xem thêm N mục".
- Thứ tự thẻ theo mức gấp của việc trong thẻ, không theo thứ tự viết code.
- Thẻ không có việc thì không hiện (phần lớn đã theo quy tắc này).
- Test `morningBudget.test.ts`: dựng một bản lưu cuối game bật mọi hệ, khẳng định số thẻ hiện ≤ 6 và tổng chiều cao ước tính không quá 2 màn hình điện thoại.

### Đề xuất 4 — Tìm nhanh
Ô "Tìm" trong ⋯ Thêm: gõ vài chữ (không dấu cũng được) ra tên bảng, tên hệ, tên món; bấm là mở. Dữ liệu lấy từ `HUBS` + `SYSTEM_UNLOCKS` + `PRODUCTS`. Rẻ, và là lối thoát cho người chơi cuối game không nhớ nút nào ở đâu.

### Đề xuất 5 — Kiểm kê bảng, chờ số liệu rồi mới gộp
Lập bảng 35 bảng × (lối vào, cấp mở, thuộc nút gộp nào). Ứng viên gộp nhìn thấy ngay, **nhưng chỉ quyết sau khi T1 có số lượt mở**:

| Ứng viên | Lý do nghi |
|---|---|
| Kỷ lục + Hồ sơ + Sổ tay → một bảng "Hồ sơ tiệm" | ba bảng chỉ để xem, cùng nút gộp |
| Theo dõi + Sức khoẻ món | cùng là số liệu bán hàng |
| Sân chơi (công trình khu phố) | một bảng riêng cho một việc mỗi ngày một lần |
| Hợp đồng + Nhiệm vụ/Đơn tiệc | cùng là "việc phải giao đúng hạn" |

Trong repo đã có script chụp và kiểm màn hình (`scripts/audit_all_screens.cjs`, `audit_panels_open.cjs`); dùng lại để chụp trước/sau.

### Lát cắt
| Lát | Nội dung |
|---|---|
| L1 | `data/todo.ts`: kiểu + `TODO_SOURCES` + `todos()` + hai nguồn bọc `todayAgenda` và `dayPlan` nguyên trạng + test thứ tự |
| L2 | Dải HUD và chip giờ vắng đọc từ `todos()` (hành vi nhìn thấy không đổi) |
| L3 | Bảng Sổ việc + `focus` cho 5 bảng dùng nhiều nhất |
| L4 | Tách dần các nguồn ra file của từng hệ; quy ước "hệ mới đăng ký nguồn, không sửa `MorningPanel`" ghi vào PROGRESS |
| L5 | Ngân sách 6 thẻ + test |
| L6 | Tìm nhanh |
| L7 | Kiểm kê 35 bảng; gộp theo số liệu T1 |

### Rủi ro
- Đổi thứ người chơi đã quen. L1–L2 cố ý không đổi gì nhìn thấy được; thay đổi nhìn thấy bắt đầu từ L3.
- `MorningPanel.tsx`, `todayAgenda.ts`, `HudAgenda.tsx` đang bị phiên khác sửa. L1 chỉ thêm file mới; L2 phải phối hợp.

---

## Thứ tự làm

```
T1-L1 (báo cáo ngày, cục bộ) ─► T1-L2..L4 ──────────────► nuôi số liệu cho T3-L4, T6-L7
T2-L1..L2 (đo) ─► T2-L3 (sửa 2 điểm nghi) ─► T2-L4..L5
T4-L1..L3 (kỷ nguyên nội dung) ─► T3-L4 (dời mốc ≤30) ─► T5-L3 + T4-L6 (gộp test món, bỏ luật >30)
T5-L1..L2 (đo + chia nhóm test) ─► T5-L4 (CI)
T5-L5 (Playwright) ─► T5-L6 (đo) ─► T5-L7 (gửi phần thay đổi)
T6-L1..L2 (sổ việc chung) ─► trước khi các hệ 1–8 thêm thẻ của riêng mình
```

| Ưu tiên | Việc | Vì sao |
|---|---|---|
| 1 | **T6-L1, L2** | Một phiên đã bắt đầu thêm thẻ cho hệ 1. Có sổ việc chung sớm thì 8 hệ sau không chồng thêm 8 thẻ, và các phiên bớt đụng file nhau. |
| 2 | **T1-L1** và **T2-L1, L2** | Chỉ đo, không rủi ro, và mọi quyết định khác cần số của chúng. |
| 3 | **T4-L1..L3** | Gỡ ràng buộc "sau cấp 30" trước khi thêm nhiều nội dung nữa. |
| 4 | **T5-L1, L2** | Giảm thời gian chờ test cho mọi phiên. |
| 5 | **T2-L3**, **T3-L1..L3** | Sửa nhỏ, lợi rõ. |
| 6 | **T5-L5..L7** | Co-op: cần Playwright trước. |
| 7 | **T3-L4**, **T6-L7** | Chờ số liệu người chơi. |

---

## Việc cần bạn chốt

1. **T1 — có làm telemetry gửi về server không**, hay trước mắt chỉ làm bản cục bộ + nút xuất file cho người chơi thử (L1)? Gửi về server kéo theo cập nhật chính sách bảo mật và một route không cần đăng nhập.
2. **T2 — bạn có điện thoại Android yếu để đo không?** Không có thì mục này chỉ đo được trên máy tính và giả lập CPU chậm, kết quả kém tin cậy.
3. **T3 — bảng dời mốc 29–40** (mục "Đề xuất dời"): duyệt từng dòng. Riêng mốc sân phơi (34) đang do phiên khác làm, cần hỏi phiên đó.
4. **T3 — hai ô trống ở cấp 80 và 90**: lấp bằng gì, hay để trống?
5. **T3 — sửa `GAME_OVERVIEW.md`** cho đúng (chi nhánh mở cấp 10, không phải 30)? File đó của bạn nên mình chưa đụng.
6. **T4 — đồng ý bỏ quy ước "chỉ thêm nội dung sau cấp 30"** sau khi có kỷ nguyên nội dung? Việc này kéo theo sửa `CLAUDE.md` và ghi chú trong bộ nhớ dự án.
7. **T5 — gộp 349 test món thành một file theo bảng** (xoá các file cũ). Đồng ý không? Cần báo các phiên khác vì họ đang tạo file theo khuôn cũ.
8. **T5 — thêm CI trên GitHub và Playwright** (thêm devDependency). Đồng ý không?
9. **T6 — quy ước mới "hệ mới đăng ký nguồn việc, không sửa `MorningPanel`"**: áp luôn cho phiên đang làm hệ 1, hay để họ xong rồi chuyển?

---

## Phụ lục — lệnh đã chạy để lấy số

- Kích thước chunk: `ls -la dist/assets`, `gzip -c <file> | wc -c` trên bản build ngày 10/11.
- Số file test và phân loại: `find src -name "*.test.ts"`, `grep -rl` theo `simEconomy`, `core/store`, `vi.mock`, `timeout:`.
- Mật độ mở khoá: script node đếm `unlock: N` và lời gọi `p(…, N)` trong `products.ts`, `catalog.ts`, `furniture.ts`, `recipes.ts`, `homemade.ts`, `regionSpecialty.ts`, `lateGameProducts.ts`. Con số là xấp xỉ (đếm theo mẫu chữ, có thể sót vài dạng khai báo).
- Kích thước state ván mới: một test vitest tạm gọi `JSON.stringify(newGameData())` → 5.193 ký tự.
- Đếm chỗ so cấp, chỗ `useGame()` không selector, test khẳng định `> 30`: `grep -rn`.

Chưa đọc kỹ (cần xem lại lúc làm từng lát): `dev/autoplay.ts` (cho T4-L5), `ui/Hud.tsx` và `ui/panels/MorningPanel.tsx` toàn văn (cho T6), `scripts/audit_*.cjs` (chúng dùng công cụ gì để mở trình duyệt), `src/net/consent.ts` (cho T1-L2), `public/sw.js` và `scripts/generate-precache.mjs` (ảnh hưởng tới việc tách chunk ở T2-L4), và phần nhận tin `state` phía máy khách trong `coop.ts` (cho T5-L7).
