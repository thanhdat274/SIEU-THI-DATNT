import { describe, expect, it } from 'vitest';
import { phoiDayGain, preserveNight, phoiReady, preserveDefById, PHOI_UNLOCK, PRESERVE_DEFS } from '../data/preserve';

// GĐ Hệ1-L1 — nền PHƠI (SPEC-CHIEU-SAU §1.5). THUẦN, không đụng sim/save: mọi kết quả từ
// rainSpell (tất định theo seed+day+kênh), không gọi simRng → golden cấp 30 không đổi.

const spellMid = { start: 360, end: 480 }; // cơn mưa 6:00–8:00 cho test trực tiếp phoiDayGain

describe('Hệ1-L1 — bảng thời tiết × trạng thái giàn (phoiDayGain)', () => {
  it('phơi mẻ: nắng đẹp cả ngày → +1,0', () => {
    const g = phoiDayGain([[6 * 60, 18 * 60]], null, 'sunny');
    expect(g.sun).toBe(1);
    expect(g.wet).toBe(false);
    expect(g.stormLost).toBe(false);
  });

  it('cất cả ngày → 0 nắng dù trời nắng', () => {
    expect(phoiDayGain([], null, 'sunny').sun).toBe(0);
  });

  it('sương mù + cả ngày → +0,7; mẻ fogBonus (bánh tráng) → +1,2', () => {
    expect(phoiDayGain([[0, 1440]], null, 'fog').sun).toBe(0.7);
    expect(phoiDayGain([[0, 1440]], null, 'fog', { fogBonus: true }).sun).toBe(1.2);
  });

  it('nhiều mây + cả ngày → +0,6', () => {
    expect(phoiDayGain([[0, 1440]], null, 'cloudy').sun).toBe(0.6);
  });

  it('mưa + để ngoài lọt cơn → dính mưa (wet+1, +0 nắng)', () => {
    const g = phoiDayGain([[0, 1440]], spellMid, 'rain');
    expect(g.wet).toBe(true);
    expect(g.sun).toBe(0);
    expect(g.stormLost).toBe(false);
  });

  it('mưa + cất kịp trước cơn, phơi lại sau → +0,4 (không ướt)', () => {
    const g = phoiDayGain([[0, 360], [480, 1440]], spellMid, 'rain');
    expect(g.wet).toBe(false);
    expect(g.sun).toBe(0.4);
  });

  it('mưa + có bạt kéo (để ngoài) → không ướt, +0,4', () => {
    const g = phoiDayGain([[0, 1440]], spellMid, 'rain', { tarp: true });
    expect(g.wet).toBe(false);
    expect(g.sun).toBe(0.4);
    expect(g.stormLost).toBe(false);
  });

  it('giông bão + để ngoài lọt cơn → mất cả mẻ', () => {
    const g = phoiDayGain([[0, 1440]], spellMid, 'storm');
    expect(g.stormLost).toBe(true);
    expect(g.wet).toBe(true);
  });

  it('giông bão + nhà lưới 3★ che → không mất, +0,1', () => {
    const g = phoiDayGain([[0, 1440]], spellMid, 'storm', { stormSafe: true });
    expect(g.stormLost).toBe(false);
    expect(g.wet).toBe(false);
    expect(g.sun).toBe(0.1);
  });

  it('giông bão + cất kịp → +0,1 (không mất)', () => {
    const g = phoiDayGain([[0, 360], [480, 1440]], spellMid, 'storm');
    expect(g.stormLost).toBe(false);
    expect(g.sun).toBe(0.1);
  });
});

