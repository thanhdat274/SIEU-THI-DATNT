import * as THREE from 'three';
import { useGame } from '../core/store';
import { branchTrafficAt, CONVENIENCE, onShift, restingOn } from '../data/branches';
import { ROLES } from '../data/staff';
import { Walker } from './walker';

/** Người chơi trong bán kính này mới dựng nhân vật ở chi nhánh; đi xa thì dọn hết (vẫn tính ngầm như cũ). */
const NEAR = 38;
/** Đổi toạ độ trong tòa nhà (gốc ở tâm) sang toạ độ thế giới. */
const at = (x: number, z: number) => new THREE.Vector3(CONVENIENCE.x + x, 0, CONVENIENCE.z + z);
const DOOR_OUT = at(0, CONVENIENCE.depth / 2 + 1.4);
const DOOR_IN = at(0, CONVENIENCE.depth / 2 - 1.2);
/** Chỗ thu ngân đứng sau quầy, chỗ khách đứng trả tiền, chỗ bảo vệ đứng cạnh cửa. */
const CASHIER_SPOT = at(-6, 0.9);
const PAY_SPOT = at(-6, 3.2);
const GUARD_SPOT = at(1.8, CONVENIENCE.depth / 2 + 1.1);
const AISLES = [at(0, 1.2), at(3, 1.2), at(0, -1.75), at(4, -1.75)];
const COLORS = [0xe74c3c, 0x3498db, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e, 0xf1c40f, 0x16a085];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Diễn lại cửa hàng tiện lợi khi chủ ghé: thu ngân đứng quầy, bảo vệ đứng cửa (đúng người đang trong ca),
 * khách vào lựa đồ rồi trả tiền. Chỉ để nhìn — doanh thu vẫn do mô phỏng ngầm trong store tính.
 */
export class BranchVisit {
  private staff = new Map<number, Walker>();
  private shoppers: Walker[] = [];
  private spawnIn = 0;

  constructor(private scene: THREE.Scene) {}

  /** Mọi người đang hiện ở chi nhánh (để cửa tự mở khi có người tới gần). */
  get people() { return [...this.staff.values(), ...this.shoppers].map((w) => w.position); }

  update(gameDt: number, player: THREE.Vector3) {
    const s = useGame.getState();
    const b = s.branch;
    if (!b?.open || player.distanceTo(at(0, 0)) > NEAR) return this.clear();

    // Nhân viên trong ca: thu ngân sau quầy, bảo vệ cạnh cửa (ca đêm xin nghỉ mà chưa ai thay thì vắng)
    const absent = (id: number) => restingOn(b, id, s.day) || (b.event?.kind === 'calloff' && b.event.staffId === id && !b.event.covered);
    const want = b.staff.filter((st) => (st.role === 'cashier' || st.role === 'guard') && onShift(st, s.minutes) && !absent(st.id));
    // Mỗi vai trò chỉ cần một người đứng chỗ
    const shown = [want.find((st) => st.role === 'cashier'), want.find((st) => st.role === 'guard')].filter(Boolean) as typeof want;
    const ids = new Set(shown.map((st) => st.id));
    for (const [id, w] of this.staff) if (!ids.has(id)) { this.remove(w); this.staff.delete(id); }
    for (const st of shown) {
      if (this.staff.has(st.id)) continue;
      const role = ROLES[st.role];
      const w = new Walker(role.color, undefined, st.role === 'cashier' ? 'cashier' : 'stocker', role.archetype);
      const spot = st.role === 'cashier' ? CASHIER_SPOT : GUARD_SPOT;
      w.position.copy(spot);
      w.mesh.rotation.y = 0; // nhìn ra phía cửa (+z)
      w.setBadge(role.icon);
      this.scene.add(w.mesh);
      this.staff.set(st.id, w);
    }
    for (const w of this.staff.values()) w.step(gameDt);

    // Khách ghé theo lưu lượng giờ này (đông thì nhiều người), tối đa vài người cùng lúc cho nhẹ máy
    this.spawnIn -= gameDt;
    if (this.spawnIn <= 0 && this.shoppers.length < 6) {
      this.spawnIn = 60 / Math.max(2, branchTrafficAt(s.minutes)) * (0.6 + Math.random() * 0.8);
      if (gameDt > 0) this.spawnShopper();
    }
    for (const w of this.shoppers) w.step(gameDt);
    this.shoppers = this.shoppers.filter((w) => {
      if (w.idle) { this.remove(w); return false; }
      return true;
    });
  }

  private spawnShopper() {
    const w = new Walker(pick(COLORS), Math.random() < 0.3 ? pick(COLORS) : undefined);
    const fromLeft = Math.random() < 0.5;
    const roadZ = CONVENIENCE.z + CONVENIENCE.depth / 2 + 3.5;
    w.position.set(CONVENIENCE.x + (fromLeft ? -14 : 14), 0, roadZ);
    this.scene.add(w.mesh);
    const aisle = pick(AISLES);
    const leaveTo = new THREE.Vector3(CONVENIENCE.x + (Math.random() < 0.5 ? -14 : 14), 0, roadZ);
    w.path = [DOOR_OUT.clone(), DOOR_IN.clone(), aisle.clone()];
    w.plan = [
      () => { w.pause = 2 + Math.random() * 2; },
      () => { w.path = [PAY_SPOT.clone()]; },
      () => { w.pause = 2; w.say(Math.random() < 0.5 ? '🛒' : '💵'); },
      () => { w.path = [DOOR_IN.clone(), DOOR_OUT.clone(), leaveTo]; },
    ];
    this.shoppers.push(w);
  }

  private remove(w: Walker) {
    this.scene.remove(w.mesh);
    w.dispose();
  }

  private clear() {
    for (const w of this.staff.values()) this.remove(w);
    for (const w of this.shoppers) this.remove(w);
    this.staff.clear();
    this.shoppers = [];
  }
}
