import { describe, expect, it } from 'vitest';
import { MACHINE_TYPES, MACHINE_VISIT_CHANCE, MACHINE_USE_SECONDS, freeMachine, isMachine, machineFee } from '../data/machines';
import { FURNITURE, furnitureDef } from '../data/furniture';

const mk = (uid: number, type: string, extra: Record<string, unknown> = {}) =>
  ({ uid, type, x: 0, z: 0, rot: 0, tiers: [], ...extra });

describe('machines — máy tự phục vụ thu phí mỗi lượt (GĐ1493)', () => {
  it('3 loại máy đều có trong FURNITURE, hoàn vốn ~100 lượt (giá ≈ phí × 100)', () => {
    for (const [id, def] of Object.entries(MACHINE_TYPES)) {
      const furn = FURNITURE.find((f) => f.type === id);
      expect(furn, `thiếu máy ${id} trong FURNITURE`).toBeTruthy();
      const payback = furn!.price / def.fee;
      expect(payback).toBeGreaterThanOrEqual(90);
      expect(payback).toBeLessThanOrEqual(110);
    }
  });

  it('isMachine/machineFee: đúng bảng phí, đồ khác trả 0', () => {
    expect(isMachine('claw_machine')).toBe(true);
    expect(isMachine('shelf')).toBe(false);
    expect(machineFee('vending_drink')).toBe(1_200);
    expect(machineFee('scale_machine')).toBe(1_000);
    expect(machineFee('claw_machine')).toBe(1_800);
    expect(machineFee('shelf')).toBe(0);
  });

  it('freeMachine: bỏ máy bận và máy hỏng; hết máy trống → null', () => {
    const furn = [mk(1, 'claw_machine'), mk(2, 'vending_drink', { broken: true }), mk(3, 'shelf')];
    expect(freeMachine(furn as never, new Set())?.uid).toBe(1);
    expect(freeMachine(furn as never, new Set([1]))).toBeNull(); // máy 2 hỏng, 3 không phải máy
    expect(freeMachine([], new Set())).toBeNull();
  });

  it('máy dùng 6 giây game/lượt, 15% khách mới ghé', () => {
    expect(MACHINE_USE_SECONDS).toBe(6);
    expect(MACHINE_VISIT_CHANCE).toBe(0.15);
  });

  it('máy khai unlock đúng bậc: cân sức khỏe 25 (đặc trưng tạp hóa), bán nước + gắp thú 30 (đi cùng khu ăn uống)', () => {
    const unlockOf = (id: string) => furnitureDef(id as never).unlock;
    expect(unlockOf('scale_machine')).toBe(25);
    expect(unlockOf('vending_drink')).toBe(30);
    expect(unlockOf('claw_machine')).toBe(30);
    for (const id of Object.keys(MACHINE_TYPES)) {
      expect(furnitureDef(id as never).tiers).toBe(0);
      expect(furnitureDef(id as never).categories).toHaveLength(0);
    }
  });
});

describe('GĐ1537 — ghế mát-xa chân', () => {
  it('mở cấp 38 (> golden 30), phí 2.400, hoàn vốn đúng 100 lượt, là máy thu phí', () => {
    expect(furnitureDef('massage_chair').unlock).toBe(38);
    expect(isMachine('massage_chair')).toBe(true);
    expect(machineFee('massage_chair')).toBe(2_400);
    expect(MACHINE_TYPES.massage_chair.price / MACHINE_TYPES.massage_chair.fee).toBe(100);
    expect(furnitureDef('massage_chair').price).toBe(MACHINE_TYPES.massage_chair.price);
  });
});

describe('GĐ1538 — phí máy giờ tối', () => {
  it('từ 18h, cấp ≥35: nước + mát-xa ×1,5; máy khác, giờ ngày, cấp thấp giữ nguyên', async () => {
    const { machineFeeAt } = await import('../data/machines');
    expect(machineFeeAt('vending_drink', 19 * 60, 35)).toBe(1_800);
    expect(machineFeeAt('massage_chair', 18 * 60, 40)).toBe(3_600);
    expect(machineFeeAt('claw_machine', 19 * 60, 40)).toBe(1_800);
    expect(machineFeeAt('vending_drink', 12 * 60, 40)).toBe(1_200);
    expect(machineFeeAt('vending_drink', 19 * 60, 34)).toBe(1_200);
  });
});

describe('GĐ1539 — dòng thông tin máy khi đặt', () => {
  it('máy: phí + hoàn vốn (+ ghi chú tối); đồ thường: null', async () => {
    const { machinePopupLine } = await import('../data/machines');
    expect(machinePopupLine('massage_chair')).toContain('100 lượt');
    expect(machinePopupLine('massage_chair')).toContain('tối');
    expect(machinePopupLine('claw_machine')).not.toContain('tối');
    expect(machinePopupLine('shelf')).toBeNull();
  });
});

