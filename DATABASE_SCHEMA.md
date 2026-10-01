# LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

Tài liệu này xác định mô hình dữ liệu đồng bộ giữa **Dexie (IndexedDB)** ở máy trạm và **MongoDB Atlas** ở máy chủ đám mây.

---

## 1. PHIÊN BẢN LƯỢC ĐỒ (SCHEMA VERSION)
- Save hiện tại trong code: `CURRENT_SAVE_SCHEMA_VERSION = 3`.
- Schema 2 được migrate an toàn khi tải local: backup record cũ trong transaction IndexedDB, thêm `storedFixtures: []` và `unlockedPlotIds: []`, rồi lưu schema 3. Lỗi parse/migrate không được ghi đè save cũ.
- Các mô tả bên dưới có phần hợp đồng thiết kế cũ; phần “Trạng thái mã nguồn” và OpenSpec `store-layout-expansion` mô tả triển khai hiện tại.

---

## 2. DỮ LIỆU LƯU TRỮ TRÒ CHƠI (`SaveGameData`)

```typescript
export interface SaveGameData {
  id: string; // "local_save_default" hoặc MongoDB ObjectId
  userId?: string; // Firebase UID nếu đã đăng nhập
  schemaVersion: number; // hiện tại 3; schema 2 migrate
  revision: number; // Tăng dần mỗi lần ghi để tránh xung đột
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // Thông tin chủ tiệm
  player: {
    name: string;
    level: number;
    experience: number;
    money: number; // Đơn vị: Đồng (VND - số nguyên nguyên thủy)
    reputation: number; // Điểm uy tín tiệm
    position: {
      x: number;
      y: number;
      direction: 'up' | 'down' | 'left' | 'right';
    };
  };

  // Đồng hồ & Lịch trình
  worldTime: {
    day: number;
    hour: number; // 6 -> 22
    minute: number; // 0 -> 59
    isStoreOpen: boolean;
  };

  // Bố cục tiệm & Đồ đạc tương tác
  storeLayout: {
    widthTiles: number;
    heightTiles: number;
    unlockedPlotIds?: string[]; // plot data-driven đã mua
    storedFixtures?: StoreFixture[]; // nội thất cất giữ, giữ ID và hàng gắn trên fixture
    fixtures: Array<{
      id: string;
      type: FixtureType;
      tileX: number;
      tileY: number;
      widthTiles: number;
      heightTiles: number;
      rotation: 0 | 90 | 180 | 270;
      assignedProductId?: string;
      currentStock: number;
      maxCapacity: number;
    }>;
  };

  // Kho hàng & Túi đồ
  inventory: Array<{
    productId: string;
    quantity: number;
    storageType: 'ambient' | 'cold';
  }>;

  // Nhiệm vụ & Thành tựu
  questProgress: {
    completedQuestIds: string[];
    activeQuests: Array<{
      id: string;
      currentCount: number;
      targetCount: number;
    }>;
  };

  // Thống kê kinh doanh
  statistics: {
    totalRevenue: number;
    totalCustomersServed: number;
    totalDaysPassed: number;
  };
}
```

---

## 3. CƠ CHẾ ĐỒNG BỘ CLOUD (SYNC & CONFLICT RESOLUTION)
- **Local first**: Mọi hoạt động chơi game và lưu tức thời diễn ra trên Dexie IndexedDB.
- **Optimistic Concurrency**:
  - Khi thiết bị gửi yêu cầu `PUT /api/v1/game/save`, kèm theo `revision`.
  - Backend so sánh `revision_client` với `revision_server`.
  - Nếu `revision_client < revision_server`, trả về mã lỗi `409 Conflict` kèm bản dữ liệu mới nhất từ server để người chơi quyết định (Giữ bản mới nhất theo `updatedAt`).

## 4. TRẠNG THÁI IMPLEMENTATION SCHEMA 3

- Shared contract thật ở `packages/shared/src/index.ts`; `schemaVersion` hiện là 3. Phần pseudo-interface ở mục 2 chỉ là tóm tắt, không phải định nghĩa đầy đủ.
- Bố cục dùng `StoreFixture.tileX/tileY/widthTiles/heightTiles/rotation`; plot ownership là IDs data-driven, không nhận geometry tùy ý từ client. `storedFixtures` giữ nguyên fixture ID và dữ liệu hàng.
- Bản local schema 2 được backup trong transaction IndexedDB rồi migrate. Online layout dùng `layout_batch`; server tái áp dụng action lên save hiện tại, validate người gửi là thành viên của hẻm (cả chủ và thành viên đều được sửa bố cục/mua đất), điều kiện cửa hàng, geometry/path và tiền trước commit revision/idempotency.
- Hai plot phía đông hiện có giá 250.000/600.000 VND, level 5/10; đây là giá trị đề xuất chưa qua playtest. Tính năng vừa được code nhưng chưa chạy typecheck/test/build/browser QA theo yêu cầu gom kiểm chứng sau.
