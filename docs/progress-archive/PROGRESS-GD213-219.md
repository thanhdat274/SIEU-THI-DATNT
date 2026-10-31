# PROGRESS archive — GĐ213–GĐ219 (bộ "soi quyết định tiền/vốn" nối sâu)

Chi tiết đầy đủ từng giai đoạn. PROGRESS.md chỉ giữ dòng con trỏ gộp.

## GĐ213 — 🪙 Kho chôn bao nhiêu vốn?
Lượng tiền ĐÓNG BĂNG trong tồn kho: trước kho chỉ báo chỗ + "sắp hết"; giờ biết bằng tiền vốn chôn
theo giá nhập (`buy × qty`) và trị giá bán lẻ hiện tại (`priceOf × qty`), gộp tổng + top món chôn vốn.
`stockCapital` (data/stockCapital.ts) trả totalCost/totalRetail/lines; StoragePanel thêm Callout
"Kho chôn Xđ · trị giá lẻ Yđ", cảnh báo cam khi trị giá vượt cả tiền mặt (ứ vốn → xả sỉ/gánh chợ).
(+4 test).

## GĐ214 — 🪙 Tối nay có "đáy" không? (capstone trục tiền/vốn GĐ211–213)
Bảng cân đối THANH KHOẢN khi có nợ: tài sản lỏng = tiền mặt + trị giá bán hết kho (tái dùng
`stockCapital`) đối chiếu nợ gốc vay. `solvency` (data/solvency.ts) trả liquid/liabilities/cover/
margin + dòng tiền ra hằng ngày ngoài quầy (`loanInterest` + góp hụi `huiDueToday` + `daysToLoanDue`).
Sổ đầu ngày thêm Callout "Cân đối: tiền + bán hết kho = Xđ · nợ gốc Yđ" (đỏ khi thiếu margin → kíp
bơm doanh thu/xả sỉ — nối GĐ211). ReportPanels.tsx. (+5 test).

## GĐ215 — 📞 Đơn gọi nhà lời ròng bao nhiêu?
Khi nghe máy chỉ thấy GIÁ (gross); nay trừ đúng chi phí → lời ròng. `phoneNetProfit` (data/phoneNet.ts):
`phoneCostUnit` = đơn thường/VIP `buy × q`, đơn NẤU = số mẻ `ceil(qty/outputQty)` × tổng nguyên liệu
bếp; trả gross/cost/net/marginRatio. Hud báo "lời ròng ~Xđ (đã trừ chi phí…)" + đỏ khi đơn lỗ.
Móc nối đơn gọi điện × giá vốn/bếp (mẫu GĐ211–214). Hud.tsx. (+4 test).

## GĐ216 — 💸 Đội lương hôm nay cần bao nhiêu khách để TỰ NUÔI?
Nối người × lưu lượng: trước StaffPanel chỉ chìa tổng lương + giá trị từng người; giờ biết lương cả
đội (Σ `dailyWage` đã nhân hệ số ca) ÷ doanh thu bình quân mỗi lượt hôm nay → số lượt HOÀ VỐN lương
+ so với lượt thật → đủ/thiếu. `wageCoverage` (data/wageCoverage.ts) trả wageBill/avgPerVisit/
breakEvenVisits (`ceil(wageBill/avgPerVisit)`)/coverNow/marginPerVisit; StaffPanel thêm Callout tone
ok/warn "cần ~N lượt khách vừa đủ lương", cam khi đang thiếu (nối GĐ141). StaffPanel.tsx. (+5 test).

## GĐ217 — 🏦 Lãi vay đang ngốn bao nhiêu phần doanh thu hôm nay?
Chi phí nợ vs dòng tiền: solvency (GĐ214) chỉ nói lãi vay mỗi đêm là BAO NHIÊU; chưa nói NGỐN bao
nhiêu phần doanh thu hôm nay + trả bớt gốc đỡ được bao nhiêu. `loanBurden` (data/loanBurden.ts) =
`loanInterest` ÷ doanh thu hôm nay → % dòng tiền bị nợ ăn (null khi chưa có doanh thu) +
`interestSavedPerMillion` (mỗi 1 triệu trả bớt gốc tiết kiệm ~8.000đ/ngày, đúng 0.8%/ngày của game).
Sổ đầu ngày thêm Callout "Lãi vay ngốn Xđ/ngày = Y% doanh thu" (cam khi >10% → kíp trả bớt).
ReportPanels.tsx. (+5 test).

## GĐ218 — 📈 Tháng này lời bao nhiêu, món nào gánh gần hết?
Sổ lời theo danh mục: bảng sức khoẻ món (`itemHealthList`) đã liệt kê lời 30 ngày từng món + hạng ABC;
chưa có con số GỘP. `profitMix` (data/profitMix.ts) = Σ profit30 (tổng lời tháng) + top món gánh lời
(share từng món) + RỦI RO TẬP TRUNG (`fragile`: ≤2 món chiếm ≥60% lời → "đứt nguồn món đó là mất phần
lớn lời") + món đang ÂM/tổng lỗ. AnalyticsPanel thêm Callout "Lời 30 ngày Xđ · top N món gánh Y%"
ngay trên bảng ABC. AnalyticsPanel.tsx. (+6 test).

## GĐ219 — 🧾 Tiền mặt hiện có đủ trả lương cuối ngày không?
Quỹ lương theo tiền mặt: lương trả "lúc đi ngủ" (Σ `dailyWage` cả hai tiệm) đối chiếu TIỀN MẶT đang
cầm → đủ/thiếu bao nhiêu + quỹ lương đang cầm đủ mấy ngày (`floor(cash/wageBill)`, `runwayDays`).
`payrollRunway` (data/payrollRunway.ts) trả wageBill/cash/covered/shortfall/runwayDays; StaffPanel thêm
Callout đỏ khi thiếu "bớt nhập/xả sỉ/lót vay trước khi ngủ" (nối GĐ211/GĐ217). StaffPanel.tsx. (+5 test).
