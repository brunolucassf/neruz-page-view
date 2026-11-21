import {
  NpvException,
  type RecConfig,
  type RecResult,
  type StudioClient,
  type StudioEvent,
} from '@neruz/core';
import { type AutoscrollRequest, createAutoscrollDriver } from './autoscroll-driver';
import {
  isLocalBlobUrl,
  recordWithDisplayMedia,
  revokeLocalBlobUrl,
} from './display-media-recorder';
import type { RecordingProgress } from './record-pipeline';

export type StartRecordingOptions = {
  config: RecConfig;
  client: StudioClient;
  autoscroll?: AutoscrollRequest;
};

const TAB_CAPTURE_PERMISSION: chrome.permissions.Permissions = { permissions: ['tabCapture'] };

const isTabCaptureSupported = () => typeof chrome.offscreen !== 'undefined';

const ensureTabCapturePermission = async () => {
  if (await chrome.permissions.contains(TAB_CAPTURE_PERMISSION)) return;
  if (!(await chrome.permissions.request(TAB_CAPTURE_PERMISSION))) {
    throw new NpvException('NPV-PERMISSION-DENIED', 'tab capture permission refused');
  }
};

const recordWithTabCapture = async (
  { config, client, autoscroll }: StartRecordingOptions,
  onProgress: (progress: RecordingProgress) => void,
  signal: AbortSignal | undefined,
): Promise<RecResult> => {
  await ensureTabCapturePermission();
  return new Promise<RecResult>((resolve, reject) => {
    let isSettled = false;
    let hasStarted = false;
    const driver = createAutoscrollDriver(client, autoscroll, () => void requestStop());
    const requestStop = () => client.cancelRecording().catch(() => undefined);
    const finish = (outcome: () => void) => {
      if (isSettled) return;
      isSettled = true;
      stopListening();
      driver.dispose();
      signal?.removeEventListener('abort', handleAbort);
      outcome();
    };
    const fail = (cause: unknown) => finish(() => reject(cause));
    const handleAbort = () => {
      void requestStop();
      if (!hasStarted) fail(new NpvException('NPV-ABORTED', 'recording aborted'));
    };
    const handleEvent = (event: StudioEvent) => {
      driver.handleEvent(event);
      if (event.type === 'rec.progress') onProgress(event.payload);
      else if (event.type === 'rec.started') {
        hasStarted = true;
        driver.start().catch((cause) => {
          void requestStop();
          fail(cause);
        });
      } else if (event.type === 'rec.done') finish(() => resolve(event.payload));
      else if (event.type === 'rec.failed') {
        const { code, message, details } = event.payload.error;
        fail(new NpvException(code, message, details));
      }
    };
    const stopListening = client.onEvent(handleEvent);
    signal?.addEventListener('abort', handleAbort, { once: true });
    client
      .armRecording({ ...config, tryStartNow: true })
      .then(({ started }) => {
        if (!started && !isSettled) {
          onProgress({
            phase: 'awaiting-gesture',
            elapsedMs: 0,
            receivedFrames: 0,
            encodedFrames: 0,
          });
        }
      })
      .catch(fail);
  });
};

const recordWithDisplayCapture = async (
  { config, client, autoscroll }: StartRecordingOptions,
  onProgress: (progress: RecordingProgress) => void,
  signal: AbortSignal | undefined,
): Promise<RecResult> => {
  const stopController = new AbortController();
  const driver = createAutoscrollDriver(client, autoscroll, () => stopController.abort());
  const forwardAbort = () => stopController.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });
  const stopListening = client.onEvent((event) => driver.handleEvent(event));
  try {
    return await recordWithDisplayMedia({
      config,
      onProgress,
      stopSignal: stopController.signal,
      onStarted: () => {
        driver.start().catch(() => stopController.abort());
      },
    });
  } finally {
    stopListening();
    driver.dispose();
    signal?.removeEventListener('abort', forwardAbort);
  }
};

export const startRecording = (
  options: StartRecordingOptions,
  onProgress: (progress: RecordingProgress) => void,
  signal?: AbortSignal,
): Promise<RecResult> =>
  isTabCaptureSupported()
    ? recordWithTabCapture(options, onProgress, signal)
    : recordWithDisplayCapture(options, onProgress, signal);

export const releaseRecording = async (client: StudioClient, result: RecResult) => {
  if (isLocalBlobUrl(result.blobUrl)) revokeLocalBlobUrl(result.blobUrl);
  else await client.releaseRecording(result.blobUrl);
};
