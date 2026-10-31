import { describe, expect, it } from 'vitest';
import {
  FESTIVALS, SEASONAL_GOODS, describeDate, festivalOn,
  festivalStock, upcomingFestival, type Festival,
} from '../data/calendar';
import { productById } from '../data/products';
import { REGULARS, regularById } from '../data/regulars';
import { PARTY_ORDERS } from '../data/orders';
import { RECIPES } from '../data/recipes';
import { PRODUCTS } from '../data/products';
import { activeGoals, communityGoal, openingGoal, upcomingGoals } from '../data/community';

/**
 * Bộ test GĐ25 — Cứng hóa dữ liệu kinh tế lễ hội (integrity).
 *
 * Áp "bài học GĐ13" (lời hứa trong dữ liệu không được thực thi) lên lớp mục tiêu
 * cộng đồng/dịp lễ: mọi tham chiếu (host, festival id, khoan hàng) phải trỏ tới
 * phần tử thật. Một host viết sai sẽ âm thầm mất phần thưởng thân thiết; một id
 * dịp không tồn tại sẽ khiến đơn lễ / món nấu không bao giờ lên. Những assert ở
 * đây bảo vệ các khu vực đó khỏi lỗi chính tả trong tương lai.
 */

const FESTIVAL_IDS = new Set(FESTIVALS.map((f) => f.id));
const PRODUCT_IDS = new Set(PRODUCTS.map((p) => p.id));
const REGULAR_IDS = new Set(REGULARS.map((r) => r.id));

describe('Dịp lễ: host và tham chiếu hàng đều trỏ tới phần tử thật', () => {
  it('mọi Festival.host là một khách quen có thật (không chỉ định host chết)', () => {
    const dangling = FESTIVALS.filter((f) => f.host && !REGULAR_IDS.has(f.host)).map((f) => `${f.id} -> ${f.host}`);
    expect(dangling, `host trỏ khách quen không tồn tại: ${dangling.join(', ')}`).toEqual([]);
  });

  it('mục tiêu khai trương dùng đúng host có thật', () => {
    const g = openingGoal({ day: 5, tier: 1 }, 10);
    expect(g.festival.host).toBeDefined();
    expect(regularById(g.festival.host!)).toBeDefined();
  });

  it('mọi món hàng của dịp (goods + hot) là sản phẩm có thật', () => {
    for (const f of FESTIVALS) {
      const bad = [...(f.goods ?? []), ...f.hot].filter((id) => !PRODUCT_IDS.has(id));
      expect(bad, `${f.id} tham chiếu sản phẩm không tồn tại: ${bad.join(', ')}`).toEqual([]);
    }
  });

  it('SEASONAL_GOODS chỉ chứa sản phẩm thật và đều nằm trong goods của một dịp', () => {
    for (const id of SEASONAL_GOODS) {
      expect(PRODUCT_IDS.has(id), `hàng mùa không phải sản phẩm: ${id}`).toBe(true);
      expect(FESTIVALS.some((f) => f.goods?.includes(id)), `${id} không xuất hiện trong goods dịp nào`).toBe(true);
    }
  });
});

describe('Quy chiếu lễ hội từ đơn sự kiện và công thức', () => {
  it('mọi PartyOrderDef.festival trỏ tới một dịp thật', () => {
    const bad = PARTY_ORDERS.filter((o) => o.festival && !FESTIVAL_IDS.has(o.festival)).map((o) => `${o.id} -> ${o.festival}`);
    expect(bad, `đơn lễ tham chiếu dịp không tồn tại: ${bad.join(', ')}`).toEqual([]);
  });

  it('mọi Recipe.festival trỏ tới một dịp thật', () => {
    const bad = RECIPES.filter((r) => r.festival && !FESTIVAL_IDS.has(r.festival)).map((r) => `${r.id} -> ${r.festival}`);
    expect(bad, `món lễ tham chiếu dịp không tồn tại: ${bad.join(', ')}`).toEqual([]);
  });

  it('outputId của món lễ có trong goods của dịp tương ứng (bán được đúng mùa)', () => {
    for (const r of RECIPES.filter((r) => r.festival)) {
      const f = FESTIVALS.find((x) => x.id === r.festival);
      expect(f, `món ${r.id} trỏ dịp ${r.festival} — cần FESTIVALS`).toBeDefined();
      expect(f!.goods?.includes(r.outputId), `${r.outputId} của dịp ${r.festival} nằm trong Festival.goods`).toBe(true);
    }
  });
});

