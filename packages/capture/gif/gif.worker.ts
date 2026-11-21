import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import type { GifWorkerRequest, GifWorkerResponse } from './gif-worker-protocol';

type WorkerScope = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<GifWorkerRequest>) => void,
  ): void;
  postMessage(message: GifWorkerResponse, transfer?: Transferable[]): void;
};

const scope = self as unknown as WorkerScope;
const MAX_PALETTE_COLORS = 256;
let maxBytes = Number.POSITIVE_INFINITY;
const encoder = GIFEncoder();
let isFirstFrame = true;

const reply = (message: GifWorkerResponse, transfer?: Transferable[]) =>
  scope.postMessage(message, transfer);

const writeFrame = (request: Extract<GifWorkerRequest, { type: 'frame' }>) => {
  const rgba = new Uint8ClampedArray(request.rgba);
  const palette = quantize(rgba, MAX_PALETTE_COLORS);
  const index = applyPalette(rgba, palette);
  encoder.writeFrame(index, request.width, request.height, {
    palette,
    delay: request.delayMs,
    first: isFirstFrame,
  });
  isFirstFrame = false;
  if (encoder.bytesView().length > maxBytes) {
    throw new RangeError('gif exceeds the size limit');
  }
};

const finish = () => {
  encoder.finish();
  const bytes = encoder.bytesView().slice().buffer;
  reply({ type: 'done', bytes }, [bytes]);
};

scope.addEventListener('message', (event) => {
  try {
    if (event.data.type === 'init') maxBytes = event.data.maxBytes;
    else if (event.data.type === 'frame') writeFrame(event.data);
    else finish();
  } catch (cause) {
    const isLimit = cause instanceof RangeError;
    reply({
      type: 'error',
      reason: isLimit ? 'bytes-limit' : 'failed',
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
});
