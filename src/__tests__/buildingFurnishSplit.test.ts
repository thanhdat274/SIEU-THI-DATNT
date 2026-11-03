import { describe, expect, it } from 'vitest';
import * as furnish from '../world/buildingFurnish';
import * as buildings from '../world/buildings';

describe('GĐ995 — world/buildingFurnish tách khỏi world/buildings', () => {
  it('createCounter/createRegister giữ API qua buildings', () => {
    expect(buildings.createCounter).toBe(furnish.createCounter);
    expect(buildings.createRegister).toBe(furnish.createRegister);
  });
  it('quạt trần và điều hòa dựng được (không cần canvas)', () => {
    expect(furnish.createCeilingFan(3).children.length).toBeGreaterThan(0);
    expect(furnish.createAirCon().children.length).toBeGreaterThan(0);
  });
});
