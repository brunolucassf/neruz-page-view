import { create } from 'zustand';
import {
  type CaptureDefaults,
  DEFAULT_CAPTURE_DEFAULTS,
  DEFAULT_SETTINGS,
  loadCaptureDefaults,
  loadSettings,
  type Settings,
  saveCaptureDefaults,
  saveSettings,
} from './persistence';

type SettingsState = {
  settings: Settings;
  captureDefaults: CaptureDefaults;
  isOpen: boolean;
  hydrate: () => Promise<void>;
  patchSettings: (patch: Partial<Settings>) => void;
  patchCaptureDefaults: (patch: Partial<CaptureDefaults>) => void;
  setOpen: (isOpen: boolean) => void;
};

export const useSettings = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  captureDefaults: DEFAULT_CAPTURE_DEFAULTS,
  isOpen: false,

  hydrate: async () => {
    const [settings, captureDefaults] = await Promise.all([loadSettings(), loadCaptureDefaults()]);
    set({ settings, captureDefaults });
  },

  patchSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void saveSettings(settings);
  },

  patchCaptureDefaults: (patch) => {
    const captureDefaults = { ...get().captureDefaults, ...patch };
    set({ captureDefaults });
    void saveCaptureDefaults(captureDefaults);
  },

  setOpen: (isOpen) => set({ isOpen }),
}));

export const getMaxActiveScreens = () => useSettings.getState().settings.maxScreens;

export const useMaxActiveScreens = () => useSettings((state) => state.settings.maxScreens);
