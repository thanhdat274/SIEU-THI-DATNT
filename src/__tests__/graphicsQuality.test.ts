import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GFX_PRESETS,
  GFX_TARGET,
  QualityGovernor,
  buildLadder,
  detectLevel,
  parseChoice,
  recordPerf,
  type GfxLevel,
} from '../render/graphicsQuality';

/**
 * Mức đồ họa Thấp/Vừa/Cao + bộ tự hạ nhiều tầng: máy yếu phải được nhận ra ngay, bộ tự hạ phải
 * đi hết độ nét rồi mới tắt bóng / bớt NPC / ẩn đồ trang trí, và mức Thấp thật sự nhẹ hơn mọi mặt.
 */
describe('mức đồ họa — cấu hình', () => {
  it('mức thấp hơn không bao giờ nặng hơn mức cao hơn ở bất kỳ thông số nào', () => {
    const order: GfxLevel[] = ['low', 'medium', 'high'];
    for (let i = 1; i < order.length; i++) {
      const lo = GFX_PRESETS[order[i - 1]], hi = GFX_PRESETS[order[i]];
      expect(lo.maxPixelRatio).toBeLessThanOrEqual(hi.maxPixelRatio);
      expect(lo.shadowMapSize).toBeLessThanOrEqual(hi.shadowMapSize);
      expect(lo.npcCap).toBeLessThanOrEqual(hi.npcCap);
      expect(lo.animFarDist).toBeLessThanOrEqual(hi.animFarDist);
      expect(lo.rainDrops).toBeLessThanOrEqual(hi.rainDrops);
      expect(lo.clouds).toBeLessThanOrEqual(hi.clouds);
      expect(lo.stars).toBeLessThanOrEqual(hi.stars);
      expect(lo.lightPool).toBeLessThanOrEqual(hi.lightPool);
      expect(Number(lo.shadows)).toBeLessThanOrEqual(Number(hi.shadows));
    }
  });

  it('mức Thấp tắt bóng, ẩn đồ trang trí và giới hạn đám đông', () => {
    expect(GFX_PRESETS.low.shadows).toBe(false);
    expect(GFX_PRESETS.low.decor).toBe(false);
    expect(GFX_PRESETS.low.npcCap).toBeLessThanOrEqual(12);
    expect(GFX_PRESETS.low.maxPixelRatio).toBeLessThanOrEqual(1);
  });

  it('ngưỡng tự hạ giữ trên sàn 30 FPS và có vùng đệm chống nhấp nháy lên/xuống', () => {
    expect(GFX_TARGET.downFps).toBeGreaterThan(GFX_TARGET.floorFps);
    expect(GFX_TARGET.upFps).toBeGreaterThan(GFX_TARGET.downFps + 5);
  });

  it('parseChoice chỉ nhận đúng 4 giá trị', () => {
    expect(parseChoice('low')).toBe('low');
    expect(parseChoice('auto')).toBe('auto');
    expect(parseChoice('ultra')).toBeNull();
    expect(parseChoice(null)).toBeNull();
  });
});

