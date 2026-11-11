import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { newBiz, RESCUE_FEE, rivalNightAI } from '../data/biz';
import {
  POACH_CLUSTER_UNLOCK, POACH_IMMUNE_DAYS, POACH_LUNG_LAY_NIGHTS,
  poachClusterNeighbors, anchorCountFor, poachLungLayOf,
} from '../data/biz';
import { REGULAR_TIES } from '../data/regularTies';

/**
 * GĐ Hệ2-L6 (SPEC-CHIEU-SAU §2.7) — LÔI KÉO THEO CỤM + MỎ NEO + CẢNH BÁO HUD.
 * Khi rival lôi kéo một người:
 *  - họ hàng/bạn bè (cạnh không khắc khẩu) còn thân < POACH_FRIENDSHIP thành "lung lay" 3 đêm (×2 xác suất);
 *  - "mỏ neo" (thân ≥ EMOTIONAL_FRIENDSHIP) giảm 25% xác suất bị kéo của người có cạnh với họ;
 *  - đòi về một người → cả cụm miễn bị kéo 7 ngày.
 * Cổng cấp ≥ POACH_CLUSTER_UNLOCK=32 (R1) → golden L30 không lệch.
 */

const RIVAL = (over = {}) => ({ name: 'Cửa hàng Test', strength: 60, openedDay: 5, personality: 'cutter' as const, ...over });

beforeEach(() => {
  useGame.setState({ ...newGameData(), storage: {}, storageLots: {} });
});

describe('dữ liệu cơ chế cụm (SPEC §2.7)', () => {
  it('cổng ≥ 32 để golden L30 không đổi (R1)', () => {
    expect(POACH_CLUSTER_UNLOCK).toBeGreaterThanOrEqual(32);
  });

  it('poachClusterNeighbors = họ hàng/bạn bè (cạnh KHÔNG khắc khẩu) của một người', () => {
    // chu_ba có 2 cạnh: khắc khẩu với bac_ba_xe_om (loại) + bạn bè với bac_hung_me (giữ)
    expect(poachClusterNeighbors('chu_ba').sort()).toEqual(['bac_hung_me']);
    // ba_nam: láng giềng Bác Tám + họ hàng Bà Nà (bà–cháu)
    expect(poachClusterNeighbors('ba_nam').sort()).toEqual(['bac_tam', 'be_na']);
  });

  it('anchorCountFor = số "mỏ neo" (thân ≥ 40) nối cạnh (mọi cạnh, kể cả khắc khẩu)', () => {
    // bac_hung_me nối chu_ba (bạn bè) + chuong_tho_dien (đồng nghề)
    expect(anchorCountFor('bac_hung_me', { chu_ba: 50, chuong_tho_dien: 10 })).toBe(1);
    expect(anchorCountFor('bac_hung_me', { chu_ba: 3, chuong_tho_dien: 10 })).toBe(0);
    expect(anchorCountFor('bac_hung_me', { chu_ba: 50, chuong_tho_dien: 41 })).toBe(2);
  });
});

describe('lung lay — họ hàng/bạn bè của người vừa bị kéo', () => {
  it('khi chu_ba bị kéo → bạn bè còn xa lạ (bac_hung_me < 25) thành lung lay 3 đêm', () => {
    const res = rivalNightAI(RIVAL({ strength: 60, personality: 'aggressive' }), {
      day: 100, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      friendships: { chu_ba: 5, bac_hung_me: 10, bac_tam: 90, be_na: 90 },
      giftCounter: false, staff: [], rng: () => 0, level: 32,
    });
    expect(res.rival.poached?.['chu_ba']).toBe(100);
    expect(res.rival.poachLungLay?.['bac_hung_me']).toBe(100 + POACH_LUNG_LAY_NIGHTS);
  });

  it('lung lay KHÔNG lan qua cạnh khắc khẩu (bac_ba_xe_om thân thấp vẫn không bị đánh dấu)', () => {
    const res = rivalNightAI(RIVAL({ personality: 'aggressive' }), {
      day: 40, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      // bac_ba_xe_om khắc khẩu với chu_ba, thấp < 25 — không bị lung lay theo cụm
      friendships: { chu_ba: 5, bac_ba_xe_om: 10, bac_hung_me: 20 },
      giftCounter: false, staff: [], rng: () => 0, level: 32,
    });
    expect(res.rival.poached?.['chu_ba']).toBe(40);
    const ll = res.rival.poachLungLay ?? {};
    expect(Object.keys(ll)).toEqual(['bac_hung_me']);
    expect(ll['bac_ba_xe_om']).toBeUndefined();
  });

  it('cấp < 32: KHÔNG ghi lung lay (golden L30 giữ nguyên nhịp RNG)', () => {
    const res = rivalNightAI(RIVAL({ personality: 'aggressive' }), {
      day: 40, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      friendships: { chu_ba: 5, bac_hung_me: 10 },
      giftCounter: false, staff: [], rng: () => 0, level: 31,
    });
    expect(res.rival.poached?.['chu_ba']).toBe(40); // lôi kéo cơ bản vẫn chạy
    expect(res.rival.poachLungLay).toBeUndefined();
  });

  it('poachLungLayOf báo đúng ai đang lung lay (cảnh báo HUD không hứa hão) — cổng cấp + hết hạn', () => {
    const rival = RIVAL({ poachLungLay: { bac_hung_me: 103, be_na: 105 } });
    expect(poachLungLayOf(rival, { bac_hung_me: 10, be_na: 10 }, 32, 100)).toEqual(['bac_hung_me', 'be_na']);
    // hết hạn (until == day thì hết): ngày 103 không còn lung lay
    expect(poachLungLayOf(rival, { bac_hung_me: 10, be_na: 10 }, 32, 103)).toEqual(['be_na']);
    // cổng cấp: 31 → tắt hẳn
    expect(poachLungLayOf(rival, { bac_hung_me: 10, be_na: 10 }, 31, 100)).toEqual([]);
    // người đã bị kéo theo thì không còn "sắp lung lay" để cảnh báo
    const taken = RIVAL({ poachLungLay: { bac_hung_me: 103 }, poached: { bac_hung_me: 100 } });
    expect(poachLungLayOf(taken, { bac_hung_me: 10 }, 32, 100)).toEqual([]);
  });

  it('kéo người có hàng xóm thân (không xa lạ) → không ai lung lay', () => {
    // be_na bị kéo; họ hàng duy nhất là ba_nam (thân 90 ≥ 25) → không ai lung lay
    const res = rivalNightAI(RIVAL({ personality: 'aggressive' }), {
      day: 40, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      friendships: { be_na: 5, ba_nam: 90 },
      giftCounter: false, staff: [], rng: () => 0, level: 32,
    });
    expect(res.rival.poached?.['be_na']).toBe(40);
    expect(Object.keys(res.rival.poachLungLay ?? {})).toEqual([]);
  });
});

