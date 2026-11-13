# Báo cáo Review Người chơi — Đợt 7-2 (13/11/2026)
**Cam kết:** Đánh giá độc lập, trung thực, khó tính theo `PROMPT-REVIEW-NGUOI-CHOI-KHO-TINH.md` và 10 Luật Cứng trong `promt_game.md`. Không tự ý sửa code, không tự thêm góp ý vào backlog/`PROGRESS.md`.

---

## 1. THÔNG TIN PHIÊN REVIEW
- **Ngày review:** 13/11/2026 (Phiên 2 — Đợt 7-2 sau commit `60507c11`).
- **Commit git:** `60507c11` (*GD2391: sua R1/R2 review 2026-11-13 - co gon hud-alert tren mobile ngang tranh tran mep, tang toc nap truoc the gioi 3D tu man dang nhap*).
- **Môi trường & URL:** `http://localhost:5173/?thu=1` (Kho chơi thử độc lập, tuyệt đối không đụng save thật của người dùng).
- **Trạng thái tiến trình chơi:**
  - Bắt đầu phiên: Ngày 6 (Thứ 7, 10:51, Cấp 3 11% XP, 560.718đ).
  - Kết thúc phiên: **Ngày 8 (Thứ 2, 06:00 Nắng đẹp, Cấp 3 83% XP, 185.737đ)**.
  - Số khách ghé Ngày 7: 28 khách (51 món bán ra, doanh thu 330.500đ, lãi bán thật 91.500đ).
  - Tiến độ cốt truyện: Doanh thu tích lũy 422.500 / 500.000đ.
- **Kích thước kiểm tra:**
  - Desktop chuẩn: 1920×1080 & 1280×800.
  - Mobile ngang (812×375) — Trọng tâm kiểm chứng sửa lỗi R1.
  - Mobile dọc (375×812).
- **Kiểm thử đa luồng (Multi-Agent Swarm):**
  - **Subagent 1 (Playtest Tester Round 2 — Browser live automation):** Kiểm chứng trực tiếp sửa lỗi R1 (banner ngang) và R2 (tốc độ vào game); tương tác tính năng Bảng giá (tăng giá mì gói lên 5.500đ để đo phản ứng khách); vận hành trọn vẹn Ngày 6 và Ngày 7 sang Ngày 8.
  - **Subagent 2 (Economy Retention Auditor — Phân tích chuyên sâu):** Mổ xẻ công thức độ nhạy cảm giá `keepChance` và phân hóa 30+ nhóm khách; bóc tách chi phí cố định (tiền nhà, phí vận hành) theo góc nhìn persona *"Chủ tạp hóa ngoài đời"* (P37); soi biên lợi nhuận rổ hàng FMCG theo persona *"Min-Maxer / Kế toán"* (P38/P42); đánh giá phao cứu sinh chuỗi điểm danh `giftGraceDay` theo persona *"Casual tiếc streak"* (P6/P13).

---

## 2. KẾT QUẢ KIỂM CHỨNG CÁC SỬA LỖI ĐỢT TRƯỚC (COMMIT `60507c11`)

| Mã cũ | Nội dung | Kết quả kiểm chứng thực tế | Đánh giá |
|---|---|---|---|
| **R1** | Banner thông báo tính năng mới tràn mép trên mobile ngang (812×375) | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ:** Ở viewport 812×375, các banner cảnh báo (sàn bẩn, khách chờ quầy, mở khóa) đều co gọn trong màn hình, khoảng cách lề an toàn, nút `[Lau nhà]`, `[Ra tiệm]`, `[✕]` hiển thị đầy đủ, bấm nhạy 100%. | **Xong (PASS)** |
| **R2** | Độ trễ fade-out khi chọn "Chơi tiếp trong máy" ở LoginScreen | **ĐÃ KHẮC PHỤC TRIỆT ĐỂ:** Nhờ nạp trước `main.ts` bằng `requestIdleCallback` (timeout 500ms), khi click vào game, màn hình đăng nhập đóng tức thì và cảnh 3D hiện ra ngay không có cảm giác trễ hay đứng hình. | **Xong (PASS)** |

---

## 3. BẢNG TỔNG HỢP GÓP Ý ĐỢT 7-2

