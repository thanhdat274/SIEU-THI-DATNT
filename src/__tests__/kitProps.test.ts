import { describe, expect, it } from 'vitest';
import {
  KIT_MODULES,
  KIT_PLACEMENTS,
  KIT_MARKET_PLACEMENTS,
  KIT_ROADWORK_PLACEMENTS,
  KIT_FESTIVAL_PLACEMENTS,
  kitPlacementProblems,
} from '../world/kitProps';
import { isMarketDay } from '../data/chophien';
import { isFestivalDeco } from '../data/festivalDeco';
import { festivalOn } from '../data/calendar';

/**
 * GĐ172 — Kit prop GLB trang trí (pipeline kiểu Xóm Nông Trại): model sinh bằng script ra
 * GLB + manifest, đặt điểm xuyết quanh hẻm cho đỡ trống. Kit là ảnh trang trí KHÔNG chặn
 * lưới đi lại (convention quán nước), nên rủi ro duy nhất là ĐẶT SAI CHỖ — soi bảng toạ độ
 * bằng test thuần (không cần DOM/three tải gì).
 */
describe('GĐ172 — kit prop GLB', () => {
  it('bảng vị trí đặt không vi phạm chỗ cấm (nhà, lòng đường, ngoài thế giới, chèn nhau)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('mọi placement trỏ vào module mà script sinh ra', () => {
    for (const p of KIT_PLACEMENTS) {
      expect(KIT_MODULES).toContain(p.module);
    }
  });

  it('đủ module của kit đều được dùng ít nhất một chỗ (tính cả chợ phiên + sửa đường)', () => {
    const used = new Set([...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS, ...KIT_FESTIVAL_PLACEMENTS].map((p) => p.module));
    for (const m of KIT_MODULES) expect(used.has(m)).toBe(true);
  });

  it('mỗi module gắn tỉ lệ hợp lý (không âm, không phóng to vô lý)', () => {
    for (const p of KIT_PLACEMENTS) {
      expect(p.scale ?? 1).toBeGreaterThan(0.5);
      expect(p.scale ?? 1).toBeLessThanOrEqual(2);
    }
  });

  it('cửa nhà vẫn đi lại thoáng: không món nào đè ngay tâm cửa (x=−12, z=1)', () => {
    for (const p of KIT_PLACEMENTS) {
      const d = Math.hypot(p.pos[0] - -12, p.pos[2] - 1);
      expect(d).toBeGreaterThan(0.8);
    }
  });
});

/**
 * GĐ181 — Chợ phiên: vài gánh hàng (`xe_day`) dựng thêm dọc hẻm khi isMarketDay (mỗi 7 ngày),
 * tái dùng module kit có sẵn — vẫn không chặn lưới. Rủi ro duy nhất là đặt sai chỗ, soi bằng test.
 */
describe('GĐ181 — gánh hàng chợ phiên', () => {
  it('bảng vị trí chợ phiên không vi phạm chỗ cấm (đã gộp vào kitPlacementProblems)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('chỉ dùng module có trong kit, tựa vỉa hè sát lòng đường (z 1.4..3)', () => {
    const carts = KIT_MARKET_PLACEMENTS.filter((p) => p.module === 'xe_day');
    const seats = KIT_MARKET_PLACEMENTS.filter((p) => p.module !== 'xe_day');
    for (const p of KIT_MARKET_PLACEMENTS) {
      expect(KIT_MODULES).toContain(p.module);
      expect(p.pos[2]).toBeGreaterThan(1.4);
      expect(p.pos[2]).toBeLessThanOrEqual(3);
    }
    // GĐ196: phiên chợ giờ là xe đẩy + chỗ ngồi (băng ghế/ghế nhựa) — vẫn ít nhất 2 xe đẩy chính
    expect(carts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seats.map((s) => s.module)).size).toBeGreaterThanOrEqual(1);
  });

  it('không chèn sát món nào trong bảng hay chính nó (<0.55 m)', () => {
    const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].pos[0] - all[j].pos[0], all[i].pos[2] - all[j].pos[2]);
        expect(d).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it('không chắn cửa tiệm (cửa x=4, z=1) mà chỉ bày dọc mép đường', () => {
    for (const p of KIT_MARKET_PLACEMENTS) {
      const d = Math.hypot(p.pos[0] - 4, p.pos[2] - 1);
      expect(d).toBeGreaterThan(1.2);
    }
  });

  it('họp đúng nhịp 7 ngày của chợ phiên (GĐ135 isMarketDay)', () => {
    expect(isMarketDay(7)).toBe(true);
    expect(isMarketDay(14)).toBe(true);
    expect(isMarketDay(6)).toBe(false);
    expect(isMarketDay(8)).toBe(false);
  });
});

