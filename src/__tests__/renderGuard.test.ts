import { describe, expect, it } from 'vitest';
import { renderLossMessage } from '../render/renderLoss';

/**
 * GĐ175 — Guard mất ngữ cảnh render: WebGL mất context thì three được preventDefault tự dựng
 * lại, còn WebGPU device.lost là mất hẳn. Phần cài listener cần DOM/GPU nên guard viết mỏng;
 * chỗ có logic (chọn lời thoại theo backend + lý do) tách riêng kiểm tra thuần.
 */
describe('GĐ175 — lời cảnh báo mất ngữ cảnh render', () => {
  it('WebGPU: nhắc F5 và an toàn save (không hù mất tiến trình)', () => {
    const msg = renderLossMessage('webgpu');
    expect(msg).toContain('F5');
    expect(msg).toContain('lưu tự động');
  });

  it('WebGL: nói rõ đang thử phục hồi thay vì hù luôn là hỏng', () => {
    const msg = renderLossMessage('webgl');
    expect(msg).toContain('phục hồi');
    expect(msg).toContain('F5');
  });

  it('lý do từ GPU (nếu có) được ghi kèm để dò máy người chơi', () => {
    expect(renderLossMessage('webgpu', 'out-of-memory')).toContain('out-of-memory');
    expect(renderLossMessage('webgpu', undefined)).not.toContain('undefined');
  });
});
