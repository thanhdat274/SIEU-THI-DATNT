import {
  ActivePartyOrder,
  InventoryItem,
  PartyOrderDef,
  PartyOrderReward,
  PartyOrderState,
  StockLot,
} from '@game/shared';
import { PARTY_ORDERS, PARTY_ORDER_MAP } from '@game/data';

export interface FulfillPartyOrderResult {
  success: boolean;
  alreadyCompleted?: boolean;
  cogs: number;
  reward?: PartyOrderReward;
  inventory?: InventoryItem[];
  reason?: string;
}

/**
 * Tạo trạng thái khởi tạo cho đơn tiệc.
 */
export function createInitialPartyOrderState(): PartyOrderState {
  return {
    available: [],
    completedOrderIds: [],
  };
}

/**
 * Kiểm tra và làm mới danh sách đơn tiệc khả dụng theo ngày và cấp độ người chơi.
 * Mỗi ngày có thể mở đơn mới phù hợp với cấp độ nếu chưa nhận.
 */
export function refreshAvailablePartyOrders(
  state: PartyOrderState,
  day: number,
  playerLevel: number
): PartyOrderState {
  const nextAvailable = [...state.available];

  // 1. Kiểm tra hết hạn các đơn chưa hoàn thành
  for (let i = 0; i < nextAvailable.length; i++) {
    const ord = nextAvailable[i];
    if (ord.status === 'accepted' && day > ord.deadlineDay) {
      nextAvailable[i] = { ...ord, status: 'expired' };
    } else if (ord.status === 'pending' && day > ord.availableDay + 2) {
      nextAvailable[i] = { ...ord, status: 'expired' };
    }
  }

  // 2. Nếu ngày hôm nay chưa sinh đơn, tìm đơn phù hợp cấp độ
  if (state.lastGeneratedDay !== day) {
    const unlockedOrders = PARTY_ORDERS.filter(
      (def) => def.minPlayerLevel <= playerLevel
    );

    for (const def of unlockedOrders) {
      const existing = nextAvailable.find((o) => o.orderId === def.id);
      const isCompleted = state.completedOrderIds.includes(def.id);

      // Nếu chưa từng có hoặc đã kết thúc ở các ngày trước, có thể mở lại
      if (!existing && !isCompleted) {
        nextAvailable.push({
          orderId: def.id,
          status: 'pending',
          availableDay: day,
          deadlineDay: day + def.durationDays,
        });
        break; // Mỗi ngày xuất hiện tối đa 1 đơn mới để người chơi tập trung
      }
    }
  }

  return {
    ...state,
    available: nextAvailable,
    lastGeneratedDay: day,
  };
}

/**
 * Người chơi chấp nhận hoặc từ chối đơn tiệc.
 * Từ chối không bị phạt tiền hay uy tín.
 */
export function respondPartyOrder(
  state: PartyOrderState,
  orderId: string,
  accept: boolean,
  day: number
): { state: PartyOrderState; success: boolean; reason?: string } {
  const orderIndex = state.available.findIndex((o) => o.orderId === orderId);
  if (orderIndex === -1) {
    return { state, success: false, reason: 'Không tìm thấy đơn tiệc' };
  }

  const order = state.available[orderIndex];
  if (order.status !== 'pending') {
    return { state, success: false, reason: `Đơn tiệc đã ở trạng thái ${order.status}` };
  }

  const def = PARTY_ORDER_MAP[orderId];
  const duration = def ? def.durationDays : 2;

  const updatedOrder: ActivePartyOrder = accept
    ? {
        ...order,
        status: 'accepted',
        acceptedDay: day,
        deadlineDay: day + duration,
      }
    : {
        ...order,
        status: 'declined',
      };

  const nextAvailable = [...state.available];
  nextAvailable[orderIndex] = updatedOrder;

  return {
    state: {
      ...state,
      available: nextAvailable,
    },
    success: true,
  };
}

/**
 * Hoàn tất đơn tiệc từ kho theo nguyên tắc FEFO (lô hết hạn sớm nhất xuất trước).
 * Bỏ qua lô đã hết hạn. Nếu thiếu hàng thì không trừ kho và không ghi nhận.
 * Idempotent: Nếu đơn đã hoàn thành thì trả về thành công an toàn, không thưởng lần hai.
 */
