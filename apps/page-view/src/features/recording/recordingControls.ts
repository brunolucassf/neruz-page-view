import {
  getStudioClient,
  NpvException,
  studioAutoscrollPause,
  studioAutoscrollResume,
  studioAutoscrollSpeed,
  studioAutoscrollStop,
} from '@neruz/core';
import { MARKED_PAUSE_MS, SPEED_FACTORS } from './recordingPlan';
import { useRecording } from './recordingState';

const EXPECTED_END_TAIL_MS = 400;
const SPEED_SAFETY_MS = 2000;
const CLAMP_NOTICE_MS = 4000;

let isSpeedRequestInFlight = false;
let queuedFactor: number | null = null;
let clampNoticeTimer: ReturnType<typeof setTimeout> | undefined;
let markedPauseTimer: ReturnType<typeof setTimeout> | undefined;

const clearMarkedPause = () => {
  clearTimeout(markedPauseTimer);
  markedPauseTimer = undefined;
};

const isLiveRecording = () => useRecording.getState().stage === 'recording';

const sendAutoscrollCommand = async (
  command:
    | typeof studioAutoscrollPause
    | typeof studioAutoscrollResume
    | typeof studioAutoscrollStop,
) => {
  const screenId = useRecording.getState().recordingScreenId;
  if (screenId)
    await getStudioClient()
      .command(command, screenId, {})
      .catch(() => undefined);
};

export const pauseScroll = async () => {
  if (!isLiveRecording()) return;
  useRecording.setState({ isManuallyPaused: true });
  await sendAutoscrollCommand(studioAutoscrollPause);
};

export const resumeScroll = async () => {
  clearMarkedPause();
  if (!useRecording.getState().isManuallyPaused) return;
  useRecording.setState({ isManuallyPaused: false });
  await sendAutoscrollCommand(studioAutoscrollResume);
};

export const toggleScrollPause = () =>
  useRecording.getState().isManuallyPaused ? resumeScroll() : pauseScroll();

export const markPauseHere = async () => {
  if (!isLiveRecording() || useRecording.getState().isManuallyPaused) return;
  await pauseScroll();
  markedPauseTimer = setTimeout(() => void resumeScroll(), MARKED_PAUSE_MS);
};

export const stopRecordingNow = async () => {
  if (!isLiveRecording()) return;
  clearMarkedPause();
  await sendAutoscrollCommand(studioAutoscrollStop);
  await getStudioClient()
    .cancelRecording()
    .catch(() => undefined);
};

const showClampNotice = (isClamped: boolean) => {
  clearTimeout(clampNoticeTimer);
  useRecording.setState({ isSpeedClamped: isClamped });
  if (isClamped) {
    clampNoticeTimer = setTimeout(
      () => useRecording.setState({ isSpeedClamped: false }),
      CLAMP_NOTICE_MS,
    );
  }
};

const readMaxRemainingMs = () => {
  const { recordingStartedAt, recordingDurationMs } = useRecording.getState();
  const spentMs = recordingStartedAt ? Date.now() - recordingStartedAt : 0;
  const leftMs = recordingDurationMs - spentMs - EXPECTED_END_TAIL_MS - SPEED_SAFETY_MS;
  return Math.max(0, Math.min(600_000, Math.floor(leftMs)));
};

const isNotRunning = (cause: unknown) =>
  cause instanceof NpvException && cause.error.details?.reason === 'not-running';

const sendScrollSpeed = async (requested: number) => {
  const screenId = useRecording.getState().recordingScreenId;
  if (!screenId) return;
  try {
    const applied = await getStudioClient().command(studioAutoscrollSpeed, screenId, {
      factor: requested,
      maxRemainingMs: readMaxRemainingMs(),
    });
    if (!isLiveRecording()) return;
    const { elapsedMs } = useRecording.getState();
    useRecording.setState({
      scrollFactor: applied.factor,
      expectedMs: elapsedMs + applied.remainingMs + EXPECTED_END_TAIL_MS,
    });
    showClampNotice(applied.isClamped);
  } catch (cause) {
    if (!isNotRunning(cause)) useRecording.setState({ scrollFactor: 1 });
  }
};

export const setScrollSpeed = async (requested: number) => {
  if (!isLiveRecording() || !SPEED_FACTORS.some((factor) => factor === requested)) return;
  useRecording.setState({ scrollFactor: requested });
  if (isSpeedRequestInFlight) {
    queuedFactor = requested;
    return;
  }
  isSpeedRequestInFlight = true;
  try {
    let next: number | null = requested;
    while (next !== null) {
      queuedFactor = null;
      await sendScrollSpeed(next);
      next = queuedFactor;
    }
  } finally {
    isSpeedRequestInFlight = false;
  }
};
