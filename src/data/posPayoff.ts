/**
 * GĐ1304 "Máy POS quét mã (1.5tr) có đáng? — soi doanh thu bỏ lỡ vì khách chờ quầy + hoàn vốn".
 *
 * Trong nhóm 4 nâng cấp thiết bị một lần, camera (GĐ236), hợp đồng bảo trì (GĐ1190), ca đêm
 * (nightPayback) đều đã có thẻ rủi ro/hoàn vốn — chỉ Máy POS (🖥️ 1.5tr, mở cấp 20) là món còn
 * "MÙ": người chơi chỉ thấy mô tả "quét mã tự động, tính tiền nhanh hơn 50%" mà không biết cái
 * 1.5tr đó bảo vệ được bao nhiêu tiền/ngày (hộp đen, Nguyên tắc a). Helper này THUẦN đọc — không
 * đổi state/save/kinh tế/seed, dùng đúng số có sẵn:
 *   - cơ chế: POS tăng tốc độ quầy ×1.5 (src/main.tsx:674 — nhân `cashierSpeed`).
 *   - tổn thất đo được: `stats.missed.wait` = số khách bỏ về vì chờ quầy hôm nay.
 *   - doanh thu bỏ lỡ/ngày = count × avgPerVisit (doanh thu trung bình/khách — đúng GĐ1221
 *     `waitMoneyCost` / `repMoney.avgPerVisit`; dùng DOANH THU vì lãi/khách không phải số lưu sẵn).
 * POS quét nhanh ×1.5 → kìm phần lớn chờ quầy do TỐC ĐỘ quầy (ước ~80%, ghi rõ); ~20% còn lại chờ
 * vì không ai đứng quầy / khách kéo dồn dập — POS không vá được. savingPerDay = doanh thu-lỡ × recovery;
 * paybackDays = ceil(giá / saving). Không RNG/seed — con số kỳ vọng ƯỚC LƯỢNG, ghi rõ "ước lượng".
 */
import { UPGRADES } from './upgrades';

/** Cấp mở khóa Máy POS (khớp UPGRADES.pos.unlock). */
export const POS_UNLOCK = UPGRADES.find((u) => u.id === 'pos')?.unlock ?? 20;
/** Giá Máy POS (khớp UPGRADES.pos.price). */
export const POS_PRICE = UPGRADES.find((u) => u.id === 'pos')?.price ?? 1500000;
/** POS tăng tốc độ quầy ×1.5 (khớp literal src/main.tsx:674). */
export const POS_SPEED_MUL = 1.5;
/** Hệ số kìm chờ-quầy trung thực: quét nhanh ×1.5 cắt ~80% chờ do tốc độ quầy (ước lượng; ~20% còn do không ai đứng quầy/khách dồn). */
export const POS_RECOVER = 0.8;

/** Ngưỡng phán đoán mức doanh thu bỏ lỡ/ngày vì chờ quầy (đồng, cùng thang camera/bảo trì). */
export const POS_RISK_HIGH = 150000;
export const POS_RISK_MODERATE = 50000;

export interface PosPayoff {
  verdict: 'locked' | 'none' | 'modest' | 'high';
  /** Đã lắp POS chưa. */
  hasPos: boolean;
  /** Số khách bỏ về vì chờ quầy hôm nay (stats.missed.wait ?? 0). */
  waitMissed: number;
  /** Doanh thu bỏ lỡ hôm nay vì chờ quầy (ước lượng count × avgPerVisit — chỉ hữu ích khi CHƯA lắp). */
  estRevenueLostPerDay: number;
  /** Ước tiết kiệm mỗi ngày nếu lắp POS (chỉ khác 0 khi chưa lắp + có tổn thất thật). */
  savingPerDay: number;
  /** Số ngày để POS hoàn vốn (null nếu chưa mở khóa / đã lắp / không tiết kiệm được). */
  paybackDays: number | null;
}

export function posPayoff(opts: {
  /** Cấp tiệm (để biết đã mở khóa POS chưa). */
  level: number;
  /** Đã lắp POS chưa. */
  hasPos: boolean;
  /** Khách bỏ về vì chờ quầy hôm nay (stats.missed.wait ?? 0). */
  waitMissed: number;
  /** Doanh thu trung bình/khách (`repMoney.avgPerVisit(revenue, customers)`). */
  avgRevenuePerBuyer: number;
}): PosPayoff {
  const { level, hasPos, waitMissed } = opts;

  if (level < POS_UNLOCK) {
    return {
      verdict: 'locked', hasPos, waitMissed,
      estRevenueLostPerDay: 0, savingPerDay: 0, paybackDays: null,
    };
  }

  // Doanh thu bỏ lỡ hôm nay vì chờ quầy — ĐÚNG công thức GĐ1221 (count × avgPerVisit).
  const revLost = waitMissed > 0 && opts.avgRevenuePerBuyer > 0
    ? Math.round(waitMissed * opts.avgRevenuePerBuyer)
    : 0;

  // Đã lắp: không có phản chứng — bỏ qua hoàn vốn; chỉ lưu tổn thất còn lại hôm nay (chờ vì lý do khác).
  if (hasPos) {
    return {
      verdict: revLost > 0 ? 'modest' : 'none', hasPos, waitMissed,
      estRevenueLostPerDay: revLost, savingPerDay: 0, paybackDays: null,
    };
  }

  // Chưa lắp & chưa có tổn thất: không có gì để nói (đừng ồn, cùng logic quick_hands/hirePayoff im khi wait=0).
  if (revLost <= 0) {
    return {
      verdict: 'none', hasPos, waitMissed,
      estRevenueLostPerDay: 0, savingPerDay: 0, paybackDays: null,
    };
  }

  const saving = Math.round(revLost * POS_RECOVER);
  const paybackDays = saving > 0 ? Math.ceil(POS_PRICE / saving) : null;
  const verdict = saving >= POS_RISK_HIGH ? 'high'
    : saving >= POS_RISK_MODERATE ? 'modest' : 'none';

  return {
    verdict, hasPos, waitMissed,
    estRevenueLostPerDay: revLost, savingPerDay: saving, paybackDays,
  };
}
