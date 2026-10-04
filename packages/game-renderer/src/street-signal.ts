import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { StreetPedestrianState, TILE_SIZE, TrafficSignalState } from '@game/shared';
import { INTERSECTIONS, ROAD_MAP } from '@game/data';

const OFF = 0x2a2f2c;
const RED = 0xe0533f, YELLOW = 0xf2c74a, GREEN = 0x5fd17a;

/** Vẽ một cột đèn (gốc tại chân cột): đầu đèn xe theo `vehicle.vehicle`, đầu đèn người đi bộ theo `walk.pedestrian`. */
function drawSignalPole(g: Graphics, vehicle: TrafficSignalState, walk: TrafficSignalState, blinkOn: boolean): void {
  g.clear();
  // Chân đế nhỏ tiếp đất và bóng đổ
  g.ellipse(0, 0, 3, 1.2).fill({ color: 0x1a211e, alpha: 0.35 });
  // Thân cột kim loại
  g.rect(-1, -26, 2, 26).fill(0x31443c);
  // Hộp đèn xe (3 bóng: đỏ, vàng, xanh) kèm gờ che nắng
  g.roundRect(-4, -48, 8, 22, 2).fill(0x1d2420);
  g.rect(-5, -49, 10, 1).fill(0x111614);
  g.circle(0, -43, 2.2).fill(vehicle.vehicle === 'red' ? RED : OFF);
  g.circle(0, -37, 2.2).fill(vehicle.vehicle === 'yellow' ? YELLOW : OFF);
  g.circle(0, -31, 2.2).fill(vehicle.vehicle === 'green' ? GREEN : OFF);
  // Đèn người đi bộ: trên đỏ (dừng), dưới xanh (đi) kèm gờ che
  g.roundRect(-4, -24, 8, 10, 2).fill(0x1d2420);
  g.rect(-5, -25, 10, 1).fill(0x111614);
  const stopOn = walk.pedestrian === 'dont_walk' || (walk.pedestrian === 'clearing' && blinkOn);
  g.rect(-2, -22.5, 4, 3).fill(stopOn ? RED : OFF);
  g.rect(-2, -18.5, 4, 3).fill(walk.pedestrian === 'walk' ? GREEN : OFF);
}

/** Trạng thái đèn ngã tư (cho `main` = đường ngang, `avenue` = đường dọc), cùng kiểu với `IntersectionSignals` của game-core. */
export interface IntersectionLamps { main: TrafficSignalState; avenue: TrafficSignalState }

/**
 * Bốn cột đèn ở bốn góc mỗi ngã tư (xe đi bên phải: cột đặt ở góc bên phải của chiều xe tới). Cột đường ngang (ĐB/TN) hiện
 * đèn xe `main` và đèn đi bộ `avenue` (đi bộ qua đường dọc cùng lúc xe đường ngang chạy); cột đường dọc ngược lại.
 */
export function buildIntersectionSignalHeads(layer: Container): { update(signals: ReadonlyArray<{ id: string; signals: IntersectionLamps }>): void } {
  const poles = INTERSECTIONS.flatMap((x) => {
    const road = ROAD_MAP[x.roadId];
    const top = (road.topRow - 1) * TILE_SIZE + 28; // đáy hàng vỉa hè phía bắc đường ngang
    const bottom = x.roadBottom + 24; // hàng vỉa hè phía nam, lệch vào trong ô
    const west = x.crossLeft + 16;
    const east = x.crossRight - 16;
    return [
      { id: x.id, onMain: true, x: west, y: bottom },  // góc TN: đón xe đi sang đông
      { id: x.id, onMain: true, x: east, y: top },     // góc ĐB: đón xe đi sang tây
      { id: x.id, onMain: false, x: west, y: top },    // góc TB: đón xe xuôi nam
      { id: x.id, onMain: false, x: east, y: bottom }, // góc ĐN: đón xe ngược bắc
    ].map((p) => {
      const g = new Graphics();
      g.eventMode = 'none';
      g.position.set(p.x, p.y);
      g.zIndex = p.y + 40;
      layer.addChild(g);
      return { ...p, g };
    });
  });
  const drawn = new Map<Graphics, string>();
  return {
    update(all): void {
      for (const p of poles) {
        const s = all.find((a) => a.id === p.id)?.signals;
        if (!s) continue;
        const vehicle = p.onMain ? s.main : s.avenue;
        const walk = p.onMain ? s.avenue : s.main;
        const blinkOn = walk.pedestrian !== 'clearing' || Math.floor(walk.secondsLeft * 2) % 2 === 0;
        const key = `${vehicle.vehicle}|${walk.pedestrian}|${blinkOn}`;
        if (drawn.get(p.g) === key) continue;
        drawn.set(p.g, key);
        drawSignalPole(p.g, vehicle, walk, blinkOn);
      }
    },
  };
}

const NPC_VARIANTS = 3;

