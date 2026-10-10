/**
 * Test thuần dữ liệu hạ tầng các đợt khai hoang W1–W4 (OpenSpec `open-world-land-reclamation`, task 1.1).
 * Phạm vi: game-data. Chạy được độc lập (`tsx src/world/wave-infrastructure.test.ts`) hoặc qua `run*` đăng ký
 * trong test-runner (Lead nối sau).
 *
 * Phạm vi kiểm (ghi rõ):
 *   - Mọi ô hạ tầng (vỉa hè, đèn, cây, rãnh) và chỗ đỗ xe nằm TRONG biên `WORLD_BOUNDS` và TRONG region của
 *     đợt tương ứng.
 *   - Đèn / cây / chỗ đỗ (vật cản) KHÔNG nằm trong rect lô của đợt → không chặn cửa/mặt tiền lô.
 *     Vỉa hè và rãnh là vật nền / cửa thu nước (đi qua được) nên được phép nằm dưới lô — KHÔNG áp kiểm "ngoài lô".
 *   - Không đè lên ô hạ tầng W0 cùng vị trí (đèn/cây/rãnh/chỗ đỗ W0) — cột/mảng so theo ô.
 *   - Bó vỉa (kerb) của rãnh nằm gọn trong region (rãnh chỉ khai báo khi kerb trong region, W1/W3).
 */
import assert from 'node:assert/strict';
import type { Vector2D } from '@game/shared';
import {
  WAVE_INFRASTRUCTURE, WAVE_INFRASTRUCTURE_IDS, type WaveInfrastructure,
} from './wave-infrastructure';
import { RECLAMATION_WAVES, RECLAMATION_WAVE_MAP } from './waves';
import { rectContains, rectHas, WORLD_BOUNDS } from './world-grid';
import {
  STREET_LAMP_TILES, TREE_PROPS, STORM_DRAINS, STREET_PARKING_SPOTS, CAR_PARKING_SPOTS, ROAD_PROFILE,
} from './infrastructure';

const pixelToTile = (p: Vector2D): { x: number; y: number } => ({ x: Math.floor(p.x / 32), y: Math.floor(p.y / 32) });
const kerbOf = (waveId: string): number => {
  const road = RECLAMATION_WAVE_MAP[waveId]!.frontageRoadId;
  return road === 'south' ? 25 : ROAD_PROFILE.kerbTileY;
};

