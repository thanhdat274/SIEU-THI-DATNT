import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  reclaimWaveAllowed,
  startReclaimWave,
  buyParcelAllowed,
  buyParcelAllowedFor,
  validateParcelOwnedForPlacement,
  validateParcelOwnedForPlacementFor,
  expansionBudgetAt,
  customerTrafficMultiplier,
  effectiveSecondaryBuildingTrafficShare,
  isWaveConstructing,
  cityTierFrom,
  cityGrowthFactor,
} from './reclamation';
import { RECLAMATION_WAVES, expansionBudgetAtLevel, parcelPrice, parcelTrafficMultiplier, type LandParcel } from '@game/data';

/**
 * Khai hoang theo đợt (OpenSpec `open-world-land-reclamation`, task 2.2–2.4) — hàm thuần.
 * Chạy độc lập bằng `tsx src/reclamation.test.ts`; `runReclamationTests()` có thể nối vào `test-runner.ts`.
 */

// Helper: state chuẩn cho hầu hết case (cấp đủ mọi đợt, tiền đủ).
const baseState = () => ({
  level: 60,
  money: 5_000_000,
  openedWaves: ['w0'],
  wavesUnderConstruction: {} as Record<string, number>,
  day: 10,
  ownedParcelIds: ['lot-west', 'lot-center', 'lot-east-1', 'lot-east-2'],
});

// Lô đợt mới DẠNG TỔNG HỢP (game-data chưa có lô W1..W4 — khóa task 0.2). Dùng để test lõi mua lô.
const syntheticWave1Corner: LandParcel = {
  id: 'synthetic-w1-corner',
  rect: { x0: 42, x1: 47, y0: 3, y1: 15 },
  wave: 1,
  frontageRoadId: 'main',
  frontage: { corner: true },
};

