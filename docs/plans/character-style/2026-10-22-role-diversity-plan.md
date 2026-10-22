# Kế hoạch triển khai: Đa dạng ngoại hình và nghề nghiệp nhân vật 3D

Spec Source: `docs/plans/character-style/2026-10-22-role-diversity-spec.md`  
Owner: Codex  
Last Updated: 2026-10-22  
Status: In Progress — người dùng duyệt hướng kết hợp, chọn chiến lược B và yêu cầu bắt đầu làm; TASK-001 đã xong, resolver và prototype xe đẩy đang có code nhưng chưa QA

---

# 1. Context

**Problem:** Có 12 model nền, nhưng lựa chọn NPC theo hash không cam kết phân bố ngoại hình cân bằng và renderer chưa gắn outfit theo nghề. Vì vậy cảnh đông NPC có thể trông lặp hoặc lệch giới tính, còn khách, nhân viên, người giao hàng và cư dân khó phân biệt nghề.

**Affected Modules:**
- `packages/game-core` - chỉ đọc snapshot role hiện có; không đổi quy tắc mô phỏng, nghề, spawn hay save.
- `packages/game-renderer-3d` - resolver appearance, adapter role, outfit/phụ kiện cache và renderer nhân vật.
- `apps/web` - gallery DEV cho QA, không thêm UI sản phẩm.
- `apps/server` - không đổi.

**Non-Goals:**
- Không thay hệ nghề/gameplay, dân số, spawn, lịch, kinh tế, co-op protocol hoặc save schema.
- Không thiết kế lại toàn bộ GLB ngay trong một lượt; không thêm model ngoài trước khi spike cho thấy outfit/phụ kiện không đủ.
- Không chỉnh xe, tòa nhà, nội thất, camera hay pixelation toàn cảnh.
- Không thêm màn hình cho người chơi tự chọn model trong kế hoạch này.

---

# 2. Constraints

**Language:** TypeScript, yarn workspaces.  
**Architecture:** game-core mô phỏng tất định; renderer tiêu thụ snapshot để dựng hình; gallery chỉ là DEV/QA.

**Rules:**
- Giữ model base, outfit và accessory ổn định theo identity/role/seed; không dùng `Math.random()`.
- Không suy role từ tên ID, tên model hoặc chỉ số array. Dùng field role đã có trong snapshot; thiếu thì adapter có fallback rõ.
- Không tạo mesh/material trong render hot path. Khởi tạo/cached asset theo archetype và tái dùng instance qua pool hiện có.
- Giữ mốc chiều cao adult 1,28m, phụ kiện mưa, nón lá, thùng giao hàng, animation, roof hiding và hướng quay.
- Không làm thay đổi kết quả gameplay/save/network; appearance chỉ là trình bày.
- Cập nhật `tổng hợp.md`, `3D-STYLE.md`, kế hoạch/spec liên quan sau khi có code hoặc QA mới; ghi đúng trạng thái đã chạy.

**Performance Budgets:** Không tăng tạo mesh/material trên mỗi frame. So FPS, p95 frame time, draw calls và số nhân vật active cùng cảnh trước/sau. Đặt ngưỡng chấp nhận sau khi baseline cùng môi trường được tái lập; không tuyên bố đạt nếu chưa đo.

---

# 3. Conventions

**Naming:** theo `character-models.ts`, `characters-3d.ts`, `style-spec.ts` và các test renderer hiện có.  
**Error Handling:** archetype không biết -> casual neutral; thiếu accessory asset -> giữ model base và ghi lỗi DEV có giới hạn; không làm mất nhân vật.  
**Testing:** unit test resolver phân bổ, fallback, determinism; renderer tests cho cache/role mapping; browser QA bắt buộc cho hình ảnh, pose và performance.  
**Docs:** cập nhật `tổng hợp.md` cùng đợt code; cập nhật `TASKS.md`/`ROADMAP.md` nếu mốc tiến độ bị ảnh hưởng.  
**Task Size:** chia nhỏ mỗi task, mục tiêu dưới 200 LOC code mới (không tính tests/assets); tách task nếu vượt.

---

# 4. Contracts

## Interface: Appearance resolver

