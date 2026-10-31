import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, snapshot } from '../core/save';
import { productById } from '../data/products';
import { quanNuocCupSupply, quanNuocDay, quanNuocProjection } from '../data/quanNuoc';
import {
  brewMenu, cleanMenu, QUAN_MENU_SLOTS, QUAN_RECIPES, quanRecipeById, recipeCapacity, recipeCupCost, varietyMul, menuBoardLines,
 } from '../data/quanRecipes';

/** GĐ415 — Pha chế quán nước: công thức từ kho chung, thực đơn đa dạng kéo khách. */

const full = (n = 50) => Object.fromEntries(QUAN_RECIPES.flatMap((r) => r.uses.map((u) => [u.id, n])));

describe('dữ liệu công thức', () => {
  it('mọi nguyên liệu là sản phẩm có thật, mở trước công thức; món pha lời hơn giá vốn', () => {
    for (const r of QUAN_RECIPES) {
      for (const u of r.uses) expect(productById(u.id).unlock, `${r.id}/${u.id}`).toBeLessThanOrEqual(r.unlock);
      expect(r.price, r.id).toBeGreaterThan(recipeCupCost(r) * 1.5);
    }
    expect(new Set(QUAN_RECIPES.map((r) => r.id)).size).toBe(QUAN_RECIPES.length);
  });

  it('cleanMenu: bỏ id lạ, chưa mở, trùng; cắt theo số ô', () => {
    expect(cleanMenu(['tra_da', 'tra_da', 'khong_co', 'sinh_to'], 29)).toEqual(['tra_da']);
    expect(cleanMenu(QUAN_RECIPES.map((r) => r.id), 99)).toHaveLength(QUAN_MENU_SLOTS);
    expect(cleanMenu(undefined, 40)).toEqual([]);
  });

  it('thiếu một nguyên liệu: sức pha 0', () => {
    const r = quanRecipeById('ca_phe_sua')!;
    expect(recipeCapacity(r, { x_ca_phe_hoa_tan: 5, x_nuoc_da: 5 })).toBe(0);
    expect(recipeCapacity(r, { x_ca_phe_hoa_tan: 1, x_sua_dac: 1, x_nuoc_da: 9 })).toBe(10);
  });
});

describe('brewMenu', () => {
  it('chia đều cho các món, rút kho làm tròn lên, không đụng storage đầu vào', () => {
    const storage = full();
    const before = { ...storage };
    const took: Record<string, number> = {};
    const b = brewMenu(['tra_da', 'nuoc_mia'], storage, 21, 1, (id, q) => { took[id] = (took[id] ?? 0) + q; });
    expect(b.cups).toEqual({ tra_da: 11, nuoc_mia: 10 });
    expect(took).toEqual({ tra: 1, x_nuoc_da: 3, mia: 3 }); // đá: 2 cho trà (11 ly) + 1 cho mía (10 ly)
    expect(b.revenue).toBe(11 * 5_000 + 10 * 12_000);
    expect(storage).toEqual(before);
  });

  it('đá dùng chung: món sau thấy kho đá đã bị món trước dùng', () => {
    const b = brewMenu(['tra_da', 'nuoc_mia'], { tra: 10, mia: 10, x_nuoc_da: 2 }, 40, 1, () => {});
    expect(b.cups.tra_da).toBe(20);
    expect(b.cups.nuoc_mia).toBeUndefined();
    expect(b.short).toEqual(['nuoc_mia']);
  });
});

describe('ngày bán có thực đơn', () => {
  const base = { open: true, staff: 1, price: 'vua' as const };

  it('thực đơn đa dạng hơn: đông khách hơn; doanh thu cao hơn chỉ bán nước chai', () => {
    const storage = { ...full(), nuoc: 500 };
    const plain = quanNuocDay(base, 35, { ...storage }, () => {}, 'cloudy')!;
    const one = quanNuocDay({ ...base, menu: ['ca_phe_sua'] }, 35, { ...storage }, () => {}, 'cloudy')!;
    const four = quanNuocDay({ ...base, menu: ['ca_phe_sua', 'sinh_to', 'bac_xiu', 'cam_vat'] }, 35, { ...storage }, () => {}, 'cloudy')!;
    expect(one.customers).toBe(plain.customers);
    expect(four.customers).toBe(Math.round(plain.customers * varietyMul(4)));
    expect(one.revenue).toBeGreaterThan(plain.revenue);
    expect(four.brewed.sinh_to).toBeGreaterThan(0);
  });

  it('món pha hết nguyên liệu: khách còn lại mua nước chai, báo món thiếu', () => {
    const d = quanNuocDay({ ...base, menu: ['ca_phe_sua'] }, 30, { x_ca_phe_hoa_tan: 1, x_sua_dac: 1, x_nuoc_da: 1, nuoc: 500 }, () => {}, 'cloudy')!;
    expect(d.brewed.ca_phe_sua).toBe(10);
    expect(d.brewShort).toEqual(['ca_phe_sua']);
    expect(d.served).toBe(d.wanted);
  });

  it('dự phóng khớp ngày bán thật khi có thực đơn', () => {
    const storage = { ...full(), nuoc: 500 };
    const q = { ...base, menu: ['tra_da', 'ca_phe_den'] };
    const d = quanNuocDay(q, 30, { ...storage }, () => {}, 'sunny')!;
    const p = quanNuocProjection(q, 30, quanNuocCupSupply(q, 30, storage), 'sunny');
    expect([p.customers, p.wanted, p.served]).toEqual([d.customers, d.wanted, d.served]);
  });
});

