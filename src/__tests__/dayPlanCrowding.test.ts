import { describe, expect, it } from 'vitest';
import { planDay, type DayAction } from '../data/dayPlan';
import { branchStaffWish, newBranch } from '../data/branches';
import { branchMorningPlan } from '../data/branchMorning';
import { landmarkDayAction } from '../data/landmark';

/**
 * GĐ745 — rà Sổ đầu ngày sau khi thêm 3 nhóm việc mới (wish nhân viên 727/731 · góp công trình 741 ·
 * trả góp quầy 734): cap 7 có chèn ép việc quan trọng (danger/hợp đồng/vay) không?
 * Danger luôn xếp trước → các việc mới (non-danger) không được đè lên danger; nếu dư 7 chỗ thì
 * việc mới chiếm chỗ của việc cũ cùng tầng — xếp priority hợp lý là đủ.
 */

const d = (icon: string, text: string, danger: boolean, priority: number): DayAction => ({ icon, text, panel: 'x', danger, priority });

describe('GĐ745 — cap 7 với các việc mới', () => {
  it('danger đầy 7 chỗ: việc mới (non-danger) không chiếm chỗ của danger', () => {
    const dangers = [
      d('🌙', 'Đêm chưa có thu ngân', true, 1),
      d('🧾', 'Giấy phép hết hạn', true, 1),
      d('📦', 'Hợp đồng đến hạn', true, 0),
      d('🏦', 'Nợ ngân hàng sắp hạn', true, 0),
      d('☕', 'Quán nước thiếu kho', true, 1),
      d('🍚', 'Ngày cúng thiếu nhang', true, 1),
      d('🛒', 'Chợ phiên mai — trữ hàng', true, 2),
    ];
    const newStuff = [
      d('😴', 'nv1 xin nghỉ hôm nay', false, 1),
      d('💡', 'Góp vật liệu Đèn Đường hôm nay', false, 3),
    ];
    const out = planDay([...dangers, ...newStuff]);
    expect(out.filter((c) => c.danger)).toHaveLength(7);
    expect(out.some((c) => !c.danger)).toBe(false);
  });
  it('danger ít chỗ: việc mới vào đúng tầng priority của mình (priority 1 trước priority 3)', () => {
    const dangers = [d('📦', 'Hợp đồng đến hạn', true, 0)];
    const oldStuff = [
      d('🏢', 'Việc chi nhánh cũ', false, 1),
      d('🤝', 'Lập đối tác', false, 3),
    ];
    const newStuff = [
      d('😴', 'nv1 xin nghỉ hôm nay', false, 1),
      d('💡', 'Góp vật liệu Đèn Đường hôm nay', false, 3),
    ];
    const out = planDay([...dangers, ...oldStuff, ...newStuff]);
    const nonDanger = out.filter((c) => !c.danger);
    expect(nonDanger[0].text).toBe('Việc chi nhánh cũ'); // priority 1 trước
    expect(nonDanger[1].text).toContain('nv1'); // wish priority 1
    // cùng priority 3: giữ thứ tự đầu vào — cả hai đều có mặt, sau các việc priority 1
    expect(nonDanger.slice(2).map((c) => c.text).join('|')).toContain('Lập đối tác');
    expect(nonDanger.slice(2).map((c) => c.text).join('|')).toContain('Đèn Đường');
  });
  it('khử trùng: cùng icon+text thì giữ bản đầu (wish 2 người trùng text không nhân đôi)', () => {
    const same = [d('😴', 'nv1 xin nghỉ hôm nay', false, 1), d('😴', 'nv1 xin nghỉ hôm nay', false, 1)];
    expect(planDay(same)).toHaveLength(1);
  });
});

describe('GĐ745 — wish chỉ 1 người/ngày (băm riêng) không dồn hàng', () => {
  it('cùng một ngày chỉ có NHIỀU NHẤT một nhân viên xin (hash chọn 1)', () => {
    const b = { ...newBranch(), open: true, staff: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `nv${i + 1}` })) } as unknown as Parameters<typeof branchStaffWish>[0];
    for (let day = 2; day <= 100; day++) {
      // mỗi ngày hàm gọi nhiều lần vẫn trả cùng 1 người (hoặc null) — không bao giờ 2 người
      const seen = new Set<string>();
      for (let k = 0; k < 3; k++) {
        const w = branchStaffWish(b, 999, day);
        if (w) seen.add(w.name);
      }
      expect(seen.size).toBeLessThanOrEqual(1);
    }
  });
});
