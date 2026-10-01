import { Container, Graphics } from 'pixi.js';
import { StreetPedestrianState, TILE_SIZE, TrafficSignalState } from '@game/shared';
import { CROSSWALK } from '@game/data';

/** Chân cột đèn trên vỉa hè sát bó vỉa, hai bên vạch qua đường (px). */
const POLE_BASE_Y = 12.85 * TILE_SIZE;
const POLE_X = [CROSSWALK.tileX * TILE_SIZE - 10, (CROSSWALK.tileX + CROSSWALK.widthTiles) * TILE_SIZE + 10];

const OFF = 0x2a2f2c;
const RED = 0xe0533f, YELLOW = 0xf2c74a, GREEN = 0x5fd17a;

export interface TrafficSignalHeads {
  /** Vẽ lại hai đèn khi trạng thái đổi (xanh/vàng/đỏ, đi/chờ/nhấp nháy). */
  update(state: TrafficSignalState): void;
}

/** Đèn giao thông cho xe (3 bóng) và đèn người đi bộ (2 ô) trên hai cột cạnh vạch qua đường. Chỉ hình ảnh. */
export function buildTrafficSignalHeads(layer: Container): TrafficSignalHeads {
  const heads = POLE_X.map((px) => {
    const g = new Graphics();
    g.eventMode = 'none';
    g.position.set(px, POLE_BASE_Y);
    g.zIndex = POLE_BASE_Y + 40;
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
        g.rect(-1, -26, 2, 26).fill(0x31443c); // cột
        g.roundRect(-4, -48, 8, 22, 2).fill(0x1d2420); // hộp đèn xe
        g.circle(0, -43, 2.2).fill(state.vehicle === 'red' ? RED : OFF);
        g.circle(0, -37, 2.2).fill(state.vehicle === 'yellow' ? YELLOW : OFF);
        g.circle(0, -31, 2.2).fill(state.vehicle === 'green' ? GREEN : OFF);
        g.roundRect(-4, -24, 8, 10, 2).fill(0x1d2420); // đèn người đi bộ: trên đỏ (dừng), dưới xanh (đi)
        const stopOn = state.pedestrian === 'dont_walk' || (state.pedestrian === 'clearing' && blinkOn);
        g.rect(-2, -22.5, 4, 3).fill(stopOn ? RED : OFF);
        g.rect(-2, -18.5, 4, 3).fill(state.pedestrian === 'walk' ? GREEN : OFF);
      }
    },
  };
}

const SKIN = 0xe3b48a;
const SHIRTS = [0x4f8fba, 0xc1573f, 0x6aa36a];
const PANTS = 0x30384a;

/** Dựng người đi bộ bằng đồ họa pixel nhỏ (đầu, áo, quần, bóng); gốc tọa độ tại chân. */
export function createPedestrianSprite(variant: number): Container {
  const c = new Container();
  c.eventMode = 'none';
  const g = new Graphics();
  g.ellipse(0, 0, 5, 2).fill({ color: 0x26190e, alpha: 0.25 });
  g.rect(-3, -8, 2, 8).fill(PANTS);
  g.rect(1, -8, 2, 8).fill(PANTS);
  g.rect(-4, -17, 8, 9).fill(SHIRTS[((variant % 3) + 3) % 3]);
  g.rect(-5, -16, 1, 6).fill(SKIN);
  g.rect(4, -16, 1, 6).fill(SKIN);
  g.rect(-3, -23, 6, 6).fill(SKIN);
  g.rect(-3, -24, 6, 2).fill(0x2a1c14);
  c.addChild(g);
  return c;
}

/** Đặt vị trí và độ nhún nhẹ khi đang đi. */
export function placePedestrian(sprite: Container, p: StreetPedestrianState, time: number): void {
  const bob = p.state === 'crossing' ? Math.abs(Math.sin(time * 9)) * 1.2 : 0;
  sprite.position.set(Math.round(p.position.x), Math.round(p.position.y - bob));
  sprite.zIndex = p.position.y;
}
