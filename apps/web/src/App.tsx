import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generateStarterTileMap, PRODUCT_MAP } from '@game/data';
import { InputManager, GameSimulation } from '@game/core';
import { PixiGameViewport } from '@game/renderer';
import { SaveGameData, SupplierOrder, isSalesFixture, isWarehouseFixture } from '@game/shared';

import { loadOrCreateSave, persistSave, resetSaveToDefault } from './db';
import { useGameStore } from './store/useGameStore';
import { HUD } from './components/HUD';
import { WarehouseModal } from './components/WarehouseModal';
import { ShelfModal } from './components/ShelfModal';
import { CashierModal } from './components/CashierModal';
import { InventoryModal } from './components/InventoryModal';
import { SaveModal } from './components/SaveModal';
import { VirtualJoystick } from './components/VirtualJoystick';
import { RotateOverlay } from './components/RotateOverlay';
import { ToastContainer } from './components/ToastContainer';
import { SupplierModal } from './components/SupplierModal';
import { BottomBar } from './components/BottomBar';
import { WarehouseDock } from './components/WarehouseDock';
import { PixelButton, PixelIcon } from './components/pixel';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<GameSimulation | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const viewportRef = useRef<PixiGameViewport | null>(null);
  const revisionRef = useRef(1);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const initializationRef = useRef<Promise<void>>(Promise.resolve());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [startupError, setStartupError] = useState<string>('');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [currentRevision, setCurrentRevision] = useState<number>(1);
  const [pendingOrders, setPendingOrders] = useState<SupplierOrder[]>([]);
  const [statistics, setStatistics] = useState<SaveGameData['statistics']>({ totalRevenue: 0, totalCustomersServed: 0, totalDaysPassed: 0 });
  const [isWarehouseDockOpen, setWarehouseDockOpen] = useState(() => !window.matchMedia('(max-width: 1023px), (max-height: 499px)').matches);
  const [gameSpeed, setGameSpeed] = useState<number>(1);

  const {
    player,
    worldTime,
    inventory,
    fixtures,
    activeFixtureModal,
    isInventoryModalOpen,
    isSaveModalOpen,
    isSupplierModalOpen,
    openSupplierModal,
    setPlayerData,
    setWorldTime,
    setInventory,
    setFixtures,
    setNearbyFixture,
    openFixtureModal,
    closeFixtureModal,
    closeAllModals,
    addToast,
  } = useGameStore();

  // Sync state from simulation into Zustand store
  const syncFromSimulation = useCallback((sim: GameSimulation) => {
    setPlayerData(sim.getPlayerData());
    const time = sim.getTime();
    setWorldTime(time, sim.getClock().formatTimeString());
    setInventory(sim.getInventory());
    setFixtures(sim.getFixtures());
    setPendingOrders(sim.getPendingOrders());
    setStatistics(sim.getStatistics());
    setNearbyFixture(sim.getActiveFixture());
  }, [setPlayerData, setWorldTime, setInventory, setFixtures, setNearbyFixture]);

  // Save progress to Dexie
  const handleSaveGame = useCallback(async (isManual: boolean = false) => {
    if (!simulationRef.current) return false;
    let savedSuccessfully = false;
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
      try {
        if (!simulationRef.current) return;
        const exportData = simulationRef.current.exportSaveData('local_save_default', revisionRef.current);
        const saved = await persistSave(exportData);
        revisionRef.current = saved.revision;
        setLastSavedTime(saved.updatedAt);
        setCurrentRevision(saved.revision);
        savedSuccessfully = true;
        if (isManual) addToast('Đã lưu tiến trình thành công vào máy!', 'success');
      } catch (err) {
        console.error('Save error:', err);
        addToast(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu!', 'warn');
      }
    });
    await saveQueueRef.current;
    return savedSuccessfully;
  }, [addToast]);

  // Reset progress
  const handleResetGame = useCallback(async () => {
    try {
      await saveQueueRef.current;
      const freshSave = await resetSaveToDefault();
      if (simulationRef.current) {
        simulationRef.current.importSaveData(freshSave);
        syncFromSimulation(simulationRef.current);
      }
      setCurrentRevision(freshSave.revision);
      revisionRef.current = freshSave.revision;
      setLastSavedTime(freshSave.updatedAt);
      setGameSpeed(Math.max(1, freshSave.worldTime.timeScale / 60));
      addToast('Đã khởi tạo lại tiệm mới thành công!', 'info');
      return true;
    } catch (err) {
      console.error('Reset error:', err);
      addToast('Không thể khởi tạo tiệm mới. Hãy thử lại.', 'warn');
      return false;
    }
  }, [syncFromSimulation, addToast]);

  useEffect(() => {
    let isCancelled = false;
    let initialized = false;
    let disposed = false;
    let ownedInput: InputManager | null = null;
    let ownedViewport: PixiGameViewport | null = null;
    let ownedSimulation: GameSimulation | null = null;

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      ownedInput?.detachListeners();
      ownedViewport?.destroy();
      if (inputManagerRef.current === ownedInput) inputManagerRef.current = null;
      if (viewportRef.current === ownedViewport) viewportRef.current = null;
      if (simulationRef.current === ownedSimulation) simulationRef.current = null;
    };

    async function initGame() {
      if (!canvasRef.current) return;

      // 1. Load or create initial save from IndexedDB
      const initialSave: SaveGameData = await loadOrCreateSave();
      if (isCancelled) return;

      setCurrentRevision(initialSave.revision);
      revisionRef.current = initialSave.revision;
      setLastSavedTime(initialSave.updatedAt);
      setGameSpeed(Math.max(1, initialSave.worldTime.timeScale / 60));

      // 2. Setup inputs
      const inputManager = new InputManager();
      inputManager.attachListeners();
      const modalState = useGameStore.getState();
      inputManager.setEnabled(!(modalState.activeFixtureModal || modalState.isInventoryModalOpen || modalState.isSaveModalOpen || modalState.isSupplierModalOpen));
      ownedInput = inputManager;
      inputManagerRef.current = inputManager;

      // 3. Setup map
      const tileMap = generateStarterTileMap();

      // 4. Setup simulation
      const simulation = new GameSimulation(initialSave, tileMap, inputManager, {
        onInteractionAvailable: (fixture) => {
          setNearbyFixture(fixture);
        },
        onOpenFixtureModal: (fixture) => {
          openFixtureModal(fixture);
        },
        onOpenInventoryModal: () => {
          useGameStore.getState().toggleInventoryModal();
        },
        onDayChanged: (newDay) => {
          addToast(`Bình minh Ngày ${newDay}! Chúc tiệm một ngày buôn bán đắt hàng! `, 'success');
          handleSaveGame(false);
        },
        onPlayerRelocated: ()=>addToast('Đã đưa bạn tới cửa hậu của nhà kho mới; tiền và hàng được giữ nguyên.','info'),
        onOrdersDelivered: (quantity)=>addToast(`Đã nhận ${quantity} món từ đại lý vào nhà kho.`, 'success'),
        onStockExpired: (quantity) => {
          addToast(`${quantity} món hàng đã quá hạn và được loại khỏi kho/kệ.`, 'warn');
        },
        onTimeChanged: () => {
          if (simulationRef.current) {
            const sim = simulationRef.current;
            setWorldTime(sim.getTime(), sim.getClock().formatTimeString());
          }
        },
        onStateChanged: () => {
          if (simulationRef.current) {
            syncFromSimulation(simulationRef.current);
          }
        },
      });
      ownedSimulation = simulation;
      simulationRef.current = simulation;

      // Sync initial state
      syncFromSimulation(simulation);

      // 5. Setup PixiJS Viewport
      const viewport = new PixiGameViewport({
        canvas: canvasRef.current,
        tileMap,
        simulation,
        onZoomChange: setZoomLevel,
      });
      ownedViewport = viewport;

      await viewport.initialize();
      if (isCancelled) return;

      viewportRef.current = viewport;
      setZoomLevel(viewport.getZoom());
      initialized = true;
      setIsLoading(false);
      addToast('Chào mừng bạn đến với Tiệm Tạp Hóa Đầu Hẻm! ', 'info');
    }

    // React StrictMode can mount, clean up, and mount again while Pixi is still
    // initializing. Serialize those passes so an old pass cannot destroy the
    // WebGL context used by the current pass.
    const previous = initializationRef.current;
    initializationRef.current = previous.catch(() => {}).then(initGame).catch((error) => {
      dispose();
      if (!isCancelled) {
        console.error('Game startup error:', error);
        setStartupError('Không thể mở bản đồ. Hãy tải lại trang để thử lại.');
      }
    }).finally(() => {
      if (isCancelled) dispose();
    });

    // Auto-save timer every 30 seconds
    const autoSaveInterval = setInterval(() => {
      handleSaveGame(false);
    }, 30000);

    // Global key handler for Esc
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        closeAllModals();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      isCancelled = true;
      clearInterval(autoSaveInterval);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (initialized) dispose();
    };
  }, [addToast, closeAllModals, handleSaveGame, openFixtureModal, setNearbyFixture, syncFromSimulation]);

  // Actions triggered from UI
  const handleRestock = (fixtureId: string, productId: string, amount: number) => {
    if (!simulationRef.current) return;
    const prod = PRODUCT_MAP[productId];
    const before = simulationRef.current.getFixtures().find((fixture) => fixture.id === fixtureId)?.currentStock ?? 0;
    const success = simulationRef.current.restockShelf(fixtureId, productId, amount);
    if (success) {
      const after = simulationRef.current.getFixtures().find((fixture) => fixture.id === fixtureId)?.currentStock ?? before;
      addToast(`Đã bày ${after - before}x ${prod?.name || 'món hàng'} lên kệ!`, 'success');
    } else addToast('Không thể bày hàng lên kệ này.', 'warn');
  };

  const handleUnstock = (fixtureId: string, amount: number) => {
    if (!simulationRef.current) return;
    const before = simulationRef.current.getFixtures().find((fixture) => fixture.id === fixtureId)?.currentStock ?? 0;
    const success = simulationRef.current.unstockShelf(fixtureId, amount);
    if (success) {
      const after = simulationRef.current.getFixtures().find((fixture) => fixture.id === fixtureId)?.currentStock ?? before;
      addToast(`Đã cất ${before - after} món hàng lại vào nhà kho!`, 'info');
    } else addToast('Không thể cất: kho mát có thể đã hết chỗ.', 'warn');
  };

  const handleToggleStoreStatus = () => {
    if (!simulationRef.current) return;
    const isOpen = simulationRef.current.getClock().toggleStoreStatus();
    syncFromSimulation(simulationRef.current);
    addToast(
      isOpen ? 'Cửa tiệm đã mở, chào đón bà con trong xóm ghé mua! ' : 'Đã đóng cửa tiệm nghỉ ngơi! ',
      isOpen ? 'success' : 'info'
    );
  };

  const handleAdvanceDay = () => {
    if (!simulationRef.current) return;
    simulationRef.current.getClock().advanceToNextDay();
    syncFromSimulation(simulationRef.current);
    closeFixtureModal();
  };

  const handleToggleGameSpeed = () => {
    const nextSpeed = gameSpeed === 1 ? 2 : 1;
    setGameSpeed(nextSpeed);
    if (simulationRef.current) {
      simulationRef.current.getClock().setTimeScale(nextSpeed === 1 ? 60 : 120);
    }
    addToast(`Tốc độ thời gian: ${nextSpeed}x`, 'info');
  };

  const handleMobileJoystickMove = (x: number, y: number) => {
    if (inputManagerRef.current) {
      inputManagerRef.current.setJoystickVector(x, y);
    }
  };

  const handleMobileInteract = () => {
    if (inputManagerRef.current) {
      inputManagerRef.current.triggerInteract();
    }
  };

  const handleSupplierOrder = (productId: string, quantity: number) => {
    const sim = simulationRef.current;
    if (!sim) return;
    if (sim.orderFromSupplier(productId, quantity)) {
      syncFromSimulation(sim);
      addToast('Đã đặt hàng. Nhà phân phối sẽ giao vào sáng mai!', 'success');
    } else {
      addToast('Không thể đặt hàng: kiểm tra tiền, cấp độ hoặc chỗ kho mát.', 'warn');
    }
  };

  const handleAutoRestock = () => {
    const sim = simulationRef.current;
    if (!sim) return;
    let restockedCount = 0;
    for (const fix of sim.getFixtures()) {
      if (isSalesFixture(fix) && fix.assignedProductId) {
        const needed = fix.maxCapacity - fix.currentStock;
        if (needed > 0) {
          const invItem = sim.getInventory().find((i) => i.productId === fix.assignedProductId);
          if (invItem && invItem.quantity > 0) {
            const transfer = Math.min(needed, invItem.quantity);
            if (sim.restockShelf(fix.id, fix.assignedProductId, transfer)) {
              restockedCount += transfer;
            }
          }
        }
      }
    }
    if (restockedCount > 0) {
      syncFromSimulation(sim);
      addToast(`Đã tự động châm ${restockedCount} món hàng từ kho lên các kệ! `, 'success');
      if (viewportRef.current) {
        viewportRef.current.addFloatingGain(player.position.x, player.position.y - 20, `+${restockedCount} Bày Kệ`, 0x2a7a43);
      }
    } else {
      addToast('Kho hàng không có sẵn sản phẩm phù hợp để châm kệ.', 'info');
    }
  };

  const handleCheckout = (fixtureId: string) => {
    const sim = simulationRef.current;
    if (!sim) return;
    const shelf = sim.getFixtures().find((f) => f.id === fixtureId);
    const prod = shelf?.assignedProductId ? PRODUCT_MAP[shelf.assignedProductId] : null;
    if (sim.checkoutShelf(fixtureId)) {
      syncFromSimulation(sim);
      const earned = prod?.baseSellingPrice || 0;
      addToast(`Đã bán một món hàng và nhận +${earned.toLocaleString('vi-VN')} đ!`, 'success');
      if (viewportRef.current) {
        const cashier = sim.getFixtures().find((f) => f.type === 'cashier_counter');
        const posX = cashier ? (cashier.tileX + 1) * 32 : player.position.x;
        const posY = cashier ? (cashier.tileY) * 32 : player.position.y;
        viewportRef.current.addFloatingGain(posX, posY - 20, `+${earned.toLocaleString('vi-VN')} đ`, 0xf4a261);
      }
    } else {
      addToast('Không thể bán: tiệm đang đóng cửa hoặc kệ đã hết hàng.', 'warn');
    }
  };

  const [zoomLevel, setZoomLevel] = useState<number>(2.0);

  const handleZoomIn = () => {
    if (viewportRef.current) {
      const newZoom = viewportRef.current.zoomIn(1);
      setZoomLevel(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (viewportRef.current) {
      const newZoom = viewportRef.current.zoomOut(1);
      setZoomLevel(newZoom);
    }
  };

  const hasModal = !!(activeFixtureModal || isInventoryModalOpen || isSaveModalOpen || isSupplierModalOpen);
  useEffect(() => {
    const syncInput = (state: ReturnType<typeof useGameStore.getState>) => inputManagerRef.current?.setEnabled(!(state.activeFixtureModal || state.isInventoryModalOpen || state.isSaveModalOpen || state.isSupplierModalOpen));
    const unsubscribe = useGameStore.subscribe(syncInput);
    syncInput(useGameStore.getState());
    return unsubscribe;
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px), (max-height: 499px)');
    const adapt = () => { if(query.matches) setWarehouseDockOpen(false); };
    query.addEventListener('change', adapt);
    return () => query.removeEventListener('change', adapt);
  }, []);
  const openCashier = () => {
    const cashier = fixtures.find(f => f.type === 'cashier_counter');
    if(cashier) openFixtureModal(cashier);
  };
  const locateWarehouse = () => {
    setWarehouseDockOpen(false);
    viewportRef.current?.locateWarehouse();
  };
  return <div className="game-shell">
    <div style={{display:'contents'}} {...(hasModal ? {inert:''} : {})}>
      {!isLoading && <HUD onToggleStoreStatus={handleToggleStoreStatus} gameSpeed={gameSpeed} onToggleGameSpeed={handleToggleGameSpeed} activeCustomers={simulationRef.current?.getCustomer() ? 1 : 0} onToggleWarehouseDock={()=>setWarehouseDockOpen(v=>!v)} isWarehouseDockOpen={isWarehouseDockOpen}/>}
      <main className="game-main">
        <div className="world-viewport">
          <canvas ref={canvasRef} aria-label="Bản đồ Tiệm Tạp Hóa Đầu Hẻm"/>
          {!isLoading && <><div className="world-caption"><strong>Hẻm nhỏ, chuyện lớn.</strong><span>Nhà kho liền phía trên · Đi qua cửa hậu giữa tiệm.</span></div>
            <div className="world-tools" aria-label="Góc nhìn bản đồ"><PixelButton icon="warehouse" aria-label="Định vị nhà kho" onClick={locateWarehouse}/><PixelButton icon="minus" aria-label="Thu nhỏ bản đồ" disabled={zoomLevel<=1} onClick={handleZoomOut}/><span className="zoom-value">{zoomLevel}×</span><PixelButton icon="plus" aria-label="Phóng to bản đồ" disabled={zoomLevel>=3} onClick={handleZoomIn}/></div>
            {!hasModal && !isWarehouseDockOpen && <VirtualJoystick onMove={handleMobileJoystickMove} onInteract={handleMobileInteract}/>}
          </>}
        </div>
        {!isLoading && <WarehouseDock inventory={inventory} fixtures={fixtures} isOpen={isWarehouseDockOpen} onToggle={()=>setWarehouseDockOpen(v=>!v)} onAutoRestock={handleAutoRestock} onOpenSupplier={openSupplierModal} onLocateWarehouse={locateWarehouse} currentDay={worldTime.day}/>}
      </main>
      {!isLoading && <BottomBar onOpenSupplier={openSupplierModal} onOpenCashier={openCashier}/>}
    </div>
    {isLoading && <div className="loading-screen" role="status"><div className="loading-sign"><PixelIcon name="warehouse" size={48}/><p className="eyebrow">Chào mừng về hẻm</p><h1>Tiệm Tạp Hóa<br/>Đầu Hẻm</h1></div><p>{startupError || 'Đang mở cửa tiệm, chuẩn bị hàng hóa...'}</p>{startupError ? <PixelButton onClick={()=>window.location.reload()} variant="teal">Thử mở tiệm lại</PixelButton> : <div className="loading-stripes"/>}</div>}
    {activeFixtureModal && isSalesFixture(activeFixtureModal) && <ShelfModal fixture={activeFixtureModal} inventory={inventory} currentDay={worldTime.day} onRestock={handleRestock} onUnstock={handleUnstock} onClose={closeFixtureModal}/>}
    {activeFixtureModal && isWarehouseFixture(activeFixtureModal) && <WarehouseModal fixture={activeFixtureModal} inventory={inventory} fixtures={fixtures} pendingOrders={pendingOrders} currentDay={worldTime.day} onRestock={handleAutoRestock} onClose={closeFixtureModal}/>}
    {activeFixtureModal?.type === 'cashier_counter' && <CashierModal fixture={activeFixtureModal} player={player} worldTime={worldTime} shelves={fixtures.filter(isSalesFixture)} statistics={statistics} onCheckout={handleCheckout} onToggleStoreStatus={handleToggleStoreStatus} onAdvanceDay={handleAdvanceDay} onClose={closeFixtureModal}/>}
    {isInventoryModalOpen && <InventoryModal inventory={inventory} currentDay={worldTime.day} onClose={closeAllModals}/>}
    {isSaveModalOpen && <SaveModal onManualSave={()=>handleSaveGame(true)} onResetSave={handleResetGame} onClose={closeAllModals} lastSavedAt={lastSavedTime} revision={currentRevision}/>}
    {isSupplierModalOpen && <SupplierModal player={player} pendingOrders={pendingOrders} inventory={inventory} currentDay={worldTime.day} onOrder={handleSupplierOrder} onClose={closeAllModals}/>}
    <RotateOverlay/><ToastContainer/>
  </div>;
};
export default App;
