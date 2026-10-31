import * as THREE from 'three';
import { useGame } from '../core/store';
import { furnitureDef, isCookStation } from '../data/furniture';
import { houseById, houseDoor } from '../data/phoneOrders';
import { missingForOrder, partyOrderById } from '../data/orders';
import { productById, unlockedProducts } from '../data/products';
import {
  DIRT_PER_SWEEP, MANAGER_CHECKS, MANAGER_LOW_STOCK, MANAGER_TARGET, ROLES, SHIFTS, type Staff,
} from '../data/staff';
import { workSpeed } from '../data/staffTraits';
import { orderTotal, SUPPLIERS, supplierSells } from '../data/suppliers';
import type { Counter, GroceryShop } from '../shop/groceryShop';
import type { NavGrid } from '../world/navGrid';
import { Walker, RIDE_SPEED } from './walker';
import { simRng } from '../core/rand';
import { noteStaffTime } from '../core/slices/staffDay';

const SIDEWALK_Z = 2.2;
const EDGE_X = 38;
/** Kệ vơi đi từng này món thì nhân viên đi bổ sung. */
const RESTOCK_MISSING = 2;

type State = 'arriving' | 'working' | 'leaving';

class Worker extends Walker {
  state: State = 'arriving';
  /** Tầng kệ đang bổ sung ("uid:tầng"), để 2 người không làm trùng. */
  job: string | null = null;
  /** Quầy thu ngân đang phụ trách. */
  post: string | null = null;
  /** Đang đứng không chờ việc (GĐ246): work() vừa xét xong và không tìm được việc — dùng để đếm thời gian rảnh. */
  idlePause = false;
  /** Chỗ đứng ở quầy (0 = sau quầy, 1 = đứng cạnh phụ người thứ nhất). */
  slot = 0;
  /** Xe máy giao hàng (chỉ nhân viên giao hàng): hiện khi đang chở hàng đi giao. */
  readonly scooter?: THREE.Group;

  /** Lên/xuống xe: ngồi dáng ngồi thật và chạy nhanh hơn lúc có xe. */
  ride(on: boolean) {
    this.riding = on;
    this.speed = on ? RIDE_SPEED : 1.6;
  }

  constructor(public staff: Staff, x: number) {
    const role = ROLES[staff.role];
    super(role.color, undefined, staff.role === 'cashier' ? 'cashier' : 'stocker', role.archetype);
    this.mesh.position.set(x, 0, SIDEWALK_Z);
    this.setBadge(ROLES[staff.role].icon);
    if (staff.role === 'courier') {
      this.scooter = createScooter();
      this.scooter.visible = false;
      this.mesh.add(this.scooter);
    }
  }
}

/**
 * Xe máy giao hàng mini chibi: thân, yên, hai bánh, tay lái, đèn trước và thùng hàng sau yên.
 * Gắn làm con của nhân vật nên đi theo hướng nhìn — trông như đang ngồi trên xe.
 */
function createScooter(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x2f6fb2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2d2d38 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22 });
  for (const z of [0.34, -0.3]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.09, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.19, z);
    wheel.castShadow = true;
    g.add(wheel);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.72), body);
  frame.position.set(0, 0.3, 0);
  frame.castShadow = true;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.34), dark);
  seat.position.set(0, 0.4, -0.04);
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), body);
  column.position.set(0, 0.42, 0.3);
  column.rotation.x = 0.25;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), dark);
  bar.position.set(0, 0.6, 0.36);
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe9a8, emissiveIntensity: 0.7 }));
  light.position.set(0, 0.55, 0.42);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), new THREE.MeshStandardMaterial({ color: 0x18a86b }));
  box.position.set(0, 0.52, -0.32);
  box.castShadow = true;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.32), dark);
  strap.position.set(0, 0.66, -0.32);
  g.add(frame, seat, column, bar, light, box, strap);
  return g;
}

/** Nhân viên tự đến theo ca, làm việc theo vai trò, hết ca thì về. */
export class StaffManager {
  workers = new Map<number, Worker>();

  constructor(private scene: THREE.Scene, private grid: NavGrid, private shop: GroceryShop) {}

