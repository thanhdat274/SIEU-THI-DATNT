import assert from 'node:assert/strict';
import {
  AVENUES, NEIGHBORHOOD_LOTS, NEIGHBORHOOD_PX, NEIGHBORHOOD_QUALITY, NPC_BUDGET, PARK, ROAD_MAP, STREET_VEHICLE_RULES, TRAFFIC_X_RANGE, VEHICLE_BUDGET,
  ZOOM_LEVELS, detailForZoom, npcRingOf, parkAppeal, roadLaneY, snapZoom, trafficDensity, vehicleMix, DIALOGUE_TOPICS, dialogueWeatherOf,
} from '@game/data';
import { StreetTrafficManager } from './street-traffic';
import { NeighborhoodLife, shelterCapacity, type LifeContext, type NeighborNpcView } from './neighborhood-life';
import { pickConversation, topicScore } from './neighborhood-chat';
import { Mulberry32Rng } from './staff';

const VIEW_ALL = { x0: NEIGHBORHOOD_PX.x0, y0: NEIGHBORHOOD_PX.y0, x1: NEIGHBORHOOD_PX.x1, y1: NEIGHBORHOOD_PX.y1 };
const PARK_PX = { x0: PARK.area.x0 * 32, y0: PARK.area.y0 * 32, x1: PARK.area.x1 * 32, y1: PARK.area.y1 * 32 };

const ctxAt = (hourDecimal: number, rain = 0, weatherId = 'sunny', day = 3): LifeContext => ({
  hour: Math.floor(hourDecimal), minute: Math.floor((hourDecimal % 1) * 60), day, weekday: (day - 1) % 7, rain, weatherId,
});

/** Chạy NeighborhoodLife `hours` giờ game (1 giây thực = 1 phút game), gọi `collect` mỗi lần cập nhật. */
function runLife(life: NeighborhoodLife, start: number, hours: number, opts: { rain?: number; weatherId?: string; quality?: 'low' | 'medium' | 'high'; detail?: 'near' | 'mid' | 'far'; collect?: (hour: number) => void } = {}): void {
  const dt = 0.2;
  const total = Math.round((hours * 60) / dt);
  for (let i = 0; i < total; i++) {
    const hour = start + (i * dt) / 60;
    life.update(dt, ctxAt(hour, opts.rain ?? 0, opts.weatherId ?? 'sunny'), VIEW_ALL, opts.detail ?? 'far', opts.quality ?? 'high');
    opts.collect?.(hour);
  }
}

