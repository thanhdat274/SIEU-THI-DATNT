// Test cho scripts/persona-digest.mjs — bản tóm tắt trạng thái game làm nền cho persona feedback panel.
// Kiểm các hàm phân tích thuần: dò GĐ, mốc gần đây, luật cứng, bảng ngân sách, tầm nhìn.
import { describe, it, expect } from 'vitest';
import {
  latestGd,
  recentMilestones,
  hardRules,
  budgetsTable,
  vision,
  buildDigest,
} from '../../scripts/persona-digest.mjs';

const PROGRESS_SAMPLE = `
## Tầm nhìn game
**Game là gì?** Mô phỏng quản lý tiệm tạp hóa Việt Nam 3D.
**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ.

## Trạng thái hiện tại (06/11/2026)
- **GĐ1437 (tiệm xôi +2 món)**: Xôi gà xé, Xôi chả lụa. Full suite xanh.
- **GĐ1436 (quán nước +3 món)**: Trà dứa, ép táo, sinh tố bơ.
- Chi tiết cũ: docs/progress-archive/PROGRESS-GD1404-1407.md
`;

const PROMPT_SAMPLE = `
## Luật cứng (không bao giờ vi phạm)
1. Mọi việc phải giúp thu hút hoặc giữ chân người chơi.
2. Chiều sâu trước, mở rộng sau.

## Ngân sách chống phình
| Thứ | Trần hiện tại | Test / lệnh |
|---|---|---|
| Nút HUD (dock + menu Thêm) | 20 | featureBudget.test.ts |
| Thông báo dài nhất | 90 | featureBudget.test.ts |
`;

describe('persona-digest', () => {
  it('tìm GĐ lớn nhất trong văn bản', () => {
    expect(latestGd(PROGRESS_SAMPLE)).toBe(1437);
    expect(latestGd('không có mốc')).toBeNull();
  });

  it('trích các mốc GĐ gần đây (dòng gạch đầu dòng)', () => {
    const ms = recentMilestones(PROGRESS_SAMPLE);
    expect(ms.length).toBeGreaterThanOrEqual(2);
    expect(ms[0]).toContain('GĐ1437');
    expect(ms[1]).toContain('GĐ1436');
  });

  it('không nhầm dòng "GĐxxxx" trong đường dẫn archive thành mốc', () => {
    // Dòng archive là đường dẫn, không phải dòng `- **GĐxxxx**:`
    for (const m of recentMilestones(PROGRESS_SAMPLE)) {
      expect(m).toMatch(/^GĐ/);
    }
  });

  it('trích danh sách luật cứng theo dòng đánh số', () => {
    const rules = hardRules(PROMPT_SAMPLE);
    expect(rules[0]).toContain('giữ chân người chơi');
    expect(rules[1]).toContain('Chiều sâu trước');
  });

  it('trích hàng dữ liệu của bảng ngân sách (bỏ tiêu đề + kẻ)', () => {
    const rows = budgetsTable(PROMPT_SAMPLE);
    expect(rows.length).toBe(2);
    expect(rows[0][0]).toContain('Nút HUD');
    expect(rows[1][1]).toContain('90');
  });

  it('trích tầm nhìn dưới tiêu đề Tầm nhìn game', () => {
    const v = vision(PROGRESS_SAMPLE);
    expect(v).toContain('tạp hóa Việt Nam');
    expect(v).toContain('niềm tự hào');
  });

  it('buildDigest gộp đủ các phần và ném lỗi khi thiếu input', () => {
    const d = buildDigest({ progress: PROGRESS_SAMPLE, prompt: PROMPT_SAMPLE });
    expect(d.currentGd).toBe(1437);
    expect(d.gameName).toBe('Tạp Hóa 3D');
    expect(d.hardRules.length).toBeGreaterThan(0);
    expect(d.budgets.length).toBeGreaterThan(0);
    expect(() => buildDigest({ progress: '', prompt: '' })).toThrow();
  });
});
