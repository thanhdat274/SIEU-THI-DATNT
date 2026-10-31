import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';

/**
 * Test tích hợp chuỗi dài — "12 ngày liên tục": mô phỏng nhiều ngày chơi liền qua đường chính thống
 * (ngủ → endDay) để bắt lỗi kinh tế/tiến trình mà unit test rời không thấy:
 *  - Nhóm 1: không bán gì cũng không sập (day tăng đều, số liệu hữu hạn, snapshot round-trip bất biến).
 *  - Nhóm 2: bán đều mỗi ngày → kinh tế lành mạnh (money không âm sâu) và level tăng ≥ 2 cấp nhờ XP.
 * Các hệ daily (claimGift — có vé tha thứ giftGraceDay + scale theo cấp; spinWheel) được gọi tự nhiên
 * ở các ngày 3/7/11 để chúng đi xuyên qua endDay nhiều lần mà không sinh NaN/rác trong bản lưu.
 *
 * Mỗi test tự dựng store riêng từ newGameData() (zustand dùng store toàn cục nên đây là cách
 * các test hiện có dùng để cách ly — xem night.test.ts, dailyfeatures.test.ts).
 */

const DAYS = 12;
const GIFT_DAYS = [3, 7, 11];
/** Số món bán mỗi ngày ở nhóm 2: 30 món × (1 XP + bonus giá) ≈ 30 XP/ngày → đủ lên ≥ 2 cấp sau 12 ngày. */
const SELL_ITEMS_PER_DAY = 30;

const SNAP_KEYS = ['stats', 'totals', 'biz', 'garden', 'money', 'day', 'level'] as const;

interface DayRow {
  day: number;
  money: number;
  level: number;
  xp: number;
  storage: number;
  /** Doanh thu ngày vừa kết thúc (đọc từ DayRecord cuối của history). */
  revenue: number;
}

/** Dựng store mới cho từng test — đủ sạch để không rỉ state giữa các test. */
function resetStore() {
  useGame.setState({ ...newGameData(), shopOpen: false, panel: null, buildMode: false, placing: null });
}

const totalStorage = (storage: Record<string, number>) => Object.values(storage).reduce((n, q) => n + q, 0);

/** Tìm mọi đường dẫn có giá trị NaN trong dữ liệu bản lưu (JSON.stringify biến NaN thành null nên phải quét riêng). */
function nanPaths(value: unknown, path = '$', out: string[] = []): string[] {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) out.push(path);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => nanPaths(v, `${path}[${i}]`, out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) nanPaths(v, `${path}.${k}`, out);
  }
  return out;
}

/** Chụp → nạp → chụp lại: các key chính của bản lưu phải bất biến qua một vòng lưu/nạp. */
function assertSnapshotRoundtrip(label: string) {
  const before = snapshot();
  applySnapshot(before);
  const after = snapshot();
  for (const key of SNAP_KEYS) {
    expect(JSON.stringify(after[key]), `${label}: key "${key}" đổi sau snapshot → applySnapshot → snapshot`).toBe(
      JSON.stringify(before[key]),
    );
  }
}

/**
 * Chạy 12 ngày liền, mỗi ngày: (bán hàng nếu bán) → ngủ → endDay → assert sức khoẻ số liệu.
 * Các hệ daily gọi ở ngày 3/7/11, bọc try — lỗi không làm đổ chuỗi mà được ghi lại để báo cáo.
 */
