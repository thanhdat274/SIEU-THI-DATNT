import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { COIN_POP_LIFETIME, coinPopLabel, coinPopPose } from '../render/fx/coinPop';

/**
 * GĐ173 — Juice bán hàng kiểu game nông trại: mỗi lần tính tiền xong, một bong bóng
 * "+12.000đ" bay lên từ quầy (sprite canvas, pool tái dùng). Phần thuần để test: nhãn tiền
 * và đường bay; phần canvas/sprite (cần DOM) thì mỏng và không nhúng logic gì.
 */
describe('GĐ173 — bong bóng tiền bay ở quầy', () => {
  it('nhãn theo formatMoney của game, kẹp số âm về 0', () => {
    expect(coinPopLabel(12000)).toBe('+12.000đ');
    expect(coinPopLabel(1234.4)).toBe('+1.234đ');
    expect(coinPopLabel(0)).toBe('+0đ');
    expect(coinPopLabel(-5000)).toBe('+0đ');
  });

  it('đường bay: sinh thấp, lên cao dần chậm dần, hết đời thì tan hết', () => {
    const born = coinPopPose(0);
    expect(born.y).toBe(0);
    expect(born.opacity).toBe(1);
    const mid = coinPopPose(COIN_POP_LIFETIME / 2);
    const late = coinPopPose((COIN_POP_LIFETIME * 3) / 4);
    expect(mid.y).toBeGreaterThan(0);
    // Nửa sau đi được ít hơn nửa đầu (ease-out): bay chậm dần thay vì phóng tận trời
    expect(late.y - mid.y).toBeLessThan(mid.y - born.y);
    const end = coinPopPose(COIN_POP_LIFETIME + 5);
    expect(end.opacity).toBe(0);
    expect(end.y).toBeGreaterThan(mid.y); // tan trong khi vẫn ở trên cao
  });

  it('độ tuổi âm (khỏi rơi vào vì lỗi dt) không nổ ra', () => {
    expect(coinPopPose(-1).y).toBe(0);
    expect(coinPopPose(-1).opacity).toBe(1);
  });

  it('đời bong bóng đủ dài để đọc nhưng không loè loẹt vướng cảnh', () => {
    expect(COIN_POP_LIFETIME).toBeGreaterThanOrEqual(1);
    expect(COIN_POP_LIFETIME).toBeLessThanOrEqual(3);
  });

  it('node không DOM: CustomerManager.new → CoinPopFX tạo/spawn/update/dispose đều không nổ', async () => {
    // Regression GĐ173: counterPolicy.test dựng CustomerManager trong node — pool phải lười
    // tạo và im lặng bỏ qua khi không có document (thay vì làm nổ cả suite).
    const { CoinPopFX } = await import('../render/fx/coinPop');
    const sceneStub = { add() {}, remove() {} };
    const fx = new CoinPopFX(sceneStub as never);
    expect(() => fx.spawn(new THREE.Vector3(1, 0, 1), 12000)).not.toThrow();
    expect(() => fx.update(0.016)).not.toThrow();
    expect(() => fx.dispose()).not.toThrow();
  });
});
