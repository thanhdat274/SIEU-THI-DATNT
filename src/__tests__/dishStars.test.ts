import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import {
  DISH_STAR_BONUS, DISH_STAR_STEPS, dishPriceMul, dishStarGoalOf, dishStars, dishVessel, DRINK_VESSELS, FOOD_VESSELS,
} from '../data/dishStars';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { productById } from '../data/products';

const COOKED = [...COOKED_PRODUCT_IDS];
/** Món nấu thuộc nhóm đồ uống (thang cốc) và món ăn (thang bát). */
const drinkDish = COOKED.find((id) => productById(id).category === 'drink')!;
const foodDish = COOKED.find((id) => productById(id).category !== 'drink')!;

describe('dishStars — sao món theo lượt bán (GĐ1496)', () => {
  it('mốc sao rút ngắn 20/100/800, thưởng giá +10/+25/+60%', () => {
    expect([...DISH_STAR_STEPS]).toEqual([20, 100, 800]);
    expect([...DISH_STAR_BONUS]).toEqual([0.1, 0.25, 0.6]);
    expect(dishStars(0)).toBe(0);
    expect(dishStars(19)).toBe(0);
    expect(dishStars(20)).toBe(1);
    expect(dishStars(99)).toBe(1);
    expect(dishStars(100)).toBe(2);
    expect(dishStars(799)).toBe(2);
    expect(dishStars(800)).toBe(3);
    expect(dishPriceMul(0)).toBe(1);
    expect(dishPriceMul(19)).toBe(1);
    expect(dishPriceMul(20)).toBeCloseTo(1.1);
    expect(dishPriceMul(100)).toBeCloseTo(1.25);
    expect(dishPriceMul(800)).toBeCloseTo(1.6);
  });

  it('đồ đựng đổi bậc theo sao: món ăn túi nilon → lá chuối → bát sành → men lam; đồ uống thang cốc', () => {
    expect([...FOOD_VESSELS]).toEqual(['Túi nilon', 'Lá chuối', 'Bát sành', 'Men lam']);
    expect([...DRINK_VESSELS]).toEqual(['Cốc giấy', 'Cốc gốm', 'Cốc sứ', 'Ly thủy tinh']);
    expect(dishVessel(foodDish, 0)).toBe('Túi nilon');
    expect(dishVessel(foodDish, 20)).toBe('Lá chuối');
    expect(dishVessel(foodDish, 100)).toBe('Bát sành');
    expect(dishVessel(foodDish, 800)).toBe('Men lam');
    expect(dishVessel(drinkDish, 0)).toBe('Cốc giấy');
    expect(dishVessel(drinkDish, 800)).toBe('Ly thủy tinh');
  });

  it('dishStarGoalOf: mục tiêu ngắn còn N lượt + đồ đựng kế; chạm 3★ thì hết mục tiêu', () => {
    const g0 = dishStarGoalOf(foodDish, 7);
    expect(g0.stars).toBe(0);
    expect(g0.nextAt).toBe(20);
    expect(g0.toGo).toBe(13);
    expect(g0.nextVessel).toBe('Lá chuối');
    expect(g0.bonus).toBe(0);
    const g2 = dishStarGoalOf(foodDish, 150);
    expect(g2.stars).toBe(2);
    expect(g2.toGo).toBe(650);
    expect(g2.bonus).toBe(25);
    const g3 = dishStarGoalOf(foodDish, 1000);
    expect(g3.stars).toBe(3);
    expect(g3.nextAt).toBeNull();
    expect(g3.toGo).toBeNull();
    expect(g3.nextVessel).toBeNull();
  });
});

describe('servedCounts + thưởng giá theo sao qua checkout (GĐ1496)', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
  });

  it('mỗi lượt bán món nấu cộng servedCounts; lượt đầu chưa có thưởng', () => {
    const s = useGame.getState();
    const money0 = s.money;
    s.checkout([{ id: foodDish, price: 20_000 }]);
    const s1 = useGame.getState();
    expect(s1.servedCounts[foodDish]).toBe(1);
    // Sao tính từ lượt bán TRƯỚC — lượt đầu chưa lên sao nên không có thưởng
    expect(s1.money).toBe(money0 + 20_000);
  });

  it('đủ 20 lượt (1★) thì lượt bán kế được +10% giá món nấu', () => {
    const id = foodDish;
    for (let i = 0; i < 20; i++) useGame.getState().checkout([{ id, price: 20_000 }]);
    expect(useGame.getState().servedCounts[id]).toBe(20);
    const s0 = useGame.getState();
    useGame.getState().checkout([{ id, price: 20_000 }]);
    const s1 = useGame.getState();
    expect(s1.servedCounts[id]).toBe(21);
    // thưởng +10% của 20.000 = 2.000 (đã làm tròn chẵn trăm)
    expect(s1.money).toBe(s0.money + 22_000);
    expect(s1.stats.revenue).toBe(s0.stats.revenue + 22_000);
  });

  it('hàng thường (không phải món nấu) không cộng servedCounts, không thưởng', () => {
    useGame.getState().checkout([{ id: 'nuoc', price: 10_000 }]);
    const s = useGame.getState();
    expect(Object.keys(s.servedCounts)).toHaveLength(0);
  });
});
