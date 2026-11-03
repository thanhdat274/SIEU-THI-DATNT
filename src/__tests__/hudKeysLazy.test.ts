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

describe('GĐ636: cảnh báo khách hỏi ở quầy nạp lười', () => {
  it('Hud không định nghĩa CounterAskAlert; HudAlerts export nó', () => {
    expect(readFileSync('src/ui/Hud.tsx', 'utf8')).not.toContain('function CounterAskAlert');
    expect(readFileSync('src/ui/HudAlerts.tsx', 'utf8')).toContain('export function CounterAskAlert');
  });
});

describe('GĐ651: ruột menu Thêm nạp lười', () => {
  it('Hud nạp MoreMenuBody lười, không còn GfxButton; HudMoreBody giữ nút Đồ họa/Phím/Hướng dẫn', () => {
    const hud = readFileSync('src/ui/Hud.tsx', 'utf8');
    expect(readFileSync('src/ui/HudMenus.tsx', 'utf8')).toContain("lazy(() => import('./HudMoreBody')");
    expect(hud).not.toContain('function GfxButton');
    const body = readFileSync('src/ui/HudMoreBody.tsx', 'utf8');
    for (const s of ['function GfxButton', "label: 'Phím'", "label: 'Hướng dẫn'"]) expect(body).toContain(s);
  });
});