  update(gameDt: number, playerAtCounter: boolean) {
    const s = useGame.getState();
    const hired = new Set(s.staff.map((st) => st.id));

    for (const st of s.staff) {
      const shift = SHIFTS[st.shift];
      // Làm thêm giờ: hết ca mà tiệm còn khách chưa thanh toán thì ở lại tính tiền nốt
      // (chỉ tính từ buổi tối, chốt muộn nhất 23h30 — sau đó khách lì lợn quá cũng phải để mai)
      const overtime = s.customersInside > 0 && s.minutes >= 20 * 60 && s.minutes < 23.5 * 60;
      const onDuty = (s.minutes >= shift.from && s.minutes < shift.to) || overtime;
      const w = this.workers.get(st.id);
      if (w) w.staff = st;
      if (onDuty && !w) this.arrive(st);
      if (!onDuty && w && w.state !== 'leaving') this.leave(w);
    }

    for (const [id, w] of this.workers) {
      if (!hired.has(id) && w.state !== 'leaving') {
        w.say('👋');
        this.leave(w);
      }
      w.step(gameDt);
      if (w.state === 'working' && w.idle) this.work(w, gameDt);
      // GĐ246: đếm thời gian trong ca — "rảnh" khi lượt xét gần nhất của work() không tìm được việc
      if (w.state === 'working') noteStaffTime(w.staff.id, gameDt, w.idlePause);
      if (w.state === 'leaving' && w.idle) {
        this.scene.remove(w.mesh);
        w.dispose();
        this.workers.delete(id);
      }
    }

    // Thu ngân vào quầy thì mở cửa; hết thu ngân (và người chơi không ở quầy) thì đóng cửa
    if (s.autoOpen) {
      const cashier = this.cashierSpeed() > 0;
      // Chỉ xét lúc thu ngân vừa vào / vừa rời quầy, để người chơi vẫn tự đóng mở được
      if (cashier && !this.hadCashier && !s.shopOpen) s.toggleShop();
      if (!cashier && this.hadCashier && s.shopOpen && !playerAtCounter) s.toggleShop();
      this.hadCashier = cashier;
    }

    // Xe máy giao hàng đỗ sẵn trên vỉa hè: hiện khi có nhân viên giao hàng làm việc và không đang chạy đơn
    const hasCourier = [...this.workers.values()].some((w) => w.staff.role === 'courier' && w.state === 'working');
    if (hasCourier) {
      const sc = this.parkedScooter ??= (() => {
        const sc = createScooter();
        const d = this.shop.doorOutside;
        sc.position.set(d.x + 1.8, 0, SIDEWALK_Z + 0.5);
        sc.rotation.y = Math.PI / 2; // dựng dọc theo vỉa hè
        this.scene.add(sc);
        return sc;
      })();
      sc.visible = !this.delivering;
    } else if (this.parkedScooter) {
      this.parkedScooter.visible = false;
    }
  }

  private hadCashier = false;
  /** Đang có người mang đơn đi giao. */
  private delivering = false;
  /** Xe máy đỗ trước tiệm của nhân viên giao hàng (dựng lười lúc có người nhận vai này). */
  private parkedScooter: THREE.Group | null = null;
  /** Các lượt kiểm kho của quản lý đã làm ("ngày:giờ"). */
  private managerChecks = new Set<string>();

  /** Có bảo vệ đang đứng trực ở cửa. */
  guardOnDuty() {
    for (const w of this.workers.values()) {
      if (w.staff.role === 'guard' && w.state === 'working' && !w.path.length && w.position.distanceTo(this.shop.doorInside) < 1.5) return true;
    }
    return false;
  }

  /** Tốc độ tính tiền của người đang đứng ở một quầy (hoặc quầy bất kỳ); 0 nếu không có ai. Quản lý cũng hỗ trợ tính tiền. */
  cashierSpeed(counter?: Counter) {
    let best = 0;
    const counters = counter ? [counter] : this.shop.counters();
    for (const ct of counters) {
      // Một quầy chứa được 2 người: người giỏi nhất tính tiền, người thứ hai phụ gói hàng (+50% tốc độ của họ)
      const speeds: number[] = [];
      for (const w of this.workers.values()) {
        if ((w.staff.role !== 'cashier' && w.staff.role !== 'manager') || w.state !== 'working' || w.path.length || w.post !== ct.key) continue;
        if (w.position.distanceTo(this.cashierSpot(ct, w.slot)) < 0.6) speeds.push(workSpeed(w.staff));
      }
      speeds.sort((a, b) => b - a);
      best = Math.max(best, (speeds[0] ?? 0) + 0.5 * (speeds[1] ?? 0));
    }
    return best;
  }

