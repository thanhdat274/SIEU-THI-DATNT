> **⚠️ TÀI LIỆU LỊCH SỬ (24/10) — bản đồ tính năng dưới đây phản ánh hiện trạng NGÀY 24/10, tức là ĐÃ LẠC HẬU sau GĐ1-GĐ28 (khoảng 20 hệ thống liệt kê là "hỏng/thiếu" bên dưới nay ĐÃ ĐƯỢC làm xong — xem bảng "Hiện trạng cập nhật sau GĐ28" ở cuối tài liệu). Nhật ký tiến độ chính thức là `PROGRESS.md` ở thư mục gốc.**

# Báo cáo nghiên cứu: hoàn thiện vòng chơi tiệm tạp hóa — 24/10/2026

Phạm vi: **chỉ tiệm tạp hóa** (nhập hàng → tồn kho → trưng bày → phục vụ → thu ngân/giao hàng → sổ sách → danh tiếng → phát triển tiệm). Chi nhánh / chuỗi / loại cửa hàng khác là hướng tương lai, **ngoài phạm vi giai đoạn này**.

Quy ước bằng chứng:
- **[CODE]** đã xác nhận trong mã nguồn (kèm file:dòng)
- **[DOC]** chỉ được tài liệu mô tả
- **[TEST]** có test tự động — *hiện không có bất kỳ test nào trong dự án*
- **[PLAY]** đã kiểm bằng build/chơi thật — theo memory phiên 24-10-2026 (thanh toán đa dạng, lịch 365 ngày, 7 archetype mới đã chạy trên trình duyệt); **phiên nghiên cứu này không chạy build/playtest**

---

## 1. Tóm tắt điều hành

**Game đã có gì (đã xác nhận trong code):** vòng lặp ngày kiểu Stardew hoàn chỉnh — đặt hàng nhà cung cấp → giao hàng tự vào kho → bày kệ (planogram) → khách vãng lai/khách quen ghé theo nghề và khung giờ → chọn hàng theo sở thích/giá/kiên nhẫn → xếp hàng thanh toán (tiền mặt/ví/POS/ghi sổ, có phí) → tổng kết ngày có lãi gộp + phí + gợi ý. Xung quanh là: 35 nghề khách, 24 khách quen với 6 loại perk đều chạy thật, hợp đồng cung ứng, đơn điện thoại + nhân viên courier giao tận nhà bằng 3D, đơn tiệc, nhiệm vụ (3 hằng ngày + 23 cốt truyện), danh tiếng 5 yếu tố, rival, chương truyện, sự kiện theo lịch 365 ngày, quà 7 ngày + vòng quay, 100 cấp với mở khóa, co-op nhiều người thật (server tự host + Mongo + Firebase auth), save IndexedDB + cloud. Không có panel nào là stub.

**Ba vấn đề lớn nhất của trải nghiệm tạp hóa:**
1. **Vỏ rỗng nấu ăn** — `src/data/recipes.ts` (8 trạm, món nấu xong) KHÔNG được nối vào gameplay: không action nấu, không trạm 3D, món nấu không bao giờ vào `PRODUCTS` nên không bày/không bán được. Hệ quả cụ thể: mục tiêu cộng đồng "🍲 Món nhà làm" (**community.ts:114**) **không thể hoàn thành**; 4/10 vai nhân viên (cook, bartender, warehouse_mgr, customer_care) chỉ là dữ liệu — thuê về thì chạy như stocker xếp hàng (agents/staff.ts:132-176). [CODE]
2. **Game tự chơi quá nhiều ở giai đoạn giữa/cuối** — auto-routine mở/đóng tiệm, cashier tự mở cửa, stocker tự châm hàng, manager tự đặt hàng lúc 7h/12h, autoSwap tự đổi kệ, giao hàng tự nhận, khách tự chọn phương thức thanh toán, vắng chủ thì deal quầy tự fallback. Động từ còn lại của người chơi mỏng dần: đặt giá, đặt hàng, planogram, tuyển người, và đứng quầy nhận deal. [CODE]
3. **Phản hồi mù ở đúng điểm xảy ra** — kệ hết hàng không có chỉ báo trong thế giới 3D (phải mở PlanogramPanel mới biết, customers.ts:345-367 chỉ trả về null → toast lần đầu); lý do khách bỏ đi (hết hàng/chê giá/chờ lâu) chỉ nằm trong thống kê tổng hợp; tổng kết ngày chưa phân loại "khách bỏ đi vì gì". [CODE]

Kết luận phụ: kinh tế **thiếu chi phí cố định** (không có tiền nhà/rent — grep toàn bộ không thấy), nên áp lực lợi nhuận một chiều; **không có test tự động** nào trước khi cân bằng kinh tế.

**Có nên tạo thêm model/archetype nghề mới ngay không? → KHÔNG.** 35 nghề đã có 31 hình riêng (32 archetype NPC + player = 33 kiểu trong `characterModel.ts`); chỉ 4 cặp nghề trùng hình và đều trùng "hợp lý" về ngữ nghĩa (police/traffic_police, athlete/fitness_trainer, coder_guy cho sinh viên+freelancer, elder_woman cho bà bán phở+specific citizen). Điểm nghẽn thị giác hiện tại là **1 lỗi mismatch** (nghề "hớt tóc vỉa hè" đang mang hình thợ lao động `worker_driver`) và **rò rỉ GPU memory** (không dispose geometry khi khách rời scene) — chứ không phải thiếu model. Chi tiết nhân vật nên đầu tư vào gameplay feedback và sửa 4 cặp trùng bằng biến thể rẻ (màu/đạo cụ), đúng như danh sách nhỏ ở mục 6.

