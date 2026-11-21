import { NpvException } from '@neruz/core';
import type { ZipEntryInput, ZipWorkerResponse } from './batchZipTypes';

export type ZipJob = {
  entries: ZipEntryInput[];
  outputSegments: string[];
  outputName: string;
  isMemoryOutput: boolean;
  signal: AbortSignal;
  onProgress: (done: number, total: number) => void;
};

export type ZipJobResult = { bytes: number; blob: Blob | null };

export function runZipJob(job: ZipJob): Promise<ZipJobResult> {
  const worker = new Worker(new URL('./batchZip.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const finish = (outcome: () => void) => {
      job.signal.removeEventListener('abort', handleAbort);
      worker.terminate();
      outcome();
    };
    const handleAbort = () => worker.postMessage({ type: 'abort' });
    worker.onmessage = (event: MessageEvent<ZipWorkerResponse>) => {
      const response = event.data;
      if (response.type === 'progress') job.onProgress(response.done, response.total);
      else if (response.type === 'done')
        finish(() => resolve({ bytes: response.bytes, blob: response.blob }));
      else finish(() => reject(toException(response)));
    };
    worker.onerror = () =>
      finish(() => reject(new NpvException('NPV-UNKNOWN', 'zip worker failed')));
    job.signal.addEventListener('abort', handleAbort, { once: true });
    worker.postMessage({
      type: 'start',
      entries: job.entries,
      outputSegments: job.outputSegments,
      outputName: job.outputName,
      isMemoryOutput: job.isMemoryOutput,
    });
  });
}

function toException(response: Extract<ZipWorkerResponse, { type: 'error' }>): NpvException {
  if (response.code === 'aborted') return new NpvException('NPV-ABORTED', 'zip aborted');
  if (response.code === 'storage-full')
    return new NpvException('NPV-STORAGE-FULL', 'no space left for the zip');
  return new NpvException('NPV-UNKNOWN', response.message);
}