describe('store + save', () => {
  const msgs: string[] = [];
  beforeEach(() => {
    msgs.length = 0;
    const d = newGameData();
    useGame.setState({ ...d, level: 33, notify: (m: string) => { msgs.push(m); }, biz: { ...d.biz, quanNuoc: { ...d.biz.quanNuoc, open: true } } });
  });

  it('toggleQuanRecipe: thêm/bỏ, chặn món chưa mở và quá số ô', () => {
    const g = useGame.getState;
    g().toggleQuanRecipe('tra_da');
    expect(g().biz.quanNuoc.menu).toEqual(['tra_da']);
    g().toggleQuanRecipe('tra_da');
    expect(g().biz.quanNuoc.menu).toEqual([]);
    g().toggleQuanRecipe('sinh_to');
    expect(g().biz.quanNuoc.menu).toEqual([]);
    for (const id of ['tra_da', 'ca_phe_den', 'nuoc_chanh', 'nuoc_mia', 'bac_xiu']) g().toggleQuanRecipe(id);
    expect(g().biz.quanNuoc.menu).toHaveLength(QUAN_MENU_SLOTS);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });

  it('save cũ thiếu menu vẫn chạy như bán nước chai; snapshot giữ thực đơn', () => {
    useGame.getState().toggleQuanRecipe('nuoc_mia');
    const save = snapshot();
    useGame.setState({ ...newGameData() });
    applySnapshot(save);
    expect(useGame.getState().biz.quanNuoc.menu).toEqual(['nuoc_mia']);
    const old = { open: true, staff: 0, price: 'vua' as const };
    expect(quanNuocDay(old, 29, { nuoc: 100 }, () => {})!.brewed).toEqual({});
  });
});

describe('menuBoardLines (GĐ416 bảng phấn quầy 3D)', () => {
  it('chưa chọn món: báo nước chai', () => {
    expect(menuBoardLines(undefined)).toEqual(['Nước giải khát chai']);
    expect(menuBoardLines(['khong_co'])).toEqual(['Nước giải khát chai']);
  });
  it('liệt kê tên + giá nghìn đồng theo thứ tự thực đơn', () => {
    expect(menuBoardLines(['ca_phe_sua', 'tra_da'])).toEqual(['Cà phê sữa đá 20k', 'Trà đá 5k']);
  });
});

describe('brewQuanHand (GĐ427 tự pha ở quầy)', () => {
  const msgs: string[] = [];
  beforeEach(() => {
    msgs.length = 0;
    const d = newGameData();
    useGame.setState({ ...d, level: 33, storage: full(10), storageLots: {}, notify: (m: string) => { msgs.push(m); },
      biz: { ...d.biz, quanNuoc: { ...d.biz.quanNuoc, open: true, menu: ['tra_da'] } } });
  });
  it('GĐ453: mỗi mẻ +2 XP', () => {
    const g = useGame.getState;
    const xp = g().xp;
    expect(g().brewQuanHand()).toBe(true);
    expect(g().xp).toBe(xp + 2);
  });
  it('pha 5 ly bán ngay +20%, trừ kho, tối đa 3 mẻ/ngày, thông báo ≤90 ký tự', () => {
    const g = useGame.getState;
    const m0 = g().money;
    expect(g().brewQuanHand()).toBe(true);
    expect(g().money - m0).toBe(Math.round(5 * 5_000 * 1.2));
    expect(g().storage.tra).toBe(9);
    expect(g().brewQuanHand()).toBe(true);
    expect(g().brewQuanHand()).toBe(true);
    expect(g().brewQuanHand()).toBe(false);
    useGame.setState({ day: g().day + 1 });
    expect(g().brewQuanHand()).toBe(true);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });
  it('không đủ nguyên liệu: không pha', () => {
    useGame.setState({ storage: {} });
    expect(useGame.getState().brewQuanHand()).toBe(false);
  });
});

