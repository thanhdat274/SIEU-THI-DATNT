/**
 * useGameActions — game interaction handlers (restock, price, checkout, layout, etc.)
 */
import { useRef, useCallback } from 'react';
import type { GameSimulation, StoreLayoutAction } from '@game/core';
import { PRODUCT_MAP, effectiveShelfCapacity } from '@game/data';
import { isSalesFixture, isWarehouseFixture, type PlayerData, type InventoryItem, type HoldingItem, type StoreFixture, type CustomerState, type StaffShift, type SupplierOrder } from '@game/shared';
import type { PixiGameViewport } from '@game/renderer';

export interface UseGameActionsOptions {
  simulationRef: React.RefObject<GameSimulation | null>;
  viewportRef: React.RefObject<PixiGameViewport | null>;
  onlineWorldRef: React.RefObject<{ world: { id: string; memberships: { role?: string; accountId?: string }[] }[] } | null>;
  inputManagerRef: React.RefObject<{ setJoystickVector: (x: number, y: number) => void; triggerInteract: () => void; setEnabled: (b: boolean) => void; getMovementVector: () => unknown } | null>;
  player: PlayerData;
  worldTime: { day: number; isStoreOpen: boolean };
  inventory: InventoryItem[];
  fixtures: StoreFixture[];
  addToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  commitBusinessChange: (payload: unknown, desc: string, type: string) => Promise<boolean>;
  persistSimulationMutation: <T extends { success: boolean; reason?: string }>(
    payload: unknown, desc: string, activityType: string,
    mutate: (sim: GameSimulation) => T,
  ) => Promise<T | null>;
  blockOfflineOnlineMutation: () => boolean;
  handleSaveGame: (isManual?: boolean) => Promise<boolean>;
  setInventory: (items: InventoryItem[]) => void;
  setFixtures: (fixtures: StoreFixture[]) => void;
  setCustomers: (customers: CustomerState[]) => void;
  setCurrentDayRecord: (record: unknown) => void;
  setDailyRecords: (records: unknown) => void;
  setNearbyFixture: (fixture: unknown) => void;
  openFixtureModal: (fixture: StoreFixture) => void;
  closeFixtureModal: () => void;
  closeAllModals: () => void;
  openSupplierModal: () => void;
  setActiveTimeVote: (vote: unknown) => void;
  worldSocket: { submitTimeVote: (vote: unknown) => boolean; cancelTimeVote: () => void; connected: boolean };
}