```text
resolveCharacterAppearance(input: CharacterAppearanceInput): CharacterAppearanceSpec
  - pre: input.identity ổn định; role thuộc union chuẩn hóa hoặc là undefined
  - post: cùng identity + role + seed trả cùng model/outfit/accessories
  - fallback: role thiếu/không hỗ trợ -> casual archetype, không ném lỗi
  - throws: không ném lỗi cho dữ liệu snapshot hợp lệ; catalog nội bộ thiếu là lỗi cấu hình DEV
```

## Data Structures

```text
CharacterAppearanceInput {
  identity: string;                       // id ổn định, không dùng vị trí frame
  seed: number;                           // lookSeed/variant ổn định nếu có
  role: CharacterArchetype | undefined;   // lấy từ snapshot hoặc adapter rõ ràng
}

CharacterAppearanceSpec {
  modelKind: CharacterModelKind;          // base model từ catalog 12 mẫu
  presentation: 'feminine' | 'masculine' | 'neutral';
  archetype: CharacterArchetype;          // casual, customer, cashier, stocker,
                                          // security, drinkStaff, courier,
                                          // streetVendor, student, child, elder,
                                          // officeWorker, resident, pedestrian
  outfitId: OutfitId;
  accessoryIds: readonly AccessoryId[];
}

CharacterVisualInstance {
  identity: string;
  appearanceKey: string;                  // model + outfit + accessories
  modelKind: CharacterModelKind;
  archetype: CharacterArchetype;
  accessoryMeshes: readonly Mesh[];         // cached, instance-owned visibility/transform
}
```

Tên public type có thể được đổi khi triển khai để bám convention thật, nhưng semantic contract không đổi. Presentation mô tả nhóm tạo hình asset, không đại diện thuộc tính gameplay.

## Shared types / save-model impact

Không thay shared DTO, game-core snapshot contract, save schema hoặc network payload. Nếu renderer chưa nhận trường role ổn định, TASK-001 tạo mapper thuần tại adapter renderer từ field có sẵn; nếu không có field nguồn, dừng và báo thiếu hợp đồng thay vì thêm data gameplay ngầm.

---

# 5. Target Architecture

**Components:**
- `character-models.ts` - catalog base model kèm presentation và bộ chọn deterministic có phân bổ kiểm chứng được.
- `character-appearance.ts` (dự kiến) - union archetype, outfit/accessory registry, pure resolver và appearance key.
- `characters-3d.ts` - đọc role/snapshot, resolve lúc identity tạo/role đổi, attach cached accessories, giữ pool/animation hiện hành.
- `character-gallery` DEV - trình bày base models theo presentation và role outfits cạnh thước 1,28m/1,60m.

**Interaction Flow:**

```text
snapshot player/customer/staff/courier/resident
  -> renderer role adapter (chỉ field hiện có)
  -> resolveCharacterAppearance(identity, role, seed)
  -> base GLB + cached outfit/accessory 3D
  -> Characters3D instance pool -> scene
  -> DEV gallery + runtime QA
```

**Key Decisions:**
- Risk-first: xác minh input role trước, vì thiếu metadata có thể làm outfit mapping sai toàn bộ NPC.
- Reuse 12 GLB trước; outfit/accessory được tạo bằng Babylon low-poly procedural assets, dùng màu theo token, có size/bounds từ scale spec.
- Role mapping và model distribution thuần/tất định, không thêm logic vào game-core.
- Registry mở rộng có version-key và fallback để role mới không làm crash hoặc vô hình.

---

# 6. Artifact Registry

