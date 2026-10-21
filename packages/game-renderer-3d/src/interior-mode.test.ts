import assert from 'node:assert/strict';
import {
  INTERIOR_FADE_SECONDS, INTERIOR_OUTSIDE, enterInterior, exitInterior, insideFootprint, interiorView, observePlayer, stepInteriorMode,
  type InteriorModeState,
} from './interior-mode';

const near = (a: number, b: number, msg: string): void => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} khác ${b}`);
const run = (s: InteriorModeState, seconds: number, step = 0.05): InteriorModeState => {
  for (let t = 0; t < seconds - 1e-9; t += step) s = stepInteriorMode(s, step);
  return s;
};

// Ngoài: không mờ, không cô lập; bước thời gian không đổi gì.
assert.deepEqual(interiorView(INTERIOR_OUTSIDE), { fade: 0, isolated: false });
assert.equal(stepInteriorMode(INTERIOR_OUTSIDE, 1), INTERIOR_OUTSIDE);

// Vào: mờ dần lên đỉnh 1 ở giữa, cô lập từ giữa, rồi sáng lại và vào hẳn.
{
  let s = enterInterior(INTERIOR_OUTSIDE, 'main');
  assert.equal(s.phase, 'entering');
  assert.equal(s.buildingId, 'main');
  assert.deepEqual(interiorView(s), { fade: 0, isolated: false });
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS * 0.25);
  near(interiorView(s).fade, 0.5, 'một phần tư: mờ nửa chừng');
  assert.equal(interiorView(s).isolated, false, 'chưa cô lập trước giữa chuyển cảnh');
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS * 0.25);
  near(interiorView(s).fade, 1, 'giữa chuyển cảnh: tối hẳn');
  assert.equal(interiorView(s).isolated, true, 'cô lập tại giữa chuyển cảnh (lúc đang tối)');
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS * 0.25);
  near(interiorView(s).fade, 0.5, 'sáng lại');
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS);
  assert.equal(s.phase, 'inside');
  assert.deepEqual(interiorView(s), { fade: 0, isolated: true });
  assert.equal(stepInteriorMode(s, 5), s, 'ở trong thì thời gian không đổi trạng thái');
}

// Ra: bỏ cô lập từ giữa, xong thì về ngoài và quên tòa.
{
  let s = run(enterInterior(INTERIOR_OUTSIDE, 'main'), INTERIOR_FADE_SECONDS + 0.1);
  s = exitInterior(s);
  assert.equal(s.phase, 'leaving');
  assert.equal(interiorView(s).isolated, true, 'đầu chuyển cảnh ra: còn cô lập');
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS * 0.5);
  assert.equal(interiorView(s).isolated, false, 'từ giữa chuyển cảnh: thế giới ngoài hiện lại');
  near(interiorView(s).fade, 1, 'giữa chuyển cảnh ra: tối hẳn');
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS);
  assert.deepEqual(s, INTERIOR_OUTSIDE, 'xong chuyển cảnh: về ngoài, sạch trạng thái');
}

// Đảo chiều giữa chừng giữ liên tục độ mờ và cô lập.
{
  let s = stepInteriorMode(enterInterior(INTERIOR_OUTSIDE, 'main'), INTERIOR_FADE_SECONDS * 0.3);
  const before = interiorView(s);
  s = exitInterior(s);
  assert.equal(s.phase, 'leaving');
  const after = interiorView(s);
  near(after.fade, before.fade, 'vào rồi ra ngay: độ mờ liên tục');
  assert.equal(after.isolated, before.isolated, 'cô lập liên tục');
  s = stepInteriorMode(s, INTERIOR_FADE_SECONDS * 0.31);
  assert.equal(s.phase, 'outside', 'ra bằng đúng quãng đã vào');

  let t = stepInteriorMode(enterInterior(INTERIOR_OUTSIDE, 'main'), INTERIOR_FADE_SECONDS * 0.8);
  t = exitInterior(t);
  const b = interiorView(t);
  t = enterInterior(t, 'main');
  assert.equal(t.phase, 'entering');
  near(interiorView(t).fade, b.fade, 'ra rồi vào lại: độ mờ liên tục');
  assert.equal(interiorView(t).isolated, b.isolated);
}

// Lệnh thừa không đổi gì; không vào tòa khác khi đang ở tòa này.
{
  assert.equal(exitInterior(INTERIOR_OUTSIDE), INTERIOR_OUTSIDE, 'ra khi đang ở ngoài: bỏ qua');
  const inside = run(enterInterior(INTERIOR_OUTSIDE, 'main'), INTERIOR_FADE_SECONDS + 0.1);
  assert.equal(enterInterior(inside, 'main'), inside, 'vào lại tòa đang ở: bỏ qua');
  assert.equal(enterInterior(inside, 'other'), inside, 'đang ở tòa này không nhảy sang tòa khác');
  const leaving = exitInterior(inside);
  assert.equal(enterInterior(leaving, 'other'), leaving, 'đang ra khỏi tòa này không vào tòa khác');
  assert.equal(exitInterior(leaving), leaving, 'ra hai lần: bỏ qua');
  assert.equal(stepInteriorMode(inside, -1), inside);
}

// Bước ra cửa: người chơi từng ở trong rồi ra ngoài chân diện thì thoát; vào từ ngoài không bị đá ra.
{
  const f = { x0: 6, z0: 3, x1: 22, z1: 11 };
  assert.equal(insideFootprint({ x: 8, z: 5 }, f), true);
  assert.equal(insideFootprint({ x: 22, z: 5 }, f), false, 'mép x1 là ngoài');
  assert.equal(insideFootprint({ x: 8, z: 11 }, f), false, 'mép z1 là ngoài');
  assert.equal(insideFootprint({ x: 5.9, z: 5 }, f), false);

  // Người chơi ở ngoài lúc vào: không thoát dù đang ở ngoài.
  let s = run(enterInterior(INTERIOR_OUTSIDE, 'main'), INTERIOR_FADE_SECONDS + 0.1);
  s = observePlayer(s, false);
  assert.equal(s.phase, 'inside', 'chưa từng ở trong thì ở ngoài không bị đá ra');
  // Bước vào trong rồi ra ngoài: thoát.
  s = observePlayer(s, true);
  assert.equal(s.seenInside, true);
  assert.equal(observePlayer(s, true), s, 'vẫn ở trong: không đổi');
  s = observePlayer(s, false);
  assert.equal(s.phase, 'leaving', 'bước ra ngoài thì thoát');

  // Đang chuyển cảnh vào mà người chơi chớp ra ngoài: chưa thoát (chỉ thoát khi đã ở trong hẳn).
  let e = enterInterior(INTERIOR_OUTSIDE, 'main');
  e = observePlayer(e, true);
  e = observePlayer(e, false);
  assert.equal(e.phase, 'entering', 'đang chuyển cảnh vào: không thoát');
  // Ở ngoài hoặc đang ra thì quan sát không làm gì.
  assert.equal(observePlayer(INTERIOR_OUTSIDE, false), INTERIOR_OUTSIDE);
  const lv = exitInterior(run(enterInterior(INTERIOR_OUTSIDE, 'main'), INTERIOR_FADE_SECONDS + 0.1));
  assert.equal(observePlayer(lv, false), lv);
}

console.log('PASS interior-mode: vào/ra đối xứng, cô lập ở giữa chuyển cảnh, đảo chiều liên tục, lệnh thừa, bước ra cửa mới thoát');