| Mã | Tiêu đề | Phân loại | Ưu tiên | Độ tin cậy | Nhóm bị ảnh hưởng | Khuyến nghị |
|---|---|---|---|---|---|---|
| **R1** | Khách chỉ chê đắt to tiếng nhưng thiếu phản hồi vi mô khi bán giá rẻ | Chiều sâu tâm lý | P2 | Cao (Audit code & playtest) | Mọi người chơi thích định giá linh hoạt | **Đưa vào backlog** |
| **R2** | Cần nút tắt "Bày kệ nhanh" ngoài giao diện tiệm trên mobile | Tiện ích thao tác | P2 | Cao (Quan sát trực tiếp) | Người chơi mobile | **Cần xác minh ngân sách HUD** |
| **R3** | Hàng xả kho / giảm giá sâu chưa kích thích khách mua thêm số lượng | Chiều sâu kinh tế | P2 | Cao (Phân tích công thức) | Dân kinh doanh, quản lý tồn kho | **Đưa vào backlog** |
| **R4** | Phao cứu sinh chuỗi điểm danh `giftGraceDay` — Cơ chế giữ chân người chơi cực tốt | Đánh giá giữ chân | P1 | Tuyệt đối (Audit code) | Người chơi bận rộn, casual | **Đừng phá (Bảo vệ)** |
| **R5** | Bóc tách biên lợi nhuận FMCG và lãi bán hàng thật `salesProfit` | Đánh giá kinh tế | P1 | Cao (Audit simulator) | Người chơi thích tối ưu kinh tế | **Phát huy** |

---

## 4. CHI TIẾT CÁC PHÁT HIỆN & ĐỐI CHIẾU

### R1 — Khách chỉ chê đắt to tiếng nhưng thiếu phản hồi vi mô khi bán giá rẻ
- **Loại / ưu tiên / độ tin cậy:** Chiều sâu trải nghiệm / P2 / Độ tin cậy cao.
- **Persona và bối cảnh:** Persona P37 (Chủ tiệm tạp hóa) và P42 (Min-Maxer) khi thử nghiệm hạ giá để xả hàng tồn kho hoặc hút khách đầu ngõ.
- **Quan sát trực tiếp & Bằng chứng mã nguồn:**
  - Khi tăng giá Mì gói lên 5.500đ (cao hơn giá gợi ý 5.100đ), khách phản ứng rất mạnh: trong ngày có 3 khách chê đắt, thốt lên `💸 Mì gói đắt quá!`, trừ sao review, và bảng tổng kết ngày 7 ghi rõ: *"💸 Mì gói: 3 lần khách chê đắt ở giá 5.500đ. Thử hạ về khoảng 5.000đ"*.
  - Tuy nhiên, khi người chơi bán rẻ hơn thị trường (ví dụ Bánh kẹo bán 6.500đ thay vì 8.000đ), hệ thống chỉ tăng thầm lặng chỉ số vĩ mô `demandPriceFactor` (khách ghé đông thêm tối đa 15-25%), còn tại chỗ quầy kệ **khách hoàn toàn im lặng, không có câu thoại khen rẻ hay biểu tượng hài lòng**.
- **Tác động tới trải nghiệm:** Người chơi cảm thấy bị "bất đối xứng cảm xúc": tăng giá thì bị phạt ngay tức khắc và chỉ trích công khai, còn hạ giá hy sinh lợi nhuận thì không thấy khách tỏ vẻ biết ơn hay hào hứng.
- **Đề xuất thay đổi:**
  - Bổ sung xác suất ~15–20% khi khách nhặt món có giá $\le 0.95 \times \text{referenceSell}$, khách sẽ hiện bóng thoại nhỏ hoặc biểu tượng: `🏷️ Rẻ ghê!` hoặc `✨ Giá tốt!`.
- **Đối chiếu luật cứng & ngân sách chống phình:** Tuân thủ Luật 1 (giữ chân người chơi qua phản hồi tích cực) và Luật 2 (chiều sâu vi mô). Không làm phình HUD hay thêm component nặng.
- **Khuyến nghị:** Đưa vào backlog cho đợt nâng cấp chi tiết bán hàng tại quầy.

---

