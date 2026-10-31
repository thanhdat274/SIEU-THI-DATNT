import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { emptyProgress, REGULARS } from '../data/regulars';
import { EMOTIONAL_FRIENDSHIP, regularQuote, satisfiedLine, walkoutLine } from '../data/regularTrust';

/** GĐ402 — mối ruột (thân thiết ≥ EMOTIONAL_FRIENDSHIP) gọi đúng tên tiệm người chơi đặt khi mua xong. */

const def = REGULARS[0];
const prog = (friendship: number) => ({ ...emptyProgress(), friendship });

describe('satisfiedLine', () => {
  it('chưa đủ thân: giữ câu riêng của khách', () => {
    expect(satisfiedLine(def.lines.satisfied, prog(EMOTIONAL_FRIENDSHIP - 1), 'Tiệm Cô Tư')).toBe(def.lines.satisfied);
    expect(satisfiedLine(def.lines.satisfied, undefined, 'Tiệm Cô Tư')).toBe(def.lines.satisfied);
  });

  it('mối ruột: nhắc đúng tên tiệm, tên trống thì dùng "tiệm mình"', () => {
    expect(satisfiedLine(def.lines.satisfied, prog(EMOTIONAL_FRIENDSHIP), 'Tiệm Cô Tư')).toContain('Tiệm Cô Tư');
    expect(satisfiedLine(def.lines.satisfied, prog(99), '   ')).toContain('tiệm mình');
  });

  it('tên dài nhất (24 ký tự) vẫn giữ câu ≤ 90 ký tự kèm tên khách', () => {
    const line = satisfiedLine(def.lines.satisfied, prog(99), 'x'.repeat(24));
    for (const r of REGULARS) expect(`😊 ${r.name}: "${line}"`.length, r.name).toBeLessThanOrEqual(90);
  });
});

describe('regularVisit — câu hài lòng qua store', () => {
  const msgs: string[] = [];
  beforeEach(() => {
    msgs.length = 0;
    useGame.setState({ ...newGameData(), level: 20, shopName: 'Tiệm Cô Tư', notify: (m: string) => { msgs.push(m); } });
  });

  it('mối ruột ghé mua: thông báo có tên tiệm', () => {
    useGame.setState({ regulars: { [def.id]: { ...prog(60), perks: def.perks.map((p) => p.title) } } });
    useGame.getState().regularVisit(def.id, [{ id: def.favorites[0], price: 10_000 }], true);
    expect(msgs.some((m) => m.includes('Tiệm Cô Tư'))).toBe(true);
  });

  it('khách mới: không nhắc tên tiệm', () => {
    useGame.getState().regularVisit(def.id, [{ id: def.favorites[0], price: 10_000 }], true);
    expect(msgs.some((m) => m.includes('Tiệm Cô Tư'))).toBe(false);
  });
});

describe('regularQuote (GĐ404)', () => {
  it('chưa ghé lần nào: chưa lộ câu cửa miệng', () => {
    expect(regularQuote(def.lines.greeting, undefined)).toBeNull();
    expect(regularQuote(def.lines.greeting, emptyProgress())).toBeNull();
  });
  it('đã ghé: hiện đúng lời chào của khách', () => {
    expect(regularQuote(def.lines.greeting, { ...emptyProgress(), visits: 1 })).toBe(def.lines.greeting);
  });
});

describe('walkoutLine (GĐ405)', () => {
  it('hết hàng / đắt: nói đúng món và lý do; không rõ thì giữ câu riêng', () => {
    expect(walkoutLine(def.lines.walkout, { name: 'Sữa', why: 'stock' })).toContain('Hết Sữa');
    expect(walkoutLine(def.lines.walkout, { name: 'Sữa', why: 'price' })).toContain('mắc');
    expect(walkoutLine(def.lines.walkout, { name: 'Sữa', why: 'wait' })).toBe(def.lines.walkout);
    expect(walkoutLine(def.lines.walkout)).toBe(def.lines.walkout);
  });

  it('qua store: khách quen bỏ về vì hết món → thông báo tên món, ≤ 90 ký tự với mọi khách × món', async () => {
    const { PRODUCTS } = await import('../data/products');
    const longest = PRODUCTS.reduce((a, p) => (p.name.length > a.length ? p.name : a), '');
    for (const r of REGULARS) {
      for (const why of ['stock', 'price']) {
        expect(`😞 ${r.name}: "${walkoutLine(r.lines.walkout, { name: longest, why })}"`.length, `${r.name}/${why}`).toBeLessThanOrEqual(90);
      }
    }
    const msgs: string[] = [];
    useGame.setState({ ...newGameData(), level: 20, notify: (m: string) => { msgs.push(m); } });
    useGame.getState().regularVisit(def.id, [], false, { id: def.favorites[0], why: 'stock' });
    expect(msgs.at(-1)).toContain(PRODUCTS.find((p) => p.id === def.favorites[0])!.name);
  });
});
