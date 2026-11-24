import { type CaptureResult, captureScreen } from '@neruz/capture';
import {
  type BatchConfig,
  type BatchPage,
  type BatchScreen,
  collectOriginPatterns,
  estimateRemainingMs,
  fileName,
  getStudioClient,
  isSamePage,
  MAX_SCREEN_FILES,
  NpvException,
  PAGE_LOAD_TIMEOUT_MS,
  type PageIssue,
  type PageNote,
  SCREEN_CAPTURE_TIMEOUT_MS,
  type ScreenId,
  type ScreenResult,
  screenFilePath,
  sleep,
  studioMeasure,
  studioMetrics,
  studioPageFacts,
  studioWaitStable,
  thumbnailKey,
  toNpvError,
} from '@neruz/core';
import { track } from '../analytics/analytics';
import { captureHooks, useCapture } from '../capture/captureStore';
import { applyFrame } from '../capture/framing/framedOutput';
import { convertImage } from '../export/encodeClient';
import type { CapturedShot } from '../export/exportService';
import { t } from '../i18n';
import { useStudio } from '../shell/studioStore';
import { showToast } from '../toasts/toastStore';
import { addArtifactFile, addThumbnail, markRunCancelled, resetArtifacts } from './batchArtifacts';
import { exportBatch } from './batchExport';
import { planBatch } from './batchPlan';
import { hasEnoughSpace, writeBatchFile } from './batchStorage';
import { countPagesByStatus, patchPage, patchScreenResult, useBatch } from './batchStore';
import { createFoldThumbnail } from './batchThumbnail';

const FRAME_HELLO_TIMEOUT_MS = 8000;
const CAPTURE_RETRY_DELAY_MS = 1000;
const ESTIMATED_BYTES_PER_CAPTURE = 8 * 1024 * 1024;
const HTTP_ERROR_STATUS = 400;
const MIME_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const;

type RunContext = {
  config: BatchConfig;
  controller: AbortController;
  pageController: AbortController | null;
  isPaused: boolean;
  pauseWaiters: (() => void)[];
  previousMirror: boolean;
  grantedOrigins: Set<string>;
  totalCaptures: number;
  finishedCaptures: number;
};

type LoadOutcome = { ok: true } | { ok: false; issue: PageIssue | null };

type ScreenOutcome = { patch: Partial<ScreenResult>; notes: PageNote[] };

let run: RunContext | null = null;

const originOf = (url: string) => `${new URL(url).origin}/*`;

function updateProgress(): void {
  if (!run) return;
  useCapture.setState({ ratio: Math.min(1, run.finishedCaptures / run.totalCaptures) });
}

function releasePauseWaiters(): void {
  const waiters = run?.pauseWaiters.splice(0) ?? [];
  for (const release of waiters) release();
}

async function waitIfPaused(): Promise<void> {
  while (run?.isPaused && !run.controller.signal.aborted) {
    await new Promise<void>((resolve) => run?.pauseWaiters.push(resolve));
  }
}

export function pauseBatch(reason: 'user' | 'hidden' | 'storage-full'): void {
  if (!run || run.isPaused) return;
  run.isPaused = true;
  useBatch.setState({ phase: 'paused', pauseReason: reason });
}

export function resumeBatch(): void {
  if (!run?.isPaused) return;
  run.isPaused = false;
  useBatch.setState({ phase: 'running', pauseReason: null });
  releasePauseWaiters();
}

export function skipCurrentPage(): void {
  run?.pageController?.abort();
  if (run?.isPaused) resumeBatch();
}

export function cancelBatch(): void {
  if (!run) return;
  markRunCancelled();
  run.controller.abort();
  run.pageController?.abort();
  releasePauseWaiters();
}

function handleVisibilityChange(): void {
  if (!run) return;
  const { phase, pauseReason } = useBatch.getState();
  if (document.hidden && phase === 'running') pauseBatch('hidden');
  else if (!document.hidden && pauseReason === 'hidden') resumeBatch();
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = '';
}

const findIframe = (screenId: ScreenId) =>
  document.querySelector<HTMLIFrameElement>(`iframe[name^="npv:${screenId}."]`);

