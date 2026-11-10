import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../core/store';
import {
  PRESERVE_DEFS, CHUM_CAPACITY, chumCap, CHUM_UNLOCK, preserveDefById, pickleAge, uRipe, uAged,
  type PreserveJob,
} from '../data/preserve';
import { productById } from '../data/products';
import { newGameData } from '../core/store';

// Hệ 1 L6 (SPEC §1.5/§1.6) — NHÀ CHUM Ủ.
// Chum KHÔNG hỏng theo thời gian (không có cửa sổ vớt như vại muối): đủ `need` ngày là rút được
// hàng thường; giữ tới mốc ủ LÂU (`aged.day`) thì rút ra CÙNG sản phẩm nhưng NHIỀU hơn (×~1,6),
// và cả lô mang nhãn nhà làm (+20%). Nắng nóng vẫn làm nhanh nhờ heat (dùng chung pickleAge).
// R1: mọi mẻ ủ mở ≥ 46 > golden 30 → golden L30 vô can.

const job = (defId: string, startDay = 10): PreserveJob =>
  ({ id: 1, defId, startDay, sun: 0, covered: false, wet: 0, allHomegrown: false, heat: 0 });

describe('Hệ1-L6 — chum ủ: mốc rút (uRipe / uAged)', () => {
  it('đủ need ngày → rút được hàng thường (uRipe)', () => {
    const def = preserveDefById('ps_mam_tep'); // need 10
    expect(uRipe(job('ps_mam_tep', 10), def, 19)).toBe(false); // ngày 9
    expect(uRipe(job('ps_mam_tep', 10), def, 20)).toBe(true); // ngày 10
  });

  it('ủ LÂU (aged.day) → uAged đúng; món không mốc lâu thì không bao giờ aged', () => {
    const nm = preserveDefById('ps_nuoc_mam'); // need 14, aged 28/5
    expect(uAged(job('ps_nuoc_mam', 10), nm, 37)).toBe(false); // ngày 27
    expect(uAged(job('ps_nuoc_mam', 10), nm, 38)).toBe(true); // ngày 28
    const tt = preserveDefById('ps_tom_chua'); // không có mốc lâu
    expect(uAged(job('ps_tom_chua', 10), tt, 100)).toBe(false);
  });

  it('nắng nóng (heat) đẩy nhanh mốc ủ — dùng chung pickleAge', () => {
    const def = preserveDefById('ps_nuoc_mam');
    const hot = { ...job('ps_nuoc_mam', 10), heat: 2 };
    expect(pickleAge(hot, 38)).toBe(30); // 28 lịch + 2 heat
    expect(uAged(hot, def, 38)).toBe(true);
  });

  it('chum không hỏng theo thời gian: dù giữ rất lâu vẫn rút được (không có trạng thái hư)', () => {
    const def = preserveDefById('ps_nuoc_mam');
    const long = job('ps_nuoc_mam', 10);
    expect(uRipe(long, def, 200)).toBe(true); // vẫn đủ, vì chum không có bước "hỏng"
    expect(uAged(long, def, 200)).toBe(true);
  });
});

describe('Hệ1-L6 — danh mục chum ủ (6 mẻ thật)', () => {
  it('đúng 6 mẻ ủ, mở ≥ 46 (trên golden), need hợp lệ, toàn nguyên liệu có id', () => {
    const u = PRESERVE_DEFS.filter((d) => d.kind === 'u');
    expect(u).toHaveLength(6);
    expect(u.map((d) => d.id).sort()).toEqual(
      ['ps_mam_tep', 'ps_toi_den', 'ps_tom_chua', 'ps_tuong_ban', 'ps_tuong_hot', 'ps_nuoc_mam'].sort(),
    );
    expect(u.map((d) => d.outputId).sort()).toEqual(
      ['hx_mam_tep', 'hx_toi_den', 'hx_tom_chua', 'hx_tuong_ban', 'hx_tuong_hot', 'hx_nuoc_mam'].sort(),
    );
    for (const d of u) {
      expect(d.unlock).toBeGreaterThanOrEqual(CHUM_UNLOCK);
      expect(d.need).toBeGreaterThan(0);
      expect(d.inputs.length).toBeGreaterThan(0);
      expect(productById(d.outputId).category).toBeTruthy();
      // mốc lâu (nếu có) phải xa hơn mốc rút thường
      if (d.aged) {
        expect(d.aged.day).toBeGreaterThan(d.need);
        expect(d.aged.outputQty).toBeGreaterThan(d.outputQty);
      }
    }
  });

  it('sức chứa chum 1/2/4 theo sao (SPEC §1.3)', () => {
    expect(chumCap(0)).toBe(0);
    expect(CHUM_CAPACITY).toEqual({ 1: 1, 2: 2, 3: 4 });
    expect(chumCap(3)).toBe(4);
  });
});

