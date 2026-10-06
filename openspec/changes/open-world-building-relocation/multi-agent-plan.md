# Multi-Agent Plan: Bước 3 — Lát C và QA Bước 2

> Ngày tạo: 06/10/2026
> Trạng thái: ĐÃ LÀM (lát C + QA Bước 2, 06/10/2026). Còn nhìn bằng mắt trong trình duyệt: ánh sáng đêm phần mở rộng, heatmap, mobile thật, co-op hai trình duyệt.

---

## Tổng quan công việc còn lại

### Bước 2 (open-world-main-expansion) — 4 việc nhỏ

| ID | Việc | Phạm vi | Thời lượng ước |
|----|------|---------|----------------|
| B2-1 | Mobile: tab "📐 Mở rộng" chạm để bật/tắt ô | `StoreLayoutModal.tsx`, `footprint.ts` | 2h |
| B2-2 | Co-op hai trình duyệt: `expand_footprint` qua layout_batch | `coop-commands.test.ts`, `world-runtime.ts` | 2h |
| B2-3 | QA ánh sáng đêm phần mở rộng (nhìn bằng mắt) | Browser desktop | 30min |
| B2-4 | QA heatmap mở khung theo ô (nhìn bằng mắt) | Browser desktop | 30min |

### Bước 3 Lát C (open-world-building-relocation) — 8 việc chính

| ID | Việc | Phạm vi | Thời lượng ước | Phụ thuộc |
|----|------|---------|----------------|-----------|
| L3-C1 | **D7: `expandFootprint` nhận `buildingId` bất kỳ** (tòa phụ) | `store-layout.ts`, `simulation.ts` | 3h | — |
| L3-C2 | **D7: Migration `*-north-*` → `floorTiles`** | `shared/src/index.ts` (validation), `persistence.test.ts`, `world-migrations.ts` | 3h | L3-C1 |
| L3-C3 | **D7: Ngân sách chung** — một quỹ cho tất cả tòa | `store-layout.ts`, `progression.ts` (hằng mới), UI | 4h | L3-C1 |
| L3-C4 | **D7b: Mở rộng sang lô kề trống** | `checkFootprintTiles`, `parcels.ts`, `store-layout.ts` | 4h | L3-C3 |
| L3-C5 | **2.4: Không sinh khách cho tòa thi công** + test | `customers.ts`, test mới | 2h | — |
| L3-C6 | **2.4: Nhân viên gán ở tòa thi công** — đứng chờ ở kho | `staff.ts`, test | 2h | L3-C5 |
| L3-C7 | **3.1 + 2.5: Rà soát tra tĩnh theo vị trí mặc định** còn sót | grep `BUILDINGS`/`BUILDING_MAP`, `AnalyticsModal`, `balance sim`, `neighborhood.ts` | 4h | — |
| L3-C8 | **QA: mở lại sáng hôm sau, dời quán nước có hàng, mobile, co-op** | Browser + test co-op | 4h | L3-C1..C6 |

---

## Chiến lược chia agent

### Agent 1: "Core Expansion" — Lát C lõi (L3-C1, L3-C2, L3-C3)

**Nhiệm vụ:** Mở `expandFootprint` cho mọi tòa, migration mảnh bắc, ngân sách chung.

**File cần sửa:**
1. `packages/game-core/src/store-layout.ts`:
   - `expandFootprint`: bỏ `buildingId !== 'main'` guard → nhận `buildingId` bất kỳ
   - `expansionBudget`: nhận `buildingId`, tính ngân sách chung
   - `expansionTilesUsed`: tính cho tòa bất kỳ (coreBounds + floorTiles)
   
2. `packages/game-data/src/world/footprint.ts`:
   - `expansionBudgetAtLevel`: nhận `buildingId`, trả ngân sách chung (không theo từng tòa)
   
3. `packages/shared/src/index.ts`:
   - Validation schema 6: thêm `constructionUntilDay`, chuyển `*-north-*` → `floorTiles`