**Ưu tiên số 1 nếu chỉ chọn một việc:** P0 — làm vòng hiện tại minh bạch và trung thực (chỉ báo kệ trống 3D, lý do bỏ đi theo từng khách, sửa quest đo nhầm, xử lý 4 vai nhân viên ảo đếm). Sau đó P1-1 nối nấu ăn vào tiệm (data sẵn 100%), rồi P1-2 "Sổ đầu ngày" + yêu cầu giữ hàng của khách quen để tạo vòng chuẩn bị–phục vụ–phản hồi.

---

## 2. Bản đồ hiện trạng theo luồng

| Luồng | Trạng thái | Bằng chứng | Vấn đề người chơi |
|---|---|---|---|
| Đặt hàng (nhập) | **WIRED** | OrderPanel.tsx:61-305 → `placeOrder` store.ts:845-879; giá vốn có hệ số lễ/thiếu hàng (store.ts:763-766, suppliers.ts:75-81); panel có gợi ý số lượng, cảnh báo lương | Không thấy **biên lợi nhuận từng món tại chỗ đặt**; đợt bán sỉ (vendorOffer) **mất nếu reload** (không nằm trong save, agent C) |
| Nhận & cất kho | **WIRED (thụ động)** | Giao hàng tự vào kho lúc endDay store.ts:660; StoragePanel chỉ xem/nâng kho (Panels.tsx:201-252) | Không có khoảnh khắc "nhận hàng" — chấp nhận được, nhưng người chơi không được nhắc hàng sắp về |
| Bày kệ / châm hàng | **WIRED** | `stockTier` store.ts:935-956 kéo từ kho theo tier (furniture.ts:31-65); stocker tự châm (agents/staff.ts:151-173); autoSwap store.ts:900-922 | **Không có chỉ báo kệ trống trong 3D**; khi có stocker thì người chơi không cần làm gì |
| Khách chọn hàng | **WIRED** | Spawn customers.ts:144-179 (công thức gộp level, lễ, thời tiết, danh tiếng ±10%, rival −25%, bẩn −40%, wheelBoost); 55% có nghề (professions.ts:249-258); giỏ theo nghề (customers.ts:245-287); chê giá pricing.ts:46-50 | Emoji bubble có (`❓` hết hàng, `💸` chê giá) nhưng **không giải thích sau sự kiện**; miss chỉ vào missLog/review |
| Thanh toán / bỏ đi | **WIRED** | `checkout(items, discount, combos, payment)` store.ts:978-1008 có phí theo phương thức (payments.ts:23-45); xếp hàng chọn quầy ngắn nhất customers.ts:382-393; kiên nhẫn chờ → bỏ đi customers.ts:199-206; ghi sổ store.ts:1031-1044; deal quầy (mặc cả/trả nợ) chỉ hỏi khi chủ đứng quầy customers.ts:478-519 | Phương thức thanh toán **không do người chơi chọn** (auto-pick customers.ts:453) — hợp lý nhưng cần hiển thị rõ; vắng chủ thì mọi deal tự chốt |
| Sổ sách / tổng kết ngày | **WIRED** | SummaryPanel Panels.tsx:697-800: profit = doanh thu − chi − lương − phí (:703) + riêng "Lãi gộp" trừ COGS theo giá mua (:706-708, store.ts:989); bảng tiền vào theo hình thức + phí; đồ thị giờ | **Không có chi phí cố định (rent)** — thiếu áp lực; chưa có dòng "N khách bỏ đi: X hết hàng / Y chê giá / Z chờ lâu" (SIEU-THI-DATNT có) |
| Nhiệm vụ & tiến triển | **PARTIAL** | 26 quest (3 hằng ngày + 23 story) quests.ts; claimQuest store.ts:1391-1406; 100 cấp + mở khóa levels.ts | **3 quest đo nhầm chỉ số** [CODE]: `story_first_contract` đo `ordersDone` (chỉ đơn tiệc tăng, contracts không tăng — store.ts:1240 vs :1284-1310); `story_review_perfect` "100 lời khen 5 sao" đo `totals.customers`; `story_treasure` "tổng chi tiêu" đo `revenue` (quests.ts:93,100,101) |
| Khách quen | **WIRED** | 24 regulars, deterministic hash theo ngày (regulars.ts:378), 6 perk đều có hiệu ứng thật (frequent_visit/bonus_tip/bulk_buy/refer_friend/festival/extra_item); friendship 15/40/80 mở perk | **Không ai báo trước hôm nay ai ghé** — lịch chỉ tính lúc spawn (customers.ts:167); người chơi không thể "chuẩn bị đón" khách quen |
| Nghề khách | **WIRED** | 35 nghề, mọi trườngToString đều được đọc (giờ ghé ×4, likes, sensitivity customers.ts:96,351, patience :95,201) | Khác biệt nghề **không được kể cho người chơi** (không có chỗ nào liệt kê "nghề X thích hàng Y") |
| Đơn điện thoại / giao hàng | **WIRED** | phoneOrders.ts: 5 nhà, 9 khe/ngày, mở cấp 3, cần courier; trả lời trong 20', giao trong 75' (+45 grace), tip +15% đúng hẹn, hủy → review 2★ + friendship −3 (store.ts:609-631); courier đi tận cửa 3D (agents/staff.ts:193-215) | Cần thuê courier mới có — người chơi cấp thấp không biết hệ thống này tồn tại |
| Hợp đồng cung ứng | **WIRED** | 6 hợp đồng, mở cấp 14-55, cổng danh tiếng 3.5-4★; giao mỗi kỳ từ kho, thu theo giá bán ×0.86-0.9 (store.ts:1274-1310, ContractsPanel.tsx) | Không phạt nếu bỏ — không có căng thẳng; không đếng vào quest "đối tác đầu tiên" (đo nhầm ở trên) |
| Nấu ăn | **DATA-ONLY** | recipes.ts chỉ được import ở community.ts:6,114 (đếm mục tiêu) và reputation.ts:5,33 (bonus chất lượng); không có trong actions.ts/store.ts/furniture.ts/UI; comment "tự động thêm vào PRODUCTS" (recipes.ts:5,49) là **sai** — products.ts chỉ import catalog.ts:99 | Người chơi không biết hệ thống tồn tại; mục tiêu cộng đồng unreachable |
| Nhân viên | **PARTIAL** | 6 vai chạy thật + render 3D: cashier/stocker/cleaner/guard/courier/manager (agents/staff.ts); 4 vai **chỉ data**: bartender/cook/warehouse_mgr/customer_care — rơi vào hành vi stocker generic | **UI nói dối**: thuê "đầu bếp" được mô tả +15% doanh thu đồ uống nhưng thực tế chỉ xếp hàng |
| Sự kiện / lịch | **WIRED** | calendar.ts: 17 lễ trên năm 365 ngày, `dayEffects` cho traffic ×lễ, hàng hot, giá vốn ×1.35 thiếu/×0.75 dư (calendar.ts:174-190); events.ts ~15% ngày ngẫu nhiên ×traffic | Đã tốt; chỉ cần gắn vào "Sổ đầu ngày" để người chơi thấy trước |
| Save | **WIRED** | IndexedDB (Dexie) + backup cuối ngày + cloud Mongo 2 phút/lần (save.ts:208-243); SAVE_VERSION=1, gần như lưu đủ mọi state | vendorOffer đang mở mất khi reload; hàng chờ/khách đang chờ reset (chấp nhận) |
| Co-op | **WIRED** | coop.ts 530 dòng: runner broadcast 5×/s, guard 3s, host handoff; server Express+ws+Mongo (server/index.ts) | Mỗi action mới phải phân loại guard — chi phí ẩn của mọi tính năng mới |
| Test | **KHÔNG CÓ** | Không file *.test.* nào; build = `tsc && vite build` | Mọi thay đổi cân bằng đều mù |

