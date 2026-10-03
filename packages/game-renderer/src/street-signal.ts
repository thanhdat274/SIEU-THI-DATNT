import { Container, Graphics } from 'pixi.js';
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

const SKIN = 0xe3b48a;
const SHIRTS = [0x4f8fba, 0xc1573f, 0x6aa36a, 0xf39c12, 0x8e44ad];
const PANTS = 0x30384a;

/** Hệ số tỉ lệ người đi bộ nền so với nhân vật chính/khách. */
export const PEDESTRIAN_SCALE = 1.6;

/** Dựng người đi bộ bằng đồ họa pixel nhỏ (đầu, áo, quần, bóng); gốc tọa độ tại chân. */
export function createPedestrianSprite(variant: number, activity?: string): Container {
  const c = new Container();
  c.eventMode = 'none';
  const g = new Graphics();
  g.ellipse(0, 0, 5, 2).fill({ color: 0x26190e, alpha: 0.25 });
  g.rect(-3, -8, 2, 8).fill(PANTS);
  g.rect(1, -8, 2, 8).fill(PANTS);
  g.rect(-4, -17, 8, 9).fill(SHIRTS[((variant % SHIRTS.length) + SHIRTS.length) % SHIRTS.length]);
  g.rect(-5, -16, 1, 6).fill(SKIN);
  g.rect(4, -16, 1, 6).fill(SKIN);
  g.rect(-3, -23, 6, 6).fill(SKIN);
  g.rect(-3, -24, 6, 2).fill(0x2a1c14);

  // Phụ kiện / hoạt động sinh động
  if (activity === 'grocery') {
    // Túi đồ tạp hóa đỏ xách trên tay
    g.rect(5, -13, 4, 5).fill(0xe74c3c);
    g.rect(6, -15, 2, 2).fill(0xffffff);
  } else if (activity === 'student') {
    // Balo học sinh trên lưng
    g.rect(-7, -17, 3, 8).fill(0x2980b9);
    g.rect(-6, -15, 2, 4).fill(0xf1c40f);
  } else if (activity === 'jog') {
    // Băng đô thể thao
    g.rect(-3, -22, 6, 2).fill(0xf1c40f);
  } else if (activity === 'dog') {
    // Cún con lon ton đi kèm
    g.ellipse(-11, -3, 4, 3).fill(0xd35400); // Thân cún
    g.circle(-7, -5, 2.5).fill(0xd35400);   // Đầu cún
    g.rect(-6, -6, 1, 1).fill(0x1a1815);   // Mắt
    g.rect(-13, -6, 1, 3).fill(0xd35400);  // Đuôi vểnh
    g.rect(-12, 0, 1, 2).fill(0x2c3e50);   // Chân
    g.rect(-9, 0, 1, 2).fill(0x2c3e50);    // Chân
    g.rect(-7, -4, 9, 1).fill({ color: 0x7f8c8d, alpha: 0.6 }); // Dây dắt chó
  }

  c.addChild(g);
  return c;
}

/** Đặt vị trí và độ nhún nhẹ khi đang đi. */
export function placePedestrian(sprite: Container, p: StreetPedestrianState, time: number): void {
  const isMoving = p.state === 'crossing' || p.state === 'walking';
  const speed = p.activity === 'jog' ? 16 : 9;
  const bob = isMoving ? Math.abs(Math.sin(time * speed)) * (p.activity === 'jog' ? 2 : 1.2) : 0;
  sprite.position.set(Math.round(p.position.x), Math.round(p.position.y - bob));
  sprite.zIndex = p.position.y;

  // Phóng to cho cùng tỉ lệ với người chơi/khách (sprite nhân vật cao ~40 px, người đi bộ vẽ tay chỉ ~24 px).
  sprite.scale.y = PEDESTRIAN_SCALE;
  // Lật hướng nhìn nếu đi bộ ngang vỉa hè
  if (p.direction === 'left') {
    sprite.scale.x = -PEDESTRIAN_SCALE;
  } else if (p.direction === 'right') {
    sprite.scale.x = PEDESTRIAN_SCALE;
  } else {
    sprite.scale.x = Math.sign(sprite.scale.x || 1) * PEDESTRIAN_SCALE;
  }
}
