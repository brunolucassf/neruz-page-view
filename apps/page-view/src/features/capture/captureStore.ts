import { type CaptureProgress, type CaptureResult, captureScreen } from '@neruz/capture';
import { NpvException, type ScreenId } from '@neruz/core';
import { create } from 'zustand';
import { type MessageKey, t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { showToast } from '../toasts/toastStore';
import { copyImage, downloadParts, openPart } from './captureOutput';

export type CaptureModeChoice = 'fast' | 'experience' | 'moments';
export type CaptureTarget = 'active' | 'all';
export type ImageFormat = 'png' | 'jpeg' | 'webp';

type CaptureState = {
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
};

export const useCapture = create<CaptureState>()((set) => ({
  mode: 'experience',
  target: 'active',
  format: 'png',
  isRunning: false,
  stepKey: 'queue.step.capturing',
  ratio: 0,
  controller: null,
  setMode: (mode) => set({ mode }),
  setTarget: (target) => set({ target }),
  setFormat: (format) => set({ format }),
}));

const MIME_BY_FORMAT: Record<ImageFormat, 'image/png' | 'image/jpeg' | 'image/webp'> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

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

const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

const captureHooks = (screenId: ScreenId) => ({
  enterCaptureLayout: async () => {
    useStudio.getState().setCaptureStage(screenId);
    await nextPaint();
  },
  leaveCaptureLayout: async () => {
    useStudio.getState().setCaptureStage(null);
    await nextPaint();
  },
});

function listTargetScreens(target: CaptureTarget): ScreenId[] {
  const { screens, activeScreenId } = useStudio.getState();
  const ready = screens.filter((screen) => screen.status === 'ready');
  if (target === 'all') return ready.map((screen) => screen.id);
  return ready.some((screen) => screen.id === activeScreenId) ? [activeScreenId] : [];
}

function announceSuccess(results: CaptureResult[], format: ImageFormat) {
  const pageUrl = useStudio.getState().pageUrl;
  const host = pageUrl ? new URL(pageUrl).hostname : 'pagina';
  const firstPart = results[0]?.parts[0];
  showToast({
    tone: 'success',
    title: t('state.success.shot'),
    actions: [
      {
        label: t('state.success.download'),
        onPress: () => downloadParts(results, host, format),
      },
      ...(firstPart && format === 'png'
        ? [{ label: t('state.success.copy'), onPress: () => void copyImage(firstPart) }]
        : []),
      ...(firstPart
        ? [{ label: t('state.success.show'), onPress: () => openPart(firstPart) }]
        : []),
    ],
  });
}

export async function runCapture(): Promise<void> {
  const state = useCapture.getState();
  if (state.isRunning) return;
  const screenIds = listTargetScreens(state.target);
  if (screenIds.length === 0) return;
  const mode = state.mode === 'fast' ? 'fast' : 'experience';
  const controller = new AbortController();
  useCapture.setState({
    isRunning: true,
    controller,
    ratio: 0,
    stepKey: mode === 'experience' ? 'queue.step.waiting' : 'queue.step.capturing',
  });

  const results: CaptureResult[] = [];
  try {
    for (const [index, screenId] of screenIds.entries()) {
      const result = await captureScreen(
        screenId,
        mode,
        (progress) =>
          useCapture.setState({
            stepKey: toStepKey(progress, mode === 'experience'),
            ratio: (index + toOverallRatio(progress)) / screenIds.length,
          }),
        controller.signal,
        { hooks: captureHooks(screenId), imageType: MIME_BY_FORMAT[state.format] },
      );
      results.push(result);
    }
    useCapture.setState({ ratio: 1 });
    announceSuccess(results, state.format);
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
