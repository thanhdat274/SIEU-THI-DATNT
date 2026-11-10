import { describe, expect, it } from 'vitest';
import {
  CRISIS_DEFS, crisisActive, crisisDefById, crisisEffects, crisisFor, crisisNight,
  crisisPhaseLabel, crisisTotalDays, yearCrises,
} from '../data/crisis';
import { dayOfYear } from '../data/calendar';
import { newGameData, useGame } from '../core/store';
import { beforeEach } from 'vitest';

// GĐ Hệ8-L1 — khung Biến cố dài (SPEC-CHIEU-RONG §8.3). THUẦN, không đụng sim:
// lịch suy từ hash(weatherSeed, năm) → TẤT ĐỊNH, chưa có action/state nào nối vào endDay.
// Cấp mở ≥ 36 nên golden cấp 30 không đổi (R1).

const DAO_DUONG = CRISIS_DEFS[0];

describe('Hệ8-L1 — lịch biến cố (yearCrises/crisisFor) TẤT ĐỊNH', () => {
  it('cùng seed → cùng lịch hai lần chạy', () => {
    expect(yearCrises(169, 2, 50)).toEqual(yearCrises(169, 2, 50));
    expect(yearCrises(777, 5, 60)).toEqual(yearCrises(777, 5, 60));
  });

  it('cấp < 36 → không có biến cố nào (không lệch golden cấp 30)', () => {
    for (let seed = 0; seed < 40; seed++) {
      for (let year = 0; year <= 6; year++) {
        expect(yearCrises(seed, year, 35)).toEqual([]);
      }
    }
  });

  it('mỗi năm 0–2 đợt (không quá 2), và cùng năm cách nhau ≥ 60 ngày', () => {
    for (let seed = 169; seed < 300; seed++) {
      for (let year = 0; year <= 20; year++) {
        const slots = yearCrises(seed, year, 60);
        expect(slots.length).toBeLessThanOrEqual(2);
        for (let i = 1; i < slots.length; i++) {
          expect(slots[i].startDay - slots[i - 1].startDay).toBeGreaterThanOrEqual(60);
        }
      }
    }
  });

  it('không đợt nào đè 10 ngày trước Tết tới hết Tết', () => {
    // Tết md(1,28) = doy 27; khoá từ doy 17 tới doy 38
    for (let seed = 169; seed < 400; seed++) {
      for (let year = 0; year <= 20; year++) {
        for (const slot of yearCrises(seed, year, 60)) {
          const doy = dayOfYear(slot.startDay);
          expect(doy >= 17 && doy <= 38).toBe(false);
        }
      }
    }
  });

  it('năm 0 (vòng đầu) không có đợt trong 30 ngày đầu', () => {
    for (let seed = 169; seed < 400; seed++) {
      for (const slot of yearCrises(seed, 0, 60)) {
        expect(slot.startDay > 30).toBe(true);
      }
    }
  });

  it('crisisFor trả đúng slot khi ngày nằm trong đợt, null ngoài', () => {
    // Dùng một năm có đúng 1 đợt để test ổn định; nếu năm 2 seed 169 có 1 đợt:
    const slots = yearCrises(169, 2, 60);
    for (const s of slots) {
      const def = crisisDefById(s.defId)!;
      const total = crisisTotalDays(def);
      expect(crisisFor(169, s.startDay, 60)).toEqual({ defId: s.defId, startDay: s.startDay });
      expect(crisisFor(169, s.startDay + total - 1, 60)).toEqual({ defId: s.defId, startDay: s.startDay });
      // ngày trước đợt hoặc sau tổng → không còn
      if (s.startDay > 1) expect(crisisFor(169, s.startDay - 1, 60)).toBeNull();
      expect(crisisFor(169, s.startDay + total, 60)).toBeNull();
    }
    // Một ngày chắc chắn không có: dò vài năm seed khác
    for (let seed = 3; seed < 20; seed++) {
      const r = yearCrises(seed, 1, 60);
      if (r.length === 0) expect(crisisFor(seed, 100, 60)).toBeNull();
    }
  });

  it('crisisActive tìm đúng giai đoạn theo dayIndex', () => {
    // Dùng một năm có đúng 1 đợt đào đường để xác nhận danh giới giai đoạn
    let checked = 0;
    for (let seed = 169; seed < 400 && checked < 3; seed++) {
      for (let year = 0; year <= 20; year++) {
        const slots = yearCrises(seed, year, 60);
        if (slots.length !== 1) continue;
        const s = slots[0];
        if (s.defId !== 'dao_duong') continue;
        const a0 = crisisActive(seed, s.startDay, 60);
        expect(a0?.phase.label).toBe('Báo trước');
        const a4 = crisisActive(seed, s.startDay + 4, 60);
        expect(a4?.phase.label).toBe('Cao điểm');
        const a14 = crisisActive(seed, s.startDay + 14, 60);
        expect(a14?.phase.label).toBe('Dịu dần');
        const a18 = crisisActive(seed, s.startDay + crisisTotalDays(DAO_DUONG), 60);
        expect(a18).toBeNull();
        checked++;
        break;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('Hệ8-L1 — crisisEffects: mọi hệ số = 1 khi không có biến cố', () => {
  it('undefined → traffic 1, cost 1', () => {
    const e = crisisEffects(undefined, 5);
    expect(e.traffic).toBe(1);
    expect(e.cost('rau', 'fresh')).toBe(1);
    expect(e.demand).toBeUndefined();
  });

  it('đào đường — giai đoạn Báo trước (ngày 0): traffic 1', () => {
    const st = { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 };
    expect(crisisEffects(st, 400).traffic).toBe(1);
    expect(crisisEffects(st, 403).traffic).toBe(1); // ngày cuối báo trước
  });

  it('đào đường — Cao điểm (ngày thứ 4 trở đi): khách ×0,65, online ×1,4, phone ×1,5, dirt ×2', () => {
    const st = { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 };
    const e = crisisEffects(st, 404); // ngày 4 = ngày đầu cao điểm (10 ngày)
    expect(e.traffic).toBe(0.65);
    expect(e.channel?.online).toBe(1.4);
    expect(e.channel?.phone).toBe(1.5);
    expect(e.dirt).toBe(2);
    expect(e.supplyDelay).toBe(0.3);
  });

  it('đào đường — Dịu dần (ngày 14): khách ×0,85', () => {
    const st = { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 };
    expect(crisisEffects(st, 414).traffic).toBe(0.85);
  });

  it('đào đường — hết đợt (ngày 18): về 1', () => {
    const st = { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 };
    const e = crisisEffects(st, 418);
    expect(e.traffic).toBe(1);
    expect(e.dirt).toBeUndefined();
  });

  it('crisisPhaseLabel trả đúng tên giai đoạn', () => {
    const st = { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 };
    expect(crisisPhaseLabel(DAO_DUONG, 400, st)).toBe('Báo trước');
    expect(crisisPhaseLabel(DAO_DUONG, 406, st)).toBe('Cao điểm');
    expect(crisisPhaseLabel(DAO_DUONG, 415, st)).toBe('Dịu dần');
  });
});

describe('Hệ8-L3 — việc chuẩn bị làm dịu đợt (DAO_DUONG)', () => {
  const caoDiem = 404; // ngày 4 = ngày đầu Cao điểm (traffic base 0.65)

  it('3 việc chuẩn bị, đầy đủ trường phục vụ thẻ', () => {
    expect(DAO_DUONG.preps).toHaveLength(3);
    for (const p of DAO_DUONG.preps) {
      expect(p.id && p.label && p.cost > 0 && p.effect).toBeTruthy();
    }
  });

  it('Cao điểm — không làm gì: traffic 0.65, channel online 1.4 / phone 1.5, dirt 2, supplyDelay 0.3', () => {
    const e = crisisEffects({ defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 }, caoDiem);
    expect(e.traffic).toBe(0.65);
    expect(e.channel).toEqual({ online: 1.4, phone: 1.5 });
    expect(e.dirt).toBe(2);
    expect(e.supplyDelay).toBe(0.3);
  });

  it('làm "băng rôn" → khách nâng lên 0.78', () => {
    const e = crisisEffects({ defId: 'dao_duong', startDay: 400, preps: ['banner'], choices: {}, kind: 0 }, caoDiem);
    expect(e.traffic).toBe(0.78);
  });

  it('làm "lối ván" → khách nâng lên 0.85', () => {
    const e = crisisEffects({ defId: 'dao_duong', startDay: 400, preps: ['path'], choices: {}, kind: 0 }, caoDiem);
    expect(e.traffic).toBe(0.85);
  });

  it('làm cả "băng rôn" + "lối ván" → 0.85 (lấy mức tốt nhất, không cộng dồn quá)', () => {
    const e = crisisEffects({ defId: 'dao_duong', startDay: 400, preps: ['banner', 'path'], choices: {}, kind: 0 }, caoDiem);
    expect(e.traffic).toBe(0.85);
  });

  it('prep "courier" không nâng khách nhưng giữ kênh ổn hơn (online 1.15 / phone 1.2)', () => {
    const e = crisisEffects({ defId: 'dao_duong', startDay: 400, preps: ['courier'], choices: {}, kind: 0 }, caoDiem);
    expect(e.traffic).toBe(0.65);
    expect(e.channel).toEqual({ online: 1.15, phone: 1.2 });
  });

  it('giai đoạn Báo trước không có hiệu ứng kênh dù đã làm prep', () => {
    const e = crisisEffects({ defId: 'dao_duong', startDay: 400, preps: ['banner'], choices: {}, kind: 0 }, 400);
    expect(e.channel).toBeUndefined();
  });

  it('cảnh lựa chọn nằm trong đợt (atDay 3 và 9, trước khi hết Cao điểm)', () => {
    expect(DAO_DUONG.scenes.map((s) => s.atDay)).toEqual([3, 9]);
    for (const s of DAO_DUONG.scenes) {
      expect(s.atDay).toBeLessThan(crisisTotalDays(DAO_DUONG));
      expect(s.text && s.options.length >= 2).toBeTruthy();
    }
  });
});

describe('Hệ8-L3 — crisisNight: đêm mở/ECHO/đóng đợt + lợi đường mới', () => {
  // Tìm seed có ĐÚNG 1 đợt đào đường năm 2 (ổn định, trong một năm).
  function seedWithOne(): { seed: number; startDay: number; level: number } {
    for (let seed = 169; seed < 800; seed++) {
      for (let year = 1; year <= 4; year++) {
        const slots = yearCrises(seed, year, 60);
        if (slots.length === 1 && slots[0].defId === 'dao_duong') {
          return { seed, startDay: slots[0].startDay, level: 60 };
        }
      }
    }
    throw new Error('không tìm thấy seed test');
  }
  const s = seedWithOne();
  const total = crisisTotalDays(DAO_DUONG);

  it('đêm trước ngày đầu đợt → MỞ đợt (crisis mới) + đếm crisesSeen + tin', () => {
    const night = crisisNight(s.seed, s.startDay - 1, s.level, {});
    expect(night.crisis).toEqual({ defId: 'dao_duong', startDay: s.startDay, preps: [], choices: {}, kind: 0 });
    expect(night.crisesSeen).toEqual(['dao_duong']);
    expect(night.news.length).toBeGreaterThan(0);
  });

  it('đang giữa đợt → ECHO giữ nguyên crisis (preps/choices không bị xoá)', () => {
    const mid = crisisNight(s.seed, s.startDay - 1, s.level, {});
    const later = crisisNight(s.seed, s.startDay + 5, s.level, {
      crisis: mid.crisis, crisesSeen: mid.crisesSeen,
    });
    expect(later.crisis).toEqual(mid.crisis);
    expect(later.crisis?.defId).toBe('dao_duong');
  });

  it('đêm cuối đợt → đóng: crisis undefined, roadBoon = true (lợi đường mới)', () => {
    const opened = crisisNight(s.seed, s.startDay - 1, s.level, {});
    const close = crisisNight(s.seed, s.startDay + total - 1, s.level, opened);
    expect(close.crisis).toBeUndefined();
    expect(close.roadBoon).toBe(true);
    expect(close.lastCrisis?.defId).toBe('dao_duong');
    expect(close.news.some((n) => n.includes('kết thúc'))).toBe(true);
  });

  it('L4 — đóng đợt có prep: ghi huy hiệu vượt khó + lastCrisis.saved ước theo prep đã làm', () => {
    const opened = crisisNight(s.seed, s.startDay - 1, s.level, {});
    const withPreps = { ...opened, crisis: { ...opened.crisis!, preps: ['banner', 'courier'] } };
    const close = crisisNight(s.seed, s.startDay + total - 1, s.level, withPreps);
    expect(close.crisisBadges).toContain('dao_duong');        // huy hiệu vào hồ sơ tiệm
    // banner (traffic) + courier (kênh) đều làm dịu → mỗi cái ~250k, tổng 500k
    expect(close.lastCrisis?.saved).toBe(500000);
    expect(close.lastCrisis?.loss).toBe(0);                    // chưa theo dõi lãi nền — điểm khởi đầu
  });

  it('mọi đêm không có đợt → không mở, roadBoon đứng nguyên', () => {
    // một ngày xa đợt: năm khác hoặc ngoài slot
    const far = crisisFor(s.seed, s.startDay + total + 30, s.level);
    if (far === null) {
      const n = crisisNight(s.seed, s.startDay + total + 29, s.level, { roadBoon: false });
      expect(n.crisis).toBeUndefined();
      expect(n.roadBoon).toBe(false);
      expect(n.news).toEqual([]);
    }
  });

  it('Năm yên ả (calm) → không bao giờ mở dù đang trong lịch', () => {
    const n = crisisNight(s.seed, s.startDay - 1, s.level, { calmYears: true });
    expect(n.crisis).toBeUndefined();
    expect(n.news).toEqual([]);
  });
});

describe('Hệ8-L3 — doCrisisPrep (slice trên store)', () => {
  const preps = () => CRISIS_DEFS[0].preps;
  beforeEach(() => {
    useGame.setState({ ...newGameData(), level: 50, money: 10_000_000, day: 400 });
    useGame.setState({
      biz: { ...useGame.getState().biz, crisis: { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 } },
    });
  });
  const g = () => useGame.getState();

  it('làm prep thành công: trừ đúng giá + thêm vào preps', () => {
    const cost = preps().find((p) => p.id === 'banner')!.cost;
    const m0 = g().money;
    g().doCrisisPrep('banner');
    expect(g().money).toBe(m0 - cost);
    expect(g().biz.crisis?.preps).toContain('banner');
  });

  it('không có crisis state → không làm được, không trừ tiền', () => {
    useGame.setState({ biz: { ...g().biz, crisis: undefined } });
    const m0 = g().money;
    g().doCrisisPrep('banner');
    expect(g().money).toBe(m0);
  });

  it('thiếu tiền → không trừ, không vào preps', () => {
    useGame.setState({ money: 100 });
    g().doCrisisPrep('path');
    expect(g().biz.crisis?.preps).not.toContain('path');
  });

  it('làm trùng prep → không trừ lần hai', () => {
    g().doCrisisPrep('banner');
    const m0 = g().money;
    g().doCrisisPrep('banner');
    expect(g().money).toBe(m0);
    expect(g().biz.crisis?.preps.filter((x) => x === 'banner')).toHaveLength(1);
  });
});

describe('Hệ8-L3 — chooseCrisisScene (slice)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), level: 50, money: 10_000_000, day: 400 });
    useGame.setState({
      biz: { ...useGame.getState().biz, crisis: { defId: 'dao_duong', startDay: 400, preps: [], choices: {}, kind: 0 } },
    });
  });
  const g = () => useGame.getState();

  it('chọn cảnh đúng ngày: ghi choices + kind tăng khi ấm', () => {
    g().chooseCrisisScene(3, 0, true);
    expect(g().biz.crisis?.choices[3]).toBe(0);
    expect(g().biz.crisis?.kind).toBe(1);
  });

  it('chọn lặp cảnh → không ghi đè lần hai', () => {
    g().chooseCrisisScene(3, 0, true);
    g().chooseCrisisScene(3, 1, false);
    expect(g().biz.crisis?.choices[3]).toBe(0);
    expect(g().biz.crisis?.kind).toBe(1);
  });

  it('ngày không có cảnh → bỏ qua', () => {
    g().chooseCrisisScene(6, 0, true);
    expect(g().biz.crisis?.choices[6]).toBeUndefined();
  });
});

describe('Hệ8-L5 — Bão giá: giá nhập tăng dần rồi dịu (costRamp/costEase + prep costMul)', () => {
  const bao = () => ({ defId: 'bao_gia', startDay: 400, preps: [], choices: {}, kind: 0 });
  const costOf = (st: unknown, day: number) => crisisEffects(st as never, day).cost('rau', 'fresh');

  it('Báo trước (400–404): giá = 1', () => {
    expect(costOf(bao(), 400)).toBe(1);
    expect(costOf(bao(), 404)).toBe(1);
  });

  it('Cao điểm: +3% mỗi 3 ngày lên tới +14%', () => {
    expect(costOf(bao(), 405)).toBeCloseTo(1.00, 5); // ngày 0
    expect(costOf(bao(), 408)).toBeCloseTo(1.03, 5); // ngày 3
    expect(costOf(bao(), 411)).toBeCloseTo(1.06, 5); // ngày 6
    expect(costOf(bao(), 414)).toBeCloseTo(1.09, 5); // ngày 9
    expect(costOf(bao(), 417)).toBeCloseTo(1.12, 5); // ngày 12
    expect(costOf(bao(), 418)).toBeCloseTo(1.12, 5); // ngày 13 (cap 14%, chưa tới)
  });

  it('Cao điểm: khách nhạy giá ×1,2', () => {
    expect(crisisEffects(bao(), 405).sensitivity).toBe(1.2);
  });

  it('prep stock_up làm giảm đòn tăng giá (×0,9)', () => {
    const st = { defId: 'bao_gia', startDay: 400, preps: ['stock_up'], choices: {}, kind: 0 };
    expect(crisisEffects(st, 411).cost('rau', 'fresh')).toBeCloseTo(1.06 * 0.9, 5);
  });

  it('Dịu dần: từ +5% về 0 đều trong 5 ngày', () => {
    expect(costOf(bao(), 419)).toBeCloseTo(1.05, 5); // ngày 0
    expect(costOf(bao(), 421)).toBeCloseTo(1.03, 5); // ngày 2
    expect(costOf(bao(), 423)).toBeCloseTo(1.01, 5); // ngày 4
  });

  it('hết đợt (424): giá về 1', () => {
    expect(costOf(bao(), 424)).toBe(1);
  });
});

describe('Hệ8-L6/L7 — Mùa lũ + Dịch tả heo khung dữ liệu', () => {
  const lu = () => ({ defId: 'mua_lu', startDay: 500, preps: [], choices: {}, kind: 0 });
  const dich = () => ({ defId: 'dich_ta', startDay: 600, preps: [], choices: {}, kind: 0 });

  it('cấp mở tăng dần đúng spec: đào 36 · bão 40 · lũ 44 · dịch 48', () => {
    const ic = Object.fromEntries(CRISIS_DEFS.map((d) => [d.id, d.unlock]));
    expect(ic.dao_duong).toBe(36);
    expect(ic.bao_gia).toBe(40);
    expect(ic.mua_lu).toBe(44);
    expect(ic.dich_ta).toBe(48);
  });

  it('Mùa lũ — Cao điểm: khách ×0,75, farm flood, cầu tăng món giàu id thật', () => {
    const e = crisisEffects(lu(), 503); // 500-502 báo trước, 503 = cao điểm ngày 0
    expect(e.traffic).toBe(0.75);
    expect(e.farm).toBe('flood');
    expect(e.demand?.up).toContain('x_ao_mua');
    expect(e.demand?.up).toContain('x_pin');
  });

  it('Mùa lũ — chỉ tháng 9–10 (không đặt được ngoài mùa)', () => {
    expect(crisisDefById('mua_lu')?.months).toEqual([9, 10]);
  });

  it('Dịch tả heo — Cao điểm: khách ×0,85, farm swine, giá thịt ×1,15', () => {
    const e = crisisEffects(dich(), 603); // 600-602 báo trước, 603 = cao điểm ngày 0
    expect(e.traffic).toBe(0.85);
    expect(e.farm).toBe('swine');
    expect(e.cost('x_thit_heo', 'meat')).toBeCloseTo(1.15, 5);
    expect(e.demand?.down).toContain('x_thit_heo');
  });
});