async function loadPageInScreen(
  screenId: ScreenId,
  url: string,
  signal: AbortSignal,
): Promise<LoadOutcome> {
  const iframe = findIframe(screenId);
  if (!iframe) return { ok: false, issue: 'agent-missing' };
  const timers: ReturnType<typeof setTimeout>[] = [];
  const after = <TValue>(ms: number, value: TValue) =>
    new Promise<TValue>((resolve) => timers.push(setTimeout(() => resolve(value), ms)));
  const since = Date.now();
  const loadEvent = new Promise<'load'>((resolve) =>
    iframe.addEventListener('load', () => resolve('load'), { once: true }),
  );
  const hello = getStudioClient()
    .waitForFrame(screenId, {
      since,
      timeoutMs: PAGE_LOAD_TIMEOUT_MS + FRAME_HELLO_TIMEOUT_MS,
      signal,
    })
    .then(
      () => 'hello' as const,
      () => 'no-hello' as const,
    );
  iframe.src = url;
  try {
    const first = await Promise.race([
      hello,
      loadEvent,
      after(PAGE_LOAD_TIMEOUT_MS, 'timeout' as const),
    ]);
    if (signal.aborted) return { ok: false, issue: null };
    if (first === 'hello') {
      const loaded = await Promise.race([
        loadEvent,
        after(PAGE_LOAD_TIMEOUT_MS, 'timeout' as const),
      ]);
      return loaded === 'load' ? { ok: true } : { ok: false, issue: 'load-timeout' };
    }
    if (first === 'load') {
      const answer = await Promise.race([
        hello,
        after(FRAME_HELLO_TIMEOUT_MS, 'no-hello' as const),
      ]);
      if (signal.aborted) return { ok: false, issue: null };
      return answer === 'hello' ? { ok: true } : { ok: false, issue: 'iframe-blocked' };
    }
    return { ok: false, issue: 'load-timeout' };
  } finally {
    for (const timer of timers) clearTimeout(timer);
  }
}

const isRetryableCapture = (cause: unknown) =>
  cause instanceof NpvException &&
  (cause.error.code === 'NPV-CAPTURE-RATE' || cause.error.code === 'NPV-CAPTURE-FAILED');

async function captureWithRetry(
  screen: BatchScreen,
  config: BatchConfig,
  signal: AbortSignal,
): Promise<CaptureResult> {
  const attempt = () =>
    captureScreen(screen.screenId, config.printMode, () => undefined, signal, {
      hooks: captureHooks(screen.screenId),
      imageType: MIME_BY_FORMAT[config.imageFormat],
      imageQuality: config.imageQuality,
    });
  try {
    return await attempt();
  } catch (cause) {
    if (!isRetryableCapture(cause) || signal.aborted) throw cause;
    await sleep(CAPTURE_RETRY_DELAY_MS);
    return attempt();
  }
}

async function storeFile(page: BatchPage, screen: BatchScreen, name: string, blob: Blob) {
  const path = screenFilePath(page.folder, screen.folder, name);
  const stored = await writeBatchFile(run?.config.id ?? '', path, blob);
  addArtifactFile({ path, pageIndex: page.index, bytes: stored.bytes });
  return path;
}

function toCapturedShot(screen: BatchScreen, result: CaptureResult): CapturedShot {
  const studioScreen = useStudio.getState().screens.find((item) => item.id === screen.screenId);
  return {
    screenName: screen.label,
    kind: studioScreen?.kind ?? 'phone',
    isLandscape: screen.orientation === 'landscape',
    width: screen.width,
    height: screen.height,
    isDark: studioScreen?.isDark ?? false,
    isFramed: false,
    hasAlpha: false,
    result,
  };
}

async function storeCapture(
  page: BatchPage,
  screen: BatchScreen,
  config: BatchConfig,
  result: CaptureResult,
): Promise<string[]> {
  const isMoments = result.mode === 'moments';
  const paths: string[] = [];
  for (const [index, blob] of result.parts.entries()) {
    const spec = isMoments
      ? ({ kind: 'moment', number: index + 1 } as const)
      : ({ kind: 'print', part: result.parts.length > 1 ? index + 1 : null } as const);
    paths.push(await storeFile(page, screen, fileName(spec, config.imageFormat), blob));
  }
  if (config.framed) {
    const framed = await applyFrame(toCapturedShot(screen, result));
    const first = framed.result.parts[0];
    if (first) {
      const converted = await convertImage(
        first,
        MIME_BY_FORMAT[config.imageFormat],
        config.imageQuality,
      );
      paths.push(
        await storeFile(page, screen, fileName({ kind: 'frame' }, config.imageFormat), converted),
      );
    }
  }
  return paths;
}