---

## 3. Đánh giá nhân vật

**Số liệu đã tự đếm lại (không lấy từ docs):** 35 nghề (professions.ts), 24 khách quen (regulars.ts), 33 kiểu trong union archetype (32 NPC + `player`) — characterModel.ts:4-37. 35 nghề ánh xạ vào **31 archetype khác nhau** → đúng 4 cặp trùng:

| Archetype dùng chung | Nghề | Độ hợp lý |
|---|---|---|
| `police` | police + traffic_police | Gần đúng; CSGT nên áo trắng |
| `athlete` | athlete + fitness_trainer | Gần đúng; HLV nên có còi/bảng kẹp |
| `coder_guy` | student_college + freelancer | Chấp nhận được |
| `elder_woman` | pho_vendor + senior_citizen | Bà bán phở nên có đạo cụ bán hàng |

Ánh xạ lệch đáng chú ý khác (1:1 nhưng sai ngữ nghĩa): **street_hairstylist → `worker_driver`** (thợ cắt tóc vỉa hè mang hình chú công nhân/xe ôm với nón bảo hộ — mismatch rõ nhất hiện có [CODE, professions.ts + grep]); reporter→gentleman, retired_doctor→elder_man, office_worker→office_lady (đúng nhưng khoá giới tính).

**Đa dạng gameplay là thật:** mọi trường của `ProfessionDef` đều được sim đọc (giờ ghé nhân ×4/×0.5 professions.ts:249-258; likes + loyalty vào giỏ customers.ts:245-252; sensitivity vào giữ-giá customers.ts:96,351; patience vào chờ/:199; archetype vào mesh; icon vào bong bóng :327). Khách quen ổn định về diện mạo giữa các lần ghé và qua save/load vì `look` là hằng số trong data, save chỉ lưu friendship/visits/perks (save.ts:34). Điểm cộng lớn cho cảm giác "khách quen".

**Đa dạng tạo hình ở mức khá, vấn đề thật nằm ở kỹ thuật:** mỗi khách sinh ~30-50 mesh mới (geometry + material riêng, không instancing) và **không dispose khi rời scene** (customers.ts:214 chỉ scene.remove; chỉ buildings dispose) → bộ nhớ GPU tăng dần theo tổng số khách đã spawn trong phiên — đây mới là giới hạn scalability, không phải số archetype. Tùy chọn `gender` tồn tại nhưng không bao giờ được set (characterModel.ts:53).

**Kết luận nhân vật:** không thêm nghề mới (35 đã thừa so với chiều sâu hiện có), không thêm archetype mới ngay. Danh sách biến thể nhỏ nhất có giá trị xếp ở mục 6.

---

## 4. Bài học tham khảo

### HappyTown (myhappy.town) — truy cập 24/10/2026, nguồn: https://myhappy.town/intro/ (v1.0.0, SentryX)

