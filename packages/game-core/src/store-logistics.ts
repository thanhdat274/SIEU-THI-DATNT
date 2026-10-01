import {
  LogisticsPhase,
  LogisticsTruckType,
  LogisticsWorkerState,
  StorageType,
  StoreLogisticsEventState,
  StoreLogisticsState,
  TILE_SIZE,
  Vector2D,
} from '@game/shared';
import { LOADING_DOCK_CONFIG, LOGISTICS_TIMING, MAP_WIDTH, PRODUCT_MAP } from '@game/data';

export interface EnqueueDeliveryOptions {
  type: 'supplier_delivery' | 'outbound_party_order' | 'ambient_restock';
  products?: Array<{ productId: string; quantity: number }>;
  supplierName?: string;
  orderLabel?: string;
  onComplete?: () => void;
}

export class StoreLogisticsManager {
  private activeEvent: StoreLogisticsEventState | null = null;
  private queue: Array<EnqueueDeliveryOptions & { id: string }> = [];
  private ambientCooldown = 35; // giây trước chuyến xe chở hàng nền đầu tiên
  private phaseTimer = 0;
  private eventSequence = 0;
  private workerLeg: 'to_truck' | 'to_store' = 'to_truck';
  private onCompleteCallback?: () => void;

  public getActiveEvent(): StoreLogisticsEventState | null {
    return this.activeEvent ? { ...this.activeEvent, truckPosition: { ...this.activeEvent.truckPosition } } : null;
  }

  public getState(): StoreLogisticsState {
    return {
      activeEvent: this.getActiveEvent(),
      loadingDockLocation: {
        dockX: LOADING_DOCK_CONFIG.tileX * TILE_SIZE,
        dockY: LOADING_DOCK_CONFIG.tileY * TILE_SIZE,
        truckBayX: LOADING_DOCK_CONFIG.truckStopPosition.x,
        truckBayY: LOADING_DOCK_CONFIG.truckStopPosition.y,
      },
    };
  }

  /**
   * Đưa một chuyến xe giao hàng hoặc xuất hàng vào hàng đợi bốc dỡ thực tế.
   */
  public enqueueDelivery(opts: EnqueueDeliveryOptions): string {
    const id = `logistics_${++this.eventSequence}_${Date.now()}`;
    this.queue.push({ ...opts, id });
    if (!this.activeEvent) {
      this.startNextEvent();
    }
    return id;
  }

  private startNextEvent(): void {
    if (!this.queue.length) {
      this.activeEvent = null;
      return;
    }
    const item = this.queue.shift()!;
    this.onCompleteCallback = item.onComplete;

    // Xác định chủng loại xe tải dựa trên mặt hàng
    const truckType = this.determineTruckType(item.type, item.products ?? []);
    const productNames = (item.products ?? [])
      .map((p) => PRODUCT_MAP[p.productId]?.name ?? p.productId)
      .slice(0, 3);

    const totalQty = (item.products ?? []).reduce((acc, cur) => acc + cur.quantity, 0);
    const totalBoxes = Math.min(6, Math.max(2, Math.ceil(totalQty / 5) || 3));

    // Điểm bắt đầu lái vào: từ mép phải bản đồ chạy vào bãi đỗ ở góc đông
    const startX = MAP_WIDTH * TILE_SIZE + 60;
    const startY = LOADING_DOCK_CONFIG.truckStopPosition.y;

    const boxType = truckType === 'truck_refrigerated'
      ? 'foam_cold'
      : truckType === 'truck_fresh_produce'
      ? 'produce_crate'
      : 'carton';

    this.activeEvent = {
      id: item.id,
      type: item.type,
      truckType,
      truckPosition: { x: startX, y: startY },
      direction: 'left',
      doorsOpen: false,
      phase: 'approaching',
      totalBoxes,
      boxesRemaining: item.type === 'outbound_party_order' ? 0 : totalBoxes,
      statusText: item.type === 'outbound_party_order'
        ? `Xe xuất hàng đơn tiệc đang tiến vào bãi bốc dỡ`
        : `Xe giao hàng ${item.supplierName ?? 'Đại lý'} đang tiến vào bãi`,
      productNames,
      worker: {
        id: `worker_${item.id}`,
        x: LOADING_DOCK_CONFIG.storeEntrancePosition.x,
        y: LOADING_DOCK_CONFIG.storeEntrancePosition.y,
        direction: 'right',
        carryingBox: item.type === 'outbound_party_order',
        boxType,
        target: 'truck',
      },
    };

    this.phaseTimer = 0;
    this.workerLeg = 'to_truck';
  }

