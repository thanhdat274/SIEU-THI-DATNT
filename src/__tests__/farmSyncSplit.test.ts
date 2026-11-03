import { describe, expect, it, vi } from 'vitest';
import { installFarmSync } from '../world/farmSync';
import { useGame } from '../core/store';

describe('GĐ1004 — world/farmSync tách khỏi main.tsx', () => {
  it('dựng trang trại một lần ngay và dựng lại khi đổi bậc đất', () => {
    const farm = { rebuild: vi.fn(), setBuildings: vi.fn(), setPlots: vi.fn(), setAnimals: vi.fn() };
    installFarmSync(farm);
    expect(farm.rebuild).toHaveBeenCalledTimes(1);
    const g = useGame.getState().garden;
    useGame.setState({ garden: { ...g, land: g.land + 1 } });
    expect(farm.rebuild).toHaveBeenCalledTimes(2);
    useGame.setState({ garden: g });
  });
});
