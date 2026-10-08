# UI Redesign — Phase 0/1: Audit & UI Inventory (2026-10-07)

Nguồn: đọc `apps/web/src` (App.tsx 2362 dòng, 47 component, `index.css`, `responsive.css`, `LoginScreen.css`, `store-layout.css`, `store-planogram.css`). Chưa sửa code.

## A. Hiện trạng hệ thống UI (không phải làm mới từ số 0)
- Phong cách: **pixel-art gỗ/giấy** (`--wood-dark #593A2B`, `--paper #FFF2D6`, `--teal #357F72`, `--brick #B64C3D`, `--sun #E9B95D`, `--ink #33251D`). Font `Be Vietnam Pro`.
- Primitives dùng chung (`components/pixel/index.tsx`): `PixelButton` (paper/teal/brick/wood), `PixelPanel`, `PixelStat`, `PixelProgress`, `PixelDialog` (shell modal), `QuantityStepper`, `EmptyState`, `ProductIcon/Slot`, `PixelIcon`.
- Hạ tầng responsive **đã có** (`responsive.css` + `responsive.ts`): token `--touch` (36/44px), `--safe-t/r/b/l`, `--space-1..3`, `--fs-*`, `--joy`, `--dialog-w/h`, `--kb-h`, `--vb-h`; `html[data-input=touch|mouse]`, `html[data-density=compact|comfortable]`; container query cho HUD/footer. 31 `@media`. Quy ước: không hack theo thiết bị.
- Tailwind 4 chỉ khai báo `@theme` retro-*, UI thực tế dùng CSS thuần.
- Ràng buộc đã có (memory `mobile-game-ui-standard`): cấm framework responsive thứ hai; QA matrix 568×320 … 932×430; chỉ ghi PASS khi đã test trình duyệt thật.

## B. Vấn đề cấu trúc cần xử lý ở root cause
1. Token màu/spacing nằm rải ở `index.css` + `responsive.css`; chưa có tên ngữ nghĩa (surface/primary/...) → cần map token.
2. Modal có ~25 màn, mỗi màn tự bố cục trong `PixelDialog`; chưa có quy tắc "desktop panel → tablet → mobile sheet/list→detail" thống nhất.
3. Breakpoint hiện chia theo `max-height:499px`, `max-width:639px`, `orientation` — đã gần đúng với "landscape phone" nhưng chưa có tên/khái niệm chung (Compact-Landscape / Phone-Portrait / Tablet / Desktop).
4. Màn lớn nhất: SupplierModal (930), StoreLayoutModal (1155), StorePlanogramModal (638), QuestModal (461), CashierModal (414), LoginScreen (1227 + 2042 dòng CSS).

## C. UI Inventory

### A. Ngoài game / xác thực
| # | UI | File | Trạng thái |
|---|---|---|---|
| A1 | Login / Register / Reset / Guest-local | `LoginScreen.tsx/.css` | loading, error, success, verify, invite |
| A2 | Loading / đồng bộ | `App.tsx` (isLoading) | loading |
| A3 | Account bar (tên, online/local/owner, Home, Invite, Logout) | `AccountBar.tsx` | online/local/owner badge |
| A4 | Update banner + Update conflict dialog | `UpdateBanner`, `UpdateConflictDialog` | conflict choose |
| A5 | Rotate overlay (xoay màn) | `RotateOverlay` | portrait nhắc xoay |
| A6 | Save / Cloud / Import / Export / Reset | `SaveModal` | cloud state, confirm reset |

### B. Main HUD
| B1 | HUD (tiền, level/XP, ngày-giờ, mùa, thời tiết, sự kiện, khách, rating, tốc độ, mở/đóng tiệm, nút tắt tới các modal) | `HUD.tsx` |
| B2 | Management menu (gom nút phụ) | `ManagementModal.tsx` |
| B3 | Bottom bar / footer (Nhập hàng, Thu ngân, Gian hàng) | `BottomBar.tsx` |
| B4 | Virtual joystick + nút tương tác | `VirtualJoystick.tsx` |
| B5 | Toast | `ToastContainer.tsx` |
| B6 | Tutorial checklist | `TutorialChecklist.tsx` |
| B7 | Inventory summary card (hover/info) | `InventorySummaryCard.tsx` |
| B8 | Interaction prompt (canvas) | renderer |
| B9 | Weather debug panel (dev) | `WeatherDebugPanel.tsx` |

