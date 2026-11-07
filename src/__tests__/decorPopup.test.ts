import { describe, it, expect } from 'vitest';
import { decorPopupLine } from '../data/decorPopup';
import { VIET_SET } from '../data/decorSets';
import { furnitureDef } from '../data/furniture';

describe('GĐ1532 popup decor', () => {
  it('món Đồ Việt hiện điểm decor + nhãn bộ', () => {
    const t = VIET_SET[0];
    const line = decorPopupLine(t)!;
    expect(line).toContain(`+${furnitureDef(t).decor} 🩷`);
    expect(line).toContain('Đồ Việt');
  });
  it('món không decor thì không hiện', () => {
    expect(decorPopupLine('shelf' as never)).toBeNull();
  });
});
