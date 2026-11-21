import {
  type bgRecArm,
  createEnvelope,
  createSeqCounter,
  createSerialQueue,
  type Envelope,
  type ExtensionIdentity,
  NpvException,
  type PayloadOf,
  parseEnvelope,
  type RecConfig,
  type RecResult,
  recDone,
  recFailed,
  recProgress,
  recStart,
  recStarted,
  recStop,
  type SenderLike,
  toNpvError,
  unwrapReply,
  withTimeout,
} from '@neruz/core';
import {
  IDLE_RECORDING_STATE,
  type RecordingState,
  readRecordingBlobUrls,
  readRecordingState,
  writeRecordingBlobUrls,
  writeRecordingState,
} from './session-state';
import { forwardToStudio } from './studio-ports';

const ARM_WINDOW_MS = 60_000;
const START_EXTRA_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 10_000;
const OFFSCREEN_PAGE = 'offscreen.html';

const recordingQueue = createSerialQueue();
const nextEventSeq = createSeqCounter();

export type RecordingClickOutcome = { isConsumed: boolean; recording: 'idle' | 'finalizing' };

const emitToStudio = <TDefinition extends typeof recStarted | typeof recDone | typeof recFailed>(
  tabId: number,
  definition: TDefinition,
  payload: PayloadOf<TDefinition>,
) => forwardToStudio(tabId, createEnvelope(definition, payload, nextEventSeq()));

const toRecordingFailure = (cause: unknown) =>
  cause instanceof NpvException
    ? cause
    : new NpvException('NPV-REC-FAILED', toNpvError(cause).message);

const emitFailure = (tabId: number, cause: unknown) =>
  emitToStudio(tabId, recFailed, { error: toRecordingFailure(cause).error });

const assertRecordingSupported = () => {
  if (typeof chrome.offscreen === 'undefined') {
    throw new NpvException('NPV-REC-UNSUPPORTED', 'offscreen documents are not available', {
      reason: 'no-offscreen',
    });
  }
  if (typeof chrome.tabCapture === 'undefined') {
    throw new NpvException('NPV-PERMISSION-MISSING', 'tabCapture permission not granted', {
      permission: 'tabCapture',
    });
  }
};

const hasOffscreenDocument = async () =>
  (await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })).length > 0;

const ensureOffscreenDocument = async () => {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PAGE,
    reasons: ['USER_MEDIA'],
    justification: 'Record the Studio tab as a video',
  });
};

const sendToOffscreen = async <TDefinition extends typeof recStart | typeof recStop>(
  definition: TDefinition,
  payload: PayloadOf<TDefinition>,
  timeoutMs: number,
) => {
  const seq = nextEventSeq();
  const message: Envelope<TDefinition['type'], PayloadOf<TDefinition>> & { target: 'offscreen' } = {
    ...createEnvelope(definition, payload, seq),
    target: 'offscreen',
  };
  const raw = await withTimeout(chrome.runtime.sendMessage(message), timeoutMs, definition.type);
  return unwrapReply(definition, raw, seq);
};

const setIdle = () => recordingQueue.run(() => writeRecordingState(IDLE_RECORDING_STATE));

const finishRecording = async (tabId: number, outcome: RecResult | NpvException) => {
  await setIdle();
  if (outcome instanceof NpvException) {
    emitFailure(tabId, outcome);
    return;
  }
  await writeRecordingBlobUrls([...(await readRecordingBlobUrls()), outcome.blobUrl]);
  emitToStudio(tabId, recDone, outcome);
};

const runOffscreenRecording = async (tabId: number, payload: PayloadOf<typeof recStart>) => {
  try {
    const result = await sendToOffscreen(
      recStart,
      payload,
      payload.durationMs + START_EXTRA_TIMEOUT_MS,
    );
    await finishRecording(tabId, result);
  } catch (cause) {
    await finishRecording(tabId, toRecordingFailure(cause));
  }
};

const requestStreamId = (tabId: number) =>
  chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });

const startCapture = async (tabId: number, config: RecConfig, streamId: string) => {
  try {
    await ensureOffscreenDocument();
  } catch (cause) {
    await writeRecordingState(IDLE_RECORDING_STATE);
    throw toRecordingFailure(cause);
  }
  await writeRecordingState({ phase: 'recording', tabId, armedUntil: 0, config });
  emitToStudio(tabId, recStarted, { startedAt: Date.now() });
  void runOffscreenRecording(tabId, { ...config, streamId });
};

const requestStop = async (state: RecordingState) => {
  await writeRecordingState({ ...state, phase: 'finalizing' });
  await sendToOffscreen(recStop, {}, STOP_TIMEOUT_MS).catch(() => undefined);
};

