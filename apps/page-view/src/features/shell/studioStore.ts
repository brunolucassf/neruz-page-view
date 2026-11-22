import type { ScreenId } from '@neruz/core';
import { type Device, STARTER_DEVICE_IDS } from '@neruz/devices';
import { create } from 'zustand';
import { t } from '../i18n';
import { findAnyDevice } from '../screens/deviceRegistry';
import { type BenchSize, computeFitZoom, MAX_ZOOM, MIN_ZOOM } from '../screens/layout';
import {
  clampScreenSize,
  pickFreeScreenId,
  presetFromDevice,
  type ScreenPreset,
} from '../screens/presets';
import { getMaxActiveScreens } from '../settings/settingsStore';

export type AccessState = 'unknown' | 'missing' | 'requesting' | 'denied' | 'granted';
export type ScreenStatus = 'waiting' | 'loading' | 'ready' | 'blocked';
export type EmptyReason = 'none' | 'browser-page' | 'store-page' | 'file-access';

export type Screen = ScreenPreset & {
  isDark: boolean;
  isFrozen: boolean;
  status: ScreenStatus;
  loadKey: number;
};

export type ResizeSession = {
  screenId: ScreenId;
  snappedTo: number | null;
  snapCount: number;
  pointerClientY: number | null;
};

type Snapshot = { screens: Screen[]; activeScreenId: ScreenId };

type StudioState = {
  pageUrl: string | null;
  lastPageUrl: string | null;
  emptyReason: EmptyReason;
  access: AccessState;
  screens: Screen[];
  activeScreenId: ScreenId;
  zoom: number;
  isFitMode: boolean;
  isMirrorOn: boolean;
  bench: BenchSize;
  resize: ResizeSession | null;
  captureStageScreenId: ScreenId | null;
  justAddedScreenId: ScreenId | null;
  liveMessage: string;
  history: Snapshot[];
  loadedSignature: string;
};

type StudioActions = {
  showPage: (url: string, access: AccessState) => void;
  showEmpty: (reason: EmptyReason) => void;
  setAccess: (access: AccessState) => void;
  setScreenStatus: (screenId: ScreenId, status: ScreenStatus) => void;
  reloadScreen: (screenId: ScreenId) => void;
  resizeScreen: (screenId: ScreenId, size: { width?: number; height?: number }) => void;
  rotateScreen: (screenId: ScreenId) => void;
  toggleScreenDark: (screenId: ScreenId) => void;
  activateScreen: (screenId: ScreenId) => void;
  addDevice: (device: Device) => ScreenId | null;
  duplicateScreen: (screenId: ScreenId) => void;
  swapScreen: (screenId: ScreenId, device: Device) => void;
  removeScreen: (screenId: ScreenId) => void;
  moveScreen: (screenId: ScreenId, direction: -1 | 1) => void;
  loadDevices: (deviceIds: readonly string[]) => number;
  unfreezeScreen: (screenId: ScreenId) => void;
  undo: () => boolean;
  setZoom: (zoom: number) => void;
  fitToBench: () => void;
  setBench: (bench: BenchSize) => void;
  setMirror: (isOn: boolean) => void;
  setResize: (resize: ResizeSession | null) => void;
  setCaptureStage: (screenId: ScreenId | null) => void;
  clearJustAdded: () => void;
};

const MAX_HISTORY = 20;

const signatureOf = (screens: readonly Screen[]) =>
  screens.map((screen) => screen.presetId).join('|');

const countActive = (screens: readonly Screen[]) =>
  screens.filter((screen) => !screen.isFrozen).length;

const createScreen = (preset: ScreenPreset, isFrozen: boolean): Screen => ({
  ...preset,
  isDark: false,
  isFrozen,
  status: 'waiting',
  loadKey: 0,
});