/**
 * GĐ184 — Sửa đường: rào chắn công trình (`rao_chan`) dựng ở mép vỉa hè trước hẻm khi hôm nay có
 * sự kiện market `roadworks` (giảm lượt khách đi ngang) — con hẻm "đang sửa" hiện ra bằng hình.
 * Kiểu GĐ181/182: chỉ báo tín hiệu, không chặn lưới. Rủi ro duy nhất là đặt sai chỗ, soi bằng test.
 */
describe('GĐ184 — rào chắn sửa đường', () => {
  it('bảng vị trí rào chắn không vi phạm chỗ cấm (đã gộp vào kitPlacementProblems)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('chỉ dùng module rao_chan có trong kit, đặt ở mép vỉa hè (z 1.5..3), không giữa lòng đường', () => {
    for (const p of KIT_ROADWORK_PLACEMENTS) {
      expect(KIT_MODULES).toContain(p.module);
      expect([...new Set(KIT_ROADWORK_PLACEMENTS.map((x) => x.module))]).toEqual(['rao_chan']);
      expect(p.pos[2]).toBeGreaterThan(1.4);
      expect(p.pos[2]).toBeLessThanOrEqual(3);
    }
  });

  it('không chèn sát món nào trong toàn bộ bảng hay chính nó (<0.55 m)', () => {
    const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].pos[0] - all[j].pos[0], all[i].pos[2] - all[j].pos[2]);
        expect(d).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it('không chắn cửa tiệm (cửa x=4, z=1) mà chỉ rào mép đường phía trước', () => {
    for (const p of KIT_ROADWORK_PLACEMENTS) {
      const d = Math.hypot(p.pos[0] - 4, p.pos[2] - 1);
      expect(d).toBeGreaterThan(1.2);
    }
  });

  it('tỉ lệ rào chắn hợp lý (không phóng to vô lý)', () => {
    for (const p of KIT_ROADWORK_PLACEMENTS) {
      expect(p.scale ?? 1).toBeGreaterThan(0.5);
      expect(p.scale ?? 1).toBeLessThanOrEqual(2);
    }
  });
});

/**
 * GĐ195 — Băng ghế hẻm (`bang_ghe`): chỗ bà con ngồi hóng mát, nối tiếp mảng "con hẻm sống" + đèn
 * ấm hoàng hôn (gđ185). Vẫn là kit prop trang trí KHÔNG chặn lưới; rủi ro duy nhất là đặt sai chỗ.
 */
