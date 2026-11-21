import { DEFAULT_FRAMED_CAPTURE, type FramedCapture, type FramedScope } from '@neruz/core';
import { create } from 'zustand';
import { loadFramedCapture, saveFramedCapture } from '../storage/items';
import type { FramedBackground } from './framing/composeFramed';

const COLOR_SAVE_DEBOUNCE_MS = 300;

type FramedPatch = Partial<Pick<FramedCapture, 'isEnabled' | 'frameDeviceId' | 'background'>>;

type FramedState = FramedCapture & {
  hydrate: () => Promise<void>;
  patch: (patch: FramedPatch) => void;
  chooseCustomColor: (color: string) => void;
  setScope: (scope: FramedScope) => void;
};

let colorSaveTimer: ReturnType<typeof setTimeout> | undefined;

function cancelPendingColorSave(): void {
  clearTimeout(colorSaveTimer);
  colorSaveTimer = undefined;
}

export const useFramed = create<FramedState>()((set, get) => {
  const persist = () => {
    cancelPendingColorSave();
    const { isEnabled, frameDeviceId, background, backgroundColor, scope } = get();
    void saveFramedCapture({ isEnabled, frameDeviceId, background, backgroundColor, scope });
  };

  return {
    ...DEFAULT_FRAMED_CAPTURE,

    hydrate: async () => {
      cancelPendingColorSave();
      set(await loadFramedCapture());
    },

    patch: (patch) => {
      set(patch);
      persist();
    },

    chooseCustomColor: (color) => {
      set({ background: 'custom', backgroundColor: color.toUpperCase() });
      cancelPendingColorSave();
      colorSaveTimer = setTimeout(persist, COLOR_SAVE_DEBOUNCE_MS);
    },

    setScope: (scope) => {
      set({ scope });
      persist();
    },
  };
});

export function selectFramedBackground(
  state: Pick<FramedCapture, 'background' | 'backgroundColor'>,
): FramedBackground {
  return state.background === 'custom'
    ? { kind: 'color', color: state.backgroundColor }
    : { kind: 'preset', id: state.background };
}
