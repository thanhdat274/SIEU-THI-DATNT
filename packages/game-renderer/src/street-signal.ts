import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { StreetPedestrianState, TILE_SIZE, TrafficSignalState } from '@game/shared';
import { CROSSWALK, STREET_PEDESTRIANS } from '@game/data';

/**
 * Bố trí 2 cột đèn tín hiệu thực tế ở 2 bên đối diện của trục đường 2 chiều:
 * - Cột 1 (Lề Nam): Đặt ở mép phía nam đường (y = southCurbY), đón đầu chiều xe chạy từ Tây sang Đông (dừng trước vạch phía tây ở làn nam).
 * - Cột 2 (Vỉa hè Bắc): Đặt ở mép vỉa hè phía bắc (y = northCurbY), đón đầu chiều xe chạy ngược lại từ Đông sang Tây (dừng trước vạch phía đông ở làn bắc).
 * Mỗi bên đường chỉ có duy nhất 1 cột đèn điều tiết chiều xe tương ứng và hướng dẫn người đi bộ sang đường.
 */
export const TRAFFIC_SIGNAL_POLES = [
  {
    x: CROSSWALK.tileX * TILE_SIZE - 10,
    y: STREET_PEDESTRIANS.southCurbY,
    description: 'South curb pole (serving eastbound traffic on south lane)',
  },
  {
    x: (CROSSWALK.tileX + CROSSWALK.widthTiles) * TILE_SIZE + 10,
    y: STREET_PEDESTRIANS.northCurbY,
    description: 'North sidewalk curb pole (serving westbound traffic on north lane)',
  },
] as const;

const OFF = 0x2a2f2c;
const RED = 0xe0533f, YELLOW = 0xf2c74a, GREEN = 0x5fd17a;

export interface TrafficSignalHeads {
  /** Vẽ lại hai đèn khi trạng thái đổi (xanh/vàng/đỏ, đi/chờ/nhấp nháy). */
  update(state: TrafficSignalState): void;
}

/** Đèn giao thông cho xe (3 bóng) và đèn người đi bộ (2 ô) trên 2 cột đối diện 2 bên đường. Chỉ hình ảnh. */
export function buildTrafficSignalHeads(layer: Container): TrafficSignalHeads {
  const heads = TRAFFIC_SIGNAL_POLES.map((pole) => {
    const g = new Graphics();
    g.eventMode = 'none';
    g.position.set(pole.x, pole.y);
    g.zIndex = pole.y + 40;
    layer.addChild(g);
    return g;
  });
  let drawnKey = '';
  return {
    update(state: TrafficSignalState): void {
      // Nhấp nháy dọn đường: đổi 2 lần mỗi giây theo thời gian còn lại của pha.
      const blinkOn = state.pedestrian !== 'clearing' || Math.floor(state.secondsLeft * 2) % 2 === 0;
      const key = `${state.vehicle}|${state.pedestrian}|${blinkOn}`;
      if (key === drawnKey) return;
      drawnKey = key;
      for (const g of heads) {
        g.clear();
        // Chân đế nhỏ tiếp đất và bóng đổ
        g.ellipse(0, 0, 3, 1.2).fill({ color: 0x1a211e, alpha: 0.35 });
        // Thân cột kim loại
        g.rect(-1, -26, 2, 26).fill(0x31443c);
        // Hộp đèn xe (3 bóng: đỏ, vàng, xanh) kèm gờ che nắng
        g.roundRect(-4, -48, 8, 22, 2).fill(0x1d2420);
        g.rect(-5, -49, 10, 1).fill(0x111614);
        g.circle(0, -43, 2.2).fill(state.vehicle === 'red' ? RED : OFF);
        g.circle(0, -37, 2.2).fill(state.vehicle === 'yellow' ? YELLOW : OFF);
        g.circle(0, -31, 2.2).fill(state.vehicle === 'green' ? GREEN : OFF);
        // Đèn người đi bộ: trên đỏ (dừng), dưới xanh (đi) kèm gờ che
        g.roundRect(-4, -24, 8, 10, 2).fill(0x1d2420);
        g.rect(-5, -25, 10, 1).fill(0x111614);
        const stopOn = state.pedestrian === 'dont_walk' || (state.pedestrian === 'clearing' && blinkOn);
        g.rect(-2, -22.5, 4, 3).fill(stopOn ? RED : OFF);
        g.rect(-2, -18.5, 4, 3).fill(state.pedestrian === 'walk' ? GREEN : OFF);
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

  // Túi xách treo ở tay: quai nắm trong tay, thân túi lơ lửng trên mặt đất; vị trí đổi theo hướng đi.
  const bag = new Graphics();
  if (activity === 'grocery') {
    bag.rect(-1, -6, 1, 4).fill(0x7a2a1f);
    bag.rect(3, -6, 1, 4).fill(0x7a2a1f);
    bag.rect(-3, -3, 9, 9).fill(0xe74c3c);
    bag.rect(-3, -3, 9, 2).fill(0xc0392b);
    bag.rect(0, 0, 3, 2).fill(0xffffff);
  }
  bag.visible = activity === 'grocery';
  c.addChild(bag);
  return c;
}

/** Đặt vị trí, hướng nhìn và khung hình đi/đứng; nhún nhẹ khi đang đi. */
export function placePedestrian(sprite: Container, p: StreetPedestrianState, time: number, getTexture: PedestrianTextureGetter, reducedMotion = false): void {
  const isMoving = p.state === 'crossing' || p.state === 'walking';
  const speed = p.activity === 'jog' ? 16 : 9;
  const bob = isMoving && !reducedMotion ? Math.abs(Math.sin(time * speed)) * (p.activity === 'jog' ? 2 : 1.2) : 0;
  sprite.position.set(Math.round(p.position.x), Math.round(p.position.y - bob));
  sprite.zIndex = p.position.y;

  const body = sprite.children[1] as Sprite;
  const accessory = sprite.children[2] as Graphics;
  const bag = sprite.children[3] as Graphics;
  const dir = p.direction === 'south' ? 'down' : p.direction === 'north' ? 'up' : p.direction;
  const frame = reducedMotion ? 0 : Math.floor(time * (isMoving ? 8 : 1.5)) % (isMoving ? 4 : 2);
  body.texture = getTexture(`npc_${sprite.label}_${dir}_${isMoving ? 'walk' : 'idle'}_${frame}`);
  // Đồ kèm (túi, cún) lật theo chiều ngang; khi băng qua đường thì giữ phía hướng phải.
  if (p.direction === 'left') accessory.scale.x = -1;
  else if (p.direction === 'right') accessory.scale.x = 1;
  // Đi ngang: tay ở giữa thân nên túi treo sát chân, hơi lệch về phía trước. Đi dọc: túi ở tay phải (nhìn từ ngoài vào).
  const lateral = p.direction === 'left' || p.direction === 'right';
  bag.x = lateral ? (p.direction === 'left' ? -4 : 2) : 10;
  bag.y = isMoving && !reducedMotion ? -Math.round(Math.abs(Math.sin(time * speed)) * 1) - 4 : -4;
}