const isArmActive = (state: RecordingState) =>
  state.phase === 'armed' && state.armedUntil > Date.now();

export const armRecording = (tabId: number, payload: PayloadOf<typeof bgRecArm>) =>
  recordingQueue.run(async () => {
    assertRecordingSupported();
    const state = await readRecordingState();
    if (state.phase === 'recording' || state.phase === 'finalizing' || isArmActive(state)) {
      throw new NpvException('NPV-REC-BUSY', 'a recording is already armed or running');
    }
    const { tryStartNow, ...config } = payload;
    const armedUntil = Date.now() + ARM_WINDOW_MS;
    await writeRecordingState({ phase: 'armed', tabId, armedUntil, config });
    if (!tryStartNow) return { armedUntil, started: false };
    const streamId = await requestStreamId(tabId).catch(() => null);
    if (!streamId) return { armedUntil, started: false };
    await startCapture(tabId, config, streamId);
    return { armedUntil, started: true };
  });

export const cancelRecording = (tabId: number) =>
  recordingQueue.run(async () => {
    const state = await readRecordingState();
    if (state.tabId !== tabId) return;
    if (state.phase === 'armed') await writeRecordingState(IDLE_RECORDING_STATE);
    else if (state.phase === 'recording') await requestStop(state);
  });

const startFromGesture = async (tabId: number, config: RecConfig) => {
  try {
    assertRecordingSupported();
    await startCapture(tabId, config, await requestStreamId(tabId));
  } catch (cause) {
    await writeRecordingState(IDLE_RECORDING_STATE);
    emitFailure(tabId, cause);
  }
};

export const handleRecordingClick = (tabId: number): Promise<RecordingClickOutcome> =>
  recordingQueue.run(async () => {
    const state = await readRecordingState();
    const passThrough = (recording: 'idle' | 'finalizing') => ({ isConsumed: false, recording });
    const consumed = (recording: 'idle' | 'finalizing') => ({ isConsumed: true, recording });
    if (state.tabId !== tabId) return passThrough('idle');
    if (state.phase === 'finalizing') return passThrough('finalizing');
    if (state.phase === 'recording') {
      await requestStop(state);
      return consumed('finalizing');
    }
    if (state.phase !== 'armed' || !state.config) return passThrough('idle');
    if (!isArmActive(state)) {
      await writeRecordingState(IDLE_RECORDING_STATE);
      emitFailure(tabId, new NpvException('NPV-REC-GESTURE-REQUIRED', 'armed recording expired'));
      return consumed('idle');
    }
    await startFromGesture(tabId, state.config);
    return consumed('idle');
  });

export const releaseRecordingBlob = (blobUrl: string) =>
  recordingQueue.run(async () => {
    const known = await readRecordingBlobUrls();
    if (!known.includes(blobUrl)) {
      throw new NpvException('NPV-BAD-REQUEST', 'blobUrl was not issued for a recording');
    }
    const remaining = known.filter((item) => item !== blobUrl);
    await writeRecordingBlobUrls(remaining);
    const { phase } = await readRecordingState();
    const isCapturing = phase === 'recording' || phase === 'finalizing';
    if (remaining.length === 0 && !isCapturing) {
      await chrome.offscreen.closeDocument().catch(() => undefined);
    }
  });

export const handleRecordingTabClosed = (tabId: number) =>
  recordingQueue.run(async () => {
    const state = await readRecordingState();
    if (state.tabId !== tabId) return;
    if (state.phase === 'recording') await requestStop(state);
    else await writeRecordingState(IDLE_RECORDING_STATE);
  });

export const reconcileRecording = () =>
  recordingQueue.run(async () => {
    const { phase } = await readRecordingState();
    const isInFlight = phase === 'recording' || phase === 'finalizing';
    if (isInFlight && !(await hasOffscreenDocument())) {
      await writeRecordingState(IDLE_RECORDING_STATE);
    }
  });

export const forwardRecordingProgress = async (
  raw: unknown,
  sender: SenderLike,
  identity: ExtensionIdentity,
) => {
  const isOffscreenSender =
    sender.id === identity.runtimeId &&
    sender.tab === undefined &&
    sender.url === `${identity.baseUrl}${OFFSCREEN_PAGE}`;
  if (!isOffscreenSender) return;
  const parsed = parseEnvelope(recProgress, raw);
  if (!parsed.ok) return;
  const { tabId } = await readRecordingState();
  if (tabId === null) return;
  forwardToStudio(tabId, createEnvelope(recProgress, parsed.envelope.payload, nextEventSeq()));
};
