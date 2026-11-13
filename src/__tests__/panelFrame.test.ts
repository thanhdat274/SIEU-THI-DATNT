import { describe, expect, it } from 'vitest';
import { styles } from '../ui/panels/shared';
import { PANEL_HEIGHT } from '../ui/Panels';

/**
 * GĐ662 — khung modal CỐ ĐỊNH (QA toàn diện giao diện).
 *
 * Vì sao khoá: trước GĐ662 `.panel` co theo nội dung (minWidth/maxWidth + maxHeight), nên chuyển
 * tab trong cùng hub làm modal co giãn và nhảy vị trí — QA đo được ở 1280px hub Sổ sách rộng
 * 658→1160px, cao 243→692, nút ✕ nhảy theo (vi phạm checklist "Đồng nhất giao diện": chuyển tab
 * không được làm modal co giãn/nhảy). Sửa: khung cố định theo cỡ màn, nội dung dài cuộn BÊN TRONG
 * (overflowY/X). Test này khoá luật: khung phải có width/height cứng, không được sized theo content.
 */

const panel = () => styles.panel;

describe('khung modal cố định (GĐ662)', () => {
  it('nhánh desktop: width/height cố định theo cỡ màn, không co theo nội dung', () => {
    const p = panel();
    expect(p.width).toBe('min(760px, calc(100vw - 32px))');
    expect(p.height).toBe('min(688px, calc(100dvh - 108px))');
    // Không còn minWidth/maxWidth/maxHeight — thứ đó làm khung nhảy theo nội dung
    expect(p.minWidth).toBeUndefined();
    expect(p.maxWidth).toBeUndefined();
    expect(p.maxHeight).toBeUndefined();
  });

  it('nội dung dài cuộn BÊN TRONG khung: overflowY auto; desktop cuộn ngang cho bảng rộng', () => {
    const p = panel();
    expect(p.overflowY).toBe('auto');
    expect(p.overflowX).toBe('auto');
  });

  it('GĐ2348 — đáy khung có dấu hiệu cuộn: vệt mờ dần local/scroll, nền không dùng shorthand `background`', () => {
    const p = panel();
    // shorthand `background` ghi đè backgroundImage — vệt mờ sẽ biến mất
    expect(p.background).toBeUndefined();
    expect(p.backgroundColor).toBe('#2b2b3a');
    expect(p.backgroundImage).toContain('linear-gradient');
    expect(p.backgroundAttachment).toBe('local, local, scroll, scroll');
  });

  it('GĐ2349 — panel nội dung ngắn chọn khung "vừa" (log 520px), các panel khác giữ khung LỚN 688px', () => {
    expect(PANEL_HEIGHT.log).toBe('min(520px, calc(100dvh - 108px))');
    // chỉ một vài loại được chọn cỡ khác — phần còn lại (kể cả khung LỚN) không bị đụng
    expect(Object.keys(PANEL_HEIGHT)).toEqual(['log', 'mailbox']);
    expect(panel().height).toBe('min(688px, calc(100dvh - 108px))');
  });
});
