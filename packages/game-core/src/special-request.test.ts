import assert from 'node:assert/strict';
import {
  MAX_CONCURRENT_SPECIAL_REQUESTS,
  MAX_SPECIAL_REQUESTS_PER_DAY,
  SPECIAL_REQUEST_MAP,
  SPECIAL_REQUEST_UNLOCK_LEVEL,
  SPECIAL_REQUESTS,
  validateSpecialRequests,
} from '@game/data';
import {
  absMinute,
  advanceSpecialRequests,
  canFulfillSpecialRequest,
  createSpecialRequestState,
  fulfillSpecialRequest,
  isFulfillable,
  maybeOpenSpecialRequest,
  type ActiveSpecialRequest,
  type SpecialRequestState,
} from './special-request';

/**
 * Yêu cầu đặc biệt khách VIP — phần lõi THUẦN (tính năng đề xuất #2). Chạy độc lập
 * `tsx src/special-request.test.ts`; export `runSpecialRequestTests` để nối test-runner.
 */

export function runSpecialRequestTests(): void {
  // ---- Data catalog nhất quán ----
  assert.deepEqual(validateSpecialRequests(), [], 'catalog yêu cầu đặc biệt hợp lệ (không lỗi)');
  assert.ok(SPECIAL_REQUESTS.length >= 3, 'có ít nhất vài template');
  for (const def of SPECIAL_REQUESTS) {
    assert.equal(SPECIAL_REQUEST_MAP[def.id].id, def.id, 'map phản chiếu đúng template');
  }

  // ---- Khởi tạo ----
  const init = createSpecialRequestState();
  assert.deepEqual(init.active, [], 'khởi tạo không có yêu cầu');
  assert.equal(init.vexedCount, 0);

  // ---- Sinh: đóng khóa theo cấp (dưới unlock không bao giờ mở) ----
  {
    let hit = false;
    let st = createSpecialRequestState();
    for (let m = 0; m < 2000; m++) {
      const r = maybeOpenSpecialRequest(st, { day: 1, minute: m, worldSeed: 'abc', playerLevel: SPECIAL_REQUEST_UNLOCK_LEVEL - 1 });
      st = r.state;
      if (r.opened) hit = true;
    }
    assert.equal(hit, false, 'cấp dưới ngưỡng mở khóa → không sinh yêu cầu');
  }

  // ---- Sinh: deterministic (cùng ctx → cùng kết quả) ----
  {
    const st = createSpecialRequestState();
    const ctx = { day: 1, minute: 300, worldSeed: 'seed-x', playerLevel: 20 };
    const a = maybeOpenSpecialRequest(st, ctx);
    const b = maybeOpenSpecialRequest(st, ctx);
    assert.deepEqual(a.state, b.state, 'cùng ctx → cùng trạng thái');
    assert.deepEqual(a.opened, b.opened, 'cùng ctx → cùng yêu cầu mở (deterministic)');
  }

  // ---- Sinh: với cấp mở khóa, cánh cửa mở sẽ sinh ít nhất một lần (không flaky) ----
  {
    let openedCount = 0;
    let st = createSpecialRequestState();
    for (let m = 0; m < 4000; m++) {
      const r = maybeOpenSpecialRequest(st, { day: 1, minute: m, worldSeed: 'seed-y', playerLevel: 20 });
      st = r.state;
      if (r.opened) openedCount += 1;
      if (openedCount > 0) break;
    }
    assert.ok(openedCount >= 1, 'cấp đủ → sinh được yêu cầu khi roll trúng (trần vẫn tôn trọng)');
  }

  // ---- Sinh: tôn trọng trần đồng thời & trần mỗi ngày ----
  {
    let st = createSpecialRequestState();
    // Nhồi đầy trần đồng thời bằng yêu cầu sống (active) thủ công.
    const fakeDef = Object.values(SPECIAL_REQUEST_MAP)[0];
    const fill: ActiveSpecialRequest[] = [];
    for (let i = 0; i < MAX_CONCURRENT_SPECIAL_REQUESTS; i++) {
      fill.push({
        instanceId: `fill-${i}`,
        defId: fakeDef.id,
        status: 'active',
        openDay: 1,
        openMinute: absMinute(1, 0),
        expiresMinute: absMinute(1, 600),
      });
    }
    let stFull: SpecialRequestState = { ...st, active: fill };
    const capRes = maybeOpenSpecialRequest(stFull, { day: 1, minute: 120, worldSeed: 's', playerLevel: 20 });
    assert.equal(capRes.opened, null, 'Đạt trần đồng thời → không mở thêm');

    // Trần mỗi ngày: chạy nhiều phút nhưng chỉ được mở tối đa MAX_SPECIAL_REQUESTS_PER_DAY.
    let st2 = createSpecialRequestState();
    let opened = 0;
    for (let m = 0; m < 6000; m++) {
      const r = maybeOpenSpecialRequest(st2, { day: 2, minute: m, worldSeed: 'seed-z', playerLevel: 20 });
      st2 = r.state;
      if (r.opened) opened += 1;
      if (r.opened && opened >= MAX_SPECIAL_REQUESTS_PER_DAY) break;
    }
    assert.ok(opened <= MAX_SPECIAL_REQUESTS_PER_DAY, `mỗi ngày tối đa ${MAX_SPECIAL_REQUESTS_PER_DAY}`);
  }

  // ---- Vòng đời: hết hạn (advance) ----
  {
    let st: SpecialRequestState = {
      ...createSpecialRequestState(),
      active: [
        { instanceId: 'a', defId: 'sr_qua_tang_ho_hao', status: 'active', openDay: 1, openMinute: absMinute(1, 0), expiresMinute: absMinute(1, 6) },
        { instanceId: 'b', defId: 'sr_tiec_kem_trai_cay', status: 'active', openDay: 1, openMinute: absMinute(1, 0), expiresMinute: absMinute(1, 8) },
      ],
    };
    const beforeVexed = st.vexedCount;
    // Chưa hết hạn (minute 5 < 6) → không đổi.
    let adv = advanceSpecialRequests(st, { day: 1, minute: 5 });
    assert.equal(adv.active[0].status, 'active', 'chưa quá hạn thì vẫn active');
    assert.equal(adv.active[1].status, 'active');
    // Quá hạn tới (minute 20 > 8) → cả hai expired; cái VIP (kem trái cây) tăng vexedCount.
    adv = advanceSpecialRequests(st, { day: 1, minute: 20 });
    assert.equal(adv.active[0].status, 'expired', 'mì gói (regular) hết hạn');
    assert.equal(adv.active[1].status, 'expired', 'kem trái cây (vip) hết hạn');
    assert.equal(adv.vexedCount, beforeVexed + 1, 'VIP bị bỏ qua → +1 vexed');
  }

  // ---- canFulfill: thiếu hàng / đủ hàng / không tìm thấy ----
  {
    const st: SpecialRequestState = {
      ...createSpecialRequestState(),
      active: [
        { instanceId: 'r1', defId: 'sr_qua_tang_ho_hao', status: 'active', openDay: 1, openMinute: absMinute(1, 0), expiresMinute: absMinute(1, 6) },
      ],
    };
    const all = () => true;
    const none = () => false;
    const resOk = canFulfillSpecialRequest(st, 'r1', all);
    assert.equal(resOk.ok, true, 'đủ hàng → ok');
    const resMiss = canFulfillSpecialRequest(st, 'r1', none);
    assert.equal(resMiss.ok, false, 'thiếu hàng → không ok');
    assert.ok((resMiss.missing ?? []).length >= 1, 'kể món thiếu');
    assert.equal(canFulfillSpecialRequest(st, 'nope', all).ok, false, 'không tìm thấy → không ok');
  }

  // ---- fulfill: thành công / idempotent / quá hạn / trạng thái sai ----
  {
    let st: SpecialRequestState = {
      ...createSpecialRequestState(),
      active: [
        { instanceId: 'r1', defId: 'sr_qua_tang_ho_hao', status: 'active', openDay: 1, openMinute: absMinute(1, 0), expiresMinute: absMinute(1, 6) },
        { instanceId: 'r2', defId: 'sr_tiec_kem_trai_cay', status: 'active', openDay: 1, openMinute: absMinute(1, 0), expiresMinute: absMinute(1, 8) },
      ],
    };
    // Hoàn thành r2 trong hạn.
    const done = fulfillSpecialRequest(st, 'r2', { day: 1, minute: 4 });
    assert.equal(done.success, true, 'hoàn thành trong hạn');
    assert.equal(done.reward?.defId, 'sr_tiec_kem_trai_cay');
    assert.ok(done.reward && done.reward.money > 0 && done.reward.reputation > 0, 'có thưởng tiền + uy tín');
    // Idempotent: lặp lại không lỗi nữa.
    const again = fulfillSpecialRequest(done.state, 'r2', { day: 1, minute: 5 });
    assert.equal(again.success, false, 'không hoàn thành lại lần thứ hai');
    assert.equal(again.reason, 'Đã hoàn thành trước đó');
    let st2 = done.state;
    // Quá hạn (r1 hết hạn minute>6).
    st2 = advanceSpecialRequests(st2, { day: 1, minute: 99 });
    const late = fulfillSpecialRequest(st2, 'r1', { day: 1, minute: 99 });
    assert.equal(late.success, false, 'yêu cầu hết hạn → không hoàn thành được');
    assert.equal(isFulfillable(st2, 'r1'), false, 'hết hạn → không còn fulfillable');
  }
}
