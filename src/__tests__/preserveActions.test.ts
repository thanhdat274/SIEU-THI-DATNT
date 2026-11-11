import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { endDay } from '../core/slices/endDay';
import { preserveDefById, preserveDefsOf, PHOI_UNLOCK, rackCap } from '../data/preserve';
import { productById } from '../data/products';

/**
 * GĐ Hệ1-L2 (SPEC-CHIEU-SAU §1) — Sân phơi `gian_phoi` + action + tab GardenPanel + nối endDay:
 *  "Phơi được một mẻ TRỌN VÒNG ở chơi đơn".
 *  Đặt mẻ (startPreserve) → qua 2 đêm nắng tất định (preserveNight trong endDay) → gỡ xuống (collectPreserve)
 *  ra thành phẩm vào kho (+ nhãn nhà trồng nếu toàn nhà trồng). Không đổi kinh tế/seed, golden 30 vẫn nguyên.
 */

const g = () => useGame.getState();
const btm = () => preserveDefById('ps_banh_trang'); // 2 nắng, cần 3 bánh tráng

beforeEach(() => {
  const d = newGameData();
  useGame.setState({
    ...d,
    level: PHOI_UNLOCK,
    money: 1_000_000_000,
    day: 40,
    weather: 'sunny',
    forecast: ['sunny', 'sunny', 'sunny', 'sunny'],
    storage: { banhtrang: 9, hai_san: 4, muc_ong_tuoi: 2 },
    garden: { ...d.garden, buildings: { gian_phoi: 1 }, homegrown: { banhtrang: 3 } },
    notify: () => {},
  });
});

/** Một đêm trời nắng đẹp (giàn để ngoài) — chạy endDay rồi trả về ngày mới. */
const passSunny = () => {
  useGame.setState({ weather: 'sunny', forecast: ['sunny', 'sunny', 'sunny', 'sunny'] });
  endDay(useGame.setState, useGame.getState);
};

describe('Sân phơi gian_phoi + action Hệ 1', () => {
  it('chưa xây gian_phoi: không phơi được', () => {
    useGame.setState({ garden: { ...g().garden, buildings: {} } });
    g().startPreserve('ps_banh_trang');
    expect(g().garden.preserveJobs).toHaveLength(0);
    expect(g().storage.banhtrang).toBe(9);
  });

  it('startPreserve: tiêu nguyên liệu, thêm mẻ lên giàn, ghi nhãn toàn nhà trồng', () => {
    g().startPreserve('ps_banh_trang');
    expect(g().garden.preserveJobs).toHaveLength(1);
    expect(g().storage.banhtrang).toBe(6);
    const job = g().garden.preserveJobs[0];
    expect(job.defId).toBe('ps_banh_trang');
    expect(job.sun).toBe(0);
    expect(job.allHomegrown).toBe(true);
  });

  it('giàn 1★ chứa đúng 2 nong: mẻ thứ 3 bị chặn (rackCap)', () => {
    g().startPreserve('ps_banh_trang'); // banhtrang 9→6
    g().startPreserve('ps_banh_trang'); // 6→3
    expect(g().garden.preserveJobs).toHaveLength(2);
    expect(rackCap(1)).toBe(2);
    g().startPreserve('ps_banh_trang'); // hết nong — chặn, không trừ thêm
    expect(g().garden.preserveJobs).toHaveLength(2);
    expect(g().storage.banhtrang).toBe(3);
  });

  it('setRackCovered: cất/mang giàn — ghi rackLog + cập nhật cờ covered mọi mẻ phơi', () => {
    g().startPreserve('ps_banh_trang');
    g().setRackCovered(true);
    expect(g().garden.rackLog.day).toBe(40);
    expect(g().garden.rackLog.out).toEqual([]);
    expect(g().garden.preserveJobs[0].covered).toBe(true);
    g().setRackCovered(false);
    expect(g().garden.rackLog.out).toEqual([[0, 1440]]);
    expect(g().garden.preserveJobs[0].covered).toBe(false);
  });

  it('buyRackTarp: mua một lần, không trừ tiền lần hai', () => {
    const before = g().money;
    g().buyRackTarp();
    expect(g().garden.rackTarp).toBe(true);
    expect(g().money).toBe(before - 2_500_000);
    g().buyRackTarp();
    expect(g().money).toBe(before - 2_500_000);
  });
});