| Artifact | Type | Owner Task | Implements |
|----------|------|------------|------------|
| `docs/plans/character-style/2026-10-22-role-diversity-spec.md` | modify | TASK-001 | Scope/contract nguồn |
| `packages/game-renderer-3d/src/character-appearance.ts` | create | TASK-002 | `resolveCharacterAppearance`, archetype/outfit/accessory registry |
| `packages/game-renderer-3d/src/character-appearance.test.ts` | create | TASK-002 | Determinism, balance, fallback, registry coverage |
| `packages/game-renderer-3d/src/character-models.ts` | modify | TASK-002 | Presentation metadata và balanced deterministic selection |
| `packages/game-renderer-3d/src/character-models.test.ts` | modify | TASK-002 | Catalog/presentation/distribution invariants |
| `packages/game-renderer-3d/src/characters-3d.ts` | modify | TASK-003, TASK-004 | Role adapter, cached outfit/accessory integration |
| `packages/game-renderer-3d/src/character-outfits-3d.ts` | create | TASK-004 | Reusable low-poly outfit/accessory meshes/materials |
| `packages/game-renderer-3d/src/character-outfits-3d.test.ts` | create | TASK-004 | Geometry bounds/cache/disposal contracts |
| `apps/web/src/dev-character-gallery.ts` | modify | TASK-005 | Gallery grouping, role variants and capture |
| `apps/web/character-gallery.html` | modify | TASK-005 | Gallery controls/legend for base vs archetypes |
| `docs/art-bible/3D-STYLE.md` | modify | TASK-005 | Tạo hình role, accessory, palette và scale |
| `docs/plans/3d-migration-plan.md` | modify | TASK-005 | Trạng thái migration nhân vật/QA |
| `tổng hợp.md` | modify | TASK-005 | Bằng chứng code, test, browser QA |

---

# 7. Task Graph

**User-Approved Phase/Sprint Strategy:**  
Selected: `Risk First / Spike First` — người dùng đổi lựa chọn sang B; xác minh khả năng đọc role ở renderer trước khi đầu tư thiết kế wardrobe. Sau spike, tiếp tục theo các lớp phụ thuộc (registry -> visual assets -> tích hợp -> QA). Chưa làm toàn bộ wardrobe trước khi role contract được xác minh.

| Phase/Sprint | Goal | Testable/Demoable Outcome |
|--------------|------|---------------------------|
| Phase 1: Role-data spike | Liệt kê input role thực có cho player/co-op/customer/staff/courier/resident/pedestrian | Bảng role -> nguồn field -> adapter; xác nhận không cần đổi game-core hoặc nêu blocker cụ thể |
| Phase 2: Appearance registry | Đăng ký 12 model, presentation, resolver tất định và outfit role/fallback | Unit tests xác nhận determinism, parity/balance và role coverage |
| Phase 3: Outfit assets | Tạo một capsule role prototype rồi bộ phụ kiện low-poly cacheable | Gallery cho thấy base và nghề mẫu; không tạo mesh/material mỗi frame |
| Phase 4: Runtime integration | Nối role và visual spec vào pipeline/pool Characters3D | Các nhóm đã có metadata hiển thị archetype đúng; fallback casual an toàn |
| Phase 5: Gallery and QA | Gallery chia nhóm, kiểm runtime và đo hiệu năng | Ảnh QA, checklist role, FPS/draw calls, tài liệu cập nhật |

| ID | Phase | Name | Depends On | Effort |
|----|-------|------|------------|--------|
| TASK-001 | Phase 1 | Audit role snapshots and prototype feasibility | - | S |
| TASK-002 | Phase 2 | Build deterministic appearance registry | TASK-001 | M |
| TASK-003 | Phase 3 | Prototype one occupation silhouette | TASK-002 | M |
| TASK-004 | Phase 3-4 | Add cached outfit accessories and integrate roles | TASK-003 | L |
| TASK-005 | Phase 5 | Gallery, runtime QA, docs and perf comparison | TASK-004 | M |

**Dependency Graph:**

```text
TASK-001 role-data spike
  `-- TASK-002 deterministic appearance registry
       `-- TASK-003 one occupation prototype
            `-- TASK-004 cached outfits + runtime adapter
                 `-- TASK-005 gallery + browser QA + docs
```

**Execution Rules:**
- TASK-001 là gate. Nếu role không có field tin cậy, chỉ làm role đã chứng minh được bằng snapshot; không thay core để đoán nghề.
- TASK-003 chọn một nghề tương phản dễ nhìn nhất có dữ liệu ổn định (ưu tiên courier hoặc street vendor nếu có accessory/type hiện hữu); chốt prototype trước khi nhân rộng.
- TASK-004 có thể chia theo nhóm nghề nếu vượt 200 LOC hoặc quá một ngày review; mỗi nhóm phải demo riêng.
- Không làm song song task phụ thuộc contract trước.

