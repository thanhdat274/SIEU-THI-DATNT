import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { effectiveShelfCapacity, generateStarterTileMap, getSeasonForDay, PRODUCT_MAP, SECURITY_RULES, WEATHER_MAP } from '@game/data';
import { InputManager, GameSimulation } from '@game/core';
import { PixiGameViewport } from '@game/renderer';
import { GameSnapshot, SaveGameData, SupplierOrder, StaffShift, DailyRecord, isSalesFixture, isWarehouseFixture, slotGroup } from '@game/shared';

import { getActiveSlotId, loadOrCreateSave, persistSave, replaceSaveWithImported, resetSaveToDefault, restoreFromBackup } from './db';
import { releaseSlotLock } from './slot-lock';
import { buildSaveFile, saveFileName } from './save-file';
import { useGameStore } from './store/useGameStore';
import { HUD } from './components/HUD';
import { AccountBar } from './components/AccountBar';
import { LoginScreen } from './components/LoginScreen';
import { type WorldDetail, createWorldInvite, commitOnlineCommand, getOnlineWorld, touchWorldSession } from './services/api';
import { WarehouseModal } from './components/WarehouseModal';
import { ShelfModal } from './components/ShelfModal';
import { CashierModal } from './components/CashierModal';
import { DiningTableModal } from './components/DiningTableModal';
import { InventoryModal } from './components/InventoryModal';
import { SaveModal } from './components/SaveModal';
import { VirtualJoystick } from './components/VirtualJoystick';
import { RotateOverlay } from './components/RotateOverlay';
import { ToastContainer } from './components/ToastContainer';
import { SupplierModal } from './components/SupplierModal';
import { BottomBar } from './components/BottomBar';
import { WarehouseDock } from './components/WarehouseDock';
import { TimeVoteModal } from './components/TimeVoteModal';
import { StoreLayoutModal } from './components/StoreLayoutModal';
import { StorePlanogramModal } from './components/StorePlanogramModal';
import { QuestModal } from './components/QuestModal';
import { LevelRoadmapModal } from './components/LevelRoadmapModal';
import { feedbackReasonLabel, levelUnlockToast } from '@game/core';
import { StallModal } from './components/StallModal';
import { MarketModal } from './components/MarketModal';
import { TaxModal } from './components/TaxModal';
import { DaySummaryModal } from './components/DaySummaryModal';
import { RegularsModal } from './components/RegularsModal';
import { SkillsModal } from './components/SkillsModal';
import { TitlesModal } from './components/TitlesModal';
import { MaintenanceModal } from './components/MaintenanceModal';
import { ReviewsModal } from './components/ReviewsModal';
import { SecurityModal } from './components/SecurityModal';
import type { StoreLayoutAction } from '@game/core';
import { money, PixelButton, PixelIcon } from './components/pixel';
import { useWorldSocket } from './hooks/useWorldSocket';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<GameSimulation | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const viewportRef = useRef<PixiGameViewport | null>(null);
  const revisionRef = useRef(1);
  const [staffRequested, setStaffRequested] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const initializationRef = useRef<Promise<void>>(Promise.resolve());
  const onlineWorldRef = useRef<WorldDetail | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [onlineWorld, setOnlineWorld] = useState<WorldDetail | null>(null);
  const [onlineToken, setOnlineToken] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string>('');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [currentRevision, setCurrentRevision] = useState<number>(1);
  const [pendingOrders, setPendingOrders] = useState<SupplierOrder[]>([]);
  const [statistics, setStatistics] = useState<SaveGameData['statistics']>({ totalRevenue: 0, totalCustomersServed: 0, totalDaysPassed: 0 });
  const [isQuestOpen, setQuestOpen] = useState(false);
  const [isLevelRoadmapOpen, setLevelRoadmapOpen] = useState(false);
  const [isStallOpen, setStallOpen] = useState(false);
  const [isMarketOpen, setMarketOpen] = useState(false);
  const [isTaxOpen, setTaxOpen] = useState(false);
  const [isRegularsOpen, setRegularsOpen] = useState(false);
  const [isSkillsOpen, setSkillsOpen] = useState(false);
  const [isTitlesOpen, setTitlesOpen] = useState(false);
  const [isMaintenanceOpen, setMaintenanceOpen] = useState(false);
  const [isReviewsOpen, setReviewsOpen] = useState(false);
  const [isSecurityOpen, setSecurityOpen] = useState(false);
  const [daySummaryRecord, setDaySummaryRecord] = useState<DailyRecord | null>(null);
  // Bảng kế hoạch chỉ tính khi mở bảng Thị trường hoặc sang ngày mới, không mỗi khung hình.
  const planDay = useGameStore((state) => state.worldTime.day);
  const marketPlans = useMemo(() => {
    const sim = simulationRef.current;
    return isMarketOpen && sim ? { plans: sim.getProductPlans(), trending: sim.getTrendingProducts() } : { plans: undefined, trending: undefined };
    // planDay is a deliberate cache-buster: plans must refresh when the day changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarketOpen, planDay]);
  const [isWarehouseDockOpen, setWarehouseDockOpen] = useState(() => !window.matchMedia('(max-width: 1023px), (max-height: 499px)').matches);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isPlanogramOpen, setIsPlanogramOpen] = useState(false);
  const [activeTimeVote, setActiveTimeVote] = useState<{
    type: 'advance_day' | 'change_speed';
    targetSpeed?: number;
    initiatedBy: string;
    expiresInMs: number;
    approvalsCount: number;
    totalRequired: number;
  } | null>(null);
  // tracks whether online server is reachable (used to block mutations when network drops)
  const [onlineConnected, setOnlineConnected] = useState(true);
  const onlineConnectedRef = useRef(true);
  const [showWorldCaption, setShowWorldCaption] = useState(true);

  useEffect(() => {
    if (!gameStarted) {
      setShowWorldCaption(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowWorldCaption(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [gameStarted]);

  const {
    player,
    worldTime,
    inventory,
    holdingArea,
    planogram,
    fixtures,
    customers,
    dailyRecords,
    currentDayRecord,
    activeFixtureModal,
    isInventoryModalOpen,
    isSaveModalOpen,
    isSupplierModalOpen,
    openSupplierModal,
    setPlayerData,
    setWorldTime,
    setInventory,
    setHoldingArea,
    setPlanogram,
    setFixtures,
    setCustomers,
    setNearbyFixture,
    setDailyRecords,
    setCurrentDayRecord,
    setLedger,
    openFixtureModal,
    showFixtureSlot,
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
    setHoldingArea(sim.getHoldingArea());
    setPlanogram(sim.getPlanogram());
    setDailyRecords(sim.getDailyRecords());
    setCurrentDayRecord(sim.getCurrentDayRecord());
    setLedger(sim.getLedger());
    setFixtures(sim.getFixtures());
    setCustomers(sim.getCustomers());
    setPendingOrders(sim.getPendingOrders());
    setStatistics(sim.getStatistics());
    setNearbyFixture(sim.getActiveFixture());
  }, [setPlayerData, setWorldTime, setInventory, setHoldingArea, setPlanogram, setDailyRecords, setCurrentDayRecord, setLedger, setFixtures, setCustomers, setNearbyFixture]);

  // Save progress to Dexie
  const handleSaveGame = useCallback(async (isManual: boolean = false) => {
    if (!simulationRef.current) return false;
    if (onlineWorldRef.current) {
      if (isManual) addToast('Tiệm online được lưu trên máy chủ.', 'info');
      return false;
    }
    let savedSuccessfully = false;
    saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
      try {
        if (!simulationRef.current) return;
        const exportData = simulationRef.current.exportSaveData(getActiveSlotId(), revisionRef.current);
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
    if (onlineWorldRef.current) {
      addToast('Không thể đặt lại save máy khi đang chơi trong hẻm online.', 'warn');
      return false;
    }
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

  // Xuất bản lưu hiện tại (trạng thái đang chơi, không phải bản trong DB) ra file JSON để sao lưu/chuyển máy.
  const handleExportSave = useCallback(async () => {
    if (onlineWorldRef.current) {
      addToast('Tiệm online nằm trên máy chủ, không xuất file được.', 'warn');
      return false;
    }
    if (!simulationRef.current) return false;
    try {
      await saveQueueRef.current;
      const data = simulationRef.current.exportSaveData(getActiveSlotId(), revisionRef.current);
      const url = URL.createObjectURL(new Blob([buildSaveFile(data)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = saveFileName(data);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast('Đã xuất bản lưu ra file.', 'success');
      return true;
    } catch (err) {
      console.error('Export error:', err);
      addToast('Không xuất được file. Hãy thử lại.', 'warn');
      return false;
    }
  }, [addToast]);

  // Nhập save đã được modal kiểm tra (`parseSaveFile`); bản hiện tại được giữ làm backup.
  const handleImportSave = useCallback(async (save: Parameters<typeof replaceSaveWithImported>[0]) => {
    if (onlineWorldRef.current) {
      addToast('Không thể nhập save máy khi đang chơi trong hẻm online.', 'warn');
      return false;
    }
    try {
      await saveQueueRef.current;
      const stored = await replaceSaveWithImported(save);
      if (simulationRef.current) {
        simulationRef.current.importSaveData(stored);
        syncFromSimulation(simulationRef.current);
      }
      setCurrentRevision(stored.revision);
      revisionRef.current = stored.revision;
      setLastSavedTime(stored.updatedAt);
      setGameSpeed(Math.max(1, stored.worldTime.timeScale / 60));
      addToast('Đã nhập bản lưu. Bản cũ được giữ làm bản dự phòng.', 'success');
      return true;
    } catch (err) {
      console.error('Import error:', err);
      addToast(err instanceof Error ? err.message : 'Không nhập được bản lưu.', 'warn');
      return false;
    }
  }, [syncFromSimulation, addToast]);

  const onlineUidRef = useRef<string | null>(null);
  const spawnPlacedForRef = useRef<string | null>(null);

  // Vị trí đứng là của riêng từng người chơi; save dùng chung không được kéo người kia về chỗ cũ.
  const importOnlineSave = useCallback((sim: GameSimulation, save: Parameters<GameSimulation['importSaveData']>[0]) => {
    const { position, direction } = sim.getPlayerData();
    sim.importSaveData(save);
    sim.setPlayerPosition(position, direction);
  }, []);

  const handleEnterGame = (onlineWorldDetail?: WorldDetail) => {
    if (onlineWorldDetail) {
      setOnlineWorld(onlineWorldDetail);
      onlineWorldRef.current = onlineWorldDetail;
      // Record lastSeenRevision and store token for WebSocket connection
      import('./services/firebase').then(({ gameAuth }) => {
        const user = gameAuth().currentUser;
        if (user) {
          onlineUidRef.current = user.uid;
          user.getIdToken().then((token: string) => {
            setOnlineToken(token);
            touchWorldSession(token, onlineWorldDetail.world.id).catch(() => {});
          });
        }
      });
    } else {
      setOnlineWorld(null);
      setOnlineToken(null);
      onlineWorldRef.current = null;
    }
    setIsLoading(true);
    setGameStarted(true);
  };

  const handleOnlineInvite = async () => {
    if (!onlineWorld) return;
    try {
      const { gameAuth } = await import('./services/firebase');
      const user = gameAuth().currentUser;
      if (!user) throw new Error('Cần đăng nhập.');
      const token = await user.getIdToken();
      const invite = await createWorldInvite(token, onlineWorld.world.id);
      navigator.clipboard?.writeText(invite.token);
      window.prompt('Mã mời tham gia hẻm (đã sao chép vào bộ nhớ tạm):', invite.token);
      addToast('Đã tạo mã mời tham gia hẻm thành công!', 'success');
    } catch (err) {
      console.error(err);
      addToast(err instanceof Error ? err.message : 'Không tạo được lời mời.', 'warn');
    }
  };

  const handleLeaveOnline = () => {
    if (window.confirm('Rời hẻm online để quay lại tiệm riêng trên máy này?')) {
      window.location.reload();
    }
  };

  const handleReturnHome = useCallback(async () => {
    if (onlineWorldRef.current && !window.confirm('Rời phòng chơi chung để về màn hình chính?')) {
      return;
    }
    try {
      if (!onlineWorldRef.current) {
        addToast('Đang lưu tiến trình...', 'info');
        await handleSaveGame(false);
      }
      closeAllModals();
      setQuestOpen(false);
      setStallOpen(false);
      setMarketOpen(false);
      setTaxOpen(false);
      setIsLayoutOpen(false);
      setIsPlanogramOpen(false);
      setOnlineWorld(null);
      setOnlineToken(null);
      onlineWorldRef.current = null;
      releaseSlotLock();
      setGameStarted(false);
    } catch (err) {
      console.error('Lỗi khi quay về màn hình chính:', err);
      releaseSlotLock();
      setGameStarted(false);
    }
  }, [addToast, closeAllModals, handleSaveGame]);

  const blockOfflineOnlineMutation = () => {
    if (!onlineWorldRef.current || onlineConnectedRef.current) return false;
    addToast('Mất kết nối hẻm chung. Thao tác đã bị chặn — đang chờ kết nối lại.', 'warn');
    return true;
  };

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
      if (!gameStarted) return;
      if (!canvasRef.current) return;

      // 1. Load initial save: either online business save or local IndexedDB save
      let initialSave: SaveGameData;
      try {
        if (onlineWorld && onlineWorld.businesses.length > 0) {
          initialSave = onlineWorld.businesses[0].save;
        } else {
          initialSave = await loadOrCreateSave();
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to load local game save:', err);
        setStartupError(
          err instanceof Error
            ? `Lỗi nạp dữ liệu lưu: ${err.message}`
            : 'Không thể đọc bản lưu từ thiết bị. Dữ liệu chưa bị ghi đè.'
        );
        setIsLoading(true);
        return;
      }
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
      const tileMap = generateStarterTileMap(initialSave.storeLayout.unlockedPlotIds ?? []);

      // 4. Setup simulation
      const simulation = new GameSimulation(initialSave, tileMap, inputManager, {
        onMapChanged: (map) => viewportRef.current?.updateTileMap(map),
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
          const season = getSeasonForDay(newDay);
          const previous = getSeasonForDay(newDay - 1);
          addToast(season && season.id !== previous?.id ? `${season.name} bắt đầu! ${season.blurb}` : `Bình minh Ngày ${newDay}! Chúc tiệm một ngày buôn bán đắt hàng! `, 'success');
          const completedRecord = simulationRef.current?.getDailyRecords()[newDay - 1];
          if (completedRecord) setDaySummaryRecord({ ...completedRecord });
          handleSaveGame(false);
        },
        onMarketNotice: (notice) => addToast(notice.text, notice.severity === 'severe' ? 'warn' : 'info'),
        onSecurityNotice: (notice) => addToast(notice.text, notice.severity),
        onMaintenanceNotice: (notices) => {
          for (const notice of notices) {
            addToast(notice.broken === 'major' ? `${notice.label} hỏng nặng, phải mua mới (Sửa chữa).` : `${notice.label} bị hỏng, cần sửa (Sửa chữa).`, 'warn');
          }
        },
        onWeatherChanged: (weatherId) => addToast(`Thời tiết hôm nay: ${WEATHER_MAP[weatherId]?.icon ?? ''} ${WEATHER_MAP[weatherId]?.label ?? weatherId}.`, 'info'),
        onLevelUp: (level) => {
          addToast(`Lên cấp ${level}!`, 'success');
          addToast(levelUnlockToast(level), 'success');
        },
        onCustomerRated: ({ stars, average, reason, review }) => {
          const why = reason ? ` · ${feedbackReasonLabel(reason)}` : '';
          const quote = review ? `${review.author}: “${review.text}” ` : '';
          addToast(`${quote}${stars}★${why} · trung bình ${average.toFixed(1)}★`, stars <= 2 ? 'warn' : 'info');
        },
        onToast: (message, type) => addToast(message, type),
        onPlayerRelocated: ()=>addToast('Đã đưa bạn tới cửa hậu của nhà kho mới; tiền và hàng được giữ nguyên.','info'),
        onOrdersDelivered: (quantity)=>addToast(`Đã nhận ${quantity} món từ đại lý vào nhà kho.`, 'success'),
        onStockExpired: (quantity) => {
          addToast(`${quantity} món hàng đã quá hạn và được loại khỏi kho/kệ.`, 'warn');
        },
        onStockWarning: ({ lowStock, slowMoving, examples }) => {
          const parts = [lowStock ? `${lowStock} món sắp hết (${examples.join(', ')}${lowStock > examples.length ? '…' : ''})` : '', slowMoving ? `${slowMoving} món chậm bán` : ''].filter(Boolean);
          addToast(`Kho: ${parts.join('; ')}. Xem chi tiết ở bảng Thị trường.`, 'info');
        },
        onExpiringSoon: (items) => {
          const names = items.slice(0, 3).map((item) => `${PRODUCT_MAP[item.productId]?.name ?? item.productId} (${item.quantity}, còn ${item.daysLeft} ngày)`).join(', ');
          addToast(`Sắp hết hạn: ${names}${items.length > 3 ? ` và ${items.length - 3} món khác` : ''}. Bán nhanh hoặc tiêu hủy.`, 'warn');
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
      // Chỉ dev: console dùng `__sim` để ép cấp/tiền (addExperience, addMoney) hoặc nạp save đã chỉnh (importSaveData) khi QA.
      if (import.meta.env.DEV) (window as unknown as { __sim?: GameSimulation }).__sim = simulation;

      // Sync initial state
      syncFromSimulation(simulation);

      // 5. Setup PixiJS Viewport
      const viewport = new PixiGameViewport({
        canvas: canvasRef.current,
        tileMap: simulation.getTileMap(),
        simulation,
        onZoomChange: setZoomLevel,
        getPartnerAvatar: () => {
          const curWorld = onlineWorldRef.current;
          if (!curWorld || curWorld.world.avatars.length <= 1) return null;
          // Partner is the avatar that does not belong to the signed-in account
          const myUid = onlineUidRef.current;
          const partner = myUid ? curWorld.world.avatars.find(avatar => avatar.accountId !== myUid) : null;
          return partner ? { position: partner.position, direction: partner.direction, name: partner.displayName?.trim() || 'Bạn cùng hẻm' } : null;
        },
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

    // Auto-save timer every 30 seconds for local solo game (does not run when playing online)
    const autoSaveInterval = setInterval(() => {
      if (!onlineWorldRef.current) {
        handleSaveGame(false);
      }
    }, 30000);

    // Online world sync interval (polls snapshot/partner updates every 3 seconds)
    let consecutiveFailures = 0;
    const onlineSyncInterval = setInterval(async () => {
      const curWorld = onlineWorldRef.current;
      if (!curWorld) return;
      try {
        const { gameAuth } = await import('./services/firebase');
        const user = gameAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const updated = await getOnlineWorld(token, curWorld.world.id);
        onlineWorldRef.current = updated;
        setOnlineWorld(updated);
        // Restore connection status after success
        if (!onlineConnectedRef.current) {
          onlineConnectedRef.current = true;
          setOnlineConnected(true);
        }
        consecutiveFailures = 0;
        // If partner committed new revision, sync simulation (resync never uploads local save)
        if (simulationRef.current && updated.businesses[0]?.save) {
          const remoteRev = updated.world.revision;
          if (remoteRev > revisionRef.current) {
            revisionRef.current = remoteRev;
            setCurrentRevision(remoteRev);
            importOnlineSave(simulationRef.current, updated.businesses[0].save);
            syncFromSimulation(simulationRef.current);
          }
        }
      } catch (err) {
        consecutiveFailures++;
        console.debug('Online sync check failed:', err);
        // Mark disconnected after 2 consecutive failures (~6s)
        if (consecutiveFailures >= 2 && onlineConnectedRef.current) {
          onlineConnectedRef.current = false;
          setOnlineConnected(false);
        }
      }
    }, 3000);

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
      clearInterval(onlineSyncInterval);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (initialized) dispose();
    };
  // Re-subscribing on every handler identity change would recreate the game loop; deps kept minimal on purpose.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast, closeAllModals, gameStarted, handleSaveGame, openFixtureModal, setNearbyFixture, syncFromSimulation]);

  // Real-time WebSocket connection to receive instant world:update notifications
  const worldSocket = useWorldSocket({
    worldId: onlineWorld?.world.id ?? null,
    token: onlineToken,
    onWorldUpdate: async (data) => {
      const curWorld = onlineWorldRef.current;
      if (!curWorld || !simulationRef.current) return;
      if (data.revision > revisionRef.current) {
        try {
          const { gameAuth } = await import('./services/firebase');
          const user = gameAuth().currentUser;
          if (!user) return;
          const token = await user.getIdToken();
          const updated = await getOnlineWorld(token, curWorld.world.id);
          onlineWorldRef.current = updated;
          setOnlineWorld(updated);
          revisionRef.current = updated.world.revision;
          setCurrentRevision(updated.world.revision);
          if (updated.businesses[0]?.save) {
            importOnlineSave(simulationRef.current, updated.businesses[0].save);
            syncFromSimulation(simulationRef.current);
          }
        } catch (err) {
          console.debug('[WS] onWorldUpdate sync failed:', err);
        }
      }
    },
    onSnapshot: (value) => {
      if (!value || typeof value !== 'object' || !('world' in value)) return;
      const snapshot = value as GameSnapshot;
      const current = onlineWorldRef.current;
      if (!current || snapshot.world.id !== current.world.id) return;
      const priorDay = current.world.worldTime.day;
      const priorHour = current.world.worldTime.hour;
      const priorMinute = current.world.worldTime.minute;
      const updated = { ...current, world: snapshot.world, businesses: snapshot.businesses };
      onlineWorldRef.current = updated;
      setOnlineWorld(updated);
      if (snapshot.world.revision > revisionRef.current && snapshot.businesses[0]?.save && simulationRef.current) {
        importOnlineSave(simulationRef.current, snapshot.businesses[0].save);
        revisionRef.current = snapshot.world.revision;
        setCurrentRevision(snapshot.world.revision);
        syncFromSimulation(simulationRef.current);
      } else if (snapshot.world.worldTime.day !== priorDay || snapshot.world.worldTime.hour !== priorHour || snapshot.world.worldTime.minute !== priorMinute) {
        const sim = simulationRef.current;
        if (sim) {
          sim.getClock().setTime(snapshot.world.worldTime);
          syncFromSimulation(sim);
        }
      }
    },
    onTimeVote: (value) => {
      if (!value || typeof value !== 'object') return;
      const data = value as { status?: typeof activeTimeVote; result?: { status?: string } };
      if (data.status) setActiveTimeVote(data.status);
      else if (data.result?.status === 'executed' || data.result?.status === 'rejected') setActiveTimeVote(null);
    },
    onSessionEnded: (_event, payload) => {
      setOnlineConnected(false);
      onlineConnectedRef.current = false;
      const reason = payload && typeof payload === 'object' && 'reason' in payload ? String(payload.reason) : '';
      addToast(reason || 'Phiên chơi chung đã kết thúc.', 'warn');
    },
  });

  useEffect(() => {
    const worldId = onlineWorld?.world.id;
    if (!gameStarted || !worldId || spawnPlacedForRef.current === worldId) return;
    const timer = setInterval(() => {
      const uid = onlineUidRef.current;
      const sim = simulationRef.current;
      const mine = uid ? onlineWorldRef.current?.world.avatars.find(avatar => avatar.accountId === uid) : null;
      if (!sim || !mine) return;
      sim.setPlayerPosition(mine.position, mine.direction);
      spawnPlacedForRef.current = worldId;
      clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, [gameStarted, onlineWorld?.world.id]);

  useEffect(() => {
    if (!gameStarted || !onlineWorld || !worldSocket.connected) return;
    const interval = setInterval(() => {
      const direction = inputManagerRef.current?.getMovementVector();
      if (direction) worldSocket.sendInput(direction);
    }, 100);
    return () => clearInterval(interval);
  // Interval reads the latest online world through refs; only these values should restart it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, onlineWorld?.world.id, worldSocket.connected, worldSocket.sendInput]);

  // After a rejected commit, adopt the server's current world (not the possibly stale
  // copy we held) so the next action uses the right revision and sees the real state.
  const resyncOnlineWorldAfterReject = async (fallback: WorldDetail) => {
    const sim = simulationRef.current;
    if (!sim) return;
    try {
      const { gameAuth } = await import('./services/firebase');
      const user = gameAuth().currentUser;
      if (!user) throw new Error('not signed in');
      const fresh = await getOnlineWorld(await user.getIdToken(), fallback.world.id);
      onlineWorldRef.current = fresh;
      setOnlineWorld(fresh);
      revisionRef.current = fresh.world.revision;
      setCurrentRevision(fresh.world.revision);
      importOnlineSave(sim, fresh.businesses[0].save);
    } catch {
      importOnlineSave(sim, fallback.businesses[0].save);
    }
    syncFromSimulation(sim);
  };

  // Helper to commit online business mutation or fallback to local
  const commitBusinessChange = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload is any command shape serialized to the server
    commandPayload: any,
    activityDesc: string,
    activityType: string
  ) => {
    const curWorld = onlineWorldRef.current;
    if (!curWorld || !simulationRef.current) return false;
    // Block mutations when not connected to prevent uploading stale data
    if (!onlineConnectedRef.current) {
      addToast('Mất kết nối hẻm chung. Thao tác không được lưu — đang chờ kết nối lại...', 'warn');
      return false;
    }
    try {
      const { gameAuth } = await import('./services/firebase');
      const user = gameAuth().currentUser;
      if (!user) throw new Error('Cần đăng nhập tài khoản.');
      const token = await user.getIdToken();

      const exportedSave = simulationRef.current.exportSaveData(
        curWorld.businesses[0].save.id,
        curWorld.world.revision + 1
      );

      const commandId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `cmd-${Date.now()}`;
      const res = await commitOnlineCommand(token, curWorld.world.id, {
        expectedRevision: curWorld.world.revision,
        receipt: {
          commandId,
          actorId: user.uid,
          status: 'accepted',
          revision: curWorld.world.revision + 1,
          payloadJson: JSON.stringify(commandPayload),
        },
        updatedBusiness: {
          ...curWorld.businesses[0],
          save: exportedSave,
        },
        activity: {
          actorId: user.uid,
          type: activityType,
          description: activityDesc,
        },
      });

      if (res.committed) {
        revisionRef.current = res.revision;
        setCurrentRevision(res.revision);
        const committedSave = res.updatedBusiness?.save
          ? res.updatedBusiness.save as SaveGameData
          : exportedSave;
        if (res.updatedBusiness?.save) {
          importOnlineSave(simulationRef.current, committedSave);
          syncFromSimulation(simulationRef.current);
        }
        const updatedWorld = {
          ...curWorld,
          world: { ...curWorld.world, revision: res.revision },
          businesses: [{ ...curWorld.businesses[0], ...(res.updatedBusiness ?? {}), save: committedSave }],
        };
        onlineWorldRef.current = updatedWorld;
        setOnlineWorld(updatedWorld);
        return true;
      } else {
        await resyncOnlineWorldAfterReject(curWorld);
        addToast('Máy chủ từ chối thay đổi. Đã khôi phục dữ liệu online gần nhất.', 'warn');
        return false;
      }
    } catch (err) {
      console.error('Online commit error:', err);
      await resyncOnlineWorldAfterReject(curWorld);
      addToast(err instanceof Error ? err.message : 'Không thể lưu lên hẻm chung.', 'warn');
      return false;
    }
  };

  const persistSimulationMutation = async <T extends { success: boolean; reason?: string }>(
    payload: unknown,
    description: string,
    activityType: string,
    mutate: (simulation: GameSimulation) => T,
  ): Promise<T | null> => {
    if (blockOfflineOnlineMutation()) return null;
    const simulation = simulationRef.current;
    if (!simulation) return null;
    const result = mutate(simulation);
    if (!result.success) return result;
    syncFromSimulation(simulation);
    if (onlineWorldRef.current) {
      const committed = await commitBusinessChange(payload, description, activityType);
      if (!committed) return { ...result, success: false, reason: 'Máy chủ chưa xác nhận thay đổi.' };
    } else {
      await handleSaveGame(false);
    }
    return result;
  };

  // Actions triggered from UI
  const handleSetSellingPrice = async (productId: string, requestedPrice: number | null) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const result = sim.setSellingPrice(productId, requestedPrice);
    if (!result.success) { addToast(result.reason ?? 'Không đổi được giá bán.', 'warn'); return; }
    syncFromSimulation(sim);
    const productName = PRODUCT_MAP[productId]?.name ?? productId;
    if (onlineWorldRef.current) {
      await commitBusinessChange({ type: 'set_price', productId, price: requestedPrice === null ? null : result.price }, `Đổi giá ${productName} thành ${result.price?.toLocaleString('vi-VN')}₫`, 'Đặt giá');
    } else {
      await handleSaveGame(false);
    }
    addToast(`Đã đặt giá ${productName}: ${result.price?.toLocaleString('vi-VN')}₫.`, 'success');
  };

  const handleRestock = async (fixtureId: string, productId: string, amount: number) => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const prod = PRODUCT_MAP[productId];
    const res = simulationRef.current.transferToShelf(fixtureId, productId, amount);
    if (res.success && res.actualQuantity > 0) {
      const count = res.actualQuantity;
      addToast(`Đã bày ${count}x ${prod?.name || 'món hàng'} lên kệ!`, 'success');
      syncFromSimulation(simulationRef.current);
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'restock', fixtureId, productId, quantity: count },
          `Bày ${count}x ${prod?.name || 'món hàng'} lên kệ`,
          'Bày hàng'
        );
      }
    } else addToast('Không thể bày hàng lên kệ này.', 'warn');
  };

  const handleUnstock = async (fixtureId: string, amount: number) => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const res = simulationRef.current.transferFromShelf(fixtureId, amount);
    if (res.success && res.actualQuantity > 0) {
      const count = res.actualQuantity;
      addToast(`Đã cất ${count} món hàng lại vào nhà kho!`, 'info');
      syncFromSimulation(simulationRef.current);
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'unstock', fixtureId, quantity: count },
          `Cất ${count} món hàng lại vào kho`,
          'Cất hàng'
        );
      }
    } else addToast('Không thể cất: kho mát có thể đã hết chỗ.', 'warn');
  };

  const openStaffFromHud = () => {
    const counter = fixtures.find(f => f.type === 'cashier_counter');
    if (!counter) { addToast('Chưa có quầy thu ngân để quản lý nhân viên.', 'warn'); return; }
    setStaffRequested(true);
    openFixtureModal(counter);
  };
  useEffect(() => { if (!activeFixtureModal) setStaffRequested(false); }, [activeFixtureModal]);

  const handleToggleStoreStatus = async () => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    const isOpen = simulationRef.current.getClock().toggleStoreStatus();
    syncFromSimulation(simulationRef.current);
    addToast(
      isOpen ? 'Cửa tiệm đã mở, chào đón bà con trong xóm ghé mua! ' : 'Đã đóng cửa tiệm nghỉ ngơi! ',
      isOpen ? 'success' : 'info'
    );
    if (onlineWorldRef.current) {
      await commitBusinessChange({ type: 'store_status', isOpen }, isOpen ? 'Mở cửa tiệm' : 'Đóng cửa tiệm', 'Trạng thái tiệm');
    }
  };

  const handleApplyStoreLayout = async (nextSave: SaveGameData, actions: StoreLayoutAction[]): Promise<boolean> => {
    if (blockOfflineOnlineMutation()) return false;
    const simulation = simulationRef.current;
    if (!simulation || worldTime.isStoreOpen) return false;
    const previousSave = simulation.exportSaveData(onlineWorldRef.current?.businesses[0]?.save.id ?? 'local_save_default', currentRevision);
    const result = simulation.applyStoreLayout(nextSave);
    if (!result.save) {
      addToast('Không thể áp dụng bố cục. Hãy kiểm tra lối đi và trạng thái tiệm.', 'warn');
      return false;
    }
    syncFromSimulation(simulation);
    if (onlineWorldRef.current) {
      return await commitBusinessChange({ type: 'layout_batch', actions }, 'Sắp xếp cửa hàng', 'Bố cục cửa hàng');
    } else {
      const saved = await handleSaveGame(false);
      if (!saved) {
        simulation.importSaveData(previousSave);
        syncFromSimulation(simulation);
        return false;
      }
      addToast('Đã lưu bố cục cửa hàng.', 'success');
      return true;
    }
  };

  const openLayoutEditor = () => {
    simulationRef.current?.setPaused(true);
    inputManagerRef.current?.setEnabled(false);
    setIsLayoutOpen(true);
  };
  const closeLayoutEditor = () => {
    simulationRef.current?.setPaused(false);
    inputManagerRef.current?.setEnabled(true);
    setIsLayoutOpen(false);
  };

  const handleAdvanceDay = async () => {
    if (blockOfflineOnlineMutation()) return;
    if (!simulationRef.current) return;
    // In online mode with 2 players, time vote is required
    const curWorld = onlineWorldRef.current;
    if (curWorld && curWorld.world.memberships.length > 1) {
      const sent = worldSocket.submitTimeVote({ type: 'advance_day' });
      if (!sent) { addToast('Chưa kết nối realtime; không gửi được phiếu.', 'warn'); return; }
      const { gameAuth } = await import('./services/firebase');
      const user = gameAuth().currentUser;
      setActiveTimeVote({
        type: 'advance_day',
        initiatedBy: user?.uid || 'me',
        expiresInMs: 30000,
        approvalsCount: 1,
        totalRequired: 2,
      });
      addToast('Đã gửi phiếu yêu cầu qua ngày! Chờ đối tác đồng ý trong 30s...', 'info');
      closeFixtureModal();
      return;
    }

    simulationRef.current.getClock().advanceToNextDay();
    syncFromSimulation(simulationRef.current);
    closeFixtureModal();
    if (onlineWorldRef.current) {
      await commitBusinessChange(
        { type: 'advance_day' },
        `Bước sang Ngày ${simulationRef.current.getTime().day}`,
        'Qua ngày'
      );
    }
  };

  const handleBuyStall = async (stallId: string) => {
    const sim = simulationRef.current;
    if (!sim || blockOfflineOnlineMutation()) return;
    const result = sim.buyStall(stallId);
    if (!result.success) { addToast(result.reason ?? 'Không mở được quầy.', 'warn'); return; }
    syncFromSimulation(sim);
    if (onlineWorldRef.current) {
      await commitBusinessChange({ type: 'buy_stall', stallId }, 'Mở quầy ăn uống', 'Quầy ăn uống');
    } else void handleSaveGame(false);
    addToast('Đã mở quầy mới; doanh thu được tính khi sang ngày.', 'success');
  };

  const handleClaimQuest = async (questId: string) => {
    const sim = simulationRef.current;
    if (!sim || blockOfflineOnlineMutation()) return false;
    const result = sim.claimQuest(questId);
    if (!result.success) { addToast('Nhiệm vụ chưa đủ điều kiện hoặc đã nhận.', 'warn'); return false; }
    syncFromSimulation(sim);
    if (onlineWorldRef.current) {
      const committed = await commitBusinessChange({ type: 'claim_quest', questId }, 'Nhận thưởng nhiệm vụ', 'Nhiệm vụ');
      if (!committed) return false;
    } else void handleSaveGame(false);
    addToast(`Nhận thưởng ${result.reward!.money.toLocaleString('vi-VN')} ₫${result.reward!.experience ? ` và ${result.reward!.experience} XP` : ''}.`, 'success');
    return true;
  };

  const handleHireStaff = (candidateId: string) => {
    const sim = simulationRef.current;
    if (!sim) return { success: false, reason: 'Trò chơi chưa sẵn sàng.' };
    if (blockOfflineOnlineMutation()) return { success: false, reason: 'Mất kết nối hẻm chung.' };
    const result = sim.hireStaff(candidateId);
    if (!result.success) {
      addToast(result.reason ?? 'Không tuyển được nhân viên.', 'warn');
      return result;
    }
    syncFromSimulation(sim);
    // Co-op: gửi lệnh lên hẻm chung (máy chủ từ chối thì khôi phục); chơi một mình: lưu cục bộ.
    if (onlineWorldRef.current) void commitBusinessChange({ type: 'hire_staff', candidateId }, 'Tuyển nhân viên', 'Nhân viên');
    else void handleSaveGame(false);
    addToast('Đã tuyển nhân viên; phí tuyển dụng đã được trừ.', 'success');
    return result;
  };

  const handleSetStaffShift = (staffId: string, shift: StaffShift) => {
    const sim = simulationRef.current;
    if (blockOfflineOnlineMutation()) return false;
    if (!sim || !sim.setStaffShift(staffId, shift)) {
      addToast('Không thể đổi ca làm nhân viên.', 'warn');
      return false;
    }
    syncFromSimulation(sim);
    if (onlineWorldRef.current) void commitBusinessChange({ type: 'set_staff_shift', staffId, shift }, 'Đổi ca nhân viên', 'Nhân viên');
    else void handleSaveGame(false);
    addToast('Đã lưu ca làm mới.', 'success');
    return true;
  };

  const handleAssignRefillJob = (staffId: string, fixtureId: string) => {
    const sim = simulationRef.current;
    if (!sim) return { success: false, reason: 'Chưa sẵn sàng.' };
    if (blockOfflineOnlineMutation()) return { success: false, reason: 'Mất kết nối hẻm chung.' };
    const result = sim.assignRefillJob(staffId, fixtureId);
    if (result.success) {
      syncFromSimulation(sim);
      if (onlineWorldRef.current) void commitBusinessChange({ type: 'assign_refill_job', staffId, fixtureId }, 'Giao việc châm kệ', 'Nhân viên');
      else void handleSaveGame(false);
      addToast('Đã giao việc châm kệ cho nhân viên.', 'success');
    } else addToast(`Chưa giao được việc: ${result.reason ?? 'kệ không khả dụng'}`, 'warn');
    return result;
  };

  const handleUpdateAutoBuy = (enabled: boolean, rules: import('@game/shared').AutoBuyRule[]) => {
    const sim = simulationRef.current;
    if (!sim) return { success: false, reason: 'Chưa sẵn sàng.' };
    const result = sim.setAutoBuyConfig(enabled, rules);
    if (!result.success) addToast(result.reason ?? 'Quy tắc tự nhập không hợp lệ.', 'warn');
    else {
      syncFromSimulation(sim);
      void handleSaveGame(false);
      addToast(enabled ? 'Đã bật tự nhập theo quy tắc.' : 'Đã tắt tự nhập.', 'success');
    }
    return result;
  };

  const handleToggleGameSpeed = async () => {
    if (blockOfflineOnlineMutation()) return;
    const nextSpeed = gameSpeed === 1 ? 2 : 1;
    const curWorld = onlineWorldRef.current;
    if (curWorld && curWorld.world.memberships.length > 1) {
      const sent = worldSocket.submitTimeVote({ type: 'change_speed', targetSpeed: nextSpeed as 1 | 2 });
      if (!sent) { addToast('Chưa kết nối realtime; không gửi được phiếu.', 'warn'); return; }
      const { gameAuth } = await import('./services/firebase');
      const user = gameAuth().currentUser;
      setActiveTimeVote({
        type: 'change_speed',
        targetSpeed: nextSpeed,
        initiatedBy: user?.uid || 'me',
        expiresInMs: 30000,
        approvalsCount: 1,
        totalRequired: 2,
      });
      addToast(`Đã gửi phiếu đổi tốc độ ${nextSpeed}x! Chờ đối tác đồng ý...`, 'info');
      return;
    }

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

  const handleSupplierCartOrder = async (supplierId: string, items: { productId: string; quantity: number }[]) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const res = sim.orderSupplierCart(supplierId, items);
    if (res.success) {
      syncFromSimulation(sim);
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
  };

  const handleSupplierOrder = async (productId: string, quantity: number) => {
    await handleSupplierCartOrder('dai_ly_dau_hem', [{ productId, quantity }]);
  };

  const handleStowHolding = async (holdingId?: string) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    if (holdingId) {
      const res = sim.stowHoldingItem(holdingId);
      if (res.success) {
        syncFromSimulation(sim);
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
        syncFromSimulation(sim);
        addToast(`Đã cất ${res.totalStowed} món từ hàng chờ vào kho!`, 'success');
        if (onlineWorldRef.current && res.totalStowed > 0) {
          await commitBusinessChange({ type: 'stow_all', quantity: res.totalStowed }, `Cất ${res.totalStowed} món từ hàng chờ vào kho`, 'Cất hàng');
        }
      } else {
        addToast('Kho không còn đủ chỗ trống để cất thêm hàng chờ!', 'warn');
      }
    }
  };

  const handleSetPlanogramAssignment = async (fixtureId: string, productId?: string) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const res = sim.setPlanogramAssignment(fixtureId, productId);
    if (res.success) {
      syncFromSimulation(sim);
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
  };

  const handleApplyPlanogram = async (fixtureId?: string) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    if (fixtureId) {
      const res = sim.applyPlanogramEntry(fixtureId);
      if (res.applied && res.actualQuantity > 0) {
        syncFromSimulation(sim);
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
      handleAutoRestock();
    }
  };

  const handleAutoRestock = async () => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    let restockedCount = 0;

    // 1. Apply planogram entries
    const batchRes = sim.applyPlanogram();
    restockedCount += batchRes.totalRefilled;

    // 2. Fallback: restock any sales fixtures with assignedProductId that are not in planogram
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
      syncFromSimulation(sim);
      addToast(`Đã tự động châm ${restockedCount} món hàng từ kho lên các kệ! `, 'success');
      if (viewportRef.current) {
        viewportRef.current.addFloatingGain(player.position.x, player.position.y - 20, `+${restockedCount} Bày Kệ`, 0x2a7a43);
      }
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
  };

  const handleCheckout = async (fixtureId?: string, checkoutId?: string, onCredit = false, dineIn = false) => {
    if (blockOfflineOnlineMutation()) return;
    const sim = simulationRef.current;
    if (!sim) return;
    const activeCustomer = checkoutId ? sim.getCustomers().find(c => c.stage === 'checkout' && c.checkoutId === checkoutId) : sim.getCustomer();
    if (!activeCustomer || activeCustomer.stage !== 'checkout') {
      addToast('Chưa có khách đứng đợi ở quầy thu ngân!', 'warn');
      return;
    }
    const moneyBefore = sim.getPlayerData().money;
    if (!worldTime.isStoreOpen) {
      addToast('Tiệm đang đóng cửa.', 'warn');
      return;
    }
    if (sim.completeCustomerCheckout(checkoutId || activeCustomer.checkoutId || '', fixtureId || activeCustomer.targetFixtureId, onCredit, dineIn)) {
      syncFromSimulation(sim);
      const earned = sim.getPlayerData().money - moneyBefore;
      addToast(dineIn ? 'Đã thanh toán. Khách đang tìm bàn ăn.' : onCredit ? 'Đã ghi hóa đơn vào sổ mua chịu khách quen.' : `Đã thanh toán cho khách và nhận +${earned.toLocaleString('vi-VN')} đ!`, 'success');
      if (viewportRef.current) {
        const cashier = sim.getFixtures().find((f) => f.type === 'cashier_counter');
        const posX = cashier ? (cashier.tileX + 1) * 32 : player.position.x;
        const posY = cashier ? (cashier.tileY) * 32 : player.position.y;
        viewportRef.current.addFloatingGain(posX, posY - 20, `+${earned.toLocaleString('vi-VN')} đ`, 0xf4a261);
      }
      if (onlineWorldRef.current) {
        await commitBusinessChange(
          { type: 'checkout', checkoutId: checkoutId || activeCustomer.checkoutId || '', fixtureId: fixtureId || activeCustomer.targetFixtureId, ...(onCredit ? { onCredit: true } : {}), ...(dineIn ? { dineIn: true } : {}) },
          dineIn ? 'Thanh toán và dùng dịch vụ ăn tại bàn' : onCredit ? 'Ghi hóa đơn mua chịu khách quen' : `Thanh toán đơn hàng thu về +${earned.toLocaleString('vi-VN')}₫`,
          dineIn ? 'Ăn tại bàn' : onCredit ? 'Mua chịu' : 'Bán hàng'
        );
      }
    } else {
      addToast(dineIn ? 'Không có bàn sạch còn chỗ hoặc giỏ hàng chưa có món ăn phù hợp.' : 'Không thể thanh toán: tiệm đang đóng cửa hoặc giỏ hàng trống.', 'warn');
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

  const hasModal = !!(activeFixtureModal || isInventoryModalOpen || isSaveModalOpen || isSupplierModalOpen || isLayoutOpen || isPlanogramOpen);
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
  if (!gameStarted && !isLoading) return <LoginScreen onEnter={handleEnterGame}/>;

  return <div className="game-shell">
    <div style={{display:'contents'}} inert={hasModal}>
      {!isLoading && (
        <AccountBar
          onlineWorldName={onlineWorld?.world.name}
          isOnlineOwner={onlineWorld ? onlineWorld.world.memberships.find(m => m.role === 'owner')?.accountId === onlineWorld.businesses[0]?.ownerAccountIds[0] : false}
          onInvite={handleOnlineInvite}
          onLeaveOnline={handleLeaveOnline}
          onReturnHome={handleReturnHome}
        />
      )}
      {!isLoading && onlineWorld && !onlineConnected && (
        <div role="alert" style={{
          position: 'fixed', top: 48, left: 0, right: 0, zIndex: 9999,
          background: '#c0392b', color: '#fff', fontSize: 13, padding: '6px 16px',
          textAlign: 'center', fontFamily: 'var(--font-pixel, monospace)',
          borderBottom: '2px solid #922b21',
        }}>
          ⚠️ Mất kết nối hẻm chung — thao tác bị tạm dừng, đang kết nối lại...
        </div>
      )}
      {!isLoading && <HUD customerRating={simulationRef.current?.getAverageCustomerRating() ?? 4} market={simulationRef.current?.getMarketSummary()} onOpenMarket={() => setMarketOpen(true)} onOpenTax={() => setTaxOpen(true)} onOpenRegulars={() => setRegularsOpen(true)} onOpenSkills={() => setSkillsOpen(true)} onOpenTitles={() => setTitlesOpen(true)} maintenanceAlerts={simulationRef.current?.getMaintenanceList().filter(e => e.status !== 'good').length ?? 0} onOpenMaintenance={() => setMaintenanceOpen(true)} onOpenReviews={() => setReviewsOpen(true)} onOpenSecurity={(player.level >= SECURITY_RULES.unlockLevel) ? () => setSecurityOpen(true) : undefined} wageDebt={simulationRef.current?.getWageDebt() ?? 0} onOpenStaff={openStaffFromHud} onOpenStalls={() => setStallOpen(true)} onOpenQuests={() => setQuestOpen(true)} onOpenLevelRoadmap={() => setLevelRoadmapOpen(true)} onOpenPlanogram={() => setIsPlanogramOpen(true)} emptySlotsCount={fixtures.filter(f => isSalesFixture(f) && f.currentStock === 0).length} onToggleStoreStatus={handleToggleStoreStatus} onOpenLayout={openLayoutEditor} canEditLayout={!onlineWorld || onlineWorld.world.memberships.find(m => m.role === 'owner')?.accountId === onlineWorld.businesses[0]?.ownerAccountIds[0]} gameSpeed={gameSpeed} onToggleGameSpeed={handleToggleGameSpeed} activeCustomers={simulationRef.current?.getCustomers().length ?? 0} onToggleWarehouseDock={()=>setWarehouseDockOpen(v=>!v)} isWarehouseDockOpen={isWarehouseDockOpen}/>}
      <main className="game-main">
        <div className="world-viewport">
          <canvas ref={canvasRef} aria-label="Bản đồ Tiệm Tạp Hóa Đầu Hẻm"/>
          {!isLoading && <>
            {showWorldCaption && (
              <div
                className="world-caption"
                role="note"
                aria-label="Gợi ý ban đầu"
                onClick={() => setShowWorldCaption(false)}
                title="Bấm để đóng gợi ý"
              >
                <strong>Hẻm nhỏ, chuyện lớn.</strong>
                <span>Nhà kho liền phía trên · Đi qua cửa hậu giữa tiệm.</span>
                <button
                  type="button"
                  className="world-caption-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWorldCaption(false);
                  }}
                  aria-label="Đóng gợi ý"
                  title="Đóng gợi ý"
                >
                  ×
                </button>
              </div>
            )}
            <div className="world-tools" aria-label="Góc nhìn bản đồ"><PixelButton icon="warehouse" aria-label="Định vị nhà kho" onClick={locateWarehouse}/><PixelButton icon="minus" aria-label="Thu nhỏ bản đồ" disabled={zoomLevel<=1} onClick={handleZoomOut}/><span className="zoom-value">{zoomLevel}×</span><PixelButton icon="plus" aria-label="Phóng to bản đồ" disabled={zoomLevel>=3} onClick={handleZoomIn}/></div>
            {!hasModal && !isWarehouseDockOpen && <VirtualJoystick onMove={handleMobileJoystickMove} onInteract={handleMobileInteract}/>}
          </>}
        </div>
        {!isLoading && <WarehouseDock capacityBonus={simulationRef.current?.getShelfCapacityBonus() ?? 0} inventory={inventory} holdingArea={holdingArea} fixtures={fixtures} isOpen={isWarehouseDockOpen} onToggle={()=>setWarehouseDockOpen(v=>!v)} onAutoRestock={handleAutoRestock} onOpenSupplier={openSupplierModal} onOpenPlanogram={() => setIsPlanogramOpen(true)} onLocateWarehouse={locateWarehouse} onStowHolding={handleStowHolding} currentDay={worldTime.day}/>}
      </main>
      {!isLoading && <BottomBar onOpenSupplier={openSupplierModal} onOpenCashier={openCashier}/>}
    </div>
    {isLoading && (
      <div className="loading-screen" role="status">
        <div className="loading-sign"><PixelIcon name="warehouse" size={48}/><p className="eyebrow">Chào mừng về hẻm</p><h1>Tiệm Tạp Hóa<br/>Đầu Hẻm</h1></div>
        <p>{startupError || 'Đang mở cửa tiệm, chuẩn bị hàng hóa...'}</p>
        {startupError ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
            <PixelButton onClick={() => window.location.reload()} variant="teal">Thử đọc lại</PixelButton>
            <PixelButton
              onClick={async () => {
                const restored = await restoreFromBackup().catch(() => undefined);
                if (restored) {
                  window.location.reload();
                } else {
                  addToast('Không tìm thấy bản sao lưu hợp lệ!', 'warn');
                }
              }}
              variant="wood"
            >
              Khôi phục từ sao lưu
            </PixelButton>
            <PixelButton
              onClick={async () => {
                if (window.confirm('Khởi tạo tiệm mới sẽ xóa dữ liệu cũ trên máy này. Bạn có chắc chắn không?')) {
                  await resetSaveToDefault();
                  window.location.reload();
                }
              }}
              variant="brick"
            >
              Tạo tiệm mới
            </PixelButton>
          </div>
        ) : (
          <div className="loading-stripes"/>
        )}
      </div>
    )}
    {activeFixtureModal && isSalesFixture(activeFixtureModal) && (
      <ShelfModal
        capacityBonus={simulationRef.current?.getShelfCapacityBonus() ?? 0}
        fixture={activeFixtureModal}
        slots={slotGroup(fixtures, activeFixtureModal)}
        onSelectSlot={showFixtureSlot}
        inventory={inventory}
        currentDay={worldTime.day}
        planogram={planogram}
        onRestock={handleRestock}
        onUnstock={handleUnstock}
        onSetPlanogramAssignment={handleSetPlanogramAssignment}
        onApplyPlanogram={handleApplyPlanogram}
        sellingPrice={simulationRef.current?.sellingPrice(activeFixtureModal.assignedProductId ?? '')}
        sellingPriceBounds={simulationRef.current?.sellingPriceBounds(activeFixtureModal.assignedProductId ?? '')}
        onSetPrice={handleSetSellingPrice}
        onClose={closeFixtureModal}
      />
    )}
    {activeFixtureModal && isWarehouseFixture(activeFixtureModal) && <WarehouseModal capacityBonus={simulationRef.current?.getShelfCapacityBonus() ?? 0} fixture={activeFixtureModal} inventory={inventory} holdingArea={holdingArea} fixtures={fixtures} pendingOrders={pendingOrders} currentDay={worldTime.day} onRestock={handleAutoRestock} onStowHolding={handleStowHolding} onClose={closeFixtureModal}/>}
    {activeFixtureModal?.type === 'cashier_counter' && <CashierModal initialShowStaff={staffRequested} fixture={activeFixtureModal} player={player} worldTime={worldTime} shelves={fixtures.filter(isSalesFixture)} customers={customers} statistics={statistics} canDineIn={customer => simulationRef.current?.canDineIn(customer) ?? false} creditAccounts={simulationRef.current?.getCustomerCredits() ?? []} creditTerms={regularId => simulationRef.current?.getCustomerCreditTerms(regularId) ?? { eligible: false, limit: 0, used: 0, available: 0 }} onRepayCredit={async creditId => { const res = await persistSimulationMutation({ type: 'repay_customer_credit', creditId }, 'Thu hồi nợ khách quen', 'Thu nợ', simulation => ({ success: simulation.repayCustomerCredit(creditId), reason: undefined as string | undefined })); if (res?.success) addToast('Đã thu hồi khoản mua chịu.', 'success'); else if (res) addToast(res.reason ?? 'Không thu được khoản nợ.', 'warn'); }} staff={simulationRef.current?.getStaff() ?? []} staffCandidates={simulationRef.current?.getStaffCandidates(worldTime.day) ?? []} wageDebt={simulationRef.current?.getWageDebt() ?? 0} restockTargets={simulationRef.current?.getRestockJobTargets() ?? []} onAssignRefillJob={handleAssignRefillJob} onHireStaff={handleHireStaff} onSetStaffShift={handleSetStaffShift} onCheckout={handleCheckout} onToggleStoreStatus={handleToggleStoreStatus} onAdvanceDay={handleAdvanceDay} onClose={closeFixtureModal}/>}
    {activeFixtureModal?.type === 'dining_table' && simulationRef.current && <DiningTableModal fixture={activeFixtureModal} state={simulationRef.current.getDiningTableState(activeFixtureModal.id)} staff={simulationRef.current.getStaff()} onAssignCleaner={async staffId => { const fixtureId = activeFixtureModal.id; const res = await persistSimulationMutation({ type: 'assign_dining_cleanup', staffId, fixtureId }, 'Giao việc dọn bàn', 'Dọn dẹp', simulation => ({ success: simulation.assignDiningCleanup(staffId, fixtureId), reason: undefined as string | undefined })); if (!res?.success) addToast(res?.reason ?? 'Không giao được việc dọn bàn.', 'warn'); }} onClean={async () => { const fixtureId = activeFixtureModal.id; const res = await persistSimulationMutation({ type: 'clean_dining_table', fixtureId }, 'Dọn bàn ăn', 'Dọn dẹp', simulation => ({ success: simulation.cleanDiningTable(fixtureId), reason: undefined as string | undefined })); if (!res?.success) addToast('Bàn đang có khách hoặc đã sạch.', 'warn'); }} onClose={closeFixtureModal}/>}
    {isInventoryModalOpen && <InventoryModal inventory={inventory} currentDay={worldTime.day} onClose={closeAllModals}/>}
    {isSaveModalOpen && <SaveModal onManualSave={()=>handleSaveGame(true)} onResetSave={handleResetGame} onExportSave={handleExportSave} onImportSave={handleImportSave} isOnline={!!onlineWorld} onClose={closeAllModals} lastSavedAt={lastSavedTime} revision={currentRevision}/>}
    {isSupplierModalOpen && (
      <SupplierModal
        player={player}
        pendingOrders={pendingOrders}
        inventory={inventory}
        currentDay={worldTime.day}
        onOrder={handleSupplierOrder}
        onOrderCart={handleSupplierCartOrder}
        getQuotes={(supplierId) => simulationRef.current!.getSupplierQuotes(supplierId)}
        getUnitPrice={(supplierId, productId, quantity) => simulationRef.current!.wholesaleUnitPrice(supplierId, productId, quantity)}
        onGetSuggestions={(supplierId) =>
          simulationRef.current?.suggestRestock(supplierId) ?? {
            supplierId,
            items: [],
            totalCost: 0,
            totalQuantity: 0,
            coldItemCount: 0,
            appliedConstraints: [],
            explanation: '',
          }
        }
        autoBuyConfig={simulationRef.current?.getAutoBuyConfig() ?? { enabled: false, rules: [], reports: {} }}
        onUpdateAutoBuy={handleUpdateAutoBuy}
        onClose={closeAllModals}
      />
    )}
    {isMarketOpen && simulationRef.current && <MarketModal summary={simulationRef.current.getMarketSummary()} prices={simulationRef.current.getPriceMarket()} plans={marketPlans.plans} trending={marketPlans.trending} day={worldTime.day} onClose={() => setMarketOpen(false)}/>}
    {isStallOpen && simulationRef.current && <StallModal stalls={simulationRef.current.getStalls()} season={simulationRef.current.getSeason()} stock={Object.fromEntries(simulationRef.current.getInventory().map(item => [item.productId, item.quantity]))} report={simulationRef.current.getStallReport()} onBuy={handleBuyStall} onClose={() => setStallOpen(false)}/>}
    {isQuestOpen && simulationRef.current && (
      <QuestModal
        {...simulationRef.current.getQuests()}
        level={player.level}
        partyOrders={simulationRef.current.getPartyOrderState().available}
        onRespondPartyOrder={async (orderId, accept) => {
          const res = await persistSimulationMutation(
            { type: 'respond_party_order', orderId, accept },
            accept ? 'Nhận đơn tiệc' : 'Từ chối đơn tiệc', 'Đơn tiệc',
            simulation => simulation.respondPartyOrder(orderId, accept),
          );
          if (!res) return;
          if (res.success) {
            addToast(accept ? 'Đã nhận đơn tiệc!' : 'Đã từ chối đơn tiệc.', 'info');
          } else {
            addToast(res.reason ?? 'Không thể xử lý đơn tiệc.', 'warn');
          }
        }}
        onFulfillPartyOrder={async (orderId) => {
          const res = await persistSimulationMutation(
            { type: 'fulfill_party_order', orderId }, 'Giao đơn tiệc', 'Đơn tiệc',
            simulation => simulation.fulfillPartyOrder(orderId),
          );
          if (!res) return;
          if (res.success) {
            addToast(`Giao đơn tiệc thành công! +${money(res.reward?.money ?? 0)}`, 'success');
          } else {
            addToast(res.reason ?? 'Không thể giao đơn tiệc.', 'warn');
          }
        }}
        inventory={inventory}
        goals={simulationRef.current.getGoalProgressList()}
        weeklyQuests={simulationRef.current.getWeeklyQuestProgressList()}
        festivalGoals={simulationRef.current.getFestivalGoalProgressList()}
        onClaimFestivalGoal={async (goalId) => {
          const res = await persistSimulationMutation(
            { type: 'claim_festival_goal', goalId }, 'Nhận thưởng ngày hội', 'Ngày hội',
            simulation => simulation.claimFestivalGoal(goalId),
          );
          if (!res) return false;
          if (res.success) {
            addToast('Nhận thưởng ngày hội thành công!', 'success');
            return true;
          }
          addToast(res.reason ?? 'Không thể nhận thưởng ngày hội.', 'warn');
          return false;
        }}
        onClaimGoal={async (goalId) => {
          const res = await persistSimulationMutation(
            { type: 'claim_goal', goalId }, 'Nhận thưởng mục tiêu', 'Mục tiêu',
            simulation => simulation.claimGoal(goalId),
          );
          if (!res) return false;
          if (res.success) {
            addToast('Nhận thưởng mục tiêu thành công!', 'success');
            return true;
          }
          addToast(res.reason ?? 'Không thể nhận thưởng.', 'warn');
          return false;
        }}
        onClaimWeeklyQuest={async (questId) => {
          const res = await persistSimulationMutation(
            { type: 'claim_weekly_quest', questId }, 'Nhận thưởng nhiệm vụ tuần', 'Nhiệm vụ tuần',
            simulation => simulation.claimWeeklyQuest(questId),
          );
          if (!res) return false;
          if (res.success) {
            addToast('Nhận thưởng nhiệm vụ tuần thành công!', 'success');
            return true;
          }
          addToast(res.reason ?? 'Không thể nhận thưởng.', 'warn');
          return false;
        }}
        onClaim={handleClaimQuest}
        onOpenLevelRoadmap={() => setLevelRoadmapOpen(true)}
        onClose={() => setQuestOpen(false)}
      />
    )}
    {isSkillsOpen && simulationRef.current && (
      <SkillsModal
        skillState={simulationRef.current.getSkillState()}
        onChoosePerk={async (perkId) => {
          const res = await persistSimulationMutation(
            { type: 'choose_perk', perkId }, 'Mở khóa đặc quyền', 'Kỹ năng',
            simulation => simulation.chooseSkillPerk(perkId),
          );
          if (!res) return;
          if (res.success) {
            addToast('Mở khóa đặc quyền thành công!', 'success');
          } else {
            addToast(res.reason ?? 'Không thể mở đặc quyền.', 'warn');
          }
        }}
        onClose={() => setSkillsOpen(false)}
      />
    )}
    {isSecurityOpen && simulationRef.current && (
      <SecurityModal
        security={simulationRef.current.getSecurityState()}
        level={player.level}
        playerMoney={player.money}
        hasGuard={simulationRef.current.getStaff().some(s => s.role === 'security')}
        guardOnShift={simulationRef.current.hasSecurityGuardOnShift()}
        onBuyCamera={async () => {
          const res = await persistSimulationMutation(
            { type: 'security_action', action: 'buy_camera' }, 'Lắp camera', 'An ninh',
            simulation => simulation.buyCamera(),
          );
          if (!res) return;
          addToast(res.success ? 'Đã lắp camera an ninh.' : (res.reason ?? 'Không thể lắp camera.'), res.success ? 'success' : 'warn');
        }}
        onSetPolice={async (enabled) => {
          const res = await persistSimulationMutation(
            { type: 'security_action', action: enabled ? 'police_on' : 'police_off' }, enabled ? 'Bật báo công an' : 'Tắt báo công an', 'An ninh',
            simulation => simulation.setCallPolice(enabled),
          );
          if (res?.success) addToast(enabled ? 'Sẽ báo công an khi bị trộm đột nhập.' : 'Sẽ không báo công an.', 'info');
        }}
        onClose={() => setSecurityOpen(false)}
      />
    )}
    {isReviewsOpen && simulationRef.current && (
      <ReviewsModal reviews={simulationRef.current.getReviews()} summary={simulationRef.current.getReviewSummary()} onClose={() => setReviewsOpen(false)} />
    )}
    {isMaintenanceOpen && simulationRef.current && (
      <MaintenanceModal
        entries={simulationRef.current.getMaintenanceList()}
        playerMoney={player.money}
        playerLevel={player.level}
        onAction={async (fixtureId, action) => {
          const res = await persistSimulationMutation(
            { type: 'maintain_fixture', fixtureId, action }, 'Sửa chữa nội thất', 'Sửa chữa',
            simulation => simulation.maintainFixture(fixtureId, action),
          );
          if (!res) return;
          if (res.success) {
            addToast(action === 'replace' ? 'Đã mua mới.' : action === 'repair' ? 'Đã sửa xong.' : 'Đã bảo trì xong.', 'success');
          } else {
            addToast(res.reason ?? 'Không thể xử lý.', 'warn');
          }
        }}
        onClose={() => setMaintenanceOpen(false)}
      />
    )}
    {isTitlesOpen && simulationRef.current && (
      <TitlesModal
        titles={simulationRef.current.getTitles()}
        activeTitle={player.activeTitle}
        onSelectTitle={async (titleId) => {
          const res = await persistSimulationMutation(
            { type: 'set_title', titleId }, titleId ? 'Đổi danh hiệu' : 'Gỡ danh hiệu', 'Danh hiệu',
            simulation => simulation.setActiveTitle(titleId),
          );
          if (!res) return;
          if (res.success) {
            addToast(titleId ? 'Đã đổi danh hiệu thành công!' : 'Đã gỡ danh hiệu.', 'success');
          } else {
            addToast(res.reason ?? 'Không thể chọn danh hiệu.', 'warn');
          }
        }}
        onClose={() => setTitlesOpen(false)}
      />
    )}
    {isLevelRoadmapOpen && <LevelRoadmapModal player={player} onClose={() => setLevelRoadmapOpen(false)}/>}
    {daySummaryRecord && <DaySummaryModal record={daySummaryRecord} morningBrief={simulationRef.current?.getMorningBrief()} onClose={() => setDaySummaryRecord(null)}/>}
    {isTaxOpen && <TaxModal day={worldTime.day} worldTime={worldTime} dailyRecords={dailyRecords} currentDayRecord={currentDayRecord} onClose={() => setTaxOpen(false)}/>}
    {isRegularsOpen && simulationRef.current && <RegularsModal regulars={simulationRef.current.getRegulars()} onClose={() => setRegularsOpen(false)}/>}
    {isLayoutOpen && simulationRef.current && <StoreLayoutModal save={simulationRef.current.exportSaveData(onlineWorld?.businesses[0]?.save.id ?? 'local_save_default', currentRevision)} onConfirm={handleApplyStoreLayout} onClose={closeLayoutEditor}/>}
    {isPlanogramOpen && (
      <StorePlanogramModal
        fixtures={fixtures}
        inventory={inventory}
        planogram={planogram}
        capacityBonus={simulationRef.current?.getShelfCapacityBonus() ?? 0}
        currentDay={worldTime.day}
        onRestock={handleRestock}
        onUnstock={handleUnstock}
        onSetPlanogramAssignment={handleSetPlanogramAssignment}
        onAutoFill={(fixtureId) => {
          const sim = simulationRef.current;
          if (!sim) return { assigned: false, productId: null, filled: 0, reason: 'no_sim' };
          const res = sim.autoFillShelf(fixtureId);
          if (res.filled > 0 || res.assigned) {
            setInventory(sim.getInventory());
            setFixtures(sim.getFixtures());
          }
          return res;
        }}
        onAutoFillAll={() => {
          const sim = simulationRef.current;
          if (!sim) return { totalFilled: 0, newAssignments: 0, skipped: 0 };
          const res = sim.autoFillAllShelves();
          if (res.totalFilled > 0 || res.newAssignments > 0) {
            setInventory(sim.getInventory());
            setFixtures(sim.getFixtures());
            if (res.newAssignments > 0) {
              addToast(`⚡ Đã tự gán & châm ${res.newAssignments} ô mới · ${res.totalFilled} đơn vị lên kệ`, 'success');
            }
          }
          return res;
        }}
        onOpenSupplier={() => {
          setIsPlanogramOpen(false);
          openSupplierModal();
        }}
        onClose={() => setIsPlanogramOpen(false)}
      />
    )}
    {activeTimeVote && (
      <TimeVoteModal
        vote={activeTimeVote}
        onApprove={async () => {
          const sent = activeTimeVote.type === 'advance_day'
            ? worldSocket.submitTimeVote({ type: 'advance_day' })
            : worldSocket.submitTimeVote({ type: 'change_speed', targetSpeed: activeTimeVote.targetSpeed === 2 ? 2 : 1 });
          if (!sent) addToast('Mất kết nối realtime; chưa gửi được phiếu.', 'warn');
        }}
        onCancel={() => {
          worldSocket.cancelTimeVote();
          setActiveTimeVote(null);
          addToast('Đã hủy yêu cầu điều chỉnh thời gian.', 'info');
        }}
      />
    )}
    <RotateOverlay/><ToastContainer/>
  </div>;
};
export default App;
