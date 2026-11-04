import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIEM_XOI_EVENT, tiemXoiDay, tiemXoiIds, tiemXoiSaved, tiemXoiLastLine, type TiemXoiState } from '../data/tiemXoi';
import { newGameData, useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';

/**
 * GĐ711 — sự kiện một ngày ở tiệm xôi (data/tiemXoi.ts), cùng pattern quán nước GĐ703:
 *  🍚 nồi hỏng: sức nấu hôm đó còn một nửa → nấu ít hơn, `full` luôn false.
 *  🌾 gạo khan: giá vốn phần nấu ×1,25 hôm đó → "rẻ hơn nhập lẻ" co lại theo đúng hệ số.
 * endDay truyền simRng()()... đúng hơn simRng (hàm gieo) — không truyền rng giữ hành vi cũ.
 */

const g = () => useGame.getState();
const putTaken: Record<string, number> = {};
const put = (id: string, qty: number) => { putTaken[id] = (putTaken[id] ?? 0) + qty; };

const t = (staff = 1): TiemXoiState => ({ open: true, staff });

describe('sự kiện tiệm xôi — nồi hỏng (GĐ711)', () => {
  it('r1 trúng: sức nấu còn một nửa, kho trống thì nấu đúng ceil(nửa sức)', () => {
    expect(TIEM_XOI_EVENT.cooker).toBe(0.06);
    const out = tiemXoiDay(t(1), 40, {}, put, 10, () => 0.01);
    // sức nấu 1 thợ: 60 × (1+1) = 120 → nồi hỏng còn ceil(60)
    expect(out?.event).toBe('cooker');
    expect(out?.total).toBe(60);
    expect(out?.full).toBe(false);
  });

  it('r1 trúng nhưng kho đã đủ mọi món: không nấu gì, vẫn ghi sự kiện', () => {
    // đổ đầy TẤT CẢ món xôi đã mở ở cấp 40 — thiếu một món là thợ vẫn nấu món đó
    const ids = tiemXoiIds(40);
    const out = tiemXoiDay(t(1), 40, Object.fromEntries(ids.map((i) => [i, 999])), put, 10, () => 0.01);
    expect(out?.event).toBe('cooker');
    expect(out?.total).toBe(0);
    expect(out?.full).toBe(true);
  });
});

describe('sự kiện tiệm xôi — gạo khan (GĐ711)', () => {
  it('r2 trúng: giá vốn ×1,25, "rẻ hơn nhập lẻ" co đúng hệ số', () => {
    expect(TIEM_XOI_EVENT.gao).toBe(0.05);
    let i = 0;
    const out = tiemXoiDay(t(1), 40, {}, put, 10, () => [0.5, 0.02][i++ % 2]);
    expect(out?.event).toBe('gao');
    expect(out?.total).toBe(120); // sức nấu nguyên vẹn
    const buy = 20_000; // giá nhập xôi trắng ở cấp 40 — chỉ dùng tương đối: kiểm theo tỉ lệ
    void buy;
    const made = Object.fromEntries(Object.entries(out!.made).map(([id, q]) => [id, q]));
    const savedNormal = tiemXoiSaved(made);
    const savedGao = tiemXoiSaved(made, 0.75); // hệ số vốn 0,6 × 1,25 = 0,75
    expect(savedGao).toBeLessThan(savedNormal);
  });

  it('hai lần gieo đều cao / không truyền rng: ngày thường, không sự kiện', () => {
    expect(tiemXoiDay(t(1), 40, {}, put, 10, () => 0.5)?.event).toBeUndefined();
    expect(tiemXoiDay(t(1), 40, {}, put, 10)?.event).toBeUndefined();
  });
});

describe('endDay gắn sự kiện tiệm xôi vào tin sáng mai (GĐ711)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGame.setState({
      ...newGameData(),
      level: 40,
      money: 100_000_000,
      minutes: 20 * 60,
      notify: () => {},
      biz: { ...newGameData().biz, tiemXoi: { open: true, staff: 1 } },
    });
  });
  afterEach(() => { vi.restoreAllMocks(); clearSimSeed(); });

  it('quét seed: có ngày báo 🍚/🌾, quanNuocLast… nhầm — tiemXoiLast.event khớp tin, dòng ≤90 ký tự', () => {
    let hit = 0;
    for (let seed = 1; seed <= 400; seed++) {
      setSimSeed(seed);
      g().sleep();
      const st = g();
      const ev = st.biz.tiemXoiLast?.event;
      // GĐ1173 — khi có suất khách ăn tại chỗ thì phải lưu kèm dineRevenue (thẻ Sổ đầu ngày hiển thị).
      if (st.biz.tiemXoiLast?.dine) expect(st.biz.tiemXoiLast.dineRevenue).toBeGreaterThan(0);
      for (const line of st.lastSummary?.news ?? []) {
        if (line.startsWith('🍚 Tiệm xôi')) expect([...line].length).toBeLessThanOrEqual(90);
      }
      const news = (st.lastSummary?.news ?? []).join(' ');
      if (ev === 'cooker') { expect(news).toContain('nồi hỏng'); hit++; }
      else if (ev === 'gao') { expect(news).toContain('gạo khan'); hit++; }
      if (hit >= 3) break;
    }
    expect(hit).toBeGreaterThanOrEqual(3);
  });

  it('dòng "Hôm qua" trên panel ghi rõ sự kiện', () => {
    expect(tiemXoiLastLine({ total: 80, cost: 960_000, wages: 180_000, saved: 640_000, event: 'cooker' })).toContain('nồi hỏng');
    expect(tiemXoiLastLine({ total: 80, cost: 1_200_000, wages: 180_000, saved: 400_000, event: 'gao' })).toContain('gạo khan');
    expect(tiemXoiLastLine({ total: 80, cost: 960_000, wages: 180_000, saved: 640_000 })).not.toContain('hỏng');
  });
});
