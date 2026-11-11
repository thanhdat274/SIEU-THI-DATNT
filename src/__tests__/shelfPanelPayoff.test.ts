import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Hệ kệ (GĐ226) — payoff mỗi Ô KỆ (shelfSlotValue) được nối vào ĐÚNG chỗ người chơi quyết: dropdown chọn món
// + thẻ ô đang bày trong ShelfPanel (trước đây chỉ thấy ở AnalyticsPanel xa). Khóa bằng nguồn (như gardenPanelPayoff).
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../ui/panels/ShelfPanel.tsx'), 'utf8');

describe('shelfSlotValue — nối vào ShelfPanel (lúc bày kệ)', () => {
  it('import shelfCount + itemHealthList + shelfSlotValue', () => {
    expect(src).toContain("import { shelfCount, itemHealthList } from '../../data/analytics'");
    expect(src).toContain("import { shelfSlotValue } from '../../data/shelfSlotValue'");
  });
  it('dropdown chọn món hiện lãi/ô/ngày từ shelfSlotValue', () => {
    expect(src).toContain("const s = slot.items.find((x) => x.id === p.id);");
    expect(src).toContain('` · lãi ${formatMoney(s.perSlot ?? 0)}/ô/ngày`');
  });
  it('ô đang bày hiện 📊 lãi/ô/ngày + cảnh báo LỖ', () => {
    expect(src).toContain('📊 lãi {formatMoney(s.perSlot ?? 0)}/ô/ngày');
    expect(src).toContain('ĐANG LỖ — nên dọn');
  });
});
