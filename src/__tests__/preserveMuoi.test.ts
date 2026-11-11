import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import {
  pickleAge, pickleState, preserveNight, PRESERVE_DEFS, VAI_CAPACITY, vaiCap, preserveDefById,
  type PreserveJob,
} from '../data/preserve';
import { productById } from '../data/products';
import { newGameData } from '../core/store';

// Hệ 1 L5 (SPEC §1.5/§1.6) — VẠI MUỐI.
// Không phụ thuộc thời tiết rủi ro, phụ thuộc THỜI ĐIỂM VỚT: trước window → hăng (không vớt);
// window[0]..window[0]+1 → NGON (toàn lô nhãn nhà trồng +20%); giữa chuỗi còn lại → Đạt;
// sau window[1] tối đa 2 ngày → Khú (×0,6); sau đó → Hỏng đổ bỏ. Nắng nóng làm chua nhanh (heat +0,25/ngày nắng).
// R1: mọi mẻ mở ≥ 38 > golden 30 → golden L30 vẫn vô can.

const job = (defId: string, startDay = 10, heat = 0): PreserveJob =>
  ({ id: 1, defId, startDay, sun: 0, covered: false, wet: 0, allHomegrown: false, heat });

describe('Hệ1-L5 — vại muối: cửa sổ vớt (pickleState)', () => {
  const def = preserveDefById('ps_dua_muoi'); // window [2,4]

  it('trước window → hăng, không vớt được', () => {
    expect(pickleState(job('ps_dua_muoi'), def, 11)).toBe('haran'); // ngày 1
  });

  it('window[0] và window[0]+1 → NGON', () => {
    expect(pickleState(job('ps_dua_muoi'), def, 12)).toBe('ngon'); // ngày 2
    expect(pickleState(job('ps_dua_muoi'), def, 13)).toBe('ngon'); // ngày 3
  });

  it('giữa cửa sổ còn lại → Đạt', () => {
    expect(pickleState(job('ps_dua_muoi'), def, 14)).toBe('dat'); // ngày 4
  });

  it('sau window[1] tối đa 2 ngày → Khú', () => {
    expect(pickleState(job('ps_dua_muoi'), def, 15)).toBe('kem'); // ngày 5
    expect(pickleState(job('ps_dua_muoi'), def, 16)).toBe('kem'); // ngày 6
  });

  it('sau đó nữa → Hỏng, đổ bỏ', () => {
    expect(pickleState(job('ps_dua_muoi'), def, 17)).toBe('hong'); // ngày 7
  });

  it('nắng nóng làm chua nhanh: 2 ngày nắng đẩy sớm 0,5 ngày (heat)', () => {
    // startDay 10, đến ngày 11 = 1 ngày lịch nhưng heat 0,5 → tuổi 1,5 → vẫn hằng
    expect(pickleAge(job('ps_dua_muoi', 10, 0.5), 11)).toBeCloseTo(1.5);
    // heat 1,0 → tuổi 2 → vào NGON sớm một ngày
    expect(pickleState(job('ps_dua_muoi', 10, 1), def, 12)).toBe('ngon');
  });
});

describe('Hệ1-L5 — preserveNight cộng heat cho mẻ muối theo thời tiết', () => {
  it('ngày Nắng đẹp cộng 0,25; ngày khác không; phơi vẫn nhận nắng như cũ', () => {
    const jobs: PreserveJob[] = [job('ps_dua_muoi', 10, 0), { ...job('ps_banh_trang', 10), sun: 1 }];
    const sunny = preserveNight(jobs.slice(), [[0, 1440]], { day: 11, weather: 'sunny', seed: 1 });
    expect(sunny.jobs[0].heat).toBeCloseTo(0.25);
    expect(sunny.jobs[1].sun).toBe(2.0); // mẻ phơi vẫn tiến
    const cloudy = preserveNight(jobs.slice(), [[0, 1440]], { day: 11, weather: 'cloudy', seed: 1 });
    expect(cloudy.jobs[0].heat).toBe(0);
  });
});

