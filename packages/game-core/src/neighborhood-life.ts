import { StreetVehicleState } from '@game/shared';
import {
  APARTMENT_PARKING, AVENUE_WALK_X, STREET_VEHICLE_RULES, NEIGHBORHOOD_LOD, NEIGHBORHOOD_LOTS, NEIGHBORHOOD_QUALITY, NEIGHBORHOOD_SHELTERS, NPC_BUDGET, NPC_TYPES,
  PARK, PARK_BENCHES, PARK_PATHS, ROAD_MAP, SCHOOL, SCHOOL_GATE_PX, SHOP_AWNING_PX, SHOP_FRONT, TRAFFIC_ROADS, WALK_LINES, WORK_PORTALS,
  dialoguePhaseOf, dialogueWeatherOf, npcRingOf, parkAppeal, activeShelterZones, type DetailLevel, type NeighborNpcType, type NeighborhoodLot,
  type NeighborhoodQuality, type NpcRing, type NpcTypeDef,
} from '@game/data';
import { pickConversation, type ChatPlace } from './neighborhood-chat';
import { Mulberry32Rng } from './staff';
import { hashSeed } from './weather';

/**
 * Sinh hoạt nền của khu phố: dân cư đi lại theo lịch (nhà → đường → tiệm/trường/công viên/đi làm → nhà), gặp nhau thì
 * trò chuyện (bong bóng thoại giả), tránh mưa, và thưa dần khi thời tiết xấu. Không lưu, không đổi gameplay: chỉ hình ảnh.
 * Ngân sách NPC theo vòng khoảng cách tới cửa tiệm và theo chất lượng; NPC ngoài tầm nhìn chỉ cập nhật ở tần số thấp.
 */

type LineId = 'schoolNorth' | 'northFront' | 'mainNorth' | 'southNorth' | 'southFront';
interface Vec { x: number; y: number }
/** Điểm đến: nằm trên một vỉa hè (`line`); `entry`+`via` mô tả đường trong khuôn viên (công viên, sân trường) từ vỉa hè tới điểm. */
interface Pt extends Vec { line: LineId; entry?: Vec; via?: Vec[] }
interface Waypoint extends Vec { gate?: string; endGate?: boolean }

type Step =
  | { kind: 'appear'; at: Pt }
  | { kind: 'go'; to: Pt }
  | { kind: 'dwell'; sec: number; pose: 'idle' | 'sit' }
  | { kind: 'vanish' };

type ErrandKind = 'school_in' | 'school_lunch' | 'school_out' | 'work_out' | 'work_back' | 'shop_trip' | 'park_visit' | 'stroll' | 'jog' | 'courier_run' | 'vend' | 'evening_walk';
interface Errand { kind: ErrandKind; start: number; deadline: number; leisure: boolean; done: boolean }

export type NpcPose = 'walking' | 'idle' | 'sitting' | 'chatting';
export type NpcFacing = 'up' | 'down' | 'left' | 'right';

/** Ảnh chụp một NPC cho renderer (chỉ đọc). */
export interface NeighborNpcView {
  id: string;
  type: NeighborNpcType;
  spriteVariant: number;
  tint: number;
  scale: number;
  accessory: NpcTypeDef['accessory'];
  x: number;
  y: number;
  facing: NpcFacing;
  pose: NpcPose;
  ring: NpcRing;
  /** Đang trú mưa dưới mái. */
  sheltered: boolean;
  /** Câu đang nói (chỉ người đang nói có), kèm tuổi (giây) để mờ dần. */
  bubble: string | null;
  bubbleAge: number;
}

interface Chat { partner: Npc; lines: readonly string[]; index: number; timer: number; speaker: boolean }

interface Npc {
  id: string;
  def: NpcTypeDef;
  home: NeighborhoodLot;
  homePt: Pt;
  ring: NpcRing;
  spriteVariant: number;
  tint: number;
  x: number;
  y: number;
  facing: NpcFacing;
  pose: NpcPose;
  active: boolean;
  steps: Step[];
  route: Waypoint[];
  dwell: number;
  dwellPose: 'idle' | 'sit';
  errands: Errand[];
  /** Giờ game (thập phân) sớm nhất được bắt đầu việc kế tiếp; dùng để hoãn khi hết ngân sách. */
  holdUntil: number;
  chat: Chat | null;
  chatCooldown: number;
  shelter: { rect: { x0: number; y0: number; x1: number; y1: number }; held: number } | null;
  /** Đang chờ/đang qua đường này (id đường). */
  crossing: string | null;
  waiting: boolean;
  acc: number;
  decideCooldown: number;
  bubble: string | null;
  bubbleAge: number;
  parkAppealRoll: number;
  /** Điểm đến gần nhất đã hoàn tất (gốc định tuyến cho bước đi kế tiếp). */
  curPt: Pt | null;
}

export interface LifeContext {
  hour: number;
  minute: number;
  day: number;
  weekday: number;
  rain: number;
  weatherId: string;
  vehicles?: readonly StreetVehicleState[];
}

/** Vùng nhìn thấy (px thế giới) để cập nhật đầy đủ chỉ những NPC trong tầm. */
export interface LifeView { x0: number; y0: number; x1: number; y1: number }

