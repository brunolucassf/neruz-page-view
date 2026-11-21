import type { ExportImageType, ExportRequest, ExportResponse } from './export.worker';

type Pending = { resolve: (blob: Blob) => void; reject: (cause: Error) => void };

let worker: Worker | null = null;
let nextRequestId = 1;
const pendingById = new Map<number, Pending>();

function handleMessage(event: MessageEvent<ExportResponse>) {
  const response = event.data;
  const pending = pendingById.get(response.id);
  if (!pending) return;
  pendingById.delete(response.id);
  if ('error' in response) pending.reject(new Error(response.error));
  else pending.resolve(response.blob);
}

function send(request: DistributiveOmit<ExportRequest, 'id'>): Promise<Blob> {
  if (!worker) {
    worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = handleMessage;
  }
  const id = nextRequestId++;
  const target = worker;
  return new Promise((resolve, reject) => {
    pendingById.set(id, { resolve, reject });
    target.postMessage({ ...request, id });
  });
}

type DistributiveOmit<TUnion, TKey extends PropertyKey> = TUnion extends unknown
  ? Omit<TUnion, TKey>
  : never;

export const convertImage = (blob: Blob, type: ExportImageType, quality: number) =>
  type === 'image/png' ? Promise.resolve(blob) : send({ kind: 'convert', blob, type, quality });

export const buildZip = (files: { path: string; blob: Blob }[]) => send({ kind: 'zip', files });