describe('GĐ1541 — gắp thú cuối tuần', () => {
  it('cuối tuần cấp ≥35: ×1,5; ngày thường hoặc cấp thấp: giữ nguyên', async () => {
    const { machineFeeAt } = await import('../data/machines');
    const { isWeekend } = await import('../data/calendar');
    const we = [1, 2, 3, 4, 5, 6, 7].find((d) => isWeekend(d))!;
    const wd = [1, 2, 3, 4, 5, 6, 7].find((d) => !isWeekend(d))!;
    expect(machineFeeAt('claw_machine', 600, 40, we)).toBe(2_700);
    expect(machineFeeAt('claw_machine', 600, 40, wd)).toBe(1_800);
    expect(machineFeeAt('claw_machine', 600, 30, we)).toBe(1_800);
    expect(machineFeeAt('scale_machine', 600, 40, we)).toBe(1_000);
  });
});

describe('GĐ1542 — sổ thu theo máy', () => {
  it('dòng thông tin hiện "đã thu" khi có số, ẩn khi chưa thu', async () => {
    const { machinePopupLine } = await import('../data/machines');
    expect(machinePopupLine('claw_machine', 54_000)).toContain('đã thu 54.000đ');
    expect(machinePopupLine('claw_machine')).not.toContain('đã thu');
  });
});

describe('GĐ1544 — chơi máy xong mua thêm', () => {
  it('cấp ≥40 và roll < 0,3 mới thêm món', async () => {
    const { machineImpulse } = await import('../data/machines');
    expect(machineImpulse(40, 0.29)).toBe(true);
    expect(machineImpulse(40, 0.3)).toBe(false);
    expect(machineImpulse(39, 0)).toBe(false);
  });
});

describe('GĐ1547 — máy đánh giày', () => {
  it('cấp 42, phí 2.000, hoàn vốn 100 lượt, giá khớp catalog', () => {
    expect(furnitureDef('shoe_shine').unlock).toBe(42);
    expect(machineFee('shoe_shine')).toBe(2_000);
    expect(MACHINE_TYPES.shoe_shine.price / MACHINE_TYPES.shoe_shine.fee).toBe(100);
    expect(furnitureDef('shoe_shine').price).toBe(MACHINE_TYPES.shoe_shine.price);
  });
});

describe('GĐ1548 — máy kẹo bông', () => {
  it('cấp 46, phí 2.500, hoàn vốn 100 lượt, giá khớp catalog', () => {
    expect(furnitureDef('cotton_candy').unlock).toBe(46);
    expect(machineFee('cotton_candy')).toBe(2_500);
    expect(MACHINE_TYPES.cotton_candy.price / MACHINE_TYPES.cotton_candy.fee).toBe(100);
    expect(furnitureDef('cotton_candy').price).toBe(MACHINE_TYPES.cotton_candy.price);
  });
});

describe('GĐ1549 — kẹo bông cuối tuần', () => {
  it('cuối tuần ×1,5 như gắp thú, ngày thường giữ nguyên', async () => {
    const { machineFeeAt } = await import('../data/machines');
    const { isWeekend } = await import('../data/calendar');
    const we = [1, 2, 3, 4, 5, 6, 7].find((d) => isWeekend(d))!;
    const { festivalOn } = await import('../data/calendar');
    const wd = Array.from({ length: 60 }, (_, i) => i + 1).find((d) => !isWeekend(d) && !festivalOn(d))!; // GĐ1578: tránh ngày lễ
    expect(machineFeeAt('cotton_candy', 600, 46, we)).toBe(3_750);
    expect(machineFeeAt('cotton_candy', 600, 46, wd)).toBe(2_500);
  });
});

describe('GĐ1550 — dòng thông tin ghi giá cuối tuần', () => {
  it('gắp thú + kẹo bông ghi "cuối tuần ×1,5"', async () => {
    const { machinePopupLine } = await import('../data/machines');
    expect(machinePopupLine('claw_machine')).toContain('cuối tuần');
    expect(machinePopupLine('cotton_candy')).toContain('cuối tuần');
    expect(machinePopupLine('shoe_shine')).not.toContain('cuối tuần'); // GĐ1571: giờ có 'trời mưa ×1,5'
  });
});

describe('GĐ1551 — máy chụp ảnh lấy liền', () => {
  it('cấp 50, phí 3.000, hoàn vốn 100 lượt, giá khớp catalog', () => {
    expect(furnitureDef('photo_booth').unlock).toBe(50);
    expect(machineFee('photo_booth')).toBe(3_000);
    expect(MACHINE_TYPES.photo_booth.price / MACHINE_TYPES.photo_booth.fee).toBe(100);
    expect(furnitureDef('photo_booth').price).toBe(MACHINE_TYPES.photo_booth.price);
  });
});

import { machineDayLine } from '../data/machines';
describe('GĐ1564 dòng máy thu phí hôm nay', () => {
  it('chỉ tính máy, xếp nhiều trước', () => {
    expect(machineDayLine({ laundry: 9000 })).toBeNull();
    const l = machineDayLine({ laundry: 9000, vending_drink: 1200, claw_machine: 3600 })!;
    expect(l).toContain('4.800đ');
    expect(l.indexOf('🧸')).toBeLessThan(l.indexOf('🥤'));
  });
});