| Cơ chế (có trong trang chính thức) | Chuyển dụng cho tiệm tạp hóa | Để ngoài phạm vi |
|---|---|---|
| 67 cư dân có tên + vai trò + vị trí (Chợ làng 17, Thành phố 13...) — nhân vật gắn với "nơi ở" khiến dễ nhớ | Khách quen đã có tên/tiểu sử/perk; học cách **cho họ "lịch hẹn" và nhu cầu định kỳ** để người chơi chuẩn bị đón (Sổ đầu ngày, mục 5) | Bản đồ 16 khu — tiệm một mặt bằng |
| Đơn giao hàng: thưởng thời gian (4 phút = +50%), khách VIP ×2 | **Đúng chuyển dụng được** cho phone orders hiện có: thêm bậc thưởng giao nhanh + khách VIP (khách quen đặt đơn lớn) | — |
| Bảng nhiệm vụ hằng ngày + quest 7 chương | Game đã có 3 quest hằng ngày; học "quest gắn sự kiện hôm nay" (Tết → bán kẹo) thay vì quest generic | Cốt truyện hero 7 nhân vật |
| Quà 7 ngày + vòng quay may mắn | **Đã có sẵn** (gifts.ts + wheelBoost) — bằng chứng hệ giữ chân này đã đúng hướng | — |
| Xóm Nghề 4 trạm chế tác (Quán Ăn, Lò Bánh...) | Hỗ trợ trực tiếp luận điểm P1 nấu ăn: trạm chế biến là loop nội tại của game nông trại/thị trấn, không phải tính năng rời | Đào mỏ, rèn đồ |
| Trang trí nhà 2.105 món, thú cưng, 12 minigame, cờ tỷ phú, đánh cá, đua kart | — | Toàn bộ — lệch trọng tâm tiệm tạp hóa (đã chốt trong memory roadmap) |

### SIEU-THI-DATNT (C:\Users\Admin\Desktop\SIEU-THI-DATNT) — đọc code, không sửa

Điểm khác biệt lớn nhất: **hệ thống bên đó có test đồng hành** (`*.test.ts` cho customers, regulars, party orders, spoilage, delivery, price, progression) — mọi con số cân bằng đều nằm trong `game-data`. Trạng thái các mẫu bên dưới đều là **IMPLEMENTED + TESTED** (có file test), khác với GAME hiện không có test nào.

| Mẫu thiết kế | Chi tiết đo được | Điều chỉnh cho GAME |
|---|---|---|
| Từ chối giá theo tag + keepChance | `keepChance = max(0.15, 1 − sensitivity×(ratio−1))`; biên giá 0.8–1.3×, bước 100đ; nước sensitivity 2.6 vs thuốc 0.7; **chê giá không mất danh tiếng** | GAME đã có keepChance (pricing.ts:46-50) nhưng chưa ép biên 0.8-1.3 (PricePanel chỉ min 500, đỏ >1.3 là gợi ý) → ép mềm + hiện biên lời |
| Tồn kho lot + FEFO | Mỗi lot có hạn + giá vốn; hết hạn nằm trên kệ = **rep −2** và khách nhìn thấy | GAME đã có lot + spoilOvernight; thiếu hiệu ứng "hàng hết hạn trên kệ bị khách thấy" |
| Walkout có mã lý do + công thức sao minh bạch | `out_of_stock/price/wait/store_closed/unreachable` + nhãn tiếng Việt; sao = 5 − miss×2 − chờ − giá; tổng kết ngày có dòng "N khách bỏ vì hàng/giá/chờ" | **P0 trực tiếp**: thêm dòng phân tích lý do vào SummaryPanel + bong bóng lý do tại khách |
| Đơn tiệc: 1/ngày, từ chối miễn phí, giao bằng FEFO, COGS thật | Hết hạn không dùng được; thưởng tiền/rep/XP rõ ràng | GAME đã có party orders; học "từ chối miễn phí + deadline rõ" (đã gần) |
| Regulars 3 bậc perk + cap friendship/ngày | +2 món yêu thích, +1 thường, tối đa +2/ngày; perk 15/40/80 | GAME y hệt (đã port) — bằng chứng hướng đi đúng |
| Tutorial checklist chỉ hiện bước tiếp theo | TutorialChecklist.tsx:18-42 | GAME có tutorial alert; đáng nâng cấp thành checklist một-bước |
| Khan hiếm kéo giá tham chiếu (≤3%/ngày, trần [0.8,1.4]) | Trống +8%, ≤10 món +4%, ≥60 món −4% | P2 cho GAME sau khi có playtest |

---

## 5. Danh sách đề xuất xếp hạng

### P0 — làm rõ / sửa / tận dụng nền có sẵn (không thêm hệ thống mới)

**P0-1. Chỉ báo kệ trống trong 3D + lý do khách rời tại chỗ**
- Vấn đề: miss 'stock' chỉ ra toast lần đầu + log (store.ts:1009-1024); người chơi phải mở panel để biết kệ nào trống.
- Thiết kế: tier kệ 3D đổi vật liệu/độ cao hàng khi sốUnit < ngưỡng (đã có state số lượng/tier sẵn); khi khách bỏ đi, bong bóng chữ nổi 2 giây ("Hết sữa!", "Đắt quá!", "Chờ lâu quá!") — dữ liệu `noteMiss` đã có lý do.
- Luồng: khách "❓" tại kệ sữa trống → người chơi nhìn thấy kệ ánh sáng cảnh báo → mở planogram châm → khách sau mua được.
- Module: `src/render` (shelf visual), customers.ts (bubble), không đổi data. Save: không. Co-op: không.
- Rủi ro: nhiễu hình nếu quá nhiều bong bóng → giới hạn 1 bong bóng/khách, tắt được trong setting.
- Chấp nhận: playtest 15 phút — người chơi nói được kệ nào trống mà không mở panel; số miss 'stock' giảm sau khi biết tính năng.

