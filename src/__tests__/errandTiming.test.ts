import { describe, expect, it } from 'vitest';
import { REGULAR_ARCS, arcById, errandWindow, pendingErrands, type RegularArcState } from '../data/regularArc';
import { regularById, visitsToday } from '../data/regulars';
import { slowBands, timeBandAt } from '../data/rhythm';
import { errandAgenda, todayAgenda } from '../data/todayAgenda';
import { idleTip } from '../data/idle';
import { fmtHour } from '../data/cookSchedule';
import { newGameData, useGame } from '../core/store';
import type { GameState } from '../core/gameTypes';
import { newGarden } from '../data/garden';
import { newOnline } from '../data/online';
import { newSocial } from '../data/social';

/** GĐ163 — Đợt nhờ của khách quen rơi vào khung vắng: cửa sổ "tiện làm" của bước nhờ
 *  = khung ghé của khách ∩ giờ vắng (band traffic < 0.8), suy ra THUẦN ĐỌC từ dữ liệu
 *  có sẵn (không thêm save, không đụng slice — nhịp arc GĐ80 giữ nguyên). Mọi helper
 *  đều deterministic (không random, không phụ thuộc RNG seam) nên test khóa thẳng. */

const LEVEL = 40;
const step0 = (arcId: string, day = 10): RegularArcState => ({
  arcId, step: 0, offerDay: day, expiresDay: day + arcById(arcId)!.days, waitingReward: false,
});

describe('errandWindow — cửa sổ nhờ rơi vào khung vắng (phân bố)', () => {
  it('cả 3 đợt nhờ của catalog đều có cửa sổ nằm trọn trong khung giờ vắng (3/3)', () => {
    for (const arc of REGULAR_ARCS) {
      const def = regularById(arc.regularId)!;
      const w = errandWindow(def);
      expect(w.inSlow, `${arc.id} — ${def.name}`).toBe(true);
      expect(w.from).toBeGreaterThanOrEqual(def.visitFrom);
      expect(w.to).toBeLessThanOrEqual(def.visitUntil);
      // Trọn cửa sổ nằm trong MỘT khung vắng (biên đầu/cuối cùng band traffic < 0.8)
      const head = timeBandAt(w.from);
      const tail = timeBandAt(w.to - 1);
      expect(head).toBe(tail);
      expect(head!.traffic).toBeLessThan(0.8);
    }
  });

  it('phân bố theo seed: mọi lượt ghé của khách có đợt nhờ (nhiều seed/ngày) đều mang cửa sổ giờ vắng', () => {
    // visitsToday deterministic theo (seed, day) — quy ước GĐ27/28. Cửa sổ là hằng số theo
    // khách nên tỉ lệ cửa sổ nhờ rơi vào khung vắng là 100% ở MỌI seed: khóa bằng test.
    let visits = 0;
    let slowVisits = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (let day = 10; day <= 19; day++) {
        for (const arc of REGULAR_ARCS) {
          const def = regularById(arc.regularId)!;
          if (!visitsToday(def, day, seed, LEVEL, undefined)) continue;
          visits++;
          if (errandWindow(def).inSlow) slowVisits++;
        }
      }
    }
    expect(visits).toBeGreaterThan(0); // chắc chắn có dữ liệu — test không rỗng
    expect(slowVisits).toBe(visits);
  });

  it('khung ghé không chạm khung vắng nào → fallback nguyên khung ghé (inSlow = false)', () => {
    // Chị Vy chỉ ghé 20h–23h (khuya traffic 0.8 — không < 0.8) → không có cửa sổ giờ vắng
    const w = errandWindow(regularById('vy_live')!);
    expect(w).toEqual({ from: 20 * 60, to: 23 * 60, inSlow: false });
  });
});

