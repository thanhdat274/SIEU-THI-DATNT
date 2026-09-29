# LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

Tài liệu này xác định mô hình dữ liệu đồng bộ giữa **Dexie (IndexedDB)** ở máy trạm và **MongoDB Atlas** ở máy chủ đám mây.

---

## 1. PHIÊN BẢN LƯỢC ĐỒ (SCHEMA VERSION)
- Hiện tại: `v1.0.0`
- Cơ chế chuyển đổi (Migration): Bất kỳ nâng cấp cấu trúc nào đều tăng số version và có hàm chuyển đổi tự động trước khi tải dữ liệu.

---

## 2. DỮ LIỆU LƯU TRỮ TRÒ CHƠI (`SaveGameData`)

```typescript
export interface SaveGameData {
  id: string; // "local_save_default" hoặc MongoDB ObjectId
  userId?: string; // Firebase UID nếu đã đăng nhập
  schemaVersion: number; // 1
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
    tilesWidth: number;
    tilesHeight: number;
    unlockedExpansions: string[];
    fixtures: Array<{
      id: string;
      type: 'shelf_wooden' | 'shelf_glass' | 'cashier_counter' | 'refrigerator';
      x: number; // Toạ độ ô lưới tile (X)
      y: number; // Toạ độ ô lưới tile (Y)
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