4. `packages/game-core/src/simulation.ts`:
   - `expandMainFootprint` → `expandFootprint` (nhận buildingId)

5. `packages/game-core/src/persistence.test.ts`:
   - Test migration schema 5→6: `*-north-*` → `floorTiles`

**Golden rule:** Golden test cũ vẫn PASS với save mặc định (vị trí không đổi).

---

### Agent 2: "D7b Expansion" — Mở rộng sang lô kề (L3-C4)

**Nhiệm vụ:** Cho phép `expandFootprint` vào lô trống kề bên.

**File cần sửa:**
1. `packages/game-data/src/world/footprint.ts`:
   - `checkFootprintTiles`: thêm tham số `adjacentParcelIds?` (danh sách lô kề trống)
   - `mainBlockedRects` → `buildingBlockedRects`: trả blocked của tòa khác + lô có tòa khác
   
2. `packages/game-data/src/world/parcels.ts`:
   - `adjacentParcels(parcelId)`: tìm các lô kề nhau
   
3. `packages/game-core/src/store-layout.ts`:
   - `expandFootprint`: tính lô kề trống, truyền vào `checkFootprintTiles`
   - Khi hợp lệ: thêm `parcelId` mới vào `placement.parcelIds` (hoặc tạo `parcelId` mới nếu một tòa một lô)

**Luật:** Lô kề phải trống (không có tòa nào), hàng rào y=10 nhường mặt tiền.

---

### Agent 3: "Construction Logic" — Khách & Nhân viên khi thi công (L3-C5, L3-C6)

**Nhiệm vụ:** Tòa đang thi công không sinh khách, nhân viên gán ở đó đứng chờ ở kho.

**File cần sửa:**
1. `packages/game-core/src/customers.ts`:
   - `spawnCustomers`: kiểm tra `building.constructionUntilDay` → skip spawn
   - Test: ngày thi công = 0 khách, hôm sau có khách

2. `packages/game-core/src/staff.ts`:
   - `assignRestockJobs` / `updateStaffWorkers`: nếu `assignedFixtureId` thuộc tòa đang thi công → đặt `assignedFixtureId = undefined`, di chuyển đến kho
   - Test: nhân viên gán ở tòa thi công đứng chờ ở kho

---

### Agent 4: "Static Reference Audit" — Rà soát tra tĩnh (L3-C7)

**Nhiệm vụ:** Tìm và sửa mọi chỗ còn tra tọa độ theo vị trí mặc định (BUILDINGS/BUILDING_MAP) khi cần đọc theo vị trí đặt.

**Quy trình grep:**
```bash
# Tìm BUILDINGS.xxx hoặc BUILDING_MAP.xxx trong packages/
grep -r "BUILDINGS\." packages/ --include="*.ts" | grep -v test | grep -v "BUILDINGS\[\"main\"\]"
grep -r "BUILDING_MAP\." packages/ --include="*.ts" | grep -v test
```

**File dự kiến cần sửa:**
1. `packages/game-core/src/analytics.ts` (AnalyticsModal heatmap)
2. `packages/game-core/src/balance-audit.ts` (balance sim)
3. `packages/game-core/src/neighborhood-chat.ts` (SHOP_FRONT/SHOP_AWNING_PX)
4. `packages/game-core/src/stalls.ts` (quầy vỉa hè)
5. Các file test còn dùng `BUILDINGS.xxx`

---

### Agent 5: "QA & Mobile" — Bước 2 QA + Bước 3 QA (B2-1, B2-2, B2-3, B2-4, L3-C8)

**Nhiệm vụ:** Mobile touch, co-op test, browser QA.

**File cần sửa:**
1. `apps/web/src/components/StoreLayoutModal.tsx`:
   - Mobile: chạm để toggle ô thay vì click-drag
   
