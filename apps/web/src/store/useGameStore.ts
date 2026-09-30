import { create } from 'zustand';
import { StoreFixture, InventoryItem, PlayerData, WorldTime } from '@game/shared';

let modalReturnFocus: HTMLElement | null = null;
export function getModalReturnFocus() { return modalReturnFocus; }
function captureModalFocus() {
  if (typeof document !== 'undefined' && !document.querySelector('[role="dialog"]')) modalReturnFocus = document.activeElement as HTMLElement | null;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warn';
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
  setFixtures: (fixtures: StoreFixture[]) => void;
  setNearbyFixture: (fixture: StoreFixture | null) => void;
  openFixtureModal: (fixture: StoreFixture) => void;
  closeFixtureModal: () => void;
  toggleInventoryModal: () => void;
  toggleSaveModal: () => void;
  openSupplierModal: () => void;
  closeAllModals: () => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warn') => void;
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
    timeScale: 60,
  },
  timeString: '07:00',
  inventory: [],
  fixtures: [],

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
  setFixtures: (fixtures) => set(state => ({ fixtures, activeFixtureModal: state.activeFixtureModal ? fixtures.find(f => f.id === state.activeFixtureModal!.id) ?? null : null })),
  setNearbyFixture: (nearbyFixture) => set({ nearbyFixture }),

  openFixtureModal: (fixture) => {
    captureModalFocus();
    set({
      activeFixtureModal: fixture,
      isInventoryModalOpen: false,
      isSaveModalOpen: false,
      isSupplierModalOpen: false,
    });
  },

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

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, type }],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3500);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