describe('Hệ1-L1 — preserveNight (qua đêm, tất định)', () => {
  const btm = () => ({ id: 1, defId: 'ps_banh_trang', startDay: 1, sun: 0, covered: false, wet: 0, allHomegrown: false });
  const muc = () => ({ id: 2, defId: 'ps_muc_mot_nang', startDay: 1, sun: 0, covered: false, wet: 0, allHomegrown: false });

  it('bánh tráng (2 nắng): 2 đêm nắng cả ngày → mẻ chờ thu (phoiReady)', () => {
    const ctx = { day: 2, weather: 'sunny' as const, seed: 169 };
    const n1 = preserveNight([btm()], [[6 * 60, 18 * 60]], ctx);
    expect(n1.jobs[0].sun).toBe(1);
    const n2 = preserveNight(n1.jobs, [[6 * 60, 18 * 60]], ctx);
    const def = preserveDefById('ps_banh_trang');
    expect(n2.jobs[0].sun).toBe(2);
    expect(phoiReady(n2.jobs[0], def)).toBe(true);
  });

  it('đêm giông bão + giàn để ngoài → mất cả mẻ (job bị bỏ, có tin)', () => {
    const g = preserveNight([btm()], [[0, 1440]], { day: 2, weather: 'storm', seed: 169 });
    expect(g.jobs).toHaveLength(0);
    expect(g.news.length).toBeGreaterThan(0);
  });

  it('đêm mưa + giàn để ngoài cả ngày → dính mưa, mẻ vẫn còn (wet tăng, nắng không thêm)', () => {
    const g = preserveNight([btm()], [[0, 1440]], { day: 2, weather: 'rain', seed: 169 });
    expect(g.jobs[0].wet).toBe(1);
    expect(g.jobs[0].sun).toBe(0);
  });

  it('mẻ "một nắng" (mực) chỉ ăn ngày nắng đẹp: nhiều mây không tiến, nắng thì xong 1 đêm', () => {
    const cloudy = preserveNight([muc()], [[0, 1440]], { day: 2, weather: 'cloudy', seed: 169 });
    expect(cloudy.jobs[0].sun).toBe(0);
    const sunny = preserveNight([muc()], [[0, 1440]], { day: 3, weather: 'sunny', seed: 169 });
    expect(sunny.jobs[0].sun).toBe(1);
    expect(phoiReady(sunny.jobs[0], preserveDefById('ps_muc_mot_nang'))).toBe(true);
  });

  it('noti: không có mẻ nào thì đêm trôi qua trống rỗng', () => {
    const g = preserveNight([], [], { day: 2, weather: 'sunny', seed: 169 });
    expect(g.jobs).toHaveLength(0);
    expect(g.news).toHaveLength(0);
  });
});

describe('Hệ1-L1 — danh mục phơi (nền)', () => {
  it('có đúng 3 mẻ phơi, mở trên golden 30 (R1) và toàn nguyên liệu thô đã verify', () => {
    const phoi = PRESERVE_DEFS.filter((d) => d.kind === 'phoi');
    expect(phoi.map((d) => d.id)).toEqual(['ps_banh_trang', 'ps_tom_kho', 'ps_muc_mot_nang']);
    for (const d of phoi) {
      expect(d.unlock).toBeGreaterThan(30); // không đụng golden cấp 30
      expect(d.inputs.length).toBeGreaterThan(0);
    }
    expect(PHOI_UNLOCK).toBe(34);
    // Bánh tráng mở sớm nhất (34) ≤ mốc mở công trình gian_phoi
    expect(Math.min(...phoi.map((d) => d.unlock)) >= PHOI_UNLOCK).toBe(true);
  });

  it('công thức thật: tên món khớp sản phẩm có sẵn (homemade.ts) + note ghi cách làm', () => {
    const btm = preserveDefById('ps_banh_trang');
    expect(btm.outputId).toBe('hx_banh_trang');
    expect(btm.note.length).toBeGreaterThan(10);
    expect(btm.fogBonus).toBe(true); // bánh tráng phơi sương qua sương đêm
    expect(preserveDefById('ps_muc_mot_nang').sunOnly).toBe(true); // đúng nghĩa "một nắng"
  });
});
