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

  it('máy khai unlock đúng bậc (đặt được khi đủ cấp)', () => {
    for (const id of Object.keys(MACHINE_TYPES)) {
      const def = furnitureDef(id as never);
      expect(def.unlock).toBe(25);
      expect(def.tiers).toBe(0);
      expect(def.categories).toHaveLength(0);
    }
  });
});
