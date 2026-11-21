import {
  type BatchConfig,
  type BatchPage,
  type BatchScreen,
  collectOriginPatterns,
  MAX_BATCH_CAPTURES,
  MAX_BATCH_ORIGINS,
  MAX_NAME_LENGTH,
  pageFolderName,
  type ScreenResult,
  screenFolderName,
} from '@neruz/core';
import { useCapture } from '../capture/captureStore';
import { useFramed } from '../capture/framedStore';
import { useLocale } from '../i18n';
import { isRecordingBusy, useRecording } from '../recording/recordingState';
import { type Screen, useStudio } from '../shell/studioStore';
import { type BatchMessage, selectSelectedUrls, useBatch } from './batchStore';

export type BatchPlan =
  | { ok: true; config: BatchConfig; pages: BatchPage[] }
  | { ok: false; message: BatchMessage };

const refuse = (key: BatchMessage['key'], params?: BatchMessage['params']): BatchPlan => ({
  ok: false,
  message: { key, params },
});

const toBatchScreen = (screen: Screen, position: number): BatchScreen => ({
  screenId: screen.id,
  presetId: screen.presetId,
  label: screen.name.slice(0, MAX_NAME_LENGTH),
  width: screen.width,
  height: screen.height,
  dpr: window.devicePixelRatio,
  orientation: screen.width > screen.height ? 'landscape' : 'portrait',
  folder: screenFolderName(position, screen.name),
});

const createScreenResult = (screen: BatchScreen): ScreenResult => ({
  screenId: screen.screenId,
  status: 'pending',
  issue: null,
  error: null,
  stableMs: null,
  stableTimedOut: false,
  scrollHeight: null,
  overflow: null,
  parts: 0,
  files: [],
  durationMs: null,
});

const createPage = (url: string, position: number, screens: BatchScreen[]): BatchPage => ({
  index: position,
  url,
  finalUrl: null,
  title: null,
  httpStatus: null,
  status: 'pending',
  issue: null,
  notes: [],
  folder: pageFolderName(position, url),
  startedAt: null,
  endedAt: null,
  screens: screens.map(createScreenResult),
});

function readFramedSnapshot(): BatchConfig['framed'] {
  const framed = useFramed.getState();
  if (!framed.isEnabled) return null;
  return {
    isEnabled: true,
    frameDeviceId: framed.frameDeviceId,
    background: framed.background,
    backgroundColor: framed.backgroundColor,
    scope: framed.scope,
  };
}

export function planBatch(): BatchPlan {
  if (isRecordingBusy(useRecording.getState().stage)) return refuse('batch.error.recording');
  const batch = useBatch.getState();
  const urls = selectSelectedUrls(batch);
  if (urls.length === 0) return refuse('batch.error.noPages');
  const studioScreens = useStudio.getState().screens.filter((screen) => !screen.isFrozen);
  if (studioScreens.length === 0) return refuse('batch.error.noScreens');
  if (urls.length * studioScreens.length > MAX_BATCH_CAPTURES)
    return refuse('batch.error.captures', { max: MAX_BATCH_CAPTURES });
  if (collectOriginPatterns(urls).length > MAX_BATCH_ORIGINS)
    return refuse('batch.error.origins', { max: MAX_BATCH_ORIGINS });

  const capture = useCapture.getState();
  const screens = studioScreens.map((screen, position) => toBatchScreen(screen, position + 1));
  const config: BatchConfig = {
    id: crypto.randomUUID(),
    source: batch.source,
    urls,
    screens,
    printMode: capture.mode,
    imageFormat: capture.format,
    imageQuality: capture.quality,
    framed: readFramedSnapshot(),
    locale: useLocale.getState().locale,
    createdAt: Date.now(),
  };
  return {
    ok: true,
    config,
    pages: urls.map((url, position) => createPage(url, position + 1, screens)),
  };
}
