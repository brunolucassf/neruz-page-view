import { create } from 'zustand';
import {
  DEFAULT_FRAMED_CAPTURE,
  type FramedCapturePrefs,
  loadFramedCapture,
  saveFramedCapture,
} from '../library/persistence';

type FramedState = FramedCapturePrefs & {
  hydrate: () => Promise<void>;
  patch: (patch: Partial<FramedCapturePrefs>) => void;
};

export const useFramed = create<FramedState>()((set, get) => ({
  ...DEFAULT_FRAMED_CAPTURE,

  hydrate: async () => set(await loadFramedCapture()),

  patch: (patch) => {
    set(patch);
    const { isEnabled, frameDeviceId, background } = get();
    void saveFramedCapture({ isEnabled, frameDeviceId, background });
  },
}));
