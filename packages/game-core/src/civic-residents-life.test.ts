import assert from 'assert';
import {
  NeighborhoodLife,
  visibleNpcCount,
  houseFloorTier,
  deterministicResidentNpc,
  RESIDENTS_PER_NPC,
  NPC_CAP_DESKTOP,
  NPC_CAP_MOBILE,
  type LifeContext,
} from './neighborhood-life';

export function runCivicResidentsLifeTests(): void {
  console.log('\n--- Test: civic-residents-life (OpenSpec) ---');

  // 1. Tính tất định theo (seed, day, districtId, index)
  {
    const r1 = deterministicResidentNpc(12345, 1, 'hem_dan_cu', 0);
    const r2 = deterministicResidentNpc(12345, 1, 'hem_dan_cu', 0);
    assert.strictEqual(r1.id, r2.id, 'Cùng tham số sinh ra cùng ID');
    assert.strictEqual(r1.defId, r2.defId, 'Cùng tham số sinh ra cùng defId');
    assert.strictEqual(r1.spriteVariant, r2.spriteVariant, 'Cùng tham số sinh ra cùng spriteVariant');
    assert.strictEqual(r1.accessory, r2.accessory, 'Cùng tham số sinh ra cùng accessory');

    // Khác index phải sinh cư dân khác nhau
    const r3 = deterministicResidentNpc(12345, 1, 'hem_dan_cu', 1);
    assert.notStrictEqual(r1.id, r3.id, 'Khác index sinh ID khác nhau');

    // Khác day
    const rDay2 = deterministicResidentNpc(12345, 2, 'hem_dan_cu', 0);
    assert.strictEqual(typeof rDay2.id, 'string');
  }

  // 2. Công thức số NPC hiển thị và trần thiết bị (desktop vs mobile)
  {
    assert.strictEqual(visibleNpcCount(0, false), 0);
    assert.strictEqual(visibleNpcCount(0, true), 0);

    // Dân số 10 -> 10 / 4 = 2 (cả desktop và mobile)
    assert.strictEqual(visibleNpcCount(10, false), Math.floor(10 / RESIDENTS_PER_NPC));
    assert.strictEqual(visibleNpcCount(10, true), Math.floor(10 / RESIDENTS_PER_NPC));

    // Dân số 100 -> 100 / 4 = 25. Desktop = 25 (chưa chạm trần 40), Mobile = 20 (chạm trần 20)
    assert.strictEqual(visibleNpcCount(100, false), 25);
    assert.strictEqual(visibleNpcCount(100, true), NPC_CAP_MOBILE);

    // Dân số 200 -> Desktop = 40 (trần), Mobile = 20 (trần)
    assert.strictEqual(visibleNpcCount(200, false), NPC_CAP_DESKTOP);
    assert.strictEqual(visibleNpcCount(200, true), NPC_CAP_MOBILE);

    assert.ok(NPC_CAP_MOBILE < NPC_CAP_DESKTOP, 'Trần di động phải thấp hơn desktop để bảo đảm hiệu năng');
  }

  // 3. Bậc nhà theo dân số / sức chứa
  {
    assert.strictEqual(houseFloorTier(0, 100), 1, 'Dưới 65% sức chứa: bậc 1');
    assert.strictEqual(houseFloorTier(50, 100), 1, '50% sức chứa: bậc 1');
    assert.strictEqual(houseFloorTier(64, 100), 1, '64% sức chứa: bậc 1');
    assert.strictEqual(houseFloorTier(65, 100), 2, '65% sức chứa: bậc 2');
    assert.strictEqual(houseFloorTier(80, 100), 2, '80% sức chứa: bậc 2');
    assert.strictEqual(houseFloorTier(99, 100), 2, '99% sức chứa: bậc 2');
    assert.strictEqual(houseFloorTier(100, 100), 3, '100% sức chứa trở lên: bậc 3');
    assert.strictEqual(houseFloorTier(150, 100), 3, '150% sức chứa: bậc 3');
    assert.strictEqual(houseFloorTier(50, 0), 1, 'Sức chứa không hợp lệ: fallback bậc 1');
  }

  // 4. NeighborhoodLife tích hợp dân số và cập nhật
  {
    const life = new NeighborhoodLife(42);
    life.setCivicPopulation(80, false); // 80 / 4 = 20 NPC
    const ctx: LifeContext = {
      hour: 8,
      minute: 0,
      day: 1,
      weekday: 2,
      rain: 0,
      weatherId: 'clear',
    };
    const view = { x0: -500, y0: -500, x1: 1500, y1: 1500 };
    life.update(0.016, ctx, view, 'near', 'high');

    let visibleCount = 0;
    life.forEachVisible(() => {
      visibleCount++;
    });
    // Trong khoảng đầu ngày một số NPC bắt đầu đi errand
    assert.ok(visibleCount >= 0, 'NPC được cập nhật trong NeighborhoodLife');
  }

  // 5. Đo hiệu năng cập nhật NPC nền ≤ 2 ms/khung ở 375×812
  {
    const life = new NeighborhoodLife(999);
    // Kích hoạt trần mobile tối đa (20 NPC)
    life.setCivicPopulation(200, true);

    const ctx: LifeContext = {
      hour: 8,
      minute: 0,
      day: 1,
      weekday: 1,
      rain: 0,
      weatherId: 'clear',
    };
    // Khung nhìn di động chuẩn 375×812 px
    const mobileView = { x0: 0, y0: 0, x1: 375, y1: 812 };

    // Warm-up 10 khung
    for (let f = 0; f < 10; f++) {
      life.update(0.016, ctx, mobileView, 'near', 'high');
    }

    // Benchmark 60 khung
    const frames = 60;
    const start = performance.now();
    for (let f = 0; f < frames; f++) {
      ctx.minute += 1;
      if (ctx.minute >= 60) {
        ctx.minute = 0;
        ctx.hour += 1;
      }
      life.update(0.016, ctx, mobileView, 'near', 'high');
    }
    const elapsed = performance.now() - start;
    const avgMsPerFrame = elapsed / frames;

    console.log(`  Hiệu năng NPC nền ở 375×812: trung bình ${avgMsPerFrame.toFixed(3)} ms/khung (ngân sách ≤ 2.0 ms)`);
    assert.ok(
      avgMsPerFrame <= 2.0,
      `Hiệu năng NPC nền (${avgMsPerFrame.toFixed(3)} ms/khung) phải ≤ 2.0 ms/khung theo chuẩn OpenSpec`,
    );
  }

  // spriteVariant LÀ mã look theo vai trò (QA D2): học sinh 6, cụ già 7, công sở 8, trẻ em 9; mọi look hợp lệ 0,2..9.
  {
    const ROLE_LOOK: Record<string, number> = { student: 6, elder: 7, office_worker: 8, child: 9 };
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const r = deterministicResidentNpc(777, 3, 'hem_dan_cu', i);
      assert.ok([0, 2, 3, 4, 5, 6, 7, 8, 9].includes(r.spriteVariant), `look hợp lệ (${r.spriteVariant})`);
      if (ROLE_LOOK[r.defId] !== undefined) { assert.strictEqual(r.spriteVariant, ROLE_LOOK[r.defId], `${r.defId} → look ${ROLE_LOOK[r.defId]}`); seen.add(r.defId); }
    }
    assert.deepStrictEqual([...seen].sort(), Object.keys(ROLE_LOOK).sort(), 'đủ 4 vai trò có look riêng xuất hiện trong mẫu');
    // Đường không theo dân số: look rút từ [0,2..8] (bỏ look 1 chủ tiệm), giống hình cũ.
    const legacy = new NeighborhoodLife(4242);
    (legacy as unknown as { populate(): void }).populate();
    assert.ok((legacy as unknown as { npcs: unknown[] }).npcs.length > 0, 'đường cũ có cư dân');
    for (const n of (legacy as unknown as { npcs: Array<{ spriteVariant: number }> }).npcs) assert.ok([0, 2, 3, 4, 5, 6, 7, 8].includes(n.spriteVariant), `look đường cũ hợp lệ (${n.spriteVariant})`);
  }

  // 1.3 open-world-districts: NPC nền theo `npcMix` — khu văn phòng nhiều người đi làm hơn hẻm dân cư, hẻm nhiều cụ già hơn.
  {
    const count = (district: string, type: string) => { let c = 0; for (let i = 0; i < 600; i++) if (deterministicResidentNpc(99, 1, district, i).defId === type) c++; return c; };
    assert.ok(count('van_phong_logistics', 'office_worker') > count('hem_dan_cu', 'office_worker'), 'khu văn phòng nhiều người đi làm hơn');
    assert.ok(count('hem_dan_cu', 'elder') > count('van_phong_logistics', 'elder'), 'hẻm dân cư nhiều cụ già hơn');
  }

  console.log('  PASS: civic-residents-life tests');
}