  /** Đứng ở quầy thì quay mặt về phía quầy và khách (hướng hàng chờ), không quay lưng hay quay vào nhau. */
  private faceCustomers(w: Worker, dt: number) {
    const ct = this.shop.counters().find((it) => it.key === w.post);
    if (!ct) return;
    const target = Math.atan2(ct.dir[0], ct.dir[1]);
    let diff = target - w.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    w.mesh.rotation.y += diff * Math.min(1, Math.max(dt, 0.05) * 14);
  }

  /** Chỗ đứng của người thứ `slot` (0/1) ở một quầy: mỗi người đứng sau một máy tính tiền, lệch ±0.4 so với giữa quầy. */
  private cashierSpot(ct: Counter, slot: number) {
    return ct.cashier.clone().add(new THREE.Vector3(-ct.dir[1], 0, ct.dir[0]).multiplyScalar(slot === 0 ? 0.4 : -0.4));
  }

  /** Nhận quầy còn chỗ (quầy vắng nhất trước, tối đa 2 người/quầy); trả về chỗ đứng hoặc null nếu quầy nào cũng đủ người. */
  private claimPost(w: Worker) {
    const counters = this.shop.counters();
    let ct = counters.find((it) => it.key === w.post);
    if (!ct) {
      const mates = (c: Counter) => [...this.workers.values()].filter((o) => o !== w && o.post === c.key);
      ct = counters.map((c) => ({ c, n: mates(c).length })).filter((x) => x.n < 2).sort((a, b) => a.n - b.n)[0]?.c;
      w.post = ct?.key ?? null;
      if (ct) w.slot = mates(ct).some((o) => o.slot === 0) ? 1 : 0;
    }
    return ct ? this.cashierSpot(ct, w.slot) : null;
  }

  /** Có thu ngân thật đang đứng ở quầy nào không (quản lý hỗ trợ không tính). */
  private hasCashier() {
    for (const w of this.workers.values()) {
      if (w.staff.role !== 'cashier' || w.state !== 'working' || w.path.length) continue;
      if (this.shop.counters().some((ct) => ct.key === w.post && w.position.distanceTo(this.cashierSpot(ct, w.slot)) < 0.6)) return true;
    }
    return false;
  }

  private arrive(st: Staff) {
    // Phụ trại làm việc ở trang trại (tưới/cho ăn/thu hoạch qua cuối ngày), không xuất hiện trong tiệm
    if (st.role === 'farmhand') {
      const w = new Worker(st, 0);
      w.mesh.visible = false;
      w.state = 'working';
      this.workers.set(st.id, w);
      return;
    }
    const door = this.shop.doorOutside;
    const w = new Worker(st, door.x + (simRng()() < 0.5 ? -EDGE_X : EDGE_X) * 0.3);
    this.workers.set(st.id, w);
    this.scene.add(w.mesh);
    this.walk(w, door);
    w.plan.push(() => this.walk(w, this.shop.doorInside));
    w.plan.push(() => {
      w.state = 'working';
      w.say('👋');
    });
  }

  private leave(w: Worker) {
    if (w.staff.role === 'courier') this.delivering = false;
    if (w.scooter) w.scooter.visible = false;
    w.ride(false);
    w.state = 'leaving';
    w.job = null;
    w.post = null;
    w.pause = 0;
    this.walk(w, this.shop.doorInside);
    w.plan = [
      () => this.walk(w, this.shop.doorOutside),
      () => this.walk(w, new THREE.Vector3(w.position.x + EDGE_X * 0.3, 0, SIDEWALK_Z)),
    ];
  }

