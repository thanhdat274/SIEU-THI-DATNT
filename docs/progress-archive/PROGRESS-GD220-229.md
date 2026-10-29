# PROGRESS archive — GĐ220–GĐ221 (QA toàn diện + mở rộng soi mua hàng)

Chi tiết đầy đủ từng giai đoạn. PROGRESS.md chỉ giữ dòng con trỏ gộp.

## GĐ220 — ✅ QA TOÀN DIỆN + phủ test (mỗi 10 GĐ)
`npm run test:coverage` → **branch 87.03%** (GĐ210: 86) · **function 74.49%** (GĐ210: 68.9) ·
**statement 49.11%** (GĐ210: 42.9; phần thấp còn lại là render/world/audio 3D, trước đó GĐ210 đã ghi
nhận). Chơi thật nhiều cấp do simSmoke/simGolden/economySim bao (xanh trong full suite). QA browser
@5173 bằng điều khiển trình duyệt: màn chơi load sạch (tiền / công cụ / kế hoạch hôm nay / thời tiết),
canvas 3D render cả desktop 1280×720 lẫn mobile 390×844, **không tràn ngang** (scrollW == bodyW).
tsc + build sạch. Full suite 2031/2031 (189 files). QA kế: GĐ230.

## GĐ221 — 🛒 "Lô chợ phiên đáng múc không?"
Định giá QUYẾT ĐỊNH mua lô thương lái (GĐ68, đầu tháng giảm 84% so với mua lẻ): banner chợ phiên
(OrderPanel) mới chỉ cho biết TIẾT KIỆM so với mua lẻ; giờ đối chiếu từng món TRONG lô với tồn kho +
sức bán `itemHealthList.dailyQty` → món đang bán nhanh/cầm ít thì lô là `beneficial` (múc `grab`),
món đã có đủ trên `OVERSTOCK_DAYS=7` ngày là `overstock` → `hold` (mua sẽ CHÔN thêm vốn, nối GĐ213).
`fairLotValue` (data/fairLotValue.ts) trả savings/savePct/dealPrice/lines (id,name,qty,have,dailyQty,
daysOfStock,beneficial,overstock)/beneficialCount/overstockCount/verdict (`grab`|`maybe`|`hold`).
OrderPanel thêm dòng khuyên xanh/cam ngay trong banner chợ phiên. (+5 test).
