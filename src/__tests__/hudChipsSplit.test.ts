import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('GĐ992 — ui/HudChips tách khỏi ui/Hud', () => {
  it('Hud không định nghĩa chip nữa; HudChips export đủ ba chip', () => {
    const hud = readFileSync('src/ui/Hud.tsx', 'utf8');
    const chips = readFileSync('src/ui/HudChips.tsx', 'utf8');
    for (const n of ['SoundToggle', 'MusicToggle', 'MoneyChip']) {
      expect(hud).not.toContain(`function ${n}`);
      expect(chips).toContain(`export function ${n}`);
      expect(hud).toContain(n);
    }
  });
});