describe('errandWindow — cửa sổ cụ thể từng khách có đợt nhờ', () => {
  it('Bà Năm (ghé 6h–10h): cửa sổ 8h30–10h — phần ghé chạm giữa buổi', () => {
    expect(errandWindow(regularById('ba_nam')!)).toEqual({ from: 8 * 60 + 30, to: 10 * 60, inSlow: true });
  });

  it('Chú Ba xe ôm (ghé 10h–17h): lấy khung CHỒNG DÀI NHẤT 13h–17h, không phải 10h–11h', () => {
    expect(errandWindow(regularById('chu_ba')!)).toEqual({ from: 13 * 60, to: 17 * 60, inSlow: true });
  });

  it('Bé Na (ghé 16h–18h30): cửa sổ 16h–17h — hết 17h là cao điểm tối', () => {
    expect(errandWindow(regularById('be_na')!)).toEqual({ from: 16 * 60, to: 17 * 60, inSlow: true });
  });

  it('xác định: gọi hai lần cùng kết quả; slowBands khớp đúng 2 khung ×0.6', () => {
    const def = regularById('ba_nam')!;
    expect(errandWindow(def)).toEqual(errandWindow(def));
    expect(slowBands().map((b) => b.id)).toEqual(['giua_sang', 'chieu']);
  });
});

describe('pendingErrands — bước nhờ đang chờ', () => {
  it('đợt đang dở → trả kèm arc + bước hiện tại; chờ thưởng / xong / quá hạn / arc lạ thì bỏ', () => {
    const arcs: Record<string, RegularArcState> = {
      ba_nam: step0('arc_xoi'),                                  // đang dở → giữ
      chu_ba: { ...step0('arc_keo'), waitingReward: true },      // chờ thưởng → bỏ
      be_na: { ...step0('arc_xoi'), done: true },                // đã xong → bỏ
      anh_tuan: { arcId: 'arc_xoi', step: 0, offerDay: 1, expiresDay: 9, waitingReward: false }, // quá hạn → bỏ
      bac_tam: { arcId: 'arc_khong_ton_tai', step: 0, offerDay: 9, expiresDay: 12, waitingReward: false }, // arc lạ (save lệch) → bỏ
    };
    const out = pendingErrands(arcs, 10);
    expect(out).toHaveLength(1);
    expect(out[0].regularId).toBe('ba_nam');
    expect(out[0].arc.id).toBe('arc_xoi');
    expect(out[0].step.itemId).toBe('sua');
    expect(pendingErrands(undefined, 10)).toEqual([]);
    expect(pendingErrands({}, 10)).toEqual([]);
  });
});

describe('errandAgenda — chip "Việc {khách} nhờ" trên dải Kế hoạch hôm nay', () => {
  it('bước đang chờ → chip 🤝 ở đầu cửa sổ "tiện làm", bấm mở bảng Khách quen', () => {
    const items = errandAgenda({ day: 10, arcs: { ba_nam: step0('arc_xoi') } });
    expect(items).toEqual([{
      key: 'errand-ba_nam',
      atMinutes: 8 * 60 + 30,
      untilMinutes: 10 * 60,
      icon: '🤝',
      label: '8h30 Việc Bà Năm bán xôi nhờ',
      panel: 'regulars',
    }]);
  });

  it('mỗi đợt nhờ một chip đúng cửa sổ của khách đó; hết đợt thì không chip', () => {
    const items = errandAgenda({
      day: 10,
      arcs: { ba_nam: step0('arc_xoi'), chu_ba: step0('arc_xe_om'), be_na: step0('arc_keo') },
    });
    expect(items.map((i) => [i.key, i.atMinutes, i.untilMinutes])).toEqual([
      ['errand-ba_nam', 510, 600],
      ['errand-chu_ba', 780, 1020],
      ['errand-be_na', 960, 1020],
    ]);
    // Không đợt nào / đợt đã xong / đợi thưởng → rỗng
    expect(errandAgenda({ day: 10, arcs: {} })).toEqual([]);
    expect(errandAgenda({ day: 10, arcs: { ba_nam: { ...step0('arc_xoi'), done: true } } })).toEqual([]);
    expect(errandAgenda({ day: 10, arcs: { ba_nam: { ...step0('arc_xoi'), waitingReward: true } } })).toEqual([]);
    expect(errandAgenda({ day: 10, arcs: { ba_nam: { ...step0('arc_xoi'), expiresDay: 9 } } })).toEqual([]);
  });

  it('nguồn khớp vào dải chung: chip hiện trong ngày, sắp đúng thứ tự thời gian', () => {
    const items = todayAgenda({
      minutes: 9 * 60,
      day: 10,
      seed: 1,
      level: LEVEL,
      regulars: {},
      regularArcs: { ba_nam: step0('arc_xoi'), chu_ba: step0('arc_xe_om') },
      hasCourier: false,
    });
    const errand = items.find((i) => i.key === 'errand-ba_nam');
    expect(errand).toBeTruthy();      // 9h đang trong cửa sổ 8h30–10h → chip còn hiệu lực
    expect(items.find((i) => i.key === 'errand-chu_ba')).toBeTruthy(); // cửa sổ 13h–17h chưa tới → vẫn hiện trước
    for (let i = 1; i < items.length; i++) expect(items[i].atMinutes).toBeGreaterThanOrEqual(items[i - 1].atMinutes);
    for (const it of items) expect(it.untilMinutes).toBeGreaterThan(9 * 60);
  });

  it('hết cửa sổ (11h) → chip nhờ của Bà Năm bị lọc khỏi dải như mọi chip hẹn khác', () => {
    const items = todayAgenda({
      minutes: 11 * 60,
      day: 10,
      seed: 1,
      level: LEVEL,
      regulars: {},
      regularArcs: { ba_nam: step0('arc_xoi') },
    });
    expect(items.find((i) => i.key === 'errand-ba_nam')).toBeUndefined();
  });
});