### R2 — Cần phím tắt hoặc thao tác nhanh "Bày kệ nhanh" trên thanh công cụ tiệm
- **Loại / ưu tiên / độ tin cậy:** Tiện ích thao tác (Quality of Life) / P2 / Độ tin cậy cao.
- **Persona và bối cảnh:** Người chơi trên điện thoại (P1, P2) trong giờ cao điểm sáng, hàng trên kệ hết liên tục.
- **Quan sát trực tiếp:** Nút *"📥 Bày đầy cả tiệm"* hiện nằm bên trong modal *"Sơ đồ kệ"*. Mỗi lần muốn châm hàng nhanh, người chơi phải: Bấm vào kệ hoặc mở Sơ đồ kệ $\rightarrow$ Chờ modal mở $\rightarrow$ Bấm "Bày đầy cả tiệm" $\rightarrow$ Bấm đóng modal.
- **Tác động tới trải nghiệm:** Khi tiệm mở rộng lên 4-8 kệ, việc mở đóng modal liên tục chỉ để châm hàng làm đứt gãy nhịp đứng quầy đón khách.
- **Đề xuất thay đổi:**
  - Xem xét tích hợp một thao tác nhanh (ví dụ: giữ phím hoặc nút phụ trên quầy / thanh công cụ khi đứng trong tiệm) để tự động châm đầy kệ từ kho mà không cần mở popup toàn màn hình.
- **Đối chiếu luật cứng & ngân sách chống phình:** CẦN CẨN TRỌNG với **Ngân sách chống phình (Luật 9)**: trần nút HUD dock hiện là 10, menu Thêm là 10. Không được tự tiện thêm nút mới vào HUD dock. Giải pháp an toàn: đặt nút này ngay trong khu vực tương tác 3D khi đứng gần kệ (world action prompt tương tự nút `[C] Lau nhà` hoặc `[E] Xem kệ`), hoặc gộp vào menu thao tác nhanh quầy.
- **Khuyến nghị:** Cần xác minh thiết kế giao diện trước khi triển khai để tránh vi phạm Luật 9.

---

### R3 — Hàng xả kho / giảm giá sâu chưa kích thích khách mua thêm số lượng (Volume Buy)
- **Loại / ưu tiên / độ tin cậy:** Chiều sâu kinh tế / P2 / Độ tin cậy cao.
- **Persona và bối cảnh:** Persona P37 (Chủ tiệm thực tế) và P38 (Dân kế toán) khi xử lý hàng cận hạn hoặc tồn kho lớn.
- **Phân tích công thức (`customers.ts` & `pricing.ts`):**
  - Công thức xác suất giữ món `keepChance` bị chặn trần ở `1.0`:
    $$\text{keepChance} = 1.0 \quad (\forall \; ratio \le 1.0)$$
  - Điều này đồng nghĩa: Bán bằng giá thị trường ($ratio = 1.0$) hay bán lỗ $50\%$ ($ratio = 0.5$) thì xác suất khách nhặt món đó cũng y hệt nhau (100%), và số lượng khách nhặt vẫn chỉ là 1 cái theo danh sách mua ban đầu.
- **Tác động tới trải nghiệm:** Trong thực tế, các đợt "xả hàng đồng giá" hoặc "mua 2 tặng 1" kích thích người tiêu dùng mua tích trữ nhiều hơn số lượng dự định. Trong game, việc hạ giá sâu không giúp giải phóng kho nhanh hơn mà chỉ làm teo tóp doanh thu.
- **Đề xuất thay đổi:**
  - Khi một món hàng có giá bán $\le 75\%$ giá tham chiếu thị trường (và kệ còn dư hàng), cho phép xác suất 20% khách sẽ nhặt thêm $+1$ sản phẩm đó (hành vi "thấy rẻ mua gom").
- **Đối chiếu luật cứng:** Phù hợp với Luật 10 (bán hàng là nghề chính, mô phỏng buôn bán chân thật). Đã có cơ chế kiểm soát tồn kho kệ nên không sợ vỡ logic.
- **Khuyến nghị:** Đưa vào backlog nghiên cứu cân bằng kinh tế.

---

### R4 — Phao cứu sinh chuỗi điểm danh (`giftGraceDay`) — Đòn bẩy giữ chân xuất sắc
- **Loại / ưu tiên / độ tin cậy:** Đánh giá hệ thống / P1 / Độ tin cậy tuyệt đối.
- **Phân tích mã nguồn (`progress.ts`):**
  - Khi người chơi bận công việc ngoài đời và trễ 1 ngày ($nowDay - giftLastDay == 2$) với chuỗi $\ge 3$, game không xóa trắng chuỗi mà kích hoạt phao cứu sinh:
    `🛟 Bạn bận mất 1 ngày — hẻm tha cho lần này, chuỗi điểm danh vẫn giữ!`
