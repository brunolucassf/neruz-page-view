export type GifWorkerRequest =
  | { type: 'init'; maxBytes: number }
  | { type: 'frame'; rgba: ArrayBuffer; width: number; height: number; delayMs: number }
  | { type: 'finish' };

export type GifWorkerResponse =
  | { type: 'done'; bytes: ArrayBuffer }
  | { type: 'error'; reason: 'bytes-limit' | 'failed'; message: string };