const LINE_Y: Record<LineId, number> = { schoolNorth: WALK_LINES.schoolNorth, northFront: WALK_LINES.northFront, mainNorth: WALK_LINES.mainNorth, southNorth: WALK_LINES.southNorth, southFront: WALK_LINES.southFront };
const LINE_ORDER: LineId[] = ['schoolNorth', 'northFront', 'mainNorth', 'southNorth', 'southFront'];
const ROAD_HALF_WIDTH_PX = 24;
const bandLine = (lotId: string): LineId => lotId.startsWith('n1') ? 'schoolNorth' : lotId.startsWith('n2') ? 'northFront' : lotId.startsWith('s2') ? 'southNorth' : lotId.startsWith('s3') ? 'southFront' : 'mainNorth';
const inRect = (x: number, y: number, r: { x0: number; y0: number; x1: number; y1: number }) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const T = 32;
const tileRectPx = (r: { x0: number; y0: number; x1: number; y1: number }) => ({ x0: r.x0 * T, y0: r.y0 * T, x1: r.x1 * T, y1: r.y1 * T });
const PARK_PX = tileRectPx(PARK.area);
const SCHOOL_PX = tileRectPx(SCHOOL.area);
const APARTMENT_PX = tileRectPx({ x0: APARTMENT_PARKING.x0, y0: -7, x1: APARTMENT_PARKING.x1, y1: APARTMENT_PARKING.y1 });

const SHOP_PT: Pt = { x: SHOP_FRONT.x, y: SHOP_FRONT.y, line: 'mainNorth' };
const parkGatePt = (): Pt => ({ x: PARK.gateSouth.x * T, y: WALK_LINES.mainNorth, line: 'mainNorth' });
const schoolGatePt = (): Pt => ({ x: SCHOOL_GATE_PX.x, y: WALK_LINES.schoolNorth, line: 'schoolNorth' });

/** Px bề ngang mái cho mỗi người trú (04/10/2026: 26 → 20 px, tăng ~30% sức chứa). */
export const SHELTER_PX_PER_PERSON = 20;
/** Sức chứa theo bề ngang mái, tối thiểu 4 người. Dùng chung cho chọn mái và kiểm thử. */
export const shelterCapacity = (r: { x0: number; x1: number }): number => Math.max(4, Math.floor((r.x1 - r.x0) / SHELTER_PX_PER_PERSON));

export class NeighborhoodLife {
  private npcs: Npc[] = [];
  private day = -1;
  private seeded = false;
  private quality: NeighborhoodQuality = 'high';
  private lastHour = 7;
  private chatScan = 0;
  private activeChats = 0;
  private stats = { chatsStarted: 0, shelterTrips: 0 };
  /** Vạch qua đường đang có người chờ/đi, để xe nhường (đọc bởi StreetTrafficManager). */
  private crossings: Array<{ roadId: string; x0: number; x1: number }> = [];

  constructor(private readonly seed = 20260504) {}

  public setQuality(q: NeighborhoodQuality): void {
    if (q === this.quality && this.seeded) return;
    this.quality = q;
    if (this.seeded) this.populate();
  }

  public getStats(): { npcs: number; active: number; chatsStarted: number; shelterTrips: number; activeChats: number } {
    return { npcs: this.npcs.length, active: this.npcs.filter((n) => n.active).length, activeChats: this.activeChats, ...this.stats };
  }

  /** Vạch qua đường (không phải vạch có đèn) đang có người, để quản lý giao thông cho xe dừng nhường. */
  public getCrossings(): ReadonlyArray<{ roadId: string; x0: number; x1: number }> {
    return this.crossings;
  }

  public forEachVisible(cb: (npc: NeighborNpcView) => void): void {
    const view: NeighborNpcView = { id: '', type: 'walker', spriteVariant: 0, tint: 0xffffff, scale: 1, accessory: 'none', x: 0, y: 0, facing: 'down', pose: 'idle', ring: 'far', sheltered: false, bubble: null, bubbleAge: 0 };
    for (const n of this.npcs) {
      if (!n.active) continue;
      view.id = n.id; view.type = n.def.id; view.spriteVariant = n.spriteVariant; view.tint = n.tint; view.scale = n.def.scale; view.accessory = n.def.accessory;
      view.x = n.x; view.y = n.y; view.facing = n.facing; view.pose = n.pose; view.ring = n.ring; view.sheltered = n.shelter !== null && n.pose !== 'walking';
      view.bubble = n.bubble; view.bubbleAge = n.bubbleAge;
      cb(view);
    }
  }

  // ------------------------------------------------------------------ dân cư