2. `apps/server/src/coop-commands.test.ts`:
   - Test co-op: `relocate_building` qua layout_batch
   - Test co-op: `expand_footprint` qua layout_batch

3. Browser QA (thủ công):
   - Bước 2: mở đêm → xem đèn trần phần mở rộng
   - Bước 2: mở heatmap → xem khung theo ô
   - Bước 3: mua tòa → dời → qua đêm → mở lại sáng hôm sau
   - Bước 3: dời quán nước có hàng trên kệ

---

## Thứ tự thực hiện (dependency graph)

```
Agent 1 (L3-C1, C2, C3) ──┐
                           ├──→ Agent 2 (L3-C4) ──┐
                                                   ├──→ Agent 5 (QA cuối)
Agent 3 (L3-C5, C6) ──────────────────────────────┘
Agent 4 (L3-C7) ──────────────────────────────────┘
Agent 5 (B2-1, B2-2, B2-3, B2-4) ──→ song song với Agent 1
```

**Giai đoạn 1 (song song):** Agent 1 + Agent 5 (B2) chạy song song.
**Giai đoạn 2:** Agent 2 + Agent 3 + Agent 4 chạy song song (sau Agent 1).
**Giai đoạn 3:** Agent 5 (L3-C8 QA cuối) chạy sau cùng.

---

## Hướng dẫn cho từng Agent

### Agent 1: Core Expansion

**Bước 1:** Sửa `expandFootprint` trong `store-layout.ts`:
```typescript
// TỪ:
if (buildingId !== 'main' || ...) return { error: 'invalid_tiles' };

// ĐẾN:
if (!['main', 'xoi', 'drink', 'snack'].includes(buildingId) || ...) return { error: 'invalid_tiles' };
```

**Bước 2:** Tạo `expansionBudgetForBuilding(save, buildingId)`:
- Với `main`: dùng `expansionBudget(save)` hiện tại
- Với tòa phụ: `expansionTilesUsed(coreBounds, owned, floorTiles)` cho tất cả tòa phụ cộng lại
- Ngân sách chung = `expansionBudgetAtLevel(level)` trừ tổng đã dùng

**Bước 3:** Migration `*-north-*` → `floorTiles`:
- Trong `resolvePlacements`, khi nạp save có `unlockedPlotIds` chứa `xoi-north-a`:
  - Thêm 3 hàng × chiều rộng sàn vào `floorTiles` của placement tương ứng
  - Giữ trong `unlockedPlotIds` để `relocationFee` tính phí dời đúng

**Bước 4:** Test trong `persistence.test.ts`:
- Save schema 4 có `east-wing-a` → schema 5 (đã có test)
- Save schema 5 có `xoi-north-a` → schema 6: `floorTiles` gồm core + north

### Agent 2: D7b Expansion

**Bước 1:** Thêm `adjacentParcels` trong `parcels.ts`:
```typescript
export function adjacentParcels(parcelId: string): string[] {
  const parcel = LAND_PARCELS.find(p => p.id === parcelId);
  if (!parcel) return [];
  // Tìm các lô kề nhau (chạm cạnh, không chỉ góc)
  return LAND_PARCELS
    .filter(p => p.id !== parcelId && rectsShareEdge(parcel.rect, p.rect))
    .map(p => p.id);
}
```

**Bước 2:** Sửa `checkFootprintTiles`:
- Thêm tham số `freeParcelIds?: string[]` (các lô trống được phép lấn)
- Khi kiểm `outside_parcel`: cho phép nằm trong `freeParcelIds`
- Khi kiểm `blocked_by_building`: kiểm trên tất cả lô (kể cả lân cận)

**Bước 3:** Sửa `expandFootprint`:
- Tính `freeParcelIds` = lô kề của `parcelId` tòa ∧ không có tòa khác
- Truyền vào `checkFootprintTiles`
- Nếu hợp lệ: thêm `parcelId` mới vào `placement.parcelIds`

### Agent 3: Construction Logic