**Implementation Ledger (2026-10-22):**
- TASK-001: DONE. `Characters3D.update` nhận `StaffMember.role`, `NeighborNpcView.type/accessory`, `StreetPedestrianState.activity`, logistics worker; customer chỉ là nhóm khách, không có occupation field. Không cần đổi `game-core`/save.
- TASK-002: IMPLEMENTED, NOT VERIFIED. Thêm `character-appearance.ts` với archetype/outfit registry và resolver; `character-models.ts` có metadata 6/6 presentation và chọn nhóm theo parity hash để ID/seed tuần tự luân phiên; renderer cache appearance theo identity. Chưa thêm/chạy tests hoặc typecheck.
- TASK-003: IMPLEMENTED, VISUAL QA PENDING. Thêm xe đẩy low-poly cho street vendor, gắn theo `NeighborNpcView.type === vendor`; gallery có preview trên một model feminine và masculine. Sau HMR, gallery báo 12/12 tải, 6/6 model theo presentation và console error 0; screenshot API không lấy được nên chưa đánh giá hình học sau thay đổi.
- TASK-004/005: NOT STARTED. Các nghề khác hiện mới có registry key; chưa có phụ kiện/trang phục mesh riêng và chưa tuyên bố hoàn thành.
- Browser QA: gallery load một phần đã kiểm; hình ảnh screenshot và game runtime chưa QA. Test, typecheck, build, perf: CHƯA CHẠY trong lát cắt này.

---

# 8. Task Specifications

## TASK-001: Audit role snapshots and prototype feasibility

**Phase/Sprint:** `Phase 1: Role-data spike`

**Description:** Theo từng nhóm render ở `Characters3D.update`, truy ngược type trả về từ `peekCustomers`, `peekVisibleStaff`, logistics, street pedestrians và `NeighborhoodLife.forEachVisible`. Ghi bảng role thực tế, field ổn định, mẫu bị thiếu; chọn prototype occupation dựa trên dữ liệu thật.

**Input:** `characters-3d.ts`, snapshot type từ game-core/data, `NPC_TYPES` và staff role definitions.

**Output:** Spec cập nhật với bảng `render group -> source field -> normalized archetype -> fallback` và quyết định prototype.

**Files:**
- `docs/plans/character-style/2026-10-22-role-diversity-spec.md` - **modify**: thay giả định role bằng inventory xác minh.
- `tổng hợp.md` - **modify nếu trạng thái hiện trạng thay đổi**: ghi spike khi tạo code đầu tiên, không ghi kết quả chưa kiểm.

**Responsibilities:**
- Theo role từ getter/snapshot thật đến renderer; không suy role từ ID hoặc sprite index.
- Kiểm thử khả năng mapping bằng fixtures/types; không thêm field game-core nếu nguồn chưa có.
- Chọn một nghề prototype có bằng chứng nguồn role/accessory.

**Acceptance Criteria:**
- [ ] Bảng bao gồm player, co-op, khách, staff, courier, resident và pedestrian.
- [ ] Mỗi archetype có source field hoặc được đánh dấu `casual fallback` với lý do.
- [ ] Xác nhận boundary không chạm save/network/gameplay; nếu cần đổi boundary phải viết lại spec xin duyệt trước khi code.
- [ ] Chỉ định một prototype occupation có thể hiện bằng base model + mesh/accessory cache.

## TASK-002: Build deterministic appearance registry

**Phase/Sprint:** `Phase 2: Appearance registry`

**Description:** Tách lựa chọn ngoại hình và role outfit khỏi vòng lặp render thành hàm thuần. Gắn presentation 6/6 vào catalog từ asset inventory, cải thiện phân bổ để các ID liên tiếp không dồn cùng presentation hoặc vài model; giữ cùng identity+seed+role ổn định qua load.

**Input:** From TASK-001 - verified role inventory and prototype type.

**Output:** `CharacterAppearanceSpec` cùng test deterministic/balance/fallback.

**Files:**
- `packages/game-renderer-3d/src/character-appearance.ts` - **create**: role union, outfit IDs, appearance resolver, registry coverage.
- `packages/game-renderer-3d/src/character-appearance.test.ts` - **create**: test resolver.
- `packages/game-renderer-3d/src/character-models.ts` - **modify**: base presentation metadata and balanced selector.
- `packages/game-renderer-3d/src/character-models.test.ts` - **modify**: catalog counts/target size/selection distribution.

