export type ZipSourceRef = { kind: 'opfs'; segments: string[] } | { kind: 'memory'; blob: Blob };

export type ZipEntryInput = { path: string; source: ZipSourceRef };

export type ZipJobRequest = {
  type: 'start';
  entries: ZipEntryInput[];
  outputSegments: string[];
  outputName: string;
  isMemoryOutput: boolean;
};

export type ZipAbortRequest = { type: 'abort' };

export type ZipWorkerRequest = ZipJobRequest | ZipAbortRequest;

export type ZipWorkerResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; bytes: number; blob: Blob | null }
  | { type: 'error'; code: 'aborted' | 'storage-full' | 'failed'; message: string };