function runTwelveDays(sellEachDay: boolean): { rows: DayRow[]; issues: string[] } {
  resetStore();
  const rows: DayRow[] = [];
  const issues: string[] = [];
  let prevDay = useGame.getState().day;
  let prevLevel = useGame.getState().level;

  for (let d = 1; d <= DAYS; d++) {
    const label = `ngày ${d}`;
    // Mỗi vòng phải bắt đầu đúng ngày d (day tăng đúng +1 qua từng lần endDay)
    expect(useGame.getState().day).toBe(d);

    // Hệ daily đi xuyên qua endDay: điểm danh (scale theo cấp, có vé tha thứ) + vòng quay
    if (GIFT_DAYS.includes(d)) {
      try {
        useGame.getState().claimGift();
      } catch (err) {
        issues.push(`${label}: claimGift() ném lỗi: ${String(err)}`);
      }
      try {
        useGame.getState().spinWheel();
      } catch (err) {
        issues.push(`${label}: spinWheel() ném lỗi: ${String(err)}`);
      }
    }

    if (sellEachDay) {
      // Bơm bán hàng theo đường chính thống có sẵn trong test hiện có: checkout()
      // (economy.test.ts mục "store — checkout, đếm quest..." gọi thẳng checkout với giỏ hàng
      //  không cần kệ — luồng tính tiền cộng money/stats.revenue/totals.revenue và XP qua addXp).
      const st = useGame.getState();
      const price = st.priceOf('nuoc');
      st.checkout(Array.from({ length: SELL_ITEMS_PER_DAY }, () => ({ id: 'nuoc', price })));
      const after = useGame.getState();
      if (!Number.isFinite(after.money)) issues.push(`${label}: money sau checkout không hữu hạn (${after.money})`);
      expect(after.stats.revenue, `${label}: checkout phải ghi doanh thu vào stats`).toBeGreaterThan(0);
      expect(after.totals.revenue, `${label}: checkout phải cộng dồn totals.revenue`).toBeGreaterThan(0);
    }

    // Kết thúc ngày qua đường chính thống: đi ngủ (từ 18:00) → endDay
    useGame.setState({ minutes: 19 * 60 });
    let slept = false;
    try {
      slept = useGame.getState().sleep();
    } catch (err) {
      issues.push(`${label}: sleep()/endDay ném lỗi: ${String(err)}`);
    }
    expect(slept, `${label}: sleep() phải true (đã đặt 19:00)`).toBe(true);

    const s = useGame.getState();
    rows.push({
      day: s.day,
      money: s.money,
      level: s.level,
      xp: s.xp,
      storage: totalStorage(s.storage),
      revenue: s.history.at(-1)?.revenue ?? 0,
    });

    // ── Assert sau mỗi ngày ──
    expect(s.day, `${label}: endDay phải sang ngày mới`).toBe(prevDay + 1);
    expect(Number.isFinite(s.money), `${label}: money phải hữu hạn, nhận ${s.money}`).toBe(true);
    expect(Number.isNaN(s.money), `${label}: money không được NaN`).toBe(false);
    expect(Number.isFinite(s.xp), `${label}: xp phải hữu hạn, nhận ${s.xp}`).toBe(true);
    expect(s.level, `${label}: level không được giảm`).toBeGreaterThanOrEqual(prevLevel);
    const storageTotal = totalStorage(s.storage);
    expect(Number.isFinite(storageTotal), `${label}: tổng storage phải hữu hạn`).toBe(true);
    expect(storageTotal, `${label}: tổng storage phải ≥ 0`).toBeGreaterThanOrEqual(0);

    // Không có NaN/rác nào trong bản lưu sau một ngày (kể cả ngày có quà/vòng quay)
    const nan = nanPaths(snapshot());
    expect(nan, `${label}: snapshot chứa NaN: ${nan.join(', ')}`).toEqual([]);

    assertSnapshotRoundtrip(label);

    prevDay = s.day;
    prevLevel = s.level;
  }

  return { rows, issues };
}

describe('chuỗi 12 ngày liên tục', () => {
  it('nhóm 1 — không bán gì cũng không sập: day tăng đúng, số liệu hữu hạn, snapshot bất biến', () => {
    const { rows, issues } = runTwelveDays(false);

    expect(issues, `lỗi gom được trong chuỗi: ${issues.join(' | ')}`).toEqual([]);
    expect(rows).toHaveLength(DAYS);
    // Ván mới bắt đầu ngày 1: sau 12 lần endDay phải đúng ngày 13
    expect(rows.at(-1)!.day).toBe(DAYS + 1);
    // Không bán gì: tiền chỉ trừ tiền nhà 20k/ngày (trừ đi quà điểm danh/vòng quay), phải còn hữu hạn
    // và không âm sâu — đây chỉ là sanity, giá trị thật in ra ở console.table dưới để đối chiếu.
    expect(Number.isFinite(rows.at(-1)!.money)).toBe(true);
    // eslint-disable-next-line no-console
    console.table(rows);
  }, 30000);

  it('nhóm 2 — bán đều mỗi ngày: money không âm sâu, level tăng ít nhất 2 cấp nhờ XP', () => {
    resetStore();
    const startLevel = useGame.getState().level;
    const { rows, issues } = runTwelveDays(true);

    expect(issues, `lỗi gom được trong chuỗi: ${issues.join(' | ')}`).toEqual([]);
    expect(rows).toHaveLength(DAYS);
    const last = rows.at(-1)!;
    // Kinh tế lành mạnh: bán đều thì tiền không được âm sâu (ngưỡng mềm; ván này thực tế phải dương)
    expect(last.money, `sau 12 ngày bán đều, money = ${last.money}`).toBeGreaterThan(-200000);
    // Tiến trình: XP tích lũy từ bán hàng phải đẩy level lên ít nhất +2
    expect(last.level, `level sau 12 ngày (bắt đầu cấp ${startLevel})`).toBeGreaterThanOrEqual(startLevel + 2);
    // eslint-disable-next-line no-console
    console.table(rows);
  }, 30000);
});
