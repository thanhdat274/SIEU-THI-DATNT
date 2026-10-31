import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

/** moveFurniture / moveMainCounter — dời đồ miễn phí: giữ nguyên uid, hàng trên kệ và tiền; uid lạ bỏ qua. */

const g = () => useGame.getState();

beforeEach(() => {
  useGame.setState({ ...newGameData(), money: 5_000_000 });
});

describe('moveFurniture', () => {
  it('đổi vị trí/hướng, giữ uid, loại, hàng trên kệ và không tốn tiền', () => {
    const before = g().furniture[0];
    expect(before).toBeDefined();
    const money = g().money;
    g().moveFurniture(before.uid, before.x + 1, before.z - 1, before.rot + Math.PI / 2);
    const after = g().furniture.find((f) => f.uid === before.uid)!;
    expect(after).toMatchObject({ uid: before.uid, type: before.type, x: before.x + 1, z: before.z - 1, rot: before.rot + Math.PI / 2 });
    expect(after.tiers).toEqual(before.tiers);
    expect(g().furniture).toHaveLength(newGameData().furniture.length);
    expect(g().money).toBe(money);
  });

  it('uid không tồn tại: danh sách đồ không đổi', () => {
    const list = g().furniture;
    g().moveFurniture(999_999, 1, 1, 0);
    expect(g().furniture).toEqual(list);
  });
});

describe('moveMainCounter', () => {
  it('đặt quầy chính tới vị trí mới, không tốn tiền', () => {
    const money = g().money;
    g().moveMainCounter(2, -3, Math.PI);
    expect(g().mainCounter).toEqual({ x: 2, z: -3, rot: Math.PI });
    expect(g().money).toBe(money);
  });
});