describe('Hệ1-L6 — store: startPreserve + collectPreserve qua chum ủ', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('chưa xây Nhà chum → không ủ được', () => {
    useGame.setState({
      level: 60,
      storage: { ...useGame.getState().storage, x_tom_tuoi: 5, x_muoi: 5 },
    } as never);
    useGame.getState().startPreserve('ps_mam_tep');
    expect(useGame.getState().garden.preserveJobs).toHaveLength(0);
  });

  it('xây chum 1★ (1 chum) rồi ủ; quá sức chứa → chặn thêm (R7)', () => {
    const s0 = useGame.getState();
    useGame.setState({
      level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_tom_tuoi: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, chum_u: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_mam_tep');
    useGame.getState().startPreserve('ps_mam_tep'); // chum 1★ = 1 → cái này bị chặn
    expect(useGame.getState().garden.preserveJobs).toHaveLength(1);
  });

  it('rút đúng mốc need → sản lượng thường, chưa có nhãn', () => {
    const s0 = useGame.getState();
    useGame.setState({
      day: 30, level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_tom_tuoi: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, chum_u: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_mam_tep'); // need 10
    useGame.setState({ day: 40 } as never); // ngày 10 → rút thường
    const g = useGame.getState();
    g.collectPreserve(g.garden.preserveJobs[0].id);
    const s = useGame.getState();
    expect(s.garden.preserveJobs).toHaveLength(0);
    expect(s.storage.hx_mam_tep).toBe(4);
    expect(s.garden.homegrown.hx_mam_tep ?? 0).toBe(0);
  });

  it('chưa đủ need → từ chối, giữ mẻ', () => {
    const s0 = useGame.getState();
    useGame.setState({
      day: 30, level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_tom_tuoi: 10, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, chum_u: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_mam_tep');
    useGame.setState({ day: 35 } as never); // ngày 5 < 10
    const g = useGame.getState();
    g.collectPreserve(g.garden.preserveJobs[0].id);
    expect(useGame.getState().garden.preserveJobs).toHaveLength(1);
    expect(useGame.getState().storage.hx_mam_tep ?? 0).toBe(0);
  });

  it('ủ LÂU (aged) → ra NHIỀU hơn (outputQty của mốc), cả lô mang nhãn nhà làm', () => {
    const s0 = useGame.getState();
    useGame.setState({
      day: 30, level: 60, money: 100_000_000,
      storage: { ...s0.storage, x_ca_basa: 5, x_muoi: 10 },
      garden: { ...s0.garden, buildings: { ...s0.garden.buildings, chum_u: 1 } },
    } as never);
    useGame.getState().startPreserve('ps_nuoc_mam'); // need 14, aged 28/5
    useGame.setState({ day: 58 } as never); // ngày 28 → ủ lâu
    const g = useGame.getState();
    g.collectPreserve(g.garden.preserveJobs[0].id);
    const s = useGame.getState();
    expect(s.garden.preserveJobs).toHaveLength(0);
    expect(s.storage.hx_nuoc_mam).toBe(5); // aged.outputQty = 5, không phải 3
    expect(s.garden.homegrown.hx_nuoc_mam).toBe(5); // ủ lâu → CẢ lô nhãn (+20%)
  });
});