export function runReclamationTests(): void {
  describe('reclaimWaveAllowed', () => {
    it('mở được khi đủ cấp + tiền và đợt chưa mở/chưa thi công', () => {
      assert.deepEqual(reclaimWaveAllowed(baseState(), 'w1'), { ok: true });
    });
    it('từ chối khi chưa đủ cấp', () => {
      const s = baseState();
      s.level = 10;
      assert.deepEqual(reclaimWaveAllowed(s, 'w2'), { ok: false, reason: 'not_enough_level' });
    });
    it('từ chối khi chưa đủ tiền', () => {
      const s = baseState();
      s.money = 100;
      assert.deepEqual(reclaimWaveAllowed(s, 'w1'), { ok: false, reason: 'not_enough_money' });
    });
    it('từ chối khi đang thi công', () => {
      const s = baseState();
      s.wavesUnderConstruction = { w1: 12 };
      s.day = 11;
      assert.deepEqual(reclaimWaveAllowed(s, 'w1'), { ok: false, reason: 'under_construction' });
    });
    it('từ chối khi đã mở', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      assert.deepEqual(reclaimWaveAllowed(s, 'w1'), { ok: false, reason: 'already_open' });
    });
    it('từ chối đợt không tồn tại', () => {
      assert.deepEqual(reclaimWaveAllowed(baseState(), 'w99'), { ok: false, reason: 'unknown_wave' });
    });
  });

  describe('startReclaimWave + isWaveConstructing', () => {
    it('đưa vào thi công: openedWaves CHƯA đổi, ghi ngày hoàn thành', () => {
      const st = startReclaimWave(baseState(), 'w1', 10);
      assert.deepEqual(st.openedWaves, ['w0']);
      assert.equal(st.wavesUnderConstruction.w1, 12, 'w1 xong đầu ngày 12 = day10 + constructionDays(2)');
    });
    it('đang thi công tới trước ngày hoàn thành, xong đúng ngày', () => {
      const st = startReclaimWave(baseState(), 'w1', 10);
      assert.equal(isWaveConstructing(st.wavesUnderConstruction, 'w1', 11), true);
      assert.equal(isWaveConstructing(st.wavesUnderConstruction, 'w1', 12), false);
    });
    it('đợt không có thi công thì không coi là đang xây', () => {
      assert.equal(isWaveConstructing({}, 'w2', 5), false);
    });
  });

  describe('buyParcelAllowed / buyParcelAllowedFor', () => {
    it('lô W0 coi đã sở hữu → already_owned', () => {
      const s = baseState();
      assert.deepEqual(buyParcelAllowed(s, 'lot-center'), { ok: false, reason: 'already_owned' });
    });
    it('không tồn tại → unknown_parcel', () => {
      assert.deepEqual(buyParcelAllowed(baseState(), 'lot-moon'), { ok: false, reason: 'unknown_parcel' });
    });
    it('lô đợt mới khi đợt chưa mở → wave_not_open', () => {
      const s = baseState(); // openedWaves chỉ có w0
      assert.deepEqual(buyParcelAllowedFor(syntheticWave1Corner, s), { ok: false, reason: 'wave_not_open' });
    });
    it('lô đợt mới đang thi công → wave_not_open', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      s.wavesUnderConstruction = { w1: 12 };
      s.day = 11;
      assert.deepEqual(buyParcelAllowedFor(syntheticWave1Corner, s), { ok: false, reason: 'wave_not_open' });
    });
    it('mua được lô đợt đã mở xong với đúng giá', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      const price = parcelPrice(syntheticWave1Corner);
      assert.equal(price, 12_000 * 6 * 13 * 1.6, 'giá = PARCEL_BASE_PRICE × số ô × hệ số góc đường chính');
      assert.deepEqual(buyParcelAllowedFor(syntheticWave1Corner, s), { ok: true, price });
    });
    it('không đủ tiền → not_enough_money kèm price', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      s.money = 100;
      const price = parcelPrice(syntheticWave1Corner);
      assert.deepEqual(buyParcelAllowedFor(syntheticWave1Corner, s), { ok: false, reason: 'not_enough_money', price });
    });
    it('đã sở hữu → already_owned', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      s.ownedParcelIds = [...s.ownedParcelIds, syntheticWave1Corner.id];
      assert.deepEqual(buyParcelAllowedFor(syntheticWave1Corner, s), { ok: false, reason: 'already_owned' });
    });
  });

  describe('validateParcelOwnedForPlacement', () => {
    it('lô W0 luôn hợp lệ', () => {
      assert.equal(validateParcelOwnedForPlacement('lot-west', []), null);
    });
    it('lô không tồn tại → unknown_parcel', () => {
      assert.equal(validateParcelOwnedForPlacement('nope', ['lot-center']), 'unknown_parcel');
    });
    it('lô đợt mới chưa mua → parcel_not_owned', () => {
      // Lô W1 chưa có thật trong game-data nên test lõi trực tiếp với lô tổng hợp.
      assert.equal(validateParcelOwnedForPlacementFor(syntheticWave1Corner, []), 'parcel_not_owned');
      assert.equal(validateParcelOwnedForPlacementFor(syntheticWave1Corner, ['synthetic-w1-corner']), null);
    });
  });

  describe('buyParcelAllowed với lô đợt mới THẬT trong RECLAMATION_WAVES (w1..w4)', () => {
    it('lô W1 chưa mở đợt → wave_not_open', () => {
      const s = baseState(); // openedWaves chỉ có w0
      assert.deepEqual(buyParcelAllowed(s, 'w1-corner'), { ok: false, reason: 'wave_not_open' });
    });
    it('mua được lô W1 đã mở xong với đúng giá góc đường chính', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      const price = parcelPrice({ id: 'w1-corner', rect: { x0: 42, x1: 47, y0: 8, y1: 12 }, wave: 1, frontageRoadId: 'main', frontage: { corner: true } });
      assert.equal(price, 12_000 * 6 * 5 * 1.6, 'giá = PARCEL_BASE_PRICE × số ô × hệ số góc đường chính');
      assert.deepEqual(buyParcelAllowed(s, 'w1-corner'), { ok: true, price });
    });
    it('đã sở hữu lô W1 → already_owned', () => {
      const s = baseState();
      s.openedWaves = ['w0', 'w1'];
      s.ownedParcelIds = [...s.ownedParcelIds, 'w1-corner'];
      assert.deepEqual(buyParcelAllowed(s, 'w1-corner'), { ok: false, reason: 'already_owned' });
    });
    it('validateParcelOwnedForPlacement cho W1 chưa mua → parcel_not_owned', () => {
      assert.equal(validateParcelOwnedForPlacement('w1-corner', ['lot-center']), 'parcel_not_owned');
      assert.equal(validateParcelOwnedForPlacement('w1-corner', ['lot-center', 'w1-corner']), null);
    });
  });

  describe('expansionBudgetAt', () => {
    it('đủ ngân sách khi mới dùng ít ô', () => {
      const r = expansionBudgetAt(60, ['w0', 'w1'], 10);
      assert.equal(r.ok, true);
      assert.equal(r.remaining, expansionBudgetAtLevel(60) + 24 - 10, 'budget = mốc cấp + thưởng đợt mở');
    });
    it('thiếu ngân sách khi dùng quá', () => {
      const r = expansionBudgetAt(5, ['w0'], expansionBudgetAtLevel(5) + 1);
      assert.equal(r.ok, false);
      assert.equal(r.remaining, -1);
    });
    it('thưởng cộng theo từng đợt đã mở', () => {
      const base = expansionBudgetAt(20, ['w0'], 0);
      const withBonus = expansionBudgetAt(20, ['w0', 'w1', 'w2'], 0);
      assert.equal(withBonus.remaining - base.remaining, 24 + 24, 'w1 + w2 mỗi đợt +24');
    });
  });

  describe('customerTrafficMultiplier', () => {
    it('lô W0 hệ số 1 (mặt đường chính)', () => {
      assert.equal(customerTrafficMultiplier('lot-west'), 1);
    });
    it('lô không tồn tại mặc định 1', () => {
      assert.equal(customerTrafficMultiplier('lot-moon'), 1);
    });
  });

  describe('D5 location value — khách theo hệ số vị trí LÔ (spec "Location value")', () => {
    // Lô W1..W4 chưa đặt được tòa THẬT (chưa vào PARCEL_MAP, chưa renderer) nên dùng lô TỔNG HỢP (LandParcel chế)
    // để chứng minh TỈ LỆ D5: góc ngã tư đường chính 1.25 > mặt chính 1.0 > góc nam 0.9 > mặt nam 0.75.
    const synthetic = (id: string, frontageRoadId: string, corner: boolean): LandParcel =>
      ({ id, rect: { x0: 42, x1: 47, y0: 8, y1: 12 }, wave: 1, frontageRoadId, frontage: { corner } });
    const cornerMain = synthetic('t-corner-main', 'main', true);
    const faceMain = synthetic('t-face-main', 'main', false);
    const cornerSouth = synthetic('t-corner-south', 'south', true);
    const faceSouth = synthetic('t-face-south', 'south', false);

    it('hệ số khách từng vị trí đúng D5 (provisional)', () => {
      assert.equal(parcelTrafficMultiplier(cornerMain), 1.25);
      assert.equal(parcelTrafficMultiplier(faceMain), 1.0);
      assert.equal(parcelTrafficMultiplier(cornerSouth), 0.9);
      assert.equal(parcelTrafficMultiplier(faceSouth), 0.75);
    });

    it('thứ tự khách: góc chính > mặt chính > góc nam > mặt nam', () => {
      const a = parcelTrafficMultiplier(cornerMain);
      const b = parcelTrafficMultiplier(faceMain);
      const c = parcelTrafficMultiplier(cornerSouth);
      const d = parcelTrafficMultiplier(faceSouth);
      assert.ok(a > b && b > c && c > d, `kỳ vọng 1.25>1>0.9>0.75, thực ${a},${b},${c},${d}`);
    });

    it('nhịp sinh khách tòa phụ = BUILDING_TRAFFIC_SHARE × hệ số khách lô (cơ chế D5)', () => {
      // drink = 0.05 → góc chính > mặt chính > đường nam; W0 mặt chính ra đúng share (không đổi golden).
      assert.equal(effectiveSecondaryBuildingTrafficShare('drink', faceMain), 0.05);
      assert.ok(effectiveSecondaryBuildingTrafficShare('drink', cornerMain) > 0.05);
      assert.ok(effectiveSecondaryBuildingTrafficShare('drink', faceMain) > effectiveSecondaryBuildingTrafficShare('drink', faceSouth));
      // xoi = 0.02, cùng thứ tự.
      assert.equal(effectiveSecondaryBuildingTrafficShare('xoi', faceMain), 0.02);
      assert.ok(effectiveSecondaryBuildingTrafficShare('xoi', cornerMain) > effectiveSecondaryBuildingTrafficShare('xoi', faceMain));
      // tòa không có share → 0.
      assert.equal(effectiveSecondaryBuildingTrafficShare('main', faceMain), 0);
    });

    it('mô phỏng cân bằng ba vị trí cho quán nước và tiệm xôi: góc > mặt chính > nam', () => {
      const pair = (buildingId: string) => [cornerMain, faceMain, faceSouth].map(p => effectiveSecondaryBuildingTrafficShare(buildingId, p));
      const [c, m, s] = pair('drink');
      assert.ok(c > m && m > s, 'drink: góc chính > mặt chính > đường nam');
      const [xc, xm, xs] = pair('xoi');
      assert.ok(xc > xm && xm > xs, 'xoi: góc chính > mặt chính > đường nam');
    });
  });

  describe('cityTierFrom / cityGrowthFactor', () => {
    it('tier đơn điệu theo số đợt mở', () => {
      let prev = -1;
      for (let n = 0; n <= RECLAMATION_WAVES.length; n++) {
        const opened = RECLAMATION_WAVES.slice(0, n).map(w => w.id);
        const tier = cityTierFrom(opened, 1);
        assert.ok(tier >= prev, `tier không giảm khi thêm đợt (${prev} -> ${tier})`);
        prev = tier;
      }
    });
    it('tier nằm trong 0..5', () => {
      for (let i = 0; i < 6; i++) {
        const tier = cityTierFrom(['w0'], i);
        assert.ok(tier >= 0 && tier <= 5);
      }
    });
    it('cityGrowthFactor 0.6 → 1.4 theo tier', () => {
      assert.equal(cityGrowthFactor(0), 0.6);
      assert.equal(cityGrowthFactor(5), 1.4);
      assert.ok(cityGrowthFactor(5) > cityGrowthFactor(2));
    });
    it('cityGrowthFactor clamp ngoài 0..5', () => {
      assert.equal(cityGrowthFactor(-3), 0.6);
      assert.equal(cityGrowthFactor(9), 1.4);
    });
  });

  console.log('  ✓ khai hoang: reclaimWave, mua lô, lô sở hữu, ngân sách, hệ số khách, thi công, cityTier');
}

// Chạy độc lập khi gọi trực tiếp bằng tsx (không cần nối vào test-runner.ts).
const isDirect = typeof process !== 'undefined' && process.argv?.[1]?.includes('reclamation.test');
if (isDirect) runReclamationTests();