  private determineTruckType(
    type: 'supplier_delivery' | 'outbound_party_order' | 'ambient_restock',
    products: Array<{ productId: string; quantity: number }>
  ): LogisticsTruckType {
    if (type === 'outbound_party_order') {
      return 'truck_heavy_container';
    }

    const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);
    if (totalQty >= 30) {
      return 'truck_heavy_container';
    }

    const storages = new Set<string>();
    for (const p of products) {
      const prod = PRODUCT_MAP[p.productId];
      if (prod) storages.add(prod.storageType);
    }

    if (storages.has('cold')) {
      return 'truck_refrigerated';
    }

    // Kiểm tra rau củ quả / đồ tươi / bánh
    const hasProduce = products.some((p) => {
      const cat = PRODUCT_MAP[p.productId]?.category;
      return cat === 'bread' || p.productId.includes('rau') || p.productId.includes('trai_cay');
    });
    if (hasProduce) return 'truck_fresh_produce';

    // Nước ngọt / bánh kẹo
    const hasSweets = products.some((p) => {
      const cat = PRODUCT_MAP[p.productId]?.category;
      return cat === 'snacks' || cat === 'candy' || cat === 'soft_drinks';
    });
    if (hasSweets && Math.random() < 0.6) return 'truck_beverage_sweets';

