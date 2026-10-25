import * as THREE from 'three';
import { useGame } from '../core/store';
import { furnitureDef, isCookStation } from '../data/furniture';
import { houseById, houseDoor } from '../data/phoneOrders';
import { missingForOrder, partyOrderById } from '../data/orders';
import { productById } from '../data/products';
import {
  DIRT_PER_SWEEP, MANAGER_CHECKS, MANAGER_LOW_STOCK, MANAGER_TARGET, ROLES, SHIFTS, type Staff,
} from '../data/staff';
import { workSpeed } from '../data/staffTraits';
import { orderTotal, SUPPLIERS, supplierSells } from '../data/suppliers';
import type { Counter, GroceryShop } from '../shop/groceryShop';
import type { NavGrid } from '../world/navGrid';
import { Walker } from './walker';

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

  constructor(public staff: Staff, x: number) {
    const role = ROLES[staff.role];
    super(role.color, undefined, staff.role === 'cashier' ? 'cashier' : 'stocker', role.archetype);
    this.mesh.position.set(x, 0, SIDEWALK_Z);
    this.setBadge(ROLES[staff.role].icon);
  }
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
  }

  private hadCashier = false;
  /** Đang có người mang đơn tiệc đi giao. */
  private delivering = false;
  /** Các lượt kiểm kho của quản lý đã làm ("ngày:giờ"). */
  private managerChecks = new Set<string>();

  /** Có bảo vệ đang đứng trực ở cửa. */
  guardOnDuty() {
    for (const w of this.workers.values()) {
      if (w.staff.role === 'guard' && w.state === 'working' && !w.path.length && w.position.distanceTo(this.shop.doorInside) < 1.5) return true;
    }
    return false;
  }

  /** Tốc độ tính tiền của thu ngân đang đứng ở một quầy (hoặc quầy bất kỳ); 0 nếu không có ai. */
  cashierSpeed(counter?: Counter) {
    let best = 0;
    const counters = counter ? [counter] : this.shop.counters();
    for (const w of this.workers.values()) {
      if (w.staff.role !== 'cashier' || w.state !== 'working' || w.path.length) continue;
      const ct = counters.find((it) => it.key === w.post);
      if (ct && w.position.distanceTo(ct.cashier) < 0.6) best = Math.max(best, workSpeed(w.staff));
    }
    return best;
  }

  private arrive(st: Staff) {
    const door = this.shop.doorOutside;
    const w = new Worker(st, door.x + (Math.random() < 0.5 ? -EDGE_X : EDGE_X) * 0.3);
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
    if (w.staff.role === 'cashier') {
      const counters = this.shop.counters();
      let post = counters.find((ct) => ct.key === w.post);
      if (!post) {
        // Nhận quầy chưa có ai; quầy chính trước
        const taken = new Set([...this.workers.values()].filter((it) => it !== w).map((it) => it.post));
        post = counters.find((ct) => !taken.has(ct.key));
        w.post = post?.key ?? null;
      }
      if (post && w.position.distanceTo(post.cashier) > 0.3) this.walk(w, post.cashier);
      return;
    }
    if (w.staff.role === 'cleaner') return this.sweep(w, gameDt);
    if (w.staff.role === 'guard') return this.standGuard(w, gameDt);
    if (w.staff.role === 'courier') return this.courier(w, gameDt);
    if (w.staff.role === 'manager') return this.manage(w, gameDt);
    // Đầu bếp: đứng canh trạm nấu — các mẻ đang nấu chạy nhanh hơn theo tay nghề (xem store.cookSpeed)
    if (w.staff.role === 'cook') return this.watchStove(w, gameDt);

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
      this.walk(w, this.shop.spotFor(f));
      w.plan.push(() => (w.pause = 3 / workSpeed(w.staff)));
      w.plan.push(() => {
        const cur = useGame.getState().furniture.find((it) => it.uid === f.uid);
        const tier = cur?.tiers[t];
        if (cur && tier?.productId) {
          useGame.getState().stockTier(cur.uid, t, tier.productId);
          w.say('📦');
        }
        w.job = null;
      });
      return;
    }
    // Không có việc: đứng chờ một lát rồi kiểm tra lại
    w.pause = Math.max(gameDt, 2);
  }

  /** Đầu bếp: tới đứng cạnh trạm nấu đầu tiên còn bỏ trống; mẻ nào xong thì bưng xuống kho. */
  private watchStove(w: Worker, gameDt: number) {
    const s = useGame.getState();
    const stations = s.furniture.filter((f) => isCookStation(f.type));
    if (!stations.length) {
      w.pause = Math.max(gameDt, 5);
      return;
    }
    const taken = new Set([...this.workers.values()].filter((it) => it !== w).map((it) => it.post));
    const free = stations.find((f) => !taken.has(`stove:${f.uid}`));
    const post = free ?? stations[0];
    w.post = `stove:${post.uid}`;
    const spot = this.shop.spotFor(post, (Math.random() - 0.5) * 0.4);
    if (w.position.distanceTo(spot) > 0.3) this.walk(w, spot);
    else if (s.cookJobs.length) w.pause = Math.max(gameDt, 2);
    else w.pause = Math.max(gameDt, 4);
  }

  /** Lao công: sàn có bẩn thì tới một chỗ ngẫu nhiên lau, sạch rồi thì nghỉ. */
  private sweep(w: Worker, gameDt: number) {
    const s = useGame.getState();
    if (s.dirt < 3) {
      w.pause = Math.max(gameDt, 4);
      return;
    }
    const spots = s.furniture.map((f) => this.shop.spotFor(f, (Math.random() - 0.5) * 0.8));
    this.walk(w, spots.length ? spots[Math.floor(Math.random() * spots.length)] : this.shop.doorInside);
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
      w.plan.push(() => this.walk(w, new THREE.Vector3(door.x, 0, SIDEWALK_Z)));
      w.plan.push(() => this.walk(w, new THREE.Vector3(door.x, 0, door.z)));
      w.plan.push(() => {
        if (useGame.getState().deliverPhone(call.id)) w.say('✅');
        w.pause = 2 / workSpeed(w.staff);
      });
      w.plan.push(() => this.walk(w, new THREE.Vector3(door.x, 0, SIDEWALK_Z)));
      w.plan.push(() => this.walk(w, this.shop.doorOutside));
      w.plan.push(() => this.walk(w, this.shop.doorInside));
      w.plan.push(() => (this.delivering = false));
      return;
    }
    const def = s.order?.accepted ? partyOrderById(s.order.id) : undefined;
    if (this.delivering || !def || missingForOrder(def, s.storage).length) {
      w.pause = Math.max(gameDt, 5);
      return;
    }
    this.delivering = true;
    w.say('🛵');
    s.notify(`🛵 ${w.staff.name} mang đơn "${def.title}" đi giao cho ${def.from}`);
    this.walk(w, this.shop.doorInside);
    w.plan.push(() => this.walk(w, this.shop.doorOutside));
    w.plan.push(() => this.walk(w, new THREE.Vector3(this.shop.doorOutside.x + EDGE_X * 0.5, 0, SIDEWALK_Z)));
    w.plan.push(() => (w.pause = 12 / workSpeed(w.staff)));
    w.plan.push(() => this.walk(w, this.shop.doorOutside));
    w.plan.push(() => this.walk(w, this.shop.doorInside));
    w.plan.push(() => {
      this.delivering = false;
      if (useGame.getState().deliverOrder()) w.say('✅');
    });
  }

  /** Quản lý: tới giờ kiểm kho thì đặt thêm món sắp hết, còn lại đứng cạnh quầy. */
  private manage(w: Worker, gameDt: number) {
    const s = useGame.getState();
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
    else w.pause = Math.max(gameDt, 4);
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
    w.path = path.length ? path : [target.clone()];
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