describe('Các dịp không đè nhau (bất biến một dịp/ngày)', () => {
  it('festivalOn không bao giờ trả về 2 dịp cho cùng một ngày', () => {
    // Quét cả năm: mỗi ngày chỉ có nhiều nhất 1 dịp đang diễn ra.
    const seen = new Set<string>();
    for (let doy = 0; doy < 365; doy++) {
      const on = FESTIVALS.filter((f) => doy >= f.from && doy <= f.to).map((f) => f.id);
      if (on.length > 1) seen.add(`${describeDate(doy + 1)}: ${on.join('+')}`);
    }
    expect([...seen].slice(0, 8), 'các dịp đè lịch khiến festivalOn mất xác định').toEqual([]);
  });
});

describe('festivalStock chỉ trả hàng đã mở khóa cho cấp', () => {
  it('mọi món trong festivalStock có unlock <= cấp', () => {
    for (const f of FESTIVALS) {
      for (const lv of [1, 21, 41, 60, 100]) {
        for (const id of festivalStock(f, lv)) {
          expect(productById(id).unlock, `${id} unlock>cấp ${lv} (dịp ${f.id})`).toBeLessThanOrEqual(lv);
        }
      }
    }
  });
});

describe('Mục tiêu cộng đồng: xác định và hợp lệ', () => {
  it('communityGoal cho mọi dịp: days>0, thưởng dương, xác định theo cùng input', () => {
    for (const f of FESTIVALS) {
      const days = f.to - f.from + 1;
      for (const lv of [10, 40, 80]) {
        const g1 = communityGoal(f, 30, lv);
        const g2 = communityGoal(f, 30, lv);
        expect(g1.startDay).toBe(30);
        expect(g1.days).toBe(days);
        expect(g1.reward.money).toBeGreaterThan(0);
        expect(g1.reward.xp).toBeGreaterThan(0);
        expect(g1.reward.friendship).toBeGreaterThan(0);
        expect(g1).toEqual(g2); // thuần: cùng input -> cùng output
      }
    }
  });

  it('activeGoals trả mục tiêu khai trương đúng ngày khai trương và mục tiêu dịp đúng dịp', () => {
    // Ngày 34 = 3/2: nằm trong Tết Nguyên Đán (28/1 – 8/2) và là ngày khai trương.
    const openDay = 34;
    const goals = activeGoals(openDay, 30, { day: openDay, tier: 2 });
    expect(goals.some((g) => g.key === `khai_truong:2`)).toBe(true);
    expect(goals.some((g) => g.festival.id === 'tet')).toBe(true);
  });

  it('upcomingGoals báo dịp sắp tới trong cửa sổ báo trước', () => {
    // Ngày 231 = 19/8: không đang dịp; sắp tới là Chợ đêm (21–22/8, cách 2 ngày).
    const up = upcomingGoals(231, 30);
    expect(up.some((x) => x.goal.festival.id === 'cho_dem')).toBe(true);
  });

  it('upcomingFestival đúng ranh giới năm (quanh Tết dương trong cửa sổ 3 ngày)', () => {
    // Ngày 365 (31/12) cách Tết dương 1/1 đúng 1 ngày (quay đầu năm).
    const soon = upcomingFestival(365);
    expect(soon?.festival.id).toBe('tet_duong');
    expect(soon?.inDays).toBe(1);
  });
});
