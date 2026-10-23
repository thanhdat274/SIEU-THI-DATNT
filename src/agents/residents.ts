import * as THREE from 'three';
import { MINUTES_PER_SECOND, useGame } from '../core/store';
import { NEIGHBOR_HOUSES, houseDoor } from '../data/phoneOrders';
import type { CharacterArchetype } from '../render/characterModel';
import { Walker } from './walker';

const SIDEWALK_Z = 2.2;
const EDGE_X = 38;

/** Người ở mỗi nhà hàng xóm: dáng và giờ đi làm / về nhà riêng (phút trong ngày). */
const RESIDENTS: { archetype: CharacterArchetype; color: number; leave: number; back: number }[] = [
  { archetype: 'office_lady', color: 0x8e44ad, leave: 7 * 60, back: 17 * 60 + 30 },
  { archetype: 'construction_worker', color: 0xe67e22, leave: 6 * 60 + 15, back: 18 * 60 },
  { archetype: 'student_boy', color: 0x2980b9, leave: 6 * 60 + 40, back: 16 * 60 + 45 },
  { archetype: 'nurse', color: 0xecf0f1, leave: 18 * 60 + 30, back: 7 * 60 + 30 },
  { archetype: 'gentleman', color: 0x16a085, leave: 7 * 60 + 30, back: 19 * 60 },
];

interface Resident { walker: Walker; house: number; home: boolean; leave: number; back: number }

/**
 * Hàng xóm trong 5 nhà dọc hẻm: sáng ra khỏi cửa đi làm, tối về nhà (y tá thì ngược ca).
 * Chỉ để phố có người sống; không mua hàng (khách gọi điện đặt hàng chính là họ).
 */
export class ResidentManager {
  private residents: Resident[] = [];

  constructor(private scene: THREE.Scene) {
    NEIGHBOR_HOUSES.forEach((h, i) => {
      const r = RESIDENTS[i % RESIDENTS.length];
      const walker = new Walker(r.color, undefined, 'customer', r.archetype);
      const door = houseDoor(h);
      walker.position.set(door.x, 0, door.z);
      walker.mesh.visible = false;
      scene.add(walker.mesh);
      this.residents.push({ walker, house: i, home: true, leave: r.leave, back: r.back });
    });
    this.reset();
  }

  /** Đầu ngày: ai đang trong ca (y tá ca đêm) thì ở ngoài, còn lại ở nhà. */
  reset() {
    const m = useGame.getState().minutes;
    for (const r of this.residents) {
      const out = r.leave < r.back ? m >= r.leave && m < r.back : m >= r.leave || m < r.back;
      r.home = !out;
      r.walker.path = [];
      r.walker.plan = [];
      r.walker.mesh.visible = false;
    }
  }

  update(gameDt: number) {
    const m = useGame.getState().minutes % 1440;
    const window = gameDt * MINUTES_PER_SECOND + 1;
    for (const r of this.residents) {
      const door = houseDoor(NEIGHBOR_HOUSES[r.house]);
      const edgeX = door.x < 0 ? -EDGE_X : EDGE_X;
      const w = r.walker;
      if (r.home && m >= r.leave && m < r.leave + window) {
        // Ra khỏi cửa, đi ra vỉa hè rồi tới đầu hẻm
        r.home = false;
        w.position.set(door.x, 0, door.z);
        w.mesh.visible = true;
        w.say('👋', 2);
        w.path = [new THREE.Vector3(door.x, 0, SIDEWALK_Z + 0.6), new THREE.Vector3(edgeX, 0, SIDEWALK_Z + 0.6)];
        w.plan = [() => (w.mesh.visible = false)];
      } else if (!r.home && m >= r.back && m < r.back + window) {
        r.home = true;
        w.position.set(edgeX, 0, SIDEWALK_Z + 0.6);
        w.mesh.visible = true;
        w.path = [new THREE.Vector3(door.x, 0, SIDEWALK_Z + 0.6), new THREE.Vector3(door.x, 0, door.z)];
        w.plan = [() => (w.mesh.visible = false)];
      }
      if (w.mesh.visible) w.step(gameDt);
    }
  }
}
