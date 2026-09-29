import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generateStarterTileMap, PRODUCT_MAP } from '@game/data';
import { InputManager, GameSimulation } from '@game/core';
import { PixiGameViewport } from '@game/renderer';
import { SaveGameData, SupplierOrder } from '@game/shared';

import { loadOrCreateSave, persistSave, resetSaveToDefault } from './db';
import { useGameStore } from './store/useGameStore';
import { HUD } from './components/HUD';
import { ShelfModal } from './components/ShelfModal';
import { CashierModal } from './components/CashierModal';
import { InventoryModal } from './components/InventoryModal';
import { SaveModal } from './components/SaveModal';
import { VirtualJoystick } from './components/VirtualJoystick';
import { RotateOverlay } from './components/RotateOverlay';
import { ToastContainer } from './components/ToastContainer';
import { SupplierModal } from './components/SupplierModal';
import { BottomBar } from './components/BottomBar';

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
  const [isSupplierOpen, setSupplierOpen] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<number>(1);

  const {
    player,
    worldTime,
    inventory,
    fixtures,
    activeFixtureModal,
    isInventoryModalOpen,
    isSaveModalOpen,
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
    if (!simulationRef.current) return;
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
      try {
        if (!simulationRef.current) return;
        const exportData = simulationRef.current.exportSaveData('local_save_default', revisionRef.current);
        const saved = await persistSave(exportData);
        revisionRef.current = saved.revision;
        setLastSavedTime(saved.updatedAt);
        setCurrentRevision(saved.revision);
        if (isManual) addToast('Đã lưu tiến trình thành công vào máy!', 'success');
      } catch (err) {
        console.error('Save error:', err);
        addToast(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu!', 'warn');
      }
    });
    await saveQueueRef.current;
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
    } catch (err) {
      console.error('Reset error:', err);
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
          addToast(`Bình minh Ngày ${newDay}! Chúc tiệm một ngày buôn bán đắt hàng! ☀️`, 'success');
          handleSaveGame(false);
        },
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
      });
      ownedViewport = viewport;

      await viewport.initialize();
      if (isCancelled) return;

      viewportRef.current = viewport;
      initialized = true;
      setIsLoading(false);
      addToast('Chào mừng bạn đến với Tiệm Tạp Hóa Đầu Hẻm! 🇻🇳', 'info');
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
    const success = simulationRef.current.restockShelf(fixtureId, productId, amount);
    if (success) {
      addToast(`Đã bày ${amount}x ${prod?.name || 'món hàng'} lên kệ!`, 'success');
    }
  };

  const handleUnstock = (fixtureId: string, amount: number) => {
    if (!simulationRef.current) return;
    const success = simulationRef.current.unstockShelf(fixtureId, amount);
    if (success) {
      addToast(`Đã cất ${amount} món hàng lại vào túi!`, 'info');
    }
  };

  const handleToggleStoreStatus = () => {
    if (!simulationRef.current) return;
    const isOpen = simulationRef.current.getClock().toggleStoreStatus();
    syncFromSimulation(simulationRef.current);
    addToast(
      isOpen ? 'Cửa tiệm đã mở, chào đón bà con trong xóm ghé mua! 🚪' : 'Đã đóng cửa tiệm nghỉ ngơi! 🔒',
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
      addToast('Không thể đặt hàng: kiểm tra số tiền hoặc cấp độ.', 'warn');
    }
  };

  const handleCheckout = (fixtureId: string) => {
    const sim = simulationRef.current;
    if (!sim) return;
    if (sim.checkoutShelf(fixtureId)) {
      syncFromSimulation(sim);
      addToast('Đã bán một món hàng và nhận tiền, kinh nghiệm!', 'success');
    } else {
      addToast('Không thể bán: tiệm đang đóng cửa hoặc kệ đã hết hàng.', 'warn');
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-retro-dark select-none touch-none">
      {/* PixiJS Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading Screen */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#1b1c1e] text-[#ffd166] flex flex-col items-center justify-center p-4">
          <div className="text-4xl animate-bounce mb-3">🏪</div>
          <h1 className="text-xl font-bold tracking-wider mb-2">TIỆM TẠP HÓA ĐẦU HẺM</h1>
          <p className="text-xs text-[#faedcd]/70 font-mono">{startupError || 'Đang tải cửa tiệm & chuẩn bị hàng hóa...'}</p>
          {startupError && <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded bg-[#8b5a2b]">Tải lại game</button>}
        </div>
      )}

      {/* Top HUD */}
      {!isLoading && (
        <HUD
          onToggleStoreStatus={handleToggleStoreStatus}
          onOpenSupplier={() => setSupplierOpen(true)}
          gameSpeed={gameSpeed}
          onToggleGameSpeed={handleToggleGameSpeed}
        />
      )}

      {/* Modals */}
      {activeFixtureModal && activeFixtureModal.type !== 'cashier_counter' && (
        <ShelfModal
          fixture={activeFixtureModal}
          inventory={inventory}
          currentDay={worldTime.day}
          onRestock={handleRestock}
          onUnstock={handleUnstock}
          onClose={closeFixtureModal}
        />
      )}

      {activeFixtureModal && activeFixtureModal.type === 'cashier_counter' && (
        <CashierModal
          fixture={activeFixtureModal}
          player={player}
          worldTime={worldTime}
          shelves={fixtures.filter((fixture) => fixture.type !== 'cashier_counter')}
          statistics={statistics}
          onCheckout={handleCheckout}
          onToggleStoreStatus={handleToggleStoreStatus}
          onAdvanceDay={handleAdvanceDay}
          onClose={closeFixtureModal}
        />
      )}

      {isInventoryModalOpen && (
        <InventoryModal inventory={inventory} currentDay={worldTime.day} onClose={closeAllModals} />
      )}

      {isSaveModalOpen && (
        <SaveModal
          onManualSave={() => handleSaveGame(true)}
          onResetSave={handleResetGame}
          onClose={closeAllModals}
          lastSavedAt={lastSavedTime}
          revision={currentRevision}
        />
      )}

      {isSupplierOpen && (
        <SupplierModal player={player} pendingOrders={pendingOrders} inventory={inventory} onOrder={handleSupplierOrder} onClose={() => setSupplierOpen(false)} />
      )}

      {/* Mobile Touch Controls & Virtual Joystick */}
      {!isLoading && (
        <VirtualJoystick
          onMove={handleMobileJoystickMove}
          onInteract={handleMobileInteract}
        />
      )}

      {/* Rotate Device Screen (For Portrait Viewports) */}
      <RotateOverlay />

      {/* Bottom Hint Bar (matching reference image) */}
      {!isLoading && <BottomBar />}

      {/* Cozy Notifications */}
      <ToastContainer />
    </div>
  );
};
export default App;
