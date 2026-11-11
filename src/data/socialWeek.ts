/**
 * Hệ 6 — Điểm thi đua tuần (SPEC-CHIEU-RONG §6.4d). Tính 5 thành phần KHÔNG CÓ TRẦN TỰ NHIÊN bên phía
 * máy người chơi, rồi kẹp về trần. Server/socialRules.scorePoints() kẹp LẠI một lần nữa về trần cứng
 * (§6.3) nên dù client gửi bậy cũng không thể vượt 100 — đây là phần "gian lận vô nghĩa".
 *
 * Mỗi thành phần phản ánh THÀNH TÍCH THẬT trong bản lưu:
 *  - clean: 2 điểm/ngày "tiệm sạch" liên tiếp (cleanBest = chuỗi ngày sạch dài nhất gần đây).
 *  - satisfaction: tỉ lệ khách hài lòng vài ngày gần nhất × 20.
 *  - challenge: đơn hoàn thành (đơn app + hợp đồng) vừa qua, quy về 30.
 *  - life: việc nhà / đám giỗ lo xong.
 *  - fair: do server gom theo hội chợ — client gửi 0, server cộng phần góp thật.
 * Module THUẦN (không import store/mạng) để test được.
 */
export interface WeekInputs {
  cleanBest: number;                 // biz.cleanBest
  happy: number;                     // khách hài lòng vài ngày (sum)
  customers: number;                 // tổng khách vài ngày (sum)
  ordersRecent: number;              // đơn hoàn thành (app + hợp đồng) vài ngày
  lifeDone: number;                  // số việc nhà/đám giỗ đã lo xong (chuỗi hiện tại)
}

export const WEEK_CAPS = { challenge: 30, clean: 30, satisfaction: 20, life: 10, fair: 10 } as const;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Tính 5 thành phần điểm tuần (mỗi phần đã kẹp trần). */
export function weekParts(i: WeekInputs): { parts: Record<string, number>; total: number } {
  const parts = {
    clean: clamp(Math.round(i.cleanBest * 2), 0, WEEK_CAPS.clean),
    satisfaction: clamp(i.customers > 0 ? Math.round((i.happy / i.customers) * 20) : 0, 0, WEEK_CAPS.satisfaction),
    challenge: clamp(Math.round(i.ordersRecent * 1), 0, WEEK_CAPS.challenge),
    life: clamp(Math.round(i.lifeDone * 3), 0, WEEK_CAPS.life),
    fair: 0,
  };
  const total = (Object.keys(parts) as (keyof typeof parts)[]).reduce((n, k) => n + parts[k], 0);
  return { parts, total };
}
