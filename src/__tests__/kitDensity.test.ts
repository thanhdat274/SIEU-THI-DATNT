import { describe, expect, it } from 'vitest';
import { KIT_FESTIVAL_PLACEMENTS, KIT_MARKET_PLACEMENTS, KIT_PLACEMENTS, KIT_ROADWORK_PLACEMENTS } from '../world/kitProps';

/** Luật bố cục (promt_game.md): không quá 4 prop trong bán kính 4 m, tính cả khi mọi sự kiện cùng bật. */
describe('mật độ prop kit — tối đa 4 prop / bán kính 4 m (mọi sự kiện bật)', () => {
  const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS, ...KIT_FESTIVAL_PLACEMENTS];
  it('không điểm đặt nào có hơn 4 prop (kể cả nó) trong 4 m', () => {
    const crowded = all
      .map((p) => ({ p, n: all.filter((q) => Math.hypot(q.pos[0] - p.pos[0], q.pos[2] - p.pos[2]) <= 4).length }))
      .filter((x) => x.n > 4)
      .map((x) => `${x.p.module}@${x.p.pos[0]},${x.p.pos[2]} có ${x.n}`);
    expect(crowded).toEqual([]);
  });
});