**P0-2. Sửa 3 quest đo nhầm + nối contracts vào quest**
- quests.ts:93 đổi measure sang biến đếm kỳ hợp đồng đã giao (thêm counter trong deliverContract store.ts:1284-1310); :100 đếm review 5★ thật (reviews.ts đã có số sao); :101 đổi mô tả sang "doanh thu" hoặc đếm `spent`.
- Rủi ro: save cũ có questLog với id cũ — measure là hàm trong code nên tự đúng, không cần migration.
- Chấp nhận: dùng console/store gọi trực tiếp 3 counter, claim được đủ 3 quest.

**P0-3. Trung thực hóa 4 vai nhân viên**
- Ngắn hạn (1 buổi): StaffPanel đổi nhãn 4 vai thành "Hỗ trợ bày hàng (+thuê nếu thích)" và bỏ mô tả bonus không tồn tại; hoặc ẩn 4 vai khỏi pool tuyển直到 P1-1 wire xong cook.
- Chấp nhận: không còn mô tả hiệu ứng nào không có code tương ứng.

**P0-4. Lưu vendorOffer + sửa rò rỉ GPU**
- Thêm vendorOffer vào snapshot() save.ts:26-41 (thuần thêm field, không migration vì applySnapshot merge default).
- Dispose: khi remove walker, duyệt mesh.children dispose geometry/material/texture (sửa 1 chỗ customers.ts:214 + walker); cân nhắc pool emoji sprite.
- Chấp nhận: mở DevTools memory, spawn ~200 khách, GPU memory không tăng tuyến tính sau dispose.

**P0-5. Bộ test tối thiểu trước khi đụng kinh tế**
- Vitest cho: checkout (phí, COGS, byMethod), spoilOvernight (hao hụt theo lô/thời tiết), spawn interval (customers.ts:144-179), keepChance. Các hàm này phần lớn thuần — tách được khỏi store nếu cần.
- Lý do: mọi đề xuất P1 đều đổi con số kinh tế; không có test thì mỗi lần cân bằng là一次 đoán.
- Chấp nhận: `npm test` chạy xanh trong CI/local; phủ 4 công thức trên.

**P0-6. Dọn docs cũ**
- ANALYSIS_AND_FEATURES.md / PHAN-TICH-*.md có ≥7 tuyên bố sai hiện trạng (17 nghề vs 35; 11 trang phục vs 28; staff 6 vs 10; skills "KHÔNG CÓ"...). Đánh dấu "lịch sử 10/2026" hoặc cập nhật, tránh các phiên phân tích sau kế thừa số liệu sai (chính prompt nghiên cứu này đã bị docs cũ kéo theo một lần).

### P1 — tăng chiều sâu trực tiếp cho tiệm

**P1-1. Nối nấu ăn vào tiệm (trạm nấu 3D + action + UI + vai cook)**
- Vấn đề: mục 1 bản đồ hiện trạng — data 100% sẵn (recipes.ts: 8 trạm, món + nguyên liệu; reputation.ts:33 đã định nghĩa bonus chất lượng món nấu; community.ts:114 đã đếm — chỉ chờ có món bán).
- Thiết kế: (a) inject món nấu vào PRODUCTS khi khởi động (đúng như comment recipes.ts:5 đã hứa); (b) thêm loại nội thất `cookStation` (furniture.ts đã có pattern type/tier/slots); (c) action "Nấu" tại trạm: chọn recipe → trừ nguyên liệu từ kho (lot FEFO) → sau X phút game ra lot món nấu vào kho → bày kệ như hàng thường, giá bán cao hơn tổng giá nguyên liệu; (d) nhân viên cook tốc độ nấu theo skill (công thức speed 0.6+0.2×skill đã có); (e) UI: tab trong Panels hoặc mở từ trạm.
- Luồng người chơi: buổi sáng xem Sổ đầu ngày thấy lễ Trung thu tuần sau → mua nguyên liệu bột/đường → nấu bánh trung thu (+margin ~1.8-2.2× nguyên liệu) → bày kệ vùng nóng → khách theo `timely/seasonal pull` (customers.ts:264-286 đã hỗ trợ) mua mạnh.
- Phụ thuộc: P0-5 (test kinh tế), cấu trúc lot hiện có (tránh schema mới).
- Save: món nấu là lot thường — không migration; SAVE_VERSION giữ 1. Co-op: trạm nấu là furniture → đã nằm trong build-lock; action nấu cần guard như placeOrder.
- Rủi ro balance: margin món nấu vượt giá bán nguyên liệu thô → thiết kế цена vốn = tổng nguyên liệu + thời gian; đo tỷ lệ doanh thu món nấu/tổng (mục tiêu 15-30%).
- Chấp nhận: hoàn thành được mục tiêu cộng đồng "🍲 Món nhà làm"; cook được thuê có hiệu ứng thật; test vitest cho công thức giá vốn.

**P1-2. "Sổ đầu ngày" — gộp thông tin chuẩn bị thành một màn hình**
- Vấn đề: thông tin tồn tại rải rác (lễ/hàng hot calendar, khách quen deterministic, contract tới hạn, khe điện thoại) nhưng người chơi phải mở 5 panel.
- Thiết kế: panel sáng (mở khi ngủ dậy hoặc nút ☀️): hôm nay lễ gì + hàng hot + giá vốn đang chi phối; **khách quen dự kiến ghé** (dùng chính hàm hash deterministic regulars.ts:378 — chạy trước cho cả ngày, hiển thị tên + món yêu thích hiện có trong kho/không có); hợp đồng kỳ giao hôm nay; khe đơn điện thoại; gợi ý 1 việc (không auto làm).
- Giá trị: biến dữ liệu tĩnh thành quyết định — "Bà Năm hay ghé thứ Ba mà kho hết trứng → đặt thêm hôm nay". Đây là câu chuyện cộng đồng kiểu HappyTown nhưng bằng cơ chế tạp hóa.
- Module: 1 panel UI mới + hàm dự đoán regular thuần data. Save: không. Co-op: chỉ đọc.
- Rủi ro: làm hộ người chơi nếu gợi ý quá cụ thể → chỉ liệt kê, không đề xuất số lượng.
- Chấp nhận: playtest — người chơi đặt hàng dựa trên Sổ đầu ngày ≥1 lần/ngày; questionnaire "bạn biết hôm nay ai ghé?" trả lời đúng ≥70%.

