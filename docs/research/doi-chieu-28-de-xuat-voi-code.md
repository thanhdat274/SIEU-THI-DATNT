# Đối chiếu 28 đề xuất (từ Nông trại GenZ) với code game Siêu thị

Ngày đối chiếu: 21/10/2026. Nhánh `thay-doi-game-sang-3d`.
Đối chiếu từ file [nong-trai-genz-phan-tich.md](nong-trai-genz-phan-tich.md), mục 6.

## 0. Cách đọc và giới hạn

- **Chỉ đọc code và tài liệu, chưa chạy game.** Mọi kết luận "đã có" nghĩa là tìm thấy code/UI tương ứng; tôi chưa kiểm chứng nó chạy đúng trong trình duyệt hay trong renderer 3D. Theo `ROADMAP.md`, nhiều mục của chính dự án còn ghi "CHƯA QA browser".
- **Nhãn:** `ĐÃ CÓ` = hệ thống tương đương đã tồn tại; `MỘT PHẦN` = có nền nhưng thiếu cách trình bày hoặc thiếu một mảnh quan trọng; `CHƯA CÓ` = không tìm thấy trong code.
- **Chưa tìm thấy ≠ chắc chắn không có.** Tôi tìm bằng grep tên file và từ khoá; các mục `CHƯA CÓ` nên xác nhận lại nhanh trước khi lên kế hoạch.
- **Đính chính bản trước:** trong file phân tích Nông trại GenZ tôi viết game của bạn "lớp cảm xúc và móc câu chuyện chưa nổi bật". Điều đó chưa đúng hoàn toàn: game đã có cốt truyện 7 chương, 6 khách quen có tính cách, sự kiện theo mùa, đơn tiệc. Điểm yếu thật nằm ở **cách trình bày** (xem mục 3), không phải thiếu nội dung.

## 1. Tóm tắt kết quả

| Nhãn | Số mục | Các mục |
|---|---|---|
| ĐÃ CÓ | 9 | 4, 8, 12, 13, 16, 17, 18, 20, 25 |
| MỘT PHẦN | 10 | 1, 2, 3, 5, 6, 9, 15, 19, 21, 26 |
| CHƯA CÓ | 9 | 7, 10, 11, 14, 22, 23, 24, 27, 28 |

Nhận xét chung: phần **hệ thống** (kinh tế, sự kiện, nhiệm vụ, khách quen, hậu quả) game bạn đã đi xa hơn Nông trại GenZ. Phần còn thiếu chủ yếu là **lớp trình bày và gắn kết người chơi**: cuộc gọi/tin nhắn NPC, dẫn đường, cảnh nhận quà, hoạt động phụ (mini-game, thú cưng), kênh cộng đồng, và các mục vận hành khi phát hành (độ tuổi, trang giới thiệu).

## 2. Bảng đối chiếu chi tiết

### Nhóm A: Nên làm sớm

