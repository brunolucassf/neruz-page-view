import { type CaptureProgress, captureScreen } from '@neruz/capture';
import { NpvException, type ScreenId } from '@neruz/core';
import { create } from 'zustand';
import { track } from '../analytics/analytics';
import type { CapturedShot, ImageFormat } from '../export/exportService';
import { copyOutput, exportOutput, redoWithFrame, showOutput } from '../export/outputActions';
import { useResult } from '../export/resultStore';
import { type MessageKey, t } from '../i18n';
import { type Screen, useStudio } from '../shell/studioStore';
import { showToast } from '../toasts/toastStore';
import { useFramed } from './framedStore';
import { createPreviewSource } from './framing/framedOutput';

export type CaptureModeChoice = 'fast' | 'experience' | 'moments';
export type CaptureTarget = 'active' | 'all' | 'pages';
export type { ImageFormat };

type CaptureState = {
  quality: number;
  mode: CaptureModeChoice;
  target: CaptureTarget;
  format: ImageFormat;
  isRunning: boolean;
  stepKey: MessageKey;
  ratio: number;
  controller: AbortController | null;
  setMode: (mode: CaptureModeChoice) => void;
  setTarget: (target: CaptureTarget) => void;
  setFormat: (format: ImageFormat) => void;
  setQuality: (quality: number) => void;
};

export const useCapture = create<CaptureState>()((set) => ({
  mode: 'experience',
  target: 'active',
  format: 'png',
  quality: 0.92,
  isRunning: false,
  stepKey: 'queue.step.capturing',
  ratio: 0,
  controller: null,
  setMode: (mode) => set({ mode }),
  setTarget: (target) => set({ target }),
  setFormat: (format) => set({ format }),
  setQuality: (quality) => set({ quality }),
}));

const PREPARING_SHARE = 0.1;
const ENCODING_SHARE = 0.1;

function toOverallRatio(progress: CaptureProgress): number {
  if (progress.phase === 'preparing') return progress.ratio * PREPARING_SHARE;
  if (progress.phase === 'capturing') {
    return PREPARING_SHARE + progress.ratio * (1 - PREPARING_SHARE - ENCODING_SHARE);
  }
  return 1 - ENCODING_SHARE + progress.ratio * ENCODING_SHARE;
}

function toStepKey(progress: CaptureProgress, isExperience: boolean): MessageKey {
  if (progress.phase === 'encoding') return 'queue.step.stitching';
  if (progress.phase === 'preparing' && isExperience) return 'queue.step.waiting';
  return 'queue.step.capturing';
}

export const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

export const captureHooks = (screenId: ScreenId) => ({
  enterCaptureLayout: async () => {
    useStudio.getState().setCaptureStage(screenId);
    await nextPaint();
  },
  leaveCaptureLayout: async () => {
    useStudio.getState().setCaptureStage(null);
    await nextPaint();
  },
});

function listTargetScreens(target: CaptureTarget): Screen[] {
  const { screens, activeScreenId } = useStudio.getState();
  const ready = screens.filter((screen) => screen.status === 'ready');
  if (target === 'all') return ready;
  return ready.filter((screen) => screen.id === activeScreenId);
}

const readHost = () => {
  const pageUrl = useStudio.getState().pageUrl;
  return pageUrl ? new URL(pageUrl).hostname : 'pagina';
};

function announceSuccess() {
  const isFramedOn = useFramed.getState().isEnabled;
  showToast({
    tone: 'success',
    title: t('state.success.shot'),
    actions: [
      { label: t('state.success.download'), onPress: () => void exportOutput() },
      { label: t('state.success.copy'), onPress: () => void copyOutput() },
      { label: t('state.success.show'), onPress: () => void showOutput() },
      ...(isFramedOn ? [] : [{ label: t('state.success.redoFramed'), onPress: redoWithFrame }]),
    ],
  });
}

async function storeCapturedShots(shots: CapturedShot[]) {
  const firstPart = shots.find((shot) => shot.result.parts[0])?.result.parts[0];
  const previewSource = firstPart ? await createPreviewSource(firstPart) : null;
  useResult.getState().setCaptured(shots, readHost(), previewSource);
}

export async function runCapture(): Promise<void> {
  const state = useCapture.getState();
  if (state.isRunning || state.target === 'pages') return;
  const screens = listTargetScreens(state.target);
  if (screens.length === 0) return;
  const mode = state.mode;
  const controller = new AbortController();
  useCapture.setState({
    isRunning: true,
    controller,
    ratio: 0,
    stepKey: mode === 'experience' ? 'queue.step.waiting' : 'queue.step.capturing',
  });

  const shots: CapturedShot[] = [];
  try {
    for (const [index, screen] of screens.entries()) {
      const result = await captureScreen(
        screen.id,
        mode,
        (progress) =>
          useCapture.setState({
            stepKey: toStepKey(progress, mode === 'experience'),
            ratio: (index + toOverallRatio(progress)) / screens.length,
          }),
        controller.signal,
        { hooks: captureHooks(screen.id), imageType: 'image/png' },
      );
      shots.push({
        screenName: screen.name,
        kind: screen.kind,
        isLandscape: screen.width > screen.height,
        width: screen.width,
        height: screen.height,
        isDark: screen.isDark,
        isFramed: false,
        hasAlpha: false,
        result,
      });
    }
    useCapture.setState({ ratio: 1 });
    await storeCapturedShots(shots);
    announceSuccess();
    void track('capture_done', {
      mode,
      target: state.target,
      is_framed: useFramed.getState().isEnabled,
    });
  } catch (cause) {
    const isAborted =
      controller.signal.aborted ||
      (cause instanceof NpvException && cause.error.code === 'NPV-ABORTED');
    if (isAborted) {
      showToast({ tone: 'neutral', title: t('state.canceled') });
    } else {
      showToast({
        tone: 'error',
        title: t('state.error.generic.title'),
        body: t('state.error.generic.body'),
        actions: [{ label: t('state.error.retry'), onPress: () => void runCapture() }],
      });
    }
  } finally {
    useCapture.setState({ isRunning: false, controller: null });
  }
}

export function cancelCapture(): void {
  useCapture.getState().controller?.abort();
}