**P1-3. Yêu cầu giữ hàng của khách quen (standing orders)**
- Vấn đề: khách quen có favorites nhưng không tạo được nghĩa vụ trữ hàng; phone orders là ngẫu nhiên theo nhà, không gắn mối quan hệ.
- Thiết kế: khách quen friendship ≥15 khi checkout có tỉ lệ hỏi "Mai cháu ghé, chú giữ 2 hộp sữa nhé?" → lập reservation ngày mai; Sổ đầu ngày hiển thị; ngày mai khách ghé đúng hẹn: có hàng → +friendship +tip; không có → −2 friendship +lời thoại thất vọng. Hủy bởi người chơi được (trả lời không, không phạt).
- Nối vòng: chuẩn bị (đặt hàng tối nay) → phục vụ (giữ hàng sang tier) → phản hồi (friendship/perk tiến).
- Module: regulars.ts mở rộng + state `reservations` trong save (field mới, không migration) + customers.ts nhánh regular ghé có reservation.
- Rủi ro: chồng lấn phone orders → phân biệt rõ: phone = nhà xa, courier; reservation = khách quen, tại quầy.
- Chấp nhận: test đơn giản cho flow có/không có hàng; playtest cho thấy người chơi đặt hàng vì reservation.

**P1-4. Hạn tự động hóa ở cấp thấp–giữa**
- Vấn đề: mục 2 tóm tắt — manager auto-order (staff.ts:247-299) + stocker + autoSwap + auto-routine biến người chơi thành khán giả.
- Thiết kế: auto-routine mặc định OFF cho save mới (giữ ON cho save cũ để tôn trọng thói quen); manager chỉ auto-order các món đã từng bán ≥N lần (học từ lịch sử, không tự mở ngành hàng mới); autoSwap thành tùy chọn trong BuildPanel; giữ cashier/stocker vì chúng là mục tiêu tiến triển hợp lệ.
- Rủi ro: phẫn nộ người chơi hiện tại nếu tước tiện nghi → mọi cái đều setting, mặc định thay đổi chỉ cho ván mới.
- Chấp nhận: đo tỷ lệ thời gian người chơi ở trạng thái "không việc để làm" (telemetry đơn giản đếm giây không input khi tiệm mở) giảm sau thay đổi.

**P1-5. Minh bạch kinh tế tại điểm quyết định**
- OrderPanel: cột "Lãi dự kiến/sản phẩm" = giá bán hiện tại − giá vốn (đã có cả hai số); đèn đỏ nếu dưới ngưỡng. PricePanel: ép mềm biên 0.8–1.3× (cảnh báo + giữ giá được nhưng keepChance tự phạt như hiện có — không cứng).
- Thêm chi phí cố định nhẹ: tiền nhà theo shopTier (ví dụ 50k × tier² /ngày) — tạo áp lực buộc tối ưu planogram; hiện dòng riêng trong SummaryPanel. **Chỉ làm sau P0-5 có test**, vì đổi curve.
- Chấp nhận: playtest kinh tế 10 ngày game — lợi nhuận ngày vẫn dương với người chơi trung bình nhưng âm nếu để hàng hỏng + kệ trống.

### P2 — chỉ làm sau khi đo / playtest

1. **Biến thể thị giác 4 cặp trùng + street_hairstylist** (chi tiết mục 6) — chỉ khi playtest cho thấy người chơi không phân biệt được nghề trên màn hình.
2. **Giá tham chiếu khan hiếm** (mẫu SIEU-THI-DATNT: trống +8%/đông −4%) — sau khi có test + dữ liệu chơi thật.
3. **Khách quen 24→28** — chỉ khi tỷ lệ người chơi đọc Sổ đầu giờ cao (cho thấy họ quan tâm mối quan hệ).
4. **Quest hằng ngày theo ngữ cảnh** (lễ hôm nay, nghề khách nhiều nhất hôm qua) — sau P1-2 có dữ liệu ngày.
5. **Hiệu ứng "khách thấy hàng hết hạn trên kệ"** (rep −2 kiểu SIEU-THI) — sau khi có chỉ báo kệ trống (P0-1) để tránh двой hình phạt mù.

---

## 6. Phương án nhân vật

| Phương án | Chi phí | Giá trị | Kết luận |
|---|---|---|---|
| Không thêm gì, chỉ sửa dispose + feedback | Thấp | Trung bình (hiệu năng + độ đọc) | **Nền bắt buộc** (P0-4) |
| Biến thể cho archetype hiện có (đổi màu đồng phục + 1 đạo cụ, thêm case trong JOB_UNIFORMS/headwear) | Thấp–trung (1 archetype ≈ 1-2 buổi) | Cao đúng chỗ — sửa đúng 4 cặp trùng + 1 mismatch | **Đề xuất chính** |
| Archetype hoàn toàn mới | Trung (uniform + headwear + gear + test hình) | Thấp — 35 nghề đã hơn chiều sâu gameplay | **Hoãn**; chỉ làm khi thêm nghề có hành vi mua + khung giờ thật riêng |

