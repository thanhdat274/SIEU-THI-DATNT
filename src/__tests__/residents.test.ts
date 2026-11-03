// GĐ1010 — bảo vệ người dân trong hẻm ra/về ĐÚNG GIỜ (phố sống động, ai cũng có ca riêng; y tá ca đêm
// ngược lại). Tách logic THUẦN `isResidentAway(leave, back, minutes)` khỏi ResidentManager.reset —
// trước đây toàn bộ file agents/residents.ts 0% coverage. Test bờ chính xác cho cả ca thường và ca đêm.
import { describe, it, expect } from 'vitest';
import { isResidentAway } from '../agents/residents';

// Ca thường: ra 7h (420), về 17h30 (1050) — ra rồi về CÙNG ngày.
const NORMAL = { leave: 7 * 60, back: 17 * 60 + 30 };
// Y tá ca đêm: ra 18h30 (1110), về 7h30 (450) — ra tối nay về SÁNG MAI (qua nửa đêm).
const NURSE = { leave: 18 * 60 + 30, back: 7 * 60 + 30 };

describe('isResidentAway — người dân ra/về đúng giờ (ca thường)', () => {
  it('trong khung giờ làm (≥ ra, < về) → đang ở ngoài', () => {
    expect(isResidentAway(NORMAL.leave, NORMAL.back, 12 * 60)).toBe(true);
    expect(isResidentAway(NORMAL.leave, NORMAL.back, 17 * 60)).toBe(true);
  });

  it('bờ: đúng giờ RA → đã ở ngoài; đúng giờ VỀ → về nhà (không âm, không lệch)', () => {
    expect(isResidentAway(NORMAL.leave, NORMAL.back, NORMAL.leave)).toBe(true); // 420
    expect(isResidentAway(NORMAL.leave, NORMAL.back, NORMAL.back)).toBe(false); // 1050
    expect(isResidentAway(NORMAL.leave, NORMAL.back, NORMAL.back - 1)).toBe(true);
    expect(isResidentAway(NORMAL.leave, NORMAL.back, NORMAL.leave - 1)).toBe(false);
  });

  it('trước giờ ra và sau giờ về → đang ở nhà', () => {
    expect(isResidentAway(NORMAL.leave, NORMAL.back, 6 * 60)).toBe(false);
    expect(isResidentAway(NORMAL.leave, NORMAL.back, 23 * 60)).toBe(false);
  });
});

describe('isResidentAway — y tá ca đêm (vượt nửa đêm, leave >= back)', () => {
  it('ban đêm (≥ ra) và rạng sáng (< về) → đang ở ngoài', () => {
    expect(isResidentAway(NURSE.leave, NURSE.back, 22 * 60)).toBe(true);
    expect(isResidentAway(NURSE.leave, NURSE.back, 6 * 60)).toBe(true); // 6h sáng chưa về 7h30
    expect(isResidentAway(NURSE.leave, NURSE.back, 24 * 60)).toBe(true); // 0h đêm
  });

  it('giữa ngày (sau về, trước ra) → đã về nhà nghỉ', () => {
    expect(isResidentAway(NURSE.leave, NURSE.back, 12 * 60)).toBe(false);
    expect(isResidentAway(NURSE.leave, NURSE.back, 17 * 60)).toBe(false);
  });

  it('bờ ca đêm: đúng giờ RA → ngoài; đúng giờ VỀ → không còn ngoài; rạng sáng trước về → còn ngoài', () => {
    expect(isResidentAway(NURSE.leave, NURSE.back, NURSE.leave)).toBe(true); // 1110
    expect(isResidentAway(NURSE.leave, NURSE.back, NURSE.back)).toBe(false); // 450 → đã về hẳn
    expect(isResidentAway(NURSE.leave, NURSE.back, NURSE.back - 1)).toBe(true); // 449 → sáng sớm vẫn ngoài
  });
});
