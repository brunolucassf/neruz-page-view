import type { ScreenId } from '@neruz/core';
import { create } from 'zustand';
import { t } from '../i18n';
import type { Screen } from '../shell/studioStore';
import { formatClock, type ScrollSpeed, type VideoPreset } from './recordingPlan';

export type PanelTab = 'image' | 'video';
export type RecordingStage =
  | 'idle'
  | 'preparing'
  | 'awaiting-gesture'
  | 'starting'
  | 'recording'
  | 'finalizing';

export type VideoResult = {
  blob: Blob;
  filename: string;
  format: 'MP4' | 'WebM';
  width: number;
  height: number;
  seconds: number;
  megabytes: string;
};

type RecordingState = {
  tab: PanelTab;
  preset: VideoPreset;
  speed: ScrollSpeed;
  hasPauses: boolean;
  chosenScreenId: ScreenId | null;
  stage: RecordingStage;
  elapsedMs: number;
  expectedMs: number;
  gestureShortcut: string;
  result: VideoResult | null;
  isMakingGif: boolean;
  gifRatio: number;
  recordingController: AbortController | null;
  gifController: AbortController | null;
};

export const useRecording = create<RecordingState>()(() => ({
  tab: 'image',
  preset: 'vertical',
  speed: 'normal',
  hasPauses: true,
  chosenScreenId: null,
  stage: 'idle',
  elapsedMs: 0,
  expectedMs: 1,
  gestureShortcut: '',
  result: null,
  isMakingGif: false,
  gifRatio: 0,
  recordingController: null,
  gifController: null,
}));

const MAX_PROGRESS_RATIO = 0.97;

export const isRecordingBusy = (stage: RecordingStage) => stage !== 'idle';

export const selectRecordScreen = (state: {
  screens: Screen[];
  activeScreenId: ScreenId;
  chosenScreenId: ScreenId | null;
}): Screen | undefined => {
  const ready = state.screens.filter((screen) => screen.status === 'ready');
  return (
    ready.find((screen) => screen.id === state.chosenScreenId) ??
    ready.find((screen) => screen.id === state.activeScreenId) ??
    ready[0]
  );
};

export const cancelRecording = () => useRecording.getState().recordingController?.abort();

export const cancelGif = () => useRecording.getState().gifController?.abort();

export const describeRecordingStage = (
  stage: RecordingStage,
  elapsedMs: number,
  gestureShortcut: string,
): string => {
  if (stage === 'awaiting-gesture') {
    return gestureShortcut
      ? t('studio.video.gesture', { shortcut: gestureShortcut })
      : t('studio.video.gesture.noShortcut');
  }
  if (stage === 'recording') {
    return t('studio.video.step.recording', { time: formatClock(elapsedMs) });
  }
  if (stage === 'finalizing') return t('queue.step.encoding');
  return t('studio.video.step.preparing');
};

export const computeRecordingRatio = (
  stage: RecordingStage,
  elapsedMs: number,
  expectedMs: number,
) => (stage === 'finalizing' ? MAX_PROGRESS_RATIO : Math.min(0.95, elapsedMs / expectedMs));