async function captureOneScreen(
  page: BatchPage,
  screen: BatchScreen,
  config: BatchConfig,
  signal: AbortSignal,
): Promise<ScreenOutcome> {
  const client = getStudioClient();
  const startedAt = performance.now();
  const stable = await client.command(studioWaitStable, screen.screenId, {});
  const metrics = await client.command(studioMetrics, screen.screenId, {});
  const measured = await client.command(studioMeasure, screen.screenId, {}).catch(() => null);
  const result = await captureWithRetry(screen, config, signal);
  const paths = await storeCapture(page, screen, config, result);
  const first = result.parts[0];
  if (first) {
    const thumbnail = await createFoldThumbnail(first, screen.height / screen.width);
    if (thumbnail) addThumbnail(thumbnailKey(page.index, screen.screenId), thumbnail);
  }
  const isSplit = result.mode !== 'moments' && result.parts.length > 1;
  return {
    patch: {
      status: 'done',
      stableMs: stable.waitedMs,
      stableTimedOut: stable.timedOut,
      scrollHeight: metrics.scrollHeight,
      overflow: measured?.overflow ?? null,
      parts: result.parts.length,
      files: paths.slice(0, MAX_SCREEN_FILES),
      durationMs: Math.round(performance.now() - startedAt),
    },
    notes: [
      ...(stable.timedOut ? (['stable-timeout'] as const) : []),
      ...(isSplit ? (['split-into-parts'] as const) : []),
    ],
  };
}

function toIssue(cause: unknown, isTimeout: boolean): PageIssue {
  if (isTimeout) return 'capture-timeout';
  const code = cause instanceof NpvException ? cause.error.code : null;
  if (code === 'NPV-STORAGE-FULL') return 'storage-full';
  if (code === 'NPV-FRAME-NOT-FOUND' || code === 'NPV-VERSION-MISMATCH') return 'agent-missing';
  if (code === 'NPV-PERMISSION-MISSING') return 'permission-missing';
  return 'capture-failed';
}

const addNotes = (pageIndex: number, notes: readonly PageNote[]) => {
  if (notes.length === 0) return;
  const page = useBatch.getState().pages.find((item) => item.index === pageIndex);
  if (!page) return;
  patchPage(pageIndex, { notes: [...new Set([...page.notes, ...notes])] });
};

function failScreens(pageIndex: number, screenIds: readonly ScreenId[], issue: PageIssue) {
  for (const screenId of screenIds) {
    patchScreenResult(pageIndex, screenId, { status: 'failed', issue });
  }
}

async function captureScreenSafely(
  page: BatchPage,
  screen: BatchScreen,
  config: BatchConfig,
  pageSignal: AbortSignal,
): Promise<void> {
  const timeout = AbortSignal.timeout(SCREEN_CAPTURE_TIMEOUT_MS);
  const signal = AbortSignal.any([pageSignal, timeout]);
  try {
    const outcome = await captureOneScreen(page, screen, config, signal);
    patchScreenResult(page.index, screen.screenId, outcome.patch);
    addNotes(page.index, outcome.notes);
  } catch (cause) {
    if (!timeout.aborted && pageSignal.aborted) return;
    const issue = toIssue(cause, timeout.aborted);
    patchScreenResult(page.index, screen.screenId, {
      status: 'failed',
      issue,
      error: toNpvError(cause),
    });
    if (issue === 'storage-full') pauseBatch('storage-full');
  } finally {
    if (run) run.finishedCaptures += 1;
    updateProgress();
  }
}

async function readPageFacts(page: BatchPage, firstScreenId: ScreenId, loaded: ScreenId[]) {
  try {
    return await getStudioClient().command(studioPageFacts, firstScreenId, {});
  } catch (cause) {
    const code = cause instanceof NpvException ? cause.error.code : null;
    if (code === 'NPV-FRAME-NOT-FOUND' || code === 'NPV-VERSION-MISMATCH')
      failScreens(page.index, loaded, 'agent-missing');
    return null;
  }
}

async function applyPageFacts(page: BatchPage, loaded: ScreenId[]): Promise<boolean> {
  const first = loaded[0];
  if (!first) return false;
  const facts = await readPageFacts(page, first, loaded);
  if (!facts) return false;
  const isSame = isSamePage(page.url, facts.url);
  if (!isSame && facts.hasPasswordField) {
    patchPage(page.index, { finalUrl: facts.url, title: facts.title, issue: 'login-redirect' });
    failScreens(page.index, loaded, 'login-redirect');
    return false;
  }
  const notes: PageNote[] = [];
  if (!isSame) notes.push('redirected');
  if (facts.httpStatus !== null && facts.httpStatus >= HTTP_ERROR_STATUS) notes.push('http-error');
  if (isSame && facts.hasPasswordField) notes.push('password-field');
  patchPage(page.index, {
    finalUrl: facts.url,
    title: facts.title || null,
    httpStatus: facts.httpStatus,
    status: 'capturing',
    notes,
  });
  return true;
}

