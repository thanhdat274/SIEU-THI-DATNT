import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type Furniture } from '../core/store';
import { COOKED_PRODUCT_IDS, RECIPES } from '../data/recipes';
import { FESTIVALS, festivalOn, offSeason, SEASONAL_GOODS } from '../data/calendar';
import { PARTY_ORDERS, offerForDay } from '../data/orders';
import { productById, PRODUCTS } from '../data/products';
import { supplierSells, SUPPLIERS } from '../data/suppliers';
import { FAST_TIP, fastWindow, ON_TIME_TIP, phoneCallFor, VIP_CHANCE, VIP_MUL, VIP_REP } from '../data/phoneOrders';

/** Bộ test đợt 15 — giỏ quà ngày lễ, đơn VIP, thưởng giao nhanh, danh mục mở rộng. */

const BASKETS = ['gio_qua_tet', 'gio_qua_83', 'gio_qua_2011', 'gio_qua_trung_thu'];

describe('giỏ quà ngày lễ — dữ liệu liền mạch', () => {
  it('giỏ là món nhà làm, không nhập được ở mối nào, gắn đúng dịp trên lịch', () => {
    for (const id of BASKETS) {
      expect(COOKED_PRODUCT_IDS.has(id), id).toBe(true);
      expect(productById(id), id).toBeTruthy();
      for (const sup of SUPPLIERS) expect(supplierSells(sup, id), `${sup.id} không được bán ${id}`).toBe(false);
      const r = RECIPES.find((x) => x.outputId === id)!;
      expect(r.festival, `${id} phải gắn dịp`).toBeTruthy();
      const fest = FESTIVALS.find((f) => f.id === r.festival)!;
      expect(fest, `dịp ${r.festival} tồn tại`).toBeTruthy();
      // Nằm trong goods của dịp → ngoài dịp không bán được (offSeason chặn)
      expect(fest.goods).toContain(id);
      expect(SEASONAL_GOODS.has(id)).toBe(true);
    }
  });

  it('giá bán ≈ 1.9× vốn nguyên liệu mỗi giỏ (chuẩn cân bằng món nhà làm)', () => {
    for (const id of BASKETS) {
      const r = RECIPES.find((x) => x.outputId === id)!;
      const costPer = r.inputs.reduce((n, i) => n + productById(i.productId).buy * i.quantity, 0) / r.outputQty;
      const ratio = productById(id).sell / costPer;
      expect(ratio, `${id} tỷ lệ ${ratio.toFixed(2)}`).toBeGreaterThan(1.8);
      expect(ratio, `${id} tỷ lệ ${ratio.toFixed(2)}`).toBeLessThan(2.1);
    }
  });

  it('ngoài dịp: offSeason chặn bán, startCook từ chối; đúng dịp thì gói được', () => {
    // Ngày thường (không lễ): mọi giỏ bị coi ngoài mùa
    const plainDay = 200; // giữa năm, kiểm tra không trúng 4 dịp
    const fest = festivalOn(plainDay);
    expect(['tet', 'quoc_te_phu_nu', 'nha_giao', 'trung_thu']).not.toContain(fest?.id);
    useGame.setState({
      ...newGameData(), day: plainDay, level: 30,
      furniture: [
        { uid: 1, type: 'gift_wrap', x: 0, z: 0, rot: 0, tiers: [] },
      ] as Furniture[],
      storage: { x_keo: 8, x_banh_quy: 4, tra: 2, x_bao_li_xi: 2 },
    });
    expect(offSeason('gio_qua_tet', plainDay)).toBe(true);
    expect(useGame.getState().startCook('recipe_gio_tet')).toBe(false);
    expect(useGame.getState().storage.x_keo).toBe(8); // không trừ nguyên liệu khi chặn
    // Đúng dịp Tết (28/1): gói được
    const tetFest = FESTIVALS.find((f) => f.id === 'tet')!;
    const tetDay = tetFest.from + 1;
    useGame.setState({ day: tetDay });
    expect(festivalOn(tetDay)?.id).toBe('tet');
    expect(offSeason('gio_qua_tet', tetDay)).toBe(false);
    expect(useGame.getState().startCook('recipe_gio_tet')).toBe(true);
    expect(useGame.getState().storage.x_keo).toBe(0);
  });

  it('đơn tiệc giỏ quà chỉ được mời trong đúng dịp', () => {
    const tetDef = PARTY_ORDERS.find((o) => o.id === 'gio_qua_tet_dn')!;
    expect(tetDef.festival).toBe('tet');
    const tetFest = FESTIVALS.find((f) => f.id === 'tet')!;
    const inTet = tetFest.from + 2;
    const plain = 200;
    // Ngoài dịp: không seed nào mời đơn giỏ
    for (let seed = 1; seed < 60; seed++) {
      expect(offerForDay(seed, plain, 40)?.id).not.toBe('gio_qua_tet_dn');
      expect(offerForDay(seed, plain, 40)?.id).not.toBe('gio_qua_2011_dn');
    }
    // Trong dịp Tết: ít nhất một seed mời được đơn giỏ Tết
    let offered = 0;
    for (let seed = 1; seed < 120; seed++) {
      if (offerForDay(seed, inTet, 40)?.id === 'gio_qua_tet_dn') offered++;
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('điện thoại không rao đơn nấu giỏ quà ngoài dịp (đúng dịp thì có)', () => {
    const stations = ['gift_wrap'] as const;
    const plain = 200;
    for (let seed = 1; seed < 400; seed++) {
      for (let slot = 0; slot < 9; slot++) {
        const o = phoneCallFor(seed, plain, slot, 40, {}, 1, 'sunny', {}, [...stations], 5);
        if (o?.premium) expect(BASKETS.some((b) => o.items[b]), `seed ${seed} rao giỏ ngoài dịp`).toBe(false);
      }
    }
    // Đúng dịp Tết: ít nhất một seed rao được đơn nấu giỏ Tết
    const tetFest = FESTIVALS.find((f) => f.id === 'tet')!;
    let offered = 0;
    for (let seed = 1; seed < 400; seed++) {
      for (let slot = 0; slot < 9; slot++) {
        const o = phoneCallFor(seed, tetFest.from + 1, slot, 40, {}, 1, 'sunny', {}, ['gift_wrap'], 5);
        if (o?.premium && o.items['gio_qua_tet']) offered++;
      }
    }
    expect(offered).toBeGreaterThan(0);
  });
});

describe('đơn VIP + thưởng giao nhanh', () => {
  it('VIP chỉ xuất hiện khi danh tiếng đủ, gói 8–14 món một loại, giá hời ×1.5', () => {
    let vip = 0, total = 0;
    for (let seed = 1; seed < 600; seed++) {
      const o = phoneCallFor(seed, 30, 2, 25, { ba_nam: { friendship: 50, visits: 9, perks: [], discovered: [] } }, 1, 'sunny', {}, [], 5);
      if (!o) continue;
      total++;
      if (o.vip) {
        vip++;
        expect(o.premium).toBe(VIP_MUL);
        expect(Object.keys(o.items)).toHaveLength(1);
        const qty = Object.values(o.items)[0];
        expect(qty).toBeGreaterThanOrEqual(8);
        expect(qty).toBeLessThanOrEqual(14);
        expect(o.regular).toBeTruthy();
      }
    }
    expect(vip).toBeGreaterThan(0);
    // Danh tiếng thấp: không bao giờ có VIP
    for (let seed = 1; seed < 300; seed++) {
      expect(phoneCallFor(seed, 30, 2, 25, { ba_nam: { friendship: 50, visits: 9, perks: [], discovered: [] } }, 1, 'sunny', {}, [], 3)?.vip).toBeFalsy();
    }
    expect(VIP_REP).toBe(4.5);
    expect(VIP_CHANCE).toBeLessThan(0.1);
  });

  it('giao nhanh trong nửa đầu khung hẹn: boa gấp đôi giao kịp bình thường', () => {
    const o = { id: 1, houseId: 'nha_12', caller: 'X', reason: 'r', items: { nuoc: 5 }, calledAt: 480, answerBy: 500, dueAt: 555, status: 'ringing' as const };
    expect(fastWindow(o)).toBe(480 + 37.5); // DELIVERY_MINUTES/2 = 37.5
    expect(FAST_TIP).toBe(ON_TIME_TIP * 2);
    // deliverPhone: giao ở phút 500 (trong nửa đầu) boa 30%; phút 540 (nửa sau) boa 15%
    useGame.setState({
      ...newGameData(), day: 10, level: 10, minutes: 500, money: 1000000,
      phoneOrders: [{ ...o, status: 'carrying' as const }],
      storage: {},
    });
    const before = useGame.getState().money;
    useGame.getState().deliverPhone(1);
    const value = 6000 * 5;
    expect(useGame.getState().money - before).toBe(value + Math.round((value * FAST_TIP) / 1000) * 1000);
    useGame.setState({
      ...newGameData(), day: 10, level: 10, minutes: 540, money: 1000000,
      phoneOrders: [{ ...o, id: 2, status: 'carrying' as const }],
    });
    const before2 = useGame.getState().money;
    useGame.getState().deliverPhone(2);
    expect(useGame.getState().money - before2).toBe(value + Math.round((value * ON_TIME_TIP) / 1000) * 1000);
  });
});

describe('danh mục mở rộng — 20 sản phẩm mới', () => {
  const NEW_IDS = ['banh_pia', 'yen_mach', 'mi_tuoi', 'sua_hat', 'cha_bong', 'bia_chai', 'nho_kho', 'sua_chua_hop',
    'ca_phe_lon', 'tra_atiso', 'lap_xuong', 'hat_dieu_muoi', 'kem_cay_hop', 'ruou_gao', 'tom_kho', 'keo_mut_hop',
    'muc_kho', 'mut_tet', 'trung_muoi', 'thit_ga'];
  it('đủ 20 món, id không trùng, giá dương, margin 1.3–1.6×, tập trung cấp 40-52', () => {
    expect(NEW_IDS.length).toBe(20);
    const allIds = new Set(PRODUCTS.map((x) => x.id));
    for (const id of NEW_IDS) {
      const found = PRODUCTS.filter((x) => x.id === id);
      expect(found.length, `${id} xuất hiện đúng một lần`).toBe(1);
      const pr = found[0];
      expect(pr.buy).toBeGreaterThan(0);
      expect(pr.sell / pr.buy).toBeGreaterThan(1.25);
      expect(pr.sell / pr.buy).toBeLessThan(1.65);
      expect(pr.unlock).toBeGreaterThanOrEqual(34);
    }
    expect(allIds.size).toBe(PRODUCTS.length); // không id trùng toàn danh mục
  });
  it('món mới nhập được ở ít nhất một mối (không phải món nhà làm)', () => {
    for (const id of NEW_IDS) {
      expect(COOKED_PRODUCT_IDS.has(id), id).toBe(false);
      expect(SUPPLIERS.some((sup) => supplierSells(sup, id)), `${id} phải có mối nhập`).toBe(true);
    }
  });
});
