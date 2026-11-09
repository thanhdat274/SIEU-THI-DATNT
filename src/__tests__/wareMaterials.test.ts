import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { storageCapacity } from '../core/gameTypes';
import { MATERIAL_FROM_TIER, MATERIAL_PACK, materialsFor } from '../data/wareMaterials';

/** GĐ1945 — siêu thị phase 2, tranche 3: vật liệu nâng kho. */
const g = () => useGame.getState();

describe('vật liệu nâng kho', () => {
  beforeEach(() => useGame.setState({ ...newGameData(), level: 99, money: 500_000_000, warehouseTier: MATERIAL_FROM_TIER - 1 }));
  it('cấp thấp không cần vật liệu (giữ sim mốc 30)', () => {
    for (let t = 1; t < MATERIAL_FROM_TIER; t++) expect(materialsFor(t)).toEqual({ gach: 0, ximang: 0, thep: 0 });
    useGame.setState({ warehouseTier: 0 });
    expect(g().upgradeWarehouse()).toBe(true);
  });
  it('thiếu vật liệu → từ chối, không trừ tiền', () => {
    expect(g().upgradeWarehouse()).toBe(false);
    expect(g().warehouseTier).toBe(MATERIAL_FROM_TIER - 1);
    expect(g().money).toBe(500_000_000);
  });
  it('đủ vật liệu → trừ vật liệu + nâng; vật liệu không đổi storageCapacity', () => {
    const cap = storageCapacity(g().warehouseTier);
    while (!(g().wareMaterials.gach >= materialsFor(MATERIAL_FROM_TIER).gach && g().wareMaterials.thep >= materialsFor(MATERIAL_FROM_TIER).thep && g().wareMaterials.ximang >= materialsFor(MATERIAL_FROM_TIER).ximang)) g().buyMaterialPack();
    expect(storageCapacity(g().warehouseTier)).toBe(cap);
    const before = { ...g().wareMaterials };
    expect(g().upgradeWarehouse()).toBe(true);
    expect(g().warehouseTier).toBe(MATERIAL_FROM_TIER);
    expect(g().wareMaterials.gach).toBe(before.gach - materialsFor(MATERIAL_FROM_TIER).gach);
  });
  it('mua bộ cộng đúng, persist; bản lưu cũ thiếu field = 0', () => {
    g().buyMaterialPack();
    expect(g().wareMaterials).toEqual(MATERIAL_PACK);
    const snap = snapshot() as Record<string, unknown>;
    applySnapshot(snap);
    expect(g().wareMaterials).toEqual(MATERIAL_PACK);
    delete snap.wareMaterials;
    applySnapshot(snap);
    expect(g().wareMaterials).toEqual({ gach: 0, ximang: 0, thep: 0 });
  });
  it('chưa tới cấp cần vật liệu thì không bán bộ', () => {
    useGame.setState({ warehouseTier: 0 });
    expect(g().buyMaterialPack()).toBe(false);
  });
});