Danh sách biến thể theo thứ tự ưu tiên (tối đa, chỉ làm khi tới lượt P2):

1. **street_hairstylist** — hiện mang hình `worker_driver` (nón bảo hộ, áo gió). Biến thể: áo choàng cắt tóc + kiếng/lược cầm tay hoặc chyển sang `barber` + màu khác. Lý do: duy nhất đang sai nghề rõ ràng trên màn hình; giờ ghé ban ngày, mua nước/ngọn/vệ sinh cá nhân.
2. **traffic_police** (đang = `police`) — đồng phục trắng + găng trắng, giữ mũ kê-pi. Lý do: người Việt nhận ra CSGT áo trắng ngay; giờ ghé 7-9h/16-18h trùng giờ cao điểm — hành vi đã có trong data.
3. **pho_vendor** (đang = `elder_woman` chung với senior_citizen) — thêm tạp dề + gánh/quạt. Lý do: tách 2 nghề đang trùng hình hoàn toàn; bà bán phở mua nguyên liệu nấu phở gắt (bánh phở, thịt, hành) — giỏ khác biệt thật.
4. **fitness_trainer** (đang = `athlete`) — áo tank + còi + bảng kẹp. Lý do: phân biệt với khách chạy bộ; mua nước/sữa hạt/thực phẩm sạch nhiều.
5. (Chỉ nếu còn ngân sách) **retired_doctor** — `elder_man` + ống nghe quàng cổ. Lý do: "bác sĩ về hưu" có thoại/vitamin khác bác sĩ trẻ nhưng đang mất nhận diện.

Không đề xuất archetype mới: không nghề nào trong 35 hiện có cả nhu cầu mua riêng + khung giờ riêng + giá trị hình ảnh đủ khác để đáng một model mới; khách quen đã có diagon mạo ổn định qua props/colors.

---

## 7. Lộ trình tập trung một tiệm

Thứ tự lát cắt (mỗi lát độc lập có thể ship):

1. **Lát 1 — Nền minh bạch (P0-1..4,6):** chỉ báo kệ trống, bong bóng lý do, quest đo đúng, vendorOffer save, dispose, dọn docs. *Không phụ thuộc gì.*
2. **Lát 2 — Test + đo (P0-5):** vitest 4 công thức kinh tế + telemetry tối thiểu (miss theo lý do, doanh thu/ngày, thời gian rảnh). *Nền cho mọi cân bằng sau.*
3. **Lát 3 — Nấu ăn (P1-1):** PRODUCTS injection → trạm + action → UI → cook role. *Phụ thuộc Lát 2.*
4. **Lát 4 — Vòng chuẩn bị–phục vụ–phản hồi (P1-2 + P1-3):** Sổ đầu ngày trước (đọc-only, rẻ), reservation sau (đổi sim khách quen). *Phụ thuộc: không bắt buộc Lát 3, nhưng nên sau Lát 2 để đo.*
5. **Lát 5 — Kinh tế & tự động hóa (P1-4 + P1-5):** hạn auto, biên lời tại OrderPanel, tiền nhà. *Bắt buộc sau Lát 2; tiền nhà chỉ sau playtest Lát 1-4.*
6. **Lát 6 — Thị giác (P2-1):** biến thể nhân vật theo mục 6. *Chỉ khi dữ liệu playtest xác nhận cần.*

Đo trước/sau mỗi lát: (a) phân bố lý do miss (stock/price/wait) — Lát 1 phải làm phân bố này hiển thị đúng; (b) doanh thu + lãi gộp/ngày theo cấp — Lát 3,5 phải không bẻ gãy curve; (c) số lần người chơi mở OrderPanel sau Sổ đầu ngày — Lát 4; (d) thời gian "không việc làm" — Lát 5.

**Ranh giới giai đoạn này:** không làm chi nhánh, chuỗi, loại cửa hàng khác (food court, quán cà phê như nghề riêng), prestige, mini-games — các hệ thống data-driven (shopTier, furniture type) vẫn giữ mở để sau này dễ gắn.

---

## 8. Rủi ro và câu hỏi còn mở

Rủi ro kỹ thuật:
- **Co-op:** mọi action mới (nấu, reservation) phải qua phân loại guard của coop.ts; build-mode lock đã chặn nội thất mới nhưng cần test 2 người cùng mở panel.
- **Save:** các field mới (reservations, vendorOffer) an toàn nhờ applySnapshot merge-default; chỉ nâng SAVE_VERSION khi đổi cấu trúc lots — hiện không cần.
- **Hiệu năng:** P1-1 thêm mesh trạm nấu + khói/hiệu ứng — giữ cùng pattern dispose của P0-4.

Câu hỏi chỉ người chơi/chủ dự định trả lời được (mã nguồn không trả lời):
1. Mức áp lực chi phí cố định mong muốn? (Tiền nhà nhẹ 50-200k/ngày hay để hoàn toàn thoải mái như hiện tại?)
2. Auto-routine: giữ mặc định BẬT cho ván mới (thân thiện mobile) hay TẮT (bảo vệ core loop)? Đề xuất của nghiên cứu: tắt cho ván mới, nhưng đây là quyết định sản phẩm.
3. Người chơi có nên chọn phương thức thanh toán thay khách ở quầy (tăng động từ nhưng chậm nhịp), hay giữ auto-pick như hiện tại?
4. Ngày chơi lý tưởng dài bao lâu (phút) và một "session" nên trải qua mấy ngày game? — quyết định tốc độ `MINUTES_PER_SECOND=2` và mọi chỉ số cân bằng theo đó.

---

## Kết luận thẳng