| # | Đề xuất | Nhãn | Bằng chứng trong code | Còn thiếu / ghi chú cho 3D |
|---|---|---|---|---|
| 1 | Một câu móc câu chuyện | MỘT PHẦN | `packages/game-data/src/story.ts`: 7 chương, chương 1 "Về quê giữ tiệm" (bà gửi tiệm), chương 4 "Chị Hạnh bên thuế", chương 5 "Siêu thị đối diện", chương 7 "Mở thêm cơ sở". Chương hiển thị ở tab "Cốt truyện" của `QuestModal.tsx`. | Mỗi chương chỉ 2 dòng thoại tĩnh; chỉ xem khi người chơi mở tab. Chưa có "lời hứa/mối nợ" xuyên suốt và nhân vật đối trọng rõ. Cần xem đã nối cốt truyện với `neighborhood` nhiều đến đâu. |
| 2 | Gợi ý "việc kế tiếp" dẫn đường | MỘT PHẦN | `TutorialChecklist.tsx` (hiện bước tiếp theo, mở rộng được, ẩn được); `getTutorialChecklist` trong `game-core/src/analytics.ts`. | Chỉ là chữ, bấm không đưa nhân vật/camera tới chỗ làm. 3D đã có `tile-target.ts` và `overlay-3d.ts` (chiếu toạ độ ô lên màn hình) nên làm mũi tên chỉ đường hoặc camera nhảy tới ô là khả thi. |
| 3 | Báo lý do khi thao tác sai | MỘT PHẦN | Rất nhiều thông báo: ~173 chỗ `addToast` trong `App.tsx`; bảng lý do `BUNDLE_REASON_MESSAGES` (`civic-bundles.ts`); `land-error-messages.ts`. | Cần kiểm các thao tác **mới của 3D** (click mái, chọn tòa bằng `BuildingPanel`, kéo camera) xem có phản hồi khi sai không. Chưa kiểm. |
| 4 | Sổ mục tiêu ba lớp | ĐÃ CÓ | `QuestModal.tsx` 4 tab: Nhiệm vụ ngày, Đơn tiệc có hạn, Sổ mục tiêu & Tuần, Cốt truyện. Lưu `claimedDaily`, `claimedWeeklyQuestIds`. `LONG_TERM_GOALS` trong `goals.ts`. | Chưa thấy chi tiết "quên nhận thì sáng mai tự cộng". Nên kiểm. |
| 5 | Tooltip trạng thái trên từng đối tượng | MỘT PHẦN | `overlay-3d.ts`: bong bóng khách, nhãn khách quen (`game-overlay-regular-tag`), huy hiệu yêu cầu (`game-overlay-request-badge`), số tiền bay (`floating-gain`). `shelf-stock.ts` cho thấy hàng trên kệ 3D. | Chưa thấy tooltip cho kệ/quầy/nhân viên (thiếu hàng, hết hạn, đang trống). `BuildingPanel.tsx` mới thêm (chưa commit) có thể là nơi gắn. |
| 6 | Bố cục HUD và tạm dừng khi ẩn trang | MỘT PHẦN | Hệ responsive lớn: `responsive.ts`, `responsive.css`, `docs/ui-ux/*`, QA 7 viewport. | `visibilitychange` trong `App.tsx` chỉ **lưu game** (`onHide` → `flush`), chưa thấy **tạm dừng mô phỏng**. Chưa kiểm game có chạy tiếp khi tab ẩn không; co-op thì không nên dừng. Desktop là ưu tiên của 3D nên HUD cần soi lại sau khi xoay camera. |

### Nhóm B: Kể chuyện và NPC

| # | Đề xuất | Nhãn | Bằng chứng | Còn thiếu / ghi chú |
|---|---|---|---|---|
| 7 | Cuộc gọi/tin nhắn NPC làm kênh hướng dẫn và mở khoá | CHƯA CÓ | Không có UI điện thoại. NPC nói qua hộp thoại/tab. | Dữ liệu để dùng đã sẵn: chương `story.ts`, thoại khách quen. Chỉ cần lớp UI (modal kiểu điện thoại) + điểm kích hoạt. Không đụng renderer. |
| 8 | 6–8 NPC khách quen | ĐÃ CÓ | `regulars.ts`: **6** khách quen — Bà Năm Bán Xôi, Chú Ba Xe Ôm, Bé Na Học Sinh, Chị Lan Văn Phòng, Bác Tám Tổ Trưởng, Anh Tuấn Lập Trình. Mỗi người có sở thích món, độ kiên nhẫn, nhạy giá, ngưỡng thiện cảm + perk, thoại chào/hài lòng/bỏ đi, giờ ghé quán ăn vặt. Có mua chịu/sổ nợ (`RegularsModal`, `CashierModal`). | Thiếu **tuyến nhiệm vụ riêng** cho từng người (như đơn hàng của Chị Na). |
| 9 | NPC phản ứng theo giờ/sự kiện | MỘT PHẦN | `neighborhood-dialogue.ts`: thoại giữa hai NPC nền theo thời tiết, buổi trong ngày, nơi gặp. | Chưa thấy NPC **nói với người chơi** theo giờ/sự kiện; thoại khách quen là chuỗi cố định. |
| 10 | "Tám tiếp" (mẹo gói trong thoại) | CHƯA CÓ | Không có. | Dùng lại `neighborhood-dialogue` làm ngân hàng câu. |
| 11 | Nhận quà thành một cảnh | CHƯA CÓ | Thưởng hiện bằng toast/`BundleCompletePopup`/số tiền bay. | Có thể dùng chung khung với mục 7 (điện thoại). |

