import assert from 'node:assert/strict';
import { SPECIAL_REQUEST_MAP } from '@game/data';
import {
  createSpecialRequestState,
  advanceSpecialRequests,
  absMinute,
  type SpecialRequestState,
} from './special-request';
import {
  WORD_OF_MOUTH_FACTOR_MAX,
  WORD_OF_MOUTH_MAX_DAYS,
  WORD_OF_MOUTH_MIN_DAYS,
  vexationsFromSpecialRequest,
  wordOfMouthEffect,
  wordOfMouthForVexation,
} from './word-of-mouth';

/**
 * Lời chê / truyền miệng của khách VIP bực bội — phần lõi THUẦN (tính năng đề xuất #1).
 * Ràng buộc: cùng (seed, ngày) → cùng kết quả (chơi lẻ = chơi chung). Export `runWordOfMouthTests`.
 */
export function runWordOfMouthTests(): void {
  // ---- Rút vexation từ trạng thái yêu cầu đặc biệt (chỉ yêu cầu VIP bị bỏ qua) ----
  {
    // Tìm một template VIP có trong catalog.
    const vipDef = Object.values(SPECIAL_REQUEST_MAP).find((d) => d.tier.includes('vip'));
    assert.ok(vipDef, 'có template VIP trong catalog để test');
    const st: SpecialRequestState = {
      ...createSpecialRequestState(),
      active: [
        { instanceId: 'v1', defId: vipDef.id, status: 'expired', openDay: 3, openMinute: absMinute(3, 0), expiresMinute: absMinute(3, 10) },
        { instanceId: 'r1', defId: 'sr_qua_tang_ho_hao', status: 'expired', openDay: 4, openMinute: absMinute(4, 0), expiresMinute: absMinute(4, 10) },
        { instanceId: 'a1', defId: vipDef.id, status: 'active', openDay: 5, openMinute: absMinute(5, 0), expiresMinute: absMinute(5, 99) },
      ],
    };
    const vex = vexationsFromSpecialRequest(st);
    assert.ok(vex.some((v) => v.defId === vipDef.id && v.openDay === 3), 'VIP bị bỏ qua được tính là vexation');
    assert.ok(!vex.some((v) => v.openDay === 4), 'yêu cầu không-VIP không tính');
    assert.ok(!vex.some((v) => v.openDay === 5), 'yêu cầu còn active không tính');
  }

  // ---- Deterministic: cùng (seed, vexation) → cùng cửa sổ & hệ số ----
  {
    const v1a = wordOfMouthForVexation('seedA', { defId: 'x', openDay: 10 });
    const v1b = wordOfMouthForVexation('seedA', { defId: 'x', openDay: 10 });
    assert.deepEqual(v1a, v1b, 'cùng seed+ngày → cùng cửa sổ');
    assert.ok(v1a.fromDay === 11, 'lời chê lan từ hôm sau (openDay+1)');
    const span = v1a.toDay - v1a.fromDay + 1;
    assert.ok(span >= WORD_OF_MOUTH_MIN_DAYS && span <= WORD_OF_MOUTH_MAX_DAYS, 'cửa sổ dài 1–2 ngày');
    assert.ok(v1a.trafficFactor >= 0.7 && v1a.trafficFactor <= WORD_OF_MOUTH_FACTOR_MAX, 'hệ số trong dải');
  }

  // ---- Tác động theo ngày: đúng trong cửa sổ, tắt ngoài cửa sổ ----
  {
    const vex = [{ defId: 'x', openDay: 10 }];
    // Lấy cửa sổ thật từ hàm xác định để kiểm tra biên đúng.
    const src = wordOfMouthForVexation('seedB', vex[0]);
    const inside = wordOfMouthEffect('seedB', vex, src.fromDay);
    assert.equal(inside.active, true, 'trong cửa sổ → active');
    assert.equal(inside.trafficFactor, src.trafficFactor);
    const justBefore = wordOfMouthEffect('seedB', vex, src.fromDay - 1);
    assert.equal(justBefore.active, false, 'trước cửa sổ → không active');
    const after = wordOfMouthEffect('seedB', vex, src.toDay + 1);
    assert.equal(after.active, false, 'sau cửa sổ → không active');
  }

  // ---- Nhiều vexation cùng nguồn gốc ngày → ép trùng cửa sổ → lấy hệ số mạnh nhất (thấp nhất) ----
  {
    // Cùng openDay → cùng fromDay (openDay+1) nên chắc chắn nằm trong cùng cửa sổ tại ngày đó.
    const v1 = wordOfMouthForVexation('seedC', { defId: 'a', openDay: 5 });
    const v2 = wordOfMouthForVexation('seedC', { defId: 'b', openDay: 5 });
    assert.equal(v1.fromDay, v2.fromDay, 'cùng openDay → cùng ngày bắt đầu lan');
    const overlapDay = v1.fromDay;
    const eff = wordOfMouthEffect('seedC', [{ defId: 'a', openDay: 5 }, { defId: 'b', openDay: 5 }], overlapDay);
    const lo = Math.min(v1.trafficFactor, v2.trafficFactor);
    assert.equal(eff.active, true, 'ngày trong cửa sổ của cả hai → active');
    assert.equal(eff.trafficFactor, lo, 'khi trùng lên nhau lấy hệ số mạnh nhất (thấp nhất)');
    assert.equal(eff.sources.length, 2, 'cả hai nguồn đều đang tác động');
  }

  // ---- Tích hợp với special-request: VIP bị bỏ qua qua advance → trở thành nguồn lời chê ----
  {
    const vipDef = Object.values(SPECIAL_REQUEST_MAP).find((d) => d.tier.includes('vip'))!;
    let st: SpecialRequestState = {
      ...createSpecialRequestState(),
      active: [
        { instanceId: 'v9', defId: vipDef.id, status: 'active', openDay: 7, openMinute: absMinute(7, 0), expiresMinute: absMinute(7, 30) },
      ],
    };
    // Quá hạn (minute 40 > 30) → VIP bỏ qua, vexedCount tăng.
    st = advanceSpecialRequests(st, { day: 7, minute: 40 });
    assert.ok(st.vexedCount >= 1, 'VIP bị bỏ qua → vexedCount tăng');
    const vex = vexationsFromSpecialRequest(st);
    assert.ok(vex.some((v) => v.defId === vipDef.id && v.openDay === 7), 'vexation được rút từ trạng thái sau advance');
  }
}
