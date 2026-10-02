# Tasks: Gameplay expansion — implementation before verification

> Execution preference from owner: complete functionality across selected features first, then run the grouped tests/verification. Do not mark validation as passed until it is actually run. This plan is not a branch-chain implementation; that remains deferred to same-land-expansion design.

## 1. Contract and shared foundation

- [x] 1.1 Inventory existing overlaps: regulars, written reviews, aggregate stalls, maintenance, security, progression, suppliers/warehouse, basic staff.
- [x] 1.2 Record missing capabilities: recipe production, prestige, customer credit, counterfeit detection, dine-in/cleanup, analytics, checklist, ambient audio, replay, tax engine.
- [x] 1.3 Put multi-branch/shop-types/internal supply into a later plan gated on expanding/dividing the same land.
- [x] 1.4 Add behavior specs and shared design constraints for the selected capabilities.
- [x] 1.5 Define shared save migration, deterministic command IDs, multiplayer behavior and privacy/retention per feature before its implementation (credit save defaults to empty; sequential IDs; dine-in dirty table IDs/customer stages/staff routes persist; checkout/repayment/dine-in cleanup replay server-side).

## 2. Wave A — same-store service and transactions (high priority)

- [x] 2.1 Implement dine-in tables in the existing shop: seating, table states, order/serve, dirty/cleanup, player/staff jobs; preserve aggregate stalls. Uses stocked packaged food; tests and balance playtest remain in section 8.
- [x] 2.2 Implement regular-customer credit with bounded eligibility/limits, due dates, repayment, overdue/default states and subledger; repayment is not revenue again. Initial terms provisional; grouped verification/playtest remains in section 8.
- [x] 2.3 Implement deterministic counterfeit risk/detection at checkout for player and cashier, with stable retry result and coherent cash/ledger/customer feedback. The first code pass is in `counterfeit.ts` + `simulation.ts`; parameters are provisional and still need validation/playtest.
- [x] 2.4 Add UI/notifications/settings for Wave A and include commands in online path or explicitly gate unavailable online operations (checkout, table cleanup and staff cleanup use server replay).

## 3. Wave B — recipe production

- [x] 3.1 Add recipe/station data, unlocks and selected initial Vietnamese recipes/outputs.
- [x] 3.2 Implement deterministic production jobs/batches, atomic FEFO inputs, output lot/cost/expiry and staff capacity. (Staff capacity = ×1.5 speed when a refill staff is on shift; provisional.)
- [x] 3.3 Connect output to warehouse/shelves and optionally dine-in service; no branch/shop-type dependency. (Outputs are warehouse lots, sold via `SELLABLE_PRODUCTS` demand; bread/noodle outputs qualify for dine-in baskets. Not yet browser-verified.)
- [x] 3.4 Add production station setup and UI/work assignment.

## 4. Wave C — prestige progression

- [x] 4.1 Convert overflow XP after configured level cap into capped prestige stars, with bounded rewards and no normal-level reset. (5.000 XP/sao, tối đa 10 sao, +1%/sao lưu lượng khách; provisional.)
- [x] 4.2 Persist/migrate prestige and show it in HUD/progression UI without changing legacy progress. (HUD hiện sao và tiến độ; chưa có màn lộ trình riêng, chưa browser QA.)

## 5. Wave D — player tools

- [x] 5.1 Implement price/sales history chart from real retained history; never infer historical prices from current price.
- [x] 5.2 Implement per-tile aggregate heatmap and route/traffic overlay with bounded retention and no per-frame customer tracking in saves. (Heatmap là lưới HTML trong `AnalyticsModal`, chưa vẽ lên bản đồ Pixi; chưa có lớp route.)
- [x] 5.3 Implement optional tutorial checklist derived from actual game state/actions.
- [x] 5.4 Implement contextual ambient audio with mute, user-gesture/autoplay handling and hidden-tab behavior.
- [x] 5.5 Implement deterministic day replay from start snapshot + command/event stream + simulation version; no frame recording. (Chỉ lõi `replay.ts` + test; chưa có UI ghi/mở replay, tập lệnh hỗ trợ giới hạn 5 loại.)

## 6. Wave E — tax engine (gated)

- [ ] 6.1 Complete TAX-0: verify/approve official source, effective dates, taxpayer scope, revenue categories and policy.
- [ ] 6.2 Only after 6.1, calculate/version tax obligations with immutable period rule snapshots and ledger entries.
- [ ] 6.3 Do not assess/debit while rule is unverified or out of scope.

## 7. Deferred — multiple branches and shop types

- [ ] 7.1 Decide how multiple businesses/areas expand and divide the existing land, fixture ownership, shared/separate inventory and co-op authority.
- [ ] 7.2 After 7.1, author a separate OpenSpec change for branches, shop types and internal supply.

## 8. Grouped verification — do after functionality tasks

- [x] 8.1 Add unit/integration tests for Wave A transactions, save migration, deterministic retry, ledger reconciliation and day-boundary cases. (`wave-a.test.ts`: tín dụng/thu nợ/quá hạn/nợ xấu/save-reload, tiền giả xác định + tỷ lệ + sổ cái, dine-in sức chứa/bàn bẩn/dọn/nhân viên/save-reload. Chưa có test riêng cho nâng cấp save cũ thiếu trường mới ngoài sanitize hiện có.)
- [x] 8.2 Add tests for production FEFO atomicity, recipe unlocks, output lot/cost/expiry, staff handoff and save/reload.
- [x] 8.3 Add tests for prestige thresholds/caps/migration and analytics/tutorial/audio/replay behavior.
- [x] 8.4 Run grouped typecheck, all core tests, web/server suites and production builds; fix failures. (02/10/2026 chạy lại sau khi thêm test: `tsc -b` PASS, core test-runner PASS, server test:unit + build PASS, web test + Vite build PASS.)
- [ ] 8.5 Run multi-day economy simulations/playtests for credit, counterfeit, production and prestige; tune balance only from recorded results. (02/10/2026 chạy một phần, KHÔNG chỉnh cân bằng: xem `tổng hợp.md`. Có số liệu cho tiền giả và prestige; sản xuất mới tính biên lãi gộp, chưa mô phỏng giới hạn theo nhu cầu; tín dụng mới tính phơi nhiễm tối đa, chưa mô phỏng hành vi trả/nợ xấu nhiều ngày.)
- [ ] 8.6 Run browser QA for dine-in, production UI, charts/heatmap/tutorial/audio and progression; document unverified gates. (02/10/2026 đã kiểm một phần: production, dine-in, prestige, analytics, checklist, mute; tín dụng và tiền giả đã kiểm logic trong app 02/10/2026; còn bấm nút thu ngân/Ăn tại bàn, thu ngân nhân viên và sprite thế giới — xem `tổng hợp.md`.)
- [ ] 8.7 TAX tests only after TAX-0; verify no unverified rule can debit funds.
- [x] 8.8 Update `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`, `THONG-KE.md` and this tasks file from actual implementation/verification results. (02/10/2026; cập nhật lại khi 8.5–8.7 đổi.)