function createScreensFromDevices(deviceIds: readonly string[]): Screen[] {
  const screens: Screen[] = [];
  for (const deviceId of deviceIds) {
    const device = findAnyDevice(deviceId);
    const id = pickFreeScreenId(screens.map((screen) => screen.id));
    if (!device || !id) continue;
    screens.push(
      createScreen(presetFromDevice(id, device), screens.length >= getMaxActiveScreens()),
    );
  }
  return screens;
}

const updateScreen = (
  screens: Screen[],
  screenId: ScreenId,
  patch: (screen: Screen) => Partial<Screen>,
) => screens.map((screen) => (screen.id === screenId ? { ...screen, ...patch(screen) } : screen));

const canLoad = (state: StudioState, screen: Screen) =>
  state.access === 'granted' && state.pageUrl !== null && !screen.isFrozen;

const withLoadStarted = (state: StudioState, screen: Screen): Screen =>
  canLoad(state, screen)
    ? { ...screen, status: 'loading', loadKey: screen.loadKey + 1 }
    : { ...screen, status: 'waiting', loadKey: screen.loadKey + 1 };

const refit = (state: StudioState, screens: Screen[]) =>
  state.isFitMode ? computeFitZoom(screens, state.bench) : state.zoom;

const pushHistory = (state: StudioState): Snapshot[] =>
  [...state.history, { screens: state.screens, activeScreenId: state.activeScreenId }].slice(
    -MAX_HISTORY,
  );

const describe = (screen: Screen) => ({
  device: screen.name,
  w: screen.width,
  h: screen.height,
});

const starterScreens = createScreensFromDevices(STARTER_DEVICE_IDS);

