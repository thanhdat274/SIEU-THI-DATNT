import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { setSimSeed } from '../core/rand';
import { CustomerManager } from '../agents/customers';
import {
  CRITIC_CHANCE, CRITIC_HARD_UNLOCK, CRITIC_PENALTY_REVIEWS, CRITIC_REWARD_HARD, CRITIC_REWARD_SOFT,
  CRITIC_SOFT_LAG, CRITIC_UNLOCK, CRITIC_WINDOW_MINUTES, criticReward, pickCriticDish, criticCallText, criticCookFits,
} from '../data/critic';
import { RECIPES } from '../data/recipes';
import { productById } from '../data/products';

describe('critic — dữ liệu & chọn món (GĐ1498)', () => {
  it('hằng số: mở cấp 37 (T3-L4 chờ khu ăn chạy vài cấp), nghiêm ngặt cấp 45, thưởng mềm 200k / lớn 500k, phạt 3 đánh giá 1★', () => {
    expect(CRITIC_UNLOCK).toBe(37);
    expect(CRITIC_HARD_UNLOCK).toBe(45);
    expect(CRITIC_CHANCE).toBe(0.5);
    expect(CRITIC_WINDOW_MINUTES).toBe(30);
    expect(criticReward(false)).toBe(CRITIC_REWARD_SOFT);
    expect(criticReward(true)).toBe(CRITIC_REWARD_HARD);
    expect(CRITIC_PENALTY_REVIEWS).toBe(3);
  });

  it('GĐ1604: nhẹ gọi món mở từ ≥10 cấp; nghiêm ngặt gọi mọi món đã mở, KHÔNG BAO GIỜ món khóa', () => {
    const level = 50;
    let sawRecent = false;
    for (let s = 1; s <= 300; s++) {
      setSimSeed(s);
      // một món có thể có nhiều công thức → lấy công thức mở sớm nhất
      const minU = (id: string) => Math.min(...RECIPES.filter((r) => r.outputId === id).map((r) => r.unlock));
      expect(minU(pickCriticDish(RECIPES, level, false))).toBeLessThanOrEqual(level - CRITIC_SOFT_LAG);
      const hardU = minU(pickCriticDish(RECIPES, level, true));
      expect(hardU).toBeLessThanOrEqual(level);
      if (hardU > level - CRITIC_SOFT_LAG) sawRecent = true;
    }
    expect(sawRecent).toBe(true); // nghiêm ngặt có gọi cả món mới mở
    // cấp thấp hơn mọi món đủ lâu → nhẹ lùi về mọi món đã mở
    const minUnlock = Math.min(...RECIPES.map((r) => r.unlock));
    setSimSeed(3);
    const fb = RECIPES.find((r) => r.outputId === pickCriticDish(RECIPES, minUnlock, false))!;
    expect(fb.unlock).toBeLessThanOrEqual(minUnlock);
    setSimSeed(1);
  });
});

describe('GĐ1605 — nhà phê bình chỉ gọi món nấu được bằng trạm đang có', () => {
  it('lọc canCook theo trạm; không có trạm nào khớp thì lùi về mọi món đã mở', () => {
    const station = RECIPES[0].station;
    for (let s = 1; s <= 100; s++) {
      setSimSeed(s);
      const id = pickCriticDish(RECIPES, 100, true, (r) => r.station === station);
      expect(RECIPES.some((r) => r.outputId === id && r.station === station)).toBe(true);
    }
    setSimSeed(2);
    const id = pickCriticDish(RECIPES, 100, true, () => false);
    expect(RECIPES.some((r) => r.outputId === id && r.unlock <= 100)).toBe(true);
    setSimSeed(1);
  });
});

describe('GĐ1606 — câu gọi món kèm tên bếp', () => {
  it('có bếp thì ghi trong ngoặc, không có thì giữ câu cũ', () => {
    expect(criticCallText('Xôi gấc', 'Bếp xôi', 30)).toBe('🎩 Nhà phê bình gọi Xôi gấc (Bếp xôi) — phục vụ trong 30 phút!');
    expect(criticCallText('Xôi gấc', null, 30)).toBe('🎩 Nhà phê bình gọi Xôi gấc — phục vụ trong 30 phút!');
  });
});