export function runNeighborhoodTests(): void {
  // ---- Zoom / LOD: chỉ các mức giữ pixel nguyên, mức xa 0,5 có sẵn
  assert.deepEqual([...ZOOM_LEVELS], [0.5, 1, 2, 3]);
  assert.equal(snapZoom(0.6), 0.5);
  assert.equal(snapZoom(0.8), 1);
  assert.equal(snapZoom(1.4), 1);
  assert.equal(snapZoom(2.6), 3);
  assert.equal(snapZoom(NaN), 1);
  assert.equal(snapZoom(-3), 1);
  assert.equal(detailForZoom(3), 'near');
  assert.equal(detailForZoom(1), 'mid');
  assert.equal(detailForZoom(0.5), 'far');

  // ---- Mật độ giao thông: giờ × thứ × thời tiết × loại đường
  const d = (h: number, m = 0, wd = 2, rain = 0, road = ROAD_MAP.main) => trafficDensity(h, m, wd, rain, road);
  assert.ok(d(3) < 0.05, 'Khuya rất thưa');
  assert.ok(d(5, 20) < 0.2, 'Trước 05:30 vẫn thưa');
  assert.ok(d(7, 30) >= 0.98, 'Đỉnh sáng 07:30');
  assert.ok(d(18) >= 0.98, 'Đỉnh chiều 18:00');
  assert.ok(d(12) > 0.4 && d(12) < 0.6, 'Trưa trung bình');
  assert.ok(d(7, 30) > d(12) && d(12) > d(3), 'Thứ tự: đỉnh > trưa > khuya');
  assert.ok(d(21) < d(18) && d(21) > d(22, 30), 'Tối giảm dần');
  assert.ok(d(18, 0, 2, 0.4) < d(18) && d(18, 0, 2, 0.4) > d(18, 0, 2, 0.7), 'Mưa càng to càng thưa');
  assert.ok(d(18, 0, 2, 0.25) > 0.8 * d(18), 'Mưa nhẹ chỉ giảm nhẹ');
  assert.ok(d(18, 0, 2, 1) < 0.35 * d(18), 'Giông giảm mạnh');
  assert.ok(d(7, 30, 6) < d(7, 30, 2), 'Chủ nhật đỉnh sáng thưa hơn ngày thường');
  assert.ok(d(18, 0, 2, 0, ROAD_MAP.south) < 0.35 * d(18), 'Đường nhỏ ít xe hơn đường chính');
  for (let h = 0; h < 24; h += 0.25) { const v = d(h); assert.ok(v >= 0 && v <= 1, 'Mật độ luôn trong 0..1'); }
  assert.ok(Number.isFinite(trafficDensity(NaN, NaN, NaN, NaN)), 'Dữ liệu xấu không ra NaN');

  // ---- Loại xe theo giờ/đường
  const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  assert.ok(sum(vehicleMix(7, 'main')) > 0.9);
  assert.equal(vehicleMix(12, 'residential').minibus, 0, 'Đường nhỏ không xe buýt');
  assert.ok(vehicleMix(12, 'main').truck > vehicleMix(18, 'main').truck, 'Ban ngày nhiều xe tải/giao hàng hơn giờ tan tầm');
  assert.ok(vehicleMix(7, 'main', 1).bicycle < vehicleMix(7, 'main', 0).bicycle, 'Mưa ít xe đạp');

  // ---- Giao thông thật: nhiều đường, nhiều loại xe, đúng làn, không chồng, ngân sách
  const flow = (hour: number, rain: number, seconds: number, seed = 5150) => {
    const m = new StreetTrafficManager();
    m.warmUp(hour, rain, seed, { minute: 0, weekday: 2 });
    const seen = new Set<string>(); const types = new Map<string, number>(); let maxCount = 0; let overlaps = 0; let offLane = 0;
    for (let t = 0; t < seconds; t += 0.25) {
      m.update(0.25, hour, rain, seed, { minute: 0, weekday: 2 });
      const vs = m.getVehicles();
      maxCount = Math.max(maxCount, vs.length);
      for (const v of vs) {
        if (!seen.has(v.id)) { seen.add(v.id); types.set(v.type, (types.get(v.type) ?? 0) + 1); }
        const road = ROAD_MAP[v.roadId ?? 'main'];
        if (!v.isDeparting && v.position.y !== roadLaneY(road, v.direction)) offLane++;
        assert.ok(v.position.x >= TRAFFIC_X_RANGE.min - 1 && v.position.x <= TRAFFIC_X_RANGE.max + 1, 'Xe không ra ngoài biên');
      }
      for (const a of vs) for (const b of vs) {
        if (a.id >= b.id || a.direction !== b.direction || (a.roadId ?? 'main') !== (b.roadId ?? 'main')) continue;
        const gap = Math.abs(a.position.x - b.position.x) - STREET_VEHICLE_RULES.halfLength[a.type] - STREET_VEHICLE_RULES.halfLength[b.type];
        if (gap < -1) overlaps++;
      }
    }
    return { spawned: seen.size, types, maxCount, overlaps, offLane };
  };
  const night = flow(3, 0, 900);
  const morning = flow(7.5, 0, 900);
  const evening = flow(18, 0, 900);
  const stormEvening = flow(18, 0.95, 900);
  const heavy = flow(18, 0.6, 900);
  const midday = flow(12, 0, 900);
  assert.ok(night.spawned <= 12, `Ban đêm rất ít xe (đếm ${night.spawned})`);
  assert.ok(morning.spawned > 4 * night.spawned && morning.spawned >= 40, `Sáng đông xe (${morning.spawned} vs đêm ${night.spawned})`);
  assert.ok(evening.spawned >= morning.spawned * 0.8, 'Chiều/tối đông như đỉnh sáng');
  assert.ok(midday.spawned < morning.spawned && midday.spawned > night.spawned, 'Trưa trung bình');
  assert.ok(heavy.spawned < evening.spawned * 0.8, 'Mưa to giảm xe');
  assert.ok(stormEvening.spawned < evening.spawned * 0.5, `Giông giảm mạnh (${stormEvening.spawned} vs ${evening.spawned})`);
  for (const f of [night, morning, evening, midday, heavy, stormEvening]) {
    assert.equal(f.overlaps, 0, 'Xe cùng làn không chồng nhau');
    assert.equal(f.offLane, 0, 'Xe luôn đi đúng làn của đường');
    assert.ok(f.maxCount <= VEHICLE_BUDGET, 'Không vượt ngân sách xe');
  }
  const types = new Set([...morning.types.keys(), ...evening.types.keys(), ...midday.types.keys()]);
  for (const t of ['motorbike', 'car', 'truck', 'bicycle', 'minibus']) assert.ok(types.has(t), `Có xe loại ${t}`);

  // Ngân sách chất lượng thấp ít xe hơn nhưng không rỗng
  const low = new StreetTrafficManager(); low.setBudgetScale(NEIGHBORHOOD_QUALITY.low.vehicles);
  assert.ok(low.getVehicleBudget() < new StreetTrafficManager().getVehicleBudget() && low.getVehicleBudget() >= 4);
  for (let t = 0; t < 600; t += 0.5) low.update(0.5, 8, 0, 77, { minute: 0, weekday: 2 });
  assert.ok(low.getVehicles().length <= low.getVehicleBudget());

  // Đường phụ có xe và chạy đúng làn riêng
  const multi = new StreetTrafficManager();
  multi.warmUp(7.5, 0, 9, { minute: 30, weekday: 2 });
  for (let t = 0; t < 300; t += 0.5) multi.update(0.5, 7, 0, 9, { minute: 30, weekday: 2 });
  assert.ok(new Set(multi.getVehicles().map((v) => v.roadId)).size >= 2, 'Có xe trên nhiều tuyến đường');

  // Xe nhường vạch qua đường của NPC nền: không xe nào chạy vào vùng khi có người chờ
  {
    const m = new StreetTrafficManager([{ id: 'c1', type: 'car', variant: 1, direction: 'right', roadId: 'school', position: { x: -400, y: roadLaneY(ROAD_MAP.school, 'right') }, speed: 70 }]);
    m.setExternalCrossings([{ roadId: 'school', x0: -200, x1: -150 }]);
    let maxFront = -Infinity;
    for (let t = 0; t < 30; t += 0.1) { m.update(0.1, 12, 0, 1, { minute: 0, weekday: 2 }); const v = m.getVehicles().find((x) => x.id === 'c1'); if (v) maxFront = Math.max(maxFront, v.position.x + STREET_VEHICLE_RULES.halfLength.car); }
    assert.ok(maxFront <= -200 + 1, `Xe dừng trước vạch NPC (mũi xe ${maxFront.toFixed(1)})`);
    m.setExternalCrossings([]);
    for (let t = 0; t < 30; t += 0.1) m.update(0.1, 12, 0, 1, { minute: 0, weekday: 2 });
    assert.ok((m.getVehicles().find((x) => x.id === 'c1')?.position.x ?? 1e9) > -150, 'Hết người qua thì xe chạy tiếp');
  }

  // ---- Bố cục
  assert.ok(NEIGHBORHOOD_LOTS.length >= 50, 'Có nhiều nhà trong khu phố');
  assert.ok(new Set(NEIGHBORHOOD_LOTS.map((l) => l.kind)).size === 3, 'Có nhà dân, nhà phố và chung cư');
  for (const l of NEIGHBORHOOD_LOTS) {
    assert.ok(l.x * 32 >= NEIGHBORHOOD_PX.x0 && (l.x + l.w) * 32 <= NEIGHBORHOOD_PX.x1 + 64, `Nhà ${l.id} trong vùng khu phố`);
    for (const a of AVENUES) assert.ok(!(l.x + l.w > a.x0 && l.x < a.x1), `Nhà ${l.id} không chồng đường dọc ${a.id}`);
  }
  for (let i = 0; i < NEIGHBORHOOD_LOTS.length; i++) for (let j = i + 1; j < NEIGHBORHOOD_LOTS.length; j++) {
    const a = NEIGHBORHOOD_LOTS[i], b = NEIGHBORHOOD_LOTS[j];
    if (a.frontY !== b.frontY) continue;
    assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x, `Nhà ${a.id} và ${b.id} không chồng nhau`);
  }
  assert.equal(npcRingOf(304, 380), 'near');
  assert.equal(npcRingOf(-1200, 380), 'far');

  // ---- Hội thoại theo ngữ cảnh
  const rng = (seed: number) => { const r = new Mulberry32Rng(seed); return () => r.next(); };
  for (const topic of DIALOGUE_TOPICS) for (const lines of topic.lines) { assert.ok(lines.length >= 2 && lines.length <= 3, `Chủ đề ${topic.id} 2–3 câu`); for (const l of lines) assert.ok(l.length <= 44, `Câu ngắn gọn: ${l}`); }
  assert.equal(dialogueWeatherOf('storm', 0.9), 'storm');
  assert.equal(dialogueWeatherOf('sunny', 0.5), 'rain');
  let rainTalk = 0;
  for (let i = 0; i < 60; i++) {
    const lines = pickConversation({ phase: 'noon', weather: 'rain', place: 'street', typeA: 'walker', typeB: 'walker' }, rng(i + 1));
    if (lines.some((l) => /mưa|ô|trú|chạy/i.test(l))) rainTalk++;
  }
  assert.ok(rainTalk >= 36, `Trời mưa thì phần lớn nói chuyện mưa (${rainTalk}/60)`);
  const stormLine = pickConversation({ phase: 'noon', weather: 'storm', place: 'street', typeA: 'walker', typeB: 'walker' }, rng(7));
  assert.ok(/trú|sấm|giông/i.test(stormLine.join(' ')), 'Giông thì nhắc chỗ trú');
  assert.equal(topicScore(DIALOGUE_TOPICS.find((t) => t.id === 'storm')!, { phase: 'noon', weather: 'clear', place: 'street', typeA: 'walker', typeB: 'walker' }), -1);

  // ---- Dân cư nền
  const peakOf = (start: number, hours: number, o: Parameters<typeof runLife>[3] = {}, seed = 42) => {
    const life = new NeighborhoodLife(seed);
    let maxActive = 0; const maxRing = { near: 0, middle: 0, far: 0 };
    runLife(life, start, hours, { ...o, collect: () => {
      const ring = { near: 0, middle: 0, far: 0 }; let active = 0;
      life.forEachVisible((n) => { active++; ring[n.ring]++; });
      maxActive = Math.max(maxActive, active);
      for (const k of ['near', 'middle', 'far'] as const) maxRing[k] = Math.max(maxRing[k], ring[k]);
    } });
    return { life, maxActive, maxRing };
  };
  const a = peakOf(7, 3);
  const b = peakOf(7, 3);
  assert.equal(a.maxActive, b.maxActive, 'Cùng hạt giống → cùng kết quả');
  assert.ok(a.maxActive >= 15, `Buổi sáng có nhiều NPC (đỉnh ${a.maxActive})`);
  const budgetTotal = NPC_BUDGET.near + NPC_BUDGET.middle + NPC_BUDGET.far;
  assert.ok(a.maxActive <= budgetTotal, `Không vượt ngân sách tổng (${a.maxActive} ≤ ${budgetTotal})`);
  for (const ring of ['near', 'middle', 'far'] as const) assert.ok(a.maxRing[ring] <= NPC_BUDGET[ring], `Vòng ${ring} trong ngân sách`);
  const lowSim = peakOf(7, 3, { quality: 'low' });
  assert.ok(lowSim.maxActive < a.maxActive && lowSim.maxActive > 0, 'Chất lượng thấp ít NPC hơn nhưng không trống');
  assert.ok(lowSim.life.getStats().npcs < a.life.getStats().npcs, 'Số NPC tạo ra theo chất lượng');

  // Nhiều loại NPC, có người đi qua tiệm, trường, công viên trong một ngày
  const kinds = new Set<string>(); let nearShop = false; let atSchool = false; let inPark = false;
  const dayLife = new NeighborhoodLife(42); let dayMax = 0;
  runLife(dayLife, 7, 15, { collect: () => {
    let active = 0;
    dayLife.forEachVisible((n) => {
      active++; kinds.add(n.type);
      if (Math.hypot(n.x - 304, n.y - 378) < 120) nearShop = true;
      if (n.y < -22 * 32 && n.y > -31 * 32 && n.x > 8 * 32 && n.x < 36 * 32) atSchool = true;
      if (n.x >= PARK_PX.x0 && n.x <= PARK_PX.x1 && n.y >= PARK_PX.y0 && n.y <= PARK_PX.y1) inPark = true;
    });
    dayMax = Math.max(dayMax, active);
  } });
  assert.ok(kinds.size >= 8, `Nhiều loại NPC (${kinds.size})`);
  assert.ok(nearShop && atSchool && inPark, `NPC ghé tiệm (${nearShop}), trường (${atSchool}), công viên (${inPark})`);
  assert.ok(dayMax <= budgetTotal, 'Cả ngày không vượt ngân sách (không sinh vô hạn)');
  assert.ok(dayLife.getStats().npcs <= 130, 'Tổng số NPC cố định, không tăng theo thời gian');

  // Trường theo giờ: sáng nhiều học sinh vào, giữa buổi ít, chiều ra về, tối vắng
  const countStudents = (start: number, hours: number) => {
    const life = new NeighborhoodLife(42); let peak = 0;
    const lead = start - 0.5; // chạy dẫn 30 phút để việc "vào học" kịp bắt đầu thật
    runLife(life, lead, hours + 0.5, { collect: (h) => {
      if (h < start) return;
      let c = 0;
      life.forEachVisible((n) => { if ((n.type === 'student' || n.type === 'child') && n.y < -22.5 * 32 && n.y > -31 * 32) c++; });
      peak = Math.max(peak, c);
    } });
    return peak;
  };
  const sMorning = countStudents(6.9, 1), sNoon = countStudents(9.5, 1), sAfternoon = countStudents(16.7, 1), sNight = countStudents(20.5, 1);
  assert.ok(sMorning >= 3, `Sáng học sinh vào trường (${sMorning})`);
  assert.ok(sAfternoon >= 3, `Chiều học sinh ra về (${sAfternoon})`);
  assert.ok(sNoon < sMorning && sNight === 0, `Giữa buổi/đêm vắng (${sNoon}, ${sNight})`);

  // Công viên theo thời tiết: nắng nhiều, mưa lớn vắng, giông trống
  const parkPeak = (rain: number, weatherId: string) => {
    const life = new NeighborhoodLife(42); let peak = 0;
    runLife(life, 9, 4, { rain, weatherId, collect: () => {
      let c = 0;
      life.forEachVisible((n) => { if (!n.sheltered && n.pose !== 'walking' && n.x >= PARK_PX.x0 && n.x <= PARK_PX.x1 && n.y >= PARK_PX.y0 && n.y <= PARK_PX.y1) c++; }); // chỉ tính người ngồi/đứng chơi; người đang chạy đi trú hay đi ngang không tính
      peak = Math.max(peak, c);
    } });
    return peak;
  };
  const pc = parkPeak(0, 'sunny'), pr = parkPeak(0.6, 'rainy'), ps = parkPeak(0.95, 'storm');
  assert.ok(pc >= 3, `Trời quang công viên có người (${pc})`);
  assert.ok(pr < pc, `Mưa to công viên vắng hơn (${pr} < ${pc})`);
  assert.equal(ps, 0, `Giông công viên không còn ai ngồi chơi (${ps})`);
  assert.ok(parkAppeal(0, 'sunny') > parkAppeal(0.4, 'rainy') && parkAppeal(0.4, 'rainy') > parkAppeal(0.9, 'storm'));

  // Trú mưa: có lượt tìm chỗ trú khi mưa to; trời quang không ai trú
  assert.ok(peakOf(8, 4, { rain: 0.8, weatherId: 'heavy_rain' }).life.getStats().shelterTrips > 0, 'Mưa to thì có NPC tìm chỗ trú');
  assert.equal(peakOf(8, 1).life.getStats().shelterTrips, 0, 'Trời quang không ai trú');
  // Mái không bị dồn quá sức chứa của chính nó (bề ngang / SHELTER_PX_PER_PERSON, tối thiểu 4), kể cả khi mưa kéo dài
  {
    assert.equal(shelterCapacity({ x0: 0, x1: 6 * 32 }), 9, 'Mái rộng 6 ô chứa 9 người (20 px/người)');
    assert.equal(shelterCapacity({ x0: 0, x1: 40 }), 4, 'Mái hẹp vẫn chứa tối thiểu 4 người');
    const life = new NeighborhoodLife(42); let maxLoad = 0; let worstOver = -Infinity; let worst = '';
    runLife(life, 8, 4, { rain: 0.9, weatherId: 'heavy_rain', collect: () => {
      for (const s of life.getShelterLoads()) {
        maxLoad = Math.max(maxLoad, s.load);
        if (s.load - s.capacity > worstOver) { worstOver = s.load - s.capacity; worst = `${s.load}/${s.capacity} trên mái ${s.widthPx} px`; }
      }
    } });
    assert.ok(maxLoad > 0, 'Mưa kéo dài thì có người trú mái');
    assert.ok(worstOver <= 0, `Sức chứa mái được giữ (đông nhất so với sức chứa: ${worst})`);
  }

  // Trò chuyện: có xảy ra, có bong bóng, quay mặt vào nhau, đứng yên khi nói, kết thúc và không kẹt
  const talk = new NeighborhoodLife(42);
  const seenBubbles = new Set<string>(); let chatMax = 0;
  const posAtChat = new Map<string, { x: number; y: number }>();
  let facingOk = 0; let facingTotal = 0;
  runLife(talk, 7, 6, { detail: 'near', collect: () => {
    chatMax = Math.max(chatMax, talk.getStats().activeChats);
    const chatting: NeighborNpcView[] = [];
    talk.forEachVisible((n) => {
      if (n.bubble) seenBubbles.add(n.bubble);
      if (n.pose === 'chatting') chatting.push({ ...n });
    });
    for (const n of chatting) {
      const prev = posAtChat.get(n.id);
      if (prev) assert.ok(Math.hypot(prev.x - n.x, prev.y - n.y) < 0.01, 'Đang nói chuyện thì đứng yên');
      posAtChat.set(n.id, { x: n.x, y: n.y });
    }
    for (const id of [...posAtChat.keys()]) if (!chatting.some((c) => c.id === id)) posAtChat.delete(id);
    for (let p = 0; p < chatting.length; p++) for (let q = p + 1; q < chatting.length; q++) {
      const A = chatting[p], B = chatting[q];
      if (Math.abs(A.x - B.x) > 36 || Math.abs(A.y - B.y) > 16) continue;
      facingTotal++;
      const horiz = Math.abs(B.x - A.x) >= Math.abs(B.y - A.y);
      if (!horiz || (B.x > A.x ? A.facing === 'right' && B.facing === 'left' : A.facing === 'left' && B.facing === 'right')) facingOk++;
    }
  } });
  const tstats = talk.getStats();
  assert.ok(tstats.chatsStarted >= 3, `Có hội thoại xảy ra (${tstats.chatsStarted})`);
  assert.ok(seenBubbles.size >= 4, `Có nhiều câu thoại khác nhau (${seenBubbles.size})`);
  assert.ok(chatMax <= NEIGHBORHOOD_QUALITY.high.bubbles, 'Số hội thoại cùng lúc trong giới hạn');
  assert.ok(facingTotal === 0 || facingOk / facingTotal >= 0.9, `Hai người quay mặt vào nhau (${facingOk}/${facingTotal})`);
  let stuck = 0;
  runLife(talk, 13, 0.4, { detail: 'near' });
  talk.forEachVisible((n) => { if (n.pose === 'chatting' && n.bubbleAge > 20) stuck++; });
  assert.equal(stuck, 0, 'Không NPC nào kẹt trong hội thoại');

  // Dữ liệu xấu không làm hỏng
  const robust = new NeighborhoodLife(1);
  robust.update(NaN, ctxAt(7), VIEW_ALL, 'far');
  robust.update(-1, ctxAt(7), VIEW_ALL, 'far');
  robust.update(1e9, ctxAt(7), VIEW_ALL, 'far');
  robust.update(0.1, { ...ctxAt(7), rain: NaN }, VIEW_ALL, 'far');
  robust.forEachVisible((n) => { assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), 'Tọa độ NPC hữu hạn'); });

  console.log('  ✓ Passed: Khu phố mở rộng — zoom/LOD, mật độ và loại xe, đường phụ, nhường vạch NPC, dân cư theo lịch, trường/công viên theo giờ và thời tiết, trú mưa, hội thoại');
}
