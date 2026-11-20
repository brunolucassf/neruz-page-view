import type { ScreenId } from '@neruz/core';
import { DEVICE_CATEGORIES, type Device, type DeviceCategory } from '@neruz/devices';
import { create } from 'zustand';
import { t } from '../i18n';
import { selectCanSaveKit, useStudio } from '../shell/studioStore';
import { showToast } from '../toasts/toastStore';
import {
  DEFAULT_ONBOARDING,
  type Kit,
  loadFavorites,
  loadKits,
  loadOnboarding,
  type Onboarding,
  saveFavorites,
  saveKits,
  saveOnboarding,
} from './persistence';

export type LibrarySection = 'essentials' | 'favorites' | 'kits' | DeviceCategory;

export const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  'essentials',
  'favorites',
  'kits',
  ...DEVICE_CATEGORIES,
];

type LibraryState = {
  isOpen: boolean;
  swapScreenId: ScreenId | null;
  query: string;
  openSections: Partial<Record<LibrarySection, boolean>>;
  favorites: string[];
  kits: Kit[];
  onboarding: Onboarding;
  isWelcomeOpen: boolean;
  isHintVisible: boolean;
  isHydrated: boolean;
  isShortcutsOpen: boolean;
};

type LibraryActions = {
  hydrate: () => Promise<void>;
  open: (swapScreenId?: ScreenId | null) => void;
  close: () => void;
  setQuery: (query: string) => void;
  toggleSection: (section: LibrarySection) => void;
  toggleFavorite: (deviceId: string) => void;
  saveCurrentKit: (name: string) => void;
  deleteKit: (kitId: string) => void;
  pickDevice: (device: Device) => void;
  finishWelcome: () => void;
  dismissHint: () => void;
  setShortcutsOpen: (isOpen: boolean) => void;
};

const patchOnboarding = (patch: Partial<Onboarding>) => {
  const next = { ...useLibrary.getState().onboarding, ...patch };
  useLibrary.setState({ onboarding: next });
  void saveOnboarding(next);
};

export const useLibrary = create<LibraryState & LibraryActions>()((set, get) => ({
  isOpen: false,
  swapScreenId: null,
  query: '',
  openSections: { essentials: true },
  favorites: [],
  kits: [],
  onboarding: DEFAULT_ONBOARDING,
  isWelcomeOpen: false,
  isHintVisible: false,
  isHydrated: false,
  isShortcutsOpen: false,

  setShortcutsOpen: (isShortcutsOpen) => set({ isShortcutsOpen }),

  hydrate: async () => {
    const [favorites, kits, onboarding] = await Promise.all([
      loadFavorites(),
      loadKits(),
      loadOnboarding(),
    ]);
    set({
      favorites,
      kits,
      onboarding,
      isWelcomeOpen: !onboarding.hasSeenWelcome,
      isHintVisible: onboarding.hasSeenWelcome && !onboarding.hasSeenAddHint,
      openSections: { essentials: onboarding.isEssentialsOpen },
      isHydrated: true,
    });
  },

  open: (swapScreenId = null) => set({ isOpen: true, swapScreenId, query: '' }),

  close: () => set({ isOpen: false, swapScreenId: null }),

  setQuery: (query) => set({ query }),

  toggleSection: (section) => {
    const isOpen = !get().openSections[section];
    set((state) => ({ openSections: { ...state.openSections, [section]: isOpen } }));
    if (section === 'essentials') patchOnboarding({ isEssentialsOpen: isOpen });
  },

  toggleFavorite: (deviceId) => {
    const current = get().favorites;
    const favorites = current.includes(deviceId)
      ? current.filter((id) => id !== deviceId)
      : [...current, deviceId];
    set({ favorites });
    void saveFavorites(favorites);
  },

  saveCurrentKit: (name) => {
    const studio = useStudio.getState();
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed || !selectCanSaveKit(studio)) return;
    const kit: Kit = {
      id: crypto.randomUUID(),
      name: trimmed,
      deviceIds: studio.screens.map((screen) => screen.presetId),
      orientation: 'portrait',
    };
    const kits = [...get().kits, kit];
    set({ kits });
    void saveKits(kits);
    showToast({ tone: 'success', title: t('studio.library.kit.saved', { name: trimmed }) });
  },

  deleteKit: (kitId) => {
    const kits = get().kits.filter((kit) => kit.id !== kitId);
    set({ kits });
    void saveKits(kits);
  },

  pickDevice: (device) => {
    const { swapScreenId } = get();
    const studio = useStudio.getState();
    if (swapScreenId) {
      studio.swapScreen(swapScreenId, device);
      set({ swapScreenId: null, isOpen: false });
      return;
    }
    studio.addDevice(device);
    get().dismissHint();
  },

  finishWelcome: () => {
    set({ isWelcomeOpen: false, isHintVisible: !get().onboarding.hasSeenAddHint });
    patchOnboarding({ hasSeenWelcome: true });
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-add-screen]')?.focus());
  },

  dismissHint: () => {
    if (get().isHintVisible) set({ isHintVisible: false });
    if (!get().onboarding.hasSeenAddHint) patchOnboarding({ hasSeenAddHint: true });
  },
}));
