import { describe, it, expect } from 'vitest';
import { regularGiftPlan, REGULAR_GIFT_LEVEL } from '../data/regularGift';
import { REGULARS } from '../data/regulars';
import { productById } from '../data/products';

const def = REGULARS[0];
const fav = def.favorites.find((f) => productById(f).unlock <= 60)!;
const met = { visits: 1 } as never;

describe('GĐ1557 tặng quà khách quen', () => {
  it('khoá dưới cấp 38', () => {
    expect('error' in regularGiftPlan(def, met, REGULAR_GIFT_LEVEL - 1, 5, { [fav]: 3 })).toBe(true);
  });
  it('chọn món khách thích còn trong kho', () => {
    expect(regularGiftPlan(def, met, 60, 5, { [fav]: 3 })).toEqual({ productId: fav });
  });
  it('kho trống → lỗi', () => {
    expect(regularGiftPlan(def, met, 60, 5, {})).toEqual({ error: 'Kho không có món khách thích' });
  });
  it('mỗi ngày 1 lần', () => {
    const prog = { visits: 1, lastGiftDay: 5 } as never;
    expect(regularGiftPlan(def, prog, 60, 5, { [fav]: 3 })).toEqual({ error: 'Hôm nay đã tặng rồi' });
    expect(regularGiftPlan(def, prog, 60, 6, { [fav]: 3 })).toEqual({ productId: fav });
  });
});

import { giftFriendship } from '../data/regularGift';
describe('GĐ1558 quà sinh nhật', () => {
  it('ngày sinh nhật ×2', () => {
    expect(giftFriendship(false)).toBe(3);
    expect(giftFriendship(true)).toBe(6);
  });
});

import { giftableCount } from '../data/regularGift';
describe('GĐ1559 đếm khách tặng được', () => {
  it('trừ khách đã tặng hôm nay', () => {
    expect(giftableCount([def], { [def.id]: met }, 60, 5, { [fav]: 1 })).toBe(1);
    expect(giftableCount([def], { [def.id]: { visits: 1, lastGiftDay: 5 } as never }, 60, 5, { [fav]: 1 })).toBe(0);
    expect(giftableCount([def], { [def.id]: met }, 30, 5, { [fav]: 1 })).toBe(0);
  });
});

import { birthdayHint } from '../data/regulars';
describe('GĐ1561 Sổ đầu ngày nhắc quà sinh nhật', () => {
  it('cấp 38 có thêm "tặng quà +6", dưới thì không', () => {
    const have = (id: string) => id === def.favorites[0];
    expect(birthdayHint(def, have, 38).text).toContain('tặng quà +6');
    expect(birthdayHint(def, have, 37).text).not.toContain('tặng quà');
  });
});

import { sortForGift } from '../data/regularGift';
describe('GĐ1563 xếp sổ khách quen', () => {
  const [a, b, c] = REGULARS;
  it('sinh nhật lên đầu, dưới cấp 38 giữ nguyên', () => {
    expect(sortForGift([a, b, c], {}, 60, 5, {}, (d) => d === c)[0]).toBe(c);
    expect(sortForGift([a, b, c], {}, 30, 5, {}, (d) => d === c)[0]).toBe(a);
  });
  it('khách đã tặng hôm nay xuống cuối', () => {
    const st = Object.fromEntries([a, b, c].flatMap((d) => d.favorites.map((f) => [f, 5])));
    const out = sortForGift([a, b, c], { [a.id]: { visits: 1, lastGiftDay: 5 } as never, [b.id]: met, [c.id]: met }, 99, 5, st, () => false);
    expect(out.at(-1)).toBe(a);
  });
});

describe('GĐ1574 chưa quen không tặng được', () => {
  it('visits 0 → lỗi', () => {
    expect(regularGiftPlan(def, undefined, 60, 5, { [fav]: 3 })).toEqual({ error: 'Chưa quen — chờ khách ghé lần đầu' });
  });
});

describe('GĐ1586 giftReportLine', () => {
  it('null khi chưa tặng, số món khi có', async () => {
    const { giftReportLine } = await import('../data/regularGift');
    expect(giftReportLine(undefined)).toBeNull();
    expect(giftReportLine(0)).toBeNull();
    expect(giftReportLine(3)).toBe('3 món');
  });
});

describe('GĐ1587 giftPanelLine', () => {
  it('kèm số đã tặng', async () => {
    const { giftPanelLine } = await import('../data/regularGift');
    expect(giftPanelLine(3, undefined)).toBe('🎁 Hôm nay còn tặng quà được 3 khách quen');
    expect(giftPanelLine(1, 2)).toContain('đã tặng 2');
  });
});

describe('GĐ1588 giftXp', () => {
  it('sinh nhật +30 XP', async () => {
    const { giftXp } = await import('../data/regularGift');
    expect(giftXp(true)).toBe(30);
    expect(giftXp(false)).toBe(0);
  });
});

describe('GĐ1595 giftRemainNote', () => {
  it('còn / hết', async () => {
    const { giftRemainNote } = await import('../data/regularGift');
    expect(giftRemainNote(2)).toContain('còn tặng được 2');
    expect(giftRemainNote(0)).toContain('đã tặng hết');
  });
});

describe('GĐ1596 thông báo tặng quà qua store', () => {
  it('kèm đuôi còn tặng / đã tặng hết', async () => {
    const { useGame } = await import('../core/store');
    const { REGULARS } = await import('../data/regulars');
    const r = REGULARS[0];
    const fav = r.favorites[0];
    const s = useGame.getState();
    useGame.setState({ level: 40, storage: { ...s.storage, [fav]: 5 }, regulars: { ...s.regulars, [r.id]: { friendship: 5, visits: 2, discovered: [fav], perks: [] } } });
    expect(useGame.getState().giftRegular(r.id)).toBe(true);
    expect(useGame.getState().message).toMatch(/còn tặng được|đã tặng hết/);
  });
});
