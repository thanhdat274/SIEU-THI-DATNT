import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newGameData, useGame } from '../core/store';
import { ACHIEVEMENTS } from '../data/bizAchievements';

/**
 * GĐ1832 — minh bạch tổng kết ngày (review đợt 2 R1 + đợt 3 R2): đêm đầu thành tựu "Ngon có tiếng"
 * +300.000đ vào ví SAU khi tính "Tiền vào − tiền ra", phí vận hành thì gộp trong dòng Chi tiêu —
 * người soi sổ thấy số dư lệch hàng trăm nghìn mà tổng kết không giải thích. Giờ tổng kết phải có
 * dòng "Thưởng thành tựu" + "Phí vận hành" để khớp được số với ví.
 */

const g = () => useGame.getState();
const ROOT = join(__dirname, '..', '..');

beforeEach(() => {
  useGame.setState({ ...newGameData(), minutes: 19 * 60 });
});

describe('tổng kết ngày minh bạch (GĐ1832)', () => {
  it('thành tựu mở khóa đêm nay được kê dòng achvReward và tiền vào ví khớp', () => {
    useGame.setState({
      totals: { ...newGameData().totals, itemsSold: 100 }, // 'first_100' +20.000đ
    });
    const moneyBefore = g().money;
    expect(g().sleep()).toBe(true);
    const sum = g().lastSummary!;
    const reward = ACHIEVEMENTS.find((a) => a.id === 'first_100')!.reward;
    expect(sum.stats.achvReward).toBe(reward);
    // đêm không bán gì: chỉ trừ tiền nhà, được thưởng thành tựu — tổng kết khớp được với ví
    expect(g().money).toBe(moneyBefore - (sum.stats.rent ?? 0) + reward);
  });

  it('không có thành tựu mới thì không kê dòng thưởng (field tuỳ chọn)', () => {
    expect(g().sleep()).toBe(true);
    expect(g().lastSummary!.stats.achvReward).toBeUndefined();
  });

  it('phí vận hành tách khỏi Chi tiêu: dương khi có doanh thu, bằng 0 khi tiệm nghỉ', () => {
    useGame.setState({ stats: { ...newGameData().stats, revenue: 1_000_000 } });
    expect(g().sleep()).toBe(true);
    const sum = g().lastSummary!;
    expect(sum.stats.opCost).toBeGreaterThan(0);
    expect(sum.stats.opCost!).toBeLessThanOrEqual(sum.stats.spent); // vẫn gộp trong Chi tiêu, chỉ soi ra
    // ngày không có doanh thu nào (rate % doanh thu = 0, không có chi nhánh): không kê dòng
    useGame.setState({ ...newGameData(), minutes: 19 * 60 });
    expect(g().sleep()).toBe(true);
    expect(g().lastSummary!.stats.opCost).toBeUndefined();
  });

  it('panel tổng kết có dòng ⭐ Thưởng thành tựu và 💡 phí vận hành', () => {
    const src = readFileSync(join(ROOT, 'src/ui/panels/ReportPanels.tsx'), 'utf8');
    expect(src).toContain("t('panels_report.thuong_thanh_tuu_vao_vi_sau')");
    expect(src).toContain("t('panels_report.trong_do_phi_van_hanh')");
  });
});