describe('idleTip — mức 0: việc nhờ trong cửa sổ "tiện làm" thắng mọi gợi ý thường', () => {
  /** Nền tiệm gọn gàng (không dính mức 1–8) → không có việc nhờ thì gợi ý mặc định là sổ đầu ngày. */
  const seed = (over: Partial<GameState>) => {
    const g = newGameData();
    useGame.setState({
      ...g,
      level: LEVEL,
      day: 10,
      dirt: 0,
      furniture: [],
      storage: { mi: 150 }, // ≥ 25% kho bậc 0 → không nhắc nhập hàng
      happyHour: { from: 14, off: 10 },
      social: { ...newSocial(), promoDay: 10 },
      garden: newGarden(),
      online: newOnline(),
      ...over,
    });
  };
  const tip = () => idleTip(useGame.getState());

  it('9h (trong cửa sổ 8h30–10h của Bà Năm) + bước nhờ đang chờ → gợi ý 🤝 mở bảng Khách quen', () => {
    const g = newGameData();
    seed({ minutes: 9 * 60, biz: { ...g.biz, regularArcs: { ba_nam: step0('arc_xoi') } } });
    const t = tip();
    expect(t?.icon).toBe('🤝');
    expect(t?.act).toBe('regulars');
    expect(t?.text).toBe('Bà Năm bán xôi nhờ giữ 2 hộp sữa — 8h30–10h tiện làm');
  });

  it('Chú Ba: 13h20 trong cửa sổ 13h–17h → gợi ý đúng khách; xác định khi gọi lại', () => {
    const g = newGameData();
    seed({ minutes: 13 * 60 + 20, biz: { ...g.biz, regularArcs: { chu_ba: step0('arc_xe_om') } } });
    const t = tip();
    expect(t?.text).toBe('Chú Ba xe ôm nhờ giữ 2 chai nước tăng lực — 13h–17h tiện làm');
    expect(t).toEqual(idleTip(useGame.getState()));
  });

  it('ngoài cửa sổ (11h40 — cao điểm trưa) → gợi ý cũ (mặc định sổ đầu ngày)', () => {
    seed({ minutes: 11 * 60 + 40, biz: { ...newGameData().biz, regularArcs: { ba_nam: step0('arc_xoi') } } });
    expect(tip()?.act).toBe('morning');
  });

  it('trong cửa sổ nhưng không đợt nào chờ (rỗng / chờ thưởng) → gợi ý cũ', () => {
    seed({ minutes: 9 * 60 });
    expect(tip()?.act).toBe('morning');
    seed({
      minutes: 9 * 60,
      biz: { ...newGameData().biz, regularArcs: { ba_nam: { ...step0('arc_xoi'), waitingReward: true } } },
    });
    expect(tip()?.act).toBe('morning');
  });

  it('nửa đêm (minutes > 1440): giờ chuẩn hóa về 1h sáng — ngoài mọi cửa sổ, không sập', () => {
    seed({ minutes: 25 * 60, biz: { ...newGameData().biz, regularArcs: { ba_nam: step0('arc_xoi') } } });
    expect(tip()?.act).toBe('morning');
  });
});
