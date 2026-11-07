import { describe, it, expect } from 'vitest';
import { QualityGovernor } from '../render/graphicsQuality';

/** Playtest P0 M1: Thấp chọn tay mà < 30 FPS → hạ độ nét sâu hơn (0.6), cảnh vẫn đủ (GĐ1235). */
const run = (g: QualityGovernor, fps: number, sec: number) => { for (let t = 0; t < sec * fps; t++) g.update(1 / fps); };
describe('Mức Thấp chọn tay trên máy yếu', () => {
  it('22 FPS → độ nét xuống 0.6, NPC vẫn đủ', () => {
    const g = new QualityGovernor('low', 1, false);
    run(g, 22, 20);
    expect(g.step.pixelRatio).toBeCloseTo(0.6);
    expect(g.content.npcCap).toBe(999);
  });
});
