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
