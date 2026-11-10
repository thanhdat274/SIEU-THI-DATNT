import { describe, expect, it } from 'vitest';
import {
  CRISIS_DEFS, crisisActive, crisisDefById, crisisEffects, crisisFor, crisisPhaseLabel,
  crisisTotalDays, yearCrises,
} from '../data/crisis';
import { dayOfYear } from '../data/calendar';

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
