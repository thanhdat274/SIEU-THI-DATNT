import assert from 'node:assert/strict';
import { SHELTER_RULES, isUnderShelter, nearestAwningTargetX, roofProximityAt, setAwningOpen, shelterZoneAt, AWNING_SPANS, ROOF_EAVES, SHELTER_ZONES } from '@game/data';
import { ambientMix } from './ambient-audio';
import { rainSpeedMultiplier } from './rain-protection';
import { StreetTrafficManager } from './street-traffic';
import { newShelterSeek, stepShelterSeek } from './shelter-seek';

export function runShelterTests(): void {
  // Khu vực: trong cửa hàng là 'building', dải dưới mái hiên là 'awning', giữa đường thì không.
  assert.equal(shelterZoneAt(300, 200)?.kind, 'building');
  assert.equal(shelterZoneAt(300, 380)?.kind, 'awning');
  assert.equal(isUnderShelter(600, 380), false);
  assert.ok(nearestAwningTargetX(300), 'Đứng gần mái hiên thì có đích trú');
  assert.equal(nearestAwningTargetX(700, 40), null, 'Xa quá tầm thì không đi trú');

  // Một vòng trú: tìm -> tới -> đứng -> rời; không tìm lại mỗi khung hình, có thời gian chờ.
  const s = newShelterSeek();
  let seeks = 0;
  let x = 420;
  const dt = 0.1;
  for (let i = 0; i < 4000; i++) {
    const rain = i < 1500 ? 0.9 : 0.1;
    const r = stepShelterSeek(s, x, rain, dt, true, 40);
    if (r.action === 'seek') seeks++;
    if (r.action === 'seek' || s.phase === 'seeking') x += Math.sign(s.targetX - x) * Math.min(Math.abs(s.targetX - x), 40 * dt);
  }
  assert.equal(seeks, 1, 'Chỉ quyết định đi trú một lần cho một đợt mưa');
  assert.equal(s.phase, 'none', 'Hết mưa thì trở về trạng thái thường');
  // Mưa nhẹ thì không tìm chỗ trú.
  const calm = newShelterSeek();
  assert.equal(stepShelterSeek(calm, 300, SHELTER_RULES.seekRain - 0.1, 1, true, 40).action, 'none');
  // Chỗ trú không tồn tại trong tầm: dừng chờ rồi mới cân nhắc lại.
  const far = newShelterSeek();
  assert.equal(stepShelterSeek(far, 640, 1, 1, true, 40).action, 'none');
  assert.ok(far.cooldown > 0, 'Từ chối thì có thời gian chờ');
  // Mưa NaN không làm hỏng.
  assert.equal(stepShelterSeek(newShelterSeek(), 300, Number.NaN, 1, true, 40).action, 'none');


  // Mái hiên tòa phụ chỉ tính khi tòa đã mở; hình học mái hiên, khu trú và nước chảy dùng chung một nguồn.
  setAwningOpen('xoi', false);
  assert.equal(shelterZoneAt(60, 384), null, 'Tiệm xôi chưa mở: không có mái hiên để trú');
  assert.equal(nearestAwningTargetX(60, 40), null);
  setAwningOpen('xoi', true);
  assert.equal(shelterZoneAt(60, 384)?.kind, 'awning');
  setAwningOpen('xoi', false);
  for (const z of SHELTER_ZONES.filter((q) => q.awning)) assert.deepEqual([z.x0, z.x1], [AWNING_SPANS[z.awning!].x0, AWNING_SPANS[z.awning!].x1], 'Khu trú = bề ngang mái hiên');
  for (const e of ROOF_EAVES) assert.ok(e.x0 >= AWNING_SPANS[e.awning].x0 && e.x1 <= AWNING_SPANS[e.awning].x1, 'Nước chảy nằm trong mái hiên: ' + e.id);

  // Độ gần mái: xa nhỏ, gần lớn, dưới mái = 1, ra xa lại giảm đều (đây là đầu vào của tiếng mưa trên mái).
  const prox = [640, 520, 440, 380, 352, 300].map((x) => roofProximityAt(x, 384));
  assert.equal(prox[0], 0);
  for (let i = 1; i < prox.length; i++) assert.ok(prox[i] >= prox[i - 1], 'Càng gần mái càng lớn: ' + prox.join(','));
  assert.equal(roofProximityAt(300, 384), 1);
  assert.equal(roofProximityAt(300, 200), 1, 'Trong cửa hàng');
  const roofVol = [0, 0.4, 1].map((p) => ambientMix({ rainIntensity: 0.9, roofProximity: p, hour: 12, isStoreOpen: true }).roof);
  assert.ok(roofVol[0] === 0 && roofVol[1] > 0 && roofVol[2] > roofVol[1], 'Tiếng mưa mái: xa 0, gần vừa, dưới mái lớn nhất');
  assert.ok(ambientMix({ rainIntensity: 1, roofProximity: 1, hour: 12, isStoreOpen: true }).roof >= ambientMix({ rainIntensity: 0.55, roofProximity: 1, hour: 12, isStoreOpen: true }).roof, 'Giông ồn hơn mưa vừa');

  // Tiếng chim: quang > nhiều mây > mưa nhẹ; mưa vừa và giông im; ban đêm im.
  const birds = (rain: number, cloud: number, wind: number, hour = 10) => ambientMix({ rainIntensity: rain, cloudIntensity: cloud, windIntensity: wind, hour, isStoreOpen: true }).birds;
  assert.ok(birds(0, 0.1, 0.08) > birds(0, 0.7, 0.2) && birds(0, 0.7, 0.2) > birds(0.15, 0.65, 0.1), 'Chim giảm dần theo mây/mưa');
  assert.equal(birds(0.55, 0.8, 0.3), 0);
  assert.equal(birds(1, 1, 0.9), 0);
  assert.equal(birds(0, 0.1, 0.08, 23), 0);

  // Tốc độ đi: nấc 1,00/1,05/1,10/1,15, to hơn vừa, giông nhanh nhất; người đi bộ thật đi quãng đường đúng bằng hệ số, chỉ nhân một lần.
  assert.ok(rainSpeedMultiplier(0) === 1 && rainSpeedMultiplier(0.4) > 1 && rainSpeedMultiplier(0.88) > rainSpeedMultiplier(0.55) && rainSpeedMultiplier(1) > rainSpeedMultiplier(0.88));
  assert.ok(Math.abs(rainSpeedMultiplier(1) - 1.15) < 1e-9);
  const distance = (rain: number): number => {
    const t = new StreetTrafficManager();
    t.addPedestrian({ id: 'p', direction: 'right', state: 'walking', x: 500, y: 380, speed: 40 });
    const x0 = t.getPedestrians()[0].position.x;
    for (let i = 0; i < 20; i++) t.update(0.1, 12, rain, 5);
    return t.getPedestrians()[0].position.x - x0;
  };
  const d0 = distance(0);
  const d1 = distance(0.5);
  assert.ok(d0 > 10, 'Người đi bộ có di chuyển: ' + d0);
  assert.ok(Math.abs(d1 / d0 - rainSpeedMultiplier(0.5)) < 0.02, 'Tỉ lệ quãng đường ' + (d1 / d0) + ' ≈ ' + rainSpeedMultiplier(0.5));

  // Nhiều người trú cùng một mái hiên không chồng lên cùng một điểm.
  const targets = new Set<number>();
  for (let k = 0; k < 8; k++) targets.add(Math.round(nearestAwningTargetX(160, 400, k / 8)!.targetX));
  assert.ok(targets.size >= 6, 'Điểm đứng được rải ra: ' + [...targets].join(','));

  // Bão + đông người: 14 người đi bộ quanh mái hiên tiệm chính; không ai chồng lên nhau, mỗi người chỉ quyết định đi trú
  // một lần cho một đợt bão, mọi tọa độ hữu hạn, hết bão thì đều rời đi.
  type Internal = { pedestrians: Array<{ id: string; x: number; y: number; state: string; shelter?: { phase: string } }> };
  const crowd = new StreetTrafficManager();
  for (let i = 0; i < 14; i++) crowd.addPedestrian({ id: 'c' + i, direction: i % 2 ? 'left' : 'right', state: 'walking', x: 100 + i * 45, y: 376 + (i % 3) * 4, speed: 30 + i * 2 });
  const peds = (crowd as unknown as Internal).pedestrians;
  const entered = new Map<string, number>();
  const wasSheltering = new Set<string>();
  let minGap = Infinity;
  for (let t = 0; t < 240; t += 0.25) {
    crowd.update(0.25, 12, 1, 9);
    for (const p of peds) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'Tọa độ hữu hạn');
      const sheltering = p.shelter?.phase === 'seeking' || p.shelter?.phase === 'sheltered';
      if (sheltering && !wasSheltering.has(p.id)) entered.set(p.id, (entered.get(p.id) ?? 0) + 1);
      if (sheltering) wasSheltering.add(p.id); else wasSheltering.delete(p.id);
    }
    const parked = peds.filter((p) => p.shelter?.phase === 'sheltered');
    for (let a = 0; a < parked.length; a++) for (let b = a + 1; b < parked.length; b++) if (Math.abs(parked[a].y - parked[b].y) < 8) minGap = Math.min(minGap, Math.abs(parked[a].x - parked[b].x));
  }
  assert.ok(entered.size >= 5, 'Có nhiều người đi trú: ' + entered.size);
  for (const [id, n] of entered) assert.ok(n <= 1, id + ' quyết định trú ' + n + ' lần trong một đợt bão');
  assert.ok(minGap >= 6, 'Không đứng chồng lên nhau: khoảng cách nhỏ nhất ' + minGap);
  for (let t = 0; t < 120; t += 0.25) crowd.update(0.25, 12, 0, 9);
  assert.equal(peds.filter((p) => p.shelter?.phase === 'sheltered').length, 0, 'Hết bão thì mọi người rời mái hiên');
}
