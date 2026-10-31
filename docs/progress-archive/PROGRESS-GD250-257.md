# PROGRESS Archive — GĐ250–257 (chi tiết)

> Dồn từ PROGRESS.md ngày 30/10/2026. Tra bằng grep "GĐ2xx".

- **GĐ250 — QA TOÀN DIỆN** ✅: coverage branch 87.14%/fn 75.59% (2181/2181); vá test trafficForecast/warehouseUpgrade/festivalPrep; QA mắt hoãn (không có server), bù 30/10 phiên GĐ251.
- **GĐ251 giá dịp lễ** 💲: `suggestPrice`/`priceForecast` nhận `tolerance` (dayEffects — Tết 0.5, ngày thường 1): trần gợi ý TĂNG nới rộng thêm (1−tol)×0.3, ngưỡng "đắt quá phải hạ" ×tol; PricePanel (bảng + Chỉnh-tất-cả + dự phóng từng món) và priceGap truyền đúng hệ số; badge GĐ54 ghi "nhạy thực tế ×tol" + banner lễ trên bảng giá. THUẦN ĐỌC, mặc định 1 = hành vi cũ.
- **GĐ252 vai hiện diện + sửa OrderPanel vỡ** 🧍: (1) QA mắt 30/10 bắt thu ngân hiện "bận liền tay — cân nhắc thêm người" gây hiểu lầm (%rảnh cấu trúc ~0) → `staffIdleStats` loại `PRESENCE_ROLES` (thu ngân/bảo vệ/chăm khách) khỏi bảng rảnh như phụ trại; tooltip StaffPanel nói rõ; giá trị của họ xem GĐ141/144/237. (2) Sửa lỗi vỡ OrderPanel: `festivalPlan` (GĐ247) được gọi trước `rows` khai báo → TDZ "Cannot access 'rows' before initialization" mỗi lần render — chuyển xuống sau useMemo. Test mới (mutation-check đỏ/xanh đúng); 2187 test xanh; QA mắt @5173 save máy ngày 29 cấp 10 (Tết đang diễn ra — nhánh lễ chạy thật): OrderPanel render sạch 0 lỗi console, thu ngân hết dòng 🧍, phụ kho vẫn đo, 0 tràn @390/320.
- **GĐ253 xếp lại ca mai một chạm** 🔀: khép vòng GĐ246→248 — recap nói đúng việc nhưng phải tự mở bảng sửa. `staffShiftFix` (thuần đọc, `staffIdle.ts`): người ca **full** rảnh ≥65% → gợi ý bớt còn nửa ca ĐÔNG khách hơn (theo `byHour`, dự phòng `peakHour`), tiết kiệm ~60% lương; người ca NỬA rảnh khi vẫn mất khách vì chờ → dồn sang nửa ca đông (không đổi lương); ca đêm + vai hiện diện không tự dời. Thẻ recap cuối ngày có nút "🔀 {tên} — {bớt/dồn} ca" chạy `setShift` có sẵn (không đụng kinh tế), bấm xong nút tự biến mất + toast xác nhận. 10 test mới (mutation-check); 2197 test xanh; QA mắt @5173: thẻ hiện tự nhiên (NV phụ kho rảnh 83%), bấm nút → ca full→chiều, tiết kiệm ~90.000đ/ngày đúng tính, 0 lỗi console, 0 tràn @390.
- **GĐ254 biến thể cuối tuần** 📅: đóng backlog mục 3 (nhiệm vụ ngày 1–5 còn lặp ở ngày nắng không khách quen — pool tuỳ chọn cấp thấp còn 1 mục). `calendar.ts` thêm khái niệm THỨ: ngày 1 = Thứ 2, trùng nhịp tuần cũ (floor((day−1)/7)), Thứ 7/CN = cuối tuần (`weekdayOf`/`isWeekend`); HUD chip ngày hiện "· Thứ 4" cho người chơi hiểu bối cảnh. Nhiệm vụ mới "🍬 Cuối tuần ăn vặt" (bán {n} món nhóm ăn vặt: mì/bánh/ngọt/bim bim..., thưởng 70k) chỉ vào pool Thứ 7/CN — đặt CUỐI pool nên ngày thường xoay vòng GIỮ NGUYÊN, không lệch cân bằng (golden sim xanh). Lấy cảm hứng nhịp cuối tuần trong game quản lý (Hay Day/Stardew có sự kiện theo ngày lễ tuần); điều chỉnh: không đổi lượng khách, chỉ đổi NHIỆM VỤ dạy trữ đúng nhóm hàng. 4 test mới + mutation-check; 2200 test xanh; QA mắt @5173: ngày 34 (3/2) Thứ 7 có quest, ngày 31 Thứ 4 không, 0 lỗi console, 0 tràn @390/320.
- **GĐ255 cuối tuần thành nhịp thật** 🍬: GĐ254 dạy trữ đồ ăn vặt nhưng thế giới chưa trả lời — `chooseWants` (agents/customers.ts) thêm 1 nhánh bối cảnh đúng mẫu mưa/nắng/giờ vàng: cuối tuần khách hỏi món nhóm `WEEKEND_SNACKS` với xác suất 0.2 (nhóm list dùng CHUNG với quest ở `products.ts` — quest dạy đúng hành vi mà thế giới thưởng). Không đổi lượng khách, chỉ dồn NMU trong ngày cuối tuần; golden sim xanh (trong dung sai ±5%), 2201 test xanh, build sạch. QA mắt @5173: boot sạch 0 lỗi console (rAF nền IAB dừng nên không xem được khách hỏi món trực tiếp — bọc bởi sim).
- **GĐ256 lịch hiện cuối tuần** 🗓️: CalendarPanel: ô Thứ 7/CN nền sáng hơn cùng họ tím-than (#4a4a63, surface tone chứ không phải màu ngữ cảnh), tooltip từng ô có "· Thứ 4 · cuối tuần", dòng mở đầu nói "Hôm nay là Thứ…, ô nền sáng hơn là cuối tuần — khách ghé mua ăn vặt nhiều hơn". Helper đảo `gameDayOfDoy` (calendar.ts). 1 test roundtrip; 2202 test xanh; QA mắt @5173: lịch render đúng thứ từng ô, 0 lỗi console, 0 tràn @390/320.
- **GĐ257 cuối tuần thành việc sáng** ☀️: Sổ đầu ngày: tiêu đề có "· Thứ 4"; sáng Thứ 7/CN có thêm việc "🍬 Cuối tuần (Thứ 7): khách hay mua ăn vặt — nhớ châm kệ mì, bánh kẹo, nước ngọt" trong danh sách việc hôm nay (mẫu GĐ249 trữ lễ, priority 3 nhường việc bức thiết, nhảy thẳng Nhập hàng). Thuần đọc, không đổi kinh tế. 2202 test xanh; QA mắt @5173: ngày 34 (Thứ 7) có việc, ngày 31 (Thứ 4) không, 0 lỗi console, 0 tràn @390/320. **Nhịp cuối tuần khép trọn 4 mạch: thứ trên HUD → quest dạy trữ → khách thật sự thèm (GĐ255) → lịch + việc sáng nhớ đúng.**


---
# Phụ lục: GĐ258–261 (dồn 30/10/2026 khi file chính vượt ~30KB)

- **GĐ258 gọn họ màu (xem chi tiết ở Quy ước bảng màu)** 🎨: chuẩn hoá 6 màu cũ còn sót trước GĐ166 về bảng duyệt; grep còn 0 (giữ màu nhận diện ArrangePanel/GardenPanel/art SVG). 2202 test xanh.
- **GĐ259 coverage sweep** 🧪: phủ test `credit.ts`/`services.ts`/`professions.ts`; bắt 6 tham chiếu chết trong `likes` nghề → XOÁ giữ hành vi (thay id thật làm golden −15% — không làm).
- **GĐ260 QA TOÀN DIỆN** ✅: coverage 87.17%/75.75%; 34 panel render 0 lỗi console, 0 tràn @320/390/768; autoplay 2 ngày sạch (132 khách). GĐ230–249 dồn archive.
- **GĐ261 mồi cuối tuần tối thứ Sáu** 🔮: "Mai tiệm có gì" thêm "🍬 Mai Thứ 7 — cuối tuần, khách hay ghé mua ăn vặt" khi mai Thứ 7/CN (thuần đọc `tomorrowTeaser.ts`). QA @5173: Thứ 6 hiện, ngày thường không, 0 lỗi console.

- **GĐ262 thẻ tuần biết thứ** 📅: Kinh doanh → Lãi lỗ ghi "ngày 29–35 · Thứ 2 → Chủ nhật — hôm nay Thứ 6"; nhịp "còn N ngày (tới Chủ nhật)" — CHỈ khi cửa sổ khối-aligned (`(startDay−1)%7===0`, play thường luôn đúng; save can thiệp tay → trung tính). Thuần đọc. QA mắt @5173 cả hai nhánh đúng, 0 lỗi console, 0 tràn @390/320.

- **GĐ263 khoá nhất quán tuần × thứ** 🔒: test 365 ngày — khối [7k+1..7k+7] luôn Thứ 2→CN, trùng khối thử thách tuần (ceil) và chợ phiên/sỉ (floor); bất biến WEEKEND_SNACKS ∩ hàng mùa lễ = ∅. **Chốt: KHÔNG mở bias cuối tuần sang sim ngầm chi nhánh/quán nước** (quest nhắm tiệm chính). 2217 test xanh.

- **GĐ264 quét thẩm mỹ bằng ảnh chụp** 🖼️ (nhiệm vụ định kỳ promt): chụp Order/Lịch/Nhân viên @desktop+390 — bắt 2 lỗi: hàng nút nhân viên không wrap → card tràn 137px @390 (kiểm page-level không thấy vì card che) — thêm flexWrap; ô cuối tuần #4a4a63 gần nền — tăng #54546e. 2217 test xanh; QA ảnh sau sửa: 0 element tràn.

- **GĐ265 nốt quét thẩm mỹ** 🖼️: Cook/Garden/Discovery/Analytics @390 — bắt thêm 1 lỗi: 2 dropdown lọc Sổ tay Tiệm chia đôi bề rộng bị cắt chữ giữa từ @390 → cho wrap + minWidth 180 (dropdown hẹp rơi xuống dòng trọn bề rộng). Còn lại renders tốt (Garden/Cook/Analytics đúng, không tràn); header trạm nấu @390 hơi chật nhưng đủ đọc — ghi chờ, không churn. 2217 test xanh; QA ảnh sau sửa: dropdown đủ chữ.


---
# Phụ lục 2: GĐ262–269 (dồn 30/10/2026 mốc GĐ270)

GĐ262–265: thẻ tuần biết thứ · khoá nhất quán tuần×thứ (test 365 ngày) · 2 đợt quét thẩm mỹ ảnh chụp (wrap hàng nút Nhân viên @390, tương phản ô cuối tuần, 2 dropdown Sổ tay Tiệm cắt chữ @390).

- **GĐ266 nhập hàng biết cuối tuần** 🍬: `weekendRestock.ts` — `suggestQty` ×1.25 cho WEEKEND_SNACKS khi khung bán lô rơi Thứ 7/CN, chỉ khi có cầu thật; badge "🍬 Cuối tuần" trên hàng mặt hàng. 3 test; QA: Thứ 7 có badge, Thứ 4 không.

- **GĐ267 đơn cuối tuần + sửa bug roll chọn đơn** 📚: (1) `weekendOnly` — "Nhóm học cuối tuần" chỉ mời khi NGÀY CHÓT rơi Thứ 7/CN. (2) Bug cũ: roll CHỌN và roll MỜI dùng chung (seed, day) → tương quan, phân phối đơn lệch theo vị trí bảng (tat_nien ×6, 8 đơn = 0/8340 lượt) → salt chọn đơn theo ngày, mọi đơn cơ hội đều. 4 test; 2224 test xanh.

- **GĐ268 phản hồi cuối tuần** 🍬: tổng kết Thứ 7/CN có thẻ "🍬 Cuối tuần: bán N món ăn vặt (~Xđ · Y%)" đối chiếu `weekendQuestTarget` (export dùng chung); `weekendRecap` thuần đọc. 2 test; QA @5173 đúng.

- **GĐ269 phân phối sự kiện đều** 🎲: cùng mẫu bug GĐ267 ở 2 hệ — biến động thị trường (viral/roadworks ~115 vs shortage/glut ~12) và sự kiện bất ngờ (lệch ~2.7×) → salt CHỌN biến thiên theo khối/ngày; hàng khan hiếm không dồn vài món. 3 test fairness; re-anchor roadwork GĐ184; 2229 test xanh.

---
# Phụ lục 3: GĐ266–271 (dồn 30/10/2026 mốc GĐ276)

- **GĐ266–269** 🍬🎲 — nhập hàng biết cuối tuần (×1.25 nhóm ăn vặt + badge) · đơn `weekendOnly` (hoc_nhom chốt Thứ 7/CN) · sửa 2 bug roll tương quan (8 đơn = 0 lượt, sự kiện lệch 2.7×) · phản hồi cuối tuần trong tổng kết. Chi tiết: archive (phụ lục 2).
- **GĐ270 QA TOÀN DIỆN** ✅: coverage branch **87.40%**/fn **76.17%** (2229 test, 219 file, ↑ từ 87.17/75.59); browser: 34 panel render @desktop 0 lỗi console, **0 tràn ngang** @320/390/768 qua 12 bảng dày nhất + HUD; autoplay ngày thật sạch (108 khách, ~2.43tr doanh thu). Người mới: hệ thứ/cuối tuần tự dạy qua quest + HUD + lịch (QA từng mắt xích GĐ254–268). GĐ262–269 dồn archive (phụ lục 2).
- **GĐ271 lý do gọi khớp thời tiết** 📞: trước đây random cả "trời mưa..." trong ngày nắng → pool theo ngữ cảnh (mưa/nắng/chung; VIP + nấu giữ pool riêng); salt chọn biến thiên theo ngày (mẫu GĐ267/269). Audit nốt visitsToday/arcSceneAt — sạch. 2 test (sweep >200 đơn × 4 thời tiết); 2231 test xanh.

---
# Phụ lục 4: GĐ272–280 (dồn 30/10/2026 mốc GĐ281)

- **GĐ272 quét 2 bề mặt cuối** 🖼️: đăng nhập + menu Thêm @320/390/768 — 0 lỗi; chốt chuỗi rà soát màn hình.

- **GĐ273 dự báo tuần mai** 🔮: audit trending + weeklyChallenge (sạch); Nhập hàng tối CN thêm "🔮 Tuần mai: X, Y" (đúng ranh giới khối). 2 test biên; 2233 test xanh.

- **GĐ274 mồi tuần mới tối CN** 🔮: "Mai tiệm có gì" tối CN thêm "🔥 Tuần mới khách săn: X, Y" (khớp GĐ273). 2 test; 2235 test xanh.

- **GĐ275 lịch tự động chỉnh giờ mở cửa** ⏰: giải tension GĐ160 (lịch 8h lỡ nửa đầu giờ vàng) — `autoOpenAt` (mặc định 8h, save cũ tự bù — không cần MIGRATIONS) + presets 8h→6h30; `planRoutine` mở theo nó, ra tiệm trước 1h; menu hồ sơ xoay vòng giờ. 5 test routine; 2240 test xanh; QA @5173: bấm 3 lần → 6h30 đúng mốc.
- **GĐ276 dòng lịch trên Sổ đầu ngày** ⏰: `autoOpenNote` (thuần đọc) — mở sớm → "đón trọn giờ vàng", 8h → nhắc chỉnh; lịch tắt không hiện. QA @5173 đúng.

- **GĐ277 khoá đường lưu autoOpenAt + chợ phiên×CN** 💾: 3 test save — bản cũ thiếu trường → mặc định 8h, bản mới 6h nạp đúng, round-trip giữ nguyên; lock test: mọi ngày phiên chợ (7, 14, 21…) đều Chủ nhật — chợ phiên đôn tự nhiên vào cuối tuần (đồng bộ GĐ254, không cần code). 2245 test xanh; boot @5173 sạch.

- **GĐ278 QA mắt thẻ CÓ dữ liệu (GĐ155–159) — ĐÓNG watch-item cũ nhất** 👀: Thú cưng (verdict trung thực "kho sạch — chưa thấy công" + trạng thái cho ăn), Hụi (đủ số + hòa vốn), Khủng hoảng MXH (khách ×0.5), Bỏ lỡ (GĐ252). 0 lỗi console, 0 tràn @390. Không đổi code.

- **GĐ279 note biết ai giữ cửa** 🧾: thu ngân autoOpen ca sáng mở 6h → "Thu ngân tự mở cửa sáng sớm"; ca chiều/không cờ → theo lịch chủ. 2 test; QA @5173 đúng.

- **GĐ280 đóng GĐ110/117 bằng số liệu** 📊: đo 28 ngày cấp 50 — 3 nhiệm vụ xương sống bot đạt 24–26/28 (ngưỡng test ≥22); 8 nhiệm vụ còn lại bot = 0 vì bot KHÔNG làm hành động đó (giới hạn bot, không phải cân bằng) → CHỐT giữ nguyên mục tiêu. Test khoá tín hiệu; 2248 test xanh.

---
# Phụ lục 5: GĐ283 (dồn 30/10/2026)

- **GĐ283 arc E "Hàng xóm khai trương"** 🎊: def `cam_do_mo` (unlock 10) chuyển thành arc thứ 5 — 2 ngày, 4 cảnh 3 nhánh (chúc mừng/khuyến mãi/lỡ → trả lễ chia mặt hàng / chiến giá cùng lỗ / khách quen vẫn ghé), thưởng reward đúng ArcReward (perGood bắt buộc); bài học hẻm: hẻm đủ chỗ cho cả hai, cắn nhau chỉ mất cả hai. Test cập nhật: 5 arc (ids/unlocks/days), cam_do_mo vào danh sách def đã xoá, pool ≥30; 2249 test xanh; QA mắt @5173 đi trọn 2 cảnh (chọn chúc mừng → bắt tay chia hàng → done), 0 lỗi console.
