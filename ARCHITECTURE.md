# KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)
## Tiệm Tạp Hóa Đầu Hẻm - Monorepo Structure & Tech Stack

```
SIEU-THI-DATNT/
├── apps/
│   ├── web/                    # Client Application (React 18 + Vite + Tailwind CSS + PixiJS v8)
│   └── server/                 # Cloud API (NestJS + TypeScript + Mongoose + Firebase Admin)
├── packages/
│   ├── game-core/              # ECS engine, physics/collision, game loop, state transitions
│   ├── game-renderer/          # PixiJS v8 viewport, pixel camera, sprite batching, map rendering
│   ├── game-ui/                # Shared React UI components (HUD, dialogs, inventory, modals)
│   ├── game-data/              # Product catalogs, map definitions, initial layouts, quests
│   └── shared/                 # Shared types, DTOs, schemas, constants, save format interfaces
├── assets/
│   ├── sprites/                # 32x32 pixel sprites, tilesets, icons
│   ├── maps/                   # Tiled JSON compatible maps
│   └── audio/                  # Retro cozy ambient & sound effects
└── docs/                       # Technical & design documentation
```

---

## 1. PHÂN CHIA TRÁCH NHIỆM (SEPARATION OF CONCERNS)

### 1.1 Web App (`apps/web`)
- Khởi tạo Canvas PixiJS v8 với cấu hình pixel-perfect:
  - `roundPixels: true`
  - `resolution: window.devicePixelRatio || 1`
  - Texture Scale Mode: `nearest`
- Tích hợp lớp phủ React UI nằm trên Canvas thông qua absolute positioning.
- Quản lý trạng thái UI bằng **Zustand** (`useGameStore`, `useInventoryStore`, `useSaveStore`).
- Điều khiển cảm ứng đa điểm trên mobile: Virtual Joystick + Touch Buttons.
- Lớp lưu trữ cục bộ: **Dexie (IndexedDB)** hoạt động offline 100%.

### 1.2 Game Core (`packages/game-core`)
- Thực thi vòng lặp mô phỏng với bước thời gian cố định (**Fixed Timestep 60Hz**).
- Hệ thống thực thể - thành phần (ECS Pattern):
  - **Entities**: Player, Shelves, CashierCounter, NPCs.
  - **Components**: Position, Velocity, Collider, SpriteView, Interactable, InventoryHolder, Stockable.
  - **Systems**: MovementSystem, CollisionSystem, InteractionSystem, TimeSystem, RestockSystem.
- Đảm bảo logic mô phỏng hoàn toàn độc lập với hệ thống vẽ (Renderer agnostic).

### 1.3 Game Renderer (`packages/game-renderer`)
- Wrapper quanh PixiJS v8 `Application`, `Container`, `Sprite`, `Graphics`.
- **PixelCamera**: Bám theo vị trí người chơi với nội suy mượt (lerp), zoom theo bậc nguyên (1x, 2x, 3x) tránh vỡ hạt pixel.
- **TiledMapRenderer**: Đọc định dạng bản đồ tương thích Tiled JSON, vẽ các lớp:
  - `ground`: Nền gạch bông, vỉa hè, lòng đường.
  - `walls`: Tường vôi vàng, cửa sổ chấn song gỗ, cửa ra vào.
  - `decorations_bg`: Biển hiệu, tranh lịch treo tường, đồng hồ quả lắc.
  - `entities`: Kệ hàng, bàn thu ngân, người chơi, NPC (được sắp xếp theo trục Y - Y-sorting).
  - `decorations_fg`: Mái hiên tôn, tán cây che nắng.

### 1.4 Game Data (`packages/game-data`)
- Chứa toàn bộ dữ liệu cấu hình tĩnh:
  - Danh mục hàng hóa (ID, tên tiếng Việt, giá nhập, giá bán, sức chứa, sprite id).
  - Định nghĩa bản đồ khởi đầu 8x8 kèm vùng vỉa hè xung quanh.
  - Cấu hình mốc thời gian: 1 phút đời thực = 1 giờ trong game.

### 1.5 Shared (`packages/shared`)
- Định nghĩa kiểu dữ liệu đồng bộ giữa Frontend và Backend:
  - `SaveGameSchemaV1`: Dữ liệu lưu game chuẩn, có versioning và revision timestamp.
  - `ProductDto`, `InventorySlotDto`, `StoreLayoutDto`.
  - Kết quả xác thực Firebase token và API responses.

---

## 2. DỮ LIỆU & QUY TRÌNH LƯU TRỮ (SAVE SYSTEM FLOW)

```
[Game Loop State] ──(Autosave / Manual Save)──> [IndexedDB (Dexie)]
                                                        │
                                        (Khi có mạng & đăng nhập)
                                                        │
                                                        ▼
                                            [REST API PUT /save]
                                                        │
                                            [NestJS + Firebase Guard]
                                                        │
                                                        ▼
                                                [MongoDB Atlas]
```

1. Game luôn khởi động và tải trạng thái từ IndexedDB trước tiên (Zero cloud dependency để bắt đầu chơi).
2. Nếu chưa có save game, tạo save game mới với bố cục mặc định:
   - Cửa hàng 8x8
   - Tiền vốn khởi đầu: 150,000 đ
   - 2 kệ hàng gỗ
   - 1 bàn thu ngân
   - Túi đồ có sẵn các gói hàng mẫu để bày thử.
3. Khi người chơi đăng nhập Google qua Firebase Auth:
   - Đồng bộ save local lên Cloud MongoDB.
   - So sánh `revision` và `updatedAt` để phát hiện xung đột, đảm bảo không ghi đè dữ liệu mới hơn.

## 3. TRẠNG THÁI MÃ NGUỒN ĐÃ KIỂM TRA

- Frontend hiện chạy được ở chế độ offline. Core dùng các lớp mô phỏng và cấu trúc dữ liệu riêng; ECS bằng bitecs chưa được triển khai.
- Bản đồ đang sinh bằng TypeScript; bộ nạp Tiled JSON chưa có.
- `apps/server` hiện là hợp đồng API dạng lớp TypeScript, chưa khởi chạy NestJS, chưa có Firebase Admin hoặc MongoDB.
- Dexie là nơi lưu thực tế. Bản lưu version 2 gồm tiền, giờ, kho, kệ, lô hàng/hạn dùng, thống kê, đơn nhà phân phối và NPC hiện hành. Mỗi lần ghi tăng revision một lần và từ chối revision cũ. Bản lưu version 1 được chuyển trong bộ mô phỏng khi tải, không xóa IndexedDB.
- Đặt hàng trừ tiền ngay, giao vào kho sáng hôm sau. Hàng quá hạn bị loại khi qua ngày. Hàng lạnh chỉ được đưa vào tủ mát; kho lạnh có giới hạn và giữ chỗ cho đơn chờ.
- Bán hàng thủ công hoặc NPC tới quầy đều dùng tồn kệ thật và cùng luồng cập nhật tiền/XP/doanh thu. NPC hiện chỉ có một khách tại một thời điểm và tự thanh toán; hàng đợi nhiều khách và thao tác thu ngân còn thiếu.
- Cloud sync, Firebase Auth, NestJS thực thi, MongoDB, PWA và ECS đầy đủ còn trong roadmap. Không nên coi sơ đồ kiến trúc ở trên là tính năng đã hoàn thành.
