import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('GĐ635: bảng phím tắt nạp lười', () => {
  it('Hud không còn mảng CONTROLS; HudKeys giữ đủ phím chính', async () => {
    expect(readFileSync('src/ui/Hud.tsx', 'utf8')).not.toContain('const CONTROLS');
    const { CONTROLS } = await import('../ui/HudKeys');
    const keys = CONTROLS.map(([k]) => k);
    for (const k of ['N', 'B', 'K', 'O', 'Esc']) expect(keys).toContain(k);
  });
});