describe('mỏ neo — thân ≥ 40 giảm 25% xác suất bị kéo của người có cạnh', () => {
  it('một mỏ neo khiến người nối cạnh không bị kéo ở ngưỡng xác suất vừa đủ (×0.75)', () => {
    // chu_ba thấp nhất, nối bạn bè mỏ neo bac_hung_me (thân 50).
    // chance = 0.05 × (100/100) × (cutter=1) × 0.75 = 0.0375 → rng 0.04 KHÔNG kéo (có neo) .
    const res = rivalNightAI(RIVAL({ strength: 100 }), {
      day: 40, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      friendships: { chu_ba: 5, bac_hung_me: 50 },
      giftCounter: false, staff: [], rng: () => 0.04, level: 32,
    });
    expect(res.rival.poached?.['chu_ba']).toBeUndefined();
  });

  it('đối chứng: KHÔNG có mỏ neo thì cùng ngưỡng 0.04 bị kéo (giữ cơ chế cũ)', () => {
    const res = rivalNightAI(RIVAL({ strength: 100 }), {
      day: 40, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      friendships: { chu_ba: 5, bac_hung_me: 20 },
      giftCounter: false, staff: [], rng: () => 0.04, level: 32,
    });
    expect(res.rival.poached?.['chu_ba']).toBe(40);
  });

  it('cấp < 32 thì mỏ neo không can thiệp (chance giữ nguyên — golden an toàn)', () => {
    // chance = 0.05 × 1.0 = 0.05; rng 0.047 < 0.05 → kéo dù có mỏ neo, vì cụm chưa mở
    const res = rivalNightAI(RIVAL({ strength: 100 }), {
      day: 40, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      friendships: { chu_ba: 5, bac_hung_me: 50 },
      giftCounter: false, staff: [], rng: () => 0.047, level: 31,
    });
    expect(res.rival.poached?.['chu_ba']).toBe(40);
  });
});

describe('đòi về → cả cụm miễn bị kéo 7 ngày (rescuePoachedRegular)', () => {
  const setup = (level: number) => {
    useGame.setState({
      ...newGameData(), day: 10, level, money: 500_000,
      storage: { sua: 3, nuoc: 2 }, storageLots: {},
      biz: {
        ...newBiz(),
        rival: { name: 'Cửa hàng Test', strength: 90, openedDay: 9, poached: { ba_nam: 8 } },
      },
    });
  };

  it('cấp 32: đòi ba_nam → cụm ba_nam/bác Tám/bà Nà miễn bị kéo tới ngày 10+7', () => {
    setup(32);
    const ok = useGame.getState().rescuePoachedRegular('ba_nam');
    expect(ok).toBe(true);
    const immune = useGame.getState().biz.rival!.poachImmune ?? {};
    expect(immune['ba_nam']).toBe(10 + POACH_IMMUNE_DAYS);
    expect(immune['bac_tam']).toBe(10 + POACH_IMMUNE_DAYS);
    expect(immune['be_na']).toBe(10 + POACH_IMMUNE_DAYS);
  });

  it('cụm miễn dịch bị loại khỏi đối tượng lôi kéo đêm đó (rival không kéo người đang miễn)', () => {
    setup(32);
    useGame.getState().rescuePoachedRegular('ba_nam');
    const rival = useGame.getState().biz.rival!;
    const res = rivalNightAI(rival, {
      day: 11, byItem: { mi: { qty: 1 } }, priceOf: () => 5000,
      // ba_nam/bác Tám/bà Nà đều thân thấp nhưng đang miễn → rival kéo người thấp KHÔNG miễn (chu_ba 90) → không kéo ai
      friendships: { ba_nam: 5, bac_tam: 5, be_na: 5, chu_ba: 90 },
      giftCounter: false, staff: [], rng: () => 0, level: 32,
    });
    expect(res.rival.poached).toEqual({});
  });

  it('cấp < 32: không ghi miễn dịch cụm (đường cũ, golden an toàn)', () => {
    setup(31);
    useGame.getState().rescuePoachedRegular('ba_nam');
    const rival = useGame.getState().biz.rival!;
    expect(rival.poached).toEqual({});
    expect(rival.poachImmune).toBeUndefined();
  });
});