### Nhóm C: Kinh tế và chiều sâu

| # | Đề xuất | Nhãn | Bằng chứng | Ghi chú |
|---|---|---|---|---|
| 12 | Mục tiêu tích tiền cụ thể ở cổng khu mới | ĐÃ CÓ | `LevelRoadmapModal` (mốc mở khoá theo cấp), `parcel-price.ts`, `expansion-budget.test.ts`, giá lô (`ParcelBuyModal`), ngưỡng hạng tiệm 100/160/240 ô, mục tiêu doanh thu 100k → 10 triệu. | Đã đủ; chỉ cần xem lại độ dốc giá sau khi chơi thử. |
| 13 | Hậu quả khi lơ là | ĐÃ CÓ | Hàng hết hạn (`spoilage.ts`), trộm đêm (`security-manager.ts`), nợ lương, nợ xấu (`bad_debt`), uy tín theo lời chê (`review-reputation.ts`, `word-of-mouth.ts`), mất điện, kiểm tra vệ sinh (`market-events.ts`). | Rất nhiều; nên cân nhắc *giảm* thay vì thêm. |
| 14 | Buff nhỏ rẻ tiền | CHƯA CÓ | Chỉ có perk dài hạn theo kỹ năng (`skills.ts`). Nhân viên có `stamina` nhưng chỉ là chỉ số tuyển dụng (`staff-manager`, `simulation.ts:3721`), không có tâm trạng/năng lượng. | Muốn làm cần thêm trạng thái tạm thời vào save. |
| 15 | Mặt hàng ngẫu nhiên kiểu "túi bí ẩn" | MỘT PHẦN | Sự kiện thị trường ngẫu nhiên: mối sỉ xả hàng, khan hàng (`market-events.ts`); khách VIP nhờ món (`special-request.ts`). | Chưa có hộp/thùng hàng bí ẩn. |
| 16 | Nâng cấp tiệm kèm lợi ích hằng ngày | ĐÃ CÓ | Mở rộng ô theo cấp, hạng tiệm theo ô sàn, nâng tầng nhà dân, kệ/quầy, `StoreLayoutModal`, `BuildingPanel`. | Đã đủ; nên kiểm chữ "lợi ích" hiển thị rõ ở UI nâng cấp. |
| 17 | Khoá tiến trình ghi nhãn rõ | ĐÃ CÓ | Tab Cốt truyện: "Mở khi đạt cấp X và nhận thưởng chương trước"; `LevelRoadmapModal`; `ParcelBuyModal`. | Đã đủ. Chưa kiểm nhãn trên **bản đồ 3D**. |
| 18 | Đơn đặc biệt từ NPC | ĐÃ CÓ | `partyOrders.ts` (đơn tiệc có hạn, theo mùa), `special-request.ts` (khách VIP). | Đã đủ. |

### Nhóm D: Sưu tầm, sự kiện, giữ chân

