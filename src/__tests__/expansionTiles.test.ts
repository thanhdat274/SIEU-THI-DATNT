import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { SHOP_TIERS } from '../data/shopTiers';
import { EXPANSION_TILE_CAP, MAX_SHOP_TIER, expansionTilePrice, isContiguous, shopFootprint } from '../data/expansionTiles';

/** GĐ1944 — siêu thị phase 2, tranche 2: ô mở rộng tiếp giáp sau bậc Đại siêu thị. */
const g = () => useGame.getState();

describe('expansionTiles thuần', () => {
  it('giá theo công thức đơn vị·k·(k+1)', () => {
    expect(expansionTilePrice(1)).toBe(2_000_000);
    expect(expansionTilePrice(3)).toBe(12_000_000);
  });
  it('mọi ô tới cap đều tiếp giáp khuôn trước đó', () => {
    for (let k = 1; k <= EXPANSION_TILE_CAP; k++) expect(isContiguous(k)).toBe(true);
    expect(isContiguous(0)).toBe(false);
  });
  it('ô chỉ tính ở bậc cuối, bị chặn ở cap', () => {
    expect(shopFootprint(MAX_SHOP_TIER - 1, 3)).toEqual({ width: SHOP_TIERS[MAX_SHOP_TIER - 1].width, depth: SHOP_TIERS[MAX_SHOP_TIER - 1].depth });
    expect(shopFootprint(MAX_SHOP_TIER, 99).depth).toBe(SHOP_TIERS[MAX_SHOP_TIER].depth + EXPANSION_TILE_CAP);
  });
});

describe('buyExpansionTile', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), money: 500_000_000 }));
  it('chặn khi chưa bậc max', () => {
    useGame.setState({ shopTier: MAX_SHOP_TIER - 1 });
    expect(g().buyExpansionTile()).toBe(false);
    expect(g().extraTiles).toBe(0);
  });
  it('bậc max: trừ đúng giá, dời đồ theo, persist; dừng ở cap', () => {
    useGame.setState({ shopTier: MAX_SHOP_TIER, furniture: [{ uid: 1, type: 'shelf', x: 0, z: 0, rot: 0, tiers: [] }] });
    expect(g().buyExpansionTile()).toBe(true);
    expect(g().money).toBe(500_000_000 - expansionTilePrice(1));
    expect(g().furniture[0].z).toBe(0.5);
    const snap = snapshot();
    useGame.setState({ extraTiles: 0 });
    applySnapshot(snap);
    expect(g().extraTiles).toBe(1);
    while (g().buyExpansionTile());
    expect(g().extraTiles).toBe(EXPANSION_TILE_CAP);
  });
  it('bản lưu cũ thiếu extraTiles = 0', () => {
    const snap = snapshot() as Record<string, unknown>;
    delete snap.extraTiles;
    applySnapshot(snap);
    expect(g().extraTiles).toBe(0);
  });
});
