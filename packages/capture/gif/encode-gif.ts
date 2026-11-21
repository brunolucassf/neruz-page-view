import { NpvException } from '@neruz/core';
import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny';
import { DEFAULT_GIF_FPS, DEFAULT_GIF_LIMITS, type GifLimits, planGif } from './gif-plan';
import type { GifWorkerRequest, GifWorkerResponse } from './gif-worker-protocol';

export type GifEncodeOptions = {
  fps?: number;
  limits?: GifLimits;
};

export type GifEncodeProgress = { encodedFrames: number; totalFrames: number };

export type GifEncodeResult = {
  blob: Blob;
  frames: number;
  width: number;
  height: number;
  isTruncated: boolean;
};

type PixelContext = {
  getImageData(x: number, y: number, width: number, height: number): ImageData;
};

const createGifWorker = () =>
  new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' });

const readPixels = (canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number) => {
  const context = canvas.getContext('2d') as PixelContext | null;
  if (!context) throw new NpvException('NPV-REC-FAILED', 'canvas 2d context unavailable');
  return context.getImageData(0, 0, width, height);
};

export const encodeGifFromVideo = async (
  video: Blob,
  options: GifEncodeOptions = {},
  onProgress: (progress: GifEncodeProgress) => void = () => undefined,
  signal?: AbortSignal,
): Promise<GifEncodeResult> => {
  const limits = options.limits ?? DEFAULT_GIF_LIMITS;
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new NpvException('NPV-BAD-REQUEST', 'video has no video track');
  const durationSeconds = await input.computeDuration();
  const plan = planGif({
    durationSeconds,
    sourceWidth: track.displayWidth,
    sourceHeight: track.displayHeight,
    fps: options.fps ?? DEFAULT_GIF_FPS,
    limits,
  });

  const worker = createGifWorker();
  const send = (message: GifWorkerRequest, transfer: Transferable[] = []) =>
    worker.postMessage(message, transfer);
  const finished = new Promise<ArrayBuffer>((resolve, reject) => {
    worker.addEventListener('message', (event: MessageEvent<GifWorkerResponse>) => {
      if (event.data.type === 'done') resolve(event.data.bytes);
      else {
        reject(
          new NpvException(
            event.data.reason === 'bytes-limit' ? 'NPV-CANVAS-LIMIT' : 'NPV-REC-FAILED',
            event.data.message,
          ),
        );
      }
    });
    worker.addEventListener('error', (event) =>
      reject(new NpvException('NPV-REC-FAILED', event.message)),
    );
  });
  finished.catch(() => undefined);
  send({ type: 'init', maxBytes: limits.maxBytes });

  try {
    const sink = new CanvasSink(track, { width: plan.width, height: plan.height, fit: 'fill' });
    let encodedFrames = 0;
    for await (const wrapped of sink.canvasesAtTimestamps(plan.timestamps)) {
      if (signal?.aborted) throw new NpvException('NPV-ABORTED', 'gif encoding aborted');
      if (!wrapped) continue;
      const pixels = readPixels(wrapped.canvas, plan.width, plan.height);
      const rgba = pixels.data.buffer as ArrayBuffer;
      send({ type: 'frame', rgba, width: plan.width, height: plan.height, delayMs: plan.delayMs }, [
        rgba,
      ]);
      encodedFrames += 1;
      onProgress({ encodedFrames, totalFrames: plan.timestamps.length });
    }
    send({ type: 'finish' });
    const bytes = await finished;
    return {
      blob: new Blob([bytes], { type: 'image/gif' }),
      frames: encodedFrames,
      width: plan.width,
      height: plan.height,
      isTruncated: plan.isTruncated,
    };
  } finally {
    worker.terminate();
    input.dispose();
  }
};
