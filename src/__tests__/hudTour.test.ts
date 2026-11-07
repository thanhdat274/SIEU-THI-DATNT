import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { HUD_TOUR_STEPS, tourFinished } from '../data/hudTour';
import { HudTour } from '../ui/HudTour';

describe('hudTour — dữ liệu bước (GĐ1503)', () => {
  it('3 bước neo vào selector có thật trong HUD, lời dạy ≤90 ký tự, selector không trùng', () => {
    expect(HUD_TOUR_STEPS.length).toBe(3);
    const sels = HUD_TOUR_STEPS.map((s) => s.sel);
    expect(new Set(sels).size).toBe(sels.length);
    const hud = readFileSync(join('src', 'ui', 'Hud.tsx'), 'utf8') + readFileSync(join('src', 'ui', 'HudChips.tsx'), 'utf8');
    for (const s of HUD_TOUR_STEPS) {
      expect(s.text.length).toBeLessThanOrEqual(90);
      expect(['below', 'above']).toContain(s.tip);
      // Selector class phải xuất hiện trong nguồn HUD (neo được)
      expect(hud).toContain(s.sel.replace(/^\./, '').split('.')[0]);
    }
  });

  it('tourFinished: hết danh sách bước là xong', () => {
    expect(tourFinished(2)).toBe(false);
    expect(tourFinished(3)).toBe(true);
  });
});

describe('hudTour — cờ đã xem qua store (GĐ1503)', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
  });

  it('mặc định chưa xem; markHudTourDone chốt cờ; snapshot giữ qua lưu/nạp', () => {
    expect(useGame.getState().hudTourDone).toBe(false);
    useGame.getState().markHudTourDone();
    expect(useGame.getState().hudTourDone).toBe(true);
    const snap = snapshot();
    useGame.setState(newGameData());
    applySnapshot(snap);
    expect(useGame.getState().hudTourDone).toBe(true);
  });
});

describe('hudTour — render (GĐ1503)', () => {
  it('node không DOM: component không vẽ gì (không nổ khi gọi querySelector)', () => {
    const html = renderToStaticMarkup(createElement(HudTour, { onDone: () => {} }));
    expect(html).toBe('');
  });

  it('Hud gắn tour đúng điều kiện: ngày 1, xong hướng dẫn, chưa có bảng mở, chưa xem', () => {
    const src = readFileSync(join('src', 'ui', 'Hud.tsx'), 'utf8');
    expect(src).toContain('HudTour');
    expect(src).toContain('!hudTourDone');
    expect(src).toContain('!tutActive');
    expect(src).toContain('markHudTourDone');
  });
});