  private populate(): void {
    this.npcs = [];
    this.activeChats = 0;
    const scale = NEIGHBORHOOD_QUALITY[this.quality].npc;
    const target = Math.round((NPC_BUDGET.near + NPC_BUDGET.middle + NPC_BUDGET.far) * scale * 1.9);
    const rng = new Mulberry32Rng(hashSeed(`neighborhood:${this.seed}`));
    const totalWeight = NPC_TYPES.reduce((sum, t) => sum + t.weight, 0);
    const homes = NEIGHBORHOOD_LOTS;
    for (let i = 0; i < target; i++) {
      let pick = rng.next() * totalWeight;
      let def = NPC_TYPES[0];
      for (const t of NPC_TYPES) { pick -= t.weight; if (pick <= 0) { def = t; break; } }
      const home = homes[Math.floor(rng.next() * homes.length)];
      const line = bandLine(home.id);
      const homePt: Pt = { x: home.door.x + (rng.next() - 0.5) * 16, y: home.door.y, line };
      this.npcs.push({
        id: `nb-${this.seed}-${i}`, def, home, homePt, ring: npcRingOf(home.door.x, home.door.y), spriteVariant: Math.floor(rng.next() * 3),
        tint: def.tints[Math.floor(rng.next() * def.tints.length)], x: homePt.x, y: homePt.y, facing: 'down', pose: 'idle', active: false,
        steps: [], route: [], dwell: 0, dwellPose: 'idle', errands: [], holdUntil: 0, chat: null, chatCooldown: rng.next() * 20, shelter: null,
        crossing: null, waiting: false, acc: rng.next(), decideCooldown: rng.next() * 3, bubble: null, bubbleAge: 0, parkAppealRoll: rng.next(), curPt: homePt,
      });
    }
    this.seeded = true;
    this.day = -1;
  }

  // ------------------------------------------------------------------ lịch trong ngày

  private planDay(n: Npc, day: number, nowHour: number, weekday: number): void {
    const rng = new Mulberry32Rng(hashSeed(`${n.id}:${day}`));
    const r = (a: number, b: number) => a + rng.next() * (b - a);
    const school = weekday < 5;
    const e: Errand[] = [];
    const add = (kind: ErrandKind, start: number, span: number, leisure = false) => e.push({ kind, start, deadline: start + span, leisure, done: false });
    switch (n.def.id) {
      case 'student':
      case 'university_student':
      case 'child':
        if (school) {
          add('school_in', r(6.5, 7.35), 1.2);
          if (rng.next() < 0.4) add('school_lunch', r(11.6, 12.3), 1);
          add('school_out', r(16.5, 17.2), 2);
        } else if (rng.next() < 0.7) add('park_visit', r(8, 17), 2.5, true);
        if (n.def.id === 'child' && rng.next() < 0.6) add('park_visit', r(17.6, 18.8), 1.5, true);
        break;
      case 'office_worker':
        if (school) { add('work_out', r(6.7, 8.3), 1.4); add('work_back', r(17, 19.2), 2.2); }
        else if (rng.next() < 0.6) add('shop_trip', r(9, 17), 3, true);
        if (rng.next() < 0.3) add('evening_walk', r(19.5, 20.5), 1.2, true);
        break;
      case 'elder':
        add('park_visit', r(6.3, 8.6), 2, true);
        if (rng.next() < 0.7) add('shop_trip', r(9, 15), 3, true);
        add('park_visit', r(16.6, 18.4), 1.8, true);
        break;
      case 'parent':
        if (school) { add('school_in', r(6.6, 7.4), 1); add('school_out', r(16.6, 17.2), 1.4); }
        add('shop_trip', r(8, 15), 3, true);
        break;
      case 'courier':
        for (const s of [8, 11, 14.5, 17]) add('courier_run', s + rng.next() * 0.6, 1.4);
        break;
      case 'vendor':
        add('vend', r(6.6, 7.4), 3.5, true);
        add('vend', r(15.6, 16.6), 3.5, true);
        break;
      case 'walker':
        add('stroll', r(7, 9.5), 2, true);
        add('stroll', r(16.5, 19), 2, true);
        if (rng.next() < 0.4) add('park_visit', r(9.5, 15), 3, true);
        break;
      case 'jogger':
        add('jog', r(6.2, 7.6), 1.4, true);
        add('jog', r(17.2, 18.6), 1.4, true);
        break;
      case 'shopper':
        add('shop_trip', r(8, 11), 2, true);
        add('shop_trip', r(14, 18), 2.5, true);
        break;
    }
    // Khởi động nóng: việc đã quá hạn thì bỏ; việc đang trong khung giờ thì bắt đầu ngay (so le vài giây) thay vì chờ.
    for (const er of e) {
      if (er.deadline <= nowHour) er.done = true;
      else if (er.start < nowHour) er.start = nowHour + rng.next() * 0.25;
    }
    n.errands = e.sort((a, b) => a.start - b.start);
  }

  private benchPt(rng: Mulberry32Rng): Pt {
    const b = PARK_BENCHES[Math.floor(rng.next() * PARK_BENCHES.length)];
    const path = PARK_PATHS[1];
    const pathY = ((path.y0 + path.y1) / 2) * T;
    const gate = PARK.gateSouth.x * T;
    return { x: b.x * T, y: b.y * T, line: 'mainNorth', entry: { x: gate, y: WALK_LINES.mainNorth }, via: [{ x: gate, y: pathY }, { x: b.x * T, y: pathY }] };
  }

  private yardPt(rng: Mulberry32Rng): Pt {
    const s = SCHOOL.yardSpots[Math.floor(rng.next() * SCHOOL.yardSpots.length)];
    const g = SCHOOL_GATE_PX.x;
    return { x: s.x, y: s.y, line: 'schoolNorth', entry: { x: g, y: WALK_LINES.schoolNorth }, via: [{ x: g, y: s.y }] };
  }