describe('upgradeQuanTier (GĐ428 quầy → quán → cà phê)', () => {
  it('nâng bậc theo cấp + tiền, khách tăng, save giữ bậc', async () => {
    const { quanTierMul } = await import('../data/quanNuoc');
    const d = newGameData();
    const msgs: string[] = [];
    useGame.setState({ ...d, level: 33, money: 100_000_000, notify: (m: string) => { msgs.push(m); }, biz: { ...d.biz, quanNuoc: { ...d.biz.quanNuoc, open: true } } });
    const g = useGame.getState;
    const before = quanNuocProjection(g().biz.quanNuoc, 33, 999).customers;
    expect(g().upgradeQuanTier()).toBe(true);
    expect(g().money).toBe(85_000_000);
    expect(g().upgradeQuanTier()).toBe(false); // cà phê cần cấp 38
    expect(quanNuocProjection(g().biz.quanNuoc, 33, 999).customers).toBeGreaterThan(before);
    expect(quanTierMul({})).toBe(1);
    const save = snapshot();
    useGame.setState({ ...newGameData() });
    applySnapshot(save);
    expect(g().biz.quanNuoc.tier).toBe(1);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(90);
  });
});

describe('quanHandMax (GĐ433)', () => {
  it('quầy 3, quán 4, cà phê 5 mẻ', async () => {
    const { quanHandMax, quanHandLeft } = await import('../data/quanNuoc');
    const q = { open: true, staff: 0, price: 'vua' as const };
    expect([0, 1, 2].map((tier) => quanHandMax({ ...q, tier }))).toEqual([3, 4, 5]);
    expect(quanHandLeft({ ...q, tier: 2, hand: { day: 4, n: 2 } }, 4)).toBe(3);
  });
});

describe('brewQuanHand xoay vòng món (GĐ436)', () => {
  it('mẻ 1 trà đá, mẻ 2 nước mía, mẻ 3 lại trà đá', () => {
    const d = newGameData();
    useGame.setState({ ...d, level: 33, storage: full(10), storageLots: {}, notify: () => {},
      biz: { ...d.biz, quanNuoc: { ...d.biz.quanNuoc, open: true, menu: ['tra_da', 'nuoc_mia'] } } });
    const g = useGame.getState;
    g().brewQuanHand();
    expect(g().storage.tra).toBe(9);
    g().brewQuanHand();
    expect(g().storage.mia).toBe(8);
    g().brewQuanHand();
    expect(g().storage.tra).toBe(8);
  });
});

describe('GĐ449: quán cà phê thêm 1 ô thực đơn', () => {
  it('bậc 0/1 có 4 ô, bậc 2 có 5 ô; cleanMenu cắt theo ô', async () => {
    const { quanMenuSlots } = await import('../data/quanNuoc');
    const { cleanMenu, QUAN_RECIPES } = await import('../data/quanRecipes');
    expect(quanMenuSlots({ tier: 0 })).toBe(4);
    expect(quanMenuSlots({ tier: 1 })).toBe(4);
    expect(quanMenuSlots({ tier: 2 })).toBe(5);
    const ids = QUAN_RECIPES.map((r) => r.id);
    expect(cleanMenu(ids, 99).length).toBe(Math.min(4, ids.length));
    expect(cleanMenu(ids, 99, 5).length).toBe(Math.min(5, ids.length));
  });
});

describe('GĐ455: Sinh tố xoài', () => {
  it('mở cấp 39, nguyên liệu là sản phẩm có thật', async () => {
    const { quanRecipeById } = await import('../data/quanRecipes');
    const { productById } = await import('../data/products');
    const r = quanRecipeById('sinh_to_xoai')!;
    expect(r.unlock).toBe(39);
    for (const u of r.uses) expect(productById(u.id)).toBeTruthy();
  });
});

describe('GĐ474: cà phê muối', () => {
  it('mở cấp 40, pha từ cà phê + sữa đặc + muối + đá, lời hơn vốn', async () => {
    const { quanRecipeById, quanRecipesAt, recipeCupCost } = await import('../data/quanRecipes');
    const r = quanRecipeById('ca_phe_muoi')!;
    expect(r.uses.map((u) => u.id)).toContain('x_muoi');
    expect(quanRecipesAt(39).some((x) => x.id === 'ca_phe_muoi')).toBe(false);
    expect(quanRecipesAt(40).some((x) => x.id === 'ca_phe_muoi')).toBe(true);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});

describe('GĐ475: trà gừng nóng', () => {
  it('mở cấp 36, không cần đá, lời hơn vốn', async () => {
    const { quanRecipeById, quanRecipesAt, recipeCupCost } = await import('../data/quanRecipes');
    const r = quanRecipeById('tra_gung')!;
    expect(r.uses.map((u) => u.id)).toEqual(['tra', 'x_gung', 'x_duong']);
    expect(quanRecipesAt(35).some((x) => x.id === 'tra_gung')).toBe(false);
    expect(quanRecipesAt(36).some((x) => x.id === 'tra_gung')).toBe(true);
    expect(r.price).toBeGreaterThan(recipeCupCost(r) * 2);
  });
});