export function useGameActions({
  simulationRef,
  viewportRef,
  onlineWorldRef,
  inputManagerRef,
  player,
  worldTime,
  inventory,
  fixtures,
  addToast,
  commitBusinessChange,
  persistSimulationMutation,
  blockOfflineOnlineMutation,
  handleSaveGame,
  setInventory,
  setFixtures,
  setNearbyFixture,
  openFixtureModal,
  closeFixtureModal,
  openSupplierModal,
  setActiveTimeVote,
  worldSocket,
}: UseGameActionsOptions) {

  // === Sales & Shelf Actions ===
  const handleSetSellingPrice = useCallback(async (productId: string, requestedPrice: number | null) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const result = sim.setSellingPrice(productId, requestedPrice);
    if (!result.success) { addToast(result.reason ?? 'Không đổi được giá bán.', 'warn'); return; }
    const productName = PRODUCT_MAP[productId]?.name ?? productId;
    if (onlineWorldRef.current) {
      await commitBusinessChange({ type: 'set_price', productId, price: requestedPrice === null ? null : result.price }, `Đổi giá ${productName} thành ${result.price?.toLocaleString('vi-VN')}₫`, 'Đặt giá');
    } else {
      await handleSaveGame(false);
    }
    addToast(`Đã đặt giá ${productName}: ${result.price?.toLocaleString('vi-VN')}₫.`, 'success');
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange, handleSaveGame]);

  const handleRestock = useCallback(async (fixtureId: string, productId: string, amount: number) => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const prod = PRODUCT_MAP[productId];
    const res = simulationRef.current.transferToShelf(fixtureId, productId, amount);
    if (res.success && res.actualQuantity > 0) {
      const count = res.actualQuantity;
      addToast(`Đã bày ${count}x ${prod?.name || 'món hàng'} lên kệ!`, 'success');
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'restock', fixtureId, productId, quantity: count },
          `Bày ${count}x ${prod?.name || 'món hàng'} lên kệ`,
          'Bày hàng'
        );
      }
    } else addToast('Không thể bày hàng lên kệ này.', 'warn');
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleUnstock = useCallback(async (fixtureId: string, amount: number) => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const res = simulationRef.current.transferFromShelf(fixtureId, amount);
    if (res.success && res.actualQuantity > 0) {
      const count = res.actualQuantity;
      addToast(`Đã cất ${count} món hàng lại vào nhà kho!`, 'info');
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'unstock', fixtureId, quantity: count },
          `Cất ${count} món hàng lại vào kho`,
          'Cất hàng'
        );
      }
    } else addToast('Không thể cất: kho mát có thể đã hết chỗ.', 'warn');
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleDisposeStock = useCallback(async (productId: string, quantity: number) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const res = sim.disposeStock(productId, quantity);
    if (!res.success || res.disposed <= 0) { addToast('Không có hàng để tiêu hủy.', 'warn'); return; }
    addToast(`Đã tiêu hủy ${res.disposed} món, ghi lỗ ${res.cost.toLocaleString('vi-VN')}đ.`, 'success');
    if (onlineWorldRef.current) await commitBusinessChange({ type: 'dispose_stock', productId, quantity: res.disposed }, `Tiêu hủy ${res.disposed} món`, 'Tiêu hủy hàng');
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleStowHolding = useCallback(async (holdingId?: string) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    if (holdingId) {
      const res = sim.stowHoldingItem(holdingId);
      if (res.success) {
        addToast(`Đã cất ${res.stowedQuantity} món vào kho thành công!`, 'success');
        if (onlineWorldRef.current && res.stowedQuantity > 0) {
          await commitBusinessChange({ type: 'stow', holdingId, quantity: res.stowedQuantity }, `Cất ${res.stowedQuantity} món vào kho`, 'Cất hàng');
        }
      } else {
        addToast((res as any).reason === 'cold_warehouse_full' ? 'Kho mát đã đầy, không thể cất thêm!' : 'Không thể cất món hàng này.', 'warn');
      }
    } else {
      const res = sim.stowAllHolding();
      if (res.success) {
        addToast(`Đã cất ${res.totalStowed} món từ hàng chờ vào kho!`, 'success');
        if (onlineWorldRef.current && res.totalStowed > 0) {
          await commitBusinessChange({ type: 'stow_all', quantity: res.totalStowed }, `Cất ${res.totalStowed} món từ hàng chờ vào kho`, 'Cất hàng');
        }
      } else {
        addToast('Kho không còn đủ chỗ trống để cất thêm hàng chờ!', 'warn');
      }
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleSetPlanogramAssignment = useCallback(async (fixtureId: string, productId?: string) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const res = sim.setPlanogramAssignment(fixtureId, productId);
    if (res.success) {
      if (onlineWorldRef.current) {
        await commitBusinessChange({ type: 'planogram_assignment', fixtureId, productId: productId ?? null }, 'Cập nhật sơ đồ bày hàng', 'Sơ đồ kệ');
      }
      if (productId) {
        const prod = PRODUCT_MAP[productId];
        addToast(`Đã lưu "${prod?.name || productId}" vào sơ đồ kệ!`, 'success');
      } else {
        addToast('Đã hủy gán sơ đồ cho kệ này!', 'info');
      }
    } else {
      addToast(
        res.reason === 'storage_type_mismatch'
          ? 'Không thể gán: điều kiện bảo quản không phù hợp!'
          : 'Không thể thiết lập sơ đồ cho kệ này.',
        'warn'
      );
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleApplyPlanogram = useCallback(async (fixtureId?: string) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    if (fixtureId) {
      const res = sim.applyPlanogramEntry(fixtureId);
      if (res.applied && res.actualQuantity > 0) {
        addToast(`Đã châm ${res.actualQuantity} món theo sơ đồ kệ!`, 'success');
        if (onlineWorldRef.current) {
          await commitBusinessChange({ type: 'planogram_restock', fixtureId, quantity: res.actualQuantity }, `Châm ${res.actualQuantity} món theo sơ đồ kệ`, 'Bày hàng');
        }
      } else if (res.reason === 'product_mismatch') {
        addToast('Kệ đang chứa sản phẩm khác! Không thể đổi món khi còn tồn hàng.', 'warn');
      } else if (res.reason === 'no_inventory') {
        addToast('Trong kho không còn sản phẩm theo sơ đồ để châm kệ!', 'warn');
      } else if (res.reason === 'fixture_full') {
        addToast('Kệ đã đầy đủ theo sơ đồ.', 'info');
      } else {
        addToast('Chưa thể châm hàng theo sơ đồ cho kệ này.', 'info');
      }
    } else {
      // handleAutoRestock — caller provides this
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  // === Store & Supply Actions ===
  const handleToggleStoreStatus = useCallback(async () => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const isOpen = simulationRef.current.getClock().toggleStoreStatus();
    addToast(
      isOpen ? 'Cửa tiệm đã mở, chào đón bà con trong xóm ghé mua! ' : 'Đã đóng cửa tiệm nghỉ ngơi! ',
      isOpen ? 'success' : 'info'
    );
    if (onlineWorldRef.current) {
      await commitBusinessChange({ type: 'store_status', isOpen }, isOpen ? 'Mở cửa tiệm' : 'Đóng cửa tiệm', 'Trạng thái tiệm');
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleApplyStoreLayout = useCallback(async (nextSave: unknown, actions: StoreLayoutAction[]): Promise<boolean> => {
    if (blockOfflineOnlineMutation()) return false;
    const simulation = simulationRef.current;
    if (!simulation || worldTime.isStoreOpen) return false;
    const result = simulation.applyStoreLayout(nextSave as any);
    if (!result.save) {
      addToast('Không thể áp dụng bố cục. Hãy kiểm tra lối đi và trạng thái tiệm.', 'warn');
      return false;
    }
    if (onlineWorldRef.current) {
      return await commitBusinessChange({ type: 'layout_batch', actions }, 'Sắp xếp cửa hàng', 'Bố cục cửa hàng');
    } else {
      const saved = await handleSaveGame(false);
      if (!saved) {
        simulation.importSaveData(nextSave as any);
        return false;
      }
      addToast('Đã lưu bố cục cửa hàng.', 'success');
      return true;
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, worldTime, addToast, commitBusinessChange, handleSaveGame]);

  const handleAdvanceDay = useCallback(async () => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const curWorld = onlineWorldRef.current as any;
    if (curWorld && curWorld.world?.memberships?.length > 1) {
      const sent = worldSocket.submitTimeVote({ type: 'advance_day' });
      if (!sent) { addToast('Chưa kết nối realtime; không gửi được phiếu.', 'warn'); return; }
      setActiveTimeVote({
        type: 'advance_day',
        initiatedBy: 'me',
        expiresInMs: 30000,
        approvalsCount: 1,
        totalRequired: 2,
      });
      addToast('Đã gửi phiếu yêu cầu qua ngày! Chờ đối tác đồng ý trong 30s...', 'info');
      closeFixtureModal();
      return;
    }
    simulationRef.current.getClock().advanceToNextDay();
    closeFixtureModal();
    if (onlineWorldRef.current) {
      await commitBusinessChange(
        { type: 'advance_day' },
        `Bước sang Ngày ${simulationRef.current.getTime().day}`,
        'Qua ngày'
      );
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange, closeFixtureModal, worldSocket, setActiveTimeVote]);

  const handleBuyStall = useCallback(async (stallId: string) => {
    const sim = simulationRef.current;
    if (!sim || blockOfflineOnlineMutation()) return;
    const result = sim.buyStall(stallId);
    if (!result.success) { addToast(result.reason ?? 'Không mở được quầy.', 'warn'); return; }
    if (onlineWorldRef.current) {
      await commitBusinessChange({ type: 'buy_stall', stallId }, 'Mở quầy ăn uống', 'Quầy ăn uống');
    }
    addToast('Đã mở quầy mới; doanh thu được tính khi sang ngày.', 'success');
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleClaimQuest = useCallback(async (questId: string) => {
    const sim = simulationRef.current;
    if (!sim || blockOfflineOnlineMutation()) return false;
    const result = sim.claimQuest(questId);
    if (!result.success) { addToast('Nhiệm vụ chưa đủ điều kiện hoặc đã nhận.', 'warn'); return false; }
    if (onlineWorldRef.current) {
      const committed = await commitBusinessChange({ type: 'claim_quest', questId }, 'Nhận thưởng nhiệm vụ', 'Nhiệm vụ');
      if (!committed) return false;
    }
    addToast(`Nhận thưởng ${result.reward!.money.toLocaleString('vi-VN')} ₫${result.reward!.experience ? ` và ${result.reward!.experience} XP` : ''}.`, 'success');
    return true;
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  // === Staff Actions ===
  const handleHireStaff = useCallback(async (candidateId: string) => {
    const sim = simulationRef.current;
    if (!sim) return { success: false, reason: 'Trò chơi chưa sẵn sàng.' };
    if (blockOfflineOnlineMutation()) return { success: false, reason: 'Mất kết nối hẻm chung.' };
    const result = sim.hireStaff(candidateId);
    if (!result.success) {
      addToast(result.reason ?? 'Không tuyển được nhân viên.', 'warn');
      return result;
    }
    if (onlineWorldRef.current) void commitBusinessChange({ type: 'hire_staff', candidateId }, 'Tuyển nhân viên', 'Nhân viên');
    addToast('Đã tuyển nhân viên; phí tuyển dụng đã được trừ.', 'success');
    return result;
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleSetStaffShift = useCallback(async (staffId: string, shift: StaffShift) => {
    const sim = simulationRef.current;
    if (blockOfflineOnlineMutation()) return false;
    if (!sim || !sim.setStaffShift(staffId, shift)) {
      addToast('Không thể đổi ca làm nhân viên.', 'warn');
      return false;
    }
    if (onlineWorldRef.current) void commitBusinessChange({ type: 'set_staff_shift', staffId, shift }, 'Đổi ca nhân viên', 'Nhân viên');
    addToast('Đã lưu ca làm mới.', 'success');
    return true;
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleAssignRefillJob = useCallback(async (staffId: string, fixtureId: string) => {
    const sim = simulationRef.current;
    if (!sim) return { success: false, reason: 'Chưa sẵn sàng.' };
    if (blockOfflineOnlineMutation()) return { success: false, reason: 'Mất kết nối hẻm chung.' };
    const result = sim.assignRefillJob(staffId, fixtureId);
    if (result.success) {
      if (onlineWorldRef.current) void commitBusinessChange({ type: 'assign_refill_job', staffId, fixtureId }, 'Giao việc châm kệ', 'Nhân viên');
      addToast('Đã giao việc châm kệ cho nhân viên.', 'success');
    } else addToast(`Chưa giao được việc: ${result.reason ?? 'kệ không khả dụng'}`, 'warn');
    return result;
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  // === Supplier Actions ===
  const handleSupplierCartOrder = useCallback(async (supplierId: string, items: { productId: string; quantity: number }[]) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const res = sim.orderSupplierCart(supplierId, items);
    if (res.success) {
      const supplierName = supplierId === 'cho_dau_moi' ? 'Chợ đầu mối' : supplierId === 'giao_hoa_toc' ? 'Đại lý Hỏa Tốc' : 'Đại lý đầu hẻm';
      addToast(`Đã đặt giỏ hàng thành công từ ${supplierName}!`, 'success');
      if (onlineWorldRef.current && res.paidTotal) {
        await commitBusinessChange(
          { type: 'order', supplierId, items, paidTotal: res.paidTotal },
          `Đặt giỏ hàng (${items.length} món, tổng ${res.paidTotal.toLocaleString('vi-VN')} ₫) từ ${supplierName}`,
          'Nhập hàng'
        );
      }
    } else {
      addToast((res as any).reasons?.[0] || 'Không thể đặt giỏ hàng: vui lòng kiểm tra lại điều kiện.', 'warn');
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleCheckout = useCallback(async (fixtureId?: string, checkoutId?: string, onCredit = false, dineIn = false) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const moneyBefore = sim.getPlayerData().money;
    if (!worldTime.isStoreOpen) {
      addToast('Tiệm đang đóng cửa.', 'warn');
      return;
    }
    if (sim.completeCustomerCheckout(checkoutId || '', fixtureId || '', onCredit, dineIn)) {
      const earned = sim.getPlayerData().money - moneyBefore;
      addToast(dineIn ? 'Đã thanh toán. Khách đang tìm bàn ăn.' : onCredit ? 'Đã ghi hóa đơn vào sổ mua chịu khách quen.' : `Đã thanh toán cho khách và nhận +${earned.toLocaleString('vi-VN')} đ!`, 'success');
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'checkout', checkoutId: checkoutId || '', fixtureId: fixtureId || '', ...(onCredit ? { onCredit: true } : {}), ...(dineIn ? { dineIn: true } : {}) },
          dineIn ? 'Thanh toán và dùng dịch vụ ăn tại bàn' : onCredit ? 'Ghi hóa đơn mua chịu khách quen' : `Thanh toán đơn hàng thu về +${earned.toLocaleString('vi-VN')}₫`,
          dineIn ? 'Ăn tại bàn' : onCredit ? 'Mua chịu' : 'Bán hàng'
        );
      }
    } else {
      addToast(dineIn ? 'Không có bàn sạch còn chỗ hoặc giỏ hàng chưa có món ăn phù hợp.' : 'Không thể thanh toán: tiệm đang đóng cửa hoặc giỏ hàng trống.', 'warn');
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, worldTime, addToast, commitBusinessChange]);

  // === Mobile Controls ===
  const handleMobileJoystickMove = useCallback((x: number, y: number) => {
    inputManagerRef.current?.setJoystickVector(x, y);
  }, [inputManagerRef]);

  const handleMobileInteract = useCallback(() => {
    inputManagerRef.current?.triggerInteract();
  }, [inputManagerRef]);

  // === Restock ===
  const handleAutoRestock = useCallback(async () => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    let restockedCount = 0;

    const batchRes = sim.applyPlanogram();
    restockedCount += batchRes.totalRefilled;

    const currentPlan = sim.getPlanogram();
    for (const fix of sim.getFixtures()) {
      if (isSalesFixture(fix) && fix.assignedProductId && !currentPlan[fix.id]) {
        const prod = PRODUCT_MAP[fix.assignedProductId];
        const effectiveCap = prod ? effectiveShelfCapacity(fix.maxCapacity, prod.shelfCapacity, sim.getShelfCapacityBonus()) : fix.maxCapacity;
        const needed = effectiveCap - fix.currentStock;
        if (needed > 0) {
          const invItem = sim.getInventory().find((i) => i.productId === fix.assignedProductId);
          if (invItem && invItem.quantity > 0) {
            const transfer = Math.min(needed, invItem.quantity);
            const res = sim.transferToShelf(fix.id, fix.assignedProductId, transfer);
            if (res.success && res.actualQuantity > 0) {
              restockedCount += res.actualQuantity;
            }
          }
        }
      }
    }
    if (restockedCount > 0) {
      addToast(`Đã tự động châm ${restockedCount} món hàng từ kho lên các kệ! `, 'success');
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'auto_restock', count: restockedCount },
          `Tự động châm ${restockedCount} món hàng lên kệ`,
          'Bày hàng tự động'
        );
      }
    } else {
      addToast('Kho hàng không có sẵn sản phẩm phù hợp để châm kệ.', 'info');
    }
  }, [simulationRef, onlineWorldRef, blockOfflineOnlineMutation, addToast, commitBusinessChange]);

  const handleSetPlanogramApply = useCallback(async (fixtureId?: string) => {
    if (fixtureId) {
      await handleApplyPlanogram(fixtureId);
    } else {
      await handleAutoRestock();
    }
  }, [handleApplyPlanogram, handleAutoRestock]);

  return {
    handleSetSellingPrice,
    handleRestock,
    handleUnstock,
    handleDisposeStock,
    handleStowHolding,
    handleSetPlanogramAssignment,
    handleApplyPlanogram,
    handleAutoRestock,
    handleSetPlanogramApply,
    handleToggleStoreStatus,
    handleApplyStoreLayout,
    handleAdvanceDay,
    handleBuyStall,
    handleClaimQuest,
    handleHireStaff,
    handleSetStaffShift,
    handleAssignRefillJob,
    handleSupplierCartOrder,
    handleCheckout,
    handleMobileJoystickMove,
    handleMobileInteract,
  };
}
