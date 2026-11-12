import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ui = (rel: string) => readFileSync(resolve(process.cwd(), 'src/ui', rel), 'utf8');

describe('UI polish & contrast regression guards', () => {
  it('minigames.css sets dark text color on cream .mini-card, pointer-events on backdrop, and clamps Đèn ông sao paste positions', () => {
    const css = ui('minigames/minigames.css');
    const backdropBlock = css.slice(css.indexOf('.mini-backdrop {'), css.indexOf('}', css.indexOf('.mini-backdrop {')) + 1);
    expect(backdropBlock).toContain('pointer-events: auto');
    const cardBlock = css.slice(css.indexOf('.mini-card {'), css.indexOf('}', css.indexOf('.mini-card {')) + 1);
    expect(cardBlock).toContain('background: #fffaf0');
    expect(cardBlock).toMatch(/color:\s*#[0-9a-fA-F]{3,6}/);
    expect(css).toContain('calc(100% - 76px)');
  });

  it('BanhChung avoids duplicate React keys for repeated folding steps', () => {
    const tsx = ui('minigames/BanhChung.tsx');
    expect(tsx).toContain('key={`${step}-${i}`}');
  });

  it('dark-mode panels do not regress to light-theme backgrounds, low-contrast text, or undefined styles', () => {
    expect(ui('panels/GardenPanel.tsx')).not.toContain('#fdf6e3');
    expect(ui('panels/MorningLifeEventCards.tsx')).not.toMatch(/#fff8f0|#a0522d|#7f5539|#8b4513/);
    expect(ui('panels/MorningCrisisCards.tsx')).not.toMatch(/#a0522d|#8b0000|#228b22/);
    expect(ui('panels/PricePanel.tsx')).not.toMatch(/styles\.(fire|hire)\b/);
    expect(ui('CostumePanel.tsx')).not.toContain("'#2b2b3a'");
    expect(ui('ContractsPanel.tsx')).not.toContain("'#2b2b3a'");
  });

  it('HudMoreBody supports both string and { type } search hits, and Footer defaults pin = true', () => {
    const more = ui('HudMoreBody.tsx');
    expect(more).toContain("typeof raw === 'string' ? raw : raw?.type");
    const shared = ui('panels/shared.tsx');
    expect(shared).toContain('pin = true');
    const panels = ui('Panels.tsx');
    expect(panels).toContain("minHeight: '100%'");
  });

  it('all standard panels include Footer close control', () => {
    const files = [
      'CostumePanel.tsx',
      'ContractsPanel.tsx',
      'QuestPanel.tsx',
      'BusinessPanel.tsx',
      'BranchPanel.tsx',
      'panels/TodoListPanel.tsx',
      'panels/NotifLogPanel.tsx',
      'panels/DossierPanel.tsx',
    ];
    for (const f of files) {
      expect(ui(f), f).toContain('<Footer');
    }
  });

  it('Sổ đầu ngày (GĐ2368): lưới "Xem thêm" kẹp track minmax(0,1fr) và chip giờ biểu đồ co được — không tràn khung màn hẹp', () => {
    // Chip giờ nowrap cứng từng đẩy track lưới max-content ~308px → cả cụm thẻ trong "Xem thêm"
    // tràn khung phải ~26px ở 320px (audit trình duyệt GĐ2368: 41 phần tử leak → 0 sau vá).
    const morning = ui('panels/MorningPanel.tsx');
    expect(morning).toMatch(/gridTemplateColumns:\s*'minmax\(0, 1fr\)'/);
    const cd = ui('panels/CounterDemandCard.tsx');
    // chip div + nhãn span đều phải có minWidth: 0 (cho flex co dưới min-content) + ellipsis
    expect(cd.match(/minWidth: 0/g)?.length).toBeGreaterThanOrEqual(2);
    expect(cd).toContain("textOverflow: 'ellipsis'");
  });
});