export const useStudio = create<StudioState & StudioActions>()((set, get) => ({
  pageUrl: null,
  lastPageUrl: null,
  emptyReason: 'none',
  access: 'unknown',
  screens: starterScreens,
  activeScreenId: starterScreens[0]?.id ?? 's1',
  zoom: 1,
  isFitMode: false,
  isMirrorOn: true,
  bench: { width: 0, height: 0 },
  resize: null,
  captureStageScreenId: null,
  justAddedScreenId: null,
  liveMessage: '',
  history: [],
  loadedSignature: signatureOf(starterScreens),

  showPage: (url, access) =>
    set((state) => ({
      pageUrl: url,
      lastPageUrl: url,
      emptyReason: 'none',
      access,
      screens: state.screens.map((screen) =>
        withLoadStarted({ ...state, pageUrl: url, access }, screen),
      ),
      zoom: refit(state, state.screens),
    })),

  showEmpty: (emptyReason) => set({ pageUrl: null, emptyReason }),

  setAccess: (access) =>
    set((state) => ({
      access,
      screens:
        access === 'granted'
          ? state.screens.map((screen) => withLoadStarted({ ...state, access }, screen))
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
      return { screens, zoom: refit(state, screens) };
    }),

  toggleScreenDark: (screenId) =>
    set((state) => ({
      screens: updateScreen(state.screens, screenId, (screen) => ({ isDark: !screen.isDark })),
    })),

  activateScreen: (screenId) => {
    if (get().activeScreenId !== screenId) set({ activeScreenId: screenId });
  },

  addDevice: (device) => {
    const state = get();
    const id = pickFreeScreenId(state.screens.map((screen) => screen.id));
    if (!id) return null;
    const created = withLoadStarted(
      state,
      createScreen(
        presetFromDevice(id, device),
        countActive(state.screens) >= getMaxActiveScreens(),
      ),
    );
    const screens = [...state.screens, created];
    set({
      screens,
      history: pushHistory(state),
      activeScreenId: id,
      justAddedScreenId: id,
      zoom: refit(state, screens),
      liveMessage: t('studio.screen.live.added', { n: screens.length, ...describe(created) }),
    });
    return id;
  },

  duplicateScreen: (screenId) => {
    const state = get();
    const index = state.screens.findIndex((screen) => screen.id === screenId);
    const source = state.screens[index];
    const id = pickFreeScreenId(state.screens.map((screen) => screen.id));
    if (!source || !id) return;
    const copy = withLoadStarted(
      state,
      createScreen({ ...source, id }, countActive(state.screens) >= getMaxActiveScreens()),
    );
    const screens = [...state.screens];
    screens.splice(index + 1, 0, { ...copy, isDark: source.isDark });
    set({
      screens,
      history: pushHistory(state),
      activeScreenId: id,
      justAddedScreenId: id,
      zoom: refit(state, screens),
      liveMessage: t('studio.screen.live.added', { n: index + 2, ...describe(copy) }),
    });
  },

  swapScreen: (screenId, device) => {
    const state = get();
    const index = state.screens.findIndex((screen) => screen.id === screenId);
    if (index < 0) return;
    const screens = updateScreen(state.screens, screenId, (screen) =>
      withLoadStarted(state, { ...screen, ...presetFromDevice(screen.id, device) }),
    );
    set({
      screens,
      history: pushHistory(state),
      zoom: refit(state, screens),
      liveMessage: t('studio.screen.live.swapped', {
        n: index + 1,
        device: device.name,
        w: device.width,
        h: device.height,
      }),
    });
  },

  removeScreen: (screenId) => {
    const state = get();
    const index = state.screens.findIndex((screen) => screen.id === screenId);
    if (index < 0) return;
    const screens = state.screens.filter((screen) => screen.id !== screenId);
    const neighbor = screens[Math.min(index, screens.length - 1)];
    set({
      screens,
      history: pushHistory(state),
      activeScreenId:
        state.activeScreenId === screenId && neighbor ? neighbor.id : state.activeScreenId,
      zoom: refit(state, screens),
      liveMessage: t('studio.screen.live.removed', { n: index + 1 }),
    });
  },

  moveScreen: (screenId, direction) => {
    const state = get();
    const index = state.screens.findIndex((screen) => screen.id === screenId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.screens.length) return;
    const screens = [...state.screens];
    const [moved] = screens.splice(index, 1);
    if (moved) screens.splice(target, 0, moved);
    set({ screens, history: pushHistory(state) });
  },

  loadDevices: (deviceIds) => {
    const state = get();
    const screens = createScreensFromDevices(deviceIds).map((screen) =>
      withLoadStarted(state, screen),
    );
    set({
      screens,
      history: pushHistory(state),
      activeScreenId: screens[0]?.id ?? state.activeScreenId,
      loadedSignature: signatureOf(screens),
      zoom: refit(state, screens),
    });
    return screens.filter((screen) => screen.isFrozen).length;
  },

  unfreezeScreen: (screenId) => {
    const state = get();
    const target = state.screens.find((screen) => screen.id === screenId);
    if (!target?.isFrozen) return;
    const toPause =
      countActive(state.screens) >= getMaxActiveScreens()
        ? state.screens.find((screen) => !screen.isFrozen && screen.id !== state.activeScreenId)
        : undefined;
    set({
      screens: state.screens.map((screen) => {
        if (screen.id === screenId) return withLoadStarted(state, { ...screen, isFrozen: false });
        if (screen.id === toPause?.id) return { ...screen, isFrozen: true, status: 'waiting' };
        return screen;
      }),
      activeScreenId: screenId,
    });
  },

  undo: () => {
    const state = get();
    const snapshot = state.history.at(-1);
    if (!snapshot) return false;
    const screens = snapshot.screens.map((screen) => withLoadStarted(state, screen));
    set({
      screens,
      history: state.history.slice(0, -1),
      activeScreenId: snapshot.activeScreenId,
      zoom: refit(state, screens),
    });
    return true;
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

  clearJustAdded: () => set({ justAddedScreenId: null }),
}));

export const selectActiveScreen = (state: StudioState) =>
  state.screens.find((screen) => screen.id === state.activeScreenId) ?? state.screens[0];

export const selectCanSaveKit = (state: StudioState) =>
  state.screens.length > 0 && signatureOf(state.screens) !== state.loadedSignature;