  /** Nhân viên đang rảnh: tìm việc tiếp theo. */
  private work(w: Worker, gameDt: number) {
    // GĐ246: lượt xét mới — mặc định coi là có việc; các nhánh "không có việc" underneath sẽ bật lại
    w.idlePause = false;
    // Phụ trại không có việc trong tiệm — mọi hiệu ứng chạy ở cuối ngày (endDay)
    if (w.staff.role === 'farmhand') {
      w.idlePause = true;
      w.pause = Math.max(gameDt, 5);
      return;
    }
    if (w.staff.role === 'cashier') {
      // Nhận quầy vắng nhất (quầy chính trước); hết quầy vắng thì đứng đôi ở một quầy
      const spot = this.claimPost(w);
      if (spot && w.position.distanceTo(spot) > 0.3) this.walk(w, spot);
      else if (spot) this.faceCustomers(w, gameDt);
      return;
    }
    if (w.staff.role === 'cleaner') return this.sweep(w, gameDt);
    if (w.staff.role === 'guard') return this.standGuard(w, gameDt);
    if (w.staff.role === 'courier') return this.courier(w, gameDt);
    if (w.staff.role === 'manager') return this.manage(w, gameDt);
    // Đầu bếp: đứng canh trạm nấu — các mẻ đang nấu chạy nhanh hơn theo tay nghề (xem store.cookSpeed)
    if (w.staff.role === 'cook') return this.watchStove(w, gameDt);
    // Pha chế: đứng canh quầy pha — mẻ trạm pha chế nhanh thêm theo tay nghề (xem store.bartenderBoost)
    if (w.staff.role === 'bartender') {
      const bar = useGame.getState().furniture.filter((f) => f.type === 'drink_counter');
      if (bar.length) return this.watchStove(w, gameDt, bar);
      // Chưa mua quầy pha thì tạm bày hàng như xếp hàng
    }
    // Bán thịt cá: đứng canh quầy thịt cá (hiệu ứng khách mua thêm xem customers.ts / data/meat.ts)
    if (w.staff.role === 'butcher') {
      const counters = useGame.getState().furniture.filter((f) => f.type === 'meat_counter');
      if (counters.length) return this.watchStove(w, gameDt, counters);
    }
    // Chăm sóc khách: đi lại hỏi thăm khách đang chờ (hiệu ứng kiên nhẫn xem customers.ts)
    if (w.staff.role === 'customer_care') return this.care(w, gameDt);

    // Xếp hàng: tìm tầng kệ vơi mà kho còn hàng
    const s = useGame.getState();
    const taken = new Set([...this.workers.values()].map((it) => it.job));
    for (const f of s.furniture) {
      const def = furnitureDef(f.type);
      if (!def.tiers) continue;
      const t = f.tiers.findIndex(
        (tier, i) => tier.productId && tier.count <= def.capacity - RESTOCK_MISSING && (s.storage[tier.productId] ?? 0) > 0 && !taken.has(`${f.uid}:${i}`),
      );
      if (t < 0) continue;
      w.job = `${f.uid}:${t}`;
      // Đi qua cửa sau vào kho lấy thùng (đứng bàn nhận hàng) rồi mới ra bày kệ
      this.walk(w, this.shop.warehousePickup);
      w.plan.push(() => {
        w.pause = 1.4 / workSpeed(w.staff);
        w.working = true; // dáng cầm/nâng thùng tại bàn nhận hàng
      });
      w.plan.push(() => this.walk(w, this.shop.spotFor(f)));
      w.plan.push(() => {
        w.pause = 3 / workSpeed(w.staff);
        w.working = true; // dáng bày hàng tại chỗ trong lúc xếp
      });
      w.plan.push(() => {
        const cur = useGame.getState().furniture.find((it) => it.uid === f.uid);
        const tier = cur?.tiers[t];
        if (cur && tier?.productId) {
          useGame.getState().stockTier(cur.uid, t, tier.productId);
          w.say('📦');
        }
        w.working = false;
        w.job = null;
      });
      return;
    }
    // Kệ bán hết sạch mà kho cũng hết món đó (và không có hàng đang về): tự thay món khác kho còn
    if (s.autoSwap) {
      const incoming = new Set(s.deliveries.flatMap((d) => Object.keys(d.items)));
      for (const f of s.furniture) {
        const def = furnitureDef(f.type);
        if (!def.tiers) continue;
        const t = f.tiers.findIndex(
          (tier, i) => tier.productId && tier.count <= 0 && !(s.storage[tier.productId] ?? 0) && !incoming.has(tier.productId) && !taken.has(`${f.uid}:${i}`),
        );
        if (t < 0) continue;
        const old = f.tiers[t].productId!;
        // Món thay: đúng loại kệ và kho còn; ưu tiên món chưa bày ở đâu trong tiệm, rồi món kho còn nhiều nhất
        const shown = new Set(s.furniture.flatMap((it) => it.tiers.filter((x) => x.count > 0).map((x) => x.productId)));
        const pick = unlockedProducts(s.level)
          .filter((p) => def.categories.includes(p.category) && (s.storage[p.id] ?? 0) > 0)
          .sort((a, b) => Number(shown.has(a.id)) - Number(shown.has(b.id)) || (s.storage[b.id] ?? 0) - (s.storage[a.id] ?? 0))[0];
        if (!pick) continue;
        w.job = `${f.uid}:${t}`;
        this.walk(w, this.shop.spotFor(f));
        w.plan.push(() => (w.pause = 3 / workSpeed(w.staff)));
        w.plan.push(() => {
          const now = useGame.getState();
          const cur = now.furniture.find((it) => it.uid === f.uid);
          const tier = cur?.tiers[t];
          // Đến nơi mà kệ đã được bày lại (nhập hàng về giữa chừng) hay kho hết nốt món định thay thì thôi
          if (cur && tier && tier.productId === old && tier.count <= 0 && (now.storage[pick.id] ?? 0) > 0) {
            useGame.getState().stockTier(cur.uid, t, pick.id);
            w.say('🔄');
            useGame.getState().notify(`🔄 ${w.staff.name} thay ô hết hàng: ${productById(old).name} → ${pick.name}`);
          }
          w.job = null;
        });
        return;
      }
    }
    // Không có việc: đứng chờ một lát rồi kiểm tra lại
    w.idlePause = true;
    w.pause = Math.max(gameDt, 2);
  }