describe('Hệ1-L5 — danh mục vại muối (6 mẻ thật)', () => {
  it('đúng 6 mẻ muối, mở ≥ 38 (trên golden), window hợp lệ, toàn nguyên liệu có id', () => {
    const muoi = PRESERVE_DEFS.filter((d) => d.kind === 'muoi');
    expect(muoi).toHaveLength(6);
    expect(muoi.map((d) => d.id).sort()).toEqual(
      ['ps_ca_phao', 'ps_chanh_muoi', 'ps_cu_kieu', 'ps_dua_cai', 'ps_dua_hanh', 'ps_dua_muoi'].sort(),
    );
    // 6 thành phẩm đều là món muối có sẵn trong homemade.ts
    expect(muoi.map((d) => d.outputId).sort()).toEqual(
      ['hx_ca_phao', 'hx_chanh_muoi', 'hx_cu_kieu', 'hx_dua_cai', 'hx_dua_hanh', 'hx_dua_muoi'].sort(),
    );
    for (const d of muoi) {
      expect(d.unlock).toBeGreaterThanOrEqual(38); // R1: không đụng golden 30
      expect(d.window).toBeDefined();
      expect(d.window![0]).toBeLessThanOrEqual(d.window![1]);
      expect(d.inputs.length).toBeGreaterThan(0);
      expect(productById(d.outputId).category).toBeTruthy();
    }
  });

  it('về 0 → sức chứa vại 2/4/6 theo sao (SPEC §1.3)', () => {
    expect(vaiCap(0)).toBe(0);
    expect(VAI_CAPACITY).toEqual({ 1: 2, 2: 4, 3: 6 });
    expect(vaiCap(2)).toBe(4);
  });
});

describe('Hệ1-L5 — store: startPreserve + collectPreserve qua vại', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('chưa xây Dãy vại → không ngâm được', () => {
    useGame.setState({ level: 60, storage: { ...useGame.getState().storage, x_rau_cai: 5, x_muoi: 5 } } as never);
    useGame.getState().startPreserve('ps_dua_muoi');
    expect(useGame.getState().garden.preserveJobs).toHaveLength(0);
  });

  it('xây vại rồi ngâm được; đủ sức chứa thì chặn thêm (R7)', () => {
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      money: 100_000_000,
      storage: { ...s0.storage, x_rau_cai: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, vai_muoi: 1 } },
    } as never);
    const s1 = useGame.getState();
    s1.startPreserve('ps_dua_muoi');
    useGame.getState().startPreserve('ps_dua_muoi');
    useGame.getState().startPreserve('ps_dua_muoi'); // vại 1★ = 2 → cái này bị chặn
    expect(useGame.getState().garden.preserveJobs).toHaveLength(2);
  });

  it('vớt NGON trong cửa sổ → đủ sản lượng + mang nhãn nhà trồng', () => {
    const s0 = useGame.getState();
    useGame.setState({
      day: 30, level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_rau_cai: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, vai_muoi: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_dua_muoi'); // startDay 30, window [2,4]
    useGame.setState({ day: 33 } as never); // ngày 3 → NGON
    const g = useGame.getState();
    g.collectPreserve(g.garden.preserveJobs[0].id);
    const s = useGame.getState();
    expect(s.garden.preserveJobs).toHaveLength(0);
    expect(s.storage.hx_dua_muoi).toBe(4);
    expect(s.garden.homegrown.hx_dua_muoi).toBe(4); // NGON → toàn lô nhãn (+20%)
  });

  it('vớt Khú (sau cửa sổ) → sản lượng ×0,6, không nhãn', () => {
    const s0 = useGame.getState();
    useGame.setState({
      day: 30, level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_rau_cai: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, vai_muoi: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_dua_muoi');
    useGame.setState({ day: 36 } as never); // ngày 6 → Khú (window[1]=4 ⇒ 5-6 khú)
    const g = useGame.getState();
    g.collectPreserve(g.garden.preserveJobs[0].id);
    const s = useGame.getState();
    expect(s.garden.preserveJobs).toHaveLength(0);
    expect(s.storage.hx_dua_muoi).toBe(Math.round(4 * 0.6));
    expect(s.garden.homegrown.hx_dua_muoi ?? 0).toBe(0);
  });

  it('Hỏng → đổ bỏ, không cho sản lượng', () => {
    const s0 = useGame.getState();
    useGame.setState({
      day: 30, level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_rau_cai: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, vai_muoi: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_dua_muoi');
    useGame.setState({ day: 38 } as never); // ngày 8 → Hỏng
    const g = useGame.getState();
    g.collectPreserve(g.garden.preserveJobs[0].id);
    const s = useGame.getState();
    expect(s.garden.preserveJobs).toHaveLength(0);
    expect(s.storage.hx_dua_muoi ?? 0).toBe(0);
  });
});