**Responsibilities:**
- Inputs use identity, stable seed, normalized role; no frame index/current position.
- Guarantee deterministic result; distribute sequence test across six feminine/six masculine base entries with no pathological long streak; neutral fallback only where authored metadata says neutral.
- Preserve dedicated player/co-op/delivery selection until the user-facing customization phase; ensure base assets don't make NPC groups appear one-sided.
- Create static registry tables once at module scope; do not allocate fresh role arrays per frame.

**Acceptance Criteria:**
- [ ] Same input -> byte-equivalent keys/model/outfit/accessories across repeated calls.
- [ ] Unknown/missing role -> valid casual result; no throw and no missing catalog key.
- [ ] Catalog validates 12 assets, 6/6 presentation, 1.28m target; representative sequence tests enforce balance/streak invariants.
- [ ] All verified roles from TASK-001 appear exactly once in registry or explicit fallback set.
- [ ] Renderer package tests include new cases.

## TASK-003: Prototype one occupation silhouette

**Phase/Sprint:** `Phase 3: Outfit assets`

**Description:** Tạo một prototype nghề có silhouette phân biệt khi camera game nhìn xa, sử dụng low-poly procedural geometry và palette đã có. Ưu tiên courier/street vendor nếu TASK-001 xác nhận source field và phụ kiện; nếu không, chọn role hợp lệ có source rõ nhất.

**Input:** From TASK-002 - selected prototype archetype and appearance spec.

**Output:** Gallery variant và appearance key mẫu, không đổi runtime production cho tới khi chấp nhận visual gate.

**Files:**
- `packages/game-renderer-3d/src/character-outfits-3d.ts` - **create hoặc spike module**: một outfit/accessory rig dùng chung scale spec.
- `apps/web/src/dev-character-gallery.ts` - **modify**: hiển thị base và prototype với pose bind/idle.
- `apps/web/character-gallery.html` - **modify**: nhãn prototype/role.
- `docs/art-bible/3D-STYLE.md` - **modify**: quy ước prototype nếu visual gate đạt.

**Responsibilities:**
- Chi tiết thêm bằng mesh khối nhỏ hoặc mesh tái sử dụng, bám pivot/height và hướng của base GLB.
- Có dispose/cache lifecycle rõ; phụ kiện không chặn animation hoặc biến dạng rig.
- Không scale lệch model base để giả nghề; không lấy asset ngoài chưa có phê duyệt giấy phép.

**Acceptance Criteria:**
- [ ] Prototype role nhìn phân biệt được ở thumbnail/camera game và không vượt bounds mục tiêu ngoài phần accessory đã ghi.
- [ ] Gallery tải base + prototype mà không lỗi; mẫu có cả bind và idle view.
- [ ] Người dùng duyệt prototype hình ảnh trước khi mở rộng wardrobe.
- [ ] Nếu không phân biệt đủ bằng accessory, task ghi rõ silhouette gap và đề xuất asset mới trước khi tiếp tục.

## TASK-004: Add cached outfit accessories and integrate roles

**Phase/Sprint:** `Phase 3-4: Outfits and runtime integration`

**Description:** Sau khi prototype được duyệt, hoàn thiện registry outfits/accessories cho các archetype có source dữ liệu thật và gắn vào `Characters3D` lúc instance khởi tạo hoặc khi role thay đổi. Tái sử dụng mesh/material theo archetype; giữ base model, animation groups, pool, accessory weather và roof hiding hiện hành.

**Input:** From TASK-003 - approved prototype + verified role map.

**Output:** Role-aware `CharacterVisualInstance` ở runtime, các archetype chưa hỗ trợ dùng casual fallback.

**Files:**
- `packages/game-renderer-3d/src/characters-3d.ts` - **modify**: normalize role và attach/detach khi appearance key đổi.
- `packages/game-renderer-3d/src/character-outfits-3d.ts` - **modify**: cached meshes/materials và cleanup.
- `packages/game-renderer-3d/src/character-appearance.ts` - **modify**: outfit registry cho supported roles.
- renderer tests - **modify/create**: cache reuse, role fallback, disposal/role switch.

