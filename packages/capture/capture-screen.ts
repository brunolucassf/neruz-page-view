import {
  getStudioClient,
  NpvException,
  type ScreenId,
  type StudioClient,
  sleep,
  studioHideFixed,
  studioHideScrollbar,
  studioMetrics,
  studioRestoreFixed,
  studioScrollTo,
  studioWaitStable,
  studioWarmup,
} from '@neruz/core';
import { type CaptureQueue, createCaptureQueue } from './capture-queue';
import { createCleanupStack } from './cleanup-stack';
import { assertCanvasBudget, computeSlice, planScrollTops } from './stitch';
import { createStripedCanvas } from './striped-canvas';

export type CaptureMode = 'fast' | 'experience';

export type CaptureProgress = {
  phase: 'preparing' | 'capturing' | 'encoding';
  ratio: number;
};

export type CaptureHooks = {
  enterCaptureLayout?: () => void | Promise<void>;
  leaveCaptureLayout?: () => void | Promise<void>;
};

export type CaptureOptions = {
  client?: StudioClient;
  hooks?: CaptureHooks;
  queue?: CaptureQueue;
  imageType?: 'image/png' | 'image/jpeg' | 'image/webp';
  imageQuality?: number;
};

export type CaptureResult = {
  mode: CaptureMode;
  width: number;
  height: number;
  parts: Blob[];
  captureCount: number;
  scale: number;
  durationMs: number;
};

const EXPERIENCE_TAB_ZOOM = 3;
const ZOOM_SETTLE_MS = 700;
const FAST_SETTLE_MS = 150;
const SLICE_SETTLE_MS = 120;
const SCROLL_SETTLE_MS = 80;
const BROWSER_CAPTURE_RATE_MARKER = 'MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND';

const sharedQueue = createCaptureQueue();

const abortError = () => new NpvException('NPV-ABORTED', 'capture aborted');

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const findScreenIframe = (screenId: ScreenId): HTMLIFrameElement => {
  const frame = document.querySelector<HTMLIFrameElement>(`iframe[name^="npv:${screenId}."]`);
  if (!frame)
    throw new NpvException('NPV-FRAME-NOT-FOUND', `no iframe for ${screenId}`, { screenId });
  return frame;
};

const captureVisibleBitmap = async (windowId: number): Promise<ImageBitmap> => {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    const blob = await (await fetch(dataUrl)).blob();
    return await createImageBitmap(blob);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes(BROWSER_CAPTURE_RATE_MARKER)) {
      throw new NpvException('NPV-CAPTURE-RATE', 'browser capture quota exceeded');
    }
    throw new NpvException('NPV-CAPTURE-FAILED', message.slice(0, 300));
  }
};

const applyTabZoom = async (tabId: number, zoom: number): Promise<() => Promise<void>> => {
  const [previousZoom, previousSettings] = await Promise.all([
    chrome.tabs.getZoom(tabId),
    chrome.tabs.getZoomSettings(tabId),
  ]);
  await chrome.tabs.setZoomSettings(tabId, { mode: 'automatic', scope: 'per-tab' });
  await chrome.tabs.setZoom(tabId, zoom);
  await sleep(ZOOM_SETTLE_MS);
  return async () => {
    await chrome.tabs.setZoomSettings(tabId, {
      mode: previousSettings.mode,
      scope: previousSettings.scope,
    });
    await chrome.tabs.setZoom(tabId, previousZoom);
  };
};