- **Đánh giá Persona:** Persona P6 (Casual tiếc streak) và P25 (Mẹ bỉm sữa bận rộn) đánh giá đây là tính năng nhân văn và giữ chân người chơi tốt nhất: nó triệt tiêu nỗi sợ "mất sạch công sức cả tuần" vốn là nguyên nhân hàng đầu khiến game thủ casual bỏ game vĩnh viễn.
- **Khuyến nghị:** **ĐƯA VÀO MỤC ĐỪNG PHÁ.** Giữ nguyên vẹn cơ chế này.

---

### R5 — Bóc tách biên lợi nhuận FMCG và lãi bán hàng thật (`salesProfit`)
- **Loại / ưu tiên / độ tin cậy:** Đánh giá kinh tế / P1 / Độ tin cậy cao.
- **Quan sát trực tiếp tại Ngày 7:**
  - Doanh thu: 330.500đ.
  - Chi tiêu nhập kho gối đầu: -589.410đ (ôm 6 thùng hàng dự trữ).
  - Phí vận hành: -6.610đ. Tiền nhà: -20.000đ.
  - Bảng tổng kết giải thích cực kỳ rành mạch: dòng tiền âm tạm thời do nhập kho gối đầu, nhưng **Lãi bán hàng thật vẫn dương +91.500đ**, và tiền thưởng nhiệm vụ chiếm 0% tổng thu.
- **Đánh giá Persona P38 (Dân kế toán):** Việc tách bạch giữa dòng tiền (Cash flow) và Lãi bán hàng thật (Accrual profit) giúp người chơi hiểu bản chất kinh doanh: ôm hàng không phải là lỗ, mà là chuyển tiền mặt thành tồn kho. Điều này ngăn chặn tâm lý hoang mang khi thấy két tiền giảm.
- **Khuyến nghị:** Phát huy, giữ nguyên tính minh bạch của bảng tổng kết ngày.

---

## 5. MỤC "ĐỪNG PHÁ" (BẢO VỆ CHO CÁC PHIÊN SAU)
1. **Phao cứu sinh chuỗi điểm danh (`giftGraceDay`):** Tuyệt đối không xóa bỏ cơ chế tha bổng trễ 1 ngày để bảo vệ tỷ lệ giữ chân người chơi casual.
2. **Hệ thống nạp trước thế giới 3D (`requestIdleCallback` với timeout 500ms):** Đã sửa ở `60507c11`, vào game dứt khoát mượt mà, giữ nguyên cấu trúc này.
3. **Cơ chế bóc tách `salesProfit` và kiểm soát tỷ số thưởng (Luật 10):** Bảo đảm bán hàng luôn là nghề chính, không để thưởng nhiệm vụ phá vỡ động lực buôn bán.
4. **Độ nhạy phân tầng theo nghề nghiệp của khách hàng (`customerSensitivity`):** Cụ già nhạy giá 1.5, Học sinh 1.4, Dân văn phòng 0.85, Người nổi tiếng 0.5 — giữ vững tính đa dạng xã hội hẻm.

---

## 6. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG
- **3 vấn đề đáng xem xét đưa vào backlog:**
  1. Thêm micro-reaction (thoại `🏷️ Rẻ ghê!`, icon hài lòng) khi khách mua được hàng giá tốt (R1).
  2. Bổ sung cơ chế khách mua thêm $+1$ món khi hàng xả kho giảm sâu $\le 75\%$ (R3).
  3. Nghiên cứu nút thao tác châm kệ nhanh ngoài không gian 3D mà không làm phình nút HUD (R2).
- **Câu hỏi cần playtest người thật:**
  - Tần suất châm kệ ở ngày 10-15 khi tiệm đông khách có gây mỏi tay trên màn hình cảm ứng điện thoại không?
- **Giới hạn của đợt review:** Phiên chơi đã vượt qua mốc Ngày 7 sang Ngày 8 ổn định với 0 lỗi console. Đợt này tập trung kiểm thử trên thiết bị di động giả lập; khuyến nghị duy trì playtest định kỳ sau mỗi 5-10 giai đoạn phát triển nội dung lớn.

*Báo cáo được hoàn thành bởi Hội đồng Review Người chơi Khó tính Đa luồng (Antigravity Multi-Agent Panel).*