**Responsibilities:**
- Map input role ở từng nhóm update đã kiểm chứng trong TASK-001.
- Không thêm role gameplay giả; customer dùng customer archetype, nhân viên dùng staff role nếu snapshot có, cư dân dùng `type`/accessory, pedestrian dùng activity/variant nếu source được xác nhận.
- Mỗi outfit/accessory có color tokens/bounds; accessory hiện có như nón lá, ô, cargo box không bị nhân đôi.
- Instance pooling reset outfit/material visibility đầy đủ khi đổi model hoặc tái sử dụng.

**Acceptance Criteria:**
- [ ] Player/co-op/khách/staff/courier/resident/pedestrian đều nhận appearance hợp lệ; role không hỗ trợ fallback casual.
- [ ] Role metadata không xuất hiện trong save/network và không đổi kết quả simulation.
- [ ] Đổi/tái sử dụng instance không để sót accessory của role trước.
- [ ] Mesh/material được tái sử dụng; không khởi tạo trong update mỗi frame.
- [ ] Renderer tests cover initial creation, role change, pooling, accessory weather/roof compatibility.

## TASK-005: Gallery, runtime QA, docs and perf comparison

**Phase/Sprint:** `Phase 5: Gallery and QA`

**Description:** Hoàn thiện gallery theo nhóm appearance/archetype để review được giới tính trình bày và nghề; QA trong game ở cảnh đủ đa dạng NPC và kiểm hiệu năng cùng điều kiện baseline. Cập nhật trạng thái thực tế trong project docs.

**Input:** From TASK-004 - integrated renderer.

**Output:** Gallery QA artifact, checklist archetype, kết quả browser/perf, docs đồng bộ.

**Files:**
- `apps/web/src/dev-character-gallery.ts` - **modify**: category labels, role groups, status/errors.
- `apps/web/character-gallery.html` - **modify**: accessible controls and legend.
- `.qa/qa-phase2/character-appearance-gallery.png` - **create**: screenshot gallery.
- `.qa/qa-phase2/character-role-runtime.png` - **create**: runtime role proof if screenshot path available.
- `docs/art-bible/3D-STYLE.md` - **modify**: approved outfit/archetype style.
- `docs/plans/3d-migration-plan.md` - **modify**: migration progress/limits.
- `tổng hợp.md` - **modify**: test/QA evidence and remaining gaps.

**Responsibilities:**
- Kiểm gallery 12 base, role prototype/outfits, mốc 1.28/1.60, daytime lighting.
- Browser smoke kiểm cảnh thường, mưa, che mái, hướng đi và animation; compare FPS, p95 và draw calls cùng save/viewport/camera.
- Nếu capture hoặc runtime inaccessible, ghi `CHƯA KIỂM` và điều kiện thiếu; không fake PNG/metrics.

**Acceptance Criteria:**
- [ ] 12 base assets và tất cả role archetypes hiện trạng tải, label đúng, bounds đúng; lỗi có tên asset.
- [ ] Browser smoke xác nhận role qua đúng hình, hoạt ảnh/phụ kiện cũ giữ nguyên.
- [ ] Metrics before/after thu cùng cấu hình; regression được giải thích và không vượt budget được chốt.
- [ ] `yarn typecheck`, renderer tests, app build/lint đã chạy nếu môi trường cho phép; kết quả ghi đúng.
- [ ] `tổng hợp.md`, `3D-STYLE.md`, migration plan phản ánh code/test/QA riêng rẽ.

---

# 9. Edge Cases

