import { Container, Graphics, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import type { WeatherVisualState } from '@game/core';
import {
  APARTMENT_PARKING, AVENUES, INTERSECTIONS, NEIGHBORHOOD_LOTS, NEIGHBORHOOD_PROPS, hash, rnd, NEIGHBORHOOD_STREET_LAMPS, NEIGHBORHOOD_QUALITY, NEIGHBORHOOD_TILES, PARK, PARK_LAMPS, PARK_PATHS, SCHOOL,
  TRAFFIC_ROADS, type NeighborhoodLot, type NeighborhoodQuality, type RoadDef,
} from '@game/data';
import type { PixelTextureFactory } from './textures';
import { houseLitWindows } from './neighborhood-textures';

const T = 32;
const GRASS = 0x5c7a52;
const SKY = 0xbcd8e8;
/** Đồi cách mép bắc khu phố: đáy lớp đồi nằm ngay mép vùng vẽ. */
const HILL_H = 200;


export interface NeighborhoodSceneFrame {
  /** 0..1: đèn nhân tạo (cửa sổ, đèn đường sáng khi tối). */
  artificial: number;
  /** Màu nhân ngoài trời hiện tại (dùng để suy ra độ tối của đồi). */
  outdoor: number;
  weather: WeatherVisualState | null;
  /** Giây tích lũy (mây trôi). */
  time: number;
  camX: number;
  camY: number;
  viewW: number;
  viewH: number;
  reducedMotion: boolean;
}

const mix = (a: number, b: number, t: number): number => {
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Làm xám màu (giảm bão hòa) theo `amount` 0..1 để đồi xa nhạt đi khi mưa. */
const desaturate = (c: number, amount: number): number => {
  const lum = Math.round(0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255));
  return mix(c, (lum << 16) | (lum << 8) | lum, amount);
};

/**
 * Khu phố tĩnh quanh bản đồ chơi: nền cỏ, đường chính/đường phụ/đường dọc, vỉa hè, công viên + vườn hoa, trường học,
 * bãi xe chung cư, hàng trăm cây/nhà, đồi núi xa (parallax) và ánh đèn đêm. Dựng một lần; chỉ `update` đổi độ sáng đèn
 * và màu đồi theo thời tiết. Mọi sprite dùng khóa texture nguyên, không đổi tỉ lệ → giữ pixel nguyên ở mọi mức zoom.
 */
export class NeighborhoodScene {
  /** Trời + đồi núi (nằm dưới mọi thứ khác). */
  readonly backdrop = new Container();
  /** Nền: cỏ, đường, vỉa hè, sân. */
  readonly ground = new Container();
  /** Công trình và cây (sắp theo chiều sâu). */
  readonly props = new Container();
  /** Biển hiệu chữ. */
  readonly labels = new Container();
  /** Ánh đèn cộng ban đêm. */
  readonly glow = new Container();

  private hills: TilingSprite[] = [];
  private clouds: Array<{ sprite: Sprite; base: number; speed: number; y: number; show: number }> = [];
  private sky = new Graphics();
  private windowGlow = new Graphics();
  private lampGlows: Sprite[] = [];
  private built = false;
  private readonly hillParallax = [0.32, 0.5, 0.7];
  private lastSkyKey = '';

  constructor(private readonly textures: PixelTextureFactory) {
    for (const c of [this.backdrop, this.ground, this.props, this.labels, this.glow]) c.eventMode = 'none';
    this.props.sortableChildren = true;
    this.glow.blendMode = 'add';
  }

  private tex(key: string): Texture { return this.textures.getTexture(key); }

  private tile(parent: Container, key: string, x: number, y: number, w: number, h: number): TilingSprite {
    const t = new TilingSprite({ texture: this.tex(key), width: Math.round(w), height: Math.round(h) });
    t.position.set(Math.round(x), Math.round(y));
    parent.addChild(t);
    return t;
  }

  private sprite(parent: Container, key: string, x: number, bottomY: number, anchorX = 0, sortBias = 0): Sprite {
    const s = new Sprite(this.tex(key));
    s.anchor.set(anchorX, 1);
    s.position.set(Math.round(x), Math.round(bottomY));
    s.zIndex = bottomY + sortBias;
    parent.addChild(s);
    return s;
  }

  public build(quality: NeighborhoodQuality = 'high'): void {
    if (this.built) return;
    this.built = true;
    const detail = NEIGHBORHOOD_QUALITY[quality].farDetail;
    const F = NEIGHBORHOOD_TILES;
    const X0 = F.x0 * T, X1 = F.x1 * T, Y0 = F.y0 * T, Y1 = F.y1 * T;

    this.buildBackdrop(Y0);
    this.buildGround(X0, X1, Y0, Y1, detail);
    this.buildRoads(X0, X1);
    this.buildPark();
    this.buildSchool();
    this.buildApartmentParking();
    this.buildLots();
    this.buildTrees(X0, X1, Y0, Y1);
    this.buildLamps();
    this.buildProps();
    this.buildLabels();
    this.glow.addChild(this.windowGlow);
  }

  // ------------------------------------------------------------------ nền + đồi

  private buildBackdrop(y0: number): void {
    // Trời: một dải rất rộng phía trên đồi; màu nhân bởi lớp tint ngoài trời của ShopLighting.
    this.sky.rect(-9000, y0 - HILL_H - 1500, 18000, 1500 + HILL_H + 200).fill(0xffffff);
    this.sky.tint = SKY; // màu thật đặt bằng tint để đổi theo thời tiết
    this.backdrop.addChild(this.sky);
    for (let i = 0; i < 3; i++) {
      const h = new TilingSprite({ texture: this.tex(`nb_hills_${i}`), width: 4000, height: HILL_H });
      // Ba lớp chồng lệch nhau: lớp xa cao hơn một chút để có chiều sâu.
      h.position.set(0, y0 - HILL_H + 30 + i * 22);
      this.hills.push(h);
      this.backdrop.addChild(h);
    }
    // Mây pixel nhiều búi trôi chậm trên trời (parallax), thưa khi trời quang, nhiều và xám khi u ám
    for (let i = 0; i < 9; i++) {
      const sprite = new Sprite(this.tex(`nb_cloud_${i % 3}`));
      sprite.anchor.set(0.5, 1);
      sprite.alpha = 0.92;
      this.backdrop.addChild(sprite);
      this.clouds.push({ sprite, base: i * 330 + rnd(i, 81) * 200, speed: 5 + rnd(i, 82) * 9, y: y0 - HILL_H - 90 - rnd(i, 83) * 520, show: (i + 1) / 9 });
    }
  }

  private buildGround(X0: number, X1: number, Y0: number, Y1: number, detail: boolean): void {
    const g = this.ground;
    // Nền cỏ vô hạn (cùng màu cỏ) để lộ ra ngoài vùng vẽ cũng không thấy mép; bị tint ban đêm cùng mọi thứ.
    const base = new Graphics();
    base.rect(-6000, Y0, 12000, 4200 - Y0).fill(GRASS); // chỉ từ mép bắc trở xuống: phía bắc là đồi + trời
    g.addChild(base);
    this.tile(g, 'tile_grass_v0', X0, Y0, X1 - X0, Y1 - Y0);
    // Mảng cỏ khác sắc để mặt đất không lặp ô.
    const patches = detail ? 150 : 70;
    for (let i = 0; i < patches; i++) {
      const w = (3 + Math.floor(rnd(i, 1) * 7)) * T;
      const h = (2 + Math.floor(rnd(i, 2) * 5)) * T;
      const x = X0 + Math.floor(rnd(i, 3) * ((X1 - X0 - w) / T)) * T;
      const y = Y0 + Math.floor(rnd(i, 4) * ((Y1 - Y0 - h) / T)) * T;
      this.tile(g, `tile_grass_v${1 + (i % 2)}`, x, y, w, h).alpha = 0.4;
    }
    if (detail) {
      const dots = new Graphics();
      for (let i = 0; i < 520; i++) {
        const x = X0 + rnd(i, 11) * (X1 - X0);
        const y = Y0 + rnd(i, 12) * (Y1 - Y0);
        const c = [0xf2c94c, 0xe9739b, 0xf4f0e6, 0xb497e0][i % 4];
        dots.rect(Math.round(x), Math.round(y), 2, 2).fill(c);
        dots.rect(Math.round(x) + 1, Math.round(y) + 2, 1, 2).fill(0x3f5c39);
      }
      g.addChild(dots);
    }
  }

  // ------------------------------------------------------------------ đường

  private roadRows(r: RoadDef): { nTop: number; sTop: number } {
    return { nTop: r.topRow - 2, sTop: r.topRow + 3 };
  }

  private buildRoads(X0: number, X1: number): void {
    const g = this.ground;
    const marks = new Graphics();
    const width = X1 - X0;
    for (const road of TRAFFIC_ROADS) {
      const { nTop, sTop } = this.roadRows(road);
      const nRows = road.id === 'south' ? 1 : 2;
      this.tile(g, 'tile_sidewalk', X0, (road.topRow - nRows) * T, width, nRows * T);
      this.tile(g, 'tile_sidewalk', X0, sTop * T, width, 2 * T);
      this.tile(g, 'tile_street', X0, road.topRow * T, width, 3 * T);
      void nTop;
    }
    // Đường dọc: vỉa hè hai bên, mặt đường, vạch giữa.
    for (const a of AVENUES) {
      const ax0 = a.x0 * T, ax1 = a.x1 * T;
      this.tile(g, 'tile_sidewalk', ax0 - T, a.y0 * T, T, (a.y1 - a.y0) * T);
      this.tile(g, 'tile_sidewalk', ax1, a.y0 * T, T, (a.y1 - a.y0) * T);
      this.tile(g, 'tile_street', ax0, a.y0 * T, ax1 - ax0, (a.y1 - a.y0) * T);
    }
    // Lại phủ mặt đường ngang lên chỗ giao cắt để vỉa hè đường dọc không cắt ngang lòng đường.
    for (const road of TRAFFIC_ROADS) for (const a of AVENUES) {
      this.tile(g, 'tile_street', (a.x0 - 1) * T, road.topRow * T, (a.x1 - a.x0 + 2) * T, 3 * T);
    }
    const YELLOW = { color: 0xf0d48a, alpha: 0.85 };
    const WHITE = { color: 0xfff0cf, alpha: 0.82 };
    /** Hộp giao lộ (px) của từng đường ngang: bó vỉa và vạch giữa không chạy xuyên qua. */
    const boxesOf = (road: RoadDef) => INTERSECTIONS.filter((x) => x.roadId === road.id);
    /** Vạch giữa đôi vàng liền (cấm vượt) 3 ô trước mỗi ngã tư, nét đứt ở đoạn còn lại. */
    const NO_PASS = 3 * T;
    for (const road of TRAFFIC_ROADS) {
      const y = road.topRow * T;
      const boxes = boxesOf(road);
      // Bó vỉa hai bên lòng đường, đứt đoạn ở miệng đường dọc.
      for (const edgeY of [y, y + 3 * T - 3]) {
        let from = X0;
        for (const b of [...boxes].sort((p, q) => p.crossLeft - q.crossLeft)) {
          marks.rect(from, edgeY, b.crossLeft - from, 3).fill({ color: 0xb9b2a0, alpha: 0.9 });
          from = b.crossRight;
        }
        marks.rect(from, edgeY, X1 - from, 3).fill({ color: 0xb9b2a0, alpha: 0.9 });
      }
      const cy = (road.topRow + 1) * T - 1;
      for (let x = X0; x < X1; x += T) {
        if (boxes.some((b) => x + T > b.crossLeft - NO_PASS && x < b.crossRight + NO_PASS)) continue;
        marks.rect(x + 6, cy, 20, 2).fill(YELLOW);
      }
      for (const b of boxes) {
        for (const [x0, x1] of [[b.crossLeft - NO_PASS, b.crossLeft - 12], [b.crossRight + 12, b.crossRight + NO_PASS]]) {
          marks.rect(x0, cy - 2, x1 - x0, 2).fill(YELLOW);
          marks.rect(x0, cy + 1, x1 - x0, 2).fill(YELLOW);
        }
        // Vạch đi bộ qua đường ngang ở hai cột vỉa hè của đường dọc (thanh song song hướng xe chạy).
        for (const zx of [b.crossLeft, b.crossRight - T]) {
          for (let yy = b.roadTop + 3; yy + 4 <= b.roadBottom - 3; yy += 8) marks.rect(zx + 4, yy, T - 8, 4).fill(WHITE);
        }
        // Vạch dừng xe: làn nam (đi sang đông) dừng trước vạch phía tây, làn bắc (đi sang tây) trước vạch phía đông.
        marks.rect(b.crossLeft - 10, b.roadTop + T + 2, 4, T - 4).fill(WHITE);
        marks.rect(b.crossRight + 6, b.roadTop + 2, 4, T - 4).fill(WHITE);
        // Mũi tên chỉ chiều từng làn ngay sau vạch dừng.
        const arrow = (ax: number, ay: number, dir: 1 | -1) => {
          marks.rect(ax - 6 * dir, ay - 1, 12, 2).fill(WHITE);
          marks.poly([ax + 8 * dir, ay, ax + 2 * dir, ay - 4, ax + 2 * dir, ay + 4]).fill(WHITE);
        };
        arrow(b.crossLeft - 30, b.roadTop + T + T / 2, 1);
        arrow(b.crossRight + 30, b.roadTop + T / 2, -1);
      }
    }
    for (const a of AVENUES) {
      const cx = ((a.x0 + a.x1) / 2) * T - 1;
      const crosses = INTERSECTIONS.filter((x) => x.avenueId === a.id);
      for (let y = a.y0 * T; y < a.y1 * T; y += T) {
        if (TRAFFIC_ROADS.some((r) => y + T > (r.topRow - 1 - 3) * T && y < (r.topRow + 4 + 3) * T)) continue;
        marks.rect(cx, y + 6, 2, 20).fill(YELLOW);
      }
      for (const road of TRAFFIC_ROADS) {
        const northY = (road.topRow - 1) * T + 10; // vạch đi bộ qua đường dọc, bên bắc đường ngang
        const southY = (road.topRow + 3) * T + 2;
        const hasNorth = road.topRow - 1 >= a.y0;
        for (const yy of hasNorth ? [northY, southY] : [southY]) {
          for (let x = a.x0 * T + 2; x < a.x1 * T - 4; x += 8) marks.rect(x, yy, 4, 20).fill(WHITE);
        }
        if (!crosses.some((x) => x.roadId === road.id)) continue;
        // Đường dọc 2 chiều: vạch giữa đôi vàng liền ở 3 ô gần ngã tư, vạch dừng bên phải mỗi chiều (xuôi nam = nửa tây).
        // Vạch dừng khớp chỗ xe dừng: mũi xe cách mép hộp giao lộ `stopMarginPx` (6 px).
        const stopN = (road.topRow - 1) * T - 10, stopS = (road.topRow + 4) * T + 2;
        marks.rect(a.x0 * T + 2, stopN, cx - a.x0 * T - 3, 4).fill(WHITE);
        marks.rect(cx + 4, stopS, a.x1 * T - cx - 6, 4).fill(WHITE);
        for (const [y0, y1] of [[stopN - NO_PASS + 12, stopN + 4], [stopS, stopS + NO_PASS - 12]]) {
          marks.rect(cx - 2, y0, 2, y1 - y0).fill(YELLOW);
          marks.rect(cx + 1, y0, 2, y1 - y0).fill(YELLOW);
        }
      }
    }
    g.addChild(marks);
  }

  // ------------------------------------------------------------------ công viên + vườn hoa

  private buildPark(): void {
    const g = this.ground;
    const a = PARK.area;
    this.tile(g, 'tile_grass_v2', a.x0 * T, a.y0 * T, (a.x1 - a.x0) * T, (a.y1 - a.y0) * T);
    for (const p of PARK_PATHS) this.tile(g, 'tile_pavement_alley', p.x0 * T, p.y0 * T, (p.x1 - p.x0) * T, (p.y1 - p.y0) * T);
    // Sân chơi lát nền cao su, ao nước, luống hoa
    const pg = PARK.playground;
    const deco = new Graphics();
    deco.rect(pg.x0 * T, pg.y0 * T, (pg.x1 - pg.x0) * T, (pg.y1 - pg.y0) * T).fill(0xc9835a);
    deco.rect(pg.x0 * T, pg.y0 * T, (pg.x1 - pg.x0) * T, (pg.y1 - pg.y0) * T).stroke({ color: 0x8a5a3a, width: 3 });
    for (let x = pg.x0 * T + 6; x < pg.x1 * T - 6; x += 12) deco.rect(x, pg.y0 * T + 4, 1, 2).fill(0xa86a46);
    const pd = PARK.pond;
    const px = pd.x0 * T, py = pd.y0 * T, pw = (pd.x1 - pd.x0) * T, ph = (pd.y1 - pd.y0) * T;
    deco.rect(px - 6, py - 6, pw + 12, ph + 12).fill(0x7a7468); // bờ đá
    deco.rect(px - 3, py - 3, pw + 6, ph + 6).fill(0xb4ad9d);
    deco.rect(px, py, pw, ph).fill(0x3f7fae);
    deco.rect(px + 4, py + 4, pw - 8, ph - 8).fill(0x4f93c4);
    for (let i = 0; i < 12; i++) deco.rect(px + 10 + rnd(i, 21) * (pw - 40), py + 10 + rnd(i, 22) * (ph - 24), 16 + (i % 3) * 6, 1).fill(0x9fd0ee);
    for (let i = 0; i < 6; i++) { const lx = px + 14 + rnd(i, 23) * (pw - 44); const ly = py + 12 + rnd(i, 24) * (ph - 30); deco.rect(lx, ly, 8, 5).fill(0x2f6b3a); deco.rect(lx + 1, ly, 6, 2).fill(0x4ea05a); if (i % 2) deco.rect(lx + 3, ly - 1, 2, 2).fill(0xf4a3bd); }
    g.addChild(deco);
    // Hàng rào quanh công viên (chừa hai cổng)
    const gateS = PARK.gateSouth.x, gateE = PARK.gateEast.y;
    for (let x = a.x0; x < a.x1; x++) {
      if (x >= gateS - 1 && x <= gateS + 1) continue;
      this.sprite(this.props, 'deco_fence', x * T, (a.y1) * T + 4, 0, -2);
    }
    for (let y = a.y0; y < a.y1; y++) {
      this.sprite(this.props, 'deco_fence', a.x0 * T, (y + 1) * T, 0, -2);
      if (y >= gateE - 1 && y <= gateE + 1) continue;
      this.sprite(this.props, 'deco_fence', a.x1 * T - T, (y + 1) * T, 0, -2);
    }
    for (const l of PARK_LAMPS) this.sprite(this.props, 'deco_lamp_pole', l.x * T, (l.y + 1) * T, 0, 3);
  }

  // ------------------------------------------------------------------ trường học

  private buildSchool(): void {
    const g = this.ground;
    const y = SCHOOL.yard;
    this.tile(g, 'tile_pavement_alley', y.x0 * T, y.y0 * T, (y.x1 - y.x0) * T, (y.y1 - y.y0) * T);
    // Sân bóng rổ + vạch kẻ
    const court = new Graphics();
    const cx = 27 * T, cy = -25.4 * T, cw = 8 * T, ch = 3.1 * T;
    court.rect(cx, cy, cw, ch).fill(0x4f7fae);
    court.rect(cx, cy, cw, ch).stroke({ color: 0xffffff, width: 2 });
    court.rect(cx + cw / 2 - 1, cy, 2, ch).fill(0xffffff);
    court.circle(cx + cw / 2, cy + ch / 2, 14).stroke({ color: 0xffffff, width: 2 });
    g.addChild(court);
    // Tòa nhà + cổng
    const bd = SCHOOL.building;
    this.sprite(this.props, 'nb_school_building', bd.x * T, bd.frontY * T, 0, 0);
    const gate = SCHOOL.gate;
    this.sprite(this.props, 'nb_school_gate', gate.x * T - 20, gate.y * T + 28, 0, 4);
    // Hàng rào hai bên cổng, cổng bên, và hai biên
    for (let x = SCHOOL.area.x0; x < SCHOOL.area.x1; x++) {
      if (x >= gate.x - 1 && x <= gate.x + gate.w) continue;
      this.sprite(this.props, 'deco_fence', x * T, gate.y * T + 28, 0, -2);
    }
    for (const x of [SCHOOL.area.x0, SCHOOL.area.x1 - 1]) for (let yy = SCHOOL.area.y0 + 4; yy < SCHOOL.area.y1; yy++) this.sprite(this.props, 'deco_fence', x * T, (yy + 1) * T, 0, -2);
    // Cột cờ + cờ đỏ sao vàng
    const fp = SCHOOL.flagpole;
    const flag = new Graphics();
    flag.rect(0, -64, 3, 64).fill(0xdadada).rect(-1, -66, 5, 3).fill(0xffd34a);
    flag.rect(3, -62, 30, 20).fill(0xd62828);
    flag.rect(16, -57, 4, 10).fill(0xffd34a).rect(13, -53, 10, 3).fill(0xffd34a);
    flag.position.set(fp.x * T, fp.y * T);
    (flag as unknown as { zIndex: number }).zIndex = fp.y * T + 8;
    this.props.addChild(flag);
  }

  // ------------------------------------------------------------------ bãi xe chung cư

  private buildApartmentParking(): void {
    const p = APARTMENT_PARKING;
    const g = this.ground;
    this.tile(g, 'tile_street', p.x0 * T, p.y0 * T, (p.x1 - p.x0) * T, (p.y1 - p.y0) * T);
    const lines = new Graphics();
    for (let x = p.x0 * T + 16; x < p.x1 * T - 16; x += 5 * T) {
      for (const row of [p.y0 + 1.1, p.y0 + 4.2]) {
        lines.rect(x, row * T, 2, 2.4 * T).fill({ color: 0xf4f0e6, alpha: 0.7 });
      }
    }
    g.addChild(lines);
  }

  // ------------------------------------------------------------------ nhà

  private buildLots(): void {
    const litCount = { n: 0 };
    for (const lot of NEIGHBORHOOD_LOTS) this.addLot(lot, litCount);
  }

  private lotKey(lot: NeighborhoodLot): string {
    if (lot.kind === 'apartment') return `nb_apartment_${lot.variant}`;
    return `nb_${lot.kind === 'shophouse' ? 'shop' : 'house'}_${lot.variant}_${lot.floors}_${lot.w}${lot.yard ? '_y' : ''}`;
  }

  private addLot(lot: NeighborhoodLot, litCount: { n: number }): void {
    const x = lot.x * T;
    const bottom = lot.frontY * T + 4;
    this.sprite(this.props, this.lotKey(lot), x, bottom, 0, 0);
    // Cửa sổ sáng đèn khi tối: một phần cửa sổ bật sáng, cố định theo nhà
    if (lot.kind !== 'apartment') {
      const wins = houseLitWindows(lot.variant, lot.floors, lot.w);
      const spriteTop = bottom - (this.tex(this.lotKey(lot)).height);
      for (let i = 0; i < wins.length; i++) {
        if (rnd(lot.x, lot.frontY, i, 61) > 0.5) continue;
        const w = wins[i];
        this.windowGlow.rect(x + w.x, spriteTop + w.y, w.w, w.h).fill({ color: 0xffd980, alpha: 0.55 });
        litCount.n++;
      }
    } else {
      const top = bottom - this.tex(this.lotKey(lot)).height;
      for (let f = 0; f < lot.floors; f++) for (let i = 0; i < 6; i++) {
        if (rnd(lot.x, f, i, 71) > 0.35) continue;
        const wx = (i < 3 ? 16 + i * 40 : 160 + 28 + (i - 3) * 40);
        this.windowGlow.rect(x + wx, top + 22 + f * 36 + 6, 16, 18).fill({ color: 0xffd980, alpha: 0.55 });
      }
    }
  }

  // ------------------------------------------------------------------ cây + đèn

  private buildTrees(X0: number, X1: number, Y0: number, Y1: number): void {
    const placeTree = (xt: number, yt: number, i: number) => {
      const kind = (hash(i, 99) % 5);
      if (kind === 0) this.sprite(this.props, 'tile_tree', xt * T - 24, yt * T, 0, 0);
      else if (kind === 1) this.sprite(this.props, 'nb_palm', xt * T, yt * T, 0.5, 0);
      else this.sprite(this.props, `nb_tree_round_${kind % 3}`, xt * T, yt * T, 0.5, 0);
    };
    const F = (v: number) => Math.round(v / T);
    let i = 0;
    // Vành đai cây bao quanh vùng vẽ để không lộ mép: mép bắc dày nhất (chân đồi)
    for (let x = F(X0); x < F(X1); x += 2 + (i % 2)) { placeTree(x, Y0 / T + 3 + (i % 3) * 0.6, i++); placeTree(x + 1, Y1 / T - (i % 3) * 0.5, i++); }
    for (let y = Y0 / T + 5; y < Y1 / T - 2; y += 3) { placeTree(X0 / T + 1 + (i % 2), y, i++); placeTree(X1 / T - 1 - (i % 2), y, i++); }
  }

  private buildLamps(): void {
    const glowTex = this.tex('nb_glow');
    const place = (xt: number, yt: number, bottomOffset = 0) => {
      const s = this.sprite(this.props, 'deco_lamp_pole', xt * T, yt * T + bottomOffset, 0, 3);
      const gl = new Sprite(glowTex);
      gl.anchor.set(0.5);
      gl.position.set(xt * T + 16, yt * T + bottomOffset - 52);
      gl.alpha = 0;
      this.lampGlows.push(gl);
      this.glow.addChild(gl);
      void s;
    };
    // Đèn dọc vỉa hè hai bên đường chính ngoài bản đồ chơi (trong bản đồ đã có đèn riêng), đường trường và đường phía nam.
    for (const l of NEIGHBORHOOD_STREET_LAMPS) place(l.x, l.y, l.bottomOffset);
    for (const l of PARK_LAMPS) {
      const gl = new Sprite(glowTex);
      gl.anchor.set(0.5);
      gl.position.set(l.x * T + 16, (l.y + 1) * T - 52);
      gl.alpha = 0;
      this.lampGlows.push(gl);
      this.glow.addChild(gl);
    }
  }

  // ------------------------------------------------------------------ đồ vật (danh sách dùng chung với va chạm)

  /** Mọi đồ vật rải trong khu phố vẽ theo `NEIGHBORHOOD_PROPS`; cùng danh sách đó cho va chạm người chơi. */
  private buildProps(): void {
    for (const p of NEIGHBORHOOD_PROPS) if (p.key) this.sprite(this.props, p.key, p.x, p.y, p.anchorX, p.bias);
  }

  // ------------------------------------------------------------------ biển hiệu chữ  // ------------------------------------------------------------------ biển hiệu chữ

  private buildLabels(): void {
    const mk = (text: string, x: number, y: number, size: number, fill: number, stroke?: number) => {
      const t = new Text({ text, style: { fontFamily: 'Arial', fontSize: size, fontWeight: 'bold', fill, ...(stroke !== undefined ? { stroke: { color: stroke, width: 2 } } : {}), align: 'center' } });
      t.anchor.set(0.5);
      t.position.set(Math.round(x), Math.round(y));
      this.labels.addChild(t);
      return t;
    };
    const bd = SCHOOL.building;
    mk('TRƯỜNG TIỂU HỌC', bd.x * T + (24 * T) / 2, bd.frontY * T - 150 + 63, 8, 0xffffff);
    mk('CÔNG VIÊN HOA SỮA', ((PARK.area.x0 + PARK.area.x1) / 2) * T, (PARK.area.y1 - 0.2) * T - 14, 10, 0xffffff, 0x2f6b3a);
    for (let i = 0; i < 3; i++) mk('CHUNG CƯ SEN', (42 + i * 11 + 5) * T, 2 * T - 36 + 4, 7, 0xffffff);
    mk('HẺM 12', 12.5 * T, 17.4 * T, 8, 0x4a3a2a);
  }

  // ------------------------------------------------------------------ cập nhật mỗi khung

  public update(f: NeighborhoodSceneFrame): void {
    // Ánh đèn cửa sổ/đèn đường theo độ tối; thưa dần khi sáng
    const night = Math.max(0, Math.min(1, f.artificial));
    // Ánh đèn chỉ hiện rõ khi trời đã khá tối (không có quầng sáng ban ngày).
    const lit = Math.max(0, (night - 0.25) / 0.75);
    this.windowGlow.alpha = lit * 0.85;
    for (const g of this.lampGlows) g.alpha = lit * lit * 0.9;
    this.glow.visible = lit > 0.01;

    // Đồi núi: parallax ngang, màu theo thời tiết (rõ khi nắng, nhạt/xám khi mưa, tối khi giông)
    const w = f.weather;
    const cloud = w ? Math.max(w.cloudIntensity, w.fog) : 0;
    const rain = w ? w.rainIntensity : 0;
    const storm = w ? Math.max(0, w.darkness - 0.3) : 0;
    const viewW = f.viewW + 200;
    for (let i = 0; i < this.hills.length; i++) {
      const h = this.hills[i];
      const x = Math.round(f.camX - 100);
      h.width = viewW;
      h.x = x;
      h.tilePosition.x = -Math.round(f.camX * this.hillParallax[i]);
      // Lớp xa mờ hơn khi nhiều mây/mưa (không blur, chỉ pha màu về xám-xanh nhạt và bớt bão hòa).
      const haze = Math.min(0.75, cloud * 0.35 + rain * 0.45 + i * 0.0) * (1 - i * 0.18);
      let tint = desaturate(0xffffff, Math.min(0.9, rain * 0.8 + cloud * 0.3));
      tint = mix(tint, 0xb9c6cf, haze * (1 - i * 0.25));
      tint = mix(tint, 0x2a3140, Math.min(0.55, storm * 0.7));
      h.tint = tint;
    }
    // Mây: trôi theo thời gian + parallax chậm theo camera; đủ 9 đám khi nhiều mây, ~4 đám khi quang. Tint xám khi mưa/giông.
    const span = 3200;
    const cover = Math.max(0.3, Math.min(1, 0.35 + cloud * 0.8 + rain * 0.5));
    let cloudTint = mix(0xffffff, 0xa4adb8, Math.min(1, cloud * 0.55 + rain * 0.5));
    cloudTint = mix(cloudTint, 0x4a5262, Math.min(0.75, storm * 0.9));
    for (const c of this.clouds) {
      const local = (((c.base + (f.reducedMotion ? 0 : f.time * c.speed) - f.camX * 0.12) % span) + span) % span;
      c.sprite.position.set(Math.round(f.camX - span / 2 + local), Math.round(c.y));
      c.sprite.visible = c.show <= cover + 0.001;
      c.sprite.tint = cloudTint;
    }
    const skyKey = `${Math.round(cloud * 10)}:${Math.round(rain * 10)}:${Math.round(storm * 10)}`;
    if (skyKey !== this.lastSkyKey) {
      this.lastSkyKey = skyKey;
      const sky = mix(mix(SKY, 0xa9b3bd, Math.min(1, cloud * 0.7 + rain * 0.5)), 0x3a4252, Math.min(0.7, storm));
      this.sky.tint = sky;
    }
  }

  public destroy(): void {
    for (const c of [this.backdrop, this.ground, this.props, this.labels, this.glow]) c.destroy({ children: true });
    this.hills = [];
    this.lampGlows = [];
  }
}