  private portalPt(rng: Mulberry32Rng): Pt {
    return { x: rng.next() < 0.5 ? WORK_PORTALS.west : WORK_PORTALS.east, y: WALK_LINES.mainNorth, line: 'mainNorth' };
  }

  private startErrand(n: Npc, er: Errand): void {
    const rng = new Mulberry32Rng(hashSeed(`${n.id}:${er.kind}:${er.start.toFixed(2)}`));
    const dw = (a: number, b: number, pose: 'idle' | 'sit' = 'idle'): Step => ({ kind: 'dwell', sec: a + rng.next() * (b - a), pose });
    const home = n.homePt;
    const goHome: Step[] = [{ kind: 'go', to: home }, { kind: 'vanish' }];
    const s: Step[] = [];
    switch (er.kind) {
      case 'school_in': s.push({ kind: 'appear', at: home }, { kind: 'go', to: schoolGatePt() }, { kind: 'go', to: this.yardPt(rng) }, dw(8, 24), { kind: 'vanish' }); break;
      case 'school_lunch': s.push({ kind: 'appear', at: this.yardPt(rng) }, dw(40, 90), { kind: 'vanish' }); break;
      case 'school_out': {
        const roll = rng.next();
        s.push({ kind: 'appear', at: this.yardPt(rng) }, { kind: 'go', to: schoolGatePt() });
        if (roll < 0.28) s.push({ kind: 'go', to: SHOP_PT }, dw(10, 25));
        else if (roll < 0.42) s.push({ kind: 'go', to: this.benchPt(rng) }, dw(50, 120, 'sit'));
        s.push(...goHome);
        break;
      }
      case 'work_out': s.push({ kind: 'appear', at: home }); if (rng.next() < 0.35) s.push({ kind: 'go', to: SHOP_PT }, dw(6, 14)); s.push({ kind: 'go', to: this.portalPt(rng) }, { kind: 'vanish' }); break;
      case 'work_back': s.push({ kind: 'appear', at: this.portalPt(rng) }); if (rng.next() < 0.3) s.push({ kind: 'go', to: SHOP_PT }, dw(6, 14)); s.push(...goHome); break;
      case 'shop_trip': s.push({ kind: 'appear', at: home }, { kind: 'go', to: SHOP_PT }, dw(10, 22), ...goHome); break;
      case 'park_visit': s.push({ kind: 'appear', at: home }, { kind: 'go', to: this.benchPt(rng) }, dw(60, 180, 'sit'), { kind: 'go', to: parkGatePt() }, ...goHome); break;
      case 'stroll': {
        const other = NEIGHBORHOOD_LOTS[Math.floor(rng.next() * NEIGHBORHOOD_LOTS.length)];
        s.push({ kind: 'appear', at: home }, { kind: 'go', to: { x: other.door.x, y: LINE_Y[bandLine(other.id)], line: bandLine(other.id) } });
        if (rng.next() < 0.5) s.push({ kind: 'go', to: SHOP_PT }, dw(6, 14));
        s.push(...goHome);
        break;
      }
      case 'evening_walk': s.push({ kind: 'appear', at: home }, { kind: 'go', to: parkGatePt() }, dw(8, 20), ...goHome); break;
      case 'jog': {
        const path = PARK_PATHS[1];
        const y = ((path.y0 + path.y1) / 2) * T;
        const gate = PARK.gateSouth.x * T;
        const mk = (x: number): Pt => ({ x, y, line: 'mainNorth', entry: { x: gate, y: WALK_LINES.mainNorth }, via: [{ x: gate, y }] });
        s.push({ kind: 'appear', at: home }, { kind: 'go', to: mk(path.x0 * T + 20) }, { kind: 'go', to: mk(path.x1 * T - 20) }, { kind: 'go', to: mk(path.x0 * T + 20) }, { kind: 'go', to: mk(path.x1 * T - 20) }, ...goHome);
        break;
      }
      case 'courier_run': {
        s.push({ kind: 'appear', at: SHOP_PT });
        for (let i = 0; i < 3; i++) {
          const target = NEIGHBORHOOD_LOTS[Math.floor(rng.next() * NEIGHBORHOOD_LOTS.length)];
          s.push({ kind: 'go', to: { x: target.door.x, y: LINE_Y[bandLine(target.id)], line: bandLine(target.id) } }, dw(3, 6));
        }
        s.push({ kind: 'go', to: this.portalPt(rng) }, { kind: 'vanish' });
        break;
      }
      case 'vend': {
        const atSchool = rng.next() < 0.55;
        const spot: Pt = atSchool ? { x: SCHOOL_GATE_PX.x + 60, y: WALK_LINES.schoolNorth, line: 'schoolNorth' } : { x: parkGatePt().x + 70, y: WALK_LINES.mainNorth, line: 'mainNorth' };
        s.push({ kind: 'appear', at: this.portalPt(rng) }, { kind: 'go', to: spot }, dw(600, 900), { kind: 'go', to: this.portalPt(rng) }, { kind: 'vanish' });
        break;
      }
    }
    n.steps = s;
    n.shelter = null;
    n.chat = null;
    this.nextStep(n);
  }