function resolvePageStatus(
  page: BatchPage,
  aborted: 'skip' | 'cancel' | null,
): BatchPage['status'] {
  if (aborted === 'cancel') return 'cancelled';
  if (aborted === 'skip') return 'skipped';
  const done = page.screens.filter((screen) => screen.status === 'done').length;
  if (done === page.screens.length) return 'done';
  return done > 0 ? 'partial' : 'failed';
}

function resolveSharedIssue(page: BatchPage): PageIssue | null {
  if (page.issue) return page.issue;
  const issues = page.screens.map((screen) => screen.issue);
  const [first] = issues;
  return first && issues.every((issue) => issue === first) ? first : null;
}

function closePage(pageIndex: number, aborted: 'skip' | 'cancel' | null): void {
  const abortedStatus: ScreenResult['status'] = aborted === 'cancel' ? 'cancelled' : 'skipped';
  const state = useBatch.getState();
  const current = state.pages.find((page) => page.index === pageIndex);
  if (!current) return;
  const screens = current.screens.map((screen) =>
    screen.status === 'pending' && aborted ? { ...screen, status: abortedStatus } : screen,
  );
  const settled = { ...current, screens };
  patchPage(pageIndex, {
    screens,
    status: resolvePageStatus(settled, aborted),
    issue: aborted ? null : resolveSharedIssue(settled),
    endedAt: Date.now(),
  });
}

async function capturePageScreens(
  page: BatchPage,
  config: BatchConfig,
  signal: AbortSignal,
  loaded: ScreenId[],
) {
  for (const screen of config.screens) {
    if (!loaded.includes(screen.screenId)) continue;
    await waitIfPaused();
    if (signal.aborted) return;
    await captureScreenSafely(page, screen, config, signal);
    await waitIfPaused();
  }
}

async function processPage(
  pageIndex: number,
  config: BatchConfig,
): Promise<'skip' | 'cancel' | null> {
  const context = run;
  const page = useBatch.getState().pages.find((item) => item.index === pageIndex);
  if (!context || !page) return null;
  const pageController = new AbortController();
  context.pageController = pageController;
  const stopWithBatch = () => pageController.abort();
  context.controller.signal.addEventListener('abort', stopWithBatch, { once: true });
  patchPage(pageIndex, { status: 'loading', startedAt: Date.now() });
  useBatch.setState({ currentIndex: pageIndex });
  const screenIds = config.screens.map((screen) => screen.screenId);
  try {
    if (!context.grantedOrigins.has(originOf(page.url))) {
      failScreens(pageIndex, screenIds, 'permission-missing');
      return null;
    }
    const outcomes = await Promise.all(
      screenIds.map((screenId) => loadPageInScreen(screenId, page.url, pageController.signal)),
    );
    if (pageController.signal.aborted) return pickAbort(context, pageController);
    const loaded: ScreenId[] = [];
    for (const [position, outcome] of outcomes.entries()) {
      const screenId = screenIds[position];
      if (!screenId) continue;
      if (outcome.ok) loaded.push(screenId);
      else if (outcome.issue) failScreens(pageIndex, [screenId], outcome.issue);
    }
    if (loaded.length === 0) return null;
    if (!(await applyPageFacts(page, loaded))) return null;
    const current = useBatch.getState().pages.find((item) => item.index === pageIndex) ?? page;
    await capturePageScreens(current, config, pageController.signal, loaded);
    return pageController.signal.aborted ? pickAbort(context, pageController) : null;
  } finally {
    context.controller.signal.removeEventListener('abort', stopWithBatch);
    context.pageController = null;
  }
}

function pickAbort(context: RunContext, pageController: AbortController): 'skip' | 'cancel' | null {
  if (context.controller.signal.aborted) return 'cancel';
  return pageController.signal.aborted ? 'skip' : null;
}

function updateEta(config: BatchConfig): void {
  useBatch.setState((state) => ({
    etaMs: estimateRemainingMs({
      printMode: config.printMode,
      screenCount: config.screens.length,
      pages: state.pages,
    }),
  }));
}