describe('mẻ trọn vòng (start → 2 đêm nắng → collect)', () => {
  it('bánh tráng cần 2 nắng: 2 đêm nắng để giàn ngoài là đủ, gỡ ra thành phẩm + nhãn nhà trồng', () => {
    g().startPreserve('ps_banh_trang');
    passSunny(); // đêm thứ nhất
    expect(g().garden.preserveJobs[0].sun).toBe(1);
    passSunny(); // đêm thứ hai
    expect(g().garden.preserveJobs[0].sun).toBe(2);

    // chưa đủ thì không gỡ — nhưng giờ đã đủ 2/2
    const beforeStock = g().storage[btm().outputId] ?? 0;
    g().collectPreserve(g().garden.preserveJobs[0].id);
    expect(g().garden.preserveJobs).toHaveLength(0);
    expect(g().storage[btm().outputId]).toBe(beforeStock + btm().outputQty);
    // toàn nhà trồng → thành phẩm mang nhãn nhà trồng (bán giá hơn)
    expect(g().garden.homegrown[btm().outputId]).toBe(btm().outputQty);
  });

  it('collect trước đủ nắng: chặn, mẻ còn nguyên trên giàn', () => {
    g().startPreserve('ps_banh_trang');
    passSunny(); // 1/2 nắng
    const id = g().garden.preserveJobs[0].id;
    g().collectPreserve(id);
    expect(g().garden.preserveJobs).toHaveLength(1);
    expect(g().garden.preserveJobs[0].id).toBe(id);
  });

  it('mẻ không phải toàn nhà trồng: thu không mang nhãn', () => {
    useGame.setState({ garden: { ...g().garden, homegrown: {} } });
    g().startPreserve('ps_banh_trang');
    expect(g().garden.preserveJobs[0].allHomegrown).toBe(false);
    passSunny();
    passSunny();
    g().collectPreserve(g().garden.preserveJobs[0].id);
    expect(g().garden.homegrown[btm().outputId]).toBeUndefined();
  });

  it('danh mục phơi đều có outputId là sản phẩm thật đã có (homemade)', () => {
    for (const d of preserveDefsOf('phoi')) {
      const p = productById(d.outputId);
      expect(p).toBeTruthy();
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});

describe('Hệ 1 L4 — phụ trại tự cất/thu sân phơi qua endDay', () => {
  it('có phụ trại: mẻ đủ nắng được nó thu về kho (nhãn nhà trồng), mẻ dở cất theo trời mai', () => {
    useGame.setState({
      day: 40, weather: 'sunny', forecast: ['sunny', 'sunny', 'sunny', 'sunny'],
      staff: [{ id: 1, name: 'Bé Tư', role: 'farmhand', skill: 1, wage: 0, shift: 'full' } as never],
      garden: { ...g().garden, buildings: { gian_phoi: 1 }, homegrown: { banhtrang: 3 },
        preserveJobs: [
          { id: 101, defId: 'ps_banh_trang', startDay: 40, sun: 2, covered: false, wet: 0, allHomegrown: true },
          { id: 102, defId: 'ps_banh_trang', startDay: 40, sun: 1, covered: false, wet: 0, allHomegrown: false },
        ] },
    });
    endDay(useGame.setState, useGame.getState);
    const after = g();
    // mẻ 101 (đủ 2 nắng) bị thu về kho + nhãn nhà trồng
    expect(after.storage['hx_banh_trang']).toBeGreaterThanOrEqual(btm().outputQty);
    expect(after.garden.homegrown['hx_banh_trang'] ?? 0).toBeGreaterThanOrEqual(btm().outputQty);
    // mẻ 102 (dở) còn lại trên giàn — với phụ trại thì nó CẤT theo trời mai, không để mặc định ngoài
    const remain = after.garden.preserveJobs.find((j) => j.id === 102);
    expect(remain).toBeTruthy();
    // rackLog do phụ trại đặt cho NGÀY MAI (day 41), không phải reset mặc định lộn xộn
    expect(after.garden.rackLog.day).toBe(41);
  });
});

