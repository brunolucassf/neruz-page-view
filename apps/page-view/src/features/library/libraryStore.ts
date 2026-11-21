import type { ScreenId } from '@neruz/core';
import {
  type CustomDevice,
  DEFAULT_ONBOARDING,
  type Kit,
  MAX_CUSTOM_DEVICES,
  type StudioOnboarding,
} from '@neruz/core';
import { DEVICE_CATEGORIES, type Device, type DeviceCategory } from '@neruz/devices';
import { create } from 'zustand';
import { t } from '../i18n';
import { registerCustomDevices } from '../screens/deviceRegistry';
import { selectCanSaveKit, useStudio } from '../shell/studioStore';
import {
  loadCustomDevices,
  loadFavorites,
  loadKits,
  loadOnboarding,
  saveCustomDevices,
  saveFavorites,
  saveKits,
  saveOnboarding,
} from '../storage/items';
import { showToast } from '../toasts/toastStore';
import { type CustomDeviceValue, customToDevice } from './customDevice';

export type LibrarySection = 'essentials' | 'favorites' | 'kits' | 'custom' | DeviceCategory;

export type CustomEditor = { editingId: string | null };

export const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  'essentials',
  'favorites',
  'kits',
  'custom',
  ...DEVICE_CATEGORIES,
];

type LibraryState = {
  isOpen: boolean;
  swapScreenId: ScreenId | null;
  query: string;
  openSections: Partial<Record<LibrarySection, boolean>>;
  favorites: string[];
  kits: Kit[];
  customDevices: CustomDevice[];
  customEditor: CustomEditor | null;
  onboarding: StudioOnboarding;
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
  renameKit: (kitId: string, name: string) => void;
  openCustomEditor: (editingId?: string | null) => void;
  closeCustomEditor: () => void;
  saveCustomDevice: (value: CustomDeviceValue, editingId: string | null) => boolean;
  deleteCustomDevice: (deviceId: string) => void;
  pickDevice: (device: Device) => void;
  finishWelcome: () => void;
  dismissHint: () => void;
  setShortcutsOpen: (isOpen: boolean) => void;
};

const patchOnboarding = (patch: Partial<StudioOnboarding>) => {
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
  customDevices: [],
  customEditor: null,
  onboarding: DEFAULT_ONBOARDING,
  isWelcomeOpen: false,
  isHintVisible: false,
  isHydrated: false,
  isShortcutsOpen: false,

  setShortcutsOpen: (isShortcutsOpen) => set({ isShortcutsOpen }),

  hydrate: async () => {
    const customDevices = await loadCustomDevices();
    registerCustomDevices(customDevices.map(customToDevice));
    const [favorites, kits, onboarding] = await Promise.all([
      loadFavorites(customDevices.map((device) => device.id)),
      loadKits(),
      loadOnboarding(),
    ]);
    set({
      favorites,
      kits,
      customDevices,
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

  renameKit: (kitId, name) => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;
    const kits = get().kits.map((kit) => (kit.id === kitId ? { ...kit, name: trimmed } : kit));
    set({ kits });
    void saveKits(kits);
    showToast({ tone: 'success', title: t('studio.library.kit.renamed', { name: trimmed }) });
  },

  openCustomEditor: (editingId = null) =>
    set((state) => ({
      customEditor: { editingId },
      openSections: { ...state.openSections, custom: true },
    })),

  closeCustomEditor: () => set({ customEditor: null }),

  saveCustomDevice: (value, editingId) => {
    const current = get().customDevices;
    if (!editingId && current.length >= MAX_CUSTOM_DEVICES) {
      showToast({
        tone: 'neutral',
        title: t('studio.library.custom.limit', { n: MAX_CUSTOM_DEVICES }),
      });
      return false;
    }
    const saved: CustomDevice = { id: editingId ?? crypto.randomUUID(), ...value };
    const customDevices = editingId
      ? current.map((device) => (device.id === editingId ? saved : device))
      : [...current, saved];
    registerCustomDevices(customDevices.map(customToDevice));
    set({ customDevices, customEditor: null });
    void saveCustomDevices(customDevices);
    showToast({ tone: 'success', title: t('studio.library.custom.saved', { name: saved.name }) });
    return true;
  },

  deleteCustomDevice: (deviceId) => {
    const removed = get().customDevices.find((device) => device.id === deviceId);
    const customDevices = get().customDevices.filter((device) => device.id !== deviceId);
    const favorites = get().favorites.filter((id) => id !== deviceId);
    registerCustomDevices(customDevices.map(customToDevice));
    set({ customDevices, favorites, customEditor: null });
    void saveCustomDevices(customDevices);
    void saveFavorites(favorites);
    if (removed) {
      showToast({
        tone: 'neutral',
        title: t('studio.library.custom.deleted', { name: removed.name }),
      });
    }
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