export function fulfillPartyOrder(params: {
  state: PartyOrderState;
  orderId: string;
  day: number;
  inventory: InventoryItem[];
}): FulfillPartyOrderResult {
  const { state, orderId, day, inventory } = params;

  // Kiểm tra idempotent nếu đã hoàn thành
  if (state.completedOrderIds.includes(orderId)) {
    return {
      success: true,
      alreadyCompleted: true,
      cogs: 0,
      reason: 'Đơn tiệc này đã được hoàn tất trước đó',
    };
  }

  const orderIndex = state.available.findIndex((o) => o.orderId === orderId);
  if (orderIndex === -1) {
    return { success: false, cogs: 0, reason: 'Không tìm thấy đơn tiệc trong danh sách hoạt động' };
  }

  const activeOrder = state.available[orderIndex];
  if (activeOrder.status === 'completed') {
    return {
      success: true,
      alreadyCompleted: true,
      cogs: 0,
      reason: 'Đơn tiệc này đã được hoàn tất',
    };
  }

  if (activeOrder.status !== 'accepted') {
    return {
      success: false,
      cogs: 0,
      reason: 'Đơn tiệc chưa được chấp nhận hoặc đã quá hạn',
    };
  }

  if (day > activeOrder.deadlineDay) {
    return {
      success: false,
      cogs: 0,
      reason: 'Đơn tiệc đã quá hạn chót',
    };
  }

  const def = PARTY_ORDER_MAP[orderId];
  if (!def) {
    return { success: false, cogs: 0, reason: 'Không tìm thấy thông tin cấu hình của đơn' };
  }

  // 1. Kiểm tra tồn kho khả dụng (chỉ tính lô có expiresOnDay > day)
  for (const item of def.items) {
    const inv = inventory.find((i) => i.productId === item.productId);
    if (!inv) {
      return { success: false, cogs: 0, reason: `Kho không có sản phẩm ${item.productId}` };
    }

    let usableCount = 0;
    if (inv.lots && inv.lots.length > 0) {
      for (const lot of inv.lots) {
        if (lot.expiresOnDay > day) {
          usableCount += lot.quantity;
        }
      }
    } else {
      usableCount = inv.quantity;
    }

    if (usableCount < item.quantity) {
      return {
        success: false,
        cogs: 0,
        reason: `Không đủ tồn kho khả dụng cho ${item.productId} (cần ${item.quantity}, có ${usableCount})`,
      };
    }
  }

  // 2. Xuất kho FEFO và tính COGS thực tế
  let totalCogs = 0;
  const clonedInventory: InventoryItem[] = JSON.parse(JSON.stringify(inventory));

  for (const req of def.items) {
    const inv = clonedInventory.find((i) => i.productId === req.productId)!;
    let remainingToDeduct = req.quantity;

    if (inv.lots && inv.lots.length > 0) {
      // Sắp xếp lô theo ngày hết hạn tăng dần (FEFO), bỏ qua lô đã hết hạn
      const usableLots = inv.lots
        .filter((l) => l.expiresOnDay > day)
        .sort((a, b) => a.expiresOnDay - b.expiresOnDay);

      const expiredLots = inv.lots.filter((l) => l.expiresOnDay <= day);
      const remainingUsableLots: StockLot[] = [];

      for (const lot of usableLots) {
        if (remainingToDeduct <= 0) {
          remainingUsableLots.push(lot);
          continue;
        }

        const deduct = Math.min(lot.quantity, remainingToDeduct);
        totalCogs += deduct * (lot.unitCost ?? 0);
        remainingToDeduct -= deduct;

        if (lot.quantity > deduct) {
          remainingUsableLots.push({
            ...lot,
            quantity: lot.quantity - deduct,
          });
        }
      }

      inv.lots = [...remainingUsableLots, ...expiredLots];
      inv.quantity = inv.lots.reduce((sum, l) => sum + l.quantity, 0);
    } else {
      // Fallback nếu không có lot
      inv.quantity -= remainingToDeduct;
    }
  }

  // Lọc bỏ các dòng kho số lượng 0
  const finalInventory = clonedInventory.filter((i) => i.quantity > 0);

  // Cập nhật trạng thái đơn
  activeOrder.status = 'completed';
  activeOrder.completedDay = day;
  if (!state.completedOrderIds.includes(orderId)) {
    state.completedOrderIds.push(orderId);
  }

  return {
    success: true,
    cogs: totalCogs,
    reward: def.reward,
    inventory: finalInventory,
  };
}