import { machineDayTotal } from '../data/machines';
describe('GĐ1565 tổng máy trong ngày', () => {
  it('bỏ dịch vụ không phải máy', () => {
    expect(machineDayTotal({ laundry: 9000, photo_booth: 3000, scale_machine: 1000 })).toBe(4000);
    expect(machineDayTotal(undefined)).toBe(0);
  });
});

import { clawWin } from '../data/machines';
describe('GĐ1566 gắp trúng', () => {
  it('chỉ máy gắp, cấp 44, ~1/20', () => {
    let n = 0;
    for (let m = 0; m < 2000; m++) if (clawWin('claw_machine', 44, 3, 5, m)) n++;
    expect(n).toBe(100);
    expect(clawWin('claw_machine', 43, 0, 0, 0)).toBe(false);
    expect(clawWin('photo_booth', 50, 0, 0, 0)).toBe(false);
  });
});

import { idleMachineHint } from '../data/machines';
describe('GĐ1567 máy chưa ai chơi', () => {
  const fs = [{ uid: 1, type: 'claw_machine' }, { uid: 2, type: 'vending_drink' }] as never;
  it('sau 14h nêu máy chưa thu', () => {
    expect(idleMachineHint(fs, {}, 13 * 60)).toBeNull();
    const h = idleMachineHint(fs, { vending_drink: 1200 }, 15 * 60)!;
    expect(h).toContain('Máy gắp thú');
    expect(h).not.toContain('bán nước');
    expect(idleMachineHint(fs, { vending_drink: 1, claw_machine: 1 }, 900)).toBeNull();
  });
});

import { machineFeeAt as feeAt1568, machinePopupLine as popup1568 } from '../data/machines';
import { festivalOn } from '../data/calendar';
describe('GĐ1568 máy chụp ảnh ngày lễ', () => {
  it('×1,5 ngày lễ từ cấp 50', () => {
    let fest = 1; while (!festivalOn(fest)) fest++;
    let plain = 1; while (festivalOn(plain)) plain++;
    expect(feeAt1568('photo_booth', 600, 50, fest)).toBe(4500);
    expect(feeAt1568('photo_booth', 600, 49, fest)).toBe(3000);
    expect(feeAt1568('photo_booth', 600, 50, plain)).toBe(3000);
    expect(popup1568('photo_booth')).toContain('ngày lễ');
  });
});

import { machineFeeAt as feeAt1571, machinePopupLine as popup1571 } from '../data/machines';
describe('GĐ1571 đánh giày ngày mưa', () => {
  it('×1,5 khi mưa/bão từ cấp 42', () => {
    expect(feeAt1571('shoe_shine', 600, 42, 3, 'rain')).toBe(3000);
    expect(feeAt1571('shoe_shine', 600, 42, 3, 'storm')).toBe(3000);
    expect(feeAt1571('shoe_shine', 600, 42, 3, 'sunny')).toBe(2000);
    expect(feeAt1571('shoe_shine', 600, 41, 3, 'rain')).toBe(2000);
    expect(popup1571('shoe_shine')).toContain('trời mưa');
  });
});

import { machineFeeAt as feeAt1578, machinePopupLine as popup1578 } from '../data/machines';
import { festivalOn as fest1578 } from '../data/calendar';
import { isWeekend as wk1578 } from '../data/calendar';
describe('GĐ1578 kẹo bông ngày lễ', () => {
  it('×1,5 ngày lễ từ cấp 46', () => {
    let d = 1; while (!fest1578(d)) d++;
    expect(feeAt1578('cotton_candy', 600, 46, d)).toBe(3750);
    expect(feeAt1578('cotton_candy', 600, 45, d)).toBe(2500);
    let p = 1; while (fest1578(p) || wk1578(p)) p++;
    expect(feeAt1578('cotton_candy', 600, 46, p)).toBe(2500);
    expect(popup1578('cotton_candy')).toContain('ngày lễ');
  });
});

import { boostedMachinesToday } from '../data/machines';
describe('GĐ1579 máy tăng phí hôm nay', () => {
  it('chỉ nêu máy có tăng', () => {
    const fs = [{ uid: 1, type: 'shoe_shine' }, { uid: 2, type: 'scale_machine' }] as never;
    expect(boostedMachinesToday(fs, 50, 3, 'rain')).toEqual(['shoe_shine']);
    expect(boostedMachinesToday(fs, 50, 3, 'sunny').includes('shoe_shine')).toBe(false);
  });
});

describe('GĐ1592 clawWinLine', () => {
  it('null khi 0, đếm khi có', async () => {
    const { clawWinLine } = await import('../data/machines');
    expect(clawWinLine(undefined)).toBeNull();
    expect(clawWinLine(2)).toContain('2 lần');
  });
});

describe('GĐ1593 tổng kết ngày dòng gắp trúng', () => {
  it('ReportPanels hiện st.clawWins', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/ui/panels/ReportPanels.tsx', 'utf8');
    expect(src).toContain('!!st.clawWins');
  });
});