/** Hàm lấy texture theo khóa (cùng kho texture với nhân vật chính và khách). */
export type PedestrianTextureGetter = (key: string) => Texture;

/**
 * Dựng người đi bộ nền bằng đúng sprite NPC 32×48 (có mặt mũi) như khách và nhân viên,
 * nên cùng kích thước với mọi nhân vật khác. Gốc tọa độ tại chân.
 * Container con `accessory` chứa đồ kèm (túi, balo, cún) và được lật theo hướng đi.
 */
export function createPedestrianSprite(variant: number, activity: string | undefined, getTexture: PedestrianTextureGetter): Container {
  const c = new Container();
  c.eventMode = 'none';
  const npc = ((variant % NPC_VARIANTS) + NPC_VARIANTS) % NPC_VARIANTS;
  c.label = String(npc);

  const shadow = new Graphics();
  shadow.ellipse(0, 0, 8, 3).fill({ color: 0x26190e, alpha: 0.25 });
  c.addChild(shadow);

  const body = new Sprite(getTexture(`npc_${npc}_right_idle_0`));
  body.anchor.set(0.5, 1);
  c.addChild(body);

  const g = new Graphics();
  if (activity === 'jog') {
    g.rect(-5, -41, 10, 2).fill(0xf1c40f);
  } else if (activity === 'dog') {
    g.ellipse(-17, -4, 6, 4).fill(0xd35400);
    g.circle(-11, -7, 3.5).fill(0xd35400);
    g.rect(-10, -8, 1, 1).fill(0x1a1815);
    g.rect(-21, -9, 2, 4).fill(0xd35400);
    g.rect(-19, 0, 1, 3).fill(0x2c3e50);
    g.rect(-14, 0, 1, 3).fill(0x2c3e50);
    g.rect(-11, -6, 11, 1).fill({ color: 0x7f8c8d, alpha: 0.6 });
  }
  c.addChild(g);

  // Túi tote đỏ có nhãn trắng, hai quai nắm trong tay (tay cách chân ~14 px), thân túi buông xuống sát mặt đất.
  // Tọa độ gốc ở giữa túi; vị trí đổi theo hướng đi và theo nhịp đung đưa của tay.
  const bag = new Graphics();
  if (activity === 'grocery') {
    bag.rect(-3, -15, 6, 1).fill(0x8e2a22);
    bag.rect(-3, -15, 1, 4).fill(0x8e2a22);
    bag.rect(2, -15, 1, 4).fill(0x8e2a22);
    bag.rect(-5, -12, 11, 12).fill(0x7a1f19);
    bag.rect(-4, -11, 9, 10).fill(0xe03a2e);
    bag.rect(-4, -11, 9, 1).fill(0xff6a50);
    bag.rect(3, -10, 2, 9).fill(0xb82a20);
    bag.rect(-2, -8, 4, 3).fill(0xf2e3c0);
    bag.rect(-1, -7, 2, 1).fill(0xd9b99a);
  }
  bag.visible = activity === 'grocery';
  c.addChild(bag);
  return c;
}

/** Đặt vị trí, hướng nhìn và khung hình đi/đứng; nhún nhẹ khi đang đi. */
export function placePedestrian(sprite: Container, p: StreetPedestrianState, time: number, getTexture: PedestrianTextureGetter, reducedMotion = false): void {
  const isMoving = p.state === 'walking';
  const speed = p.activity === 'jog' ? 16 : 9;
  const bob = isMoving && !reducedMotion ? Math.abs(Math.sin(time * speed)) * (p.activity === 'jog' ? 2 : 1.2) : 0;
  sprite.position.set(Math.round(p.position.x), Math.round(p.position.y - bob));
  sprite.zIndex = p.position.y;

  const body = sprite.children[1] as Sprite;
  const accessory = sprite.children[2] as Graphics;
  const bag = sprite.children[3] as Graphics;
  const dir = p.direction;
  const frame = reducedMotion ? 0 : Math.floor(time * (isMoving ? 8 : 1.5)) % (isMoving ? 4 : 2);
  body.texture = getTexture(`npc_${sprite.label}_${dir}_${isMoving ? 'walk' : 'idle'}_${frame}`);
  // Đồ kèm (túi, cún) lật theo chiều ngang; khi băng qua đường thì giữ phía hướng phải.
  if (p.direction === 'left') accessory.scale.x = -1;
  else if (p.direction === 'right') accessory.scale.x = 1;
  // Đi ngang: túi treo ở tay đung đưa theo bước chân (khớp tay trong sprite nghiêng); đi dọc: túi ở tay phải.
  const lateral = p.direction === 'left' || p.direction === 'right';
  const swing = isMoving && !reducedMotion ? [0, 3, 0, -3][frame % 4] : 0;
  bag.x = lateral ? (p.direction === 'left' ? 1.5 + swing : -1.5 - swing) : 10;
  bag.y = 0;
}
