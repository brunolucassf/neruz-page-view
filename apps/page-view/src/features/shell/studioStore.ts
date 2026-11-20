import type { ScreenId } from '@neruz/core';
import { create } from 'zustand';
import { type BenchSize, computeFitZoom, MAX_ZOOM, MIN_ZOOM } from '../screens/layout';
import { clampScreenSize, type ScreenPreset, STARTING_SCREENS } from '../screens/presets';

export type AccessState = 'unknown' | 'missing' | 'requesting' | 'denied' | 'granted';
export type ScreenStatus = 'waiting' | 'loading' | 'ready' | 'blocked';

export type Screen = ScreenPreset & {
  isDark: boolean;
  status: ScreenStatus;
  loadKey: number;
};

export type ResizeSession = {
  screenId: ScreenId;
  snappedTo: number | null;
  snapCount: number;
  pointerClientY: number | null;
};

type StudioState = {
  pageUrl: string | null;
  access: AccessState;
  screens: Screen[];
  activeScreenId: ScreenId;
  zoom: number;
  isFitMode: boolean;
  isMirrorOn: boolean;
  bench: BenchSize;
  resize: ResizeSession | null;
  captureStageScreenId: ScreenId | null;
};

type StudioActions = {
  showPage: (url: string, access: AccessState) => void;
  setAccess: (access: AccessState) => void;
  setScreenStatus: (screenId: ScreenId, status: ScreenStatus) => void;
  reloadScreen: (screenId: ScreenId) => void;
  resizeScreen: (screenId: ScreenId, size: { width?: number; height?: number }) => void;
  rotateScreen: (screenId: ScreenId) => void;
  toggleScreenDark: (screenId: ScreenId) => void;
  activateScreen: (screenId: ScreenId) => void;
  setZoom: (zoom: number) => void;
  fitToBench: () => void;
  setBench: (bench: BenchSize) => void;
  setMirror: (isOn: boolean) => void;
  setResize: (resize: ResizeSession | null) => void;
  setCaptureStage: (screenId: ScreenId | null) => void;
};

const createStartingScreens = (): Screen[] =>
  STARTING_SCREENS.map((preset) => ({ ...preset, isDark: false, status: 'waiting', loadKey: 0 }));

const updateScreen = (
  screens: Screen[],
  screenId: ScreenId,
  patch: (screen: Screen) => Partial<Screen>,
) => screens.map((screen) => (screen.id === screenId ? { ...screen, ...patch(screen) } : screen));

export const useStudio = create<StudioState & StudioActions>()((set, get) => ({
  pageUrl: null,
  access: 'unknown',
  screens: createStartingScreens(),
  activeScreenId: 's1',
  zoom: 1,
  isFitMode: true,
  isMirrorOn: true,
  bench: { width: 0, height: 0 },
  resize: null,
  captureStageScreenId: null,

  showPage: (url, access) =>
    set((state) => ({
      pageUrl: url,
      access,
      screens: state.screens.map((screen) => ({
        ...screen,
        status: access === 'granted' ? 'loading' : 'waiting',
        loadKey: screen.loadKey + 1,
      })),
      isFitMode: true,
      zoom: computeFitZoom(state.screens, state.bench),
    })),

  setAccess: (access) =>
    set((state) => ({
      access,
      screens:
        access === 'granted'
          ? state.screens.map((screen) => ({
              ...screen,
              status: 'loading',
              loadKey: screen.loadKey + 1,
            }))
          : state.screens,
    })),

  setScreenStatus: (screenId, status) =>
    set((state) => ({ screens: updateScreen(state.screens, screenId, () => ({ status })) })),

  reloadScreen: (screenId) =>
    set((state) => ({
      screens: updateScreen(state.screens, screenId, (screen) => ({
        status: 'loading',
        loadKey: screen.loadKey + 1,
      })),
    })),

  resizeScreen: (screenId, size) =>
    set((state) => ({
      isFitMode: false,
      screens: updateScreen(state.screens, screenId, (screen) => ({
        width: size.width === undefined ? screen.width : clampScreenSize(size.width),
        height: size.height === undefined ? screen.height : clampScreenSize(size.height),
      })),
    })),

  rotateScreen: (screenId) =>
    set((state) => {
      const screens = updateScreen(state.screens, screenId, (screen) => ({
        width: screen.height,
        height: screen.width,
      }));
      return {
        screens,
        zoom: state.isFitMode ? computeFitZoom(screens, state.bench) : state.zoom,
      };
    }),

  toggleScreenDark: (screenId) =>
    set((state) => ({
      screens: updateScreen(state.screens, screenId, (screen) => ({ isDark: !screen.isDark })),
    })),

  activateScreen: (screenId) => {
    if (get().activeScreenId !== screenId) set({ activeScreenId: screenId });
  },

  setZoom: (zoom) => set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)), isFitMode: false }),

  fitToBench: () =>
    set((state) => ({ isFitMode: true, zoom: computeFitZoom(state.screens, state.bench) })),

  setBench: (bench) => {
    const state = get();
    if (state.captureStageScreenId) return;
    if (state.bench.width === bench.width && state.bench.height === bench.height) return;
    set({
      bench,
      zoom: state.isFitMode ? computeFitZoom(state.screens, bench) : state.zoom,
    });
  },

  setMirror: (isOn) => set({ isMirrorOn: isOn }),

  setResize: (resize) => set({ resize }),

  setCaptureStage: (screenId) => set({ captureStageScreenId: screenId }),
}));

export const selectActiveScreen = (state: StudioState) =>
  state.screens.find((screen) => screen.id === state.activeScreenId) ?? state.screens[0];
