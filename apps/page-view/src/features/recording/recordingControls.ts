import {
  getStudioClient,
  studioAutoscrollPause,
  studioAutoscrollResume,
  studioAutoscrollStop,
} from '@neruz/core';
import { MARKED_PAUSE_MS } from './recordingPlan';
import { useRecording } from './recordingState';

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
