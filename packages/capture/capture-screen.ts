import {
  getStudioClient,
  NpvException,
  type ScreenId,
  type StudioClient,
  sleep,
  studioHideFixed,
  studioHideScrollbar,
  studioMeasure,
  studioMetrics,
  studioRestoreFixed,
  studioScrollTo,
  studioWaitStable,
  studioWarmup,
} from '@neruz/core';
import { type CaptureQueue, createCaptureQueue } from './capture-queue';
import { createCleanupStack } from './cleanup-stack';
import { planMoments } from './moments';
import { assertCanvasBudget, computeSlice, planScrollTops } from './stitch';
import { createStripedCanvas, type StripedCanvas } from './striped-canvas';

export type CaptureMode = 'fast' | 'experience' | 'moments';

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
  partNames: string[];
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

type FrameMetrics = { innerHeight: number };

type RowCaptureInput = {
  iframe: HTMLIFrameElement;
  windowId: number;
  queue: CaptureQueue;
  metrics: FrameMetrics;
  frameScrollY: number;
  getCanvas: (sliceWidth: number, scale: number, cssScale: number) => StripedCanvas;
  ensureActive: () => void;
};

const captureIframeRows = async ({
  iframe,
  windowId,
  queue,
  metrics,
  frameScrollY,
  getCanvas,
  ensureActive,
}: RowCaptureInput): Promise<{ scale: number; captureCount: number }> => {
  const cssScale = iframe.getBoundingClientRect().height / metrics.innerHeight;
  const frameDocumentTop = iframe.getBoundingClientRect().top + window.scrollY;
  let rowStart = 0;
  let scale = 1;
  let captureCount = 0;
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
    getCanvas(slice.width, scale, cssScale).drawSlice(
      bitmap,
      { x: slice.sourceX, y: slice.sourceY, width: slice.width, height: slice.height },
      slice.destY,
    );
    bitmap.close();
    rowStart = slice.nextRowStart;
  }
  return { scale, captureCount };
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
  const isExperienceLike = mode !== 'fast';
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

    if (isExperienceLike) await client.command(studioWarmup, screenId, {});
    ensureActive();
    const metrics = await client.command(studioMetrics, screenId, {});
    const moments =
      mode === 'moments'
        ? planMoments(
            (await client.command(studioMeasure, screenId, {})).sections,
            metrics.scrollHeight,
            metrics.innerHeight,
          )
        : null;

    await client.command(studioHideScrollbar, screenId, { hidden: true });
    cleanup.push(() =>
      client.command(studioHideScrollbar, screenId, { hidden: false }).then(() => {}),
    );
    if (hooks.enterCaptureLayout) {
      await hooks.enterCaptureLayout();
      const leave = hooks.leaveCaptureLayout;
      if (leave) cleanup.push(leave);
    }
    if (isExperienceLike) cleanup.push(await applyTabZoom(tabId, EXPERIENCE_TAB_ZOOM));
    const initialScrollX = window.scrollX;
    const initialScrollY = window.scrollY;
    cleanup.push(() => window.scrollTo(initialScrollX, initialScrollY));
    cleanup.push(() => client.command(studioRestoreFixed, screenId, {}).then(() => {}));
    await nextFrame();

    const estimatedScale = window.devicePixelRatio;
    const isPageCanvas = moments === null;
    assertCanvasBudget(
      Math.round(metrics.innerWidth * estimatedScale),
      Math.round((isPageCanvas ? metrics.scrollHeight : metrics.innerHeight) * estimatedScale),
    );

    const steps =
      moments ??
      planScrollTops(metrics.scrollHeight, metrics.innerHeight).map((scrollTop) => ({
        scrollTop,
        name: '',
      }));
    const pageCanvasRef: { current: StripedCanvas | null } = { current: null };
    const momentParts: Blob[] = [];
    let scale = 1;
    let captureCount = 0;

    for (const [stepIndex, step] of steps.entries()) {
      ensureActive();
      const { scrollY: frameScrollY } = await client.command(studioScrollTo, screenId, {
        top: step.scrollTop,
      });
      if (isExperienceLike) await client.command(studioWaitStable, screenId, {});
      else await sleep(FAST_SETTLE_MS);
      if (frameScrollY > 0) await client.command(studioHideFixed, screenId, {});
      await sleep(SLICE_SETTLE_MS);

      const momentCanvasRef: { current: StripedCanvas | null } = { current: null };
      const canvasRef = isPageCanvas ? pageCanvasRef : momentCanvasRef;
      const canvasRows = isPageCanvas ? metrics.scrollHeight : metrics.innerHeight;
      const captured = await captureIframeRows({
        iframe,
        windowId,
        queue,
        metrics,
        frameScrollY: isPageCanvas ? frameScrollY : 0,
        ensureActive,
        getCanvas: (sliceWidth, captureScale, cssScale) => {
          if (!canvasRef.current) {
            const canvasHeight = Math.round(canvasRows * cssScale * captureScale);
            assertCanvasBudget(sliceWidth, canvasHeight);
            canvasRef.current = createStripedCanvas(sliceWidth, canvasHeight);
          }
          return canvasRef.current;
        },
      });
      scale = captured.scale;
      captureCount += captured.captureCount;
      if (momentCanvasRef.current) {
        momentParts.push(
          ...(await momentCanvasRef.current.exportParts(imageType, options.imageQuality)),
        );
      }
      await client.command(studioRestoreFixed, screenId, {});
      onProgress({ phase: 'capturing', ratio: (stepIndex + 1) / steps.length });
    }

    onProgress({ phase: 'encoding', ratio: 0 });
    const durationMs = () => Math.round(performance.now() - startedAt);
    if (moments) {
      if (momentParts.length === 0)
        throw new NpvException('NPV-CAPTURE-FAILED', 'nothing was captured');
      onProgress({ phase: 'encoding', ratio: 1 });
      return {
        mode,
        width: Math.round(metrics.innerWidth * scale),
        height: Math.round(metrics.innerHeight * scale),
        parts: momentParts,
        partNames: moments.map((moment) => moment.name),
        captureCount,
        scale,
        durationMs: durationMs(),
      };
    }
    const canvas = pageCanvasRef.current;
    if (!canvas) throw new NpvException('NPV-CAPTURE-FAILED', 'nothing was captured');
    const parts = await canvas.exportParts(imageType, options.imageQuality);
    onProgress({ phase: 'encoding', ratio: 1 });
    return {
      mode,
      width: canvas.width,
      height: canvas.height,
      parts,
      partNames: [],
      captureCount,
      scale,
      durationMs: durationMs(),
    };
  } finally {
    await cleanup.runAll();
  }
};