describe('GĐ1608 — chỉ gọi món nấu kịp trong khung chờ', () => {
  it('món ≤25 phút được gọi, món 30 phút thì không', () => {
    expect(criticCookFits(25)).toBe(true);
    expect(criticCookFits(30)).toBe(false);
    for (let s = 1; s <= 100; s++) {
      setSimSeed(s);
      const id = pickCriticDish(RECIPES, 100, true, (r) => criticCookFits(r.durationMin));
      expect(RECIPES.some((r) => r.outputId === id && criticCookFits(r.durationMin))).toBe(true);
    }
    setSimSeed(1);
  });
});

describe('updateCritic — vòng đời nhà phê bình qua CustomerManager (GĐ1498)', () => {
  const manager = new CustomerManager({} as never, {} as never, {} as never) as unknown as {
    updateCritic: (s: ReturnType<typeof useGame.getState>) => void;
    criticProduct: string | null;
    criticUntil: number;
    criticHard: boolean;
    criticRolledDay: number;
    criticAt: number | null | undefined;
  };

  /** Quét seed: thử từng seed, gọi updateCritic tới khi nhà phê bình ghé trong ngày `day`. */
  const fireWithSomeSeed = (day: number, level: number): boolean => {
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      // Xoá trạng thái ngày của manager để seed mới được roll lại từ đầu
      manager.criticRolledDay = -1;
      manager.criticAt = undefined;
      manager.criticProduct = null;
      useGame.setState({ day, level, minutes: 9 * 60, shopOpen: true });
      manager.updateCritic(useGame.getState());
      if (manager.criticProduct) return true;
    }
    return false;
  };

  beforeEach(() => {
    useGame.setState(newGameData());
    manager.criticProduct = null;
  });

  it('ghé trong ngày: đặt món hẹn + khung 30 phút; bày món lên kệ thì thưởng vào két', () => {
    expect(fireWithSomeSeed(3, CRITIC_HARD_UNLOCK)).toBe(true);
    expect(manager.criticHard).toBe(true);
    expect(manager.criticUntil).toBe(9 * 60 + CRITIC_WINDOW_MINUTES);
    const dish = manager.criticProduct!;
    expect(productById(dish)).toBeTruthy();
    const money0 = useGame.getState().money;
    // Nấu xong bày món lên kệ: phục vụ ngay trong khung → thưởng lớn
    useGame.setState({
      furniture: [{ uid: 9, type: 'produce', x: 0, z: 0, rot: 0, tiers: [{ productId: dish, count: 3 }] }] as never,
    });
    manager.updateCritic(useGame.getState());
    const s1 = useGame.getState();
    expect(s1.money).toBe(money0 + CRITIC_REWARD_HARD);
    expect(s1.totals.revenue).toBe(useGame.getState().totals.revenue);
    expect(manager.criticProduct).toBeNull();
  });

  it('hết khung không phục vụ (nghiêm ngặt): ăn 3 đánh giá 1★', () => {
    expect(fireWithSomeSeed(4, CRITIC_HARD_UNLOCK)).toBe(true);
    useGame.setState({ minutes: 9 * 60 + CRITIC_WINDOW_MINUTES + 1 });
    manager.updateCritic(useGame.getState());
    const s1 = useGame.getState();
    const tail = s1.reviews.slice(-CRITIC_PENALTY_REVIEWS);
    expect(tail).toHaveLength(CRITIC_PENALTY_REVIEWS);
    for (const r of tail) {
      expect(r.stars).toBe(1);
      expect(r.reason).toBe('stock');
    }
    expect(manager.criticProduct).toBeNull();
  });

  it('dưới CRITIC_UNLOCK thì không bao giờ ghé', () => {
    for (let s = 1; s <= 30; s++) {
      setSimSeed(s);
      useGame.setState({ day: 2, level: CRITIC_UNLOCK - 1, minutes: 12 * 60 });
      manager.updateCritic(useGame.getState());
      expect(manager.criticProduct).toBeNull();
    }
  });

  it('giai đoạn nhẹ (cấp < 45): hụt hẹn không bị phạt đánh giá', () => {
    expect(fireWithSomeSeed(5, CRITIC_HARD_UNLOCK - 1)).toBe(true);
    expect(manager.criticHard).toBe(false);
    const reviews0 = useGame.getState().reviews.length;
    useGame.setState({ minutes: 9 * 60 + CRITIC_WINDOW_MINUTES + 1 });
    manager.updateCritic(useGame.getState());
    // Hết khung giai đoạn nhẹ: chỉ nhắc — không thêm đánh giá xấu
    expect(useGame.getState().reviews.length).toBe(reviews0);
  });
});