export function runWaveInfrastructureTests(): void {
  console.log('\n--- Hạ tầng đợt khai hoang W1–W4 (1.1) ---');

  assert.deepEqual(WAVE_INFRASTRUCTURE_IDS, ['w1', 'w3', 'w2', 'w4'], 'có đúng 4 đợt hạ tầng mới (w1..w4)');
  const expectWaveIds = new Set(['w1', 'w2', 'w3', 'w4']);
  for (const id of WAVE_INFRASTRUCTURE_IDS) assert.ok(expectWaveIds.has(id), `id hạ tầng ${id} là đợt W1–W4`);

  // Tập ô hạ tầng W0 (so trùng vị trí) — rãnh W0 ở hàng kerb main (13).
  const w0Cells = new Set<string>();
  for (const t of STREET_LAMP_TILES) w0Cells.add(`${t.x},${t.y}`);
  for (const t of TREE_PROPS) w0Cells.add(`${t.tileX},${t.tileY}`);
  for (const t of STORM_DRAINS) w0Cells.add(`${t.tileX},${ROAD_PROFILE.kerbTileY}`);
  for (const p of [...STREET_PARKING_SPOTS, ...CAR_PARKING_SPOTS]) { const t = pixelToTile(p); w0Cells.add(`${t.x},${t.y}`); }

  for (const waveId of WAVE_INFRASTRUCTURE_IDS) {
    const infra = WAVE_INFRASTRUCTURE[waveId] as WaveInfrastructure;
    const wave = RECLAMATION_WAVE_MAP[waveId]!;
    assert.ok(wave, `đợt ${waveId} tồn tại trong RECLAMATION_WAVES`);
    assert.equal(infra.waveId, waveId, 'infra.waveId khớp key');
    const region = wave.region;
    const kerb = kerbOf(waveId);

    const inBounds = (x: number, y: number): boolean => x >= WORLD_BOUNDS.x0 && x <= WORLD_BOUNDS.x1 && y >= WORLD_BOUNDS.y0 && y <= WORLD_BOUNDS.y1;

    // Vật cản (đèn/cây/chỗ đỗ) không được nằm trong rect lô của đợt.
    const insideAnyParcel = (x: number, y: number): boolean =>
      wave.parcels.some(p => p.rect.x0 <= x && x <= p.rect.x1 && p.rect.y0 <= y && y <= p.rect.y1);

    // Vỉa hè: trong biên + trong region, số hơn 0, đủ 2 hàng.
    assert.ok(infra.sidewalk.length > 0, `w${waveId} có vỉa hè`);
    const sideRows = new Set(infra.sidewalk.map(c => c.y));
    assert.equal(sideRows.size, 2, `w${waveId} vỉa hè 2 hàng`);
    for (const c of infra.sidewalk) {
      assert.ok(inBounds(c.x, c.y), `vỉa hè w${waveId} (${c.x},${c.y}) trong WORID_BOUNDS`);
      assert.ok(rectHas(region, c.x, c.y), `vỉa hè w${waveId} (${c.x},${c.y}) trong region`);
    }

    // Đèn: trong biên + trong region + ngoài lô + không trùng W0.
    for (const l of infra.streetLamps) {
      assert.ok(inBounds(l.x, l.y), `đèn w${waveId} (${l.x},${l.y}) trong WORLD_BOUNDS`);
      assert.ok(rectHas(region, l.x, l.y), `đèn w${waveId} (${l.x},${l.y}) trong region`);
      assert.ok(!insideAnyParcel(l.x, l.y), `đèn w${waveId} (${l.x},${l.y}) không nằm trong lô`);
      assert.ok(!w0Cells.has(`${l.x},${l.y}`), `đèn w${waveId} (${l.x},${l.y}) không trùng hạ tầng W0`);
      assert.ok(l.y === kerb - 1, `đèn w${waveId} ở hàng vỉa hè sát lòng đường (y=${kerb - 1})`);
    }

    // Cây: trong biên + trong region + ngoài lô + không trùng W0.
    for (const t of infra.trees) {
      assert.ok(inBounds(t.tileX, t.tileY), `cây w${waveId} (${t.tileX},${t.tileY}) trong WORLD_BOUNDS`);
      assert.ok(rectHas(region, t.tileX, t.tileY), `cây w${waveId} (${t.tileX},${t.tileY}) trong region`);
      assert.ok(!insideAnyParcel(t.tileX, t.tileY), `cây w${waveId} (${t.tileX},${t.tileY}) không nằm trong lô`);
      assert.ok(!w0Cells.has(`${t.tileX},${t.tileY}`), `cây w${waveId} (${t.tileX},${t.tileY}) không trùng hạ tầng W0`);
      assert.ok(t.height > 0 && t.crownRadius > 0, `cây w${waveId} ${t.id} có chiều cao/tán dương`);
    }

    // Chỗ đỗ xe máy + ô tô: chân xe thành ô nằm trong biên + region + ngoài lô + không trùng W0.
    for (const p of [...infra.streetParking, ...infra.carParking]) {
      const t = pixelToTile(p);
      assert.ok(inBounds(t.x, t.y), `chỗ đỗ w${waveId} px(${p.x},${p.y}) → ô (${t.x},${t.y}) trong WORLD_BOUNDS`);
      assert.ok(rectHas(region, t.x, t.y), `chỗ đỗ w${waveId} → ô (${t.x},${t.y}) trong region`);
      assert.ok(!insideAnyParcel(t.x, t.y), `chỗ đỗ w${waveId} → ô (${t.x},${t.y}) không nằm trong lô`);
      assert.ok(!w0Cells.has(`${t.x},${t.y}`), `chỗ đỗ w${waveId} → ô (${t.x},${t.y}) không trùng hạ tầng W0`);
    }

    // Rãnh: nếu có thì bó vỉa nằm trong region (chỉ W1/W3); nếu region không chứa kerb thì phải rỗng (W2/W4).
    const kerbInRegion = rectHas(region, region.x0, kerb);
    if (kerbInRegion) {
      assert.ok(infra.stormDrains.length > 0, `w${waveId} có kerb trong region nên có rãnh`);
      for (const d of infra.stormDrains) {
        assert.ok(rectHas(region, d.tileX, kerb), `rãnh w${waveId} (x=${d.tileX}, kerb=${kerb}) trong region`);
        assert.ok(inBounds(d.tileX, kerb), `rãnh w${waveId} x=${d.tileX} trong WORLD_BOUNDS`);
        assert.ok(!w0Cells.has(`${d.tileX},${kerb}`), `rãnh w${waveId} x=${d.tileX} không trùng rãnh W0`);
      }
    } else {
      assert.equal(infra.stormDrains.length, 0, `w${waveId} kerb=${kerb} ngoài region nên không khai báo rãnh`);
    }

    // Số liệu hợp lý: mỗi đợt có ≥1 vật cản đường (đèn hoặc cây). Chỗ đỗ xe: mỗi đợt có ≥1, NGOẠI TRỪ W3 —
    // khe lô của W3 chỉ 2 ô (x75..76) nên không đủ chỗ xe ngoài lô (dựa bãi xe chung cư giáp ranh, D1). PROVISIONAL.
    assert.ok(infra.streetLamps.length + infra.trees.length >= 1, `w${waveId} có ≥1 đèn hoặc cây`);
    if (waveId !== 'w3') {
      assert.ok(infra.streetParking.length + infra.carParking.length >= 1, `w${waveId} có ≥1 chỗ đỗ xe`);
    } else {
      assert.equal(infra.streetParking.length + infra.carParking.length, 0, 'w3 không có chỗ đỗ trong region (khe quá hẹp — PROVISIONAL)');
    }
    // Xe máy/ô tô dài ~62/130 px, chỗ đỗ phải nằm gọn trong khe lô (không tràn sang lô khác).
    for (const p of [...infra.streetParking, ...infra.carParking]) {
      const half = infra.streetParking.includes(p) ? 31 : 65;
      const t0 = Math.floor((p.x - half) / 32);
      const t1 = Math.floor((p.x + half - 1) / 32);
      for (let x = t0; x <= t1; x++) {
        assert.ok(!insideAnyParcel(x, Math.floor(p.y / 32)),
          `chỗ đỗ w${waveId} px(${p.x},${p.y}) dải ô ${t0}..${t1} không tràn vào lô`);
      }
    }
  }

  // Region của từng đợt hạ tầng vẫn nằm trong biên thế giới (đối chiếu lại waves — thuần).
  for (const wave of RECLAMATION_WAVES) {
    if (WAVE_INFRASTRUCTURE_IDS.includes(wave.id)) {
      assert.ok(rectContains(WORLD_BOUNDS, wave.region), `region ${wave.id} trong WORLD_BOUNDS`);
    }
  }

  console.log('  ✓ mọi ô hạ tầng W1–W4 trong biên + trong region; đèn/cây/chỗ đỗ ngoài lô; không trùng W0; rãnh theo kerb; số liệu hợp lý');
}

declare const process: any;
// Chạy độc lập: `tsx src/world/wave-infrastructure.test.ts`.
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('wave-infrastructure.test')) {
  runWaveInfrastructureTests();
  console.log('\n🎉 HẠ TẦNG ĐỢT W1–W4 ĐẠT!\n');
}