  /** Đầu bếp/pha chế: tới đứng cạnh trạm nấu còn bỏ trống; mẻ nào xong thì bưng xuống kho. */
  private watchStove(w: Worker, gameDt: number, stations = useGame.getState().furniture.filter((f) => isCookStation(f.type))) {
    if (!stations.length) {
      w.idlePause = true;
      w.pause = Math.max(gameDt, 5);
      return;
    }
    const taken = new Set([...this.workers.values()].filter((it) => it !== w).map((it) => it.post));
    const free = stations.find((f) => !taken.has(`stove:${f.uid}`));
    const post = free ?? stations[0];
    w.post = `stove:${post.uid}`;
    const spot = this.shop.spotFor(post, (simRng()() - 0.5) * 0.4);
    if (w.position.distanceTo(spot) > 0.3) this.walk(w, spot);
    else if (useGame.getState().cookJobs.length) w.pause = Math.max(gameDt, 2);
    else {
      w.idlePause = true; // đứng cạnh bếp mà không có mẻ nào đang nấu
      w.pause = Math.max(gameDt, 4);
    }
  }

  /** Lao công: sàn có bẩn thì tới một chỗ ngẫu nhiên lau, sạch rồi thì nghỉ. */
  private sweep(w: Worker, gameDt: number) {
    const s = useGame.getState();
    if (s.dirt < 3) {
      w.idlePause = true; // sàn sạch, không có gì lau
      w.pause = Math.max(gameDt, 4);
      return;
    }
    const spots = s.furniture.map((f) => this.shop.spotFor(f, (simRng()() - 0.5) * 0.8));
    this.walk(w, spots.length ? spots[Math.floor(simRng()() * spots.length)] : this.shop.doorInside);
    w.plan.push(() => (w.pause = 2.5 / workSpeed(w.staff)));
    w.plan.push(() => {
      useGame.getState().addDirt(-DIRT_PER_SWEEP * workSpeed(w.staff));
      w.say('🧹', 1.5);
    });
  }

  /** Bảo vệ: đứng ngay trong cửa canh khách ra vào. */
  private standGuard(w: Worker, gameDt: number) {
    const post = this.shop.doorInside.clone().add(new THREE.Vector3(0.9, 0, -0.4));
    if (w.position.distanceTo(post) > 0.3) this.walk(w, post);
    else w.pause = Math.max(gameDt, 3);
  }