  // ------------------------------------------------------------------ định tuyến vỉa hè

  private lineIndex = (l: LineId) => LINE_ORDER.indexOf(l);

  private route(a: Pt, b: Pt): Waypoint[] {
    const out: Waypoint[] = [];
    // Từ A ra vỉa hè của nó.
    if (a.via && a.entry) { for (let i = a.via.length - 1; i >= 0; i--) out.push({ ...a.via[i] }); out.push({ ...a.entry }); }
    else out.push({ x: a.x, y: LINE_Y[a.line] });
    const startX = out[out.length - 1].x;
    const bEntry: Vec = b.entry ?? { x: b.x, y: LINE_Y[b.line] };
    if (a.line === b.line) {
      out.push({ x: bEntry.x, y: LINE_Y[b.line] });
    } else {
      // Qua đường dọc gần nhất (tổng quãng ngang ngắn nhất), đi dọc rồi quay ra vỉa hè của B.
      const xs = [AVENUE_WALK_X.west, AVENUE_WALK_X.westInner, AVENUE_WALK_X.east, AVENUE_WALK_X.eastInner];
      let avx = xs[0];
      let best = Infinity;
      for (const x of xs) { const d = Math.abs(startX - x) + Math.abs(bEntry.x - x); if (d < best) { best = d; avx = x; } }
      const ya = LINE_Y[a.line];
      const yb = LINE_Y[b.line];
      out.push({ x: avx, y: ya });
      const down = yb > ya;
      const roads = TRAFFIC_ROADS.filter((r) => { const t = r.topRow * T; const bot = (r.topRow + 3) * T; return down ? t > ya && bot < yb : bot < ya && t > yb; })
        .sort((p, q) => (down ? p.topRow - q.topRow : q.topRow - p.topRow));
      for (const road of roads) {
        const top = road.topRow * T - 6;
        const bottom = (road.topRow + 3) * T + 6;
        out.push({ x: avx, y: down ? top : bottom, gate: road.id });
        out.push({ x: avx, y: down ? bottom : top, endGate: true });
      }
      out.push({ x: avx, y: yb });
      out.push({ x: bEntry.x, y: yb });
    }
    if (b.via) for (const v of b.via) out.push({ ...v });
    out.push({ x: b.x, y: b.y });
    return out;
  }

  private nextStep(n: Npc): void {
    for (;;) {
      const step = n.steps.shift();
      if (!step) { n.active = false; n.route = []; n.pose = 'idle'; n.chat = null; n.shelter = null; this.releaseCrossing(n); return; }
      switch (step.kind) {
        case 'appear': n.active = true; n.x = step.at.x; n.y = step.at.y; n.curPt = step.at; continue;
        case 'vanish': n.active = false; n.route = []; n.chat = null; n.shelter = null; this.releaseCrossing(n); n.steps.length = 0; return;
        case 'dwell': n.dwell = step.sec; n.dwellPose = step.pose; n.pose = step.pose === 'sit' ? 'sitting' : 'idle'; n.route = []; return;
        case 'go': n.route = this.route(n.curPt ?? { x: n.x, y: n.y, line: 'mainNorth' }, step.to); n.curPt = step.to; n.pose = 'walking'; return;
      }
    }
  }

  private releaseCrossing(n: Npc): void { n.crossing = null; n.waiting = false; }

  // ------------------------------------------------------------------ vòng cập nhật

  /**
   * Cập nhật toàn bộ. `view` là vùng đang nhìn thấy (px): NPC trong vùng chạy ở `detail`, ngoài vùng ở tần số thấp nhất.
   * `quality` đổi sẽ dựng lại dân cư. Trả về không có gì; đọc kết quả qua `forEachVisible`.
   */
  public update(dt: number, ctx: LifeContext, view: LifeView, detail: DetailLevel, quality: NeighborhoodQuality = 'high'): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (!this.seeded || quality !== this.quality) { this.quality = quality; this.populate(); }
    const hour = ctx.hour + ctx.minute / 60;
    if (ctx.day !== this.day) {
      this.day = ctx.day;
      for (const n of this.npcs) { n.active = false; n.steps = []; n.route = []; n.chat = null; n.shelter = null; this.releaseCrossing(n); n.bubble = null; this.planDay(n, ctx.day, hour, ctx.weekday); }
      this.activeChats = 0;
    }
    this.lastHour = hour;
    const dtCap = Math.min(dt, 0.25);

    const budget = this.ringBudget();
    const ringCount: Record<NpcRing, number> = { near: 0, middle: 0, far: 0 };
    for (const n of this.npcs) if (n.active) ringCount[n.ring]++;

    const hzOnScreen = NEIGHBORHOOD_LOD.behaviorHz[detail];
    const hzOff = NEIGHBORHOOD_LOD.behaviorHz.offscreen;
    const m = NEIGHBORHOOD_LOD.viewMarginPx;
    this.crossings.length = 0;