describe('GĐ195 — băng ghế hẻm', () => {
  it('bảng vị trí không vi phạm chỗ cấm (đã gộp vào kitPlacementProblems)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('mỗi băng ghế đặt ở chỗ sinh hoạt mà không chen món nào (<0.55 m) trong toàn bảng', () => {
    const bench = KIT_PLACEMENTS.filter((p) => p.module === 'bang_ghe');
    expect(bench.length).toBeGreaterThanOrEqual(1);
    const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS];
    for (const b of bench) {
      for (const o of all) {
        if (o === b) continue;
        const d = Math.hypot(b.pos[0] - o.pos[0], b.pos[2] - o.pos[2]);
        expect(d).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it('không chắn hai cửa đi chính (cửa nhà x=−12,z=1 · cửa tiệm x=4,z=1)', () => {
    for (const p of KIT_PLACEMENTS.filter((x) => x.module === 'bang_ghe')) {
      const dHome = Math.hypot(p.pos[0] - -12, p.pos[2] - 1);
      const dShop = Math.hypot(p.pos[0] - 4, p.pos[2] - 1);
      expect(dHome).toBeGreaterThan(0.8);
      expect(dShop).toBeGreaterThan(1.2);
    }
  });

  it('mỗi băng ghế tỉ lệ hợp lý (không âm, không phóng to vô lý)', () => {
    for (const p of KIT_PLACEMENTS.filter((x) => x.module === 'bang_ghe')) {
      expect(p.scale ?? 1).toBeGreaterThan(0.5);
      expect(p.scale ?? 1).toBeLessThanOrEqual(2);
    }
  });
});

/**
 * GĐ196 — "Phiên chợ có chỗ ngồi": ngoài gánh hàng (`xe_day`, gđ181), phiên chợ còn bày thêm băng ghế
 * (`bang_ghe`) + ghế nhựa (`cho_nhua`) dọc vỉa hè cho người mua ngồi — đông vui hơn, vẫn không chặn lưới.
 * Mọi chỗ đều tựa vỉa hè (z 1.4..3) và không chen món nào trong toàn bảng (đã gộp kitPlacementProblems).
 */
describe('GĐ196 — chỗ ngồi chợ phiên', () => {
  it('chỗ ngồi chợ (bang_ghe/cho_nhua) chèn đúng hàng kit đã kiểm chỗ cấm (gộp kitPlacementProblems)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('chỗ ngồi chợ chỉ dùng module có trong kit, tựa vỉa hè (z 1.4..3), không giữa lòng đường', () => {
    for (const p of KIT_MARKET_PLACEMENTS.filter((x) => x.module !== 'xe_day')) {
      expect(KIT_MODULES).toContain(p.module);
      expect(p.pos[2]).toBeGreaterThan(1.4);
      expect(p.pos[2]).toBeLessThanOrEqual(3);
    }
  });

  it('chỗ ngồi chợ không chen sát món nào trong toàn bảng hay chính nó (<0.55 m)', () => {
    const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].pos[0] - all[j].pos[0], all[i].pos[2] - all[j].pos[2]);
        expect(d).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it('không chắn cửa tiệm (cửa x=4, z=1) hay cửa nhà (x=−12, z=1)', () => {
    for (const p of KIT_MARKET_PLACEMENTS.filter((x) => x.module !== 'xe_day')) {
      const dShop = Math.hypot(p.pos[0] - 4, p.pos[2] - 1);
      const dHome = Math.hypot(p.pos[0] - -12, p.pos[2] - 1);
      expect(dShop).toBeGreaterThan(1.2);
      expect(dHome).toBeGreaterThan(0.8);
    }
  });
});

/**
 * GĐ197 — "Con hẻm vào dịp": dãy cờ `day_co` chỉ dựng ngang hẻm khi hôm nay có lễ hội (`festivalOn`).
 * Cùng kiểu GĐ181/184: bật/tắt bằng `setFestival`, không chặn lưới; rủi ro duy nhất là đặt sai chỗ.
 */
describe('GĐ197 — dãy cờ lễ hội', () => {
  it('bảng vị trí dãy cờ không vi phạm chỗ cấm (đã gộp vào kitPlacementProblems)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('chỉ dùng module day_co có trong kit, không chen món nào trong toàn bảng (<0.55 m)', () => {
    for (const p of KIT_FESTIVAL_PLACEMENTS) {
      expect(KIT_MODULES).toContain(p.module);
      expect(p.module).toBe('day_co');
    }
    const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS, ...KIT_ROADWORK_PLACEMENTS, ...KIT_FESTIVAL_PLACEMENTS];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].pos[0] - all[j].pos[0], all[i].pos[2] - all[j].pos[2]);
        expect(d).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it('dãy cờ đặt vượt lối đi thoáng, không chắn hai cửa chính (tiệm x=4,z=1 · nhà x=−12,z=1)', () => {
    for (const p of KIT_FESTIVAL_PLACEMENTS) {
      const dShop = Math.hypot(p.pos[0] - 4, p.pos[2] - 1);
      const dHome = Math.hypot(p.pos[0] - -12, p.pos[2] - 1);
      expect(dShop).toBeGreaterThan(1.2);
      expect(dHome).toBeGreaterThan(0.8);
    }
  });

  it('có đúng dịp thì bật (soi chân lý festivalOn — đồng nhất trên một loạt ngày, gồm Tết)', () => {
    for (let day = 1; day <= 90; day++) {
      expect(isFestivalDeco(day)).toBe(festivalOn(day) !== undefined);
    }
  });
});
