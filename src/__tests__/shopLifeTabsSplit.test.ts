import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('GĐ994 — ui/panels/ShopLifeTabs tách khỏi ui/BusinessPanel', () => {
  it('BusinessPanel không còn định nghĩa 4 tab; ShopLifeTabs export đủ', () => {
    const panel = readFileSync('src/ui/BusinessPanel.tsx', 'utf8');
    const tabs = readFileSync('src/ui/panels/ShopLifeTabs.tsx', 'utf8');
    for (const n of ['Pets', 'Services', 'Life', 'Upgrades']) {
      expect(panel).not.toContain(`function ${n}(`);
      expect(tabs).toContain(`export function ${n}(`);
    }
  });
});