### C. Quản lý cửa hàng
| C1 | Shelf modal | `ShelfModal` |
| C2 | Warehouse modal + Warehouse dock | `WarehouseModal`, `WarehouseDock` |
| C3 | Supplier (nhà cung cấp → sản phẩm → số lượng → giỏ → xác nhận → giao) | `SupplierModal`, `supplier-cart.ts` |
| C4 | Store Layout editor (canvas) | `StoreLayoutModal`, `store-layout.css` |
| C5 | Planogram (xếp hàng lên kệ) | `StorePlanogramModal` |
| C6 | Prices (chỉnh giá tập trung) | `PricesModal` |
| C7 | Maintenance | `MaintenanceModal` |
| C8 | Security | `SecurityModal` |
| C9 | Kitchen station / Dining table | `KitchenStationModal`, `DiningTableModal` |
| C10 | Stall (gian hàng) | `StallModal` |
| C11 | Chain (chi nhánh) | `ChainModal` |

### D. Nhân viên / Khách / Bán hàng
| D1 | Staff | `StaffModal` (+ tab nhân viên trong `CashierModal`: tuyển, ca, giao việc refill, nợ lương) |
| D2 | Cashier / Checkout / Queue / Credit (mua chịu) | `CashierModal` |
| D3 | Regulars (khách quen) | `RegularsModal` |
| D4 | Reviews / rating | `ReviewsModal` |

### E. Kho hàng & Tồn
| E1 | Inventory modal + summary | `InventoryModal`, `InventorySummaryCard` |
| E2 | Warehouse (số lượng kho/kệ, hạn dùng, mở thùng, huỷ) | `WarehouseModal` |

### F. Tài chính
| F1 | Day summary | `DaySummaryModal` |
| F2 | Tax | `TaxModal` |
| F3 | Analytics (doanh thu, giá lịch sử, heatmap) | `AnalyticsModal` |
| F4 | Market (giá thị trường, xu hướng, kế hoạch) | `MarketModal` |

### G. Tiến triển
| G1 | Quest (+daily/festival) | `QuestModal` |
| G2 | Level roadmap | `LevelRoadmapModal` |
| G3 | Skills / perks | `SkillsModal` |
| G4 | Titles / achievements | `TitlesModal` |

### H. Thế giới
| H1 | Thời tiết/mùa/sự kiện (HUD badge, MarketModal forecast, FX canvas, `useWeatherFx`) |
| H2 | City (khai hoang, mua ô đất) | `CityModal` |

### I. Multiplayer
| I1 | Time vote (ngủ/qua ngày) | `TimeVoteModal` |
| I2 | Coop sleep notification | `CoopSleepNotification` |
| I3 | Voice panel | `VoicePanel` |
| I4 | Invite / online account state | `AccountBar`, `LoginScreen` |

### Không có trong code (yêu cầu của brief nhưng chưa tồn tại)
Settings tập trung (Graphics/Audio/Controls/Accessibility/Language) — hiện chỉ có nút mute + `data-density` + `control-mode`; Server selection; Profile; Delivery tracking riêng; Weather quality settings (chỉ có debug panel). Các màn này sẽ được **thiết kế đề xuất trong Figma, đánh dấu "NEW – chưa có code"**; implement chỉ khi chủ dự án xác nhận vì đụng phạm vi gameplay/settings.

## D. Mô hình layout đề xuất (để Figma và code dùng cùng)
| Lớp | Điều kiện (khớp hạ tầng sẵn có) | Mẫu |
|---|---|---|
| Desktop | width ≥ 1024 & height ≥ 500 | panel đa cột, sidebar + content + detail |
| Tablet | 640–1023 width, portrait/landscape | sidebar thu gọn, 2 cột, bảng compact |
| Phone Portrait | width < 640 portrait | list → full-screen detail / bottom sheet, 1 cột |
| Phone Landscape | height < 500 (`data-density=compact`) | canvas-first, drawer cạnh phải/trái, 2 cột gọn |

## E. Quy tắc nghiệp vụ UI cần thể hiện
- Supplier tồn 1 → gợi ý/stepper **max = tồn**, không thể chọn 2 (đã có `supplier-cart.ts`; Figma phải có trạng thái Insufficient/Max).
