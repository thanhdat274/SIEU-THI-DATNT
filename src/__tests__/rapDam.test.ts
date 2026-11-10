import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { newGameData, useGame } from '../core/store';
import { LIFE_EVENTS, gioHostOn, gioHouseIndex, gioDoy, nextGioDay, LIFE_EVENT_UNLOCK } from '../data/lifeEvent';
import { NEIGHBOR_HOUSES, houseDoor } from '../data/phoneOrders';
import { createRapDam, installRapDamSync } from '../world/rapDam';

/**
 * GĐ Hệ2-L8 (SPEC-CHIEU-SAU §2.9) — RẠP ĐÁM TRONG 3D.
 * Ngày có đám giỗ của một khách quen, dựng rạp bạt trước "nhà" chủ giỗ trong hẻm (`gioHostOn(day)`
 * R4 chọn chủ, `gioHouseIndex(host)` băm ổn định ra 1 trong 5 nhà) + vài khách trong cụm tụ lại.
 * THUẦN về dữ liệu, không đụng kinh tế/RNG/save → golden L30 giữ nguyên; cổng cấp ≥ LIFE_EVENT_UNLOCK.
 */

describe('gioHostOn — chủ đám giỗ hôm nay (R4, tất định theo ngày)', () => {
  it('đúng chủ vào đúng ngày giỗ của từng khách quen (28 giỗ)', () => {
    for (const d of LIFE_EVENTS) {
      if (d.kind !== 'gio') continue;
      expect(gioHostOn(nextGioDay(d, 1))).toBe(d.host);
    }
  });

  it('cứ 365 ngày có đúng bằng số ngày giỗ phân biệt (không dư ngày giỗ ma)', () => {
    const distinct = new Set(LIFE_EVENTS.filter((d) => d.kind === 'gio').map((d) => gioDoy(d))).size;
    let nonNull = 0;
    for (let day = 1; day <= 365; day++) if (gioHostOn(day)) nonNull++;
    expect(nonNull).toBe(distinct);
  });

  it('ngày không phải giỗ của ai → null', () => {
    const gioDays = new Set(LIFE_EVENTS.filter((d) => d.kind === 'gio').map((d) => gioDoy(d)));
    let nullDays = 0;
    for (let day = 1; day <= 365; day++) if (!gioHostOn(day)) nullDays++;
    expect(nullDays).toBe(365 - gioDays.size);
  });
});

describe('gioHouseIndex — rạp không nhảy nhà', () => {
  it('luôn ra 1 trong 5 nhà và trải đủ nhiều nhà (28 chủ → nhiều nhà khác nhau)', () => {
    const hosts = LIFE_EVENTS.filter((d) => d.kind === 'gio').map((d) => d.host);
    for (const h of hosts) {
      const idx = gioHouseIndex(h);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(NEIGHBOR_HOUSES.length);
    }
    expect(new Set(hosts.map(gioHouseIndex)).size).toBeGreaterThan(1);
  });

  it('ổn định: cùng chủ luôn về cùng nhà', () => {
    const h = LIFE_EVENTS.find((d) => d.kind === 'gio')!.host;
    expect(gioHouseIndex(h)).toBe(gioHouseIndex(h));
  });
});

describe('createRapDam — cấu trúc rạp + biển tên', () => {
  it('group có đủ khối (cột/rạp/bàn/khách/biển) và setHost ghi tên chủ', () => {
    const r = createRapDam();
    expect(r.group.children.length).toBeGreaterThan(3);
    r.setHost('Bà Năm');
    expect(r.group.userData.banner).toBe('Bà Năm');
  });
});

describe('installRapDamSync — hiện đúng ngày giỗ, cổng cấp (R1)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), storage: {}, storageLots: {} });
  });

  it('ngày giỗ + cấp ≥ unlock → hiện rạp trước nhà chủ; ngày thường → ẩn', () => {
    const scene = new THREE.Scene();
    const sync = installRapDamSync(scene);
    const gio = LIFE_EVENTS.find((d) => d.kind === 'gio')!;
    const day = nextGioDay(gio, 1);
    useGame.setState({ ...newGameData(), level: LIFE_EVENT_UNLOCK, day, minutes: 480 });
    expect(sync.group.visible).toBe(true);
    const door = houseDoor(NEIGHBOR_HOUSES[gioHouseIndex(gio.host)]);
    expect(sync.group.position.x).toBe(door.x);
    // sang ngày hôm sau: nếu không phải ngày giỗ → rạp ẩn
    useGame.setState({ ...useGame.getState(), day: day + 1 });
    expect(sync.group.visible).toBe(gioHostOn(day + 1) != null);
  });

  it('cấp < unlock → ẩn dù đúng ngày giỗ (golden L30 an toàn)', () => {
    const scene = new THREE.Scene();
    const sync = installRapDamSync(scene);
    const gio = LIFE_EVENTS.find((d) => d.kind === 'gio')!;
    const day = nextGioDay(gio, 1);
    expect(gioHostOn(day)).toBe(gio.host);
    useGame.setState({ ...newGameData(), level: LIFE_EVENT_UNLOCK - 1, day, minutes: 480 });
    expect(sync.group.visible).toBe(false);
  });
});