function markRemainingCancelled(): void {
  useBatch.setState((state) => ({
    pages: state.pages.map((page) =>
      page.status === 'pending'
        ? {
            ...page,
            status: 'cancelled',
            screens: page.screens.map((screen) => ({ ...screen, status: 'cancelled' })),
          }
        : page,
    ),
  }));
}

async function readGrantedOrigins(urls: readonly string[]): Promise<Set<string>> {
  const granted = new Set<string>();
  for (const origin of collectOriginPatterns(urls)) {
    if (await chrome.permissions.contains({ origins: [origin] })) granted.add(origin);
  }
  return granted;
}

function restoreStudio(context: RunContext): void {
  const studio = useStudio.getState();
  studio.setCaptureStage(null);
  studio.setMirror(context.previousMirror);
  for (const screen of studio.screens) {
    if (!screen.isFrozen) studio.reloadScreen(screen.id);
  }
}

function detachListeners(): void {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('beforeunload', handleBeforeUnload);
}

function announceEnd(isCancelled: boolean): void {
  const counts = countPagesByStatus(useBatch.getState().pages);
  const total = useBatch.getState().pages.length;
  showToast({
    tone: isCancelled ? 'neutral' : 'success',
    title: t(isCancelled ? 'batch.result.cancelledTitle' : 'batch.result.doneTitle'),
    body: t('batch.result.summary', { ...counts, total }),
  });
}

async function runPages(context: RunContext, config: BatchConfig): Promise<void> {
  const pageIndexes = useBatch.getState().pages.map((page) => page.index);
  for (const pageIndex of pageIndexes) {
    await waitIfPaused();
    if (context.controller.signal.aborted) break;
    const aborted = await processPage(pageIndex, config);
    closePage(pageIndex, aborted);
    updateEta(config);
  }
  if (context.controller.signal.aborted) markRemainingCancelled();
}

async function executeBatch(
  config: BatchConfig,
  context: RunContext,
  permission: Promise<boolean>,
): Promise<void> {
  try {
    await permission.catch(() => false);
    context.grantedOrigins = await readGrantedOrigins(config.urls);
    if (context.grantedOrigins.size > 0)
      await getStudioClient()
        .syncScripts()
        .catch(() => undefined);
    await runPages(context, config);
  } finally {
    detachListeners();
    restoreStudio(context);
    const isCancelled = context.controller.signal.aborted;
    run = null;
    useBatch.setState((state) => ({
      endedAt: Date.now(),
      currentIndex: null,
      etaMs: 0,
      pauseReason: null,
      hasFiles: state.pages.some((page) => page.startedAt !== null),
    }));
    useCapture.setState({ isRunning: false, ratio: 0 });
    if (isCancelled) {
      useBatch.setState({ phase: 'cancelled' });
      announceEnd(true);
      void track('batch_end', { status: 'cancelled', source: context.config.source });
    } else {
      await exportBatch();
      announceEnd(false);
      void track('batch_end', { status: 'completed', source: context.config.source });
    }
  }
}

export async function warnIfLowSpace(config: BatchConfig): Promise<void> {
  const captures = config.urls.length * config.screens.length;
  if (await hasEnoughSpace(captures, ESTIMATED_BYTES_PER_CAPTURE)) return;
  showToast({ tone: 'neutral', title: t('batch.storage.low') });
}

export function startBatch(): void {
  const plan = planBatch();
  if (!plan.ok) {
    useBatch.setState({ message: plan.message });
    return;
  }
  const { config, pages } = plan;
  const permission = chrome.permissions.request({ origins: collectOriginPatterns(config.urls) });
  const studio = useStudio.getState();
  const context: RunContext = {
    config,
    controller: new AbortController(),
    pageController: null,
    isPaused: false,
    pauseWaiters: [],
    previousMirror: studio.isMirrorOn,
    grantedOrigins: new Set(),
    totalCaptures: pages.length * config.screens.length,
    finishedCaptures: 0,
  };
  resetArtifacts();
  run = context;
  studio.setMirror(false);
  useCapture.setState({
    isRunning: true,
    ratio: 0,
    stepKey: 'queue.step.capturing',
    controller: null,
  });
  useBatch.setState({
    phase: 'running',
    pauseReason: null,
    config,
    pages,
    currentIndex: 1,
    startedAt: Date.now(),
    endedAt: null,
    etaMs: null,
    exportParts: [],
    message: null,
  });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  void warnIfLowSpace(config);
  void track('batch_start', {
    source: config.source,
    is_framed: config.framed?.isEnabled ?? false,
  });
  void executeBatch(config, context, permission);
}
