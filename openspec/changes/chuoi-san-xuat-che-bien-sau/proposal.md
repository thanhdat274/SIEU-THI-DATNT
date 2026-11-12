# Proposal

## Why

Chiều sâu "thêm món/lối ra" đã cạn (GĐ2370-86, rà tận cùng). Hướng mở rộng Leader chốt là **chuỗi sản xuất chế biến sâu** (hướng tương lai user liệt kê từ GĐ1076): nông sản vườn nay chỉ bán tươi (hỏng nhanh, giá thấp) — thiếu mắt xích chế biến sâu thành hàng đặc sản bán giá cao và KHÔNG hỏng, tạo chiến lược "trữ nông sản" mới thay vì bán gấp.

## What Changes

- Thêm **5 hàng đặc sản chế biến tại gia** (`CB_PRODUCTS`, id `cb_*`, category `dry`) từ cây vườn có sẵn: Chuối sấy dẻo (x_chuoi), Xoài sấy dẻo (x_xoai), Vải sấy (x_vai), Mít sấy (x_mit), Khoai lang sấy (cây khoai_lang vườn).
- Thêm **5 công thức chế biến** ở trạm `food_grill` (sấy lửa nhỏ — ghi rõ realism trong comment), output là hàng khô đặc sản (giữ lâu, không spoil như fresh).
- Chuỗi kinh tế: mẻ từ nông sản vườn phải hời hơn bán tươi thẳng (luật monKhuon); nhãn `garden.homegrown` tự trừ theo cơ chế nấu sẵn có (orders.ts) → bán đặc sản vẫn hưởng premium HOMEGROWN.
- Nối nhịp: hàng khô mới vào `unlockPacing` baseline, tái sinh UNLOCK-CURVE; test monKhuon/monThat +1 dòng/món; quests/phoneOrders tự nhận qua COOKED_PRODUCT_IDS/unlockedProducts (không wire thủ công).
- **KHÔNG** đụng hệ nấu/trạm/co-op (data-only như mọi GĐ thêm món — an toàn parity đơn/co-op).

## Capabilities

### New Capabilities
- `che-bien-sau`: chuỗi chế biến nông sản vườn thành hàng đặc sản khô (cb_*) — công thức, trạm, kinh tế monKhuon, nhãn homegrown, độ bền hàng khô.

### Modified Capabilities

(none)

## Impact

- `src/data/recipes.ts` (COOKED_PRODUCTS + RECIPES +1 khối mỗi món, `since: CONTENT_EPOCH_NOW`)
- `src/__tests__/monKhuon.test.ts`, `src/__tests__/monThat.test.ts`, `src/__tests__/unlockPacing.test.ts`
- `docs/UNLOCK-CURVE.md` (npm run unlock:curve), `PROGRESS.md`
- Không đụng: store/slice/actions, co-op, save schema, UI panel (Sổ nấu hiển thị tự động).

## Outcome (13/11/2026) — BỘC LỘC, TẠM DỪNG chờ thiết kế lại

Triển khai GĐ2387 (commit e416f6b0) đã REVERT vì phá 2 test khoá luật cân bằng:

1. **Bài học 1 — output công thức KHÔNG được chiếm hàng catalog có sẵn**: tái dùng `x_mit_say`/`x_khoai_lang_say` làm output đưa chúng vào `COOKED_PRODUCT_IDS` → bot sim coi là "món nhà làm không nhập được", ngừng mua hàng mối → sập kinh tế L45 (bisect crisisBalance). Output phải là thành phẩm COOKED riêng mang `since`.
2. **Bài học 2 — hàng cook-output không có đường cầu thì chiếm kệ bán ỉm**: 5 hàng `cb_*` bày kệ mà không ai thèm → bot L65 đổ hàng, mốc stanceBalance sập 19.413M → 11.264M (-42%).
3. **Bài học 3 — nối demand (rhythm wants) lại làm lệch crisisBalance L45** qua một đường tiêu thụ wants chưa lọc unlock (chưa isolate được; số thay đổi deterministic theo từng cấu hình — đã bisect 6 lần, mỗi cấu hình cho bộ số ổn định).
4. Kết luận: chuỗi chế biến sâu cần thiết kế lại — hướng khả dĩ: (a) hàng `cb_*` là hàng MUA được (đặc sản mối lái/kênh mới) thay vì cook-output; (b) hoặc cải thiện bot sim nấu/bày trước; (c) hoặc tìm-isolate đường leak wants. OpenSpec giữ lại làm tư liệu thiết kế.

## Outcome v2 (13-11-2026) — SHIP được với thiết kế "pattern GĐ1322 + unlock ngoài cửa sổ sim"

Thiết kế lại lần 2 THÀNH CÔNG, cả 2 sim cân bằng xanh đúng số gốc:
- **Bài học áp dụng**: (1) output là COOKED riêng mang `since` (không chiếm hàng catalog); (2) main input là ĐẶC SẢN VÙNG đắt (`rg_com_lang` 44k / `rg_mac_khen` 58k — mối lái) → churn bot thấp, đúng pattern GĐ1322 đã kiểm chứng từ trước; (3) biên mẻ khiêm tốn (ROI 0.69/0.80); (4) **unlock 70/71 — ngoài CẢ cửa sổ sim crisisBalance L45 và stanceBalance L65** (2 lock đã mỏng dính với nội dung nấu mới trong cửa sổ: thử 45/53 → mốc L45 phình +55%; 56/57 → stance L65 sập -53% — đều bisect bằng số mốc deterministic).
- Thành phẩm: **Chè cốm** (rg_com_lang → hot_kettle, mở 70 — khép luôn "chè cốm/cốm chưa có") + **Gà nướng mắc khén** (rg_mac_khen → food_grill, mở 71 — khép "mắc khén chưa có"). monThat/MON_KHUON +2 dòng; unlockPacing band(61,80) 167→171; tổng 1882 mốc.
- **Hạn chế đã biết ghi cho tương lai**: 2 lock cân bằng (crisis L45 + stance L65) mỏng dính — mọi nội dung nấu mới trong cửa sổ L45-65 đều lật luật; việc mở rộng chuỗi chế biến tiếp (nông sản nhà → đặc sản) cần cân bằng lại hạ tầng sim trước (đề xuất Leader).
