import { create } from 'zustand';
import { StoreFixture, InventoryItem, PlayerData, WorldTime, CustomerState, HoldingItem, DailyRecord, LedgerEntry } from '@game/shared';
import type { DailyRoutineState, InventorySummary, CoopRoutineState } from '@game/core';

let modalReturnFocus: HTMLElement | null = null;
export function getModalReturnFocus() { return modalReturnFocus; }
function captureModalFocus() {
  if (typeof document !== 'undefined' && !document.querySelector('[role="dialog"]')) modalReturnFocus = document.activeElement as HTMLElement | null;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warn';
  /** Phân loại phụ chỉ để tinh chỉnh hiển thị toast (kích thước/thời gian tự tắt) — không phải trạng thái game. */
  kind?: 'rating';
}

/** So sánh cấu trúc cho dữ liệu JSON thuần (số, chuỗi, mảng, đối tượng); dùng để giữ nguyên tham chiếu khi nội dung không đổi. */
export function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameData(a[i], bb[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  if (ak.length !== Object.keys(bo).length) return false;
  for (const k of ak) if (!(k in bo) || !sameData(ao[k], bo[k])) return false;
  return true;
}

/** Giữ tham chiếu cũ nếu nội dung không đổi (người đăng ký selector không render lại); đổi thì lấy bản mới. */
const keep = <T,>(prev: T, next: T): T => (sameData(prev, next) ? prev : next);

/**
 * Kệ của mô phỏng bị sửa tại chỗ nên store luôn giữ BẢN SAO: so sánh nội dung với bản sao cũ, khác thì sao chép lại
 * (đối tượng mới => thành phần dùng `fixture`/`activeFixtureModal` render lại đúng lúc), giống thì giữ nguyên.
 */
const reconcileFixtures = (prev: StoreFixture[], sim: StoreFixture[]): StoreFixture[] => (sameData(prev, sim) ? prev : structuredClone(sim));

/** Sổ ngày lớn dần: chỉ so cỡ và hai ngày gần nhất (các ngày cũ không đổi sau khi khép sổ). */
const reconcileDailyRecords = (prev: Record<number, DailyRecord>, next: Record<number, DailyRecord>): Record<number, DailyRecord> => {
  const pk = Object.keys(prev);
  const nk = Object.keys(next);
  if (pk.length !== nk.length) return next;
  for (const k of nk.slice(-2)) if (!sameData((prev as Record<string, DailyRecord>)[k], (next as Record<string, DailyRecord>)[k])) return next;
  return prev;
};
const reconcileLedger = (prev: LedgerEntry[], next: LedgerEntry[]): LedgerEntry[] =>
  prev.length === next.length && sameData(prev[prev.length - 1], next[next.length - 1]) ? prev : next;

export interface SimulationSnapshot {
  player: PlayerData;
  worldTime: WorldTime;
  timeString: string;
  inventory: InventoryItem[];
  holdingArea: HoldingItem[];
  planogram: Record<string, string>;
  currentDayRecord: DailyRecord | null;
  fixtures: StoreFixture[];
  customers: CustomerState[];
  nearbyFixture: StoreFixture | null;
  routineState?: DailyRoutineState;
  /** Phần nặng (sao chép sâu theo số ngày/sổ cái): chỉ có khi cần làm mới. */
  dailyRecords?: Record<number, DailyRecord>;
  ledger?: LedgerEntry[];
  /** Co-op routine states (multiplayer only). */
  coopRoutineStates?: Array<{
    playerId: string;
    state: DailyRoutineState;
    isOnline: boolean;
    isSleeping: boolean;
    homeDoorTile: { x: number; y: number };
  }>;
}

export interface GameStoreState {
  // Player state
  player: PlayerData;
  // World Time
  worldTime: WorldTime;
  timeString: string;
  // Inventory
  inventory: InventoryItem[];
  // Fixtures
  fixtures: StoreFixture[];
  // Customers in store
  customers: CustomerState[];
  // Holding area for goods waiting to be stowed
  holdingArea: HoldingItem[];
  // Planogram mapping (fixtureId -> productId)
  planogram: Record<string, string>;
  // Ledger and Daily Records
  dailyRecords: Record<number, DailyRecord>;
  currentDayRecord: DailyRecord | null;
  ledger: LedgerEntry[];

  // Daily Routine
  routineState: DailyRoutineState;
  inventorySummary: InventorySummary | null;
  isNightFading: boolean;

  // Co-op Multiplayer
  coopRoutineStates: Array<{
    playerId: string;
    state: DailyRoutineState;
    isOnline: boolean;
    isSleeping: boolean;
    homeDoorTile: { x: number; y: number };
  }>;
  isWaitingForPartner: boolean;

  // Modals
  activeFixtureModal: StoreFixture | null;
  isInventoryModalOpen: boolean;
  isSaveModalOpen: boolean;
  isSupplierModalOpen: boolean;
  isMobileControlsVisible: boolean;

  // Interaction prompt
  nearbyFixture: StoreFixture | null;

  // Toast notifications
  toasts: ToastMessage[];

  // Actions
  setPlayerData: (data: PlayerData) => void;
  setWorldTime: (time: WorldTime, timeString: string) => void;
  setInventory: (items: InventoryItem[]) => void;
  setHoldingArea: (items: HoldingItem[]) => void;
  setPlanogram: (planogram: Record<string, string>) => void;
  setDailyRecords: (records: Record<number, DailyRecord>) => void;
  setCurrentDayRecord: (record: DailyRecord | null) => void;
  setLedger: (ledger: LedgerEntry[]) => void;
  setFixtures: (fixtures: StoreFixture[]) => void;
  setCustomers: (customers: CustomerState[]) => void;
  setNearbyFixture: (fixture: StoreFixture | null) => void;
  setRoutineState: (routineState: DailyRoutineState) => void;
  setInventorySummary: (summary: InventorySummary | null) => void;
  setIsNightFading: (fading: boolean) => void;
  /** Cập nhật trạng thái routine của các player trong co-op mode. */
  setCoopRoutineStates: (states: SimulationSnapshot['coopRoutineStates']) => void;
  /** Kiểm tra xem có đang chờ partner ngủ không. */
  checkWaitingForPartner: () => void;
  /** Đẩy ảnh chụp mô phỏng vào store bằng MỘT lần cập nhật (một lần thông báo/render thay vì 13). Phần vắng mặt giữ nguyên. */
  applySimulationSnapshot: (snapshot: SimulationSnapshot) => void;
  openFixtureModal: (fixture: StoreFixture) => void;
  showFixtureSlot: (fixtureId: string) => void;
  closeFixtureModal: () => void;
  toggleInventoryModal: () => void;
  toggleSaveModal: () => void;
  openSupplierModal: () => void;
  closeAllModals: () => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warn', kind?: 'rating') => void;
  removeToast: (id: string) => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  player: {
    name: 'Cô Năm Tạp Hóa',
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    money: 150000,
    reputation: 10,
    position: { x: 300, y: 270 },
    direction: 'down',
  },
  worldTime: {
    day: 1,
    hour: 7,
    minute: 0,
    isStoreOpen: true,
    timeScale: 90,
  },
  timeString: '07:00',
  inventory: [],
  holdingArea: [],
  planogram: {},
  dailyRecords: {},
  currentDayRecord: null,
  ledger: [],
  fixtures: [],
  customers: [],

  routineState: 'WORKING',
  inventorySummary: null,
  isNightFading: false,

  // Co-op Multiplayer
  coopRoutineStates: [],
  isWaitingForPartner: false,

  activeFixtureModal: null,
  isInventoryModalOpen: false,
  isSaveModalOpen: false,
  isSupplierModalOpen: false,
  isMobileControlsVisible: true,
  nearbyFixture: null,
  toasts: [],

  setPlayerData: (player) => set({ player }),
  setWorldTime: (worldTime, timeString) => set({ worldTime, timeString }),
  setInventory: (inventory) => set({ inventory }),
  setHoldingArea: (holdingArea) => set({ holdingArea }),
  setPlanogram: (planogram: Record<string, string>) => set({ planogram }),
  setDailyRecords: (dailyRecords) => set({ dailyRecords }),
  setCurrentDayRecord: (currentDayRecord) => set({ currentDayRecord }),
  setLedger: (ledger) => set({ ledger }),
  setFixtures: (simFixtures) => set(state => {
    const fixtures = reconcileFixtures(state.fixtures, simFixtures);
    return { fixtures, activeFixtureModal: state.activeFixtureModal ? fixtures.find(f => f.id === state.activeFixtureModal!.id) ?? null : null };
  }),
  setCustomers: (customers) => set({ customers }),
  setNearbyFixture: (fixture) => set(state => ({ nearbyFixture: fixture ? state.fixtures.find(f => f.id === fixture.id) ?? fixture : null })),
  setRoutineState: (routineState) => set({ routineState }),
  setInventorySummary: (inventorySummary) => set({ inventorySummary }),
  setIsNightFading: (isNightFading) => set({ isNightFading }),
  setCoopRoutineStates: (coopRoutineStates) => set((state) => {
    const next = {
      coopRoutineStates: coopRoutineStates ?? state.coopRoutineStates,
      isWaitingForPartner: state.coopRoutineStates.some(s => s.isSleeping) && !state.coopRoutineStates.every(s => s.isSleeping),
    };
    return next;
  }),
  checkWaitingForPartner: () => set((state) => ({
    isWaitingForPartner: state.coopRoutineStates.some(s => s.isSleeping) && !state.coopRoutineStates.every(s => s.isSleeping),
  })),
  applySimulationSnapshot: (snap) => set(state => {
    const fixtures = reconcileFixtures(state.fixtures, snap.fixtures);
    const next: Partial<GameStoreState> = {
      player: keep(state.player, snap.player),
      worldTime: keep(state.worldTime, snap.worldTime),
      timeString: snap.timeString,
      inventory: keep(state.inventory, snap.inventory),
      holdingArea: keep(state.holdingArea, snap.holdingArea),
      planogram: keep(state.planogram, snap.planogram),
      currentDayRecord: keep(state.currentDayRecord, snap.currentDayRecord),
      fixtures,
      customers: keep(state.customers, snap.customers),
      nearbyFixture: snap.nearbyFixture ? fixtures.find(f => f.id === snap.nearbyFixture!.id) ?? null : null,
      activeFixtureModal: state.activeFixtureModal ? fixtures.find(f => f.id === state.activeFixtureModal!.id) ?? null : null,
    };
    if (snap.routineState !== undefined && snap.routineState !== state.routineState) next.routineState = snap.routineState;
    if (snap.dailyRecords) next.dailyRecords = reconcileDailyRecords(state.dailyRecords, snap.dailyRecords);
    if (snap.ledger) next.ledger = reconcileLedger(state.ledger, snap.ledger);
    if (snap.coopRoutineStates) {
      next.coopRoutineStates = snap.coopRoutineStates;
      next.isWaitingForPartner = snap.coopRoutineStates.some(s => s.isSleeping) && !snap.coopRoutineStates.every(s => s.isSleeping);
    }
    // Zustand so Object.is từng khóa: khóa giữ nguyên tham chiếu không làm người đăng ký render lại.
    return next;
  }),

  openFixtureModal: (fixture) => {
    captureModalFocus();
    set(state => ({
      activeFixtureModal: fixture.parentId ? state.fixtures.find(f => f.id === fixture.parentId) ?? fixture : fixture,
      isInventoryModalOpen: false,
      isSaveModalOpen: false,
      isSupplierModalOpen: false,
    }));
  },
  showFixtureSlot: (fixtureId) => set(state => ({ activeFixtureModal: state.fixtures.find(f => f.id === fixtureId) ?? state.activeFixtureModal })),

  closeFixtureModal: () => set({ activeFixtureModal: null }),

  toggleInventoryModal: () => {
    captureModalFocus();
    set((state) => ({
      isInventoryModalOpen: !state.isInventoryModalOpen,
      activeFixtureModal: null,
      isSaveModalOpen: false,
      isSupplierModalOpen: false,
    }));
  },

  toggleSaveModal: () => {
    captureModalFocus();
    set((state) => ({
      isSaveModalOpen: !state.isSaveModalOpen,
      activeFixtureModal: null,
      isInventoryModalOpen: false,
      isSupplierModalOpen: false,
    }));
  },

  openSupplierModal: () => {
    captureModalFocus();
    set({ isSupplierModalOpen: true, activeFixtureModal: null, isInventoryModalOpen: false, isSaveModalOpen: false });
  },

  closeAllModals: () =>
    set({
      activeFixtureModal: null,
      isInventoryModalOpen: false,
      isSaveModalOpen: false,
      isSupplierModalOpen: false,
    }),

  addToast: (message, type = 'info', kind) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => {
      if (kind === 'rating') {
        // Toast đánh giá khách: chỉ 1 cái một lúc (bỏ các toast đánh giá cũ, giữ nội dung khác).
        return { toasts: [...state.toasts.filter((t) => t.kind !== 'rating').slice(-1), { id, message, type, kind }] };
      }
      // Toast thường: giữ tối đa 2 như trước, chỉ rút ngắn thời gian tự tắt.
      return { toasts: [...state.toasts.slice(-2), { id, message, type, kind }] };
    });

    const ttl = kind === 'rating' ? 2000 : 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, ttl);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
