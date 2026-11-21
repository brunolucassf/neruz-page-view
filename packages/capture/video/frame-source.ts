import { sleep } from '@neruz/core';

export type SourceFrame = {
  image: CanvasImageSource;
  width: number;
  height: number;
  timestampSeconds: number;
  release(): void;
};

export type FrameRead =
  | { kind: 'frame'; frame: SourceFrame }
  | { kind: 'timeout' }
  | { kind: 'ended' };

export type FrameSource = {
  readNext(timeoutMs: number, stopSignal: AbortSignal): Promise<FrameRead>;
  close(): void;
};

declare class MediaStreamTrackProcessor {
  constructor(init: { track: MediaStreamTrack });
  readable: ReadableStream<VideoFrame>;
}

const MICROSECONDS_PER_SECOND = 1e6;

const waitForAbort = (signal: AbortSignal) =>
  new Promise<'stopped'>((resolve) => {
    if (signal.aborted) resolve('stopped');
    else signal.addEventListener('abort', () => resolve('stopped'), { once: true });
  });

export const createTrackFrameSource = (track: MediaStreamTrack): FrameSource => {
  const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
  let firstTimestamp: number | null = null;
  return {
    async readNext(timeoutMs, stopSignal) {
      const outcome = await Promise.race([
        reader.read(),
        sleep(timeoutMs).then(() => 'timeout' as const),
        waitForAbort(stopSignal),
      ]);
      if (outcome === 'timeout' || outcome === 'stopped') return { kind: 'timeout' };
      if (outcome.done || !outcome.value) return { kind: 'ended' };
      const frame = outcome.value;
      firstTimestamp ??= frame.timestamp;
      return {
        kind: 'frame',
        frame: {
          image: frame,
          width: frame.displayWidth,
          height: frame.displayHeight,
          timestampSeconds: (frame.timestamp - firstTimestamp) / MICROSECONDS_PER_SECOND,
          release: () => frame.close(),
        },
      };
    },
    close() {
      void reader.cancel().catch(() => undefined);
      track.stop();
    },
  };
};

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback(
    callback: (now: number, metadata: { mediaTime: number }) => void,
  ): number;
  cancelVideoFrameCallback(handle: number): void;
};

export const createVideoElementFrameSource = (
  video: HTMLVideoElement,
  track: MediaStreamTrack,
): FrameSource => {
  const element = video as VideoWithFrameCallback;
  let firstMediaTime: number | null = null;
  return {
    async readNext(timeoutMs, stopSignal) {
      let handle = 0;
      const nextFrame = new Promise<number>((resolve) => {
        handle = element.requestVideoFrameCallback((_now, metadata) => resolve(metadata.mediaTime));
      });
      const outcome = await Promise.race([
        nextFrame,
        sleep(timeoutMs).then(() => 'timeout' as const),
        waitForAbort(stopSignal),
      ]);
      if (typeof outcome !== 'number') {
        element.cancelVideoFrameCallback(handle);
        return { kind: 'timeout' };
      }
      if (track.readyState === 'ended') return { kind: 'ended' };
      firstMediaTime ??= outcome;
      return {
        kind: 'frame',
        frame: {
          image: element,
          width: element.videoWidth,
          height: element.videoHeight,
          timestampSeconds: outcome - firstMediaTime,
          release: () => undefined,
        },
      };
    },
    close() {
      track.stop();
      element.srcObject = null;
    },
  };
};