| # | Scenario | Expected Behavior | Handled In |
|---|----------|-------------------|------------|
| 1 | Snapshot role undefined hoặc role mới chưa đăng ký | Casual fallback ổn định, nhân vật vẫn render | TASK-002, TASK-004 |
| 2 | IDs/seed tuần tự sinh lệch presentation/model | Selector giữ tính deterministic và đạt balance/streak invariants | TASK-002 |
| 3 | Player/co-op cố định cùng khách/NPC có appearance giống nhau | Giữ player/co-op lock trong scope; NPC selection lấy pool còn lại theo stable rule | TASK-002 |
| 4 | Pool tái sử dụng entity từ courier thành casual/staff | Gỡ accessory cũ, gắn appearance mới đúng key | TASK-004 |
| 5 | Courier có thùng hàng, mưa có ô, NPC có nón lá cùng lúc | Chỉ attach phụ kiện hợp lệ; không duplicate hay chồng pivot | TASK-003, TASK-004 |
| 6 | Model/texture/accessory asset lỗi hoặc bị dispose lúc load | Không crash; dùng model base/casual, ghi lỗi DEV có giới hạn | TASK-003, TASK-004 |
| 7 | Role mapping thiếu tên staff subtype | Dùng staff casual hoặc archetype chung, không đoán từ ID | TASK-001, TASK-004 |
| 8 | Mưa/đêm và mái che làm phụ kiện/vật liệu sai visibility | Giữ quyền sở hữu tint/roof visibility theo pipeline hiện hành | TASK-004, TASK-005 |
| 9 | Số lượng NPC đông trên laptop hoặc mobile | Cache geometry/material; đo cảnh mật độ cao; không nâng cap trong task | TASK-004, TASK-005 |

---

# 10. Risks

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| 1 | Getter hiện không lộ staff role hoặc customer type ổn định | H | M | TASK-001 là gate; fallback thay vì sửa game-core ngầm |
| 2 | Outfit procedural bị khuất ở camera xa | M | M | Prototype trước, xem thumbnail + in-game camera và duyệt trước khi nhân rộng |
| 3 | Accessory mesh tăng draw calls hoặc pool leaks | H | M | Thin instances/cache theo archetype, test disposal, đo cùng cảnh |
| 4 | Cân bằng presentation làm đổi look ổn định cũ của save đang chạy | M | M | Không đổi simulation/save; định danh giữ selection ổn định, ghi rõ việc NPC appearance có thể đổi khi nâng code |
| 5 | Art direction phụ kiện không khớp GLB Kenney | M | M | Palette/material tokens, cùng reference gallery và chỉ thêm asset có visual gate |

---

# 11. Verification Plan

**Unit:** resolver/selection tests - determinism, 6/6 metadata, balance/streak, unknown-role fallback, registry completeness.  
**Integration:** `Characters3D` role adapter + pooling + accessories - instance creation, role switch, dispose, rain/roof compatibility.  
**Manual/Smoke:** gallery base/outfit; game view có player, nhân viên, courier, học sinh/elder/office worker; cảnh ngày và mưa; camera zoom gần/xa; mật độ NPC cao.  
**Performance:** cùng save/viewport/camera, ghi FPS average/p1/p95, draw calls và active count trước/sau.  
**Success Criteria:** tests runnable pass, visual role read clearly in runtime, no gameplay/save changes, no frame-hot allocations, perf change within measured budget, docs updated.

**Browser QA note:** xác minh laptop layout 1280×720 và browser viewport 1920×1080; mobile sanity ở 812×375 chỉ để kiểm render scale/performance nếu UI không đổi. Kiểm gallery accessible controls và chụp ảnh thực trong browser; screenshot không truy xuất được phải được ghi là chưa có.

---

# 12. Rollout Plan

| Phase | Scope | Gate Criteria |
|-------|-------|---------------|
| 1 | Role-data spike | Bảng role->field đã xác minh; không có field thì dừng nhóm đó |
| 2 | Appearance registry | Unit tests deterministic/balance/fallback pass |
| 3 | One outfit prototype | Người dùng duyệt hình trước khi mở rộng |
| 4 | Role integration/outfits | Renderer tests + QA role pipeline |
| 5 | Gallery/perf/docs | Browser evidence và metrics cùng cấu hình hoặc ghi rõ blocker |

**Rollback:** nếu role mapping sai, lỗi pool, hoặc performance regression rõ, tắt attach outfit ở `Characters3D` và dùng base GLB/casual appearance; giữ registry để sửa, không đổi simulation/save.

---

# 13. Future Improvements

- UI tùy chỉnh ngoại hình player/co-op - để sau khi library/outfit role ổn định.
- Tạo GLB nhân vật nghề silhouette riêng (bác sĩ, công nhân, đầu bếp...) - chỉ sau khi prototype accessory chứng minh không đủ phân biệt.
- Thêm LOD riêng cho phụ kiện trên mobile - cân nhắc sau số đo mật độ NPC và benchmark thiết bị.