    return 'truck_dry_goods';
  }

  public update(dt: number, hour: number): void {
    if (!this.activeEvent) {
      // Kiểm tra phát sinh giao nhận ngẫu nhiên theo khung giờ
      this.ambientCooldown -= dt;
      if (this.ambientCooldown <= 0) {
        this.checkAmbientRestock(hour);
        this.ambientCooldown = 45 + Math.random() * 40;
      }
      return;
    }

    const ev = this.activeEvent;
    this.phaseTimer += dt;

    if (ev.phase === 'approaching') {
      const targetX = LOADING_DOCK_CONFIG.truckStopPosition.x;
      const speed = 120; // px/s
      if (ev.truckPosition.x > targetX) {
        ev.truckPosition.x = Math.max(targetX, ev.truckPosition.x - speed * dt);
      }
      if (ev.truckPosition.x <= targetX) {
        ev.truckPosition.x = targetX;
        ev.phase = 'docked';
        ev.doorsOpen = true;
        ev.statusText = `Xe đã cập bãi bốc dỡ, chuẩn bị chuyển hàng...`;
        this.phaseTimer = 0;
      }
    } else if (ev.phase === 'docked') {
      if (this.phaseTimer >= LOGISTICS_TIMING.doorsOpenDurationSec) {
        ev.phase = ev.type === 'outbound_party_order' ? 'loading' : 'unloading';
        this.phaseTimer = 0;
      }
    } else if (ev.phase === 'unloading') {
      this.stepUnloadingWorker(ev, dt);
    } else if (ev.phase === 'loading') {
      this.stepLoadingWorker(ev, dt);
    } else if (ev.phase === 'completed') {
      ev.doorsOpen = false;
      if (this.phaseTimer >= LOGISTICS_TIMING.completedPauseSec) {
        ev.phase = 'departing';
        ev.statusText = `Hoàn tất giao nhận. Xe xuất bến rời đi.`;
        this.phaseTimer = 0;
        this.onCompleteCallback?.();
        this.onCompleteCallback = undefined;
      }
    } else if (ev.phase === 'departing') {
      // Xe rẽ trái chạy xuôi đường về mép trái bản đồ
      ev.direction = 'left';
      const departSpeed = 85;
      ev.truckPosition.x -= departSpeed * dt;
      if (ev.truckPosition.x < -100) {
        this.startNextEvent();
      }
    }
  }

  private stepUnloadingWorker(ev: StoreLogisticsEventState, dt: number): void {
    if (!ev.worker) return;
    const worker = ev.worker;
    const walkSpeed = LOGISTICS_TIMING.workerWalkSpeed;

    const truckTail = LOADING_DOCK_CONFIG.truckTailPosition;
    const storeDoor = LOADING_DOCK_CONFIG.storeEntrancePosition;

    if (this.workerLeg === 'to_truck') {
      // Nhân viên đi từ cửa tiệm về phía đuôi xe tải
      const dx = truckTail.x - worker.x;
      const dy = truckTail.y - worker.y;
      const dist = Math.hypot(dx, dy);

      worker.carryingBox = false;
      worker.direction = dx > 0 ? 'right' : 'left';

      if (dist < 4) {
        worker.x = truckTail.x;
        worker.y = truckTail.y;
        worker.carryingBox = true;
        this.workerLeg = 'to_store';
        ev.statusText = `Đang bốc kiện hàng vào kho (${ev.totalBoxes - ev.boxesRemaining + 1}/${ev.totalBoxes})`;
      } else {
        worker.x += (dx / dist) * walkSpeed * dt;
        worker.y += (dy / dist) * walkSpeed * dt;
      }
    } else {
      // Nhân viên ôm thùng hàng đi từ đuôi xe tải về cửa tiệm
      const dx = storeDoor.x - worker.x;
      const dy = storeDoor.y - worker.y;
      const dist = Math.hypot(dx, dy);

      worker.carryingBox = true;
      worker.direction = dx > 0 ? 'right' : 'left';

      if (dist < 4) {
        worker.x = storeDoor.x;
        worker.y = storeDoor.y;
        worker.carryingBox = false;
        ev.boxesRemaining--;

        if (ev.boxesRemaining <= 0) {
          ev.phase = 'completed';
          ev.statusText = `Đã nhập toàn bộ ${ev.totalBoxes} kiện hàng vào kho tiệm!`;
          this.phaseTimer = 0;
        } else {
          this.workerLeg = 'to_truck';
        }
      } else {
        worker.x += (dx / dist) * walkSpeed * dt;
        worker.y += (dy / dist) * walkSpeed * dt;
      }
    }
  }

  private stepLoadingWorker(ev: StoreLogisticsEventState, dt: number): void {
    if (!ev.worker) return;
    const worker = ev.worker;
    const walkSpeed = LOGISTICS_TIMING.workerWalkSpeed;

    const truckTail = LOADING_DOCK_CONFIG.truckTailPosition;
    const storeDoor = LOADING_DOCK_CONFIG.storeEntrancePosition;

    if (this.workerLeg === 'to_store') {
      // Quay lại tiệm lấy kiện hàng tiếp theo
      const dx = storeDoor.x - worker.x;
      const dy = storeDoor.y - worker.y;
      const dist = Math.hypot(dx, dy);

      worker.carryingBox = false;
      worker.direction = dx > 0 ? 'right' : 'left';

      if (dist < 4) {
        worker.x = storeDoor.x;
        worker.y = storeDoor.y;
        worker.carryingBox = true;
        this.workerLeg = 'to_truck';
        ev.statusText = `Đang chuyển kiện đơn tiệc lên xe tải (${ev.boxesRemaining + 1}/${ev.totalBoxes})`;
      } else {
        worker.x += (dx / dist) * walkSpeed * dt;
        worker.y += (dy / dist) * walkSpeed * dt;
      }
    } else {
      // Mang kiện hàng từ tiệm ra bốc lên đuôi xe
      const dx = truckTail.x - worker.x;
      const dy = truckTail.y - worker.y;
      const dist = Math.hypot(dx, dy);

      worker.carryingBox = true;
      worker.direction = dx > 0 ? 'right' : 'left';

      if (dist < 4) {
        worker.x = truckTail.x;
        worker.y = truckTail.y;
        worker.carryingBox = false;
        ev.boxesRemaining++;

        if (ev.boxesRemaining >= ev.totalBoxes) {
          ev.phase = 'completed';
          ev.statusText = `Đã bốc xếp đủ ${ev.totalBoxes} kiện hàng lên xe!`;
          this.phaseTimer = 0;
        } else {
          this.workerLeg = 'to_store';
        }
      } else {
        worker.x += (dx / dist) * walkSpeed * dt;
        worker.y += (dy / dist) * walkSpeed * dt;
      }
    }
  }

  private checkAmbientRestock(hour: number): void {
    if (hour >= 7 && hour <= 9) {
      // Sáng sớm: xe nông sản tươi / sữa đậu nành
      this.enqueueDelivery({
        type: 'ambient_restock',
        products: [
          { productId: 'sua_tuoi_tiet_trung', quantity: 10 },
          { productId: 'banh_mi_que', quantity: 8 },
        ],
        supplierName: 'Nông trại Đà Lạt',
      });
    } else if (hour >= 14 && hour <= 16) {
      // Buổi chiều: xe nước ngọt / đồ ngọt giải khát
      this.enqueueDelivery({
        type: 'ambient_restock',
        products: [
          { productId: 'xa_xi_chuong_duong', quantity: 12 },
          { productId: 'keo_big_babol', quantity: 15 },
        ],
        supplierName: 'Đại lý Nước giải khát',
      });
    }
  }
}