Với trạng thái code ngày 24/10/2026: **(1)** Ưu tiên trước hết là P0 — làm vòng chơi hiện tại minh bạch (kệ trống trong 3D, lý do khách bỏ đi tại chỗ, quest đo đúng, nhân viên không hứa dối) vì mọi hệ thống cần cho cảm giác "kinh doanh thật" đã có code và chạy. **(2)** Tính năng chiều sâu đầu tiên là nối `recipes.ts` vào tiệm (trạm nấu + vai cook) — data sẵn 100%, đó là lỗ hổng lớn nhất và là nguồn nội dung mới rẻ nhất. **(3)** Sau đó Sổ đầu ngày + reservation của khách quen để tạo vòng chuẩn bị–phục vụ–phản hồi và cho khách quen "có ích" ngoài perk. **(4)** Không thêm archetype mới; muộn nhất là P2 làm 4-5 biến thị giác (bắt đầu từ street_hairstylist đang sai hình) kèm sửa rò rỉ dispose. **(5)** Trước khi đổi bất kỳ con số kinh tế nào, dựng vitest — dự án đang không có một test nào.

---

## 9. Hiện trạng cập nhật sau GĐ28 (27/10/2026) — kiểm lại 10 hệ thống từng bị đánh giá "hỏng/thiếu"

> Phần này thay cho các mục cũ "Ba vấn đề lớn nhất" + bảng hiện trạng §2 cho những dòng bên dưới. Mọi đánh giá "hỏng/thiếu" trong tài liệu gốc 24/10 **đã được làm xong** qua GĐ1-GĐ28 (đi kèm PROGRESS.md, 28 commit, 584/584 test + build sạch). Bằng chứng file:dòng lấy từ mã nguồn hiện tại.

| # | Từng bị đánh giá (24/10) | Hiện trạng sau GĐ28 | Bằng chứng |
|---|---|---|---|
| 1 | Nấu ăn "DATA-ONLY", món nấu không vào PRODUCTS, không bán được | **Đã chạy đầy đủ**: startCook/cookJobs/đẩy nhanh theo tay nghề đầu bếp, trạm bếp 3D, món nhà làm bán được | `orders.ts:99,143`, `clock.ts:54-79`, `recipes.ts:263 COOKED_PRODUCT_IDS`, `staff.ts:366 watchStove` |
| 2 | 4 vai nhân viên (cook/bartender/warehouse_mgr/customer_care) chỉ là data, chạy như stocker | **Đã có hành vi thật**: cook→watchStove, bartender→quầy uống, customer_care→care(), manager→điều phối; riêng warehouse_mgr là hiệu ứng giảm hao hụt thụ động + stocker | `staff.ts:277,279,290,474,486`; hiệu ứng kho `stock.ts:52-56` |
| 3 | Quest đo nhầm chỉ số (first_contract→ordersDone, review_perfect→customers, treasure→revenue) | **Đã sửa đúng** contractsDone / fiveStars / spent | `quests.ts:171,182,183` |
| 4 | Rò rỉ GPU memory (không dispose khách rời scene) | **Đã dispose** khi khách rời/tẩy | `customers.ts:248,834,725` |
| 5 | Không có chi phí cố định (no rent) | **Đã có tiền thuê mặt bằng + chi phí vận hành** trừ cuối ngày theo cấp tiệm | `endDay.ts:331,335-348`, `shopTiers.ts:31 rentOf`, `OPERATING_REVENUE_RATE` |
| 6 | Lý do khách bỏ đi chỉ trong thống kê tổng hợp | **Đã có sổ lý do bỏ đi theo món** (hết hàng/chê giá/chờ lâu) + gợi ý khắc phục + tổng "X khách bỏ về" | `sales.ts:81-94 noteMiss/missKey`, `advice.ts:12-52`, `endDay.ts:65,112` |
| 7 | Đợt bán sỉ (vendorOffer) mất nếu reload | **Đã lưu/khôi phục** | `save.ts:62 vendorOffer` |
| 8 | Không chỉ báo kệ trống trong 3D | **Đã có chỉ báo 3D TRÊN MAP**: tầng kệ gán món mà hết hàng tô đỏ + nổi dấu ⚠️ phía trên kệ (QA xác nhận 7 bảng đỏ hiện trong cảnh), kèm badge HUD "N ô trống" | `furnitureView.ts:430-450 refreshEmptyMark` (tô đỏ row + sprite ⚠️); `Hud.tsx:213-214,297` |
| 9 | Dự án không có test tự động | **55 file test / ~601 test case, full suite xanh + build sạch** | `src/__tests__/`, `npm run test` (584/584 thời điểm GĐ28; số ~601 tính cả it/it.each) |
| 10 | Mục tiêu cộng đồng "🍲 Món nhà làm" không thể hoàn thành | **Đã hoàn thành được**: món nấu đi vào tiến độ cooked, đếm là hàng bán; phải nấu tại trạm, không tự mua được | `community.ts:114-119,47,78`, `sales.ts:74 cookedSold`, `orders.ts:173-175,216` |

**Kết luận cập nhật:** cả 10 "lỗ hổng" trong bản nghiên cứu 24/10 **đều đã được giải quyết** (gồm chỉ báo kệ trống 3D trên map — có từ `refreshEmptyMark`). Mọi ưu tiên đề xuất ở đó (P0 minh bạch - quest/nhân viên; P1 nối nấu ăn; P1 sổ đầu ngày/reservation; P0-4 dispose) tương ứng với các GĐ đã đóng. Còn lại là mục polish nhỏ (telemetry "thời gian rảnh") và cân bằng liên tục — xem PROGRESS.md.