export const captureScreen = async (
  screenId: ScreenId,
  mode: CaptureMode,
  onProgress: (progress: CaptureProgress) => void,
  signal: AbortSignal,
  options: CaptureOptions = {},
): Promise<CaptureResult> => {
  const client = options.client ?? getStudioClient();
  const queue = options.queue ?? sharedQueue;
  const hooks = options.hooks ?? {};
  const imageType = options.imageType ?? 'image/png';
  const startedAt = performance.now();
  const cleanup = createCleanupStack();
  const ensureActive = () => {
    if (signal.aborted) throw abortError();
  };

  try {
    onProgress({ phase: 'preparing', ratio: 0 });
    const iframe = findScreenIframe(screenId);
    const currentTab = await chrome.tabs.getCurrent();
    if (currentTab?.id === undefined) {
      throw new NpvException('NPV-NOT-STUDIO-TAB', 'capture must run inside the Studio tab');
    }
    const { id: tabId, windowId } = currentTab;

    if (mode === 'experience') await client.command(studioWarmup, screenId, {});
    ensureActive();
    const metrics = await client.command(studioMetrics, screenId, {});

    await client.command(studioHideScrollbar, screenId, { hidden: true });
    cleanup.push(() =>
      client.command(studioHideScrollbar, screenId, { hidden: false }).then(() => {}),
    );
    if (hooks.enterCaptureLayout) {
      await hooks.enterCaptureLayout();
      const leave = hooks.leaveCaptureLayout;
      if (leave) cleanup.push(leave);
    }
    if (mode === 'experience') cleanup.push(await applyTabZoom(tabId, EXPERIENCE_TAB_ZOOM));
    const initialScrollX = window.scrollX;
    const initialScrollY = window.scrollY;
    cleanup.push(() => window.scrollTo(initialScrollX, initialScrollY));
    cleanup.push(() => client.command(studioRestoreFixed, screenId, {}).then(() => {}));
    await nextFrame();

    const estimatedScale = window.devicePixelRatio;
    assertCanvasBudget(
      Math.round(metrics.innerWidth * estimatedScale),
      Math.round(metrics.scrollHeight * estimatedScale),
    );

    const scrollTops = planScrollTops(metrics.scrollHeight, metrics.innerHeight);
    let canvas: ReturnType<typeof createStripedCanvas> | null = null;
    let scale = 1;
    let captureCount = 0;

    for (const [stepIndex, top] of scrollTops.entries()) {
      ensureActive();
      const { scrollY: frameScrollY } = await client.command(studioScrollTo, screenId, { top });
      if (mode === 'experience') await client.command(studioWaitStable, screenId, {});
      else await sleep(FAST_SETTLE_MS);
      if (frameScrollY > 0) await client.command(studioHideFixed, screenId, {});
      await sleep(SLICE_SETTLE_MS);

      const cssScale = iframe.getBoundingClientRect().height / metrics.innerHeight;
      const frameDocumentTop = iframe.getBoundingClientRect().top + window.scrollY;
      let rowStart = 0;
      while (rowStart < iframe.getBoundingClientRect().height) {
        ensureActive();
        window.scrollTo(window.scrollX, frameDocumentTop + rowStart);
        await nextFrame();
        await sleep(SCROLL_SETTLE_MS);
        const bitmap = await queue.schedule(() => captureVisibleBitmap(windowId));
        captureCount += 1;
        scale = bitmap.width / window.innerWidth;
        const rect = iframe.getBoundingClientRect();
        const slice = computeSlice({
          frameRect: rect,
          viewportHeight: window.innerHeight,
          rowStart,
          frameScrollY,
          captureScale: scale,
          cssScale: rect.height / metrics.innerHeight,
        });
        if (!slice) {
          bitmap.close();
          throw new NpvException(
            'NPV-CAPTURE-FAILED',
            'screen iframe is not visible in the Studio viewport',
          );
        }
        if (!canvas) {
          const canvasHeight = Math.round(metrics.scrollHeight * cssScale * scale);
          assertCanvasBudget(slice.width, canvasHeight);
          canvas = createStripedCanvas(slice.width, canvasHeight);
        }
        canvas.drawSlice(
          bitmap,
          { x: slice.sourceX, y: slice.sourceY, width: slice.width, height: slice.height },
          slice.destY,
        );
        bitmap.close();
        rowStart = slice.nextRowStart;
      }
      await client.command(studioRestoreFixed, screenId, {});
      onProgress({ phase: 'capturing', ratio: (stepIndex + 1) / scrollTops.length });
    }

    if (!canvas) throw new NpvException('NPV-CAPTURE-FAILED', 'nothing was captured');
    onProgress({ phase: 'encoding', ratio: 0 });
    const parts = await canvas.exportParts(imageType, options.imageQuality);
    onProgress({ phase: 'encoding', ratio: 1 });
    return {
      mode,
      width: canvas.width,
      height: canvas.height,
      parts,
      captureCount,
      scale,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    await cleanup.runAll();
  }
};
