# Tasks

Trạng thái 05/10/2026: nhóm 1–2 và 3.1 đã có code và PASS; 3.2 đã xem desktop trong Browser pane (chưa mobile); 3.3 còn mở.

## 1. Dữ liệu và lõi
- [x] 1.1 `StallDefinition.sellUntilHour`, quầy `ve_so`, hệ số mùa (`game-data/stalls.ts`, `seasons.ts`).
- [x] 1.2 `sellStalls` theo khung quầy; `getSoldOutStalls`, `onStallStatusChanged` (`simulation.ts`).
- [x] 1.3 Test `stalls.test.ts` (không nguyên liệu, cửa sổ bán, hồi quy quầy cũ, hình học, hết vé).

## 2. Giao diện và hình ảnh
- [x] 2.1 `StallModal`: ẩn nguyên liệu, chữ "vé", giờ bán.
- [x] 2.2 Sprite `stall_ve_so`, `stall_sold_out_sign`, biển HẾT trong `viewport.ts`, nối `App.tsx`.

## 3. Kiểm chứng
- [x] 3.1 `yarn typecheck`, `yarn test`, `yarn build`.
- [x] 3.2 Browser QA desktop: sprite, vị trí x=20, biển HẾT 17:05, hộp thoại quầy. **Chưa**: mobile, co-op hai trình duyệt.
- [x] 3.3a Cập nhật `tổng hợp.md`.
- [ ] 3.3b Cân bằng kinh tế (hoàn vốn ~3–5 ngày là ước tính, thêm `ve_so` vào `balance-audit.ts`), playtest.