| # | Đề xuất | Nhãn | Bằng chứng | Còn thiếu / ghi chú |
|---|---|---|---|---|
| 19 | Sổ sưu tầm và thưởng mốc nhỏ | MỘT PHẦN | `titles.ts` (danh hiệu theo mốc), `LONG_TERM_GOALS`, sổ góp xóm (`civic-bundles.ts`, kiểu "góp đủ để mở công trình"). | Chưa có sổ sưu tầm hàng hoá/món ăn/khách đã gặp. |
| 20 | Lịch sự kiện/lễ theo ngày | ĐÃ CÓ | `seasons.ts` (357 dòng), `market-events.ts` (14 sự kiện), `NeighborhoodEventsModal`, huy hiệu mùa trên HUD. | Đã đủ. Chưa kiểm sự kiện có đổi cách bán hàng thật hay chỉ đổi số liệu. |
| 21 | Phiên ngắn: nhiệm vụ ngày, quà đăng nhập, nhắc | MỘT PHẦN | Nhiệm vụ ngày/tuần có. | Chưa thấy quà đăng nhập/chuỗi ngày và thông báo nhắc. |
| 22 | Mini-game xen kẽ | CHƯA CÓ | Không có. | Rủi ro lớn nhất về công QA; xem mục 4. |
| 23 | Thú cưng/đồng hành | CHƯA CÓ | Không có. | 3D đã có `actors-3d.ts` và `actor-atlas.ts` nên thêm một nhân vật phụ là khả thi, nhưng cần luật hành vi + save. |
| 24 | Kênh cộng đồng + code quà | CHƯA CÓ | Không có hệ code. | Cần server (đã có `apps/server`), schema, chống lạm dụng. |

### Nhóm E: Xã hội và vận hành

| # | Đề xuất | Nhãn | Bằng chứng | Còn thiếu / ghi chú |
|---|---|---|---|---|
| 25 | Cloud save đơn giản | ĐÃ CÓ | `apps/server/src/cloud-save.ts`, `hooks/useCloudSave.ts`, `SaveModal.tsx`, đăng nhập Google (Firebase). | Khác cách của Nông trại GenZ (mã + PIN), nhưng cùng mục đích. Không cần làm. |
| 26 | Kết bạn, ghé tiệm, tặng quà, góp hàng | MỘT PHẦN | Chơi chung "Hẻm online" bằng mã mời (`createWorldInvite`, `AccountBar`), voice chat, sổ góp chung, bỏ phiếu đất. | Chưa có danh sách bạn, ghé tiệm người khác, tặng quà, bảng xếp hạng bạn bè. Hướng của bạn (chung một thành phố) khác hướng "ghé nhà nhau" nên cần cân nhắc. |
| 27 | Trang giới thiệu riêng | CHƯA CÓ | `apps/web` là ứng dụng; chưa thấy trang landing/FAQ/trạng thái. | Chỉ cần nếu bạn định phát hành công khai. |
| 28 | Cảnh báo độ tuổi/minh bạch | CHƯA CÓ | `LoginScreen.tsx` chưa thấy cảnh báo 18+/điều khoản/quyền riêng tư (grep không ra). | Đáng cân nhắc trước khi phát hành: game có thuế, tiền, nợ (xem `docs/tax/`). Tài liệu thuế cho thấy nội dung có tính "mô phỏng đời thật", nên cần dòng giải thích rõ là hư cấu. |

## 3. Kết luận chính

1. **Game bạn không thiếu nội dung kể chuyện; thiếu cách đưa nó tới người chơi.** Cốt truyện, khách quen, đơn tiệc, sự kiện mùa đều có, nhưng nằm trong các tab/modal. Nông trại GenZ đẩy nội dung ra qua cuộc gọi, thoại, cảnh nhận quà. Đây là khoảng cách lớn nhất và rẻ nhất để thu hẹp, vì chủ yếu là UI chứ không đổi luật chơi.
2. **Điểm mạnh nên giữ:** chiều sâu kinh tế, hậu quả, co-op chung một thành phố, hệ khách quen có tín dụng. Nông trại GenZ không có những thứ này.
3. **Không nên bê:** mini-game, thú cưng, code quà, kết bạn ghé nhà. Chúng thêm nhiều bề mặt QA và schema trong khi hệ thống hiện tại còn nhiều mục "CHƯA QA browser".

