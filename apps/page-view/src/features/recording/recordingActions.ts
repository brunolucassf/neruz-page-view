import {
  getStudioClient,
  NpvException,
  type RecConfig,
  type RecResult,
  type Size,
  studioHideScrollbar,
  studioMeasure,
  studioMetrics,
  studioScrollTo,
} from '@neruz/core';
import { downloadBlob } from '../capture/captureOutput';
import { nextPaint } from '../capture/captureStore';
import { type MessageKey, t } from '../i18n';
import { type Screen, useStudio } from '../shell/studioStore';
import { showToast } from '../toasts/toastStore';
import { pickTabZoom, planRecording, resolveOutputSize } from './recordingPlan';
import {
  isRecordingBusy,
  type RecordingStage,
  selectRecordScreen,
  useRecording,
  type VideoResult,
} from './recordingState';
import { applyStudioTabZoom } from './tabZoom';

const TAB_CAPTURE_PERMISSION: chrome.permissions.Permissions = { permissions: ['tabCapture'] };
const OUTPUT_BACKGROUND = '#111111';
const EXPECTED_END_TAIL_MS = 400;
const BYTES_PER_MEGABYTE = 1024 * 1024;
export const pickCurrentRecordScreen = () =>
  selectRecordScreen({ ...useStudio.getState(), ...useRecording.getState() });

const isTabCaptureRoute = () => typeof chrome.offscreen !== 'undefined';

const ensureTabCapturePermission = async () => {
  if (!isTabCaptureRoute()) return;
  if (await chrome.permissions.contains(TAB_CAPTURE_PERMISSION)) return;
  if (!(await chrome.permissions.request(TAB_CAPTURE_PERMISSION))) {
    throw new NpvException('NPV-PERMISSION-DENIED', 'tab capture permission refused');
  }
};

const readExtensionShortcut = async (): Promise<string> => {
  try {
    const commands = await chrome.commands.getAll();
    return commands.find((command) => command.name === '_execute_action')?.shortcut ?? '';
  } catch {
    return '';
  }
};

const readHost = () => {
  const pageUrl = useStudio.getState().pageUrl;
  const host = pageUrl ? new URL(pageUrl).hostname : 'pagina';
  return host.replace(/[^a-z0-9.-]/gi, '-');
};

