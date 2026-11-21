import { create } from 'zustand';
import {
  DEFAULT_FRAMED_CAPTURE,
  type FramedCapturePrefs,
  loadFramedCapture,
  saveFramedCapture,
} from '../library/persistence';
import type { FramedBackground } from './framing/composeFramed';
import type { FramedScope } from './framing/layout';

export const DEFAULT_CUSTOM_COLOR = '#C8D4E0';

type FramedState = FramedCapturePrefs & {
  isCustomColor: boolean;
  customColor: string;
  scope: FramedScope;
  hydrate: () => Promise<void>;
  patch: (patch: Partial<FramedCapturePrefs>) => void;
  chooseCustomColor: (color: string) => void;
  setScope: (scope: FramedScope) => void;
};

export const useFramed = create<FramedState>()((set, get) => ({
  ...DEFAULT_FRAMED_CAPTURE,
  isCustomColor: false,
  customColor: DEFAULT_CUSTOM_COLOR,
  scope: 'fold',

  hydrate: async () => set(await loadFramedCapture()),

  patch: (patch) => {
    set(patch.background ? { ...patch, isCustomColor: false } : patch);
    const { isEnabled, frameDeviceId, background } = get();
    void saveFramedCapture({ isEnabled, frameDeviceId, background });
  },

  chooseCustomColor: (color) => set({ customColor: color, isCustomColor: true }),

  setScope: (scope) => set({ scope }),
}));

export function selectFramedBackground(state: {
  isCustomColor: boolean;
  customColor: string;
  background: FramedCapturePrefs['background'];
}): FramedBackground {
  return state.isCustomColor
    ? { kind: 'color', color: state.customColor }
    : { kind: 'preset', id: state.background };
}