## 4. Đề xuất ưu tiên (theo giá trị/chi phí, đã tính tới việc đang chuyển sang 3D)

| Ưu tiên | Việc | Mục liên quan | Vì sao | Chạm vào |
|---|---|---|---|---|
| 1 | **Nút "Việc kế tiếp" dẫn đường:** bấm checklist → camera nhảy tới ô hoặc hiện mũi tên trên cảnh | 2, 5 | 3D dễ lạc hơn 2D; hạ tầng chiếu toạ độ đã có | `TutorialChecklist`, `overlay-3d`, `tile-target`; không đụng `game-core` |
| 2 | **Lớp "điện thoại":** modal kiểu cuộc gọi/tin nhắn dùng dữ liệu `story.ts` và thoại khách quen sẵn có; dùng làm cảnh nhận thưởng | 1, 7, 10, 11 | Biến nội dung đã có thành trải nghiệm; ít rủi ro | UI web; thêm sự kiện "mở chương" |
| 3 | **Tuyến nhiệm vụ riêng cho 6 khách quen** | 8, 9, 18 | Dữ liệu perk/ngưỡng đã có, chỉ thiếu "câu chuyện" từng người | `regulars.ts` + đơn tiệc |
| 4 | **Tooltip trạng thái kệ/quầy/nhân viên trong 3D** | 3, 5 | Giúp người chơi hiểu vì sao hàng hết/khách bỏ đi | `BuildingPanel`, `overlay-3d` |
| 5 | **Phản hồi thao tác sai cho các thao tác 3D mới** | 3 | Có thể tồn tại lỗ hổng sau khi đổi renderer | Rà QA trình duyệt, không cần code mới |
| 6 | **Trang giới thiệu + dòng cảnh báo hư cấu/độ tuổi** (chỉ nếu phát hành) | 27, 28 | Giảm rủi ro hiểu lầm về thuế/tiền | Ngoài game |
| Sau | Sổ sưu tầm (19), quà đăng nhập (21) | 19, 21 | Giữ chân, nhưng cần cân bằng | Cần thêm save |
| Chưa nên | Mini-game, thú cưng, code quà, kết bạn ghé nhà | 22, 23, 24, 26 | Chi phí QA lớn, lệch hướng "thành phố chung" | — |

## 5. Mối liên hệ với chuyển sang 3D (quan sát từ code)

- Mọi mục UI (điện thoại, sổ, popup, checklist) là DOM nên **không phụ thuộc renderer**: làm một lần dùng cho cả Pixi và Babylon.
- Mục cần renderer: mũi tên/camera dẫn đường (cần `tile-target.ts`, `overlay-3d.ts`, `coords.ts` với `isoAlpha`/góc quay), tooltip trên đối tượng (chiếu 3D → 2D), thú cưng (nếu làm, qua `actors-3d`).
- `docs/plans/3d-migration-plan.md` ghi ưu tiên **desktop** và mobile để sau: khi làm lớp trình bày mới, nên QA desktop trước, đúng như memory dự án.
- Có thay đổi chưa commit trong cây làm việc (BuildingPanel, sky-3d, weather-3d, qa-3d). Nên chốt chúng trước khi thêm tính năng mới để tránh lẫn lỗi.

## 6. Việc nên xác nhận trước khi lên kế hoạch

1. Game có tạm dừng mô phỏng khi tab bị ẩn hay chạy nền? (mục 6)
2. Thưởng nhiệm vụ ngày có tự cộng khi người chơi quên nhận không? (mục 4)
3. Có thông báo nhắc/đẩy nào cho người chơi quay lại không? (mục 21)
4. Có trang landing hay cảnh báo độ tuổi ở nơi nào ngoài `apps/web` không? (mục 27, 28)
5. Sự kiện mùa có thật sự đổi cách bán hàng hay chỉ đổi hệ số? (mục 20)
6. Các thao tác 3D mới (click mái, `BuildingPanel`) có báo lỗi khi sai không? (mục 3)