  /** Giao hàng: đơn tiệc đã nhận và kho đủ hàng thì mang đi giao, về tới tiệm mới tính tiền. */
  private courier(w: Worker, gameDt: number) {
    const s = useGame.getState();
    // Chỗ đứng chờ khi rảnh: cạnh cửa, bên trong — không chắn giữa lối ra vào
    const idlePost = this.shop.doorInside.clone().add(new THREE.Vector3(1.4, 0, -1.1));
    // Đơn gọi điện đã soạn hàng: chở tới tận cửa nhà khách trong hẻm
    const call = !this.delivering && s.phoneOrders.find((o) => o.status === 'carrying');
    const house = call && houseById(call.houseId);
    if (call && house) {
      this.delivering = true;
      w.say('🛵');
      s.notify(`🛵 ${w.staff.name} chở hàng tới ${house.name} cho ${call.caller}`);
      const door = houseDoor(house);
      this.walk(w, this.shop.doorInside);
      w.plan.push(() => this.walk(w, this.shop.doorOutside));
      // Ra tới vỉa hè mới lên xe (trong tiệm thì dắt bộ)
      w.plan.push(() => {
        if (w.scooter) w.scooter.visible = true;
        w.ride(true);
        this.walk(w, new THREE.Vector3(door.x, 0, SIDEWALK_Z));
      });
      w.plan.push(() => this.walk(w, new THREE.Vector3(door.x, 0, door.z)));
      w.plan.push(() => {
        if (useGame.getState().deliverPhone(call.id)) w.say('✅');
        w.pause = 2 / workSpeed(w.staff);
      });
      w.plan.push(() => this.walk(w, new THREE.Vector3(door.x, 0, SIDEWALK_Z)));
      w.plan.push(() => {
        // Về tới tiệm thì xuống xe, dắt vào trong
        if (w.scooter) w.scooter.visible = false;
        w.ride(false);
        this.walk(w, this.shop.doorOutside);
      });
      w.plan.push(() => this.walk(w, this.shop.doorInside));
      w.plan.push(() => this.walk(w, idlePost));
      w.plan.push(() => (this.delivering = false));
      return;
    }
    const def = s.order?.accepted ? partyOrderById(s.order.id) : undefined;
    if (this.delivering || !def || missingForOrder(def, s.storage).length) {
      // Rảnh: đứng chờ ở chỗ quen cạnh cửa, khỏi chắn lối khách ra vào
      w.idlePause = true; // GĐ246: không có đơn nào để đi giao
      if (w.position.distanceTo(idlePost) > 0.4) this.walk(w, idlePost);
      else w.pause = Math.max(gameDt, 5);
      return;
    }
    this.delivering = true;
    w.say('🛵');
    s.notify(`🛵 ${w.staff.name} mang đơn "${def.title}" đi giao cho ${def.from}`);
    this.walk(w, this.shop.doorInside);
    w.plan.push(() => this.walk(w, this.shop.doorOutside));
    w.plan.push(() => {
      if (w.scooter) w.scooter.visible = true;
      w.ride(true);
      this.walk(w, new THREE.Vector3(this.shop.doorOutside.x + EDGE_X * 0.5, 0, SIDEWALK_Z));
    });
    w.plan.push(() => (w.pause = 12 / workSpeed(w.staff)));
    w.plan.push(() => {
      if (w.scooter) w.scooter.visible = false;
      w.ride(false);
      this.walk(w, this.shop.doorOutside);
    });
    w.plan.push(() => this.walk(w, this.shop.doorInside));
    w.plan.push(() => this.walk(w, idlePost));
    w.plan.push(() => {
      this.delivering = false;
      if (useGame.getState().deliverOrder()) w.say('✅');
    });
  }

  /** Chăm sóc khách: đi lại giữa các quầy hỏi thăm khách đang chờ, vắng khách thì đứng cạnh cửa chào. */
  private care(w: Worker, gameDt: number) {
    const spots = [
      ...this.shop.counters().map((ct) => ct.center.clone().add(new THREE.Vector3(1, 0, 0.7))),
      this.shop.doorInside.clone().add(new THREE.Vector3(0.8, 0, -0.5)),
    ];
    this.walk(w, spots[Math.floor(simRng()() * spots.length)]);
    w.plan.push(() => (w.pause = 3 / workSpeed(w.staff)));
    w.plan.push(() => {
      if (useGame.getState().waiting > 0) w.say('💬', 2);
    });
  }

