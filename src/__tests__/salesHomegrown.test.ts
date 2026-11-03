import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { HOMEGROWN_PREMIUM, newGarden } from '../data/garden';
import { productById } from '../data/products';

/**
 * Bộ test GĐ1029 — riêng lẻ "món nhà trồng/nhà nuôi" còn trong kho: khách trả thêm
 * HOMEGROWN_PREMIUM (20%) khi mua (core/slices/sales.checkout dòng 58–68).
 *
 * Hợp đồng (đối chiếu data/garden.HOMEGROWN_PREMIUM = 0.2 + sales.checkout):
 * - Món bán ra có trong garden.homegrown (số món >0) → doanh thu + giá × 0.2 (làm tròn tới trăm),
 *   và trừ 1 món khỏi kho nhà trồng.
 * - Trừ đến hết (0 món) thì XOÁ key khỏi map homegrown.
 * - Món thường (không có trong homegrown) không cộng phí, không đụng kho nhà trồng.
 * - Nhiều món nhà trồng trong một lượt tính → phí premium cộng gộp từng món.
 */

const round100 = (v: number) => Math.round(v / 100) * 100;

const prep = (homegrown: Record<string, number>, money = 1_000_000) =>
  useGame.setState({
    ...newGameData(),
    money,
    garden: { ...newGarden(), homegrown },
  });

const mi = () => productById('mi');
const botmi = () => productById('botmi');

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('checkout — món nhà trồng bán premium', () => {
  it('món nhà trồng → +20% doanh thu, trừ 1 món khỏi kho', () => {
    prep({ mi: 2 });
    const before = useGame.getState().money;
    useGame.getState().checkout([{ id: 'mi', price: mi().sell }], 0, 0, 'cash');
    const a = useGame.getState();
    const premium = round100(mi().sell * HOMEGROWN_PREMIUM);
    expect(premium).toBe(1000); // 5000 × 0.2
    expect(a.money).toBe(before + mi().sell + premium);
    expect(a.garden.homegrown.mi).toBe(1);
  });

  it('bán hết món nhà trồng cuối cùng → XOÁ key khỏi kho', () => {
    prep({ mi: 1 });
    useGame.getState().checkout([{ id: 'mi', price: mi().sell }], 0, 0, 'cash');
    const a = useGame.getState();
    expect(a.garden.homegrown.mi).toBeUndefined();
    expect('mi' in a.garden.homegrown).toBe(false);
  });

  it('món thường không có trong kho nhà trồng → không phí, kho không đổi', () => {
    prep({ botmi: 3 });
    const before = useGame.getState().money;
    useGame.getState().checkout([{ id: 'mi', price: mi().sell }], 0, 0, 'cash');
    const a = useGame.getState();
    expect(a.money).toBe(before + mi().sell); // không premium
    expect(a.garden.homegrown.botmi).toBe(3); // kho món khác vẫn nguyên
  });

  it('nhiều món nhà trồng trong một lượt → premium cộng gộp từng món', () => {
    prep({ mi: 1, botmi: 1 });
    const before = useGame.getState().money;
    useGame.getState().checkout(
      [{ id: 'mi', price: mi().sell }, { id: 'botmi', price: botmi().sell }],
      0, 0, 'cash',
    );
    const a = useGame.getState();
    const premium = round100(mi().sell * HOMEGROWN_PREMIUM) + round100(botmi().sell * HOMEGROWN_PREMIUM);
    const total = mi().sell + botmi().sell;
    expect(a.money).toBe(before + total + premium);
    expect(a.garden.homegrown.mi).toBeUndefined();
    expect(a.garden.homegrown.botmi).toBeUndefined();
  });

  it('giá lẻ → premium làm tròn tới hàng trăm', () => {
    prep({ mi: 1 });
    const before = useGame.getState().money;
    const oddPrice = 12_345; // 12345 × 0.2 = 2469 → làm tròn 2500
    useGame.getState().checkout([{ id: 'mi', price: oddPrice }], 0, 0, 'cash');
    const a = useGame.getState();
    const premium = round100(oddPrice * HOMEGROWN_PREMIUM);
    expect(premium).toBe(2500);
    expect(a.money).toBe(before + oddPrice + premium);
  });
});