**Bước 1:** `customers.ts` — kiểm tòa thi công:
```typescript
// Trong spawnCustomers, trước khi tạo khách:
const building = buildings?.find(b => b.id === shopId);
if (building?.constructionUntilDay && day < building.constructionUntilDay) return;
```

**Bước 2:** `staff.ts` — nhân viên tòa thi công:
```typescript
// Khi gán job:
const building = buildings?.find(b => b.id === fixture.shopId);
if (building?.constructionUntilDay && day < building.constructionUntilDay) {
  // Đưa về kho
  worker.assignedFixtureId = undefined;
  worker.targetTile = WAREHOUSE_ENTRANCE;
}
```

### Agent 4: Static Reference Audit

**Quy trình:**
1. Chạy grep tìm `BUILDINGS\.`, `BUILDING_MAP\.` trong source (không test)
2. Với mỗi kết quả:
   - Kiểm tra: chỗ này có cần đọc theo vị trí đặt không?
   - Nếu có: đổi thành đọc từ `GameTileMap.buildings`
   - Nếu không (vị trí mặc định cố định): giữ nguyên, ghi chú
3. Đặc biệt chú ý: `AnalyticsModal`, `balance-audit.ts`, `neighborhood-chat.ts`

### Agent 5: QA & Mobile

**Bước 1 (B2-1):** Mobile touch trong `StoreLayoutModal.tsx`:
- Thêm `onTouchStart`/`onTouchEnd` để toggle ô
- Không bắt buộc kéo (drag)

**Bước 2 (B2-2):** Co-op test:
```typescript
// Trong coop-commands.test.ts:
test('expand_footprint qua layout_batch', async () => {
  // World A gửi expand_footprint, World B nhận qua replay
});
test('relocate_building qua layout_batch', async () => {
  // World A gửi relocate_building, World B nhận qua replay
});
```

**Bước 3 (B2-3, B2-4, L3-C8):** Browser QA thủ công:
- Mở đêm → chụp ảnh đèn trần phần mở rộng
- Mở heatmap → chụp ảnh khung theo ô
- Mua tòa → dời → qua đêm → mở lại → chụp ảnh
- Dời quán nước có hàng → chụp ảnh

---

## Checklist tổng

- [x] **L3-C1:** `expandFootprint` nhận `buildingId` bất kỳ (06/10/2026: xôi/quán nước/ăn vặt mở rộng sàn thật, không còn `invalid_tiles`)
- [x] **L3-C2:** Migration `*-north-*` → `floorTiles`
- [x] **L3-C3:** Ngân sách chung cho mọi tòa
- [x] **L3-C4:** Mở rộng sang lô kề trống (D7b)
- [x] **L3-C5:** Không sinh khách cho tòa thi công (`buildingSpawnsCustomers`, test mô phỏng)
- [x] **L3-C6:** Nhân viên tòa thi công đứng chờ ở kho (`construction-staff.test.ts`)
- [x] **L3-C7:** Rà soát tra tĩnh theo vị trí mặc định (sửa `AnalyticsModal`; chỗ giữ nguyên đã ghi chú vì tiệm chính cố định)
- [x] **B2-1:** Mobile touch tab Mở rộng (chạm/kéo bật/tắt ô; chưa thử thiết bị thật)
- [x] **B2-2:** Co-op test `expand_footprint` + `relocate_building`
- [ ] **B2-3:** QA ánh sáng đêm (nhìn) — còn phải nhìn trong trình duyệt
- [ ] **B2-4:** QA heatmap (nhìn) — khung đã có test thuần, còn phải nhìn
- [ ] **L3-C8:** QA browser: mở sáng hôm sau, dời tòa có hàng (kiểm headless xong; chưa nhìn trình duyệt)
- [x] **All:** `yarn typecheck`, `yarn test`, `apps/server test:unit`, `apps/web test`, `yarn build`, `yarn --cwd apps/server test:coop` PASS (06/10/2026)