const measureViewportRect = () => {
  const iframe = document.querySelector<HTMLIFrameElement>('.screen[data-capture-target] iframe');
  if (!iframe) throw new NpvException('NPV-FRAME-NOT-FOUND', 'recording screen is not visible');
  const box = iframe.getBoundingClientRect();
  const scale = window.devicePixelRatio;
  const viewport = {
    width: Math.round(window.innerWidth * scale),
    height: Math.round(window.innerHeight * scale),
  };
  const rect = {
    x: Math.round(box.left * scale),
    y: Math.round(box.top * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  };
  const isInside =
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= viewport.width + 1 &&
    rect.y + rect.height <= viewport.height + 1;
  if (!isInside) throw new NpvException('NPV-REC-FAILED', 'screen does not fit the viewport');
  return { rect, viewport };
};

const toVideoResult = (
  blob: Blob,
  recorded: RecResult,
  screen: Screen,
  output: Size,
): VideoResult => ({
  blob,
  filename: `${readHost()}-${screen.width}x${screen.height}.${recorded.extension}`,
  format: recorded.extension === 'mp4' ? 'MP4' : 'WebM',
  width: output.width,
  height: output.height,
  seconds: Math.round(recorded.videoSeconds),
  megabytes: (recorded.bytes / BYTES_PER_MEGABYTE).toFixed(1),
});

const ERROR_MESSAGE_BY_CODE: Partial<Record<string, MessageKey>> = {
  'NPV-REC-GESTURE-REQUIRED': 'studio.video.error.gesture',
  'NPV-REC-BUSY': 'studio.video.error.busy',
  'NPV-PERMISSION-DENIED': 'studio.video.error.permission',
  'NPV-PERMISSION-MISSING': 'studio.video.error.permission',
  'NPV-ENCODER-UNSUPPORTED': 'studio.video.error.encoder',
};

const isAbortCause = (cause: unknown) =>
  cause instanceof NpvException && cause.error.code === 'NPV-ABORTED';

const announceFailure = (cause: unknown) => {
  const code = cause instanceof NpvException ? cause.error.code : '';
  const messageKey = ERROR_MESSAGE_BY_CODE[code];
  showToast({
    tone: 'error',
    title: t('state.error.generic.title'),
    body: messageKey ? t(messageKey) : t('state.error.generic.body'),
    actions: [{ label: t('state.error.retry'), onPress: () => void runRecording() }],
  });
};

type Restore = () => Promise<void> | void;

const runRestores = async (restores: Restore[]) => {
  for (const restore of restores.reverse()) {
    try {
      await restore();
    } catch {}
  }
};

const updateProgress = (stage: RecordingStage, elapsedMs: number) =>
  useRecording.setState({ stage, elapsedMs });

export async function runRecording(): Promise<void> {
  if (isRecordingBusy(useRecording.getState().stage)) return;
  const screen = pickCurrentRecordScreen();
  if (!screen) {
    showToast({ tone: 'neutral', title: t('studio.video.error.noPage') });
    return;
  }
  const controller = new AbortController();
  const restores: Restore[] = [];
  const studio = useStudio.getState();
  const originalTitle = document.title;
  const wasMirrorOn = studio.isMirrorOn;
  useRecording.setState({
    stage: 'preparing',
    elapsedMs: 0,
    result: null,
    recordingController: controller,
    gestureShortcut: '',
    recordingScreenId: screen.id,
    isManuallyPaused: false,
  });

  let recorded: RecResult | null = null;
  const client = getStudioClient();
  try {
    await ensureTabCapturePermission();
    const videoModule = import('@neruz/capture/video');
    const [metrics, measure] = await Promise.all([
      client.command(studioMetrics, screen.id, {}),
      client.command(studioMeasure, screen.id, {}).catch(() => ({ sections: [] })),
    ]);
    const settings = useRecording.getState();
    const plan = planRecording({
      speed: settings.speed,
      totalScroll: metrics.scrollHeight - metrics.innerHeight,
      sections: measure.sections,
      hasPauses: settings.hasPauses,
    });
    const output = resolveOutputSize(settings.preset, screen);
    const pausesMs = plan.stops.reduce((sum, stop) => sum + stop.pauseMs, 0);
    useRecording.setState({ expectedMs: plan.scrollMs + pausesMs + EXPECTED_END_TAIL_MS });

    if (wasMirrorOn) {
      useStudio.getState().setMirror(false);
      restores.push(() => useStudio.getState().setMirror(true));
    }
    useStudio.getState().setCaptureStage(screen.id);
    restores.push(() => useStudio.getState().setCaptureStage(null));
    await nextPaint();
    const zoom = pickTabZoom(screen, { width: window.innerWidth, height: window.innerHeight });
    restores.push(await applyStudioTabZoom(zoom));
    useRecording.setState({ stageZoom: zoom });
    await nextPaint();
    const { rect, viewport } = measureViewportRect();

    restores.push(async () => {
      await client.command(studioScrollTo, screen.id, { top: 0 });
    });
    await client.command(studioHideScrollbar, screen.id, { hidden: true });
    restores.push(async () => {
      await client.command(studioHideScrollbar, screen.id, { hidden: false });
    });

    const config: RecConfig = {
      rect,
      viewport,
      durationMs: plan.durationMs,
      outWidth: output.width,
      outHeight: output.height,
      fps: 30,
      backgroundColor: OUTPUT_BACKGROUND,
      preferredCodecs: ['avc', 'vp9'],
    };
    const { startRecording, releaseRecording } = await videoModule;
    updateProgress('starting', 0);
    recorded = await startRecording(
      {
        config,
        client,
        autoscroll: {
          screenId: screen.id,
          durationMs: plan.scrollMs,
          easing: 'inOutSine',
          stops: plan.stops,
        },
      },
      (progress) => {
        updateProgress(progress.phase, progress.elapsedMs);
        if (progress.phase === 'awaiting-gesture') {
          void readExtensionShortcut().then((gestureShortcut) =>
            useRecording.setState({ gestureShortcut }),
          );
        }
        if (progress.phase === 'recording') {
          document.title = t('studio.video.tabIndicator');
        }
      },
      controller.signal,
    );
    updateProgress('finalizing', recorded.videoSeconds * 1000);
    const blob = await (await fetch(recorded.blobUrl)).blob();
    await releaseRecording(client, recorded).catch(() => undefined);
    const finished = recorded;
    recorded = null;
    if (controller.signal.aborted) {
      showToast({ tone: 'neutral', title: t('state.canceled') });
      return;
    }
    useRecording.setState({ result: toVideoResult(blob, finished, screen, output) });
    showToast({
      tone: 'success',
      title: t('state.success.video'),
      actions: [{ label: t('state.success.download'), onPress: downloadVideo }],
    });
  } catch (cause) {
    if (controller.signal.aborted || isAbortCause(cause)) {
      showToast({ tone: 'neutral', title: t('state.canceled') });
    } else {
      announceFailure(cause);
    }
  } finally {
    if (recorded) {
      const { releaseRecording } = await import('@neruz/capture/video');
      await releaseRecording(client, recorded).catch(() => undefined);
    }
    document.title = originalTitle;
    await runRestores(restores);
    useRecording.setState({
      stage: 'idle',
      recordingController: null,
      recordingScreenId: null,
      isManuallyPaused: false,
      stageZoom: 1,
    });
  }
}

export function downloadVideo(): void {
  const { result } = useRecording.getState();
  if (result) downloadBlob(result.blob, result.filename);
}

export async function makeGif(): Promise<void> {
  const { result, isMakingGif } = useRecording.getState();
  if (!result || isMakingGif) return;
  const controller = new AbortController();
  useRecording.setState({ isMakingGif: true, gifRatio: 0, gifController: controller });
  try {
    const { encodeGifFromVideo } = await import('@neruz/capture/gif');
    const gif = await encodeGifFromVideo(
      result.blob,
      {},
      ({ encodedFrames, totalFrames }) =>
        useRecording.setState({ gifRatio: encodedFrames / Math.max(1, totalFrames) }),
      controller.signal,
    );
    downloadBlob(gif.blob, result.filename.replace(/\.[a-z0-9]+$/i, '.gif'));
    showToast({
      tone: 'success',
      title: t(gif.isTruncated ? 'studio.video.gif.trimmed' : 'state.success.gif'),
    });
  } catch (cause) {
    if (controller.signal.aborted || isAbortCause(cause)) {
      showToast({ tone: 'neutral', title: t('state.canceled') });
    } else {
      showToast({
        tone: 'error',
        title: t('state.error.generic.title'),
        body: t('state.error.export'),
        actions: [{ label: t('state.error.retry'), onPress: () => void makeGif() }],
      });
    }
  } finally {
    useRecording.setState({ isMakingGif: false, gifController: null });
  }
}
