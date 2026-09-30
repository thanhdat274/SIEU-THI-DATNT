# Proposal

## Why

Vòng chơi hiện có đã mạnh phần vận hành: kho/lô/hạn, nhiều mối nhập, khách có giỏ và hàng đợi, nhân viên, sổ cái, quầy ăn, mùa vụ, bố cục tiệm. Nhưng người chơi chưa có **lý do quay lại mỗi ngày và mục tiêu dài hạn**: giá bán cố định theo catalog, uy tín chỉ bị trừ (không bao giờ tăng), khách vô danh, mùa chỉ nhân lượng khách, nhiệm vụ chỉ có ngày/cốt truyện, không có tổng kết cuối ngày cho người chơi. Stardew Valley giải đúng những chỗ này bằng nhịp ngày rõ ràng, quan hệ cư dân, lịch lễ hội, gói mục tiêu sưu tập và kỹ năng lên cấp qua sử dụng. Game tham khảo `tap-hoa-dau-hem` đã có bản tiệm tạp hóa của nhiều thứ đó (đặt giá, rating→lượng khách, khách theo loại, đơn tiệc, nhiệm vụ tuần, danh hiệu) nên dùng làm nguồn quy tắc cụ thể.

## What Changes

Bảy capability, phát hành tăng dần, mỗi đợt tự chơi được và không đòi refactor:

- `shop-pricing`: người chơi tự đặt giá trong dải quanh giá gợi ý; giá ảnh hưởng xác suất khách lấy hàng, lượng khách và biên lãi.
- `shop-reputation`: uy tín tăng/giảm hai chiều từ đánh giá sao mỗi khách, ảnh hưởng lượng khách; mốc uy tín mở đặc quyền.
- `regular-customers`: 6–8 khách quen có tên (kiểu cư dân Stardew) với mức thân thiết, món ưa thích, yêu cầu riêng và phần thưởng.
- `day-rhythm`: bản tin sáng (dự báo, sự kiện, đơn chờ) và tổng kết cuối ngày (doanh thu, lãi gộp, hàng hỏng, khách, việc xong) dựng trên DailyRecord có sẵn.
- `town-events`: thời tiết theo ngày và ngày hội trong hẻm (mở rộng `seasons.ts`), kèm đơn đặt tiệc có hạn.
- `shop-goals`: "Sổ ước nguyện đầu hẻm" (gói mục tiêu sưu tập kiểu Community Center) và nhiệm vụ tuần, thưởng mở đất/mối/nội thất.
- `shop-skills`: 3 kỹ năng lên cấp nhờ hành động (bán hàng, kho vận, quan hệ), mỗi mốc 5 và 10 chọn một đặc quyền.

Ngoài phạm vi (rõ ràng KHÔNG làm): làm nông, khai thác/chiến đấu, câu cá, hôn nhân/tình cảm, năng lượng người chơi, bản đồ nhiều khu, độ bền dụng cụ, giao tặng vật phẩm tự do, chi nhánh, thay engine. Chi tiết và lý do trong `research.md` mục 5.

## Capabilities

### New Capabilities
`shop-pricing`, `shop-reputation`, `regular-customers`, `day-rhythm`, `town-events`, `shop-goals`, `shop-skills`.

### Modified Capabilities
Không có main specs (`openspec/specs` rỗng). Đợt mở rộng phụ thuộc/bổ sung change: `adapt-reference-shop-operations` (khách/giỏ/ledger/nhân viên — giữ nguyên), `store-layout-expansion` (mở đất làm phần thưởng), `shared-alley-multiplayer` (mọi trạng thái mới đi qua command có ID để server authoritative; không tạo mạng riêng).

## Impact

- `packages/shared/src/index.ts`: thêm trường tùy chọn vào `SaveGameData`/`PlayerData` (prices, reputationLog, regulars, weather, goals, skills) — schema tăng version có migration mặc định rỗng; `GameCommand` thêm `set_price`, `claim_goal`, `choose_perk`, `respond_party_order`.
- `packages/game-data/src`: file dữ liệu mới `regulars.ts`, `weather.ts`, `goals.ts`, `skills.ts`; mở rộng `seasons.ts`.
- `packages/game-core/src`: module mới `pricing.ts`, `reputation.ts`, `regulars.ts`, `weather.ts`, `goals.ts`, `skills.ts` (thuần, có test); `customers.ts` nhận hệ số giá/uy tín/khách quen; `simulation.ts` chỉ gọi các module (không thêm logic nội tuyến dài).
- `apps/web/src/components`: mở rộng `ShelfModal`/`CashierModal` (giá), `HUD` (uy tín/thời tiết), `QuestModal` (mục tiêu/tuần), modal mới `DaySummaryModal`, `RegularsModal`, `SkillsModal` tái dùng primitive trong `components/pixel`.
- Không thêm dependency. Nguồn tham khảo chỉ đọc. TASKS/ROADMAP/`tổng hợp.md` chỉ ghi là kế hoạch chưa triển khai.