    for (const n of this.npcs) {
      n.acc += dtCap;
      if (!n.active) {
        if (n.acc < 0.5) continue; // việc chưa tới giờ: kiểm tra thưa
        const wait = n.acc; n.acc = 0;
        this.maybeStartErrand(n, hour, ctx, budget, ringCount, wait);
        continue;
      }
      const onScreen = n.x >= view.x0 - m && n.x <= view.x1 + m && n.y >= view.y0 - m && n.y <= view.y1 + m;
      const interval = 1 / (onScreen ? hzOnScreen : hzOff);
      if (n.crossing) this.registerCrossing(n);
      if (n.acc < interval) continue;
      const step = n.acc; n.acc = 0;
      this.stepNpc(n, step, ctx);
      if (n.crossing) this.registerCrossing(n);
      if (n.bubble) n.bubbleAge += step;
    }

    this.chatScan += dtCap;
    if (this.chatScan >= 0.5) { this.chatScan = 0; this.scanChats(ctx, view); }
  }

  private ringBudget(): Record<NpcRing, number> {
    const s = NEIGHBORHOOD_QUALITY[this.quality].npc;
    return { near: Math.max(2, Math.round(NPC_BUDGET.near * s)), middle: Math.max(3, Math.round(NPC_BUDGET.middle * s)), far: Math.max(3, Math.round(NPC_BUDGET.far * s)) };
  }

  private maybeStartErrand(n: Npc, hour: number, ctx: LifeContext, budget: Record<NpcRing, number>, ringCount: Record<NpcRing, number>, _wait: number): void {
    if (hour < n.holdUntil) return;
    for (const er of n.errands) {
      if (er.done) continue;
      if (hour < er.start) break; // sắp theo giờ bắt đầu
      if (hour >= er.deadline) { er.done = true; continue; }
      // Thời tiết xấu: việc giải trí hoãn/bỏ (công viên trống dần), việc bắt buộc vẫn đi (có ô/áo mưa).
      if (er.leisure) {
        const appeal = parkAppeal(ctx.rain, ctx.weatherId);
        if (er.kind === 'jog' || er.kind === 'stroll' || er.kind === 'park_visit' || er.kind === 'evening_walk' || er.kind === 'vend') {
          if (n.parkAppealRoll > appeal) { if (ctx.rain > 0.3) { er.start = hour + 0.15; continue; } }
        }
        if (ctx.rain >= 0.7) { er.start = hour + 0.2; continue; }
      }
      if (ringCount[n.ring] >= budget[n.ring]) { n.holdUntil = hour + 0.04; return; }
      er.done = true;
      ringCount[n.ring]++;
      this.startErrand(n, er);
      return;
    }
  }

  private stepNpc(n: Npc, dt: number, ctx: LifeContext): void {
    n.decideCooldown -= dt;
    n.chatCooldown = Math.max(0, n.chatCooldown - dt);

    // Đang trò chuyện: đứng yên, quay mặt, đổi câu theo nhịp.
    if (n.chat) { this.stepChat(n, dt); return; }

    // Công viên: nếu thời tiết xấu đi thì người ở đây rời đi sớm.
    if (n.dwell > 0 && n.dwellPose === 'sit' && n.decideCooldown <= 0) {
      n.decideCooldown = 6;
      if (n.parkAppealRoll > parkAppeal(ctx.rain, ctx.weatherId)) n.dwell = Math.min(n.dwell, 1.5);
    }

    // Trú mưa.
    if (this.stepShelter(n, dt, ctx)) return;

    if (n.dwell > 0) {
      n.dwell -= dt;
      n.pose = n.dwellPose === 'sit' ? 'sitting' : 'idle';
      if (n.dwell <= 0) this.nextStep(n);
      return;
    }
    if (!n.route.length) { this.nextStep(n); return; }

    const wp = n.route[0];
    // Chờ qua đường: không đi tiếp khi còn xe trong vùng vạch (xe còn xa sẽ tự phanh nhường nhờ `getCrossings`).
    if (n.waiting) {
      n.pose = 'idle';
      if (this.roadClear(n.crossing!, n.x, ctx)) { n.waiting = false; }
      else return;
    }
    const slow = ctx.rain >= 0.3 ? 1.1 : 1;
    const speed = n.def.speed * slow * (n.def.id === 'jogger' ? 1 : 1);
    const dx = wp.x - n.x; const dy = wp.y - n.y;
    const dist = Math.hypot(dx, dy);
    const move = speed * dt;
    n.pose = 'walking';
    if (dist <= move || dist < 0.5) {
      n.x = wp.x; n.y = wp.y;
      n.route.shift();
      if (wp.endGate) this.releaseCrossing(n);
      else if (wp.gate) { n.crossing = wp.gate; n.waiting = true; }
      if (!n.route.length) this.nextStep(n);
    } else {
      n.x += (dx / dist) * move; n.y += (dy / dist) * move;
      n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
  }

  // ------------------------------------------------------------------ qua đường

  private registerCrossing(n: Npc): void {
    if (!n.crossing) return;
    if (!ROAD_MAP[n.crossing]) return;
    this.crossings.push({ roadId: n.crossing, x0: n.x - ROAD_HALF_WIDTH_PX, x1: n.x + ROAD_HALF_WIDTH_PX });
  }

  /** Không có xe nào đang đè lên vùng vạch hoặc sát vạch tới mức không kịp phanh (xe còn xa sẽ nhường nhờ `getCrossings`). */
  private roadClear(roadId: string, x: number, ctx: LifeContext): boolean {
    const vs = ctx.vehicles;
    if (!vs) return true;
    const zoneL = x - ROAD_HALF_WIDTH_PX - 8;
    const zoneR = x + ROAD_HALF_WIDTH_PX + 8;
    for (const v of vs) {
      if ((v.roadId ?? 'main') !== roadId) continue;
      const half = STREET_VEHICLE_RULES.halfLength[v.type] ?? 32;
      const sign = v.direction === 'right' ? 1 : -1;
      const front = v.position.x + sign * half;
      const rear = v.position.x - sign * half;
      if (Math.max(front, rear) > zoneL && Math.min(front, rear) < zoneR) return false;
      const dist = sign > 0 ? zoneL - front : front - zoneR;
      const speed = v.currentSpeed ?? v.speed;
      if (dist > 0 && dist < (speed * speed) / (2 * STREET_VEHICLE_RULES.decel) + 10) return false;
    }
    return true;
  }

  // ------------------------------------------------------------------ trú mưa

  /** Số người đang trú ở từng mái đang có người (kiểm thử sức chứa). */
  public getShelterOccupancy(): number[] {
    return [...this.shelterLoad().values()];
  }

  /** Mỗi mái đang có người: số người và sức chứa của chính mái đó (kiểm thử không vượt sức chứa). */
  public getShelterLoads(): Array<{ load: number; capacity: number; widthPx: number }> {
    return [...this.shelterLoad()].map(([rect, load]) => {
      const r = rect as { x0: number; x1: number };
      return { load, capacity: shelterCapacity(r), widthPx: r.x1 - r.x0 };
    });
  }

  /** Số người đang trú dưới mỗi mái (theo đối tượng hình chữ nhật), để mái đông thì người sau tìm chỗ khác. */
  private shelterLoad(): Map<object, number> {
    const load = new Map<object, number>();
    for (const n of this.npcs) if (n.active && n.shelter) load.set(n.shelter.rect, (load.get(n.shelter.rect) ?? 0) + 1);
    return load;
  }

  private nearestShelter(x: number, y: number, maxDist: number, checkCapacity = false): { x0: number; y0: number; x1: number; y1: number } | null {
    let best: { x0: number; y0: number; x1: number; y1: number } | null = null;
    let bestD = maxDist;
    const load = checkCapacity ? this.shelterLoad() : null;
    const consider = (r: { x0: number; y0: number; x1: number; y1: number }) => {
      const dx = Math.max(r.x0 - x, 0, x - r.x1);
      const dy = Math.max(r.y0 - y, 0, y - r.y1);
      const d = Math.hypot(dx, dy);
      if (load && (load.get(r) ?? 0) >= shelterCapacity(r)) return; // mái đầy thì bỏ qua
      if (d < bestD) { bestD = d; best = r; }
    };
    for (const s of NEIGHBORHOOD_SHELTERS) consider(s);
    consider(SHOP_AWNING_PX);
    for (const z of activeShelterZones()) if (z.kind === 'awning') consider(z);
    return best;
  }

  /** Trả true nếu NPC đang trú (đã xử lý bước này). */
  private stepShelter(n: Npc, dt: number, ctx: LifeContext): boolean {
    const rain = ctx.rain;
    if (n.shelter) {
      const r = n.shelter.rect;
      // Mỗi người một điểm đứng riêng (theo id) rải khắp mái, không dồn một chỗ.
      const slotX = (hashSeed(`${n.id}:sx`) % 1000) / 1000;
      const slotY = (hashSeed(`${n.id}:sy`) % 1000) / 1000;
      const tx = r.x0 + 12 + slotX * Math.max(1, r.x1 - r.x0 - 24);
      const ty = r.y0 + 8 + slotY * Math.max(1, r.y1 - r.y0 - 14);
      const dx = tx - n.x; const dy = ty - n.y; const d = Math.abs(dx) + Math.abs(dy);
      if (d > 1.5) {
        // Đi theo trục (ngang trước, dọc sau) để không cắt chéo qua nhà/đường.
        const move = n.def.speed * 1.25 * dt;
        if (Math.abs(dx) > 1.5) { const m = Math.min(move, Math.abs(dx)); n.x += Math.sign(dx) * m; n.facing = dx > 0 ? 'right' : 'left'; }
        else { const m = Math.min(move, Math.abs(dy)); n.y += Math.sign(dy) * m; n.facing = dy > 0 ? 'down' : 'up'; }
        n.pose = 'walking';
        return true;
      }
      n.pose = 'idle';
      n.shelter.held += dt;
      if (rain < 0.3 || n.shelter.held > 80) { n.shelter = null; n.pose = n.route.length ? 'walking' : 'idle'; return false; }
      return true;
    }
    if (rain < 0.5 || n.decideCooldown > 0 || n.waiting || n.crossing) return false;
    n.decideCooldown = 8;
    if (n.def.id === 'courier' || n.def.id === 'jogger') return false; // vẫn chạy trong mưa (đã mặc áo mưa)
    if (n.pose === 'sitting' && inRect(n.x, n.y, PARK_PX)) { const s = this.nearestShelter(n.x, n.y, 380, true); if (s) { n.shelter = { rect: s, held: 0 }; this.stats.shelterTrips++; n.dwell = 0; return true; } }
    const underAny = this.nearestShelter(n.x, n.y, 0);
    if (underAny) return false;
    const rect = this.nearestShelter(n.x, n.y, 300, true);
    if (!rect) return false;
    n.shelter = { rect, held: 0 };
    this.stats.shelterTrips++;
    return true;
  }

  // ------------------------------------------------------------------ trò chuyện

  private placeOf(n: Npc): ChatPlace {
    if (Math.hypot(n.x - SHOP_FRONT.x, n.y - SHOP_FRONT.y) < 240) return 'shop';
    if (inRect(n.x, n.y, PARK_PX)) return 'park';
    if (inRect(n.x, n.y, SCHOOL_PX) || Math.hypot(n.x - SCHOOL_GATE_PX.x, n.y - SCHOOL_GATE_PX.y) < 160) return 'school';
    if (inRect(n.x, n.y, APARTMENT_PX)) return 'apartment';
    return 'street';
  }

  private scanChats(ctx: LifeContext, view: LifeView): void {
    const maxChats = NEIGHBORHOOD_QUALITY[this.quality].bubbles;
    if (this.activeChats >= maxChats) return;
    const m = 160;
    // Các cuộc trò chuyện đang diễn ra: không bắt đầu thêm gần đó để bong bóng không chồng lên nhau.
    const busy = this.npcs.filter((n) => n.chat?.speaker);
    const cand = this.npcs.filter((n) => n.active && !n.chat && n.chatCooldown <= 0 && !n.waiting && !n.crossing && n.x >= view.x0 - m && n.x <= view.x1 + m && n.y >= view.y0 - m && n.y <= view.y1 + m);
    for (let i = 0; i < cand.length && this.activeChats < maxChats; i++) {
      const a = cand[i];
      if (a.chat) continue;
      for (let j = i + 1; j < cand.length; j++) {
        const b = cand[j];
        if (b.chat) continue;
        const dx = b.x - a.x; const dy = b.y - a.y;
        if (Math.abs(dx) > 34 || Math.abs(dy) > 14) continue;
        if (busy.some((o) => Math.hypot(o.x - a.x, o.y - a.y) < 96)) continue;
        const roll = new Mulberry32Rng(hashSeed(`${a.id}|${b.id}|${Math.floor(this.lastHour * 10)}`)).next();
        if (roll > 0.55) { a.chatCooldown = 6; b.chatCooldown = 6; continue; }
        this.beginChat(a, b, ctx);
        busy.push(a);
        break;
      }
    }
  }

  private beginChat(a: Npc, b: Npc, ctx: LifeContext): void {
    const rng = new Mulberry32Rng(hashSeed(`${a.id}|${b.id}|${ctx.day}|${Math.floor(this.lastHour * 4)}`));
    const lines = pickConversation({
      phase: dialoguePhaseOf(this.lastHour), weather: dialogueWeatherOf(ctx.weatherId, ctx.rain), place: this.placeOf(a), typeA: a.def.id, typeB: b.def.id,
    }, () => rng.next());
    a.chat = { partner: b, lines, index: 0, timer: 2.4, speaker: true };
    b.chat = { partner: a, lines, index: 0, timer: 2.4, speaker: false };
    a.pose = b.pose = 'chatting';
    a.facing = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x > a.x ? 'right' : 'left') : (b.y > a.y ? 'down' : 'up');
    b.facing = a.facing === 'right' ? 'left' : a.facing === 'left' ? 'right' : a.facing === 'down' ? 'up' : 'down';
    a.bubble = lines[0]; a.bubbleAge = 0; b.bubble = null;
    this.activeChats++;
    this.stats.chatsStarted++;
  }

  private stepChat(n: Npc, dt: number): void {
    const c = n.chat!;
    // Chỉ người đang giữ "đồng hồ" (người nói đầu tiên) điều khiển nhịp; người kia theo.
    const lead = c.speaker;
    if (!lead) { return; }
    c.timer -= dt;
    if (c.timer > 0) return;
    const p = c.partner;
    c.index++;
    if (c.index >= c.lines.length) { this.endChat(n, p); return; }
    c.timer = 2.4;
    const aSpeaks = c.index % 2 === 0;
    n.bubble = aSpeaks ? c.lines[c.index] : null; n.bubbleAge = 0;
    p.bubble = aSpeaks ? null : c.lines[c.index]; p.bubbleAge = 0;
    if (p.chat) p.chat.index = c.index;
  }

  private endChat(a: Npc, b: Npc): void {
    for (const n of [a, b]) {
      n.chat = null; n.bubble = null; n.chatCooldown = 40 + (hashSeed(n.id) % 30);
      n.pose = n.route.length ? 'walking' : (n.dwell > 0 && n.dwellPose === 'sit' ? 'sitting' : 'idle');
    }
    this.activeChats = Math.max(0, this.activeChats - 1);
  }
}