describe('nhận diện máy', () => {
  it('card onboard đời cũ / giả lập phần mềm → Thấp (kể cả laptop không cảm ứng)', () => {
    expect(detectLevel({ coarse: false, cores: 8, memoryGb: 8, gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)' })).toBe('low');
    expect(detectLevel({ coarse: false, cores: 8, gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))' })).toBe('low');
    expect(detectLevel({ coarse: false, gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe('low');
  });

  it('máy ít nhân / ít RAM → Thấp hoặc Vừa', () => {
    expect(detectLevel({ coarse: false, cores: 2, memoryGb: 8 })).toBe('low');
    expect(detectLevel({ coarse: false, cores: 4, memoryGb: 8, gpu: 'NVIDIA GeForce GTX 1650' })).toBe('medium');
  });

  it('onboard đời mới (Iris Xe, Radeon Graphics) → Vừa; card rời mạnh → Cao', () => {
    expect(detectLevel({ coarse: false, cores: 8, memoryGb: 16, gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)' })).toBe('medium');
    expect(detectLevel({ coarse: false, cores: 12, memoryGb: 16, gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)' })).toBe('high');
  });

  it('điện thoại: mặc định Thấp, chỉ máy nhiều RAM + nhân mới lên Vừa, không bao giờ Cao', () => {
    expect(detectLevel({ coarse: true })).toBe('low');
    expect(detectLevel({ coarse: true, cores: 8, memoryGb: 4, gpu: 'Adreno (TM) 730' })).toBe('low');
    expect(detectLevel({ coarse: true, cores: 8, memoryGb: 8, gpu: 'Adreno (TM) 730' })).toBe('medium');
    expect(detectLevel({ coarse: true, cores: 8, memoryGb: 8, gpu: 'Mali-G52' })).toBe('low');
  });

  it('trình duyệt giấu hết thông tin → không đoán bừa là máy yếu', () => {
    expect(detectLevel({ coarse: false })).toBe('high');
  });
});

describe('bộ tự hạ nhiều tầng', () => {
  it('thang Tự động: hết độ nét của mức trên mới xuống mức dưới, kết thúc ở Thấp', () => {
    const l = buildLadder('high', 2, true);
    expect(l[0]).toEqual({ level: 'high', pixelRatio: 2 });
    expect(l[l.length - 1].level).toBe('low');
    const levels = l.map((s) => s.level);
    expect(levels.indexOf('medium')).toBeGreaterThan(levels.lastIndexOf('high'));
    expect(levels.indexOf('low')).toBeGreaterThan(levels.lastIndexOf('medium'));
    // Trong cùng mức thì độ nét giảm dần
    for (let i = 1; i < l.length; i++) if (l[i].level === l[i - 1].level) expect(l[i].pixelRatio).toBeLessThan(l[i - 1].pixelRatio);
  });

  it('không vượt độ nét gốc của màn hình', () => {
    for (const s of buildLadder('high', 1, true)) expect(s.pixelRatio).toBeLessThanOrEqual(1);
  });

  it('chọn cố định một mức: chỉ co giãn độ nét, không tự đổi mức', () => {
    const l = buildLadder('medium', 2, false);
    expect(new Set(l.map((s) => s.level))).toEqual(new Set(['medium']));
  });

  const feed = (g: QualityGovernor, fps: number, seconds: number) => {
    let changed = 0;
    const dt = 1 / fps;
    for (let t = 0; t < seconds; t += dt) if (g.update(dt)) changed++;
    return changed;
  };

  it('máy giật 20 FPS kéo dài → tụt hết thang xuống Thấp (tắt bóng, bớt NPC)', () => {
    const g = new QualityGovernor('high', 2, true);
    feed(g, 20, 60);
    expect(g.step.level).toBe('low');
    expect(g.preset.shadows).toBe(false);
    expect(g.step).toEqual(g.ladder[g.ladder.length - 1]);
  });

  it('máy khỏe lại 60 FPS → leo dần lên, không vượt bậc khởi đầu', () => {
    const g = new QualityGovernor('medium', 2, true);
    feed(g, 20, 40);
    expect(g.step.level).toBe('low');
    feed(g, 60, 200);
    expect(g.step).toEqual(g.ladder[0]);
    expect(g.step.level).toBe('medium');
  });

  it('FPS chập chờn quanh ngưỡng lên (50) → không đổi bậc liên tục', () => {
    const g = new QualityGovernor('high', 2, true);
    expect(feed(g, 50, 60)).toBe(0);
  });

  it('nhật ký hiệu năng giữ 7 ngày gần nhất, ghi đè đúng ngày', () => {
    let log = recordPerf({ day: 1, fps: 30.4, level: 'low' }, []);
    for (let d = 2; d <= 9; d++) log = recordPerf({ day: d, fps: 50, level: 'medium' }, log);
    log = recordPerf({ day: 9, fps: 58, level: 'high' }, log);
    expect(log).toHaveLength(7);
    expect(log[0].day).toBe(3);
    expect(log.filter((e) => e.day === 9)).toEqual([{ day: 9, fps: 58, level: 'high' }]);
  });
});

describe('giới hạn đám đông (Walker)', () => {
  beforeAll(() => {
    const ctx = new Proxy({}, { get: (_t, p) => (p === 'measureText' ? () => ({ width: 0 }) : () => {}), set: () => true });
    (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx }) };
  });

  it('chỉ vẽ `cap` người gần camera nhất; người bị ẩn vẫn đi được; người ẩn sẵn không bị tính', async () => {
    const { Walker, applyCrowdLod } = await import('../agents/walker');
    const scene = new THREE.Scene();
    const ws = Array.from({ length: 6 }, (_, i) => {
      const w = new Walker(0xff0000);
      w.position.set(i * 5, 0, 0);
      scene.add(w.mesh);
      return w;
    });
    const hidden = new Walker(0x00ff00);
    hidden.mesh.visible = false; // hàng xóm đang ở trong nhà
    scene.add(hidden.mesh);
    const focus = new THREE.Vector3(0, 0, 0);
    applyCrowdLod(focus, 3, 12);
    expect(ws.map((w) => w.culled)).toEqual([false, false, false, true, true, true]);
    expect(hidden.culled).toBe(false);
    // Không đụng mesh.visible (khách/hàng xóm dùng nó làm trạng thái)
    expect(ws.every((w) => w.mesh.visible)).toBe(true);
    // Người ở xa > 12 m cử động thưa
    expect(ws.map((w) => w.animFar)).toEqual([false, false, false, true, true, true]);
    // Người bị ẩn vẫn chạy logic đi đường
    const far = ws[5];
    far.path = [new THREE.Vector3(30, 0, 5)];
    far.step(1);
    expect(far.position.z).toBeGreaterThan(0);
    // Camera dời đi → người kia được vẽ lại
    applyCrowdLod(new THREE.Vector3(25, 0, 0), 3, 12);
    expect(ws[5].culled).toBe(false);
    expect(ws[0].culled).toBe(true);
    for (const w of [...ws, hidden]) w.dispose();
  });
});

describe('Đổi mức đồ họa lúc chạy không làm đứng hình', () => {
  it('main.tsx không gán sun.castShadow lúc chạy (đổi là biên dịch lại mọi pipeline ~2s)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/sun\.castShadow\s*=[^=]/);
    expect(src).toMatch(/sun\.shadow\.intensity\s*=/);
  });
});
