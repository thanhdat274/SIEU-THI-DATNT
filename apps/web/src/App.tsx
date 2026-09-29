import React, { useEffect, useRef, useState, useCallback } from 'react';
import { generateStarterTileMap, PRODUCT_MAP } from '@game/data';
import { InputManager, GameSimulation } from '@game/core';
import { PixiGameViewport } from '@game/renderer';
import { SaveGameData, StoreFixture } from '@game/shared';

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

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<GameSimulation | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const viewportRef = useRef<PixiGameViewport | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [currentRevision, setCurrentRevision] = useState<number>(1);

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
    setNearbyFixture(sim.getActiveFixture());
  }, [setPlayerData, setWorldTime, setInventory, setFixtures, setNearbyFixture]);

  // Save progress to Dexie
  const handleSaveGame = useCallback(async (isManual: boolean = false) => {
    if (!simulationRef.current) return;
    try {
      const exportData = simulationRef.current.exportSaveData('local_save_default', currentRevision);
      await persistSave(exportData);
      setLastSavedTime(exportData.updatedAt);
      setCurrentRevision(exportData.revision);
      if (isManual) {
        addToast('Đã lưu tiến trình thành công vào máy!', 'success');
      }
    } catch (err) {
      console.error('Save error:', err);
      addToast('Lỗi khi lưu dữ liệu!', 'warn');
    }
  }, [currentRevision, addToast]);

  // Reset progress
  const handleResetGame = useCallback(async () => {
    try {
      const freshSave = await resetSaveToDefault();
      if (simulationRef.current) {
        simulationRef.current.importSaveData(freshSave);
        syncFromSimulation(simulationRef.current);
      }
      setCurrentRevision(freshSave.revision);
      setLastSavedTime(freshSave.updatedAt);
      addToast('Đã khởi tạo lại tiệm mới thành công!', 'info');
    } catch (err) {
      console.error('Reset error:', err);
    }
  }, [syncFromSimulation, addToast]);

  useEffect(() => {
    let isCancelled = false;

    async function initGame() {
      if (!canvasRef.current) return;

      // 1. Load or create initial save from IndexedDB
      const initialSave: SaveGameData = await loadOrCreateSave();
      if (isCancelled) return;

      setCurrentRevision(initialSave.revision);
      setLastSavedTime(initialSave.updatedAt);

      // 2. Setup inputs
      const inputManager = new InputManager();
      inputManager.attachListeners();
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
        onStateChanged: () => {
          if (simulationRef.current) {
            syncFromSimulation(simulationRef.current);
          }
        },
      });
      simulationRef.current = simulation;

      // Sync initial state
      syncFromSimulation(simulation);

      // 5. Setup PixiJS Viewport
      const viewport = new PixiGameViewport({
        canvas: canvasRef.current,
        tileMap,
        simulation,
      });

      await viewport.initialize();
      if (isCancelled) {
        viewport.destroy();
        return;
      }

      viewportRef.current = viewport;
      setIsLoading(false);
      addToast('Chào mừng bạn đến với Tiệm Tạp Hóa Đầu Hẻm! 🇻🇳', 'info');
    }

    initGame();

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
      if (inputManagerRef.current) {
        inputManagerRef.current.detachListeners();
      }
      if (viewportRef.current) {
        viewportRef.current.destroy();
      }
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
    addToast('Đã chuyển sang ngày mới! 🌅', 'success');
    handleSaveGame(false);
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-retro-dark select-none touch-none">
      {/* PixiJS Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading Screen */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-[#1b1c1e] text-[#ffd166] flex flex-col items-center justify-center p-4">
          <div className="text-4xl animate-bounce mb-3">🏪</div>
          <h1 className="text-xl font-bold tracking-wider mb-2">TIỆM TẠP HÓA ĐẦU HẺM</h1>
          <p className="text-xs text-[#faedcd]/70 font-mono">Đang tải cửa tiệm & chuẩn bị hàng hóa...</p>
        </div>
      )}

      {/* Top HUD */}
      {!isLoading && <HUD onToggleStoreStatus={handleToggleStoreStatus} />}

      {/* Modals */}
      {activeFixtureModal && activeFixtureModal.type !== 'cashier_counter' && (
        <ShelfModal
          fixture={activeFixtureModal}
          inventory={inventory}
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
          onToggleStoreStatus={handleToggleStoreStatus}
          onAdvanceDay={handleAdvanceDay}
          onClose={closeFixtureModal}
        />
      )}

      {isInventoryModalOpen && (
        <InventoryModal inventory={inventory} onClose={closeAllModals} />
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

      {/* Mobile Touch Controls & Virtual Joystick */}
      {!isLoading && (
        <VirtualJoystick
          onMove={handleMobileJoystickMove}
          onInteract={handleMobileInteract}
        />
      )}

      {/* Rotate Device Screen (For Portrait Viewports) */}
      <RotateOverlay />

      {/* Cozy Notifications */}
      <ToastContainer />
    </div>
  );
};
export default App;