  /** Quản lý: tới giờ kiểm kho thì đặt thêm món sắp hết; vắng thu ngân thì đứng vào quầy tính tiền giúp. */
  private manage(w: Worker, gameDt: number) {
    const s = useGame.getState();
    // Không có thu ngân ở quầy nào: quản lý tạm trực quầy (kể cả tiệm đang đóng — có người ở quầy thì cửa tự mở),
    // có thu ngân về thì nhường lại
    if (!this.hasCashier()) {
      const spot = this.claimPost(w);
      if (spot && w.position.distanceTo(spot) > 0.3) this.walk(w, spot);
      else if (spot) this.faceCustomers(w, gameDt);
      return;
    }
    w.post = null;
    for (const t of MANAGER_CHECKS) {
      const key = `${s.day}:${t}`;
      if (s.minutes < t || this.managerChecks.has(key)) continue;
      this.managerChecks.add(key);
      this.walk(w, this.shop.doorInside);
      w.plan.push(() => (w.pause = 2));
      w.plan.push(() => {
        const ordered = this.restock();
        w.say(ordered ? '📋' : '👌', 2);
      });
      return;
    }
    const main = this.shop.counters()[0];
    const spot = main ? main.center.clone().add(new THREE.Vector3(1.2, 0, 0.6)) : this.shop.doorInside;
    if (w.position.distanceTo(spot) > 0.5) this.walk(w, spot);
    else {
      w.idlePause = true; // GĐ246: hết giờ kiểm kho, không phải trực quầy thay — đứng nghỉ
      w.pause = Math.max(gameDt, 4);
    }
  }

  /** Đặt thêm các món đang bày mà kho (kể cả hàng đang về) sắp cạn; mối rẻ nhất trước, đại lý gần nhà lo phần còn lại. */
  private restock() {
    const s = useGame.getState();
    const pending: Record<string, number> = {};
    for (const d of s.deliveries) for (const [id, q] of Object.entries(d.items)) pending[id] = (pending[id] ?? 0) + q;
    const shelved = [...new Set(s.furniture.flatMap((f) => f.tiers.map((t) => t.productId).filter((id): id is string => !!id)))];
    // Chỉ tự đặt lại món tiệm đã bán qua ít nhất một lần: món mới do chủ tự quyết định nhập thử
    const everSold = (id: string) => (s.sales[id] ?? 0) > 0 || (s.salesToday[id] ?? 0) > 0;
    let need: Record<string, number> = {};
    for (const id of shelved) {
      if (!everSold(id)) continue;
      const have = (s.storage[id] ?? 0) + (pending[id] ?? 0);
      if (have < MANAGER_LOW_STOCK) need[id] = MANAGER_TARGET - have;
    }
    if (!Object.keys(need).length) return false;
    const suppliers = SUPPLIERS.filter((sup) => sup.unlock <= s.level).sort((a, b) => b.discount - a.discount);
    // Món đã hết sạch kho thì phải lấy mối có hàng ngay; món chỉ vơi mới chờ mối rẻ giao sáng mai
    const empty = (id: string) => !(s.storage[id] ?? 0) && !pending[id];
    const passes = [
      ...suppliers.filter((it) => it.delayDays === 0).map((sup) => ({ sup, only: empty })),
      ...suppliers.map((sup) => ({ sup, only: (id: string) => !empty(id) || sup.delayDays === 0 })),
    ];
    let placed = false;
    for (const { sup, only } of passes) {
      const lines = Object.fromEntries(Object.entries(need).filter(([id]) => only(id) && supplierSells(sup, id)));
      if (!Object.keys(lines).length || orderTotal(sup, lines, s.day) < sup.minOrder) continue;
      if (!useGame.getState().placeOrder(sup.id, lines)) continue;
      placed = true;
      need = Object.fromEntries(Object.entries(need).filter(([id]) => !(id in lines)));
      if (!Object.keys(need).length) break;
    }
    if (Object.keys(need).length) {
      s.notify(`📋 Quản lý chưa đặt được: ${Object.keys(need).map((id) => productById(id).name).join(', ')}`);
    }
    return placed;
  }

  private walk(w: Worker, target: THREE.Vector3) {
    const path = this.grid.findPath(w.position, target);
    w.path = path.length ? path : this.grid.approach(w.position, target);
  }

  /** Xoá hết nhân viên đang ở trên bản đồ (sang ngày mới). */
  reset() {
    for (const w of this.workers.values()) {
      this.scene.remove(w.mesh);
      w.dispose();
    }
    this.workers.clear();
    this.hadCashier = false;
    this.delivering = false;
  }
}
